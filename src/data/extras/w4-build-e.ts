import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "build-e" batch. */
export const extrasW4BuildE: Record<string, Extra> = {
  'evals/guardrails-in-practice': {
    takeaways: [
      'A guardrail is a classifier with a threshold, two kinds of error and a base rate. All three decide whether it helps or just annoys users.',
      'When bad requests are rare, most blocks can still be wrong: at 1% bad traffic, 95% recall and a 2% false-positive rate, only about a third of blocks are right (example numbers).',
      'Layer cheap checks first, spend the expensive judge on the grey zone only, and measure added delay at the 95th percentile, not the mean.',
      'Streaming forces a choice between delay and exposure, and strong results against known attacks do not cover an adaptive attacker. Keep hard limits in permissions.',
    ],
    prereq: ['evals/llm-security'],
    quiz: [
      {
        q: 'A filter catches 95% of bad requests and wrongly blocks 2% of good ones. Only 1 request in 100 is bad. About what share of its blocks hit a bad request?',
        options: ['About 98%', 'About 95%', 'About one in three', 'About 2%'],
        answer: 2,
        why: 'Per 100,000 requests it catches 950 bad ones but also blocks 1,980 good ones, so 950 of 2,930 blocks (32%) are right.',
      },
      {
        q: 'Why is average added delay a poor way to judge a guardrail cascade that sends the grey zone to an LLM judge?',
        options: [
          'The mean hides the tail: once more than about 5% of requests reach the judge, the 95th-percentile delay becomes the judge time',
          'Averages cannot be computed for latency',
          'The judge never adds delay',
          'The classifier runs only on blocked requests',
        ],
        answer: 0,
        why: 'Users feel the slow requests. A small share of slow requests barely moves the mean but sets the tail.',
      },
      {
        q: 'In asynchronous streaming mode, what does Amazon Bedrock Guardrails documentation say can happen?',
        options: [
          'Nothing is ever shown that the guardrail has not scanned',
          'Chunks are sent at once and may contain inappropriate content until the scan completes',
          'The whole answer is held back until the stream ends',
          'The guardrail is switched off for the model',
        ],
        answer: 1,
        why: 'Asynchronous mode trades safety margin for no added delay; the docs also say masking of sensitive information is not supported in that mode.',
      },
      {
        q: 'A paper reports that adaptive attacks bypassed 12 published defences with over 90% success for most. What is the sensible lesson for builders?',
        options: [
          'Guardrails are worthless and should be removed',
          'A defence that scores well on its authors\' attacks is secure',
          'Treat guardrails as one filter that raises the cost of misuse, and put hard limits such as spending and data access behind permissions in code',
          'Use a bigger model as the guardrail and the problem is solved',
        ],
        answer: 2,
        why: 'Defences are tested against known attacks. A determined attacker adapts, so anything that must not happen needs a control the model cannot talk its way past.',
      },
    ],
  },
  'evals/observability-for-llm-apps': {
    takeaways: [
      'A trace is a tree of spans for one run. To find a slow step, read each span\'s own time (duration minus its children), not the parent\'s duration.',
      'The OpenTelemetry GenAI conventions give shared names such as chat, invoke_agent, execute_tool and retrieval. As of 1 November 2026 they are in Development status, so pin the version you follow.',
      'Always log timings, token counts, versions, tool outcomes and decisions. Treat prompt, completion and tool content as sensitive: off by default, short retention, restricted access.',
      'Head sampling can lose every failed run. Keep errors, slow runs and negative feedback, sample the rest, and tag traces with the release so feedback and evals connect to them.',
    ],
    prereq: [],
    quiz: [
      {
        q: 'A parent span for a whole agent run lasts 8.9 s. Its children add up to 8.73 s. What does this tell you?',
        options: [
          'The parent span is the slow step',
          'The parent has only 0.17 s of its own time, so look at the children for the slow step',
          'The trace is corrupt because the times do not match',
          'The children ran in parallel',
        ],
        answer: 1,
        why: 'A parent includes its children. Own time is duration minus the children, so a parent with little own time is not the place to optimise.',
      },
      {
        q: 'What do the OpenTelemetry GenAI conventions recommend about recording prompts and completions?',
        options: [
          'Always record them, they are the most useful data',
          'Record them only on error spans',
          'Do not capture them by default; offer an opt-in, or store them externally and keep a reference on the span',
          'Hash them and store the hash as the span name',
        ],
        answer: 2,
        why: 'The text calls instructions, inputs and outputs sensitive and often large, and lists "do not record" as the default pattern.',
      },
      {
        q: 'You head-sample 1% of traces. About 2% of runs fail. What is the main problem?',
        options: [
          'Head sampling cannot be combined with metrics',
          'The decision is made before the run finishes, so almost all failed runs are discarded along with the rest',
          'Failed runs are always kept by head sampling',
          'Traces become too large',
        ],
        answer: 1,
        why: 'A head sampler decides from the trace ID at the start, so it cannot know a run will fail. Tail sampling decides after the run ends.',
      },
      {
        q: 'A retrieval span has status ok but returned zero documents, and the answer was wrong. What should you add?',
        options: [
          'Nothing: ok means the step worked',
          'An outcome attribute such as documents returned, with an alert when it is zero',
          'A longer retention period',
          'A second copy of the span',
        ],
        answer: 1,
        why: 'Span status says the call completed, not that it helped. Recording outcomes lets you see and alert on empty retrievals.',
      },
    ],
  },
};
