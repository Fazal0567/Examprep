import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import {
  UserProfile,
  DocumentMetadata,
  Quiz,
  QuizAttempt,
  MockTest,
  MockAttempt,
  UserAnalytics,
  FlashcardDeck,
} from '../types';

// ================= USERS =================
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
}

export async function createUserProfile(profile: Partial<UserProfile> & { uid: string; email: string }): Promise<UserProfile> {
  const userRef = doc(db, 'users', profile.uid);
  const now = new Date().toISOString();
  const fullProfile: UserProfile = {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName || profile.email.split('@')[0],
    photoURL: profile.photoURL || '',
    targetExam: profile.targetExam || 'SSC CGL',
    targetExamDate: profile.targetExamDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dailyStudyHours: profile.dailyStudyHours || 3,
    emailVerified: profile.emailVerified || false,
    isOnboarded: profile.isOnboarded || false,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(userRef, fullProfile, { merge: true });
  return fullProfile;
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

// ================= DOCUMENTS =================
export async function getUserDocuments(userId: string): Promise<DocumentMetadata[]> {
  const q = query(
    collection(db, 'documents'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const docs: DocumentMetadata[] = [];
  snap.forEach((d) => {
    docs.push({ id: d.id, ...d.data() } as DocumentMetadata);
  });
  // sort in client memory if needed
  return docs.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
}

export async function addDocumentMetadata(docData: Omit<DocumentMetadata, 'id'>): Promise<DocumentMetadata> {
  const docRef = await addDoc(collection(db, 'documents'), docData);
  const created: DocumentMetadata = {
    id: docRef.id,
    ...docData,
  };
  return created;
}

export async function updateDocumentMetadata(docId: string, updates: Partial<DocumentMetadata>): Promise<void> {
  const docRef = doc(db, 'documents', docId);
  await updateDoc(docRef, updates);
}

export async function deleteDocumentMetadata(docId: string): Promise<void> {
  const docRef = doc(db, 'documents', docId);
  await deleteDoc(docRef);
}

// ================= QUIZZES =================
export async function getUserQuizzes(userId: string): Promise<Quiz[]> {
  const q = query(collection(db, 'quizzes'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const list: Quiz[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() } as Quiz);
  });
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getQuiz(quizId: string): Promise<Quiz | null> {
  try {
    const ref = doc(db, 'quizzes', quizId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Quiz;
    }
  } catch (err) {
    console.error('Error fetching quiz:', err);
  }
  return null;
}

export async function saveQuiz(quizData: Omit<Quiz, 'id'>): Promise<Quiz> {
  const ref = await addDoc(collection(db, 'quizzes'), quizData);
  return { id: ref.id, ...quizData };
}

export async function saveQuizAttempt(attemptData: Omit<QuizAttempt, 'id'>): Promise<QuizAttempt> {
  const ref = await addDoc(collection(db, 'quiz_attempts'), attemptData);
  const attempt = { id: ref.id, ...attemptData };

  // Also update parent quiz statistics if present
  if (attemptData.quizId) {
    try {
      const quizRef = doc(db, 'quizzes', attemptData.quizId);
      const quizSnap = await getDoc(quizRef);
      if (quizSnap.exists()) {
        const quizData = quizSnap.data() as Quiz;
        const currentAttempts = (quizData.attemptsCount || 0) + 1;
        const currentBest = Math.max(quizData.bestMarks ?? -999, attemptData.marksObtained ?? attemptData.score);
        await updateDoc(quizRef, {
          attemptsCount: currentAttempts,
          bestMarks: currentBest,
          lastAttemptDate: attemptData.completedAt,
        });
      }
    } catch (e) {
      console.warn('Could not update quiz metadata stats:', e);
    }
  }

  await updateAnalyticsAfterAttempt(attemptData.userId, attemptData.subject, attemptData.accuracy, attemptData.totalQuestions, attemptData.timeTakenSeconds);
  return attempt;
}

export async function getUserQuizAttempts(userId: string): Promise<QuizAttempt[]> {
  const q = query(collection(db, 'quiz_attempts'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const list: QuizAttempt[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() } as QuizAttempt);
  });
  return list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const ref = doc(db, 'quizzes', quizId);
  await deleteDoc(ref);
}

export async function deleteQuizAttempt(attemptId: string): Promise<void> {
  const ref = doc(db, 'quiz_attempts', attemptId);
  await deleteDoc(ref);
}

// ================= MOCK TESTS =================
export async function getUserMockTests(userId: string): Promise<MockTest[]> {
  const q = query(collection(db, 'mock_tests'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const list: MockTest[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() } as MockTest);
  });
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getMockTest(mockId: string): Promise<MockTest | null> {
  try {
    const ref = doc(db, 'mock_tests', mockId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as MockTest;
    }
  } catch (err) {
    console.error('Error fetching mock test:', err);
  }
  return null;
}

export async function saveMockTest(mockData: Omit<MockTest, 'id'>): Promise<MockTest> {
  const ref = await addDoc(collection(db, 'mock_tests'), mockData);
  return { id: ref.id, ...mockData };
}

export async function saveMockAttempt(attemptData: Omit<MockAttempt, 'id'>): Promise<MockAttempt> {
  const ref = await addDoc(collection(db, 'mock_attempts'), attemptData);
  const attempt = { id: ref.id, ...attemptData };
  
  // Also try updating the parent mock test if present
  if (attemptData.mockId) {
    try {
      const mockRef = doc(db, 'mock_tests', attemptData.mockId);
      const mockSnap = await getDoc(mockRef);
      if (mockSnap.exists()) {
        const mockData = mockSnap.data() as MockTest;
        const currentAttempts = (mockData.attemptsCount || 0) + 1;
        const currentBest = Math.max(mockData.bestMarks ?? -999, attemptData.marksObtained ?? attemptData.score);
        await updateDoc(mockRef, {
          attemptsCount: currentAttempts,
          bestMarks: currentBest,
          lastAttemptDate: attemptData.completedAt,
        });
      }
    } catch (e) {
      console.warn('Could not update mock test stats metadata:', e);
    }
  }

  await updateAnalyticsAfterAttempt(attemptData.userId, attemptData.subject, attemptData.accuracy, attemptData.totalQuestions, attemptData.timeTakenSeconds, true);
  return attempt;
}

export async function getUserMockAttempts(userId: string): Promise<MockAttempt[]> {
  const q = query(collection(db, 'mock_attempts'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const list: MockAttempt[] = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() } as MockAttempt);
  });
  return list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

export async function deleteMockTest(mockId: string): Promise<void> {
  const ref = doc(db, 'mock_tests', mockId);
  await deleteDoc(ref);
}

export async function deleteMockAttempt(attemptId: string): Promise<void> {
  const ref = doc(db, 'mock_attempts', attemptId);
  await deleteDoc(ref);
}

// ================= ANALYTICS =================
export async function getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
  const ref = doc(db, 'analytics', userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as UserAnalytics;
  }
  return null;
}

async function updateAnalyticsAfterAttempt(
  userId: string,
  subject: string,
  accuracy: number,
  questionCount: number,
  timeTakenSec: number,
  isMock: boolean = false
) {
  const ref = doc(db, 'analytics', userId);
  const existing = await getUserAnalytics(userId);

  const today = new Date().toISOString().split('T')[0];

  if (!existing) {
    const initial: UserAnalytics = {
      userId,
      totalDocuments: 0,
      totalQuizzesTaken: isMock ? 0 : 1,
      totalMocksTaken: isMock ? 1 : 0,
      averageAccuracy: accuracy,
      totalQuestionsAnswered: questionCount,
      averageTimePerQuestionSeconds: Math.round(timeTakenSec / Math.max(1, questionCount)),
      subjectPerformance: {
        [subject]: {
          quizzesTaken: 1,
          averageAccuracy: accuracy,
          totalQuestions: questionCount,
        },
      },
      weeklyAccuracy: [
        {
          date: today,
          accuracy: accuracy,
          quizzesCount: 1,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, initial);
    return;
  }

  const newTotalQuizzes = existing.totalQuizzesTaken + (isMock ? 0 : 1);
  const newTotalMocks = existing.totalMocksTaken + (isMock ? 1 : 0);
  const totalTests = newTotalQuizzes + newTotalMocks;

  const newAvgAccuracy = Math.round(((existing.averageAccuracy * (totalTests - 1)) + accuracy) / totalTests);
  const newTotalQuestions = existing.totalQuestionsAnswered + questionCount;

  const prevTotalTime = existing.averageTimePerQuestionSeconds * existing.totalQuestionsAnswered;
  const newAvgTimePerQuestion = Math.round((prevTotalTime + timeTakenSec) / Math.max(1, newTotalQuestions));

  // Subject update
  const subjPerf = { ...existing.subjectPerformance };
  const prevSubj = subjPerf[subject] || { quizzesTaken: 0, averageAccuracy: 0, totalQuestions: 0 };
  const subjTests = prevSubj.quizzesTaken + 1;
  const subjAvgAcc = Math.round(((prevSubj.averageAccuracy * prevSubj.quizzesTaken) + accuracy) / subjTests);

  subjPerf[subject] = {
    quizzesTaken: subjTests,
    averageAccuracy: subjAvgAcc,
    totalQuestions: prevSubj.totalQuestions + questionCount,
  };

  // Weekly update
  const weekly = [...(existing.weeklyAccuracy || [])];
  const todayIdx = weekly.findIndex((w) => w.date === today);
  if (todayIdx >= 0) {
    const prevEntry = weekly[todayIdx];
    const entryCount = prevEntry.quizzesCount + 1;
    weekly[todayIdx] = {
      date: today,
      accuracy: Math.round(((prevEntry.accuracy * prevEntry.quizzesCount) + accuracy) / entryCount),
      quizzesCount: entryCount,
    };
  } else {
    weekly.push({ date: today, accuracy, quizzesCount: 1 });
  }

  await updateDoc(ref, {
    totalQuizzesTaken: newTotalQuizzes,
    totalMocksTaken: newTotalMocks,
    averageAccuracy: newAvgAccuracy,
    totalQuestionsAnswered: newTotalQuestions,
    averageTimePerQuestionSeconds: newAvgTimePerQuestion,
    subjectPerformance: subjPerf,
    weeklyAccuracy: weekly.slice(-14), // Keep last 14 days
    updatedAt: new Date().toISOString(),
  });
}

// ================= FLASHCARDS =================
export async function saveFlashcardDeck(deckData: Omit<FlashcardDeck, 'id'>): Promise<FlashcardDeck> {
  const qRef = collection(db, 'flashcardDecks');
  const docRef = await addDoc(qRef, {
    ...deckData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { id: docRef.id, ...deckData, createdAt: new Date().toISOString() };
}

export async function getUserFlashcardDecks(userId: string): Promise<FlashcardDeck[]> {
  const q = query(
    collection(db, 'flashcardDecks'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const decks: FlashcardDeck[] = [];
  snap.forEach((d) => {
    decks.push({ id: d.id, ...d.data() } as FlashcardDeck);
  });
  return decks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export async function updateFlashcardDeck(deckId: string, updates: Partial<FlashcardDeck>): Promise<void> {
  const docRef = doc(db, 'flashcardDecks', deckId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteFlashcardDeck(deckId: string): Promise<void> {
  const docRef = doc(db, 'flashcardDecks', deckId);
  await deleteDoc(docRef);
}

