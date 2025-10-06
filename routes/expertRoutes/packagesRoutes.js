import express from "express";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import User from "../../models/expertInformation.js";

const router = express.Router();

// Helper function to find user by ID
const findUserById = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

// ==================== PACKAGES ROUTES ====================

// Get all packages
router.get("/:userId/packages", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ packages: user.packages || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get active packages (with status active)
router.get("/:userId/packages/active", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const activePackages = (user.packages || []).filter(pkg => pkg.status === 'active');
    res.json({ packages: activePackages });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get available packages (for booking page)
router.get("/:userId/packages/available", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const availablePackages = (user.packages || []).filter(
      pkg => pkg.isAvailable && pkg.status === 'active'
    );
    res.json({ packages: availablePackages });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Add package
router.post("/:userId/packages", async (req, res) => {
  try {
    console.log("Creating package for userId:", req.params.userId);
    console.log("Package data received:", req.body);

    const {
      title,
      description,
      price,
      originalPrice,
      duration,
      appointmentCount,
      category,
      eventType,
      meetingType,
      platform,
      location,
      date,
      time,
      maxAttendees,
      icon,
      iconBg,
      status,
      isOfflineEvent,
      selectedClients,
      features,
      validUntil
    } = req.body;

    // Validate required fields
    if (!title || !category || !eventType) {
      return res.status(400).json({
        error: "Missing required fields: title, category, and eventType are required"
      });
    }

    const user = await findUserById(req.params.userId);

    const newPackage = {
      id: uuidv4(),
      title,
      description: description || '',
      price: parseFloat(price) || 0,
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      duration: parseInt(duration) || 0,
      appointmentCount: parseInt(appointmentCount) || 1,
      // for backward compatibility
      sessionsIncluded: parseInt(appointmentCount) || 1, 
      category,
      eventType,
      meetingType: meetingType || '',
      platform: platform || '',
      location: location || '',
      date: date || null,
      time: time || null,
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      icon: icon || '📦',
      iconBg: iconBg,
      status: status || 'active',
      isAvailable: true,
      isPurchased: false,
      isOfflineEvent: isOfflineEvent || false,
      selectedClients: selectedClients || [],
      features: features || [],
      validUntil: validUntil || null,
      purchasedBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!user.packages) {
      user.packages = [];
    }

    user.packages.push(newPackage);
    user.markModified('packages');
    await user.save();

    console.log("Package created successfully:", newPackage.id);
    res.json({ package: newPackage, message: "Package added successfully" });
  } catch (error) {
    console.error("Error creating package:", error);
    res.status(500).json({
      error: error.message || "Failed to create package",
      details: error.stack
    });
  }
});

// Update package
router.put("/:userId/packages/:packageId", async (req, res) => {
  try {
    console.log("Updating package:", req.params.packageId);
    console.log("Update data received:", req.body);

    const user = await findUserById(req.params.userId);

    if (!user.packages || user.packages.length === 0) {
      return res.status(404).json({ error: "No packages found" });
    }

    const packageIndex = user.packages.findIndex(
      pkg => pkg.id === req.params.packageId
    );

    if (packageIndex === -1) {
      return res.status(404).json({ error: "Package not found" });
    }

    // Keep the original ID and timestamps
    const originalPackage = user.packages[packageIndex];

    // Update package with all fields
    user.packages[packageIndex] = {
      id: originalPackage.id,
      createdAt: originalPackage.createdAt,
      purchasedBy: originalPackage.purchasedBy, // Keep purchase history
      title: req.body.title || originalPackage.title,
      description: req.body.description || '',
      price: req.body.price !== undefined ? parseFloat(req.body.price) : originalPackage.price,
      originalPrice: req.body.originalPrice ? parseFloat(req.body.originalPrice) : originalPackage.originalPrice,
      duration: req.body.duration !== undefined ? parseInt(req.body.duration) : originalPackage.duration,
      appointmentCount: req.body.appointmentCount !== undefined ? parseInt(req.body.appointmentCount) : originalPackage.appointmentCount,
      sessionsIncluded: req.body.appointmentCount !== undefined ? parseInt(req.body.appointmentCount) : originalPackage.sessionsIncluded,
      category: req.body.category || originalPackage.category,
      eventType: req.body.eventType || originalPackage.eventType,
      meetingType: req.body.meetingType || originalPackage.meetingType,
      platform: req.body.platform || '',
      location: req.body.location || '',
      date: req.body.date || originalPackage.date,
      time: req.body.time || originalPackage.time,
      maxAttendees: req.body.maxAttendees ? parseInt(req.body.maxAttendees) : originalPackage.maxAttendees,
      icon: req.body.icon || originalPackage.icon,
      iconBg: req.body.iconBg || originalPackage.iconBg,
      status: req.body.status || originalPackage.status,
      isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : originalPackage.isAvailable,
      isPurchased: originalPackage.isPurchased, // Keep purchase status
      isOfflineEvent: req.body.isOfflineEvent || false,
      selectedClients: req.body.selectedClients || originalPackage.selectedClients,
      features: req.body.features || originalPackage.features,
      validUntil: req.body.validUntil || originalPackage.validUntil,
      updatedAt: new Date()
    };

    user.markModified('packages');
    await user.save();

    console.log("Package updated successfully");
    res.json({
      package: user.packages[packageIndex],
      message: "Package updated successfully"
    });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).json({
      error: error.message || "Failed to update package",
      details: error.stack
    });
  }
});

// Delete package
router.delete("/:userId/packages/:packageId", async (req, res) => {
  try {
    console.log("Deleting package:", req.params.packageId);

    const user = await findUserById(req.params.userId);

    if (!user.packages || user.packages.length === 0) {
      return res.status(404).json({ error: "No packages found" });
    }

    const packageExists = user.packages.some(
      pkg => pkg.id === req.params.packageId
    );

    if (!packageExists) {
      return res.status(404).json({ error: "Package not found" });
    }

    user.packages = user.packages.filter(
      pkg => pkg.id !== req.params.packageId
    );

    user.markModified('packages');
    await user.save();

    console.log("Package deleted successfully");
    res.json({ message: "Package deleted successfully" });
  } catch (error) {
    console.error("Error deleting package:", error);
    res.status(500).json({
      error: error.message || "Failed to delete package"
    });
  }
});

// Toggle package available status
router.patch("/:userId/packages/:packageId/toggle-available", async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const user = await findUserById(req.params.userId);

    const packageIndex = user.packages.findIndex(
      pkg => pkg.id === req.params.packageId
    );

    if (packageIndex === -1) {
      return res.status(404).json({ error: "Package not found" });
    }

    user.packages[packageIndex].isAvailable = isAvailable;
    user.packages[packageIndex].updatedAt = new Date();

    user.markModified('packages');
    await user.save();

    res.json({
      package: user.packages[packageIndex],
      message: `Package ${isAvailable ? 'made available' : 'made unavailable'} successfully`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get package purchase history
router.get("/:userId/packages/:packageId/purchases", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const packageItem = user.packages.find(
      pkg => pkg.id === req.params.packageId
    );

    if (!packageItem) {
      return res.status(404).json({ error: "Package not found" });
    }

    res.json({
      packageTitle: packageItem.title,
      purchases: packageItem.purchasedBy || [],
      totalPurchases: (packageItem.purchasedBy || []).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;