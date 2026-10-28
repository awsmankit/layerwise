import type { Lab } from './types';

export const lab: Lab = {
  id: 'rrf-hybrid',
  title: 'Merge two searches with reciprocal rank fusion',
  level: 'intermediate',
  minutes: 12,
  lesson: 'rag-agents/vector-search-and-retrieval-metrics',
  goal: 'Keyword search (BM25) and vector search return lists with scores on different scales, so you cannot just add the scores. Reciprocal rank fusion uses only the ranks. Implement it, then measure the merged list with recall at k.',
  steps: [
    'rrf_scores(rankings, k=60) returns a dict from document to score. For each ranked list, a document at rank r (the first is rank 1) adds 1 / (k + r). A document missing from a list adds nothing for that list.',
    'rrf(rankings, k=60) returns the documents, highest score first. Break ties by document name, A to Z.',
    'recall_at_k(retrieved, relevant, k) is the share of the relevant documents found in the first k results. If there are no relevant documents it returns 0.0.',
  ],
  starter: `def rrf_scores(rankings, k=60):
    # TODO: rankings is a list of ranked lists, best document first
    ...

def rrf(rankings, k=60):
    # TODO: documents sorted by fused score
    ...

def recall_at_k(retrieved, relevant, k):
    # TODO
    ...

bm25 = ["A", "B", "C"]
vectors = ["C", "A", "D"]
print(rrf([bm25, vectors]))
`,
  solution: `def rrf_scores(rankings, k=60):
    scores = {}
    for ranked in rankings:
        for rank, doc in enumerate(ranked, start=1):
            scores[doc] = scores.get(doc, 0.0) + 1.0 / (k + rank)
    return scores

def rrf(rankings, k=60):
    scores = rrf_scores(rankings, k)
    return sorted(scores, key=lambda doc: (-scores[doc], doc))

def recall_at_k(retrieved, relevant, k):
    if not relevant:
        return 0.0
    found = set(retrieved[:k]) & set(relevant)
    return len(found) / len(set(relevant))

bm25 = ["A", "B", "C"]
vectors = ["C", "A", "D"]
print(rrf([bm25, vectors]))
`,
  tests: `
bm25 = ["A", "B", "C"]
vectors = ["C", "A", "D"]
s = rrf_scores([bm25, vectors])
check("A scores 1/61 + 1/62 = 0.03252", lambda: abs(s["A"] - 0.03252) < 1e-5)
check("C scores 1/63 + 1/61 = 0.03227", lambda: abs(s["C"] - 0.03227) < 1e-5)
check("a document found by only one method still counts: B = 1/62, D = 1/63", lambda: abs(s["B"] - 1 / 62) < 1e-9 and abs(s["D"] - 1 / 63) < 1e-9)
check("the fused order is A, C, B, D", lambda: rrf([bm25, vectors]) == ["A", "C", "B", "D"])
check("ranks start at 1, not 0: a document ranked first in one list scores 1/(k+1)", lambda: abs(rrf_scores([["X"]], k=60)["X"] - 1 / 61) < 1e-12)
check("a different k changes the scores: with k = 1 the single top document scores 1/2", lambda: abs(rrf_scores([["X"]], k=1)["X"] - 0.5) < 1e-12)
check("three lists are added up", lambda: abs(rrf_scores([["X"], ["X"], ["Y", "X"]])["X"] - (2 / 61 + 1 / 62)) < 1e-12)
check("ties are broken by name, A to Z", lambda: rrf([["b", "a"], ["a", "b"]]) == ["a", "b"])
check("no lists, no documents", lambda: rrf([]) == [])
top5 = ["D3", "D7", "D1", "D9", "D2"]
check("recall at 5 for the lesson's example is 2 of 3 relevant documents", lambda: abs(recall_at_k(top5, {"D1", "D2", "D5"}, 5) - 2 / 3) < 1e-9)
check("recall only looks at the first k results", lambda: recall_at_k(top5, {"D1", "D2", "D5"}, 2) == 0.0 and abs(recall_at_k(top5, {"D1", "D2", "D5"}, 3) - 1 / 3) < 1e-9)
check("no relevant documents gives 0.0, not a crash", lambda: recall_at_k(top5, set(), 5) == 0.0)
`,
  hints: [
    'Loop over each ranked list with enumerate(ranked, start=1), and add 1 / (k + rank) to that document\'s running total in a dict.',
    'To sort by score then name, use sorted(scores, key=lambda doc: (-scores[doc], doc)).',
    'For recall, take set(retrieved[:k]) & set(relevant) and divide its size by len(relevant).',
  ],
};
