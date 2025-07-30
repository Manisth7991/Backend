// require("dotenv").config(); // Load environment variables from .env file
// it is used in the older version of Node.js
// In newer versions, you can use import { config } from 'dotenv'; config();

import dotenv from "dotenv"; // dotenv is used to load environment variables from a .env file and make them available in process.env

import connectDB from "./db/index.js"; // Import the database connection function
import { app } from "./app.js";

dotenv.config({ path: "./.env" }); // Load environment variables from .env file

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8080, () => {
      console.log(`Server is running on port ${process.env.PORT || 8080}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });










// Method to connect to MongoDB and start the server
/*
import express from "express";
const app = express();
(async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`Connected to MongoDB database: ${DB_NAME}`);
    app.on("error", (error) => {
      console.error("Error in MongoDB connection:", error);
    });
    app.listen(process.env.PORT || 8080, () => {
      console.log(`Server is running on port ${process.env.PORT || 8080}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
})();
*/
