/**
 * Form Validation Schemas
 * ========================
 * Joi schemas for form-related endpoints
 */
import Joi from 'joi';
import {
    objectIdRequired,
    title,
    description,
    resourceIdParams,
} from './common.schema.js';

// ==================== FORM ENUMS ====================

const formStatuses = ['draft', 'active', 'inactive', 'archived'];
const fieldTypes = ['text', 'textarea', 'email', 'phone', 'number', 'date', 'select', 'checkbox', 'radio', 'file'];

// ==================== FORM FIELD SCHEMA ====================

const formFieldSchema = Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid(...fieldTypes).required(),
    label: Joi.string().max(200).required(),
    placeholder: Joi.string().max(200).allow('', null),
    required: Joi.boolean().default(false),
    options: Joi.array().items(
        Joi.object({
            label: Joi.string().max(200).required(),
            value: Joi.string().max(200).required(),
        })
    ).allow(null),
    validation: Joi.object({
        min: Joi.number().allow(null),
        max: Joi.number().allow(null),
        pattern: Joi.string().allow('', null),
        message: Joi.string().max(500).allow('', null),
    }).allow(null),
    order: Joi.number().integer().min(0).default(0),
});

// ==================== CREATE FORM SCHEMA ====================

export const createFormSchema = Joi.object({
    title: title.required().messages({
        'any.required': 'Form title is required',
    }),
    description: description.allow('', null),
    fields: Joi.array().allow(null),
    status: Joi.string().valid(...formStatuses).default('draft'),
    settings: Joi.object({
        submitButtonText: Joi.string().max(50).default('Submit'),
        successMessage: Joi.string().max(500).allow('', null),
        redirectUrl: Joi.string().uri().allow('', null),
        notifyEmail: Joi.string().email().allow('', null),
        allowMultipleSubmissions: Joi.boolean().default(false),
        requireLogin: Joi.boolean().default(false),
    }).default({}),
    styling: Joi.object({
        theme: Joi.string().max(50).allow('', null),
        primaryColor: Joi.string().max(20).allow('', null),
        backgroundColor: Joi.string().max(20).allow('', null),
    }).allow(null),
});

// ==================== UPDATE FORM SCHEMA ====================

export const updateFormSchema = Joi.object({
    title: title,
    description: description.allow('', null),
    fields: Joi.array().allow(null),
    status: Joi.string().valid(...formStatuses),
    settings: Joi.object({
        submitButtonText: Joi.string().max(50),
        successMessage: Joi.string().max(500).allow('', null),
        redirectUrl: Joi.string().uri().allow('', null),
        notifyEmail: Joi.string().email().allow('', null),
        allowMultipleSubmissions: Joi.boolean(),
        requireLogin: Joi.boolean(),
    }),
    styling: Joi.object({
        theme: Joi.string().max(50).allow('', null),
        primaryColor: Joi.string().max(20).allow('', null),
        backgroundColor: Joi.string().max(20).allow('', null),
    }).allow(null),
}).min(1).messages({
    'object.min': 'At least one field must be provided for update',
});

// ==================== UPDATE FORM STATUS SCHEMA ====================

export const updateFormStatusSchema = Joi.object({
    status: Joi.string().valid(...formStatuses).required().messages({
        'any.required': 'Status is required',
        'any.only': `Status must be one of: ${formStatuses.join(', ')}`,
    }),
});

// ==================== SUBMIT FORM RESPONSE SCHEMA ====================

export const submitFormResponseSchema = Joi.object({
    responses: Joi.object().pattern(
        Joi.string(), // field ID
        Joi.alternatives().try(
            Joi.string().max(5000),
            Joi.number(),
            Joi.boolean(),
            Joi.array().items(Joi.string()),
            Joi.any() // For file uploads
        )
    ).required().messages({
        'any.required': 'Form responses are required',
    }),
    metadata: Joi.object({
        submittedAt: Joi.date().default(() => new Date()),
        userAgent: Joi.string().max(500).allow('', null),
        ipAddress: Joi.string().max(50).allow('', null),
    }).allow(null),
});

// ==================== FORM PARAMS SCHEMAS ====================

export const formIdParams = resourceIdParams('formId');

export const formStatusParams = Joi.object({
    userId: objectIdRequired,
    status: Joi.string().valid(...formStatuses).required(),
});

// ==================== FORM QUERY SCHEMAS ====================

export const getFormsQuery = Joi.object({
    status: Joi.string().valid(...formStatuses),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
});

export default {
    createFormSchema,
    updateFormSchema,
    updateFormStatusSchema,
    submitFormResponseSchema,
    formIdParams,
    formStatusParams,
    getFormsQuery,
};
