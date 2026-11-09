import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'support-copilot-at-scale': {
    short:
      "Do the arithmetic first: 200,000 tickets x 3,000 input tokens is 600 million tokens, $1,200 a day, and 60 million output tokens add $480, so $1,680 a day, 68% over the $1,000 budget. Three changes close the gap: cache the fixed 1,000-token prefix (saves about $360), trim the retrieved passages from 1,500 to about 800 tokens with a reranker (about $280), and send simple tickets to a cheaper model (about $330), which lands near $710. Meet the 2 second first-token target with streaming and parallel lookups, and keep the human agent in control of every draft.",
    explain: [
      {
        heading: "Start with load and cost",
        body: "Almost all of the 200,000 tickets arrive in 10 business hours, which is 36,000 seconds, so the average is about 5.6 requests per second. Peaks run at two to three times the average, so plan for 11 to 17 requests per second, and make sure the provider’s per-minute quota covers that peak, not the daily average. Then price the baseline: input 200,000 x 3,000 = 600 million tokens at $2 per million is $1,200, and output 200,000 x 300 = 60 million tokens at $8 per million is $480. The prices are the question’s illustrative ones.",
      },
      {
        heading: "Three cost levers, applied in order",
        body: "First, prompt caching: the first 1,000 tokens are the same on every request, so a provider can reuse them at a lower rate. If cached input costs a tenth of the normal rate, the saving is 200 million tokens x $1.80 per million = $360 a day, less any cache-write charges. Second, send fewer retrieved tokens: retrieve generously, rerank, and pass only the best passages, cutting 1,500 tokens to about 800. That is 700 x 200,000 = 140 million tokens, $280 a day, but only keep it if your evals show quality holds. Third, route simple ticket types to a cheaper model. If 40% of tickets go to a model at a fifth of the price, the saving is about 0.4 x 0.8 x $1,040 = $333.",
      },
      {
        heading: "Latency and reliability",
        body: "Time to first token (how long before the first word appears) is what a user feels. Streaming shows text as it is written, a cached prefix is faster to process, and retrieval and order lookup can run at the same time. Put a timeout on every step and a fallback model for when the main one is slow or throttled. Retries must use exponential backoff with jitter (random delay) and a cap, so a busy morning does not turn into a retry storm.",
      },
      {
        heading: "Keep people in control, and know it works",
        body: "Drafts are suggestions with citations the agent can check. Order data comes from tools scoped in code to the ticket’s customer, and any answer cache is either per customer or limited to non-personal help-centre text. Track draft acceptance and edit rate, handling time, groundedness on sampled traffic, cost per ticket and p95 time to first token.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "dollars a day",
      items: [
        { label: "Baseline, no tricks", value: 1680, note: "$1,200 input + $480 output" },
        { label: "+ cache the fixed prefix", value: 1320, note: "saves about $360" },
        { label: "+ rerank and trim retrieval", value: 1040, note: "saves about $280" },
        { label: "+ route simple tickets to a cheaper model", value: 707, note: "saves about $333", hot: true },
        { label: "Budget", value: 1000, note: "the line to get under" },
      ],
      caption: "Each change is applied on top of the one before. Uses the question’s illustrative prices and the assumptions in the text.",
    },
    example: {
      title: "Example: the baseline arithmetic and the result",
      text: "Using the question’s numbers: 200,000 tickets a day, 3,000 input tokens and 300 output tokens each, $2 and $8 per million tokens. The savings assume cached input at a tenth of the normal price, 40% of tickets routed to a model at a fifth of the price, and quality holding on evals after trimming.",
      rows: [
        { label: "Input tokens a day", value: "600 million = $1,200" },
        { label: "Output tokens a day", value: "60 million = $480" },
        { label: "Baseline total", value: "$1,680, which is $680 (68%) over budget" },
        { label: "Average load in business hours", value: "5.6 requests per second" },
        { label: "Peak to plan for", value: "11 to 17 requests per second" },
        { label: "After the three changes", value: "about $707 a day, about $0.0035 per ticket" },
      ],
    },
    followUps: [
      {
        q: "Draft acceptance is high but agents edit 40% of drafts heavily. How do you find out why?",
        a: "Compare accepted drafts with the replies that were sent, and group the edits by type: tone, wrong policy, missing order detail, length. Tie each group to a retrieval or prompt failure, then add real examples to the eval set.",
      },
      {
        q: "At 9:00 every day error rates spike with 429 responses. What is going on and what do you do?",
        a: "The morning peak, made worse by immediate retries, is exceeding the quota. Use exponential backoff with jitter and a retry cap, a client-side rate limiter or queue, a quota increase if the peak is legitimate, and fallback routing.",
      },
      {
        q: "Would self-hosting an open-weight model be cheaper at this volume? How would you decide?",
        a: "Compare the managed bill with GPU cost at the peak throughput and latency you need, including idle hours outside business time, engineering and on-call cost, and quality on your eval set. With uneven daytime traffic, how busy the GPUs are kept matters a lot.",
      },
    ],
    mistakes: [
      "Being unable to produce the daily token and cost arithmetic from the numbers given.",
      "Cutting cost by switching every request to the cheapest model without checking quality on evals.",
      "Caching whole drafts keyed by ticket text, which risks one customer’s order details reaching another.",
      "Sizing capacity on the daily average and ignoring the business-hours peak.",
    ],
  },
};
