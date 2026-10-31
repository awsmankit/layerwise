import type { Lab } from './types';

export const lab: Lab = {
  id: 'py-spam-word-check',
  title: 'A tiny spam-word check',
  level: 'basic',
  minutes: 12,
  lesson: 'skills/python-first-steps',
  goal: 'The simplest spam filter is a list of suspicious words and a rule. Use a loop, if/else and a function that calls another function to label messages. It is the hand-written rule from the start of the course, and the thing your first model will improve on.',
  steps: [
    'spam_word_count(message, spam_words): how many pieces of the message are in the spam_words list. The helper make_pieces is already written for you.',
    'is_spam(message, spam_words): True when the message has two or more spam words, otherwise False.',
    'label_all(messages, spam_words): a list with "spam" or "ham" for each message, in the same order. Use is_spam.',
  ],
  starter: `def make_pieces(message):
    pieces = []
    for word in message.lower().split():
        word = word.strip(".,!?:;")
        if word != "":
            pieces.append(word)
    return pieces

def spam_word_count(message, spam_words):
    # TODO: count the pieces that are in spam_words
    ...

def is_spam(message, spam_words):
    # TODO: True for two or more spam words, otherwise False
    ...

def label_all(messages, spam_words):
    # TODO: "spam" or "ham" for each message
    ...

spam_words = ["free", "win", "prize", "click"]
print(spam_word_count("WIN a free prize!", spam_words))
print(is_spam("Are you free on Friday?", spam_words))
`,
  solution: `def make_pieces(message):
    pieces = []
    for word in message.lower().split():
        word = word.strip(".,!?:;")
        if word != "":
            pieces.append(word)
    return pieces

def spam_word_count(message, spam_words):
    count = 0
    for piece in make_pieces(message):
        if piece in spam_words:
            count = count + 1
    return count

def is_spam(message, spam_words):
    if spam_word_count(message, spam_words) >= 2:
        return True
    else:
        return False

def label_all(messages, spam_words):
    labels = []
    for message in messages:
        if is_spam(message, spam_words):
            labels.append("spam")
        else:
            labels.append("ham")
    return labels

spam_words = ["free", "win", "prize", "click"]
print(spam_word_count("WIN a free prize!", spam_words))
print(is_spam("Are you free on Friday?", spam_words))
`,
  tests: `
words = ["free", "win", "prize", "click"]
check("spam_word_count('WIN a free prize!') is 3", lambda: spam_word_count("WIN a free prize!", words) == 3)
check("spam_word_count is 0 when no spam words appear", lambda: spam_word_count("see you at football", words) == 0)
check("spam_word_count ignores capitals and punctuation", lambda: spam_word_count("FREE! Click.", words) == 2)
check("spam_word_count counts a repeated word each time", lambda: spam_word_count("free free", words) == 2)
check("is_spam is True with three spam words", lambda: is_spam("WIN a free prize!", words) is True)
check("is_spam is False with one spam word (a friend asking 'are you free?')", lambda: is_spam("Are you free on Friday?", words) is False)
check("is_spam is False with none", lambda: is_spam("Dinner is ready", words) is False)
check("label_all labels each message in order", lambda: label_all(["Win a prize now", "Dinner is ready", "Click to win"], words) == ["spam", "ham", "spam"])
check("label_all of no messages is an empty list", lambda: label_all([], words) == [])
`,
  hints: [
    'Loop over make_pieces(message). Keep a count that starts at 0 and goes up by 1 when piece in spam_words.',
    'is_spam can compare the count from spam_word_count with 2: if spam_word_count(message, spam_words) >= 2: return True, else return False.',
    'label_all: start with labels = [], loop over messages, and append "spam" if is_spam(message, spam_words) else "ham". Return labels.',
  ],
};
