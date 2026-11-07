import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-tracing',
  title: 'What if you cannot see what the agent did?',
  blurb: 'A scripted 12-step agent run goes wrong at step 7. Find the bad tool result with a trace, then try to find it with only the final answer.',
  area: 'agents',
  level: 'intermediate',
  minutes: 4,
  predict: {
    question: 'An agent took 12 steps and gave a wrong final answer. One tool returned a bad result in the middle, with no error. What do you think happens if nothing recorded the steps?',
    options: [
      'You can still find the cause quickly, because the final answer points to it.',
      'You have to re-run the agent and check steps one by one from the start, which takes much longer.',
      'The agent fixes itself, because it can read its own steps.',
    ],
    answer: 1,
    why: 'In this scripted run the bad result is at step 7. Without a trace you re-check 7 steps from the start (about 35 minutes at the example 5 minutes each). With a trace you follow the wrong number back in 4 steps (about 1 minute).',
  },
  why: [
    'An agent works in a loop: the model decides, a tool runs, the result goes back to the model, and this repeats. A run of 12 steps has 12 places where something can go wrong, and the final answer only shows the end. A tool that returns a wrong value with a "success" status, such as a price that was cached 3 days ago, raises no error. The model trusts it, and every later step builds on it.',
    'A trace is the recording of one run: each step with its input, output, duration and which step it came from. In LangSmith\'s words, a run is one unit of work and a trace is the collection of runs for a single operation, such as a model call, a tool call and a retrieval. With a trace, you start from the wrong number the user saw and follow it back to the step that created it. Here that is 4 steps instead of 7, and you read them instead of rebuilding them.',
    'Without a trace, you re-run the agent and add logging, and only if the run repeats. Models and tools are not always deterministic, so the same bad step may not show up again. OpenTelemetry has a set of generative AI semantic conventions that name common span attributes for model calls and agents, so traces from different tools look alike. Its pages say the conventions have moved to a dedicated repository, and I could not confirm their stability level, so check their current status before you rely on them. The run on this page is a scripted toy; every time and price is invented.',
  ],
  takeaways: [
    'A tool can return a wrong value with an OK status. The agent has no way to know, and the error shows up several steps later.',
    'A trace records every step with its input and output, so you can follow a wrong value back to where it began.',
    'Without a trace you can only rebuild the run from the start, which costs more steps and may not reproduce the failure.',
    'Record traces before you need them. You cannot add them to a run that already happened.',
  ],
  lessons: ['evals/observability-for-llm-apps', 'evals/evaluating-agents', 'rag-agents/agents-and-tool-use'],
  sources: [
    { label: 'LangSmith docs: observability concepts (runs and traces)', url: 'https://docs.langchain.com/langsmith/observability-concepts' },
    { label: 'OpenTelemetry GenAI semantic conventions repository (status not confirmed, check before use)', url: 'https://github.com/open-telemetry/semantic-conventions-genai' },
  ],
  updated: '2026-11-06',
};
