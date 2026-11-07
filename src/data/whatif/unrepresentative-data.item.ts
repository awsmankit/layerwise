import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'unrepresentative-data',
  title: 'What if the training data does not look like the people who use it?',
  blurb: 'A toy model learns one cut-off from a mix of two made-up groups. Slide how much of the training data comes from group B and watch each group\'s accuracy change.',
  area: 'responsible',
  level: 'intermediate',
  minutes: 4,
  why: [
    'A model learns whatever pattern is common in its training data. If one group makes up most of the examples, the pattern it learns is the pattern for that group. When the same signal means something a little different for another group (an accent, a camera, a lighting condition), the model applies the wrong rule to them. This is called a dataset shift between the training data and the people who use the model.',
    'The toy on this page has one number per person and a cut-off. In group A the right answer flips at 0. In group B it flips at 1. The model picks the cut-off that makes the fewest mistakes on its training mix. Trained only on group A it gets group A right 89 percent of the time and group B only 67 percent. Trained on a mix, the cut-off moves between the two and the groups trade places. Even when the training mix matches the example share of users (30 percent B), group B is still behind (74 percent against 88 percent). All settings are made up for the demo.',
    'The Gender Shades abstract (Buolamwini and Gebru, 2018) reports that the face datasets it audited were overwhelmingly composed of lighter-skinned subjects, alongside large error rate differences between groups. The Datasheets for Datasets proposal (Gebru and others) asks creators to document a dataset\'s composition and collection process so people can see who is in it before they use it. Real teams collect data on purpose from the groups they serve, test each group separately and write down who the data covers. This is engineering practice, not legal advice.',
  ],
  takeaways: [
    'A model learns the pattern of whoever is common in its training data.',
    'When the same signal means something different for another group, that group gets worse results.',
    'Matching the training mix to the user mix helps, but does not by itself close the gap. Test each group separately.',
    'Write down who the data covers, so users and reviewers can see its limits.',
  ],
  lessons: ['responsible/when-examples-are-unfair', 'responsible/fairness-for-builders', 'responsible/where-the-data-comes-from'],
  sources: [
    { label: 'Gender Shades: Intersectional Accuracy Disparities in Commercial Gender Classification (Buolamwini and Gebru, PMLR 81, 2018)', url: 'https://proceedings.mlr.press/v81/buolamwini18a.html' },
    { label: 'Datasheets for Datasets (Gebru et al., arXiv 1803.09010)', url: 'https://arxiv.org/abs/1803.09010' },
  ],
  updated: '2026-11-07',
  predict: {
    question: 'A toy model is trained only on group A. Then it is tested on group B, where the same signal means something a little different. What do you think happens?',
    options: [
      'Group B does about as well as group A, because the model learned the task and not the group.',
      'Group B does clearly worse, because the model learned the rule that fits group A.',
      'Group B does better, because the model was not distracted by group B examples.',
    ],
    answer: 1,
    why: 'Trained only on group A, the toy model is 89 percent right for A but only 67 percent for B, a gap of about 23 points. The cut-off it learned fits A, not B.',
  },
};
