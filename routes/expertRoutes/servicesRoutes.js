import express from "express";
import { checkInstitutionAdmin } from "../../middlewares/institutionAuth.js";
import {
  createService,
  getServices,
  getActiveServices,
  getServiceById,
  updateService,
  deleteService,
  toggleServiceActive,
} from "../../controllers/serviceController.js";

const router = express.Router();

// ==================== SERVICES ROUTES ====================

// Get all services
router.get("/:userId/services", getServices);

// Get active services (for booking page)
router.get("/:userId/services/active", getActiveServices);

// Get single service
router.get("/:userId/services/:serviceId", getServiceById);

// Create service
router.post("/:userId/services", checkInstitutionAdmin, createService);

// Update service
router.put("/:userId/services/:serviceId", checkInstitutionAdmin, updateService);

// Delete service
router.delete("/:userId/services/:serviceId", checkInstitutionAdmin, deleteService);

// Toggle service active status
router.patch("/:userId/services/:serviceId/toggle-active", checkInstitutionAdmin, toggleServiceActive);

export default router;
