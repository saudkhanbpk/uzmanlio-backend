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

const router = express.Router();

// ==================== PACKAGES ROUTES ====================

// Get all packages
router.get("/:userId/packages", getPackages);

// Get active packages
router.get("/:userId/packages/active", getActivePackages);

// Get available packages (for booking page)
router.get("/:userId/packages/available", getAvailablePackages);

// Create package
router.post("/:userId/packages", checkInstitutionAdmin, createPackage);

// Update package
router.put("/:userId/packages/:packageId", checkInstitutionAdmin, updatePackage);

// Delete package
router.delete("/:userId/packages/:packageId", checkInstitutionAdmin, deletePackage);

// Toggle package availability
router.patch("/:userId/packages/:packageId/toggle-available", checkInstitutionAdmin, togglePackageAvailable);

// Get package purchase history
router.get("/:userId/packages/:packageId/purchases", getPackagePurchases);

export default router;