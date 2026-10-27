import type { Extra } from '../lesson-extras';

export const extras_mcp: Record<string, Extra> = {
  'rag-agents/mcp-in-depth': {
    takeaways: [
      'A host owns the conversation and your approvals; it runs one client per server, and each client talks to exactly one server.',
      'A server can offer tools (the model decides), resources (the application decides) and prompts (you decide).',
      'stdio runs the server as a local subprocess with credentials from the environment; Streamable HTTP is one URL with OAuth tokens, an Origin check and no sessions in the 2026-07-28 revision.',
      'A server must only accept tokens issued for it and must never pass them on; a local server runs with your privileges, so show its command and sandbox it.',
      'The spec asks for a human in the loop who can deny a call, and for tool results to be validated before they reach the model.',
    ],
    prereq: ['rag-agents/the-tools-and-ecosystem', 'evals/llm-security'],
    quiz: [
      {
        q: 'In MCP, how many servers does one client talk to?',
        options: ['Exactly one', 'Any number, chosen by the model', 'All the servers the host knows about', 'I don’t know'],
        answer: 0,
        why: 'The host creates one client per server, so each client has a 1:1 relationship with its server. The host, not the server, keeps the whole conversation.',
      },
      {
        q: 'A server exposes a function the model can call to create an issue. Which kind of thing is that, and who decides to use it?',
        options: ['A tool, decided by the model', 'A resource, decided by the application', 'A prompt, decided by the user', 'A client, decided by the host'],
        answer: 0,
        why: 'Tools are model-controlled. Resources are attached by the application, and prompts are picked by the user, for example from a menu.',
      },
      {
        q: 'A server receives an access token that was issued for a different service. What must it do?',
        options: [
          'Reject it, because it must only accept tokens issued for itself',
          'Accept it and forward it to the downstream API',
          'Accept it if the user approved the tool call',
          'I don’t know',
        ],
        answer: 0,
        why: 'Token passthrough is forbidden by the spec: it breaks audience checks and creates confused-deputy and audit problems.',
      },
    ],
  },
};
