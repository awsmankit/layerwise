import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'fde-value-story-pilot-roi': {
    short:
      "Build the story from the pilot’s own numbers and show a range. Base case: 12,000 tickets x 60% used x 3 minutes saved is 360 hours, worth $10,800 a month at the example $30 an hour; subtract $1,200 for time wasted on discarded drafts and $600 of model cost, which leaves $9,000. A cautious case (40% used, 2 minutes saved) leaves $2,400, so the honest claim is about $2,400 to $9,000 a month of agent capacity. Do not claim headcount cuts, because saved minutes are only worth money if the customer uses them.",
    explain: [
      {
        heading: "Count what actually happened",
        body: "There are three lines. The gain: 12,000 tickets x 0.6 used x 3 minutes = 21,600 minutes, which is 360 hours, and at $30 an hour that is $10,800 a month. The waste: on the other 40% of tickets agents read a draft for about 30 seconds and threw it away, 12,000 x 0.4 x 0.5 minutes = 2,400 minutes, 40 hours, $1,200. The model cost: 12,000 x $0.05 = $600. Net: $10,800 - $1,200 - $600 = $9,000 a month, before fixed costs such as hosting, support and the pilot build.",
      },
      {
        heading: "Show a range, and what moves it",
        body: "Every input here is an estimate, so show a cautious case beside the base case. At 40% use and 2 minutes saved, the gain is $4,800, the waste is 12,000 x 0.6 x 0.5 = 3,600 minutes = $1,800, and the net is $2,400. The model cost is small either way: about 7% of the base-case net and 25% of the cautious one. What drives the result is how often drafts are used and how many minutes they save, so effort belongs there.",
      },
      {
        heading: "Question your own evidence",
        body: "Minutes saved reported by agents are weak evidence. Prefer timestamps from the ticket tool or a timed sample, ideally with a control group that did not use the assistant, and check that speed was not bought with quality: reopened tickets, customer satisfaction and escalations. Also be clear that saved time is not saved money. It becomes money only when the customer uses it, for example to absorb growth without hiring, shrink a backlog, or cut overtime and response times.",
      },
      {
        heading: "Say it in the finance lead’s terms, and what you will not claim",
        body: "Ask which unit finance cares about and put the result in it. Do not claim headcount reductions, because that decision belongs to the customer. Do not quote one precise number, because the inputs do not support it. And say what would change your conclusion: the pilot had volunteers, a novelty effect and one ticket mix, so a wider roll-out should be staged and measured the same way.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Base case", "Cautious case"],
      rows: [
        { label: "Drafts used", cells: ["60% (7,200 tickets)", "40% (4,800 tickets)"] },
        { label: "Minutes saved per used draft", cells: ["3", "2"] },
        { label: "Time saved", cells: ["360 hours = $10,800", "160 hours = $4,800"] },
        { label: "Time wasted on discarded drafts", cells: ["40 hours = $1,200", "60 hours = $1,800"] },
        { label: "Model cost", cells: ["$600", "$600"] },
        { label: "Net per month", cells: ["$9,000", "$2,400"] },
      ],
      caption: "Example figures: $30 an hour for an agent, $0.05 a ticket for the model. The claim is a range, not one number.",
    },
    example: {
      title: "Example: the questions finance will ask",
      text: "Using the example rates above. The hours are real only if the customer can use them. Spread in small pieces across 20 agents, 360 hours is not the same as 2 people who could leave.",
      rows: [
        { label: "Model cost as a share of net, base case", value: "$600 of $9,000, about 7%" },
        { label: "Model cost as a share of net, cautious case", value: "$600 of $2,400, 25%" },
        { label: "360 hours as full-time staff (160 hours a month)", value: "about 2.25 people, in small pieces" },
        { label: "A model twice as costly ($0.10 a ticket)", value: "net $8,400 in the base case" },
      ],
    },
    followUps: [
      {
        q: "The finance lead asks, “So we can cut two agents?” What do you say?",
        a: "The base case is 360 hours, about 2.25 full-time people, but spread across many agents in small pieces, and the cautious case is about one person. The evidence supports a capacity statement, not a layoff number. Headcount is the customer’s decision.",
      },
      {
        q: "The pilot had 20 agents. Will the result hold for all 100?",
        a: "Not necessarily. Novelty, volunteer bias, ticket mix and different skill levels can all change it. Propose a staged roll-out measured the same way, and say what result would change your conclusion.",
      },
      {
        q: "The customer wants a bigger model that costs twice as much per ticket. How does that change the story?",
        a: "At $0.10 a ticket the model costs $1,200 and the base-case net is $10,800 - $1,200 - $1,200 = $8,400, so cost barely changes the case, while a few points of acceptance would. Decide by measured acceptance and minutes saved, not price per token.",
      },
    ],
    mistakes: [
      "Quoting only the best-case saving and leaving out the time wasted on discarded drafts.",
      "Treating self-reported minutes as hard data.",
      "Claiming a headcount reduction on the customer’s behalf.",
      "Showing a single precise number with no range or assumptions.",
    ],
  },
};
