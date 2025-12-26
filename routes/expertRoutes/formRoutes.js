import express from "express";
import * as formController from "../../controllers/formController.js";
import { verifyAccessToken } from "../../middlewares/auth.js";
import { validateParams, validateBody, validateQuery } from "../../middlewares/validateRequest.js";
import {
    createFormSchema,
    updateFormSchema,
    updateFormStatusSchema,
    submitFormResponseSchema,
    formIdParams,
    formStatusParams,
    getFormsQuery,
} from "../../validations/form.schema.js";
import { userIdParams } from "../../validations/common.schema.js";

const router = express.Router();

// Base route: /api/expert/:userId/forms
router.post(
    "/:userId/forms",
    validateParams(userIdParams),
    validateBody(createFormSchema),
    verifyAccessToken,
    formController.createForm
);

router.get(
    "/:userId/forms",
    validateParams(userIdParams),
    validateQuery(getFormsQuery),
    formController.getForms
);

router.get(
    "/:userId/forms/status/:status",
    validateParams(formStatusParams),
    formController.getFormsByStatus
);

router.get(
    "/:userId/forms/:formId",
    validateParams(formIdParams),
    formController.getFormById
);

router.put(
    "/:userId/forms/:formId",
    validateParams(formIdParams),
    validateBody(updateFormSchema),
    verifyAccessToken,
    formController.updateForm
);

router.delete(
    "/:userId/forms/:formId",
    validateParams(formIdParams),
    verifyAccessToken,
    formController.deleteForm
);

router.post(
    "/:userId/forms/:formId/duplicate",
    validateParams(formIdParams),
    verifyAccessToken,
    formController.duplicateForm
);

router.patch(
    "/:userId/forms/:formId/status",
    validateParams(formIdParams),
    validateBody(updateFormStatusSchema),
    verifyAccessToken,
    formController.updateFormStatus
);

// ==================== FORM RESPONSES ROUTES ====================
router.get(
    "/:userId/forms/:formId/responses",
    validateParams(formIdParams),
    formController.getFormResponses
);

router.post(
    "/:userId/forms/:formId/submit",
    validateParams(formIdParams),
    validateBody(submitFormResponseSchema),
    formController.submitFormResponse
);

router.get(
    "/:userId/forms/:formId/analytics",
    validateParams(formIdParams),
    formController.getFormAnalytics
);

router.get(
    "/:userId/forms/stats",
    validateParams(userIdParams),
    formController.getFormsStatistics
);

export default router;

