import express from "express";
import mongoose from "mongoose";
import Coupon from "../../models/Coupon.js";
import User from "../../models/expertInformation.js";

const router = express.Router({ mergeParams: true });

// Middleware: validate userId param
router.use(async (req, res, next) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid userId" });
  }
  // ensure user exists
  const user = await User.findById(userId).select("_id");
  if (!user) return res.status(404).json({ error: "User not found" });
  next();
});

// GET /api/expert/:userId/coupons - list coupons for user
router.get("/", async (req, res) => {
  try {
    const { userId } = req.params;
    const coupons = await Coupon.find({ owner: userId }).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    console.error("Error fetching coupons:", err);
    res.status(500).json({ error: "Error fetching coupons", details: err.message });
  }
});

// POST /api/expert/:userId/coupons - create coupon for user
router.post("/", async (req, res) => {
  try {
    const { userId } = req.params;
    const { code, type, value, maxUsage, expiryDate } = req.body;

    if (!code || !type || value == null) {
      return res.status(400).json({ error: "code, type and value are required" });
    }

    const coupon = new Coupon({
      code: code.toUpperCase().trim(),
      type,
      value,
      maxUsage: maxUsage || 0,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      owner: userId,
    });

    await coupon.save();
    res.status(201).json(coupon);
  } catch (err) {
    console.error("Error creating coupon:", err);
    if (err.code === 11000) {
      return res.status(409).json({ error: "Coupon code already exists for this user" });
    }
    res.status(500).json({ error: "Error creating coupon", details: err.message });
  }
});

// PUT /api/expert/:userId/coupons/:couponId - update coupon
router.put("/:couponId", async (req, res) => {
  try {
    const { userId, couponId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ error: "Invalid couponId" });
    }

    const updateFields = {}; // allow only certain fields
    const allowed = ["code", "type", "value", "maxUsage", "expiryDate", "status"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateFields[key] = req.body[key];
    }

    if (updateFields.code) updateFields.code = updateFields.code.toUpperCase().trim();
    if (updateFields.expiryDate) updateFields.expiryDate = new Date(updateFields.expiryDate);

    const coupon = await Coupon.findOneAndUpdate(
      { _id: couponId, owner: userId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json(coupon);
  } catch (err) {
    console.error("Error updating coupon:", err);
    if (err.code === 11000) {
      return res.status(409).json({ error: "Coupon code already exists for this user" });
    }
    res.status(500).json({ error: "Error updating coupon", details: err.message });
  }
});

// DELETE /api/expert/:userId/coupons/:couponId - delete coupon
router.delete("/:couponId", async (req, res) => {
  try {
    const { userId, couponId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ error: "Invalid couponId" });
    }

    const coupon = await Coupon.findOneAndDelete({ _id: couponId, owner: userId });
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });

    res.json({ message: "Coupon deleted", coupon });
  } catch (err) {
    console.error("Error deleting coupon:", err);
    res.status(500).json({ error: "Error deleting coupon", details: err.message });
  }
});

export default router;
