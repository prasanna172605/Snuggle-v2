import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Filter, TrendingUp, Clock } from 'lucide-react';
import { useDebounce } from '@/hooks/usePerformance';
import { searchService, RecentSearchesManager, SearchFilters, SearchResult } from '@/services/searchService';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';

export function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [filters, setFilters] = useState<SearchFilters>({});
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    // Load recent searches
    useEffect(() => {
        setRecentSearches(RecentSearchesManager.getRecent());
    }, []);

    // Debounced search
    const debouncedSearch = useDebounce(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await searchService.search(searchQuery, filters);
            setResults(response.hits);

            // Save to recent searches
            if (searchQuery) {
                RecentSearchesManager.addRecent(searchQuery);
                setRecentSearches(RecentSearchesManager.getRecent());
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsLoading(false);
        }
    }, 300);

    // Search when query or filters change
    useEffect(() => {
        debouncedSearch(query);
    }, [query, filters]);

    // Update URL when query changes
    useEffect(() => {
        if (query) {
            setSearchParams({ q: query });
        } else {
            setSearchParams({});
        }
    }, [query]);

    const handleClearSearch = () => {
        setQuery('');
        setResults([]);
    };

    const handleRecentSearchClick = (recentQuery: string) => {
        setQuery(recentQuery);
    };

    const handleClearRecent = () => {
        RecentSearchesManager.clearRecent();
        setRecentSearches([]);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Search Input */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search users, posts, hashtags..."
                        className="w-full pl-10 pr-24 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 dark:bg-gray-800 dark:text-white"
                        autoFocus
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {query && (
                            <button
                                onClick={handleClearSearch}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                'p-1.5 rounded-full transition-colors',
                                showFilters
                                    ? 'bg-cyan-100 dark:bg-cyan-900 text-cyan-600'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            )}
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h3 className="text-sm font-medium mb-3">Filters</h3>
                        <div className="space-y-3">
                            {/* Type Filter */}
                            <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                                    Type
                                </label>
                                <div className="flex gap-2">
                                    {['all', 'users', 'posts', 'media'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setFilters({ ...filters, type: type as any })}
                                            className={cn(
                                                'px-3 py-1.5 text-sm rounded-full transition-colors',
                                                filters.type === type || (!filters.type && type === 'all')
                                                    ? 'bg-cyan-600 text-white'
                                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            )}
                                        >
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Verified Only */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.verifiedOnly || false}
                                    onChange={(e) =>
                                        setFilters({ ...filters, verifiedOnly: e.target.checked })
                                    }
                                    className="w-4 h-4 text-cyan-600 rounded"
                                />
                                <span className="text-sm">Verified users only</span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* Recent & Trending Searches (when no query) */}
            {!query && (
                <div className="space-y-6">
                    {recentSearches.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Recent Searches
                                </h2>
                                <button
                                    onClick={handleClearRecent}
                                    className="text-xs text-cyan-600 hover:text-cyan-700"
                                >
                                    Clear all
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {recentSearches.map((recent, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleRecentSearchClick(recent)}
                                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                        {recent}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4" />
                            Trending
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {searchService.getTrendingSearches().map((trending, i) => (
                                <button
                                    key={i}
                                    onClick={() => setQuery(trending)}
                                    className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400 rounded-full text-sm hover:bg-cyan-100 dark:hover:bg-cyan-950/40"
                                >
                                    #{trending}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center py-12">
                    <LoadingSpinner text="Searching..." />
                </div>
            )}

            {/* Results */}
            {!isLoading && query && results.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {results.length} result{results.length !== 1 ? 's' : ''}
                    </p>
                    {results.map(result => (
                        <SearchResultItem key={result.id} result={result} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && query && results.length === 0 && query.length >= 2 && (
                <EmptyState
                    icon={Search}
                    title="No results found"
                    description={`Try adjusting your search or filters`}
                />
            )}
        </div>
    );
}

function SearchResultItem({ result }: { result: SearchResult }) {
    return (
        <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors">
            {result.imageUrl && (
                <img
                    src={result.imageUrl}
                    alt={result.title}
                    className="w-12 h-12 rounded-full object-cover"
                />
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{result.title}</h3>
                    {result.verified && (
                        <span className="text-cyan-600">✓</span>
                    )}
                </div>
                {result.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {result.description}
                    </p>
                )}
            </div>
            <span className="text-xs text-gray-400 capitalize">{result.type}</span>
        </div>
    );
}

export default SearchPage;
