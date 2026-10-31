import type { Lab } from './types';

export const lab: Lab = {
  id: 'py-text-to-pieces',
  title: 'Turn text into lowercase pieces',
  level: 'basic',
  minutes: 12,
  lesson: 'skills/python-first-steps',
  goal: 'Before a computer can learn from text, the text has to be cut into plain, comparable pieces. Write a tiny tokenizer, then count how often each piece appears. You will use both again when you build a spam classifier.',
  steps: [
    'make_pieces(message): make the message lowercase, split it on spaces, and remove . , ! ? : ; from both ends of each piece. Leave out any piece that ends up empty.',
    'count_pieces(pieces): return a dictionary that says how many times each piece appears, such as {"free": 2, "gift": 1}.',
  ],
  starter: `def make_pieces(message):
    # TODO: lowercase, split, strip punctuation from the ends, skip empty pieces
    ...

def count_pieces(pieces):
    # TODO: a dictionary from piece to how many times it appears
    ...

pieces = make_pieces("FREE gift! Claim your free prize.")
print(pieces)
print(count_pieces(pieces))
`,
  solution: `def make_pieces(message):
    pieces = []
    for word in message.lower().split():
        word = word.strip(".,!?:;")
        if word != "":
            pieces.append(word)
    return pieces

def count_pieces(pieces):
    counts = {}
    for piece in pieces:
        counts[piece] = counts.get(piece, 0) + 1
    return counts

pieces = make_pieces("FREE gift! Claim your free prize.")
print(pieces)
print(count_pieces(pieces))
`,
  tests: `
check("make_pieces makes everything lowercase", lambda: make_pieces("WIN Now") == ["win", "now"])
check("make_pieces removes punctuation at the ends", lambda: make_pieces("Hello, world!") == ["hello", "world"])
check("make_pieces keeps the order of the words", lambda: make_pieces("claim your free prize.") == ["claim", "your", "free", "prize"])
check("make_pieces leaves out a piece that is only punctuation", lambda: make_pieces("free ! gift") == ["free", "gift"])
check("make_pieces keeps an apostrophe inside a word", lambda: make_pieces("Don't be late!") == ["don't", "be", "late"])
check("make_pieces of an empty message is an empty list", lambda: make_pieces("") == [])
check("count_pieces counts repeats", lambda: count_pieces(["free", "gift", "free"]) == {"free": 2, "gift": 1})
check("count_pieces of an empty list is an empty dictionary", lambda: count_pieces([]) == {})
check("the two together count words in a message", lambda: count_pieces(make_pieces("FREE gift! Claim your free prize.")) == {"free": 2, "gift": 1, "claim": 1, "your": 1, "prize": 1})
`,
  hints: [
    'Loop over message.lower().split(). For each word, word.strip(".,!?:;") removes those characters from both ends.',
    'Build the answer with an empty list and append. Only append when the cleaned word is not an empty string: if word != "":',
    'For count_pieces start with counts = {} and, for each piece, set counts[piece] = counts.get(piece, 0) + 1. The 0 is what get() returns when the piece is new.',
  ],
};
