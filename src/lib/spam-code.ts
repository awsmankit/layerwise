import { EXTRA, TEST, TRAIN, pyList } from './spam-data';

/**
 * The Python the "Your first model" lesson builds, one piece at a time. The lesson's
 * Run it pads and the practice lab take their earlier steps from here, so they never drift apart.
 */
export const PY_TOKENIZE = `def tokenize(text):
    words = []
    for piece in text.lower().split():
        piece = piece.strip(".,!?:;")
        if piece != "":
            words.append(piece)
    return words
`;

export const PY_TRAIN = `def train(examples):
    words = {"spam": {}, "ham": {}}
    messages = {"spam": 0, "ham": 0}
    for text, label in examples:
        messages[label] += 1
        for word in tokenize(text):
            counts = words[label]
            counts[word] = counts.get(word, 0) + 1
    return {"words": words, "messages": messages}
`;

export const PY_LOG_SCORE = `import math

def log_score(model, text, label):
    counts = model["words"][label]
    total_words = sum(counts.values())
    seen = set(model["words"]["spam"])
    seen |= set(model["words"]["ham"])
    spam_n = model["messages"]["spam"]
    ham_n = model["messages"]["ham"]
    score = math.log(model["messages"][label] / (spam_n + ham_n))
    for word in tokenize(text):
        if word in seen:
            chance = (counts.get(word, 0) + 1) / (total_words + len(seen))
            score += math.log(chance)
    return score
`;

export const PY_PREDICT = `def predict(model, text):
    if log_score(model, text, "spam") > log_score(model, text, "ham"):
        return "spam"
    return "ham"
`;

export const PY_ACCURACY = `def accuracy(model, examples):
    right = 0
    for text, label in examples:
        if predict(model, text) == label:
            right += 1
    return right / len(examples)
`;

export const PY_DATA = pyList('train_set', TRAIN) + '\n' + pyList('test_set', TEST) + '\n' + pyList('extra_set', EXTRA);

/** Keys a Run it pad can name in its `setup` list, in the order the lesson introduces them. */
export const PY_STEPS: Record<string, string> = {
  data: PY_DATA,
  tokenize: PY_TOKENIZE,
  train: PY_TRAIN,
  log_score: PY_LOG_SCORE,
  predict: PY_PREDICT,
  accuracy: PY_ACCURACY,
};
