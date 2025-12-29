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
import { validateParams, validateBody, validateQuery } from "../../middlewares/validateRequest.js";
import {
  createServiceSchema,
  updateServiceSchema,
  serviceIdParams,
  getServicesQuery,
} from "../../validations/service.schema.js";
import { userIdParams } from "../../validations/common.schema.js";

const router = express.Router();

// ==================== SERVICES ROUTES ====================

// Get all services
router.get(
  "/:userId/services",
  validateParams(userIdParams),
  validateQuery(getServicesQuery),
  getServices
);

// Get active services (for booking page)
router.get(
  "/:userId/services/active",
  validateParams(userIdParams),
  getActiveServices
);

// Get single service
router.get(
  "/:userId/services/:serviceId",
  validateParams(serviceIdParams),
  getServiceById
);

// Create service
router.post(
  "/:userId/services",
  validateParams(userIdParams),
  validateBody(createServiceSchema),
  verifyAccessToken,
  checkInstitutionAdmin,
  createService
);

// Update service
router.put(
  "/:userId/services/:serviceId",
  validateParams(serviceIdParams),
  validateBody(updateServiceSchema),
  verifyAccessToken,
  checkInstitutionAdmin,
  updateService
);

// Delete service
router.delete(
  "/:userId/services/:serviceId",
  validateParams(serviceIdParams),
  verifyAccessToken,
  checkInstitutionAdmin,
  deleteService
);

// Toggle service active status
router.patch(
  "/:userId/services/:serviceId/toggle-active",
  validateParams(serviceIdParams),
  verifyAccessToken,
  checkInstitutionAdmin,
  toggleServiceActive
);

export default router;

