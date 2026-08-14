import { DocumentMetadata } from '../types';

export function buildRichDocumentContext(docs: DocumentMetadata[]): string {
  if (!docs || docs.length === 0) return '';

  return docs
    .map((doc, docIdx) => {
      let text = `--- MATERIAL ${docIdx + 1}: "${doc.name}" (Subject: ${doc.subject}) ---\n`;
      if (doc.summary) {
        text += `OVERVIEW SUMMARY:\n${doc.summary}\n\n`;
      }

      if (doc.chapters && doc.chapters.length > 0) {
        text += `DETAILED KNOWLEDGE STRUCTURE & TOPICS:\n`;
        doc.chapters.forEach((chap, cIdx) => {
          text += `\nChapter ${cIdx + 1}: ${chap.title}\n`;
          if (chap.description) {
            text += `Description: ${chap.description}\n`;
          }

          if (chap.topics && chap.topics.length > 0) {
            chap.topics.forEach((tp, tIdx) => {
              text += `  Topic ${cIdx + 1}.${tIdx + 1}: ${tp.title}\n`;
              if (tp.summary) {
                text += `    Summary: ${tp.summary}\n`;
              }
              if (tp.importantPoints && tp.importantPoints.length > 0) {
                text += `    • Important Points: ${tp.importantPoints.join(' | ')}\n`;
              }
              if (tp.definitions && tp.definitions.length > 0) {
                const defsStr = tp.definitions
                  .map((d) => `${d.term}: ${d.explanation}`)
                  .join(' | ');
                text += `    • Key Definitions: ${defsStr}\n`;
              }
              if (tp.formulas && tp.formulas.length > 0) {
                const formStr = tp.formulas
                  .map((f) => `${f.name}: ${f.formula}${f.note ? ` (${f.note})` : ''}`)
                  .join(' | ');
                text += `    • Formulas & Theorems: ${formStr}\n`;
              }
              if (tp.keywords && tp.keywords.length > 0) {
                text += `    • Keywords: ${tp.keywords.join(', ')}\n`;
              }
            });
          }
        });
      }

      return text.trim();
    })
    .join('\n\n========================================\n\n');
}
