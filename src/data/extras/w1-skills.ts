import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the "skills" batch. */
export const extrasW1Skills: Record<string, Extra> = {
  'skills/python-first-steps': {
    takeaways: [
      'A program runs line by line from the top. print shows a value, and a variable is a labelled box that holds one.',
      'A list is a numbered shelf that starts at 0, a loop does the same thing for every item, and a dictionary looks things up by name.',
      'A function packages steps under a name, and if and else choose between two paths.',
      'An error message is a clue: read the last line for the kind of error, then the line number for where to look.',
    ],
    prereq: ['start/how-computers-learn', 'start/how-computers-read-words'],
    quiz: [
      { q: 'In Python, scores = [72, 85, 90, 64]. Which box holds 72?', options: ['Box 0', 'Box 1', 'Box 72', 'There is no such box'], answer: 0, why: 'Lists start counting at 0, so the first item is in box 0 and the last is in box 3.' },
      { q: 'What does the line total = total + score do inside a loop?', options: ['Prints the total', 'Adds the current score to the running total', 'Starts the loop again', 'Compares total with score'], answer: 1, why: 'The = sign puts a value in a box, so the total box gets its old value plus the current score.' },
      { q: 'Why make a message lowercase before counting its words?', options: ['It makes the message shorter', 'Python cannot read capital letters', 'WON and won would otherwise count as two different words', 'Spam is always lowercase'], answer: 2, why: 'A computer treats different letters as different things, so lowercase makes the same word look the same every time.' },
      { q: 'Python stops with: NameError: name \'mesage\' is not defined. What is the most likely cause?', options: ['The computer is broken', 'The word is spelt differently from the variable you made', 'Python has run out of memory', 'The message is too long'], answer: 1, why: 'A NameError means Python does not know that name, and a typo in a variable name is the usual reason.' },
    ],
  },
  'skills/your-first-model': {
    takeaways: [
      'Machine learning projects follow a loop: collect labelled examples, turn them into numbers, train, test on unseen examples, look at mistakes, improve.',
      'Training a counting (naive Bayes) classifier is counting how often each word appears in spam and in not-spam messages.',
      'Only the score on unseen test messages is honest; the training score only shows what the model has already seen.',
      'Mistakes show what the examples are missing, but fixing them while looking at the test set makes the test score too optimistic.',
    ],
    prereq: ['skills/python-first-steps', 'start/how-computers-learn', 'start/how-computers-read-words'],
    quiz: [
      { q: 'What is the label of a message in a spam dataset?', options: ['Its length in words', 'The right answer for that message, such as spam or ham', 'The name of the person who sent it', 'The number of times it was read'], answer: 1, why: 'A label is the correct answer attached to an example, and the model learns the pattern between messages and labels.' },
      { q: 'Why do we keep some messages out of training and test on them?', options: ['To make training faster', 'To check the model works on messages it has never seen', 'Because the model cannot count more than 30 messages', 'To save memory'], answer: 1, why: 'A model can score perfectly on messages it has learned from, so only new messages show whether it learned something useful.' },
      { q: 'The model called "Are you free to play games now?" spam. What is the best explanation?', options: ['The model is lazy', 'The words free and now only ever appeared in spam in its training messages', 'The message was too short', 'Python made a mistake'], answer: 1, why: 'A counting model only knows its examples, and free and now appeared only in spam, so they pushed hard towards spam.' },
      { q: 'You fix the mistakes by adding examples written after seeing the test messages that failed. What is the problem with the new test score?', options: ['It is too low to use', 'It is too optimistic, because you peeked at the test set', 'It cannot be calculated', 'Nothing, this is the right way to measure'], answer: 1, why: 'Once the test messages have guided your choices, they no longer stand in for new messages, so you need a fresh test set.' },
    ],
  },
};
