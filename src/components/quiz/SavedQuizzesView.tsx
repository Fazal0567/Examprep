import React, { useState } from 'react';
import { Quiz } from '../../types';
import {
  BookOpen,
  Search,
  Award,
  Play,
  RotateCcw,
  Trash2,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';

interface SavedQuizzesViewProps {
  quizzes: Quiz[];
  onStartQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (quizId: string) => void;
  onNewQuiz: () => void;
}

export const SavedQuizzesView: React.FC<SavedQuizzesViewProps> = ({
  quizzes,
  onStartQuiz,
  onDeleteQuiz,
  onNewQuiz,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All');

  const uniqueSubjects = ['All', ...Array.from(new Set(quizzes.map((q) => q.subject).filter(Boolean)))];

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSubject = selectedSubjectFilter === 'All' || quiz.subject === selectedSubjectFilter;
    const matchesSearch =
      (quiz.title && quiz.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (quiz.subject && quiz.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (quiz.chapter && quiz.chapter.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search saved quizzes..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

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

      {/* Quizzes List */}
      {filteredQuizzes.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 border border-slate-200/80 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Saved Quizzes Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {quizzes.length === 0
                ? 'Every time you generate an AI quiz, it is automatically saved here so you can reattempt it anytime.'
                : 'No saved quizzes match your search criteria.'}
            </p>
          </div>
          {quizzes.length === 0 && (
            <button
              onClick={onNewQuiz}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Practice Quiz</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuizzes.map((quiz) => {
            const hasAttempted = (quiz.attemptsCount || 0) > 0;

            return (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                        {quiz.subject}
                      </span>
                      {quiz.difficulty && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">
                          {quiz.difficulty}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm('Delete this saved quiz?')) {
                          onDeleteQuiz(quiz.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete quiz"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {quiz.title}
                  </h3>

                  {quiz.chapter && (
                    <p className="text-xs text-slate-500 font-medium">
                      Chapter: {quiz.chapter}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1 font-medium">
                    <span>{quiz.numberOfQuestions || quiz.questions.length} MCQs</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(quiz.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Bottom stats & start/reattempt button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs">
                    {hasAttempted ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[11px]">
                          Attempts: <strong className="text-slate-800">{quiz.attemptsCount}</strong>
                        </span>
                        {quiz.bestMarks !== undefined && (
                          <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-0.5">
                            <Award className="w-3 h-3" /> Best: {quiz.bestMarks > 0 ? `+${quiz.bestMarks}` : quiz.bestMarks}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">Not attempted yet</span>
                    )}
                  </div>

                  <button
                    onClick={() => onStartQuiz(quiz)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all"
                  >
                    {hasAttempted ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reattempt</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Start Quiz</span>
                      </>
                    )}
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
