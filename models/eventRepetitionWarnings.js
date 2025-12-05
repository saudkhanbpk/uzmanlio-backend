import mongoose from "mongoose";

const eventRepetitionWarningSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
    },
    Details: [
        {
            customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
            warningType: { type: String, enum: ["Insufficient Sessions", "No Package", "Insufficient Sessions and No Packages"], required: true },
            warningMessage: { type: String, required: true },
        }
    ],
    warningDate: {
        type: Date,
        required: true,
    },
    warningStatus: {
        type: String,
        enum: ["Pending", "Resolved", "Dismissed"],
        default: "Pending",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
})

const EventRepetitionWarning = mongoose.model("EventRepetitionWarning", eventRepetitionWarningSchema);

export default EventRepetitionWarning;
