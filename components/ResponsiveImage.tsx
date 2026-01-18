import React, { useState, useEffect } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import { ImageVariant, ImageMetadata } from '../types/image';
import { getImageMetadata } from '../services/imageService';

interface ResponsiveImageProps {
    imageId: string;
    variant?: ImageVariant;
    alt: string;
    className?: string;
    fallback?: string;
}

/**
 * Responsive image component that loads optimized variants
 * Shows loading state while image is being processed
 */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
    imageId,
    variant = ImageVariant.MEDIUM,
    alt,
    className = '',
    fallback
}) => {
    const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadImage = async () => {
            try {
                const data = await getImageMetadata(imageId);
                if (isMounted) {
                    setMetadata(data);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Error loading image:', err);
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        loadImage();

        return () => {
            isMounted = false;
        };
    }, [imageId]);

    // Still processing
    if (loading || (metadata && metadata.status === 'processing')) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
        );
    }

    // Error or failed processing
    if (error || !metadata || metadata.status === 'error') {
        return (
            <div className={`flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 ${className}`}>
                <ImageOff className="w-8 h-8 mb-2" />
                <span className="text-sm">Failed to load image</span>
            </div>
        );
    }

    // Get URL for requested variant
    const imageUrl = metadata.variants[variant];

    // Build srcset for responsive loading
    const srcSet = `
        ${metadata.variants.thumbnail} 200w,
        ${metadata.variants.medium} 800w,
        ${metadata.variants.large} 1200w
    `.trim();

    return (
        <img
            src={imageUrl || fallback}
            srcSet={srcSet}
            sizes="(max-width: 640px) 200px, (max-width: 1024px) 800px, 1200px"
            alt={alt}
            className={className}
            loading="lazy"
            onError={(e) => {
                if (fallback) {
                    (e.target as HTMLImageElement).src = fallback;
                } else {
                    setError(true);
                }
            }}
        />
    );
};

export default ResponsiveImage;
