import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "build-b" batch. */
export const extrasW4BuildB: Record<string, Extra> = {
  'llm/long-context-or-rag': {
    takeaways: [
      'A context window is a limit on what you may send, not a promise about what the model will use well. Studies found accuracy often falls with length, with distractors, and when the question shares few words with the answer.',
      'Per question, retrieval sends thousands of tokens and stuffing sends the whole collection. Caching discounts only the share of questions that find the cache warm, and it pays only above a break-even hit rate.',
      'Prefer long context for small, stable, shared collections and whole-collection questions. Prefer retrieval for large, fast-changing or permissioned collections, and consider hybrids.',
      'Prices, lifetimes and multipliers change often. Take them from each vendor’s page, and test accuracy, cost and time to first token on your own questions.',
    ],
    prereq: ['llm/context-window-and-caching'],
    quiz: [
      {
        q: 'In the lesson’s example, a cache read costs 0.1x and a write 1.25x the input price. About what hit rate is needed before caching beats not caching?',
        options: ['5 per cent', 'About 22 per cent', '50 per cent', '90 per cent'],
        answer: 1,
        why: 'Solve h x 0.1 + (1 - h) x 1.25 = 1, which gives h = 0.25 / 1.15, about 22 per cent.',
      },
      {
        q: 'Which finding about long inputs do the studies in the lesson support?',
        options: ['Any model that accepts 128,000 tokens uses all of them equally well', 'Needle-in-a-haystack scores always predict real task accuracy', 'Accuracy often falls as input grows, especially with distractors or when question and answer share few words', 'Long context is always cheaper than retrieval'],
        answer: 2,
        why: 'RULER, NoLiMa and the context rot report each found drops with length on harder or less literal tasks, though only for the models and tasks they tested.',
      },
      {
        q: 'A collection changes all day and different users may see different documents. Which design does the lesson lean towards?',
        options: ['A shared cached prefix holding every document', 'Retrieval with permission filters and incremental re-indexing', 'Uncached long context for every user', 'No retrieval and no filters'],
        answer: 1,
        why: 'A shared prompt or cache holding everything can leak documents and keeps being rewritten; retrieval filters first and re-indexes only what changed.',
      },
      {
        q: 'In the first worked example (150,000 tokens, 2,000 questions a day) the cached long-context design is cheaper than uncached but dearer than RAG. What mainly explains the gap to RAG?',
        options: ['Output tokens cost more under caching', 'It still pays for about 32,000 token-equivalents of collection per question, against 4,000 retrieved', 'The question is cached, so it is billed twice', 'Retrieval is free'],
        answer: 1,
        why: '150,000 tokens at a blended 0.215x is about 32,250 token-equivalents per question, against 4,000 retrieved tokens for RAG, plus a small fixed infrastructure cost.',
      },
    ],
  },
  'rag-agents/graphrag-and-knowledge-graphs': {
    takeaways: [
      'Vector search finds passages that resemble the question. Multi-hop questions need facts linked through entities, and whole-collection questions have no answering passage, so top-k handles both badly.',
      'A knowledge graph stores entities, relations and a pointer from each relation to its source passage. GraphRAG adds community detection and model-written community reports so global questions can be answered from summaries.',
      'Independent comparisons find complementary strengths: plain RAG for single-fact detail, graph methods for multi-hop, global search weak on detail. Extraction coverage caps what the graph can find.',
      'Indexing is the main cost (the docs put graph extraction at about 75 per cent of it), and the Microsoft repository is in maintenance mode as of 1 November 2026. Try parent-child chunks, filters, hybrid search, decomposition and agentic retrieval first.',
    ],
    prereq: [],
    quiz: [
      {
        q: 'Which question is hardest for plain top-k vector retrieval?',
        options: ['What is the battery capacity of product X?', 'Which supplier makes the sensor used by the project Priya leads?', 'Define the word supplier', 'What time does the office open?'],
        answer: 1,
        why: 'It needs a chain of three linked facts, and the passage about Priya does not resemble the part of the question about the sensor maker.',
      },
      {
        q: 'In GraphRAG, what is a community report?',
        options: ['A user complaint log', 'A model-written summary of a group of closely related entities found by community detection', 'A list of every passage in the index', 'The final answer shown to the user'],
        answer: 1,
        why: 'Community detection partitions the entity graph, and a model summarises each group so global questions can be answered from summaries.',
      },
      {
        q: 'Han et al. (2025) compared plain RAG and GraphRAG methods. What was their overall summary?',
        options: ['GraphRAG beats plain RAG on every task', 'Plain RAG beats GraphRAG on every task', 'Complementary strengths: RAG on single-hop detail, graph methods on multi-hop, no clear winner', 'Graphs only help for images'],
        answer: 2,
        why: 'They report RAG and GraphRAG exhibit complementary strengths rather than a clear dominance, and that graph quality affects results.',
      },
      {
        q: 'Which is the best first move when retrieved chunks are too small to make sense on their own?',
        options: ['Build a full knowledge graph', 'Parent-child chunks: search small chunks, return their larger parent', 'Fine-tune the embedding model on the whole corpus', 'Raise k to 100'],
        answer: 1,
        why: 'Returning the parent gives the model context without the extraction, resolution and upkeep costs of a graph.',
      },
    ],
  },
};
