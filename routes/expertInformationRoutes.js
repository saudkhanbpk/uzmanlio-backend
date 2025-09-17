// routes/expertInformationRoutes.js
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
    const uploadDir = "uploads/";
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

// ==================== PROFILE ROUTES ====================

// Get complete expert profile
router.get("/:userId/profile", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const profile = {
      title: user.title || '',
      titles: user.titles || [],
      expertCategories: user.expertInformation?.subs || [],
      education: user.resume?.education || [],
      certificates: user.certificates || [],
      experience: user.experience || [],
      skills: user.skills || [],
      galleryFiles: (user.galleryFiles || []).filter(file => file.isVisible),
      services: user.services || [],
      activeServices: (user.services || []).filter(service => service.isActive),
      packages: user.packages || [],
      activePackages: (user.packages || []).filter(pkg => pkg.isPurchased),
      availablePackages: (user.packages || []).filter(pkg => pkg.isAvailable && !pkg.isPurchased)
    };

    res.json(profile);
  } catch (error) {
    res.status(404).json({ error: error.message });
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

export default router;
