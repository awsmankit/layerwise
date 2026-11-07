import type { WhatIf } from "./types";

export const item: WhatIf = {
  slug: "no-feature-scaling",
  title: "What if we do not scale the features?",
  blurb:
    "Give a nearest-neighbours model one feature in the tens of thousands and one between 0 and 1, and watch the big number decide everything.",
  area: "ml",
  level: "basic",
  minutes: 4,
  why: [
    "Many models measure how far apart two rows are, then trust the rows that are close. A row is a list of numbers, and the distance adds up the gap in every column. If one column is income in dollars (tens of thousands) and another is a ratio between 0 and 1, a gap of a few hundred dollars is bigger than the largest possible gap in the ratio. The ratio might as well not exist.",
    "In the demo, k-nearest-neighbours (the vote of the k closest training rows) picks neighbours for a new customer. Not scaled, its search area is a thin vertical stripe: it finds customers with similar income and ignores the ratio, which is the stronger clue, so the score drops close to a coin flip. Standardising first, which means subtracting each column's average and dividing by its spread, puts both columns on one ruler and the search area becomes round.",
    "Gradient descent has the same trouble from a different side. Its loss bowl is stretched into a long thin valley when features differ in size. The step size must be small enough for the steep wall, so the walk along the valley floor takes a huge number of steps. After scaling the bowl is nearly round and a handful of steps is enough. Trees and forests do not care about scale, but distance-based models, linear models trained by gradient descent, and neural networks all do. Fit the scaler on the training rows only, then reuse it on test rows, so no test information leaks in.",
  ],
  takeaways: [
    "Distance adds up gaps in every column, so a column with big numbers drowns the others.",
    "Changing only the unit of a feature (dollars to thousands of dollars) can change the model's score. That is a sign something is off.",
    "Standardise using the training rows only, then apply the same numbers to new rows.",
    "Unscaled features also make gradient descent crawl, because the loss bowl is stretched into a thin valley.",
  ],
  lessons: [
    "ml/getting-data-ready",
    "ml/linear-and-logistic-regression",
    "foundations/classical-ml-essentials",
  ],
  sources: [
    {
      label: "scikit-learn: Importance of Feature Scaling",
      url: "https://scikit-learn.org/stable/auto_examples/preprocessing/plot_scaling_importance.html",
    },
  ],
  updated: "2026-11-07",
};
