import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'chunking-hybrid-search-reranking': {
    short:
      "Chunking can hide an answer because a fixed-size cut can separate a heading from its content, so the chunk that holds the answer no longer looks like the question. Keyword search and a reranker are added because embeddings match meaning but are weak on exact strings such as product codes, and a reranker reads the question and each candidate together to pick the best few. An approximate vector index trades a little recall for much lower latency and memory. Fix one step at a time and measure each change on a labelled question set.",
    explain: [
      {
        heading: "How chunking hides an answer",
        body: "A chunk is a piece of a document that is stored and searched as one unit. If you cut every 500 tokens, you may cut a sentence in half or leave a heading at the end of one chunk and its content at the start of the next. The chunk with the answer then has no heading, so its embedding (a list of numbers that stands for the meaning of the text) does not match a question about that heading. Better: split on headings and sections, use a small overlap, and put the document title and heading in front of the text you embed. Size is a trade-off: large chunks dilute the meaning and waste prompt space, tiny chunks lose context, so tune it on a labelled set rather than guessing.",
      },
      {
        heading: "Why keyword search and a reranker",
        body: "Embeddings capture meaning, which is why “how do I get my money back” can find a page about refunds. They are weak on exact strings: a product code, an error code or a name. Keyword search (a classic method called BM25 that scores exact word matches) is strong exactly there. Hybrid search runs both and merges the ranked lists, for example with reciprocal rank fusion, which adds 1 / (k + rank) for each list a result appears in. A reranker then takes the top few dozen candidates and scores each together with the question, usually with a model called a cross-encoder. It is slower than vector search but sharper, so you only run it on a short list and keep the best handful for the prompt.",
      },
      {
        heading: "What an approximate index gives up",
        body: "Exact search compares the question with every stored vector. That is slow and memory-hungry at scale, so most systems use an approximate index: graph-based ones such as HNSW, cluster-based ones such as IVF, sometimes with compressed vectors (product quantisation). They check only a fraction of the vectors, so they can miss the true best match some of the time. That lost share is recall. You tune search settings to balance speed against recall, and you check the approximate index against exact search on a sample.",
      },
      {
        heading: "Measure every change",
        body: "Build a set of real questions with the passage that should be found. Report recall@k (how often the right passage is in the top k) and MRR (mean reciprocal rank, which rewards putting it near the top). Change one thing, re-measure, keep it only if the numbers improve. Otherwise you are guessing.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'chunk', label: "Split the documents", sub: "Cut at headings, with the title attached to each chunk" },
        { id: 'index', label: "Embed and index", sub: "Vectors for meaning, in an approximate index for speed" },
        { id: 'search', label: "Search two ways", sub: "Vector search for meaning, keyword search for exact codes, then merge" },
        { id: 'rerank', label: "Rerank", sub: "A sharper model reads question and passage together" },
        { id: 'answer', label: "Model answers", sub: "Only the best few chunks go in the prompt, with citations" },
      ],
      highlight: ['chunk', 'search', 'rerank'],
      caption: "The three highlighted steps are where answers that are clearly in the docs usually get lost.",
    },
    example: {
      title: "Example: merging two result lists with reciprocal rank fusion",
      text: "A user asks about the price of an item with the code SKU-48213-B (an example). Vector search ranks a general pricing overview page first, and the page that actually contains the code third. Keyword search ranks the page with the code first and the overview seventh. Reciprocal rank fusion with k = 60 adds 1 / (60 + rank) from each list. The page with the exact code wins, which neither list alone would have guaranteed. Only the order matters, not the small size of the scores.",
      rows: [
        { label: "Overview page (vector rank 1, keyword rank 7)", value: "1/61 + 1/67 = 0.03132" },
        { label: "Page with the code (vector rank 3, keyword rank 1)", value: "1/63 + 1/61 = 0.03227" },
        { label: "Winner", value: "the page with the code" },
      ],
    },
    followUps: [
      {
        q: "You add a filter so users only see documents from their department, and some queries now return one or two results instead of ten. Why?",
        a: "The filter was applied after the approximate search, which removed most of the candidates. Use pre-filtering or a filter-aware index, or fetch more candidates before filtering, and test recall with filters on as a separate measurement.",
      },
      {
        q: "You want to switch to a better embedding model. What does that involve?",
        a: "You must re-embed the whole corpus, because vectors from different models cannot be compared. Build the new index beside the old one, compare recall on the labelled set, then cut over. Budget the embedding cost and time.",
      },
      {
        q: "The reranker improves recall@5 but adds 400 ms. How do you decide?",
        a: "Weigh end-to-end answer quality against the latency budget. You can rerank fewer candidates, use a smaller reranker, or only rerank queries where the first search is uncertain. Measure rather than assume.",
      },
    ],
    mistakes: [
      "Answering every retrieval problem with a bigger embedding model or retrieving 50 chunks. Find which step loses the answer first.",
      "Believing vector search reliably finds exact identifiers such as codes and names. It often does not.",
      "Changing chunking or search with no retrieval metric to compare before and after.",
    ],
  },
};
