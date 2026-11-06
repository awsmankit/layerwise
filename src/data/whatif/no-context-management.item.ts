import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-context-management',
  title: 'What if an agent never manages its context?',
  blurb: 'Watch a 30-step agent run fill its context window with tool results until the instructions fall off, then see it with old results cleared.',
  area: 'agents',
  level: 'intermediate',
  minutes: 5,
  why: [
    'A model can only look at a limited amount of text at once. That limit is the context window, counted in tokens (a token is a word or a piece of one). An agent adds to the window at every step: its own message, then whatever the tool returned. Tool results are often the biggest part, such as a whole file or a page of search hits.',
    'With no management nothing is ever removed. In this example, with sizes chosen for illustration, the window of 32,000 tokens overflows at step 17. If the program then keeps the newest text and drops the oldest, what falls off first is the instructions and rules at the very start. The agent keeps working but no longer sees "never touch the production folder". Another common outcome is that the call simply fails with an error. Even before the window is full, accuracy can drop as the window grows, which Anthropic\'s engineers call context rot.',
    'Real agents manage the window in three simple ways. They clear old tool results once they are no longer needed, because the raw result is rarely useful deep in the history. They summarise a long conversation and carry on from the summary. They write notes to a file outside the window and read them back when needed. The managed run on this page does the first two: when the window is 75% full it keeps the newest 3 results, replaces older ones with a 25-token stub, and keeps a 500-token summary, while the instructions stay pinned at the front.',
  ],
  takeaways: [
    'Every step adds tokens and nothing removes them unless you design it to.',
    'Tool results are usually the biggest part of the window, and the oldest ones are the least useful.',
    'If the oldest text is cut first, the instructions go first. Pin them.',
    'Clear old results, summarise, or keep notes outside the window, and watch the window size like a budget.',
  ],
  lessons: ['rag-agents/agent-memory-and-context-engineering', 'rag-agents/agents-and-tool-use'],
  sources: [
    { label: 'Effective context engineering for AI agents (Anthropic Engineering)', url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents' },
  ],
  updated: '2026-11-06',
};
