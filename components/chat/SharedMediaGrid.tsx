
import React, { useState, useEffect } from 'react';
import { Message } from '../../types';
import { DBService } from '../../services/database';
import { Loader2, Play, AlertCircle } from 'lucide-react';
import { formatDuration } from '../../utils/dateUtils';
import MediaViewer from '../MediaViewer';

interface SharedMediaGridProps {
  chatId: string;
}

const SharedMediaGrid: React.FC<SharedMediaGridProps> = ({ chatId }) => {
  const [media, setMedia] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ isOpen: boolean; index: number } | null>(null);

  useEffect(() => {
    loadMedia();
  }, [chatId]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const sharedMedia = await DBService.getSharedMedia(chatId, 50); // Get last 50
      setMedia(sharedMedia);
    } catch (e) {
      console.error('Failed to load shared media:', e);
      setError('Could not load media');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm">
        <AlertCircle className="w-6 h-6 mb-2 opacity-50" />
        <p>{error}</p>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        No shared media yet
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1">
        {media.map((msg, index) => (
          <div 
            key={msg.id} 
            className="relative aspect-square bg-gray-900 cursor-pointer overflow-hidden group"
            onClick={() => setViewer({ isOpen: true, index })}
          >
            <img 
              src={msg.type === 'video' ? (msg.thumbnailUrl || msg.fileUrl) : msg.fileUrl} 
              alt="Shared media" 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
            
            {/* Video Indicator */}
            {msg.type === 'video' && (
              <div className="absolute top-1 right-1 bg-black/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Play className="w-3 h-3 text-white fill-white" />
                <span className="text-[10px] text-white font-medium">
                  {formatDuration(msg.mediaDuration || 0)}
                </span>
              </div>
            )}
            
            {/* Overlay on Hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </div>
        ))}
      </div>

      {/* Media Viewer Lightbox */}
      {viewer && viewer.isOpen && (
        <MediaViewer
          isOpen={viewer.isOpen}
          mediaUrl={media[viewer.index]?.fileUrl || ''}
          mediaType={media[viewer.index]?.type as 'image' | 'video'}
          onClose={() => setViewer(null)}
          senderName="Shared Media"
          timestamp={media[viewer.index]?.timestamp}
        />
      )}
    </>
  );
};

export default SharedMediaGrid;
