
import React from 'react';
import { motion } from 'framer-motion';

interface TypingBubbleProps {
  avatar?: string;
}

const TypingBubble: React.FC<TypingBubbleProps> = ({ avatar }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
      className="flex items-end gap-2 mt-2 mb-4"
    >
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-dark-border">
         {avatar ? (
             <img src={avatar} className="w-full h-full object-cover" alt="typing" />
         ) : (
             <div className="w-full h-full bg-gray-300 dark:bg-gray-700 animate-pulse" />
         )}
      </div>

      <div className="bg-white dark:bg-dark-surface px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 dark:border-dark-border flex items-center gap-1.5 h-[38px]">
        <motion.span
          className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </motion.div>
  );
};

export default TypingBubble;
