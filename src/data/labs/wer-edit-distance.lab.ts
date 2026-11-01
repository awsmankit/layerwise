import type { Lab } from './types';

export const lab: Lab = {
  id: 'wer-edit-distance',
  title: 'Write the WER calculator',
  level: 'intermediate',
  minutes: 25,
  lesson: 'audio/measuring-audio-quality',
  goal: 'Word error rate is an edit distance over words. Build the edit-distance table, walk back through it to get the alignment, and turn the counts into WER, then see why normalising text and pooling errors change the answer.',
  steps: [
    'edit_table(ref, hyp): ref and hyp are lists of words. Return a table with len(ref) + 1 rows and len(hyp) + 1 columns, where table[i][j] is the fewest edits (substitution, deletion or insertion, each costing 1) that turn ref[:i] into hyp[:j]. The first row and column are 0, 1, 2, 3 and so on.',
    'align(ref, hyp): start at the bottom-right cell and walk back to the top-left. Prefer a match or substitution if it fits the numbers, then a deletion, then an insertion. Return the steps in reading order as (op, ref_word, hyp_word), where op is "ok", "sub", "del" or "ins". Use None for the missing word in a deletion or an insertion.',
    'normalise(text): lower-case, keep letters, digits and apostrophes, turn everything else into a space, and return the list of words.',
    'wer(ref_text, hyp_text): normalise both, then return (substitutions + deletions + insertions) divided by the number of reference words. If the reference is empty, return 0.0 when the hypothesis is empty too and None otherwise.',
    'corpus_wer(pairs): pairs is a list of (ref_text, hyp_text). Return the total errors divided by the total reference words, not the average of the separate rates.',
  ],
  starter: `def edit_table(ref, hyp):
    # TODO: table[i][j] = fewest edits to turn ref[:i] into hyp[:j]
    ...

def align(ref, hyp):
    # TODO: walk back from the bottom-right cell; return [(op, ref_word, hyp_word), ...] in reading order
    ...

def counts(ref, hyp):
    steps = align(ref, hyp)
    return (sum(1 for s in steps if s[0] == "sub"),
            sum(1 for s in steps if s[0] == "del"),
            sum(1 for s in steps if s[0] == "ins"))

def normalise(text):
    # TODO: lower-case, keep letters, digits and apostrophes, everything else becomes a space; return a list of words
    ...

def wer(ref_text, hyp_text):
    # TODO: normalise both, count edits, divide by the reference length
    ...

def corpus_wer(pairs):
    # TODO: total errors over total reference words
    ...

ref = "she sells sea shells by the sea shore every day".split()
hyp = "she sells see shells by the shore every day today".split()
print(align(ref, hyp))      # expect eight "ok" steps, one "sub", one "del" and one "ins"
`,
  solution: `def edit_table(ref, hyp):
    n, m = len(ref), len(hyp)
    table = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        table[i][0] = i
    for j in range(m + 1):
        table[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if ref[i - 1] == hyp[j - 1] else 1
            table[i][j] = min(table[i - 1][j - 1] + cost, table[i - 1][j] + 1, table[i][j - 1] + 1)
    return table

def align(ref, hyp):
    table = edit_table(ref, hyp)
    i, j = len(ref), len(hyp)
    steps = []
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            cost = 0 if ref[i - 1] == hyp[j - 1] else 1
            if table[i][j] == table[i - 1][j - 1] + cost:
                steps.append(("ok" if cost == 0 else "sub", ref[i - 1], hyp[j - 1]))
                i, j = i - 1, j - 1
                continue
        if i > 0 and table[i][j] == table[i - 1][j] + 1:
            steps.append(("del", ref[i - 1], None))
            i -= 1
        else:
            steps.append(("ins", None, hyp[j - 1]))
            j -= 1
    return steps[::-1]

def counts(ref, hyp):
    steps = align(ref, hyp)
    return (sum(1 for s in steps if s[0] == "sub"),
            sum(1 for s in steps if s[0] == "del"),
            sum(1 for s in steps if s[0] == "ins"))

def normalise(text):
    kept = "".join(c if (c.isalnum() or c == "'") else " " for c in text.lower())
    return kept.split()

def wer(ref_text, hyp_text):
    ref, hyp = normalise(ref_text), normalise(hyp_text)
    if not ref:
        return 0.0 if not hyp else None
    return sum(counts(ref, hyp)) / len(ref)

def corpus_wer(pairs):
    errors = 0
    total = 0
    for ref_text, hyp_text in pairs:
        ref, hyp = normalise(ref_text), normalise(hyp_text)
        errors += sum(counts(ref, hyp))
        total += len(ref)
    return errors / total

ref = "she sells sea shells by the sea shore every day".split()
hyp = "she sells see shells by the shore every day today".split()
print(counts(ref, hyp))     # expect (1, 1, 1)
`,
  tests: `
W = lambda s: s.split()

def _near(a, b):
    return a is not None and abs(a - b) < 1e-9

check("edit_table has one more row and column than there are words", lambda: len(edit_table(W("a b c"), W("a x"))) == 4 and len(edit_table(W("a b c"), W("a x"))[0]) == 3)
check("the first row and column count up from 0", lambda: edit_table(W("a b c"), W("a x"))[0] == [0, 1, 2] and [r[0] for r in edit_table(W("a b c"), W("a x"))] == [0, 1, 2, 3])
check("the bottom-right cell is the edit distance: a b c to a x c d needs 2 edits", lambda: edit_table(W("a b c"), W("a x c d"))[3][4] == 2)
check("the edit distance is the same in both directions", lambda: edit_table(W("one two three four"), W("two three five"))[4][3] == edit_table(W("two three five"), W("one two three four"))[3][4] == 2)
check("identical sentences align as all ok", lambda: align(W("the cat sat"), W("the cat sat")) == [("ok", "the", "the"), ("ok", "cat", "cat"), ("ok", "sat", "sat")])
check("align returns steps in reading order, with None for the missing word", lambda: align(W("the cat sat"), W("the hat sat down")) == [("ok", "the", "the"), ("sub", "cat", "hat"), ("ok", "sat", "sat"), ("ins", None, "down")])
check("a dropped word is a deletion", lambda: counts(W("the cat sat on the mat"), W("cat sat the mat")) == (0, 2, 0))
check("the worked example has one substitution, one deletion and one insertion", lambda: counts(W("she sells sea shells by the sea shore every day"), W("she sells see shells by the shore every day today")) == (1, 1, 1))
check("a longer wrong output has substitutions and insertions: a b c against d e f g h", lambda: counts(W("a b c"), W("d e f g h")) == (3, 0, 2))
check("the counts add up to the edit distance in the table", lambda: all(sum(counts(W(r), W(h))) == edit_table(W(r), W(h))[len(W(r))][len(W(h))] for r, h in [("a b c d e f", "b c x f g h"), ("one two three", "three two one"), ("x y z", "x y z w")]))
check("normalise lower-cases, drops punctuation and splits", lambda: normalise("Hello,  World!") == ["hello", "world"])
check("normalise keeps apostrophes inside words and splits at hyphens", lambda: normalise("It's well-known.") == ["it's", "well", "known"])
check("the worked example has a WER of 0.30", lambda: _near(wer("she sells sea shells by the sea shore every day", "she sells see shells by the shore every day today"), 0.3))
check("a perfect transcript has a WER of 0", lambda: _near(wer("hello world", "hello world"), 0.0))
check("WER can be above 1", lambda: _near(wer("a b c", "d e f g h"), 5 / 3))
check("normalising removes format-only errors: capitals, commas and full stops", lambda: _near(wer("Call me at 5, it's urgent.", "call me at 5 it's urgent"), 0.0))
check("a wrong number word is still an error after normalising: 1 in 4 is 0.25", lambda: _near(wer("give him fifteen milligrams", "give him fifty milligrams"), 0.25))
check("an empty reference has no WER, unless the output is empty too", lambda: wer("", "thanks for watching") is None and _near(wer("", ""), 0.0))
check("corpus_wer pools the errors: 3 errors in 100 words, not an average of two rates", lambda: _near(corpus_wer([("a b", "a x"), (" ".join(["w"] * 98), " ".join(["w"] * 96 + ["x", "y"]))]), 0.03))
check("pooling differs from averaging the per-sentence rates", lambda: corpus_wer([("a b", "a x"), (" ".join(["w"] * 98), " ".join(["w"] * 96 + ["x", "y"]))]) < (wer("a b", "a x") + wer(" ".join(["w"] * 98), " ".join(["w"] * 96 + ["x", "y"]))) / 2 - 0.1)
`,
  hints: [
    'Fill the table row by row. table[i][j] is the smallest of three things: table[i-1][j-1] plus 0 (if ref[i-1] equals hyp[j-1]) or 1, table[i-1][j] + 1 (a deletion), and table[i][j-1] + 1 (an insertion). Set the first row and column to 0, 1, 2, 3 before the loops.',
    'To walk back, begin at i = len(ref), j = len(hyp). If both are above 0 and table[i][j] equals table[i-1][j-1] plus the match cost, it was a match or a substitution: record it and step diagonally. Otherwise, if table[i][j] equals table[i-1][j] + 1, it was a deletion; if not, an insertion. Reverse the list at the end.',
    'For normalise, build one string with "".join(c if c.isalnum() or c == "\'" else " " for c in text.lower()) and call .split() on it. For corpus_wer, add up sum(counts(ref, hyp)) and len(ref) over all pairs, then divide once at the end.',
  ],
};
