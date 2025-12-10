import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
    {
        service: {
            type: String,
            required: true,
            unique: true,
            enum: ['parasut', 'google', 'facebook', 'other']
        },
        accessToken: {
            type: String,
            required: true
        },
        refreshToken: {
            type: String,
            required: true
        },
        tokenExpiry: {
            type: Date,
            required: true
        },
        companyId: {
            type: String,
            required: false // For Paraşüt specifically
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

// Index for faster queries (service already has unique: true)
tokenSchema.index({ tokenExpiry: 1 });

// Method to check if token is expired
tokenSchema.methods.isExpired = function () {
    return Date.now() >= this.tokenExpiry.getTime();
};

// Method to check if token expires soon (within 5 minutes)
tokenSchema.methods.expiresSoon = function () {
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    return this.tokenExpiry.getTime() <= fiveMinutesFromNow;
};

// Static method to get valid token for a service
tokenSchema.statics.getValidToken = async function (service) {
    const token = await this.findOne({ service });
    if (!token) {
        throw new Error(`No token found for service: ${service}`);
    }

    if (token.isExpired()) {
        throw new Error(`Token expired for service: ${service}`);
    }

    return token;
};

// Static method to save or update token
tokenSchema.statics.saveToken = async function (service, tokenData) {
    const { accessToken, refreshToken, tokenExpiry, companyId, metadata = {} } = tokenData;

    return await this.findOneAndUpdate(
        { service },
        {
            accessToken,
            refreshToken,
            tokenExpiry: new Date(tokenExpiry),
            ...(companyId && { companyId }),
            metadata
        },
        {
            upsert: true,
            new: true,
            runValidators: true
        }
    );
};

const Token = mongoose.model("Token", tokenSchema);

export default Token;
