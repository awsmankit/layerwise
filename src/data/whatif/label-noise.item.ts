import type { WhatIf } from "./types";

export const item: WhatIf = {
  slug: "label-noise",
  title: "What if some of the labels are wrong?",
  blurb:
    "Flip a share of the training labels and watch the decision boundary bend and the clean-test score fall, then see which model and which dataset size resist.",
  area: "ml",
  level: "intermediate",
  minutes: 5,
  why: [
    "A label is the answer a person or a program attached to a training row: this email is spam, this scan shows a fracture. Labels are made by people who get tired, by rules that have gaps, and by scripts that read the wrong column. Some are always wrong. A model learns from whatever labels it is given, so wrong labels teach it wrong things.",
    "In the demo, two overlapping groups of points are learned by three models while a chosen share of the training labels is flipped. A memoriser that copies its single closest training row repeats every mistake, and its map of predictions gets patchy: islands of the wrong colour appear around each flipped point. A smoother that takes a vote of 15 neighbours, and a straight line, average over many rows, so a few wrong labels are outvoted. All scores are measured on separate clean test points, which is the only honest way to see the damage.",
    "Two things help. More data: with 600 rows the same share of flips is diluted, and the straight line hardly moves until about 40 percent of the labels are wrong. A model that cannot bend into every point (a simpler or more regularised one) also resists. If the data are noisy in a lopsided way, for example always one class mislabelled as another, averaging helps less. Real teams audit labels, measure how often labellers agree, and use tools that flag rows whose label the model finds suspicious. Test sets need that care too, because wrong test labels make every score wrong.",
  ],
  takeaways: [
    "A model cannot tell a wrong label from a right one. It learns what it is given.",
    "Flexible models that copy single rows (like 1-nearest-neighbour) repeat the errors. Models that average over many rows are steadier.",
    "More training rows dilute random label errors. Always check the score on clean test labels.",
    "Label errors in the test set make the score itself wrong, so audit those first.",
  ],
  lessons: [
    "ml/overfitting-and-bias-variance",
    "evals/building-an-eval-dataset",
    "ml/getting-data-ready",
  ],
  sources: [
    {
      label:
        "Northcutt, Jiang, Chuang: Confident Learning: Estimating Uncertainty in Dataset Labels",
      url: "https://arxiv.org/abs/1911.00068",
    },
    {
      label:
        "Northcutt, Athalye, Mueller: Pervasive Label Errors in Test Sets Destabilize Machine Learning Benchmarks",
      url: "https://arxiv.org/abs/2103.14749",
    },
  ],
  updated: "2026-11-07",
};
