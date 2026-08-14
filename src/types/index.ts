export type TargetExam =
  | 'IBPS Clerk'
  | 'IBPS PO'
  | 'SSC CGL'
  | 'SSC CHSL'
  | 'UPSC'
  | 'CUET PG'
  | 'CAT'
  | 'GATE'
  | 'NEET'
  | 'JEE'
  | string;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  targetExam: TargetExam;
  targetExamDate: string; // ISO format or YYYY-MM-DD
  dailyStudyHours: number;
  streakDays?: number;
  lastActiveDate?: string;
  maxStreak?: number;
  emailVerified: boolean;
  isOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DocumentProcessingStatus = 'Uploading' | 'Processing' | 'Ready' | 'Error';

export interface KnowledgeTopic {
  id: string;
  title: string;
  summary: string;
  importantPoints: string[];
  definitions?: { term: string; explanation: string }[];
  formulas?: { name: string; formula: string; note?: string }[];
  keywords: string[];
}

export interface KnowledgeChapter {
  id: string;
  title: string;
  description: string;
  topics: KnowledgeTopic[];
}

export interface DocumentMetadata {
  id: string;
  userId: string;
  name: string;
  fileType: string;
  fileSize: number;
  storagePath?: string;
  fileUrl?: string;
  subject: string;
  uploadDate: string;
  status: DocumentProcessingStatus;
  summary?: string;
  chapters?: KnowledgeChapter[];
  extractedTextLength?: number;
  errorMessage?: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  subject?: string;
  chapter?: string;
  topic?: string;
}

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  subject: string;
  chapter?: string;
  topic?: string;
  difficulty: DifficultyLevel;
  numberOfQuestions: number;
  questions: Question[];
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  subject: string;
  score: number;
  totalQuestions: number;
  accuracy: number; // percentage
  timeTakenSeconds: number;
  userAnswers: { [questionId: string]: number }; // questionId -> selected index
  completedAt: string;
}

export interface MockTest {
  id: string;
  userId: string;
  title: string;
  subject: string;
  difficulty: DifficultyLevel;
  numberOfQuestions: number;
  timeLimitMinutes: number;
  questions: Question[];
  createdAt: string;
  attemptsCount?: number;
  bestMarks?: number;
  lastAttemptDate?: string;
}

export interface MockAttempt {
  id: string;
  userId: string;
  mockId: string;
  mockTitle: string;
  subject: string;
  difficulty?: DifficultyLevel;
  score: number;
  totalQuestions: number;
  accuracy: number; // percentage
  correctAnswersCount: number;
  wrongAnswersCount: number;
  skippedCount: number;
  timeTakenSeconds: number;
  userAnswers: { [questionId: string]: number };
  completedAt: string;
  marksObtained?: number;
  maxMarks?: number;
  positiveMarks?: number;
  negativeMarks?: number;
  questionsSnapshot?: Question[];
}

export interface Flashcard {
  id: string;
  front: string; // Question / Term / Prompt
  back: string;  // Answer / Definition / Explanation
  explanation?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  status?: 'new' | 'learning' | 'review' | 'mastered';
  nextReviewDate?: string; // YYYY-MM-DD
  intervalDays?: number;  // SRS interval in days
  easeFactor?: number;    // SRS ease factor (e.g. 2.5 default)
  reviewsCount?: number;
}

export interface FlashcardDeck {
  id: string;
  userId: string;
  title: string;
  subject: string;
  chapter?: string;
  topic?: string;
  targetExam?: string;
  cards: Flashcard[];
  totalCards: number;
  masteredCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface UserAnalytics {
  userId: string;
  totalDocuments: number;
  totalQuizzesTaken: number;
  totalMocksTaken: number;
  averageAccuracy: number;
  totalQuestionsAnswered: number;
  averageTimePerQuestionSeconds: number;
  subjectPerformance: {
    [subject: string]: {
      quizzesTaken: number;
      averageAccuracy: number;
      totalQuestions: number;
    };
  };
  weeklyAccuracy: {
    date: string; // YYYY-MM-DD
    accuracy: number;
    quizzesCount: number;
  }[];
  updatedAt: string;
}
