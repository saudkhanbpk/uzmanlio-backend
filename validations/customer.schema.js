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
    name: name.required().messages({
        'any.required': 'Name is required',
    }),
    surname: name.required().messages({
        'any.required': 'Surname is required',
    }),
    email: email.required().messages({
        'any.required': 'Email is required',
    }),
    phone: phone.allow('', null),
    phoneCode: Joi.string().max(10).allow('', null),
    address: Joi.alternatives().try(
        Joi.string().max(500),
        Joi.object({
            street: Joi.string().max(200).allow('', null),
            city: Joi.string().max(100).allow('', null),
            state: Joi.string().max(100).allow('', null),
            postalCode: Joi.string().max(20).allow('', null),
            country: Joi.string().max(100).allow('', null),
        })
    ).allow('', null, {}),
    city: Joi.string().max(100).allow('', null),
    country: Joi.string().max(100).allow('', null),
    birthday: Joi.string().allow('', null),
    dateOfBirth: Joi.date().allow(null),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say', '').allow('', null),
    occupation: Joi.string().max(200).allow('', null),
    company: Joi.string().max(200).allow('', null),
    notes: Joi.alternatives().try(Joi.string().max(5000), Joi.array().items(Joi.string())).allow('', null),
    tags: Joi.array().items(Joi.string().max(50)).max(20).default([]),
    preferences: Joi.object({
        communicationMethod: Joi.string().valid('email', 'phone', 'sms', 'whatsapp').default('email'),
        language: Joi.string().default('tr'),
        timezone: Joi.string().default('Europe/Istanbul'),
        reminderSettings: Joi.object({
            enabled: Joi.boolean().default(true),
            beforeHours: Joi.number().default(24),
        }),
    }).allow(null),
    customFields: Joi.object().pattern(
        Joi.string(),
        Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
    ).allow(null),
    status: Joi.string().valid(...customerStatuses, 'blocked', 'prospect').default('active'),
    source: Joi.string().max(100).allow('', null),
    referredBy: Joi.string().max(200).allow('', null),
    consentGiven: Joi.object({
        termsAcceptionStatus: Joi.boolean().default(false),
        dataProcessingTerms: Joi.boolean().default(false),
        marketingTerms: Joi.boolean().default(false),
        dataProcessing: Joi.boolean(), // Frontend might send this
        marketing: Joi.boolean(),      // Frontend might send this
        dateGiven: Joi.date().allow(null),
    }).allow(null),
    marketing: Joi.boolean(), // Root level fallback
    dataProcessing: Joi.boolean(), // Root level fallback
});

// ==================== UPDATE CUSTOMER SCHEMA ====================

export const updateCustomerSchema = Joi.object({
    name: name,
    surname: name,
    email: email,
    phone: phone.allow('', null),
    phoneCode: Joi.string().max(10).allow('', null),
    address: Joi.alternatives().try(
        Joi.string().max(500),
        Joi.object({
            street: Joi.string().max(200).allow('', null),
            city: Joi.string().max(100).allow('', null),
            state: Joi.string().max(100).allow('', null),
            postalCode: Joi.string().max(20).allow('', null),
            country: Joi.string().max(100).allow('', null),
        })
    ).allow('', null, {}),
    city: Joi.string().max(100).allow('', null),
    country: Joi.string().max(100).allow('', null),
    birthday: Joi.string().allow('', null),
    dateOfBirth: Joi.date().allow(null),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say', '').allow('', null),
    occupation: Joi.string().max(200).allow('', null),
    company: Joi.string().max(200).allow('', null),
    notes: Joi.alternatives().try(Joi.string().max(5000), Joi.array().items(Joi.string())).allow('', null),
    tags: Joi.array().items(Joi.string().max(50)).max(20),
    preferences: Joi.object({
        communicationMethod: Joi.string().valid('email', 'phone', 'sms', 'whatsapp'),
        language: Joi.string(),
        timezone: Joi.string(),
        reminderSettings: Joi.object({
            enabled: Joi.boolean(),
            beforeHours: Joi.number(),
        }),
    }).allow(null),
    customFields: Joi.object().pattern(
        Joi.string(),
        Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
    ).allow(null),
    status: Joi.string().valid(...customerStatuses, 'blocked', 'prospect'),
    source: Joi.string().max(100).allow('', null),
    referredBy: Joi.string().max(200).allow('', null),
    consentGiven: Joi.object({
        termsAcceptionStatus: Joi.boolean(),
        dataProcessingTerms: Joi.boolean(),
        marketingTerms: Joi.boolean(),
        dateGiven: Joi.date().allow(null),
    }).allow(null),
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
            name: name.required(),
            surname: name.required(),
            email: email.required(),
            phone: phone.allow('', null),
            address: Joi.alternatives().try(
                Joi.string().max(500),
                Joi.object({
                    street: Joi.string().max(200).allow('', null),
                    city: Joi.string().max(100).allow('', null),
                    state: Joi.string().max(100).allow('', null),
                    postalCode: Joi.string().max(20).allow('', null),
                    country: Joi.string().max(100).allow('', null),
                })
            ).allow('', null, {}),
            city: Joi.string().max(100).allow('', null),
            country: Joi.string().max(100).allow('', null),
            notes: Joi.alternatives().try(Joi.string().max(2000), Joi.array().items(Joi.string())).allow('', null),
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
    sortBy: Joi.string().valid('name', 'surname', 'email', 'createdAt').default('createdAt'),
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
