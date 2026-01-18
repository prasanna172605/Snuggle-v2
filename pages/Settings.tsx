
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, User, Lock, Bell, HelpCircle, LogOut, ChevronRight, Shield, Moon, Camera, Trash2, Users, PlusCircle } from 'lucide-react';
import { User as UserType } from '../types';
import { DBService } from '../services/database';

interface SettingsProps {
  currentUser: UserType;
  onBack: () => void;
  onLogout: () => void;
  onUpdateUser: (user: UserType) => void;
  onDeleteAccount: () => void;
  onSwitchAccount: (userId: string) => void;
  onAddAccount: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  currentUser,
  onBack,
  onLogout,
  onUpdateUser,
  onDeleteAccount,
  onSwitchAccount,
  onAddAccount
}) => {
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [isEditing, setIsEditing] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<UserType[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock toggle states
  const [pushEnabled, setPushEnabled] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);

  // Real dark mode state
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    DBService.getSavedSessions().then(setSavedAccounts);
    setDarkMode(localStorage.getItem('snuggle_theme') === 'dark');
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleSaveProfile = async () => {
    try {
      const updatedUser = await DBService.updateProfile(currentUser.id, { fullName, username, bio, avatar });
      onUpdateUser(updatedUser);
      setIsEditing(false);
    } catch (e: any) {
      alert(e.message || "Failed to update profile");
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('snuggle_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('snuggle_theme', 'light');
    }
  };

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24 dark:bg-black transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center sticky top-0 z-10 transition-colors">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white ml-3">Settings</h2>
      </div>

      <div className="p-4 space-y-6">

        {/* Account Section */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">Account</h3>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden border border-transparent dark:border-dark-border transition-colors">
            {isEditing ? (
              <div className="p-4 space-y-4">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center mb-4">
                  <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                    <img src={avatar} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-gray-100 dark:border-gray-700" />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <span className="text-xs text-snuggle-500 mt-2 font-medium">Click to change photo</span>
                  {avatar && !avatar.includes('ui-avatars.com') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAvatar(`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`);
                      }}
                      className="mt-2 text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Photo
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500">Full Name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border-b border-gray-200 dark:border-gray-700 bg-transparent dark:text-white py-1 focus:outline-none focus:border-snuggle-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Username</label>
                  <div className="flex items-center border-b border-gray-200 dark:border-gray-700 py-1">
                    <span className="text-gray-400 mr-1">@</span>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      className="w-full focus:outline-none focus:border-snuggle-500 bg-transparent dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-snuggle-500"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} className="flex-1 bg-snuggle-500 text-white py-2 rounded-lg text-sm font-semibold">Save</button>
                  <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm font-semibold">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-full text-blue-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Edit Profile</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Change username, bio, avatar</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            )}
          </div>
        </section>

        {/* Switch Accounts Section */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">Switch Accounts</h3>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 border border-transparent dark:border-dark-border transition-colors">
            {savedAccounts.map(account => (
              <button
                key={account.id}
                onClick={() => account.id !== currentUser.id && onSwitchAccount(account.id)}
                className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors ${account.id === currentUser.id ? 'bg-snuggle-50 dark:bg-dark-border' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <img src={account.avatar} className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700" alt="" />
                  <div className="text-left">
                    <p className={`font-semibold text-sm ${account.id === currentUser.id ? 'text-snuggle-600 dark:text-snuggle-400' : 'text-gray-900 dark:text-white'}`}>
                      {account.username}
                    </p>
                    {account.id === currentUser.id && <p className="text-[10px] text-snuggle-400">Current</p>}
                  </div>
                </div>
                {account.id !== currentUser.id && <ChevronRight className="w-5 h-5 text-gray-300" />}
              </button>
            ))}

            <button onClick={onAddAccount} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 dark:bg-dark-border p-2 rounded-full text-gray-600 dark:text-gray-400">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Add Account</span>
              </div>
            </button>
          </div>
        </section>

        {/* Privacy Section */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">Privacy & Security</h3>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 border border-transparent dark:border-dark-border transition-colors">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded-full text-purple-500">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Private Account</span>
              </div>
              <button
                onClick={() => setPrivateAccount(!privateAccount)}
                className={`w-11 h-6 rounded-full transition-colors relative ${privateAccount ? 'bg-snuggle-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${privateAccount ? 'translate-x-5' : ''}`}></span>
              </button>
            </div>

            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-full text-green-500">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Blocked Accounts</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </section>

        {/* Preferences Section */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">App Settings</h3>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 border border-transparent dark:border-dark-border transition-colors">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded-full text-yellow-500">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Push notifications for new messages</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!pushEnabled) {
                    const granted = await DBService.requestNotificationPermission(currentUser.id);
                    if (granted) setPushEnabled(true);
                    else alert("Permission denied. Enable notifications in browser settings.");
                  } else {
                    setPushEnabled(false);
                    // Ideally remove token from DB here too
                  }
                }}
                className={`w-11 h-6 rounded-full transition-colors relative ${pushEnabled ? 'bg-snuggle-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${pushEnabled ? 'translate-x-5' : ''}`}></span>
              </button>
            </div>

            {/* TEST NOTIFICATION BUTTON */}
            {pushEnabled && (
              <button
                onClick={async () => {
                  try {
                    console.log('Testing push notification...');
                    await DBService.sendPushNotification({
                      receiverId: currentUser.id,
                      title: "Test Notification",
                      body: "If you see this immediately, High Priority is working! 🚀",
                      url: "/settings",
                      icon: currentUser.avatar
                    });
                    alert("Test sent! Check system tray.");
                  } catch (e: any) {
                    alert("Error sending test: " + e.message);
                  }
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors border-t border-gray-100 dark:border-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-full text-blue-500">
                    <Bell className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">Send Test Notification</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            )}

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 dark:bg-gray-700/50 p-2 rounded-full text-gray-600 dark:text-gray-300">
                  <Moon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Dark Mode</span>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`w-11 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-snuggle-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${darkMode ? 'translate-x-5' : ''}`}></span>
              </button>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">Support</h3>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 border border-transparent dark:border-dark-border transition-colors">
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-teal-50 dark:bg-teal-900/30 p-2 rounded-full text-teal-500">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Help Center</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>

            <button onClick={onLogout} className="w-full flex items-center justify-between p-4 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="bg-orange-50 dark:bg-orange-900/30 p-2 rounded-full text-orange-500 group-hover:bg-orange-200">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="font-semibold text-orange-500 text-sm">Log Out</span>
              </div>
            </button>

            <button onClick={onDeleteAccount} className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 dark:bg-red-900/30 p-2 rounded-full text-red-600 group-hover:bg-red-200">
                  <Trash2 className="w-5 h-5" />
                </div>
                <span className="font-semibold text-red-600 text-sm">Delete Account</span>
              </div>
            </button>
          </div>
        </section>

        <div className="text-center text-xs text-gray-400 pb-4">
          SNUGGLE v1.1.0
        </div>

      </div>
    </div>
  );
};

export default Settings;
