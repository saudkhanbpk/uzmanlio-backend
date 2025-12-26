import mongoose from "mongoose";

const { Schema } = mongoose;

const AppointmentMappingSchema = new Schema({
    ExpertId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    appointmentId: { type: String, required: true },
    provider: { type: String, enum: ["google", "microsoft"], required: true },
    providerEventId: { type: String, required: true },
    calendarId: { type: String, required: true },
    lastSynced: { type: Date, default: Date.now },
});

const AppointmentMapping = mongoose.model("AppointmentMapping", AppointmentMappingSchema);

export default AppointmentMapping;
