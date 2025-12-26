/**
 * Validation Schemas Index
 * =========================
 * Central export point for all validation schemas
 */

// Middleware
export { validateRequest, validateBody, validateParams, validateQuery } from '../middlewares/validateRequest.js';

// Common schemas and helpers
export * from './common.schema.js';

// Module-specific schemas
export * as authSchemas from './auth.schema.js';
export * as eventSchemas from './event.schema.js';
export * as serviceSchemas from './service.schema.js';
export * as packageSchemas from './package.schema.js';
export * as blogSchemas from './blog.schema.js';
export * as formSchemas from './form.schema.js';
export * as customerSchemas from './customer.schema.js';
export * as institutionSchemas from './institution.schema.js';
export * as subscriptionSchemas from './subscription.schema.js';
export * as bookingSchemas from './booking.schema.js';
export * as expertSchemas from './expert.schema.js';

// Default export with all schema collections
export default {
    auth: () => import('./auth.schema.js'),
    event: () => import('./event.schema.js'),
    service: () => import('./service.schema.js'),
    package: () => import('./package.schema.js'),
    blog: () => import('./blog.schema.js'),
    form: () => import('./form.schema.js'),
    customer: () => import('./customer.schema.js'),
    institution: () => import('./institution.schema.js'),
    subscription: () => import('./subscription.schema.js'),
    booking: () => import('./booking.schema.js'),
    expert: () => import('./expert.schema.js'),
};
