/**
 * Expert Profile Validation Schemas
 * ===================================
 * Joi schemas for expert profile-related endpoints
 */
import Joi from 'joi';
import {
    objectIdRequired,
    email,
    name as commonName,
    phone,
    description as commonDescription,
    url,
    dateString,
} from './common.schema.js';

// ==================== BASIC PROFILE SCHEMAS ====================

export const updateProfileSchema = Joi.object({
    information: Joi.object({
        name: commonName,
        surname: commonName,
        birthday: Joi.string().allow('', null),
        country: Joi.string().max(100).allow('', null),
        city: Joi.string().max(100).allow('', null),
        district: Joi.string().max(100).allow('', null),
        address: Joi.string().max(500).allow('', null),
        email: email,
        phone: phone.allow('', null),
        phoneCode: Joi.string().max(10).allow('', null),
        about: Joi.string().max(5000).allow('', null),
        gender: Joi.string().valid('male', 'female', 'other', '').allow('', null),
    }),
    username: Joi.string()
        .pattern(/^[a-zA-Z0-9_-]+$/)
        .min(3)
        .max(50)
        .messages({
            'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens',
            'string.min': 'Username must be at least 3 characters',
            'string.max': 'Username must not exceed 50 characters',
        }),
    pp: Joi.string().max(500).allow('', null),
    ppFile: Joi.string().max(500).allow('', null),
}).min(1);

// ==================== TITLES SCHEMAS ====================

export const titleSchema = Joi.object({
    title: Joi.string().max(200).required(),
    description: Joi.string().max(1000).allow('', null),
});

// For bulk update or list
export const updateTitlesSchema = Joi.object({
    titles: Joi.array().items(
        titleSchema.append({
            id: Joi.string().allow('', null),
            institution: Joi.string().max(200).allow('', null),
            startDate: Joi.string().allow('', null),
            endDate: Joi.string().allow('', null),
            isCurrent: Joi.boolean().default(false),
        })
    ).max(20),
});

// ==================== CATEGORY SCHEMAS ====================

export const categorySchema = Joi.object({
    subCategory: Joi.string().max(100).required(),
});

// ==================== EDUCATION SCHEMAS ====================

export const educationSchema = Joi.object({
    level: Joi.string().max(100).required(),
    university: Joi.number().allow('', null),
    name: Joi.string().max(200).required(), // Degree name
    department: Joi.string().max(200).allow('', null),
    graduationYear: Joi.number().allow('', null),
    startDate: Joi.date().required(),         // <-- required
    endDate: Joi.date().allow(null),          // <-- optional
    current: Joi.boolean().default(false)    // <-- optional
});

export const updateEducationSchema = Joi.object({
    education: Joi.array().items(
        educationSchema.append({
            id: Joi.string().allow('', null),
        })
    ).max(20),
});

// ==================== CERTIFICATES SCHEMAS ====================

export const certificateSchema = Joi.object({
    name: Joi.string().max(200).required(),
    company: Joi.string().max(200).allow('', null),
    country: Joi.string().max(100).allow('', null),
    city: Joi.string().max(100).allow('', null),
    issueDate: Joi.string().allow('', null),
    expiryDate: Joi.string().allow('', null),
    credentialId: Joi.string().max(100).allow('', null),
    credentialUrl: url.allow('', null),
});

export const updateCertificatesSchema = Joi.object({
    certificates: Joi.array().items(
        certificateSchema.append({
            id: Joi.string().allow('', null),
            description: Joi.string().max(1000).allow('', null),
            issuer: Joi.string().max(200).allow('', null),
        })
    ).max(50),
});

// ==================== EXPERIENCE SCHEMAS ====================

export const experienceSchema = Joi.object({
    company: Joi.string().max(200).required(),
    position: Joi.string().max(200).required(),
    start: Joi.string().allow('', null),
    end: Joi.string().allow('', null),
    stillWork: Joi.boolean().default(false),
    description: Joi.string().max(2000).allow('', null),
    country: Joi.string().max(100).allow('', null),
    city: Joi.string().max(100).allow('', null),
});

export const updateExperienceSchema = Joi.object({
    experience: Joi.array().items(
        experienceSchema.append({
            id: Joi.string().allow('', null),
            title: Joi.string().max(200).allow('', null),
            location: Joi.string().max(200).allow('', null),
            startDate: Joi.string().allow('', null),
            endDate: Joi.string().allow('', null),
            isCurrent: Joi.boolean(),
        })
    ).max(30),
});

// ==================== SKILLS SCHEMAS ====================

export const skillSchema = Joi.object({
    name: Joi.string().max(100).required(),
    level: Joi.number()
        .min(0)
        .max(100)
        .required(),
    category: Joi.string().max(100).allow('', null),
    description: Joi.string().max(500).allow('', null),
});

export const updateSkillsSchema = Joi.object({
    skills: Joi.array().items(
        skillSchema.append({
            id: Joi.string().allow('', null),
            endorsements: Joi.number().integer().min(0).default(0),
        })
    ).max(50),
});

// ==================== AVAILABILITY SCHEMAS ====================

export const availabilitySchema = Joi.object({
    alwaysAvailable: Joi.boolean().default(false),
    selectedSlots: Joi.array().items(
        Joi.object({
            id: Joi.string().allow('', null),
            day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
            start: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).required(),
            end: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).required(),
            active: Joi.boolean().default(true),
        })
    ).default([]),
});

// Old availability structure (for backward compatibility if needed)
export const updateAvailabilitySchema = Joi.object({
    availability: Joi.object({
        timezone: Joi.string().max(50).default('Europe/Istanbul'),
        weeklySchedule: Joi.object().pattern(
            Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
            Joi.object({
                enabled: Joi.boolean().default(false),
                slots: Joi.array().items(
                    Joi.object({
                        start: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).required(),
                        end: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/).required(),
                    })
                ).default([]),
            })
        ),
        exceptions: Joi.array().items(
            Joi.object({
                date: Joi.string().required(),
                reason: Joi.string().max(200).allow('', null),
                isAvailable: Joi.boolean().default(false),
                slots: Joi.array().items(
                    Joi.object({
                        start: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/),
                        end: Joi.string().pattern(/^([01]?\d|2[0-3]):[0-5]\d$/),
                    })
                ).default([]),
            })
        ).max(100),
        bufferTime: Joi.number().integer().min(0).max(120).default(0),
        minimumNotice: Joi.number().integer().min(0).max(10080).default(60), // Max 1 week in minutes
    }),
});

// ==================== BULK PROFILE UPDATE SCHEMA ====================

export const bulkUpdateProfileSchema = Joi.object({
    title: Joi.string().max(200).allow('', null),
    expertCategories: Joi.array().items(categorySchema.append({ id: Joi.string().allow('', null) })),
    education: Joi.array().items(educationSchema.append({ id: Joi.string().allow('', null) })),
    certificates: Joi.array().items(certificateSchema.append({ id: Joi.string().allow('', null) })),
    experience: Joi.array().items(experienceSchema.append({ id: Joi.string().allow('', null) })),
    services: Joi.array().items(Joi.any()), // Services and packages are complex, validated in their own routes
    packages: Joi.array().items(Joi.any()),
});

// ==================== PARAMETERS SCHEMAS ====================

export const userIdParams = Joi.object({
    userId: objectIdRequired.messages({
        'any.required': 'User ID is required',
        'string.pattern.base': 'Invalid user ID format',
    }),
});

export const userIdAndItemParams = userIdParams.keys({
    titleId: Joi.string().max(100).description('Custom UUID for title'),
    categoryId: Joi.string().max(100).description('Custom UUID for category'),
    educationId: Joi.string().max(100).description('Custom UUID for education'),
    certificateId: Joi.string().max(100).description('Custom UUID for certificate'),
    experienceId: Joi.string().max(100).description('Custom UUID for experience'),
    skillId: Joi.string().max(100).description('Custom UUID for skill'),
});

export default {
    updateProfileSchema,
    titleSchema,
    updateTitlesSchema,
    categorySchema,
    educationSchema,
    updateEducationSchema,
    certificateSchema,
    updateCertificatesSchema,
    experienceSchema,
    updateExperienceSchema,
    skillSchema,
    updateSkillsSchema,
    availabilitySchema,
    updateAvailabilitySchema,
    bulkUpdateProfileSchema,
    userIdParams,
    userIdAndItemParams,
};
