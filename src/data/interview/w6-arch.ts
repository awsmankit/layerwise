import type { Question } from './types';

/**
 * Interview questions on choosing an agent architecture. Every worked number was recomputed in a scratch script.
 * Prices, rates and costs are labelled examples (the same example figures as the lesson), not real quotes.
 * Product facts are hedged and tied to the lesson that cites them.
 */
export const questionsArch: Question[] = [
  {
    id: 'agent-harness-two-meanings-and-framework',
    prompt:
      'A colleague says, “We need a better harness.” Another asks whether you would use a framework or build your own. What can “harness” mean here, what is the difference between a framework and a harness, and how do you find out which one they mean?',
    roles: ['ai-eng', 'agentic-eng'],
    level: 'junior',
    kind: 'concept',
    topics: ['agents', 'harness', 'frameworks', 'terminology'],
    minutes: 10,
    strong: [
      'Gives the two senses: the runtime scaffold around a model that makes it a working agent, and an eval harness that runs test cases against a model or agent and scores the results. Asks which one is meant before answering.',
      'Lists what a runtime harness contains: the agent loop, tool definitions and permissions, context management and compaction, memory or notes outside the window, a sandbox for running code, approvals and hooks, tracing, and retries and limits.',
      'Says a framework is a library of parts (model connections, tool helpers, a loop, hand-offs) while a harness is a whole working scaffold you configure, and a framework can help you build one. Notes that vendors use the words loosely, so you ask what a product provides rather than trusting its label.',
      'Says the model does not touch the machine: the harness decides which of the model’s requested actions run, so permissions and limits belong in the harness, not in the prompt.',
      'Knows a harness encodes assumptions about what the model cannot do alone (for example resetting context for a model that wraps up early), and that those assumptions can go stale when the model changes, so you re-run evals and re-examine it.',
      'Says to start from plain model API calls or an existing harness, and to build your own only when you can name what the existing one cannot do.',
    ],
    followUps: [
      {
        q: 'Your team wants to add “a harness” to run regression tests on prompts. Which sense is that, and what does it need?',
        lookFor: 'Names it as an eval harness: a fixed set of test cases, a way to run the system on them, graders that score the outputs, and a stored baseline to compare against. Does not confuse it with the runtime scaffold.',
      },
      {
        q: 'A framework hides the exact prompt it sends. Is that a problem?',
        lookFor: 'Yes for debugging and for cost, because you cannot see or tune what the model receives. Says to log the real requests, or to call the API directly where the hidden layer is the problem, and treats it as a trade-off against faster setup.',
      },
      {
        q: 'The model provider ships a stronger model. What do you do with your harness?',
        lookFor: 'Re-runs the eval set on the new model with the old harness, then removes harness pieces that no longer pay for themselves (and adds any that new capabilities allow), one change at a time, with evals as the judge.',
      },
    ],
    redFlags: [
      'Treats “harness” as one fixed thing and never asks which sense is meant.',
      'Says a framework and a harness are the same, or that a framework makes the system safe by itself.',
      'Puts permission rules only in the system prompt.',
      'Never mentions evals when the harness or the model changes.',
    ],
    lessons: ['rag-agents/choosing-an-agent-architecture', 'rag-agents/agents-and-tool-use', 'evals/evaluating-agents'],
  },
  {
    id: 'pick-architecture-refund-bot-with-approval',
    prompt:
      'A shop wants a support bot that looks up an order and asks a person to approve a refund before it is issued. The steps are the same every time. Choose an architecture and defend it against a colleague who wants “a proper agent”. Use these example numbers: a fixed workflow makes 2 model calls (1,900 input and 200 output tokens in all), an agent loop makes 5 calls (8,100 input and 420 output tokens), at $3 per million input and $15 per million output tokens, for 10,000 requests a day.',
    roles: ['ai-eng', 'agentic-eng'],
    level: 'mid',
    kind: 'estimation',
    topics: ['agents', 'workflows', 'cost', 'architecture'],
    minutes: 15,
    strong: [
      'Recommends a fixed workflow first, because the steps are known, so code can run them: classify, look up the order, draft the reply and a refund proposal, send it to a person for approval, then send. The model is used where language is needed, and no model decides the order of steps.',
      'Computes the workflow cost: 1,900 × $3 per million is $0.0057, and 200 × $15 per million is $0.0030, so $0.0087 a request and $87 for 10,000 requests.',
      'Computes the loop cost: 8,100 × $3 per million is $0.0243, and 420 × $15 per million is $0.0063, so $0.0306 a request and $306 for 10,000. That is about 3.5 times the workflow, or $219 more a day.',
      'Explains why the loop costs more even at the same price per token: five calls, and each call resends a longer history (about 4.3 times the input tokens). The price was set by the model’s choices, not by a different rate.',
      'Names the failure each extra piece would fix before adding it: a graph runtime only if the approval must wait days or survive a redeploy, an agent loop only if the steps stop being listable, and never because it is fashionable.',
      'Makes the refund safe whatever the style: the refund is a tool that needs approval, it is idempotent so a retry cannot pay twice, and a person sees the facts the bot used. Says example figures must be replaced by measurements on real tasks.',
    ],
    followUps: [
      {
        q: 'The colleague says the agent loop will handle odd cases better. How do you test that claim?',
        lookFor: 'Builds an eval set of real and awkward cases, runs both styles several times each, and compares task success, cost per solved task and delay. Only switches if the loop passes cases the workflow fails and the extra cost is worth it.',
      },
      {
        q: 'Customers start asking things outside the five steps, such as changing the delivery address. What changes?',
        lookFor: 'Adds a router step that labels the request and sends it down a fixed branch, so the workflow grows by branches rather than becoming an agent. Moves to a loop for only the part that stays open-ended.',
      },
      {
        q: 'The approver often takes two days. Does your design still hold?',
        lookFor: 'Notes that a plain script would have to save and reload its own state, and that a graph or other durable runtime exists for this. Chooses based on how much saving and resuming code you would otherwise write, and keeps steps safe to repeat.',
      },
    ],
    redFlags: [
      'Picks an agent loop without naming what a workflow would fail at.',
      'Cannot compute cost per request from token counts and a price.',
      'Lets the model issue the refund with no approval or no idempotency.',
      'Treats the example figures as real prices or as a benchmark.',
    ],
    lessons: ['rag-agents/choosing-an-agent-architecture', 'rag-agents/agents-and-tool-use', 'cost/where-the-tokens-go'],
  },
  {
    id: 'durable-approval-wait-and-restart-design',
    prompt:
      'An agent drafts a refund and then waits for a human approval that can take hours or days. Your service redeploys several times a day. Design how the run survives, what must be true about each step, and what a naive in-memory loop would cost on a restart. Use these example numbers: the first three model calls of the run used 3,800 input and 220 output tokens in all, at $3 per million input and $15 per million output, and 500 requests a day overlap a restart.',
    roles: ['agentic-eng', 'ai-lead'],
    level: 'senior',
    kind: 'design',
    topics: ['agents', 'durable execution', 'human in the loop', 'reliability'],
    minutes: 20,
    strong: [
      'Saves the run’s state outside the process at each step (a checkpoint under a run or thread id in a durable store), so a restart resumes at the approval instead of starting again. Notes that an in-memory store is lost when the process restarts, so production needs a durable one.',
      'Models the approval as a real pause, not a sleeping process: the run stops at an interrupt, the request goes to a person or queue, and a later decision resumes the same run. Says the wait should not hold a server, a connection or a context window open.',
      'Says that on resume a step may run again from its start (as the LangGraph interrupt documentation describes for a node, as of November 2026, to be checked for the version in use), so anything before the pause must be safe to repeat: idempotency keys, no duplicate messages, no duplicate refunds.',
      'Computes the naive cost: 3,800 × $3 per million is $0.0114, and 220 × $15 per million is $0.0033, so $0.0147 per repeated start, which is $7.35 a day for 500 requests. Notes this is the cheap part: the larger risks are double side effects and lost approvals.',
      'Handles the approval itself: expiry, who may approve, an audit record of what the approver saw, and what happens on reject or timeout. The approver sees the facts, not only the model’s summary.',
      'Chooses between building this yourself with a database and a queue, using a graph runtime, or a workflow engine for long waits, based on how much of the saving, resuming and testing you would otherwise write. Does not claim any one product is required.',
    ],
    followUps: [
      {
        q: 'The decision arrives after a deploy that changed the prompt and the state shape. What happens to the paused runs?',
        lookFor: 'Versions the saved state, writes migrations or keeps old code paths until old runs finish, and tests resuming a run saved by the previous version. Does not assume paused runs match the new code.',
      },
      {
        q: 'A refund tool call succeeds, then the process crashes before the state is saved. What now?',
        lookFor: 'Says approval does not guarantee exactly-once execution. Uses an idempotency key derived from the request so the retry returns the first result, and records the outcome before moving on where possible.',
      },
      {
        q: 'Checkpoints pile up on long conversations. Why does that matter, and what do you do?',
        lookFor: 'Storage and latency grow with checkpoint count, so you set a retention policy or prune old checkpoints, while keeping enough to resume and to audit.',
      },
    ],
    redFlags: [
      'Keeps the loop in memory and calls it “resumable”.',
      'Ignores that a step may run twice after a resume.',
      'Lets a person’s approval be a prompt instruction the model can skip.',
      'Treats the repeated-tokens cost as the main risk and misses duplicate side effects.',
    ],
    lessons: ['rag-agents/choosing-an-agent-architecture', 'rag-agents/langchain-and-langgraph', 'systems/human-in-the-loop-design', 'rag-agents/designing-tools-for-agents'],
  },
  {
    id: 'review-proposal-move-workflow-to-multi-agent',
    prompt:
      'A team proposes replacing a working fixed workflow with a multi-agent system “for better answers”. The workflow costs $87 for 10,000 requests and resolves 80 per cent of them without a person; each unresolved request costs $2 of staff time. The team expects the multi-agent version to use 15 times the tokens and resolve 85 per cent. Review the proposal. Treat all these numbers as examples.',
    roles: ['ai-lead', 'solutions-architect'],
    level: 'senior',
    kind: 'estimation',
    topics: ['agents', 'multi-agent', 'cost', 'decision making'],
    minutes: 20,
    strong: [
      'Computes the proposed model cost: 15 × $87 is $1,305 for 10,000 requests, so $1,218 more than today.',
      'Computes the benefit: 80 per cent resolved leaves 2,000 unresolved and 85 per cent leaves 1,500, so 500 fewer at $2 is $1,000 saved. Net result: $1,000 minus $1,218 is a loss of $218 per 10,000 requests, before any extra engineering and delay.',
      'Computes the break-even: the extra $1,218 divided by $2 per request is 609 requests, so about 6.1 percentage points of resolution (a lift from 80 to about 86.1 per cent) would pay for the tokens alone. The proposal falls short of that.',
      'Questions the inputs rather than only the arithmetic: where does 15 times come from, and where does 85 per cent come from? Asks for a measured comparison on the same tasks against a single-agent baseline, with cost per solved task and delay, not a projection.',
      'Asks which of the three reasons for more than one agent applies (parallel breadth, separate contexts, different tools or permissions). If none, the extra agents buy complexity, delay and harder debugging, not answers.',
      'Offers cheaper routes to the same gain: fix the failure cases the workflow has (a router, a better step prompt, a check between steps) and re-measure. Says what result would change your mind, such as a measured lift above the break-even on real traffic.',
    ],
    followUps: [
      {
        q: 'The pilot shows 90 per cent resolution, but only on 50 hand-picked cases. Do you approve?',
        lookFor: 'No: the sample is small and selected. Asks for a random sample of real traffic, several trials per case, and a confidence interval or at least the spread, before paying for 15 times the tokens.',
      },
      {
        q: 'The multi-agent system is slower. Does that change the answer?',
        lookFor: 'Yes where delay matters to the customer or a tight budget. Adds time to the comparison, noting that orchestration adds planning and combining calls, and decides with cost, success and latency together.',
      },
      {
        q: 'Suppose it does pay off. How do you ship it safely?',
        lookFor: 'Bounds it in code (budgets, worker limits), traces each agent, gives each the least permissions it needs, adds a verifier that sees the sources, keeps the old workflow as a fallback, and watches cost per solved task in production.',
      },
    ],
    redFlags: [
      'Approves or rejects without doing the arithmetic.',
      'Accepts a projected lift as if it were measured.',
      'Compares only quality and ignores token cost and delay.',
      'Cannot name a reason for several agents beyond “it is more advanced”.',
    ],
    lessons: ['rag-agents/multi-agent-systems', 'rag-agents/choosing-an-agent-architecture', 'cost/where-the-tokens-go', 'evals/evaluating-agents'],
  },
];
