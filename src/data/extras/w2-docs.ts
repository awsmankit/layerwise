import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 2 "docs" batch. */
export const extrasW2Docs: Record<string, Extra> = {
  'rag-agents/reading-real-documents': {
    takeaways: [
      'Most RAG failures start before embedding, and parsing faults are silent: lost reading order, repeated headers, flattened tables, empty scans and ignored figures.',
      'Route by source type and by page. Count characters per page so a scan that returned nothing is caught and sent to OCR.',
      'Keep structure: reading order, headings, tables with their headers and merged cells, captions with figures, and metadata (source, page, section, date, access group) on every chunk.',
      'Page-image retrieval such as ColPali is a real alternative for visually rich pages, at the price of a much larger index. Score the parsing step on a small gold set, and do not send sensitive pages to an outside service without approval.',
    ],
    prereq: ['rag-agents/rag-from-scratch'],
    quiz: [
      {
        q: 'Your pipeline indexes a 200-page PDF and reports no errors, but 40 pages produced zero characters. What is the most likely cause and fix?',
        options: ['The embedding model is too small; use a larger one', 'The chunk size is too large; reduce it', 'Those pages are scans with no text layer; detect pages with almost no characters and send them to OCR', 'The vector index is full; add capacity'],
        answer: 2,
        why: 'A text extractor returns nothing for a picture of text. Counting characters per page catches the silent gap, and OCR fills it.',
      },
      {
        q: 'An OCR line reads "Total due £1,2B4.5O" for the true "Total due £1,284.50". The character error rate is about 10 per cent. What should you conclude?',
        options: ['Average error rates can hide a wrong key field, so also score important fields by exact match', 'The OCR is good enough, since 90 per cent of characters are right', 'The reference text must be wrong', 'Character error rate cannot be computed for numbers'],
        answer: 0,
        why: 'Two wrong characters out of 19 look small, but the amount is unusable. Exact-match scoring on key fields shows what an average hides.',
      },
      {
        q: 'What does the ColPali paper propose for retrieving from visually rich documents?',
        options: ['Run OCR and then use BM25 only', 'Store each page as one small text summary', 'Train a model to answer questions without retrieval', 'Embed page images with a vision-language model into multi-vector representations and score with late interaction'],
        answer: 3,
        why: 'ColPali keeps one vector per image patch of the page and scores queries with a late-interaction rule, skipping the OCR and layout steps. The index is much larger than a text one.',
      },
      {
        q: 'You want to use a managed document-AI service for scanned patient letters. What should you do first?',
        options: ['Send a few real letters to test accuracy', 'Check the vendor\'s region, retention and data-use terms and get approval before any real page leaves your boundary', 'Disable all logging so nothing is stored', 'Convert the letters to Markdown'],
        answer: 1,
        why: 'Sending a page to an outside service discloses it. Approval and the vendor\'s own data-handling documentation come before testing on real sensitive pages.',
      },
    ],
  },
};
