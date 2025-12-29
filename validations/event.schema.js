/**
 * Event Validation Schemas
 * =========================
 * Joi schemas for event-related endpoints
 */
import Joi from 'joi';
import {
    objectIdRequired,
    title,
    description,
    price,
    duration,
    dateString,
    timeString,
    userIdParams,
    resourceIdParams,
} from './common.schema.js';

// ==================== EVENT ENUMS ====================

const eventTypes = ['online', 'offline', 'hybrid'];
const meetingTypes = ['1-1', 'grup', ''];
const serviceTypes = ['service', 'package'];
const eventStatuses = ['pending', 'approved', 'completed', 'cancelled', 'scheduled'];
const paymentMethods = ['card', 'online', 'havale-eft', 'paketten-tahsil'];

// ==================== SELECTED CLIENT SCHEMA ====================

const selectedClientSchema = Joi.object({
    id: objectIdRequired,
    name: Joi.string().trim().max(200).required(),
    email: Joi.string().email().required(),
    packages: Joi.array().items(Joi.string()).optional(),
});

// ==================== FILE SCHEMA ====================

const fileSchema = Joi.object({
    name: Joi.string().required(),
    url: Joi.string().required(),
    type: Joi.string().required(),
    size: Joi.string().required(),
    uploadDate: Joi.string().required(),
});

// ==================== PAYMENT TYPE SCHEMA ====================

const paymentTypeSchema = Joi.object({
    customerId: objectIdRequired,
    paymentMethod: Joi.string().valid(...paymentMethods).default('online'),
    packageId: Joi.string().allow('', null),
    orderId: Joi.string().allow('', null),
});

// ==================== CREATE EVENT SCHEMA ====================

export const createEventSchema = Joi.object({
    title: title.required().messages({
        'any.required': 'Event title is required',
    }),
    description: description.allow('', null),
    serviceId: Joi.string().allow('', null),
    serviceName: Joi.string().allow('', null),
    packageId: Joi.string().allow('', null),
    packageName: Joi.string().allow('', null),
    serviceType: Joi.string().valid(...serviceTypes).required().messages({
        'any.required': 'Service type is required',
        'any.only': 'Service type must be either "service" or "package"',
    }),
    date: Joi.string().allow('', null),
    time: Joi.string().allow('', null),
    duration: Joi.number().integer().min(1).required().messages({
        'any.required': 'Duration is required',
        'number.min': 'Duration must be at least 1 minute',
    }),
    location: Joi.string().max(500).allow('', null),
    platform: Joi.string().max(200).allow('', null),
    eventType: Joi.string().valid(...eventTypes).required().messages({
        'any.required': 'Event type is required',
        'any.only': 'Event type must be one of: online, offline, hybrid',
    }),
    meetingType: Joi.string().valid(...meetingTypes).allow('', null),
    price: price.required().messages({
        'any.required': 'Price is required',
    }),
    maxAttendees: Joi.number().integer().min(1).allow(null),
    customers: Joi.array().items(objectIdRequired).default([]),
    category: Joi.string().max(100).allow('', null),
    status: Joi.string().valid(...eventStatuses).default('pending'),
    paymentType: Joi.array().items(paymentTypeSchema).default([]),
    isRecurring: Joi.boolean().default(false),
    recurringType: Joi.string().valid('weekly', 'monthly').allow(null),
    selectedClients: Joi.array().items(selectedClientSchema).default([]),
    appointmentNotes: Joi.string().max(5000).allow('', null),
    files: Joi.array().items(fileSchema).default([]),
});

// ==================== UPDATE EVENT SCHEMA ====================

export const updateEventSchema = Joi.object({
    title: title,
    description: description.allow('', null),
    serviceId: Joi.string().allow('', null),
    serviceName: Joi.string().allow('', null),
    packageId: Joi.string().allow('', null),
    packageName: Joi.string().allow('', null),
    serviceType: Joi.string().valid(...serviceTypes),
    date: Joi.string().allow('', null),
    time: Joi.string().allow('', null),
    duration: Joi.number().integer().min(1),
    location: Joi.string().max(500).allow('', null),
    platform: Joi.string().max(200).allow('', null),
    eventType: Joi.string().valid(...eventTypes),
    meetingType: Joi.string().valid(...meetingTypes).allow('', null),
    price: price,
    maxAttendees: Joi.number().integer().min(1).allow(null),
    customers: Joi.array().items(objectIdRequired),
    category: Joi.string().max(100).allow('', null),
    status: Joi.string().valid(...eventStatuses),
    paymentType: Joi.array().items(paymentTypeSchema),
    isRecurring: Joi.boolean(),
    recurringType: Joi.string().valid('weekly', 'monthly').allow(null),
    selectedClients: Joi.array().items(selectedClientSchema),
    appointmentNotes: Joi.string().max(5000).allow('', null),
    files: Joi.array().items(fileSchema),
}).min(1).messages({
    'object.min': 'At least one field must be provided for update',
});

// ==================== UPDATE EVENT STATUS SCHEMA ====================

export const updateEventStatusSchema = Joi.object({
    status: Joi.string().valid(...eventStatuses).required().messages({
        'any.required': 'Status is required',
        'any.only': `Status must be one of: ${eventStatuses.join(', ')}`,
    }),
    cancelReason: Joi.string().max(1000).allow('', null),
    notes: Joi.string().max(2000).allow('', null),
    completedAt: Joi.string().allow('', null),
});

// ==================== EVENT PARAMS SCHEMAS ====================

export const eventIdParams = resourceIdParams('eventId');

export const eventStatusParams = Joi.object({
    userId: objectIdRequired,
    status: Joi.string().valid(...eventStatuses).required(),
});

// ==================== EVENT QUERY SCHEMAS ====================

export const getEventsQuery = Joi.object({
    status: Joi.string().valid(...eventStatuses),
    startDate: Joi.string(),
    endDate: Joi.string(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
});

export default {
    createEventSchema,
    updateEventSchema,
    updateEventStatusSchema,
    eventIdParams,
    eventStatusParams,
    getEventsQuery,
};
