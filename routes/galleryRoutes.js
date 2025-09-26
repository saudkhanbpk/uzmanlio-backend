import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import User from "../models/expertInformation.js";

const router = express.Router();

// File upload setup (local storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/gallery/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, JPG, PNG, GIF) and PDF files are allowed'));
    }
  }
});

// Helper function to find user by ID
const findUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

// Helper function to delete file from filesystem
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// ==================== GALLERY ROUTES ====================

// Get gallery files
router.get("/:userId/gallery", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const visibleFiles = (user.galleryFiles || []).filter(file => file.isVisible);
    res.json({ files: visibleFiles });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Upload gallery file
router.post("/:userId/gallery", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { description } = req.body;
    const user = await findUserById(req.params.userId);

    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'pdf';
    const fileUrl = `/uploads/gallery/${req.file.filename}`;

    const newFile = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      fileUrl,
      description: description || '',
      isVisible: true,
      uploadedAt: new Date()
    };

    if (!user.galleryFiles) {
      user.galleryFiles = [];
    }

    user.galleryFiles.push(newFile);
    await user.save();

    res.json({ file: newFile, message: "File uploaded successfully" });
  } catch (error) {
    // Clean up uploaded file if database save fails
    if (req.file) {
      deleteFile(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Update gallery file (description, visibility)
router.put("/:userId/gallery/:fileId", async (req, res) => {
  try {
    const { description, isVisible } = req.body;
    const user = await findUserById(req.params.userId);

    const fileIndex = user.galleryFiles.findIndex(
      file => file.id === req.params.fileId
    );

    if (fileIndex === -1) {
      return res.status(404).json({ error: "File not found" });
    }

    if (description !== undefined) {
      user.galleryFiles[fileIndex].description = description;
    }

    if (isVisible !== undefined) {
      user.galleryFiles[fileIndex].isVisible = isVisible;
    }

    await user.save();
    res.json({
      file: user.galleryFiles[fileIndex],
      message: "File updated successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete gallery file
router.delete("/:userId/gallery/:fileId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const fileIndex = user.galleryFiles.findIndex(
      file => file.id === req.params.fileId
    );

    if (fileIndex === -1) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileToDelete = user.galleryFiles[fileIndex];

    // Remove file from filesystem
    deleteFile(fileToDelete.filePath);

    // Remove from database
    user.galleryFiles = user.galleryFiles.filter(
      file => file.id !== req.params.fileId
    );

    await user.save();
    res.json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle file visibility
router.patch("/:userId/gallery/:fileId/toggle-visibility", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const fileIndex = user.galleryFiles.findIndex(
      file => file.id === req.params.fileId
    );

    if (fileIndex === -1) {
      return res.status(404).json({ error: "File not found" });
    }

    user.galleryFiles[fileIndex].isVisible = !user.galleryFiles[fileIndex].isVisible;

    await user.save();
    res.json({
      file: user.galleryFiles[fileIndex],
      message: `File ${user.galleryFiles[fileIndex].isVisible ? 'made visible' : 'hidden'} successfully`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get file by ID (for serving files)
router.get("/:userId/gallery/:fileId/download", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const file = user.galleryFiles.find(
      file => file.id === req.params.fileId
    );

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType);

    const fileStream = fs.createReadStream(file.filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
