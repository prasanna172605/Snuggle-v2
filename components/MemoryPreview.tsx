
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DBService } from '../services/database';
import { Memory } from '../types';
import { Play } from 'lucide-react';

interface MemoryPreviewProps {
    memoryId: string;
}

const MemoryPreview: React.FC<MemoryPreviewProps> = ({ memoryId }) => {
    const [memory, setMemory] = useState<Memory | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMemory = async () => {
            try {
                const data = await DBService.getMemory(memoryId);
                setMemory(data);
            } catch (error) {
                console.error("Failed to load memory preview", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMemory();
    }, [memoryId]);

    if (loading) return <div className="w-48 h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse my-1" />;
    if (!memory) return null;

    return (
        <div
            className="bg-white dark:bg-dark-card rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border cursor-pointer hover:opacity-95 transition-opacity max-w-[260px] my-1"
            onClick={() => navigate(`/memory/${memory.id}`)}
        >
            <div className="w-full h-32 overflow-hidden bg-gray-100 dark:bg-dark-bg relative">
                {memory.type === 'video' || memory.type === 'reel' ? (
                     <>
                        <video src={memory.mediaUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="w-8 h-8 text-white fill-white/80" />
                        </div>
                     </>
                ) : (
                    <img src={memory.mediaUrl} className="w-full h-full object-cover" alt="Memory preview" />
                )}
            </div>
            <div className="p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Shared Memory</p>
                <div className="flex items-center gap-2 mb-1">
                    <img src={memory.user?.avatar} className="w-4 h-4 rounded-full" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{memory.user?.username}</span>
                </div>
                {memory.caption && (
                    <p className="text-sm font-medium text-black dark:text-white line-clamp-2 leading-snug">
                        {memory.caption}
                    </p>
                )}
            </div>
        </div>
    );
};

export default MemoryPreview;
