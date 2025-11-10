import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { createMulterUpload, handleMulterError } from "../../middlewares/upload.js";
import User from "../../models/expertInformation.js";
import calendarSyncService from "../../services/calendarSyncService.js";


const router = express.Router();

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to find user by ID
const findUserById = async (userId) => {
  let user;

  // Try to find by MongoDB ObjectId first
  if (mongoose.Types.ObjectId.isValid(userId)) {
    user = await User.findById(userId);
  }

  // If not found or invalid ObjectId, try to find by custom ID field
  if (!user) {
    user = await User.findOne({
      $or: [
        { _id: userId },
        { id: userId },
        { userId: userId },
        { customId: userId }
      ]
    });
  }

  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

// ==================== PROFILE IMAGE UPLOAD ====================

// Create expert profile upload configuration
const expertProfileUpload = createMulterUpload({
  uploadPath: "uploads/Experts_Files/Expert-Users",
  fieldName: "profileImage",
  maxFiles: 1,
  maxFileSize: 5, // 5MB
  allowedExtensions: ["jpg", "jpeg", "png", "gif"],
  fileNameGenerator: (req, file) => {
    // If we have an existing image ID, use it (for replacement)
    if (req.existingImageId) {
      return req.existingImageId;
    }
    // Otherwise generate new filename
    const userId = req.params.userId || 'unknown';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname).toLowerCase();
    return `${userId}-${timestamp}${extension}`;
  }
});

// ==================== DEBUG ROUTES ====================

// Debug route to list all users (for development only)
router.get("/debug/users", async (req, res) => {
  try {
    const users = await User.find({}, { _id: 1, id: 1, userId: 1, customId: 1, name: 1, email: 1 }).limit(10);
    res.json({
      message: "Available users",
      count: users.length,
      users: users.map(user => ({
        _id: user._id,
        id: user.id,
        userId: user.userId,
        customId: user.customId,
        name: user.name,
        email: user.email
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug route to create test user (for development only)
router.post("/debug/create-test-user", async (req, res) => {
  try {
    // Check if user already exists
    const existingUser = await User.findById("68c94094d011cdb0e5fa2caa");
    if (existingUser) {
      return res.json({
        message: "Test user already exists",
        userId: "68c94094d011cdb0e5fa2caa",
        user: existingUser
      });
    }

    const testUser = new User({
      _id: new mongoose.Types.ObjectId("68c94094d011cdb0e5fa2caa"),
      name: "Test Expert",
      email: "test@example.com",
      title: "Test Expert Title",
      expertInformation: {
        subs: ["Test Category"]
      },
      services: [],
      packages: [],
      events: [],
      blogs: [],
      forms: [],
      customers: [],
      availability: {
        alwaysAvailable: false,
        selectedSlots: [],
        lastUpdated: new Date()
      },
      appointments: []
    });

    await testUser.save();
    res.json({
      message: "Test user created successfully",
      userId: testUser._id,
      user: testUser
    });
  } catch (error) {
    if (error.code === 11000) {
      res.json({ message: "Test user already exists", userId: "68c94094d011cdb0e5fa2caa" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});
// Profile picture upload route
router.post("/:userId/upload",
  // Validation and existing image check middleware
  async (req, res, next) => {
    try {
      console.log("Received upload request for userId:", req.params.userId);

      // Validate userId
      if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
        console.log("Invalid userId:", req.params.userId);
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Check for existing user and image
      const existingUser = await User.findById(req.params.userId);
      if (!existingUser) {
        console.log("User not found:", req.params.userId);
        return res.status(404).json({ error: "User not found" });
      }

      // If user has existing image, prepare for replacement
      if (existingUser.ppFile) {
        const existingFilename = path.basename(existingUser.ppFile);
        console.log("Found existing image:", existingFilename);

        // Store existing filename for potential replacement
        req.existingImageId = existingFilename;

        // Store full path for deletion after successful upload
        req.existingImagePath = path.join(__dirname, "..", "..", existingUser.ppFile);
      }

      next();
    } catch (err) {
      console.error("Error in pre-upload middleware:", err);
      return res.status(500).json({
        error: "Pre-upload validation failed",
        details: err.message
      });
    }
  },

  // Multer upload middleware
  expertProfileUpload.single(),

  // Error handling middleware
  handleMulterError,

  // Main upload handler
  async (req, res) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        console.log("No file uploaded");
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log("File uploaded:", {
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Verify file exists on disk
      const uploadedFilePath = req.file.path;
      if (!fs.existsSync(uploadedFilePath)) {
        console.error("File not found after upload:", uploadedFilePath);
        return res.status(500).json({ error: "File upload failed - file not saved to disk" });
      }

      // Generate URLs for the uploaded file
      const relativePath = `/uploads/Experts_Files/Expert-Users/${req.file.filename}`;
      const fileUrl = `${req.protocol}://${req.get("host")}${relativePath}`;

      console.log("Generated URLs:", {
        relativePath,
        fileUrl
      });

      // Update user profile with new image URLs
      const updatedExpert = await User.findByIdAndUpdate(
        req.params.userId,
        {
          pp: fileUrl,
          ppFile: relativePath
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedExpert) {
        // If update failed, delete the uploaded file
        await deleteUploadedFile(uploadedFilePath);
        return res.status(404).json({ error: "Failed to update user profile" });
      }

      // If we had an existing image and it's different from the new one, delete the old file
      if (req.existingImagePath && req.existingImageId !== req.file.filename) {
        try {
          if (fs.existsSync(req.existingImagePath)) {
            await deleteUploadedFile(req.existingImagePath);
            console.log("Deleted old profile image:", req.existingImagePath);
          }
        } catch (deleteError) {
          // Log error but don't fail the request
          console.error("Error deleting old profile image:", deleteError);
        }
      }

      console.log("Profile picture uploaded successfully for userId:", req.params.userId);

      // Send success response
      res.json({
        success: true,
        message: "Profile picture uploaded successfully",
        data: {
          pp: fileUrl,
          ppFile: relativePath,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        expertInformation: updatedExpert
      });

    } catch (err) {
      console.error("Upload error:", {
        message: err.message,
        stack: err.stack
      });

      // If there was an error and we have an uploaded file, clean it up
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          await deleteUploadedFile(req.file.path);
          console.log("Cleaned up failed upload file");
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }

      res.status(500).json({
        error: "Upload failed",
        details: err.message
      });
    }
  }
);


// ==================== BASIC PROFILE ROUTES ====================

// Get complete expert profile (specific route first)
router.get("/:userId/profile", async (req, res) => {
  try {
    console.log("Fetching complete profile for userId:", req.params.userId);
    const user = await findUserById(req.params.userId);
    res.json(user);
  } catch (error) {
    res.status(404).json({
      error: error.message,
      requestedUserId: req.params.userId,
      debug: "Check server logs for more details"
    });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    console.log("Fetching profile for userId:", req.params.userId);
    const expertInformation = await findUserById(req.params.userId);
    console.log("Profile fetched successfully for userId:", req.params.userId);
    res.json(expertInformation);
  } catch (err) {
    console.error("Fetch error:", {
      message: err.message,
      stack: err.stack
    });
    res.status(err.message === 'Invalid user ID' ? 400 : 404).json({ error: err.message });
  }
});

router.put("/:userId", async (req, res) => {
  try {
    console.log("Updating profile for userId:", req.params.userId);
    const expertInformation = await User.findByIdAndUpdate(
      req.params.userId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

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
    const expertInformation = await User.findByIdAndUpdate(
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


// ==================== TITLE ROUTES ====================

// Get expert titles
router.get("/:userId/titles", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ titles: user.titles || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Add expert title
router.post("/:userId/titles", async (req, res) => {
  try {
    const { title, description } = req.body;
    const user = await findUserById(req.params.userId);

    if (!user.titles) {
      user.titles = [];
    }

    const newTitle = {
      id: uuidv4(),
      title,
      description
    };

    user.titles.push(newTitle);
    await user.save();

    res.json({ title: newTitle, message: "Title added successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update expert title
router.put("/:userId/titles/:titleId", async (req, res) => {
  try {
    const { title, description } = req.body;
    const user = await findUserById(req.params.userId);

    if (!user.titles) {
      return res.status(404).json({ error: "No titles found" });
    }

    const titleIndex = user.titles.findIndex(
      t => t.id === req.params.titleId
    );

    if (titleIndex === -1) {
      return res.status(404).json({ error: "Title not found" });
    }

    user.titles[titleIndex] = {
      ...user.titles[titleIndex],
      title,
      description
    };

    await user.save();
    res.json({
      title: user.titles[titleIndex],
      message: "Title updated successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete expert title
router.delete("/:userId/titles/:titleId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    if (!user.titles) {
      return res.status(404).json({ error: "No titles found" });
    }

    user.titles = user.titles.filter(
      t => t.id !== req.params.titleId
    );

    await user.save();
    res.json({ message: "Title deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CATEGORIES ROUTES ====================

// Get expert categories
router.get("/:userId/categories", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ categories: user.expertInformation?.subs || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Add expert category
router.post("/:userId/categories", async (req, res) => {
  try {
    const { subCategory } = req.body;
    const user = await findUserById(req.params.userId);

    if (!user.expertInformation) {
      user.expertInformation = { subs: [] };
    }

    const newCategory = {
      id: uuidv4(),
      subCategory
    };

    user.expertInformation.subs.push(newCategory);
    await user.save();

    res.json({ category: newCategory, message: "Category added successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove expert category
router.delete("/:userId/categories/:categoryId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    if (!user.expertInformation?.subs) {
      return res.status(404).json({ error: "No categories found" });
    }

    user.expertInformation.subs = user.expertInformation.subs.filter(
      cat => cat.id !== req.params.categoryId
    );

    await user.save();
    res.json({ message: "Category removed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EDUCATION ROUTES ====================

// Get education
router.get("/:userId/education", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ education: user.resume?.education || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Add education
router.post("/:userId/education", async (req, res) => {
  try {
    const { level, university, name, department, graduationYear } = req.body;
    const user = await findUserById(req.params.userId);

    if (!user.resume) {
      user.resume = { education: [] };
    }

    const newEducation = {
      id: uuidv4(),
      level,
      university,
      name,
      department,
      graduationYear
    };

    user.resume.education.push(newEducation);
    await user.save();

    res.json({ education: newEducation, message: "Education added successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update education
router.put("/:userId/education/:educationId", async (req, res) => {
  try {
    const { level, university, name, department, graduationYear } = req.body;
    const user = await findUserById(req.params.userId);

    if (!user.resume?.education) {
      return res.status(404).json({ error: "No education records found" });
    }

    const educationIndex = user.resume.education.findIndex(
      edu => edu.id === req.params.educationId
    );

    if (educationIndex === -1) {
      return res.status(404).json({ error: "Education record not found" });
    }

    user.resume.education[educationIndex] = {
      ...user.resume.education[educationIndex],
      level,
      university,
      name,
      department,
      graduationYear
    };

    await user.save();
    res.json({
      education: user.resume.education[educationIndex],
      message: "Education updated successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete education
router.delete("/:userId/education/:educationId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    if (!user.resume?.education) {
      return res.status(404).json({ error: "No education records found" });
    }

    user.resume.education = user.resume.education.filter(
      edu => edu.id !== req.params.educationId
    );

    await user.save();
    res.json({ message: "Education deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CERTIFICATES ROUTES ====================

// Get certificates
router.get("/:userId/certificates", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ certificates: user.certificates || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Add certificate
router.post("/:userId/certificates", async (req, res) => {
  try {
    const { name, company, country, city, issueDate, expiryDate, credentialId, credentialUrl } = req.body;
    const user = await findUserById(req.params.userId);

    const newCertificate = {
      id: uuidv4(),
      name,
      company,
      country,
      city,
      issueDate,
      expiryDate,
      credentialId,
      credentialUrl
    };

    user.certificates.push(newCertificate);
    await user.save();

    res.json({ certificate: newCertificate, message: "Certificate added successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update certificate
router.put("/:userId/certificates/:certificateId", async (req, res) => {
  try {
    const { name, company, country, city, issueDate, expiryDate, credentialId, credentialUrl } = req.body;
    const user = await findUserById(req.params.userId);

    const certificateIndex = user.certificates.findIndex(
      cert => cert.id === req.params.certificateId
    );

    if (certificateIndex === -1) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    user.certificates[certificateIndex] = {
      ...user.certificates[certificateIndex],
      name,
      company,
      country,
      city,
      issueDate,
      expiryDate,
      credentialId,
      credentialUrl
    };

    await user.save();
    res.json({
      certificate: user.certificates[certificateIndex],
      message: "Certificate updated successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete certificate
router.delete("/:userId/certificates/:certificateId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    user.certificates = user.certificates.filter(
      cert => cert.id !== req.params.certificateId
    );

    await user.save();
    res.json({ message: "Certificate deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EXPERIENCE ROUTES ====================

// Get experience
router.get("/:userId/experience", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ experience: user.experience || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Add experience
router.post("/:userId/experience", async (req, res) => {
  try {
    const { company, position, start, end, stillWork, description, country, city } = req.body;
    const user = await findUserById(req.params.userId);

    const newExperience = {
      id: uuidv4(),
      company,
      position,
      start,
      end: stillWork ? null : end,
      stillWork,
      description,
      country,
      city
    };

    user.experience.push(newExperience);
    await user.save();

    res.json({ experience: newExperience, message: "Experience added successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update experience
router.put("/:userId/experience/:experienceId", async (req, res) => {
  try {
    const { company, position, description, start, end, stillWork, country, city } = req.body;
    const user = await findUserById(req.params.userId);

    const experienceIndex = user.experience.findIndex(
      exp => exp.id === req.params.experienceId
    );

    if (experienceIndex === -1) {
      return res.status(404).json({ error: "Experience not found" });
    }

    user.experience[experienceIndex] = {
      ...user.experience[experienceIndex],
      company,
      description,
      position,
      start,
      end: stillWork ? null : end,
      stillWork,
      country,
      city
    };

    await user.save();
    res.json({
      experience: user.experience[experienceIndex],
      message: "Experience updated successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete experience
router.delete("/:userId/experience/:experienceId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    user.experience = user.experience.filter(
      exp => exp.id !== req.params.experienceId
    );

    await user.save();
    res.json({ message: "Experience deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SKILLS ROUTES ====================

// Get skills
router.get("/:userId/skills", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ skills: user.skills || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Add skill
router.post("/:userId/skills", async (req, res) => {
  try {
    const { name, level, category, description } = req.body;
    const user = await findUserById(req.params.userId);

    const newSkill = {
      id: uuidv4(),
      name,
      level,
      category,
      description
    };

    if (!user.skills) {
      user.skills = [];
    }
    user.skills.push(newSkill);
    await user.save();

    res.json({ skill: newSkill, message: "Skill added successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update skill
router.put("/:userId/skills/:skillId", async (req, res) => {
  try {
    const { name, level, category, description } = req.body;
    const user = await findUserById(req.params.userId);

    const skillIndex = user.skills.findIndex(
      skill => skill.id === req.params.skillId
    );

    if (skillIndex === -1) {
      return res.status(404).json({ error: "Skill not found" });
    }

    user.skills[skillIndex] = {
      ...user.skills[skillIndex],
      name,
      level,
      category,
      description
    };

    await user.save();
    res.json({ skill: user.skills[skillIndex], message: "Skill updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete skill
router.delete("/:userId/skills/:skillId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const skillIndex = user.skills.findIndex(
      skill => skill.id === req.params.skillId
    );

    if (skillIndex === -1) {
      return res.status(404).json({ error: "Skill not found" });
    }

    user.skills.splice(skillIndex, 1);
    await user.save();
    res.json({ message: "Skill deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CALENDAR & AVAILABILITY ROUTES ====================

// Get availability settings
router.get("/:userId/availability", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const availability = user.availability || {
      alwaysAvailable: false,
      selectedSlots: [],
      lastUpdated: new Date()
    };

    res.json({ availability });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update availability settings
router.put("/:userId/availability", async (req, res) => {
  try {
    const { alwaysAvailable, selectedSlots } = req.body;
    const user = await findUserById(req.params.userId);

    user.availability = {
      alwaysAvailable: alwaysAvailable || false,
      selectedSlots: selectedSlots || [],
      lastUpdated: new Date()
    };

    await user.save();
    const updatedUser = await findUserById(req.params.userId);
    res.json({
      availability: updatedUser.availability,
      message: "Availability settings updated successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get appointments
router.get("/:userId/appointments", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const appointments = user.appointments || [];

    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add appointment
router.post("/:userId/appointments", async (req, res) => {
  try {
    const { title, date, time, duration, type, status, clientName, clientEmail, notes } = req.body;
    const user = await findUserById(req.params.userId);

    const newAppointment = {
      id: uuidv4(),
      title,
      date,
      time,
      duration,
      type,
      status: status || 'pending',
      clientName,
      clientEmail,
      notes,
      createdAt: new Date()
    };

    if (!user.appointments) {
      user.appointments = [];
    }
    user.appointments.push(newAppointment);
    await user.save();

    // Sync to connected calendars in background
    const activeProviders = user.calendarProviders?.filter(cp => cp.isActive) || [];
    if (activeProviders.length > 0) {
      // Don't wait for sync to complete, run in background
      setImmediate(async () => {
        for (const provider of activeProviders) {
          try {
            await calendarSyncService.syncAppointmentToProvider(
              req.params.userId,
              newAppointment,
              { id: provider._id }
            );
          } catch (error) {
            console.error(`Failed to sync appointment to ${provider.provider}:`, error);
          }
        }
      });
    }

    res.json({ appointment: newAppointment, message: "Appointment added successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update appointment
router.put("/:userId/appointments/:appointmentId", async (req, res) => {
  try {
    const { title, date, time, duration, type, status, clientName, clientEmail, notes } = req.body;
    const user = await findUserById(req.params.userId);

    const appointmentIndex = user.appointments.findIndex(
      apt => apt.id === req.params.appointmentId
    );

    if (appointmentIndex === -1) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    user.appointments[appointmentIndex] = {
      ...user.appointments[appointmentIndex],
      title,
      date,
      time,
      duration,
      type,
      status,
      clientName,
      clientEmail,
      notes
    };

    await user.save();

    // Sync to connected calendars in background
    const activeProviders = user.calendarProviders?.filter(cp => cp.isActive) || [];
    if (activeProviders.length > 0) {
      const updatedAppointment = user.appointments[appointmentIndex];
      // Don't wait for sync to complete, run in background
      setImmediate(async () => {
        for (const provider of activeProviders) {
          try {
            await calendarSyncService.syncAppointmentToProvider(
              req.params.userId,
              updatedAppointment,
              { id: provider._id }
            );
          } catch (error) {
            console.error(`Failed to sync updated appointment to ${provider.provider}:`, error);
          }
        }
      });
    }

    res.json({
      appointment: user.appointments[appointmentIndex],
      message: "Appointment updated successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete appointment
router.delete("/:userId/appointments/:appointmentId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const appointmentIndex = user.appointments.findIndex(
      apt => apt.id === req.params.appointmentId
    );

    if (appointmentIndex === -1) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Sync deletion to connected calendars in background
    const activeProviders = user.calendarProviders?.filter(cp => cp.isActive) || [];
    if (activeProviders.length > 0) {
      // Don't wait for sync to complete, run in background
      setImmediate(async () => {
        for (const provider of activeProviders) {
          try {
            await calendarSyncService.deleteAppointmentFromProvider(
              req.params.userId,
              req.params.appointmentId,
              { id: provider._id }
            );
          } catch (error) {
            console.error(`Failed to delete appointment from ${provider.provider}:`, error);
          }
        }
      });
    }

    user.appointments.splice(appointmentIndex, 1);
    await user.save();
    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Update complete expert profile
router.put("/:userId/profile", async (req, res) => {
  try {
    const {
      title,
      expertCategories,
      education,
      certificates,
      experience,
      services,
      packages
    } = req.body;

    const user = await findUserById(req.params.userId);

    // Update title
    if (title !== undefined) {
      user.title = title;
    }

    // Update expert categories
    if (expertCategories !== undefined) {
      if (!user.expertInformation) {
        user.expertInformation = {};
      }
      user.expertInformation.subs = expertCategories;
    }

    // Update education
    if (education !== undefined) {
      if (!user.resume) {
        user.resume = {};
      }
      user.resume.education = education;
    }

    // Update certificates
    if (certificates !== undefined) {
      user.certificates = certificates;
    }

    // Update experience
    if (experience !== undefined) {
      user.experience = experience;
    }

    // Update services
    if (services !== undefined) {
      user.services = services;
    }

    // Update packages
    if (packages !== undefined) {
      user.packages = packages;
    }

    await user.save();

    // Return updated profile
    const updatedProfile = {
      title: user.title || '',
      expertCategories: user.expertInformation?.subs || [],
      education: user.resume?.education || [],
      certificates: user.certificates || [],
      experience: user.experience || [],
      galleryFiles: (user.galleryFiles || []).filter(file => file.isVisible),
      services: user.services || [],
      activeServices: (user.services || []).filter(service => service.isActive),
      packages: user.packages || [],
      activePackages: (user.packages || []).filter(pkg => pkg.isPurchased),
      availablePackages: (user.packages || []).filter(pkg => pkg.isAvailable && !pkg.isPurchased)
    };

    res.json({ profile: updatedProfile, message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EVENTS ROUTES ====================

// Get all events for a user
router.get("/:userId/events", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ events: user.events || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get events by status
router.get("/:userId/events/status/:status", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const { status } = req.params;

    const filteredEvents = user.events?.filter(event => event.status === status) || [];
    res.json({ events: filteredEvents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new event
router.post("/:userId/events", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const eventData = req.body;
    console.log("Requested Data", req.body)

    // Generate unique ID for the event
    const eventId = uuidv4();

    const newEvent = {
      id: eventId,
      title: eventData.title || eventData.serviceName,
      description: eventData.description,
      serviceId: eventData.serviceId,
      serviceName: eventData.serviceName,
      serviceType: eventData.serviceType,
      date: eventData.date,
      time: eventData.time,
      duration: eventData.duration,
      location: eventData.location,
      platform: eventData.platform,
      eventType: eventData.eventType,
      meetingType: eventData.meetingType,
      price: eventData.price,
      maxAttendees: eventData.maxAttendees,
      attendees: eventData.attendees || 0,
      category: eventData.category,
      status: eventData.status || 'pending',
      paymentType: eventData.paymentType || 'online',
      isRecurring: eventData.isRecurring || false,
      recurringType: eventData.recurringType,
      selectedClients: eventData.selectedClients || [],
      appointmentNotes: eventData.appointmentNotes,
      files: eventData.files || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!user.events) {
      user.events = [];
    }
    user.events.push(newEvent);
    await user.save();

    if (user.calendarProviders && user.calendarProviders.length > 0) {
      const activeProviders = user.calendarProviders.filter(cp => cp.isActive);

      if (activeProviders.length > 0) {
        // Run sync in background (asynchroniously)
        // setImmediate(async () => {
          for (const provider of activeProviders) {
            try {
             const response = await calendarSyncService.syncAppointmentToProvider(req.params.userId,newEvent,provider)
             if(response.success){
              console.log("sunced Event To Calendar Successfully")
             }else{
              console.log("Sunc Failed to Calendar",error)
             }
            } catch (error) {
              console.error(`❌ Failed to sync event to ${provider.provider}:`, error);
            }
          }
        // });
      }
    }




    res.status(201).json({
      event: newEvent,
      message: "Event created successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update event
router.put("/:userId/events/:eventId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const eventIndex = user.events.findIndex(event => event.id === req.params.eventId);

    if (eventIndex === -1) {
      return res.status(404).json({ error: "Event not found" });
    }

    const eventData = req.body;
    const updatedEvent = {
      ...user.events[eventIndex],
      title: eventData.title || eventData.serviceName,
      description: eventData.description,
      serviceId: eventData.serviceId,
      serviceName: eventData.serviceName,
      serviceType: eventData.serviceType,
      date: eventData.date,
      time: eventData.time,
      duration: eventData.duration,
      location: eventData.location,
      platform: eventData.platform,
      eventType: eventData.eventType,
      meetingType: eventData.meetingType,
      price: eventData.price,
      maxAttendees: eventData.maxAttendees,
      attendees: eventData.attendees,
      category: eventData.category,
      status: eventData.status,
      paymentType: eventData.paymentType,
      isRecurring: eventData.isRecurring,
      recurringType: eventData.recurringType,
      selectedClients: eventData.selectedClients,
      appointmentNotes: eventData.appointmentNotes,
      files: eventData.files,
      updatedAt: new Date()
    };

    user.events[eventIndex] = updatedEvent;
    await user.save();

    // Sync to connected calendars in background
    const providers = user.calendarProviders?.filter(cp => cp.isActive) || [];

    if (providers.length > 0) {
      setImmediate(async () => {
        for (const provider of providers) {
          try {
            await updateAppointmentInProvider(req.params.userId, updatedEvent, provider);
            console.log(`Synced event ${updatedEvent.title} to ${provider.provider}`);
          } catch (error) {
            console.error(`Failed syncing ${updatedEvent.title} to ${provider.provider}:`, error);
          }
        }
      });
    } else {
      console.log("No active calendar providers found for user", req.params.userId);
    }

    res.json({
      event: updatedEvent,
      message: "Event updated successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update event status (approve, reject, complete, cancel)
router.patch("/:userId/events/:eventId/status", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const eventIndex = user.events.findIndex(event => event.id === req.params.eventId);

    if (eventIndex === -1) {
      return res.status(404).json({ error: "Event not found" });
    }

    const { status } = req.body;
    if (!['pending', 'approved', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    user.events[eventIndex].status = status;
    user.events[eventIndex].updatedAt = new Date();

    await user.save();

    // Sync to connected calendars in background
    const providers = user.calendarProviders?.filter(cp => cp.isActive) || [];

    if (providers.length > 0) {
      setImmediate(async () => {
        for (const provider of providers) {
          try {
            await updateAppointmentInProvider(req.params.userId, updatedEvent, provider);
            console.log(`Synced event ${updatedEvent.title} to ${provider.provider}`);
          } catch (error) {
            console.error(`Failed syncing ${updatedEvent.title} to ${provider.provider}:`, error);
          }
        }
      });
    } else {
      console.log("No active calendar providers found for user", req.params.userId);
    }

    res.json({
      event: user.events[eventIndex],
      message: `Event status updated to ${status}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete event
router.delete("/:userId/events/:eventId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const eventIndex = user.events.findIndex(event => event.id === req.params.eventId);

    if (eventIndex === -1) {
      return res.status(404).json({ error: "Event not found" });
    }

    user.events.splice(eventIndex, 1);
    await user.save();

        // Sync to connected calendars in background
    const providers = user.calendarProviders?.filter(cp => cp.isActive) || [];

    if (providers.length > 0) {
      setImmediate(async () => {
        for (const provider of providers) {
          try {
            await deleteAppointmentFromProvider(req.params.userId, updatedEvent, provider);
            console.log(`Deleted event ${updatedEvent.title} from ${provider.provider}`);
          } catch (error) {
            console.error(`Failed Deleting ${updatedEvent.title} from ${provider.provider}:`, error);
          }
        }
      });
    } else {
      console.log("No active calendar providers found for user", req.params.userId);
    }

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get event statistics
router.get("/:userId/events/stats", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const events = user.events || [];

    const stats = {
      total: events.length,
      pending: events.filter(e => e.status === 'pending').length,
      approved: events.filter(e => e.status === 'approved').length,
      completed: events.filter(e => e.status === 'completed').length,
      cancelled: events.filter(e => e.status === 'cancelled').length,
      totalRevenue: events
        .filter(e => e.status === 'completed')
        .reduce((sum, e) => sum + (e.price || 0), 0),
      totalAttendees: events
        .filter(e => e.status === 'completed')
        .reduce((sum, e) => sum + (e.attendees || 0), 0)
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BLOG ROUTES ====================

// Get all blogs for a user
router.get("/:userId/blogs", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ blogs: user.blogs || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get blogs by status
router.get("/:userId/blogs/status/:status", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const { status } = req.params;

    const filteredBlogs = user.blogs?.filter(blog => blog.status === status) || [];
    res.json({ blogs: filteredBlogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get blogs by category
router.get("/:userId/blogs/category/:category", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const { category } = req.params;

    const filteredBlogs = user.blogs?.filter(blog => blog.category === category) || [];
    res.json({ blogs: filteredBlogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single blog by ID
router.get("/:userId/blogs/:blogId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const blog = user.blogs?.find(blog => blog.id === req.params.blogId);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({ blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get blog by slug (for public view)
router.get("/:userId/blogs/slug/:slug", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const blog = user.blogs?.find(blog => blog.slug === req.params.slug);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({ blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new blog
router.post("/:userId/blogs", async (req, res) => {
  try {
    // Cleanup script to fix corrupted blogs arrays
    // async function cleanupCorruptedBlogs() {
    //   try {
    //     const users = await User.find({ 'blogs': { $exists: true } });

    //     for (const user of users) {
    //       let needsUpdate = false;

    //       if (Array.isArray(user.blogs)) {
    //         const cleanedBlogs = user.blogs.filter(blog => 
    //           blog && typeof blog === 'object' && !Array.isArray(blog)
    //         );

    //         if (cleanedBlogs.length !== user.blogs.length) {
    //           user.blogs = cleanedBlogs;
    //           needsUpdate = true;
    //         }
    //       }

    //       if (needsUpdate) {
    //         await user.save();
    //         console.log(`Fixed blogs for user: ${user._id}`);
    //       }
    //     }

    //     console.log('Cleanup completed');
    //   } catch (error) {
    //     console.error('Cleanup error:', error);
    //   }
    // }

    // // Run this once to clean up the data
    // cleanupCorruptedBlogs();
    const user = await findUserById(req.params.userId);
    console.log("USER is Found:", user);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const blogData = req.body;

    // Fix corrupted blogs array - remove any non-object entries
    if (Array.isArray(user.blogs)) {
      user.blogs = user.blogs.filter(blog =>
        blog && typeof blog === 'object' && !Array.isArray(blog)
      );
    } else {
      user.blogs = [];
    }

    // Generate slug from title
    const generateSlug = (title) => {
      return title
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const slug = generateSlug(blogData.title);

    // Check if slug already exists
    const existingBlog = user.blogs.find(blog => blog.slug === slug);
    if (existingBlog) {
      return res.status(400).json({ error: "Bu başlıkla bir blog yazısı zaten mevcut" });
    }

    const newBlog = {
      title: blogData.title,
      content: blogData.content,
      category: blogData.category,
      keywords: Array.isArray(blogData.keywords) ? blogData.keywords : [],
      status: blogData.status || 'draft',
      slug: slug,
      author: blogData.author || user.information?.name || 'Uzman'
      // Let Mongoose handle id, createdAt, updatedAt
    };

    user.blogs.push(newBlog);
    await user.save();

    // Get the saved blog with all default values applied
    const savedBlog = user.blogs[user.blogs.length - 1];

    res.status(201).json({
      blog: savedBlog,
      message: "Blog yazısı başarıyla oluşturuldu"
    });
  } catch (error) {
    console.error('Blog creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update blog
router.put("/:userId/blogs/:blogId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const blogIndex = user.blogs.findIndex(blog => blog.id === req.params.blogId);

    if (blogIndex === -1) {
      return res.status(404).json({ error: "Blog not found" });
    }

    const blogData = req.body;

    // Generate new slug if title changed
    const generateSlug = (title) => {
      return title
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
    };

    const newSlug = generateSlug(blogData.title);

    // Check if new slug conflicts with existing blogs (excluding current blog)
    const existingBlog = user.blogs?.find(blog => blog.slug === newSlug && blog.id !== req.params.blogId);
    if (existingBlog) {
      return res.status(400).json({ error: "Bu başlıkla bir blog yazısı zaten mevcut" });
    }

    const updatedBlog = {
      ...user.blogs[blogIndex],
      title: blogData.title,
      content: blogData.content,
      category: blogData.category,
      keywords: Array.isArray(blogData.keywords) ? blogData.keywords : blogData.keywords.split(',').map(k => k.trim()),
      status: blogData.status,
      slug: newSlug,
      author: blogData.author || user.information?.name || 'Uzman',
      updatedAt: new Date()
    };

    user.blogs[blogIndex] = updatedBlog;
    await user.save();

    res.json({
      blog: updatedBlog,
      message: "Blog yazısı başarıyla güncellendi"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update blog status (publish/unpublish)
router.patch("/:userId/blogs/:blogId/status", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const blogIndex = user.blogs.findIndex(blog => blog.id === req.params.blogId);

    if (blogIndex === -1) {
      return res.status(404).json({ error: "Blog not found" });
    }

    const { status } = req.body;
    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    user.blogs[blogIndex].status = status;
    user.blogs[blogIndex].updatedAt = new Date();

    await user.save();

    res.json({
      blog: user.blogs[blogIndex],
      message: `Blog yazısı ${status === 'published' ? 'yayınlandı' : 'taslağa alındı'}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete blog
router.delete("/:userId/blogs/:blogId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const blogIndex = user.blogs.findIndex(blog => blog.id === req.params.blogId);

    if (blogIndex === -1) {
      return res.status(404).json({ error: "Blog not found" });
    }

    user.blogs.splice(blogIndex, 1);
    await user.save();

    res.json({ message: "Blog yazısı başarıyla silindi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get blog statistics
router.get("/:userId/blogs/stats", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const blogs = user.blogs || [];

    const stats = {
      total: blogs.length,
      published: blogs.filter(b => b.status === 'published').length,
      draft: blogs.filter(b => b.status === 'draft').length,
      categories: [...new Set(blogs.map(b => b.category))].map(category => ({
        name: category,
        count: blogs.filter(b => b.category === category).length
      })),
      recentBlogs: blogs
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5)
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FORMS ROUTES ====================

// Get all forms for a user
router.get("/:userId/forms", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ forms: user.forms || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get forms by status
router.get("/:userId/forms/status/:status", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const { status } = req.params;

    const filteredForms = user.forms?.filter(form => form.status === status) || [];
    res.json({ forms: filteredForms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single form by ID
router.get("/:userId/forms/:formId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const form = user.forms?.find(form => form.id === req.params.formId);

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    res.json({ form });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new form
router.post("/:userId/forms", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const formData = req.body;

    // Generate unique ID for the form
    const formId = uuidv4();

    const newForm = {
      id: formId,
      title: formData.title,
      description: formData.description || '',
      status: formData.status || 'draft',
      fields: formData.fields || [],
      responses: [],
      participantCount: 0,
      settings: {
        allowMultipleSubmissions: formData.settings?.allowMultipleSubmissions || false,
        requireLogin: formData.settings?.requireLogin || false,
        showProgressBar: formData.settings?.showProgressBar || true,
        customTheme: {
          primaryColor: formData.settings?.customTheme?.primaryColor || '#3B82F6',
          backgroundColor: formData.settings?.customTheme?.backgroundColor || '#FFFFFF'
        },
        notifications: {
          emailOnSubmission: formData.settings?.notifications?.emailOnSubmission || true,
          emailAddress: formData.settings?.notifications?.emailAddress || user.email
        }
      },
      analytics: {
        views: 0,
        starts: 0,
        completions: 0,
        averageCompletionTime: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!user.forms) {
      user.forms = [];
    }
    user.forms.push(newForm);
    await user.save();

    res.status(201).json({
      form: newForm,
      message: "Form başarıyla oluşturuldu"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update form
router.put("/:userId/forms/:formId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const formIndex = user.forms.findIndex(form => form.id === req.params.formId);

    if (formIndex === -1) {
      return res.status(404).json({ error: "Form not found" });
    }

    const formData = req.body;
    const updatedForm = {
      ...user.forms[formIndex],
      title: formData.title,
      description: formData.description,
      status: formData.status,
      fields: formData.fields,
      settings: {
        ...user.forms[formIndex].settings,
        ...formData.settings
      },
      updatedAt: new Date()
    };

    user.forms[formIndex] = updatedForm;
    await user.save();

    res.json({
      form: updatedForm,
      message: "Form başarıyla güncellendi"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update form status
router.patch("/:userId/forms/:formId/status", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const formIndex = user.forms.findIndex(form => form.id === req.params.formId);

    if (formIndex === -1) {
      return res.status(404).json({ error: "Form not found" });
    }

    const { status } = req.body;
    if (!['draft', 'active', 'inactive', 'archived'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    user.forms[formIndex].status = status;
    user.forms[formIndex].updatedAt = new Date();

    await user.save();

    res.json({
      form: user.forms[formIndex],
      message: `Form durumu ${status} olarak güncellendi`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete form
router.delete("/:userId/forms/:formId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const formIndex = user.forms.findIndex(form => form.id === req.params.formId);

    if (formIndex === -1) {
      return res.status(404).json({ error: "Form not found" });
    }

    user.forms.splice(formIndex, 1);
    await user.save();

    res.json({ message: "Form başarıyla silindi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Duplicate form
router.post("/:userId/forms/:formId/duplicate", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const originalForm = user.forms?.find(form => form.id === req.params.formId);

    if (!originalForm) {
      return res.status(404).json({ error: "Form not found" });
    }

    const duplicatedForm = {
      ...originalForm,
      id: uuidv4(),
      title: `${originalForm.title} (Kopya)`,
      status: 'draft',
      responses: [],
      participantCount: 0,
      analytics: {
        views: 0,
        starts: 0,
        completions: 0,
        averageCompletionTime: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    user.forms.push(duplicatedForm);
    await user.save();

    res.status(201).json({
      form: duplicatedForm,
      message: "Form başarıyla kopyalandı"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== FORM RESPONSES ROUTES ====================

// Get form responses
router.get("/:userId/forms/:formId/responses", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const form = user.forms?.find(form => form.id === req.params.formId);

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    res.json({
      responses: form.responses || [],
      totalResponses: form.responses?.length || 0,
      form: {
        id: form.id,
        title: form.title,
        fields: form.fields
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit form response (public endpoint)
router.post("/:userId/forms/:formId/submit", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const formIndex = user.forms.findIndex(form => form.id === req.params.formId);

    if (formIndex === -1) {
      return res.status(404).json({ error: "Form not found" });
    }

    const form = user.forms[formIndex];

    if (form.status !== 'active') {
      return res.status(400).json({ error: "Form is not active" });
    }

    const responseData = req.body;
    const responseId = uuidv4();

    const newResponse = {
      id: responseId,
      respondentName: responseData.respondentName,
      respondentEmail: responseData.respondentEmail,
      respondentPhone: responseData.respondentPhone,
      responses: responseData.responses || [],
      submittedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Add response to form
    if (!form.responses) {
      form.responses = [];
    }
    form.responses.push(newResponse);

    // Update participant count and analytics
    form.participantCount = form.responses.length;
    form.analytics.completions += 1;
    form.updatedAt = new Date();

    await user.save();

    res.status(201).json({
      message: "Form yanıtı başarıyla kaydedildi",
      responseId: responseId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get form analytics
router.get("/:userId/forms/:formId/analytics", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const form = user.forms?.find(form => form.id === req.params.formId);

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const responses = form.responses || [];
    const analytics = {
      ...form.analytics,
      totalResponses: responses.length,
      responseRate: form.analytics.starts > 0 ? (responses.length / form.analytics.starts * 100).toFixed(2) : 0,
      recentResponses: responses
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 10),
      responsesByDate: responses.reduce((acc, response) => {
        const date = new Date(response.submittedAt).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}),
      fieldAnalytics: form.fields.map(field => {
        const fieldResponses = responses
          .map(r => r.responses.find(resp => resp.fieldId === field.id))
          .filter(Boolean);

        return {
          fieldId: field.id,
          fieldLabel: field.label,
          fieldType: field.type,
          responseCount: fieldResponses.length,
          responses: fieldResponses.map(r => r.value)
        };
      })
    };

    res.json({ analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get forms statistics
router.get("/:userId/forms/stats", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const forms = user.forms || [];

    const stats = {
      total: forms.length,
      active: forms.filter(f => f.status === 'active').length,
      draft: forms.filter(f => f.status === 'draft').length,
      inactive: forms.filter(f => f.status === 'inactive').length,
      archived: forms.filter(f => f.status === 'archived').length,
      totalResponses: forms.reduce((sum, f) => sum + (f.responses?.length || 0), 0),
      totalViews: forms.reduce((sum, f) => sum + (f.analytics?.views || 0), 0),
      recentForms: forms
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5)
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CUSTOMERS ROUTES ====================

// Get all customers for a user
router.get("/:userId/customers", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const { status, category, search } = req.query;

    let customers = user.customers || [];

    // Filter by status
    if (status && status !== 'all') {
      customers = customers.filter(customer => customer.status === status);
    }

    // Filter by category
    if (category && category !== 'all') {
      customers = customers.filter(customer => customer.category === category);
    }

    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchLower) ||
        customer.surname.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.phone.includes(search)
      );
    }

    // Sort by last contact date (most recent first)
    customers.sort((a, b) => new Date(b.lastContact || b.updatedAt) - new Date(a.lastContact || a.updatedAt));

    res.json({ customers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single customer by ID
router.get("/:userId/customers/:customerId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const customer = user.customers?.find(customer => customer.id === req.params.customerId);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json({ customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new customer
router.post("/:userId/customers", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const customerData = req.body;

    // Check if customer with same email already exists
    const existingCustomer = user.customers?.find(c => c.email === customerData.email);
    if (existingCustomer) {
      return res.status(400).json({ error: "Bu e-posta adresi ile kayıtlı bir danışan zaten mevcut" });
    }

    // Generate unique ID for the customer
    const customerId = uuidv4();

    const newCustomer = {
      id: customerId,
      name: customerData.name,
      surname: customerData.surname,
      email: customerData.email,
      phone: customerData.phone,
      dateOfBirth: customerData.dateOfBirth ? new Date(customerData.dateOfBirth) : undefined,
      gender: customerData.gender,
      address: customerData.address || {},
      occupation: customerData.occupation,
      company: customerData.company,
      preferences: {
        communicationMethod: customerData.preferences?.communicationMethod || 'email',
        language: customerData.preferences?.language || 'tr',
        timezone: customerData.preferences?.timezone || 'Europe/Istanbul',
        reminderSettings: {
          enabled: customerData.preferences?.reminderSettings?.enabled !== false,
          beforeHours: customerData.preferences?.reminderSettings?.beforeHours || 24
        }
      },
      status: customerData.status || 'active',
      category: customerData.category,
      tags: customerData.tags || [],
      source: customerData.source || 'website',
      referredBy: customerData.referredBy,
      appointments: [],
      totalAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
      noShowAppointments: 0,
      totalSpent: 0,
      outstandingBalance: 0,
      paymentMethod: customerData.paymentMethod,
      notes: [],
      averageRating: 0,
      totalRatings: 0,
      consentGiven: {
        dataProcessing: customerData.consentGiven?.dataProcessing || false,
        marketing: customerData.consentGiven?.marketing || false,
        dateGiven: customerData.consentGiven?.dataProcessing ? new Date() : undefined
      },
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!user.customers) {
      user.customers = [];
    }
    user.customers.push(newCustomer);
    await user.save();

    res.status(201).json({
      customer: newCustomer,
      message: "Danışan başarıyla eklendi"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer
router.put("/:userId/customers/:customerId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const customerIndex = user.customers.findIndex(customer => customer.id === req.params.customerId);

    if (customerIndex === -1) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customerData = req.body;

    // Check if email is being changed and if it conflicts with another customer
    if (customerData.email !== user.customers[customerIndex].email) {
      const existingCustomer = user.customers.find(c =>
        c.email === customerData.email && c.id !== req.params.customerId
      );
      if (existingCustomer) {
        return res.status(400).json({ error: "Bu e-posta adresi ile kayıtlı başka bir danışan mevcut" });
      }
    }

    const updatedCustomer = {
      ...user.customers[customerIndex],
      name: customerData.name,
      surname: customerData.surname,
      email: customerData.email,
      phone: customerData.phone,
      dateOfBirth: customerData.dateOfBirth ? new Date(customerData.dateOfBirth) : user.customers[customerIndex].dateOfBirth,
      gender: customerData.gender,
      address: { ...user.customers[customerIndex].address, ...customerData.address },
      occupation: customerData.occupation,
      company: customerData.company,
      preferences: {
        ...user.customers[customerIndex].preferences,
        ...customerData.preferences
      },
      status: customerData.status,
      category: customerData.category,
      tags: customerData.tags || user.customers[customerIndex].tags,
      source: customerData.source,
      referredBy: customerData.referredBy,
      paymentMethod: customerData.paymentMethod,
      consentGiven: {
        ...user.customers[customerIndex].consentGiven,
        ...customerData.consentGiven
      },
      updatedAt: new Date()
    };

    user.customers[customerIndex] = updatedCustomer;
    await user.save();

    res.json({
      customer: updatedCustomer,
      message: "Danışan bilgileri başarıyla güncellendi"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete customer
router.delete("/:userId/customers/:customerId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const customerIndex = user.customers.findIndex(customer => customer.id === req.params.customerId);

    if (customerIndex === -1) {
      return res.status(404).json({ error: "Customer not found" });
    }

    user.customers.splice(customerIndex, 1);
    await user.save();

    res.json({ message: "Danışan başarıyla silindi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Archive/Unarchive customer
router.patch("/:userId/customers/:customerId/archive", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const customerIndex = user.customers.findIndex(customer => customer.id === req.params.customerId);

    if (customerIndex === -1) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const { isArchived } = req.body;
    user.customers[customerIndex].isArchived = isArchived;
    user.customers[customerIndex].updatedAt = new Date();

    await user.save();

    res.json({
      customer: user.customers[customerIndex],
      message: `Danışan ${isArchived ? 'arşivlendi' : 'arşivden çıkarıldı'}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer status
router.patch("/:userId/customers/:customerId/status", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const customerIndex = user.customers.findIndex(customer => customer.id === req.params.customerId);

    if (customerIndex === -1) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const { status } = req.body;
    if (!['active', 'inactive', 'blocked', 'prospect'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    user.customers[customerIndex].status = status;
    user.customers[customerIndex].updatedAt = new Date();

    await user.save();

    res.json({
      customer: user.customers[customerIndex],
      message: `Danışan durumu ${status} olarak güncellendi`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CUSTOMER NOTES ROUTES ====================

// Get customer notes
router.get("/:userId/customers/:customerId/notes", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const customer = user.customers?.find(customer => customer.id === req.params.customerId);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Sort notes by creation date (newest first)
    const notes = (customer.notes || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      notes,
      customer: {
        id: customer.id,
        name: customer.name,
        surname: customer.surname,
        email: customer.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add customer note
router.post("/:userId/customers/:customerId/notes", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const customerIndex = user.customers.findIndex(customer => customer.id === req.params.customerId);

    if (customerIndex === -1) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const noteData = req.body;
    const noteId = uuidv4();

    const newNote = {
      id: noteId,
      content: noteData.content,
      author: noteData.author || 'expert',
      authorName: noteData.authorName || user.information?.name || 'Expert',
      files: noteData.files || [],
      isPrivate: noteData.isPrivate || false,
      tags: noteData.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!user.customers[customerIndex].notes) {
      user.customers[customerIndex].notes = [];
    }
    user.customers[customerIndex].notes.push(newNote);
    user.customers[customerIndex].lastContact = new Date();
    user.customers[customerIndex].updatedAt = new Date();

    await user.save();

    res.status(201).json({
      note: newNote,
      message: "Not başarıyla eklendi"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer note
router.put("/:userId/customers/:customerId/notes/:noteId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const customerIndex = user.customers.findIndex(customer => customer.id === req.params.customerId);

    if (customerIndex === -1) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const noteIndex = user.customers[customerIndex].notes.findIndex(note => note.id === req.params.noteId);
    if (noteIndex === -1) {
      return res.status(404).json({ error: "Note not found" });
    }

    const noteData = req.body;
    const updatedNote = {
      ...user.customers[customerIndex].notes[noteIndex],
      content: noteData.content,
      files: noteData.files || user.customers[customerIndex].notes[noteIndex].files,
      isPrivate: noteData.isPrivate,
      tags: noteData.tags || user.customers[customerIndex].notes[noteIndex].tags,
      updatedAt: new Date()
    };

    user.customers[customerIndex].notes[noteIndex] = updatedNote;
    user.customers[customerIndex].updatedAt = new Date();

    await user.save();

    res.json({
      note: updatedNote,
      message: "Not başarıyla güncellendi"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete customer note
router.delete("/:userId/customers/:customerId/notes/:noteId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const customerIndex = user.customers.findIndex(customer => customer.id === req.params.customerId);

    if (customerIndex === -1) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const noteIndex = user.customers[customerIndex].notes.findIndex(note => note.id === req.params.noteId);
    if (noteIndex === -1) {
      return res.status(404).json({ error: "Note not found" });
    }

    user.customers[customerIndex].notes.splice(noteIndex, 1);
    user.customers[customerIndex].updatedAt = new Date();

    await user.save();

    res.json({ message: "Not başarıyla silindi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CUSTOMER STATISTICS ROUTES ====================

// Get customer statistics
router.get("/:userId/customersStats", async (req, res) => {
  console.log("Route Hitted")
  try {
    const user = await findUserById(req.params.userId);
    console.log("USER ID from stats:", user)
    const customers = user.customers || [];

    const stats = {
      total: customers.length,
      active: customers.filter(c => c.status === 'active').length,
      inactive: customers.filter(c => c.status === 'inactive').length,
      blocked: customers.filter(c => c.status === 'blocked').length,
      prospects: customers.filter(c => c.status === 'prospect').length,
      archived: customers.filter(c => c.isArchived).length,

      // Appointment statistics
      totalAppointments: customers.reduce((sum, c) => sum + (c.totalAppointments || 0), 0),
      completedAppointments: customers.reduce((sum, c) => sum + (c.completedAppointments || 0), 0),
      cancelledAppointments: customers.reduce((sum, c) => sum + (c.cancelledAppointments || 0), 0),
      noShowAppointments: customers.reduce((sum, c) => sum + (c.noShowAppointments || 0), 0),

      // Financial statistics
      totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
      outstandingBalance: customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0),

      // Recent activity
      newCustomersThisMonth: customers.filter(c => {
        const createdDate = new Date(c.createdAt);
        const now = new Date();
        return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
      }).length,

      recentCustomers: customers
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(c => ({
          id: c.id,
          name: `${c.name} ${c.surname}`,
          email: c.email,
          createdAt: c.createdAt,
          totalSpent: c.totalSpent || 0
        })),

      // Customer sources
      sourceBreakdown: customers.reduce((acc, c) => {
        const source = c.source || 'unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {}),

      // Average ratings
      averageRating: customers.length > 0
        ? customers.reduce((sum, c) => sum + (c.averageRating || 0), 0) / customers.length
        : 0,

      // Categories
      categoryBreakdown: customers.reduce((acc, c) => {
        const category = c.category || 'uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BULK OPERATIONS ROUTES ====================

// Bulk import customers from CSV
router.post("/:userId/customers/bulk-import", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const { customers: customersData } = req.body;

    if (!Array.isArray(customersData) || customersData.length === 0) {
      return res.status(400).json({ error: "Invalid customers data" });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < customersData.length; i++) {
      try {
        const customerData = customersData[i];

        // Validate required fields
        if (!customerData.name || !customerData.surname || !customerData.email || !customerData.phone) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        // Check if customer already exists
        const existingCustomer = user.customers?.find(c => c.email === customerData.email);
        if (existingCustomer) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Customer with email ${customerData.email} already exists`);
          continue;
        }

        const newCustomer = {
          id: uuidv4(),
          name: customerData.name,
          surname: customerData.surname,
          email: customerData.email,
          phone: customerData.phone,
          dateOfBirth: customerData.dateOfBirth ? new Date(customerData.dateOfBirth) : undefined,
          gender: customerData.gender,
          occupation: customerData.occupation,
          company: customerData.company,
          status: customerData.status || 'active',
          category: customerData.category,
          source: customerData.source || 'bulk-import',
          referredBy: customerData.referredBy,
          preferences: {
            communicationMethod: customerData.communicationMethod || 'email',
            language: 'tr',
            timezone: 'Europe/Istanbul',
            reminderSettings: {
              enabled: true,
              beforeHours: 24
            }
          },
          appointments: [],
          totalAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
          noShowAppointments: 0,
          totalSpent: 0,
          outstandingBalance: 0,
          notes: [],
          averageRating: 0,
          totalRatings: 0,
          consentGiven: {
            dataProcessing: true,
            marketing: customerData.marketingConsent || false,
            dateGiven: new Date()
          },
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (!user.customers) {
          user.customers = [];
        }
        user.customers.push(newCustomer);
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    await user.save();

    res.json({
      message: `Bulk import completed. ${results.success} customers imported, ${results.failed} failed.`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export customers to CSV format
router.get("/:userId/customers/export", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const customers = user.customers || [];

    const csvData = customers.map(customer => ({
      name: customer.name,
      surname: customer.surname,
      email: customer.email,
      phone: customer.phone,
      dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.toISOString().split('T')[0] : '',
      gender: customer.gender || '',
      occupation: customer.occupation || '',
      company: customer.company || '',
      status: customer.status,
      category: customer.category || '',
      source: customer.source || '',
      referredBy: customer.referredBy || '',
      totalAppointments: customer.totalAppointments || 0,
      completedAppointments: customer.completedAppointments || 0,
      totalSpent: customer.totalSpent || 0,
      averageRating: customer.averageRating || 0,
      lastAppointment: customer.lastAppointment ? customer.lastAppointment.toISOString().split('T')[0] : '',
      createdAt: customer.createdAt.toISOString().split('T')[0]
    }));

    res.json({
      customers: csvData,
      message: "Customer data exported successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;