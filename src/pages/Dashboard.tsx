import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserDocuments,
  getUserQuizAttempts,
  getUserMockAttempts,
  getUserAnalytics,
} from '../firebase/db';
import {
  DocumentMetadata,
  QuizAttempt,
  MockAttempt,
  UserAnalytics,
} from '../types';
import { CardSkeleton } from '../components/common/SkeletonLoader';
import {
  ArrowRight,
  Sparkles,
  Zap,
  Flame,
  CheckCircle2,
  Calendar,
  Award,
  TrendingUp,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [recentQuizAttempts, setRecentQuizAttempts] = useState<QuizAttempt[]>([]);
  const [recentMockAttempts, setRecentMockAttempts] = useState<MockAttempt[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!currentUser) return;
      try {
        const [docs, quizAtt, mockAtt, anal] = await Promise.all([
          getUserDocuments(currentUser.uid),
          getUserQuizAttempts(currentUser.uid),
          getUserMockAttempts(currentUser.uid),
          getUserAnalytics(currentUser.uid),
        ]);
        setDocuments(docs);
        setRecentQuizAttempts(quizAtt.slice(0, 5));
        setRecentMockAttempts(mockAtt.slice(0, 5));
        setAnalytics(anal);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [currentUser]);

  // Compute Daily Streak & Weekly Activity Tracker
  const calculateStreakInfo = () => {
    const activityDates = new Set<string>();

    recentQuizAttempts.forEach((q) => {
      if (q.completedAt) {
        activityDates.add(q.completedAt.split('T')[0]);
      }
    });

    recentMockAttempts.forEach((m) => {
      if (m.completedAt) {
        activityDates.add(m.completedAt.split('T')[0]);
      }
    });

    documents.forEach((d) => {
      if (d.uploadDate) {
        activityDates.add(d.uploadDate.split('T')[0]);
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    activityDates.add(todayStr); // Always count active session today

    if (userProfile?.lastActiveDate) {
      activityDates.add(userProfile.lastActiveDate.split('T')[0]);
    }

    // Calculate current consecutive streak
    let streakCount = 0;
    const curr = new Date();

    while (true) {
      const dateStr = curr.toISOString().split('T')[0];
      if (activityDates.has(dateStr)) {
        streakCount++;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }

    const finalStreak = Math.max(streakCount, userProfile?.streakDays || 1);

    // Current week Mon -> Sun
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon
    const distanceToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMon);

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dStr = d.toISOString().split('T')[0];
      const isToday = dStr === todayStr;
      const isActive = activityDates.has(dStr);
      return { dayName, dateStr: dStr, isToday, isActive };
    });

    return { streakCount: finalStreak, weekDays, isActiveToday: activityDates.has(todayStr) };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const avgAccuracy = analytics?.averageAccuracy ?? 0;
  const quizzesTaken = analytics?.totalQuizzesTaken ?? recentQuizAttempts.length;
  const dailyHours = userProfile?.dailyStudyHours ?? 0;
  const streakInfo = calculateStreakInfo();

  // Find weak subjects from analytics if available
  const weakSubjects = analytics?.subjectPerformance
    ? Object.entries(analytics.subjectPerformance)
        .map(([subject, perf]) => ({
          subject,
          accuracy: (perf as { averageAccuracy: number }).averageAccuracy,
        }))
        .filter((item) => item.accuracy < 75)
        .sort((a, b) => a.accuracy - b.accuracy)
    : [];

  return (
    <div className="space-y-6">
      {/* Today's Focus Hero */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 border border-indigo-600/50 shadow-xl relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-3 max-w-xl z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-500 animate-bounce" />
              <span>{streakInfo.streakCount} Day Study Streak!</span>
            </span>
            <span className="px-3 py-1 bg-white/10 text-indigo-200 rounded-full text-xs font-medium border border-white/10">
              Welcome back, {userProfile?.displayName || 'Aspirant'}!
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            Target: {userProfile?.targetExam || 'Competitive Exam'}
          </h2>
          <p className="text-indigo-200 text-xs sm:text-sm">
            {documents.length > 0
              ? `${documents.length} study materials ready. Maintain your daily momentum!`
              : 'Upload notes or study materials to generate AI practice quizzes & flashcards.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0 z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3.5 text-center border border-white/20">
            <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Daily Goal</p>
            <p className="text-xl font-bold">
              {dailyHours} <span className="text-xs font-normal opacity-80">hrs/day</span>
            </p>
          </div>
          <Link
            to="/quiz-generator"
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Start Practice</span>
          </Link>
        </div>
      </div>

      {/* DAILY STREAK TRACKER WIDGET */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-md shadow-orange-500/20 shrink-0">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  Daily Study Streak
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {streakInfo.streakCount} {streakInfo.streakCount === 1 ? 'Day' : 'Days'} 🔥
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Study or take a quiz every day to build long-term retention & test readiness.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            <Link
              to="/flashcards"
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-[11px] sm:text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Flashcards</span>
            </Link>
            <Link
              to="/quiz-generator"
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 text-[11px] sm:text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Quick Quiz</span>
            </Link>
          </div>
        </div>

        {/* 7-Day Weekly Streak Circles */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2.5 md:gap-3 text-center">
          {streakInfo.weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={`p-1.5 sm:p-2.5 md:p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 min-w-0 ${
                day.isToday
                  ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 shadow-xs'
                  : day.isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate max-w-full">{day.dayName}</span>
              <div className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center">
                {day.isActive ? (
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-500 text-amber-500" />
                ) : (
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>
                )}
              </div>
              <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 truncate max-w-full">
                {day.isToday ? 'Today' : day.dateStr.slice(8)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Documents Ready
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{documents.length}</span>
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-full"></div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Average Accuracy
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{avgAccuracy ? `${avgAccuracy}%` : '0%'}</span>
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, avgAccuracy)}%` }}></div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Quizzes Taken
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{quizzesTaken}</span>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {quizzesTaken > 0 ? `${recentQuizAttempts.length} recorded attempts` : 'No quizzes taken yet'}
          </p>
        </div>

        {/* Card 4 - Daily Streak Badge */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Current Streak
          </span>
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 fill-amber-500 text-amber-500" />
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {streakInfo.streakCount} {streakInfo.streakCount === 1 ? 'Day' : 'Days'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic">
            🔥 Keep up the daily practice!
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Activity Table (8 Columns) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Recent Study Materials</h3>
            <Link to="/documents" className="text-xs text-indigo-600 font-bold hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            {documents.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Topics
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {documents.slice(0, 5).map((doc) => {
                    const subjectTagColor =
                      doc.subject.includes('Polity')
                        ? 'bg-amber-50 text-amber-700'
                        : doc.subject.includes('Quant') || doc.subject.includes('Math')
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-rose-50 text-rose-700';

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-700 max-w-[200px] truncate">
                          {doc.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${subjectTagColor}`}>
                            {doc.subject || 'GENERAL'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-[180px] truncate">
                          {doc.chapters && doc.chapters.length > 0
                            ? doc.chapters.map((c) => c.title).join(', ')
                            : doc.summary?.slice(0, 35) || 'Key Concepts & Formulae'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase">
                            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span> Ready
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center space-y-3">
                <p className="text-xs text-slate-500">No study materials uploaded yet.</p>
                <Link
                  to="/documents"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Upload Material
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Cards (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Weak Areas */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Weak Areas</h3>
            {weakSubjects.length > 0 ? (
              <div className="space-y-4">
                {weakSubjects.map((item) => (
                  <div key={item.subject}>
                    <div className="flex justify-between text-[11px] mb-1 font-bold">
                      <span className="text-slate-500">{item.subject}</span>
                      <span className="text-rose-600">{item.accuracy}% Score</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-400 h-full" style={{ width: `${item.accuracy}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                {quizzesTaken > 0
                  ? 'No weak areas identified. Good performance across topics!'
                  : 'Complete practice quizzes to identify weak areas.'}
              </p>
            )}

            <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <p className="text-[11px] text-slate-600 italic">
                {weakSubjects.length > 0
                  ? `AI suggests practicing ${weakSubjects[0].subject} questions.`
                  : 'Upload study notes to generate topic quizzes.'}
              </p>
            </div>
          </div>

          {/* CTA Smart Flashcards Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-6 text-white border border-indigo-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4 fill-amber-400" /> Active Recall & SRS
            </div>
            <h4 className="font-bold text-base sm:text-lg leading-tight">Smart Flashcard Decks</h4>
            <p className="text-slate-300 text-xs">
              Boost long-term memory retention with Spaced Repetition generated from your uploaded materials.
            </p>
            <Link
              to="/flashcards"
              className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-2xs"
            >
              Practice Flashcards
            </Link>
          </div>

          {/* CTA Mock Card */}
          <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-800 space-y-3">
            <h4 className="font-bold text-base sm:text-lg leading-tight">Ready for a Mock Test?</h4>
            <p className="text-slate-400 text-xs sm:text-sm">
              Test your full-length exam preparation in a timed environment.
            </p>
            <Link
              to="/mocks"
              className="block w-full text-center bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-lg text-xs sm:text-sm font-bold transition-colors"
            >
              Generate Mock Test
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

