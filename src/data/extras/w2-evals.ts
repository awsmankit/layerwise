import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 2 "evals" batch. */
export const extrasW2Evals: Record<string, Extra> = {
  'evals/building-an-eval-dataset': {
    takeaways: [
      'Start with 20 to 50 real cases you have read closely; scale up with automated graders once you know what matters.',
      'Error analysis is the engine: read transcripts, note the first failure, group the notes, count, and fix the biggest bucket first.',
      'Two labellers should be compared with Cohen\'s kappa, not raw agreement; low kappa usually means a vague rubric.',
      'Keep a held-out set, split by conversation or document, and treat synthetic cases as a starter that real traffic must correct.',
    ],
    prereq: ['evals/evals-101'],
    quiz: [
      {
        q: 'You have no user traffic yet and a deadline. What is the best way to begin an eval set?',
        options: ['Generate 5,000 cases and trust the average', 'Write a few dozen cases from realistic situations, possibly with synthetic help, run them through the real system and read the traces', 'Wait until a competitor publishes a benchmark', 'Skip the dataset and use a judge model with no examples'],
        answer: 1,
        why: 'A small set you actually read finds real failures; volume without reading does not.',
      },
      {
        q: 'In error analysis, what do you do after writing a free-text note on each transcript?',
        options: ['Delete the notes and use a generic helpfulness score', 'Group similar notes into a failure taxonomy and count each category', 'Fine-tune the model on the failures straight away', 'Give each transcript a score from 1 to 10'],
        answer: 1,
        why: 'Grouping and counting shows which failure is biggest, so you know what to fix first.',
      },
      {
        q: 'Two labellers agree on 90 of 100 answers, but 90% of answers are "pass" for both. What does kappa tell you?',
        options: ['It is 0.9, because kappa equals the agreement rate', 'It is moderate, about 0.44, because most of the agreement was expected by chance', 'It is undefined', 'It is always 1 when there is no disagreement about the common label'],
        answer: 1,
        why: 'Chance agreement is 0.9 x 0.9 + 0.1 x 0.1 = 0.82, so kappa = (0.90 - 0.82) / 0.18, about 0.44.',
      },
      {
        q: 'Which split keeps the held-out set honest?',
        options: ['Put five messages from one conversation in both dev and held-out', 'Keep all messages from one conversation or document in the same split, and never tune on the held-out set', 'Tune on the held-out set but only once a day', 'Use the held-out cases as few-shot examples in the prompt'],
        answer: 1,
        why: 'Splitting by the thing that repeats stops dev and held-out sharing answers.',
      },
      {
        q: 'A synthetic set scores 98% but real users complain. Which explanation is most likely?',
        options: ['The synthetic cases are generic and tidy, and miss how real users write and what goes wrong', 'Real users are always wrong', 'The model improves only on weekends', 'Synthetic data cannot be used at all'],
        answer: 0,
        why: 'Synthetic cases tend to be generic and cannot tell you how common failures are in real traffic.',
      },
    ],
  },
  'evals/why-models-make-things-up': {
    takeaways: [
      'Models are trained to produce plausible text, and most benchmarks reward guessing over saying "I don\'t know", so confident wrong answers persist.',
      'Faithfulness asks whether a claim is supported by the supplied source; factuality asks whether it is true in the world. Score claim by claim.',
      'Grounding with good retrieval and permission to abstain have the strongest support; lower temperature is only a partial help.',
      'Every mitigation has a cost, so design the product to make wrong answers visible: show sources and say plainly when the answer is not in them.',
    ],
    prereq: ['llm/prompting-and-structured-output'],
    quiz: [
      {
        q: 'According to Kalai and colleagues (2025), why do hallucinations survive post-training?',
        options: ['Because models have no memory', 'Because most evaluations grade right or wrong and give no credit for abstaining, so guessing is rewarded', 'Because temperature is always too high', 'Because retrieval is never used'],
        answer: 1,
        why: 'Under binary grading a model that guesses scores better than one that admits uncertainty.',
      },
      {
        q: 'A RAG answer says "returns are free for orders over £50", but the retrieved page only says delivery is free over £50. What kind of problem is this?',
        options: ['A faithfulness failure: the claim is not supported by the retrieved text', 'A temperature problem', 'A tokenisation problem', 'No problem, since the claim sounds plausible'],
        answer: 0,
        why: 'The model turned free delivery into free returns, which the source does not say.',
      },
      {
        q: 'Which technique has the weakest evidence as a way to reduce factual errors?',
        options: ['Providing retrieved sources', 'Allowing the model to say it does not know', 'Lowering the sampling temperature', 'Using a calculator tool for arithmetic'],
        answer: 2,
        why: 'Lower temperature reduces variation, not wrongness; one study found no significant accuracy effect from 0.0 to 1.0.',
      },
      {
        q: 'With a wrong-answer penalty of t / (1 - t) and t = 0.75, a wrong answer costs 3 points. At what chance of being right does answering break even?',
        options: ['25%', '50%', '75%', '90%'],
        answer: 2,
        why: 'Break-even is p = t: 0.75 - 0.25 x 3 = 0.',
      },
      {
        q: 'Why track right, wrong and abstained answers instead of only accuracy?',
        options: ['Abstaining always counts as wrong', 'A system can cut wrong answers by refusing everything, which helps nobody', 'Accuracy is impossible to compute', 'Abstentions cannot be logged'],
        answer: 1,
        why: 'Fewer wrong answers is only an improvement if the system still answers what it can.',
      },
    ],
  },
};
