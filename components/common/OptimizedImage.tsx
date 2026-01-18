import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    thumbnail?: string;
    lazy?: boolean;
    className?: string;
    aspectRatio?: string;
    onLoad?: () => void;
}

/**
 * Optimized image component with lazy loading and blur-up effect
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    thumbnail,
    lazy = true,
    className,
    aspectRatio = '1/1',
    onLoad,
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(thumbnail || src);
    const imgRef = useRef<HTMLImageElement>(null);

    const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
    };

    React.useEffect(() => {
        if (!lazy || !imgRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setCurrentSrc(src);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px' }
        );

        observer.observe(imgRef.current);

        return () => observer.disconnect();
    }, [src, lazy]);

    return (
        <div
            className={cn('relative overflow-hidden bg-gray-100 dark:bg-gray-800', className)}
            style={{ aspectRatio }}
        >
            <img
                ref={imgRef}
                src={currentSrc}
                alt={alt}
                loading={lazy ? 'lazy' : 'eager'}
                className={cn(
                    'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
                    isLoaded ? 'opacity-100' : 'opacity-0',
                    thumbnail && currentSrc === thumbnail ? 'blur-sm scale-110' : ''
                )}
                onLoad={handleLoad}
                {...props}
            />
            {!isLoaded && (
                <div className="absolute inset-0 skeleton-pulse" />
            )}
        </div>
    );
};

/**
 * Avatar component with optimized loading
 */
export const OptimizedAvatar: React.FC<{
    src?: string;
    alt: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}> = ({ src, alt, size = 'md', className }) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
    };

    if (!src) {
        return (
            <div
                className={cn(
                    'rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-semibold',
                    sizeClasses[size],
                    className
                )}
            >
                {alt.charAt(0).toUpperCase()}
            </div>
        );
    }

    return (
        <OptimizedImage
            src={src}
            alt={alt}
            className={cn('rounded-full', sizeClasses[size], className)}
            aspectRatio="1"
            lazy={true}
        />
    );
};

export default OptimizedImage;
