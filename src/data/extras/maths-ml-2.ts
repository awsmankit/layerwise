import type { Extra } from '../lesson-extras';

export const extrasMathsMl2: Record<string, Extra> = {
  'maths/expectation-and-variance': {
    takeaways: [
      'The expected value is the probability-weighted average of the outcomes.',
      'The variance is the probability-weighted average squared distance from the expected value.',
      'The standard deviation is the square root of the variance, in the outcome\'s own units.',
      'Scaling an outcome by a multiplies the variance by a squared.',
    ],
    prereq: ['maths/softmax-and-probabilities'],
    quiz: [
      { q: 'What is the expected value of a fair six-sided die?', options: ['3', '3.5', '3.6', '4'], answer: 1, why: 'The six faces average to (1 + 2 + 3 + 4 + 5 + 6) / 6 = 3.5 when each has probability 1/6.' },
      { q: 'If you double every outcome, what happens to the variance?', options: ['It doubles', 'It quadruples', 'It stays the same', 'It halves'], answer: 1, why: 'Variance scales with the square of the scale factor, so doubling the outcomes quadruples it.' },
    ],
  },
  'maths/normal-distribution': {
    takeaways: [
      'The normal curve is symmetric and bell-shaped, fully described by its mean and standard deviation.',
      'A probability is an area under the curve, not a height.',
      'About 68, 95 and 99.7 per cent of values lie within one, two and three standard deviations of the mean.',
      'Sums and averages of many small random pieces tend towards normal, which is why intervals use it.',
    ],
    prereq: ['maths/expectation-and-variance'],
    quiz: [
      { q: 'About what share of values from a normal distribution lie within two standard deviations of the mean?', options: ['68%', '95%', '99.7%', '50%'], answer: 1, why: 'Within two standard deviations covers about 95 per cent of the area under the curve.' },
      { q: 'Why do averages of measurements often look normal?', options: ['Averages are always uniform', 'Sums of many small random pieces are approximately normal (the central limit theorem)', 'The normal curve has no spread', 'It is the only distribution that exists'], answer: 1, why: 'The central limit theorem says that totals of many independent pieces approach a normal shape, whatever the pieces look like.' },
    ],
  },
  'maths/integration-area-under-curve': {
    takeaways: [
      'An integral is the area under a curve, found by adding thin strips.',
      'The approximation improves as the number of strips grows; the midpoint rule is usually accurate.',
      'Integrals give continuous probabilities and expected values.',
      'Integration is the reverse of differentiation, linked by the fundamental theorem of calculus.',
    ],
    prereq: ['maths/normal-distribution'],
    quiz: [
      { q: 'Geometrically, what does an integral give you?', options: ['The slope at a point', 'The area under a curve', 'The maximum of a function', 'The number of data points'], answer: 1, why: 'An integral adds up thin strips of height times width, which is the area under the curve.' },
      { q: 'In the midpoint sum, what happens to the error as the number of strips grows?', options: ['It grows', 'It stays the same', 'It shrinks', 'It becomes negative'], answer: 2, why: 'More strips make each rectangle a closer match to the curve, so the error falls.' },
    ],
  },
  'maths/entropy-and-kl-divergence': {
    takeaways: [
      'Entropy is the average surprise of a distribution, in bits or nats.',
      'KL divergence is the extra cost of modelling a distribution with a different one.',
      'Cross-entropy equals entropy plus KL divergence, so minimising it moves the model towards the truth.',
      'KL divergence is not symmetric: the order of the two distributions matters.',
    ],
    prereq: ['maths/cross-entropy-and-logs'],
    quiz: [
      { q: 'Which distribution over two outcomes has the highest entropy?', options: ['A certain outcome', 'A fair coin', 'A coin that almost always lands heads', 'A die with one sure face'], answer: 1, why: 'A fair coin is the most uncertain two-outcome case, at 1 bit.' },
      { q: 'When is the KL divergence between p and q zero?', options: ['When p is larger than q', 'When p equals q', 'When both are uniform', 'When q is zero'], answer: 1, why: 'KL divergence is zero only when the two distributions match exactly.' },
    ],
  },
  'maths/maximum-likelihood': {
    takeaways: [
      'Likelihood asks how probable the observed data is under each setting of the model.',
      'The maximum likelihood estimate is the setting that makes the data least surprising.',
      'For coin flips the estimate is the share of heads.',
      'Training with cross-entropy is maximum likelihood on the labels.',
    ],
    prereq: ['maths/expectation-and-variance'],
    quiz: [
      { q: 'With 7 heads in 10 flips, what is the maximum likelihood estimate of the heads chance?', options: ['0.5', '0.7', '0.3', '0.1'], answer: 1, why: 'The estimate is the share of heads, 7 out of 10, which is 0.7.' },
      { q: 'Why take the logarithm of the likelihood?', options: ['It makes the numbers negative', 'Products of probabilities become sums, and the peak stays in the same place', 'It removes the need for data', 'It makes the curve flat'], answer: 1, why: 'The logarithm turns products into sums that are easier to handle and keeps the maximum in place.' },
    ],
  },
  'maths/partial-derivatives-and-gradients': {
    takeaways: [
      'A partial derivative is the slope along one dial, with the others held still.',
      'The gradient collects all the partial derivatives into one vector.',
      'The gradient points uphill and is perpendicular to the contours of the function.',
      'Training moves against the gradient, updating all dials together.',
    ],
    prereq: ['maths/derivatives-and-slopes'],
    quiz: [
      { q: 'For f(x, y) = x² + 3y², what is ∂f/∂y at y = 1?', options: ['2', '3', '6', '1'], answer: 2, why: 'The partial derivative with respect to y is 6y, which is 6 at y = 1.' },
      { q: 'Which direction does the gradient point?', options: ['Downhill', 'Uphill', 'Along the contour', 'Towards zero'], answer: 1, why: 'The gradient points in the direction of steepest increase, so gradient descent moves the opposite way.' },
    ],
  },
  'maths/eigenvectors-and-pca': {
    takeaways: [
      'An eigenvector is a direction a matrix only stretches, and the stretch factor is its eigenvalue.',
      'Principal components are the eigenvectors of the data\'s covariance matrix.',
      'The first principal component is the direction of greatest spread.',
      'PCA keeps the top components to compress data while keeping most of its variation.',
    ],
    prereq: ['maths/matrices-as-layers'],
    quiz: [
      { q: 'An eigenvector is a direction that a matrix only what?', options: ['Rotates', 'Stretches or scales', 'Deletes', 'Transposes'], answer: 1, why: 'Multiplying an eigenvector by its matrix only scales it by the eigenvalue, without turning it.' },
      { q: 'The first principal component points along the direction of what?', options: ['Smallest spread', 'Greatest spread', 'Zero spread', 'A random direction'], answer: 1, why: 'The first principal component is the eigenvector of the largest eigenvalue, which is where the data spreads most.' },
    ],
  },
  'maths/sampling-and-temperature': {
    takeaways: [
      'A model outputs probabilities over its vocabulary, and a sampler picks one word from them.',
      'Temperature divides the scores before the softmax: low temperature sharpens, high temperature flattens.',
      'Low temperature gives repeatable answers; high temperature gives varied answers and more errors.',
      'Entropy measures how spread out the choice is, and it rises with temperature.',
    ],
    prereq: ['maths/softmax-and-probabilities'],
    quiz: [
      { q: 'What does a low temperature do to the probabilities?', options: ['Flattens them', 'Sharpens them towards the top score', 'Makes all words equally likely', 'Removes the softmax'], answer: 1, why: 'Dividing the scores by a small temperature widens the gaps, so the top score takes more of the probability.' },
      { q: 'As temperature rises, what happens to entropy?', options: ['It falls', 'It rises', 'It stays at zero', 'It becomes negative'], answer: 1, why: 'Higher temperature spreads the probability over more options, so the choice has more uncertainty.' },
    ],
  },
  'maths/confidence-intervals': {
    takeaways: [
      'A 95 per cent confidence interval for a mean is the average plus or minus about 1.96 standard errors.',
      'The standard error is the spread divided by the square root of the sample size, so the width shrinks slowly with more data.',
      'A confidence interval describes the long-run coverage of the method, not the chance the fixed truth is inside.',
      'A difference between models smaller than the interval is not a reliable difference.',
    ],
    prereq: ['maths/normal-distribution'],
    quiz: [
      { q: 'If you quadruple the sample size, what happens to the width of a 95 per cent interval?', options: ['It quarters', 'It halves', 'It doubles', 'It stays the same'], answer: 1, why: 'The width scales with one over the square root of n, so four times the data halves the width.' },
      { q: 'What does a 95 per cent confidence interval mean?', options: ['There is a 95% chance the true value is inside this interval', 'If the study were repeated many times, about 95% of such intervals would contain the true value', '95% of the data lies inside the interval', 'The model is 95% accurate'], answer: 1, why: 'The 95 per cent refers to the method across many repetitions, not to one fixed interval.' },
    ],
  },
  'maths/momentum-and-adam': {
    takeaways: [
      'Plain gradient descent zigzags in narrow valleys because each step ignores the last.',
      'Momentum keeps a running velocity: consistent steps speed up and zigzags cancel.',
      'Adam gives each dial its own step size based on its recent slopes.',
      'The base learning rate still needs tuning, even with Adam.',
    ],
    prereq: ['maths/gradient-descent-by-hand'],
    quiz: [
      { q: 'What does momentum add to gradient descent?', options: ['A running velocity built from past slopes', 'A bigger learning rate always', 'Removal of the slope', 'Random noise'], answer: 0, why: 'Momentum keeps a decaying sum of past slopes, so consistent directions build speed.' },
      { q: 'What does Adam give each dial?', options: ['The same step for all', 'Its own step size from its recent slopes', 'No step at all', 'A random step'], answer: 1, why: 'Adam scales each dial\'s step by the size of its own recent slopes.' },
    ],
  },
  'maths/regularisation-and-penalties': {
    takeaways: [
      'Regularisation adds a penalty for large weights to the loss.',
      'The L2 (ridge) penalty pulls every weight towards zero by a factor set by the strength λ.',
      'Regularisation fights overfitting; too much of it causes underfitting.',
      'Choose the strength on validation data, never on the training loss.',
    ],
    prereq: ['maths/gradient-descent-by-hand'],
    quiz: [
      { q: 'With the ridge penalty λw², what happens to the best w as λ grows?', options: ['It moves towards 0', 'It moves away from 0', 'It stays at 3 always', 'It becomes infinite'], answer: 0, why: 'The best w is 3 divided by (1 + λ), which slides towards zero as λ grows.' },
      { q: 'What does too much penalty cause?', options: ['Overfitting', 'Underfitting', 'Faster training only', 'No change'], answer: 1, why: 'A penalty that is too strong makes the model too rigid to capture real signal in the data.' },
    ],
  },
  'maths/the-sigmoid-and-logistic-regression': {
    takeaways: [
      'The sigmoid squashes any number into a probability between 0 and 1.',
      'Logistic regression uses a linear score and passes it through the sigmoid.',
      'The model is most uncertain where the probability is near 0.5.',
      'It is trained with cross-entropy, which gives a simple error-times-input gradient.',
    ],
    prereq: ['maths/cross-entropy-and-logs'],
    quiz: [
      { q: 'What is the sigmoid of 0?', options: ['0', '0.5', '1', '−1'], answer: 1, why: 'The sigmoid is 1 divided by (1 + e⁰) = 1 / 2 = 0.5 at zero.' },
      { q: 'Where is a logistic model most uncertain?', options: ['Near probability 0', 'Near probability 1', 'Near probability 0.5', 'Exactly at 0.9'], answer: 2, why: 'A probability of 0.5 means the two outcomes are equally likely, which is maximum uncertainty for a yes-or-no question.' },
    ],
  },
};
