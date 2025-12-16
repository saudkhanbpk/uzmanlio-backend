import express from "express";
import mongoose from "mongoose";
import User from "../../models/expertInformation.js";
import Service from "../../models/service.js";

const router = express.Router();

// Helper function to find user by ID with populated services
const findUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

// Helper function to find user with populated services
const findUserWithServices = async (userId) => {
  const user = await User.findById(userId).populate('services');
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

// ==================== SERVICES ROUTES ====================

// Add service - Creates in Service collection and adds reference to User
router.post("/:userId/services", async (req, res) => {
  try {
    console.log("Creating service for userId:", req.params.userId);
    console.log("Service data received:", req.body);

    const {
      title,
      description,
      icon,
      iconBg,
      price,
      duration,
      category,
      features,
      discount,
      date,
      time,
      location,
      platform,
      eventType,
      meetingType,
      maxAttendees,
      isOfflineEvent,
      selectedClients,
      status
    } = req.body;

    // Validate required fields
    if (!title || !category || !eventType) {
      return res.status(400).json({
        error: "Missing required fields: title, category, and eventType are required"
      });
    }

    const user = await findUserById(req.params.userId);

    // Create new Service document in Service collection
    const newService = new Service({
      expertId: user._id,
      title,
      description: description || '',
      icon: icon || '',
      iconBg: iconBg || '',
      price: price || '0',
      duration: duration || '0',
      isActive: false,
      category,
      discount: discount || 0,
      features: features || [],
      date: date || null,
      time: time || null,
      location: location || '',
      platform: platform || '',
      eventType,
      meetingType: meetingType || '1-1',
      maxAttendees: maxAttendees || null,
      isOfflineEvent: isOfflineEvent || false,
      selectedClients: selectedClients || [],
      status: status || 'active'
    });

    await newService.save();

    // Add service ObjectId reference to user's services array
    if (!user.services) {
      user.services = [];
    }
    user.services.push(newService._id);
    await user.save();

    console.log("Service created successfully:", newService._id);
    res.json({ service: newService, message: "Service added successfully" });
  } catch (error) {
    console.error("Error creating service:", error);
    res.status(500).json({
      error: error.message || "Failed to create service",
      details: error.stack
    });
  }
});


// Get active services (for booking page) - Uses populate
router.get("/:userId/services/active", async (req, res) => {
  try {
    const user = await findUserWithServices(req.params.userId);
    const activeServices = (user.services || []).filter(service => service.isActive);
    res.json({ services: activeServices });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Update service - Updates directly in Service collection
router.put("/:userId/services/:serviceId", async (req, res) => {
  try {
    console.log("Updating service:", req.params.serviceId);
    console.log("Update data received:", req.body);

    // Verify user exists and owns this service
    const user = await findUserById(req.params.userId);

    // Find service by ObjectId or legacy id
    let service = await Service.findById(req.params.serviceId);

    // If not found by ObjectId, try finding by legacyId
    if (!service) {
      service = await Service.findOne({ legacyId: req.params.serviceId, expertId: user._id });
    }

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Verify ownership
    if (service.expertId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to update this service" });
    }

    // Update service fields
    Object.assign(service, {
      title: req.body.title || service.title,
      description: req.body.description ?? service.description,
      price: req.body.price ?? service.price,
      duration: req.body.duration ?? service.duration,
      category: req.body.category || service.category,
      features: req.body.features || service.features,
      icon: req.body.icon ?? service.icon,
      iconBg: req.body.iconBg ?? service.iconBg,
      eventType: req.body.eventType || service.eventType,
      meetingType: req.body.meetingType ?? service.meetingType,
      platform: req.body.platform ?? service.platform,
      location: req.body.location ?? service.location,
      maxAttendees: req.body.maxAttendees ?? service.maxAttendees,
      date: req.body.date ?? service.date,
      time: req.body.time ?? service.time,
      isOfflineEvent: req.body.isOfflineEvent ?? service.isOfflineEvent,
      selectedClients: req.body.selectedClients ?? service.selectedClients,
      status: req.body.status ?? service.status,
      isActive: req.body.isActive ?? service.isActive,
      discount: req.body.discount ?? service.discount,
      updatedAt: new Date()
    });

    await service.save();

    console.log("Service updated successfully");
    res.json({
      service: service,
      message: "Service updated successfully"
    });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({
      error: error.message || "Failed to update service",
      details: error.stack
    });
  }
});


// Get all services - Uses populate to return full service objects
router.get("/:userId/services", async (req, res) => {
  try {
    const user = await findUserWithServices(req.params.userId);
    res.json({ services: user.services || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get packages (redirect to packages route for now)
router.get("/:userId/packages", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('packages');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ packages: user.packages || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Delete service - Removes from Service collection and User reference
router.delete("/:userId/services/:serviceId", async (req, res) => {
  try {
    console.log("Deleting service:", req.params.serviceId, "for user:", req.params.userId);

    const user = await findUserById(req.params.userId);

    // Find service by ObjectId or legacy id
    let service = await Service.findById(req.params.serviceId);

    if (!service) {
      service = await Service.findOne({ legacyId: req.params.serviceId, expertId: user._id });
    }

    if (!service) {
      console.log("Service not found with ID:", req.params.serviceId);
      return res.status(404).json({ error: "Service not found" });
    }

    // Verify ownership
    if (service.expertId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this service" });
    }

    // Remove from Service collection
    await Service.findByIdAndDelete(service._id);

    // Remove reference from user's services array
    user.services = user.services.filter(
      serviceId => serviceId.toString() !== service._id.toString()
    );
    await user.save();

    console.log("Service deleted successfully");
    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({
      error: error.message || "Failed to delete service"
    });
  }
});

export default router;
