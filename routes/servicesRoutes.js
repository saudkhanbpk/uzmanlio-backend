// routes/servicesRoutes.js
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

// ==================== SERVICES ROUTES ====================

// Get all services
router.get("/:userId/services", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ services: user.services || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get active services (for booking page)
router.get("/:userId/services/active", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const activeServices = (user.services || []).filter(service => service.isActive);
    res.json({ services: activeServices });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Add service
router.post("/:userId/services", async (req, res) => {
  try {
    const { title, description, price, duration, category, features } = req.body;
    const user = await findUserById(req.params.userId);
    
    const newService = {
      id: uuidv4(),
      title,
      description,
      price,
      duration,
      isActive: false,
      category,
      features: features || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (!user.services) {
      user.services = [];
    }
    
    user.services.push(newService);
    await user.save();
    
    res.json({ service: newService, message: "Service added successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update service
router.put("/:userId/services/:serviceId", async (req, res) => {
  try {
    const { title, description, price, duration, category, features } = req.body;
    const user = await findUserById(req.params.userId);
    
    const serviceIndex = user.services.findIndex(
      service => service.id === req.params.serviceId
    );
    
    if (serviceIndex === -1) {
      return res.status(404).json({ error: "Service not found" });
    }
    
    user.services[serviceIndex] = {
      ...user.services[serviceIndex],
      title,
      description,
      price,
      duration,
      category,
      features: features || [],
      updatedAt: new Date()
    };
    
    await user.save();
    res.json({ 
      service: user.services[serviceIndex], 
      message: "Service updated successfully" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete service
router.delete("/:userId/services/:serviceId", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    
    user.services = user.services.filter(
      service => service.id !== req.params.serviceId
    );
    
    await user.save();
    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle service active status
router.patch("/:userId/services/:serviceId/toggle-active", async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await findUserById(req.params.userId);
    
    const serviceIndex = user.services.findIndex(
      service => service.id === req.params.serviceId
    );
    
    if (serviceIndex === -1) {
      return res.status(404).json({ error: "Service not found" });
    }
    
    user.services[serviceIndex].isActive = isActive;
    user.services[serviceIndex].updatedAt = new Date();
    
    await user.save();
    res.json({ 
      service: user.services[serviceIndex], 
      message: `Service ${isActive ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
