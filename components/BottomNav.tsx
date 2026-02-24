import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageCircle, User, Bell } from 'lucide-react';

interface BottomNavProps {
  unreadCount: number;
  unreadMessagesCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ unreadCount, unreadMessagesCount = 0 }) => {

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center min-w-[56px] min-h-[56px] rounded-2xl transition-all duration-300 ${isActive
            ? 'text-snuggle-500 dark:text-snuggle-400 bg-snuggle-50 dark:bg-snuggle-900/20 scale-105'
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
                className="absolute top-0 right-0 w-2.5 h-2.5 bg-snuggle-500 rounded-full border-2 border-white dark:border-black"
                aria-label="Unread notifications"
              />
            )}
            {to === '/' && unreadMessagesCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-snuggle-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-black"
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
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10">
        <div className="w-full max-w-lg mx-auto flex items-center justify-around px-6 py-2">
          <NavItem to="/" icon={MessageCircle} label="Chats" />
          <NavItem to="/notifications" icon={Bell} label="Notifications" />
          <NavItem to="/profile" icon={User} label="Profile" />
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
