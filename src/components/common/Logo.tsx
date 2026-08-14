import React from 'react';
import { GraduationCap, Sparkles, Brain } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'auto';
  showSubtag?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'auto',
  showSubtag = false,
  className = '',
}) => {
  const iconBoxSizes = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-11 h-11 rounded-2xl',
    xl: 'w-14 h-14 rounded-2xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl sm:text-4xl',
  };

  const aiBadgeSizes = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[11px] px-2 py-0.5',
    lg: 'text-xs px-2.5 py-1',
    xl: 'text-sm px-3 py-1',
  };

  const isDarkVariant = variant === 'dark';
  const isLightVariant = variant === 'light';

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {/* Icon Badge */}
      <div className="relative group shrink-0">
        <div
          className={`${iconBoxSizes[size]} bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200 relative z-10`}
        >
          <GraduationCap className={`${iconSizes[size]} text-white`} />
          <Brain className="w-2.5 h-2.5 text-amber-300 absolute -top-0.5 -right-0.5 drop-shadow-xs" />
        </div>
        {/* Soft Glow */}
        <div className="absolute inset-0 bg-indigo-500/30 rounded-xl blur-sm -z-0 opacity-70 group-hover:opacity-100 transition-opacity"></div>
      </div>

      {/* Brand Title */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span
            className={`${titleSizes[size]} font-black tracking-tight ${
              isDarkVariant
                ? 'text-white'
                : isLightVariant
                ? 'text-slate-900'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            ExamPrep
          </span>
          <span
            className={`${aiBadgeSizes[size]} font-extrabold tracking-wider uppercase rounded-md sm:rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-500 text-white shadow-xs flex items-center gap-0.5 leading-none`}
          >
            <span>AI</span>
            <Sparkles className="w-2.5 h-2.5 text-amber-200 fill-amber-200" />
          </span>
        </div>
        {showSubtag && (
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${
              isDarkVariant
                ? 'text-indigo-200/80'
                : isLightVariant
                ? 'text-slate-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            Smart Exam Prep Engine
          </span>
        )}
      </div>
    </div>
  );
};
