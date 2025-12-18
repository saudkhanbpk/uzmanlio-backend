import express from "express";
import * as customerController from "../../controllers/customerController.js";
import { createMulterUpload, handleMulterError } from "../../middlewares/upload.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";

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
router.get("/:userId/customers", customerController.getCustomers);
router.post("/:userId/customers", customerController.createCustomer);
router.get("/:userId/customers/:customerId", customerController.getCustomerById);
router.put("/:userId/customers/:customerId", customerController.updateCustomer);
router.delete("/:userId/customers/:customerId", customerController.deleteCustomer);

// Customer Status & Archive
router.patch("/:userId/customers/:customerId/archive", customerController.archiveCustomer);
router.patch("/:userId/customers/:customerId/status", customerController.updateCustomerStatus);

// Customer Statistics
router.get("/:userId/customersStats", customerController.getCustomerStats);

// Customer Notes
router.get("/:userId/customers/:customerId/notes", customerController.getCustomerNotes);
router.post("/:userId/customers/:customerId/notes",
    customerNoteUpload.single('file'),
    handleMulterError,
    customerController.addCustomerNote
);
router.put("/:userId/customers/:customerId/notes/:noteId", customerController.updateCustomerNote);
router.delete("/:userId/customers/:customerId/notes/:noteId", customerController.deleteCustomerNote);

// Bulk Import & Export
router.post("/:userId/customers/bulk-import", customerController.bulkImportCustomers);
router.get("/:userId/customerscsv/export", customerController.exportCustomersCsv);

export default router;
