
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Chat, Theme } from '../types';
import { DBService } from '../services/database';
import { 
  ArrowLeft, Bell, BellOff, Image as ImageIcon, 
  Lock, Clock, Moon, Edit2, Search, MoreVertical, 
  ChevronRight, Users, Trash2, LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import SharedMediaGrid from '../components/chat/SharedMediaGrid';
import ThemePicker from '../components/chat/ThemePicker';

// Helper for Slide-Up Modal
const ModalSheet = ({ isOpen, onClose, title, children }: any) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl z-50 max-h-[85vh] overflow-hidden flex flex-col border-t border-white/10"
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">Close</button>
          </div>
          <div className="overflow-y-auto p-0 flex-1">
            {children}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

interface ChatDetailsProps {
  currentUser: User;
}

const ChatDetails: React.FC<ChatDetailsProps> = ({ currentUser }) => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'theme' | 'nicknames' | null>(null);

  useEffect(() => {
    if (chatId && currentUser.id) {
      loadDetails();
    }
  }, [chatId, currentUser.id]);

  const loadDetails = async () => {
    if (!chatId) return;
    try {
      const data = await DBService.getChatDetails(chatId, currentUser.id);
      
      // Fetch other user if direct
      if (data.participants.length === 2) {
        const otherId = data.participants.find(p => p !== currentUser.id);
        if (otherId) {
          const user = await DBService.getUserById(otherId);
          if (user) data.otherUser = user;
        }
      }
      setChat(data);
    } catch (e) {
      console.error('Failed to load chat details:', e);
      toast.error('Could not load details: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleMuteToggle = async () => {
    if (!chat) return;
    try {
      const newStatus = await DBService.toggleChatMute(chat.id, currentUser.id);
      setChat(prev => prev ? { ...prev, muted: newStatus } : null);
      toast.success(newStatus ? 'Notifications muted' : 'Notifications unmuted');
    } catch (e) {
      toast.error('Failed to update mute status');
    }
  };

  const handleThemeSelect = async (theme: Theme) => {
    if (!chat) return;
    try {
      await DBService.updateChatTheme(chat.id, theme.id);
      
      // Optimistic update
      setChat(prev => prev ? { ...prev, themeId: theme.id } : null);
      toast.success(`Theme updated to ${theme.name}`);
      setActiveModal(null);
    } catch (e) {
      toast.error('Failed to update theme');
    }
  };

  // Render Section Item
  const SettingsItem = ({ icon: Icon, label, value, onClick, destructive = false }: any) => (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
    >
      <Icon className={`w-5 h-5 ${destructive ? 'text-red-500' : 'text-gray-400'}`} />
      <div className="flex-1 text-left">
        <p className={`text-base font-medium ${destructive ? 'text-red-500' : 'text-gray-200'}`}>{label}</p>
        {value && <p className="text-xs text-gray-500">{value}</p>}
      </div>
      {!destructive && <ChevronRight className="w-4 h-4 text-gray-600" />}
    </button>
  );

  if (loading) {
    return <div className="h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  if (!chat) return null;

  const chatName = chat.otherUser 
    ? (chat.nicknames?.[chat.otherUser.id] || chat.otherUser.displayName || chat.otherUser.username)
    : "Group Chat";
    
  const chatAvatar = chat.otherUser?.avatar || chat.otherUser?.photoURL;

  return (
    <div className="h-full bg-black text-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold flex-1">Details</h1>
      </div>

      {/* Profile Section */}
      <div className="flex flex-col items-center py-8 px-4 border-b border-white/10">
        <div className="w-24 h-24 rounded-full bg-gray-800 overflow-hidden mb-4 ring-4 ring-black">
          {chatAvatar ? (
            <img src={chatAvatar} alt={chatName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl font-bold">
              {chatName[0].toUpperCase()}
            </div>
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-1">{chatName}</h2>
        <p className="text-sm text-gray-400 mb-6">
          {chat.otherUser?.username && `@${chat.otherUser.username} • `} Snuggle User
        </p>

        {/* Quick Actions */}
        <div className="flex gap-4 w-full max-w-sm justify-between px-4">
          <QuickAction 
            icon={Users} 
            label="Profile" 
            onClick={() => navigate(`/profile/${chat.otherUser?.id}`)} 
          />
          <QuickAction 
            icon={Search} 
            label="Search" 
            onClick={() => {/* Search in chat */}} 
          />
          <QuickAction 
            icon={chat.muted ? BellOff : Bell} 
            label={chat.muted ? "Unmute" : "Mute"} 
            active={chat.muted}
            onClick={handleMuteToggle} 
          />
          <QuickAction 
            icon={MoreVertical} 
            label="Options" 
            onClick={() => {/* Options */}} 
          />
        </div>
      </div>

      {/* Settings Section */}
      <div className="py-2">
        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Settings
        </div>
        
        <SettingsItem 
          icon={Moon} 
          label="Theme" 
          value={chat.themeId === 'default' ? 'Default' : 'Custom'}
          onClick={() => setActiveModal('theme')} 
        />
        
        <SettingsItem 
          icon={Clock} 
          label="Disappearing messages" 
          value="Off"
          onClick={() => toast.info('Coming soon')} 
        />
        
        <SettingsItem 
          icon={Lock} 
          label="Privacy and safety" 
          onClick={() => toast.info('Coming soon')} 
        />
        
        <SettingsItem 
          icon={Edit2} 
          label="Nicknames" 
          onClick={() => toast.info('Nicknames coming soon')} 
        />

        <SettingsItem 
          icon={Users} 
          label="Create a group chat" 
          onClick={() => toast.info('Group chat coming soon')} 
        />
      </div>

      {/* Shared Media */}
      <div className="py-4">
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Shared Media</span>
          <button className="text-xs text-cyan-500 font-medium">See All</button>
        </div>
        <SharedMediaGrid chatId={chat.id} />
      </div>

      {/* Danger Zone */}
      <div className="py-4 px-4 space-y-2">
        <button className="w-full p-3 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center gap-2 font-medium hover:bg-red-500/20 transition-colors">
          <Trash2 className="w-4 h-4" /> Clear Chat History
        </button>
        <button className="w-full p-3 rounded-lg bg-gray-800 text-gray-300 flex items-center justify-center gap-2 font-medium hover:bg-gray-700 transition-colors">
          <LogOut className="w-4 h-4" /> Block User
        </button>
      </div>

      {/* Modals */}
      <ModalSheet 
        isOpen={activeModal === 'theme'} 
        onClose={() => setActiveModal(null)}
        title="Chat Theme"
      >
        <ThemePicker 
          userId={currentUser.id} 
          currentThemeId={chat.themeId} 
          onSelect={handleThemeSelect} 
        />
      </ModalSheet>
    </div>
  );
};

const QuickAction = ({ icon: Icon, label, onClick, active }: any) => (
  <button onClick={onClick} className="flex flex-col items-center gap-2 group">
    <div className={`
      w-12 h-12 rounded-full flex items-center justify-center transition-colors
      ${active ? 'bg-white text-black' : 'bg-gray-800 text-white group-hover:bg-gray-700'}
    `}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-xs text-gray-400 font-medium">{label}</span>
  </button>
);

export default ChatDetails;
