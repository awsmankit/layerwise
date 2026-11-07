import type { WhatIf } from "./types";

export const item: WhatIf = {
  slug: "no-cross-validation",
  title: "What if we trust a single train/test split?",
  blurb:
    "Score the same small model on 20 different random splits and see the answer swing, then compare it with the steadier average of 5-fold cross-validation.",
  area: "ml",
  level: "intermediate",
  minutes: 4,
  why: [
    "To learn how a model will do on new data, we hold some rows back, train on the rest, and score on the held-back rows. With a small dataset that score depends a lot on luck: which rows happened to land in the test set. Some splits put the easy rows in the test set and some put the hard ones there, and the model is the same each time.",
    "In the demo, a 5-nearest-neighbours model is scored on 20 random 80/20 splits of 60 rows. The scores run from the low 40s to over 90 percent, a spread of about 13 points (one standard deviation, a typical distance from the average). Someone who ran only one split would report one of those numbers and believe it. Whichever you land on, the model's real accuracy on fresh rows is about 71 percent.",
    "Cross-validation fixes part of this. It cuts the rows into five parts, tests on each part while training on the other four, and averages the five scores, so every row is tested exactly once. In the demo, 20 different shuffles of 5-fold cross-validation give averages that stay in a much narrower band. It costs five trainings instead of one, and it still has a spread, so report the average and the spread together. For a larger dataset a single split is less shaky, because there are more test rows. Never use the test rows to choose the model or its settings, or the score is no longer honest.",
  ],
  takeaways: [
    "On a small dataset, one test score is mostly a statement about which rows were held back.",
    "Cross-validation tests every row once and averages, which narrows the spread. It does not remove it.",
    "Report the average and the spread (for example 70% with a standard deviation of 4 points), not one number.",
    "More rows narrow every spread. With plenty of data a single split can be fine.",
  ],
  lessons: [
    "ml/overfitting-and-bias-variance",
    "foundations/classical-ml-essentials",
    "evals/building-an-eval-dataset",
  ],
  sources: [
    {
      label: "scikit-learn: Cross-validation, evaluating estimator performance",
      url: "https://scikit-learn.org/stable/modules/cross_validation.html",
    },
  ],
  updated: "2026-11-07",
};
