import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-guardrails',
  title: 'What if there are no guardrails on the model\'s input and output?',
  blurb: 'Run 13 scripted shop chats with and without input and output checks, and see what passes, what is caught, and what a false alarm costs.',
  area: 'agents',
  level: 'intermediate',
  minutes: 5,
  why: [
    'A guardrail is a check that sits in the program around a model, not inside the model. An input check looks at what goes in, for example personal data that should not be sent to the model or written into logs. An output check looks at what comes out, for example a reply that breaks a company rule before a customer sees it.',
    'On this page a toy shop assistant handles 13 made-up exchanges. With no checks, five messages containing personal data go to the model and the logs untouched, and three replies that break the policy reach the customer: a refund promise nobody approved, a medical verdict, and another person\'s address. OWASP lists sensitive information disclosure as a top risk for language-model apps and recommends input validation and sanitisation, and it treats improper output handling as the failure to validate and sanitise model output before it reaches other systems or people.',
    'Checks are not perfect, and the page shows why. The simple rules here miss an email written out in words and a medical verdict phrased in a way no rule lists. They also raise false alarms: an order number that looks like a card number, and a correct reply that happens to contain the word "guarantee". Tighter rules catch more and raise more false alarms. Real systems combine pattern rules, trained classifiers, least privilege, logging and human review, and tune each for the harm a miss could do.',
  ],
  takeaways: [
    'Put checks in the program around the model: one on the way in, one on the way out.',
    'Every check trades misses against false alarms. Count both.',
    'Simple rules only catch what they list. Add layers, and do not rely on one.',
    'Treat the model like any other user of your system: validate what it sends before other code or people rely on it.',
  ],
  lessons: ['evals/guardrails-in-practice', 'evals/llm-security', 'responsible/privacy-engineering-for-ai'],
  sources: [
    { label: 'OWASP GenAI Security Project: LLM02 Sensitive Information Disclosure', url: 'https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/' },
    { label: 'OWASP GenAI Security Project: LLM05 Improper Output Handling', url: 'https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/' },
  ],
  updated: '2026-11-07',
};
