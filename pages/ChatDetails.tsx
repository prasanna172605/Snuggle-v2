
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Chat, Theme, Pulse, PULSE_LEVELS } from '../types';
import { DBService } from '../services/database';
import { PulseService } from '../services/pulseService';
import { 
  ArrowLeft, Bell, BellOff, Image as ImageIcon, 
  Lock, Moon, Edit2, Search, MoreVertical, 
  ChevronRight, Users, Trash2, LogOut, Flame, Zap, Star
} from 'lucide-react';
import { toast } from 'sonner';
import SharedMediaGrid from '../components/chat/SharedMediaGrid';
import ThemePicker from '../components/chat/ThemePicker';

// Pulse Level Styles
const LEVEL_STYLES: Record<string, { gradient: string; glow: string; emoji: string }> = {
  spark:    { gradient: 'from-amber-400 to-orange-500',   glow: 'shadow-amber-500/30',   emoji: '✨' },
  glow:     { gradient: 'from-cyan-400 to-blue-500',      glow: 'shadow-cyan-500/30',     emoji: '💫' },
  flame:    { gradient: 'from-orange-500 to-red-500',     glow: 'shadow-red-500/30',      emoji: '🔥' },
  fusion:   { gradient: 'from-purple-500 to-pink-500',    glow: 'shadow-purple-500/30',   emoji: '💜' },
  infinity: { gradient: 'from-yellow-400 to-amber-600',   glow: 'shadow-yellow-500/40',   emoji: '♾️' },
};

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
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'theme' | null>(null);

  useEffect(() => {
    if (chatId && currentUser.id) {
      loadDetails();
    }
  }, [chatId, currentUser.id]);

  // Subscribe to pulse updates
  useEffect(() => {
    if (!chat?.otherUser?.id || !currentUser.id) return;
    const unsub = PulseService.subscribeToPulse(currentUser.id, chat.otherUser.id, (p) => {
      setPulse(p);
    });
    return () => unsub();
  }, [chat?.otherUser?.id, currentUser.id]);

  const loadDetails = async () => {
    if (!chatId) return;
    try {
      const data = await DBService.getChatDetails(chatId, currentUser.id);
      
      if (data.participants.length === 2) {
        const otherId = data.participants.find(p => p !== currentUser.id);
        if (otherId) {
          const user = await DBService.getUserById(otherId);
          if (user) data.otherUser = user;

          // Load pulse
          const p = await PulseService.getPulse(currentUser.id, otherId);
          setPulse(p);
        }
      }
      setChat(data);
    } catch (e) {
      console.error('Failed to load chat details:', e);
      toast.error('Could not load details');
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
      setChat(prev => prev ? { ...prev, themeId: theme.id } : null);
      toast.success(`Theme updated to ${theme.name}`);
      setActiveModal(null);
    } catch (e) {
      toast.error('Failed to update theme');
    }
  };

  if (loading) {
    return <div className="h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  if (!chat) return null;

  const chatName = chat.otherUser 
    ? (chat.nicknames?.[chat.otherUser.id] || chat.otherUser.displayName || chat.otherUser.username)
    : "Chat";
    
  const chatAvatar = chat.otherUser?.avatar || chat.otherUser?.photoURL;

  // Pulse calculations
  const level = pulse?.pulseLevel ?? 0;
  const levelInfo = PulseService.getLevelByIndex(level);
  const style = LEVEL_STYLES[levelInfo?.theme || 'spark'];
  const progress = pulse ? PulseService.getProgressToNextLevel(pulse.totalEnergy) : 0;
  const isMaxLevel = level >= PULSE_LEVELS.length - 1;
  const nextIdx = Math.min(level + 1, PULSE_LEVELS.length - 1);
  const nextLevelInfo = !isMaxLevel ? PULSE_LEVELS[nextIdx] : null;
  const dailyCap = 50;

  return (
    <div className="h-full bg-black text-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold flex-1">Pulse Space</h1>
      </div>

      {/* Profile Section */}
      <div className="flex flex-col items-center py-8 px-4">
        <div className="w-24 h-24 rounded-full bg-gray-800 overflow-hidden mb-4 ring-4 ring-black">
          {chatAvatar ? (
            <img src={chatAvatar} alt={chatName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl font-bold">
              {chatName[0]?.toUpperCase()}
            </div>
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-1">{chatName}</h2>
        <p className="text-sm text-gray-400 mb-6">
          {chat.otherUser?.username && `@${chat.otherUser.username}`}
        </p>

        {/* Quick Actions */}
        <div className="flex gap-4 w-full max-w-sm justify-center px-4 mb-8">
          <QuickAction 
            icon={Users} 
            label="Profile" 
            onClick={() => navigate(`/profile/${chat.otherUser?.id}`)} 
          />
          <QuickAction 
            icon={chat.muted ? BellOff : Bell} 
            label={chat.muted ? "Unmute" : "Mute"} 
            active={chat.muted}
            onClick={handleMuteToggle} 
          />
          <QuickAction 
            icon={Moon} 
            label="Theme" 
            onClick={() => setActiveModal('theme')} 
          />
        </div>
      </div>

      {/* ========== PULSE CARD ========== */}
      <div className="px-4 pb-6">
        <motion.div 
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${style.gradient} p-[1px] shadow-lg ${style.glow}`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-black/80 backdrop-blur-sm rounded-3xl p-6">
            {/* Level Badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{levelInfo.emoji}</span>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Pulse Level {level}</p>
                  <h3 className={`text-2xl font-black bg-gradient-to-r ${style.gradient} bg-clip-text text-transparent`}>
                    {levelInfo?.name || 'New'}
                  </h3>
                </div>
              </div>
              {pulse && pulse.streakDays > 0 && (
                <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-orange-300">{pulse.streakDays}</span>
                </div>
              )}
            </div>

            {/* Energy Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  Pulse Energy
                </span>
                <span className="text-gray-400">
                  {isMaxLevel ? 'MAX' : `${Math.round(progress)}%`}
                </span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full rounded-full bg-gradient-to-r ${style.gradient}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${isMaxLevel ? 100 : progress}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                />
              </div>
            </div>

            {/* Daily Energy Meter */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">Today's Energy</span>
                <span className="text-gray-500">{pulse?.pulseEnergy ?? 0}/{dailyCap}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-green-500/60 transition-all duration-500"
                  style={{ width: `${Math.min(100, ((pulse?.pulseEnergy ?? 0) / dailyCap) * 100)}%` }}
                />
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-white/5 rounded-2xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Today</p>
                <p className="text-lg font-bold text-white">{pulse?.pulseEnergy ?? 0}</p>
                <p className="text-[10px] text-gray-500">energy</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Total</p>
                <p className="text-lg font-bold text-white">{pulse?.totalEnergy ?? 0}</p>
                <p className="text-[10px] text-gray-500">lifetime</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Streak</p>
                <p className="text-lg font-bold text-white">{pulse?.streakDays ?? 0}🔥</p>
                <p className="text-[10px] text-gray-500">days</p>
              </div>
            </div>

            {/* Next Level Preview */}
            {nextLevelInfo && (
              <div className="mt-4 bg-white/5 rounded-2xl p-3 flex items-center gap-3">
                <Star className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Next unlock at {nextLevelInfo.minEnergy} energy</p>
                  <p className="text-sm font-semibold text-white">
                    {nextLevelInfo.emoji} {nextLevelInfo.name} — New theme & badge
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
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
      <div className="py-4 px-4 space-y-2 pb-24">
        <button className="w-full p-3 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center gap-2 font-medium hover:bg-red-500/20 transition-colors">
          <Trash2 className="w-4 h-4" /> Clear Chat History
        </button>
        <button className="w-full p-3 rounded-lg bg-gray-800 text-gray-300 flex items-center justify-center gap-2 font-medium hover:bg-gray-700 transition-colors">
          <LogOut className="w-4 h-4" /> Block User
        </button>
      </div>

      {/* Theme Modal */}
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
