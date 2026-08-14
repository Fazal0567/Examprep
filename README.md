# ExamPrep AI — AI-Powered Competitive Exam Preparation Platform

**ExamPrep AI** is a full-stack, AI-powered study companion designed for students preparing for high-stakes competitive examinations (such as UPSC, JEE, NEET, GATE, SAT, GRE, and SSC). By converting uploaded study notes, textbooks, and syllabus documents into structured knowledge hierarchies, ExamPrep AI generates targeted practice quizzes, active recall flashcards, and full-length timed mock tests with step-by-step AI explanations.

---

## 🌟 Key Features

### 1. 📚 Document Library & AI Knowledge Extraction
- **Multi-Format Support**: Upload study materials in **PDF, DOCX, PPT, TXT, PNG, JPG, or WebP** formats.
- **Smart Knowledge Breakdown**: Server-side Gemini AI parses uploaded documents into structured chapters, high-yield topic lists, key formulas, and executive summaries.
- **Subject Categorization**: Tag documents by subject (e.g., *Indian Polity, Quantum Physics, Calculus, Organic Chemistry*) for targeted practice.

### 2. ⚡ AI Quiz Generator
- **Custom MCQ Generation**: Generate multiple-choice question quizzes tailored specifically to your target exam and difficulty level.
- **Instant Explanations**: Every question includes step-by-step reasoning explaining why the correct answer is indisputable and why distractor options are incorrect.
- **Instant Feedback**: Real-time score reports, detailed attempt review, and direct save to performance analytics.

### 3. 🃏 Active Recall & Spaced Repetition (SRS) Flashcards
- **AI-Generated Decks**: Automatically build high-yield flashcard decks from your uploaded study materials or specific subject topics.
- **Interactive Flipping & Self-Rating**: Practice cards with smooth 3D flip effects and rate your recall quality (*Hard, Good, Easy*) to optimize memory retention.

### 4. 📝 Full-Length Timed Mock Tests
- **Simulated Test Environment**: Take full-length, timed mock tests complete with question navigation palettes (*Answered, Unanswered, Marked for Review*).
- **Comprehensive Score Analysis**: In-depth breakdown showing accuracy percentage, time spent per question, subject-wise strengths, and identified weak areas.

### 5. 🔥 Daily Study Streak & Performance Analytics
- **7-Day Interactive Streak Tracker**: Monitor your daily learning momentum directly on the dashboard.
- **Accuracy & Progress Radar**: Track your average score accuracy, total quizzes completed, and subject performance over time.

### 6. 👤 User Authentication & Profile Customization
- **Firebase Authentication**: Secure user registration, email/password login, and password reset flows.
- **Exam Customization**: Set your target competitive exam, target exam date, and daily study hour goals.

---

## 🤖 AI Model & Architecture

- **AI Engine**: Powered by Google's **Gemini 1.5 Flash** (`gemini-1.5-flash`) model via the official `@google/genai` TypeScript SDK.
- **Server-Side API Gateway**: All Gemini API calls run securely through backend Express endpoints (`/api/documents/process`, `/api/quizzes/generate`, `/api/flashcards/generate`, `/api/mocks/generate`), protecting API keys from client exposure.
- **Resilient AI Pipeline**: Includes exponential backoff and automated retry logic (`generateWithRetry`) to ensure reliable responses even during high traffic or rate limits.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18, Vite, TypeScript |
| **Styling & UI** | Tailwind CSS, Lucide React Icons |
| **Animations** | Motion (`motion/react`) |
| **Backend Server** | Node.js, Express, `tsx`, `esbuild` |
| **AI Integration** | `@google/genai` (Gemini 1.5 Flash) |
| **Database & Auth** | Firebase Firestore, Firebase Authentication |

---

## 📁 Project Structure

```
├── server.ts                 # Express backend server with Gemini API endpoints
├── src/
│   ├── components/           # Reusable UI components (Sidebar, Navbar, Skeletons)
│   ├── context/              # React Context for Authentication & Theme
│   ├── firebase/             # Firebase SDK configuration & Firestore CRUD helpers
│   ├── pages/                # Main application screens:
│   │   ├── Dashboard.tsx     # Main dashboard with Daily Streak & quick actions
│   │   ├── Documents.tsx     # Document library & file upload manager
│   │   ├── QuizGenerator.tsx # Interactive AI quiz creation & practice
│   │   ├── Flashcards.tsx    # Spaced repetition flashcards interface
│   │   ├── Mocks.tsx         # Timed mock test simulator
│   │   ├── Analytics.tsx     # Detailed performance & accuracy reports
│   │   ├── Profile.tsx       # User profile & target exam settings
│   │   ├── Login.tsx         # User authentication login page
│   │   └── Signup.tsx        # New user registration page
│   ├── types/                # Shared TypeScript interfaces & types
│   ├── App.tsx               # Main routing & layout wrapper
│   └── main.tsx              # React entry point
├── firestore.rules           # Security rules for Firestore collections
└── metadata.json             # Applet configuration metadata
```

---

## 🔒 Security & Firestore Rules

User data is securely isolated using Firestore security rules:
- Users can only read, update, or delete their own documents, quiz attempts, mock test results, and flashcard decks.
- Document ownership is strictly validated via `request.auth.uid == resource.data.userId`.
