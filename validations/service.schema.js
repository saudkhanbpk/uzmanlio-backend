/**
 * Service Validation Schemas
 * ===========================
 * Joi schemas for service-related endpoints
 */
import Joi from 'joi';
import {
    objectIdRequired,
    title,
    description,
    price,
    duration,
    resourceIdParams,
} from './common.schema.js';

// ==================== SERVICE ENUMS ====================

const eventTypes = ['online', 'offline', 'hybrid', ''];
const meetingTypes = ['1-1', 'grup', ''];
const serviceStatuses = ['active', 'inactive', 'onhold', ''];

// ==================== SELECTED CLIENT SCHEMA ====================

const selectedClientSchema = Joi.object({
    id: objectIdRequired,
    name: Joi.string().trim().max(200),
    email: Joi.string().email(),
});

// ==================== CREATE SERVICE SCHEMA ====================

export const createServiceSchema = Joi.object({
    title: title.required().messages({
        'any.required': 'Service title is required',
    }),
    description: description.allow('', null),
    icon: Joi.string().max(100).allow('', null),
    iconBg: Joi.string().max(100).allow('', null),
    price: Joi.alternatives()
        .try(
            Joi.string().pattern(/^\d+(\.\d{1,2})?$/),
            Joi.number().min(0)
        )
        .default('0'),
    discount: Joi.number().min(0).max(100).default(0),
    duration: Joi.alternatives()
        .try(
            Joi.string().pattern(/^\d+$/),
            Joi.number().integer().min(0)
        )
        .default('0'),
    category: Joi.string().max(100).allow('', null),
    features: Joi.array().items(Joi.string().max(500)).default([]),
    date: Joi.string().allow('', null),
    time: Joi.string().max(20).allow('', null),
    location: Joi.string().max(500).allow('', null),
    platform: Joi.string().max(200).allow('', null),
    eventType: Joi.string().valid(...eventTypes).default('online'),
    meetingType: Joi.string().valid(...meetingTypes).allow('', null),
    maxAttendees: Joi.number().integer().min(1).allow(null),
    isOfflineEvent: Joi.boolean().default(false),
    selectedClients: Joi.array().items(selectedClientSchema).default([]),
    isActive: Joi.boolean().default(false),
    status: Joi.string().valid(...serviceStatuses).default('inactive'),
});

// ==================== UPDATE SERVICE SCHEMA ====================

export const updateServiceSchema = Joi.object({
    title: title,
    description: description.allow('', null),
    icon: Joi.string().max(100).allow('', null),
    iconBg: Joi.string().max(100).allow('', null),
    price: Joi.alternatives()
        .try(
            Joi.string().pattern(/^\d+(\.\d{1,2})?$/),
            Joi.number().min(0)
        ),
    discount: Joi.number().min(0).max(100),
    duration: Joi.alternatives()
        .try(
            Joi.string().pattern(/^\d+$/),
            Joi.number().integer().min(0)
        ),
    category: Joi.string().max(100).allow('', null),
    features: Joi.array().items(Joi.string().max(500)),
    date: Joi.date().allow(null),
    time: Joi.string().max(20).allow('', null),
    location: Joi.string().max(500).allow('', null),
    platform: Joi.string().max(200).allow('', null),
    eventType: Joi.string().valid(...eventTypes),
    meetingType: Joi.string().valid(...meetingTypes).allow('', null),
    maxAttendees: Joi.number().integer().min(1).allow(null),
    isOfflineEvent: Joi.boolean(),
    selectedClients: Joi.array().items(selectedClientSchema),
    isActive: Joi.boolean(),
    status: Joi.string().valid(...serviceStatuses),
}).min(1).messages({
    'object.min': 'At least one field must be provided for update',
});

// ==================== SERVICE PARAMS SCHEMAS ====================

export const serviceIdParams = resourceIdParams('serviceId');

// ==================== SERVICE QUERY SCHEMAS ====================

export const getServicesQuery = Joi.object({
    status: Joi.string().valid(...serviceStatuses),
    isActive: Joi.boolean(),
    category: Joi.string().max(100),
});

export default {
    createServiceSchema,
    updateServiceSchema,
    serviceIdParams,
    getServicesQuery,
};
