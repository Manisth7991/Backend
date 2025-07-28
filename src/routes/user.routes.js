import {Router} from "express";
import { registerUser } from '../controllers/user.controller.js';
const router = Router();
import { upload } from '../middlewares/multer.middleware.js';


// router.route("/register").post(registerUser); // This line is commented out to use multer for file uploads

// upload.fields([]) is used to handle multiple file uploads
// multer will handle the file upload and pass the file information to the controller
// This middleware will process the file upload before it reaches the registerUser controller


router.route("/register").post(
    upload.fields([ // here it is used as a middleware to handle file uploads
        { 
            name: "avatar", 
            maxCount: 1 
        },
        { 
            name: "coverImage", 
            maxCount: 1 
        }
    ]),
    registerUser
);

export default router;