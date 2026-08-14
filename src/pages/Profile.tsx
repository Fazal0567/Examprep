import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addDocumentMetadata, getUserQuizzes, getUserMockTests, getUserDocuments, getUserFlashcardDecks } from '../firebase/db';
import {
  User,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Save,
  FilePlus,
  AlertCircle,
  Gauge,
  Zap,
  HelpCircle,
  Award,
  RefreshCw,
  FileText,
  UploadCloud,
  Layers,
} from 'lucide-react';

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

const DAILY_DOC_LIMIT = 10;
const DAILY_QUIZ_LIMIT = 10;
const DAILY_MOCK_LIMIT = 5;
const DAILY_FLASHCARD_LIMIT = 10;

export const Profile: React.FC = () => {
  const { userProfile, updateProfileData, currentUser } = useAuth();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [selectedExam, setSelectedExam] = useState(userProfile?.targetExam || 'SSC CGL');
  const [customExam, setCustomExam] = useState('');
  const [examDate, setExamDate] = useState(userProfile?.targetExamDate || '');
  const [dailyHours, setDailyHours] = useState(userProfile?.dailyStudyHours || 4);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [sampleLoading, setSampleLoading] = useState(false);

  // Daily Quota state
  const [todayDocs, setTodayDocs] = useState(0);
  const [todayQuizzes, setTodayQuizzes] = useState(0);
  const [todayMocks, setTodayMocks] = useState(0);
  const [todayDecks, setTodayDecks] = useState(0);
  const [loadingQuota, setLoadingQuota] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const fetchUsageQuota = async () => {
      setLoadingQuota(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const [quizzes, mocks, docs, decks] = await Promise.all([
          getUserQuizzes(currentUser.uid),
          getUserMockTests(currentUser.uid),
          getUserDocuments(currentUser.uid),
          getUserFlashcardDecks(currentUser.uid),
        ]);
        const quizzesCount = quizzes.filter((q) => q.createdAt && q.createdAt.startsWith(todayStr)).length;
        const mocksCount = mocks.filter((m) => m.createdAt && m.createdAt.startsWith(todayStr)).length;
        const docsCount = docs.filter((d) => d.uploadDate && d.uploadDate.startsWith(todayStr)).length;
        const decksCount = decks.filter((dk) => dk.createdAt && dk.createdAt.startsWith(todayStr)).length;

        setTodayQuizzes(quizzesCount);
        setTodayMocks(mocksCount);
        setTodayDocs(docsCount);
        setTodayDecks(decksCount);
      } catch (err) {
        console.error('Failed to load daily quota usage:', err);
      } finally {
        setLoadingQuota(false);
      }
    };

    fetchUsageQuota();
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const finalExam = selectedExam === 'Other' ? customExam || 'Custom Exam' : selectedExam;
      await updateProfileData({
        displayName,
        targetExam: finalExam,
        targetExamDate: examDate,
        dailyStudyHours: Number(dailyHours),
      });
      setSuccessMsg('Profile and exam target goals updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  // Pre-load sample study material for instant testing
  const handleLoadSampleMaterials = async () => {
    if (!currentUser) return;
    setSampleLoading(true);
    try {
      await addDocumentMetadata({
        userId: currentUser.uid,
        name: 'Indian Polity - Constitution Basics & Fundamental Rights.pdf',
        fileType: 'PDF',
        fileSize: 1024 * 450,
        subject: 'Polity & Governance',
        uploadDate: new Date().toISOString(),
        status: 'Ready',
        summary: 'Comprehensive overview of the Preamble, Fundamental Rights (Articles 12-35), Fundamental Duties, and Directive Principles of State Policy.',
        chapters: [
          {
            id: 'sample_ch_1',
            title: 'Fundamental Rights (Articles 12-35)',
            description: 'Core constitutional guarantees for individual liberties and rights.',
            topics: [
              {
                id: 'sample_tp_1',
                title: 'Right to Equality (Articles 14-18)',
                summary: 'Equality before law, prohibition of discrimination, and abolition of titles.',
                importantPoints: [
                  'Article 14 ensures equality before law and equal protection of laws.',
                  'Article 15 prohibits discrimination on grounds of religion, race, caste, sex or place of birth.',
                  'Article 17 explicitly abolishes Untouchability.',
                ],
                definitions: [
                  { term: 'Article 14', explanation: 'Equality before law derived from British Constitution.' },
                  { term: 'Article 17', explanation: 'Abolition of Untouchability and prohibition of its practice.' },
                ],
                formulas: [
                  { name: 'Writ of Habeas Corpus', formula: 'To produce the body before court', note: 'Enforceable under Art 32 & 226' },
                ],
                keywords: ['Equality', 'Untouchability', 'Article 14', 'Writ Petitions'],
              },
            ],
          },
        ],
      });

      await addDocumentMetadata({
        userId: currentUser.uid,
        name: 'Quantitative Aptitude - Formulas & Short Tricks.pdf',
        fileType: 'PDF',
        fileSize: 1024 * 320,
        subject: 'Quantitative Aptitude',
        uploadDate: new Date().toISOString(),
        status: 'Ready',
        summary: 'Essential speed math rules, percentage shortcuts, time & work formulas for competitive exams.',
        chapters: [
          {
            id: 'sample_ch_quant_1',
            title: 'Percentage & Profit Loss',
            description: 'Fundamental principles of percentage change, discount, and profit margin calculation.',
            topics: [
              {
                id: 'sample_tp_quant_1',
                title: 'Successive Percentage Formula',
                summary: 'Calculating combined percentage change over multiple successive cycles.',
                importantPoints: [
                  'Net change = a + b + (a*b)/100',
                  'Cost Price (CP) = (100 / (100 + Profit%)) * Selling Price (SP)',
                ],
                definitions: [
                  { term: 'Marked Price', explanation: 'Price printed on article before discount.' },
                ],
                formulas: [
                  { name: 'Successive Change', formula: 'Net % = a + b + (ab/100)' },
                  { name: 'Profit Percentage', formula: 'Profit % = (Profit / CP) * 100' },
                ],
                keywords: ['Percentage', 'Profit', 'Loss', 'Marked Price'],
              },
            ],
          },
        ],
      });

      setSuccessMsg('Sample study materials added to your Document Library!');
    } catch (err) {
      console.error('Failed to add sample materials:', err);
    } finally {
      setSampleLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Profile & Exam Goals</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal study workspace, exam target dates, and daily study hour preferences.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Daily Quota Tracker Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-indigo-600" />
              Daily Limits & Usage Quotas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Track how many study documents, AI topic quizzes, and sectional mock tests you can upload/generate today.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-xs font-semibold self-start sm:self-auto">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Resets daily at 00:00 Midnight</span>
          </div>
        </div>

        {loadingQuota ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading daily practice & upload usage...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Study Document Uploads Quota */}
            <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/60 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-emerald-600" /> Document Uploads
                </span>
                <span className="text-xs font-extrabold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                  {Math.max(0, DAILY_DOC_LIMIT - todayDocs)} Left
                </span>
              </div>

              <div>
                <div className="flex justify-between items-baseline text-xs mb-1.5">
                  <span className="font-bold text-slate-800">{todayDocs} / {DAILY_DOC_LIMIT} uploaded</span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {Math.round((todayDocs / DAILY_DOC_LIMIT) * 100)}% used
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (todayDocs / DAILY_DOC_LIMIT) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                {DAILY_DOC_LIMIT - todayDocs > 0
                  ? `You can upload ${DAILY_DOC_LIMIT - todayDocs} more PDF or text study materials today.`
                  : 'Daily document upload limit reached. Quota will reset tomorrow!'}
              </p>
            </div>

            {/* Topic Quizzes Quota */}
            <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/60 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" /> Topic Practice Quizzes
                </span>
                <span className="text-xs font-extrabold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">
                  {Math.max(0, DAILY_QUIZ_LIMIT - todayQuizzes)} Left
                </span>
              </div>

              <div>
                <div className="flex justify-between items-baseline text-xs mb-1.5">
                  <span className="font-bold text-slate-800">{todayQuizzes} / {DAILY_QUIZ_LIMIT} generated</span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {Math.round((todayQuizzes / DAILY_QUIZ_LIMIT) * 100)}% used
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (todayQuizzes / DAILY_QUIZ_LIMIT) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                {DAILY_QUIZ_LIMIT - todayQuizzes > 0
                  ? `You can generate ${DAILY_QUIZ_LIMIT - todayQuizzes} more topic practice quizzes today.`
                  : 'Daily quiz generation quota reached. Quota will reset tomorrow!'}
              </p>
            </div>

            {/* Sectional Mock Tests Quota */}
            <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/60 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" /> Sectional Mock Tests
                </span>
                <span className="text-xs font-extrabold px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg">
                  {Math.max(0, DAILY_MOCK_LIMIT - todayMocks)} Left
                </span>
              </div>

              <div>
                <div className="flex justify-between items-baseline text-xs mb-1.5">
                  <span className="font-bold text-slate-800">{todayMocks} / {DAILY_MOCK_LIMIT} generated</span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {Math.round((todayMocks / DAILY_MOCK_LIMIT) * 100)}% used
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (todayMocks / DAILY_MOCK_LIMIT) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                {DAILY_MOCK_LIMIT - todayMocks > 0
                  ? `You can generate ${DAILY_MOCK_LIMIT - todayMocks} more full timed mock tests today.`
                  : 'Daily sectional mock quota reached. Quota will reset tomorrow!'}
              </p>
            </div>

            {/* Smart Flashcard Decks Quota */}
            <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/60 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" /> Flashcard Decks
                </span>
                <span className="text-xs font-extrabold px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg">
                  {Math.max(0, DAILY_FLASHCARD_LIMIT - todayDecks)} Left
                </span>
              </div>

              <div>
                <div className="flex justify-between items-baseline text-xs mb-1.5">
                  <span className="font-bold text-slate-800">{todayDecks} / {DAILY_FLASHCARD_LIMIT} generated</span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {Math.round((todayDecks / DAILY_FLASHCARD_LIMIT) * 100)}% used
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (todayDecks / DAILY_FLASHCARD_LIMIT) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                {DAILY_FLASHCARD_LIMIT - todayDecks > 0
                  ? `You can generate ${DAILY_FLASHCARD_LIMIT - todayDecks} more flashcard decks today.`
                  : 'Daily flashcard deck limit reached. Quota will reset tomorrow!'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Profile Settings Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" /> Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Target Exam */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-2 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" /> Target Exam
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              {POPULAR_EXAMS.map((exam) => (
                <button
                  key={exam}
                  type="button"
                  onClick={() => setSelectedExam(exam)}
                  className={`p-2.5 text-xs font-semibold rounded-xl border text-left transition-all ${
                    selectedExam === exam
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {exam}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedExam('Other')}
                className={`p-2.5 text-xs font-semibold rounded-xl border text-left transition-all ${
                  selectedExam === 'Other'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Other
              </button>
            </div>

            {selectedExam === 'Other' && (
              <input
                type="text"
                value={customExam}
                onChange={(e) => setCustomExam(e.target.value)}
                placeholder="Enter custom exam name"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Exam Date & Daily Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" /> Target Exam Date
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" /> Daily Target Study Hours
              </label>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <span className="text-xs font-bold text-indigo-600 w-12 text-right">{dailyHours} h/d</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Updated Profile'}</span>
          </button>
        </form>
      </div>

      {/* Pre-load Sample Materials Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-100 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="font-bold text-slate-900 text-sm flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" /> Need Test Materials?
          </h4>
          <p className="text-xs text-slate-500">
            Instantly load sample Polity & Quantitative Aptitude study notes to generate practice quizzes.
          </p>
        </div>

        <button
          onClick={handleLoadSampleMaterials}
          disabled={sampleLoading}
          className="px-4 py-2.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs rounded-xl shadow-2xs transition-all shrink-0 flex items-center gap-2"
        >
          <FilePlus className="w-4 h-4 text-indigo-600" />
          <span>{sampleLoading ? 'Adding...' : 'Load Sample Study Notes'}</span>
        </button>
      </div>
    </div>
  );
};
