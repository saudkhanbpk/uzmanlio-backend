/**
 * Package Validation Schemas
 * ===========================
 * Joi schemas for package-related endpoints
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

// ==================== PACKAGE ENUMS ====================

const categories = ['egitim', 'danismanlik', 'workshop', 'mentorluk', ''];
const eventTypes = ['online', 'offline', 'hybrid'];
const meetingTypes = ['1-1', 'grup', ''];
const packageStatuses = ['active', 'inactive', 'onhold'];

// ==================== SELECTED CLIENT SCHEMA ====================

const selectedClientSchema = Joi.object({
    id: objectIdRequired,
    name: Joi.string().trim().max(200),
    email: Joi.string().email(),
});

// ==================== CREATE PACKAGE SCHEMA ====================

export const createPackageSchema = Joi.object({
    title: title.required().messages({
        'any.required': 'Package title is required',
    }),
    description: description.allow('', null),
    price: Joi.number().min(0).default(0).messages({
        'number.min': 'Price cannot be negative',
    }),
    discount: Joi.number().min(0).max(100).default(0),
    originalPrice: Joi.number().min(0).allow(null),
    duration: Joi.number().integer().min(0).default(0),
    appointmentCount: Joi.number().integer().min(1).default(1).messages({
        'number.min': 'Appointment count must be at least 1',
    }),
    sessionsIncluded: Joi.number().integer().min(1).allow(null),
    category: Joi.string().valid(...categories).allow('', null),
    eventType: Joi.string().valid(...eventTypes).default('online'),
    meetingType: Joi.string().valid(...meetingTypes).allow('', null),
    platform: Joi.string().max(200).allow('', null),
    location: Joi.string().max(500).allow('', null),
    date: Joi.string().allow('', null),
    time: Joi.string().max(20).allow('', null),
    maxAttendees: Joi.number().integer().min(1).allow(null),
    icon: Joi.string().max(100).default('📦'),
    iconBg: Joi.string().max(100).default('bg-primary-100'),
    features: Joi.array().items(Joi.string().max(500)).default([]),
    status: Joi.string().valid(...packageStatuses).default('active'),
    isAvailable: Joi.boolean().default(true),
    isPurchased: Joi.boolean().default(false),
    isOfflineEvent: Joi.boolean().default(false),
    validUntil: Joi.string().allow(null),
    selectedClients: Joi.array().items(selectedClientSchema).default([]),
});

// ==================== UPDATE PACKAGE SCHEMA ====================

export const updatePackageSchema = Joi.object({
    title: title,
    description: description.allow('', null),
    price: Joi.number().min(0),
    discount: Joi.number().min(0).max(100),
    originalPrice: Joi.number().min(0).allow(null),
    duration: Joi.number().integer().min(0),
    appointmentCount: Joi.number().integer().min(1),
    sessionsIncluded: Joi.number().integer().min(1).allow(null),
    category: Joi.string().valid(...categories).allow('', null),
    eventType: Joi.string().valid(...eventTypes),
    meetingType: Joi.string().valid(...meetingTypes).allow('', null),
    platform: Joi.string().max(200).allow('', null),
    location: Joi.string().max(500).allow('', null),
    date: Joi.string().allow('', null),
    time: Joi.string().max(20).allow('', null),
    maxAttendees: Joi.number().integer().min(1).allow(null),
    icon: Joi.string().max(100),
    iconBg: Joi.string().max(100),
    features: Joi.array().items(Joi.string().max(500)),
    status: Joi.string().valid(...packageStatuses),
    isAvailable: Joi.boolean(),
    isPurchased: Joi.boolean(),
    isOfflineEvent: Joi.boolean(),
    validUntil: Joi.string().allow(null),
    selectedClients: Joi.array().items(selectedClientSchema),
}).min(1).messages({
    'object.min': 'At least one field must be provided for update',
});

// ==================== PACKAGE PARAMS SCHEMAS ====================

export const packageIdParams = resourceIdParams('packageId');

// ==================== PACKAGE QUERY SCHEMAS ====================

export const getPackagesQuery = Joi.object({
    status: Joi.string().valid(...packageStatuses),
    isAvailable: Joi.boolean(),
    category: Joi.string().valid(...categories),
});

export default {
    createPackageSchema,
    updatePackageSchema,
    packageIdParams,
    getPackagesQuery,
};
