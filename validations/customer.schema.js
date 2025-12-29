/**
 * Customer Validation Schemas
 * ============================
 * Joi schemas for customer-related endpoints
 */
import Joi from 'joi';
import {
    objectIdRequired,
    email,
    phone,
    name,
    description,
    resourceIdParams,
} from './common.schema.js';

// ==================== CUSTOMER ENUMS ====================

const customerStatuses = ['active', 'inactive', 'archived'];

// ==================== CREATE CUSTOMER SCHEMA ====================

export const createCustomerSchema = Joi.object({
    firstName: name.required().messages({
        'any.required': 'First name is required',
    }),
    lastName: name.required().messages({
        'any.required': 'Last name is required',
    }),
    email: email.required().messages({
        'any.required': 'Email is required',
    }),
    phone: phone.allow('', null),
    phoneCode: Joi.string().max(10).allow('', null),
    address: Joi.string().max(500).allow('', null),
    city: Joi.string().max(100).allow('', null),
    country: Joi.string().max(100).allow('', null),
    birthday: Joi.string().allow('', null),
    gender: Joi.string().valid('male', 'female', 'other', '').allow('', null),
    notes: Joi.string().max(5000).allow('', null),
    tags: Joi.array().items(Joi.string().max(50)).max(20).default([]),
    customFields: Joi.object().pattern(
        Joi.string(),
        Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
    ).allow(null),
    status: Joi.string().valid(...customerStatuses).default('active'),
    source: Joi.string().max(100).allow('', null),
});

// ==================== UPDATE CUSTOMER SCHEMA ====================

export const updateCustomerSchema = Joi.object({
    firstName: name,
    lastName: name,
    email: email,
    phone: phone.allow('', null),
    phoneCode: Joi.string().max(10).allow('', null),
    address: Joi.string().max(500).allow('', null),
    city: Joi.string().max(100).allow('', null),
    country: Joi.string().max(100).allow('', null),
    birthday: Joi.string().allow('', null),
    gender: Joi.string().valid('male', 'female', 'other', '').allow('', null),
    notes: Joi.string().max(5000).allow('', null),
    tags: Joi.array().items(Joi.string().max(50)).max(20),
    customFields: Joi.object().pattern(
        Joi.string(),
        Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
    ).allow(null),
    status: Joi.string().valid(...customerStatuses),
    source: Joi.string().max(100).allow('', null),
}).min(1).messages({
    'object.min': 'At least one field must be provided for update',
});

// ==================== UPDATE CUSTOMER STATUS SCHEMA ====================

export const updateCustomerStatusSchema = Joi.object({
    status: Joi.string().valid(...customerStatuses).required().messages({
        'any.required': 'Status is required',
        'any.only': `Status must be one of: ${customerStatuses.join(', ')}`,
    }),
});

// ==================== ARCHIVE CUSTOMER SCHEMA ====================

export const archiveCustomerSchema = Joi.object({
    archived: Joi.boolean().required(),
    reason: Joi.string().max(500).allow('', null),
});

// ==================== CUSTOMER NOTE SCHEMA ====================

export const addCustomerNoteSchema = Joi.object({
    content: Joi.string().max(5000).required().messages({
        'any.required': 'Note content is required',
        'string.max': 'Note content is too long',
    }),
    type: Joi.string().valid('general', 'appointment', 'payment', 'followup').default('general'),
    // File upload handled by multer
});

export const updateCustomerNoteSchema = Joi.object({
    content: Joi.string().max(5000),
    type: Joi.string().valid('general', 'appointment', 'payment', 'followup'),
}).min(1);

// ==================== BULK IMPORT SCHEMA ====================

export const bulkImportCustomersSchema = Joi.object({
    customers: Joi.array().items(
        Joi.object({
            firstName: name.required(),
            lastName: name.required(),
            email: email.required(),
            phone: phone.allow('', null),
            address: Joi.string().max(500).allow('', null),
            city: Joi.string().max(100).allow('', null),
            country: Joi.string().max(100).allow('', null),
            notes: Joi.string().max(2000).allow('', null),
        })
    ).min(1).max(1000).required().messages({
        'any.required': 'Customers array is required',
        'array.min': 'At least one customer is required',
        'array.max': 'Maximum 1000 customers can be imported at once',
    }),
    skipDuplicates: Joi.boolean().default(true),
    updateExisting: Joi.boolean().default(false),
});

// ==================== CUSTOMER PARAMS SCHEMAS ====================

export const customerIdParams = resourceIdParams('customerId');

export const customerNoteIdParams = Joi.object({
    userId: objectIdRequired,
    customerId: objectIdRequired,
    noteId: objectIdRequired,
});

// ==================== CUSTOMER QUERY SCHEMAS ====================

export const getCustomersQuery = Joi.object({
    status: Joi.string().valid(...customerStatuses),
    search: Joi.string().max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('firstName', 'lastName', 'email', 'createdAt').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export default {
    createCustomerSchema,
    updateCustomerSchema,
    updateCustomerStatusSchema,
    archiveCustomerSchema,
    addCustomerNoteSchema,
    updateCustomerNoteSchema,
    bulkImportCustomersSchema,
    customerIdParams,
    customerNoteIdParams,
    getCustomersQuery,
};
