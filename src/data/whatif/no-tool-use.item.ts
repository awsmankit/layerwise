import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-tool-use',
  title: 'What if the model cannot use tools?',
  blurb: 'Ask a scripted stand-in model for today\'s date, a sum and an order status, with and without tools, and see which answers are true.',
  area: 'agents',
  level: 'basic',
  minutes: 3,
  why: [
    'A language model is a text predictor. It was trained on text up to some day, it has no clock, no calculator and no access to your files or databases. Asked for something it cannot know, it still writes the most likely-sounding answer, in the same confident voice as a correct one.',
    'A tool is a small function the program offers to the model, for example "get the date", "calculate" or "find an order". When the model needs one, it does not run it. It writes a structured request, the surrounding program runs the function, and the result goes back into the conversation. The model then writes its answer from that result instead of from memory.',
    'The three questions on this page are a scripted toy. The stand-in model invents a stale date, a sum whose last three digits are wrong, and a shipping status it never saw. Real models are better at many of these, but the gap is the same: anything that depends on the present moment, exact arithmetic or private data should come from a tool, not from memory.',
  ],
  takeaways: [
    'A model that cannot check will still answer, and a wrong answer sounds just as sure as a right one.',
    'Dates, exact sums and lookups in your own data are the classic jobs for a tool.',
    'The model asks for a tool call. Your program runs it and sends the result back. The model never runs anything itself.',
    'A tool result is only as good as the tool, so test the tool as well as the model.',
  ],
  lessons: ['rag-agents/agents-and-tool-use', 'evals/evaluating-agents'],
  sources: [
    { label: 'Tool use with Claude (Anthropic documentation)', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview' },
  ],
  updated: '2026-11-06',
};
