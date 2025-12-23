import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Package Model - Standalone collection for expert packages
 * Previously embedded in User.packages array
 */
const PackageSchema = new Schema({
    // Keep original id for backward compatibility during migration
    legacyId: { type: String },

    // Reference to the expert who owns this package
    expertId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    title: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    originalPrice: { type: Number },
    duration: { type: Number, default: 0 }, // in minutes
    appointmentCount: { type: Number, default: 1 },
    sessionsIncluded: { type: Number },

    category: {
        type: String,
        enum: ['egitim', 'danismanlik', 'workshop', 'mentorluk', ''],
        default: ''
    },
    eventType: {
        type: String,
        enum: ['online', 'offline', 'hybrid'],
        default: 'online'
    },
    meetingType: {
        type: String,
        enum: ['1-1', 'grup', ''],
        default: ''
    },

    // Location/Platform
    platform: { type: String, default: '' },
    location: { type: String, default: '' },
    date: { type: Date },
    time: { type: String },
    maxAttendees: { type: Number },

    // Display
    icon: { type: String, default: '📦' },
    iconBg: { type: String, default: 'bg-primary-100' },
    features: [{ type: String }],

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'onhold'],
        default: 'active'
    },
    isAvailable: { type: Boolean, default: true },
    isPurchased: { type: Boolean, default: false },
    isOfflineEvent: { type: Boolean, default: false },
    validUntil: { type: Date },

    // Client assignments
    selectedClients: [{
        id: { type: Schema.Types.ObjectId, ref: "Customer" },
        name: { type: String },
        email: { type: String }
    }],

    // Purchase tracking
    purchasedBy: [{
        userId: { type: Schema.Types.ObjectId, ref: "Customer" },
        orderId: { type: Schema.Types.ObjectId, ref: "Order" },
        purchaseDate: { type: Date, default: Date.now },
        expiryDate: { type: Date },
        sessionsUsed: { type: Number, default: 0 },
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient queries
PackageSchema.index({ expertId: 1, status: 1 });
PackageSchema.index({ expertId: 1, isAvailable: 1 });

// Pre-save middleware to update timestamps
PackageSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Package = mongoose.model('Package', PackageSchema);

export default Package;
