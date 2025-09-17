import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "..", "uploads", "Expert-Users");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created Uploads directory:", uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Saving file to:", uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Check if we have an existing image ID to replace
    const imageId = req.query.imageId || req.body.imageId;

    if (imageId) {
      // Validate that the imageId is a valid filename (id.extension format)
      const validImageIdRegex = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif)$/i;
      if (validImageIdRegex.test(imageId)) {
        console.log("Replacing existing image:", imageId);
        cb(null, imageId);
      } else {
        console.log("Invalid image ID format, generating new filename");
        const filename = `${Date.now()}${path.extname(file.originalname)}`;
        console.log("Generated filename:", filename);
        cb(null, filename);
      }
    } else {
      // No image ID provided, generate new filename
      const filename = `${Date.now()}${path.extname(file.originalname)}`;
      console.log("Generated filename:", filename);
      cb(null, filename);
    }
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit as per Profile.js
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only JPEG, PNG, or GIF files are allowed"));
  },
});
