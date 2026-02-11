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
      <div className="fixed bottom-0 left-0 right-0 flex justify-center z-30 pb-safe safe-bottom pointer-events-none">
        <div className="bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-soft shadow-xl rounded-t-3xl md:rounded-full md:bottom-6 md:mb-6 px-6 py-3 flex items-center justify-around md:justify-center md:gap-8 w-full md:max-w-lg pointer-events-auto h-[80px]">

          <NavItem to="/" icon={Image} label="Memories" />
          <NavItem to="/messages" icon={MessageCircle} label="Messages" />

          {/* Create Button - Centered & Distinct */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="w-14 h-14 -mt-6 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/30 transform hover:scale-105 active:scale-95 transition-all mx-2 ring-4 ring-warm-neutral dark:ring-black"
            aria-label="Create post"
          >
            <Plus className="w-8 h-8" strokeWidth={2.5} />
          </button>

          <NavItem to="/notifications" icon={Bell} label="Notifications" />
          <NavItem to="/profile" icon={User} label="Profile" />

        </div>
      </div>

      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
    </>
  );
};

export default BottomNav;
