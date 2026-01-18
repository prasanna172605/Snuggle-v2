
import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { DBService } from '../services/database';
import { useCall } from '../context/CallContext';
import CameraCapture from '../components/CameraCapture';
import CallButton from '../components/CallButton';
import CallHistoryMessage from '../components/CallHistoryMessage';
import { ArrowLeft, Phone, Video, Send, Image as ImageIcon, Smile, Check, CheckCheck, Mic, Trash2, Camera, Trash } from 'lucide-react';

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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Mark messages as seen when new ones arrive and we are viewing them
    const markUnreadAsSeen = async () => {
      // Only mark as seen if the page is visible
      if (document.visibilityState !== 'visible') {
        console.log('[Chat] Page hidden, skipping markAsRead');
        return;
      }

      const unreadMessages = messages.filter(m => m.senderId === otherUser.id && m.status !== 'seen');
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
    };

    try {
      await DBService.sendMessage(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error);
    }

    setInputText('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image too large. Please select an image under 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        const newMessage: Message = {
          id: Date.now().toString(),
          senderId: currentUser.id,
          receiverId: otherUser.id,
          text: base64Image,
          timestamp: Date.now(),
          status: 'sent',
          type: 'image',
        };
        DBService.sendMessage(newMessage);
      };
      reader.readAsDataURL(file);
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
    if (status === 'seen') return <CheckCheck className={`${iconClass} text-blue-500`} strokeWidth={2.5} />;
    if (status === 'delivered') return <CheckCheck className={`${iconClass} text-white/70`} />;
    return <Check className={`${iconClass} text-white/70`} />;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0f1014] text-white overflow-hidden relative font-['Plus_Jakarta_Sans']">
      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}

      {/* Header */}
      <div className="flex-none px-4 py-3 flex items-center gap-3 backdrop-blur-xl bg-[#0f1014]/80 z-20 sticky top-0 border-b border-white/5">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="relative">
          <img src={otherUser.avatar} className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10" />
          {isOtherUserOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f1014]" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[15px] truncate">{otherUser.fullName}</h2>
          <p className="text-xs text-white/40 truncate">
            {isOtherUserTyping ? 'typing...' : (isOtherUserOnline ? 'Active now' : 'Offline')}
          </p>
        </div>
        {/* Call Buttons */}
        <CallButton
          onAudioCall={() => startCall(otherUser.id, 'audio')}
          onVideoCall={() => startCall(otherUser.id, 'video')}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-10" ref={chatContainerRef}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          messages.map((msg, index) => {
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
            if (msg.type === 'call') {
              return (
                <div key={msg.id} className="w-full my-1">
                  <CallHistoryMessage
                    callType={msg.callType || 'audio'}
                    duration={msg.callDuration || 0}
                    timestamp={msg.timestamp}
                    status={msg.callStatus || 'completed'}
                    isOutgoing={isMe}
                    onCallBack={() => startCall(otherUser.id, msg.callType || 'audio')}
                  />
                </div>
              );
            }

            const isVideo = msg.text.startsWith('data:video');

            return (
              <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-1'} group`}>
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
                  {showReactionMenu && (
                    <div className={`absolute bottom-full mb-2 ${isMe ? 'right-0' : 'left-0'} bg-white dark:bg-dark-border rounded-full shadow-xl p-1.5 flex gap-1 z-20 animate-in zoom-in-50 duration-200 reaction-menu items-center border border-gray-100 dark:border-gray-700`}>
                      {REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={(e) => { e.stopPropagation(); handleReact(msg.id, emoji); }}
                          className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-90"
                        >
                          {emoji}
                        </button>
                      ))}
                      {/* Delete Option for own messages */}
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
                    </div>
                  )}

                  <div className={`
                    message-bubble px-3 py-2 shadow-sm relative z-10
                    ${isMe
                      ? `bg-gradient-to-br from-snuggle-500 to-snuggle-600 text-white ${roundedClass}`
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
                    <div className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} flex gap-0.5 z-10`}>
                      {reactionEntries.map(([emoji, count]) => (
                        <div key={emoji} className="bg-white dark:bg-dark-border border border-gray-100 dark:border-gray-700 shadow-sm rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 text-gray-800 dark:text-gray-200">
                          <span>{emoji}</span>
                          {count > 1 && <span className="font-bold">{count}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }))}

        {isOtherUserTyping && (
          <div className="flex justify-start mt-2">
            <div className="w-8 mr-2 flex-shrink-0 flex items-end">
              <img src={otherUser.avatar} className="w-8 h-8 rounded-full shadow-sm" />
            </div>
            <div className="bg-white dark:bg-dark-border px-4 py-3 rounded-2xl rounded-tl-md shadow-sm flex items-center space-x-1 border border-gray-100 dark:border-gray-700">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bento Island */}
      <div className="bg-white dark:bg-dark-card rounded-bento px-3 py-2 flex items-end gap-2 shrink-0 shadow-sm relative z-20 border border-transparent dark:border-dark-border transition-colors">
        {showEmojiPicker && (
          <div
            className="absolute bottom-full left-0 mb-2 w-full max-w-[320px] bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl shadow-xl p-2 z-30 emoji-picker"
            style={{ maxHeight: '40vh', overflowY: 'auto' }}
          >
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {isRecording ? (
          <div className="flex-1 bg-red-50/50 dark:bg-red-900/20 backdrop-blur-sm rounded-[24px] flex items-center justify-between px-4 py-2 mb-0.5 border border-red-100 dark:border-red-900 transition-all duration-200">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-3 h-3">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                <div className="relative w-2 h-2 bg-red-600 rounded-full" />
              </div>
              <span className="text-red-600 dark:text-red-400 font-mono font-bold text-sm min-w-[40px]">{formatDuration(recordingDuration)}</span>
            </div>

            {/* Waveform */}
            <div className="flex items-center justify-center gap-[2px] h-6 flex-1 mx-4">
              {audioLevels.map((height, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-400 rounded-full transition-all duration-150 ease-in-out"
                  style={{ height: `${height}%`, opacity: Math.max(0.3, height / 100) }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-gray-100 dark:bg-dark-border rounded-[24px] flex items-center px-4 py-2 mb-0.5 border border-transparent focus-within:border-snuggle-300 focus-within:bg-white dark:focus-within:bg-black transition-all">
            <button
              className="mr-2 text-gray-400 hover:text-snuggle-500 transition-colors"
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
              className="bg-transparent flex-1 focus:outline-none text-[15px] text-gray-800 dark:text-gray-100 placeholder-gray-500 max-h-32"
            />
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
            <button
              className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-6 h-6" />
            </button>
            <button
              className={`ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 emoji-btn ${showEmojiPicker ? 'text-snuggle-500' : ''}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-6 h-6" />
            </button>
          </div>
        )}

        {isRecording ? (
          <div className="flex items-end gap-2 mb-0.5">
            <button onClick={handleCancelRecording} className="p-3 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:text-red-500 hover:bg-gray-300 rounded-full transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={handleStopRecording} className="p-3 bg-snuggle-500 text-white rounded-full hover:bg-snuggle-600 shadow-md">
              <Send className="w-5 h-5 translate-x-0.5 translate-y-0.5" fill="currentColor" />
            </button>
          </div>
        ) : (
          <button
            onClick={inputText.trim() ? handleSend : handleStartRecording}
            className={`p-3 rounded-full transition-all duration-200 mb-0.5 shadow-sm ${inputText.trim()
              ? 'bg-snuggle-500 text-white hover:bg-snuggle-600 transform hover:scale-105'
              : 'bg-snuggle-100 dark:bg-gray-700 text-snuggle-600 dark:text-snuggle-300 hover:bg-snuggle-200 dark:hover:bg-gray-600'
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
    </div>
  );
};

export default Chat;
