import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { User } from '../types';
import { DBService } from '../services/database';

interface LikedBySheetProps {
    postId: string;
    isOpen: boolean;
    onClose: () => void;
}

const LikedBySheet: React.FC<LikedBySheetProps> = ({ postId, isOpen, onClose }) => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && postId) {
            loadLikedByUsers();
        }
    }, [isOpen, postId]);

    const loadLikedByUsers = async () => {
        setLoading(true);
        try {
            const likedUsers = await DBService.getLikedByUsers(postId, 50);
            setUsers(likedUsers);
        } catch (error) {
            console.error('Error loading liked by users:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
            <div
                className="bg-white dark:bg-dark-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[70vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
                    <div className="w-8" />
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">Likes</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-accent" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No likes yet
                        </div>
                    ) : (
                        users.map(user => (
                            <button
                                key={user.id}
                                onClick={() => {
                                    onClose();
                                    navigate(`/profile/${user.id}`);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors text-left"
                            >
                                <img
                                    src={user.avatar || '/default-avatar.png'}
                                    alt=""
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                        {user.username}
                                    </p>
                                    {user.fullName && (
                                        <p className="text-xs text-gray-400 truncate">
                                            {user.fullName}
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default LikedBySheet;
