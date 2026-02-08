import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Post, User } from '../types';
import { DBService } from '../services/database';
import PostDetailContent from '../components/PostDetailContent';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface PostDetailProps {
    currentUser: User;
}

const PostDetail: React.FC<PostDetailProps> = ({ currentUser }) => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<Post | null>(null);
    const [author, setAuthor] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPostData = async () => {
            if (!postId) return;
            setLoading(true);
            try {
                const fetchedPost = await DBService.getPost(postId);
                if (fetchedPost) {
                    setPost(fetchedPost);
                    const fetchedAuthor = await DBService.getUserById(fetchedPost.userId);
                    setAuthor(fetchedAuthor);
                } else {
                    toast.error('Post not found');
                    navigate('/');
                }
            } catch (error) {
                console.error('Error loading post:', error);
                toast.error('Failed to load post');
            } finally {
                setLoading(false);
            }
        };

        loadPostData();
    }, [postId, navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!post || !author) {
        return null; // Should have redirected
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-black p-4 md:p-8 flex flex-col items-center justify-center">
            {/* Back Button */}
            <div className="w-full max-w-5xl mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium bg-white dark:bg-dark-card px-4 py-2 rounded-full shadow-sm"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>
            </div>

            {/* Post Content */}
            <div className="w-full max-w-5xl h-[85vh] max-h-[800px] shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/50 dark:border-white/10">
                <PostDetailContent
                    post={post}
                    user={author}
                    currentUser={currentUser}
                    isOwner={currentUser.id === post.userId}
                    onPostUpdated={() => {
                        // Refresh post data
                        DBService.getPost(post.id).then(updated => {
                            if (updated) setPost(updated);
                        });
                    }}
                    onPostDeleted={() => {
                        navigate(-1);
                    }}
                />
            </div>
        </div>
    );
};

export default PostDetail;
