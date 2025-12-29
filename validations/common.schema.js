/**
 * Common Validation Schemas
 * =========================
 * Reusable Joi validation schemas and custom validators
 */
import Joi from 'joi';

// ==================== CUSTOM VALIDATORS ====================

/**
 * Custom MongoDB ObjectId validator
 */
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
export const objectId = Joi.string().pattern(objectIdPattern).messages({
    'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId',
});

/**
 * MongoDB ObjectId that is required
 */
export const objectIdRequired = objectId.required();

// ==================== COMMON FIELD SCHEMAS ====================

/**
 * Email validation with sanitization
 */
export const email = Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .max(255)
    .messages({
        'string.email': 'Please provide a valid email address',
        'string.max': 'Email must not exceed 255 characters',
    });

/**
 * Password validation - min 8 chars
 */
export const password = Joi.string()
    .min(8)
    .max(128)
    .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must not exceed 128 characters',
    });

/**
 * Phone number validation (flexible international format)
 */
export const phone = Joi.string()
    .pattern(/^[\d\s\-+()]*$/)
    .min(7)
    .max(20)
    .messages({
        'string.pattern.base': 'Phone number contains invalid characters',
        'string.min': 'Phone number is too short',
        'string.max': 'Phone number is too long',
    });

/**
 * Name validation (first/last names)
 */
export const name = Joi.string()
    .trim()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-ZğüşöçıİĞÜŞÖÇ\s'-]+$/)
    .messages({
        'string.min': 'Name is required',
        'string.max': 'Name must not exceed 100 characters',
        'string.pattern.base': 'Name contains invalid characters',
    });

/**
 * General title/name field (for services, packages, etc.)
 */
export const title = Joi.string()
    .trim()
    .min(1)
    .max(200)
    .messages({
        'string.min': 'Title is required',
        'string.max': 'Title must not exceed 200 characters',
    });

/**
 * Description/text field
 */
export const description = Joi.string()
    .trim()
    .max(5000)
    .allow('')
    .messages({
        'string.max': 'Description must not exceed 5000 characters',
    });

/**
 * Price validation (positive number)
 */
export const price = Joi.number()
    .min(0)
    .precision(2)
    .messages({
        'number.min': 'Price cannot be negative',
    });

/**
 * Duration in minutes
 */
export const duration = Joi.number()
    .integer()
    .min(1)
    .max(1440) // Max 24 hours
    .messages({
        'number.min': 'Duration must be at least 1 minute',
        'number.max': 'Duration cannot exceed 24 hours (1440 minutes)',
    });

/**
 * Date string validation (ISO format or common formats)
 */
export const dateString = Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$|^\d{2}[./-]\d{2}[./-]\d{4}$/)
    .messages({
        'string.pattern.base': 'Date must be in a valid format (YYYY-MM-DD)',
    });

/**
 * Time string validation (HH:mm or HH:mm:ss)
 */
export const timeString = Joi.string()
    .pattern(/^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
    .messages({
        'string.pattern.base': 'Time must be in HH:mm or HH:mm:ss format',
    });

/**
 * URL validation
 */
export const url = Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .messages({
        'string.uri': 'Please provide a valid URL',
        'string.max': 'URL must not exceed 2048 characters',
    });

/**
 * Slug validation (URL-safe string)
 */
export const slug = Joi.string()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(1)
    .max(200)
    .messages({
        'string.pattern.base': 'Slug must be URL-safe (lowercase letters, numbers, and hyphens)',
    });

/**
 * Hex color validation
 */
export const hexColor = Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .messages({
        'string.pattern.base': 'Must be a valid hex color (e.g., #FF0000)',
    });

/**
 * Status field for common entity statuses
 */
export const status = Joi.string()
    .valid('active', 'inactive', 'pending', 'approved', 'completed', 'cancelled', 'onhold', 'scheduled')
    .messages({
        'any.only': 'Invalid status value',
    });

// ==================== COMMON PARAM SCHEMAS ====================

/**
 * User ID param validation
 */
export const userIdParams = Joi.object({
    userId: objectIdRequired.messages({
        'any.required': 'User ID is required',
        'string.pattern.base': 'User ID must be a valid ID',
    }),
});

/**
 * User ID + Resource ID param validation
 */
export const resourceIdParams = (resourceName = 'resourceId') => Joi.object({
    userId: objectIdRequired.messages({
        'any.required': 'User ID is required',
    }),
    [resourceName]: objectIdRequired.messages({
        'any.required': `${resourceName} is required`,
    }),
});

// ==================== COMMON QUERY SCHEMAS ====================

/**
 * Pagination query validation
 */
export const paginationQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().max(50),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * Date range filter query
 */
export const dateRangeQuery = Joi.object({
    startDate: dateString,
    endDate: dateString,
});

/**
 * Status filter query
 */
export const statusFilterQuery = Joi.object({
    status: Joi.alternatives().try(
        status,
        Joi.array().items(status)
    ),
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Creates an enum validation from an array of allowed values
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} fieldName - Name of the field for error messages
 */
export const createEnum = (allowedValues, fieldName = 'Value') => {
    return Joi.string()
        .valid(...allowedValues)
        .messages({
            'any.only': `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        });
};

/**
 * Makes a schema optional with a default value
 * @param {Object} schema - Joi schema
 * @param {*} defaultValue - Default value
 */
export const withDefault = (schema, defaultValue) => {
    return schema.default(defaultValue);
};

/**
 * Combine multiple schemas (for extending validation)
 * @param {Object} baseSchema - Base Joi object schema
 * @param {Object} extensionSchema - Extension Joi object schema
 */
export const extendSchema = (baseSchema, extensionSchema) => {
    return baseSchema.concat(extensionSchema);
};

export default {
    objectId,
    objectIdRequired,
    email,
    password,
    phone,
    name,
    title,
    description,
    price,
    duration,
    dateString,
    timeString,
    url,
    slug,
    hexColor,
    status,
    userIdParams,
    resourceIdParams,
    paginationQuery,
    dateRangeQuery,
    statusFilterQuery,
    createEnum,
    withDefault,
    extendSchema,
};
