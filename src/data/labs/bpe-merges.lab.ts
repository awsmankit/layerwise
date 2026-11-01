import type { Lab } from './types';

export const lab: Lab = {
  id: 'bpe-merges',
  title: 'Train a byte-pair-encoding tokenizer',
  level: 'intermediate',
  minutes: 30,
  lesson: 'deep-learning/build-a-tokenizer',
  goal: 'Byte-pair encoding builds a vocabulary by merging the most frequent pair of neighbouring tokens, over and over. Write the pair counter and the merge step, use them to learn merges from a tiny corpus, then encode and decode text with what you learned. Starting from raw bytes means the tokenizer can handle any text, including accents and Chinese.',
  steps: [
    'pair_counts(words): words maps a tuple of token ids to how often that word occurs. Count every adjacent pair, adding the word\'s frequency each time the pair appears.',
    'merge_pair(ids, pair, new_id): return a tuple in which each occurrence of pair, scanning left to right, is replaced by new_id. Occurrences must not overlap, so (1, 1, 1) with pair (1, 1) becomes (new_id, 1).',
    'best_pair(counts): the pair with the highest count. On a tie take the smaller pair (compare the first id, then the second). Return None when there are no pairs.',
    'train(text, num_merges): repeat counting, picking and merging. Give merge number k the id 256 + k. Stop early if no pairs are left or the best pair occurs fewer than 2 times. Return a list of ((a, b), new_id).',
    'encode(text, merges) and decode(ids, merges): encode applies the learned merges to each word\'s bytes in the order they were learned; decode turns ids back into bytes and then into text.',
  ],
  starter: `# Byte-pair encoding, from bytes up. Ids 0 to 255 are the 256 byte values.
# Merge number k (counting from 0) creates the new token with id 256 + k.

def pretokenize(text):
    """Split text into words that each keep their leading space: 'a cat' -> ['a', ' cat'].
    Merges never cross these boundaries."""
    words = []
    for ch in text:
        if ch == " " or not words:
            words.append(ch)
        else:
            words[-1] += ch
    return words

def words_from_text(text):
    """{(byte ids of a word): how many times the word occurs}"""
    freq = {}
    for w in pretokenize(text):
        ids = tuple(w.encode("utf-8"))
        freq[ids] = freq.get(ids, 0) + 1
    return freq


def pair_counts(words):
    """words: {tuple of ids: frequency}. Return {(a, b): count} over all adjacent pairs."""
    counts = {}
    # TODO: for each word and each adjacent pair in it, add the word's frequency to that pair's count
    return counts

def merge_pair(ids, pair, new_id):
    """Replace each non-overlapping occurrence of pair in ids, left to right, by new_id. Return a tuple."""
    # TODO: walk along ids; if the next two ids equal pair, output new_id and skip both, else output one id
    return tuple(ids)

def best_pair(counts):
    """The pair with the highest count; ties go to the smaller pair. None if counts is empty."""
    # TODO
    return None

def train(text, num_merges):
    """Learn merges. Return a list of ((a, b), new_id), in the order learned."""
    words = words_from_text(text)
    merges = []
    while len(merges) < num_merges:
        # TODO: count pairs, pick the best one, stop if there is none or it occurs fewer than 2 times,
        # record ((a, b), 256 + len(merges)), and apply the merge to every word (keep the frequencies)
        break
    return merges

def encode(text, merges):
    """Text -> token ids. Start from each word's bytes and apply the merges in the order they were learned."""
    ids = []
    # TODO
    return ids

def decode(ids, merges):
    """Token ids -> text. Build the bytes of every token from the merges, join them, decode as UTF-8."""
    # TODO
    return ""


CORPUS = "the cat sat on the mat the cat ate the rat the rat sat on the mat"
merges = train(CORPUS, 14)
print(len(merges), "merges learned; the first three:", merges[:3])
print("bytes in the corpus:", len(CORPUS.encode("utf-8")), "-> tokens:", len(encode(CORPUS, merges)))
print(encode("the cat sat", merges))
`,
  solution: `# Byte-pair encoding, from bytes up. Ids 0 to 255 are the 256 byte values.
# Merge number k (counting from 0) creates the new token with id 256 + k.

def pretokenize(text):
    """Split text into words that each keep their leading space: 'a cat' -> ['a', ' cat'].
    Merges never cross these boundaries."""
    words = []
    for ch in text:
        if ch == " " or not words:
            words.append(ch)
        else:
            words[-1] += ch
    return words

def words_from_text(text):
    """{(byte ids of a word): how many times the word occurs}"""
    freq = {}
    for w in pretokenize(text):
        ids = tuple(w.encode("utf-8"))
        freq[ids] = freq.get(ids, 0) + 1
    return freq


def pair_counts(words):
    """words: {tuple of ids: frequency}. Return {(a, b): count} over all adjacent pairs."""
    counts = {}
    for ids, freq in words.items():
        for a, b in zip(ids, ids[1:]):
            counts[(a, b)] = counts.get((a, b), 0) + freq
    return counts

def merge_pair(ids, pair, new_id):
    """Replace each non-overlapping occurrence of pair in ids, left to right, by new_id. Return a tuple."""
    out = []
    i = 0
    while i < len(ids):
        if i + 1 < len(ids) and (ids[i], ids[i + 1]) == pair:
            out.append(new_id)
            i += 2
        else:
            out.append(ids[i])
            i += 1
    return tuple(out)

def best_pair(counts):
    """The pair with the highest count; ties go to the smaller pair. None if counts is empty."""
    if not counts:
        return None
    return min(counts, key=lambda p: (-counts[p], p))

def train(text, num_merges):
    """Learn merges. Return a list of ((a, b), new_id), in the order learned."""
    words = words_from_text(text)
    merges = []
    while len(merges) < num_merges:
        counts = pair_counts(words)
        pair = best_pair(counts)
        if pair is None or counts[pair] < 2:
            break
        new_id = 256 + len(merges)
        merges.append((pair, new_id))
        words = {merge_pair(ids, pair, new_id): freq for ids, freq in words.items()}
    return merges

def encode(text, merges):
    """Text -> token ids. Start from each word's bytes and apply the merges in the order they were learned."""
    ids = []
    for w in pretokenize(text):
        word = tuple(w.encode("utf-8"))
        for pair, new_id in merges:
            word = merge_pair(word, pair, new_id)
        ids.extend(word)
    return ids

def decode(ids, merges):
    """Token ids -> text. Build the bytes of every token from the merges, join them, decode as UTF-8."""
    vocab = {i: bytes([i]) for i in range(256)}
    for (a, b), new_id in merges:
        vocab[new_id] = vocab[a] + vocab[b]
    return b"".join(vocab[i] for i in ids).decode("utf-8", errors="replace")


CORPUS = "the cat sat on the mat the cat ate the rat the rat sat on the mat"
merges = train(CORPUS, 14)
print(len(merges), "merges learned; the first three:", merges[:3])
print("bytes in the corpus:", len(CORPUS.encode("utf-8")), "-> tokens:", len(encode(CORPUS, merges)))
print(encode("the cat sat", merges))
`,
  tests: `
CORPUS = "the cat sat on the mat the cat ate the rat the rat sat on the mat"
# The expected values below come from an independent reference implementation, same rules.

def _counts():
    c = pair_counts({(1, 2, 3): 2, (2, 3): 1, (7,): 5})
    assert c == {(1, 2): 2, (2, 3): 3}, "expected {(1, 2): 2, (2, 3): 3}, got " + str(c)
check("pair_counts weights each pair by the word's frequency (and ignores one-token words)", _counts)

def _counts_corpus():
    c = pair_counts(words_from_text(CORPUS))
    assert c[(97, 116)] == 9, "'a' followed by 't' occurs 9 times in the corpus, got " + str(c.get((97, 116)))
    assert c[(104, 101)] == 6 and c[(116, 104)] == 6 and c[(32, 116)] == 5, "check h,e (6), t,h (6), space,t (5)"
check("pair counts on the corpus: a,t occurs 9 times", _counts_corpus)

def _merge():
    assert merge_pair((1, 2, 3, 1, 2), (1, 2), 9) == (9, 3, 9)
    assert merge_pair((5,), (1, 2), 9) == (5,)
    assert merge_pair((), (1, 2), 9) == ()
check("merge_pair replaces every occurrence of the pair", _merge)

def _overlap():
    assert merge_pair((1, 1, 1), (1, 1), 9) == (9, 1), "scan left to right: (1, 1, 1) becomes (9, 1), got " + str(merge_pair((1, 1, 1), (1, 1), 9))
    assert merge_pair((1, 1, 1, 1), (1, 1), 9) == (9, 9)
    assert isinstance(merge_pair((1, 2), (1, 2), 9), tuple), "return a tuple"
check("merge_pair never lets matches overlap", _overlap)

def _best():
    assert best_pair({}) is None
    assert best_pair({(1, 2): 3, (4, 5): 7, (0, 9): 2}) == (4, 5)
    assert best_pair({(5, 1): 4, (3, 9): 4, (3, 2): 4}) == (3, 2), "a tie goes to the smaller pair"
check("best_pair picks the highest count, and the smaller pair on a tie", _best)

def _first_merges():
    m = train(CORPUS, 4)
    want = [((97, 116), 256), ((104, 101), 257), ((116, 257), 258), ((32, 258), 259)]
    assert m == want, "the first four merges should be at, he, the and ' the'; expected " + str(want) + ", got " + str(m)
check("the first four merges are at, he, the, and space+the", _first_merges)

def _train_all():
    m = train(CORPUS, 100)
    assert len(m) == 14, "after 14 merges no pair occurs twice any more, so training stops; got " + str(len(m))
    assert m[-1] == ((264, 256), 269), "the last merge builds ' sat' from ' s' and 'at'; got " + str(m[-1])
    assert len(train(CORPUS, 5)) == 5, "respect num_merges"
    assert train("abcdefg", 10) == [], "no pair repeats, so nothing is learned"
check("training stops when no pair occurs twice, and respects num_merges", _train_all)

def _bytes_only():
    assert encode("hi", []) == [104, 105]
    assert encode("é", []) == [195, 169], "accented letters are two UTF-8 bytes"
check("with no merges, encoding gives the raw UTF-8 bytes", _bytes_only)

def _encode():
    m = train(CORPUS, 100)
    assert encode("the cat sat on the mat", m) == [258, 265, 269, 267, 259, 266], "got " + str(encode("the cat sat on the mat", m))
    assert encode(" that rat", m) == [32, 116, 104, 256, 268], "an unseen word is split into smaller known pieces; got " + str(encode(" that rat", m))
check("encode: seen words become one token each, unseen words split into pieces", _encode)

def _compress():
    m = train(CORPUS, 100)
    n = len(encode(CORPUS, m))
    assert len(CORPUS.encode("utf-8")) == 65
    assert n == 19, "65 bytes should become 19 tokens, got " + str(n)
    assert len(encode(CORPUS, m[:4])) == 39, "after four merges the corpus is 39 tokens"
check("the corpus shrinks from 65 bytes to 19 tokens as merges are used", _compress)

def _roundtrip():
    m = train(CORPUS, 100)
    for s in ["the cat sat on the mat", "café 猫 🙂", "", "   ", "a\\n\\nb"]:
        back = decode(encode(s, m), m)
        assert back == s, "round trip failed for " + repr(s) + ": got " + repr(back)
check("decode(encode(text)) gives the text back, for any text", _roundtrip)

def _no_unknown():
    m = train(CORPUS, 100)
    assert all(0 <= i < 270 for i in encode("zebra 猫 xyz", m)), "every id must exist in the vocabulary"
check("nothing is ever unknown: new words and new scripts fall back to bytes", _no_unknown)
`,
  hints: [
    'pair_counts: loop over words.items(); inside, zip(ids, ids[1:]) gives each adjacent pair. Add freq, not 1.',
    'merge_pair: use an index i. If i + 1 < len(ids) and (ids[i], ids[i + 1]) == pair, append new_id and move i on by 2; otherwise append ids[i] and move on by 1. best_pair: min(counts, key=lambda p: (-counts[p], p)).',
    'train: counts = pair_counts(words); pair = best_pair(counts); stop if pair is None or counts[pair] < 2; new_id = 256 + len(merges); then words = {merge_pair(ids, pair, new_id): freq for ids, freq in words.items()}. encode: for each pretokenized word, start from its bytes and call merge_pair once per learned merge, in order.',
  ],
};
