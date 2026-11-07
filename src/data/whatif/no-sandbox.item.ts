import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-sandbox',
  title: 'What if agent-written code runs directly on your machine?',
  blurb: 'See which folders and servers a buggy command can reach on a made-up laptop with and without a sandbox, and what a too-wide permission rule does.',
  area: 'agents',
  level: 'intermediate',
  minutes: 4,
  why: [
    'A coding agent writes commands and runs them. Code the agent wrote is code nobody has reviewed, and it will sometimes be wrong. Without isolation the command runs as you, so it can change any file your account can change and contact any server your machine can reach.',
    'The page uses a made-up laptop and one buggy cleanup command: it should delete old files in a build folder, but a mistake in the path points it at the whole home folder. With no sandbox it deletes 2,370 files, including photos, invoices and made-up key files, instead of the 310 it was meant to. The command is described in words on purpose: the point is the blast radius, not the command.',
    'A sandbox gives the process a short permission list instead of your whole account. Anthropic describes two layers for its Claude Code sandbox: filesystem isolation, which limits which directories can be read or changed, and network isolation, which limits which servers can be contacted. It says both are needed, because without network isolation a compromised agent could send sensitive files out, and without filesystem isolation it could escape the sandbox. OWASP\'s guidance on excessive agency says the same in other words: give an agent only the tools and permissions it needs.',
    'A sandbox is only as small as its rules. Try the "Plus write home" option: one convenient wide rule and the full damage is back. Real setups also deny secrets such as key files explicitly, and keep data that matters in version control or backups.',
  ],
  takeaways: [
    'Code an agent wrote should run with the least access it needs, not with your whole account.',
    'Isolate both files and network. Either one alone leaves a gap.',
    'A wide allow rule can undo a sandbox. Start from nothing and add only what the task needs.',
    'A sandbox limits the damage of a mistake. It does not make the code right, so keep backups and review what matters.',
  ],
  lessons: ['rag-agents/agents-and-tool-use', 'rag-agents/computer-use-and-browser-agents', 'evals/llm-security'],
  sources: [
    { label: 'Anthropic Engineering: Making Claude Code more secure and autonomous with sandboxing', url: 'https://www.anthropic.com/engineering/claude-code-sandboxing' },
    { label: 'OWASP GenAI Security Project: LLM06 Excessive Agency', url: 'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/' },
  ],
  updated: '2026-11-07',
};
