import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { logOutUser } from '../../firebase/auth';
import { Logo } from './Logo';
import {
  Calendar,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Plus,
  Sun,
  Moon,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);

  // Format Exam Target Date
  const getFormattedExamDate = () => {
    if (!userProfile?.targetExamDate) return 'Not set';
    try {
      const d = new Date(userProfile.targetExamDate);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Not set';
    }
  };

  const handleLogout = async () => {
    try {
      await logOutUser();
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  // Get Page Title from pathname
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Overview Dashboard';
      case '/documents':
        return 'Study Documents Library';
      case '/quiz-generator':
        return 'AI Quiz Generator';
      case '/mocks':
        return 'Sectional Mock Tests';
      case '/analytics':
        return 'Performance Analytics';
      case '/profile':
        return 'Student Profile & Goals';
      default:
        return 'Overview Dashboard';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Page Title */}
      <div className="flex items-center gap-4">
        {/* Mobile Brand Logo */}
        <Link to="/" className="md:hidden flex items-center">
          <Logo size="sm" variant="auto" />
        </Link>

        <h1 className="hidden md:block text-base sm:text-lg font-semibold text-slate-800 uppercase tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* Target Exam Info & Top Action */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="text-right hidden sm:block">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Exam</p>
          <p className="text-sm font-medium text-slate-800">
            {userProfile?.targetExam ? `${userProfile.targetExam}${userProfile.targetExamDate ? ` • ${getFormattedExamDate()}` : ''}` : 'Target Exam Not Set'}
          </p>
        </div>

        <div className="hidden sm:block h-8 w-[1px] bg-slate-200"></div>

        <Link
          to="/documents"
          className="px-2.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Upload New Material</span>
          <span className="sm:hidden text-[11px]">Upload</span>
        </Link>

        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors focus:outline-none flex items-center justify-center"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* User Profile Menu */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900 truncate">{userProfile?.displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{userProfile?.email}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>Profile & Goals</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

