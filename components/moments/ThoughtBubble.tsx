import React from 'react';
import { Thought, User } from '../../types';

interface ThoughtBubbleProps {
  thought: Thought;
  user: User;
  isOwn: boolean;
  onTap: () => void;
}

const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({ thought, user, isOwn, onTap }) => {
  return (
    <button onClick={onTap} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[78px] relative group">
      {/* Bubble */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 w-full flex justify-center pointer-events-none">
        <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-2xl px-2.5 py-1.5 min-w-[40px] max-w-[70px] shadow-sm relative">
          <p className="text-[10px] text-zinc-800 dark:text-zinc-100 font-medium leading-tight line-clamp-2 text-center">
            {thought.emoji && <span className="mr-0.5">{thought.emoji}</span>}
            {thought.text}
          </p>
          {/* Triangle pointer - more subtle and positioned better */}
          <div className="absolute -bottom-1 left-[50%] -translate-x-1/2 w-2 h-2 bg-white/90 dark:bg-zinc-800/90 border-b border-r border-white/20 dark:border-white/5 rotate-45" />
        </div>
      </div>

      {/* Avatar Container */}
      <div className="relative mt-4">
        <div className={`w-[60px] h-[60px] rounded-full overflow-hidden border-[2px] shadow-sm ${isOwn ? 'border-blue-500/50' : 'border-zinc-200 dark:border-zinc-800/50'}`}>
          {user.avatar ? (
            <img src={user.avatar} className="w-full h-full object-cover" alt={user.username} />
          ) : (
            <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 font-bold text-lg">
              {(user.fullName || user.username || '?')[0].toUpperCase()}
            </div>
          )}
        </div>
        
        {/* Unseen indicator if needed, though for thoughts usually not prominent like stories */}
      </div>

      {/* Name */}
      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate w-full text-center">
        {isOwn ? 'Your note' : (user.fullName || user.username).split(' ')[0]}
      </span>
    </button>
  );
};

export default ThoughtBubble;
