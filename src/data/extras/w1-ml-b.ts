import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the "ml-b" batch. */
export const extrasW1MlB: Record<string, Extra> = {
  'ml/getting-data-ready': {
    takeaways: [
      'Split off the test rows first. Every fill value, scale and category list is learned from the training rows only.',
      'Look at the table before modelling: wrong units, placeholders like 999, typos and impossible values hurt more than a weak model.',
      'Blanks can be dropped, filled with a typical value, or filled and flagged. Filling with 0 is only right when 0 is true.',
      'One-hot encode categories with no order. Scale for distance-based models; trees and plain straight-line fits do not need it. A suspiciously good score is a reason to hunt for a leak.',
    ],
    prereq: ['foundations/classical-ml-essentials'],
    quiz: [
      { q: 'When should you set the test rows aside?', options: ['After cleaning and scaling the whole table', 'Before you learn any average, scale or category list from the data', 'Only when the table is very large', 'Never, because the validation set is enough'], answer: 1, why: 'If a step is learned from every row, the test rows have already influenced the model, and the score is too good.' },
      { q: 'Why is filling every blank house age with 0 a poor choice?', options: ['Zero cannot be stored in a table', 'It makes the file larger', 'Zero is a real value: it says the house is brand new', 'Models cannot read blank cells at all'], answer: 2, why: 'The model reads 0 as a true age, so a typical value, or a flag that the value was blank, is more honest.' },
      { q: 'Four neighbourhoods are coded 1, 2, 3 and 4 in one column. What does a distance-based model assume?', options: ['That the neighbourhoods are in a meaningful order, with 4 further from 1 than 2 is', 'Nothing at all', 'That all four are equal', 'That the codes are prices'], answer: 0, why: 'Numbers have order and distance. One-hot columns give each neighbourhood its own 0 or 1 and no false order.' },
      { q: 'Which model gives the same predictions with or without scaling the columns?', options: ['Nearest neighbours', 'A decision tree', 'A neural network trained by gradient descent', 'A model with a strong penalty on its weights'], answer: 1, why: 'A tree only asks whether a value is above or below a split point, so rescaling a column changes nothing.' },
    ],
  },
  'ml/overfitting-and-bias-variance': {
    takeaways: [
      'Too simple a model has high bias: both training and test error are high. Too flexible a model has high variance: training error is low and test error is much higher.',
      'Judge a model by its error on data it did not learn from. A wide gap between training and test error is the warning sign of overfitting.',
      'More data lowers variance but not bias. A simpler model or a regulariser trades a little bias for a lot less variance.',
      'Cross-validation picks settings without using up the test set, and learning curves show whether you need more data or a different model.',
    ],
    prereq: ['foundations/how-models-learn', 'foundations/classical-ml-essentials'],
    quiz: [
      { q: 'A curve has training error 0.04 and test error 3.94 on the same task. What is the likely problem?', options: ['Underfitting', 'The data has no noise', 'Overfitting', 'The test set is too easy'], answer: 2, why: 'Low training error with a far higher test error means the model has memorised noise rather than the pattern.' },
      { q: 'A straight line fitted to a wave scores about the same on test with 12 points or 192. Why?', options: ['The line has high bias, so more data does not help', 'The line has high variance', 'Test sets never change', 'The line has memorised the points'], answer: 0, why: 'A line cannot bend, so it is wrong in the same way however much data it sees. More data cures variance, not bias.' },
      { q: 'You turn the regulariser up to its strongest setting and both errors rise. What happened?', options: ['The model started to overfit', 'The model was held too flat and began to underfit', 'The noise increased', 'Cross-validation failed'], answer: 1, why: 'A penalty that is too strong stops the model bending to follow the real pattern, which adds bias.' },
      { q: 'On a learning curve, training and test error are both high and close together, and flat as data grows. What should you try?', options: ['Collect ten times more of the same data', 'A more flexible model or better features', 'Stop training earlier', 'Remove the test set'], answer: 1, why: 'Flat, high and close together is the signature of high bias, so the model needs more capacity or better inputs.' },
    ],
  },
  'ml/is-the-difference-real': {
    takeaways: [
      'A score measured on a test set is one draw. 80 of 100 cases is plausibly anywhere from about 72% to 88%, and 8 of 10 from about 50% to 100%.',
      'Compare two models on the same cases and look at the paired differences. Report the gap with an interval, not just two scores.',
      'A p-value says how surprising the gap would be if there were no real difference. It is not the chance that B is better and it says nothing about size.',
      'Decide the smallest gap that matters, and size the test for it. Do not peek, and treat the best of many tries as a hypothesis to confirm on fresh cases.',
    ],
    prereq: ['foundations/classical-ml-essentials'],
    quiz: [
      { q: 'A model passes 80 of 100 test cases. Roughly what range is plausible for its true pass rate?', options: ['Exactly 80%', '79% to 81%', 'About 72% to 88%', '50% to 100%'], answer: 2, why: 'The standard error is the square root of 0.8 x 0.2 / 100, which is 4 points, and about two of them either side gives roughly 72% to 88%.' },
      { q: 'What does a p-value of 0.03 tell you about two prompts?', options: ['There is a 97% chance that B is better', 'The difference is large', 'If they were really equal, a gap this big would appear by chance about 3% of the time', 'The test is certainly correct'], answer: 2, why: 'A p-value assumes no real difference and asks how surprising the data are. It is not the probability that B is better, and it does not measure size.' },
      { q: 'You compare 20 prompt variants with a 5% false-alarm rate each. What is the chance that at least one looks like a winner when none is better?', options: ['5%', 'About 25%', 'About 64%', '100%'], answer: 2, why: 'The chance of no false alarm is 0.95 to the power 20, about 36%, so at least one is about 64%.' },
      { q: '1,000 people, 1% have a condition. The test flags 90% of those who have it and 10% of those who do not. Of the people flagged, about how many really have it?', options: ['About 90%', 'About 50%', 'About 8%', 'About 1%'], answer: 2, why: 'Of 1,000 people, 9 sick people are flagged along with 99 healthy ones. 9 out of 108 is about 8%.' },
    ],
  },
};
