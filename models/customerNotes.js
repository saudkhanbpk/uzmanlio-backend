// customerNotes.js

import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
const { Schema } = mongoose;

// EXPORT THE SCHEMA so it can be used in other files
export const CustomerNoteSchema = new Schema({
    id: { type: String, default: uuidv4 },
    content: { type: String, required: true },
    author: {
        type: String,
        enum: ["expert", "customer", "system"],
        required: true,
    },
    authorName: { type: String, required: true },
    files: [
        {
            name: { type: String, required: true },
            type: { type: String, required: true },
            caption: { type: String },
            size: { type: String },
            url: { type: String, required: true },
            uploadedAt: { type: Date, default: Date.now },
        },
    ],
    isPrivate: { type: Boolean, default: false },
    tags: [{ type: String }],
}, {
    // Use Mongoose's built-in timestamps for createdAt and updatedAt
    timestamps: true 
});

// The model is created but not the primary export if the schema is needed elsewhere
const CustomerNote = mongoose.model("CustomerNote", CustomerNoteSchema);

export default CustomerNote;