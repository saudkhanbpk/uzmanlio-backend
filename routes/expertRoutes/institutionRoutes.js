import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { createMulterUpload, handleMulterError } from "../../middlewares/upload.js";
import User from "../../models/expertInformation.js";
import Institution from "../../models/institution.js";

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


//Helper Function to Find user institution
const findInstitutionByID = async (institutionId) => {
  let institution;

  // Try to find by MongoDB ObjectId first
  if (mongoose.Types.ObjectId.isValid(institutionId)) {
    institution = await Institution.findById(institutionId);
  }
  if (!institution) {
    throw new Error('Institution not found');
  }
  return institution;
};

////////////////////////////////////////////////////////////////////

// Create institution profile upload configuration
const institutionLogoUpload = createMulterUpload({
  uploadPath: "uploads/Experts_Files/Institution/Logo",
  fieldName: "institutionLogo",
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



// Create institution Axe upload configuration
const institutionAxeUpload = createMulterUpload({
  uploadPath: "uploads/Experts_Files/Institution/Axe",
  fieldName: "institutionAxe",
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

// Create combined upload configuration for both logo and axe
const institutionFilesUpload = createMulterUpload({
  uploadPath: "uploads/Experts_Files/Institution",
  fields: [
    { name: 'logo', maxCount: 1 },
    { name: 'axe', maxCount: 1 }
  ],
  maxFileSize: 5, // 5MB
  allowedExtensions: ["jpg", "jpeg", "png", "gif"],
  fileNameGenerator: (req, file) => {
    const userId = req.params.userId || 'unknown';
    const fileType = file.fieldname; // 'logo' or 'axe'
    const timestamp = Date.now();
    const extension = path.extname(file.originalname).toLowerCase();
    return `${userId}-${fileType}-${timestamp}${extension}`;
  }
});

/////////Get Institution Profile/////////
router.get("/:userId/institution", async (req, res) => {
    const userId = req.params.userId;
    try {
      const user = await findUserById(userId);
      if (user){
      const institution = await Institution.findOne({ Admin: user._id });
      return res.json({ institution });
      }

      // If user has no institution, return empty object
      if (!institution) {
        return res.json({ institution: {} });
      }

      // const institution = await findInstitutionByID(institutionID);
    } catch (error) {
      console.error("Error fetching institution:", error);
      res.status(500).json({ error: error.message });
    }
});


/////////Update Institution Profile/////////
// Use multer middleware to handle multipart form data
router.put("/:userId/institution/Update",institutionFilesUpload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'axe', maxCount: 1 }
  ]),async (req, res) => {
    try {
        console.log("Updating institution:", req.params.userId);
        console.log("Request body:", req.body);
        console.log("Uploaded files:", req.files);

        const { name, bio, about } = req.body;
        const user = await findUserById(req.params.userId);

        // Get file paths if uploaded
        const logoPath = req.files?.logo?.[0]?.path || null;
        const axePath = req.files?.axe?.[0]?.path || null;

        // Get institution ID from user
        const institution = await Institution.findOne({Admin : user._id});

        if(!institution){
          console.log("Creating new institution");
          // Create new institution
          institution = new Institution({
            Admin: user._id,
            name,
            bio,
            about,
            logo: logoPath || null,
            officialAxe: axePath || null,
            users: [user._id],
            invitedUsers: []
          });
          await institution.save();
          user.subscription.institutionId = institution._id;
          await user.save();

          return res.json({
            institution,
            message: "Institution created successfully"
          });
        }

        // Update existing institution fields
        if (name) institution.name = name;
        if (bio) institution.bio = bio;
        if (about) institution.about = about;
        if (logoPath) institution.logo = logoPath;
        if (axePath) institution.officialAxe = axePath;

        await institution.save();

        res.json({
          institution,
          message: "Institution updated successfully"
        });

    }catch (error) {
      console.error("Error updating institution:", error);
      res.status(500).json({ error: error.message });
    }
});

// ========== INVITED USERS ROUTES ==========

// Get invited users for institution
router.get("/:userId/institution/invited-users", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const institution = await Institution.findOne({Admin : req.params.userId})
    if (!institution) {
      return res.json({ invitedUsers: [] });
    }
    res.json({ invitedUsers: institution.invitedUsers || [] });
  } catch (error) {
    console.error("Error fetching invited users:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add invited user to institution
router.post("/:userId/institution/invite-user", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const user = await findUserById(req.params.userId);
    const institution = await Institution.findOne({ Admin: user._id });

    if (!institution) {
      return res.status(400).json({ error: "User has no institution" });
    }

    // Check if user already invited
    const alreadyInvited = institution.invitedUsers?.some(u => u.email === email);
    if (alreadyInvited) {
      return res.status(400).json({ error: "User already invited" });
    }
    const availableSeats = user.subscription.seats - institution.invitedUsers?.length;
    if (availableSeats <= 0) {
      return res.status(400).json({ error: "No available seats" });
    }

    // Add new invited user
    const newInvitedUser = {
      name,
      email,
      status: 'Invitations Sent',
      invitedAt: new Date()
    };

    if (!institution.invitedUsers) {
      institution.invitedUsers = [];
    }

    institution.invitedUsers.push(newInvitedUser);
    await institution.save();

    res.json({
      invitedUser: newInvitedUser,
      message: "User invited successfully"
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Remove invited user from institution
router.delete("/:userId/institution/invited-users/:id", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const institution = await Institution.findOne({ Admin: user._id });

    if (!institution) {
      return res.status(400).json({ error: "User has no institution" });
    }


    // Remove invited user by id
    institution.invitedUsers = institution.invitedUsers?.filter(
      u => u._id.toString() !== req.params.id
    ) || [];

    await institution.save();
   const updatedInstitution = await Institution.findOne({ Admin: user._id });

    res.json({ institution: updatedInstitution, message: "Invited user removed successfully" });
  } catch (error) {
    console.error("Error removing invited user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Resend invitation to user
router.post("/:userId/institution/resend-invite/:email", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const institution = await Institution.findOne({ Admin: user._id });

    if (!institutionID) {
      return res.status(400).json({ error: "User has no institution" });
    }

    // Find and update invited user
    const invitedUser = institution.invitedUsers?.find(u => u.email === req.params.email);
    if (!invitedUser) {
      return res.status(404).json({ error: "Invited user not found" });
    }

    invitedUser.status = 'Invitations Sent';
    invitedUser.invitedAt = new Date();

    await institution.save();

    res.json({
      invitedUser,
      message: "Invitation resent successfully"
    });
  } catch (error) {
    console.error("Error resending invitation:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
