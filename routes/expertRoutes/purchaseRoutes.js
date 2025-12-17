import express from "express";
import {
    createPurchase,
    getPurchaseDetails,
} from "../../controllers/purchaseController.js";

const router = express.Router();

// ==================== PURCHASE ROUTES ====================

// Create a new purchase entry
router.post("/:userId/purchases", createPurchase);

// Get package purchases with customer and order details
router.get("/:userId/packages/purchases/details", getPurchaseDetails);

export default router;
