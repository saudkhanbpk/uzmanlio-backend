import express from "express";
import fs from "fs";
import { verifyAccessToken } from "../../middlewares/auth.js";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { createMulterUpload, handleMulterError } from "../../middlewares/upload.js";
import User from "../../models/expertInformation.js";
import calendarSyncService from "../../services/calendarSyncService.js";
import { sendBulkEmail, sendEmail } from "../../services/email.js";
import { Parser } from "json2csv";
import {
  getExpertEventCreatedTemplate, getClient11SessionTemplate,
  getClientGroupSessionTemplate, getClientPackageSessionTemplate,
  getGroupSessionConfirmationTemplate, getClientAppointmentCreatedTemplate,
  getEventUpdatedTemplate
} from "../../services/eventEmailTemplates.js";
import {
  getCancellationEmailTemplate,
  getAppointmentApprovedBireyselTemplate,
  getGroupSessionApprovedTemplate
} from "../../services/emailTemplates.js";
import { sendSms } from "../../services/netgsmService.js";
import agenda from "../../services/agendaService.js";
import Order from "../../models/orders.js";
import Event from "../../models/event.js";
import Service from "../../models/service.js";
import Package from "../../models/package.js";
import { scheduleRepeatedEvents } from "../../services/repetitionAgendaService.js";
import expertEventController from "../../controllers/expertEventController.js";
import { validateRequest, validateBody, validateParams } from "../../middlewares/validateRequest.js";
import { expertSchemas } from "../../validations/index.js";

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
  validateParams(expertSchemas.userIdParams),
  verifyAccessToken,
  // Existing image check middleware
  async (req, res, next) => {
    try {
      console.log("Received upload request for userId:", req.params.userId);

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
      const fileUrl = `${process.env.BASE_URL || `${req.protocol}://${req.get("host")}`}${relativePath}`;

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
router.get("/:userId/profile",
  validateParams(expertSchemas.userIdParams),
  async (req, res) => {
    try {
      console.log("Fetching complete profile for userId:", req.params.userId);
      const user = await User.findById(req.params.userId)
        .populate([
          {
            path: "customers.customerId",
            model: "Customer"
          }
        ]);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Fetch documents from standalone collections
      const [userEvents, userServices, userPackages] = await Promise.all([
        Event.find({ expertId: req.params.userId }).lean(),
        Service.find({ expertId: req.params.userId }).lean(),
        Package.find({ expertId: req.params.userId }).lean()
      ]);

      // Return user object with gathered data
      const userObject = user.toObject();
      userObject.events = userEvents;
      userObject.services = userServices;
      userObject.packages = userPackages;

      res.json(userObject);
    } catch (error) {
      res.status(404).json({
        error: error.message,
        requestedUserId: req.params.userId,
        debug: "Check server logs for more details"
      });
    }
  });

router.get("/:userId",
  validateParams(expertSchemas.userIdParams),
  async (req, res) => {
    try {
      console.log("Fetching profile for userId:", req.params.userId);

      const user = await User.findById(req.params.userId)
        .populate([
          {
            path: "customers.customerId",
            model: "Customer"
          }
        ]);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Fetch services and packages directly
      const [userServices, userPackages] = await Promise.all([
        Service.find({ expertId: req.params.userId }).lean(),
        Package.find({ expertId: req.params.userId }).lean()
      ]);

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
      userObject.services = userServices;
      userObject.packages = userPackages;

      // Fetch events from the Event collection
      const userEvents = await Event.find({ expertId: req.params.userId }).lean();
      userObject.events = userEvents;

      res.json(userObject);

    } catch (err) {
      console.error("Fetch error:", err);
      res.status(400).json({ error: err.message });
    }
  });

router.put("/:userId",
  validateParams(expertSchemas.userIdParams),
  validateBody(expertSchemas.updateProfileSchema),
  verifyAccessToken,
  async (req, res) => {
    try {
      console.log("Updating profile for userId:", req.params.userId);

      // ⛔ CRITICAL: Prevent password deletion
      // Passwords should ONLY be changed through dedicated auth routes (signup/reset-password)
      const updateData = { ...req.body };
      if (updateData.information) {
        delete updateData.information.password;
        console.log("🔒 Password field excluded from profile update");
      }

      const expertInformation = await User.findByIdAndUpdate(
        req.params.userId,
        updateData,
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

router.patch("/:userId",
  validateParams(expertSchemas.userIdParams),
  validateBody(expertSchemas.updateProfileSchema),
  verifyAccessToken,
  async (req, res) => {
    try {
      console.log("Patching profile for userId:", req.params.userId);

      // ⛔ CRITICAL: Prevent password deletion
      // Passwords should ONLY be changed through dedicated auth routes (signup/reset-password)
      const updateData = { ...req.body };
      if (updateData.information) {
        delete updateData.information.password;
        console.log("🔒 Password field excluded from profile patch");
      }

      const expertInformation = await User.findByIdAndUpdate(
        req.params.userId,
        { $set: updateData },
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
router.get("/:userId/titles",
  validateParams(expertSchemas.userIdParams),
  async (req, res) => {
    try {
      const user = await findUserById(req.params.userId);
      res.json({ titles: user.titles || [] });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

// Add expert title
router.post("/:userId/titles",
  validateParams(expertSchemas.userIdParams),
  validateBody(expertSchemas.titleSchema),
  verifyAccessToken,
  async (req, res) => {
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
router.put("/:userId/titles/:titleId",
  validateParams(expertSchemas.userIdAndItemParams),
  validateBody(expertSchemas.titleSchema),
  verifyAccessToken,
  async (req, res) => {
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
router.delete("/:userId/titles/:titleId",
  validateParams(expertSchemas.userIdAndItemParams),
  verifyAccessToken,
  async (req, res) => {
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
router.get("/:userId/categories",
  validateParams(expertSchemas.userIdParams),
  async (req, res) => {
    try {
      const user = await findUserById(req.params.userId);
      res.json({ categories: user.expertInformation?.subs || [] });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

// Add expert category
router.post("/:userId/categories",
  validateParams(expertSchemas.userIdParams),
  validateBody(expertSchemas.categorySchema),
  verifyAccessToken,
  async (req, res) => {
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
router.delete("/:userId/categories/:categoryId",
  validateParams(expertSchemas.userIdAndItemParams),
  verifyAccessToken,
  async (req, res) => {
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
router.get("/:userId/education",
  validateParams(expertSchemas.userIdParams),
  async (req, res) => {
    try {
      const user = await findUserById(req.params.userId);
      res.json({ education: user.resume?.education || [] });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

// Add education
router.post("/:userId/education",
  validateParams(expertSchemas.userIdParams),
  validateBody(expertSchemas.educationSchema),
  verifyAccessToken,
  async (req, res) => {
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
router.put("/:userId/education/:educationId",
  validateParams(expertSchemas.userIdAndItemParams),
  validateBody(expertSchemas.educationSchema),
  verifyAccessToken,
  async (req, res) => {
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
router.delete("/:userId/education/:educationId",
  validateParams(expertSchemas.userIdAndItemParams),
  verifyAccessToken,
  async (req, res) => {
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
router.get("/:userId/certificates",
  validateParams(expertSchemas.userIdParams),
  async (req, res) => {
    try {
      const user = await findUserById(req.params.userId);
      res.json({ certificates: user.certificates || [] });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

// Add certificate
router.post("/:userId/certificates",
  validateParams(expertSchemas.userIdParams),
  validateBody(expertSchemas.certificateSchema),
  verifyAccessToken,
  async (req, res) => {
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
router.put("/:userId/certificates/:certificateId",
  validateParams(expertSchemas.userIdAndItemParams),
  validateBody(expertSchemas.certificateSchema),
  verifyAccessToken, // Added verifyAccessToken for security consistency
  async (req, res) => {
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
router.delete("/:userId/certificates/:certificateId",
  validateParams(expertSchemas.userIdAndItemParams),
  verifyAccessToken, // Added verifyAccessToken for security consistency
  async (req, res) => {
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
router.get("/:userId/experience",
  validateParams(expertSchemas.userIdParams),
  async (req, res) => {
    try {
      const user = await findUserById(req.params.userId);
      res.json({ experience: user.experience || [] });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

// Add experience
router.post("/:userId/experience",
  validateParams(expertSchemas.userIdParams),
  validateBody(expertSchemas.experienceSchema),
  verifyAccessToken, // Added verifyAccessToken for security consistency
  async (req, res) => {
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
router.put("/:userId/experience/:experienceId",
  validateParams(expertSchemas.userIdAndItemParams),
  validateBody(expertSchemas.experienceSchema),
  verifyAccessToken, // Added verifyAccessToken for security consistency
  async (req, res) => {
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
router.delete("/:userId/experience/:experienceId",
  validateParams(expertSchemas.userIdAndItemParams),
  verifyAccessToken, // Added verifyAccessToken for security consistency
  async (req, res) => {
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
router.get("/:userId/skills",
  validateParams(expertSchemas.userIdParams),
  async (req, res) => {
    try {
      const user = await findUserById(req.params.userId);
      res.json({ skills: user.skills || [] });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

// Add skill
router.post("/:userId/skills",
  validateParams(expertSchemas.userIdParams),
  validateBody(expertSchemas.skillSchema),
  verifyAccessToken, // Added verifyAccessToken for security consistency
  async (req, res) => {
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
router.put("/:userId/skills/:skillId",
  validateParams(expertSchemas.userIdAndItemParams),
  validateBody(expertSchemas.skillSchema),
  verifyAccessToken, // Added verifyAccessToken for security consistency
  async (req, res) => {
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
router.delete("/:userId/skills/:skillId",
  validateParams(expertSchemas.userIdAndItemParams),
  verifyAccessToken, // Added verifyAccessToken for security consistency
  async (req, res) => {
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
router.get("/:userId/availability",
  validateParams(expertSchemas.userIdParams),
  async (req, res) => {
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
router.put("/:userId/availability",
  validateParams(expertSchemas.userIdParams),
  validateBody(expertSchemas.availabilitySchema),
  verifyAccessToken, // Added verifyAccessToken for security consistency
  async (req, res) => {
    try {
      const { alwaysAvailable, selectedSlots } = req.body;

      console.log("📅 [Availability Update] Received request:");
      console.log("   - alwaysAvailable:", alwaysAvailable);
      console.log("   - selectedSlots count:", selectedSlots?.length || 0);
      console.log("   - selectedSlots sample:", selectedSlots?.slice(0, 5));

      const user = await findUserById(req.params.userId);

      // Create the availability object with proper array handling
      user.availability = {
        alwaysAvailable: alwaysAvailable === true,
        selectedSlots: Array.isArray(selectedSlots) ? [...selectedSlots] : [],
        lastUpdated: new Date()
      };

      // Force Mongoose to detect the change on embedded document
      user.markModified('availability');

      await user.save();

      // Verify the save worked
      const updatedUser = await findUserById(req.params.userId);

      console.log("✅ [Availability Update] Saved successfully:");
      console.log("   - alwaysAvailable:", updatedUser.availability?.alwaysAvailable);
      console.log("   - selectedSlots count:", updatedUser.availability?.selectedSlots?.length || 0);

      res.json({
        availability: updatedUser.availability,
        message: "Availability settings updated successfully"
      });
    } catch (error) {
      console.error("❌ [Availability Update] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
// Update complete expert profile
router.put("/:userId/profile",
  validateParams(expertSchemas.userIdParams),
  validateBody(expertSchemas.bulkUpdateProfileSchema),
  verifyAccessToken, // Added verifyAccessToken for security consistency
  async (req, res) => {
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

export default router;