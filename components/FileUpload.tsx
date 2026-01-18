import React, { useState, useRef, DragEvent } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadFile, validateFile, isImageFile, createImagePreview, UploadResult } from '../services/fileUpload';
import { auth } from '../config/firebase';

interface FileUploadProps {
    onUploadComplete: (results: UploadResult[]) => void;
    maxFiles?: number;
    accept?: string;
    className?: string;
}

interface FileItem {
    file: File;
    preview?: string;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
    result?: UploadResult;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    onUploadComplete,
    maxFiles = 5,
    accept = 'image/*,.pdf',
    className = ''
}) => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle file selection
    const handleFiles = async (selectedFiles: FileList | null) => {
        if (!selectedFiles) return;

        const newFiles: FileItem[] = [];

        for (let i = 0; i < selectedFiles.length && files.length + newFiles.length < maxFiles; i++) {
            const file = selectedFiles[i];

            // Validate file
            const validation = validateFile(file);

            const fileItem: FileItem = {
                file,
                progress: 0,
                status: validation.valid ? 'pending' : 'error',
                error: validation.error
            };

            // Create preview for images
            if (validation.valid && isImageFile(file)) {
                try {
                    fileItem.preview = await createImagePreview(file);
                } catch (err) {
                    console.error('Preview error:', err);
                }
            }

            newFiles.push(fileItem);
        }

        setFiles(prev => [...prev, ...newFiles]);
    };

    // Handle drag events
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    // Remove file
    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Upload all files
    const uploadAllFiles = async () => {
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in to upload files');
            return;
        }

        const uploadResults: UploadResult[] = [];

        for (let i = 0; i < files.length; i++) {
            const fileItem = files[i];

            if (fileItem.status !== 'pending') continue;

            // Update status to uploading
            setFiles(prev => {
                const updated = [...prev];
                updated[i] = { ...updated[i], status: 'uploading', progress: 0 };
                return updated;
            });

            try {
                const result = await uploadFile(
                    fileItem.file,
                    user.uid,
                    (progress) => {
                        // Update progress
                        setFiles(prev => {
                            const updated = [...prev];
                            updated[i] = { ...updated[i], progress };
                            return updated;
                        });
                    }
                );

                // Update to success
                setFiles(prev => {
                    const updated = [...prev];
                    updated[i] = { ...updated[i], status: 'success', result, progress: 100 };
                    return updated;
                });

                uploadResults.push(result);
            } catch (error: any) {
                // Update to error
                setFiles(prev => {
                    const updated = [...prev];
                    updated[i] = { ...updated[i], status: 'error', error: error.message };
                    return updated;
                });
            }
        }

        if (uploadResults.length > 0) {
            onUploadComplete(uploadResults);
        }
    };

    const pendingCount = files.filter(f => f.status === 'pending').length;

    return (
        <div className={className}>
            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                    border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                    ${isDragging
                        ? 'border-snuggle-500 bg-snuggle-50 dark:bg-snuggle-950'
                        : 'border-gray-300 dark:border-gray-700 hover:border-snuggle-400 dark:hover:border-snuggle-600'}
                `}
            >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Drag and drop files here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                    or click to browse
                </p>
                <p className="text-xs text-gray-400">
                    Supported: JPG, PNG, GIF, WEBP, PDF · Max {maxFiles} files · 10MB each
                </p>
            </div>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={accept}
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
            />

            {/* File List */}
            {files.length > 0 && (
                <div className="mt-6 space-y-3">
                    {files.map((fileItem, index) => (
                        <div
                            key={index}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-start gap-4"
                        >
                            {/* Preview/Icon */}
                            <div className="flex-shrink-0 w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                                {fileItem.preview ? (
                                    <img src={fileItem.preview} alt={fileItem.file.name} className="w-full h-full object-cover" />
                                ) : (
                                    <FileText className="w-8 h-8 text-gray-400" />
                                )}
                            </div>

                            {/* File Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                    {fileItem.file.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>

                                {/* Progress Bar */}
                                {fileItem.status === 'uploading' && (
                                    <div className="mt-2">
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-snuggle-500 h-2 transition-all duration-300"
                                                style={{ width: `${fileItem.progress}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{Math.round(fileItem.progress)}%</p>
                                    </div>
                                )}

                                {/* Error Message */}
                                {fileItem.status === 'error' && (
                                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {fileItem.error}
                                    </p>
                                )}
                            </div>

                            {/* Status Icon */}
                            <div className="flex-shrink-0">
                                {fileItem.status === 'pending' && (
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                )}
                                {fileItem.status === 'uploading' && (
                                    <Loader2 className="w-6 h-6 text-snuggle-500 animate-spin" />
                                )}
                                {fileItem.status === 'success' && (
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                )}
                                {fileItem.status === 'error' && (
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-red-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Button */}
            {pendingCount > 0 && (
                <button
                    onClick={uploadAllFiles}
                    className="mt-4 w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl hover:scale-[1.02] transition-transform"
                >
                    Upload {pendingCount} {pendingCount === 1 ? 'File' : 'Files'}
                </button>
            )}
        </div>
    );
};

export default FileUpload;
