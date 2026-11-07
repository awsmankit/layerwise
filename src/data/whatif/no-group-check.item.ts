import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-group-check',
  title: 'What if we never check results group by group?',
  blurb: 'In a made-up test of 1,000 people, one overall accuracy looks fine while a smaller group gets a much worse deal. Slide the group size and see the average hide the gap.',
  area: 'responsible',
  level: 'intermediate',
  minutes: 4,
  why: [
    'An overall accuracy is an average over everyone in the test set. An average is dominated by the biggest group, so a model can do well for most people and badly for a smaller group, and the single number barely moves. Checking results group by group (sometimes called disaggregated evaluation) means computing the same measures separately for each group that matters.',
    'In the toy on this page the model is right 96 percent of the time for group A and 72 percent for group B, and it misses 40 percent of the true cases in B against 4 percent in A. When group B is 10 percent of the people, the overall accuracy is 93.6 percent. A release rule of "ship at 90 percent or better overall" passes, while a rule applied to each group fails. The numbers are made up for the demo. They are not measurements of any real system or any real people.',
    'A small group also means a wide interval: with few people in B the same 72 percent could easily be 62 or 80, so a small group needs more test data, not less attention. Gender Shades (Buolamwini and Gebru, 2018) is a well known example of this kind of audit. Its abstract reports that the datasets it examined are overwhelmingly composed of lighter-skinned subjects and that error rates differed a great deal between groups, up to 34.7 percent for darker-skinned females against at most 0.8 percent for lighter-skinned males. Real teams choose the groups with care, report each group next to the average, and set a floor for every group. This is engineering practice, not legal advice.',
  ],
  takeaways: [
    'An overall number is an average, and the biggest group decides it.',
    'Report the same measures for each group next to the overall number, with an interval that shows how sure you can be.',
    'The smaller the group, the wider the interval. More test data for small groups beats ignoring them.',
    'A release rule needs a floor for every group, not only for the average.',
  ],
  lessons: ['responsible/fairness-for-builders', 'responsible/when-examples-are-unfair', 'ml/is-the-difference-real'],
  sources: [
    { label: 'Gender Shades: Intersectional Accuracy Disparities in Commercial Gender Classification (Buolamwini and Gebru, PMLR 81, 2018)', url: 'https://proceedings.mlr.press/v81/buolamwini18a.html' },
  ],
  updated: '2026-11-07',
  predict: {
    question: 'A made-up model is tested on 1,000 people. Group B is 10 percent of them and the model is much worse for B. What do you think the overall accuracy shows?',
    options: [
      'Clearly low, because a weak group drags the whole number down a lot.',
      'Still high, because the large group A decides the average.',
      'About halfway between the two groups, because both count equally.',
    ],
    answer: 1,
    why: 'Overall accuracy counts every person once, so group A (900 people) decides it: 93.6 percent overall, while group B is at 72 percent. That is a 21.6 point gap hidden by the average.',
  },
};
