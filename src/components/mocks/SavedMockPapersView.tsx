import React, { useState } from 'react';
import { MockTest } from '../../types';
import {
  FileText,
  Play,
  RotateCcw,
  Trash2,
  Clock,
  Award,
  BookOpen,
  Calendar,
  Sparkles,
  Search,
} from 'lucide-react';

interface SavedMockPapersViewProps {
  mockTests: MockTest[];
  onStartMock: (mock: MockTest) => void;
  onDeleteMock: (mockId: string) => Promise<void>;
  onGenerateNew: () => void;
}

export const SavedMockPapersView: React.FC<SavedMockPapersViewProps> = ({
  mockTests,
  onStartMock,
  onDeleteMock,
  onGenerateNew,
}) => {
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = mockTests.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.subject.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this saved sectional mock paper?')) {
      setDeletingId(id);
      try {
        await onDeleteMock(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved sectional papers..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        <button
          onClick={onGenerateNew}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate New Sectional Paper</span>
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 space-y-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Saved Mock Papers</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Generated sectional mock test papers are automatically saved here so you can attempt or reattempt them anytime.
            </p>
          </div>
          <button
            onClick={onGenerateNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create Sectional Test Paper</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((mock) => {
            const isDeleting = deletingId === mock.id;

            return (
              <div
                key={mock.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                      {mock.subject}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                      {mock.difficulty}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                    {mock.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{mock.numberOfQuestions || mock.questions.length} Questions</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{mock.timeLimitMinutes} Mins</span>
                    </span>
                    {mock.bestMarks !== undefined && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-600 font-bold">
                          <Award className="w-3.5 h-3.5" />
                          <span>Best: {mock.bestMarks > 0 ? `+${mock.bestMarks}` : mock.bestMarks}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 font-medium">
                    {mock.attemptsCount ? `${mock.attemptsCount} attempt${mock.attemptsCount > 1 ? 's' : ''}` : 'Not attempted yet'}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStartMock(mock)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{mock.attemptsCount ? 'Reattempt Mock' : 'Start Mock'}</span>
                    </button>

                    <button
                      disabled={isDeleting}
                      onClick={(e) => handleDelete(e, mock.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30"
                      title="Delete test paper"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
