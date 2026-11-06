import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'accuracy-trap',
  title: 'What if we judge a model by accuracy alone on rare events?',
  blurb: 'Slide how rare an event is and see a model that always says no score 99 percent while an example detector that finds the events looks worse.',
  area: 'training',
  level: 'basic',
  minutes: 3,
  why: [
    'Accuracy is the share of all cases the model got right. When the event you care about is rare, most cases are normal, and a model that always answers "no event" is right almost every time. With 10 events in 1,000 clips it scores 99 percent and finds nothing.',
    'A confusion matrix counts four outcomes: events found (true positives), events missed (false negatives), false alarms (false positives) and normal clips correctly left alone (true negatives). From them come two better questions. Recall is the share of real events the model found. Precision is the share of its alarms that were real. The do-nothing model has recall zero. The example detector on this page finds 80 percent of events but also raises a false alarm on 2 percent of normal clips, which costs a little accuracy.',
    'The detector is made up for the demo, not a real product. With its settings, accuracy prefers the do-nothing model until events reach about 25 in 1,000. Even then precision can be low: when events are rare, many alarms are false. Real teams pick the metric from the cost of each mistake, report recall and precision together, and often compare with a trivial baseline first.',
  ],
  takeaways: [
    'When one class is rare, a model that never finds it can still score very high accuracy.',
    'Always compare with a trivial baseline such as "always say no".',
    'Report recall and precision, and look at the confusion matrix counts.',
    'Rare events make precision fall even for a good detector, because normal clips are so many.',
  ],
  lessons: ['foundations/classical-ml-essentials', 'ml/anomaly-detection', 'ml/is-the-difference-real'],
  sources: [
    { label: 'Classification: Accuracy, recall, precision (Google Machine Learning Crash Course)', url: 'https://developers.google.com/machine-learning/crash-course/classification/accuracy-precision-recall' },
  ],
  updated: '2026-11-06',
};
