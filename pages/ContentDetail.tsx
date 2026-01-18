
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Calendar, Tag, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { DBService } from '../services/database';
import { CoreContent } from '../types';

const ContentDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [content, setContent] = useState<CoreContent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const data = await DBService.getContentById(id);
                setContent(data);
            } catch (err: any) {
                setError(err.message || 'Failed to load content');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    const handleDelete = async () => {
        if (!id || !content) return;
        setIsDeleting(true);
        try {
            await DBService.deleteContent(id);
            // Navigate with state for Undo
            navigate('/content', {
                state: {
                    deletedId: id,
                    message: `Deleted "${content.title}"`
                }
            });
        } catch (err: any) {
            alert(err.message || 'Failed to delete');
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
    );

    if (error || !content) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-black p-6">
            <p className="text-red-500 font-bold mb-4">{error || 'Content not found'}</p>
            <button onClick={() => navigate('/content')} className="text-blue-500 underline">Back to List</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors mr-3">
                    <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </button>
                <div className="flex gap-3 items-center">
                    <button
                        onClick={() => navigate(`/content/${id}/edit`)}
                        className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Edit Content"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border
                        ${content.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                            content.status === 'draft' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {content.status}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-gray-200 bg-gray-50 text-gray-600">
                        {content.contentType}
                    </span>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-6 space-y-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4 leading-tight">{content.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(content.createdAt).toLocaleDateString()}</span>
                        </div>
                        {content.priority && (
                            <span className={`font-bold capitalize
                                ${content.priority === 'high' ? 'text-red-500' :
                                    content.priority === 'low' ? 'text-blue-500' : 'text-orange-500'}`}>
                                {content.priority} Priority
                            </span>
                        )}
                    </div>
                </div>

                <div className="prose dark:prose-invert max-w-none">
                    <p className="text-lg text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {content.description}
                    </p>
                </div>

                {content.tags && content.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-100 dark:border-gray-800">
                        {content.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 text-sm bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full">
                                <Tag className="w-3 h-3" /> {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-xl scale-100">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">Delete Content?</h3>
                        <p className="text-gray-500 text-center text-sm mb-6">
                            Are you sure you want to delete <strong>"{content?.title}"</strong>?
                            This action can be undone briefly.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentDetail;
