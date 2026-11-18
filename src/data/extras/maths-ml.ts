import type { Extra } from '../lesson-extras';

export const extrasMathsMl: Record<string, Extra> = {
  'maths/softmax-and-probabilities': {
    takeaways: [
      'Softmax turns a list of raw scores into probabilities that are all positive and add up to 1.',
      'It takes the exponential of each score, so the largest score gets a disproportionately large share.',
      'Only the gaps between scores matter: adding the same amount to every score changes nothing.',
      'The output is the model\'s belief, not a fact, so a 0.66 can still be wrong.',
    ],
    quiz: [
      { q: 'What do softmax outputs always satisfy?', options: ['They are all positive and add up to 1', 'They can be negative', 'They are always equal', 'They add up to the largest score'], answer: 0, why: 'Exponentials are positive, and dividing by their total makes the shares add up to exactly 1.' },
      { q: 'If you add 10 to every score before softmax, what happens to the probabilities?', options: ['They change a lot', 'They stay the same', 'The top option loses its lead', 'They become negative'], answer: 1, why: 'Adding the same amount multiplies every exponential by the same factor, and that factor cancels when you divide by the total.' },
    ],
  },
  'maths/cross-entropy-and-logs': {
    takeaways: [
      'Cross-entropy for one example is minus the natural log of the probability the model gave the right answer.',
      'Confident and right costs almost nothing; confident and wrong costs a lot, and the cost grows without limit as the probability heads to zero.',
      'The logarithm turns a product of probabilities, as in a whole sentence, into a sum that is easy to measure.',
      'Training averages this loss over many examples; lower is better, and perplexity is the same measure in another form.',
    ],
    prereq: ['maths/softmax-and-probabilities'],
    quiz: [
      { q: 'The model gives the right answer a probability of 0.01. What is the cross-entropy loss for this example?', options: ['0.01', '0.99', 'About 4.6', 'Zero'], answer: 2, why: 'Minus the natural log of 0.01 is about 4.6, a large penalty for being confidently wrong.' },
      { q: 'Why does the loss take a logarithm of the probability?', options: ['To make the loss negative', 'To turn a product of probabilities into a sum', 'To make the probabilities add up to 1', 'To remove the need for training'], answer: 1, why: 'The log of a product is the sum of the logs, so the loss for a whole sentence becomes a sum of per-word losses.' },
    ],
  },
  'maths/derivatives-and-slopes': {
    takeaways: [
      'A derivative is the slope of a curve at one point, found as the limit of a chord slope as the step shrinks.',
      'The secant slope for f(x) = x² with step h is 2x + h, so it approaches 2x as h goes to zero.',
      'The sign of the derivative tells a model which way to move a dial to reduce the loss.',
      'The chain rule multiplies slopes through nested functions, which is how backpropagation works.',
    ],
    prereq: ['maths/softmax-and-probabilities'],
    quiz: [
      { q: 'For f(x) = x², what is the slope at x = 1?', options: ['1', '2', '3', '0.5'], answer: 1, why: 'The derivative of x² is 2x, so at x = 1 the slope is 2.' },
      { q: 'What does the chain rule do?', options: ['Adds two slopes', 'Multiplies the slopes of nested functions', 'Sets the slope to zero', 'Turns a slope into a probability'], answer: 1, why: 'For a function inside a function, the slope is the outer slope times the inner slope.' },
    ],
  },
  'maths/gradient-descent-by-hand': {
    takeaways: [
      'Gradient descent moves each dial against its slope: w_new = w_old − learning rate × slope.',
      'A learning rate that is too small creeps; one that is too large overshoots, and the steps can grow until the loss blows up.',
      'Training repeats this update for every dial, on batches of examples.',
      'Momentum keeps a running average of past slopes so steps that agree build speed.',
    ],
    prereq: ['maths/derivatives-and-slopes'],
    quiz: [
      { q: 'With the loss (w − 3)², starting at w = 0 and learning rate 0.1, what is the first new value of w?', options: ['0', '0.6', '3', '−0.6'], answer: 1, why: 'The slope at 0 is −6, so w moves to 0 − 0.1 × (−6) = 0.6.' },
      { q: 'What happens when the learning rate is too large?', options: ['The loss creeps down slowly', 'The steps overshoot and can grow', 'The model learns faster and never overshoots', 'The slope becomes zero'], answer: 1, why: 'A rate that is too large jumps past the minimum and can make each overshoot bigger than the last.' },
    ],
  },
  'maths/matrices-as-layers': {
    takeaways: [
      'A dot product multiplies two equal-length lists pair by pair and adds the results.',
      'A matrix times a list gives one dot product per row, so each row is one neuron\'s weights.',
      'A neural network layer is a matrix plus a bend such as ReLU.',
      'Checking shapes is the quickest way to find most errors in model code.',
    ],
    prereq: ['maths/softmax-and-probabilities'],
    quiz: [
      { q: 'What is the dot product of (1, 2) and (3, 4)?', options: ['10', '11', '24', '7'], answer: 1, why: '1 × 3 + 2 × 4 = 3 + 8 = 11.' },
      { q: 'A layer takes 512 inputs and gives 1,024 outputs. What is the shape of its weight matrix?', options: ['512 by 1,024', '1,024 by 512', '1,024 by 1,024', '512 by 512'], answer: 1, why: 'Each of the 1,024 outputs has one row, and each row has 512 weights, one per input.' },
    ],
  },
  'maths/bayes-and-conditional-probability': {
    takeaways: [
      'P(A | B) and P(B | A) are different numbers, and mixing them up is a common error.',
      'Bayes\' rule converts from P(positive | sick) to P(sick | positive) using the base rate.',
      'A rare condition with a good test can still produce mostly false positives.',
      'The same idea lets a model update its beliefs when new evidence arrives.',
    ],
    prereq: ['maths/softmax-and-probabilities'],
    quiz: [
      { q: 'A condition affects 1 in 100 people. A test catches 90 per cent of sick people and is quiet for 91 per cent of healthy people. Roughly what share of positive results are real?', options: ['90 per cent', 'About 9 per cent', 'About 50 per cent', '1 per cent'], answer: 1, why: 'Of 1,000 people, 9 true positives and 89 false positives give 98 positives, so 9 out of 98 is about 9 per cent.' },
      { q: 'Which quantity is P(positive | sick)?', options: ['The chance someone is sick given a positive test', 'The chance a sick person tests positive', 'The chance a positive result is correct', 'The share of the population that is sick'], answer: 1, why: 'The vertical bar reads "given": the chance of a positive result, among sick people.' },
    ],
  },
};
