import React from 'react';
import { User, Post } from '../types';
import { X } from 'lucide-react';
import PostDetailContent from './PostDetailContent';

interface PostDetailModalProps {
    post: Post;
    user: User;
    currentUser: User;
    isOwner: boolean;
    onClose: () => void;
    onPostUpdated?: () => void;
    onPostDeleted?: () => void;
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({
    post,
    user,
    currentUser,
    isOwner,
    onClose,
    onPostUpdated,
    onPostDeleted
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
            >
                <X className="w-8 h-8" />
            </button>

            {/* Main Modal Container */}
            <div
                className="w-full max-w-5xl h-[90vh] max-h-[600px] flex items-center justify-center p-4"
                onClick={e => e.stopPropagation()}
            >
                <PostDetailContent
                    post={post}
                    user={user}
                    currentUser={currentUser}
                    isOwner={isOwner}
                    onClose={onClose}
                    onPostUpdated={onPostUpdated}
                    onPostDeleted={onPostDeleted}
                />
            </div>
        </div>
    );
};

export default PostDetailModal;
