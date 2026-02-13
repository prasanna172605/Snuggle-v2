import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageCircle, User, Plus, Bell, Image } from 'lucide-react';
import UploadModal from './UploadModal';

interface BottomNavProps {
  unreadCount: number;
  unreadMessagesCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ unreadCount, unreadMessagesCount = 0 }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const location = useLocation();

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center min-w-[56px] min-h-[56px] rounded-2xl transition-all duration-300 ${isActive
            ? 'text-accent dark:text-accent-light bg-warm-neutral dark:bg-snuggle-900/20 scale-105'
            : 'text-gray-400 dark:text-gray-500 hover:bg-white/50 dark:hover:bg-white/5 active:scale-95'
          }`
        }
        aria-label={label}
      >
        {({ isActive }) => (
          <div className="relative">
            <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            {to === '/notifications' && unreadCount > 0 && (
              <span
                className="absolute top-0 right-0 w-2.5 h-2.5 bg-accent rounded-full border-2 border-white dark:border-black"
                aria-label="Unread notifications"
              />
            )}
            {to === '/messages' && unreadMessagesCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-accent rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-black"
                aria-label="Unread messages"
              >
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </div>
        )}
      </NavLink>
    );
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        
        {/* SVG Background Layer */}
        <div className="absolute bottom-0 w-full h-[80px] drop-shadow-[0_-5px_10px_rgba(0,0,0,0.05)] text-white dark:text-black pointer-events-auto">
          <svg
            viewBox="0 0 375 80"
            className="w-full h-full fill-current"
            preserveAspectRatio="none"
          >
            <path d="M0,0 L140,0 C155,0 160,35 187.5,35 C215,35 220,0 235,0 L375,0 L375,80 L0,80 Z" />
          </svg>
        </div>

        {/* Content Layer */}
        <div className="relative w-full h-[80px] max-w-lg mx-auto flex items-center justify-between px-6 pointer-events-auto">
          
          {/* Left Icons */}
          <div className="flex gap-8 mb-2">
            <NavItem to="/" icon={Image} label="Memories" />
            <NavItem to="/messages" icon={MessageCircle} label="Messages" />
          </div>

          {/* Center FAB */}
          <div className="absolute left-1/2 -top-6 -translate-x-1/2">
             <button
              onClick={() => setShowUploadModal(true)}
              className="w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/40 transform hover:scale-105 active:scale-95 transition-all"
              aria-label="Create post"
            >
              <Plus className="w-8 h-8 text-white" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right Icons */}
          <div className="flex gap-8 mb-2">
            <NavItem to="/notifications" icon={Bell} label="Notifications" />
            <NavItem to="/profile" icon={User} label="Profile" />
          </div>

        </div>
      </div>

      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
    </>
  );
};

export default BottomNav;
