import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-tool-error-handling',
  title: 'What if tool errors are not handled?',
  blurb: 'Run 20 tasks against a flaky tool with and without error handling, and count how many finish correctly as the failure rate rises.',
  area: 'agents',
  level: 'intermediate',
  minutes: 4,
  why: [
    'An agent calls tools, and tools fail: a call times out, a service returns an error, or it says "too many requests". Handling means deciding in advance what the agent does next.',
    'On this page 20 small tasks each need one call to a toy tool that fails at a rate you choose. With nothing handled, the three kinds of failure go three bad ways. A timeout leaves the agent hanging until the run is killed. An error reply is treated as if it were an answer, so the agent makes up a result that looks real. "Too many requests" makes it ask again at once until it runs out of steps. At a 30% failure rate only 13 of 20 tasks finish correctly, and four of the failures look like successes.',
    'With handling, the agent waits and tries again, with a growing wait of 1, 2 then 4 seconds. Waiting is called backoff, and real systems add a little randomness, called jitter, so many clients do not retry in step. If the tool is still failing, the agent uses a labelled backup such as a cached copy, or says so and asks the person. At the same 30% rate 19 of 20 finish correctly, and the 20th stops honestly instead of guessing.',
    'Anthropic\'s tool-use docs say to return tool errors to the model with an error flag and an instructive message, such as what failed and what to try next. The AWS Builders\' Library adds the limits: set timeouts, cap the number of retries, retry in one place only, and only retry calls that are safe to repeat, because a timeout does not prove the first call failed.',
  ],
  takeaways: [
    'Tools will fail. Decide in advance what the agent does for a timeout, an error reply and a rate limit.',
    'The worst failure is the quiet one: an error treated as an answer looks exactly like a success.',
    'Retry with a growing wait and a cap. Retrying at once makes an overloaded tool worse.',
    'Have a last resort that is honest: a labelled backup, or asking the person.',
  ],
  lessons: ["rag-agents/designing-tools-for-agents", "rag-agents/agents-and-tool-use", "systems/model-routing-and-fallbacks"],
  sources: [
    { label: 'Anthropic docs: Handle tool calls (errors and is_error)', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls' },
    { label: 'Anthropic Engineering: Writing effective tools for agents', url: 'https://www.anthropic.com/engineering/writing-tools-for-agents' },
    { label: 'AWS Builders\' Library: Timeouts, retries and backoff with jitter', url: 'https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter' },
  ],
  updated: '2026-11-07',
};
