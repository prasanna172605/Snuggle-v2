import { getStorage, ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// File size limit (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// File type categories
export enum FileCategory {
    IMAGE = 'images',
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
}

// Upload progress callback
export type ProgressCallback = (progress: number) => void;

/**
 * Validate file type and size
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Allowed: JPG, PNG, GIF, WEBP, PDF'
        };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        };
    }

    return { valid: true };
};

/**
 * Determine file category based on MIME type
 */
const getFileCategory = (mimeType: string): FileCategory => {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        return FileCategory.IMAGE;
    }
    return FileCategory.DOCUMENT;
};

/**
 * Generate storage path for file
 */
const getStoragePath = (userId: string, category: FileCategory, filename: string): string => {
    return `uploads/${userId}/${category}/${filename}`;
};

/**
 * Upload file to Firebase Storage
 */
export const uploadFile = async (
    file: File,
    userId: string,
    onProgress?: ProgressCallback
): Promise<UploadResult> => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Generate unique filename
    const extension = file.name.split('.').pop();
    const filename = `${uuidv4()}.${extension}`;
    const category = getFileCategory(file.type);

    // Get Firebase Storage reference
    const storage = getStorage();
    const storagePath = getStoragePath(userId, category, filename);
    const storageRef = ref(storage, storagePath);

    // Upload file with progress tracking
    return new Promise((resolve, reject) => {
        const uploadTask: UploadTask = uploadBytesResumable(storageRef, file, {
            contentType: file.type
        });

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                // Calculate and report progress
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) {
                    onProgress(progress);
                }
            },
            (error) => {
                // Handle upload error
                reject(new Error(`Upload failed: ${error.message}`));
            },
            async () => {
                // Upload complete - get download URL
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({
                        url: downloadURL,
                        filename,
                        originalName: file.name,
                        size: file.size,
                        mimeType: file.type,
                        category
                    });
                } catch (error: any) {
                    reject(new Error(`Failed to get download URL: ${error.message}`));
                }
            }
        );
    });
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
            if (onProgress) {
                onProgress(index, progress);
            }
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
