// customerAppointment.js

import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
const { Schema } = mongoose;

// EXPORT THE SCHEMA
export const CustomerAppointmentSchema = new Schema({
    id: { type: String, default: uuidv4 },
    appointmentId: { type: String },
    serviceId: { type: String },
    serviceName: { type: String },
    packageId: { type: String },
    packageName: { type: String },
    date: { type: Date },
    time: { type: String },
    duration: { type: Number },
    status: {
        type: String,
        enum: ["scheduled", "completed", "cancelled", "no-show", "rescheduled"],
        default: "scheduled",
    },
    meetingType: {
        type: String,
        enum: ["1-1", "grup", ""],
        default: "",
    },
    eventType: { type: String, enum: ["online", "offline", "hybrid", ""], required: true },

    meetingLink: { type: String },
    location: { type: String },
    price: { type: Number },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "refunded", "cancelled"],
        default: "pending",
    },
    notes: { type: String },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expert' },
    providerName: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
}, {
    timestamps: true // Automatically handles createdAt and updatedAt
});


const CustomerAppointments = mongoose.model("CustomerAppointment", CustomerAppointmentSchema);

export default CustomerAppointments;