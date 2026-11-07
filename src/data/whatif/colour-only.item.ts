import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'colour-only',
  title: 'What if the computer only looks at colour?',
  blurb: 'Sort apples, tomatoes, bananas and lemons using colour alone, watch same-coloured fruit get mixed up, then add a second clue and see the mix-ups vanish.',
  area: 'basics',
  level: 'basic',
  minutes: 3,
  why: [
    'A clue is something a computer can measure about each example: colour, shape, size. The more useful clues it uses, the better it can tell things apart. If it looks at only one clue, anything that shares that clue looks the same to it.',
    'In the demo there are four made-up fruits. Colour splits them into two groups, red ones and yellow ones, and it does that perfectly. But an apple and a tomato are both red, and a banana and a lemon are both yellow, so inside each group the helper is guessing. It scores about 54 out of 100, close to a coin flip within each pair.',
    'Now add a second clue. Size separates apples (bigger) from tomatoes (smaller). Shape separates bananas (long) from lemons (shorter). Each extra clue fixes the pair it is good at, and does nothing for the other pair, so a clue only helps where it actually differs. With colour, shape and size together the helper scores about 99 out of 100. Real systems face the same choice: they pick clues that tell apart the things that are easy to mix up.',
  ],
  takeaways: [
    'Things that share a clue look identical to a computer that only uses that clue.',
    'A new clue helps only where it makes a difference. Size fixes the red pair, shape fixes the yellow pair.',
    'More useful clues usually means fewer mix-ups. Clues that do not differ add nothing.',
    'When a computer confuses two things, ask which clue would tell them apart.',
  ],
  lessons: ['foundations/how-models-learn', 'start/three-ways-machines-learn', 'start/what-is-ai-in-plain-english'],
  sources: [
    { label: 'scikit-learn: Nearest Neighbors (the method the toy helper uses)', url: 'https://scikit-learn.org/stable/modules/neighbors.html' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'A helper sorts apples, tomatoes, bananas and lemons using colour only. Out of 100 fruits, how many do you think it gets right?',
    options: [
      'Nearly all, about 95 of 100: colour is a strong clue',
      'About half, around 54 of 100: it sorts red from yellow but mixes up the pairs',
      'About a quarter, 25 of 100: with four fruits it is just guessing',
    ],
    answer: 1,
    why: 'Colour never mixes a red fruit with a yellow one, but it cannot tell an apple from a tomato or a banana from a lemon, so each pair is close to a coin flip. On 400 test fruits it gets about 54 percent right. With colour, shape and size it gets about 99 percent.',
  },
};
