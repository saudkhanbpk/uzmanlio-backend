import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { createMulterUpload, handleMulterError } from "../../middlewares/upload.js";
import User from "../../models/expertInformation.js";
import CustomerNote from "../../models/customerNotes.js";
import calendarSyncService from "../../services/calendarSyncService.js";
import Customer from "../../models/customer.js";
import CustomerAppointments from "../../models/customerAppointment.js";
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
import { scheduleRepeatedEvents } from "../../services/repetitionAgendaService.js";
import expertEventController from "../../controllers/expertEventController.js";
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
router.get("/:userId/profile", async (req, res) => {
  try {
    console.log("Fetching complete profile for userId:", req.params.userId);
    const user = await User.findById(req.params.userId)
      .populate([
        {
          path: "customers.customerId",
          model: "Customer"
        },
        {
          path: "services",
          model: "Service"
        },
        {
          path: "packages",
          model: "Package"
        }
      ]);
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

    const user = await User.findById(req.params.userId)
      .populate([
        {
          path: "customers.customerId",
          model: "Customer"
        },
        {
          path: "services",
          model: "Service"
        },
        {
          path: "packages",
          model: "Package"
        }
      ]);

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

    // Fetch customer with populated notes
    const customer = await Customer.findById(customerId).populate('notes').lean();
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
  customerNoteUpload.single('file'),
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

      // Handle file upload
      const files = [];
      if (req.file) {
        const file = req.file;
        const fileUrl = `/uploads/Experts_Files/customer_notes/${file.filename}`;
        let fileType = 'document';
        if (file.mimetype.startsWith('image/')) fileType = 'image';
        else if (file.mimetype === 'application/pdf') fileType = 'pdf';

        files.push({
          name: file.originalname,
          type: fileType,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          url: fileUrl,
          uploadedAt: new Date()
        });
      }

      const newNote = new CustomerNote({
        id: noteId,
        content: noteData.content || '',
        author: noteData.author || 'expert',
        authorName: noteData.authorName || user.information?.name || 'Expert',
        files: files,
        isPrivate: noteData.isPrivate === 'true' || noteData.isPrivate === true,
        tags: noteData.tags ? (Array.isArray(noteData.tags) ? noteData.tags : [noteData.tags]) : [],
      });

      await newNote.save();

      customer.notes.push(newNote._id);
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