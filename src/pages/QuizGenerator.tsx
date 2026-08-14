import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserDocuments,
  saveQuiz,
  saveQuizAttempt,
  getUserQuizAttempts,
  getUserQuizzes,
  deleteQuizAttempt,
  deleteQuiz,
  getQuiz,
} from '../firebase/db';
import {
  DocumentMetadata,
  Question,
  Quiz,
  QuizAttempt,
  DifficultyLevel,
} from '../types';
import { buildRichDocumentContext } from '../utils/documentContextBuilder';
import { QuizHistoryView } from '../components/quiz/QuizHistoryView';
import { SavedQuizzesView } from '../components/quiz/SavedQuizzesView';
import { QuizReviewModal } from '../components/quiz/QuizReviewModal';
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
  History,
  Layers,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  TrendingUp,
} from 'lucide-react';

export const QuizGenerator: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'saved'>('create');

  // Documents and Subjects
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || '');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [numQuestions, setNumQuestions] = useState<number>(10);

  // History & Saved Quizzes state
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [savedQuizzes, setSavedQuizzes] = useState<Quiz[]>([]);
  const [selectedReviewAttempt, setSelectedReviewAttempt] = useState<QuizAttempt | null>(null);
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([]);

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
  const [submittedAttempt, setSubmittedAttempt] = useState<QuizAttempt | null>(null);

  // Load initial documents & data
  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;
      try {
        const [docs, attempts, quizzes] = await Promise.all([
          getUserDocuments(currentUser.uid),
          getUserQuizAttempts(currentUser.uid),
          getUserQuizzes(currentUser.uid),
        ]);
        setDocuments(docs);
        setQuizAttempts(attempts);
        setSavedQuizzes(quizzes);

        if (!selectedSubject && docs.length > 0) {
          setSelectedSubject(docs[0].subject);
        }
      } catch (err) {
        console.error('Error fetching quiz data:', err);
      }
    }
    loadData();
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
    setSubmittedAttempt(null);

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
          attemptsCount: 0,
        };

        const saved = await saveQuiz(newQuizData);
        setActiveQuiz(saved);
        setSavedQuizzes((prev) => [saved, ...prev]);
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
    setUserAnswers((prev) => {
      // Toggle if already selected
      if (prev[qId] === optionIdx) {
        const copy = { ...prev };
        delete copy[qId];
        return copy;
      }
      return { ...prev, [qId]: optionIdx };
    });
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !currentUser) return;
    setIsSubmittingAttempt(true);

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    activeQuiz.questions.forEach((q) => {
      const userChoice = userAnswers[q.id];
      if (userChoice === undefined) {
        skippedCount += 1;
      } else if (userChoice === q.correctOptionIndex) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    });

    const total = activeQuiz.questions.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const positiveMarks = correctCount * 1;
    const negativeMarks = +(wrongCount * 0.25).toFixed(2);
    const marksObtained = +(positiveMarks - negativeMarks).toFixed(2);
    const maxMarks = total * 1;

    try {
      const attemptData: Omit<QuizAttempt, 'id'> = {
        userId: currentUser.uid,
        quizId: activeQuiz.id,
        quizTitle: activeQuiz.title,
        subject: activeQuiz.subject,
        chapter: activeQuiz.chapter,
        difficulty: activeQuiz.difficulty,
        score: correctCount,
        totalQuestions: total,
        accuracy,
        correctAnswersCount: correctCount,
        wrongAnswersCount: wrongCount,
        skippedCount,
        timeTakenSeconds: timerSeconds,
        userAnswers,
        completedAt: new Date().toISOString(),
        marksObtained,
        maxMarks,
        positiveMarks,
        negativeMarks,
        questionsSnapshot: activeQuiz.questions,
      };

      const savedAttempt = await saveQuizAttempt(attemptData);
      setSubmittedAttempt(savedAttempt);
      setQuizAttempts((prev) => [savedAttempt, ...prev]);

      // Update local savedQuizzes stats
      setSavedQuizzes((prev) =>
        prev.map((q) => {
          if (q.id === activeQuiz.id) {
            return {
              ...q,
              attemptsCount: (q.attemptsCount || 0) + 1,
              bestMarks: Math.max(q.bestMarks ?? -999, marksObtained),
              lastAttemptDate: savedAttempt.completedAt,
            };
          }
          return q;
        })
      );

      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to save quiz attempt:', err);
    } finally {
      setIsSubmittingAttempt(false);
    }
  };

  // Reattempt from History, Saved Quizzes, Review Modal, or Runner
  const handleStartReattempt = async (quizOrAttempt: { quizId?: string; id?: string; questionsSnapshot?: Question[]; questions?: Question[] } & any) => {
    let questionsToUse: Question[] = [];
    let titleToUse = quizOrAttempt.title || quizOrAttempt.quizTitle || 'Practice Quiz';
    let subjectToUse = quizOrAttempt.subject || '';
    let chapterToUse = quizOrAttempt.chapter || '';
    let difficultyToUse = quizOrAttempt.difficulty || 'Medium';
    let quizIdToUse = quizOrAttempt.quizId || quizOrAttempt.id;

    if (quizOrAttempt.questions && Array.isArray(quizOrAttempt.questions) && quizOrAttempt.questions.length > 0) {
      questionsToUse = quizOrAttempt.questions;
    } else if (quizOrAttempt.questionsSnapshot && quizOrAttempt.questionsSnapshot.length > 0) {
      questionsToUse = quizOrAttempt.questionsSnapshot;
    } else if (quizOrAttempt.quizId) {
      // Try to fetch parent quiz
      const parentQuiz = await getQuiz(quizOrAttempt.quizId);
      if (parentQuiz?.questions) {
        questionsToUse = parentQuiz.questions;
        titleToUse = parentQuiz.title;
        subjectToUse = parentQuiz.subject;
        chapterToUse = parentQuiz.chapter || '';
        difficultyToUse = parentQuiz.difficulty;
      }
    }

    if (questionsToUse.length === 0) {
      alert('Could not find question set for this quiz to reattempt.');
      return;
    }

    const quizObj: Quiz = {
      id: quizIdToUse,
      userId: currentUser?.uid || '',
      title: titleToUse,
      subject: subjectToUse,
      chapter: chapterToUse,
      difficulty: difficultyToUse,
      numberOfQuestions: questionsToUse.length,
      questions: questionsToUse,
      createdAt: new Date().toISOString(),
    };

    // Close review modal if open
    setSelectedReviewAttempt(null);
    setReviewQuestions([]);

    // Initialize active quiz state
    setActiveQuiz(quizObj);
    setUserAnswers({});
    setCurrentQuestionIdx(0);
    setTimerSeconds(0);
    setIsSubmitted(false);
    setSubmittedAttempt(null);
  };

  const handleOpenReview = async (attempt: QuizAttempt) => {
    let qList: Question[] = [];
    if (attempt.questionsSnapshot && attempt.questionsSnapshot.length > 0) {
      qList = attempt.questionsSnapshot;
    } else if (attempt.quizId) {
      const parent = await getQuiz(attempt.quizId);
      if (parent?.questions) {
        qList = parent.questions;
      }
    }

    if (qList.length === 0) {
      alert('Question snapshot not available for this legacy attempt.');
      return;
    }

    setSelectedReviewAttempt(attempt);
    setReviewQuestions(qList);
  };

  const handleDeleteAttempt = async (attemptId: string) => {
    try {
      await deleteQuizAttempt(attemptId);
      setQuizAttempts((prev) => prev.filter((a) => a.id !== attemptId));
    } catch (err) {
      console.error('Error deleting attempt:', err);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      await deleteQuiz(quizId);
      setSavedQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      console.error('Error deleting quiz:', err);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Tabs (Only visible when not actively taking a quiz) */}
      {!activeQuiz && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Quiz & Practice Arena</h1>
              <p className="text-xs text-slate-500 mt-1">
                Generate topic-wise practice sets, review your attempt marks, and reattempt tests to master concepts.
              </p>
            </div>

            {/* Tab navigation buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'create'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Quiz</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Quiz History</span>
                {quizAttempts.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-extrabold">
                    {quizAttempts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'saved'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Saved Sets</span>
                {savedQuizzes.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px] font-extrabold">
                    {savedQuizzes.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SWITCHER */}
      {!activeQuiz ? (
        <>
          {activeTab === 'create' && (
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
          )}

          {activeTab === 'history' && (
            <QuizHistoryView
              attempts={quizAttempts}
              onReattempt={handleStartReattempt}
              onReview={handleOpenReview}
              onDeleteAttempt={handleDeleteAttempt}
              onNewQuiz={() => setActiveTab('create')}
            />
          )}

          {activeTab === 'saved' && (
            <SavedQuizzesView
              quizzes={savedQuizzes}
              onStartQuiz={handleStartReattempt}
              onDeleteQuiz={handleDeleteQuiz}
              onNewQuiz={() => setActiveTab('create')}
            />
          )}
        </>
      ) : (
        /* INTERACTIVE QUIZ RUNNER */
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Quiz Top Header Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                  {activeQuiz.subject}
                </span>
                {activeQuiz.difficulty && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {activeQuiz.difficulty}
                  </span>
                )}
                {isSubmitted && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                    Completed
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-1">{activeQuiz.title}</h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-xs font-mono font-bold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>{formatTime(timerSeconds)}</span>
              </div>
              <button
                onClick={() => {
                  if (!isSubmitted && Object.keys(userAnswers).length > 0) {
                    if (!window.confirm('Exit quiz without submitting? Your current progress will not be saved.')) {
                      return;
                    }
                  }
                  setActiveQuiz(null);
                  setIsSubmitted(false);
                  setUserAnswers({});
                  setSubmittedAttempt(null);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>

          {/* Results Summary Banner (Visible only after submission) */}
          {isSubmitted && submittedAttempt && (
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 animate-in fade-in zoom-in-95">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" /> Quiz Completed Successfully
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold mt-1">Your Performance Summary</h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Time taken: {formatTime(submittedAttempt.timeTakenSeconds)} • Marking scheme: +1.00 for correct, -0.25 for incorrect
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartReattempt(activeQuiz)}
                    className="px-4 py-2.5 bg-white text-indigo-950 font-bold text-xs rounded-xl hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Reattempt Quiz</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveQuiz(null);
                      setActiveTab('history');
                    }}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    View History
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                  <span className="block text-[10px] uppercase font-bold text-indigo-200 tracking-wider">
                    Marks Obtained
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl sm:text-3xl font-black text-amber-300">
                      {(submittedAttempt.marksObtained ?? 0) > 0 ? `+${submittedAttempt.marksObtained}` : (submittedAttempt.marksObtained ?? 0)}
                    </span>
                    <span className="text-xs text-indigo-200 font-bold">/ {submittedAttempt.maxMarks ?? submittedAttempt.totalQuestions}</span>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="block text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                    Accuracy
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 block">
                    {submittedAttempt.accuracy}%
                  </span>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="block text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                    Marks Breakdown
                  </span>
                  <div className="flex items-center gap-1.5 text-sm font-bold mt-1">
                    <span className="text-emerald-400">+{submittedAttempt.positiveMarks ?? 0}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-rose-400">-{submittedAttempt.negativeMarks ?? 0}</span>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="block text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                    Responses
                  </span>
                  <div className="flex items-center gap-2 text-xs font-bold mt-1.5">
                    <span className="text-emerald-400">{submittedAttempt.correctAnswersCount ?? 0} Correct</span>
                    <span className="text-rose-400">{submittedAttempt.wrongAnswersCount ?? 0} Wrong</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper + Palette Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left/Main Question Area */}
            <div className="lg:col-span-8 space-y-4">
              {/* Question Progress Info */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 bg-slate-100/70 p-3 rounded-2xl">
                <span>
                  Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
                </span>
                <span>
                  {Object.keys(userAnswers).length} / {activeQuiz.questions.length} Answered
                </span>
              </div>

              {/* Current Question Box */}
              {activeQuiz.questions[currentQuestionIdx] && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                      {currentQuestionIdx + 1}. {activeQuiz.questions[currentQuestionIdx].question}
                    </h3>
                  </div>

                  {/* Options List */}
                  <div className="space-y-3">
                    {activeQuiz.questions[currentQuestionIdx].options.map((opt, optIdx) => {
                      const qId = activeQuiz.questions[currentQuestionIdx].id;
                      const isSelected = userAnswers[qId] === optIdx;
                      const isCorrect = activeQuiz.questions[currentQuestionIdx].correctOptionIndex === optIdx;

                      let buttonStyle = 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 bg-white';

                      if (isSubmitted) {
                        if (isCorrect) {
                          buttonStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-500';
                        } else if (isSelected && !isCorrect) {
                          buttonStyle = 'border-rose-500 bg-rose-50 text-rose-950 font-bold ring-1 ring-rose-500';
                        } else {
                          buttonStyle = 'border-slate-100 text-slate-400 opacity-60 bg-slate-50';
                        }
                      } else if (isSelected) {
                        buttonStyle = 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-bold shadow-xs ring-1 ring-indigo-600';
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={isSubmitted}
                          onClick={() => handleSelectOption(qId, optIdx)}
                          className={`w-full p-4 rounded-2xl border text-xs text-left transition-all flex items-center justify-between gap-3 ${buttonStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="leading-relaxed">{opt}</span>
                          </div>
                          {isSubmitted && isCorrect && (
                            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Correct
                            </span>
                          )}
                          {isSubmitted && isSelected && !isCorrect && (
                            <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Your Choice
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Box when Submitted */}
                  {isSubmitted && (
                    <div className="p-4 sm:p-5 bg-indigo-50/80 border border-indigo-100 rounded-2xl text-xs space-y-2 animate-in fade-in">
                      <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>Step-by-Step Explanation:</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {activeQuiz.questions[currentQuestionIdx].explanation}
                      </p>
                    </div>
                  )}

                  {/* Navigation Controls */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      disabled={currentQuestionIdx === 0}
                      onClick={() => setCurrentQuestionIdx((p) => p - 1)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-50 flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    {!isSubmitted ? (
                      currentQuestionIdx === activeQuiz.questions.length - 1 ? (
                        <button
                          onClick={handleSubmitQuiz}
                          disabled={isSubmittingAttempt}
                          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center gap-2"
                        >
                          {isSubmittingAttempt ? 'Submitting Score...' : 'Submit & Check Marks'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                        >
                          <span>Next Question</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )
                    ) : (
                      currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                        <button
                          onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-indigo-700"
                        >
                          <span>Next Question</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveQuiz(null);
                            setActiveTab('history');
                          }}
                          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                        >
                          Finish Review
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Question Palette Card */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Question Palette
                </h4>

                <div className="grid grid-cols-5 gap-2">
                  {activeQuiz.questions.map((q, idx) => {
                    const isSelected = currentQuestionIdx === idx;
                    const isAnswered = userAnswers[q.id] !== undefined;

                    let btnColor = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';

                    if (isSubmitted) {
                      const isCorrect = userAnswers[q.id] === q.correctOptionIndex;
                      const isWrong = isAnswered && !isCorrect;

                      if (isCorrect) {
                        btnColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                      } else if (isWrong) {
                        btnColor = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                      } else {
                        btnColor = 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
                      }
                    } else if (isAnswered) {
                      btnColor = 'bg-indigo-600 text-white border-indigo-600 font-bold';
                    }

                    if (isSelected) {
                      btnColor += ' ring-2 ring-indigo-600 ring-offset-2';
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIdx(idx)}
                        className={`h-9 rounded-xl border text-xs font-bold flex items-center justify-center transition-all ${btnColor}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Palette Legend */}
                <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] font-medium text-slate-500">
                  {!isSubmitted ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-indigo-600 inline-block"></span>
                        <span>Answered</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block"></span>
                        <span>Not Answered</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                        <span>Correct (+1.00)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
                        <span>Incorrect (-0.25)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-amber-400 inline-block"></span>
                        <span>Skipped (0.00)</span>
                      </div>
                    </>
                  )}
                </div>

                {!isSubmitted && (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={isSubmittingAttempt}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  >
                    Submit Quiz
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {selectedReviewAttempt && (
        <QuizReviewModal
          attempt={selectedReviewAttempt}
          questions={reviewQuestions}
          onClose={() => {
            setSelectedReviewAttempt(null);
            setReviewQuestions([]);
          }}
          onReattempt={(att, qs) => {
            handleStartReattempt({ ...att, questions: qs });
          }}
        />
      )}
    </div>
  );
};
