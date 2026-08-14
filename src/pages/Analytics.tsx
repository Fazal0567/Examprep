import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserAnalytics,
  getUserQuizAttempts,
  getUserMockAttempts,
} from '../firebase/db';
import { UserAnalytics, QuizAttempt, MockAttempt } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  BarChart2,
  Award,
  Clock,
  HelpCircle,
  TrendingUp,
  BookOpen,
  Calendar,
} from 'lucide-react';

export const Analytics: React.FC = () => {
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [mockAttempts, setMockAttempts] = useState<MockAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;
      try {
        const [anal, quizzes, mocks] = await Promise.all([
          getUserAnalytics(currentUser.uid),
          getUserQuizAttempts(currentUser.uid),
          getUserMockAttempts(currentUser.uid),
        ]);
        setAnalytics(anal);
        setQuizAttempts(quizzes);
        setMockAttempts(mocks);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  // Format data for Subject Performance Chart
  const subjectChartData = analytics?.subjectPerformance
    ? Object.entries(analytics.subjectPerformance).map(([subject, perf]) => {
        const p = perf as { averageAccuracy: number; quizzesTaken: number };
        return {
          subject,
          accuracy: p.averageAccuracy,
          quizzes: p.quizzesTaken,
        };
      })
    : [];

  // Weekly Trend Chart Data
  const weeklyData = analytics?.weeklyAccuracy && analytics.weeklyAccuracy.length > 0
    ? analytics.weeklyAccuracy
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Performance Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">
          Detailed response precision, time-per-question metrics, and subject mastery trends.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Accuracy</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {analytics?.averageAccuracy ? `${analytics.averageAccuracy}%` : '0%'}
          </div>
          <p className="text-[10px] text-slate-400">Target score baseline: 80%+</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Questions Answered</span>
            <HelpCircle className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {analytics?.totalQuestionsAnswered ?? 0}
          </div>
          <p className="text-[10px] text-slate-400">Total solved across quizzes & mocks</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Speed</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {analytics?.averageTimePerQuestionSeconds ? `${analytics.averageTimePerQuestionSeconds}s / Q` : '0s'}
          </div>
          <p className="text-[10px] text-slate-400">Competitive exam standard ~60s</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tests Completed</span>
            <BarChart2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">
            {(analytics?.totalQuizzesTaken || 0) + (analytics?.totalMocksTaken || 0)}
          </div>
          <p className="text-[10px] text-slate-400">Combined Quizzes + Mocks</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Accuracy Trend */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Accuracy Trend</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Recent Sessions</span>
          </div>

          <div className="h-64 w-full pt-2">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="#4f46e5" strokeWidth={3} dot={{ fill: '#4f46e5', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-100 rounded-2xl">
                No recent weekly quiz attempts recorded.
              </div>
            )}
          </div>
        </div>

        {/* Subject Accuracy Comparison */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Subject-wise Accuracy (%)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Mastery</span>
          </div>

          <div className="h-64 w-full pt-2">
            {subjectChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="accuracy" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-100 rounded-2xl">
                No subject performance data recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attempt History Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Recent Test Attempt History</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {quizAttempts.length + mockAttempts.length} total sessions
          </span>
        </div>

        {quizAttempts.length === 0 && mockAttempts.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No quiz or mock test history recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="pb-3 font-bold">Type</th>
                  <th className="pb-3 font-bold">Title</th>
                  <th className="pb-3 font-bold">Subject</th>
                  <th className="pb-3 font-bold">Marks / Score</th>
                  <th className="pb-3 font-bold">Accuracy</th>
                  <th className="pb-3 font-bold">Time Taken</th>
                  <th className="pb-3 font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {/* Mock Attempts */}
                {mockAttempts.map((attempt) => {
                  const correct = attempt.correctAnswersCount ?? attempt.score ?? 0;
                  const wrong = attempt.wrongAnswersCount ?? 0;
                  const pos = attempt.positiveMarks ?? correct * 1;
                  const neg = attempt.negativeMarks ?? wrong * 0.25;
                  const marks = attempt.marksObtained ?? +(pos - neg).toFixed(2);
                  const maxM = attempt.maxMarks ?? attempt.totalQuestions * 1;

                  return (
                    <tr key={attempt.id} className="hover:bg-slate-50/80">
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-extrabold uppercase">
                          Mock
                        </span>
                      </td>
                      <td className="py-3 font-bold text-slate-900">{attempt.mockTitle}</td>
                      <td className="py-3">{attempt.subject}</td>
                      <td className="py-3 font-bold text-indigo-600">
                        {marks > 0 ? `+${marks}` : marks} / {maxM}
                      </td>
                      <td className="py-3 font-bold text-emerald-600">{attempt.accuracy}%</td>
                      <td className="py-3 font-mono">{Math.round(attempt.timeTakenSeconds)}s</td>
                      <td className="py-3 text-slate-400">{new Date(attempt.completedAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}

                {/* Quiz Attempts */}
                {quizAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-50/80">
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase">
                        Quiz
                      </span>
                    </td>
                    <td className="py-3 font-bold text-slate-900">{attempt.quizTitle}</td>
                    <td className="py-3">{attempt.subject}</td>
                    <td className="py-3 font-bold text-indigo-600">{attempt.score} / {attempt.totalQuestions}</td>
                    <td className="py-3 font-bold text-emerald-600">{attempt.accuracy}%</td>
                    <td className="py-3 font-mono">{Math.round(attempt.timeTakenSeconds)}s</td>
                    <td className="py-3 text-slate-400">{new Date(attempt.completedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
