import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserDocuments,
  saveMockTest,
  saveMockAttempt,
  getUserMockAttempts,
  getUserMockTests,
  deleteMockAttempt,
  deleteMockTest,
  getMockTest,
} from '../firebase/db';
import { DocumentMetadata, Question, MockTest, MockAttempt, DifficultyLevel } from '../types';
import { buildRichDocumentContext } from '../utils/documentContextBuilder';
import { MockHistoryView } from '../components/mocks/MockHistoryView';
import { MockReviewModal } from '../components/mocks/MockReviewModal';
import { SavedMockPapersView } from '../components/mocks/SavedMockPapersView';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Bookmark,
  Sparkles,
  BookOpen,
  Award,
  AlertCircle,
  BarChart3,
  RotateCcw,
  History,
  FileText,
  HelpCircle,
  Flame,
  ChevronRight,
} from 'lucide-react';

export const Mocks: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'generator' | 'history' | 'papers'>('generator');

  // Documents and Subjects
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [numQuestions, setNumQuestions] = useState<number>(15);
  const [timeLimit, setTimeLimit] = useState<number>(15); // minutes

  // Data collections
  const [mockAttempts, setMockAttempts] = useState<MockAttempt[]>([]);
  const [savedMockTests, setSavedMockTests] = useState<MockTest[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Active Mock Runner State
  const [generating, setGenerating] = useState(false);
  const [activeMock, setActiveMock] = useState<MockTest | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: number }>({});
  const [markedForReview, setMarkedForReview] = useState<{ [qId: string]: boolean }>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedAttempt, setLastSubmittedAttempt] = useState<MockAttempt | null>(null);

  // Review Modal State
  const [reviewingAttempt, setReviewingAttempt] = useState<{
    attempt: MockAttempt;
    questions: Question[];
  } | null>(null);

  // Filter for post-submission review
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'wrong' | 'correct' | 'skipped'>('all');

  const loadAllData = async () => {
    if (!currentUser) return;
    try {
      setLoadingData(true);
      const [docs, attempts, mocks] = await Promise.all([
        getUserDocuments(currentUser.uid),
        getUserMockAttempts(currentUser.uid),
        getUserMockTests(currentUser.uid),
      ]);
      setDocuments(docs);
      setMockAttempts(attempts);
      setSavedMockTests(mocks);
      if (docs.length > 0 && !selectedSubject) {
        setSelectedSubject(docs[0].subject);
      }
    } catch (err) {
      console.error('Failed to load mocks data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [currentUser]);

  // Mock Timer Countdown
  useEffect(() => {
    let timer: any = null;
    if (activeMock && !isSubmitted && timeLeftSeconds > 0) {
      timer = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitMock(); // Auto submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeMock, isSubmitted, timeLeftSeconds]);

  const uniqueSubjects = Array.from(new Set(documents.map((d) => d.subject)));

  // Generate New Mock Handler
  const handleGenerateMock = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setErrorMsg('');
    setActiveMock(null);
    setIsSubmitted(false);
    setUserAnswers({});
    setMarkedForReview({});
    setCurrentIdx(0);
    setLastSubmittedAttempt(null);

    const subjectToUse = selectedSubject || 'General Aptitude';

    try {
      const contextDocs = documents.filter((d) => d.subject === subjectToUse);
      const documentContext = buildRichDocumentContext(contextDocs);

      const response = await fetch('/api/mock/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subjectToUse,
          difficulty,
          numberOfQuestions: numQuestions,
          timeLimitMinutes: timeLimit,
          targetExam: userProfile?.targetExam || 'Competitive Exam',
          documentContext,
        }),
      });

      const resData = await response.json();

      if (resData.success && resData.questions) {
        const newMockData: Omit<MockTest, 'id'> = {
          userId: currentUser?.uid || '',
          title: resData.title || `${subjectToUse} Sectional Mock Test`,
          subject: subjectToUse,
          difficulty,
          numberOfQuestions: numQuestions,
          timeLimitMinutes: timeLimit,
          questions: resData.questions as Question[],
          createdAt: new Date().toISOString(),
        };

        const savedMock = await saveMockTest(newMockData);
        setSavedMockTests((prev) => [savedMock, ...prev]);
        setActiveMock(savedMock);
        setTimeLeftSeconds(timeLimit * 60);
      } else {
        setErrorMsg(resData.error || 'Failed to generate sectional mock test.');
      }
    } catch (err: any) {
      console.error('Mock Generation error:', err);
      setErrorMsg(err.message || 'Error occurred while generating mock test.');
    } finally {
      setGenerating(false);
    }
  };

  // Reattempt Handler (From History or Saved Papers or Post-Submission)
  const handleReattempt = async (attemptOrMock: MockAttempt | MockTest, fallbackQuestions?: Question[]) => {
    setErrorMsg('');
    setUserAnswers({});
    setMarkedForReview({});
    setCurrentIdx(0);
    setIsSubmitted(false);
    setLastSubmittedAttempt(null);
    setReviewingAttempt(null);

    let targetMock: MockTest | null = null;

    if ('questions' in attemptOrMock && attemptOrMock.questions) {
      // It's a MockTest
      targetMock = attemptOrMock as MockTest;
    } else {
      // It's a MockAttempt
      const attempt = attemptOrMock as MockAttempt;
      if (fallbackQuestions && fallbackQuestions.length > 0) {
        targetMock = {
          id: attempt.mockId || `mock-${Date.now()}`,
          userId: currentUser?.uid || '',
          title: attempt.mockTitle,
          subject: attempt.subject,
          difficulty: attempt.difficulty || 'Medium',
          numberOfQuestions: fallbackQuestions.length,
          timeLimitMinutes: 15,
          questions: fallbackQuestions,
          createdAt: new Date().toISOString(),
        };
      } else if (attempt.questionsSnapshot && attempt.questionsSnapshot.length > 0) {
        targetMock = {
          id: attempt.mockId || `mock-${Date.now()}`,
          userId: currentUser?.uid || '',
          title: attempt.mockTitle,
          subject: attempt.subject,
          difficulty: attempt.difficulty || 'Medium',
          numberOfQuestions: attempt.questionsSnapshot.length,
          timeLimitMinutes: 15,
          questions: attempt.questionsSnapshot,
          createdAt: new Date().toISOString(),
        };
      } else {
        // Try fetching from database or local savedMockTests
        const found = savedMockTests.find((m) => m.id === attempt.mockId);
        if (found) {
          targetMock = found;
        } else if (attempt.mockId) {
          targetMock = await getMockTest(attempt.mockId);
        }
      }
    }

    if (targetMock && targetMock.questions && targetMock.questions.length > 0) {
      setActiveMock(targetMock);
      const limit = targetMock.timeLimitMinutes || 15;
      setTimeLeftSeconds(limit * 60);
      setActiveTab('generator');
    } else {
      setErrorMsg('Could not load the questions for this mock test to reattempt.');
    }
  };

  // Review Handler from History
  const handleOpenReview = async (attempt: MockAttempt) => {
    let questions: Question[] = [];
    if (attempt.questionsSnapshot && attempt.questionsSnapshot.length > 0) {
      questions = attempt.questionsSnapshot;
    } else {
      const found = savedMockTests.find((m) => m.id === attempt.mockId);
      if (found && found.questions) {
        questions = found.questions;
      } else if (attempt.mockId) {
        const fetched = await getMockTest(attempt.mockId);
        if (fetched?.questions) {
          questions = fetched.questions;
        }
      }
    }

    if (questions.length > 0) {
      setReviewingAttempt({ attempt, questions });
    } else {
      alert('Questions details are not available for this older attempt.');
    }
  };

  // Delete Handlers
  const handleDeleteAttempt = async (attemptId: string) => {
    await deleteMockAttempt(attemptId);
    setMockAttempts((prev) => prev.filter((a) => a.id !== attemptId));
  };

  const handleDeleteMockTest = async (mockId: string) => {
    await deleteMockTest(mockId);
    setSavedMockTests((prev) => prev.filter((m) => m.id !== mockId));
  };

  const handleSelectAnswer = (qId: string, optIdx: number) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => {
      // If clicking already selected answer, clear it (unselect)
      if (prev[qId] === optIdx) {
        const next = { ...prev };
        delete next[qId];
        return next;
      }
      return { ...prev, [qId]: optIdx };
    });
  };

  const handleClearAnswer = (qId: string) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
  };

  const toggleReviewMark = (qId: string) => {
    setMarkedForReview((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Submit Mock Test
  const handleSubmitMock = async () => {
    if (!activeMock || !currentUser || isSubmitted) return;
    setIsSubmitting(true);

    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    activeMock.questions.forEach((q) => {
      const ans = userAnswers[q.id];
      if (ans === undefined) {
        skipped += 1;
      } else if (ans === q.correctOptionIndex) {
        correct += 1;
      } else {
        wrong += 1;
      }
    });

    const total = activeMock.questions.length;
    const accuracy = Math.round((correct / total) * 100);
    const positiveMarks = correct * 1;
    const negativeMarks = wrong * 0.25;
    const marksObtained = +(positiveMarks - negativeMarks).toFixed(2);
    const maxMarks = total * 1;

    const timeSpent = (activeMock.timeLimitMinutes || 15) * 60 - timeLeftSeconds;

    const attemptData: Omit<MockAttempt, 'id'> = {
      userId: currentUser.uid,
      mockId: activeMock.id,
      mockTitle: activeMock.title,
      subject: activeMock.subject,
      difficulty: activeMock.difficulty,
      score: correct,
      totalQuestions: total,
      accuracy,
      correctAnswersCount: correct,
      wrongAnswersCount: wrong,
      skippedCount: skipped,
      positiveMarks,
      negativeMarks,
      marksObtained,
      maxMarks,
      timeTakenSeconds: Math.max(10, timeSpent),
      userAnswers,
      completedAt: new Date().toISOString(),
      questionsSnapshot: activeMock.questions,
    };

    try {
      const savedAttempt = await saveMockAttempt(attemptData);
      setMockAttempts((prev) => [savedAttempt, ...prev]);
      setLastSubmittedAttempt(savedAttempt);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to save mock attempt:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sectional Mock Tests</h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate timed exam environments with formula-based questions, negative marking, and detailed marks history.
          </p>
        </div>

        {/* Tab Switcher (Only when not taking a live test) */}
        {!activeMock && (
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('generator')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'generator'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Mock</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Mock History</span>
              {mockAttempts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-extrabold ml-0.5">
                  {mockAttempts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('papers')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'papers'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Saved Papers</span>
              {savedMockTests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-extrabold ml-0.5">
                  {savedMockTests.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg('')}
            className="text-xs font-bold text-red-700 hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* RENDER ACTIVE TAB / LIVE RUNNER */}
      {!activeMock ? (
        activeTab === 'history' ? (
          <MockHistoryView
            attempts={mockAttempts}
            onReattempt={(att) => handleReattempt(att)}
            onReview={handleOpenReview}
            onDeleteAttempt={handleDeleteAttempt}
            onStartNewMock={() => setActiveTab('generator')}
          />
        ) : activeTab === 'papers' ? (
          <SavedMockPapersView
            mockTests={savedMockTests}
            onStartMock={(mock) => handleReattempt(mock)}
            onDeleteMock={handleDeleteMockTest}
            onGenerateNew={() => setActiveTab('generator')}
          />
        ) : (
          /* MOCK SETUP CONFIGURATOR */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <Clock className="w-4 h-4" />
                <span>Configure Sectional Mock Test</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                Negative Marking: -0.25 / wrong
              </span>
            </div>

            <form onSubmit={handleGenerateMock} className="space-y-5">
              {/* Subject Select */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" /> Target Subject
                </label>

                {uniqueSubjects.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {uniqueSubjects.map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSelectedSubject(sub)}
                        className={`p-3 rounded-2xl border text-left text-xs font-semibold transition-all ${
                          selectedSubject === sub
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs font-bold ring-1 ring-indigo-500'
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
                    placeholder="Subject (e.g. Quantitative Aptitude, Reasoning, English)"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              {/* Questions & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-2">
                    Questions Count
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 15, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNumQuestions(num)}
                        className={`py-2 px-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                          numQuestions === num
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {num} Qs
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-2">
                    Time Limit (Minutes)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 15, 20].map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setTimeLimit(min)}
                        className={`py-2 px-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                          timeLimit === min
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {min} mins
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-2">
                  Exam Difficulty
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all text-center ${
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

              {/* Launch Button */}
              <button
                type="submit"
                disabled={generating}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Assembling Mock Exam Paper...</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Start Timed Sectional Mock</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Link to History */}
            {mockAttempts.length > 0 && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>You have {mockAttempts.length} previous mock attempts recorded.</span>
                <button
                  onClick={() => setActiveTab('history')}
                  className="font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <span>View Mock History</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        /* TIMED MOCK RUNNER & POST-SUBMISSION RESULTS */
        <div className="space-y-6">
          {/* If Submitted: Show Big Marks Report Card */}
          {isSubmitted && (
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <div className="flex items-center gap-2 text-indigo-300 text-xs font-extrabold uppercase tracking-widest mb-1">
                    <Sparkles className="w-4 h-4 text-amber-300" /> Sectional Mock Result & Marks Card
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black">{activeMock.title}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => handleReattempt(activeMock)}
                    className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-2xl flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reattempt Mock</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveMock(null);
                      setActiveTab('history');
                    }}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/10 transition-all flex items-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View All Mock History</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveMock(null);
                      setActiveTab('generator');
                    }}
                    className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-2xl shadow-xs transition-all"
                  >
                    <span>New Sectional Test</span>
                  </button>
                </div>
              </div>

              {/* Marks Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(() => {
                  let correct = 0;
                  let wrong = 0;
                  let skipped = 0;
                  activeMock.questions.forEach((q) => {
                    const ans = userAnswers[q.id];
                    if (ans === undefined) skipped++;
                    else if (ans === q.correctOptionIndex) correct++;
                    else wrong++;
                  });
                  const pos = correct * 1;
                  const neg = wrong * 0.25;
                  const marks = +(pos - neg).toFixed(2);
                  const maxM = activeMock.questions.length * 1;
                  const acc = Math.round((correct / activeMock.questions.length) * 100);
                  const timeSpent = (activeMock.timeLimitMinutes || 15) * 60 - timeLeftSeconds;

                  return (
                    <>
                      <div className="p-4 bg-white/10 rounded-2xl border border-white/10 flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">
                          Net Marks Obtained
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                            {marks > 0 ? `+${marks}` : marks}
                          </span>
                          <span className="text-xs text-indigo-200 font-bold">/ {maxM}</span>
                        </div>
                        <span className="text-[10px] text-indigo-200/80 font-semibold mt-0.5">
                          Score: {correct} / {activeMock.questions.length}
                        </span>
                      </div>

                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                          Accuracy
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
                          {acc}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {correct} correct of {correct + wrong} attempted
                        </span>
                      </div>

                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                          Marking Breakdown
                        </span>
                        <div className="flex items-center gap-1.5 text-sm font-bold mt-1">
                          <span className="text-emerald-400">+{pos}</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-rose-400">-{neg}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          +1.0 Correct / -0.25 Wrong
                        </span>
                      </div>

                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                          Time Taken
                        </span>
                        <span className="text-base sm:text-lg font-bold text-slate-200 mt-0.5 font-mono">
                          {formatSeconds(Math.max(10, timeSpent))}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          of {activeMock.timeLimitMinutes} mins allocated
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-1 p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                          Breakdown
                        </span>
                        <div className="flex items-center gap-2 text-xs font-bold mt-1">
                          <span className="text-emerald-400">{correct} ✔</span>
                          <span className="text-rose-400">{wrong} ✖</span>
                          <span className="text-slate-400">{skipped} ⏭</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {activeMock.questions.length} total questions
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Test Runner Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Question Box */}
            <div className="lg:col-span-3 space-y-6">
              {/* Header Timer Bar */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {activeMock.subject} • {activeMock.difficulty}
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 mt-1">{activeMock.title}</h2>
                </div>

                <div className="flex items-center gap-3">
                  {!isSubmitted ? (
                    <>
                      <div
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono font-bold text-xs ${
                          timeLeftSeconds < 180
                            ? 'bg-red-100 text-red-700 animate-pulse'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        <span>{formatCountdown(timeLeftSeconds)}</span>
                      </div>

                      <button
                        onClick={handleSubmitMock}
                        disabled={isSubmitting}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Test'}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReattempt(activeMock)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reattempt</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Question Box */}
              {activeMock.questions[currentIdx] && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs font-semibold text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        Question {currentIdx + 1} of {activeMock.questions.length}
                      </span>
                      {activeMock.questions[currentIdx].chapter && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                          {activeMock.questions[currentIdx].chapter}
                        </span>
                      )}
                    </div>

                    {!isSubmitted ? (
                      <div className="flex items-center gap-2">
                        {userAnswers[activeMock.questions[currentIdx].id] !== undefined && (
                          <button
                            onClick={() => handleClearAnswer(activeMock.questions[currentIdx].id)}
                            className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1"
                          >
                            Clear Response
                          </button>
                        )}
                        <button
                          onClick={() => toggleReviewMark(activeMock.questions[currentIdx].id)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                            markedForReview[activeMock.questions[currentIdx].id]
                              ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>
                            {markedForReview[activeMock.questions[currentIdx].id] ? 'Marked' : 'Mark for Review'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      /* Post-submission question marks indicator */
                      <div>
                        {(() => {
                          const q = activeMock.questions[currentIdx];
                          const userAns = userAnswers[q.id];
                          if (userAns === undefined) {
                            return (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200">
                                0.00 (Skipped)
                              </span>
                            );
                          } else if (userAns === q.correctOptionIndex) {
                            return (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>+1.00 Mark</span>
                              </span>
                            );
                          } else {
                            return (
                              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>-0.25 Penalty</span>
                              </span>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-relaxed">
                    {activeMock.questions[currentIdx].question}
                  </h3>

                  <div className="space-y-3">
                    {activeMock.questions[currentIdx].options.map((opt, optIdx) => {
                      const qId = activeMock.questions[currentIdx].id;
                      const isSelected = userAnswers[qId] === optIdx;
                      const isCorrect = activeMock.questions[currentIdx].correctOptionIndex === optIdx;

                      let btnStyle = 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 bg-white';

                      if (isSubmitted) {
                        if (isCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-50/90 text-emerald-950 font-bold ring-1 ring-emerald-500';
                        } else if (isSelected && !isCorrect) {
                          btnStyle = 'border-rose-500 bg-rose-50/90 text-rose-950 font-bold ring-1 ring-rose-500';
                        } else {
                          btnStyle = 'border-slate-100 text-slate-400 opacity-60 bg-white';
                        }
                      } else if (isSelected) {
                        btnStyle = 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold shadow-xs ring-1 ring-indigo-500';
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={isSubmitted}
                          onClick={() => handleSelectAnswer(qId, optIdx)}
                          className={`w-full p-4 rounded-2xl border text-xs text-left transition-all flex items-center justify-between gap-3 ${btnStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="leading-relaxed">{opt}</span>
                          </div>
                          {isSubmitted && isCorrect && (
                            <span className="text-[10px] uppercase font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Correct
                            </span>
                          )}
                          {isSubmitted && isSelected && !isCorrect && (
                            <span className="text-[10px] uppercase font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Your Selection
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isSubmitted && (
                    <div className="p-4 sm:p-5 bg-indigo-50/80 border border-indigo-100 rounded-2xl text-xs space-y-2">
                      <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>Detailed Answer Explanation:</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {activeMock.questions[currentIdx].explanation}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      disabled={currentIdx === 0}
                      onClick={() => setCurrentIdx((p) => p - 1)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-50"
                    >
                      Previous
                    </button>

                    <button
                      disabled={currentIdx === activeMock.questions.length - 1}
                      onClick={() => setCurrentIdx((p) => p + 1)}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-30"
                    >
                      Next Question
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Question Palette Sidebar */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-4 h-fit">
              <h4 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Question Palette</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {Object.keys(userAnswers).length} / {activeMock.questions.length} answered
                </span>
              </h4>

              <div className="grid grid-cols-5 gap-2">
                {activeMock.questions.map((q, idx) => {
                  const isAns = userAnswers[q.id] !== undefined;
                  const isMarked = markedForReview[q.id];
                  const isCurr = currentIdx === idx;

                  let stateStyle = 'bg-slate-100 text-slate-700 hover:bg-slate-200';

                  if (isSubmitted) {
                    const isCorrect = isAns && userAnswers[q.id] === q.correctOptionIndex;
                    const isWrong = isAns && userAnswers[q.id] !== q.correctOptionIndex;
                    if (isCorrect) {
                      stateStyle = 'bg-emerald-500 text-white font-bold';
                    } else if (isWrong) {
                      stateStyle = 'bg-rose-500 text-white font-bold';
                    } else {
                      stateStyle = 'bg-slate-100 text-slate-400';
                    }
                  } else if (isMarked) {
                    stateStyle = 'bg-amber-100 text-amber-800 font-bold border border-amber-300';
                  } else if (isAns) {
                    stateStyle = 'bg-emerald-500 text-white font-bold';
                  }

                  if (isCurr) {
                    stateStyle += ' ring-2 ring-indigo-600 ring-offset-2';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center shadow-2xs ${stateStyle}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[10px] text-slate-500 font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <span>{isSubmitted ? 'Correct Answer' : 'Answered'}</span>
                </div>
                {isSubmitted && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-rose-500"></div>
                    <span>Incorrect Answer</span>
                  </div>
                )}
                {!isSubmitted && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></div>
                    <span>Marked for Review</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></div>
                  <span>Unanswered</span>
                </div>
              </div>

              {isSubmitted && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => handleReattempt(activeMock)}
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reattempt Mock</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveMock(null);
                      setActiveTab('history');
                    }}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Mock History</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingAttempt && (
        <MockReviewModal
          attempt={reviewingAttempt.attempt}
          questions={reviewingAttempt.questions}
          onClose={() => setReviewingAttempt(null)}
          onReattempt={(att, qs) => handleReattempt(att, qs)}
        />
      )}
    </div>
  );
};
