import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs animate-pulse space-y-3">
    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
    <div className="h-8 bg-slate-200 rounded w-1/2"></div>
    <div className="h-3 bg-slate-100 rounded w-2/3"></div>
  </div>
);

export const DocumentSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs animate-pulse flex items-center justify-between">
    <div className="flex items-center gap-3 w-2/3">
      <div className="w-10 h-10 bg-slate-200 rounded-lg shrink-0"></div>
      <div className="space-y-1.5 w-full">
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="h-3 bg-slate-100 rounded w-1/2"></div>
      </div>
    </div>
    <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
  </div>
);

export const QuizSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs animate-pulse space-y-4">
    <div className="h-5 bg-slate-200 rounded w-1/4"></div>
    <div className="h-6 bg-slate-200 rounded w-3/4"></div>
    <div className="space-y-2 pt-2">
      <div className="h-10 bg-slate-100 rounded-lg w-full"></div>
      <div className="h-10 bg-slate-100 rounded-lg w-full"></div>
      <div className="h-10 bg-slate-100 rounded-lg w-full"></div>
      <div className="h-10 bg-slate-100 rounded-lg w-full"></div>
    </div>
  </div>
);
