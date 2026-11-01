import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 2 "agents-a" batch. */
export const extrasW2AgentsA: Record<string, Extra> = {
  'rag-agents/designing-tools-for-agents': {
    takeaways: [
      'A tool is read by a model that guesses, so its name, description and parameter schema are prompts. Write them for a new colleague and say when not to use the tool.',
      'Build a few tools around jobs, not one per API endpoint. Namespace them, and do not ask the model for values your code already knows.',
      'Return short, readable results with a size control, and write errors that say what is wrong, what is allowed and what to do next.',
      'Preview and confirm destructive actions and make retries idempotent. Past a few dozen tools selection suffers, so load definitions on demand and measure with realistic tasks.',
    ],
    prereq: ['rag-agents/agents-and-tool-use'],
    quiz: [
      { q: 'An API has endpoints to list users, list events and create an event. What does the lesson suggest for an agent?', options: ['One tool per endpoint, so each is simple', 'A single schedule_event tool that finds availability and books', 'Expose the raw API and let the model work it out', 'Only a create_event tool, with no way to look anything up'], answer: 1, why: 'Higher-level tools that match a task save the model from chaining low-level calls and filling its context with intermediate output.' },
      { q: 'A tool fails because the model passed an email where an ID was needed. Which error message helps the model most?', options: ['Error: 404', 'Request failed', 'No customer with ID "maya@example.com". This tool needs an ID like cus_8f3a21; call search with an email to find one.', 'A full stack trace'], answer: 2, why: 'The MCP specification and the vendors say errors should carry actionable feedback so the model can correct itself and retry.' },
      { q: 'A refund call times out after the refund actually went through, and the model retries. How do you stop a second refund?', options: ['Ask the model not to retry in the prompt', 'Make the operation idempotent, with a key your code derives from the request', 'Lower the temperature', 'Give the model more tools'], answer: 1, why: 'A retry with the same idempotency key returns the first result, so the outcome no longer depends on what the model decides.' },
      { q: 'Your agent has 60 tools and often picks the wrong one. What do the vendors suggest?', options: ['Add more detail to every tool until it fits the window', 'Remove all descriptions to save tokens', 'Cut overlapping tools and load definitions on demand with tool search', 'Switch to a larger context window and change nothing else'], answer: 2, why: 'Guidance of about 10 to 20 tools at once, and Anthropic’s note that selection degrades past 30 to 50, point to fewer tools or loading them only when needed.' },
      { q: 'After rewriting your tool descriptions, how do you know they are better?', options: ['They are longer', 'A colleague says they read well', 'Run realistic tasks before and after, compare results and read the transcripts', 'The model says it understands them'], answer: 2, why: 'Anthropic’s process is to measure on realistic tasks and read transcripts, because what a model says about its own confusion is not reliable.' },
    ],
  },
  'rag-agents/agent-memory-and-context-engineering': {
    takeaways: [
      'The context window is a budget. More tokens can mean worse recall (context rot), and information in the middle is used less reliably than at the start or end.',
      'Short-term memory is the thread, working memory is notes outside the window, and long-term memory is facts, episodes and instructions retrieved on demand. Memory is written by the agent and changes, unlike a RAG corpus.',
      'Truncation, compaction, clearing tool results, notes files, sub-agents and just-in-time retrieval each trade tokens for lost detail, so pin the rules that must survive.',
      'Memory fails by lossy summaries, stale facts, poisoning, wrong-user leakage and privacy. Test with planted facts, updates, deletions, isolation and injection probes.',
    ],
    prereq: ['rag-agents/agents-and-tool-use', 'llm/context-window-and-caching'],
    quiz: [
      { q: 'What separates agent memory from RAG?', options: ['Memory never uses embeddings', 'Memory is written by the agent or app from its own interactions and changes over time, while a RAG corpus is written by others beforehand', 'RAG is only for images', 'There is no difference'], answer: 1, why: 'Both retrieve into the window, but memory needs decisions about what to store, update and delete.' },
      { q: 'An agent summarises its history twice during a long run. What is a typical risk?', options: ['The summary gets longer each time', 'Details are lost, because the second summary is a summary of a summary', 'The model forgets how to use tools', 'Nothing, summaries are lossless'], answer: 1, why: 'Anthropic warns that over-aggressive compaction can drop context whose importance appears later, so pin rules that must survive.' },
      { q: 'In the simulator, why can the notes-file strategy still fail a later question?', options: ['The file is too large for the window', 'The agent only keeps what it chose to write down, and it did not note the fact', 'Notes are deleted at turn 20', 'The model cannot read files'], answer: 1, why: 'Notes are only as good as the agent’s choices, so the prompt should say what to note: rules, decisions and changed values.' },
      { q: 'Which is a sensible defence against memory poisoning?', options: ['Trust anything the agent writes to memory', 'Let tool results write rules directly', 'Record where each entry came from, treat memory as untrusted data, and review high-impact entries', 'Make the memory larger'], answer: 2, why: 'Poisoned memory persists into later sessions, so provenance and a permission boundary matter more than a stern prompt.' },
      { q: 'Which test checks that a stale fact does not win?', options: ['Change a stored fact, then check the agent uses the new value', 'Ask the same question ten times', 'Count the tokens in the notes file', 'Raise the temperature'], answer: 0, why: 'An update test plants a fact, changes it and checks that the newer value is used.' },
    ],
  },
};
