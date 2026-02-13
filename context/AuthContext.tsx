import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { DBService } from '../services/database';
import { User } from '../types';
import { initializeKeys, clearE2EEData } from '../services/keyManager';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const user = await DBService.getUserById(firebaseUser.uid);
                    if (user) {
                        setCurrentUser(user);

                        // Initialize E2EE keys
                        initializeKeys(user.id).catch(err =>
                            console.warn('[Auth] E2EE key initialization skipped:', err)
                        );

                        // Auto-register FCM token for push notifications
                        // This ensures the device token is always saved on login
                        if ('Notification' in window && Notification.permission === 'granted') {
                            DBService.requestNotificationPermission(user.id).catch(err =>
                                console.log('[Auth] FCM token registration skipped:', err)
                            );
                        }
                    } else {
                        // Handle case where user exists in Auth but not in DB (rare)
                        setCurrentUser({
                            id: firebaseUser.uid,
                            uid: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            username: firebaseUser.displayName || 'User',
                            displayName: firebaseUser.displayName || 'User',
                            photoURL: firebaseUser.photoURL || undefined,
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user details", error);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const logout = async () => {
        await clearE2EEData();
        await auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ currentUser, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
