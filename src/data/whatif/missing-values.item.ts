import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'missing-values',
  title: 'What if missing values are handled carelessly?',
  blurb: 'Compare dropping rows, filling with the average and filling plus a missing flag on a made-up screening test, and see the model miss most of the people who need follow-up.',
  area: 'ml',
  level: 'intermediate',
  minutes: 5,
  why: [
    'Real data has holes: a test that was not done, a form field left empty, a sensor that dropped out. A model cannot use a blank, so we must do something with it. The two easiest answers are to delete every row with a hole, or to fill each hole with the column average. Both are quietly harmful when the holes are not random.',
    'In the demo, a made-up test result is missing for 60 percent of the people who need follow-up but only 10 percent of everyone else. Dropping rows then removes 59 percent of exactly the people we most want to learn from, and the model catches only 28 percent of those who need follow-up. Filling with the mean keeps every row but makes a missing result look ordinary, so it catches 36 percent and the learned effect of the result shrinks from 2.3 to 1.3. Filling and adding a 0/1 column that says "this value was missing" lets the model learn that a gap is itself a clue: it catches 87 percent and is 86 percent accurate.',
    'The scikit-learn guide says that discarding rows loses data that may be valuable, that imputing (inferring the missing values from the known part) is usually better, and that keeping the information about which values were missing can be informative. In scikit-learn this is the add_indicator option or the MissingIndicator transformer. Imputation must be learned on the training data only, then applied to new data. If gaps really are random, as in the slider\'s lowest setting, all three ways tie, so the risk comes from not asking why the data is missing.',
  ],
  takeaways: [
    'Ask why a value is missing before deciding what to do about it: the reason is often information.',
    'Dropping rows can silently remove the very cases you care about when the gaps depend on the outcome.',
    'Filling with the mean keeps the rows but weakens the signal in that column.',
    'A missing-indicator column next to the imputed value lets the model use the gap itself.',
  ],
  lessons: ['ml/getting-data-ready', 'foundations/classical-ml-essentials', 'ml/linear-and-logistic-regression'],
  sources: [
    { label: 'scikit-learn: Imputation of missing values (discarding rows, SimpleImputer, MissingIndicator, add_indicator)', url: 'https://scikit-learn.org/stable/modules/impute.html' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'A screening test result is missing far more often for people who need follow-up than for everyone else. We train a model by deleting every row with a missing result. What do you think happens to how many of the people who need follow-up it catches?',
    options: [
      'Hardly changes, because the rows that remain are still a fair sample of everyone.',
      'It improves, because the remaining rows are cleaner and complete.',
      'It drops a lot, because most of the people who need follow-up were deleted and the model rarely sees them.',
    ],
    answer: 2,
    why: 'With 60 percent of the follow-up cases missing a result, dropping rows removes 59 percent of them, and the model catches only 28 percent of the people who need follow-up. With a missing flag it catches 87 percent.',
  },
};
