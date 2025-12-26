import mongoose from "mongoose";
import User from "../models/expertInformation.js";
import Service from "../models/service.js";

// Helper function to find user by ID
const findUserById = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid user ID");
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }
    return user;
};

/**
 * Create a new service
 * POST /:userId/services
 */
export const createService = async (req, res) => {
    try {
        console.log("Creating service for userId:", req.params.userId);

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
            status,
        } = req.body;

        // Validate required fields
        if (!title || !category || !eventType) {
            return res.status(400).json({
                error:
                    "Missing required fields: title, category, and eventType are required",
            });
        }

        const user = await findUserById(req.params.userId);

        // Create new Service document
        const newService = new Service({
            expertId: user._id,
            title,
            description: description || "",
            icon: icon || "",
            iconBg: iconBg || "",
            price: price || "0",
            duration: duration || "0",
            isActive: false,
            category,
            discount: discount || 0,
            features: features || [],
            date: date || null,
            time: time || null,
            location: location || "",
            platform: platform || "",
            eventType,
            meetingType: meetingType || "1-1",
            maxAttendees: maxAttendees || null,
            isOfflineEvent: isOfflineEvent || false,
            selectedClients: selectedClients || [],
            status: status || "active",
        });

        await newService.save();

        // Add service ObjectId reference to user's services array
        if (!user.services) {
            user.services = [];
        }
        user.services.push(newService._id);
        await user.save();

        console.log("Service created successfully:", newService._id);
        res.status(201).json({
            service: newService,
            message: "Service added successfully",
        });
    } catch (error) {
        console.error("Error creating service:", error);
        res.status(500).json({
            error: error.message || "Failed to create service",
        });
    }
};

/**
 * Get all services for a user
 * GET /:userId/services
 */
export const getServices = async (req, res) => {
    try {
        const { userId } = req.params;
        const services = await Service.find({ expertId: userId });
        res.json({ services: services || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get active services (for booking page)
 * GET /:userId/services/active
 */
export const getActiveServices = async (req, res) => {
    try {
        const { userId } = req.params;
        const activeServices = await Service.find({ expertId: userId, isActive: true });
        res.json({ services: activeServices });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get a single service by ID
 * GET /:userId/services/:serviceId
 */
export const getServiceById = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);

        let service = await Service.findById(req.params.serviceId);
        if (!service) {
            service = await Service.findOne({
                legacyId: req.params.serviceId,
                expertId: user._id,
            });
        }

        if (!service) {
            return res.status(404).json({ error: "Service not found" });
        }

        // Verify ownership
        if (service.expertId.toString() !== user._id.toString()) {
            return res
                .status(403)
                .json({ error: "Not authorized to view this service" });
        }

        res.json({ service });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update a service
 * PUT /:userId/services/:serviceId
 */
export const updateService = async (req, res) => {
    try {
        console.log("Updating service:", req.params.serviceId);

        const user = await findUserById(req.params.userId);

        // Find service by ObjectId or legacy id
        let service = await Service.findById(req.params.serviceId);
        if (!service) {
            service = await Service.findOne({
                legacyId: req.params.serviceId,
                expertId: user._id,
            });
        }

        if (!service) {
            return res.status(404).json({ error: "Service not found" });
        }

        // Verify ownership
        if (service.expertId.toString() !== user._id.toString()) {
            return res
                .status(403)
                .json({ error: "Not authorized to update this service" });
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
            updatedAt: new Date(),
        });

        await service.save();

        console.log("Service updated successfully");
        res.json({
            service: service,
            message: "Service updated successfully",
        });
    } catch (error) {
        console.error("Error updating service:", error);
        res.status(500).json({
            error: error.message || "Failed to update service",
        });
    }
};

/**
 * Delete a service
 * DELETE /:userId/services/:serviceId
 */
export const deleteService = async (req, res) => {
    try {
        console.log(
            "Deleting service:",
            req.params.serviceId,
            "for user:",
            req.params.userId
        );

        const user = await findUserById(req.params.userId);

        // Find service by ObjectId or legacy id
        let service = await Service.findById(req.params.serviceId);
        if (!service) {
            service = await Service.findOne({
                legacyId: req.params.serviceId,
                expertId: user._id,
            });
        }

        if (!service) {
            console.log("Service not found with ID:", req.params.serviceId);
            return res.status(404).json({ error: "Service not found" });
        }

        // Verify ownership
        if (service.expertId.toString() !== user._id.toString()) {
            return res
                .status(403)
                .json({ error: "Not authorized to delete this service" });
        }

        const deletedServiceId = service._id;

        // Remove from Service collection
        await Service.findByIdAndDelete(service._id);

        // Remove reference from user's services array
        user.services = user.services.filter(
            (serviceId) => serviceId.toString() !== service._id.toString()
        );
        await user.save();

        console.log("Service deleted successfully");
        res.json({
            message: "Service deleted successfully",
            deletedServiceId: deletedServiceId,
        });
    } catch (error) {
        console.error("Error deleting service:", error);
        res.status(500).json({
            error: error.message || "Failed to delete service",
        });
    }
};

/**
 * Toggle service active status
 * PATCH /:userId/services/:serviceId/toggle-active
 */
export const toggleServiceActive = async (req, res) => {
    try {
        const { isActive } = req.body;
        const user = await findUserById(req.params.userId);

        let service = await Service.findById(req.params.serviceId);
        if (!service) {
            service = await Service.findOne({
                legacyId: req.params.serviceId,
                expertId: user._id,
            });
        }

        if (!service) {
            return res.status(404).json({ error: "Service not found" });
        }

        // Verify ownership
        if (service.expertId.toString() !== user._id.toString()) {
            return res.status(403).json({ error: "Not authorized" });
        }

        service.isActive = isActive;
        service.updatedAt = new Date();
        await service.save();

        res.json({
            service,
            message: `Service ${isActive ? "activated" : "deactivated"} successfully`,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
