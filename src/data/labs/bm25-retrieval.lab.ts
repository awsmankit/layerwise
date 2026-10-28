import type { Lab } from './types';

export const lab: Lab = {
  id: 'bm25-retrieval',
  title: 'Keyword search with BM25',
  level: 'intermediate',
  minutes: 20,
  lesson: 'rag-agents/vector-search-and-retrieval-metrics',
  goal: 'Vector search blurs exact names and codes, so retrieval systems add keyword search. Build BM25 yourself on a tiny corpus, rank documents for a query, and measure the result with recall at k. The exact variant is given below so the checks are unambiguous.',
  steps: [
    'tokenize(text): lowercase the text and keep runs of letters and digits, so "BM25, Keyword-search!" becomes ["bm25", "keyword", "search"].',
    'bm25_scores(query, docs, k1=1.5, b=0.75): one score per document. Count each distinct query term once. For a term with n documents containing it out of N: idf = ln(1 + (N - n + 0.5) / (n + 0.5)). With tf the count in the document, dl its length in tokens and avgdl the average length: term score = idf x tf x (k1 + 1) / (tf + k1 x (1 - b + b x dl / avgdl)). A document\'s score is the sum over query terms. A term in no document adds nothing.',
    'rank(query, docs, k): the indexes of the k best documents, best first. Documents with equal scores keep their original order.',
    'recall_at_k(ranked, relevant, k): the share of the relevant indexes found in the first k ranked.',
  ],
  starter: `import math
import re

docs = [
    "The KV cache stores keys and values for every earlier token",
    "Hybrid search merges BM25 keyword search with vector search",
    "BM25 is a keyword ranking function based on term frequency and document length",
    "Quantization stores weights in fewer bits",
    "Chunking splits documents into passages before embedding",
]

def tokenize(text):
    # TODO: lowercase, keep runs of letters and digits
    ...

def bm25_scores(query, docs, k1=1.5, b=0.75):
    # TODO: one score per document
    ...

def rank(query, docs, k=3):
    # TODO: indexes of the k best documents, best first
    ...

def recall_at_k(ranked, relevant, k):
    # TODO
    ...

print(rank("bm25 keyword ranking", docs, 3))
`,
  solution: `import math
import re

docs = [
    "The KV cache stores keys and values for every earlier token",
    "Hybrid search merges BM25 keyword search with vector search",
    "BM25 is a keyword ranking function based on term frequency and document length",
    "Quantization stores weights in fewer bits",
    "Chunking splits documents into passages before embedding",
]

def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())

def bm25_scores(query, docs, k1=1.5, b=0.75):
    tokens = [tokenize(d) for d in docs]
    n_docs = len(tokens)
    avgdl = sum(len(t) for t in tokens) / n_docs
    scores = [0.0] * n_docs
    for term in set(tokenize(query)):
        n = sum(1 for t in tokens if term in t)
        if n == 0:
            continue
        idf = math.log(1 + (n_docs - n + 0.5) / (n + 0.5))
        for i, t in enumerate(tokens):
            tf = t.count(term)
            if tf:
                scores[i] += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * len(t) / avgdl))
    return scores

def rank(query, docs, k=3):
    scores = bm25_scores(query, docs)
    order = sorted(range(len(docs)), key=lambda i: (-scores[i], i))
    return order[:k]

def recall_at_k(ranked, relevant, k):
    if not relevant:
        return 0.0
    return len(set(ranked[:k]) & set(relevant)) / len(set(relevant))

print(rank("bm25 keyword ranking", docs, 3))
`,
  tests: `
check("tokenize lowercases and drops punctuation", lambda: tokenize("BM25, Keyword-search!") == ["bm25", "keyword", "search"])
check("a query term that is in no document gives every document 0", lambda: bm25_scores("zebra", docs) == [0.0] * 5)
check("an empty query scores 0 everywhere and does not crash", lambda: bm25_scores("", docs) == [0.0] * 5)
check("'quantization' appears only in document 3: its score is about 1.6435, the others 0", lambda: abs(bm25_scores("quantization", docs)[3] - 1.64354) < 1e-4 and sum(bm25_scores("quantization", docs)[i] for i in (0, 1, 2, 4)) == 0)
check("the document about BM25 ranking comes first for 'bm25 keyword ranking', then the hybrid-search one", lambda: rank("bm25 keyword ranking", docs, 2) == [2, 1])
check("repeating a word in the query does not change the scores", lambda: bm25_scores("bm25 bm25", docs) == bm25_scores("bm25", docs))
check("a shorter document wins when the term count is the same (length normalisation)", lambda: bm25_scores("cat", ["cat", "cat dog bird fish"])[0] > bm25_scores("cat", ["cat", "cat dog bird fish"])[1])
check("a rarer term is worth more than a common one", lambda: bm25_scores("rare", ["rare x", "x y", "x z", "x w"])[0] > bm25_scores("x", ["rare x", "x y", "x z", "x w"])[0])
check("equal scores keep the original order", lambda: rank("same", ["same word", "same word", "other"], 3) == [0, 1, 2])
check("recall at 3: documents 2 and 3 are relevant, only 2 is in the first three", lambda: recall_at_k([2, 1, 0, 4, 3], {2, 3}, 3) == 0.5)
check("recall with nothing relevant is 0.0", lambda: recall_at_k([0, 1], set(), 2) == 0.0)
`,
  hints: [
    'Tokenising is re.findall(r"[a-z0-9]+", text.lower()).',
    'Tokenise every document once. N is the number of documents, avgdl the mean token count, and n for a term is how many documents contain it at least once.',
    'To rank with ties in original order, sort the indexes with key=lambda i: (-scores[i], i).',
  ],
};
