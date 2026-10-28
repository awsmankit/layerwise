import type { Extra } from '../lesson-extras';

export const extras_euai: Record<string, Extra> = {
  'evals/eu-ai-act-for-engineers': {
    takeaways: [
      'The Act sorts AI systems by use into four tiers: prohibited, high-risk, transparency and minimal. The same model can land in different tiers.',
      'As of October 2026 the bans, the general-purpose AI model duties and Article 50 transparency already apply; the high-risk rules were pushed to 2 December 2027 (Annex III) and 2 August 2028 (Annex I).',
      'Article 50 means telling people when they talk to AI unless it is obvious, marking generated output in a machine-readable way, and disclosing deepfakes.',
      'An engineer’s first steps are a list of AI systems, a tier for each, logs, a way for a person to step in, and saved evaluation records. This is not legal advice.',
    ],
    prereq: ['evals/evals-101', 'evals/llm-security'],
    quiz: [
      {
        q: 'As of October 2026, from which date do the EU AI Act’s high-risk rules for Annex III use cases (such as employment and education) apply?',
        options: ['2 August 2026', '2 December 2027', '2 February 2025', '2 August 2028'],
        answer: 1,
        why: 'The AI Omnibus, in force since 27 July 2026, moved Annex III high-risk rules to 2 December 2027. High-risk AI built into regulated products (Annex I) moved to 2 August 2028.',
      },
      {
        q: 'You ship a customer-facing chatbot. What does Article 50 mainly ask of its provider?',
        options: [
          'Make sure people know they are dealing with AI, unless that is obvious',
          'Register the chatbot with the AI Office before launch',
          'Switch the chatbot off outside business hours',
          'Remove all generated text from its answers',
        ],
        answer: 0,
        why: 'Providers of systems meant to interact directly with people must design them so users know it is AI, unless it is obvious to a reasonably well-informed person.',
      },
      {
        q: 'Which description of the 2026 delay is correct?',
        options: [
          'The high-risk duties were repealed',
          'The high-risk start dates were moved later, while the bans and Article 50 stayed',
          'Article 50 transparency was also postponed to 2028',
          'The fines were cut in half',
        ],
        answer: 1,
        why: 'The delay is a deferral of the high-risk dates. The prohibitions, the general-purpose AI duties and most Article 50 duties were not pushed back,.',
      },
      {
        q: 'Which kind of breach carries the highest maximum fine?',
        options: ['Using a prohibited AI practice', 'Breaking a transparency duty under Article 50', 'Giving authorities incorrect information', 'Being late with an AI literacy plan'],
        answer: 0,
        why: 'Prohibited practices: up to EUR 35 million or 7% of worldwide turnover, whichever is higher. Most other duties, including Article 50, are up to EUR 15 million or 3%.',
      },
    ],
  },
};
