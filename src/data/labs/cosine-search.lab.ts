import type { Lab } from './types';

export const lab: Lab = {
  id: 'cosine-search',
  title: 'Find the nearest vector',
  level: 'basic',
  minutes: 10,
  lesson: 'foundations/tokens-and-embeddings',
  goal: 'An embedding turns text into a list of numbers, and search finds the closest list. Write cosine similarity, then use it to find the documents nearest to a query.',
  steps: [
    'Write cosine(a, b): the dot product divided by the product of the two lengths.',
    'Write top_k(query, docs, k): return the names of the k documents most similar to the query, best first.',
  ],
  starter: `import math

def cosine(a, b):
    # TODO: dot(a, b) divided by (length of a times length of b)
    ...

def top_k(query, docs, k=2):
    # docs maps a name to its vector. Return the k names most similar to query, best first.
    ...

docs = {"cat": [0.9, 0.1, 0.0], "kitten": [0.8, 0.2, 0.1], "car": [0.0, 0.1, 0.9]}
print(top_k([1.0, 0.0, 0.0], docs, 2))
`,
  solution: `import math

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))

def top_k(query, docs, k=2):
    ranked = sorted(docs, key=lambda name: cosine(query, docs[name]), reverse=True)
    return ranked[:k]

docs = {"cat": [0.9, 0.1, 0.0], "kitten": [0.8, 0.2, 0.1], "car": [0.0, 0.1, 0.9]}
print(top_k([1.0, 0.0, 0.0], docs, 2))
`,
  tests: `
check("a vector is fully similar to itself", lambda: abs(cosine([1, 2, 3], [1, 2, 3]) - 1) < 1e-9)
check("vectors at right angles score 0", lambda: abs(cosine([1, 0], [0, 1])) < 1e-9)
check("length does not matter, only direction", lambda: abs(cosine([1, 1], [5, 5]) - 1) < 1e-9)
check("opposite vectors score -1", lambda: abs(cosine([1, 0], [-1, 0]) + 1) < 1e-9)
check("top_k returns the closest first", lambda: top_k([1.0, 0.0, 0.0], docs, 2) == ["cat", "kitten"])
check("top_k respects k", lambda: len(top_k([0.0, 0.0, 1.0], docs, 1)) == 1 and top_k([0.0, 0.0, 1.0], docs, 1)[0] == "car")
`,
  hints: [
    'The dot product is the sum of x * y over matching positions.',
    'The length of a vector is the square root of the sum of its squares.',
    'sorted(docs, key=..., reverse=True) sorts the names by a score you compute for each.',
  ],
};
