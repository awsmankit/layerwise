import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'learn-from-one-kind',
  title: 'What if the computer only ever sees one kind of example?',
  blurb: 'A picture-sorting helper is taught only on cats, then asked about cats and dogs. Add dogs to its lessons one at a time and watch its score climb.',
  area: 'basics',
  level: 'basic',
  minutes: 3,
  why: [
    'A computer that learns from examples can only answer with labels it has met. Think of a child who has only ever been shown cats. Show that child a dog and the best guess they have is "cat", because it is the only word they know.',
    'In the demo the helper works like this: for each new picture it finds the one training picture that looks most alike (by how pointy the ears are and how long the snout is) and copies the label of that picture. If every training picture is a cat, every answer is "cat". It gets all the cats right and all the dogs wrong, so it scores exactly the share of cats in the test: half. It never says "I do not know", and it sounds just as sure as when it is right.',
    'Add dogs and the score climbs, though not in a perfectly smooth line, because a few lucky or unlucky pictures can nudge it either way. The fix in real life is the same: show the computer every kind of thing it will meet, in roughly the right amounts. When the examples leave a group out, the people in that group get the worse answers. That is why careful teams check who and what is missing from their examples before they train.',
  ],
  takeaways: [
    'A computer can only answer with kinds it has seen. Missing kinds get squeezed into the nearest kind it knows.',
    'It does not warn you. A helper taught on one kind is as confident when it is wrong as when it is right.',
    'Adding even a few examples of the missing kind helps a lot. Adding more keeps helping, with some wobble on the way.',
    'Always ask "who or what is missing from the examples?" before trusting a score.',
  ],
  lessons: ['start/three-ways-machines-learn', 'responsible/when-examples-are-unfair', 'start/what-is-ai-in-plain-english'],
  sources: [
    { label: 'scikit-learn: Nearest Neighbors (the method the toy helper uses)', url: 'https://scikit-learn.org/stable/modules/neighbors.html' },
    { label: 'Gender Shades (Buolamwini and Gebru, 2018)', url: 'https://proceedings.mlr.press/v81/buolamwini18a.html' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'A helper is taught with 10 cat pictures and nothing else. Then it sorts 6 cats and 6 dogs. How many of the 12 do you think it gets right?',
    options: [
      'About 9 of 12: cats and dogs look different enough to guess',
      'Exactly 6 of 12: every cat right and every dog wrong',
      'None: it has never seen a dog, so it gets everything wrong',
    ],
    answer: 1,
    why: 'It can only answer with a label it was taught, and the only label it knows is "cat". So all 6 cats are right and all 6 dogs are wrong: 6 of 12, which is 50 percent. With 10 dogs added to its lessons it gets 10 of 12.',
  },
};
