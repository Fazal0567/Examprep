import React, { useState } from 'react';
import { QuizAttempt, Question } from '../../types';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Search,
  BookOpen,
  Eye,
  Trash2,
  TrendingUp,
  AlertCircle,
  Target,
  Sparkles,
} from 'lucide-react';

interface QuizHistoryViewProps {
  attempts: QuizAttempt[];
  onReattempt: (attempt: QuizAttempt) => void;
  onReview: (attempt: QuizAttempt) => void;
  onDeleteAttempt: (attemptId: string) => void;
  onNewQuiz: () => void;
}

export const QuizHistoryView: React.FC<QuizHistoryViewProps> = ({
  attempts,
  onReattempt,
  onReview,
  onDeleteAttempt,
  onNewQuiz,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All');

  const uniqueSubjects = ['All', ...Array.from(new Set(attempts.map((a) => a.subject).filter(Boolean)))];

  const filteredAttempts = attempts.filter((att) => {
    const matchesSubject = selectedSubjectFilter === 'All' || att.subject === selectedSubjectFilter;
    const matchesSearch =
      (att.quizTitle && att.quizTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (att.subject && att.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (att.chapter && att.chapter.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSubject && matchesSearch;
  });

  // Calculate overall performance summary
  const totalAttempts = attempts.length;
  const avgAccuracy =
    totalAttempts > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.accuracy || 0), 0) / totalAttempts)
      : 0;

  const bestMarks =
    totalAttempts > 0
      ? Math.max(...attempts.map((a) => a.marksObtained ?? a.score ?? 0))
      : 0;

  const totalQuestionsSolved = attempts.reduce((sum, a) => sum + (a.totalQuestions || 0), 0);

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top Performance Analytics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Quizzes</span>
            <Target className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalAttempts}</p>
          <p className="text-[10px] text-slate-400 font-medium">Practice sets completed</p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Accuracy</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{avgAccuracy}%</p>
          <p className="text-[10px] text-slate-400 font-medium">Across all quiz topics</p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Best Marks</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{bestMarks > 0 ? `+${bestMarks}` : bestMarks}</p>
          <p className="text-[10px] text-slate-400 font-medium">Highest score achieved</p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Questions Practiced</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalQuestionsSolved}</p>
          <p className="text-[10px] text-slate-400 font-medium">MCQs attempted</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search quiz topic or title..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        {/* Subject Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {uniqueSubjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubjectFilter(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedSubjectFilter === sub
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Attempts List */}
      {filteredAttempts.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 border border-slate-200/80 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Quiz Attempts Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {attempts.length === 0
                ? "You haven't completed any quizzes yet. Generate and attempt a practice quiz to start tracking your performance and marks."
                : 'No quiz attempts match your current search or subject filter.'}
            </p>
          </div>
          {attempts.length === 0 && (
            <button
              onClick={onNewQuiz}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Practice Quiz</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAttempts.map((attempt) => {
            const correctCount = attempt.correctAnswersCount ?? attempt.score ?? 0;
            const wrongCount = attempt.wrongAnswersCount ?? 0;
            const positiveMarks = attempt.positiveMarks ?? correctCount * 1;
            const negativeMarks = attempt.negativeMarks ?? wrongCount * 0.25;
            const marksObtained = attempt.marksObtained ?? +(positiveMarks - negativeMarks).toFixed(2);
            const maxMarks = attempt.maxMarks ?? attempt.totalQuestions * 1;

            return (
              <div
                key={attempt.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Metadata & Titles */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                      {attempt.subject}
                    </span>
                    {attempt.chapter && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {attempt.chapter}
                      </span>
                    )}
                    {attempt.difficulty && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">
                        {attempt.difficulty}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(attempt.completedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {attempt.quizTitle || `${attempt.subject} Quiz`}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {formatSeconds(attempt.timeTakenSeconds)}
                    </span>
                    <span>•</span>
                    <span>{attempt.totalQuestions} Questions</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold">{correctCount} Correct</span>
                    {wrongCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-rose-600 font-bold">{wrongCount} Wrong</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Marks obtained & Action buttons */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                  {/* Marks Obtained Badge */}
                  <div className="p-2.5 sm:px-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-center shrink-0 min-w-[95px]">
                    <span className="block text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">
                      Marks Obtained
                    </span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-base sm:text-lg font-black text-indigo-700">
                        {marksObtained > 0 ? `+${marksObtained}` : marksObtained}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">/ {maxMarks}</span>
                    </div>
                  </div>

                  {/* Accuracy Badge */}
                  <div className="p-2.5 sm:px-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-center shrink-0 min-w-[85px]">
                    <span className="block text-[9px] uppercase font-extrabold text-emerald-600 tracking-wider">
                      Accuracy
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-700">
                      {attempt.accuracy}%
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onReview(attempt)}
                      className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                      title="Review questions & solutions"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Review</span>
                    </button>

                    <button
                      onClick={() => onReattempt(attempt)}
                      className="p-2 sm:px-3.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                      title="Reattempt this quiz"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reattempt</span>
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm('Delete this quiz attempt history record?')) {
                          onDeleteAttempt(attempt.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete attempt record"
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
