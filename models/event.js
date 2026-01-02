import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const { Schema } = mongoose;

const EventSchema = new Schema({
    id: { type: String, default: () => uuidv4(), unique: true },
    expertId: { type: Schema.Types.ObjectId, ref: "User" }, // Track which expert created this event
    title: { type: String, required: true },
    description: { type: String },
    serviceId: { type: String },
    serviceName: { type: String, },
    packageId: { type: String },
    packageName: { type: String, },
    serviceType: { type: String, enum: ["service", "package"], required: true },
    date: { type: String, },
    time: { type: String, },
    duration: { type: Number, required: true },
    location: { type: String },
    platform: { type: String },
    eventType: { type: String, enum: ["online", "offline", "hybrid"], required: true },
    meetingType: { type: String, enum: ["1-1", "grup", ""] },
    price: { type: Number, required: true },
    maxAttendees: { type: Number },
    customers: [{ type: Schema.Types.ObjectId, ref: "Customer" }],
    attendees: { type: Number, default: 0 },
    category: { type: String },
    status: {
        type: String,
        enum: ["pending", "approved", "completed", "cancelled", "scheduled"],
        default: "pending",
    },
    paymentType: [{
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
        paymentMethod: {  // CHANGED from 'type' to 'paymentMethod'
            type: String,
            enum: ["card", "online", "havale-eft", "paketten-tahsil"],
            default: "online"
        },
        packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }  // ADD THIS LINE
    }],
    isRecurring: { type: Boolean, default: false },
    recurringType: { type: String, enum: ["weekly", "monthly"] },
    selectedClients: [
        {
            id: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
            name: { type: String, required: true },
            email: { type: String, required: true },
            packages: [{ type: String }],
        },
    ],
    appointmentNotes: { type: String },
    files: [
        {
            name: { type: String, required: true },
            url: { type: String, required: true },
            type: { type: String, required: true },
            size: { type: String, required: true },
            uploadDate: { type: String, required: true },
        },
    ],
    agendaJobId: { type: String }, // Stores Agenda job ID for reminder scheduling
    repetitionJobIds: { type: String }, // Comma-separated job IDs
    originalEventId: { type: String }, // Reference to original event if this is a repetition
    repetitionNumber: { type: Number }, // Which repetition this is (1, 2, 3, etc.)
    completedRepetitions: { type: Number, default: 0 }, // Number of completed repetitions
    zoomMeetingId: { type: String },
    zoomJoinUrl: { type: String },
    zoomStartUrl: { type: String },

},
    {
        timestamps: true // ✅ createdAt & updatedAt automatically
    }
);

export default mongoose.model("Event", EventSchema);
