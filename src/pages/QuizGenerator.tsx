import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserDocuments, saveQuiz, saveQuizAttempt } from '../firebase/db';
import { DocumentMetadata, Question, Quiz, DifficultyLevel } from '../types';
import { buildRichDocumentContext } from '../utils/documentContextBuilder';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  BookOpen,
  Award,
  RotateCcw,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const QuizGenerator: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Documents and Subjects
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || '');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [numQuestions, setNumQuestions] = useState<number>(10);

  // Quiz Generation State
  const [generating, setGenerating] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Interactive Quiz Runner State
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: number }>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);

  useEffect(() => {
    async function fetchDocs() {
      if (!currentUser) return;
      try {
        const docs = await getUserDocuments(currentUser.uid);
        setDocuments(docs);
        if (!selectedSubject && docs.length > 0) {
          setSelectedSubject(docs[0].subject);
        }
      } catch (err) {
        console.error('Error fetching user docs:', err);
      }
    }
    fetchDocs();
  }, [currentUser]);

  // Quiz Timer
  useEffect(() => {
    let interval: any = null;
    if (activeQuiz && !isSubmitted) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeQuiz, isSubmitted]);

  // Extract unique subjects & chapters
  const uniqueSubjects = Array.from(new Set(documents.map((d) => d.subject)));
  const currentDoc = documents.find((d) => d.subject === selectedSubject);
  const chapters = currentDoc?.chapters || [];

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) {
      setErrorMsg('Please select a subject to generate quiz.');
      return;
    }

    setGenerating(true);
    setErrorMsg('');
    setActiveQuiz(null);
    setIsSubmitted(false);
    setUserAnswers({});
    setCurrentQuestionIdx(0);
    setTimerSeconds(0);

    try {
      // Gather rich text context from user docs matching subject
      const contextDocs = documents.filter((d) => d.subject === selectedSubject);
      const documentContext = buildRichDocumentContext(contextDocs);

      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          chapter: selectedChapter,
          difficulty,
          numberOfQuestions: numQuestions,
          targetExam: userProfile?.targetExam || 'Competitive Exam',
          documentContext,
        }),
      });

      const resData = await response.json();

      if (resData.success && resData.questions) {
        const newQuizData: Omit<Quiz, 'id'> = {
          userId: currentUser?.uid || '',
          title: resData.title || `${selectedSubject} Practice Quiz`,
          subject: selectedSubject,
          chapter: selectedChapter,
          difficulty,
          numberOfQuestions: numQuestions,
          questions: resData.questions as Question[],
          createdAt: new Date().toISOString(),
        };

        const savedQuiz = await saveQuiz(newQuizData);
        setActiveQuiz(savedQuiz);
      } else {
        setErrorMsg(resData.error || 'Failed to generate quiz questions.');
      }
    } catch (err: any) {
      console.error('Quiz Generation error:', err);
      setErrorMsg(err.message || 'An error occurred while generating quiz.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (qId: string, optionIdx: number) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !currentUser) return;
    setIsSubmittingAttempt(true);

    let correctCount = 0;
    activeQuiz.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctOptionIndex) {
        correctCount += 1;
      }
    });

    const total = activeQuiz.questions.length;
    const accuracy = Math.round((correctCount / total) * 100);

    try {
      await saveQuizAttempt({
        userId: currentUser.uid,
        quizId: activeQuiz.id,
        quizTitle: activeQuiz.title,
        subject: activeQuiz.subject,
        score: correctCount,
        totalQuestions: total,
        accuracy,
        timeTakenSeconds: timerSeconds,
        userAnswers,
        completedAt: new Date().toISOString(),
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to save quiz attempt:', err);
    } finally {
      setIsSubmittingAttempt(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Quiz Generator</h1>
        <p className="text-xs text-slate-500 mt-1">
          Generate personalized practice questions from your uploaded study materials or exam topics.
        </p>
      </div>

      {!activeQuiz ? (
        /* QUIZ CONFIGURATOR FORM */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4" />
            <span>Customize Practice Set</span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleGenerateQuiz} className="space-y-5">
            {/* Subject Select */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" /> Select Subject
              </label>

              {uniqueSubjects.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {uniqueSubjects.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSelectedSubject(sub)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        selectedSubject === sub
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  placeholder="e.g. Quantitative Aptitude, Polity, History"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>

            {/* Chapter Select */}
            {chapters.length > 0 && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-2">
                  Specific Chapter (Optional)
                </label>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">All Chapters</option>
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.title}>
                      {ch.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Difficulty Level */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-2">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      difficulty === level
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-2">
                Number of Questions
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[5, 10, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNumQuestions(num)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      numQuestions === num
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {num} MCQs
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={generating}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating AI Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Practice Quiz</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* INTERACTIVE QUIZ RUNNER */
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Quiz Top Header Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {activeQuiz.subject} ({activeQuiz.difficulty})
              </span>
              <h2 className="text-sm font-bold text-slate-900 mt-1">{activeQuiz.title}</h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-mono font-bold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>{formatTime(timerSeconds)}</span>
              </div>
              <button
                onClick={() => setActiveQuiz(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Exit
              </button>
            </div>
          </div>

          {/* Question Stepper */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}</span>
            <span>{Object.keys(userAnswers).length} / {activeQuiz.questions.length} Answered</span>
          </div>

          {/* Current Question Box */}
          {activeQuiz.questions[currentQuestionIdx] && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {currentQuestionIdx + 1}. {activeQuiz.questions[currentQuestionIdx].question}
              </h3>

              <div className="space-y-3">
                {activeQuiz.questions[currentQuestionIdx].options.map((opt, optIdx) => {
                  const qId = activeQuiz.questions[currentQuestionIdx].id;
                  const isSelected = userAnswers[qId] === optIdx;
                  const isCorrect = activeQuiz.questions[currentQuestionIdx].correctOptionIndex === optIdx;

                  let buttonStyle = 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800';

                  if (isSubmitted) {
                    if (isCorrect) {
                      buttonStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      buttonStyle = 'border-red-500 bg-red-50 text-red-900 font-semibold';
                    } else {
                      buttonStyle = 'border-slate-100 text-slate-400 opacity-60';
                    }
                  } else if (isSelected) {
                    buttonStyle = 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold shadow-xs';
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(qId, optIdx)}
                      className={`w-full p-4 rounded-2xl border text-xs text-left transition-all flex items-center justify-between ${buttonStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      {isSubmitted && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Box when Submitted */}
              {isSubmitted && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs space-y-1.5 animate-in fade-in">
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Solution Explanation:</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {activeQuiz.questions[currentQuestionIdx].explanation}
                  </p>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx((p) => p - 1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 disabled:opacity-30 hover:bg-slate-50"
                >
                  Previous
                </button>

                {!isSubmitted ? (
                  currentQuestionIdx === activeQuiz.questions.length - 1 ? (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={isSubmittingAttempt}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center gap-2"
                    >
                      {isSubmittingAttempt ? 'Submitting...' : 'Submit Quiz'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                    >
                      Next Question
                    </button>
                  )
                ) : (
                  currentQuestionIdx < activeQuiz.questions.length - 1 && (
                    <button
                      onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                      className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                    >
                      Next Question
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Submission Scorecard Banner */}
          {isSubmitted && (
            <div className="bg-gradient-to-r from-emerald-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Quiz Completed!</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Time taken: {formatTime(timerSeconds)}
                  </p>
                </div>
                <button
                  onClick={() => setActiveQuiz(null)}
                  className="px-4 py-2 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                  <span>New Practice Set</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
