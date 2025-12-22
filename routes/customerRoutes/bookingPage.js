import express from "express";
import { createMulterUpload, handleMulterError } from '../../middlewares/upload.js';
import * as bookingController from '../../controllers/customerRoutes/bookingController.js';

const router = express.Router({ mergeParams: true });

// Multer upload configuration
const bookingUpload = createMulterUpload({
  uploadPath: "uploads/CustomerFiles/NotesFormsFiles",
  maxFiles: 5,
  maxFileSize: 10, // 10MB
  allowedExtensions: ["jpg", "jpeg", "png", "pdf", "doc", "docx", "txt", "mp4", "mp3"],
  fileNamePrefix: "booking",
});

// Blog and Forms routes
router.get("/:institutionID/blogs-forms", bookingController.getBlogsAndForms);

// Experts and Institutions list
router.get("/experts-institutions", bookingController.getExpertsAndInstitutions);

// Expert basic details
router.get("/:expertID", bookingController.getExpertDetails);

// Test route
router.get("/test-booking", (req, res) => {
  res.json({ message: "Booking page route is working!" });
});

// Main booking submission
router.post(
  "/:finalCustomerId/form",
  bookingUpload.array("files"),
  handleMulterError,
  bookingController.submitBooking
);

// Package routes
router.get("/:userId/packages", bookingController.getPackages);
router.get("/:userId/packages/active", bookingController.getActivePackages);
router.get("/:userId/packages/available", bookingController.getAvailablePackages);

// Coupon validation
router.post("/:customerId/validate-coupon", bookingController.validateCoupon);

export default router;
