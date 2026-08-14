import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from './Logo';
import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  Clock,
  BarChart2,
  User,
  Layers,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'Quiz Generator', path: '/quiz-generator', icon: HelpCircle },
  { name: 'Sectional Mocks', path: '/mocks', icon: Clock },
  { name: 'Smart Flashcards', path: '/flashcards', icon: Layers },
  { name: 'Analytics', path: '/analytics', icon: BarChart2 },
  { name: 'Profile', path: '/profile', icon: User },
];

export const Sidebar: React.FC = () => {
  const { userProfile } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col justify-between hidden md:flex h-full min-h-[calc(100vh-64px)] overflow-y-auto">
      <div>
        {/* Brand Header inside Sidebar */}
        <div className="p-4 px-5 border-b border-slate-100 flex items-center">
          <Link to="/">
            <Logo size="md" variant="auto" />
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="p-4 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Prep Workspace
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 font-medium'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer User Card */}
      <div className="p-4 border-t border-slate-100 mt-auto">
        <Link
          to="/profile"
          className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 p-3 rounded-xl transition-colors border border-slate-200/60"
        >
          <div className="h-10 w-10 rounded-full bg-indigo-200 border-2 border-white flex items-center justify-center text-indigo-700 font-bold italic shrink-0 text-sm">
            {getInitials(userProfile?.displayName)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {userProfile?.displayName || 'Student Workspace'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest truncate">
              {userProfile?.targetExam || 'Aspirant'}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

