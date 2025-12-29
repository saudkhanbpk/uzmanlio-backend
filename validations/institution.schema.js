/**
 * Institution Validation Schemas
 * ================================
 * Joi schemas for institution-related endpoints
 */
import Joi from 'joi';
import {
    objectIdRequired,
    email,
    name,
    description,
    phone,
    url,
    resourceIdParams,
} from './common.schema.js';

// ==================== UPDATE INSTITUTION SCHEMA ====================

export const updateInstitutionSchema = Joi.object({
    name: Joi.string().trim().min(1).max(200).messages({
        'string.min': 'Institution name is required',
        'string.max': 'Institution name must not exceed 200 characters',
    }),
    bio: Joi.string().max(500).allow('', null),
    about: Joi.string().max(5000).allow('', null),
    website: url.allow('', null),
    email: email.allow('', null),
    phone: phone.allow('', null),
    address: Joi.string().max(500).allow('', null),
    city: Joi.string().max(100).allow('', null),
    country: Joi.string().max(100).allow('', null),
    taxNumber: Joi.string().max(50).allow('', null),
    taxOffice: Joi.string().max(100).allow('', null),
    // Logo and axe are handled by multer file upload
}).min(1).messages({
    'object.min': 'At least one field must be provided for update',
});

// ==================== INVITE USER SCHEMA ====================

export const inviteUserSchema = Joi.object({
    name: name.allow('', null),
    email: email.required().messages({
        'any.required': 'Email is required to send invitation',
        'string.email': 'Please provide a valid email address',
    }),
    permissions: Joi.array().items(
        Joi.string().valid('appointments', 'customers', 'billing', 'settings', 'reports')
    ).default(['appointments', 'customers']),
    role: Joi.string().valid('admin', 'member', 'viewer').default('member'),
});

// ==================== ACCEPT INVITATION SCHEMA ====================

export const acceptInvitationSchema = Joi.object({
    token: Joi.string().required().messages({
        'any.required': 'Invitation token is required',
    }),
    password: Joi.string().min(8).max(128).required().messages({
        'any.required': 'Password is required',
        'string.min': 'Password must be at least 8 characters long',
    }),
    name: name.allow('', null),
    surname: name.allow('', null),
});

// ==================== UPDATE MEMBER PERMISSIONS SCHEMA ====================

export const updateMemberPermissionsSchema = Joi.object({
    permissions: Joi.array().items(
        Joi.string().valid('appointments', 'customers', 'billing', 'settings', 'reports')
    ).min(1).required().messages({
        'any.required': 'Permissions are required',
        'array.min': 'At least one permission must be specified',
    }),
    role: Joi.string().valid('admin', 'member', 'viewer'),
});

// ==================== REMOVE MEMBER SCHEMA ====================

export const removeMemberSchema = Joi.object({
    memberId: objectIdRequired.messages({
        'any.required': 'Member ID is required',
    }),
    reason: Joi.string().max(500).allow('', null),
});

// ==================== INSTITUTION PARAMS SCHEMAS ====================

export const institutionMemberParams = Joi.object({
    userId: objectIdRequired,
    memberId: objectIdRequired,
});

// ==================== INVITED USERS QUERY SCHEMA ====================

export const invitedUsersQuery = Joi.object({
    status: Joi.string().valid('pending', 'accepted', 'expired', 'rejected'),
});

export default {
    updateInstitutionSchema,
    inviteUserSchema,
    acceptInvitationSchema,
    updateMemberPermissionsSchema,
    removeMemberSchema,
    institutionMemberParams,
    invitedUsersQuery,
};
