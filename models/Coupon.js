import mongoose from "mongoose";

const { Schema } = mongoose;

const CouponSchema = new Schema(
  {
    code: { type: String, required: true },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    usageCount: { type: Number, default: 0 },
    maxUsage: { type: Number, default: 0 },
    expiryDate: { type: Date },
    status: { type: String, enum: ["active", "expired", "disabled"], default: "active" },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Ensure uniqueness of code per owner
CouponSchema.index({ code: 1, owner: 1 }, { unique: true });

const Coupon = mongoose.model("Coupon", CouponSchema);
export default Coupon;
