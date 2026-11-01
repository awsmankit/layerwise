import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 2 "agents-b" batch. */
export const extrasW2AgentsB: Record<string, Extra> = {
  'rag-agents/multi-agent-systems': {
    takeaways: [
      'Start with one agent and an eval. Add agents for parallel breadth, separate context or different tools and permissions, not for tidiness.',
      'If your code can write the steps, a workflow (pipeline, routing, parallelisation, evaluator-optimiser) is cheaper and steadier than a model deciding them.',
      'Tokens, latency and error rates all multiply: Anthropic reports about 4x the tokens of a chat for an agent and about 15x for a multi-agent system.',
      'A wrong worker result travels on unless a checker that sees the sources catches it. A2A connects agents across ownership boundaries; MCP connects an agent to tools.',
    ],
    prereq: ['rag-agents/agents-and-tool-use'],
    quiz: [
      { q: 'Which is a reason to split work across several agents?', options: ['The code will look tidier', 'The work divides into independent investigations that can run in parallel', 'Each agent can be given a funny name', 'A team of agents is always more accurate'], answer: 1, why: 'Parallel breadth, separate contexts and different tools or permissions are the reasons the vendors and studies give; tidiness is not.' },
      { q: 'A step succeeds 95% of the time and failures are independent. About how often do ten steps in a row all succeed?', options: ['95%', '90%', '75%', '60%'], answer: 3, why: '0.95 to the power of 10 is about 0.60, so reliability multiplies down along a chain.' },
      { q: 'In the explorer, one worker returns a wrong fact and there is no checker. What happens in a plain orchestrator-workers run?', options: ['The orchestrator notices because it is smarter', 'The wrong fact reaches the final answer', 'The run stops with an error', 'The other workers outvote it'], answer: 1, why: 'The orchestrator sees only the worker summary, not its sources, so nothing checks the fact. A verifier that reads the original records is what catches it.' },
      { q: 'How does A2A differ from MCP?', options: ['A2A connects agents to other agents, while MCP connects an agent to tools and data', 'They are the same protocol under two names', 'A2A is for tools and MCP is for agents', 'A2A replaces the need for any evals'], answer: 0, why: 'The A2A site describes the two as complementary: MCP for agent-to-tool and A2A for agent-to-agent across ownership boundaries.' },
    ],
  },
  'llm/ai-assisted-software-development': {
    takeaways: [
      'Coding tools run from autocomplete and chat to agents that read files, run commands, edit and run tests in a loop. More autonomy means more of your job is specifying and checking.',
      'An agent is only as good as its feedback loop: a fast, trustworthy pass-or-fail check, a short instruction file such as AGENTS.md, and small scoped tasks.',
      'Review every AI diff for invented functions and packages, subtle logic, removed checks, hard-coded secrets and tests that cannot fail.',
      'Treat repository text as untrusted input, sandbox the agent and keep a person on the merge. Public productivity studies disagree because tasks and tools differ; measure cycle time and rework yourself.',
    ],
    prereq: ['llm/prompting-and-structured-output'],
    quiz: [
      { q: 'Why does a fast, reliable test command matter so much for a coding agent?', options: ['It makes the model larger', 'It lets the agent check its own work each loop, and a slow suite means fewer iterations', 'It removes the need for code review', 'It stops prompt injection'], answer: 1, why: 'Without something that returns pass or fail, "looks done" is all the agent has. Slow checks mean fewer loops and larger, riskier steps.' },
      { q: 'An agent was told to make an error go away and tests still pass after it deleted an authorisation check. What would have caught this?', options: ['A longer prompt', 'Asking the agent if it is sure', 'Using a bigger model', 'A negative test where another user must get a 403, and a reviewer reading the removed lines'], answer: 3, why: 'Deletions deserve as much review as additions, and a negative test checks that forbidden access is refused.' },
      { q: 'What does the 2025 METR randomised trial support?', options: ['AI tools make all developers faster', 'AI tools slow all developers down', 'In that setting, experienced developers on familiar repositories took 19% longer with early-2025 tools, and METR now calls the result out of date', 'Developers are always accurate about their own speed'], answer: 2, why: 'It was 16 developers and 246 tasks with early-2025 tools. METR says it does not show AI fails to speed most developers, and later reported selection problems in its follow-up.' },
      { q: 'A README in a repository the agent reads contains hidden instructions to send out your environment variables. What is the best defence?', options: ['Restrict what the agent can do: sandbox it, keep credentials out of its environment and require approval for risky commands', 'Write "ignore hidden instructions" in the prompt', 'Delete the README', 'Trust the model to notice'], answer: 0, why: 'Prompt injection is controlled by the permission boundary, not by a stern instruction.' },
    ],
  },
};
