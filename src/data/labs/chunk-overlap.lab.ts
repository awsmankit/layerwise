import type { Lab } from './types';

export const lab: Lab = {
  id: 'chunk-overlap',
  title: 'Split text into overlapping chunks',
  level: 'basic',
  minutes: 10,
  lesson: 'rag-agents/chunking-and-retrieval-quality',
  goal: 'A RAG system embeds chunks, and a split that falls mid-thought loses the thread. Write a chunker that repeats a few words between neighbouring chunks, and handles the edges: an empty text, a short last chunk, and settings that make no sense.',
  steps: [
    'Each chunk holds up to `size` words. The next chunk starts `size - overlap` words after the previous one, so neighbours share `overlap` words.',
    'Stop as soon as a chunk reaches the last word, so no chunk is made only of words you already returned.',
    'Raise ValueError if size is less than 1, or overlap is negative or not smaller than size.',
  ],
  starter: `def chunk_words(words, size, overlap):
    # TODO: return a list of chunks, each a list of words.
    ...

sample = list(range(1, 12))      # stands in for 11 words
print(chunk_words(sample, 4, 1))
`,
  solution: `def chunk_words(words, size, overlap):
    if size < 1 or overlap < 0 or overlap >= size:
        raise ValueError("need size >= 1 and 0 <= overlap < size")
    if not words:
        return []
    step = size - overlap
    chunks = []
    start = 0
    while True:
        chunks.append(words[start:start + size])
        if start + size >= len(words):
            break
        start += step
    return chunks

sample = list(range(1, 12))      # stands in for 11 words
print(chunk_words(sample, 4, 1))
`,
  tests: `
import sys

def _limited(fn, limit=100000):
    # a loop that never moves forward would freeze the page, so stop it and say why
    count = [0]
    def tracer(frame, event, arg):
        count[0] += 1
        if count[0] > limit:
            raise RuntimeError("stopped after too many steps: does your loop always move forward?")
        return tracer
    sys.settrace(tracer)
    try:
        return fn()
    finally:
        sys.settrace(None)

def chunks(*args):
    return _limited(lambda: chunk_words(*args))

def _raises(*args):
    try:
        chunks(*args)
    except ValueError:
        return True
    return False

ten = list(range(1, 11))
check("an empty text gives no chunks", lambda: chunks([], 4, 1) == [])
check("a text that fits in one chunk comes back as one chunk", lambda: chunks([1, 2, 3], 4, 1) == [[1, 2, 3]])
check("neighbouring chunks share exactly 'overlap' words", lambda: chunks(ten, 4, 1) == [[1, 2, 3, 4], [4, 5, 6, 7], [7, 8, 9, 10]])
check("the last chunk can be short", lambda: chunks(list(range(1, 12)), 4, 1)[-1] == [10, 11])
check("no extra chunk made only of words already returned", lambda: chunks(list(range(1, 9)), 4, 2) == [[1, 2, 3, 4], [3, 4, 5, 6], [5, 6, 7, 8]])
check("with no overlap it is a plain split", lambda: chunks(ten, 5, 0) == [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]])
check("every word appears in at least one chunk", lambda: sorted({w for c in chunks(list(range(1, 14)), 5, 2) for w in c}) == list(range(1, 14)))
check("overlap equal to or larger than size raises ValueError", lambda: _raises(ten, 4, 4) and _raises(ten, 4, 7))
check("a negative overlap or a size below 1 raises ValueError", lambda: _raises(ten, 4, -1) and _raises(ten, 0, 0))
`,
  hints: [
    'The step between chunk starts is size - overlap. Check that settings make sense before you loop.',
    'Loop with a while: add words[start:start + size], then move start forward by the step.',
    'Break out as soon as start + size >= len(words). Looping with range() over every start adds a last chunk that is only repeated words.',
  ],
};
