import express from "express";
import * as formController from "../../controllers/formController.js";

const router = express.Router();

// Base route: /api/expert/:userId/forms
router.post("/:userId/forms", formController.createForm);
router.get("/:userId/forms", formController.getForms);
router.get("/:userId/forms/status/:status", formController.getFormsByStatus);
router.get("/:userId/forms/:formId", formController.getFormById);
router.put("/:userId/forms/:formId", formController.updateForm);
router.delete("/:userId/forms/:formId", formController.deleteForm);
router.post("/:userId/forms/:formId/duplicate", formController.duplicateForm);
router.patch("/:userId/forms/:formId/status", formController.updateFormStatus);
// ==================== FORM RESPONSES ROUTES ====================
router.get("/:userId/forms/:formId/responses", formController.getFormResponses);
router.post("/:userId/forms/:formId/submit", formController.submitFormResponse);
router.get("/:userId/forms/:formId/analytics", formController.getFormAnalytics);
router.get("/:userId/forms/stats", formController.getFormsStatistics);

export default router;
