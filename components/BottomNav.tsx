import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, MessageCircle, User, Plus, Bell } from 'lucide-react';

interface BottomNavProps {
  unreadCount: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ unreadCount }) => {
  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center min-w-[56px] min-h-[56px] rounded-full transition-all duration-300 ${isActive ? 'bg-black text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-gray-100 active:scale-95'
          }`
        }
        aria-label={label}
      >
        {({ isActive }) => (
          <div className="relative">
            <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-[1.5]'}`} />
            {to === '/notifications' && unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white flex items-center justify-center"
                aria-label={`${unreadCount} unread notifications`}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        )}
      </NavLink>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center z-30 pb-safe safe-bottom">
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] rounded-t-3xl md:rounded-full md:bottom-6 md:mb-6 px-4 py-3 flex items-center justify-around md:justify-center md:gap-2 w-full md:max-w-md">

        <NavItem to="/" icon={Home} label="Home" />
        <NavItem to="/messages" icon={MessageCircle} label="Messages" />

        {/* Create Button - Centered & Distinct */}
        <NavLink
          to="/create"
          className="w-14 h-14 bg-snuggle-500 hover:bg-snuggle-600 active:bg-snuggle-700 rounded-full flex items-center justify-center shadow-lg hover:shadow-snuggle-500/40 transition-all transform hover:scale-105 active:scale-95 mx-2"
          aria-label="Create post"
        >
          <Plus className="w-8 h-8 text-white" strokeWidth={2.5} />
        </NavLink>

        <NavItem to="/notifications" icon={Bell} label="Notifications" />
        <NavItem to="/profile" icon={User} label="Profile" />

      </div>
    </div>
  );
};

export default BottomNav;
