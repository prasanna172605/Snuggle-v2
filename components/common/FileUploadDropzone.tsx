import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateFile } from '@/utils/security';
import { toast } from 'sonner';

interface FileUploadDropzoneProps {
    onFilesAccepted: (files: File[]) => void;
    maxFiles?: number;
    maxSize?: number;
    accept?: Record<string, string[]>;
    className?: string;
    multiple?: boolean;
}

/**
 * Drag-and-drop file upload zone with fallback
 */
export function FileUploadDropzone({
    onFilesAccepted,
    maxFiles = 10,
    maxSize = 10 * 1024 * 1024, // 10MB
    accept = {
        'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    className,
    multiple = true,
}: FileUploadDropzoneProps) {
    const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);

    const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
        // Validate files
        const validFiles: File[] = [];
        const errors: string[] = [];

        acceptedFiles.forEach(file => {
            const validation = validateFile(file);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                errors.push(`${file.name}: ${validation.error}`);
            }
        });

        // Handle rejected files
        rejectedFiles.forEach(({ file, errors: fileErrors }) => {
            const error = fileErrors[0];
            if (error.code === 'file-too-large') {
                errors.push(`${file.name}: File too large (max ${maxSize / 1024 / 1024}MB)`);
            } else if (error.code === 'file-invalid-type') {
                errors.push(`${file.name}: Invalid file type`);
            } else {
                errors.push(`${file.name}: ${error.message}`);
            }
        });

        if (errors.length > 0) {
            setRejectedFiles(errors);
            toast.error(`${errors.length} file(s) rejected`, {
                description: errors[0],
            });
        }

        if (validFiles.length > 0) {
            onFilesAccepted(validFiles);
            setRejectedFiles([]);
        }
    }, [maxSize, onFilesAccepted]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        maxFiles,
        maxSize,
        accept,
        multiple,
    });

    return (
        <div className={className}>
            <div
                {...getRootProps()}
                className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                    'hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/20',
                    isDragActive && 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20',
                    isDragReject && 'border-red-500 bg-red-50 dark:bg-red-950/20',
                    !isDragActive && !isDragReject && 'border-gray-300 dark:border-gray-700'
                )}
            >
                <input {...getInputProps()} />

                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />

                {isDragActive ? (
                    <p className="text-cyan-600 dark:text-cyan-400 font-medium">
                        Drop files here...
                    </p>
                ) : (
                    <>
                        <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                            Drag & drop files here
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            or click to browse
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                            Max {maxFiles} files, {maxSize / 1024 / 1024}MB each
                        </p>
                    </>
                )}
            </div>

            {rejectedFiles.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                            <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                    {rejectedFiles.length} file(s) rejected
                                </p>
                                <ul className="mt-2 text-xs text-red-700 dark:text-red-300 space-y-1">
                                    {rejectedFiles.slice(0, 3).map((error, i) => (
                                        <li key={i}>{error}</li>
                                    ))}
                                    {rejectedFiles.length > 3 && (
                                        <li>...and {rejectedFiles.length - 3} more</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                        <button
                            onClick={() => setRejectedFiles([])}
                            className="text-red-600 hover:text-red-800"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

interface FilePreviewProps {
    file: File;
    onRemove: () => void;
}

/**
 * File preview with remove button
 */
export function FilePreview({ file, onRemove }: FilePreviewProps) {
    const [preview, setPreview] = useState<string | null>(null);

    React.useEffect(() => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }, [file]);

    return (
        <div className="relative group">
            {preview ? (
                <img
                    src={preview}
                    alt={file.name}
                    className="w-full h-32 object-cover rounded-lg"
                />
            ) : (
                <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <FileIcon className="w-8 h-8 text-gray-400" />
                </div>
            )}

            <button
                onClick={onRemove}
                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X className="w-4 h-4" />
            </button>

            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 truncate">
                {file.name}
            </p>
            <p className="text-xs text-gray-400">
                {(file.size / 1024).toFixed(1)} KB
            </p>
        </div>
    );
}

export default FileUploadDropzone;
