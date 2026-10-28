import type { Extra } from '../lesson-extras';

export const extras_agenteval: Record<string, Extra> = {
  'evals/evaluating-agents': {
    takeaways: [
      'Grade the outcome in the environment, such as a row in a database, not the exact sequence of steps and not what the agent says it did.',
      'Pick the grader for the job: code for what can be checked exactly, a model for open-ended quality, a person to calibrate the model grader.',
      'Start with 20 to 50 tasks drawn from real failures, include cases where the agent should do nothing, and give each task a reference solution.',
      'Run each task several times from a clean environment. pass@k asks whether at least one trial worked; pass^k asks whether all did.',
      'Read the transcripts of many trials: a score you have not checked against what actually happened is not yet a measurement.',
    ],
    prereq: ['evals/evals-101', 'evals/llm-as-judge-pitfalls', 'rag-agents/agents-and-tool-use'],
    quiz: [
      {
        q: 'An agent succeeds on a task in 75% of trials. Assuming independent trials, about what is pass^3?',
        options: ['About 42%', 'About 98%', 'About 75%', 'I don’t know'],
        answer: 0,
        why: 'pass^3 is the chance all three trials succeed: 0.75 × 0.75 × 0.75 ≈ 0.42. pass@3, the chance at least one succeeds, would be about 98%.',
      },
      {
        q: 'A refund agent replies "I have refunded you." What should the eval check?',
        options: [
          'That the reply contains the word "refunded"',
          'That a refund of the allowed amount exists once in the database',
          'That the agent called the tools in the same order as the reference run',
          'I don’t know',
        ],
        answer: 1,
        why: 'Grade the outcome in the environment, not the claim and not the route. A reply can say anything, and an exact step order marks a valid alternative path as a failure.',
      },
      {
        q: 'A task has a 0% pass rate across many trials. What does that most often mean?',
        options: ['The agent is not capable enough', 'The task or its grader is probably broken', 'The agent needs a bigger model', 'I don’t know'],
        answer: 1,
        why: 'A 0% pass rate across many trials is most often a sign of a broken task, which is why each task needs a reference solution that proves it can be solved and the graders work.',
      },
      {
        q: 'For a support agent that must handle a refund correctly every time, which measure fits best?',
        options: ['pass@10', 'pass^k', 'Average response time', 'I don’t know'],
        answer: 1,
        why: 'pass^k is the probability that all k trials succeed, so it measures consistency. pass@k only asks for one success in k tries, which suits cases where a person picks the good answer.',
      },
    ],
  },
};
