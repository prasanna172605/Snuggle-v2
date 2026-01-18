/**
 * Search Service
 * Abstraction for search functionality - ready for Algolia integration
 */

import { database } from './firebase';
import { ref, query, orderByChild, startAt, endAt, limitToFirst, get } from 'firebase/database';

export type SearchType = 'all' | 'users' | 'posts' | 'media';

export interface SearchFilters {
    type?: SearchType;
    hashtags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    verifiedOnly?: boolean;
    userId?: string;
}

export interface SearchResult {
    id: string;
    type: 'user' | 'post' | 'media';
    title: string;
    description?: string;
    imageUrl?: string;
    createdAt: number;
    userId?: string;
    username?: string;
    verified?: boolean;
    hashtags?: string[];
}

export interface SearchResponse {
    hits: SearchResult[];
    facets: {
        types: Record<string, number>;
        hashtags: Record<string, number>;
    };
    totalHits: number;
    query: string;
}

/**
 * Search service - ready for Algolia integration
 * Currently uses lightweight RTDB prefix search
 */
class SearchService {
    /**
     * Main search function
     * TODO: Replace with Algolia when ready
     */
    async search(
        searchQuery: string,
        filters: SearchFilters = {},
        limit: number = 20
    ): Promise<SearchResponse> {
        const normalizedQuery = searchQuery.toLowerCase().trim();

        if (normalizedQuery.length < 2) {
            return {
                hits: [],
                facets: { types: {}, hashtags: {} },
                totalHits: 0,
                query: searchQuery,
            };
        }

        // For now, use lightweight prefix search
        // TODO: Replace with Algolia search
        const results = await this.prefixSearch(normalizedQuery, filters, limit);

        return {
            hits: results,
            facets: this.calculateFacets(results),
            totalHits: results.length,
            query: searchQuery,
        };
    }

    /**
     * Lightweight prefix search (temporary until Algolia)
     */
    private async prefixSearch(
        queryStr: string,
        filters: SearchFilters,
        limit: number
    ): Promise<SearchResult[]> {
        const results: SearchResult[] = [];

        // Search users if no type filter or type is 'users'
        if (!filters.type || filters.type === 'all' || filters.type === 'users') {
            const users = await this.searchUsers(queryStr, limit);
            results.push(...users);
        }

        // Search posts if no type filter or type is 'posts'
        if (!filters.type || filters.type === 'all' || filters.type === 'posts') {
            const posts = await this.searchPosts(queryStr, filters, limit);
            results.push(...posts);
        }

        // Apply additional filters
        let filtered = results;

        if (filters.verifiedOnly) {
            filtered = filtered.filter(r => r.verified);
        }

        if (filters.hashtags && filters.hashtags.length > 0) {
            filtered = filtered.filter(r =>
                r.hashtags?.some(tag => filters.hashtags!.includes(tag))
            );
        }

        if (filters.dateFrom) {
            filtered = filtered.filter(r => r.createdAt >= filters.dateFrom!.getTime());
        }

        if (filters.dateTo) {
            filtered = filtered.filter(r => r.createdAt <= filters.dateTo!.getTime());
        }

        // Sort by relevance (for now, just by date)
        filtered.sort((a, b) => b.createdAt - a.createdAt);

        return filtered.slice(0, limit);
    }

    /**
     * Search users by username prefix
     */
    private async searchUsers(prefix: string, limit: number): Promise<SearchResult[]> {
        const usersRef = ref(database, 'users');
        const usersQuery = query(
            usersRef,
            orderByChild('username'),
            startAt(prefix),
            endAt(prefix + '\uf8ff'),
            limitToFirst(limit)
        );

        const snapshot = await get(usersQuery);
        const results: SearchResult[] = [];

        snapshot.forEach(child => {
            const user = child.val();
            results.push({
                id: child.key!,
                type: 'user',
                title: user.username,
                description: user.bio || user.fullName,
                imageUrl: user.avatar,
                createdAt: user.createdAt || Date.now(),
                username: user.username,
                verified: user.verified || false,
            });
        });

        return results;
    }

    /**
     * Search posts (placeholder - requires search index)
     */
    private async searchPosts(
        queryStr: string,
        filters: SearchFilters,
        limit: number
    ): Promise<SearchResult[]> {
        // TODO: Implement with Algolia or search index
        // For now, return empty array
        return [];
    }

    /**
     * Calculate facets from results
     */
    private calculateFacets(results: SearchResult[]) {
        const types: Record<string, number> = {};
        const hashtags: Record<string, number> = {};

        results.forEach(result => {
            // Count types
            types[result.type] = (types[result.type] || 0) + 1;

            // Count hashtags
            result.hashtags?.forEach(tag => {
                hashtags[tag] = (hashtags[tag] || 0) + 1;
            });
        });

        return { types, hashtags };
    }

    /**
     * Get trending searches (from analytics or predefined)
     */
    getTrendingSearches(): string[] {
        // TODO: Implement with analytics
        return ['react', 'firebase', 'design', 'photography', 'travel'];
    }
}

export const searchService = new SearchService();

/**
 * Recent searches storage (localStorage)
 */
export class RecentSearchesManager {
    private static STORAGE_KEY = 'snuggle_recent_searches';
    private static MAX_ITEMS = 10;

    static getRecent(): string[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    static addRecent(query: string): void {
        if (!query.trim()) return;

        const recent = this.getRecent();
        const filtered = recent.filter(q => q !== query);
        filtered.unshift(query);

        const limited = filtered.slice(0, this.MAX_ITEMS);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limited));
    }

    static clearRecent(): void {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    static removeRecent(query: string): void {
        const recent = this.getRecent();
        const filtered = recent.filter(q => q !== query);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    }
}

export default searchService;
