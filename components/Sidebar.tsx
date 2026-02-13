import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, MessageCircle, User, Plus, Bell, Settings, LogOut, Menu, Moon, Sun, Bookmark, Users, Heart } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
    unreadCount: number;
    unreadMessagesCount?: number;
    onLogout: () => void;
    onSwitchAccount?: (userId: string) => void;
    onAddAccount?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ unreadCount, unreadMessagesCount = 0, onLogout, onSwitchAccount, onAddAccount }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { effectiveTheme, toggleTheme } = useTheme();
    const isDarkMode = effectiveTheme === 'dark';

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? 'bg-gradient-to-r from-snuggle-100 to-snuggle-50 dark:from-snuggle-900/30 dark:to-snuggle-800/20 text-snuggle-600 dark:text-snuggle-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5'
                }`
            }
        >
            <div className="relative">
                <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {to === '/notifications' && unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-dark-bg" />
                )}
                {to === '/messages' && unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-dark-bg">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                )}
            </div>
            <span className="font-medium text-base">{label}</span>
        </NavLink>
    );


    return (
        <aside className="hidden md:flex flex-col w-64 h-full flex-shrink-0 bg-white/60 dark:bg-black/60 backdrop-blur-xl border-r border-white/20 dark:border-white/10 py-6 px-4 z-40">
            {/* Brand */}
            <div className="flex items-center gap-3 px-4 mb-8">
                <div className="w-14 h-14 flex items-center justify-center rounded-full overflow-hidden border-2 border-gray-100 dark:border-white/10 shadow-md bg-white/5 flex-shrink-0">
                    <img 
                        src="/logo-reveal.png" 
                        alt="Logo" 
                        className="w-full h-full object-cover scale-125"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                                parent.className = "w-10 h-10 bg-gradient-to-tr from-snuggle-400 to-snuggle-600 rounded-xl flex items-center justify-center shadow-lg shadow-snuggle-500/30";
                                const span = document.createElement('span');
                                span.className = "text-white font-bold text-xl";
                                span.innerText = "S";
                                parent.appendChild(span);
                            }
                        }}
                    />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                    Snuggle
                </h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
                <NavItem to="/" icon={Home} label="Memories" />
                <NavItem to="/messages" icon={MessageCircle} label="Messages" />
                <NavItem to="/notifications" icon={Bell} label="Notifications" />
                <NavItem to="/profile" icon={User} label="Profile" />
                <NavItem to="/create" icon={Plus} label="Create" />
            </nav>

            {/* Bottom Menu Area */}
            <div className="mt-auto relative" ref={menuRef}>
                {/* Popup Menu */}
                {showMenu && (
                    <div className="absolute bottom-full left-0 w-60 mb-2 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                        <NavLink to="/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                            <Settings className="w-5 h-5" />
                            <span className="font-medium">Settings</span>
                        </NavLink>
                        <NavLink to="/activities" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                            <Heart className="w-5 h-5" />
                            <span className="font-medium">Your Activity</span>
                        </NavLink>
                        <NavLink to="/favourites" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors">
                            <div className="w-5 h-5 flex items-center justify-center text-lg leading-none">⭐</div>
                            <span className="font-medium">Favourites</span>
                        </NavLink>
                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors cursor-pointer" onClick={toggleTheme}>
                            {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            <span className="font-medium">Switch Appearance</span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-border transition-colors cursor-pointer" onClick={onAddAccount}>
                            <Users className="w-5 h-5" />
                            <span className="font-medium">Switch Accounts</span>
                        </div>
                        <div className="h-px bg-gray-100 dark:bg-dark-border my-1" />
                        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Log out</span>
                        </button>
                    </div>
                )}

                {/* Menu Trigger */}
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className={`flex items-center gap-4 px-4 py-3 w-full rounded-xl transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 ${showMenu ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                >
                    <Menu className="w-6 h-6" />
                    <span className="font-medium text-base">More</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
