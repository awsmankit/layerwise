import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'tiny-data',
  title: 'What if the computer only gets three examples?',
  blurb: 'Twenty computers each learn a dividing line from a different handful of dots. With three dots the lines point every which way. With three hundred they nearly agree.',
  area: 'basics',
  level: 'basic',
  minutes: 3,
  why: [
    'A computer learns a rule from the examples it is given. If it gets only a few, the rule depends heavily on which few it happened to get, the way a poll of three people tells you little about a whole town. Ask three different people and you get three different answers.',
    'In the demo there are two groups of dots, orange and blue, that overlap a little. The helper finds the middle of each group and draws a line halfway between the two middles. With three training dots the middles are rough guesses, so the line can point almost any way. We repeat this 20 times with 20 new sets of dots and draw all 20 lines. With three dots they fan out wildly, and some of them are bad rules. With 30 they cluster, and with 300 they nearly sit on top of each other.',
    'This is why people say "more data". It does not make the rule smarter. It makes the rule steadier, because a rule learned from many examples barely changes when one of them is swapped. When data is hard to get, real teams use simpler rules that need fewer examples, borrow a model that has already learned from lots of data, or at least warn that a score from a tiny set can swing a lot.',
  ],
  takeaways: [
    'With very few examples, the learned rule depends on which examples you happened to get.',
    'Run the learning again with new examples and a tiny set gives very different rules. A big set gives nearly the same one.',
    'More examples do not make the rule cleverer. They make it steadier.',
    'A great score on a tiny set may be luck. Ask how many examples it came from.',
  ],
  lessons: ['foundations/how-models-learn', 'ml/overfitting-and-bias-variance', 'start/how-computers-learn'],
  sources: [
    { label: 'scikit-learn: Nearest Centroid Classifier (the kind of rule used here)', url: 'https://scikit-learn.org/stable/modules/neighbors.html' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'Twenty helpers each learn a dividing line from three dots, and each gets a different three. What do the twenty lines look like?',
    options: [
      'Almost the same line each time, because the dots come from the same two groups',
      'Pointing in many different directions, because which three dots you get matters a lot',
      'All tilted the same wrong way, because three dots is too few to learn anything',
    ],
    answer: 1,
    why: 'Each line depends on the middle of just one or two dots per group, which changes every time. In the first set of 20 draws the lines point about 27.5 degrees away from the best line on average, and the worst one gets only 56 percent right. With 300 dots they are within about 2 degrees and every rule gets at least 92 percent right.',
  },
};
