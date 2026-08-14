import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sparkles, CheckCircle } from 'lucide-react';
import { Logo } from '../components/common/Logo';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-3 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden grid grid-cols-1 md:grid-cols-2 my-auto">
        {/* Left Branding Panel */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-8 text-white flex flex-col justify-between hidden md:flex relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="mb-6">
              <Logo size="lg" variant="dark" showSubtag={true} />
            </div>

            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Knowledge Engine
              </span>
              <h1 className="text-2xl font-extrabold leading-tight">
                Transform study materials into personalized quizzes & mocks.
              </h1>
              <p className="text-indigo-200 text-xs leading-relaxed">
                Upload PDFs, notes, or images. Generate exam-tailored MCQs, sectional mocks, and track performance analytics.
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="relative z-10 space-y-2 pt-6 border-t border-indigo-500/30 text-xs">
            <div className="flex items-center gap-2 text-indigo-100">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Isolated student workspace & document privacy</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-100">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Auto-extracts chapters, formulas & key definitions</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-100">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Timed sectional mocks with accuracy analytics</span>
            </div>
          </div>
        </div>

        {/* Right Auth Forms Frame */}
        <div className="p-5 sm:p-8 md:p-10 flex flex-col justify-center text-slate-900 dark:text-slate-100">
          <div className="md:hidden mb-6 flex justify-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <Logo size="md" variant="auto" showSubtag={true} />
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
};


