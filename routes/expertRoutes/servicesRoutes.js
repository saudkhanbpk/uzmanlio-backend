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
import { verifyAccessToken } from "../../middlewares/auth.js";

const router = express.Router();

// ==================== SERVICES ROUTES ====================

// Get all services
router.get("/:userId/services", getServices);

// Get active services (for booking page)
router.get("/:userId/services/active", getActiveServices);

// Get single service
router.get("/:userId/services/:serviceId", getServiceById);

// Create service
router.post("/:userId/services", verifyAccessToken, checkInstitutionAdmin, createService);

// Update service
router.put("/:userId/services/:serviceId", verifyAccessToken, checkInstitutionAdmin, updateService);

// Delete service
router.delete("/:userId/services/:serviceId", verifyAccessToken, checkInstitutionAdmin, deleteService);

// Toggle service active status
router.patch("/:userId/services/:serviceId/toggle-active", verifyAccessToken, checkInstitutionAdmin, toggleServiceActive);

export default router;
