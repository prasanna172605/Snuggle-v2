
import React, { useState, useRef } from 'react';
import { User, ViewState } from '../types';
import { DBService } from '../services/database';
import CameraCapture from '../components/CameraCapture';
import { ArrowLeft, Image as ImageIcon, Video, Film, Send, X, Loader2, Camera } from 'lucide-react';

interface CreateProps {
  currentUser: User;
  onNavigate: (view: ViewState) => void;
}

type ContentType = 'post' | 'reel' | 'story';

const Create: React.FC<CreateProps> = ({ currentUser, onNavigate }) => {
  const [contentType, setContentType] = useState<ContentType>('post');
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video')) {
          setMediaType('video');
          setContentType('reel'); 
      } else {
          setMediaType('image');
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (dataUrl: string, type: 'image' | 'video') => {
      setMediaFile(dataUrl);
      setMediaType(type);
      if (type === 'video') {
          setContentType('reel');
      }
      setShowCamera(false);
  };

  const handleSubmit = async () => {
      if (!mediaFile) return;
      setLoading(true);

      try {
          if (contentType === 'story') {
              await DBService.createStory({
                  userId: currentUser.id,
                  imageUrl: mediaFile
              });
          } else {
              await DBService.createPost({
                  userId: currentUser.id,
                  imageUrl: mediaFile,
                  mediaType: mediaType,
                  caption: caption
              });
          }
          onNavigate(ViewState.FEED);
      } catch (e) {
          console.error(e);
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
        {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-md sticky top-0 z-10">
            <button onClick={() => onNavigate(ViewState.FEED)} className="text-white">
                <X className="w-6 h-6" />
            </button>
            <h2 className="font-bold text-lg">New Post</h2>
            <button 
                onClick={handleSubmit} 
                disabled={!mediaFile || loading}
                className={`text-snuggle-400 font-bold ${(!mediaFile || loading) ? 'opacity-50' : 'hover:text-snuggle-300'}`}
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Share'}
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
            {mediaFile ? (
                <div className="flex-1 bg-gray-900 relative flex items-center justify-center overflow-hidden">
                    {mediaType === 'video' ? (
                        <video src={mediaFile} controls className="max-h-[60vh] w-full object-contain" />
                    ) : (
                        <img src={mediaFile} alt="Preview" className="max-h-[60vh] w-full object-contain" />
                    )}
                    <button 
                        onClick={() => setMediaFile(null)}
                        className="absolute top-4 right-4 bg-black/60 p-2 rounded-full hover:bg-black/80"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <div className="flex-1 flex flex-col gap-4 p-4 justify-center">
                    <div 
                        onClick={() => setShowCamera(true)}
                        className="flex-1 border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-snuggle-500 hover:text-snuggle-500 transition-colors bg-gray-900"
                    >
                        <Camera className="w-16 h-16 mb-2" />
                        <span className="font-bold text-lg">Camera</span>
                        <span className="text-xs mt-1">Take photo or video</span>
                    </div>

                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-snuggle-500 hover:text-snuggle-500 transition-colors bg-gray-900"
                    >
                        <ImageIcon className="w-12 h-12 mb-2" />
                        <span className="font-medium">Gallery</span>
                        <span className="text-xs mt-1">Upload from device</span>
                    </div>
                </div>
            )}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*"
                onChange={handleFileChange}
            />

            {mediaFile && contentType !== 'story' && (
                <div className="px-4 py-4 bg-gray-900 border-t border-gray-800">
                    <div className="flex gap-3">
                        <img src={currentUser.avatar} className="w-8 h-8 rounded-full" />
                        <textarea 
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Write a caption..." 
                            className="bg-transparent text-white w-full text-sm focus:outline-none resize-none h-16"
                        />
                    </div>
                </div>
            )}
        </div>

        {/* Type Selector */}
        <div className="bg-gray-900 border-t border-gray-800 px-4 py-4 safe-pb">
            <div className="flex justify-around bg-gray-800 rounded-full p-1">
                <button 
                    onClick={() => setContentType('post')}
                    className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${contentType === 'post' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                >
                    Post
                </button>
                <button 
                    onClick={() => setContentType('story')}
                    className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${contentType === 'story' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                >
                    Story
                </button>
                <button 
                    onClick={() => setContentType('reel')}
                    className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${contentType === 'reel' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                >
                    Reel
                </button>
            </div>
        </div>
    </div>
  );
};

export default Create;
