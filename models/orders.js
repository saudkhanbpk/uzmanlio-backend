import mongoose from 'mongoose';
const { Schema } = mongoose;

const eventSchema = new Schema({
    eventType: { type: String, enum: ['service', 'package'], required: true },
    service: {
        // Only present if eventType is 'service'
        name: { type: String },
        description: { type: String },
        price: { type: Number },
        duration: { type: Number }, // in minutes
        sessions: { type: Number, default: 1 }
    },
    package: {
        // Only present if eventType is 'package'
        name: { type: String },
        details: { type: String },
        price: { type: Number },
        
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
        method: { type: String, required: true },
        status: { type: String, required: true },
        transactionId: { type: String },
        paidAt: { type: Date }
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
    status: { type: String, default: 'pending' }
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
