import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'judge-agreement-94-percent-misses-bad-answers': {
    short:
      "A 94% agreement rate says little here, because only 20 of the 200 outputs are bad, so a judge that said “pass” every time would already agree 90% of the time. Look inside the number: this judge caught 12 of the 20 bad answers (60%), and at an example 2% bad rate in production only about 36% of its flags would be real. Twenty bad examples are also too few to trust. Improve the judge and collect more labelled failures before using it as a release gate.",
    explain: [
      {
        heading: "Why a headline agreement can hide the problem",
        body: "When 90% of outputs are good, agreeing on most of them is easy. The always-pass baseline scores 90%, so 94% is only four points better. Open the counts. The judge flagged 12 of the 20 unfaithful outputs, so its recall (the share of real problems it catches) is 60%. It passed 176 of the 180 faithful ones and raised 4 false flags, so its precision (the share of flags that are real) is 12 out of 16, which is 75%. A chance-corrected measure agrees: Cohen’s kappa is (0.94 - 0.836) / (1 - 0.836), about 0.63, where 0.836 is the agreement you would expect by luck from the two rates.",
      },
      {
        heading: "Is 20 bad examples enough?",
        body: "Catching 12 of 20 is a small sample. A 95% range for the true recall runs from roughly 39% to 78%, which is wide enough to hide a judge that is poor or one that is good. A gate needs many more bad examples, taken from real traffic and labelled by more than one person.",
      },
      {
        heading: "What happens at the real base rate",
        body: "The calibration set has 10% bad outputs, but production usually has far fewer. Suppose 2% of 50,000 daily outputs are bad. That is 1,000 bad answers. At 60% recall the judge catches 600. Its false-flag rate is 4 / 180, about 2.2%, applied to 49,000 good outputs, which is about 1,089 wrong flags. Precision is then 600 / 1,689, about 36%, not the 75% seen on the test set. Reviewers would read nearly two false flags for each real one.",
      },
      {
        heading: "Improving it and using it properly",
        body: "Read the 8 misses and the 4 false flags to find patterns, such as claims the judge cannot check because it lacks the source text, subtle numbers, or a vague rubric. Then give the judge the source, split the check into specific yes-or-no questions per claim, ask for reasoning before the verdict, use a different model family from the one being judged, and measure again. Use the judge to prioritise human review and to watch trends, together with code checks, and do not make it the only gate for high-stakes output. Recalibrate whenever the judge, the rubric or the content changes.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "percent",
      items: [
        { label: "Agreement: a judge that always says pass", value: 90, note: "no skill at all" },
        { label: "Agreement: this judge", value: 94, note: "the number the team quoted" },
        { label: "Bad answers caught: always-pass judge", value: 0 },
        { label: "Bad answers caught: this judge", value: 60, note: "12 of 20", hot: true },
        { label: "Flags that are real: on this test set", value: 75, note: "12 of 16 flags" },
        { label: "Flags that are real: at an example 2% bad rate", value: 36, note: "about 600 of 1,689 flags", hot: true },
      ],
      caption: "The first two bars look fine. The others are what a release gate actually depends on.",
    },
    example: {
      title: "Example: the same judge on 50,000 outputs a day",
      text: "Assume 2% of production outputs are bad, the judge keeps its 60% recall, and it wrongly flags 4 of every 180 good outputs (about 2.2%). These are example figures to show the method; use your own rates.",
      rows: [
        { label: "Truly bad outputs (2% of 50,000)", value: "1,000" },
        { label: "Caught at 60% recall", value: "600" },
        { label: "Good outputs wrongly flagged (2.2% of 49,000)", value: "about 1,089" },
        { label: "Flags a reviewer must read", value: "about 1,689" },
        { label: "Flags that are real", value: "600, or about 36%" },
      ],
    },
    followUps: [
      {
        q: "What if the judge had 100% recall but flagged 10% of good answers?",
        a: "That is a different trade-off: reviewers drown in false flags. Choose the operating point from the cost of a missed bad answer against the cost of reviewing a good one, using the production base rate.",
      },
      {
        q: "Two human labellers disagree on 8 of the 200. What do you do with those?",
        a: "Measure their agreement with kappa, read the disagreements, and fix the rubric where it is vague. Then name an owner who decides the label. Judge “errors” on genuinely ambiguous items are not errors.",
      },
      {
        q: "How do you keep the judge honest over months?",
        a: "Keep a fixed human-labelled calibration set and rescore it whenever the judge model, prompt or content type changes. Audit a fresh random sample with humans from time to time, and pin the judge’s version.",
      },
    ],
    mistakes: [
      "Shipping on the headline agreement alone.",
      "Not comparing with an always-pass baseline.",
      "Quoting precision from a balanced calibration set as if it would hold in production.",
      "Calibrating on 20 failures and calling it done.",
    ],
  },
};
