import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { DBService } from '../services/database';

interface InteractionState {
    likedPostIds: Set<string>;
    savedPostIds: Set<string>;
}

interface InteractionContextType {
    likedPostIds: string[];
    savedPostIds: string[];
    isLiked: (postId: string) => boolean;
    isSaved: (postId: string) => boolean;
    toggleLike: (postId: string) => Promise<boolean>;
    toggleSave: (postId: string) => Promise<boolean>;
    loadInteractions: (postIds: string[]) => Promise<void>;
}

const InteractionContext = createContext<InteractionContextType | undefined>(undefined);

export const InteractionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [state, setState] = useState<InteractionState>({
        likedPostIds: new Set(),
        savedPostIds: new Set()
    });

    // Load initial state from user's likedPosts/savedPosts arrays
    useEffect(() => {
        if (currentUser) {
            setState({
                likedPostIds: new Set(currentUser.likedPosts || []),
                savedPostIds: new Set(currentUser.savedPosts || [])
            });
        } else {
            setState({
                likedPostIds: new Set(),
                savedPostIds: new Set()
            });
        }
    }, [currentUser]);

    const isLiked = useCallback((postId: string) => {
        return state.likedPostIds.has(postId);
    }, [state.likedPostIds]);

    const isSaved = useCallback((postId: string) => {
        return state.savedPostIds.has(postId);
    }, [state.savedPostIds]);

    const toggleLike = useCallback(async (postId: string): Promise<boolean> => {
        if (!currentUser) return false;

        const wasLiked = state.likedPostIds.has(postId);

        // Optimistic update
        setState(prev => {
            const newLiked = new Set(prev.likedPostIds);
            if (wasLiked) {
                newLiked.delete(postId);
            } else {
                newLiked.add(postId);
            }
            return { ...prev, likedPostIds: newLiked };
        });

        try {
            const nowLiked = await DBService.toggleLike(postId, currentUser.id);
            // Sync with server response
            setState(prev => {
                const newLiked = new Set(prev.likedPostIds);
                if (nowLiked) {
                    newLiked.add(postId);
                } else {
                    newLiked.delete(postId);
                }
                return { ...prev, likedPostIds: newLiked };
            });
            return nowLiked;
        } catch (error) {
            // Revert on error
            setState(prev => {
                const newLiked = new Set(prev.likedPostIds);
                if (wasLiked) {
                    newLiked.add(postId);
                } else {
                    newLiked.delete(postId);
                }
                return { ...prev, likedPostIds: newLiked };
            });
            throw error;
        }
    }, [currentUser, state.likedPostIds]);

    const toggleSave = useCallback(async (postId: string): Promise<boolean> => {
        if (!currentUser) return false;

        const wasSaved = state.savedPostIds.has(postId);

        // Optimistic update
        setState(prev => {
            const newSaved = new Set(prev.savedPostIds);
            if (wasSaved) {
                newSaved.delete(postId);
            } else {
                newSaved.add(postId);
            }
            return { ...prev, savedPostIds: newSaved };
        });

        try {
            const nowSaved = await DBService.toggleSave(postId, currentUser.id);
            // Sync with server response
            setState(prev => {
                const newSaved = new Set(prev.savedPostIds);
                if (nowSaved) {
                    newSaved.add(postId);
                } else {
                    newSaved.delete(postId);
                }
                return { ...prev, savedPostIds: newSaved };
            });
            return nowSaved;
        } catch (error) {
            // Revert on error
            setState(prev => {
                const newSaved = new Set(prev.savedPostIds);
                if (wasSaved) {
                    newSaved.add(postId);
                } else {
                    newSaved.delete(postId);
                }
                return { ...prev, savedPostIds: newSaved };
            });
            throw error;
        }
    }, [currentUser, state.savedPostIds]);

    const loadInteractions = useCallback(async (postIds: string[]) => {
        if (!currentUser || postIds.length === 0) return;

        try {
            const interactions = await DBService.checkBatchInteractions(postIds, currentUser.id);
            setState(prev => {
                const newLiked = new Set(prev.likedPostIds);
                const newSaved = new Set(prev.savedPostIds);

                interactions.forEach((interactionState, postId) => {
                    if (interactionState.isLiked) {
                        newLiked.add(postId);
                    } else {
                        newLiked.delete(postId);
                    }
                    if (interactionState.isSaved) {
                        newSaved.add(postId);
                    } else {
                        newSaved.delete(postId);
                    }
                });

                return { likedPostIds: newLiked, savedPostIds: newSaved };
            });
        } catch (error) {
            console.error('[InteractionContext] Failed to load interactions:', error);
        }
    }, [currentUser]);

    return (
        <InteractionContext.Provider value={{
            likedPostIds: Array.from(state.likedPostIds),
            savedPostIds: Array.from(state.savedPostIds),
            isLiked,
            isSaved,
            toggleLike,
            toggleSave,
            loadInteractions
        }}>
            {children}
        </InteractionContext.Provider>
    );
};

export const useInteractions = () => {
    const context = useContext(InteractionContext);
    if (context === undefined) {
        throw new Error('useInteractions must be used within an InteractionProvider');
    }
    return context;
};
