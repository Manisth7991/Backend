import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async (req, res, next) => { // here res is not used so we can use underscore(_) to indicate that it is not used
    try{
        // Method 1: Check for access token in cookies or headers
        // const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

        // Method 2: Check for access token in cookies or headers
        const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "");
;

        if (!token) {
            throw new apiError("Access token is required", 401);
        }
        
        // Verify the token using the JWT secret key
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Find the user associated with the token
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken"); // Exclude password and refreshToken from the response
        if (!user) {
            throw new apiError("User associated with this token does not exist", 401);
        }

        // Attach the user information to the request object
        req.user = user;
        next(); // Proceed to the next middleware or route handler
    }catch (error) {
        throw new apiError(error?.message || "Invalid or expired access token", 401);
    }
});