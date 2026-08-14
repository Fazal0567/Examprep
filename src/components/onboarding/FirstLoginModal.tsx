import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Calendar, Clock, User, CheckCircle2, Sparkles, ArrowRight, Target, Zap } from 'lucide-react';
import { Logo } from '../common/Logo';

const POPULAR_EXAMS = [
  'IBPS Clerk',
  'IBPS PO',
  'SSC CGL',
  'SSC CHSL',
  'UPSC',
  'CUET PG',
  'CAT',
  'GATE',
  'NEET',
  'JEE',
];

export const FirstLoginModal: React.FC = () => {
  const { userProfile, updateProfileData } = useAuth();

  const [fullName, setFullName] = useState(userProfile?.displayName || '');
  const [selectedExam, setSelectedExam] = useState(userProfile?.targetExam || 'SSC CGL');
  const [customExam, setCustomExam] = useState('');
  const [examDate, setExamDate] = useState(
    userProfile?.targetExamDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dailyHours, setDailyHours] = useState(userProfile?.dailyStudyHours || 4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!userProfile || userProfile.isOnboarded) {
    return null;
  }

  const setPresetDateDays = (days: number) => {
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setExamDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalExam = selectedExam === 'Other' ? customExam || 'Custom Exam' : selectedExam;
      await updateProfileData({
        displayName: fullName || userProfile.displayName || 'Aspirant',
        targetExam: finalExam,
        targetExamDate: examDate,
        dailyStudyHours: Number(dailyHours),
        isOnboarded: true,
      });
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[88vh] my-auto overflow-hidden text-slate-900 dark:text-slate-100"
      >
        {/* Modal Header - Fixed Top */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 p-5 sm:p-6 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

          <div className="mb-3">
            <Logo size="md" variant="dark" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            Personalize Your Study Plan
          </h2>
          <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-md">
            Configure your target exam details to receive AI-tailored quizzes, flashcards, and mock tests.
          </p>
        </div>

        {/* Modal Form Body - Scrollable Container */}
        <form id="onboarding-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
          </div>

          {/* 2. Target Exam */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Select Target Exam
              </label>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Tap to select</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 mb-2">
              {POPULAR_EXAMS.map((exam) => (
                <button
                  key={exam}
                  type="button"
                  onClick={() => setSelectedExam(exam)}
                  className={`px-2.5 py-2 text-xs font-semibold rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                    selectedExam === exam
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{exam}</span>
                  {selectedExam === exam && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedExam('Other')}
                className={`px-2.5 py-2 text-xs font-semibold rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                  selectedExam === 'Other'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Other Exam</span>
                {selectedExam === 'Other' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />}
              </button>
            </div>

            {selectedExam === 'Other' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-1"
              >
                <input
                  type="text"
                  required
                  value={customExam}
                  onChange={(e) => setCustomExam(e.target.value)}
                  placeholder="Enter exam name (e.g. State PCS, CLAT, GRE, SAT)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </motion.div>
            )}
          </div>

          {/* 3. Target Exam Date & Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Target Exam Date
              </label>
              {/* Quick Date Presets */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPresetDateDays(90)}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors"
                >
                  +3 Mo
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDateDays(180)}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors"
                >
                  +6 Mo
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDateDays(365)}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors"
                >
                  +1 Yr
                </button>
              </div>
            </div>

            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 4. Daily Study Hours */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Daily Target Hours
              </label>
              <span className="text-xs font-extrabold px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                {dailyHours} {dailyHours === 1 ? 'hour' : 'hours'} / day
              </span>
            </div>

            {/* Quick preset buttons */}
            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              {[2, 4, 6, 8].map((hr) => (
                <button
                  key={hr}
                  type="button"
                  onClick={() => setDailyHours(hr)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer ${
                    dailyHours === hr
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {hr}h / day
                </button>
              ))}
            </div>

            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={dailyHours}
              onChange={(e) => setDailyHours(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
            />
          </div>
        </form>

        {/* Modal Sticky Footer Action Button */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
          <button
            type="submit"
            form="onboarding-form"
            disabled={isSubmitting}
            className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 text-sm sm:text-base cursor-pointer"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving Your Workspace...</span>
              </div>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white shrink-0" />
                <span>Launch Exam Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

