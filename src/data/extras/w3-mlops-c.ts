import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 3 "mlops-c" batch. */
export const extrasW3MlopsC: Record<string, Extra> = {
  'systems/monitoring-and-drift': {
    takeaways: [
      'Models fail silently, so watch five layers: system health, inputs, predictions, outcomes and business metrics.',
      'Covariate shift changes the inputs, label shift changes the outcome mix, and concept drift changes the right answer. Check for a pipeline bug before blaming the world.',
      'PSI and the KS statistic measure how big a change is. A p-value mostly measures how much data you have, so alert on effect size.',
      'Labels arrive late, so input monitors fire first and a small deliberate labelling sample confirms harm. Keep alerts few, owned and actionable.',
    ],
    prereq: ['systems/testing-and-deploying-ml-models'],
    quiz: [
      { q: 'A fraud model\'s accuracy cannot be measured until chargebacks arrive weeks later. What do you monitor in the meantime?', options: ['Nothing; wait for the labels', 'Input and score distributions, the approve and decline mix, and data quality', 'Only the server\'s CPU usage', 'The number of engineers on call'], answer: 1, why: 'Input, prediction and data-quality signals need no labels, so they fire first and labelled samples confirm later.' },
      { q: 'With a huge sample, a KS test reports p below 0.0001 for a tiny, harmless change. What is the best response?', options: ['Retrain immediately, since the test is significant', 'Switch the test off for good', 'Alert on an effect size such as PSI or the KS statistic, not only on the p-value', 'Halve the sample until the p-value rises'], answer: 2, why: 'With enough data almost any difference is statistically significant, so size of change is the useful signal.' },
      { q: 'A feature suddenly looks drifted right after a firmware update changed its units. What should you do first?', options: ['Retrain on the new data', 'Fix or convert the feed upstream and keep the model', 'Raise the alert threshold', 'Roll the model back a year'], answer: 1, why: 'The data format changed, not the world. Retraining would teach the model the bug.' },
      { q: 'You test 20 features every day at the 5 percent level and nothing has changed. About how often will at least one test fire by chance, assuming independent tests?', options: ['Almost never', 'About 1 day in 20', 'About 64 percent of days', 'Every single day'], answer: 2, why: '1 minus 0.95 to the power of 20 is about 0.64, so alert on a share of features or correct for the number of tests.' },
      { q: 'A model\'s feature shows a clear weekly wave and a 1-day window keeps alerting. What is the most likely fix?', options: ['Retrain every day', 'Compare against a window that covers whole weeks, or like with like', 'Delete the feature', 'Ignore all drift alerts'], answer: 1, why: 'A window shorter than the seasonal cycle sees the cycle as drift, so match the window to the cycle.' },
    ],
  },
  'systems/ml-system-design-interviews': {
    takeaways: [
      'Work through the same stages every time: goal and metric, data and labels, baseline and model, offline evaluation, serving, launch, monitoring.',
      'Ask about the data first: how labels arrive, how late, and what bias comes from what the system already showed.',
      'Estimate with stated assumptions: requests per second, memory, latency budgets and the cost of each kind of error. Always label them as assumptions.',
      'The usual failures are random splits that leak time, accuracy on rare events, skipping a baseline, ignoring label delay and forgetting monitoring.',
    ],
    prereq: ['systems/monitoring-and-drift', 'systems/llm-app-system-design'],
    quiz: [
      { q: 'A payment fraud detector reports 99.9 percent accuracy. Fraud is 0.1 percent of payments. What does that tell you?', options: ['The detector is excellent', 'Very little: approving everything would score the same', 'The detector is slightly too cautious', 'The fraud rate must be wrong'], answer: 1, why: 'With rare positives, accuracy rewards doing nothing. Look at precision, recall and cost.' },
      { q: 'Why split ranking or fraud data by time instead of at random?', options: ['Random splits are slower', 'A random split lets the future and the same users appear in training and test, so scores are too optimistic', 'Time splits give bigger test sets', 'Random splits cannot be reproduced'], answer: 1, why: 'Deployment predicts the future from the past, so evaluation must do the same.' },
      { q: 'In a three-stage recommender, what is the job of the first stage?', options: ['Pick the single best item with the largest model', 'Cheaply narrow millions of items to hundreds of candidates', 'Apply business rules and diversity', 'Log the click'], answer: 1, why: 'Only cheap, fast models can touch the whole catalogue. Ranking and re-ranking work on the shortlist.' },
      { q: 'A fraud model flags 115,900 of 20 million payments in a day, and 16,000 of those are real fraud (example numbers). What is the precision?', options: ['About 14 percent', 'About 80 percent', 'About 99 percent', 'About 0.5 percent'], answer: 0, why: '16,000 divided by 115,900 is about 0.138, because false alarms among the many genuine payments swamp the true detections.' },
      { q: 'What is a good first step in a design interview before choosing a model?', options: ['Name the newest architecture', 'Clarify the goal, constraints and what a wrong answer costs, then define the metric', 'Draw the serving diagram', 'Start estimating GPU hours'], answer: 1, why: 'Every later choice depends on the goal, the constraints and the metric, so clarify and define them first.' },
    ],
  },
};
