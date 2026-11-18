import type { Extra } from '../lesson-extras';

export const extrasMathsMl3: Record<string, Extra> = {
  'maths/jacobians-and-hessians': {
    takeaways: [
      'The Jacobian is the grid of partial derivatives for a function with several outputs.',
      'Near a point, the Jacobian gives the best linear prediction of a small change in the output.',
      'Backpropagation is the chain rule applied to Jacobians, layer by layer.',
      'The Hessian, the Jacobian of the gradient, describes curvature.',
    ],
    prereq: ['maths/partial-derivatives-and-gradients'],
    quiz: [
      { q: 'For F(x, y) = (xy, x + y²), what is the top-left entry of the Jacobian?', options: ['x', 'y', '1', '2y'], answer: 1, why: 'The partial derivative of xy with respect to x is y.' },
      { q: 'What does the Jacobian predict for a small input step?', options: ['The exact output at any distance', 'The change in output, to first order', 'Only the input size', 'The loss on the training set'], answer: 1, why: 'The Jacobian times the step gives the linear approximation of the output change, which is accurate for small steps.' },
    ],
  },
  'maths/common-distributions': {
    takeaways: [
      'The binomial counts successes in n independent tries with chance p, with mean np and variance np(1−p).',
      'The Poisson counts events at a steady rate λ, with mean and variance both equal to λ.',
      'The Poisson is the binomial with many tries and rare successes.',
      'Checking the mean and variance of counts is a quick test for which distribution fits.',
    ],
    prereq: ['maths/expectation-and-variance'],
    quiz: [
      { q: 'What is the variance of a binomial with n = 10 and p = 0.3?', options: ['3', '2.1', '0.7', '10'], answer: 1, why: 'The variance is np(1−p) = 10 × 0.3 × 0.7 = 2.1.' },
      { q: 'For a Poisson with rate λ = 4, what is the variance?', options: ['2', '4', '16', '0.25'], answer: 1, why: 'The Poisson has mean and variance both equal to λ, so the variance is 4.' },
    ],
  },
  'maths/beta-and-updating-beliefs': {
    takeaways: [
      'A beta distribution is a belief about a chance between 0 and 1.',
      'Its parameters can be read as prior successes and failures, so updating adds the new counts.',
      'The posterior mean gives the estimate; the spread shows how sure the data has made you.',
      'The same observed share can hide very different levels of certainty.',
    ],
    prereq: ['maths/common-distributions', 'maths/bayes-and-conditional-probability'],
    quiz: [
      { q: 'You start with Beta(1, 1) and observe 7 successes and 3 failures. What is the posterior?', options: ['Beta(7, 3)', 'Beta(8, 4)', 'Beta(1, 1)', 'Beta(10, 10)'], answer: 1, why: 'Add the successes to a and the failures to b: a = 1 + 7 = 8 and b = 1 + 3 = 4.' },
      { q: 'Two tests both show 75 per cent success. What separates a belief from the larger one?', options: ['The mean alone', 'The spread: more data gives a narrower belief', 'The colour of the chart', 'Nothing, they are identical'], answer: 1, why: 'The mean matches, but more observations make the belief narrower and more certain.' },
    ],
  },
  'maths/hypothesis-testing-and-p-values': {
    takeaways: [
      'A hypothesis test starts from a default assumption, the null hypothesis.',
      'The p-value is the probability, under the null, of data at least as extreme as what you observed.',
      'A small p-value is evidence against the null; it is not proof, and it is not the chance the null is true.',
      'Report the size of the effect alongside the p-value, and beware of testing many things at once.',
    ],
    prereq: ['maths/confidence-intervals'],
    quiz: [
      { q: 'What does a two-sided p-value of 0.04 mean?', options: ['There is a 4% chance the coin is fair', 'If the null were true, data this extreme would appear about 4% of the time', 'The effect is 4% big', 'The null is 96% likely'], answer: 1, why: 'The p-value is the probability of data at least as extreme as observed, assuming the null is true.' },
      { q: 'Why is a tiny p-value alone not enough to call a result important?', options: ['P-values are always wrong', 'With enough data, very small effects can have small p-values', 'Small p-values only apply to coins', 'It is always the opposite'], answer: 1, why: 'Large samples can make trivial effects statistically significant, so the effect size matters too.' },
    ],
  },
  'maths/markov-chains': {
    takeaways: [
      'A Markov chain\'s next state depends only on its current state.',
      'A transition matrix gives the chance of each move, and each row sums to 1.',
      'Repeated multiplication by the matrix moves the probability through the chain.',
      'For many chains the distribution settles to a stationary value that does not depend on the start.',
    ],
    prereq: ['maths/matrices-as-layers'],
    quiz: [
      { q: 'In a Markov chain, what determines the next state?', options: ['The whole history', 'Only the current state', 'The starting state only', 'A random choice unrelated to the chain'], answer: 1, why: 'The Markov property says the next state depends only on the current one.' },
      { q: 'With sunny staying sunny 90% and rainy staying rainy 50%, what is the long-run chance of sun?', options: ['50%', 'About 83%', '90%', '10%'], answer: 1, why: 'Balancing the flows between states gives π_sun = 1/1.2, about 83 per cent.' },
    ],
  },
};
