import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const { Schema } = mongoose;

const FormFieldSchema = new Schema({
    id: { type: String, default: uuidv4 },
    type: {
        type: String,
        enum: [
            "text",
            "email",
            "phone",
            "single-choice",
            "multiple-choice",
            "ranking",
            "file-upload",
        ],
        required: true,
    },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    placeholder: { type: String },
    options: [{ type: String }],
    validation: {
        minLength: { type: Number },
        maxLength: { type: Number },
        pattern: { type: String },
    },
});

const FormResponseSchema = new Schema({
    id: { type: String, default: uuidv4 },
    respondentName: { type: String },
    respondentEmail: { type: String },
    respondentPhone: { type: String },
    responses: [
        {
            fieldId: { type: String, required: true },
            fieldLabel: { type: String, required: true },
            fieldType: { type: String, required: true },
            value: { type: Schema.Types.Mixed },
            files: [{ type: String }],
        },
    ],
    submittedAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
});

const FormSchema = new Schema({
    id: { type: String, default: uuidv4 },
    expertId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Added reference to Expert
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
        type: String,
        enum: ["draft", "active", "inactive", "archived"],
        default: "draft",
    },
    fields: [FormFieldSchema],
    responses: [FormResponseSchema],
    participantCount: { type: Number, default: 0 },
    settings: {
        allowMultipleSubmissions: { type: Boolean, default: false },
        requireLogin: { type: Boolean, default: false },
        showProgressBar: { type: Boolean, default: true },
        customTheme: {
            primaryColor: { type: String, default: "#3B82F6" },
            backgroundColor: { type: String, default: "#FFFFFF" },
        },
        notifications: {
            emailOnSubmission: { type: Boolean, default: true },
            emailAddress: { type: String },
        },
    },
    analytics: {
        views: { type: Number, default: 0 },
        starts: { type: Number, default: 0 },
        completions: { type: Number, default: 0 },
        averageCompletionTime: { type: Number, default: 0 },
    },
}, {
    timestamps: true
}
);

const Form = mongoose.model("Form", FormSchema);
export default Form;
