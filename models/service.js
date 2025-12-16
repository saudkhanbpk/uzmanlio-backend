import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Service Model - Standalone collection for expert services
 * Previously embedded in User.services array
 */
const ServiceSchema = new Schema({
    // Keep original id for backward compatibility during migration
    legacyId: { type: String },

    // Reference to the expert who owns this service
    expertId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    title: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    iconBg: { type: String, default: '' },
    price: { type: String, default: '0' },
    discount: { type: Number, default: 0 },
    duration: { type: String, default: '0' },
    category: { type: String },
    features: [{ type: String }],

    // Scheduling fields
    date: { type: Date },
    time: { type: String },
    location: { type: String, default: '' },
    platform: { type: String, default: '' },

    eventType: {
        type: String,
        enum: ['online', 'offline', 'hybrid', ''],
        default: 'online'
    },
    meetingType: {
        type: String,
        enum: ['1-1', 'grup', ''],
        default: ''
    },
    maxAttendees: { type: Number },
    isOfflineEvent: { type: Boolean, default: false },

    // Client assignments
    selectedClients: [{
        id: { type: Schema.Types.ObjectId, ref: "Customer" },
        name: { type: String },
        email: { type: String }
    }],

    // Status
    isActive: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['active', 'inactive', 'onhold', ''],
        default: 'inactive'
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
ServiceSchema.index({ expertId: 1, status: 1 });
ServiceSchema.index({ expertId: 1, isActive: 1 });

// Pre-save middleware to update timestamps
ServiceSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Service = mongoose.model('Service', ServiceSchema);

export default Service;
