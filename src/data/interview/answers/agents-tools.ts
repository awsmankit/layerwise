import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'agent-loop-input-tokens-grow-with-steps': {
    short:
      "Every step of an agent loop sends the whole history again, so the input tokens you pay for grow with each step and the running total grows with the square of the number of steps. Here that is 717,000 input tokens and about $2.29 for one 30-step run, roughly 95 times the cost of the first call, not 30 times. Caching the fixed start of the prompt would bring it to about $0.46, but only while that start stays identical. So cap steps and cost in code, and keep the history short.",
    explain: [
      {
        heading: "Why every step costs more than the last",
        body: "A model has no memory between calls. Each call must receive the whole conversation so far. Step 1 reads the 6,000-token prefix (system prompt and tool definitions) plus the 500-token task, which is 6,500 tokens. Each step then adds 1,200 tokens, from the model’s call and the tool result, so step 2 reads 7,700 and step 30 reads 6,500 + 1,200 x 29 = 41,300. You pay for all of that input again at every step.",
      },
      {
        heading: "The arithmetic",
        body: "The fixed 6,500 tokens are read 30 times: 195,000. The added tokens form a growing series: 1,200 x (0 + 1 + 2 + ... + 29) = 1,200 x 435 = 522,000. Together that is 717,000 input tokens. Output is 30 x 300 = 9,000 tokens. At the example prices of $3 and $15 per million tokens, input costs $2.151 and output $0.135, about $2.29 a run, with input 94% of the bill. The first call alone costs $0.024, so a run is about 95 times that. Multiplying the first call’s input by 30 gives only 195,000 tokens, which misses by a factor of 3.7.",
      },
      {
        heading: "What caching changes",
        body: "Prompt caching lets a provider reuse the already-processed start of a prompt at a lower rate. In an agent loop each call begins with exactly the text of the previous call, so most of each call can be a cache hit. With an example cached-read price of one tenth and no write premium, only 6,500 + 29 x 1,200 = 41,300 tokens are charged in full, and the other 675,700 cost a tenth: 108,870 full-price equivalents, $0.327 for input and about $0.46 in total. Real prices, minimum sizes and cache lifetimes differ by provider, so check the current documentation and the usage numbers your calls return. Anything that changes the front of the prompt, such as a timestamp, a user name or rewriting old history, breaks the cache.",
      },
      {
        heading: "What this says about step limits",
        body: "Because cost grows with the square of the steps, doubling the steps from 15 to 30 multiplies input by 3.2, and halving them cuts it by about 69%. A step limit is therefore also a cost limit, so enforce it in code. Then reduce what each step adds: trim long tool results, compact the history at fixed points, and push noisy reading into a sub-agent that returns only a summary. Track cost per solved task, not per call.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "Steps taken",
      yLabel: "Input tokens read so far (thousands)",
      points: [
        [0, 0],
        [5, 44.5],
        [10, 119],
        [15, 223.5],
        [20, 358],
        [25, 522.5],
        [30, 717],
      ],
      marks: [
        { x: 15, label: "15 steps: 223,500" },
        { x: 30, label: "30 steps: 717,000" },
      ],
      caption: "Each step re-reads everything before it, so the running total bends upward. Doubling the steps from 15 to 30 more than triples the input.",
    },
    example: {
      title: "Example: one run of a support agent",
      text: "Prefix 6,000 tokens, task 500 tokens, each step adds 1,200 tokens of history and writes 300 tokens, 30 steps, example prices of $3 and $15 per million input and output tokens. Trimming each tool result from 1,000 to 300 tokens makes each step add 500 instead of 1,200.",
      rows: [
        { label: "Input at step 1", value: "6,500 tokens" },
        { label: "Input at step 30", value: "41,300 tokens" },
        { label: "Input over all 30 steps", value: "717,000 tokens" },
        { label: "Cost of one run, no caching", value: "$2.151 + $0.135 = about $2.29" },
        { label: "Cost of the first call alone", value: "$0.024 (a run is about 95 times that)" },
        { label: "One run with an example cache rate of 0.1x", value: "about $0.46" },
        { label: "One run with tool results trimmed to 300 tokens", value: "412,500 input tokens, about $1.37" },
        { label: "5,000 runs a day, uncached and cached", value: "$11,430 and about $2,308" },
      ],
    },
    followUps: [
      {
        q: "Tool results average 1,000 of the 1,200 tokens added per step. You trim each to 300. What is the new uncached cost?",
        a: "Each step now adds 500 tokens. Input is 30 x 6,500 + 500 x 435 = 412,500 tokens, which is $1.2375, plus $0.135 for output, about $1.37, a 40% saving. Check that the trimmed results still contain what the model needs.",
      },
      {
        q: "At 5,000 runs a day, what are the two bills, and how would you know the cache is working?",
        a: "About $11,430 uncached against about $2,308 with the example cache rate. Verify with the cached-token counts in the provider’s usage data, because a timestamp or user name near the top of the prompt can silently break the cache.",
      },
      {
        q: "Why is compacting the history at step 20 not free?",
        a: "Rewriting early context changes the start of the prompt, so cached reads stop matching, and a summary can drop a rule or a fact. Compact rarely, at fixed points, and keep pinned rules word for word.",
      },
    ],
    mistakes: [
      "Multiplying the first call’s tokens by the number of steps. Here that misses the real input by a factor of nearly four.",
      "Looking only at output tokens. In this loop input is about 94% of the bill.",
      "Treating caching as free or automatic. It needs a stable prefix and its savings depend on the provider’s rules.",
      "Having no per-run cap on steps and cost in code.",
    ],
  },
};
