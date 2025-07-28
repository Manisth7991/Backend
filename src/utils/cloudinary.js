import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// console.log("Cloudinary config: ", {
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });



const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            throw new Error('No file path provided for upload');
        }
 
        // Upload the file to Cloudinary
        // resource_type is set to 'auto' to handle both images and videos
        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto', // Automatically detect the resource type (image, video, etc.)
        });
        console.log('File uploaded successfully:', result.secure_url);
        fs.unlinkSync(localFilePath); // Delete the file after upload
        return result.secure_url; // Return the secure URL of the uploaded file
    } catch (error) {
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
            console.log("🧹 Local file deleted after failed upload");
        }
        console.error('❌ Error uploading to Cloudinary:', error.message);
        throw error;
    }
}
export { uploadOnCloudinary };