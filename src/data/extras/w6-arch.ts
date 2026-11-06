import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the wave 6 "choosing an agent architecture" lesson. */
export const extrasW6Arch: Record<string, Extra> = {
  'rag-agents/choosing-an-agent-architecture': {
    takeaways: [
      'Start with the simplest style that works, and add structure only when you can name the failure it fixes. The model does the same job in all six; what changes is who controls the flow, where state lives and what you can test.',
      'If you can list the steps, write a fixed workflow. Use an agent loop when the steps depend on what the model finds, and cap turns and spend in code.',
      'A graph or state-machine runtime saves state as checkpoints so a run can wait days for a person or survive a restart. Steps near a pause must be safe to repeat.',
      'An agent harness is the scaffold around the model: loop, tools and permissions, context, notes, sandbox, approvals, tracing and limits. It is not an eval harness, and a framework is only a library of parts you can build one from.',
    ],
    prereq: ['rag-agents/agents-and-tool-use', 'rag-agents/multi-agent-systems'],
    quiz: [
      {
        q: 'A refund bot has fixed steps: classify, look up the order, draft a reply. Nobody has seen it fail. Which style does the lesson suggest?',
        options: ['A multi-agent system, to be safe', 'A fixed workflow, because you can list the steps', 'An agent loop, so it can adapt', 'A full harness with a sandbox'],
        answer: 1,
        why: 'When you can write the steps down, code should run them: it is cheaper, steadier and easier to test than a model choosing.',
      },
      {
        q: 'An approval may take three days, and the server redeploys during the wait. Which style fits best?',
        options: ['A single model call', 'A bare agent loop held in memory', 'A graph runtime that saves state as checkpoints', 'More agents'],
        answer: 2,
        why: 'A graph runtime with a durable store can pause at an interrupt and resume later. A loop in memory loses its history on restart and repeats work.',
      },
      {
        q: 'In this lesson, what is an agent harness?',
        options: ['The code that runs test cases against a model', 'The scaffold around the model: loop, tools and permissions, context management, sandbox, approvals, tracing and limits', 'Any library with the word agent in its name', 'The model weights plus the prompt'],
        answer: 1,
        why: 'That is the runtime sense. The other sense, an eval harness, runs tests and is covered in the evals lessons.',
      },
      {
        q: 'In the worked example the agent loop cost $0.0306 a request and the fixed workflow $0.0087 (example figures). What mainly explains the gap?',
        options: ['The loop uses a bigger model', 'The loop makes five calls and each resends a longer history', 'Graphs are always cheaper than loops', 'Tool calls are billed at a higher rate'],
        answer: 1,
        why: 'Five calls with a growing context used 8,100 input tokens against 1,900, about 4.3 times as many. The price was set by the model choosing, not by a different rate.',
      },
      {
        q: 'Your task is open-ended and one part needs different permissions from the rest. What is the best reading of the lesson?',
        options: ['Use a multi-agent setup only if one agent with the right tools fails your evals', 'Always split into agents as soon as permissions differ', 'Never use more than one agent', 'Move everything into one big prompt'],
        answer: 0,
        why: 'Separate contexts or permissions are a valid reason for more than one agent, but the default is one agent, and you compare against that baseline before paying for more.',
      },
    ],
  },
};
