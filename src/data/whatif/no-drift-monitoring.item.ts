import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-drift-monitoring',
  title: 'What if nobody watches the model after launch?',
  blurb: 'A simulated classifier slowly loses accuracy as its inputs shift, with and without a monitor that alerts when the input data moves.',
  area: 'edge',
  level: 'intermediate',
  minutes: 4,
  why: [
    'A model learns from data that looks a certain way on launch day. The world then moves on: new devices, new noise, new users, a different season. This is called drift. The model does not change, but the inputs do, so its answers get worse a little each day. Nothing crashes and no error appears, which is why it is easy to miss.',
    'Without monitoring, the first sign is usually a person noticing. In the simulation on this page, the accuracy falls for weeks before it reaches the level where users start to complain. A monitor that needs no labels can see the problem earlier. It compares the recent inputs with the launch-day inputs, here the 7-day average against the launch average, and alerts when they have moved by more than a set amount.',
    'The page is a simulation with invented numbers: one input feature, two classes, 200 examples a day, and a rule fixed at launch. Real systems do the same idea with many features and tests such as the population stability index or the Kolmogorov-Smirnov test, and they also track model age and check quality on a sample of labelled live data. When the alert fires, a team can inspect, retrain or roll back before users are hurt.',
  ],
  takeaways: [
    'A model that is not changing can still get worse, because its inputs change.',
    'Accuracy needs labels, and live data rarely has them in time. Input monitoring does not need labels.',
    'An alert is only useful if it comes before the complaints. Here it comes weeks earlier.',
    'Pick an alert level that catches real movement and ignores daily noise, then decide who acts on it.',
  ],
  lessons: ['systems/monitoring-and-drift', 'systems/testing-and-deploying-ml-models'],
  sources: [
    { label: 'Production ML systems: Monitoring pipelines (Google Machine Learning Crash Course)', url: 'https://developers.google.com/machine-learning/crash-course/production-ml-systems/monitoring' },
  ],
  updated: '2026-11-06',
};
