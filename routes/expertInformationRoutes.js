
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { upload } from "../middlewares/upload.js";
import ExpertInformation from "../models/expertInformation.js";


const router = express.Router();

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.post("/:userId", async (req, res, next) => {
  try {
    console.log("Received upload request for userId:", req.params.userId);
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      console.log("Invalid userId:", req.params.userId);
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // First fetch the user to get existing image info
    const existingUser = await ExpertInformation.findById(req.params.userId);
    if (existingUser && existingUser.ppFile) {
      // Extract filename from ppFile path (e.g., "/Uploads/12345.png" -> "12345.png")
      const existingFilename = path.basename(existingUser.ppFile);
      console.log("Found existing image:", existingFilename);
      req.query.imageId = existingFilename;
    }

    next();
  } catch (err) {
    console.error("Error fetching user for image replacement:", err);
    next();
  }
}, upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) {
      console.log("No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.join(__dirname, "..", "uploads", "Expert-Users", req.file.filename);
    console.log("File saved to:", filePath);
    if (!fs.existsSync(filePath)) {
      console.error("File not found after upload:", filePath);
      return res.status(500).json({ error: "File not saved to disk" });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/Expert-Users/${req.file.filename}`;
    console.log("Generated fileUrl:", fileUrl);
    const expertInformation = await ExpertInformation.findByIdAndUpdate(
      req.params.userId,
      { pp: fileUrl, ppFile: `/uploads/Expert-Users/${req.file.filename}` },
      { new: true }
    );

    if (!expertInformation) {
      console.log("User not found for ID:", req.params.userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Profile updated successfully for userId:", req.params.userId);
    res.json({ message: "Profile picture uploaded", pp: fileUrl, expertInformation });
  } catch (err) {
    console.error("Upload error:", {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    console.log("Fetching profile for userId:", req.params.userId);
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      console.log("Invalid userId:", req.params.userId);
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const expertInformation = await ExpertInformation.findById(req.params.userId)


    if (!expertInformation) {
      console.log("User not found for ID:", req.params.userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Profile fetched successfully for userId:", req.params.userId);
    res.json(expertInformation);
  } catch (err) {
    console.error("Fetch error:", {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: "Error fetching profile", details: err.message });
  }
});

router.put("/:userId", async (req, res) => {
  try {
    console.log("Updating profile for userId:", req.params.userId);
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      console.log("Invalid userId:", req.params.userId);
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const expertInformation = await ExpertInformation.findByIdAndUpdate(req.params.userId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!expertInformation) {
      console.log("User not found for ID:", req.params.userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Profile updated successfully for userId:", req.params.userId);
    res.json({ message: "Profile updated", expertInformation });
  } catch (err) {
    console.error("Update error:", {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: "Error updating profile", details: err.message });
  }
});

router.patch("/:userId", async (req, res) => {
  try {
    console.log("Patching profile for userId:", req.params.userId);
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      console.log("Invalid userId:", req.params.userId);
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const expertInformation = await ExpertInformation.findByIdAndUpdate(
      req.params.userId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!expertInformation) {
      console.log("User not found for ID:", req.params.userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Profile patched successfully for userId:", req.params.userId);
    res.json({ message: "Profile partially updated", expertInformation });
  } catch (err) {
    console.error("Patch error:", {
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: "Error patching profile", details: err.message });
  }
});

export default router;
