import { z } from 'zod';

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

// Query params schema for listing media
export const MediaQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    category: z.enum(['image', 'video', 'document', 'all']).default('all'),
    sort: z.enum(['createdAt', 'size', 'originalName']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
});

// Media metadata update schema
export const UpdateMediaSchema = z.object({
    title: z.string()
        .min(1, 'Title cannot be empty')
        .max(200, 'Title must not exceed 200 characters')
        .transform(val => val.trim())
        .optional(),
    description: z.string()
        .max(1000, 'Description must not exceed 1000 characters')
        .transform(val => val.trim())
        .optional(),
    tags: z.array(
        z.string()
            .min(1, 'Tag cannot be empty')
            .max(50, 'Tag must not exceed 50 characters')
            .transform(val => val.trim())
    ).max(10, 'Maximum 10 tags allowed')
        .optional(),
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
);

export { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES };
