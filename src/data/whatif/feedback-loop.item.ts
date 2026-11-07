import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'feedback-loop',
  title: 'What if a model\'s decisions feed its own training data?',
  blurb: 'A toy loop sends attention to where it has found most so far, so it only records things there. Slide the amount of independent sampling and watch its belief drift from reality over 30 rounds.',
  area: 'responsible',
  level: 'intermediate',
  minutes: 5,
  why: [
    'Some systems decide where to look, and then learn from what they find. If a model only gets data from the places it chose to look, its data says as much about its own choices as about the world. A place it keeps checking fills up with records. A place it never checks stays empty. The next round of learning reads that as proof, and the loop tightens. This is a feedback loop.',
    'This page is a toy illustration, not a model of any real system. There are three areas. In this made-up world each check in Area 2 finds something 25 percent of the time, Area 1 20 percent and Area 3 15 percent, so Area 2 really has the most. The model starts with a tiny head start for Area 1 (12 records against 10). Each round it sends 60 checks to the area with the most records. Over 30 rounds, with no independent sampling, 95 percent of its records sit in Area 1 and its belief is 62 points away from reality. Area 2 never gets a check.',
    'Ensign and colleagues studied this effect for predictive policing in "Runaway Feedback Loops in Predictive Policing". Their abstract says such systems have been shown to be susceptible to runaway feedback loops, that reported incidents can attenuate the feedback but not entirely remove it, and that they propose changes to the inputs so the true rate can be learned. We use no data from that paper here, only the idea. Real teams keep some independent sampling (random checks that do not depend on the model), compare counts with how many checks were made, and ask whether a record exists because something happened or because someone looked.',
  ],
  takeaways: [
    'If a model decides where data is collected, the data reflects its choices as well as reality.',
    'A tiny early head start can grow into a confident, wrong belief.',
    'Independent sampling breaks the loop. The more of it, the smaller the drift in this toy.',
    'Ask of every record: did something happen here, or did we only look here?',
  ],
  lessons: ['responsible/when-examples-are-unfair', 'responsible/fairness-for-builders', 'systems/monitoring-and-drift'],
  sources: [
    { label: 'Runaway Feedback Loops in Predictive Policing (Ensign et al., arXiv 1706.09847)', url: 'https://arxiv.org/abs/1706.09847' },
  ],
  updated: '2026-11-07',
  predict: {
    question: 'A toy model sends most of its checks to the area where it has recorded the most so far, and only records what it checks. Area 1 starts with a tiny head start, but Area 2 really has the most. What happens over 30 rounds?',
    options: [
      'It slowly finds out that Area 2 has the most, because more data makes it more accurate.',
      'It locks onto Area 1 and becomes more and more sure, because it keeps recording only there.',
      'It stays undecided between the areas, because the head start is tiny.',
    ],
    answer: 1,
    why: 'With no independent sampling, Area 1 holds 95 percent of the records after 30 rounds (it passed 90 percent in round 14), while Area 2 never gets a single check.',
  },
};
