import React from 'react';
import { X, Image, Film, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UploadModalProps {
    onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose }) => {
    const navigate = useNavigate();

    const handleOption = (path: string) => {
        navigate(path);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white dark:bg-dark-surface rounded-3xl p-6 shadow-2xl transform transition-all scale-100 opacity-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create</h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-dark-bg rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => handleOption('/create')}
                        className="w-full flex items-center gap-4 p-4 bg-warm-neutral dark:bg-dark-bg rounded-2xl hover:bg-snuggle-50 dark:hover:bg-snuggle-900/20 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <Image className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900 dark:text-white">Post</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Share photos and videos</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleOption('/create?type=story')}
                        className="w-full flex items-center gap-4 p-4 bg-warm-neutral dark:bg-dark-bg rounded-2xl hover:bg-snuggle-50 dark:hover:bg-snuggle-900/20 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform">
                            <Camera className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900 dark:text-white">Story</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Share a temporary moment</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleOption('/create?type=reel')}
                        className="w-full flex items-center gap-4 p-4 bg-warm-neutral dark:bg-dark-bg rounded-2xl hover:bg-snuggle-50 dark:hover:bg-snuggle-900/20 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                            <Film className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900 dark:text-white">Reel</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Create a short video</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;
