import express from "express";
import * as customerController from "../../controllers/customerController.js";
import { createMulterUpload, handleMulterError } from "../../middlewares/upload.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { validateParams, validateBody, validateQuery } from "../../middlewares/validateRequest.js";
import {
    createCustomerSchema,
    updateCustomerSchema,
    updateCustomerStatusSchema,
    archiveCustomerSchema,
    addCustomerNoteSchema,
    updateCustomerNoteSchema,
    bulkImportCustomersSchema,
    customerIdParams,
    customerNoteIdParams,
    getCustomersQuery,
} from "../../validations/customer.schema.js";
import { userIdParams } from "../../validations/common.schema.js";

const router = express.Router();

// Create customer notes file upload configuration
const customerNoteUpload = createMulterUpload({
    uploadPath: "uploads/Experts_Files/customer_notes",
    fieldName: "file",
    maxFiles: 1,
    maxFileSize: 10, // 10MB
    allowedExtensions: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"],
    fileNameGenerator: (req, file) => {
        const customerId = req.params.customerId || 'unknown';
        const timestamp = Date.now();
        const randomId = uuidv4();
        const extension = path.extname(file.originalname).toLowerCase();
        return `${customerId}-${timestamp}-${randomId}${extension}`;
    }
});

// Base route is mounted as /api/expert (in server.js)

// Customers CRUD
router.get(
    "/:userId/customers",
    validateParams(userIdParams),
    validateQuery(getCustomersQuery),
    customerController.getCustomers
);

router.post(
    "/:userId/customers",
    validateParams(userIdParams),
    validateBody(createCustomerSchema),
    customerController.createCustomer
);

router.get(
    "/:userId/customers/:customerId",
    validateParams(customerIdParams),
    customerController.getCustomerById
);

router.put(
    "/:userId/customers/:customerId",
    validateParams(customerIdParams),
    validateBody(updateCustomerSchema),
    customerController.updateCustomer
);

router.delete(
    "/:userId/customers/:customerId",
    validateParams(customerIdParams),
    customerController.deleteCustomer
);

// Customer Status & Archive
router.patch(
    "/:userId/customers/:customerId/archive",
    validateParams(customerIdParams),
    validateBody(archiveCustomerSchema),
    customerController.archiveCustomer
);

router.patch(
    "/:userId/customers/:customerId/status",
    validateParams(customerIdParams),
    validateBody(updateCustomerStatusSchema),
    customerController.updateCustomerStatus
);

// Customer Statistics
router.get(
    "/:userId/customersStats",
    validateParams(userIdParams),
    customerController.getCustomerStats
);

// Customer Notes
router.get(
    "/:userId/customers/:customerId/notes",
    validateParams(customerIdParams),
    customerController.getCustomerNotes
);

router.post(
    "/:userId/customers/:customerId/notes",
    validateParams(customerIdParams),
    customerNoteUpload.single('file'),
    handleMulterError,
    customerController.addCustomerNote
);

router.put(
    "/:userId/customers/:customerId/notes/:noteId",
    validateParams(customerNoteIdParams),
    validateBody(updateCustomerNoteSchema),
    customerController.updateCustomerNote
);

router.delete(
    "/:userId/customers/:customerId/notes/:noteId",
    validateParams(customerNoteIdParams),
    customerController.deleteCustomerNote
);

// Bulk Import & Export
router.post(
    "/:userId/customers/bulk-import",
    validateParams(userIdParams),
    validateBody(bulkImportCustomersSchema),
    customerController.bulkImportCustomers
);

router.get(
    "/:userId/customerscsv/export",
    validateParams(userIdParams),
    customerController.exportCustomersCsv
);

export default router;

