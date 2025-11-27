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
  try {
    const user = await findUserById(req.params.userId);
    const institution = await Institution.findOne({ Admin: user._id });
    return res.json({ institution: institution || {} });
  } catch (error) {
    console.error("Error fetching institution:", error);
    res.status(500).json({ error: error.message });
  }
});


/////////Update Institution Profile/////////
// Use multer middleware to handle multipart form data

router.put("/:userId/institution/Update", institutionFilesUpload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'axe', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log("Updating institution:", req.params.userId);

    const { name, bio, about } = req.body;
    const user = await findUserById(req.params.userId);

    const logoPath = req.files?.logo?.[0]?.path || null;
    const axePath = req.files?.axe?.[0]?.path || null;

    let institution = await Institution.findOne({ Admin: user._id });

    // 1️⃣ Create new institution if not found
    if (!institution) {
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

      user.subscription = user.subscription || {};
      user.subscription.institutionId = institution._id;
      await user.save();

      return res.json({
        institution,
        message: "Institution created successfully"
      });
    }

    // 2️⃣ Update Existing Institution
    if (name) institution.name = name;
    if (bio) institution.bio = bio;
    if (about) institution.about = about;

    // -------------------------------
    // 🟦 DELETE OLD LOGO IF NEW LOGO IS UPLOADED
    // -------------------------------
    if (logoPath) {
      if (institution.logo && fs.existsSync(institution.logo)) {
        fs.unlinkSync(institution.logo);
        console.log("Old logo deleted:", institution.logo);
      }
      institution.logo = logoPath;
    }

    // -------------------------------
    // 🟩 DELETE OLD AXE IF NEW AXE IS UPLOADED
    // -------------------------------
    if (axePath) {
      if (institution.officialAxe && fs.existsSync(institution.officialAxe)) {
        fs.unlinkSync(institution.officialAxe);
        console.log("Old axe deleted:", institution.officialAxe);
      }
      institution.officialAxe = axePath;
    }

    await institution.save();

    return res.json({
      institution,
      message: "Institution updated successfully"
    });

  } catch (error) {
    console.error("Error updating institution:", error);
    res.status(500).json({ error: error.message });
  }
});


import { sendEmail } from '../../services/email.js';
import { getSubUserInvitationTemplate } from '../../services/emailTemplates.js';
import crypto from 'crypto';

// ... (keep existing imports and setup)

// ========== INVITED USERS ROUTES (Updated to use SubUserInvitation) ==========

// ========== INVITED USERS ROUTES (Using Institution Model) ==========

// Get invited users
router.get("/:userId/institution/invited-users", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const institution = await Institution.findOne({ Admin: user._id }).populate('invitedUsers.acceptedByUserId', 'information');

    if (!institution) {
      return res.json({ invitedUsers: [] });
    }

    const mappedInvitations = institution.invitedUsers.map(inv => {
      let name = inv.name || inv.email.split('@')[0];
      if (inv.acceptedByUserId && inv.acceptedByUserId.information) {
        name = `${inv.acceptedByUserId.information.name} ${inv.acceptedByUserId.information.surname}`;
      }

      return {
        id: inv._id,
        _id: inv._id,
        email: inv.email,
        name: name,
        teamName: inv.teamName,
        permissions: inv.permissions,
        status: inv.status === 'Invitations Sent' ? 'pending' : inv.status,
        expiresAt: inv.expiresAt,
        invitedAt: inv.invitedAt,
        acceptedAt: inv.acceptedAt,
        declinedAt: inv.declinedAt
      };
    });

    // Sort by invitedAt desc
    mappedInvitations.sort((a, b) => new Date(b.invitedAt) - new Date(a.invitedAt));

    res.json({ invitedUsers: mappedInvitations });
  } catch (error) {
    console.error("Error fetching invited users:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add invited user to institution (Send Email)
router.post("/:userId/institution/invite-user", async (req, res) => {
  try {
    const { name, email } = req.body;
    const inviterUserId = req.params.userId;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await findUserById(inviterUserId);
    const institution = await Institution.findOne({ Admin: user._id });

    if (!institution) {
      return res.status(400).json({ error: "User has no institution" });
    }

    // Check if user is already a sub-user in the system (optional, but good practice)
    const existingSubUser = await User.findOne({
      'information.email': email,
      parentUserId: inviterUserId
    });
    if (existingSubUser) {
      // return res.status(400).json({ error: 'This email is already a sub-user in your team' });
    }

    // Check if already invited in this institution
    const existingInvite = institution.invitedUsers.find(u => u.email === email && u.status === 'pending');
    if (existingInvite) {
      // Check expiry
      if (new Date() < new Date(existingInvite.expiresAt)) {
        return res.status(400).json({ error: 'An active invitation has already been sent to this email' });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const teamName = institution.name || 'My Team';

    const newInvite = {
      name: name || email.split('@')[0],
      email,
      teamName,
      permissions: ['appointments', 'customers'],
      invitationToken: token,
      status: 'pending',
      expiresAt,
      invitedAt: new Date()
    };

    institution.invitedUsers.push(newInvite);
    await institution.save();

    // Generate URLs
    const baseUrl = process.env.FRONTEND_URL || 'https://uzmanlio-v2-frontend.vercel.app';
    const acceptUrl = `${baseUrl}/accept-invitation/${token}`;
    const declineUrl = `${baseUrl}/decline-invitation/${token}`;

    // Send email
    try {
      const emailTemplate = getSubUserInvitationTemplate({
        inviterName: `${user.information.name} ${user.information.surname}`,
        inviterEmail: user.information.email,
        teamName,
        acceptUrl,
        declineUrl
      });

      await sendEmail(email, emailTemplate);
      console.log('✅ Invitation email sent to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', emailError);
      // Remove the invite if email fails
      institution.invitedUsers.pop();
      await institution.save();
      return res.status(500).json({ error: 'Failed to send invitation email' });
    }

    res.json({
      invitedUser: newInvite,
      message: "User invited successfully"
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Remove invited user
router.delete("/:userId/institution/invited-users/:id", async (req, res) => {
  try {
    const invitationId = req.params.id;
    const inviterUserId = req.params.userId;

    const user = await findUserById(inviterUserId);
    const institution = await Institution.findOne({ Admin: user._id });

    if (!institution) {
      return res.status(404).json({ error: "Institution not found" });
    }

    const inviteIndex = institution.invitedUsers.findIndex(u => u._id.toString() === invitationId);
    if (inviteIndex === -1) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    const invite = institution.invitedUsers[inviteIndex];

    // If accepted, unlink user
    if (invite.status === 'accepted' && invite.acceptedByUserId) {
      await User.findByIdAndUpdate(inviterUserId, {
        $pull: { subUsers: invite.acceptedByUserId }
      });
      await User.findByIdAndUpdate(invite.acceptedByUserId, {
        $unset: { parentUserId: 1 },
        $set: { isSubUser: false, subUserPermissions: [] }
      });
    }

    // Remove from array
    institution.invitedUsers.splice(inviteIndex, 1);
    await institution.save();

    // Return updated list
    // Re-fetch to populate if needed, or just filter memory
    // Let's re-fetch to be safe and consistent
    const updatedInstitution = await Institution.findOne({ Admin: user._id }).populate('invitedUsers.acceptedByUserId', 'information');

    const mappedInvitations = updatedInstitution.invitedUsers.map(inv => {
      let name = inv.name || inv.email.split('@')[0];
      if (inv.acceptedByUserId && inv.acceptedByUserId.information) {
        name = `${inv.acceptedByUserId.information.name} ${inv.acceptedByUserId.information.surname}`;
      }
      return {
        id: inv._id,
        email: inv.email,
        name: name,
        status: inv.status === 'Invitations Sent' ? 'pending' : inv.status,
        invitedAt: inv.invitedAt
      };
    });

    res.json({ invitedUsers: mappedInvitations, message: "Invited user removed successfully" });
  } catch (error) {
    console.error("Error removing invited user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Resend invitation
router.post("/:userId/institution/resend-invite/:email", async (req, res) => {
  try {
    const param = req.params.email; // Can be email or ID
    const inviterUserId = req.params.userId;

    const user = await findUserById(inviterUserId);
    const institution = await Institution.findOne({ Admin: user._id });

    if (!institution) {
      return res.status(404).json({ error: "Institution not found" });
    }

    let invite;
    if (mongoose.Types.ObjectId.isValid(param)) {
      invite = institution.invitedUsers.find(u => u._id.toString() === param);
    } else {
      invite = institution.invitedUsers.find(u => u.email === param);
    }

    if (!invite) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    if (invite.status === 'accepted') {
      return res.status(400).json({ error: "User has already accepted" });
    }

    // Update token
    const token = crypto.randomBytes(32).toString('hex');
    invite.invitationToken = token;
    invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    invite.status = 'pending';
    invite.declinedAt = undefined;

    await institution.save();

    // Send email
    const baseUrl = process.env.FRONTEND_URL || 'https://uzmanlio-v2-frontend.vercel.app';
    const acceptUrl = `${baseUrl}/accept-invitation/${token}`;
    const declineUrl = `${baseUrl}/decline-invitation/${token}`;
    const teamName = institution.name || 'My Team';

    const emailTemplate = getSubUserInvitationTemplate({
      inviterName: `${user.information.name} ${user.information.surname}`,
      inviterEmail: user.information.email,
      teamName,
      acceptUrl,
      declineUrl
    });

    await sendEmail(invite.email, emailTemplate);

    res.json({
      invitedUser: invite,
      message: "Invitation resent successfully"
    });
  } catch (error) {
    console.error("Error resending invitation:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= PUBLIC INVITATION ROUTES (No Auth Required) =================

// Accept Invitation
router.get('/accept-invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find institution with this token
    const institution = await Institution.findOne({ 'invitedUsers.invitationToken': token });

    if (!institution) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    const invite = institution.invitedUsers.find(u => u.invitationToken === token);

    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    // Check expiry
    if (new Date() > new Date(invite.expiresAt)) {
      invite.status = 'expired';
      await institution.save();
      return res.status(400).json({ success: false, message: 'Invitation has expired' });
    }

    // Check if user exists
    let subUser = await User.findOne({ 'information.email': invite.email });

    if (subUser) {
      // Link existing
      subUser.parentUserId = institution.Admin;
      subUser.isSubUser = true;
      subUser.subUserPermissions = invite.permissions;
      await subUser.save();
    } else {
      // Create new
      subUser = await User.create({
        information: {
          email: invite.email,
          name: invite.name || 'New',
          surname: 'User',
          phone: '0000000000',
          password: Math.random().toString(36).slice(-8)
        },
        subscription: {
          plantype: 'individual',
          price: 0,
          duration: 'monthly',
          isAdmin: false,
          institutionId: institution._id
        },
        parentUserId: institution.Admin,
        isSubUser: true,
        subUserPermissions: invite.permissions
      });
    }

    // Update invite status
    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    invite.acceptedByUserId = subUser._id;
    await institution.save();

    // Add to admin's subUsers
    await User.findByIdAndUpdate(institution.Admin, {
      $addToSet: { subUsers: subUser._id }
    });

    return res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully',
      redirectUrl: '/login'
    });

  } catch (error) {
    console.error('Accept invitation error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Decline Invitation
router.get('/decline-invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const institution = await Institution.findOne({ 'invitedUsers.invitationToken': token });

    if (!institution) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }

    const invite = institution.invitedUsers.find(u => u.invitationToken === token);
    if (!invite) return res.status(404).json({ success: false, message: 'Invitation not found' });

    invite.status = 'declined';
    invite.declinedAt = new Date();
    await institution.save();

    return res.status(200).json({ success: false, message: 'Invitation declined' });

  } catch (error) {
    console.error('Decline invitation error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
