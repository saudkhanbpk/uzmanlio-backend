import mongoose from "mongoose";

const { Schema } = mongoose;

 const CustomerNoteSchema = new Schema({
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
    isPrivate: { type: Boolean, default: false }, // Private notes only visible to expert
    tags: [{ type: String }], // For categorizing notes
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
const CustomerNote = mongoose.model("CustomerNote", CustomerNoteSchema);
export default CustomerNote;
