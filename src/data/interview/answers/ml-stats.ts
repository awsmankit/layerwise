import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'ds-conversion-fell-but-every-segment-rose': {
    short:
      "Conversion fell because the mix of visitors changed, not because the checkout got worse. Desktop conversion rose from 10% to 11% and mobile from 2% to 3%, but mobile visitors, who convert less, went from 20% to 80% of traffic. Weighting this week’s rates by last week’s mix gives 9.4%, higher than last week’s 8.4%. So do not roll back on this evidence: find out why the mix changed, and settle the checkout question with a proper test.",
    explain: [
      {
        heading: "Why both things are true",
        body: "An overall rate is a weighted average of the segment rates, and the weights are each segment’s share of the visits. Last week 80% of visits were desktop: 0.8 x 10% + 0.2 x 2% = 8.4%. This week only 20% were desktop: 0.2 x 11% + 0.8 x 3% = 4.6%. When a trend appears in every group but reverses in the total because the group sizes changed, it is called Simpson’s paradox. Nothing is wrong with the arithmetic; the total just answers a different question than the segments do.",
      },
      {
        heading: "Compare like with like",
        body: "Hold the mix fixed. This week’s rates on last week’s mix give 0.8 x 11% + 0.2 x 3% = 9.4%, up from 8.4%. Last week’s rates on this week’s mix would have given 0.2 x 10% + 0.8 x 2% = 3.6%. So the shift in who visited alone explains the drop from 8.4% to 3.6%, and the checkout, if anything, helped.",
      },
      {
        heading: "Ask why the mix changed",
        body: "Possible causes are a campaign that sent more mobile visitors, a change in search ranking, a tracking change, a wave of bots, or an effect of the checkout itself. The cause decides which view to trust. If the mix shifted for a reason unrelated to the checkout, the within-device comparison answers the checkout question. If the checkout changed who arrives, the total may matter. A randomised test, where visitors are assigned to the old or new checkout at random, removes the ambiguity.",
      },
      {
        heading: "Are the improvements real?",
        body: "Check sample sizes before believing any segment. Desktop at 11% on 2,000 visits has a standard error (the typical wobble from chance) of about 0.7 points, and the 1 point gain over last week is only about 1.3 standard errors, so it is within noise. Mobile went from 2% on 2,000 visits to 3% on 8,000, about 2.7 standard errors, which is harder to dismiss, but a before and after comparison is still not a test. Tell the growth lead in one table and one sentence, and report conversion by segment next to the total from now on, with the mix shown.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Last week", "This week", "What it shows"],
      rows: [
        { label: "Desktop", cells: ["8,000 visits, 10% convert (800)", "2,000 visits, 11% convert (220)", "Rate up 1 point; share of traffic down from 80% to 20%"] },
        { label: "Mobile", cells: ["2,000 visits, 2% convert (40)", "8,000 visits, 3% convert (240)", "Rate up 1 point; share of traffic up from 20% to 80%"] },
        { label: "All visits", cells: ["10,000 visits, 8.4% (840)", "10,000 visits, 4.6% (460)", "Headline falls 3.8 points"] },
        { label: "Like for like", cells: ["8.4%", "9.4%", "This week’s rates on last week’s mix: up 1.0 point"] },
      ],
      caption: "Every segment improved, yet the total fell, because most visitors moved to the segment that converts less.",
    },
    example: {
      title: "Example: the numbers behind the table",
      text: "Both weeks had 10,000 visits. The orders in each segment are visits x conversion. Slicing the data many ways also creates false alarms: with 20 comparisons at the 5% level, the chance that at least one looks significant by luck alone is 1 - 0.95^20.",
      rows: [
        { label: "Last week's orders", value: "800 + 40 = 840 of 10,000 = 8.4%" },
        { label: "This week's orders", value: "220 + 240 = 460 of 10,000 = 4.6%" },
        { label: "This week's rates, last week's mix", value: "9.4%" },
        { label: "Last week's rates, this week's mix", value: "3.6%" },
        { label: "Chance of a false alarm in 20 comparisons", value: "about 64%" },
      ],
    },
    followUps: [
      {
        q: "How do you decide whether the segment view or the overall view should drive the decision?",
        a: "Draw the causal story. If the device mix is driven by something unrelated to the checkout, such as a campaign, the segment view answers the checkout question, but if the checkout changed who arrives, the total can matter. A randomised test removes the doubt.",
      },
      {
        q: "You split further by country, browser and source and find a segment where the new checkout is worse. What do you do?",
        a: "Treat it as a hypothesis, not a finding. Many slices create false alarms: 20 comparisons at 5% give about a 64% chance of at least one. Check the sample size and confirm on fresh data or a test planned in advance.",
      },
      {
        q: "The growth lead says she does not care about the maths, just whether to roll back. What do you say?",
        a: "Give a clear recommendation with the reason in one sentence: the drop is explained by more mobile visitors, and within each device conversion improved. Then say the risk if you are wrong and the test that settles it.",
      },
    ],
    mistakes: [
      "Agreeing to roll back because the headline number fell.",
      "Being unable to explain how both the total and the segments can be right.",
      "Reporting segment differences with no sample sizes or intervals.",
      "Never asking why the traffic mix changed.",
    ],
  },
};
