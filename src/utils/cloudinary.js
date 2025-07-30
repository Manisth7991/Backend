import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload function
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            throw new Error('No file path provided for upload');
        }

        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto',
        });

        fs.unlinkSync(localFilePath); // Delete local file after upload

        console.log('✅ File uploaded successfully:', result.secure_url);

        // ✅ Return both secure_url and public_id
        return {
            secure_url: result.secure_url,
            public_id: result.public_id,
        };
    } catch (error) {
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath); // Clean up
            console.log("🧹 Local file deleted after failed upload");
        }
        console.error('❌ Error uploading to Cloudinary:', error.message);
        throw error;
    }
};

// Delete function
const deleteFromCloudinary = async (public_id) => {
    try {
        const result = await cloudinary.uploader.destroy(public_id);
        console.log("🗑️ Image deleted from Cloudinary:", result);
        return result;
    } catch (error) {
        console.error("❌ Cloudinary image deletion failed:", error.message);
        throw new Error("Cloudinary image deletion failed");
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };