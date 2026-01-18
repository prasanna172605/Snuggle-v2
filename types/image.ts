// Image Processing Types

export interface ImageVariants {
    thumbnail: string;  // 200x200 square
    medium: string;     // 800x800 max, aspect preserved
    large: string;      // 1200x1200 max, aspect preserved
}

export interface ImageMetadata {
    id: string;
    userId: string;
    originalName: string;
    variants: ImageVariants;
    status: 'processing' | 'complete' | 'error';
    createdAt: number;
    processedAt?: number;
    error?: string;
}

export enum ImageVariant {
    THUMBNAIL = 'thumbnail',
    MEDIUM = 'medium',
    LARGE = 'large'
}
