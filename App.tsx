import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { onMessage } from 'firebase/messaging';
import { signOut } from 'firebase/auth';
import { messaging, auth } from './services/firebase';
import { User, GoogleSetupData } from './types';
import { DBService } from './services/database';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';
import { errorHandler } from './services/globalErrorHandler';
import { ThemeProvider } from './context/ThemeContext';

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
const BottomNav = React.lazy(() => import('./components/BottomNav'));
import CallOverlay from './components/CallOverlay';
import { CallProvider } from './context/CallContext';

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
      onMessage(messaging, (payload) => {
        console.log('[App] Foreground push received:', payload);
        const { title, body, icon } = payload.notification || {};
        if (Notification.permission === 'granted') {
          new Notification(title || 'Snuggle', {
            body,
            icon: icon || '/vite.svg'
          });
        }
      });
    }

    return () => unsubscribe();
  }, [currentUser]);

  const isFullScreen = location.pathname.includes('/chat') ||
    location.pathname === '/settings' ||
    location.pathname === '/create';

  return (
    <div className="min-h-screen bg-snuggle-50 dark:bg-black flex justify-center">
      {/* Toast Notifications */}
      <Toaster position="top-right" richColors closeButton />
      <div className="w-full max-w-lg bg-white dark:bg-dark-bg relative">
        <CallOverlay />

        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Feed currentUser={currentUser} onUserClick={(userId) => navigate(`/profile/${userId}`)} />} />
            <Route path="/messages" element={<Messages currentUser={currentUser} onChatSelect={(user) => navigate(`/chat/${user.id}`)} onUserClick={(userId) => navigate(`/profile/${userId}`)} />} />
            <Route path="/chat/:userId" element={<ChatWrapper currentUser={currentUser} />} />
            <Route path="/profile" element={<Profile user={currentUser} currentUser={currentUser} isOwnProfile={true} onLogout={onLogout} />} />
            <Route path="/profile/:userId" element={<Profile currentUser={currentUser} isOwnProfile={false} />} />
            <Route path="/create" element={<CreateWrapper currentUser={currentUser} />} />
            <Route path="/notifications" element={<Notifications currentUser={currentUser} onUserClick={(userId) => navigate(`/profile/${userId}`)} />} />
            <Route path="/settings" element={<SettingsWrapper currentUser={currentUser} onLogout={onLogout} onUpdateUser={onUpdateUser} onDeleteAccount={onDeleteAccount} onSwitchAccount={onSwitchAccount} onAddAccount={onAddAccount} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        {!isFullScreen && (
          <BottomNav unreadCount={unreadCount} />
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
      setCurrentUser(user);
      // DBService.setUserOnline(user.id, true); // Method doesn't exist - removed
    }
    setIsLoading(false);
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
      </CallProvider>
    </ThemeProvider>
  );
};

export default App;
