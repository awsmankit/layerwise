import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-approval-gate',
  title: 'What if an agent can act without asking a person?',
  blurb: 'Step through a scripted agent run where a line planted in a document triggers an irreversible action, with and without an approval gate.',
  area: 'agents',
  level: 'intermediate',
  minutes: 4,
  why: [
    'An agent is a language model that can take actions through tools: read files, send messages, delete things. A model reads everything in its context as text, and it cannot reliably tell your instructions apart from words that merely appear in a document, a web page or an email it was asked to handle. Security people call this prompt injection, and when the words come from outside content it is called indirect prompt injection.',
    'In the scripted run on this page, the agent is asked only to summarise a document. Someone else wrote a line into that document telling the agent to delete a backup folder. Without a gate the agent has the power to do it, so it does, and the files cannot be recovered. The page describes the line instead of printing it, because the point is the defence, not the wording.',
    'An approval gate is a rule in the surrounding program, not in the model: actions that cannot be undone wait for a person. Reads and undoable writes still run on their own, so the agent stays useful. OWASP lists "excessive agency" (too much functionality, permissions or autonomy) as a risk and names human approval for high-impact actions as a key control, together with least privilege and checks in the downstream system.',
    'A gate is not magic. Try "Approve without looking": a person who clicks through every request gives the same result as no gate. A good request says in plain words what will happen, how big it is, that it cannot be undone and who asked for it.',
  ],
  takeaways: [
    'Text the agent reads can act like instructions. Treat every document, page and email as untrusted input.',
    'Put the check in the program around the model, on actions that cannot be undone. Do not rely on the model to refuse.',
    'Combine the gate with least privilege: an agent that cannot delete backups needs no approval to not delete them.',
    'An approval request must show what will happen and who asked, or people will approve by habit.',
  ],
  lessons: ['systems/human-in-the-loop-design', 'evals/llm-security', 'rag-agents/agents-and-tool-use'],
  sources: [
    { label: 'OWASP GenAI Security Project: LLM06 Excessive Agency', url: 'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/' },
    { label: 'OWASP GenAI Security Project: LLM01 Prompt Injection', url: 'https://genai.owasp.org/llmrisk/llm01-prompt-injection/' },
  ],
  updated: '2026-11-06',
};
