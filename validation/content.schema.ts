import { z } from 'zod';

// Content Type Enum
export const ContentTypeEnum = z.enum(['message', 'post', 'story']);

// Content Status Enum
export const ContentStatusEnum = z.enum(['draft', 'active', 'completed', 'archived']);

// Content Priority Enum
export const ContentPriorityEnum = z.enum(['low', 'medium', 'high']);

// Core Content Validation Schema for CREATE
export const CreateContentSchema = z.object({
    title: z.string()
        .min(3, 'Title must be at least 3 characters')
        .max(200, 'Title must not exceed 200 characters')
        .trim(),

    description: z.string()
        .max(5000, 'Description must not exceed 5000 characters')
        .trim()
        .optional()
        .default(''),

    contentType: ContentTypeEnum,

    status: ContentStatusEnum.default('active'),

    priority: ContentPriorityEnum.default('medium'),

    tags: z.array(
        z.string()
            .min(1, 'Tag cannot be empty')
            .max(50, 'Tag must not exceed 50 characters')
            .trim()
    ).max(10, 'Maximum 10 tags allowed')
        .optional()
        .default([]),

    metadata: z.record(z.any()).optional().default({})
});

// Schema for UPDATE (PUT) - all fields required
export const UpdateContentSchema = CreateContentSchema;

// Schema for PATCH - all fields optional
export const PatchContentSchema = z.object({
    title: z.string()
        .min(3, 'Title must be at least 3 characters')
        .max(200, 'Title must not exceed 200 characters')
        .trim()
        .optional(),

    description: z.string()
        .max(5000, 'Description must not exceed 5000 characters')
        .trim()
        .optional(),

    contentType: ContentTypeEnum.optional(),

    status: ContentStatusEnum.optional(),

    priority: ContentPriorityEnum.optional(),

    tags: z.array(
        z.string()
            .min(1, 'Tag cannot be empty')
            .max(50, 'Tag must not exceed 50 characters')
            .trim()
    ).max(10, 'Maximum 10 tags allowed')
        .optional(),

    metadata: z.record(z.any()).optional()
});

// Type exports for TypeScript
export type CreateContentInput = z.infer<typeof CreateContentSchema>;
export type UpdateContentInput = z.infer<typeof UpdateContentSchema>;
export type PatchContentInput = z.infer<typeof PatchContentSchema>;
