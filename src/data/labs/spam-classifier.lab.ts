import type { Lab } from './types';
import { PY_ACCURACY, PY_DATA, PY_LOG_SCORE, PY_PREDICT, PY_TOKENIZE, PY_TRAIN } from '../../lib/spam-code';

/** The lesson's code, with the three functions the learner writes swapped for placeholders. */
const starter = `${PY_DATA}
${PY_TOKENIZE}
def train(examples):
    # TODO: count the messages and the words for each label
    # return {"words": {"spam": {...}, "ham": {...}}, "messages": {"spam": n, "ham": n}}
    ...

${PY_LOG_SCORE}
def predict(model, text):
    # TODO: "spam" if log_score(..., "spam") beats log_score(..., "ham"), else "ham"
    ...

def accuracy(model, examples):
    # TODO: the fraction of examples whose label predict() gets right
    ...

model = train(train_set)
print("accuracy on the test messages:", accuracy(model, test_set))
`;

export const lab: Lab = {
  id: 'spam-classifier',
  title: 'Train and test a spam classifier',
  level: 'basic',
  minutes: 25,
  lesson: 'skills/your-first-model',
  goal: 'Build the counting classifier from "Your first model": learn word counts from labelled messages, use them to label a message, and measure how often it is right on messages it has never seen. The data, the tokenizer and the scoring are written for you; you write the three steps in between.',
  steps: [
    'train(examples): go through the (text, label) pairs. Add 1 to the message count for that label, and add 1 to the count of every word (from tokenize) in that label\'s dictionary. Return the model in the shape shown in the comment.',
    'predict(model, text): compare log_score for "spam" and for "ham" and return the label with the higher score. On a tie, return "ham".',
    'accuracy(model, examples): the fraction of examples where predict gives the real label.',
    'Run the checks. Then train on train_set + extra_set and see what happens to the test accuracy.',
  ],
  starter,
  solution: `${PY_DATA}
${PY_TOKENIZE}
${PY_TRAIN}
${PY_LOG_SCORE}
${PY_PREDICT}
${PY_ACCURACY}
model = train(train_set)
print("accuracy on the test messages:", accuracy(model, test_set))
print("with the extra examples:", accuracy(train(train_set + extra_set), test_set))
`,
  tests: `
tiny = [("Free gift", "spam"), ("free prize now", "spam"), ("See you soon", "ham")]
m = train(tiny)
check("train counts the messages for each label", lambda: m["messages"] == {"spam": 2, "ham": 1})
check("train counts words per label, lowercased", lambda: m["words"]["spam"] == {"free": 2, "gift": 1, "prize": 1, "now": 1})
check("train keeps the ham words apart from the spam words", lambda: m["words"]["ham"] == {"see": 1, "you": 1, "soon": 1})
check("train works on the real training set", lambda: train(train_set)["messages"] == {"spam": 14, "ham": 16} and train(train_set)["words"]["spam"]["free"] == 6)

hand = {"words": {"spam": {"free": 5, "now": 3}, "ham": {"home": 4, "see": 2}}, "messages": {"spam": 5, "ham": 5}}
check("predict says spam for a message full of spam words", lambda: predict(hand, "FREE now") == "spam")
check("predict says ham for a message full of ham words", lambda: predict(hand, "see you at home") == "ham")
check("predict returns exactly the text 'spam' or 'ham'", lambda: predict(hand, "free") in ("spam", "ham") and predict(hand, "home") in ("spam", "ham"))
check("predict falls back on how common each label is when no word is known", lambda: predict({"words": {"spam": {"a": 1}, "ham": {"b": 1}}, "messages": {"spam": 9, "ham": 1}}, "zzz") == "spam")

right = {"words": {"spam": {"free": 5}, "ham": {"home": 5}}, "messages": {"spam": 5, "ham": 5}}
check("accuracy is 1.0 when every example is right", lambda: accuracy(right, [("free", "spam"), ("home", "ham")]) == 1.0)
check("accuracy is 0.5 when half are right", lambda: accuracy(right, [("free", "spam"), ("free", "ham")]) == 0.5)

full = train(train_set)
check("the model gets every training message right", lambda: accuracy(full, train_set) == 1.0)
check("the model gets 10 of the 12 test messages right", lambda: abs(accuracy(full, test_set) - 10 / 12) < 1e-9)
check("with the four extra examples it gets all 12 right", lambda: accuracy(train(train_set + extra_set), test_set) == 1.0)
`,
  hints: [
    'In train, loop for text, label in examples. messages[label] += 1 counts the message. Then loop for word in tokenize(text) and add 1 to words[label][word], using .get(word, 0) + 1 so a new word starts at 0.',
    'predict: compute log_score(model, text, "spam") and log_score(model, text, "ham"), then return "spam" only if the first is bigger; otherwise "ham".',
    'accuracy: keep right = 0, add 1 each time predict(model, text) == label, and return right / len(examples).',
  ],
};
