// order.js

import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
const { Schema } = mongoose;

const eventSchema = new Schema({
    eventType: { type: String, enum: ['service', 'package'], required: true },
    service: {
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        name: { type: String },
        description: { type: String },
        price: { type: Number },
        duration: { type: Number },
        sessions: { type: Number },
        meetingType: { type: String } // bireysel, grup, etc.
    },
    package: {
        packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
        name: { type: String },
        details: { type: String },
        price: { type: Number },
        sessions: { type: Number },
        completedSessions: { type: Number, default: 0 },
        duration: { type: Number },
        meetingType: { type: String } // bireysel, grup, etc.
    },
    quantity: { type: Number, default: 1 }
}, { _id: false });

const orderSchema = new Schema({
    orderDetails: {
        events: [eventSchema],
        totalAmount: { type: Number, required: true },
        discountAmount: { type: Number, default: 0 },
        orderDate: { type: Date, default: Date.now }
    },
    paymentInfo: {
        method: { type: String, default: "card" },
        status: { type: String, default: "pending" },
        transactionId: { type: String, default: () => `TRX-${uuidv4()}` },
        cardInfo: {
            cardNumber: { type: String },
            cardHolderName: { type: String },
            cardExpiry: { type: String },
            cardCvv: { type: String },
        },
    },

    userInfo: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String }
    },

    // Customer reference
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

    expertInfo: {
        expertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expert', required: true },
        name: { type: String, required: true },
        accountNo: { type: String, required: true },
        specialization: { type: String },
        email: { type: String }
    },
    status: { type: String, default: 'pending', enum: ['pending', "in-Progress", "completed", "cancelled"] },
    orderSource: { type: String, default: null },
    couponUsage: { type: Boolean, default: false },
    appliedCoupon: { type: String }
}, {
    timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;