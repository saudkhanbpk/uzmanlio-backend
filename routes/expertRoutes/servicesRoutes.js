import express from "express";
import { v4 as uuidv4 } from "uuid";
import User from "../../models/expertInformation.js";

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
// Add service
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

    const newService = {
      id: uuidv4(),
      title,
      description: description || '',
      icon: icon,
      iconBg: iconBg,
      price: price || 0,
      duration: duration || 0,
      isActive: false,
      category,
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
      status: status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Initialize services array if it doesn't exist
    if (!user.services) {
      user.services = [];
    }

    user.services.push(newService);
    await user.save();

    console.log("Service created successfully:", newService.id);
    res.json({ service: newService, message: "Service added successfully" });
  } catch (error) {
    console.error("Error creating service:", error);
    res.status(500).json({
      error: error.message || "Failed to create service",
      details: error.stack
    });
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

// Update service
router.put("/:userId/services/:serviceId", async (req, res) => {
  try {
    console.log("Updating service:", req.params.serviceId);
    console.log("Update data received:", req.body);

    const user = await findUserById(req.params.userId);

    if (!user.services) {
      return res.status(404).json({ error: "No services found" });
    }

    const serviceIndex = user.services.findIndex(
      service => service.id === req.params.serviceId
    );

    if (serviceIndex === -1) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Keep the original ID and timestamps
    const originalService = user.services[serviceIndex];

    // Update service with all fields
    user.services[serviceIndex] = {
      id: originalService.id, // original ID
      createdAt: originalService.createdAt, //original creation date
      title: req.body.title || originalService.title,
      description: req.body.description || '',
      price: req.body.price !== undefined ? req.body.price : originalService.price,
      duration: req.body.duration !== undefined ? req.body.duration : originalService.duration,
      category: req.body.category || originalService.category,
      features: req.body.features || [],
      icon: req.body.icon || '',
      iconBg: req.body.iconBg || '',
      eventType: req.body.eventType || 'online',
      meetingType: req.body.meetingType || '',
      platform: req.body.platform || '',
      location: req.body.location || '',
      maxAttendees: req.body.maxAttendees || null,
      date: req.body.date || null,
      time: req.body.time || null,
      isOfflineEvent: req.body.isOfflineEvent || false,
      selectedClients: req.body.selectedClients || [],
      status: req.body.status || 'active',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      updatedAt: new Date()
    };

    // Mark the services array as modified
    user.markModified('services');

    await user.save();

    console.log("Service updated successfully");

    res.json({
      service: user.services[serviceIndex],
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


// Get all services
router.get("/:userId/services", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ services: user.services || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get packages (if you have this endpoint)
router.get("/:userId/packages", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ packages: user.packages || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Delete service
router.delete("/:userId/services/:serviceId", async (req, res) => {
  try {
    console.log("Deleting service:", req.params.serviceId, "for user:", req.params.userId);

    const user = await findUserById(req.params.userId);

    if (!user.services || user.services.length === 0) {
      return res.status(404).json({ error: "No services found" });
    }

    // Check if service exists
    const serviceExists = user.services.some(
      service => service.id === req.params.serviceId
    );

    if (!serviceExists) {
      console.log("Service not found with ID:", req.params.serviceId);
      return res.status(404).json({ error: "Service not found" });
    }

    // Filter out the service to delete
    user.services = user.services.filter(
      service => service.id !== req.params.serviceId
    );

    // Mark as modified to ensure Mongoose saves the change
    user.markModified('services');

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
