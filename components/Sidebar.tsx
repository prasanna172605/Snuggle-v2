import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, MessageCircle, User, Plus, Bell, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
    unreadCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({ unreadCount }) => {
    const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? 'bg-snuggle-900 text-white shadow-md'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
            }
        >
            <div className="relative">
                <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {to === '/notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-dark-bg" />
                )}
            </div>
            <span className="font-medium text-base">{label}</span>
            {to === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                </span>
            )}
        </NavLink>
    );

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen bg-white dark:bg-dark-card border-r border-gray-100 dark:border-dark-border py-6 px-4 sticky top-0">
            {/* Brand */}
            <div className="flex items-center gap-3 px-4 mb-8">
                <div className="w-10 h-10 bg-gradient-to-tr from-snuggle-500 to-snuggle-600 rounded-xl flex items-center justify-center shadow-lg shadow-snuggle-500/20">
                    <span className="text-white font-bold text-xl">S</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                    Snuggle
                </h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
                <NavItem to="/" icon={Home} label="Home" />
                <NavItem to="/messages" icon={MessageCircle} label="Messages" />
                <NavItem to="/notifications" icon={Bell} label="Notifications" />
                <NavItem to="/profile" icon={User} label="Profile" />
                <NavItem to="/settings" icon={Settings} label="Settings" />
            </nav>

            {/* Create Action */}
            <div className="mt-auto mb-6">
                <NavLink
                    to="/create"
                    className="flex items-center justify-center gap-3 w-full bg-snuggle-500 hover:bg-snuggle-600 text-white py-3.5 rounded-xl shadow-lg shadow-snuggle-500/25 transition-all transform hover:scale-[1.02] active:scale-95"
                >
                    <Plus className="w-6 h-6" strokeWidth={2.5} />
                    <span className="font-bold">New Post</span>
                </NavLink>
            </div>
        </aside>
    );
};

export default Sidebar;
