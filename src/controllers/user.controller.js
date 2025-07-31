
import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import { deleteFromCloudinary } from "../utils/cloudinary.js";  
import mongoose from "mongoose";


const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new apiError("User not found", 404);
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Save the refresh token in the database
        // This is important for token revocation and management
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new apiError("Error generating tokens", 500);
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // Validation - check if all fields are provided
    // check if user already exists : username or email
    // check for images , check for avatar
    // upload avatar to cloudinary and check avatar url
    // create user object - create user in database
    // remove password and refresh token from  response
    // check if user is created successfully
    // send response to frontend


    const {username , email , password , fullName} = req.body;

    // if (!username || !email || !password || !fullName) { // it catches undefined, null, '', 0, false but not whitespace
    //     throw new apiError("All fields are required", 400);
    // }

    // if([username, email, password, fullName].some(field => field?.trim() === '')) { // this checks for empty strings or strings with only whitespace but not undefined or null
    //     throw new apiError("All fields are required", 400);
    // }


    if(!username || !email || !password || !fullName || [username, email, password, fullName].some(field => field?.trim() === '')) { // this checks for undefined, null, empty strings, or strings with only whitespace
        throw new apiError("All fields are required", 400);
    }

    const existingUser = await User.findOne({ $or: [{ username } , { email }] });

    if (existingUser) {
        throw new apiError("User with this email or username already exists", 409);
    }

    // console.log("Files in request: ", req.files);

    // Attempting to extract the local file path of the uploaded avatar image from the incoming request.
    // `req.files` is expected to be an object provided by Multer (middleware for handling multipart/form-data).
    // `req.files?.avatar` checks whether the `avatar` field exists and has files uploaded under it.
    // `[0]` accesses the first file in case multiple files were uploaded under the 'avatar' field.
    // `?.path` retrieves the full local path (e.g., 'uploads/avatar123.png') of the file from the file object.
    // If any of these parts are missing or undefined, the optional chaining (`?.`) prevents the app from crashing by returning `undefined`.
    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path; // Extracting the local file path of the cover image
    }

    // This conditional checks whether the avatarLocalPath was successfully extracted.
    // If it's falsy (i.e., undefined, null, or empty), it means no avatar image was uploaded.
    // Since the avatar is required for the operation (e.g., user profile creation), we throw a custom API error.
    // `apiError` is likely a custom error class that formats the error message and HTTP status code for a consistent API response.
    // The error message says "Avatar image is required" and sets the status code to 400, which represents a Bad Request.
    if (!avatarLocalPath) {
        throw new apiError("Avatar image is required", 400);
    }


    const avatar = await uploadOnCloudinary(avatarLocalPath);
    
    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }


    if(!avatar) {
        throw new apiError("Failed to upload avatar image", 500);
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        password,
        fullName,
        avatar: avatar.secure_url,            // ✅ only store the string URL
        avatarPublicId: avatar.public_id,     // ✅ store public_id separately
        coverImage: coverImage?.secure_url || "", // ✅ get only the URL
    });


    const createdUser = await User.findById(user._id).select("-password -refreshToken"); // Exclude password and refreshToken from the response
    if (!createdUser) {
        throw new apiError("User not created", 500);
    }


    return res.status(201).json(new apiResponse(201, "User registered successfully", createdUser)); // Return the created user object

});

const loginUser = asyncHandler(async (req, res) => {
    // Todo:
    // req body - data
    // username or email
    // check if user exists
    // check if password is correct
    // generate access token and refresh token
    // send cookies

    const { username , email, password } = req.body;
    if (!username && !email) {
        throw new apiError("Username or email is required", 400);
    }

    const user = await User.findOne({$or:[{username},{email}]});

    if (!user) {
        throw new apiError("User not found", 404);
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new apiError("Invalid password", 401);
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken"); // Exclude password and refreshToken from the response

    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };


    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new apiResponse(200, { user: loggedInUser , accessToken, refreshToken }, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, 
        { 
            $unset: { refreshToken: 1 } // we can also do { $set: { refreshToken: null } }
        }, { new: true });
    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new apiResponse(200, {}, "User logged out successfully"));
});


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshAccessToken; // Assuming the refresh token is sent in cookies
    if (!incomingRefreshToken) {
        throw new apiError("unauthorized request", 401);
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken._id);
    
        if(!user) {
            throw new apiError("Invalid refresh token", 401);
        }
    
        if( user.refreshToken !== incomingRefreshToken) {
            throw new apiError("Refresh token is expired or invalid", 401);
        }
    
        const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id);
    
        const cookieOptions = {
            httpOnly: true,
            secure: true,
        };
        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(new apiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed successfully"));
    
    } catch (error) {
        throw new apiError(error?.message || "Invalid refresh token", 401);
        
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
        throw new apiError("User not found", 404);
    }

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
        throw new apiError("Old password is incorrect", 401);
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false }); // Save the new password, bcrypt will hash it automatically due to the pre-save hook

    return res
        .status(200)
        .json(new apiResponse(200, {}, "Password changed successfully"));
});


const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password -refreshToken"); // Exclude password and refreshToken from the response
    if (!user) {
        throw new apiError("User not found", 404);
    }

    return res
        .status(200)
        .json(new apiResponse(200, { user }, "Current user fetched successfully"));
});


// Simple but not recommended way to get current user
// const getCurrentUser = asyncHandler(async (req, res) => {
//     return res
//         .status(200)
//         .json(200, req.user, "Current user fetched successfully");
// });



const updateAccountDetails = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body;

    if (!email || !fullName) {
        throw new apiError("All fields are required", 400);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        throw new apiError("User not found", 404);
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { email, fullName } },
        { new: true } // Return the updated user
    ).select("-password -refreshToken"); 

    if (!updatedUser) {
        throw new apiError("Failed to update account details", 500);
    }   
    return res
        .status(200)
        .json(new apiResponse(200, { user: updatedUser }, "Account details updated successfully"));
});


const updateUserAvatar = asyncHandler(async (req, res) => {
    // console.log("Request files:", req.file);
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new apiError("Avatar image is required", 400);
  }

  // 1. Upload new image
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar?.secure_url || !avatar?.public_id) {
    throw new apiError("Failed to upload avatar image", 500);
  }

  // 2. Find the user
  const currentUser = await User.findById(req.user._id);
  if (!currentUser) {
    throw new apiError("User not found", 404);
  }

  // 3. If there is an old avatar public_id, delete it
  if (currentUser.avatarPublicId) {
    await deleteFromCloudinary(currentUser.avatarPublicId);
  }

  // 4. Update user with new avatar URL and public_id
  currentUser.avatar = avatar.secure_url;
  currentUser.avatarPublicId = avatar.public_id;
  await currentUser.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, { user: currentUser }, "User avatar updated successfully"));
});


const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new apiError("Cover image is required", 400);
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage?.secure_url) {
        throw new apiError("Failed to upload cover image", 500);
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { coverImage: coverImage.secure_url } },
        { new: true }
    ).select("-password");

    if (!user) {
        throw new apiError("Failed to update user cover image", 500);
    }

    return res
        .status(200)
        .json(new apiResponse(200, { user }, "User cover image updated successfully"));
});


const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params;
    if (!username) {
        throw new apiError("Username is required", 400);
    }

    const channel = await User.aggregate([
        { 
            $match: { 
                username: username?.toLowerCase() 
            } 
        },

        // we are finding the subscriber count(Kitane subscriber hai to channel ko dekho)
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },

        // we are finding the subscribed to count(Kitane channel ko subscribe kiya hai to subscriber ko dekho)
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" }, // field hota hai to uske pahale $ lagate hai
                channelsSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: { // check if the current user is subscribed to this channel
                    // $in operator checks if the current user ID is in the subscribers array
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] }, // check if current user is in the subscribers array
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: { // Project is used to include or exclude fields from the output
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ])

    // console.log(channel);

    if (!channel || channel.length === 0) {
        throw new apiError("Channel not found", 404);
    }

    return res
        .status(200)
        .json(new apiResponse(200, { channel: channel[0] }, "User channel profile fetched successfully"));
});


// Pipeline to get user watched history


const getUserWatchedHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id) // Match the user by ID we are doing this because we are using aggregate
            }
        },
        {
            $lookup: {
                from: "videos", // The collection to join with(ham users me hai aur videos me join kar rahe hai so we are looking for videos)
                localField: "watchedHistory", // ham users me watchedHistory field se join kar rahe hai
                foreignField: "_id", // ham videos me _id se join kar rahe hai
                as: "watchedHistory", // Name of the new array field to add to the user document
                pipeline: [ // Pipeline to filter and project the fields we want from the video documents and also to join with the owner
                    {
                        $lookup: {
                            from: "users", // ham videos me hai aur videos me owner se join kar rahe hai so we are looking for users
                            localField: "owner", // ham videos me owner se join kar rahe hai
                            foreignField: "_id", // ham users me _id se join kar rahe hai
                            as: "owner", // Name of the new array field to add to the video document
                            pipeline: [
                                {
                                    $project: { // Project used kar ke hum owner ki fields ko select kar rahe hai ki kaun kaun se fields chahiye
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    { // yah ham use kar rahe taki ham sirf first owner ko hi le
                        $addFields: { // Add fields to the video document
                            isOwner: { // Check if the current user is the owner of the video
                                $first:"$owner" // $first operator is used to get the first element of the owner array
                            }
                        }
                    }
                ]
            }
        },
    ])


    return res
        .status(200)
        .json(new apiResponse(200, { user: user[0].watchHistory }, "User watched history fetched successfully"));
});


export { 
    registerUser , 
    loginUser , 
    logoutUser, 
    generateAccessTokenAndRefreshToken, 
    refreshAccessToken , 
    changeCurrentPassword , 
    getCurrentUser,
    updateAccountDetails, 
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getUserWatchedHistory
};