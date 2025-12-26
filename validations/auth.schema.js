/**
 * Authentication Validation Schemas
 * ==================================
 * Joi schemas for authentication-related endpoints
 */
import Joi from 'joi';
import {
    email,
    password,
    name,
    phone,
    objectIdRequired,
    dateString,
} from './common.schema.js';

// ==================== SIGNUP SCHEMA ====================

export const signupSchema = Joi.object({
    information: Joi.object({
        name: name.required().messages({
            'any.required': 'Name is required',
        }),
        surname: name.required().messages({
            'any.required': 'Surname is required',
        }),
        birthday: Joi.string().allow('', null),
        country: Joi.string().max(100).allow('', null),
        city: Joi.string().max(100).allow('', null),
        district: Joi.string().max(100).allow('', null),
        address: Joi.string().max(500).allow('', null),
        email: email.required().messages({
            'any.required': 'Email is required',
        }),
        phone: phone.allow('', null),
        phoneCode: Joi.string().max(10).allow('', null),
        about: Joi.string().max(2000).allow('', null),
        gender: Joi.string().valid('male', 'female', 'other', '').allow('', null),
    }).required().messages({
        'any.required': 'User information is required',
    }),

    password: password.required().messages({
        'any.required': 'Password is required',
    }),

    subscription: Joi.object({
        seats: Joi.number().integer().min(0).default(0),
        plantype: Joi.string().valid('individual', 'institutional').default('individual'),
        duration: Joi.string().valid('monthly', 'yearly').default('monthly'),
        cardNumber: Joi.string().allow('', null),
        cardHolderName: Joi.string().allow('', null),
        expiry: Joi.string().allow('', null),
        cvv: Joi.string().allow('', null),
    }).allow(null),

    price: Joi.number().min(0).allow(null),
});

// ==================== LOGIN SCHEMA ====================

export const loginSchema = Joi.object({
    email: email.required().messages({
        'any.required': 'Email is required',
        'string.email': 'Please provide a valid email address',
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required',
    }),
});

// ==================== FORGOT PASSWORD SCHEMA ====================

export const forgotPasswordSchema = Joi.object({
    email: email.required().messages({
        'any.required': 'Email is required',
        'string.email': 'Please provide a valid email address',
    }),
});

// ==================== VERIFY OTP SCHEMA ====================

export const verifyOtpSchema = Joi.object({
    email: email.required().messages({
        'any.required': 'Email is required',
    }),
    otp: Joi.string()
        .length(6)
        .pattern(/^\d{6}$/)
        .required()
        .messages({
            'any.required': 'OTP is required',
            'string.length': 'OTP must be 6 digits',
            'string.pattern.base': 'OTP must contain only digits',
        }),
});

// ==================== RESET PASSWORD SCHEMA ====================

export const resetPasswordSchema = Joi.object({
    email: email.required().messages({
        'any.required': 'Email is required',
    }),
    otp: Joi.string()
        .length(6)
        .pattern(/^\d{6}$/)
        .required()
        .messages({
            'any.required': 'OTP is required',
            'string.length': 'OTP must be 6 digits',
        }),
    newPassword: password.required().messages({
        'any.required': 'New password is required',
    }),
});

// ==================== VERIFY EMAIL SCHEMA ====================

export const verifyEmailSchema = Joi.object({
    token: Joi.string().uuid().required().messages({
        'any.required': 'Verification token is required',
        'string.guid': 'Invalid verification token format',
    }),
});

// ==================== RESEND VERIFICATION SCHEMA ====================

export const resendVerificationSchema = Joi.object({
    email: email.required().messages({
        'any.required': 'Email is required',
    }),
});

// ==================== REFRESH TOKEN SCHEMA ====================

export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        'any.required': 'Refresh token is required',
    }),
});

// ==================== LOGOUT SCHEMA ====================

export const logoutSchema = Joi.object({
    userId: objectIdRequired.allow('', null),
});

// ==================== USER ID PARAMS SCHEMA ====================

export const userIdParamsSchema = Joi.object({
    userId: objectIdRequired.messages({
        'any.required': 'User ID is required',
        'string.pattern.base': 'Invalid user ID format',
    }),
});

export default {
    signupSchema,
    loginSchema,
    forgotPasswordSchema,
    verifyOtpSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    resendVerificationSchema,
    refreshTokenSchema,
    logoutSchema,
    userIdParamsSchema,
};
