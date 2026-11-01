import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 3 "mlops-b" batch. */
export const extrasW3MlopsB: Record<string, Extra> = {
  'systems/batch-vs-online-inference-and-feature-stores': {
    takeaways: [
      'Choose batch, online or streaming by freshness, how many entities actually ask, the latency budget and what a failure costs. Batch cost follows the entities you could score; online cost follows peak demand.',
      'Training-serving skew is one feature written twice. Measure it by logging serving features and comparing them with training values example by example, and remove it with one shared definition or by training on logged values.',
      'A feature store keeps an offline store (history, for training and batch scoring) and an online store (latest values, for fast lookups), moves data between them by materialisation, and joins features to events as of each event time.',
      'Join with the newest value recorded on or before each event, within a time-to-live. Joining the latest value leaks the future and makes offline scores look better than live ones.',
    ],
    prereq: ['systems/data-pipelines-and-data-quality'],
    quiz: [
      {
        q: 'In the lesson\'s example, batch scoring costs a flat $11.11 a day. When is online scoring cheaper?',
        options: ['Whenever the model takes under 50 ms', 'Only when fewer than about 3.3% of customers are active each day', 'Whenever more than 3.3% of customers are active each day', 'Never, because online needs a feature store'],
        answer: 1,
        why: 'Online cost follows active customers x requests x peak factor, while batch cost does not, so online wins only below 0.5 / (3 x 5), about 3.3% active.',
      },
      {
        q: 'The training job counts orders in the 7 whole days before today. The serving code counts a rolling 168 hours including today so far. What is this?',
        options: ['Data drift in the customers', 'Concept drift in the target', 'Training-serving skew', 'Label leakage from the future'],
        answer: 2,
        why: 'The same feature is computed by two different implementations, so the model is fed numbers it was not trained on.',
      },
      {
        q: 'A training row is for an event at 14:02 on 3 March. Which feature value belongs on it?',
        options: ['The newest value recorded on or before 14:02, no older than the time-to-live', 'The newest value in the table today', 'The average of every value recorded for that customer', 'The first value recorded after 14:02'],
        answer: 0,
        why: 'A point-in-time join reproduces what the system could have known at the event. Later values leak the future.',
      },
      {
        q: 'Which description of the two stores in a feature store is right?',
        options: ['Online keeps full history for training; offline keeps the latest values', 'Both keep the full history, in different formats', 'Offline is for the model, online is for the data', 'Offline keeps history for training sets and batch scoring; online keeps the latest value per entity for fast lookups'],
        answer: 3,
        why: 'Feast, for example, stores only the latest values per entity key in the online store and uses the offline store for history, filled to the online store by materialisation.',
      },
    ],
  },
  'systems/testing-and-deploying-ml-models': {
    takeaways: [
      'Test three layers: feature and training code, data (schema and distributions), and model behaviour on slices. The ML Test Score lists 28 tests in four groups, and a team\'s score is the minimum across the groups.',
      'A release gate compares the candidate with the champion on the same data, overall and per slice, with an absolute floor and a maximum drop. A better headline number can hide a worse slice.',
      'CI tests code, data and models, CD ships the training pipeline, and continuous training retrains on a trigger. A registry with a movable alias makes rollback one step, if you rehearse it.',
      'Shadow exposes nobody but cannot see user reaction; a canary limits harm; an A/B test measures effect. Evidence grows with the square root of traffic, so a one-point regression needs far more traffic than an eight-point one.',
    ],
    prereq: ['systems/batch-vs-online-inference-and-feature-stores'],
    quiz: [
      {
        q: 'How is the final ML Test Score computed from the four test groups?',
        options: ['The sum of all four groups', 'The average of the four groups', 'The minimum of the four groups\' scores', 'The score of the best group'],
        answer: 2,
        why: 'The paper takes the minimum because all four areas matter, so a weak group cannot hide behind a strong one.',
      },
      {
        q: 'A candidate model improves overall accuracy by 0.5 points but drops accuracy for new users by 4.8 points. What should a slice-aware gate do?',
        options: ['Fail it for the new-user drop, then find out why', 'Pass it, because overall accuracy improved', 'Pass it if the drop is under 10 points', 'Ignore slices with fewer users'],
        answer: 0,
        why: 'Slice thresholds exist to stop a global average from masking a fault in one group.',
      },
      {
        q: 'Which release strategy cannot reveal a regression that only appears when users act on the model\'s outputs?',
        options: ['A canary', 'An A/B test', 'A staged rollout to real users', 'A shadow deployment'],
        answer: 3,
        why: 'In shadow, users see only the old model, so you learn about technical faults and prediction accuracy but not how people react to the new outputs.',
      },
      {
        q: 'At a 5% bad-outcome rate, spotting a rise to 13% needs about 201 cases per group but a rise to 6% needs about 8,159. Why?',
        options: ['Rates above 10% need no test', 'Larger effects stand out from noise, and the cases needed fall with the square of the effect size', 'Canaries ignore large effects', 'The formula only works for round numbers'],
        answer: 1,
        why: 'The difference you can detect shrinks with the square root of the sample, so an effect 8 times smaller needs roughly 40 times the cases.',
      },
    ],
  },
};
