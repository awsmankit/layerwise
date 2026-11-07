import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'shortcut-learning',
  title: 'What if the computer finds a shortcut instead of the real clue?',
  blurb: 'In the lab photos, wolves are mostly in snow. The helper learns "snow means wolf", scores 90 percent, and then fails once the backgrounds are swapped.',
  area: 'basics',
  level: 'basic',
  minutes: 4,
  why: [
    'A computer that learns from examples will use whatever clue gets the most training answers right. Often that is the clue we wanted, like how the animal looks. But sometimes an easier clue is hiding in the photos, like what is behind the animal. If the photos of one animal were mostly taken on one kind of background, the background becomes a shortcut.',
    'In the demo, the lab photos show wolves in snow and huskies on grass, most of the time. The helper looks at two clues, the animal and the background, and keeps the one that gets the most training photos right. At 90 percent the background gets 36 of 40 right and the animal only 30, so it picks the background. In the lab test it scores 90 out of 100. Then we swap the backgrounds, and it scores 10. Nothing was wrong with the lab score; it measured the wrong thing.',
    'Slide the link down to 50 percent, where wolves and huskies are equally likely to be in snow, and the helper has to use the animal itself and scores the same either way. Real teams guard against shortcuts by testing on photos from new places, showing which parts of a picture the model used, and collecting data that breaks the link. A well known paper by Ribeiro and colleagues deliberately trained a bad classifier on 20 hand-picked images where all the wolf pictures had snow in the background, and it answered "wolf" if there was snow. A review by Geirhos and colleagues describes shortcuts as decision rules that perform well on standard benchmarks but fail to transfer to harder conditions.',
  ],
  takeaways: [
    'A computer takes the easiest clue that works on its lessons, not the clue you had in mind.',
    'A shortcut can score very well in the lab and fail the moment the world changes.',
    'Test on examples from new places, with the clue you worry about changed. Training scores cannot show this.',
    'Break the link in the data: photos of both animals on both backgrounds.',
  ],
  lessons: ['start/three-ways-machines-learn', 'responsible/why-did-it-say-that', 'responsible/when-examples-are-unfair'],
  sources: [
    { label: '"Why Should I Trust You?": Explaining the Predictions of Any Classifier (Ribeiro, Singh and Guestrin, 2016), section 6.4', url: 'https://arxiv.org/abs/1602.04938' },
    { label: 'Shortcut Learning in Deep Neural Networks (Geirhos et al., 2020)', url: 'https://arxiv.org/abs/2004.07780' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'In the training photos, 9 in 10 wolves are on snow and 9 in 10 huskies are on grass. The helper picks the clue that works best, then we test on photos where snow and grass are swapped. How does it do?',
    options: [
      'Still mostly right: it learned what wolves and huskies look like',
      'About half right: swapping the backgrounds just confuses it a bit',
      'Mostly wrong: it learned the background, and the background now points the wrong way',
    ],
    answer: 2,
    why: 'The background gets 36 of 40 training photos right and the animal only 30, so the helper uses the background. In a lab test with the same backgrounds it gets 90 of 100 right. With the backgrounds swapped it gets only 10 of 100.',
  },
};
