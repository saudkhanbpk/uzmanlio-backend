// order.js

import mongoose from 'mongoose';
const { Schema } = mongoose;

const eventSchema = new Schema({
    eventType: { type: String, enum: ['service', 'package'], required: true },
    service: {
        name: { type: String },
        description: { type: String },
        price: { type: Number },
        duration: { type: Number },
        sessions: { type: Number },
        meetingType: { type: String } // bireysel, grup, etc.
    },
    package: {
        name: { type: String },
        details: { type: String },
        price: { type: Number },
        sessions: { type: Number },
        duration: { type: Number },
        meetingType: { type: String } // bireysel, grup, etc.
    },
    quantity: { type: Number, default: 1 }
}, { _id: false });

const orderSchema = new Schema({
    orderDetails: {
        events: [eventSchema],
        totalAmount: { type: Number, required: true },
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
    expertInfo: {
        expertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expert', required: true },
        name: { type: String, required: true },
        accountNo: { type: String, required: true },
        specialization: { type: String },
        email: { type: String }
    },
    status: { type: String, default: 'pending' },
    couponUsage: { type: Boolean, default: false }
}, {
    timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;