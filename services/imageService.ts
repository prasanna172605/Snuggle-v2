import { getFirestore, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { ImageMetadata } from '../types/image';

const db = getFirestore();

/**
 * Get image metadata by ID
 */
export const getImageMetadata = async (imageId: string): Promise<ImageMetadata | null> => {
    try {
        const docRef = doc(db, 'images', imageId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as ImageMetadata;
        }
        return null;
    } catch (error) {
        console.error('Error fetching image metadata:', error);
        return null;
    }
};

/**
 * Subscribe to image processing status updates
 */
export const subscribeToImageStatus = (
    imageId: string,
    callback: (metadata: ImageMetadata | null) => void
): (() => void) => {
    const docRef = doc(db, 'images', imageId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as ImageMetadata);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error('Error listening to image status:', error);
        callback(null);
    });

    return unsubscribe;
};

/**
 * Wait for image processing to complete
 * Polls every 500ms for up to 30 seconds
 */
export const waitForProcessing = async (
    imageId: string,
    timeout: number = 30000
): Promise<ImageMetadata | null> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const metadata = await getImageMetadata(imageId);

        if (metadata && metadata.status !== 'processing') {
            return metadata;
        }

        // Wait 500ms before next check
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('Image processing timeout');
};
