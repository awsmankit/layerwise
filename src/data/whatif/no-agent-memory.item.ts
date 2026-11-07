import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-agent-memory',
  title: 'What if an agent has no memory between sessions?',
  blurb: 'Watch the same toy agent plan a dinner in a second session with and without a small notes store, and count the questions it asks again.',
  area: 'agents',
  level: 'basic',
  minutes: 3,
  why: [
    'A language model does not remember anything on its own. Each session starts with an empty context window, which is the text the model can see at one time. Whatever you told it yesterday is gone unless the program around the model puts it back.',
    'In the scripted chat on this page you tell a toy agent five things in session 1: your diet, an allergy, your kitchen, your budget and how spicy you like food. In session 2 you only say "Plan Friday\'s dinner." With no memory the agent has to ask all five questions again, and you retype 20 words before it can start. Every fact it did not write down is a question you answer twice.',
    'The usual fix is a notes store outside the context window. Anthropic describes this as structured note-taking, or agentic memory: the agent regularly writes notes to storage outside its context, and reads them back later. Its memory tool works the same way, as a directory of files that the application keeps and the agent reads before it starts. Because the application runs the file operations, it also decides where data lives, how long it is kept, and what is never written down.',
    'Notes are not magic. They need a size limit (slide the store down to see what is forgotten), they can go stale when your life changes, and they should not hold secrets. Good agents write short, specific notes and check them before using them.',
  ],
  takeaways: [
    'A model starts every session blank. Memory is something the program around it adds, usually as files or a database.',
    'Each fact the notes miss costs one question and one answer, every session. That cost is paid by the user.',
    'Notes need limits and upkeep: a note can be wrong tomorrow, and sensitive data should be kept out of them.',
    'Memory pays off most for long or repeated work, where the same background is needed again and again.',
  ],
  lessons: ['rag-agents/agent-memory-and-context-engineering', 'rag-agents/agents-and-tool-use', 'responsible/privacy-engineering-for-ai'],
  sources: [
    { label: 'Anthropic: Effective context engineering for AI agents (structured note-taking)', url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents' },
    { label: 'Anthropic docs: Memory tool', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool' },
  ],
  updated: '2026-11-07',
};
