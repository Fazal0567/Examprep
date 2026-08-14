import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserDocuments,
  getUserFlashcardDecks,
  saveFlashcardDeck,
  updateFlashcardDeck,
  deleteFlashcardDeck,
} from '../firebase/db';
import { DocumentMetadata, FlashcardDeck, Flashcard } from '../types';
import { buildRichDocumentContext } from '../utils/documentContextBuilder';
import {
  Layers,
  Sparkles,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Brain,
  Zap,
  Trash2,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  Award,
  Plus,
  ChevronLeft,
  X,
} from 'lucide-react';

const DAILY_FLASHCARD_LIMIT = 10;

export const Flashcards: React.FC = () => {
  const { currentUser, userProfile } = useAuth();

  // State
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);

  // Deck Creation Form
  const [showModal, setShowModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [cardCount, setCardCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation state
  const [deckToDelete, setDeckToDelete] = useState<FlashcardDeck | null>(null);
  const [isDeletingDeck, setIsDeletingDeck] = useState(false);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);
  const [sessionMasteredCount, setSessionMasteredCount] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // Quota calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDecksCount = decks.filter(
    (d) => d.createdAt && d.createdAt.startsWith(todayStr)
  ).length;

  useEffect(() => {
    if (!currentUser) return;
    async function loadData() {
      setLoading(true);
      try {
        const [docs, fetchedDecks] = await Promise.all([
          getUserDocuments(currentUser.uid),
          getUserFlashcardDecks(currentUser.uid),
        ]);
        setDocuments(docs);
        setDecks(fetchedDecks);

        if (docs.length > 0) {
          const subs = Array.from(new Set(docs.map((d) => d.subject).filter(Boolean)));
          if (subs.length > 0) {
            setSelectedSubject(subs[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load flashcard decks:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  // Extract unique subjects, chapters & topics based on uploaded documents
  const availableSubjects = Array.from(
    new Set(documents.map((d) => d.subject).filter(Boolean))
  );

  const availableDocs = documents.filter((d) => d.subject === selectedSubject);
  const availableChapters = Array.from(
    new Set(
      availableDocs
        .flatMap((d) => d.chapters || [])
        .map((c) => c.title)
        .filter(Boolean)
    )
  );

  const availableTopics = Array.from(
    new Set(
      availableDocs
        .flatMap((d) => d.chapters || [])
        .filter((c) => !selectedChapter || c.title === selectedChapter)
        .flatMap((c) => c.topics || [])
        .map((t) => t.title)
        .filter(Boolean)
    )
  );

  // Generate Deck
  const handleGenerateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (todayDecksCount >= DAILY_FLASHCARD_LIMIT) {
      setError(`Daily flashcard deck creation limit (${DAILY_FLASHCARD_LIMIT}/day) reached. Please try again tomorrow!`);
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const contextDocs = documents.filter((d) => d.subject === selectedSubject);
      const documentContext = buildRichDocumentContext(contextDocs);

      const response = await fetch('/api/flashcard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          chapter: selectedChapter,
          topic: selectedTopic,
          numberOfCards: cardCount,
          targetExam: userProfile?.targetExam || 'Competitive Exam',
          documentContext,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate flashcards.');
      }

      const newDeckData: Omit<FlashcardDeck, 'id'> = {
        userId: currentUser.uid,
        title: data.title || `${selectedSubject} Flashcards`,
        subject: selectedSubject,
        chapter: selectedChapter || '',
        topic: selectedTopic || '',
        targetExam: userProfile?.targetExam || 'Competitive Exam',
        cards: (data.cards || []).map((c: any) => ({
          id: c.id || `card_${Math.random().toString(36).substring(2, 9)}`,
          front: c.front || '',
          back: c.back || '',
          explanation: c.explanation || '',
          subject: selectedSubject,
          chapter: c.chapter || selectedChapter || '',
          topic: c.topic || selectedTopic || '',
          status: c.status || 'new',
          intervalDays: c.intervalDays || 1,
          easeFactor: c.easeFactor || 2.5,
          reviewsCount: c.reviewsCount || 0,
        })),
        totalCards: (data.cards || []).length,
        masteredCount: 0,
        createdAt: new Date().toISOString(),
      };

      const savedDeck = await saveFlashcardDeck(newDeckData);
      setDecks((prev) => [savedDeck, ...prev]);
      setShowModal(false);
      
      // Auto start practice
      startPracticeSession(savedDeck);
    } catch (err: any) {
      setError(err.message || 'Error creating flashcard deck.');
    } finally {
      setGenerating(false);
    }
  };

  // Start Practice
  const startPracticeSession = (deck: FlashcardDeck) => {
    setActiveDeck(deck);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setSessionReviewedCount(0);
    setSessionMasteredCount(0);
    setIsSessionComplete(false);
  };

  // Process Card Rating in SRS
  const handleRateCard = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!activeDeck) return;

    const currentCard = activeDeck.cards[currentCardIndex];
    let newInterval = currentCard.intervalDays || 1;
    let newEase = currentCard.easeFactor || 2.5;
    let newStatus = currentCard.status || 'learning';

    if (rating === 'again') {
      newInterval = 1;
      newEase = Math.max(1.3, newEase - 0.2);
      newStatus = 'learning';
    } else if (rating === 'hard') {
      newInterval = Math.max(1, Math.round(newInterval * 1.2));
      newEase = Math.max(1.3, newEase - 0.15);
      newStatus = 'learning';
    } else if (rating === 'good') {
      newInterval = Math.round(newInterval * newEase);
      newStatus = 'review';
    } else if (rating === 'easy') {
      newInterval = Math.round(newInterval * newEase * 1.3);
      newEase = newEase + 0.15;
      newStatus = 'mastered';
      setSessionMasteredCount((prev) => prev + 1);
    }

    const updatedCards = [...activeDeck.cards];
    updatedCards[currentCardIndex] = {
      ...currentCard,
      status: newStatus,
      intervalDays: newInterval,
      easeFactor: newEase,
      reviewsCount: (currentCard.reviewsCount || 0) + 1,
      lastReviewDate: todayStr,
    };

    const newMasteredCount = updatedCards.filter((c) => c.status === 'mastered').length;

    const updatedDeck: FlashcardDeck = {
      ...activeDeck,
      cards: updatedCards,
      masteredCount: newMasteredCount,
    };

    setActiveDeck(updatedDeck);
    setDecks((prev) => prev.map((d) => (d.id === updatedDeck.id ? updatedDeck : d)));

    // Save progress to DB asynchronously
    updateFlashcardDeck(updatedDeck.id, {
      cards: updatedCards,
      masteredCount: newMasteredCount,
    }).catch((err) => console.error('Failed to update deck SRS progress:', err));

    setSessionReviewedCount((prev) => prev + 1);
    setIsFlipped(false);

    if (currentCardIndex + 1 < activeDeck.cards.length) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setIsSessionComplete(true);
    }
  };

  const promptDeleteDeck = (deck: FlashcardDeck, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeckToDelete(deck);
  };

  const confirmDeleteDeck = async () => {
    if (!deckToDelete) return;
    setIsDeletingDeck(true);
    try {
      await deleteFlashcardDeck(deckToDelete.id);
      setDecks((prev) => prev.filter((d) => d.id !== deckToDelete.id));
      if (activeDeck?.id === deckToDelete.id) {
        setActiveDeck(null);
      }
      setDeckToDelete(null);
    } catch (err) {
      console.error('Failed to delete deck:', err);
    } finally {
      setIsDeletingDeck(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-full border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Spaced Repetition System (SRS)
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              100% Accurate to Uploaded Materials
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">Smart Flashcards</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Master definitions, formulas, and core principles with AI-generated flashcards aligned to your exam material.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400">Daily Decks Quota</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {todayDecksCount} / {DAILY_FLASHCARD_LIMIT} Created Today
            </span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={todayDecksCount >= DAILY_FLASHCARD_LIMIT}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white font-semibold text-sm rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Flashcard Deck</span>
          </button>
        </div>
      </div>

      {/* ACTIVE PRACTICE SESSION MODE */}
      {activeDeck && !isSessionComplete && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6 animate-fade-in">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <button
              onClick={() => setActiveDeck(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Exit Review
            </button>
            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{activeDeck.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{activeDeck.subject}</p>
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              Card {currentCardIndex + 1} of {activeDeck.cards.length}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{
                width: `${((currentCardIndex + 1) / activeDeck.cards.length) * 100}%`,
              }}
            />
          </div>

          {/* 3D FLIP FLASHCARD */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[280px] sm:min-h-[320px] bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800/90 dark:to-indigo-950/50 border-2 border-indigo-100 dark:border-indigo-800/80 hover:border-indigo-200 dark:hover:border-indigo-600 rounded-3xl p-6 sm:p-10 flex flex-col justify-between cursor-pointer transition-all shadow-2xs select-none relative"
          >
            <div className="flex items-center justify-between">
              <span
                className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${
                  isFlipped
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200'
                    : 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200'
                }`}
              >
                {isFlipped ? 'Answer / Back' : 'Question / Front'}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-400 font-medium flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5" /> Click or spacebar to flip
              </span>
            </div>

            {/* Card Content */}
            <div className="my-auto text-center py-6 px-2">
              {!isFlipped ? (
                <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                  {activeDeck.cards[currentCardIndex]?.front}
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="text-lg sm:text-xl font-bold text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    {activeDeck.cards[currentCardIndex]?.back}
                  </p>
                  {activeDeck.cards[currentCardIndex]?.explanation && (
                    <div className="p-3 bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 rounded-xl text-left text-xs text-amber-900 dark:text-amber-200 leading-normal max-w-xl mx-auto">
                      <span className="font-bold text-amber-800 dark:text-amber-300">Memory Note / Explanation: </span>
                      {activeDeck.cards[currentCardIndex]?.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-center text-xs text-slate-400 dark:text-slate-400">
              {isFlipped
                ? 'Rate your recall confidence below to schedule next SRS review.'
                : 'Think of the answer, then click to check.'}
            </div>
          </div>

          {/* SRS ACTION BUTTONS */}
          {isFlipped ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <button
                onClick={() => handleRateCard('again')}
                className="py-3 px-4 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-800 dark:text-rose-200 font-bold text-xs sm:text-sm rounded-xl border border-rose-200 dark:border-rose-800 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <span>Again</span>
                <span className="text-[10px] font-normal text-rose-600 dark:text-rose-400">&lt; 1 Day</span>
              </button>
              <button
                onClick={() => handleRateCard('hard')}
                className="py-3 px-4 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-200 font-bold text-xs sm:text-sm rounded-xl border border-amber-200 dark:border-amber-800 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <span>Hard</span>
                <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">2 Days</span>
              </button>
              <button
                onClick={() => handleRateCard('good')}
                className="py-3 px-4 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-800 dark:text-blue-200 font-bold text-xs sm:text-sm rounded-xl border border-blue-200 dark:border-blue-800 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <span>Good</span>
                <span className="text-[10px] font-normal text-blue-600 dark:text-blue-400">4 Days</span>
              </button>
              <button
                onClick={() => handleRateCard('easy')}
                className="py-3 px-4 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 font-bold text-xs sm:text-sm rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <span>Easy / Mastered</span>
                <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">7+ Days</span>
              </button>
            </div>
          ) : (
            <div className="text-center pt-2">
              <button
                onClick={() => setIsFlipped(true)}
                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                Show Answer
              </button>
            </div>
          )}
        </div>
      )}

      {/* PRACTICE SESSION COMPLETED SCREEN */}
      {activeDeck && isSessionComplete && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center space-y-6 max-w-xl mx-auto animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deck Review Completed!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              You reviewed {sessionReviewedCount} cards in "{activeDeck.title}".
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Reviewed</p>
              <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{sessionReviewedCount}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mastered Today</p>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{sessionMasteredCount}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => startPracticeSession(activeDeck)}
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Review Deck Again
            </button>
            <button
              onClick={() => setActiveDeck(null)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Return to All Decks
            </button>
          </div>
        </div>
      )}

      {/* DECKS LIST GRID (When not practicing) */}
      {!activeDeck && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> My Flashcard Decks ({decks.length})
          </h2>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading flashcard decks...</div>
          ) : decks.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No Flashcard Decks Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Generate high-yield flashcard decks directly from your uploaded study materials or subject topics using Gemini AI.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create First Deck
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map((deck) => {
                const masteredPct = deck.totalCards
                  ? Math.round(((deck.masteredCount || 0) / deck.totalCards) * 100)
                  : 0;

                return (
                  <div
                    key={deck.id}
                    onClick={() => startPracticeSession(deck)}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full">
                          {deck.subject}
                        </span>
                        <button
                          onClick={(e) => promptDeleteDeck(deck, e)}
                          className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 p-1 transition-colors cursor-pointer"
                          title="Delete Deck"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white text-base mt-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {deck.title}
                      </h3>

                      {deck.chapter && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          Chapter: {deck.chapter}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {deck.totalCards} Cards
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {deck.masteredCount || 0} Mastered ({masteredPct}%)
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${masteredPct}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center pt-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform">
                        <span>Practice Deck</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: GENERATE FLASHCARD DECK */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-100 dark:border-slate-800 animate-fade-in relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generate Smart Flashcards</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                AI creates active-recall flashcards from your uploaded materials or official exam syllabus.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-200 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleGenerateDeck} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject (From Uploaded Documents)</label>
                {availableSubjects.length > 0 ? (
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setSelectedChapter('');
                      setSelectedTopic('');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                  >
                    {availableSubjects.map((s) => (
                      <option key={s} value={s} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-200 text-xs">
                    No uploaded documents found. Please upload study materials in the <strong>Documents</strong> section first to generate flashcards.
                  </div>
                )}
              </div>

              {availableChapters.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Chapter / Section (Optional)</label>
                  <select
                    value={selectedChapter}
                    onChange={(e) => {
                      setSelectedChapter(e.target.value);
                      setSelectedTopic('');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">All Chapters from Uploaded Documents</option>
                    {availableChapters.map((c) => (
                      <option key={c} value={c} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {availableTopics.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Topic (Optional)</label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">All Topics</option>
                    {availableTopics.map((t) => (
                      <option key={t} value={t} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Number of Flashcards</label>
                <div className="flex gap-2">
                  {[5, 10, 15].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCardCount(num)}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all border cursor-pointer ${
                        cardCount === num
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {num} Cards
                    </button>
                  ))}
                </div>
              </div>

              {availableDocs.length > 0 ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 rounded-xl text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    <strong>Context Active:</strong> AI will generate flashcards strictly based on your {availableDocs.length} uploaded document(s) for {selectedSubject}.
                  </span>
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || availableSubjects.length === 0}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {generating ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    'Create Deck'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE DECK CONFIRMATION MODAL */}
      {deckToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 bg-red-100 dark:bg-red-950/80 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Delete Flashcard Deck?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white font-semibold">"{deckToDelete.title}"</strong> ({deckToDelete.cards.length} cards)?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingDeck}
                onClick={() => setDeckToDelete(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingDeck}
                onClick={confirmDeleteDeck}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeletingDeck ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
