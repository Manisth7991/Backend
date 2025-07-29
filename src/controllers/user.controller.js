
import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";


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
        avatar: avatar,
        coverImage: coverImage || "",
    })

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
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: null } }, { new: true });
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

export { registerUser , loginUser , logoutUser, generateAccessTokenAndRefreshToken, refreshAccessToken };