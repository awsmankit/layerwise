import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-calibration',
  title: 'What if the model\'s confidence is not calibrated?',
  blurb: 'Plot what a toy model says against how often it is right, watch a 90 percent threshold let through far more mistakes than promised, then fix it with one number.',
  area: 'edge',
  level: 'intermediate',
  minutes: 5,
  why: [
    'A classifier does not only give an answer, it gives a confidence: a number that sounds like a probability. Devices and apps use it to decide things, for example "act automatically above 90 percent, ask the user below". That only works if the number means what it says. A model is calibrated when, among all the cases where it says 80 percent, about 80 percent turn out right.',
    'Modern neural networks often are not. They are trained to rank the right answer first, not to be honest about how sure they are, and they tend to be overconfident. The plot on this page shows a toy model on made-up data: in the 80 to 90 percent range it says about 85 percent and is right about two times in three. The expected calibration error (ECE), the average gap between what is said and what is true, is about 13 percent. A rule "act at 90 percent or more" then acts on about 63 percent of cases and is wrong on about 16 percent of them, when the designer expected at most 10.',
    'Temperature scaling is the simplest fix. It divides every score by a single number T, fitted on held-out validation data, before the sigmoid or softmax. A T above 1 makes the model less sure. It cannot change which answer wins, so accuracy stays the same, but the confidence becomes honest: here the ECE falls to under 1 percent, and the same rule acts on about one case in five and is wrong on about 6 percent. Calibration can drift when the data changes, so it is checked again after launch.',
  ],
  takeaways: [
    'Confidence is only useful if it is calibrated: "90 percent" should mean right 9 times in 10.',
    'A threshold set on uncalibrated confidence lets through far more mistakes than you planned for.',
    'Temperature scaling fits one number on validation data. It changes how sure the model sounds, never what it answers.',
    'Honest confidence means acting on fewer cases automatically, and asking for help on the rest.',
  ],
  lessons: ['evals/evals-101', 'systems/human-in-the-loop-design', 'systems/monitoring-and-drift'],
  sources: [
    { label: 'On Calibration of Modern Neural Networks (Guo et al., 2017)', url: 'https://arxiv.org/abs/1706.04599' },
  ],
  updated: '2026-11-06',
};
