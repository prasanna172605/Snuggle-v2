import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { DBService } from '../services/database';
import { uploadFile } from '../services/fileUpload';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const CreateMemory: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [caption, setCaption] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | 'reel'>('image');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);

            // Detect Type
            if (selectedFile.type.startsWith('image/')) {
                setMediaType('image');
            } else if (selectedFile.type.startsWith('video/')) {
                // Check aspect ratio for Reel detection
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.onloadedmetadata = () => {
                    window.URL.revokeObjectURL(video.src);
                    const ratio = video.videoHeight / video.videoWidth;
                    // If height is significantly larger than width (vertical), treat as Reel
                    // Standard vertical is 16:9 (1.77)
                    if (ratio > 1.2) { 
                        setMediaType('reel');
                        toast.info('Detected vertical video - this will be a Reel!');
                    } else {
                        setMediaType('video');
                    }
                };
                video.src = URL.createObjectURL(selectedFile);
            }
        }
    };

    const handleSubmit = async () => {
        if (!file || !currentUser) return;

        try {
            setIsUploading(true);

            // 1. Upload File to Cloudinary
            const uploadResult = await uploadFile(file, currentUser.id, undefined, file.name);

            // 2. Create Memory
            await DBService.createMemory({
                userId: currentUser.id,
                type: mediaType,
                caption: caption,
                mediaUrl: uploadResult.url,
                thumbnailUrl: uploadResult.thumbnailUrl || uploadResult.url,
                aspectRatio: 1,
                duration: 0,
            });

            toast.success('Memory shared!');
            navigate('/');
        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error(error.message || 'Failed to share memory');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full">
                    <X className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">New Memory</h1>
                <button 
                    onClick={handleSubmit}
                    disabled={!file || isUploading}
                    className="text-cyan-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Share'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
                {/* Caption Input */}
                <div className="flex gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                         <img 
                            src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName}`} 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="What's on your mind?..."
                        className="flex-1 bg-transparent border-none resize-none focus:ring-0 text-lg placeholder-gray-500 min-h-[100px]"
                    />
                </div>

                {/* Media Preview / Selection */}
                {previewUrl ? (
                    <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-white/10">
                        {mediaType === 'image' ? (
                            <img src={previewUrl} className="w-full h-auto max-h-[60vh] object-contain" />
                        ) : (
                            <video src={previewUrl} controls className="w-full h-auto max-h-[60vh]" />
                        )}
                        <button 
                            onClick={() => {
                                setFile(null);
                                setPreviewUrl(null);
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                        >
                            <X size={20} />
                        </button>
                        <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/60 rounded-full text-xs font-medium uppercase tracking-wider">
                            {mediaType}
                        </div>
                    </div>
                ) : (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-square md:aspect-video rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-500 hover:bg-white/5 hover:border-gray-500 transition-colors cursor-pointer gap-4"
                    >
                        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="font-medium">Add Photo or Video</p>
                    </div>
                )}
                
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                />
            </div>
        </div>
    );
};

export default CreateMemory;
