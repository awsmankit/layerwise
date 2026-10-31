import type { Lab } from './types';

export const lab: Lab = {
  id: 'py-count-and-average',
  title: 'Count the words, average the scores',
  level: 'basic',
  minutes: 10,
  lesson: 'skills/python-first-steps',
  goal: 'Two jobs that AI code does all the time: measure a message and summarise a list of numbers. Write three small functions with a loop and a little arithmetic.',
  steps: [
    'count_words(message): return how many words the message has. Words are separated by spaces.',
    'average(scores): add the numbers up and divide by how many there are. An empty list should give 0, not an error.',
    'highest(scores): return the biggest number, using a loop and a variable that remembers the best so far. Do not use max().',
  ],
  starter: `def count_words(message):
    # TODO: split the message into words and count them
    ...

def average(scores):
    # TODO: total divided by how many, but 0 for an empty list
    ...

def highest(scores):
    # TODO: walk along the list, remembering the biggest so far
    ...

print(count_words("you have won a prize"))
print(average([72, 85, 90, 64]))
print(highest([72, 85, 90, 64]))
`,
  solution: `def count_words(message):
    words = message.split()
    return len(words)

def average(scores):
    if len(scores) == 0:
        return 0
    total = 0
    for score in scores:
        total = total + score
    return total / len(scores)

def highest(scores):
    best = scores[0]
    for score in scores:
        if score > best:
            best = score
    return best

print(count_words("you have won a prize"))
print(average([72, 85, 90, 64]))
print(highest([72, 85, 90, 64]))
`,
  tests: `
check("count_words('you have won a prize') is 5", lambda: count_words("you have won a prize") == 5)
check("count_words counts one word as 1", lambda: count_words("hello") == 1)
check("count_words ignores extra spaces", lambda: count_words("  free   gift  ") == 2)
check("count_words of an empty message is 0", lambda: count_words("") == 0)
check("average([72, 85, 90, 64]) is 77.75", lambda: abs(average([72, 85, 90, 64]) - 77.75) < 1e-9)
check("average([10]) is 10", lambda: average([10]) == 10)
check("average of an empty list is 0, not an error", lambda: average([]) == 0)
check("highest([72, 85, 90, 64]) is 90", lambda: highest([72, 85, 90, 64]) == 90)
check("highest works when the biggest is first or last", lambda: highest([9, 3, 4]) == 9 and highest([1, 2, 7]) == 7)
check("highest works with negative numbers", lambda: highest([-5, -2, -9]) == -2)
`,
  hints: [
    'message.split() gives a list of words. len(that list) is how many.',
    'For average: start total at 0, loop over scores adding each one to total, then return total / len(scores). Check for an empty list first with if len(scores) == 0.',
    'For highest: set best = scores[0], then for each score, if score > best: best = score. Return best at the end.',
  ],
};
