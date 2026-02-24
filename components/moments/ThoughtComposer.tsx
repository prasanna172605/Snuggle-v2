import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Smile } from 'lucide-react';
import { ThoughtService } from '../../services/thoughtService';

interface ThoughtComposerProps {
  userId: string;
  existingText?: string;
  onClose: () => void;
  onPublished: () => void;
}

const THOUGHT_EMOJIS = ['💭','💬','✨','🔥','😊','😂','❤️','🎵','📚','💡','🌸','⚡'];

const ThoughtComposer: React.FC<ThoughtComposerProps> = ({ userId, existingText, onClose, onPublished }) => {
  const [text, setText] = useState(existingText || '');
  const [emoji, setEmoji] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const maxLen = 60;
  const remaining = maxLen - text.length;

  const handlePublish = async () => {
    if (!text.trim()) return;
    setPublishing(true);
    try {
      await ThoughtService.createThought(userId, text.trim(), emoji || undefined);
      onPublished();
      onClose();
    } catch (err) {
      console.error('Failed to publish thought:', err);
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await ThoughtService.deleteThought(userId);
      onPublished();
      onClose();
    } catch (err) {
      console.error('Failed to delete thought:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-zinc-900 rounded-3xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">Share a Thought</h3>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Input */}
        <div className="relative">
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, maxLen))}
            placeholder="What's on your mind?"
            maxLength={maxLen}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-white text-sm placeholder-zinc-500 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            autoFocus
          />
          <span className={`absolute bottom-2 right-3 text-xs ${remaining < 10 ? 'text-red-400' : 'text-zinc-500'}`}>
            {remaining}
          </span>
        </div>

        {/* Emoji picker */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className={`p-2 rounded-xl transition ${showEmoji ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'}`}
          >
            <Smile className="w-5 h-5" />
          </button>
          {emoji && (
            <span className="text-2xl">{emoji}</span>
          )}
        </div>

        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-6 gap-2 pt-1">
                {THOUGHT_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => { setEmoji(e); setShowEmoji(false); }}
                    className={`text-2xl p-2 rounded-xl transition ${emoji === e ? 'bg-blue-500/20' : 'hover:bg-zinc-800'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2">
          {existingText && (
            <button
              onClick={handleDelete}
              className="flex-1 py-3 bg-red-500/10 text-red-400 rounded-xl font-semibold text-sm"
            >
              Delete
            </button>
          )}
          <button
            onClick={handlePublish}
            disabled={!text.trim() || publishing}
            className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {publishing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Share
              </>
            )}
          </button>
        </div>

        <p className="text-zinc-600 text-[10px] text-center">Thoughts expire after 24 hours</p>
      </motion.div>
    </motion.div>
  );
};

export default ThoughtComposer;
