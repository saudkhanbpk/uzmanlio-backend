import express from "express";
import { checkInstitutionAdmin } from "../../middlewares/institutionAuth.js";
import {
  getPackages,
  getActivePackages,
  getAvailablePackages,
  createPackage,
  updatePackage,
  deletePackage,
  togglePackageAvailable,
  getPackagePurchases,
} from "../../controllers/packageController.js";
import { verifyAccessToken } from "../../middlewares/auth.js";
import { validateParams, validateBody, validateQuery } from "../../middlewares/validateRequest.js";
import {
  createPackageSchema,
  updatePackageSchema,
  packageIdParams,
  getPackagesQuery,
} from "../../validations/package.schema.js";
import { userIdParams } from "../../validations/common.schema.js";

const router = express.Router();

// ==================== PACKAGES ROUTES ====================

// Get all packages
router.get(
  "/:userId/packages",
  validateParams(userIdParams),
  validateQuery(getPackagesQuery),
  getPackages
);

// Get active packages
router.get(
  "/:userId/packages/active",
  validateParams(userIdParams),
  getActivePackages
);

// Get available packages (for booking page)
router.get(
  "/:userId/packages/available",
  validateParams(userIdParams),
  getAvailablePackages
);

// Create package
router.post(
  "/:userId/packages",
  validateParams(userIdParams),
  validateBody(createPackageSchema),
  verifyAccessToken,
  checkInstitutionAdmin,
  createPackage
);

// Update package
router.put(
  "/:userId/packages/:packageId",
  validateParams(packageIdParams),
  validateBody(updatePackageSchema),
  verifyAccessToken,
  checkInstitutionAdmin,
  updatePackage
);

// Delete package
router.delete(
  "/:userId/packages/:packageId",
  validateParams(packageIdParams),
  verifyAccessToken,
  checkInstitutionAdmin,
  deletePackage
);

// Toggle package availability
router.patch(
  "/:userId/packages/:packageId/toggle-available",
  validateParams(packageIdParams),
  verifyAccessToken,
  checkInstitutionAdmin,
  togglePackageAvailable
);

// Get package purchase history
router.get(
  "/:userId/packages/:packageId/purchases",
  validateParams(packageIdParams),
  getPackagePurchases
);

export default router;