const { z } = require('zod');

// Content Type Enum
const ContentTypeEnum = z.enum(['message', 'post', 'story']);

// Content Status Enum
const ContentStatusEnum = z.enum(['draft', 'active', 'completed', 'archived']);

// Content Priority Enum
const ContentPriorityEnum = z.enum(['low', 'medium', 'high']);

// Core Content Validation Schema for CREATE
const CreateContentSchema = z.object({
    title: z.string()
        .min(3, 'Title must be at least 3 characters')
        .max(200, 'Title must not exceed 200 characters')
        .transform(val => val.trim()),

    description: z.string()
        .max(5000, 'Description must not exceed 5000 characters')
        .transform(val => val.trim())
        .optional()
        .default(''),

    contentType: ContentTypeEnum,

    status: ContentStatusEnum.default('active'),

    priority: ContentPriorityEnum.default('medium'),

    tags: z.array(
        z.string()
            .min(1, 'Tag cannot be empty')
            .max(50, 'Tag must not exceed 50 characters')
            .transform(val => val.trim())
    ).max(10, 'Maximum 10 tags allowed')
        .optional()
        .default([]),

    metadata: z.record(z.any()).optional().default({})
});

// Schema for UPDATE (PUT) - all fields required
const UpdateContentSchema = CreateContentSchema;

// Schema for PATCH - all fields optional
const PatchContentSchema = z.object({
    title: z.string()
        .min(3, 'Title must be at least 3 characters')
        .max(200, 'Title must not exceed 200 characters')
        .transform(val => val.trim())
        .optional(),

    description: z.string()
        .max(5000, 'Description must not exceed 5000 characters')
        .transform(val => val.trim())
        .optional(),

    contentType: ContentTypeEnum.optional(),

    status: ContentStatusEnum.optional(),

    priority: ContentPriorityEnum.optional(),

    tags: z.array(
        z.string()
            .min(1, 'Tag cannot be empty')
            .max(50, 'Tag must not exceed 50 characters')
            .transform(val => val.trim())
    ).max(10, 'Maximum 10 tags allowed')
        .optional(),

    metadata: z.record(z.any()).optional()
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
);

module.exports = {
    CreateContentSchema,
    UpdateContentSchema,
    PatchContentSchema
};
