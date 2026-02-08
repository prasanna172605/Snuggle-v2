
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Message } from '../types';
import { DBService } from '../services/database';
import { useCall } from '../context/CallContext';
import CameraCapture from '../components/CameraCapture';
import CallButton from '../components/CallButton';
import CallHistoryMessage from '../components/CallHistoryMessage';
import { ArrowLeft, Phone, Video, Send, Image as ImageIcon, Smile, Check, CheckCheck, Mic, Trash2, Camera, Trash } from 'lucide-react';
import { SkeletonChat } from '../components/common/Skeleton';

interface ChatProps {
  currentUser: User;
  otherUser: User;
  onBack: () => void;
}

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];
const EMOJIS = ['🫂', '🌍', '🤍', '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠', '🤥', '😶', '🫥', '😐', '🫤', '😑', '🫨', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

const Chat: React.FC<ChatProps> = ({ currentUser, otherUser, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(otherUser.isOnline);
  const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(true);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(15));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const visualizerIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { startCall } = useCall();
  const navigate = useNavigate();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNearBottomRef = useRef(true); // Track if user is near bottom for smart scroll
  const isInitialLoadRef = useRef(true); // Track initial load to scroll to bottom once

  const loadMessages = async () => {
    const msgs = await DBService.getMessages(currentUser.id, otherUser.id);
    setMessages(msgs);
    setLoading(false);
  };

  const checkPresence = async () => {
    const u = await DBService.getUserById(otherUser.id);
    if (u) setIsOtherUserOnline(u.isOnline);
  };

  useEffect(() => {
    checkPresence();

    // Real-time subscription for messages - enables instant status updates (including "seen")
    const unsubscribe = DBService.subscribeToMessages(currentUser.id, otherUser.id, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });

    const handleStorageChange = (e: StorageEvent | Event) => {
      if (e.type === 'local-storage-update' || (e instanceof StorageEvent && e.key === 'snuggle_messages_v1')) {
        loadMessages();
      }

      if (e.type === 'local-storage-typing' || (e instanceof StorageEvent && e.key === 'snuggle_typing_v1')) {
        const storedEvent = localStorage.getItem('snuggle_typing_v1');
        if (storedEvent) {
          const data = JSON.parse(storedEvent);
          if (data.senderId === otherUser.id && data.receiverId === currentUser.id) {
            if (Date.now() - data.timestamp < 5000) {
              setIsOtherUserTyping(data.isTyping);
            } else {
              setIsOtherUserTyping(false);
            }
          }
        }
      }

      if (e.type === 'local-storage-presence' || (e instanceof StorageEvent && e.key === 'snuggle_presence_v1')) {
        checkPresence();
      }
    };

    // Subscribe to typing status
    const unsubscribeTyping = DBService.subscribeToTyping(otherUser.id, currentUser.id, (isTyping) => {
      setIsOtherUserTyping(isTyping);
    });

    const interval = setInterval(() => {
      loadMessages();
      checkPresence();
      // Only keep interval for messages/presence polling if needed, typing is now real-time
    }, 2000);

    window.addEventListener('local-storage-update', handleStorageChange);
    window.addEventListener('local-storage-presence', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('click', handleClickOutside);

    return () => {
      unsubscribe(); // Cleanup real-time messages listener
      unsubscribeTyping(); // Cleanup typing listener
      clearInterval(interval);
      if (timerRef.current) clearInterval(timerRef.current);
      if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current);
      window.removeEventListener('local-storage-update', handleStorageChange);
      window.removeEventListener('local-storage-presence', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [currentUser.id, otherUser.id]);

  // Smart scroll: only scroll to bottom if user is near bottom or on initial load
  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Consider "near bottom" if within 150px of the bottom
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
  };

  useEffect(() => {
    // Only auto-scroll on initial load or if user is near the bottom
    if (isInitialLoadRef.current || isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: isInitialLoadRef.current ? 'auto' : 'smooth' });
      isInitialLoadRef.current = false;
    }

    // Mark messages as seen when new ones arrive and we are viewing them
    const markUnreadAsSeen = async () => {
      // Only mark as seen if the page is visible
      if (document.visibilityState !== 'visible') {
        console.log('[Chat] Page hidden, skipping markAsRead');
        return;
      }

      const unreadMessages = messages.filter(m => m.senderId === otherUser.id && (m.status as string) !== 'seen');
      if (unreadMessages.length > 0) {
        console.log(`[Chat] Found ${unreadMessages.length} unread messages, marking as read.`);
        const chatId = DBService.getChatId(currentUser.id, otherUser.id);
        await DBService.markMessagesAsRead(chatId, currentUser.id);
      }
    };
    markUnreadAsSeen();

    // Also listen for visibility changes (e.g. user comes back to tab)
    const handleVisibilityChange = () => {
      console.log('[Chat] Visibility changed:', document.visibilityState);
      if (document.visibilityState === 'visible') {
        markUnreadAsSeen();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [messages, currentUser.id, otherUser.id]);

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.reaction-menu') && !target.closest('.message-bubble')) {
      setReactingToMessageId(null);
    }
    if (!target.closest('.emoji-picker') && !target.closest('.emoji-btn')) {
      setShowEmojiPicker(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      DBService.sendTyping(currentUser.id, otherUser.id, true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      DBService.sendTyping(currentUser.id, otherUser.id, false);
    }, 2000);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    // Clear typing status immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    DBService.sendTyping(currentUser.id, otherUser.id, false);

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      receiverId: otherUser.id,
      text: inputText,
      timestamp: Date.now(),
      status: 'sent',
      type: 'text',
      read: false, // Added missing property
    };

    try {
      await DBService.sendMessage(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error);
    }

    setInputText('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Allow larger files since we're using Storage now (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large. Please select a file under 10MB.");
        return;
      }

      try {
        // Upload to Firebase Storage
        const path = `chat_media/${currentUser.id}/${Date.now()}_${file.name}`;
        const downloadUrl = await DBService.uploadMediaToStorage(file, path);

        const messageType = file.type.startsWith('video/') ? 'video' : 'image';
        const newMessage: Message = {
          id: Date.now().toString(),
          senderId: currentUser.id,
          receiverId: otherUser.id,
          text: downloadUrl,
          timestamp: Date.now(),
          status: 'sent',
          type: messageType,
          read: false,
        };
        await DBService.sendMessage(newMessage);
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload file. Please try again.');
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCameraCapture = (dataUrl: string, type: 'image' | 'video') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      receiverId: otherUser.id,
      text: dataUrl,
      timestamp: Date.now(),
      status: 'sent',
      type: type as any,
      read: false, // Added missing property
    };
    DBService.sendMessage(newMessage);
    setShowCamera(false);
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  // --- Voice Note Logic ---

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          // Send Audio Message
          const newMessage: Message = {
            id: Date.now().toString(),
            senderId: currentUser.id,
            receiverId: otherUser.id,
            text: base64Audio,
            timestamp: Date.now(),
            status: 'sent',
            type: 'audio',
            read: false, // Added missing property
          };
          DBService.sendMessage(newMessage);
        };

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Start Visualizer Simulation
      visualizerIntervalRef.current = setInterval(() => {
        setAudioLevels(Array.from({ length: 20 }, () => Math.floor(Math.random() * 60) + 20));
      }, 150);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please allow permissions.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current);
      setAudioLevels(new Array(20).fill(15)); // Reset
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());

      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current);
      audioChunksRef.current = [];
      setAudioLevels(new Array(20).fill(15)); // Reset
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  const handleTouchStart = (msgId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setReactingToMessageId(msgId);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    const chatId = DBService.getChatId(currentUser.id, otherUser.id);
    await DBService.reactToMessage(chatId, msgId, currentUser.id, emoji);
    setReactingToMessageId(null);
  };

  // NEW: Delete Message Logic (Simplified)
  const handleDeleteMessage = async (msgId: string) => {
    try {
      // Optimistic update
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setReactingToMessageId(null);

      const chatId = DBService.getChatId(currentUser.id, otherUser.id);
      await DBService.deleteMessage(chatId, msgId);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const getStatusIcon = (status: Message['status']) => {
    const iconClass = "w-3.5 h-3.5";
    if ((status as string) === 'seen') return <CheckCheck className={`${iconClass} text-blue-500`} strokeWidth={2.5} />;
    if (status === 'delivered') return <CheckCheck className={`${iconClass} text-white/70`} />;
    return <Check className={`${iconClass} text-white/70`} />;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white overflow-hidden relative font-['Plus_Jakarta_Sans']">
      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}

      {/* Floating Header */}
      <div className="flex-none mx-4 mt-2 px-4 py-3 flex items-center gap-3 backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 shadow-sm border border-white/50 dark:border-white/10 rounded-full z-20 absolute top-0 left-0 right-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-white" />
        </button>
        <div className="relative">
          <img src={otherUser.avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-700" />
          {isOtherUserOnline && <div className="absolute 1bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800" />}
        </div>
        <div className="flex-1 min-w-0 ml-1">
          <h2 className="font-bold text-[16px] truncate text-gray-900 dark:text-white">{otherUser.fullName}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium">
            {isOtherUserTyping ? 'typing...' : (isOtherUserOnline ? 'Active now' : 'Offline')}
          </p>
        </div>
        {/* Call Buttons */}
        <div className="flex gap-1">
          <CallButton
            onAudioCall={() => startCall(otherUser.id, 'audio')}
            onVideoCall={() => startCall(otherUser.id, 'video')}
          />
        </div>
      </div>



      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-24 pb-24 space-y-3 no-scrollbar relative z-10" ref={chatContainerRef} onScroll={handleChatScroll}>
        {loading ? (
          <div className="pt-10 px-2">
            <SkeletonChat />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isMe = msg.senderId === currentUser.id;
              const isLastInGroup = index === messages.length - 1 || messages[index + 1].senderId !== msg.senderId;
              const isFirstInGroup = index === 0 || messages[index - 1].senderId !== msg.senderId;
              const showTime = index === messages.length - 1 || (index < messages.length - 1 && messages[index + 1].timestamp - msg.timestamp > 300000);

              const roundedClass = isMe
                ? `${isFirstInGroup ? 'rounded-tr-2xl' : 'rounded-tr-[4px]'} ${isLastInGroup ? 'rounded-br-2xl' : 'rounded-br-[4px]'} rounded-l-2xl`
                : `${isFirstInGroup ? 'rounded-tl-2xl' : 'rounded-tl-[4px]'} ${isLastInGroup ? 'rounded-bl-2xl' : 'rounded-bl-[4px]'} rounded-r-2xl`;

              const showReactionMenu = reactingToMessageId === msg.id;

              // Reaction Logic
              const reactionCounts: Record<string, number> = {};
              if (msg.reactions) {
                Object.values(msg.reactions).forEach(r => {
                  reactionCounts[r] = (reactionCounts[r] || 0) + 1;
                });
              }
              const reactionEntries = Object.entries(reactionCounts);

              // Render call history message if type is 'call' (BEFORE accessing msg.text)
              if ((msg.type as string) === 'call') {
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full my-1"
                  >
                    <CallHistoryMessage
                      callType={msg.callType || 'audio'}
                      duration={msg.callDuration || 0}
                      timestamp={msg.timestamp}
                      status={msg.callStatus === 'rejected' ? 'declined' : (msg.callStatus || 'completed') as any}
                      isOutgoing={isMe}
                      onCallBack={() => startCall(otherUser.id, msg.callType || 'audio')}
                    />
                  </motion.div>
                );
              }

              const isVideo = msg.text.startsWith('data:video');

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-1'} group`}
                >
                  {!isMe && (
                    <div className="w-8 mr-2 flex-shrink-0 flex items-end">
                      {isLastInGroup && <img src={otherUser.avatar} className="w-8 h-8 rounded-full shadow-sm" />}
                    </div>
                  )}

                  <div
                    className={`relative max-w-[75%] transition-all duration-200`}
                    onTouchStart={() => handleTouchStart(msg.id)}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={() => handleTouchStart(msg.id)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setReactingToMessageId(msg.id);
                    }}
                  >
                    {/* Reaction Menu */}
                    <AnimatePresence>
                      {showReactionMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 10 }}
                          className={`absolute bottom-full mb-2 ${isMe ? 'right-0' : 'left-0'} bg-white dark:bg-dark-border rounded-full shadow-xl p-1.5 flex gap-1 z-20 reaction-menu items-center border border-gray-100 dark:border-gray-700`}
                        >
                          {REACTIONS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={(e) => { e.stopPropagation(); handleReact(msg.id, emoji); }}
                              className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90"
                            >
                              {emoji}
                            </button>
                          ))}
                          {isMe && (
                            <div className="pl-1 ml-1 border-l border-gray-200 dark:border-gray-600">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                                className="w-9 h-9 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors active:scale-90"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className={`
                      message-bubble px-3 py-2 shadow-sm relative z-10
                      ${isMe
                        ? `bg-primary text-white ${roundedClass}`
                        : `bg-gray-100 dark:bg-dark-border text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-dark-border ${roundedClass}`
                      }
                    `}>
                      <div className="flex flex-col">
                        {msg.type === 'audio' ? (
                          <div className="min-w-[200px] py-1 flex items-center">
                            <audio
                              controls
                              src={msg.text}
                              className={`h-8 w-full rounded-lg ${isMe ? 'opacity-90 invert brightness-0 grayscale contrast-200' : 'dark:invert dark:brightness-0 dark:contrast-200'}`}
                              style={isMe ? { filter: 'invert(1) brightness(2)' } : {}}
                            />
                          </div>
                        ) : msg.type === 'image' || isVideo ? (
                          <div className="mb-1">
                            {isVideo ? (
                              <video
                                src={msg.text}
                                controls
                                className="max-w-full rounded-lg object-cover max-h-[300px]"
                                style={{ minWidth: '150px' }}
                              />
                            ) : (
                              <img
                                src={msg.text}
                                alt="Shared photo"
                                className="max-w-full rounded-lg object-cover max-h-[300px]"
                                style={{ minWidth: '150px' }}
                                onClick={() => window.open(msg.text, '_blank')}
                              />
                            )}
                          </div>
                        ) : msg.type === 'post' && msg.post ? (
                          <div
                            className="bg-white dark:bg-dark-card rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border cursor-pointer hover:opacity-95 transition-opacity max-w-[260px] my-1"
                            onClick={() => navigate(`/post/${msg.post?.id}`)}
                          >
                            {msg.post.imageUrl && (
                              <div className="w-full h-32 overflow-hidden bg-gray-100 dark:bg-dark-bg">
                                <img src={msg.post.imageUrl} className="w-full h-full object-cover" alt="Post preview" />
                              </div>
                            )}
                            <div className="p-3">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Shared Post</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-snug">
                                {msg.post.caption || 'Check out this post'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[15px] leading-relaxed break-words whitespace-pre-wrap font-medium">
                            {msg.text}
                            <span className="inline-block w-12 h-0"></span>
                          </span>
                        )}

                        <div className={`flex items-center gap-1 self-end mt-1.5 ml-auto ${isMe ? 'text-snuggle-100' : 'text-gray-400 dark:text-gray-500'}`}>
                          <span className="text-[10px] font-medium opacity-90">
                            {formatTime(msg.timestamp)}
                          </span>
                          {isMe && (
                            <span>
                              {getStatusIcon(msg.status)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {reactionEntries.length > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} flex gap-0.5 z-10`}
                      >
                        {reactionEntries.map(([emoji, count]) => (
                          <div key={emoji} className="bg-white dark:bg-dark-border border border-gray-100 dark:border-gray-700 shadow-sm rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 text-gray-800 dark:text-gray-200">
                            <span>{emoji}</span>
                            {count > 1 && <span className="font-bold">{count}</span>}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        <AnimatePresence>
          {isOtherUserTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-start mt-2"
            >
              <div className="w-8 mr-2 flex-shrink-0 flex items-end">
                <img src={otherUser.avatar} className="w-8 h-8 rounded-full shadow-sm" />
              </div>
              <div className="bg-white dark:bg-dark-border px-4 py-3 rounded-2xl rounded-tl-md shadow-sm flex items-center space-x-1.5 border border-gray-100 dark:border-gray-700">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                    animate={{ y: [0, -5, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Area */}
      <div className="mx-4 mb-4 rounded-[2.5rem] p-2 flex items-end gap-2 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-20 border border-white/60 dark:border-white/10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl transition-all">
        {showEmojiPicker && (
          <div
            className="absolute bottom-full left-0 mb-4 w-full bg-white/90 dark:bg-slate-800/90 border border-white/50 dark:border-white/10 rounded-3xl shadow-xl p-3 z-30 emoji-picker backdrop-blur-xl"
            style={{ maxHeight: '40vh', overflowY: 'auto' }}
          >
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-2xl hover:bg-black/5 dark:hover:bg-white/10 rounded-xl p-2 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {isRecording ? (
          <div className="flex-1 bg-red-50/50 dark:bg-red-900/20 backdrop-blur-sm rounded-full flex items-center justify-between px-4 py-3 border border-red-100 dark:border-red-900 transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-3 h-3">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                <div className="relative w-2 h-2 bg-red-600 rounded-full" />
              </div>
              <span className="text-red-600 dark:text-red-400 font-mono font-bold text-sm min-w-[40px]">{formatDuration(recordingDuration)}</span>
            </div>

            {/* Waveform */}
            <div className="flex items-center justify-center gap-[3px] h-8 flex-1 mx-4">
              {audioLevels.map((height, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-red-400 to-orange-400 rounded-full transition-all duration-150 ease-in-out"
                  style={{ height: `${height}%`, opacity: Math.max(0.4, height / 100) }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-transparent flex items-center px-2 py-1">
            <button
              className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors"
              onClick={() => setShowCamera(true)}
            >
              <Camera className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="Message..."
              className="bg-transparent flex-1 focus:outline-none text-[16px] text-gray-800 dark:text-gray-100 placeholder-gray-400 px-3 max-h-32"
            />
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
            <button
              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-6 h-6" />
            </button>
            <button
              className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'} emoji-btn`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-6 h-6" />
            </button>
          </div>
        )}

        {isRecording ? (
          <div className="flex items-end gap-2">
            <button onClick={handleCancelRecording} className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <Trash2 className="w-6 h-6" />
            </button>
            <button onClick={handleStopRecording} className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transform hover:scale-105 transition-all">
              <Send className="w-5 h-5 translate-x-0.5 translate-y-0.5" fill="currentColor" />
            </button>
          </div>
        ) : (
          <button
            onClick={inputText.trim() ? handleSend : handleStartRecording}
            className={`p-3 rounded-full transition-all duration-300 shadow-md ${inputText.trim()
              ? 'bg-amber-400 text-white hover:bg-amber-500 transform hover:scale-105'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            {inputText.trim() ? (
              <Send className="w-5 h-5 translate-x-0.5 translate-y-0.5" fill="currentColor" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
    </div >
  );
};

export default Chat;
