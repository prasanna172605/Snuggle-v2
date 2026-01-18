
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, X, Plus } from 'lucide-react';
import { DBService } from '../services/database';
import { ContentType, ContentStatus, ContentPriority } from '../types';

const CreateContent: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        contentType: ContentType.POST,
        status: ContentStatus.ACTIVE,
        priority: ContentPriority.MEDIUM,
        tags: [] as string[]
    });

    const [tagInput, setTagInput] = useState('');

    const validate = () => {
        if (!formData.title.trim() || formData.title.length < 3 || formData.title.length > 200) {
            return 'Title must be between 3 and 200 character';
        }
        if (formData.description.length > 5000) {
            return 'Description cannot exceed 5000 characters';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        try {
            await DBService.createContent({
                ...formData,
                title: formData.title.trim(),
                description: formData.description.trim()
            });
            // Success! Redirect to home or content list
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Failed to create content');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
        if ((e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') || !tagInput.trim()) return;
        e.preventDefault();

        if (!formData.tags.includes(tagInput.trim())) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
        }
        setTagInput('');
    };

    const removeTag = (tag: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors mr-3">
                    <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create New Content</h1>
            </div>

            <div className="max-w-2xl mx-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full p-4 rounded-xl bg-white dark:bg-dark-card border-2 border-transparent focus:border-snuggle-500 outline-none text-gray-900 dark:text-white shadow-sm transition-all"
                            placeholder="Enter a catchy title..."
                        />
                        <div className="text-right text-xs text-gray-400 mt-1">{formData.title.length}/200</div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full p-4 rounded-xl bg-white dark:bg-dark-card border-2 border-transparent focus:border-snuggle-500 outline-none text-gray-900 dark:text-white shadow-sm h-40 resize-none transition-all"
                            placeholder="What's on your mind?"
                        />
                        <div className="text-right text-xs text-gray-400 mt-1">{formData.description.length}/5000</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Type */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type</label>
                            <select
                                value={formData.contentType}
                                onChange={e => setFormData(prev => ({ ...prev, contentType: e.target.value as any }))}
                                className="w-full p-3 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-snuggle-500"
                            >
                                {Object.values(ContentType).map(t => (
                                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                className="w-full p-3 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-snuggle-500"
                            >
                                {Object.values(ContentStatus).map(s => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                                className="w-full p-3 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-snuggle-500"
                            >
                                {Object.values(ContentPriority).map(p => (
                                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</label>
                        <div className="bg-white dark:bg-dark-card p-2 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-wrap gap-2">
                            {formData.tags.map(tag => (
                                <span key={tag} className="bg-snuggle-100 text-snuggle-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                                    #{tag}
                                    <button onClick={() => removeTag(tag)} type="button" className="hover:text-snuggle-900"><X className="w-3 h-3" /></button>
                                </span>
                            ))}
                            <input
                                type="text"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                className="flex-1 min-w-[120px] bg-transparent outline-none p-1 text-gray-900 dark:text-white"
                                placeholder="Add tag (Press Enter)..."
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">
                            <X className="w-5 h-5" /> {error}
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <Save className="w-5 h-5" />}
                            Create Content
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default CreateContent;
