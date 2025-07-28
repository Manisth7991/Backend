
import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

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

export { registerUser };