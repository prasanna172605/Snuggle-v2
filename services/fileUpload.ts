import { v4 as uuidv4 } from 'uuid';

// ─── Allowed file types ─────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// ─── Per-type size limits ───────────────────────────────────
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;   // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;  // 50MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024;   // 10MB
const MAX_DOC_SIZE = 20 * 1024 * 1024;    // 20MB

// File type categories
export enum FileCategory {
    IMAGE = 'images',
    VIDEO = 'videos',
    AUDIO = 'audio',
    DOCUMENT = 'documents'
}

// Upload result interface
export interface UploadResult {
    url: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    category: FileCategory;
    thumbnailUrl?: string;
}

// Upload progress callback
export type ProgressCallback = (progress: number) => void;

/**
 * Get max file size for a given MIME type
 */
const getMaxSize = (mimeType: string): number => {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return MAX_IMAGE_SIZE;
    if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return MAX_VIDEO_SIZE;
    if (ALLOWED_AUDIO_TYPES.includes(mimeType)) return MAX_AUDIO_SIZE;
    return MAX_DOC_SIZE;
};

/**
 * Validate file type and size
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
        console.warn(`[FileUpload] Invalid file type: ${file.type} for ${file.name}`);
        return {
            valid: false,
            error: 'Invalid file type. Allowed: Images, Videos, Audio, PDF'
        };
    }

    const maxSize = getMaxSize(file.type);
    if (file.size > maxSize) {
        console.warn(`[FileUpload] File too large: ${file.name} (${file.size} > ${maxSize})`);
        return {
            valid: false,
            error: `File too large. Max: ${Math.round(maxSize / 1024 / 1024)}MB for this type`
        };
    }

    return { valid: true };
};

/**
 * Determine file category based on MIME type
 */
export const getFileCategory = (mimeType: string): FileCategory => {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return FileCategory.IMAGE;
    if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return FileCategory.VIDEO;
    if (ALLOWED_AUDIO_TYPES.includes(mimeType)) return FileCategory.AUDIO;
    return FileCategory.DOCUMENT;
};

/**
 * Generate storage path for file
 */
const getStoragePath = (userId: string, category: FileCategory, filename: string): string => {
    return `uploads/${userId}/${category}/${filename}`;
};

/**
 * Compress image client-side before upload (max 1200px, 0.8 quality)
 */
export const compressImage = (file: File, maxDimension: number = 1200, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.type === 'image/gif') {
            // Don't compress GIFs or non-images
            resolve(file);
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;

            // Only resize if larger than maxDimension
            if (width <= maxDimension && height <= maxDimension) {
                resolve(file);
                return;
            }

            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
                'image/jpeg',
                quality
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for compression'));
        };
        img.src = url;
    });
};

/**
 * Generate video thumbnail (first frame) using canvas
 */
export const generateVideoThumbnail = (file: File | Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        const url = URL.createObjectURL(file);
        video.src = url;

        video.onloadeddata = () => {
            // Seek to 1 second or 10% of duration
            video.currentTime = Math.min(1, video.duration * 0.1);
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(video.videoWidth, 480);
            canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                blob => {
                    URL.revokeObjectURL(url);
                    blob ? resolve(blob) : reject(new Error('Thumbnail generation failed'));
                },
                'image/jpeg',
                0.7
            );
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load video for thumbnail'));
        };
    });
};

/**
 * Get media duration (for audio/video)
 */
export const getMediaDuration = (file: File | Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
        const element = document.createElement(
            file.type.startsWith('video/') ? 'video' : 'audio'
        ) as HTMLVideoElement | HTMLAudioElement;
        element.preload = 'metadata';
        const url = URL.createObjectURL(file);
        element.src = url;
        element.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(Math.round(element.duration));
        };
        element.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(0); // Fallback to 0 rather than failing
        };
    });
};

/**
 * Upload file to Cloudinary using Unsigned Presets
 */
export const uploadFile = async (
    file: File | Blob,
    userId: string,
    onProgress?: ProgressCallback,
    originalName?: string
): Promise<UploadResult> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary configuration missing. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env.local');
    }

    const mimeType = file.type || 'application/octet-stream';
    const category = getFileCategory(mimeType);
    
    // Prepare form data for Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `snuggle/${userId}/${category}`);
    formData.append('context', `user_id=${userId}|original_name=${originalName || 'unknown'}`);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Cloudinary upload failed');
        }

        const data = await response.json();

        return {
            url: data.secure_url,
            filename: data.public_id,
            originalName: originalName || (file instanceof File ? file.name : data.original_filename),
            size: data.bytes,
            mimeType: mimeType,
            category: category,
            thumbnailUrl: data.resource_type === 'video' ? data.secure_url.replace(/\.[^/.]+$/, ".jpg") : data.secure_url
        };
    } catch (error: any) {
        console.error('[Cloudinary] Upload failed:', error);
        throw new Error(`Upload failed: ${error.message}`);
    }
};

/**
 * Upload multiple files
 */
export const uploadFiles = async (
    files: File[],
    userId: string,
    onProgress?: (fileIndex: number, progress: number) => void
): Promise<UploadResult[]> => {
    const uploadPromises = files.map((file, index) =>
        uploadFile(file, userId, (progress) => {
            onProgress?.(index, progress);
        })
    );

    return Promise.all(uploadPromises);
};

/**
 * Check if file is an image
 */
export const isImageFile = (file: File): boolean => {
    return ALLOWED_IMAGE_TYPES.includes(file.type);
};

/**
 * Check if file is a video
 */
export const isVideoFile = (file: File): boolean => {
    return ALLOWED_VIDEO_TYPES.includes(file.type);
};

/**
 * Check if file is audio
 */
export const isAudioFile = (file: File): boolean => {
    return ALLOWED_AUDIO_TYPES.includes(file.type);
};

/**
 * Create image preview URL
 */
export const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!isImageFile(file)) {
            reject(new Error('File is not an image'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target?.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Get human-readable file size
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
