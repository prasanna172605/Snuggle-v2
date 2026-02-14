import React, { useState, useEffect, Suspense, useTransition } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { onMessage } from 'firebase/messaging';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { messaging, auth } from './services/firebase';
import { User, GoogleSetupData } from './types';
import { DBService } from './services/database';
import { Loader2, Bell } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { errorHandler } from './services/globalErrorHandler';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import { InteractionProvider } from './context/InteractionContext';


// Lazy Load Pages
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const GoogleUsernameSetup = React.lazy(() => import('./pages/GoogleUsernameSetup'));
const FeedMemories = React.lazy(() => import('./pages/FeedMemories'));
const CreateMemory = React.lazy(() => import('./pages/CreateMemory'));
const MemoryViewer = React.lazy(() => import('./pages/MemoryViewer'));
const Messages = React.lazy(() => import('./pages/Messages'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Chat = React.lazy(() => import('./pages/Chat'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Create = React.lazy(() => import('./pages/Create')); 
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Activities = React.lazy(() => import('./pages/Activities'));
const Favourites = React.lazy(() => import('./pages/Favourites'));
const RecentlyDeleted = React.lazy(() => import('./pages/RecentlyDeleted'));
const PostDetail = React.lazy(() => import('./pages/PostDetail'));
const ChatDetails = React.lazy(() => import('./pages/ChatDetails'));
const BottomNav = React.lazy(() => import('./components/BottomNav'));
import Sidebar from './components/Sidebar';
import CallOverlay from './components/CallOverlay';
import { CallProvider } from './context/CallContext';
import { AnimatePresence } from 'framer-motion';
import { Updater } from './components/Updater';
import { UpdateManager } from './services/UpdateManager';
import PageTransition from './components/common/PageTransition';
import SplashScreen from './components/common/SplashScreen';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-light-background dark:bg-dark-background">
    <Loader2 className="w-12 h-12 animate-spin text-snuggle-600" />
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
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Subscribe to unread messages count
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubscribe = DBService.subscribeToUnreadChatsCount(currentUser.id, setUnreadMessagesCount);
    return () => unsubscribe();
  }, [currentUser?.id]);

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
      const newUnreadCount = notifs.filter(n => !n.read).length;

      // Check for strictly NEW notifications (created in last 5 seconds to avoid spam on load)
      // and ensure we haven't shown them yet (simple check against previous unread count increasing)
      if (newUnreadCount > unreadCount) {
        const latestNotif = notifs[0]; // Assuming sorted by desc
        const isRecent = latestNotif && (Date.now() - latestNotif.createdAt) < 5000;

        if (latestNotif && !latestNotif.read && isRecent) {
          toast.custom((t) => (
            <div className="flex items-center gap-3 w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-lg rounded-xl p-4 cursor-pointer" onClick={() => {
              toast.dismiss(t);
              React.startTransition(() => {
                navigate('/notifications');
              });
            }}>
              <div className="w-10 h-10 rounded-full bg-snuggle-100 dark:bg-snuggle-900/30 flex items-center justify-center text-snuggle-500">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">{latestNotif.title || 'New Notification'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{latestNotif.message}</p>
              </div>
            </div>
          ), { duration: 4000 });
        }
      }
      setUnreadCount(newUnreadCount);
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

  const isBottomNavHidden = location.pathname.includes('/chat') ||
    location.pathname === '/settings' ||
    location.pathname === '/create';

  const isScrollLocked = location.pathname.includes('/chat') ||
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
          unreadMessagesCount={unreadMessagesCount}
          onLogout={onLogout}
          onSwitchAccount={(id) => {
            toast.info("Switching accounts coming soon!");
          }}
          onAddAccount={() => {
            toast.info("add account coming soon!");
          }}
        />

        {/* Main Content */}
        <div className={`flex-1 flex flex-col relative w-full h-full bg-gray-50 dark:bg-black/90 ${isScrollLocked ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <AnimatePresence mode="wait" initial={false}>
            <Suspense fallback={<LoadingFallback />}>
              <Routes location={location} key={location.pathname}>
                {/* Home -> Feed (Memories) */}
                <Route path="/" element={<PageTransition><FeedMemories /></PageTransition>} />
                
                {/* Messages */}
                 <Route path="/messages" element={<PageTransition><Messages currentUser={currentUser} onChatSelect={(user) => navigate(`/chat/${user.id}`)} onUserClick={(userId) => navigate(`/profile/${userId}`)} /></PageTransition>} />
                
                <Route path="/chat/:userId" element={<PageTransition><ChatWrapper currentUser={currentUser} /></PageTransition>} />
                <Route path="/chat/:chatId/details" element={<PageTransition><ChatDetails currentUser={currentUser} /></PageTransition>} />
                <Route path="/profile" element={<PageTransition><Profile user={currentUser} currentUser={currentUser} isOwnProfile={true} onLogout={onLogout} /></PageTransition>} />
                <Route path="/profile/:userId" element={<PageTransition><Profile currentUser={currentUser} isOwnProfile={false} /></PageTransition>} />
                <Route path="/create" element={<PageTransition><CreateMemory /></PageTransition>} />
                <Route path="/memory/:memoryId" element={<PageTransition><MemoryViewer /></PageTransition>} />
                 <Route path="/notifications" element={<PageTransition><Notifications currentUser={currentUser} onUserClick={(userId) => navigate(`/profile/${userId}`)} /></PageTransition>} />
                <Route path="/settings" element={<PageTransition><SettingsWrapper currentUser={currentUser} onLogout={onLogout} onUpdateUser={onUpdateUser} onDeleteAccount={onDeleteAccount} onSwitchAccount={onSwitchAccount} onAddAccount={onAddAccount} /></PageTransition>} />
                <Route path="/activities" element={<PageTransition><Activities currentUser={currentUser} onBack={() => navigate(-1)} /></PageTransition>} />
                <Route path="/favourites" element={<PageTransition><Favourites currentUser={currentUser} onBack={() => navigate(-1)} /></PageTransition>} />
                <Route path="/recently-deleted" element={<PageTransition><RecentlyDeleted currentUser={currentUser} onBack={() => navigate(-1)} /></PageTransition>} />
                <Route path="/post/:postId" element={<PageTransition><PostDetail currentUser={currentUser} /></PageTransition>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AnimatePresence>
          <Updater />
        </div>

        {!isBottomNavHidden && (
          <div className="md:hidden">
            <BottomNav unreadCount={unreadCount} unreadMessagesCount={unreadMessagesCount} />
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
  const [showSplash, setShowSplash] = useState(true);
  const [authView, setAuthView] = useState<'LOGIN' | 'SIGNUP' | 'GOOGLE_SETUP'>('LOGIN');
  const [tempGoogleUser, setTempGoogleUser] = useState<any>(null);

  useEffect(() => {
    // Hide splash screen after authentication check if it's already done
    // but the SplashScreen component itself handles its own timer.
    UpdateManager.run();
  }, []);

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

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <InteractionProvider>
              <CallProvider currentUser={currentUser}>
                {currentUser ? (
                  <AppContent
                    currentUser={currentUser}
                    onLogout={onLogout}
                    onUpdateUser={(user) => {
                      setCurrentUser(user);
                      localStorage.setItem('currentUser', JSON.stringify(user));
                    }}
                    onDeleteAccount={async () => {
                      if (currentUser) {
                        try {
                          await DBService.deleteUser(currentUser.id);
                          toast.success('Account deleted successfully');
                          onLogout();
                        } catch (error: any) {
                          console.error('Failed to delete account:', error);
                          toast.error(error.message || 'Failed to delete account');
                        }
                      }
                    }}
                    onSwitchAccount={(userId) => {
                      // Switch account logic
                    }}
                    onAddAccount={() => {
                      // Add account logic
                    }}
                  />
                ) : (
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
                )}

                <Updater />
                <Toaster position="top-right" richColors closeButton />
              </CallProvider>
            </InteractionProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
};

export default App;
