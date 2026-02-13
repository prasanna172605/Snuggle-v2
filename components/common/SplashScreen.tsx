import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800); // Wait for exit animation
    }, 2500); // Show for 2.5 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#2452f5]"
        >
          <div className="relative">
            {/* Reveal Animation for Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
              }}
              transition={{ 
                duration: 1.2, 
                ease: "easeOut",
              }}
              className="flex flex-col items-center"
            >
              <div className="w-80 h-80 md:w-[450px] md:h-[450px] relative rounded-full overflow-hidden flex items-center justify-center border-4 border-white/20 shadow-2xl bg-white/5">
                <img 
                  src="/logo-reveal.png" 
                  alt="Snuggle Logo" 
                  className="w-full h-full object-cover scale-125"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const text = document.createElement('h1');
                      text.className = "text-6xl font-bold text-white";
                      text.innerText = "Snuggle";
                      parent.appendChild(text);
                    }
                  }}
                />
                
                {/* Reveal Overlay Effect */}
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                  className="absolute inset-0 bg-white/10 backdrop-blur-sm transform skew-x-12"
                />
              </div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1 }}
                className="mt-8 text-5xl font-extrabold tracking-tight text-white drop-shadow-lg"
              >
                Snuggle
              </motion.h1>
            </motion.div>

            {/* Subtle background glow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.4, scale: 1.5 }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
              className="absolute -inset-40 bg-white/5 blur-[120px] -z-10 rounded-full"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
