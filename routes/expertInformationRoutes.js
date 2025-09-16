// routes/profile.js
import {router as Router} from "express";
import multer from "multer";
import path from "path";
import Title from "../models/expertInformation.js";


// const router = express.Router();

// Add Title
router.post("/addTitle", async (req, res) => {
  try {
    const { title, description } = req.body;
    console.log("Title: ", title);

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    const newTitle = new Title({ title, description });
    await newTitle.save();
    res.status(200).json({ message: "Title Added Successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error Adding Title", details: error.message });
  }
});

// File upload setup (local storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});
const upload = multer({ storage });

// Get profile (for now assume single user profile)
router.get("/", async (req, res) => {
  try {
    const profile = await Profile.findOne();
    res.json(profile || {});
  } catch (err) {
    res.status(500).json({ error: "Error fetching profile" });
  }
});

// Create or update whole profile
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    let profile = await Profile.findOne();

    if (profile) {
      profile.set(data);
    } else {
      profile = new Profile(data);
    }

    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error saving profile" });
  }
});

// PATCH (partial update – for education, certificates, experience etc.)
router.patch("/", async (req, res) => {
  try {
    const updates = req.body;
    let profile = await Profile.findOne();

    if (!profile) {
      profile = new Profile(updates);
    } else {
      profile.set(updates);
    }

    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating profile" });
  }
});

// Upload file
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const fileData = {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: (req.file.size / 1024).toFixed(2) + " KB",
      url: `/uploads/${req.file.filename}`,
    };

    let profile = await Profile.findOne();
    if (!profile) profile = new Profile();

    profile.files.push(fileData);
    await profile.save();

    res.json(fileData);
  } catch (err) {
    res.status(500).json({ error: "File upload failed" });
  }
});

// Delete file
router.delete("/file/:fileId", async (req, res) => {
  try {
    const profile = await Profile.findOne();
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    profile.files = profile.files.filter(
      (f) => f._id.toString() !== req.params.fileId
    );
    await profile.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error deleting file" });
  }
});

// ✅ Export the router instance
export default Router;
