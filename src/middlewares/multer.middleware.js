import multer from "multer";

// Configure multer storage
// This example uses disk storage, but you can also use memory storage or cloud storage


const storage = multer.diskStorage({
  destination: function (req, file, cb) { // cb is the callback function which multer uses to determine where to store the file
    cb(null, './public/temp') // Specify the destination directory for uploaded files
  },
  filename: function (req, file, cb) {

    cb(null, file.originalname) // Use the original file name for the uploaded file
  }
})

export const upload = multer({ storage})
