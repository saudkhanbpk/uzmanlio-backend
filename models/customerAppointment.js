import mongoose from "mongoose";

const { Schema } = mongoose;
 const CustomerAppointmentSchema = new Schema({
    id: { type: String, default: uuidv4 },
    appointmentId: { type: String }, // Reference to main appointment
    serviceId: { type: String },
    serviceName: { type: String },
    packageId: { type: String },
    packageName: { type: String },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    duration: { type: Number }, // in minutes
    status: {
        type: String,
        enum: ["scheduled", "completed", "cancelled", "no-show", "rescheduled"],
        default: "scheduled",
    },
    meetingType: {
        type: String,
        enum: ["online", "in-person", "phone", ""],
        default: "online",
    },
    meetingLink: { type: String },
    location: { type: String },
    price: { type: Number },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "refunded", "cancelled"],
        default: "pending",
    },
    notes: { type: String }, // Session notes
    rating: { type: Number, min: 1, max: 5 }, // Customer rating
    feedback: { type: String }, // Customer feedback
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const CustomerAppointments = mongoose.model("CustomerAppointment", CustomerAppointmentSchema);
export default CustomerAppointments;