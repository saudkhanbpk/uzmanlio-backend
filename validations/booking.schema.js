/**
 * Booking Validation Schemas
 * ===========================
 * Joi schemas for booking-related endpoints
 * Migrated and enhanced from utils/bookingValidation.js
 */
import Joi from 'joi';
import {
    objectIdRequired,
    email,
    phone,
    name,
} from './common.schema.js';

// ==================== CLIENT INFO SCHEMA ====================

const clientInfoSchema = Joi.object({
    firstName: name.required().messages({
        'any.required': 'First name is required',
    }),
    lastName: name.required().messages({
        'any.required': 'Last name is required',
    }),
    email: email.required().messages({
        'any.required': 'Email is required',
    }),
    phone: phone.required().messages({
        'any.required': 'Phone number is required',
    }),
});

// ==================== SELECTED OFFERING SCHEMA ====================

const selectedOfferingSchema = Joi.object({
    id: Joi.string().required().messages({
        'any.required': 'Offering ID is required',
    }),
    title: Joi.string().required().messages({
        'any.required': 'Offering title is required',
    }),
    price: Joi.number().allow(null, 0),
    duration: Joi.number().allow(null),
    sessionsIncluded: Joi.number().allow(null),
    sessions: Joi.number().allow(null),
    eventType: Joi.string().allow(null, ''),
    meetingType: Joi.string().allow(null, ''),
    category: Joi.string().allow(null, ''),
    isActive: Joi.boolean().allow(null, true),
    subCategory: Joi.string().allow(null, ''),
    date: Joi.string().allow(null, ''),
    time: Joi.string().allow(null, ''),
    description: Joi.string().allow(null, ''),
    details: Joi.string().allow(null, ''),
    location: Joi.string().allow('', null),
    discount: Joi.number().allow(null, 0),
    platform: Joi.string().allow('', null),
    icon: Joi.string().allow('', null),
    iconBg: Joi.string().allow('', null),
    features: Joi.array().items(Joi.any()).optional(),
    originalPrice: Joi.number().allow(null, 0),
    isAvailable: Joi.boolean().allow(null, false),
    appointmentCount: Joi.number().allow(null, 0),
    maxAttendees: Joi.number().allow(null),
    isOfflineEvent: Joi.boolean().allow(null),
    selectedClients: Joi.array().items(Joi.any()).optional(),
    status: Joi.string().allow('', null),
    createdAt: Joi.string().allow('', null),
    updatedAt: Joi.string().allow('', null),
    _id: Joi.string().allow('', null),
    isPurchased: Joi.boolean().allow(null),
    validUntil: Joi.string().allow(null),
    purchasedBy: Joi.array().items(Joi.any()).optional(),
});

// ==================== SELECTED PACKAGE/SERVICE SCHEMA ====================

const selectedPackageSchema = Joi.object({
    packageId: Joi.string().allow(''),
    packageTitle: Joi.string().allow('', null),
});

const selectedServiceSchema = Joi.object({
    serviceId: Joi.string().allow(''),
    serviceTitle: Joi.string().allow('', null),
});

// ==================== PAYMENT INFO SCHEMA ====================

const paymentInfoSchema = Joi.object({
    method: Joi.string().valid('card', 'havale-eft', 'online').default('card'),
    cardNumber: Joi.string().allow(''),
    cardHolderName: Joi.string().allow(''),
    cardExpiry: Joi.string().allow(''),
    cardCvv: Joi.string().allow(''),
    cardType: Joi.string().allow('', null),
});

// ==================== COMPLETE BOOKING SCHEMA ====================

export const bookingDataSchema = Joi.object({
    clientInfo: clientInfoSchema.required().messages({
        'any.required': 'Client information is required',
    }),
    selectedOffering: selectedOfferingSchema.required().messages({
        'any.required': 'Selected offering is required',
    }),
    selectedPackage: selectedPackageSchema.optional(),
    selectedService: selectedServiceSchema.optional(),
    serviceType: Joi.string().allow('', null),
    packageType: Joi.string().allow('', null),
    providerId: Joi.string().required().messages({
        'any.required': 'Provider ID is required',
    }),
    expertId: Joi.string().required().messages({
        'any.required': 'Expert ID is required',
    }),
    providerName: Joi.string().required().messages({
        'any.required': 'Provider name is required',
    }),
    date: Joi.string().allow(null, ''),
    time: Joi.string().allow(null, ''),
    subtotal: Joi.number().required().messages({
        'any.required': 'Subtotal is required',
    }),
    discount: Joi.number().allow(0),
    total: Joi.number().required().messages({
        'any.required': 'Total is required',
    }),
    paymentInfo: paymentInfoSchema.optional(),
    orderNotes: Joi.string().max(5000).allow('', null),
    termsAccepted: Joi.boolean().valid(true).required().messages({
        'any.required': 'Terms must be accepted',
        'any.only': 'Terms must be accepted',
    }),
    coupon: Joi.any().allow(null),
    source: Joi.string().allow('', null).default('website'),
}).unknown(true); // Allow unknown fields for flexibility

// ==================== VALIDATE COUPON SCHEMA ====================

export const validateCouponSchema = Joi.object({
    customerId: Joi.string().required().messages({
        'any.required': 'Customer ID is required',
    }),
    couponCode: Joi.string().trim().required().messages({
        'any.required': 'Coupon code is required',
    }),
    expertId: Joi.string().required().messages({
        'any.required': 'Expert ID is required',
    }),
});

// ==================== BOOKING PARAMS SCHEMAS ====================

export const bookingParams = Joi.object({
    expertID: objectIdRequired,
});

export const bookingFormParams = Joi.object({
    finalCustomerId: objectIdRequired,
});

export const institutionBlogsFormsParams = Joi.object({
    institutionID: objectIdRequired,
});

// ==================== BOOKING QUERY SCHEMAS ====================

export const getPackagesQuery = Joi.object({
    status: Joi.string().valid('active', 'inactive', 'available'),
    category: Joi.string(),
});

export default {
    bookingDataSchema,
    validateCouponSchema,
    bookingParams,
    bookingFormParams,
    institutionBlogsFormsParams,
    getPackagesQuery,
};
