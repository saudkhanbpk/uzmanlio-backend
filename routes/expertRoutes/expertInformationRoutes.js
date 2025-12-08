import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { createMulterUpload, handleMulterError } from "../../middlewares/upload.js";
import User from "../../models/expertInformation.js";
import calendarSyncService from "../../services/calendarSyncService.js";
import Customer from "../../models/customer.js";
import CustomerAppointments from "../../models/customerAppointment.js";
import { sendBulkEmail, sendEmail } from "../../services/email.js";
import { Parser } from "json2csv";
import {
  getExpertEventCreatedTemplate, getClient11SessionTemplate,
  getClientGroupSessionTemplate, getClientPackageSessionTemplate
} from "../../services/eventEmailTemplates.js";
import { sendSms } from "../../services/netgsmService.js";
import agenda from "../../services/agendaService.js";
import Order from "../../models/orders.js";
import { scheduleRepeatedEvents } from "../../services/repetitionAgendaService.js";
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


// =================== AGENDA HELPERS ===================

const parseEventDateTime = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const timePart = timeStr ? timeStr.trim() : "00:00";
  // try ISO first
  let dt = new Date(`${dateStr}T${timePart}`);
  if (isNaN(dt.getTime())) {
    dt = new Date(`${dateStr} ${timePart}`);
    if (isNaN(dt.getTime())) return null;
  }
  return dt;
};

const cancelAgendaJob = async (jobId) => {
  console.log("cancelAgendaJob jobId:", jobId);
  if (!agenda || !jobId) return false;
  try {
    // Use `new` to create ObjectId
    const numRemoved = await agenda.cancel({ _id: new mongoose.Types.ObjectId(jobId) });
    if (numRemoved > 0) {
      console.log("Agenda Task Deleted Successfully");
      return true;
    } else {
      console.log("Agenda Task not found or already executed");
      return false;
    }
  } catch (err) {
    console.error("cancelAgendaJob error:", err?.message || err);
    return false;
  }
};


const scheduleReminderForEvent = async (user, event) => {
  if (!agenda || !event || !event.date) return null;

  try {
    const dt = parseEventDateTime(event.date, event.time);
    if (!dt) {
      console.log("❌ parseEventDateTime returned null for:", event.date, event.time);
      return null;
    }

    console.log("📅 Parsed Event DateTime:", dt.toISOString());
    const remindAt = new Date(dt.getTime() - 2 * 60 * 60 * 1000);
    const now = new Date();

    console.log("⏰ Reminder At:", remindAt.toISOString());
    console.log("⏱️ Now:", now.toISOString());

    const jobData = {
      userId: user._id?.toString?.() || user.id,
      eventId: event.id,
      expertEmail: user.information?.email,
      eventTitle: event.title || event.serviceName,
      eventDate: event.date,
      eventTime: event.time
    };

    // If reminder time is already passed → schedule for 10 seconds later
    if (remindAt <= now) {
      console.log("⚡ Reminder time already passed → scheduling immediately (10 sec later)");

      const job = await agenda.schedule(
        new Date(Date.now() + 10000),
        "sendEventReminder",
        jobData
      );

      const jobId = job?.attrs?._id?.toString?.();
      console.log("⚡ Immediate Job Created:", jobId);
      return jobId;
    }

    // Normal scheduling
    const job = await agenda.schedule(remindAt, "sendEventReminder", jobData);
    const jobId = job?.attrs?._id?.toString?.();

    console.log("✅ Future Reminder Scheduled. Job ID:", jobId);
    return jobId;

  } catch (err) {
    console.error("scheduleReminderForEvent error:", err);
    return null;
  }
};


const rescheduleReminderForEvent = async (user, event, oldJobId) => {
  try {
    if (oldJobId) {
      await cancelAgendaJob(oldJobId);
    }
    return await scheduleReminderForEvent(user, event);
  } catch (err) {
    console.error("rescheduleReminderForEvent error:", err?.message || err);
    return null;
  }
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

// Create customer notes file upload configuration
const customerNoteUpload = createMulterUpload({
  uploadPath: "uploads/Experts_Files/customer_notes",
  fieldName: "file",
  maxFiles: 1,
  maxFileSize: 10, // 10MB
  allowedExtensions: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"],
  fileNameGenerator: (req, file) => {
    const customerId = req.params.customerId || 'unknown';
    const timestamp = Date.now();
    const randomId = uuidv4();
    const extension = path.extname(file.originalname).toLowerCase();
    return `${customerId}-${timestamp}-${randomId}${extension}`;
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



// router.get("/:userId", async (req, res) => {
//   try {
//     console.log("Fetching profile for userId:", req.params.userId);

//     const user = await User.findById(req.params.userId)
//       .populate([{
//         path: "customers.customerId",
//         model: "Customer"
//       }]);

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Return full user object with populated customers
//     res.json(user);

//   } catch (err) {
//     console.error("Fetch error:", err);
//     res.status(400).json({ error: err.message });
//   }
// });

router.get("/:userId", async (req, res) => {
  try {
    console.log("Fetching profile for userId:", req.params.userId);

    const user = await User.findById(req.params.userId)
      .populate([{
        path: "customers.customerId",
        model: "Customer"
      }]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get all customer IDs from the user's customers array
    const customerIds = user.customers
      .map(c => c.customerId?._id || c.customerId)
      .filter(id => id);

    // Find all orders for these customers
    const orders = await Order.find({
      customerId: { $in: customerIds }
    }).lean();
    console.log("Customer IDS", customerIds);

    // Filter orders to get only active package orders
    const customersPackageDetails = [];

    for (const order of orders) {
      // Check each event in the order
      if (order.orderDetails?.events) {
        for (const event of order.orderDetails.events) {
          // Check if it's a package event with remaining sessions
          if (
            event.eventType === 'package' &&
            event.package &&
            event.package.sessions > (event.package.completedSessions || 0)
          ) {
            customersPackageDetails.push(order
              //   {
              //   orderId: order._id,
              //   customerId: order.customerId,
              //   customerName: order.userInfo?.name,
              //   customerEmail: order.userInfo?.email,
              //   packageDetails: {
              //     packageId: event.events.package.packageId,
              //     name: event.events.package.name,
              //     details: event.events.package.details,
              //     price: event.events.package.price,
              //     totalSessions: event.events.package.sessions,
              //     completedSessions: event.events.package.completedSessions || 0,
              //     remainingSessions: event.events.package.sessions - (event.events.package.completedSessions || 0),
              //     duration: event.events.package.duration,
              //     meetingType: event.events.package.meetingType
              //   },
              //   orderDate: order.orderDetails.orderDate,
              //   paymentStatus: order.paymentInfo?.status,
              //   transactionId: order.paymentInfo?.transactionId
              // }
            );
          }
        }
      }
    }

    // Return user object with customersPackageDetails
    const userObject = user.toObject();
    userObject.customersPackageDetails = customersPackageDetails;

    res.json(userObject);

  } catch (err) {
    console.error("Fetch error:", err);
    res.status(400).json({ error: err.message });
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
    // const user = await findUserById(req.params.userId);
    const user = await User.findById(req.params.userId)
      .populate({
        path: "events",
        populate: {
          path: "customers",
          model: "Customer"
        }
      });

    res.json({ events: user.events });

    // const events = user.events || [];
    // const customerAppointments = user.appointments || [];

    // // Fetch all appointment documents
    // const customerEvents = await Promise.all(
    //   customerAppointments.map(id => CustomerAppointments.findById(id))
    // );

    // res.json({ events: [...events, ...customerEvents] });
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



router.post("/:userId/events", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const eventData = req.body;
    console.log("Requested Data", req.body);

    // Generate unique ID for the event
    const eventId = uuidv4();

    // Process selectedClients: Find/Create Customer and Link to Expert
    const resolvedClients = [];
    const inputClients = eventData.selectedClients || [];

    for (const client of inputClients) {
      let customerId = client._id || client.id;
      let customerName = client.name;
      let customerEmail = client.email;

      // Check if ID is a valid ObjectId. If not (e.g. timestamp), treat as new/unknown.
      const isValidId = mongoose.Types.ObjectId.isValid(customerId) && String(customerId).length === 24;

      if (!isValidId) {
        // Try to find by email
        let existingCustomer = await Customer.findOne({ email: customerEmail });

        if (!existingCustomer) {
          // Create new customer
          const nameParts = customerName.trim().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || '';

          existingCustomer = await Customer.create({
            name: firstName,
            surname: lastName,
            email: customerEmail,
            phone: client.phone || "",
            status: "active",
            source: "website",
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`Created new customer: ${customerEmail} (${existingCustomer._id})`);
        } else {
          console.log(`Found existing customer by email: ${customerEmail} (${existingCustomer._id})`);
        }
        customerId = existingCustomer._id;
      }

      // Ensure customer is linked to Expert
      if (!user.customers) {
        user.customers = [];
      }

      const isLinked = user.customers.some(c =>
        c.customerId && c.customerId.toString() === customerId.toString()
      );

      if (!isLinked) {
        user.customers.push({
          customerId: customerId,
          isArchived: false,
          addedAt: new Date()
        });
        console.log(`Linked customer ${customerId} to expert`);
      }

      resolvedClients.push({
        id: customerId,
        name: customerName,
        email: customerEmail,
        packages: client.packages || []
      });
    }

    const formattedClients = resolvedClients;

    const newEvent = {
      id: eventId,
      title: eventData.title || eventData.serviceName,
      description: eventData.description,
      serviceId: eventData.service,
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
      selectedClients: formattedClients || [],
      appointmentNotes: eventData.appointmentNotes,
      files: eventData.files || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!user.events) {
      user.events = [];
    }
    user.events.push(newEvent);



    user.packages.find(pkg => {
      if (pkg.id === eventData.service) {
        pkg.selectedClients.push({
          id: customerId,
          name: customerName,
          email: customerEmail
        });
      }
    });

    // === Process package-based payments ===
    if (eventData.paymentType && Array.isArray(eventData.paymentType)) {
      console.log("Processing payment types:", eventData.paymentType);

      for (const payment of eventData.paymentType) {
        if (payment.paymentMethod === 'paketten-tahsil' && payment.orderId && payment.packageId) {
          console.log(`Incrementing session for order: ${payment.orderId}, package: ${payment.packageId}`);

          try {
            const order = await Order.findById(payment.orderId);

            if (order && order.orderDetails?.events) {
              for (let event of order.orderDetails.events) {
                if (
                  event.eventType === 'package' &&
                  event.package &&
                  event.package.packageId?.toString() === payment.packageId.toString()
                ) {
                  event.package.completedSessions = (event.package.completedSessions || 0) + 1;
                  console.log(`✅ Incremented completedSessions to ${event.package.completedSessions} for package ${payment.packageId}`);
                  break;
                }
              }

              await order.save();
              console.log(`✅ Order ${payment.orderId} updated successfully`);
            } else {
              console.warn(`⚠️ Order ${payment.orderId} not found or has no events`);
            }
          } catch (orderError) {
            console.error(`❌ Error updating order ${payment.orderId}:`, orderError);
          }
        }
      }
    }

    await user.save();

    const savedUser = await User.findById(req.params.userId);
    const savedEvent = savedUser.events.find(e => e.id === newEvent.id);

    // === NEW: Create orders for customers without packages ===
    if (eventData.paymentType && Array.isArray(eventData.paymentType)) {
      console.log("📦 Creating orders for customers without packages...");

      for (const payment of eventData.paymentType) {
        // Only process customers who are NOT using package payment
        if (payment.paymentMethod !== 'paketten-tahsil' && !payment.orderId) {
          const customerId = payment.customerId;
          const customer = formattedClients.find(c => c.id.toString() === customerId.toString());

          if (customer && eventData.price) {
            try {
              console.log(`💰 Creating order for ${customer.name} - Price: ${eventData.price}`);

              // Fetch customer details
              const customerDoc = await Customer.findById(customerId);

              // Create new order for this customer
              const newOrder = await Order.create({
                userInfo: {
                  userId: customerId,
                  name: customer.name,
                  email: customer.email,
                  phone: customerDoc?.phone || ''
                },
                expertInfo: {
                  expertId: req.params.userId,
                  name: user.information?.name || 'Expert',
                  accountNo: user.information?.accountNo || 'N/A',
                  email: user.information?.email || ''
                },
                orderDetails: {
                  events: [
                    {
                      eventType: 'service',
                      service: {
                        name: eventData.serviceName,
                        description: eventData.description || '',
                        price: parseFloat(eventData.price),
                        duration: parseInt(eventData.duration) || 0,
                        meetingType: eventData.meetingType || '1-1'
                      }
                    }
                  ],
                  totalAmount: parseFloat(eventData.price)
                },
                paymentInfo: {
                  method: payment.paymentMethod,
                  status: 'pending'
                },
                status: 'pending',
                orderSource: 'expert-created-event'
              });

              console.log(`✅ Created order ${newOrder._id} for customer ${customer.name}`);


              // Update customer's orders and appointments arrays
              if (customerDoc) {
                if (!customerDoc.orders) {
                  customerDoc.orders = [];
                }
                if (!customerDoc.appointments) {
                  customerDoc.appointments = [];
                }

                // Add order ID to customer's orders
                customerDoc.orders.push(newOrder._id);

                // Add event ID to customer's appointments (using the event's MongoDB _id)
                customerDoc.appointments.push(savedEvent._id);

                await customerDoc.save();
                console.log(`✅ Updated customer ${customer.name} - Added order and appointment`);
              }
              // Update the payment type with the new order ID
              const paymentIndex = eventData.paymentType.findIndex(
                p => p.customerId.toString() === customerId.toString()
              );
              if (paymentIndex !== -1) {
                savedEvent.paymentType[paymentIndex].orderId = newOrder._id;
                await savedUser.save();
                console.log(`✅ Updated event payment type with order ID ${newOrder._id}`);
              }

            } catch (orderError) {
              console.error(`❌ Error creating order for customer ${customerId}:`, orderError);
            }
          } else {
            if (!eventData.price) {
              console.warn(`⚠️ No price set for event, skipping order creation for customer ${customerId}`);
            }
          }
        }
      }
    }

    //Create the Agenda instance (Scheduling Emails before 2 hours Of Appointment)
    try {
      // const savedUser = await User.findById(req.params.userId);
      // const savedEvent = savedUser.events.find(e => e.id === eventId);
      console.log("Checking For the User and Event");
      if (savedEvent) {
        const jobId = await scheduleReminderForEvent(savedUser, savedEvent);
        console.log("Job Id Created", jobId);

        if (jobId) {
          savedEvent.agendaJobId = jobId;
          await savedUser.save();
          console.log("Agenda job scheduled for event", eventId, "jobId:", jobId);
        }
      }
    } catch (schedErr) {
      console.error("Error scheduling agenda job after event create:", schedErr);
    }

    // === NEW: Schedule repetitions if enabled ===
    let repetitionJobIds = null;
    if (eventData.isRecurring && eventData.repetitions && eventData.repetitions.length > 0) {
      console.log("📅 Scheduling event repetitions...");

      try {
        repetitionJobIds = await scheduleRepeatedEvents(
          savedUser._id,
          savedEvent._id,
          {
            ...eventData,
            // Remove repetition data from repeated events to avoid infinite loop
            isRecurring: false,
            repetitions: []
          },
          {
            isRecurring: eventData.isRecurring,
            recurringType: eventData.recurringType,
            repetitions: eventData.repetitions
          }
        );

        if (repetitionJobIds) {
          // Store job IDs in the event for future cancellation
          if (savedEvent) {
            savedEvent.repetitionJobIds = repetitionJobIds;
            await savedUser.save();
          }
          console.log(`✅ Scheduled ${eventData.repetitions[0].numberOfRepetitions} repetitions`);
        }
      } catch (repError) {
        console.error("❌ Error scheduling repetitions:", repError);
        // Don't fail the entire request if repetition scheduling fails
      }
    }

    // Extract emails from selectedClients
    const clientEmails = (formattedClients || []).map(c => c.email);
    console.log("Client Emails:", clientEmails);

    //if the Event is Service Event , then Send the Service Email to Expert and Customers Both
    if (eventData.serviceType === 'service') {
      console.log("Event is service");

      if (eventData.meetingType === '1-1') {
        //sending email to the customer
        const singleusertemplate = getClient11SessionTemplate({
          participantName: formattedClients[0].name,
          expertName: user.information.name,
          sessionName: eventData.serviceName,
          sessionDate: eventData.date,
          sessionTime: eventData.time,
          sessionDuration: eventData.duration,
        });
        const htmlTemplate = `
        <p>Merhaba ${formattedClients[0].name},</p>
        <p>${user.information.name} senin için ${eventData.serviceName} randevusu oluşturdu.</p>
        <p>Tarih: ${eventData.date} ${eventData.time}</p>
        <p>Katılım linki: <a href="${eventData.platform || 'Link will be shared soon'}">Randevuya Katıl</a></p>
      `;
        await sendBulkEmail(clientEmails, "Danışan Randevu Oluşturdu", "Randevu oluşturuldu", htmlTemplate);

        //sending email to the Expert
        const template = getExpertEventCreatedTemplate({
          expertName: user.information.name,
          clientName: formattedClients[0].name,
          eventDate: eventData.date,
          eventTime: eventData.time,
          eventLocation: eventData.location,
          serviceName: eventData.serviceName
        });
        sendEmail(user.information.email, {
          subject: "Danışan Randevu Oluşturdu",
          body: "Danışan için yeni bir randevu oluşturuldu.",
          html: template
        });
      }

      else {
        //sending email to the customers one by one
        formattedClients.map(client => {
          const groupusertemplate = getClientGroupSessionTemplate({
            participantName: client.name,
            expertName: user.information.name,
            sessionName: eventData.serviceName,
            sessionDate: eventData.date,
            sessionTime: eventData.time,
            sessionDuration: eventData.duration,
          });
          sendEmail(client.email, {
            subject: "Group event created",
            body: "Grup Seansı Oluşturuldu & Grup Seansına Katılım",
            html: groupusertemplate.html
          });
        });

        //sending email to the Expert
        const template = getExpertEventCreatedTemplate({
          expertName: user.information.name,
          clientName: formattedClients[0].name,
          eventDate: eventData.date,
          eventTime: eventData.time,
          eventLocation: eventData.location,
          serviceName: eventData.serviceName
        });
        sendEmail(user.information.email, {
          subject: "Group event created",
          body: "Grup Seansı Oluşturuldu & Grup Seansına Katılım",
          html: template.html
        });
      }

      //Else Send the package emails
    } else {
      //sending email to the customer
      const packageTemplate = formattedClients.map(client => {
        const packagetemplate = getClientPackageSessionTemplate({
          participantName: client.name,
          expertName: user.information.name,
          sessionName: eventData.serviceName,
          sessionDate: eventData.date,
          sessionTime: eventData.time,
          sessionDuration: eventData.duration,
        });
        console.log("Event is not service , sending package email to customers and user");
        sendEmail(client.email, "Package Event Created", "Paketten Seans Hakkı Kullanıldı, Danışan Randevu Oluşturdu", packagetemplate.html);
      });
      //sending email to the Expert
      const template = getExpertEventCreatedTemplate({
        expertName: user.information.name,
        clientName: formattedClients[0].name,
        eventDate: eventData.date,
        eventTime: eventData.time,
        eventLocation: eventData.location,
        serviceName: eventData.serviceName
      });
      sendEmail(user.information.email, {
        subject: "Package Event Created",
        body: "Paketten Seans Hakkı Kullanıldı, Danışan Randevu Oluşturdu",
        html: template
      });
    }

    if (user.calendarProviders && user.calendarProviders.length > 0) {
      const activeProviders = user.calendarProviders.filter(cp => cp.isActive);

      if (activeProviders.length > 0) {
        for (const provider of activeProviders) {
          try {
            const response = await calendarSyncService.syncAppointmentToProvider(req.params.userId, newEvent, provider);
            if (response.success) {
              console.log("synced Event To Calendar Successfully");
            } else {
              console.log("Sync Failed to Calendar", error);
            }
          } catch (error) {
            console.error(`❌ Failed to sync event to ${provider.provider}:`, error);
          }
        }
      }
    }

    res.status(201).json({
      event: newEvent,
      message: "Event created successfully",
      repetitionsScheduled: repetitionJobIds ? true : false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// router.post("/:userId/events", async (req, res) => {
//   try {
//     const userId = req.params.userId;
//     const eventData = req.body;

//     console.log("Creating event for userId:", userId);
//     console.log("Event data received:", eventData);

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Generate unique event ID
//     const newEvent = {
//       id: uuidv4(),
//       ...eventData,
//       createdAt: new Date()
//     };

//     // Add event to user's events array
//     if (!user.events) {
//       user.events = [];
//     }
//     user.events.push(newEvent);

//     // === NEW: Process package-based payments ===
//     if (eventData.paymentType && Array.isArray(eventData.paymentType)) {
//       console.log("Processing payment types:", eventData.paymentType);

//       for (const payment of eventData.paymentType) {
//         // Only process package-based payments
//         if (payment.paymentMethod === 'paketten-tahsil' && payment.orderId && payment.packageId) {
//           console.log(`Incrementing session for order: ${payment.orderId}, package: ${payment.packageId}`);

//           try {
//             // Find the order and increment completedSessions
//             const order = await Order.findById(payment.orderId);

//             if (order && order.orderDetails?.events) {
//               // Find the specific package event in the order
//               for (let event of order.orderDetails.events) {
//                 if (
//                   event.eventType === 'package' &&
//                   event.package &&
//                   event.package.packageId?.toString() === payment.packageId.toString()
//                 ) {
//                   // Increment completedSessions
//                   event.package.completedSessions = (event.package.completedSessions || 0) + 1;
//                   console.log(`✅ Incremented completedSessions to ${event.package.completedSessions} for package ${payment.packageId}`);
//                   break;
//                 }
//               }

//               // Save the updated order
//               await order.save();
//               console.log(`✅ Order ${payment.orderId} updated successfully`);
//             } else {
//               console.warn(`⚠️ Order ${payment.orderId} not found or has no events`);
//             }
//           } catch (orderError) {
//             console.error(`❌ Error updating order ${payment.orderId}:`, orderError);
//             // Continue processing other payments even if one fails
//           }
//         }
//       }
//     }

//     await user.save();

//     // Send email notifications (existing code continues...)
//     // ... rest of your existing code

//     res.status(201).json({
//       message: "Event created successfully",
//       event: newEvent
//     });

//   } catch (err) {
//     console.error("Error creating event:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// Update event
router.put("/:userId/events/:eventId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const eventIndex = user.events.findIndex(event =>
      event.id === req.params.eventId || event._id.toString() === req.params.eventId
    );

    if (eventIndex === -1) {
      const eventIds = user.events.map(e => ({ id: e.id, _id: e._id }));
      return res.status(404).json({ error: "Event not found", availableEvents: eventIds });
    }

    const existingEvent = user.events[eventIndex];

    const eventData = req.body;
    const updatedEvent = {
      ...existingEvent,
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

    var dateChanged = eventData.date && eventData.date !== existingEvent.date;
    var timeChanged = eventData.time && eventData.time !== existingEvent.time;

    if (dateChanged || timeChanged) {
      try {
        const savedUser = await User.findById(req.params.userId);
        const savedEvent = savedUser.events.find(e => e.id === req.params.eventId);
        if (savedEvent) {
          const newJobId = await rescheduleReminderForEvent(savedUser, savedEvent, oldAgendaJobId);
          if (newJobId) {
            savedEvent.agendaJobId = newJobId;
            await savedUser.save();
            console.log("Rescheduled agenda job for event", req.params.eventId, "newJobId:", newJobId);
          } else {
            // if no new job scheduled, remove stored id
            if (oldAgendaJobId) {
              savedEvent.agendaJobId = undefined;
              await savedUser.save();
            }
          }
        }
      } catch (err) {
        console.error("Error rescheduling agenda job on event update:", err);
      }
    }

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

    // If date or time changed, notify customers about the update
    var dateChanged = eventData.date && eventData.date !== String(existingEvent.date || "");
    var timeChanged = eventData.time && eventData.time !== String(existingEvent.time || "");

    if (dateChanged || timeChanged) {
      setImmediate(async () => {
        try {
          const event = updatedEvent;
          const customerIds = event.customers || [];
          const selectedClients = event.selectedClients || [];

          // Prepare expert and event info
          const expertName = `${user.information.name} ${user.information.surname}`;
          const serviceName = event.serviceName || event.title;
          const date = event.date;
          const time = event.time;
          const joinLink = event.platform || "Link will be shared soon";

          // Resolve recipients
          let recipients = [];
          if (selectedClients && selectedClients.length > 0) {
            recipients = selectedClients.map(client => ({
              name: client.name,
              email: client.email,
            }));
          } else if (customerIds.length > 0) {
            const customers = await Customer.find({ _id: { $in: customerIds } }).select("email name");
            recipients = customers.map(c => ({
              name: c.name,
              email: c.email,
            }));
          }

          console.log("Sending date/time update emails to:", recipients.length, "recipients");

          for (const recipient of recipients) {
            const clientName = recipient.name;
            const customerEmailBody =
              `Merhaba ${clientName}, ${expertName} ile ${serviceName} randevunun zamanı güncellendi. ` +
              `Yeni tarih: ${date} ${time}. Katılım linki: ${joinLink}`;

            const customerEmailHTML = `
              <!DOCTYPE html>
              <html lang="tr">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; }
                      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
                      .header { background: #DBEAFE; padding: 40px 30px; text-align: center; color: #1f2937; }
                      .header h1 { font-size: 28px; font-weight: 600; margin-bottom: 8px; }
                      .content { padding: 40px 30px; }
                      .appointment-card { background: #F3F7F6; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #2563EB; }
                      .detail-item { margin: 12px 0; font-size: 15px; }
                      .detail-label { font-weight: 500; color: #374151; }
                      .detail-value { color: #1f2937; }
                      .join-link { background: #2563EB; color: white; padding: 15px 25px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 500; margin: 20px 0; }
                      .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
                  </style>
              </head>
              <body>
                  <div class="container">
                      <div class="header">
                          <h1>⏰ Randevu Zamanı Güncellendi</h1>
                          <p>Randevunuzun tarihi ve/veya saati değiştirildi</p>
                      </div>
                      <div class="content">
                          <p>Merhaba <strong>${clientName}</strong>,</p>
                          <p><strong>${expertName}</strong> ile <strong>${serviceName}</strong> randevunun zamanı güncellendi.</p>
                          <div class="appointment-card">
                              <div class="detail-item">
                                  <span class="detail-label">Yeni Tarih:</span>
                                  <span class="detail-value">${date}</span>
                              </div>
                              <div class="detail-item">
                                  <span class="detail-label">Yeni Saat:</span>
                                  <span class="detail-value">${time}</span>
                              </div>
                              <div class="detail-item">
                                  <span class="detail-label">Katılım Linki:</span>
                                  <span class="detail-value">${joinLink}</span>
                              </div>
                          </div>
                      </div>
                      <div class="footer">
                          <p>Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
                      </div>
                  </div>
              </body>
              </html>
            `;

            await sendEmail(recipient.email, {
              subject: "Randevu Zamanı Güncellendi",
              body: customerEmailBody,
              html: customerEmailHTML,
            });

            console.log(`✅ Date/time update email sent to customer: ${recipient.email}`);
          }
        } catch (emailError) {
          console.error("Error sending date/time update emails:", emailError);
          // Don't fail the request if email fails
        }
      });
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

    // Send Email to the customers and expert when booking is approved
    const event = user.events[eventIndex];
    const customerIds = event.customers || [];
    const selectedClients = event.selectedClients || [];

    // Send emails when status is approved
    if (status === 'approved') {
      try {
        // Prepare expert information
        const expertName = `${user.information.name} ${user.information.surname}`;

        // Prepare event details
        const serviceName = event.serviceName || event.title;
        const date = event.date;
        const time = event.time;
        const joinLink = event.platform || 'Link will be shared soon';

        // Get customer information from selectedClients
        let recipients = [];

        if (selectedClients && selectedClients.length > 0) {
          recipients = selectedClients.map(client => ({
            name: client.name,
            email: client.email
          }));
        } else if (customerIds.length > 0) {
          const customers = await Customer.find({ _id: { $in: customerIds } }).select('email name');
          recipients = customers.map(c => ({
            name: c.name,
            email: c.email
          }));
        }

        console.log("Sending approval emails to:", recipients.length, "recipients");

        // // Send email to each customer
        // for (const recipient of recipients) {
        //   const clientName = recipient.name;
        //   const customerEmailBody = `Merhaba ${clientName}, ${expertName} ile ${serviceName} randevu talebin onaylandı. Tarih: ${date} ${time}. Katılım linki: ${joinLink}`;



        //   // Enhanced HTML template for customer
        //   const customerEmailHTML = `
        //     <!DOCTYPE html>
        //     <html lang="tr">
        //     <head>
        //         <meta charset="UTF-8">
        //         <meta name="viewport" content="width=device-width, initial-scale=1.0">
        //         <style>
        //             body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; }
        //             .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        //             .header { background: #CDFA89; padding: 40px 30px; text-align: center; color: #1f2937; }
        //             .header h1 { font-size: 28px; font-weight: 600; margin-bottom: 8px; }
        //             .content { padding: 40px 30px; }
        //             .appointment-card { background: #F3F7F6; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #009743; }
        //             .detail-item { margin: 12px 0; font-size: 15px; }
        //             .detail-label { font-weight: 500; color: #374151; }
        //             .detail-value { color: #1f2937; }
        //             .join-link { background: #009743; color: white; padding: 15px 25px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 500; margin: 20px 0; }
        //             .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
        //         </style>
        //     </head>
        //     <body>
        //         <div class="container">
        //             <div class="header">
        //                 <h1>✅ Randevu Onaylandı</h1>
        //                 <p>Randevu talebiniz onaylandı</p>
        //             </div>
        //             <div class="content">
        //                 <p>Merhaba <strong>${clientName}</strong>,</p>
        //                 <p><strong>${expertName}</strong> ile <strong>${serviceName}</strong> randevu talebiniz onaylandı.</p>
        //                 <div class="appointment-card">
        //                     <div class="detail-item">
        //                         <span class="detail-label">Tarih:</span>
        //                         <span class="detail-value">${date}</span>
        //                     </div>
        //                     <div class="detail-item">
        //                         <span class="detail-label">Saat:</span>
        //                         <span class="detail-value">${time}</span>
        //                     </div>
        //                     <div class="detail-item">
        //                         <span class="detail-label">Katılım Linki:</span>
        //                         <span class="detail-value">${joinLink}</span>
        //                     </div>
        //                 </div>
        //             </div>
        //             <div class="footer">
        //                 <p>Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
        //             </div>
        //         </div>
        //     </body>
        //     </html>
        //   `;

        //   await sendEmail(recipient.email, {
        //     subject: 'Randevu Onaylandı',
        //     body: customerEmailBody,
        //     html: customerEmailHTML
        //   });

        //   console.log(`✅ Approval email sent to customer: ${recipient.email}`);
        // }

        // Send SMS notifications to customers
        console.log('📱 Sending SMS notifications to customers...');

        // Fetch full customer data to get phone numbers
        let customersWithPhones = [];

        if (selectedClients && selectedClients.length > 0) {
          // If selectedClients exist, we need to fetch their phone numbers from the Customer model
          const customerEmails = selectedClients.map(c => c.email);
          customersWithPhones = await Customer.find({ email: { $in: customerEmails } }).select('name email phone');
        } else if (customerIds.length > 0) {
          // Fetch customers by IDs
          customersWithPhones = await Customer.find({ _id: { $in: customerIds } }).select('name email phone');
        }

        console.log(`📱 Found ${customersWithPhones.length} customers with potential phone numbers`);

        // Send SMS to each customer with a valid phone number
        for (const customer of customersWithPhones) {
          if (customer.phone && customer.phone.trim() !== '') {
            const smsMessage = `Merhaba ${customer.name}, ${expertName} ile ${serviceName} randevunuz onaylandı. Tarih: ${date} ${time}. İyi günler!`;

            try {
              const smsResult = await sendSms(customer.phone, smsMessage);

              if (smsResult.success) {
                console.log(`✅ SMS sent successfully to ${customer.name} (${customer.phone}), JobID: ${smsResult.jobID}`);
              } else {
                console.error(`❌ Failed to send SMS to ${customer.name} (${customer.phone}): ${smsResult.error}`);
              }
            } catch (smsError) {
              console.error(`❌ Error sending SMS to ${customer.name} (${customer.phone}):`, smsError);
              // Don't fail the request if SMS fails
            }
          } else {
            console.log(`⚠️ Customer ${customer.name} (${customer.email}) has no phone number, skipping SMS`);
          }
        }


        // Send email to expert for each customer
        for (const recipient of recipients) {
          const expertEmailBody = `${recipient.name} ile ${serviceName} randevu talebin onaylandı. Tarih: ${date} ${time}. Katılım linki: ${joinLink}`;

          // Enhanced HTML template for expert
          const expertEmailHTML = `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
                    .header { background: #4CAF50; padding: 40px 30px; text-align: center; color: white; }
                    .header h1 { font-size: 28px; font-weight: 600; margin-bottom: 8px; }
                    .content { padding: 40px 30px; }
                    .appointment-card { background: #F3F7F6; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #4CAF50; }
                    .detail-item { margin: 12px 0; font-size: 15px; }
                    .detail-label { font-weight: 500; color: #374151; }
                    .detail-value { color: #1f2937; }
                    .join-link { background: #4CAF50; color: white; padding: 15px 25px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 500; margin: 20px 0; }
                    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Randevu Onaylandı</h1>
                        <p>Randevu talebi onaylandı</p>
                    </div>
                    <div class="content">
                        <p>Merhaba <strong>${expertName}</strong>,</p>
                        <p><strong>${recipient.name}</strong> ile <strong>${serviceName}</strong> randevu talebiniz onaylandı.</p>
                        <div class="appointment-card">
                            <div class="detail-item">
                                <span class="detail-label">Danışan:</span>
                                <span class="detail-value">${recipient.name}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Tarih:</span>
                                <span class="detail-value">${date}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Saat:</span>
                                <span class="detail-value">${time}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Katılım Linki:</span>
                                <span class="detail-value">${joinLink}</span>
                            </div>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
                    </div>
                </div>
            </body>
            </html>
          `;



          await sendEmail(user.information.email, {
            subject: 'Randevu Onaylandı',
            body: expertEmailBody,
            html: expertEmailHTML
          });
        }

        console.log(`✅ Approval email sent to expert: ${user.information.email}`);

      } catch (emailError) {
        console.error("Error sending approval emails:", emailError);
        // Don't fail the request if email fails
      }
    }

    // Send emails when status is cancelled/rejected
    else if (status === 'cancelled') {
      try {
        // Prepare expert information
        const expertName = `${user.information.name} ${user.information.surname}`;

        // Prepare event details
        const serviceName = event.serviceName || event.title;

        // Get customer information from selectedClients
        let recipients = [];

        if (selectedClients && selectedClients.length > 0) {
          recipients = selectedClients.map(client => ({
            name: client.name,
            email: client.email
          }));
        } else if (customerIds.length > 0) {
          const customers = await Customer.find({ _id: { $in: customerIds } }).select('email name');
          recipients = customers.map(c => ({
            name: c.name,
            email: c.email
          }));
        }

        console.log("Sending rejection/cancellation emails to:", recipients.length, "recipients");

        // Send email to each customer
        for (const recipient of recipients) {
          const clientName = recipient.name;
          const customerEmailBody = `Merhaba ${clientName}, ${serviceName} randevu talebin ${expertName} tarafından reddedildi. Detaylar için Uzmanlio hesabını kontrol edebilirsin.`;

          // Enhanced HTML template for customer rejection
          const customerEmailHTML = `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
                    .header { background: #fef3c7; padding: 40px 30px; text-align: center; color: #1f2937; }
                    .header h1 { font-size: 28px; font-weight: 600; margin-bottom: 8px; }
                    .content { padding: 40px 30px; }
                    .appointment-card { background: #F3F7F6; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #dc3545; }
                    .detail-item { margin: 12px 0; font-size: 15px; }
                    .detail-label { font-weight: 500; color: #374151; }
                    .detail-value { color: #1f2937; }
                    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
                    .info-box { background-color: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>❌ Randevu Reddedildi</h1>
                        <p>Randevu talebiniz reddedildi</p>
                    </div>
                    <div class="content">
                        <p>Merhaba <strong>${clientName}</strong>,</p>
                        <p><strong>${serviceName}</strong> randevu talebin <strong>${expertName}</strong> tarafından reddedildi.</p>
                        <div class="appointment-card">
                            <div class="detail-item">
                                <span class="detail-label">Hizmet:</span>
                                <span class="detail-value">${serviceName}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Uzman:</span>
                                <span class="detail-value">${expertName}</span>
                            </div>
                        </div>
                        <div class="info-box">
                            <p style="margin: 0; color: #004085;">
                                <strong>ℹ️ Bilgi:</strong> Detaylar için Uzmanlio hesabını kontrol edebilirsin.
                            </p>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
                    </div>
                </div>
            </body>
            </html>
          `;

          await sendEmail(recipient.email, {
            subject: 'Randevu Reddedildi',
            body: customerEmailBody,
            html: customerEmailHTML
          });

          console.log(`✅ Rejection email sent to customer: ${recipient.email}`);
        }

      } catch (emailError) {
        console.error("Error sending rejection emails:", emailError);
        // Don't fail the request if email fails
      }
    }

    // Send other status emails
    else if (customerIds.length > 0 || (selectedClients && selectedClients.length > 0)) {
      try {
        let customerEmails = [];

        if (selectedClients && selectedClients.length > 0) {
          customerEmails = selectedClients.map(c => c.email).filter(Boolean);
        } else {
          const customers = await Customer.find({ _id: { $in: customerIds } }).select('email');
          customerEmails = customers.map(c => c.email).filter(Boolean);
        }

        const meetingType = event.meetingType;

        if (customerEmails.length > 0) {
          if (meetingType === '1-1' && ['completed', 'pending'].includes(status)) {
            await sendBulkEmail(customerEmails, "Event Status Updated", "Your event status has been updated to " + status);
          } else if (meetingType === 'grup' && ['completed', 'pending'].includes(status)) {
            await sendBulkEmail(customerEmails, "Event Status Updated", "Your group event status has been updated to " + status);
          }
          // Note: 'cancelled' status is now handled in the dedicated block above
        }
      } catch (emailError) {
        console.error("Error sending customer emails:", emailError);
      }
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
    console.log("user is found");

    const eventIndex = user.events.findIndex(event => event.id === req.params.eventId);
    console.log("eventIndex is found:", eventIndex);

    if (eventIndex === -1) {
      return res.status(404).json({ error: "Event not found" });
    }

    const eventToDelete = user.events[eventIndex];
    const agendaJobId = eventToDelete.agendaJobId;
    console.log("agendaJobId is found:", agendaJobId);

    // === NEW: Remove order IDs and event ID from customers ===
    if (eventToDelete.paymentType && Array.isArray(eventToDelete.paymentType)) {
      console.log("🗑️ Removing event and order references from customers...");

      for (const payment of eventToDelete.paymentType) {
        try {
          const customerId = payment.customerId;
          const customer = await Customer.findById(customerId);

          if (customer) {
            // Remove order ID from customer's orders array if it exists
            if (payment.orderId && customer.orders) {
              const orderIndex = customer.orders.findIndex(
                orderId => orderId.toString() === payment.orderId.toString()
              );
              if (orderIndex !== -1) {
                customer.orders.splice(orderIndex, 1);
                console.log(`✅ Removed order ${payment.orderId} from customer ${customer.name}`);
              }
            }

            // Remove event ID from customer's appointments array
            if (customer.appointments) {
              const appointmentIndex = customer.appointments.findIndex(
                apptId => apptId.toString() === eventToDelete._id.toString()
              );
              if (appointmentIndex !== -1) {
                customer.appointments.splice(appointmentIndex, 1);
                console.log(`✅ Removed appointment ${eventToDelete._id} from customer ${customer.name}`);
              }
            }

            await customer.save();
            console.log(`✅ Updated customer ${customer.name} after event deletion`);
          }
        } catch (customerError) {
          console.error(`❌ Error updating customer ${payment.customerId}:`, customerError);
        }
      }
    }

    // Delete the event
    user.events.splice(eventIndex, 1);
    await user.save();
    console.log("event is deleted");

    // Cancel scheduled agenda job if existed
    if (agendaJobId) {
      try {
        await cancelAgendaJob(agendaJobId);
        console.log("Canceled agenda job for deleted event:", agendaJobId);
      } catch (err) {
        console.error("Failed to cancel agenda job when deleting event:", err);
      }
    }

    // Sync to connected calendars in background
    const providers = user.calendarProviders?.filter(cp => cp.isActive) || [];

    if (providers.length > 0) {
      setImmediate(async () => {
        for (const provider of providers) {
          try {
            await deleteAppointmentFromProvider(req.params.userId, eventToDelete, provider);
            console.log(`Deleted event ${eventToDelete.title} from ${provider.provider}`);
          } catch (error) {
            console.error(`Failed Deleting ${eventToDelete.title} from ${provider.provider}:`, error);
          }
        }
      });
    } else {
      console.log("No active calendar providers found for user", req.params.userId);
    }

    console.log("event is deleted SUCCESSFULLY");
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
    const { userId } = req.params;
    const { status, category, search } = req.query;

    // Find user and populate customer references inside 'customers.customerId'
    const user = await User.findById(userId)
      .populate({
        path: "customers.customerId",
        model: "Customer"
      })
      .lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    // Map to include full customer document + isArchived + addedAt
    let customers = (user.customers || []).map(c => ({
      ...c.customerId,            // full customer document
      isArchived: c.isArchived,   // keep flag from user
      addedAt: c.addedAt           // keep addedAt timestamp
    }));

    // Apply filters if provided
    if (status && status !== "all") {
      customers = customers.filter(c => c.status === status);
    }

    if (category && category !== "all") {
      customers = customers.filter(c => c.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(c =>
        (c.name && c.name.toLowerCase().includes(searchLower)) ||
        (c.surname && c.surname.toLowerCase().includes(searchLower)) ||
        (c.email && c.email.toLowerCase().includes(searchLower)) ||
        (c.phone && c.phone.includes(search))
      );
    }

    // Sort by lastContact or updatedAt
    customers.sort(
      (a, b) => new Date(b.lastContact || b.updatedAt) - new Date(a.lastContact || a.updatedAt)
    );

    res.json({ customers }); // FULL customer objects returned here
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get single customer by ID
router.get("/:userId/customers/:customerId", async (req, res) => {
  try {
    const { userId, customerId } = req.params;
    const customerIDFromRequest = customerId
    const user = await findUserById(userId);

    const ownsCustomer = user.customers.some(customerId => customerId === customerIDFromRequest);
    if (!ownsCustomer) return res.status(404).json({ error: "Customer not found for this user" });

    const customer = await Customer.findById(customerIDFromRequest);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    res.json({ customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new customer
router.post("/:userId/customers", async (req, res) => {
  try {
    const { userId } = req.params;
    const data = req.body;

    const user = await findUserById(userId);

    const existingCustomer = await Customer.findOne({ email: data.email });
    if (existingCustomer) return res.status(400).json({ error: "Bu e-posta ile bir danışan zaten kayıtlı" });

    const newCustomer = await Customer.create({
      name: data.name,
      surname: data.surname,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender || "prefer-not-to-say",
      address: {
        street: data.address?.street || "",
        city: data.address?.city || "",
        state: data.address?.state || "",
        postalCode: data.address?.postalCode || "",
        country: data.address?.country || "",
      },
      occupation: data.occupation || "",
      company: data.company || "",
      preferences: {
        communicationMethod: data.preferences?.communicationMethod || "email",
        language: data.preferences?.language || "tr",
        timezone: data.preferences?.timezone || "Europe/Istanbul",
        reminderSettings: {
          enabled: data.preferences?.reminderSettings?.enabled !== false,
          beforeHours: data.preferences?.reminderSettings?.beforeHours || 24
        }
      },
      status: data.status || "active",
      category: data.category || "",
      tags: data.tags || [],
      source: data.source || "website",
      referredBy: data.referredBy || "",
      appointments: data.appointments || [],
      totalAppointments: data.totalAppointments || 0,
      completedAppointments: data.completedAppointments || 0,
      cancelledAppointments: data.cancelledAppointments || 0,
      noShowAppointments: data.noShowAppointments || 0,
      totalSpent: data.totalSpent || 0,
      outstandingBalance: data.outstandingBalance || 0,
      paymentMethod: data.paymentMethod || "online",
      notes: data.notes || [],
      firstAppointment: data.firstAppointment || null,
      lastAppointment: data.lastAppointment || null,
      lastContact: data.lastContact || null,
      averageRating: data.averageRating || 0,
      totalRatings: data.totalRatings || 0,
      consentGiven: {
        termsAcceptionStatus: data.consentGiven?.termsAcceptionStatus,
        dataProcessingTerms: data.consentGiven?.dataProcessingTerms,
        marketingTerms: data.consentGiven?.marketingTerms,
        dateGiven: data.consentGiven?.dateGiven
      },
      isArchived: data.isArchived || false
    });

    user.customers.push({
      customerId: newCustomer._id,
      isArchived: false,
      addedAt: new Date()
    });
    await user.save();

    res.status(201).json({ customer: newCustomer, message: "Danışan başarıyla eklendi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer
router.put("/:userId/customers/:customerId", async (req, res) => {
  try {
    const { userId, customerId } = req.params;
    const data = req.body || {};

    const user = await findUserById(userId);
    if (!user.customers.includes(customerId)) return res.status(404).json({ error: "Customer not found for this user" });

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    // Email uniqueness
    if (data.email && data.email !== customer.email) {
      const emailTaken = await Customer.findOne({ email: data.email, _id: { $ne: customerId } });
      if (emailTaken) return res.status(400).json({ error: "Bu e-posta adresi başka bir danışanda kayıtlı" });
      customer.email = data.email;
    }

    // Shallow fields
    ["name", "surname", "phone", "gender", "occupation", "company", "status", "category", "paymentMethod"].forEach(f => {
      if (data[f] !== undefined) customer[f] = data[f];
    });
    if (data.dateOfBirth !== undefined) customer.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;

    // Address merge
    if (data.address) customer.address = { ...(customer.address || {}), ...data.address };

    // Preferences merge
    if (data.preferences) {
      customer.preferences = {
        communicationMethod: data.preferences.communicationMethod ?? customer.preferences?.communicationMethod ?? "email",
        language: data.preferences.language ?? customer.preferences?.language ?? "tr",
        timezone: data.preferences.timezone ?? customer.preferences?.timezone ?? "Europe/Istanbul",
        reminderSettings: { ...(customer.preferences?.reminderSettings || {}), ...(data.preferences.reminderSettings || {}) }
      };
    }

    // Tags
    if (Array.isArray(data.tags)) customer.tags = data.tags;

    // Source / referredBy
    ["source", "referredBy"].forEach(f => { if (data[f] !== undefined) customer[f] = data[f]; });

    // Consent merge
    if (data.consentGiven) {
      const normalized = {
        termsAcceptionStatus: data.consentGiven.termsAcceptionStatus ?? data.consentGiven.termsAcception ?? customer.consentGiven?.termsAcceptionStatus,
        dataProcessingTerms: data.consentGiven.dataProcessingTerms ?? data.consentGiven.dataProcessing ?? customer.consentGiven?.dataProcessingTerms,
        marketingTerms: data.consentGiven.marketingTerms ?? data.consentGiven.marketing ?? customer.consentGiven?.marketingTerms,
        dateGiven: data.consentGiven.dateGiven ? new Date(data.consentGiven.dateGiven) : (data.consentGiven.dataProcessing || data.consentGiven.marketing) ? (customer.consentGiven?.dateGiven || new Date()) : customer.consentGiven?.dateGiven
      };
      customer.consentGiven = { ...customer.consentGiven, ...normalized };
    }

    // Appointments / stats
    ["appointments", "totalAppointments", "completedAppointments", "cancelledAppointments", "noShowAppointments", "totalSpent", "outstandingBalance", "averageRating", "totalRatings", "notes"].forEach(f => {
      if (data[f] !== undefined) customer[f] = data[f];
    });

    // Important dates
    ["firstAppointment", "lastAppointment", "lastContact"].forEach(f => { if (data[f]) customer[f] = new Date(data[f]); });

    if (data.isArchived !== undefined) customer.isArchived = !!data.isArchived;
    customer.updatedAt = new Date();
    await customer.save();

    res.json({ customer, message: "Danışan başarıyla güncellendi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete customer reference from user
router.delete("/:userId/customers/:customerId", async (req, res) => {
  try {
    const { userId, customerId } = req.params;
    let customId = customerId
    const user = await findUserById(userId);

    const customerIndex = user.customers.findIndex(customer =>
      customer.customerId === customId || customer.customerId._id.toString() === customId
    );

    if (customerIndex === -1) {
      const eventIds = user.customers.map(e => ({ id: e.id, _id: e._id }));
      return res.status(404).json({ error: "Event not found", availableEvents: eventIds });
    }

    // const index = user.customers.findIndex(id => id.toString() === customerId);
    // if (index === -1) return res.status(404).json({ error: "Customer not found for this user" });
    const customerToDelete = Customer.findById(customId);
    if (!customerToDelete) return res.status(404).json({ error: "Customer not found" });
    await customerToDelete.deleteOne();
    user.customers.splice(customerIndex, 1);
    await user.save();

    res.json({ message: "Customer reference successfully removed from user" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Archive/Unarchive customer
router.patch("/:userId/customers/:customerId/archive", async (req, res) => {
  try {
    const { userId, customerId } = req.params;
    const { isArchived } = req.body;

    const user = await findUserById(userId);
    if (!user.customers.includes(customerId)) return res.status(404).json({ error: "Customer not found for this user" });

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    customer.isArchived = !!isArchived;
    customer.updatedAt = new Date();
    await customer.save();

    res.json({ customer, message: `Danışan ${customer.isArchived ? "arşivlendi" : "arşivden çıkarıldı"}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer status
router.patch("/:userId/customers/:customerId/status", async (req, res) => {
  try {
    const { userId, customerId } = req.params;
    const { status } = req.body;

    if (!["active", "inactive", "blocked", "prospect"].includes(status))
      return res.status(400).json({ error: "Invalid status" });

    const user = await findUserById(userId);
    if (!user.customers.includes(customerId)) return res.status(404).json({ error: "Customer not found for this user" });

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    customer.status = status;
    customer.updatedAt = new Date();
    await customer.save();

    res.json({ customer, message: `Danışan durumu ${status} olarak güncellendi` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//===========Export customers CSV =========================
router.get("/:userId/customerscsv/export", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate({
        path: "customers.customerId",
        model: "Customer",
      })
      .lean();
    console.log("User customers:", user.customers);

    if (!user) return res.status(404).json({ error: "User not found" });

    const csvData = (user.customers || [])
      .map(c => {
        const customer = c.customerId;
        if (!customer) return null;

        return {
          name: customer.name,
          surname: customer.surname,
          email: customer.email,
          phone: customer.phone,
          dateOfBirth: customer.dateOfBirth
            ? customer.dateOfBirth.toISOString().split("T")[0]
            : "",
          gender: customer.gender || "",
        };
      })
      .filter(Boolean);

    // Convert JSON → CSV
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(csvData);

    // Set CSV headers for download
    res.header("Content-Type", "text/csv");
    res.attachment("customers.csv");
    return res.send(csv);

  } catch (error) {
    console.error("CSV Export Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// ==================== CUSTOMER NOTES ROUTES ====================

// Get customer notes
router.get("/:userId/customers/:customerId/notes", async (req, res) => {
  try {
    const { userId, customerId } = req.params;

    // Fetch user
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if this customer belongs to the user
    const belongsToUser = user.customers.some(c => c.customerId.toString() === customerId);
    if (!belongsToUser) return res.status(404).json({ error: "Customer not found for this user" });

    // Fetch customer
    const customer = await Customer.findById(customerId).lean();
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    // Sort notes by newest first
    const notes = (customer.notes || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Return full notes + minimal customer info
    res.json({
      notes,
      customer: {
        id: customer._id,
        name: customer.name,
        surname: customer.surname,
        email: customer.email,
        phone: customer.phone,
        // include other fields if needed
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Add customer note
router.post("/:userId/customers/:customerId/notes",
  customerNoteUpload.single(),
  handleMulterError,
  async (req, res) => {
    try {
      const { userId, customerId } = req.params;
      const noteData = req.body;

      const user = await findUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const belongsToUser = user.customers.some(c => c.customerId.toString() === customerId);
      if (!belongsToUser) return res.status(404).json({ error: "Customer not found for this user" });

      const customer = await Customer.findById(customerId);
      if (!customer) return res.status(404).json({ error: "Customer not found" });

      const noteId = uuidv4();

      // Handle file upload if present
      const files = [];
      if (req.file) {
        const relativePath = `/uploads/Experts_Files/customer_notes/${req.file.filename}`;
        const fileUrl = `${req.protocol}://${req.get("host")}${relativePath}`;

        // Determine file type
        let fileType = 'document';
        if (req.file.mimetype.startsWith('image/')) {
          fileType = 'image';
        } else if (req.file.mimetype === 'application/pdf') {
          fileType = 'pdf';
        }

        files.push({
          name: req.file.originalname,
          type: fileType,
          size: `${(req.file.size / 1024).toFixed(1)} KB`,
          url: fileUrl,
          uploadedAt: new Date()
        });
      }

      const newNote = {
        id: noteId,
        content: noteData.content || '',
        author: noteData.author || 'expert',
        authorName: noteData.authorName || user.information?.name || 'Expert',
        files: files,
        isPrivate: noteData.isPrivate === 'true' || noteData.isPrivate === true,
        tags: noteData.tags ? (Array.isArray(noteData.tags) ? noteData.tags : [noteData.tags]) : [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      customer.notes.push(newNote);
      customer.lastContact = new Date();
      customer.updatedAt = new Date();
      await customer.save();

      res.status(201).json({ note: newNote, message: "Not başarıyla eklendi" });
    } catch (error) {
      console.error('Error adding customer note:', error);
      res.status(500).json({ error: error.message });
    }
  }
);


// Update customer note
router.put("/:userId/customers/:customerId/notes/:noteId", async (req, res) => {
  try {
    const { userId, customerId, noteId } = req.params;
    const noteData = req.body;

    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const belongsToUser = user.customers.some(c => c.customerId.toString() === customerId);
    if (!belongsToUser) return res.status(404).json({ error: "Customer not found for this user" });

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const noteIndex = customer.notes.findIndex(note => note.id === noteId);
    if (noteIndex === -1) return res.status(404).json({ error: "Note not found" });

    const updatedNote = {
      ...customer.notes[noteIndex],
      content: noteData.content,
      files: noteData.files || customer.notes[noteIndex].files,
      isPrivate: noteData.isPrivate ?? customer.notes[noteIndex].isPrivate,
      tags: noteData.tags || customer.notes[noteIndex].tags,
      updatedAt: new Date()
    };

    customer.notes[noteIndex] = updatedNote;
    customer.updatedAt = new Date();
    await customer.save();

    res.json({ note: updatedNote, message: "Not başarıyla güncellendi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Delete customer note
router.delete("/:userId/customers/:customerId/notes/:noteId", async (req, res) => {
  try {
    const { userId, customerId, noteId } = req.params;

    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const belongsToUser = user.customers.some(c => c.customerId.toString() === customerId);
    if (!belongsToUser) return res.status(404).json({ error: "Customer not found for this user" });

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const noteIndex = customer.notes.findIndex(note => note.id === noteId);
    if (noteIndex === -1) return res.status(404).json({ error: "Note not found" });

    customer.notes.splice(noteIndex, 1);
    customer.updatedAt = new Date();
    await customer.save();

    res.json({ message: "Not başarıyla silindi" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==================== CUSTOMER STATISTICS ROUTES ====================
router.get("/:userId/customersStats", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const customerIds = user.customers.map(c => c.customerId);
    const customers = await Customer.find({ _id: { $in: customerIds } });

    const stats = {
      total: customers.length,
      active: customers.filter(c => c.status === 'active').length,
      inactive: customers.filter(c => c.status === 'inactive').length,
      blocked: customers.filter(c => c.status === 'blocked').length,
      prospects: customers.filter(c => c.status === 'prospect').length,
      archived: customers.filter(c => c.isArchived).length,
      totalAppointments: customers.reduce((sum, c) => sum + (c.totalAppointments || 0), 0),
      completedAppointments: customers.reduce((sum, c) => sum + (c.completedAppointments || 0), 0),
      cancelledAppointments: customers.reduce((sum, c) => sum + (c.cancelledAppointments || 0), 0),
      noShowAppointments: customers.reduce((sum, c) => sum + (c.noShowAppointments || 0), 0),
      totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
      outstandingBalance: customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0),
      newCustomersThisMonth: customers.filter(c => {
        const created = new Date(c.createdAt);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
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
      sourceBreakdown: customers.reduce((acc, c) => {
        acc[c.source || 'unknown'] = (acc[c.source || 'unknown'] || 0) + 1;
        return acc;
      }, {}),
      averageRating: customers.length > 0 ? customers.reduce((sum, c) => sum + (c.averageRating || 0), 0) / customers.length : 0,
      categoryBreakdown: customers.reduce((acc, c) => {
        acc[c.category || 'uncategorized'] = (acc[c.category || 'uncategorized'] || 0) + 1;
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
    const { userId } = req.params;
    const { customers: customersData } = req.body;

    if (!Array.isArray(customersData) || customersData.length === 0)
      return res.status(400).json({ error: "Invalid customers data" });

    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < customersData.length; i++) {
      const cData = customersData[i];
      try {
        if (!cData.name || !cData.surname || !cData.email || !cData.phone) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        const existing = await Customer.findOne({ email: cData.email });
        if (existing) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: Customer with email ${cData.email} already exists`);
          continue;
        }

        const newCustomer = await Customer.create({
          name: cData.name,
          surname: cData.surname,
          email: cData.email,
          phone: cData.phone,
          dateOfBirth: cData.dateOfBirth ? new Date(cData.dateOfBirth) : undefined,
          gender: cData.gender || 'prefer-not-to-say',
          occupation: cData.occupation,
          company: cData.company,
          status: cData.status || 'active',
          category: cData.category,
          source: cData.source || 'bulk-import',
          referredBy: cData.referredBy,
          preferences: {
            communicationMethod: cData.communicationMethod || 'email',
            language: 'tr',
            timezone: 'Europe/Istanbul',
            reminderSettings: { enabled: true, beforeHours: 24 }
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
          consentGiven: { dataProcessingTerms: true, marketingTerms: cData.marketingConsent || false, dateGiven: new Date() },
          isArchived: false
        });

        // Push properly structured object to User.customers
        user.customers.push({
          customerId: newCustomer._id,
          isArchived: false,
          addedAt: new Date()
        });

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${err.message}`);
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
// router.get("/:userId/customers/export", async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // Fetch the user with populated customer references
//     const user = await User.findById(userId)
//       .populate({
//         path: "customers.customerId", // populate the referenced Customer
//         model: "Customer"
//       })
//       .lean();

//     if (!user) return res.status(404).json({ error: "User not found" });

//     // Map customers to include full data + isArchived/addedAt from user.customers
//     const csvData = (user.customers || []).map(c => {
//       const customer = c.customerId; // populated customer document
//       if (!customer) return null; // skip if somehow not found
//       return {
//         name: customer.name,
//         surname: customer.surname,
//         email: customer.email,
//         phone: customer.phone,
//         dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.toISOString().split('T')[0] : null,
//         gender: customer.gender || '',
//         // occupation: customer.occupation || '',
//         // company: customer.company || '',
//         // status: customer.status,
//         // category: customer.category || '',
//         // source: customer.source || '',
//         // referredBy: customer.referredBy || '',
//         // totalAppointments: customer.totalAppointments || 0,
//         // completedAppointments: customer.completedAppointments || 0,
//         // totalSpent: customer.totalSpent || 0,
//         // averageRating: customer.averageRating || 0,
//         // lastAppointment: customer.lastAppointment ? customer.lastAppointment.toISOString().split('T')[0] : null,
//         // createdAt: customer.createdAt.toISOString().split('T')[0],
//         // // Added fields from User model
//         // isArchived: c.isArchived || false,
//         // addedAt: c.addedAt ? new Date(c.addedAt).toISOString().split('T')[0] : ''
//       };
//     }).filter(Boolean); // remove any nulls

//     res.json({ customers: csvData, message: "Customer data exported successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });






export default router;