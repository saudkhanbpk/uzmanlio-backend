import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const { Schema } = mongoose;

const BlogSchema = new Schema(
  {
    id: { type: String, default: () => uuidv4(), unique: true },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    keywords: { type: [String], default: [] },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    slug: { type: String, required: true, unique: true },
    author: { type: String, required: true }
  },
  {
    timestamps: true // ✅ createdAt & updatedAt automatically
  }
);

export default mongoose.model("Blog", BlogSchema);
