import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  // Initialize Gemini AI SDK safely
  const getAi = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Helper for resilient Gemini content generation with retry & fallback on 503 high demand spikes
  const generateWithRetry = async (ai: GoogleGenAI, options: { model?: string; contents: any; config?: any }) => {
    const modelsToTry = [
      options.model || 'gemini-3.6-flash',
      'gemini-3.6-flash',
      'gemini-2.5-flash',
    ];
    const uniqueModels = Array.from(new Set(modelsToTry));
    let lastError: any = null;

    for (const model of uniqueModels) {
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        try {
          attempts++;
          const response = await ai.models.generateContent({
            model,
            contents: options.contents,
            config: options.config,
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const errStr = (err.message || '') + ' ' + JSON.stringify(err || '');
          const isTransient =
            errStr.includes('503') ||
            errStr.includes('UNAVAILABLE') ||
            errStr.includes('high demand') ||
            errStr.includes('429') ||
            errStr.includes('RESOURCE_EXHAUSTED') ||
            errStr.includes('ETIMEDOUT') ||
            errStr.includes('ECONNRESET');

          if (isTransient && attempts < maxAttempts) {
            console.warn(`[Gemini Retry] ${model} attempt ${attempts}/${maxAttempts} transient error: ${err.message || '503 High Demand'}. Retrying in ${attempts * 1500}ms...`);
            await new Promise((resolve) => setTimeout(resolve, attempts * 1500));
          } else {
            console.warn(`[Gemini Fallback] ${model} failed (${err.message || err}). Moving to fallback model if available...`);
            break;
          }
        }
      }
    }
    throw lastError || new Error('Failed to generate content with Gemini AI after retries.');
  };

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 1. DOCUMENT PROCESSING / KNOWLEDGE ENGINE ENDPOINT
  app.post('/api/documents/process', async (req, res) => {
    try {
      const { fileName, textContent, base64Data, mimeType, targetExam, subject } = req.body;

      if (!textContent && !base64Data) {
        return res.status(400).json({ error: 'Neither textContent nor base64Data was provided.' });
      }

      const ai = getAi();

      const systemInstruction = `You are an expert AI Knowledge Extraction Engine specialized in Indian and global competitive exam preparation (such as ${targetExam || 'UPSC, SSC CGL, GATE, JEE, NEET, IBPS, CAT'}).
Analyze the provided document material and break it down into a highly structured study syllabus.

Extract:
1. Inferred or specified Subject name.
2. A brief 2-3 sentence overview summary of the document.
3. List of logical Chapters.
4. For each chapter, list specific Topics.
5. For each topic, provide:
   - Important Points (3-6 bullet points)
   - Definitions (key terms and concise explanations)
   - Formulas / Rules / Theorems (if applicable, or key memory techniques)
   - Keywords (5-8 high-yield exam keywords)

Return strictly valid JSON adhering to the specified schema. Do not wrap response in markdown backticks unless strictly JSON.`;

      const contents: any[] = [];

      if (base64Data && mimeType) {
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        });
      }

      const promptText = `Document Name: ${fileName || 'Study Notes'}
Subject Area: ${subject || 'General'}
Target Exam: ${targetExam || 'Competitive Exams'}

Raw Text Sample / Content:
${(textContent || '').substring(0, 15000)}

Extract the structured Knowledge Syllabus now.`;

      contents.push(promptText);

      const response = await generateWithRetry(ai, {
        model: 'gemini-3.6-flash',
        contents: contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              summary: { type: Type.STRING },
              chapters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    topics: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          title: { type: Type.STRING },
                          summary: { type: Type.STRING },
                          importantPoints: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          definitions: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                term: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                              },
                              required: ['term', 'explanation'],
                            },
                          },
                          formulas: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                name: { type: Type.STRING },
                                formula: { type: Type.STRING },
                                note: { type: Type.STRING },
                              },
                              required: ['name', 'formula'],
                            },
                          },
                          keywords: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                        },
                        required: ['title', 'summary', 'importantPoints', 'keywords'],
                      },
                    },
                  },
                  required: ['title', 'description', 'topics'],
                },
              },
            },
            required: ['subject', 'summary', 'chapters'],
          },
        },
      });

      const jsonText = response.text || '{}';
      const parsedData = JSON.parse(jsonText);

      // Add unique IDs if missing
      if (parsedData.chapters) {
        parsedData.chapters = parsedData.chapters.map((ch: any, cIdx: number) => ({
          id: ch.id || `chap_${cIdx + 1}_${Date.now()}`,
          ...ch,
          topics: (ch.topics || []).map((tp: any, tIdx: number) => ({
            id: tp.id || `topic_${cIdx + 1}_${tIdx + 1}_${Date.now()}`,
            ...tp,
          })),
        }));
      }

      return res.json({ success: true, data: parsedData });
    } catch (err: any) {
      console.error('Error processing document in Gemini:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to process document with Gemini AI.',
      });
    }
  });

  // 2. QUIZ GENERATOR ENDPOINT
  app.post('/api/quiz/generate', async (req, res) => {
    try {
      const {
        subject,
        chapter,
        topic,
        difficulty = 'Medium',
        numberOfQuestions = 10,
        targetExam = 'General Competitive Exam',
        documentContext = '',
      } = req.body;

      const ai = getAi();

      const prompt = `You are a strict, top-tier examination material designer for ${targetExam}.
Your highest directive is 100% FACTUAL ACCURACY and STRICT FAITHFULNESS to the provided Study Context / Uploaded Materials.

Parameters:
- Target Exam: ${targetExam}
- Subject: ${subject}
- Chapter/Section: ${chapter || 'All Chapters'}
- Topic: ${topic || 'All Topics'}
- Difficulty Level: ${difficulty} (Easy, Medium, or Hard)
- Question Count: exactly ${numberOfQuestions} MCQs

STUDY CONTEXT / UPLOADED SOURCE MATERIAL:
${documentContext ? documentContext.substring(0, 50000) : 'Use standard official syllabus and core concepts for ' + subject + ' in ' + targetExam}

CRITICAL ACCURACY & GENERATION RULES:
1. 100% ACCURACY REQUIREMENT: If Study Context / Uploaded Source Material is provided above, EVERY SINGLE QUESTION, OPTION, CORRECT ANSWER, AND EXPLANATION MUST BE 100% ACCURATE AND DIRECTLY DERIVED FROM OR STRICTLY VERIFIABLE AGAINST THE PROVIDED STUDY CONTEXT. Do not introduce contradictory facts, hallucinated figures, or incorrect formulas.
2. Direct Concept Testing: Test specific definitions, formulas, theorems, rules, key takeaways, and scenario applications present in the study context.
3. Distractors (Wrong Options): The 3 incorrect options must be plausible but unambiguously incorrect according to the study context.
4. Correct Option Index: Must be integer 0, 1, 2, or 3. Ensure the designated correct option is indisputably correct.
5. In-Depth Explanation: Provide step-by-step reasoning citing the exact rule, formula, or concept from the context material explaining why the correct choice is right and why the distractor options are wrong.`;

      const response = await generateWithRetry(ai, {
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctOptionIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['question', 'options', 'correctOptionIndex', 'explanation'],
                },
              },
            },
            required: ['title', 'questions'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const questionsWithIds = (parsed.questions || []).map((q: any, idx: number) => ({
        id: q.id || `q_${idx + 1}_${Date.now()}`,
        subject,
        chapter: chapter || 'General',
        topic: topic || 'General',
        ...q,
      }));

      return res.json({
        success: true,
        title: parsed.title || `${subject} Quiz - ${difficulty}`,
        questions: questionsWithIds,
      });
    } catch (err: any) {
      console.error('Error generating quiz:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate quiz questions.',
      });
    }
  });

  // 3. SECTIONAL MOCK GENERATOR ENDPOINT
  app.post('/api/mock/generate', async (req, res) => {
    try {
      const {
        subject,
        difficulty = 'Medium',
        numberOfQuestions = 15,
        timeLimitMinutes = 20,
        targetExam = 'Competitive Exam',
        documentContext = '',
      } = req.body;

      const ai = getAi();

      const prompt = `You are an expert exam author creating a realistic, 100% accurate Sectional Mock Test for target exam "${targetExam}".
Your highest directive is 100% FACTUAL ACCURACY and STRICT FAITHFULNESS to the provided Study Context / Uploaded Materials.

Specifications:
- Subject: ${subject}
- Difficulty: ${difficulty}
- Number of Questions: ${numberOfQuestions}
- Time Limit: ${timeLimitMinutes} minutes

STUDY CONTEXT / UPLOADED SOURCE MATERIAL:
${documentContext ? documentContext.substring(0, 50000) : 'Standard competitive exam syllabus for ' + subject}

CRITICAL ACCURACY & FAITHFULNESS RULES:
1. 100% ACCURACY REQUIREMENT: Every question, option, answer key, and step-by-step explanation MUST be 100% accurate and strictly aligned with the provided Study Context / Uploaded Source Material. Do not invent facts or incorrect solutions.
2. Realistic Exam Simulation: Include numerical problem solving, conceptual reasoning, rule application, and statement verification appropriate for ${targetExam}.
3. 4 Options per MCQ: Each question must have exactly 4 options with integer correctOptionIndex (0, 1, 2, or 3).
4. Rigorous Step-by-Step Explanations: Provide comprehensive explanations with exact derivations or conceptual proofs.`;

      const response = await generateWithRetry(ai, {
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctOptionIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                  required: ['question', 'options', 'correctOptionIndex', 'explanation'],
                },
              },
            },
            required: ['title', 'questions'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const questionsWithIds = (parsed.questions || []).map((q: any, idx: number) => ({
        id: q.id || `mq_${idx + 1}_${Date.now()}`,
        subject,
        ...q,
      }));

      return res.json({
        success: true,
        title: parsed.title || `${subject} Sectional Mock Test (${targetExam})`,
        questions: questionsWithIds,
      });
    } catch (err: any) {
      console.error('Error generating sectional mock test:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate sectional mock test.',
      });
    }
  });

  // API endpoint for Flashcards Generation
  app.post('/api/flashcard/generate', async (req, res) => {
    try {
      const {
        subject,
        chapter,
        topic,
        numberOfCards = 10,
        targetExam = 'Competitive Exam',
        documentContext = '',
      } = req.body;

      if (!subject) {
        return res.status(400).json({ error: 'Subject is required.' });
      }

      const ai = getAi();

      const prompt = `You are a world-class exam preparation tutor and memory coach creating high-yield Smart Flashcards for ${targetExam}.
Your highest directive is 100% FACTUAL ACCURACY and STRICT FAITHFULNESS to the provided Study Context / Uploaded Materials.

Specifications:
- Subject: ${subject}
- Chapter/Section: ${chapter || 'All Chapters'}
- Topic: ${topic || 'All Topics'}
- Number of Flashcards: ${numberOfCards}
- Target Exam: ${targetExam}

STUDY CONTEXT / UPLOADED SOURCE MATERIAL:
${documentContext ? documentContext.substring(0, 50000) : 'Standard official syllabus and core concepts for ' + subject + ' in ' + targetExam}

CRITICAL FLASHCARD RULES:
1. 100% ACCURACY REQUIREMENT: Every flashcard prompt (front) and answer (back) MUST be 100% accurate and directly derived from or strictly verifiable against the provided Study Context. Do not introduce unverified facts or contradictory information.
2. Front (Prompt): Concise, crisp term, formula, rule, concept question, or key scenario that tests active recall.
3. Back (Answer): Clear, direct, high-yield answer or formula solution.
4. Explanation: A short 1-2 sentence contextual memory note or step-by-step breakdown explaining the underlying principle.
5. Create high-yield flashcards ideal for Spaced Repetition System (SRS) review.`;

      const response = await generateWithRetry(ai, {
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              cards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    front: { type: Type.STRING },
                    back: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ['front', 'back', 'explanation'],
                },
              },
            },
            required: ['title', 'cards'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const cardsWithIds = (parsed.cards || []).map((c: any, idx: number) => ({
        id: c.id || `fc_${idx + 1}_${Date.now()}`,
        subject: subject || '',
        chapter: chapter || '',
        topic: topic || '',
        status: 'new',
        intervalDays: 1,
        easeFactor: 2.5,
        reviewsCount: 0,
        front: c.front || '',
        back: c.back || '',
        explanation: c.explanation || '',
      }));

      return res.json({
        success: true,
        title: parsed.title || `${subject} Flashcard Deck`,
        cards: cardsWithIds,
      });
    } catch (err: any) {
      console.error('Error generating flashcards:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate flashcards.',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ExamPrep AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
