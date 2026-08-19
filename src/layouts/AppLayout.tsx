import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { FirstLoginModal } from '../components/onboarding/FirstLoginModal';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  Clock,
  BarChart2,
  User,
  Layers,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Loading ExamPrep AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />
      <FirstLoginModal />

      <div className="flex flex-1 relative">
        <Sidebar />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-1 py-1 flex items-center justify-around shadow-lg">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold py-1 px-0.5 rounded-lg transition-all min-w-0 ${
              isActive ? 'text-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 font-bold' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4 xs:w-4.5 xs:h-4.5 shrink-0" />
          <span className="truncate max-w-full">Home</span>
        </NavLink>
        <NavLink
          to="/documents"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold py-1 px-0.5 rounded-lg transition-all min-w-0 ${
              isActive ? 'text-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 font-bold' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`
          }
        >
          <FileText className="w-4 h-4 xs:w-4.5 xs:h-4.5 shrink-0" />
          <span className="truncate max-w-full">Docs</span>
        </NavLink>
        <NavLink
          to="/quiz-generator"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold py-1 px-0.5 rounded-lg transition-all min-w-0 ${
              isActive ? 'text-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 font-bold' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`
          }
        >
          <HelpCircle className="w-4 h-4 xs:w-4.5 xs:h-4.5 shrink-0" />
          <span className="truncate max-w-full">Quiz</span>
        </NavLink>
        <NavLink
          to="/mocks"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold py-1 px-0.5 rounded-lg transition-all min-w-0 ${
              isActive ? 'text-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 font-bold' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`
          }
        >
          <Clock className="w-4 h-4 xs:w-4.5 xs:h-4.5 shrink-0" />
          <span className="truncate max-w-full">Mocks</span>
        </NavLink>
        <NavLink
          to="/flashcards"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold py-1 px-0.5 rounded-lg transition-all min-w-0 ${
              isActive ? 'text-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 font-bold' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`
          }
        >
          <Layers className="w-4 h-4 xs:w-4.5 xs:h-4.5 shrink-0" />
          <span className="truncate max-w-full">Cards</span>
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold py-1 px-0.5 rounded-lg transition-all min-w-0 ${
              isActive ? 'text-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 font-bold' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`
          }
        >
          <BarChart2 className="w-4 h-4 xs:w-4.5 xs:h-4.5 shrink-0" />
          <span className="truncate max-w-full">Stats</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-[8px] xs:text-[9px] sm:text-[10px] font-semibold py-1 px-0.5 rounded-lg transition-all min-w-0 ${
              isActive ? 'text-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 font-bold' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`
          }
        >
          <User className="w-4 h-4 xs:w-4.5 xs:h-4.5 shrink-0" />
          <span className="truncate max-w-full">Profile</span>
        </NavLink>
      </nav>
    </div>
  );
};
