
import  CustomerAppointments from "./customerAppointment.js";
import  CustomerNote from "./customerNotes.js";

import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
const { Schema } = mongoose;

 const CustomerSchema = new Schema({
    id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    surname: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },

    // Additional customer information
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other", "prefer-not-to-say"] },
    address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String },
        country: { type: String },
    },

    // Professional information
    occupation: { type: String },
    company: { type: String },

    // Customer preferences and settings
    preferences: {
        communicationMethod: {
            type: String,
            enum: ["email", "phone", "sms", "whatsapp"],
            default: "email",
        },
        language: { type: String, default: "tr" },
        timezone: { type: String, default: "Europe/Istanbul" },
        reminderSettings: {
            enabled: { type: Boolean, default: true },
            beforeHours: { type: Number, default: 24 },
        },
    },

    // Customer status and categorization
    status: {
        type: String,
        enum: ["active", "inactive", "blocked", "prospect"],
        default: "active",
    },
    category: { type: String }, // Custom category for grouping customers
    tags: [{ type: String }], // Custom tags for filtering

    // Relationship and interaction tracking
    source: {
        type: String,
        enum: ["website", "referral", "social-media", "advertisement", "walk-in", "other"],
        default: "website",
    },
    referredBy: { type: String }, // Name of person who referred

    // Appointment and service history
    appointments: [CustomerAppointments],
    totalAppointments: { type: Number, default: 0 },
    completedAppointments: { type: Number, default: 0 },
    cancelledAppointments: { type: Number, default: 0 },
    noShowAppointments: { type: Number, default: 0 },

    // Financial information
    totalSpent: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    paymentMethod: { type: String },

    // Communication and notes
    notes: [CustomerNote],

    // Important dates
    firstAppointment: { type: Date },
    lastAppointment: { type: Date },
    lastContact: { type: Date },

    // Customer satisfaction and feedback
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
    totalRatings: { type: Number, default: 0 },

    // Privacy and consent
    consentGiven: {
        dataProcessing: { type: Boolean, default: false },
        marketing: { type: Boolean, default: false },
        dateGiven: { type: Date },
    },

    // System fields
    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Customer = mongoose.model("Customer", CustomerSchema);
export default Customer;