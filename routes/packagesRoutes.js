// routes/packagesRoutes.js
import express from "express";
import { v4 as uuidv4 } from "uuid";
import User from "../models/expertInformation.js";

const router = express.Router();

// Helper function to find user by ID
const findUserById = async (userId) => {
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

// Get active packages (purchased by consultees)
router.get("/:userId/packages/active", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const activePackages = (user.packages || []).filter(pkg => pkg.isPurchased);
    res.json({ packages: activePackages });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get available packages (for booking page)
router.get("/:userId/packages/available", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const availablePackages = (user.packages || []).filter(pkg => pkg.isAvailable && !pkg.isPurchased);
    res.json({ packages: availablePackages });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Add package
router.post("/:userId/packages", async (req, res) => {
  try {
    const { 
      title, 
      description, 
      price, 
      originalPrice, 
      duration, 
      sessionsIncluded, 
      features, 
      validUntil 
    } = req.body;
    const user = await findUserById(req.params.userId);
    
    const newPackage = {
      id: uuidv4(),
      title,
      description,
      price,
      originalPrice,
      duration,
      sessionsIncluded,
      isAvailable: false,
      isPurchased: false,
      features: features || [],
      validUntil,
      purchasedBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (!user.packages) {
      user.packages = [];
    }
    
    user.packages.push(newPackage);
    await user.save();
    
    res.json({ package: newPackage, message: "Package added successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update package
router.put("/:userId/packages/:packageId", async (req, res) => {
  try {
    const { 
      title, 
      description, 
      price, 
      originalPrice, 
      duration, 
      sessionsIncluded, 
      features, 
      validUntil 
    } = req.body;
    const user = await findUserById(req.params.userId);
    
    const packageIndex = user.packages.findIndex(
      pkg => pkg.id === req.params.packageId
    );
    
    if (packageIndex === -1) {
      return res.status(404).json({ error: "Package not found" });
    }
    
    user.packages[packageIndex] = {
      ...user.packages[packageIndex],
      title,
      description,
      price,
      originalPrice,
      duration,
      sessionsIncluded,
      features: features || [],
      validUntil,
      updatedAt: new Date()
    };
    
    await user.save();
    res.json({ 
      package: user.packages[packageIndex], 
      message: "Package updated successfully" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete package
router.delete("/:userId/packages/:packageId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    
    user.packages = user.packages.filter(
      pkg => pkg.id !== req.params.packageId
    );
    
    await user.save();
    res.json({ message: "Package deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    
    await user.save();
    res.json({ 
      package: user.packages[packageIndex], 
      message: `Package ${isAvailable ? 'made available' : 'made unavailable'} successfully` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Purchase package (for consultees)
router.post("/:userId/packages/:packageId/purchase", async (req, res) => {
  try {
    const { consulteeId, expiryDate } = req.body;
    const user = await findUserById(req.params.userId);
    
    const packageIndex = user.packages.findIndex(
      pkg => pkg.id === req.params.packageId
    );
    
    if (packageIndex === -1) {
      return res.status(404).json({ error: "Package not found" });
    }
    
    if (!user.packages[packageIndex].isAvailable) {
      return res.status(400).json({ error: "Package is not available for purchase" });
    }
    
    const purchase = {
      userId: consulteeId,
      purchaseDate: new Date(),
      expiryDate: expiryDate || new Date(Date.now() + user.packages[packageIndex].duration * 24 * 60 * 60 * 1000)
    };
    
    user.packages[packageIndex].purchasedBy.push(purchase);
    user.packages[packageIndex].isPurchased = true;
    user.packages[packageIndex].updatedAt = new Date();
    
    await user.save();
    res.json({ 
      package: user.packages[packageIndex], 
      purchase,
      message: "Package purchased successfully" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
