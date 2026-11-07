import type { WhatIf } from "./types";

export const item: WhatIf = {
  slug: "no-baseline",
  title: "What if we never compare with a simple baseline?",
  blurb:
    "A fancy model scores around 90 percent, which sounds great, until a model that learns nothing scores almost the same. Add baselines and an interval on the gain.",
  area: "ml",
  level: "basic",
  minutes: 4,
  why: [
    "A score only means something next to another score. A baseline is a deliberately simple model you build first: always predict the most common answer, apply one hand-made rule, or fit a straight line. It tells you how much of the score comes from the problem being easy and how much from your model being clever.",
    'In the demo, faults are rare, about one machine in ten. A model that always says "no fault" is right nearly nine times in ten without looking at a single sensor. A fancy forest of decision trees scores about 90 percent, which sounds great, but its gain over the best simple model is a point or less. The interval beside it is a 95 percent range from resampling the test rows: it shows how much that gain could be luck. If the range includes zero, you cannot tell the fancy model from the baseline with these test rows.',
    "Real teams build the baseline first, report the gain with an interval, and then ask whether the gain is worth what the model costs: more compute, slower answers, harder debugging, more to maintain. The answer depends on the use. One extra point may be worth millions for a huge service and nothing for a small tool. This page lets you set the gain you need and see whether the result clears it. When faults are rare, also look at how many real faults are found, since accuracy hides that.",
  ],
  takeaways: [
    "Always build the simplest possible model first. It is your yardstick.",
    'On imbalanced data, "always predict the common answer" can score very high with no learning.',
    "Report the gain over the baseline with an interval, not just the model's own score.",
    "Decide beforehand how much improvement is worth the extra complexity.",
  ],
  lessons: [
    "ml/is-the-difference-real",
    "evals/evals-101",
    "foundations/classical-ml-essentials",
  ],
  sources: [
    {
      label:
        "scikit-learn: DummyClassifier (a simple baseline to compare against)",
      url: "https://scikit-learn.org/stable/modules/generated/sklearn.dummy.DummyClassifier.html",
    },
  ],
  updated: "2026-11-07",
};
