import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the "ml-a" batch. */
export const extrasW1MlA: Record<string, Extra> = {
  'ml/linear-and-logistic-regression': {
    takeaways: [
      'The best line is the one with the smallest sum of squared residuals. Squaring stops misses above and below from cancelling and punishes big misses.',
      'The slope is the change in the prediction for one more unit of input, and the intercept is the prediction at zero. With several inputs each coefficient means "holding the others fixed", not a cause.',
      'Logistic regression is a weighted sum passed through a sigmoid, which gives a probability between 0 and 1. A threshold then turns it into a yes or no, and the best threshold depends on the cost of mistakes.',
      'One logistic regression is exactly one neuron. A neural network stacks many of them and trains them with the same gradient descent.',
    ],
    prereq: ['foundations/how-models-learn'],
    quiz: [
      { q: 'Why does least squares square each residual instead of just adding them up?', options: ['Squares are faster for a computer to add', 'Misses above and below the line would cancel, and a big miss should count more than a small one', 'It makes the slope always positive', 'It removes the need for an intercept'], answer: 1, why: 'Squares are never negative, so errors cannot cancel, and a miss of 10 counts four times as much as a miss of 5.' },
      { q: 'A line fitted to marks has slope 6.4 and intercept 21. At 5 hours of revision the prediction is about:', options: ['27', '32', '53', '135'], answer: 2, why: '21 + 6.4 x 5 = 53. The slope is marks gained per hour, the intercept is the value at zero hours.' },
      { q: 'A logistic model gives a score of 0 for a student. What probability of passing does the sigmoid give?', options: ['0', '0.5', '1', 'It depends on the data only'], answer: 1, why: 'The sigmoid of 0 is exactly 0.5, and larger positive scores move the probability towards 1.' },
      { q: 'Why is a straight line fitted to 0 and 1 answers a poor way to predict a probability?', options: ['It can predict numbers below 0 or above 1', 'Lines cannot be fitted to whole numbers', 'It needs far more data', 'It always predicts 0.5'], answer: 0, why: 'A line keeps rising, so it can give values like 1.3 or -0.2, which are not probabilities. The sigmoid squashes the score into 0 to 1.' },
      { q: 'How is logistic regression related to a neural network?', options: ['It is unrelated; networks use a different kind of maths', 'A network is one logistic regression with extra data', 'One logistic regression is one neuron: weighted sum, bias, then a squashing function', 'Logistic regression is the last step that checks a network'], answer: 2, why: 'A neuron multiplies inputs by weights, adds a bias and applies a bend such as the sigmoid. Networks stack many and train them by gradient descent.' },
    ],
  },
  'ml/decision-trees-and-random-forests': {
    takeaways: [
      'A tree is a stack of yes/no questions learned from data. At each step it picks the split that most reduces impurity (Gini or entropy).',
      'A single deep tree memorises noise and changes a lot when a few rows change. Limit its depth, prune it, or stop relying on one tree.',
      'A random forest grows many trees on resampled rows, each split looking at a random subset of the inputs, and lets them vote. This lowers variance.',
      'Trees are a strong default on tables and a poor fit for images, sound and text. Impurity-based feature importance is a first look only.',
    ],
    prereq: ['foundations/classical-ml-essentials'],
    quiz: [
      { q: 'A group has 5 passes and 5 fails. What is its Gini impurity?', options: ['0', '0.25', '0.5', '1'], answer: 2, why: 'Gini = 1 - 0.5^2 - 0.5^2 = 0.5, the most mixed a two-class group can be. A pure group scores 0.' },
      { q: 'A split gives a side with 6 students (5 pass, 1 fail) and a side with 4 students (all fail). Compared with a split into two 50/50 sides, it is:', options: ['Worse, because one side is small', 'The same, because the totals match', 'Better, because the weighted impurity after the split is much lower', 'Impossible to compare without more data'], answer: 2, why: 'Weighted Gini is about 0.167 against 0.5 for two 50/50 sides, so the groups are far cleaner.' },
      { q: 'A tree grown until every leaf is pure scores 100% on its training rows and worse on new rows. This is:', options: ['Underfitting', 'Overfitting', 'Bagging', 'Pruning'], answer: 1, why: 'The deep tree has built little boxes around noise and mislabelled rows, which do not carry over to new data.' },
      { q: 'What does a random forest add to plain bagging of trees?', options: ['Trees are trained one after another on the previous errors', 'Each split looks at only a random subset of the inputs, so the trees differ more', 'Every tree sees all the rows exactly once', 'The trees are made shallower'], answer: 1, why: 'Random input subsets stop every tree choosing the same strong input first, so the trees are less alike and their vote is more useful.' },
      { q: 'Which is a fair warning about impurity-based feature importance?', options: ['It always matches importance on new data', 'It comes from the training data and favours inputs with many distinct values', 'It cannot be computed for forests', 'It only works for numbers'], answer: 1, why: 'The scikit-learn guide warns about both flaws and suggests permutation importance on held-out data.' },
    ],
  },
  'ml/gradient-boosting': {
    takeaways: [
      'Boosting adds small trees one at a time. Each new tree is fitted to the residuals, what the model so far still gets wrong, and added at a fraction of full strength.',
      'A lower learning rate needs more rounds. Early stopping on a validation set picks the number of rounds, and the validation set then no longer gives an honest final score.',
      'XGBoost, LightGBM and CatBoost are all gradient boosted trees. They differ in engineering: histogram splits, leaf-wise growth, categorical handling and defaults.',
      'On medium-sized tables boosted trees are the baseline to beat, but the benchmarks cover particular datasets and settings, and the size of the gap varies.',
    ],
    prereq: ['ml/decision-trees-and-random-forests', 'foundations/classical-ml-essentials'],
    quiz: [
      { q: 'In boosting, what is each new tree trained to predict?', options: ['The original answers y', 'The residuals: what the model so far still gets wrong', 'A random sample of the rows', 'The average of the previous trees'], answer: 1, why: 'Each tree targets what is left over, so the sum of trees gets closer to the answers round by round.' },
      { q: 'Five rows have y = 3, 5, 4, 9, 11 and the starting prediction is their average, 6.4. What is the first residual, for y = 3?', options: ['-3.4', '3.4', '-2.4', '6.4'], answer: 0, why: 'Residual = actual minus predicted = 3 - 6.4 = -3.4.' },
      { q: 'You lower the learning rate from 0.3 to 0.05 and keep everything else. What should you expect?', options: ['The model needs fewer trees', 'The model needs more trees to reach its best validation error', 'Training error goes straight to zero', 'Nothing changes'], answer: 1, why: 'Smaller steps are more cautious, so more rounds are needed, which is why the two settings are tuned together.' },
      { q: 'What does early stopping do?', options: ['Stops training when the validation score has not improved for a set number of rounds, and keeps the best round', 'Stops training when the training error reaches zero', 'Removes the weakest tree after training', 'Stops reading data after the first thousand rows'], answer: 0, why: 'Training error keeps falling, so the validation set decides when more trees start to hurt.' },
      { q: 'Which statement about tabular data is the most defensible?', options: ['Deep learning has been proved worse than boosting on every table', 'Boosted trees are a strong baseline on medium-sized tables, but results depend on the datasets, tuning and benchmark', 'Boosting beats neural networks on images too', 'A benchmark of one dataset settles the question'], answer: 1, why: 'Several benchmarks favour boosted trees on typical tables, while others find small or no differences, so hedge and measure on your own data.' },
    ],
  },
};
