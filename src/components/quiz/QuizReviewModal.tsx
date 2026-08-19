import React, { useState } from 'react';
import { QuizAttempt, Question } from '../../types';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RotateCcw,
  BookOpen,
  Filter,
} from 'lucide-react';

interface QuizReviewModalProps {
  attempt: QuizAttempt;
  questions: Question[];
  onClose: () => void;
  onReattempt: (attempt: QuizAttempt, questions: Question[]) => void;
}

export const QuizReviewModal: React.FC<QuizReviewModalProps> = ({
  attempt,
  questions,
  onClose,
  onReattempt,
}) => {
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Compute marks metrics with fallbacks
  const correctCount = attempt.correctAnswersCount ?? attempt.score ?? 0;
  const wrongCount = attempt.wrongAnswersCount ?? 0;
  const skippedCount = attempt.skippedCount ?? Math.max(0, attempt.totalQuestions - correctCount - wrongCount);
  const positiveMarks = attempt.positiveMarks ?? correctCount * 1;
  const negativeMarks = attempt.negativeMarks ?? wrongCount * 0.25;
  const marksObtained = attempt.marksObtained ?? +(positiveMarks - negativeMarks).toFixed(2);
  const maxMarks = attempt.maxMarks ?? attempt.totalQuestions * 1;

  const filteredQuestions = questions.map((q, originalIdx) => {
    const userAns = attempt.userAnswers?.[q.id];
    const isAnswered = userAns !== undefined;
    const isCorrect = isAnswered && userAns === q.correctOptionIndex;
    const isWrong = isAnswered && userAns !== q.correctOptionIndex;
    const isSkipped = !isAnswered;
    const qMarks = isCorrect ? +1.0 : isWrong ? -0.25 : 0;

    return {
      question: q,
      originalIdx,
      userAns,
      isCorrect,
      isWrong,
      isSkipped,
      qMarks,
    };
  }).filter((item) => {
    if (filter === 'correct') return item.isCorrect;
    if (filter === 'wrong') return item.isWrong;
    if (filter === 'skipped') return item.isSkipped;
    return true;
  });

  const activeItem = filteredQuestions[selectedIdx] || filteredQuestions[0];

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-md">
                {attempt.subject}
              </span>
              {attempt.chapter && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
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
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {attempt.quizTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => onReattempt(attempt, questions)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reattempt</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Score & Marks Summary Banner */}
        <div className="p-3 sm:p-5 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 shrink-0">
          <div className="p-2.5 sm:p-3 bg-white/10 rounded-2xl border border-white/10 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Marks</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-2xl font-black text-amber-300">
                {marksObtained > 0 ? `+${marksObtained}` : marksObtained}
              </span>
              <span className="text-xs text-indigo-200 font-bold">/ {maxMarks}</span>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-300 tracking-wider">Accuracy</span>
            <span className="text-base sm:text-xl font-black text-emerald-400 mt-0.5">
              {attempt.accuracy}%
            </span>
          </div>

          <div className="p-2.5 sm:p-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-300 tracking-wider">Breakdown</span>
            <div className="flex items-center gap-1.5 text-xs font-bold mt-0.5">
              <span className="text-emerald-400">+{positiveMarks}</span>
              <span className="text-slate-400">/</span>
              <span className="text-rose-400">-{negativeMarks}</span>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-300 tracking-wider">Time</span>
            <span className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5 font-mono">
              {formatSeconds(attempt.timeTakenSeconds)}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-2.5 sm:p-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-300 tracking-wider">Responses</span>
            <div className="flex items-center gap-2 text-xs font-bold mt-0.5">
              <span className="text-emerald-400">{correctCount} ✔</span>
              <span className="text-rose-400">{wrongCount} ✖</span>
              <span className="text-slate-400">{skippedCount} ⏭</span>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-white">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => { setFilter('all'); setSelectedIdx(0); }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({questions.length})
              </button>
              <button
                onClick={() => { setFilter('wrong'); setSelectedIdx(0); }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filter === 'wrong'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Incorrect ({wrongCount})
              </button>
              <button
                onClick={() => { setFilter('correct'); setSelectedIdx(0); }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filter === 'correct'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Correct ({correctCount})
              </button>
              <button
                onClick={() => { setFilter('skipped'); setSelectedIdx(0); }}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filter === 'skipped'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Skipped ({skippedCount})
              </button>
            </div>
          </div>

          <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
            Showing {filteredQuestions.length} of {questions.length} questions
          </span>
        </div>

        {/* Content Body: Left question list + Right active question card */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 bg-slate-50/40">
          {/* Question Navigator */}
          <div className="lg:col-span-4 space-y-2 sm:space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Questions Index
            </h4>

            {filteredQuestions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                No questions in this filter category.
              </div>
            ) : (
              <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-4 gap-1.5 sm:gap-2 max-h-36 sm:max-h-48 lg:max-h-[500px] overflow-y-auto p-1 bg-white rounded-2xl border border-slate-200/80">
                {filteredQuestions.map((item, idx) => {
                  const isSelected = selectedIdx === idx;
                  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (item.isCorrect) {
                    colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                  } else if (item.isWrong) {
                    colorClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                  } else {
                    colorClass = 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
                  }

                  if (isSelected) {
                    colorClass += ' ring-2 ring-indigo-600 ring-offset-1';
                  }

                  return (
                    <button
                      key={item.question.id}
                      onClick={() => setSelectedIdx(idx)}
                      className={`h-9 sm:h-10 rounded-xl border text-[11px] sm:text-xs flex items-center justify-center transition-all shadow-2xs ${colorClass}`}
                    >
                      <span>Q{item.originalIdx + 1}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detailed Question Review Box */}
          <div className="lg:col-span-8">
            {activeItem ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6">
                {/* Question meta header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs font-semibold gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      Question {activeItem.originalIdx + 1} of {questions.length}
                    </span>
                    {activeItem.question.chapter && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {activeItem.question.chapter}
                      </span>
                    )}
                  </div>

                  {/* Question Marks Result Badge */}
                  <div className="flex items-center gap-1.5">
                    {activeItem.isCorrect ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>+1.00 Mark</span>
                      </span>
                    ) : activeItem.isWrong ? (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>-0.25 Penalty</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200">
                        0.00 (Skipped)
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Statement */}
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                  {activeItem.question.question}
                </h3>

                {/* Options List */}
                <div className="space-y-2.5">
                  {activeItem.question.options.map((opt, optIdx) => {
                    const isUserChoice = activeItem.userAns === optIdx;
                    const isCorrectAnswer = activeItem.question.correctOptionIndex === optIdx;

                    let optStyle = 'border-slate-200 text-slate-700 bg-white';
                    let badgeLabel = null;

                    if (isCorrectAnswer) {
                      optStyle = 'border-emerald-500 bg-emerald-50/90 text-emerald-950 font-bold ring-1 ring-emerald-500';
                      badgeLabel = (
                        <span className="text-[10px] uppercase font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Correct Answer
                        </span>
                      );
                    } else if (isUserChoice && !isCorrectAnswer) {
                      optStyle = 'border-rose-500 bg-rose-50/90 text-rose-950 font-bold ring-1 ring-rose-500';
                      badgeLabel = (
                        <span className="text-[10px] uppercase font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                          <XCircle className="w-3 h-3 text-rose-600" /> Your Selection
                        </span>
                      );
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-3.5 sm:p-4 rounded-2xl border text-xs transition-all flex items-center justify-between gap-3 ${optStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="leading-relaxed">{opt}</span>
                        </div>
                        {badgeLabel}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                <div className="p-4 sm:p-5 bg-indigo-50/80 border border-indigo-100 rounded-2xl space-y-2 text-xs">
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Detailed Solution & Step-by-Step Explanation:</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {activeItem.question.explanation || 'No detailed explanation provided for this question.'}
                  </p>
                </div>

                {/* Previous / Next buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    disabled={selectedIdx === 0}
                    onClick={() => setSelectedIdx((p) => p - 1)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={selectedIdx === filteredQuestions.length - 1}
                    onClick={() => setSelectedIdx((p) => p + 1)}
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-30 hover:bg-indigo-700"
                  >
                    Next Question
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 text-center text-xs text-slate-400 border border-slate-200">
                Select a question from the index to view its detailed marks & explanation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
