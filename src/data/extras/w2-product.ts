import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 2 "product" batch. */
export const extrasW2Product: Record<string, Extra> = {
  'systems/when-not-to-use-an-llm': {
    takeaways: [
      'Start from the user job and the cost of being wrong, not from the technology.',
      'Climb the ladder one rung at a time (a person, code and rules, search, a trained model, one LLM call, an agent) and stop at the first rung that meets the bar.',
      'Compare options on total cost: running cost, plus the cost of mistakes, plus upkeep. The winner changes with volume and with what a mistake costs.',
      'Plan the human check and the fallback before you ship, and count the hidden costs: evals, monitoring, latency, tokens, privacy, vendor risk and rework when models change.',
    ],
    prereq: ['llm/prompting-vs-rag-vs-fine-tuning'],
    play: [{ label: 'Play Cost Crunch', href: '/play/cost-crunch/' }],
    quiz: [
      {
        q: 'A tool must confirm that the line items on an invoice add up to the stated total. Which rung fits best?',
        options: ['An agent with a calculator tool', 'One LLM call', 'Plain code that adds the numbers', 'A fine-tuned classifier'],
        answer: 2,
        why: 'Adding numbers is exact arithmetic. Code gives the same correct answer every time, for almost nothing, and a model can get a sum wrong.',
      },
      {
        q: 'In the ticket-routing example, rules are 71% accurate, a small classifier 88% and an LLM 91%. When does the LLM have the lowest total monthly cost?',
        options: ['Always, because it is the most accurate', 'Never, because it costs the most per ticket', 'Only when the tickets are very short', 'When volume is high and a misrouted ticket is costly enough to pay for its higher running cost and upkeep'],
        answer: 3,
        why: 'Total cost adds running cost, mistakes and upkeep. At 100,000 tickets and 80 cents a mistake the LLM wins; at 10 cents the classifier does.',
      },
      {
        q: 'Twenty customer feedback emails arrive each month and need a topic tag. What does the lesson recommend?',
        options: ['A person tags them by hand', 'An LLM pipeline with evals and monitoring', 'A fine-tuned model', 'An agent that reads the inbox'],
        answer: 0,
        why: 'At that volume the build, evals and upkeep of any automation cost more than ten minutes a month of tagging.',
      },
      {
        q: 'Which is the best description of a useful fallback for an LLM feature?',
        options: ['Retry the same call until it works', 'Hide the error from the user', 'Switch to a bigger model every time', 'A chain that ends in a plain rule or a person, such as "I am not sure, let me get a colleague"'],
        answer: 3,
        why: 'A fallback is what happens when the model is slow, wrong or down. The chain should end somewhere dependable, often a person.',
      },
    ],
  },
  'llm/choosing-and-comparing-models': {
    takeaways: [
      'Filter on hard constraints first (licence, residency, privacy terms, context, modalities, price, latency), shortlist about three, then test them on your own cases.',
      'Benchmarks mislead through contamination, saturation, prompt sensitivity, cherry-picked settings and not being your task. Arena ratings are noisy: a gap inside the error bars means nothing.',
      'Votes measure preference, which includes style, so narrow bars can surround the wrong thing. Compare on the same cases, with cost and latency beside quality.',
      'Read the actual licence or terms for the exact model, version and channel; pin the version, log the model and rerun your eval, because models are retired.',
    ],
    prereq: ['llm/prompting-and-structured-output'],
    quiz: [
      {
        q: 'Model A is truly 20 Elo points stronger than model B. Roughly how many head-to-head votes does it take before the 95% interval on the gap is narrower than the gap itself?',
        options: ['About 50', 'About 200', 'About 1,160', 'About 100,000'],
        answer: 2,
        why: 'The lesson computes about 1,160 votes for a 20-point gap, and about four times as many for a 10-point gap, because the interval shrinks with the square root of the votes.',
      },
      {
        q: 'Two models sit 8 points apart on a leaderboard and their error bars overlap. What is the sound reading?',
        options: ['The upper one is better', 'The lower one is better', 'The leaderboard cannot tell them apart', 'Both are broken'],
        answer: 2,
        why: 'A gap inside the error bars is consistent with no difference at all, and repeated experiments would often reverse the order.',
      },
      {
        q: 'Controlling for answer length and markdown changed some Arena rankings. What does that show?',
        options: ['Votes measure preference, which includes style, not only correctness', 'The votes were fake', 'Longer answers are always better', 'Elo cannot be computed'],
        answer: 0,
        why: 'A model that writes longer, tidier answers can win votes without being more accurate, so more votes tighten the bars around preference, not quality.',
      },
      {
        q: 'Which statement about licences and provider terms is the safest approach?',
        options: ['Assume the licence from the model family name', 'Read the text for the exact model, version and channel, and have the right person check it', 'Trust the leaderboard entry', 'Open weights always means open source'],
        answer: 1,
        why: 'Licences differ between versions and between a maker API and a cloud platform. Open weights are not the same as open source under the OSI definition.',
      },
      {
        q: 'Why should you pin an exact model version and log the model ID with every trace?',
        options: ['It makes the model faster', 'Providers retire models and can change behaviour between versions, so you need to tie a quality change to a model change', 'It lowers the price', 'It is required by every licence'],
        answer: 1,
        why: 'Retirement and version changes are routine, so a pinned version and a logged model ID let you find and fix a regression.',
      },
    ],
  },
};
