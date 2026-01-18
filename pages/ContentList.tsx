import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Loader2, Plus, ArrowLeft, ChevronLeft, ChevronRight, FileText, MessageSquare, Image as ImageIcon, RotateCcw, X, Search, Filter as FilterIcon, XCircle } from 'lucide-react';
import { DBService } from '../services/database';
import { CoreContent, ContentType, ContentStatus, ContentPriority } from '../types';

const ContentList: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Get params from URL or default
    const initialPage = parseInt(searchParams.get('page') || '1');
    const initialLimit = parseInt(searchParams.get('limit') || '20');
    const initialSearch = searchParams.get('q') || '';
    const initialStatus = searchParams.get('status') || '';
    const initialPriority = searchParams.get('priority') || '';

    const [content, setContent] = useState<CoreContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [undoToast, setUndoToast] = useState<{ id: string, message: string } | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [searchInput, setSearchInput] = useState(initialSearch);
    const [showFilters, setShowFilters] = useState(false);

    // Pagination state (synced with response)
    const [pagination, setPagination] = useState({
        page: initialPage,
        limit: initialLimit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
    });

    const fetchContent = async (page: number, limit: number, filters: any) => {
        setLoading(true);
        try {
            const { data, pagination: pag } = await DBService.getContentList(page, limit, filters);
            setContent(data);
            setPagination(pag);
        } catch (err: any) {
            setError(err.message || 'Failed to load content');
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== searchParams.get('q')) {
                const newParams = new URLSearchParams(searchParams);
                if (searchInput && searchInput.length >= 2) {
                    newParams.set('q', searchInput);
                    newParams.set('page', '1'); // Reset to page 1 on search
                } else {
                    newParams.delete('q');
                }
                setSearchParams(newParams);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchInput, searchParams, setSearchParams]);

    // Effect: Fetch on URL param change
    useEffect(() => {
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('q') || '';
        const status = searchParams.get('status') || '';
        const priority = searchParams.get('priority') || '';

        const filters: any = {};
        if (search) filters.search = search;
        if (status) filters.status = status;
        if (priority) filters.priority = priority;

        fetchContent(page, limit, filters);
    }, [searchParams]);

    // Effect: Handle Undo Toast (Location State)
    useEffect(() => {
        // Check for delete undo from navigation
        if (location.state?.deletedId && location.state?.message) {
            setUndoToast({
                id: location.state.deletedId,
                message: location.state.message
            });
            // Auto hide after 5s
            const timer = setTimeout(() => setUndoToast(null), 5000);

            // Clear history state to prevent reappearing on reload
            window.history.replaceState({}, document.title);

            return () => clearTimeout(timer);
        }
    }, [location]);

    const handleUndo = async () => {
        if (!undoToast) return;
        setRestoring(true);
        try {
            await DBService.restoreContent(undoToast.id);
            setUndoToast(null);
            // Refresh with current filters
            const search = searchParams.get('q') || '';
            const status = searchParams.get('status') || '';
            const priority = searchParams.get('priority') || '';
            const filters: any = {};
            if (search) filters.search = search;
            if (status) filters.status = status;
            if (priority) filters.priority = priority;
            fetchContent(pagination.page, pagination.limit, filters);
        } catch (err) {
            console.error(err);
            alert("Failed to restore");
        } finally {
            setRestoring(false);
        }
    };

    const clearFilters = () => {
        const newParams = new URLSearchParams();
        newParams.set('page', '1');
        newParams.set('limit', pagination.limit.toString());
        setSearchParams(newParams);
        setSearchInput('');
    };

    const handleFilterChange = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        newParams.set('page', '1'); // Reset to page 1 on filter change
        setSearchParams(newParams);
    };

    const hasActiveFilters = searchParams.get('q') || searchParams.get('status') || searchParams.get('priority');

    const getTypeIcon = (type: ContentType) => {
        switch (type) {
            case ContentType.POST: return <FileText className="w-5 h-5 text-blue-500" />;
            case ContentType.MESSAGE: return <MessageSquare className="w-5 h-5 text-green-500" />;
            case ContentType.STORY: return <ImageIcon className="w-5 h-5 text-purple-500" />;
            default: return <FileText className="w-5 h-5" />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Content</h1>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-black dark:bg-white text-white dark:text-black' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            title="Filters"
                        >
                            <FilterIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigate('/create')}
                            className="bg-black dark:bg-white text-white dark:text-black p-2 rounded-full hover:scale-105 transition-transform"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="px-6 pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search content... (min 2 chars)"
                            className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-snuggle-500 outline-none text-gray-900 dark:text-white transition-all"
                        />
                        {searchInput && (
                            <button
                                onClick={() => setSearchInput('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="px-6 pb-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                        <div className="flex flex-wrap gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-2">Status</label>
                                <select
                                    value={searchParams.get('status') || ''}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-snuggle-500"
                                >
                                    <option value="">All</option>
                                    {Object.values(ContentStatus).map(s => (
                                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-2">Priority</label>
                                <select
                                    value={searchParams.get('priority') || ''}
                                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-snuggle-500"
                                >
                                    <option value="">All</option>
                                    {Object.values(ContentPriority).map(p => (
                                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="self-end px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <XCircle className="w-4 h-4" /> Clear All
                                </button>
                            )}
                        </div>

                        {/* Active Filter Chips */}
                        {hasActiveFilters && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {searchParams.get('q') && (
                                    <span className="bg-snuggle-100 text-snuggle-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                        Search: {searchParams.get('q')}
                                        <button onClick={() => setSearchInput('')}><X className="w-3 h-3" /></button>
                                    </span>
                                )}
                                {searchParams.get('status') && (
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                        Status: {searchParams.get('status')}
                                        <button onClick={() => handleFilterChange('status', '')}><X className="w-3 h-3" /></button>
                                    </span>
                                )}
                                {searchParams.get('priority') && (
                                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                        Priority: {searchParams.get('priority')}
                                        <button onClick={() => handleFilterChange('priority', '')}><X className="w-3 h-3" /></button>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="max-w-4xl mx-auto p-6">
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : content.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="bg-gray-100 dark:bg-gray-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Content Yet</h3>
                        <p className="text-gray-500 mb-6 max-w-xs mx-auto">Start creating posts, stories, or messages to see them here.</p>
                        <button
                            onClick={() => navigate('/create')}
                            className="text-snuggle-600 font-bold hover:underline"
                        >
                            Create something now
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {content.map(item => (
                            <div
                                key={item.id}
                                onClick={() => navigate(`/content/${item.id}`)}
                                className="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                            {getTypeIcon(item.contentType)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-snuggle-600 transition-colors">
                                                {item.title}
                                            </h3>
                                            <span className="text-xs text-gray-400">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide
                                        ${item.status === 'active' ? 'bg-green-100 text-green-700' :
                                            item.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 pl-[52px]">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Advanced Pagination */}
                {!loading && content.length > 0 && (
                    <div className="flex flex-col md:flex-row items-center justify-between mt-8 border-t border-gray-200 dark:border-gray-800 pt-6 gap-4">

                        {/* Items per page */}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>Show</span>
                            <select
                                value={pagination.limit}
                                onChange={(e) => setSearchParams({ page: '1', limit: e.target.value })}
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 outline-none focus:border-snuggle-500"
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                            <span>per page</span>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setSearchParams({ page: (pagination.page - 1).toString(), limit: pagination.limit.toString() })}
                                disabled={!pagination.hasPrev}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex gap-1">
                                {pagination.totalPages <= 7 ? (
                                    Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setSearchParams({ page: p.toString(), limit: pagination.limit.toString() })}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors
                                                ${p === pagination.page
                                                    ? 'bg-black dark:bg-white text-white dark:text-black'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                                        >
                                            {p}
                                        </button>
                                    ))
                                ) : (
                                    <span className="text-sm font-medium px-4">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={() => setSearchParams({ page: (pagination.page + 1).toString(), limit: pagination.limit.toString() })}
                                disabled={!pagination.hasNext}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Undo Toast */}
                {undoToast && (
                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom duration-300 z-50">
                        <span className="font-medium">{undoToast.message}</span>
                        <div className="flex items-center gap-2 border-l border-gray-700 pl-4">
                            <button
                                onClick={handleUndo}
                                disabled={restoring}
                                className="font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                                {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                Undo
                            </button>
                            <button onClick={() => setUndoToast(null)} className="text-gray-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentList;
