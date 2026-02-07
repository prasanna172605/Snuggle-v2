import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { onMessage } from 'firebase/messaging';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { messaging, auth } from './services/firebase';
import { User, GoogleSetupData } from './types';
import { DBService } from './services/database';
import { Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { errorHandler } from './services/globalErrorHandler';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';


// Lazy Load Pages
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const GoogleUsernameSetup = React.lazy(() => import('./pages/GoogleUsernameSetup'));
const Feed = React.lazy(() => import('./pages/Feed'));
const Messages = React.lazy(() => import('./pages/Messages'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Chat = React.lazy(() => import('./pages/Chat'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Create = React.lazy(() => import('./pages/Create'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Activities = React.lazy(() => import('./pages/Activities'));
const Saved = React.lazy(() => import('./pages/Saved'));
const BottomNav = React.lazy(() => import('./components/BottomNav'));
import Sidebar from './components/Sidebar';
import CallOverlay from './components/CallOverlay';
import { CallProvider } from './context/CallContext';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/common/PageTransition';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <Loader2 className="w-12 h-12 animate-spin text-cyan-500" />
  </div>
);

// Wrapper for Chat to handle URL params
const ChatWrapper = ({ currentUser }: { currentUser: User }) => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [otherUser, setOtherUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    if (userId) {
      DBService.getUserById(userId).then(user => {
        if (user) setOtherUser(user);
      });
    }
  }, [userId]);

  if (!otherUser) return <LoadingFallback />;
  return <Chat currentUser={currentUser} otherUser={otherUser} onBack={() => navigate(-1)} />;
};

// Wrapper for Create to handle navigation
const CreateWrapper = ({ currentUser }: { currentUser: User }) => {
  const navigate = useNavigate();
  return <Create currentUser={currentUser} onNavigate={() => navigate('/')} />;
};

// Wrapper for Settings to handle back navigation 
const SettingsWrapper = ({
  currentUser,
  onLogout,
  onUpdateUser,
  onDeleteAccount,
  onSwitchAccount,
  onAddAccount
}: {
  currentUser: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  onDeleteAccount: () => void;
  onSwitchAccount: (userId: string) => void;
  onAddAccount: () => void;
}) => {
  const navigate = useNavigate();
  return (
    <Settings
      currentUser={currentUser}
      onBack={() => navigate(-1)}
      onLogout={onLogout}
      onUpdateUser={onUpdateUser}
      onDeleteAccount={onDeleteAccount}
      onSwitchAccount={onSwitchAccount}
      onAddAccount={onAddAccount}
    />
  );
};

const AppContent = ({
  currentUser,
  onLogout,
  onUpdateUser,
  onDeleteAccount,
  onSwitchAccount,
  onAddAccount
}: {
  currentUser: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  onDeleteAccount: () => void;
  onSwitchAccount: (userId: string) => void;
  onAddAccount: () => void;
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize global error handler
    errorHandler.setupGlobalListeners();

    // Request permissions on launch
    const requestPermissions = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          DBService.requestNotificationPermission(currentUser.id);
        }
      }

      try {
        const hasAskedMedia = localStorage.getItem('snuggle_media_asked');
        if (!hasAskedMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          stream.getTracks().forEach(t => t.stop());
          localStorage.setItem('snuggle_media_asked', 'true');
        }
      } catch (e) {
        console.log('Media permission skipped/denied');
      }
    };
    requestPermissions();

    if (!currentUser?.id) return;
    const unsubscribe = DBService.subscribeToNotifications(currentUser.id, (notifs: import('./types').Notification[]) => {
      setUnreadCount(notifs.filter(n => !n.read).length);
    });

    if (messaging) {
      onMessage(messaging, async (payload) => {
        console.log('[App] Foreground push received:', payload);
        const { title, body, icon } = payload.notification || {};

        // Use ServiceWorker showNotification for mobile compatibility
        if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title || 'Snuggle', {
              body,
              icon: icon || '/vite.svg',
              badge: '/vite.svg',
              vibrate: [200, 100, 200], // Vibration pattern for mobile
              tag: 'snuggle-foreground', // Prevents duplicates with same tag
              renotify: true, // Play sound even if same tag
              silent: false, // Ensure sound plays
              data: payload.data
            } as NotificationOptions);
          } catch (err) {
            console.warn('[App] ServiceWorker notification failed:', err);
          }
        }
      });
    }

    return () => unsubscribe();
  }, [currentUser]);

  const isFullScreen = location.pathname.includes('/chat') ||
    location.pathname === '/settings' ||
    location.pathname === '/create';

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-white dark:bg-dark-bg">
      {/* Toast Notifications */}
      <Toaster position="top-right" richColors closeButton />
      <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">
        <CallOverlay />

        {/* Sidebar - Desktop Only */}
        <Sidebar
          unreadCount={unreadCount}
          onLogout={onLogout}
          onSwitchAccount={(id) => {
            toast.info("Switching accounts coming soon!");
          }}
          onAddAccount={() => {
            toast.info("add account coming soon!");
          }}
        />

        {/* Main Content */}
        <div className={`flex-1 flex flex-col relative w-full h-full bg-gray-50 dark:bg-black/90 ${isFullScreen ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <AnimatePresence mode="wait" initial={false}>
            <Suspense fallback={<LoadingFallback />}>
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<PageTransition><Feed currentUser={currentUser} onUserClick={(userId) => navigate(`/profile/${userId}`)} /></PageTransition>} />
                <Route path="/messages" element={<PageTransition><Messages currentUser={currentUser} onChatSelect={(user) => navigate(`/chat/${user.id}`)} onUserClick={(userId) => navigate(`/profile/${userId}`)} /></PageTransition>} />
                <Route path="/chat/:userId" element={<PageTransition><ChatWrapper currentUser={currentUser} /></PageTransition>} />
                <Route path="/profile" element={<PageTransition><Profile user={currentUser} currentUser={currentUser} isOwnProfile={true} onLogout={onLogout} /></PageTransition>} />
                <Route path="/profile/:userId" element={<PageTransition><Profile currentUser={currentUser} isOwnProfile={false} /></PageTransition>} />
                <Route path="/create" element={<PageTransition><CreateWrapper currentUser={currentUser} /></PageTransition>} />
                <Route path="/notifications" element={<PageTransition><Notifications currentUser={currentUser} onUserClick={(userId) => navigate(`/profile/${userId}`)} /></PageTransition>} />
                <Route path="/settings" element={<PageTransition><SettingsWrapper currentUser={currentUser} onLogout={onLogout} onUpdateUser={onUpdateUser} onDeleteAccount={onDeleteAccount} onSwitchAccount={onSwitchAccount} onAddAccount={onAddAccount} /></PageTransition>} />
                <Route path="/activities" element={<PageTransition><Activities currentUser={currentUser} onBack={() => navigate(-1)} /></PageTransition>} />
                <Route path="/saved" element={<PageTransition><Saved currentUser={currentUser} onBack={() => navigate(-1)} /></PageTransition>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </div>

        {!isFullScreen && (
          <div className="md:hidden">
            <BottomNav unreadCount={unreadCount} />
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authView, setAuthView] = useState<'LOGIN' | 'SIGNUP' | 'GOOGLE_SETUP'>('LOGIN');
  const [tempGoogleUser, setTempGoogleUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);

      // Reconstruct timestamp methods for localStorage data
      if (user.createdAt?._seconds) {
        user.createdAt = { toMillis: () => user.createdAt._seconds * 1000 };
      }
      if (user.updatedAt?._seconds) {
        user.updatedAt = { toMillis: () => user.updatedAt._seconds * 1000 };
      }
      if (user.lastLogin?._seconds) {
        user.lastLogin = { toMillis: () => user.lastLogin._seconds * 1000 };
      }

      setCurrentUser(user);
      // DBService.setUserOnline(user.id, true); // Method doesn't exist - removed
    }
    setIsLoading(false);
  }, []);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firebase user is signed in
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) {
          // Firebase signed in but no localStorage - fetch from Firestore
          try {
            const userData = await DBService.getUserById(firebaseUser.uid);
            if (userData) {
              localStorage.setItem('currentUser', JSON.stringify(userData));
              setCurrentUser(userData);
            }
          } catch (error) {
            console.error('Failed to fetch user data:', error);
          }
        }
      } else {
        // Firebase user signed out - clear localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          localStorage.removeItem('currentUser');
          setCurrentUser(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (user: User) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
    // await DBService.setUserOnline(user.id, true); // Method doesn't exist - removed
  };

  const onLogout = async () => {
    try {
      // Delete FCM token if available
      const { deleteFCMToken } = await import('./services/fcmService');
      await deleteFCMToken();

      // Sign out from Firebase
      await signOut(auth);
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      setAuthView('LOGIN');
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback logout
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      setAuthView('LOGIN');
    }
  };

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!currentUser) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        {authView === 'LOGIN' && (
          <Login
            onLogin={handleLogin}
            onNavigate={(view) => setAuthView(view as 'LOGIN' | 'SIGNUP' | 'GOOGLE_SETUP')}
            onSwitchToSignup={() => setAuthView('SIGNUP')}
            onGoogleSetup={(googleUser) => {
              setTempGoogleUser(googleUser);
              setAuthView('GOOGLE_SETUP');
            }}
          />
        )}
        {authView === 'SIGNUP' && (
          <Signup
            onSignup={handleLogin}
            onNavigate={(view) => setAuthView(view as 'LOGIN' | 'SIGNUP' | 'GOOGLE_SETUP')}
            onSwitchToLogin={() => setAuthView('LOGIN')}
          />
        )}
        {authView === 'GOOGLE_SETUP' && tempGoogleUser && (
          <GoogleUsernameSetup
            googleData={tempGoogleUser}
            onSignup={handleLogin}
            onCancel={() => setAuthView('LOGIN')}
          />
        )}
      </Suspense>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <CallProvider currentUser={currentUser}>
            <AppContent
              currentUser={currentUser}
              onLogout={onLogout}
              onUpdateUser={(user) => {
                setCurrentUser(user);
                localStorage.setItem('currentUser', JSON.stringify(user));
              }}
              onDeleteAccount={onLogout}
              onSwitchAccount={(userId) => {
                // Switch account logic
              }}
              onAddAccount={() => {
                // Add account logic
              }}
            />

            <Toaster position="top-right" richColors closeButton />
          </CallProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
