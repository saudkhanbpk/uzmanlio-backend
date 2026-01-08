/**
 * Blog Validation Schemas
 * ========================
 * Joi schemas for blog-related endpoints
 */
import Joi from 'joi';
import {
    objectIdRequired,
    title,
    description,
    slug,
    resourceIdParams,
} from './common.schema.js';

// ==================== BLOG ENUMS ====================

const blogStatuses = ['draft', 'published', 'archived'];
const blogCategories = ['technology', 'business', 'health', 'lifestyle', 'education', 'other'];

// ==================== CREATE BLOG SCHEMA ====================

export const createBlogSchema = Joi.object({
    title: title.required().messages({
        'any.required': 'Blog title is required',
    }),
    content: Joi.string().min(4).max(100000).required().messages({
        'any.required': 'Blog content is required',
        'string.min': 'Content must be at least 10 characters',
        'string.max': 'Content is too long',
    }),
    excerpt: Joi.string().max(500).allow('', null),
    category: Joi.string().max(100).allow('', null),
    tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
    featuredImage: Joi.string().max(2048).allow('', null),
    status: Joi.string().valid(...blogStatuses).default('draft'),
    metaTitle: Joi.string().max(70).allow('', null),
    metaDescription: Joi.string().max(160).allow('', null),
    slug: slug.allow('', null), // Will be auto-generated if not provided
    isPublished: Joi.boolean().default(false),
    publishedAt: Joi.date().allow(null),
});

// ==================== UPDATE BLOG SCHEMA ====================

export const updateBlogSchema = Joi.object({
    title: title,
    content: Joi.string().min(10).max(100000),
    excerpt: Joi.string().max(500).allow('', null),
    category: Joi.string().max(100).allow('', null),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
    featuredImage: Joi.string().max(2048).allow('', null),
    status: Joi.string().valid(...blogStatuses),
    metaTitle: Joi.string().max(70).allow('', null),
    metaDescription: Joi.string().max(160).allow('', null),
    slug: slug.allow('', null),
    isPublished: Joi.boolean(),
    publishedAt: Joi.date().allow(null),
}).min(1).messages({
    'object.min': 'At least one field must be provided for update',
});

// ==================== UPDATE BLOG STATUS SCHEMA ====================

export const updateBlogStatusSchema = Joi.object({
    status: Joi.string().valid(...blogStatuses).required().messages({
        'any.required': 'Status is required',
        'any.only': `Status must be one of: ${blogStatuses.join(', ')}`,
    }),
});

// ==================== BLOG PARAMS SCHEMAS ====================

export const blogIdParams = resourceIdParams('blogId');

export const blogSlugParams = Joi.object({
    userId: objectIdRequired,
    slug: slug.required(),
});

export const blogCategoryParams = Joi.object({
    userId: objectIdRequired,
    category: Joi.string().max(100).required(),
});

export const blogStatusParams = Joi.object({
    userId: objectIdRequired,
    status: Joi.string().valid(...blogStatuses).required(),
});

// ==================== BLOG QUERY SCHEMAS ====================

export const getBlogsQuery = Joi.object({
    status: Joi.string().valid(...blogStatuses),
    category: Joi.string().max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'publishedAt').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export default {
    createBlogSchema,
    updateBlogSchema,
    updateBlogStatusSchema,
    blogIdParams,
    blogSlugParams,
    blogCategoryParams,
    blogStatusParams,
    getBlogsQuery,
};
