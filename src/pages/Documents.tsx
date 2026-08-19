import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { extractFileContent } from '../utils/textExtractor';
import {
  getUserDocuments,
  addDocumentMetadata,
  updateDocumentMetadata,
  deleteDocumentMetadata,
} from '../firebase/db';
import { DocumentMetadata, KnowledgeChapter } from '../types';
import { DocumentSkeleton } from '../components/common/SkeletonLoader';
import {
  UploadCloud,
  Trash2,
  BookOpen,
  Sparkles,
  Layers,
  Key,
  Sigma,
  X,
  Search,
  Filter,
  AlertCircle,
  FileCode,
} from 'lucide-react';

export const Documents: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressStatus, setUploadProgressStatus] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [activeModalDoc, setActiveModalDoc] = useState<DocumentMetadata | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadDocs = async () => {
    if (!currentUser) return;
    try {
      const docs = await getUserDocuments(currentUser.uid);
      setDocuments(docs);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [currentUser]);

  // Handle Document Upload Process via File
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentUser) return;
    const file = files[0];
    setUploading(true);
    setErrorMsg('');
    setUploadProgressStatus('Uploading file...');

    try {
      // 1. Client-side extraction
      const extracted = await extractFileContent(file);
      const chosenSubject = customSubject.trim() || 'General Knowledge';

      // 2. Add initial doc record to Firestore with status 'Uploading'
      const newDoc = await addDocumentMetadata({
        userId: currentUser.uid,
        name: extracted.fileName,
        fileType: extracted.fileType,
        fileSize: extracted.fileSize,
        subject: chosenSubject,
        uploadDate: new Date().toISOString(),
        status: 'Processing',
        extractedTextLength: extracted.textContent?.length || 0,
      });

      // Update UI state
      setDocuments((prev) => [newDoc, ...prev]);

      // 3. Call server `/api/documents/process`
      setUploadProgressStatus('AI Extracting Chapters & Formulas...');
      const response = await fetch('/api/documents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: extracted.fileName,
          textContent: extracted.textContent,
          base64Data: extracted.base64Data,
          mimeType: extracted.mimeType,
          targetExam: userProfile?.targetExam || 'Competitive Exam',
          subject: chosenSubject,
        }),
      });

      const resData = await response.json();

      if (resData.success && resData.data) {
        const knowledge = resData.data;
        // 4. Update Firestore doc with status 'Ready' & extracted knowledge
        await updateDocumentMetadata(newDoc.id, {
          status: 'Ready',
          subject: knowledge.subject || chosenSubject,
          summary: knowledge.summary,
          chapters: knowledge.chapters as KnowledgeChapter[],
        });

        // Refresh docs list
        await loadDocs();
      } else {
        await updateDocumentMetadata(newDoc.id, {
          status: 'Error',
          errorMessage: resData.error || 'Processing failed.',
        });
        setErrorMsg(resData.error || 'Failed to process document with AI.');
      }
    } catch (err: any) {
      console.error('Upload & Processing error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setUploading(false);
      setUploadProgressStatus('');
      setCustomSubject('');
    }
  };

  const promptDelete = (docItem: DocumentMetadata, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDocToDelete(docItem);
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDocumentMetadata(docToDelete.id);
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      if (activeModalDoc?.id === docToDelete.id) {
        setActiveModalDoc(null);
      }
      setDocToDelete(null);
    } catch (err: any) {
      console.error('Delete document failed:', err);
      setErrorMsg(err.message || 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  const uniqueSubjects = Array.from(new Set(documents.map((d) => d.subject)));

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === 'ALL' || doc.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Document Library</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Upload PDF, DOCX, PPT, or Image study materials. The AI Knowledge Engine extracts chapters, topics, formulas, and key definitions.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 transition-all shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Upload Study Material</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Supports PDF, DOCX, PPT, TXT, PNG, JPG notes.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Subject (e.g. Polity, Physics)"
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-48"
            />
            <label className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer text-center transition-all flex items-center justify-center gap-2">
              <UploadCloud className="w-4 h-4" />
              <span>Select File</span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp"
                disabled={uploading}
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {uploading && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-800/80 rounded-xl flex items-center gap-3 text-xs text-indigo-800 dark:text-indigo-200 animate-pulse">
            <div className="w-4 h-4 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-semibold">{uploadProgressStatus}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents or subjects..."
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <button
            onClick={() => setSubjectFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              subjectFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {uniqueSubjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSubjectFilter(sub)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                subjectFilter === sub
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="space-y-3">
          <DocumentSkeleton />
          <DocumentSkeleton />
          <DocumentSkeleton />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800 shadow-2xs space-y-3">
          <FileCode className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Documents Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Upload your lecture notes, textbook chapters, or paste raw text study guides to generate AI practice quizzes and flashcards.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setActiveModalDoc(doc)}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-500 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] uppercase tracking-wider">
                    {doc.fileType}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      doc.status === 'Ready'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                        : doc.status === 'Processing'
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 animate-pulse'
                        : 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {doc.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{doc.subject}</p>
                {doc.summary && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                    {doc.summary}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] text-slate-400 dark:text-slate-500">
                <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  {doc.chapters && doc.chapters.length > 0 && (
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md">
                      {doc.chapters.length} Chapters
                    </span>
                  )}
                  <button
                    onClick={(e) => promptDelete(doc, e)}
                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KNOWLEDGE ENGINE VIEWER MODAL */}
      {activeModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-slate-800 p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] uppercase">
                    {activeModalDoc.fileType}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{activeModalDoc.subject}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 leading-snug">{activeModalDoc.name}</h2>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => promptDelete(activeModalDoc)}
                  className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/60 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => setActiveModalDoc(null)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Summary */}
            {activeModalDoc.summary && (
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl space-y-1">
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Executive Overview
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{activeModalDoc.summary}</p>
              </div>
            )}

            {/* Chapters & Knowledge Breakdown */}
            {activeModalDoc.chapters && activeModalDoc.chapters.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Extracted Chapters & Topics
                </h3>

                {activeModalDoc.chapters.map((chapter, cIdx) => (
                  <div key={chapter.id || cIdx} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h4 className="font-bold text-indigo-700 dark:text-indigo-400 text-sm">
                        Chapter {cIdx + 1}: {chapter.title}
                      </h4>
                      {chapter.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{chapter.description}</p>
                      )}
                    </div>

                    {/* Topics */}
                    <div className="space-y-4 sm:pl-2">
                      {(chapter.topics || []).map((topic, tIdx) => (
                        <div key={topic.id || tIdx} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 sm:p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                          <h5 className="font-semibold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>Topic {tIdx + 1}: {topic.title}</span>
                          </h5>

                          <p className="text-xs text-slate-600 dark:text-slate-300">{topic.summary}</p>

                          {/* Important Points */}
                          {topic.importantPoints && topic.importantPoints.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Key Points:
                              </span>
                              <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1">
                                {topic.importantPoints.map((pt, idx) => (
                                  <li key={idx}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Definitions */}
                          {topic.definitions && topic.definitions.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Key className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Definitions:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {topic.definitions.map((def, idx) => (
                                  <div key={idx} className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700 text-xs">
                                    <strong className="text-slate-900 dark:text-white font-semibold">{def.term}: </strong>
                                    <span className="text-slate-600 dark:text-slate-300">{def.explanation}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Formulas */}
                          {topic.formulas && topic.formulas.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Sigma className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Formulas / Rules:
                              </span>
                              <div className="space-y-1.5">
                                {topic.formulas.map((form, idx) => (
                                  <div key={idx} className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 font-mono">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-sans">{form.name}:</span>
                                    <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800 self-start sm:self-auto break-all sm:break-normal">{form.formula}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">No structured chapters extracted yet.</p>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 bg-red-100 dark:bg-red-950/80 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Delete Document?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white font-semibold">"{docToDelete.name}"</strong> ({docToDelete.subject})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
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

