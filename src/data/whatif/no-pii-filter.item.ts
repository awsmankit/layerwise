import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-pii-filter',
  title: 'What if personal data is not removed before it is logged or used?',
  blurb: 'Twelve made-up chat log lines with fake names, emails, phone numbers and IDs. See what a simple pattern filter catches and misses, and how keeping logs longer for more readers adds up.',
  area: 'responsible',
  level: 'intermediate',
  minutes: 5,
  why: [
    'Chat logs are useful for fixing bugs and improving a product, and they also hold whatever people type: names, emails, phone numbers, account numbers. Personally identifiable information (PII) is any detail that can point to a real person. If the log is stored as it is, every person or system that can read it can read that too, for as long as it is kept, and it may later be copied into a training set, a report or a backup.',
    'A filter that finds PII and replaces it with a tag before storing is called redaction. A simple pattern filter, like the three patterns here (email, a fictional phone block, a customer ID format), is cheap and catches what looks regular. On the 12 made-up lines it catches 9 of 17 personal items, misses 8 (every name, an email spelled out in words, a phone number in words, an ID with a space, an address) and hides one harmless part number by mistake. All data on this page is fake: example.com addresses, 555-01xx numbers and invented names.',
    'OWASP lists sensitive information disclosure as a risk for LLM applications (LLM02:2025). Its mitigations include sanitising data so user data does not enter training, limiting access by least privilege, and clear retention and usage policies. The NIST Privacy Framework is a voluntary tool for managing privacy risk. The lesson is defence in depth: collect less, filter what you can, keep it for a shorter time, let fewer people read it. The exposure score on this page is a toy that multiplies items, days and readers to show that all three levers matter. This is not legal advice.',
  ],
  takeaways: [
    'Unfiltered logs keep every personal detail for as long as the log lives, for everyone who can read it.',
    'A simple pattern filter catches regular things (emails, formatted numbers) and misses names, words and addresses.',
    'Filters make mistakes both ways. Never treat one as a guarantee.',
    'Shorter retention and fewer readers shrink the risk even for what the filter misses.',
  ],
  lessons: ['responsible/privacy-engineering-for-ai', 'responsible/ai-and-your-private-life', 'evals/llm-security'],
  sources: [
    { label: 'OWASP GenAI: LLM02:2025 Sensitive Information Disclosure', url: 'https://genai.owasp.org/llmrisk/llm022025-sensitive-information-disclosure/' },
    { label: 'NIST Privacy Framework', url: 'https://www.nist.gov/privacy-framework' },
  ],
  updated: '2026-11-07',
  predict: {
    question: 'Chat logs are scanned with a simple filter that looks for email, phone and ID patterns, then stored. About how much of the personal information in 12 made-up lines do you think it removes?',
    options: [
      'Almost all of it, because it knows what emails, phone numbers and IDs look like.',
      'About half. It catches regular patterns and misses names, words and addresses.',
      'Very little, because pattern matching almost never works on chat text.',
    ],
    answer: 1,
    why: 'The filter catches 9 of 17 personal items (53 percent) and misses 8, including every name. It also hides 1 harmless part number by mistake.',
  },
};
