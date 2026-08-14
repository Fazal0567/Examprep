import React, { useState } from 'react';
import { MockAttempt } from '../../types';
import {
  RotateCcw,
  Eye,
  Trash2,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  BookOpen,
  Filter,
  BarChart3,
  Flame,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface MockHistoryViewProps {
  attempts: MockAttempt[];
  onReattempt: (attempt: MockAttempt) => void;
  onReview: (attempt: MockAttempt) => void;
  onDeleteAttempt: (attemptId: string) => Promise<void>;
  onStartNewMock: () => void;
}

export const MockHistoryView: React.FC<MockHistoryViewProps> = ({
  attempts,
  onReattempt,
  onReview,
  onDeleteAttempt,
  onStartNewMock,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const subjects = ['All', ...Array.from(new Set(attempts.map((a) => a.subject).filter(Boolean)))];

  // Filtered attempts
  const filteredAttempts = attempts.filter((att) => {
    const matchesSubject = selectedSubject === 'All' || att.subject === selectedSubject;
    const matchesSearch =
      att.mockTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (att.difficulty && att.difficulty.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSubject && matchesSearch;
  });

  // Calculate aggregates
  const totalAttempts = attempts.length;
  const totalMarksArr = attempts.map((a) => {
    const correct = a.correctAnswersCount ?? a.score ?? 0;
    const wrong = a.wrongAnswersCount ?? 0;
    const pos = a.positiveMarks ?? correct * 1;
    const neg = a.negativeMarks ?? wrong * 0.25;
    return a.marksObtained ?? +(pos - neg).toFixed(2);
  });
  const maxMarksArr = attempts.map((a) => a.maxMarks ?? a.totalQuestions * 1);

  const avgAccuracy = totalAttempts > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.accuracy || 0), 0) / totalAttempts)
    : 0;

  const avgMarks = totalAttempts > 0
    ? (totalMarksArr.reduce((sum, m) => sum + m, 0) / totalAttempts).toFixed(1)
    : '0';

  const bestMarks = totalAttempts > 0
    ? Math.max(...totalMarksArr)
    : 0;

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this mock attempt record?')) {
      setDeletingId(id);
      try {
        await onDeleteAttempt(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Overview Analytics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Attempts</span>
            <RotateCcw className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalAttempts}</div>
          <p className="text-[11px] text-slate-400 font-medium">Sectional mock sessions</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Avg Marks</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {avgMarks} <span className="text-xs font-bold text-slate-400">marks</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Net score per paper</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Avg Accuracy</span>
            <BarChart3 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{avgAccuracy}%</div>
          <p className="text-[11px] text-slate-400 font-medium">Precision rate</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Best Marks</span>
            <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600">
            {bestMarks > 0 ? `+${bestMarks}` : bestMarks}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Highest achieved score</p>
        </div>
      </div>

      {/* Search & Subject Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mock attempts by subject or title..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <button
            onClick={onStartNewMock}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-xs transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate New Mock</span>
          </button>
        </div>

        {/* Subject Pills */}
        {subjects.length > 2 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Subject:
            </span>
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedSubject === sub
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Attempts List */}
      {filteredAttempts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 space-y-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Sectional Mock Attempts Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || selectedSubject !== 'All'
                ? 'No mock tests match your current filter query.'
                : 'You have not completed any sectional mock tests yet. Take a mock test to track your marks and performance.'}
            </p>
          </div>
          <button
            onClick={onStartNewMock}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Take Your First Sectional Mock</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredAttempts.map((attempt) => {
            const correct = attempt.correctAnswersCount ?? attempt.score ?? 0;
            const wrong = attempt.wrongAnswersCount ?? 0;
            const skipped = attempt.skippedCount ?? Math.max(0, attempt.totalQuestions - correct - wrong);
            const pos = attempt.positiveMarks ?? correct * 1;
            const neg = attempt.negativeMarks ?? wrong * 0.25;
            const marks = attempt.marksObtained ?? +(pos - neg).toFixed(2);
            const maxM = attempt.maxMarks ?? attempt.totalQuestions * 1;

            const isDeleting = deletingId === attempt.id;

            return (
              <div
                key={attempt.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
              >
                {/* Left: Test Details */}
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                      {attempt.subject}
                    </span>
                    {attempt.difficulty && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                        {attempt.difficulty}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(attempt.completedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                    {attempt.mockTitle}
                  </h3>

                  {/* Badges breakdown */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{correct} Correct</span>
                    </span>

                    <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>{wrong} Incorrect</span>
                    </span>

                    {skipped > 0 && (
                      <span className="text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl">
                        {skipped} Skipped
                      </span>
                    )}

                    <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatSeconds(attempt.timeTakenSeconds)}</span>
                    </span>
                  </div>
                </div>

                {/* Center: Prominent Marks & Accuracy Display */}
                <div className="flex items-center gap-4 bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-100 shrink-0">
                  {/* Marks Showcase */}
                  <div className="flex flex-col items-center justify-center px-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Marks
                    </span>
                    <div className="flex items-baseline gap-0.5 mt-0.5">
                      <span className="text-2xl font-black text-indigo-600 font-mono">
                        {marks > 0 ? `+${marks}` : marks}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/{maxM}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                      (+{pos} / -{neg})
                    </span>
                  </div>

                  <div className="w-px h-10 bg-slate-200"></div>

                  {/* Accuracy Showcase */}
                  <div className="flex flex-col items-center justify-center px-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Accuracy
                    </span>
                    <span
                      className={`text-xl font-black mt-0.5 ${
                        attempt.accuracy >= 75
                          ? 'text-emerald-600'
                          : attempt.accuracy >= 50
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {attempt.accuracy}%
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                      {attempt.totalQuestions} Qs
                    </span>
                  </div>
                </div>

                {/* Right: Actions (Reattempt, Review, Delete) */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                  <button
                    onClick={() => onReattempt(attempt)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-xs transition-all group/btn"
                    title="Reattempt this sectional mock test with a fresh timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 group-hover/btn:-rotate-45 transition-transform" />
                    <span>Reattempt Mock</span>
                  </button>

                  <button
                    onClick={() => onReview(attempt)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all"
                    title="Review answers, marks breakdown & detailed solutions"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Review Solutions</span>
                  </button>

                  <button
                    disabled={isDeleting}
                    onClick={(e) => handleDelete(e, attempt.id)}
                    className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30"
                    title="Delete attempt record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
