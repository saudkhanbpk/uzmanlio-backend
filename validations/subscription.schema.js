/**
 * Subscription & Payment Validation Schemas
 * ==========================================
 * Joi schemas for subscription and payment endpoints
 */
import Joi from 'joi';
import {
    objectIdRequired,
    email,
    phone,
} from './common.schema.js';

// ==================== SUBSCRIPTION ENUMS ====================

const planTypes = ['individual', 'institutional'];
const durations = ['monthly', 'yearly'];

// ==================== CARD INFO SCHEMA ====================

const cardInfoSchema = Joi.object({
    cardHolderName: Joi.string().trim().max(100).required().messages({
        'any.required': 'Card holder name is required',
    }),
    cardNumber: Joi.string()
        .pattern(/^[\d\s\-]+$/)
        .min(13)
        .max(25)
        .required()
        .messages({
            'any.required': 'Card number is required',
            'string.pattern.base': 'Invalid card number format',
        }),
    cardExpiry: Joi.string()
        .pattern(/^(0[1-9]|1[0-2])\/?\d{2,4}$/)
        .required()
        .messages({
            'any.required': 'Card expiry is required',
            'string.pattern.base': 'Card expiry must be in MM/YY format',
        }),
    cardCvv: Joi.string()
        .pattern(/^\d{3,4}$/)
        .required()
        .messages({
            'any.required': 'CVV is required',
            'string.pattern.base': 'CVV must be 3 or 4 digits',
        }),
});

// ==================== BILLING INFO SCHEMA ====================

const billingInfoSchema = Joi.object({
    companyName: Joi.string().max(200).allow('', null),
    taxNumber: Joi.string().max(50).allow('', null),
    taxOffice: Joi.string().max(100).allow('', null),
    address: Joi.string().max(500).allow('', null),
    city: Joi.string().max(100).allow('', null),
    district: Joi.string().max(100).allow('', null),
    phoneNumber: phone.allow('', null),
});

// ==================== NEW SUBSCRIPTION SCHEMA ====================

export const newSubscriptionSchema = Joi.object({
    // Card info
    cardHolderName: Joi.string().trim().max(100).required().messages({
        'any.required': 'Card holder name is required',
    }),
    cardNumber: Joi.string()
        .pattern(/^[\d\s\-]+$/)
        .min(13)
        .max(25)
        .required()
        .messages({
            'any.required': 'Card number is required',
        }),
    cardExpiry: Joi.string()
        .pattern(/^(0[1-9]|1[0-2])\/?\d{2,4}$/)
        .required()
        .messages({
            'any.required': 'Card expiry is required',
        }),
    cardCvv: Joi.string()
        .pattern(/^\d{3,4}$/)
        .required()
        .messages({
            'any.required': 'CVV is required',
        }),

    // Subscription info
    currentPlan: Joi.string().allow('', null),
    plantype: Joi.string().valid(...planTypes).required().messages({
        'any.required': 'Plan type is required',
        'any.only': `Plan type must be one of: ${planTypes.join(', ')}`,
    }),
    duration: Joi.string().valid(...durations).required().messages({
        'any.required': 'Duration is required',
        'any.only': `Duration must be one of: ${durations.join(', ')}`,
    }),
    price: Joi.number().min(0).required().messages({
        'any.required': 'Price is required',
        'number.min': 'Price cannot be negative',
    }),
    selectedSeats: Joi.number().integer().min(0).default(0),
    subscriptionDuration: Joi.string().allow('', null),

    // Billing info
    companyName: Joi.string().max(200).allow('', null),
    taxNumber: Joi.string().max(50).allow('', null),
    taxOffice: Joi.string().max(100).allow('', null),
    address: Joi.string().max(500).allow('', null),
    city: Joi.string().max(100).allow('', null),
    district: Joi.string().max(100).allow('', null),
    phoneNumber: phone.allow('', null),
});

// ==================== UPDATE SUBSCRIPTION SCHEMA ====================

export const updateSubscriptionSchema = Joi.object({
    plantype: Joi.string().valid(...planTypes),
    duration: Joi.string().valid(...durations),
    seats: Joi.number().integer().min(0),
    autoRenew: Joi.boolean(),
}).min(1);

// ==================== COUPON SCHEMAS ====================

export const createCouponSchema = Joi.object({
    code: Joi.string()
        .uppercase()
        .trim()
        .min(3)
        .max(30)
        .pattern(/^[A-Z0-9_-]+$/)
        .required()
        .messages({
            'any.required': 'Coupon code is required',
            'string.min': 'Coupon code must be at least 3 characters',
            'string.max': 'Coupon code must not exceed 30 characters',
            'string.pattern.base': 'Coupon code can only contain uppercase letters, numbers, underscores, and hyphens',
        }),
    type: Joi.string().valid('percentage', 'amount').required().messages({
        'any.required': 'Coupon type is required',
        'any.only': 'Coupon type must be either "percentage" or "amount"',
    }),
    value: Joi.number().min(0).required().messages({
        'any.required': 'Coupon value is required',
        'number.min': 'Coupon value cannot be negative',
    }),
    maxUsage: Joi.number().integer().min(0).default(0),
    expiryDate: Joi.date().greater('now').allow(null).messages({
        'date.greater': 'Expiry date must be in the future',
    }),
});

export const updateCouponSchema = Joi.object({
    code: Joi.string()
        .uppercase()
        .trim()
        .min(3)
        .max(30)
        .pattern(/^[A-Z0-9_-]+$/),
    type: Joi.string().valid('percentage', 'amount'),
    value: Joi.number().min(0),
    maxUsage: Joi.number().integer().min(0),
    expiryDate: Joi.date().allow(null),
    status: Joi.string().valid('active', 'inactive', 'expired'),
}).min(1);

export const validateCouponSchema = Joi.object({
    couponCode: Joi.string().trim().required().messages({
        'any.required': 'Coupon code is required',
    }),
    customerId: objectIdRequired.messages({
        'any.required': 'Customer ID is required',
    }),
    expertId: objectIdRequired.messages({
        'any.required': 'Expert ID is required',
    }),
});

// ==================== COUPON PARAMS SCHEMAS ====================

export const couponIdParams = Joi.object({
    userId: objectIdRequired,
    couponId: objectIdRequired,
});

// ==================== PAYMENT QUERY SCHEMAS ====================

export const paymentOrdersQuery = Joi.object({
    status: Joi.string().valid('pending', 'completed', 'failed', 'refunded'),
    orderSource: Joi.string().valid('booking', 'subscription', 'manual'),
    startDate: Joi.date(),
    endDate: Joi.date(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
});

export const monthlyRevenueQuery = Joi.object({
    year: Joi.number().integer().min(2020).max(2100),
});

export default {
    newSubscriptionSchema,
    updateSubscriptionSchema,
    createCouponSchema,
    updateCouponSchema,
    validateCouponSchema,
    couponIdParams,
    paymentOrdersQuery,
    monthlyRevenueQuery,
};
