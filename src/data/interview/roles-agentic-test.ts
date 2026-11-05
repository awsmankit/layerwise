import type { Question } from './types';

/**
 * Role questions for the agentic AI engineer (agentic-eng) and the AI test and evaluation engineer (ai-test).
 * Every worked number in a prompt or a strong point was recomputed in a scratch script. Prices and rates are example
 * figures, not quotes. Facts that depend on a vendor or a standard are hedged and tied to the lesson that cites them.
 */
export const questionsAgenticTest: Question[] = [
  // ---------------------------------------------------------------- agentic-eng
  {
    id: 'agent-stop-conditions-and-end-states',
    prompt:
      'An agent is just a loop: call the model, run any tool it asks for, repeat. Describe every way a run can end, who decides each one (the model or your code), and what the agent should do at each ending so that nobody is misled.',
    roles: ['agentic-eng'],
    level: 'junior',
    kind: 'concept',
    topics: ['agents', 'stop conditions', 'reliability'],
    minutes: 12,
    strong: [
      'Describes the loop: send the messages and tool definitions to the model; if it asks for a tool, your code runs it and appends the result; call the model again; stop when the model returns a final answer with no tool request. That is the only natural ending, and a confused model may never reach it.',
      'Lists the endings your code must enforce: success, step limit, token or cost budget, wall-clock timeout, no-progress detection (the same tool call with the same arguments again and again), a hard tool or provider error, a user cancel, and a hand-off to a person when approval or a decision is needed.',
      'Says the limits live in code. A line in the prompt such as “stop after 10 steps” is guidance, not a guarantee, because the model can ignore it or lose count.',
      'Defines the behaviour at each limit: stop, tell the user honestly what was done and what was not, and hand off with the trace attached. Never present a half-finished action as finished.',
      'Thinks about side effects already made when a run is cut off, for example two of three emails sent. Records progress, keeps actions idempotent (a repeat does not repeat the effect), and names the done and not-done actions in the hand-off.',
      'Records the end reason as a field on every run, so you can count how runs end. A rising share of “step limit” or “budget” endings is an early alert that something changed.',
      'Chooses limit values from the distribution of successful runs (for example a little above the 99th percentile of steps and cost), per task type, and revisits them when the model, prompt or tools change.',
    ],
    followUps: [
      {
        q: 'A run hits its step limit right after it sent a customer email but before it updated the ticket. What state are you in, and what do you do?',
        lookFor: 'A partial side effect. The hand-off says the email went out and the ticket is not updated, the person finishes it, and the system does not blindly rerun the whole task, which would send a second email. Idempotency keys and recorded progress make a safe resume possible.',
      },
      {
        q: 'The model says “I have finished” but the task is not done. Who decides that a run succeeded?',
        lookFor: 'Where possible code decides, by checking the outcome in the system of record (the booking exists, the refund row is there). The model’s own claim is a signal, not proof.',
      },
      {
        q: 'How do you choose 20 as the step limit?',
        lookFor: 'From data: the step counts of runs that succeeded, a limit just above the tail, different limits per task type, and an alert when many runs get close to the limit. A guessed round number is a red flag.',
      },
    ],
    redFlags: [
      'Believes the model will stop by itself when it has the answer, with no limits in code.',
      'Relies on a prompt instruction to enforce a step or cost limit.',
      'Returns a partial result as if the task were complete.',
      'Has no record of why runs ended.',
    ],
    lessons: ['rag-agents/agents-and-tool-use', 'evals/llmops-in-production'],
    game: { label: 'Incident Room', href: '/play/incident-room/' },
  },
  {
    id: 'tool-call-round-trip-model-proposes-code-runs',
    prompt:
      'Walk me through exactly what happens when an agent “uses a tool” to look up a customer’s order. Say which steps are the model and which are your code, what the model actually sees, and where this can go wrong.',
    roles: ['agentic-eng'],
    level: 'junior',
    kind: 'concept',
    topics: ['agents', 'tool use', 'function calling', 'security'],
    minutes: 12,
    strong: [
      'States the key fact: the model never runs anything. It emits a structured request (a tool name and arguments), and your code decides whether and how to run it.',
      'Explains that tool names, descriptions and parameter schemas are text placed in the model’s context on every call, so they cost tokens and act as prompt text the model reads.',
      'Lists the code steps in order: parse the request, validate the arguments as untrusted input, check that this user may do this, run the tool with a timeout, catch errors, and return the result as a message that carries the matching call id.',
      'Notes that the whole history, including the tool result, is sent to the model again, which then either asks for another tool or answers.',
      'Names failure points: the model picks the wrong tool, invents or mistypes an argument, skips the tool and answers from memory, or sends several calls at once; and the tool can time out, fail or return a huge result.',
      'Says values the code already knows, such as the signed-in customer’s ID, must come from code and not from the model, and that tool results are untrusted text that can contain instructions.',
    ],
    followUps: [
      {
        q: 'The model returns two tool calls in one turn. What do you do?',
        lookFor: 'Runs both, returns each result with its own call id, may run independent read-only calls in parallel, and is careful with writes that depend on each other or touch the same record.',
      },
      {
        q: 'A tool takes 40 seconds and then fails. What should the model see?',
        lookFor: 'A timeout enforced in code and a clear, structured error saying what happened and whether a retry makes sense, not an empty string and not a stack trace.',
      },
      {
        q: 'How do you stop the model asking for another customer’s order?',
        lookFor: 'The permission check is in the tool code using the authenticated user from the session, not in the prompt and not in an argument the model supplies.',
      },
    ],
    redFlags: [
      'Says the model executes the tool or connects to the database.',
      'Takes the user or customer ID from model-written arguments.',
      'Treats tool output as trusted instructions.',
    ],
    lessons: ['rag-agents/agents-and-tool-use', 'rag-agents/designing-tools-for-agents'],
  },
  {
    id: 'code-tool-wrapper-errors-and-truncation',
    prompt:
      'Write a wrapper run_tool(fn, args, validate, max_items, timeout_s) that your agent loop uses to call any tool. It should validate the arguments, enforce a timeout, cut long list results down safely, and return something the model can act on whether the call worked, found nothing, or failed. Talk me through the result shape and the tests.',
    roles: ['agentic-eng'],
    level: 'junior',
    kind: 'coding',
    topics: ['agents', 'tool use', 'validation', 'python'],
    minutes: 20,
    strong: [
      'Returns one consistent shape, for example {ok, data, error: {type, message, retryable}, note}, so the loop and the model never have to guess what a result means.',
      'Validates arguments before running anything. The error names the bad field and the allowed values, for example “urgency must be an integer from 1 to 5”, so the model can fix it on the next turn.',
      'Keeps “no results” and “the call failed” clearly apart: an empty list with ok true is a real answer, while an exception becomes ok false with an error type. Swallowing exceptions into an empty value is the classic cause of an agent that loops.',
      'Enforces a timeout and treats it as a retryable error. Catches any other exception, logs the full detail for engineers, and gives the model a short safe message with no stack trace, file paths or secrets.',
      'Truncates by items, not by characters, so the structure stays valid, and adds a note such as “showing 20 of 134 results; narrow with the status filter”, so the model knows what it did not see and how to ask for less.',
      'Tests with fake tools: one that returns a list, an empty list, an exception, a hang, and 500 items; plus bad arguments, a missing field and a wrong type. Asserts the shape every time.',
    ],
    followUps: [
      {
        q: 'The exception message from the database contains a connection string. What do you do?',
        lookFor: 'Never forward raw exception text to the model or the user. Log it where access is controlled, return a generic error type, and scrub secrets from logs as well.',
      },
      {
        q: 'The tool is “send_email” and it timed out. Can the wrapper just retry?',
        lookFor: 'No. A timeout does not say whether the email was sent. Writes need an idempotency key so a repeat returns the saved result, or the wrapper reports an unknown outcome instead of retrying blindly.',
      },
      {
        q: 'Why truncate by items and not at 4,000 characters?',
        lookFor: 'Cutting JSON mid-object produces broken text the model may misread or repeat. Cutting at item boundaries keeps each item whole and lets you report the count.',
      },
    ],
    redFlags: [
      'Catches every exception and returns an empty string.',
      'Returns stack traces or raw upstream error bodies to the model.',
      'Truncates by characters and leaves broken JSON.',
      'Retries a write after a timeout without an idempotency key.',
    ],
    lessons: ['rag-agents/designing-tools-for-agents', 'rag-agents/agents-and-tool-use'],
  },
  {
    id: 'code-agent-loop-with-budgets',
    prompt:
      'Write the core loop of a tool-using agent in Python. Given a call_model function and a dict of tools, it should stop on a final answer, a step limit, a token budget, a wall-clock deadline, or the same tool call being repeated three times. It should return a status, the answer if there is one, and a trace. How would you test it without a real model?',
    roles: ['agentic-eng'],
    level: 'mid',
    kind: 'coding',
    topics: ['agents', 'stop conditions', 'python', 'testing'],
    minutes: 25,
    strong: [
      'Passes the model call, the tools and the clock in as arguments, so a test can supply a scripted fake model and a fake clock with no network and no sleeping.',
      'Checks every budget before each model call, so no call is made once a limit is spent, and adds up tokens from the usage the provider reports, not from an estimate.',
      'Appends a result message for every tool call the model made, including errors and unknown tool names. An unknown tool is an error result the model can read, not a crash, and the history stays valid because each call id has a result.',
      'Detects no progress by hashing the tool name and normalised arguments and counting repeats, stopping at the third identical call with a status such as “no_progress”.',
      'Returns an enumerated status (done, step_limit, token_budget, timeout, no_progress, tool_failure) and the steps used, tokens used and the full trace, so callers can handle each ending and dashboards can count them.',
      'Tests with a scripted fake model: finishes at step 1 (exactly one call), asks for a tool then finishes, asks for the same call forever, exceeds the token budget, a tool that raises, an unknown tool name, and a clock that passes the deadline mid-run.',
      'Notes what the loop cannot guarantee by itself: side effects of tools that already ran, a single model call that is very slow, and a limit that is set too high. Mentions a per-call timeout and idempotent tools.',
    ],
    followUps: [
      {
        q: 'The model returns text and a tool call in the same turn. What does your loop do?',
        lookFor: 'Runs the tool call and keeps going. The turn is final only when there is no tool call. Treats the accompanying text as part of the history, not as the answer.',
      },
      {
        q: 'How would you make the loop resumable after a crash at step 17?',
        lookFor: 'Saves the message list and progress after every step (a checkpoint), makes tools idempotent so a replayed step does not repeat the effect, and records which tool calls already completed.',
      },
      {
        q: 'Different tools have different costs. How would you budget for them?',
        lookFor: 'Adds a cost per tool call (paid APIs, long queries) to the budget alongside tokens, and caps the number of calls to expensive tools separately.',
      },
    ],
    redFlags: [
      'Uses while True with no limit, or counts steps but never checks time or tokens.',
      'Crashes or drops the message when the model names a tool that does not exist.',
      'Has no tests, or tests only against a real model.',
      'Estimates tokens instead of reading the usage the provider returns.',
    ],
    lessons: ['rag-agents/agents-and-tool-use', 'rag-agents/langchain-and-langgraph', 'evals/llmops-in-production'],
    game: { label: 'Incident Room', href: '/play/incident-room/' },
  },
  {
    id: 'agent-says-done-but-did-nothing',
    prompt:
      'A room-booking agent tells users “Done, I have booked the room for 3pm.” A facilities audit of 200 of its confirmations finds that 24 of the bookings do not exist. How do you find out what is happening, and what do you change so that the agent’s “done” means something?',
    roles: ['agentic-eng', 'ai-test'],
    level: 'mid',
    kind: 'debugging',
    topics: ['agents', 'debugging', 'verification', 'tool use'],
    minutes: 20,
    strong: [
      'Starts from the data: 24 of 200 is 12%. Pulls the traces of the 24 and compares what the agent said with what each tool call actually returned, and groups the cases by cause before changing anything.',
      'Looks for the usual causes: the tool returned an error or a conflict and the model summarised it as success; the model never called the booking tool and wrote a confirmation from its own plan; the tool answered “accepted” for an asynchronous job that failed later; a truncated or empty result was read as success.',
      'Fixes the design, not the wording: the confirmation text is built by code from the tool’s result, including the booking id, instead of free model prose. Where possible the code reads the booking back from the system of record before telling the user it exists.',
      'Gives tools explicit, structured results with a status the model cannot misread, and handles asynchronous work by reporting “pending” and checking the outcome later.',
      'Treats a prompt line such as “never say done without a booking id” as helpful but not enough, since a prompt is not enforcement.',
      'Adds an outcome check to the evals: grade the state in the booking system, not the reply, in both directions (it must also refuse when the room is taken), with several trials per task.',
      'Adds a daily reconciliation that joins confirmations sent with records that exist and alerts on any mismatch, and plans how to tell the affected users and fix their bookings.',
    ],
    followUps: [
      {
        q: 'How do you find the bad confirmations from last month, before the fix?',
        lookFor: 'Match the logged confirmations (booking ids or the claim text in the trace) with the records in the booking system, and list the ones with no record. The trace must hold the tool results to allow this.',
      },
      {
        q: 'The booking tool is asynchronous and takes up to a minute. What should the agent say, and when?',
        lookFor: 'It says the request was submitted and is pending, then confirms or reports failure from a status check or callback. Success is reported only after the system of record says so.',
      },
      {
        q: 'Your eval used the reply text and passed 98%. Why was it blind to this, and what replaces it?',
        lookFor: 'A reply-text grader accepts a fluent false claim. An outcome grader checks the database after the trial, and a model grader is used only for the parts that need judgement, such as tone.',
      },
    ],
    redFlags: [
      'Proposes a stronger prompt as the only fix.',
      'Trusts the agent’s own statement that the task is complete.',
      'Grades only the reply text in the eval.',
      'Does not plan to contact the users who were told a false “done”.',
    ],
    lessons: ['rag-agents/agents-and-tool-use', 'evals/evaluating-agents', 'evals/observability-for-llm-apps'],
    game: { label: 'Incident Room', href: '/play/incident-room/' },
  },
  {
    id: 'agent-loop-input-tokens-grow-with-steps',
    prompt:
      'A support agent has a 6,000-token prefix (system prompt plus tool definitions) and a 500-token task. Each step, the model call and the tool result add 1,200 tokens to the history, and the model writes 300 output tokens per step. A typical run takes 30 steps. Using an example price of $3 per million input tokens and $15 per million output tokens, what does one run cost? Why is that more than 30 times the first call, what does caching change, and what does it tell you about step limits?',
    roles: ['agentic-eng'],
    level: 'mid',
    kind: 'estimation',
    topics: ['agents', 'cost', 'context', 'caching'],
    minutes: 15,
    strong: [
      'Sees that every step resends the whole history. Step 1 reads 6,500 input tokens, step 2 reads 7,700, and step 30 reads 6,500 + 1,200 × 29 = 41,300.',
      'Sums the input over 30 steps: 30 × 6,500 + 1,200 × (0 + 1 + … + 29) = 195,000 + 1,200 × 435 = 717,000 tokens. Output is 30 × 300 = 9,000 tokens.',
      'Converts with units checked: 717,000 ÷ 1,000,000 × $3 = $2.151 and 9,000 ÷ 1,000,000 × $15 = $0.135, so about $2.29 a run, and input is 94% of it. Multiplying the first call by 30 would give 195,000 tokens and miss by a factor of 3.7.',
      'Notes the growth is quadratic in the number of steps: 15 steps cost 223,500 input tokens against 717,000 for 30, so doubling the steps multiplies input by about 3.2, and halving them cuts it by about 69%.',
      'Works the cache case with an example rate of 0.1 times the price for cached reads and no write premium: full-price tokens are 6,500 + 29 × 1,200 = 41,300, cached reads 675,700 × 0.1 = 67,570, so 108,870 equivalent tokens, $0.327 input and about $0.46 in total. Says the real saving depends on a stable prefix, cache lifetime and minimum sizes, so check the current docs and the usage field.',
      'Draws the engineering conclusions: cap steps and cost in code, shorten or clear old tool results, compact the history at fixed points, push noisy reads into a sub-agent that returns a summary, and track cost per solved task, not per call.',
    ],
    followUps: [
      {
        q: 'Tool results average 1,000 of the 1,200 tokens added per step. You trim each to 300. What is the new uncached cost?',
        lookFor: 'Each step now adds 500. Input is 30 × 6,500 + 500 × 435 = 412,500 tokens, $1.2375, plus $0.135 output, about $1.37, a 40% saving, with a check that the trimmed results still contain what the model needs.',
      },
      {
        q: 'At 5,000 runs a day, what are the two bills, and how would you know the cache is working?',
        lookFor: '5,000 × $2.286 = $11,430 uncached against about $2,308 with the example cache rate. Verify with the cached-token counts in the provider’s usage field. A timestamp or user name near the top of the prompt changes the prefix and breaks the cache.',
      },
      {
        q: 'Why is compaction at step 20 not free?',
        lookFor: 'Rewriting early context changes the prefix, so cached reads stop matching, and a summary can drop a rule or fact. Compact rarely, at fixed points, and keep pinned rules verbatim.',
      },
    ],
    redFlags: [
      'Multiplies the first call’s tokens by the number of steps.',
      'Ignores input tokens and talks only about output.',
      'Treats caching as free or automatic with no conditions.',
      'Has no per-run cost cap.',
    ],
    lessons: ['cost/where-the-tokens-go', 'rag-agents/agent-memory-and-context-engineering', 'llm/context-window-and-caching'],
    game: { label: 'Cost Crunch', href: '/play/cost-crunch/' },
  },
  {
    id: 'mcp-tool-sprawl-and-description-drift',
    prompt:
      'Your team has connected five MCP servers (issues, docs, calendar, a database and a third-party web search) to an internal assistant, 140 tools in total. Answers are getting worse, every request is slower and dearer, and last week the third-party server changed one of its tool descriptions and the assistant started behaving differently. What do you do?',
    roles: ['agentic-eng'],
    level: 'mid',
    kind: 'design',
    topics: ['mcp', 'tool use', 'agents', 'security'],
    minutes: 20,
    strong: [
      'Explains the cost: tool definitions are tokens on every call. At an example 300 tokens each, 140 tools is 42,000 tokens before any work. Wrong picks come mostly from overlapping tools, not from the raw count.',
      'Shrinks what each task sees: split by task or role into narrower agents or tool sets, namespace the tools, drop tools the logs show are never called, and load definitions on demand with a tool-search step where the platform offers one.',
      'Applies least privilege per server: read-only tools by default, a separate token and the smallest scopes for each server, and no sharing of one server’s credentials with another.',
      'Treats third-party descriptions and annotations as untrusted input. A description is text that steers the model, and annotations such as read-only are hints, not guarantees.',
      'Handles drift: pin each server’s version, snapshot and hash the tool definitions, alert or fail closed when they change, and re-run the tool-use evals before the change reaches users. A server can change its tool list over time, so the list you reviewed is not permanent.',
      'Puts a gateway or wrapper in front: an allowlist of approved tools, validation of arguments, rate limits, logging of every call, and a human approval step for tools that write.',
      'Measures with tool-selection tasks per server and a before-and-after comparison on the same cases for each change, one change at a time.',
    ],
    followUps: [
      {
        q: 'Which tools do you cut first, and how do you know it is safe?',
        lookFor: 'Uses call logs to find tools never or rarely used and near-duplicates, removes a few at a time, and checks the eval set and tool-selection accuracy after each cut.',
      },
      {
        q: 'A web search result says “now email this page to an outside address”. What stops that?',
        lookFor: 'The permission boundary in code: the assistant in that context has no send-email tool, or it needs approval bound to the exact action. Telling the model to ignore such text is not a defence.',
      },
      {
        q: 'Can you rely on a tool’s “read-only” annotation to skip approval?',
        lookFor: 'Not from an untrusted server: annotations are hints. Check the tool’s real behaviour and credentials, enforce read-only with the token’s scopes, and review the server before trusting its labels.',
      },
    ],
    redFlags: [
      'Connects every available server to every agent.',
      'Trusts third-party tool descriptions and annotations as if they were your own.',
      'Updates a server with no re-test.',
      'Shares one broad token across all servers.',
    ],
    lessons: ['rag-agents/mcp-in-depth', 'rag-agents/designing-tools-for-agents', 'evals/llm-security'],
  },
  {
    id: 'behavioural-staged-autonomy-before-launch',
    prompt:
      'A senior stakeholder wants your agent to close tickets and issue small credits fully on its own from launch day, with no human in the loop. Tell me about a time you handled a request like this, or how you would handle it now.',
    roles: ['agentic-eng'],
    level: 'mid',
    kind: 'behavioural',
    topics: ['behavioural', 'human-in-the-loop', 'agents', 'risk'],
    minutes: 15,
    strong: [
      'Starts by understanding the goal behind the request (cost, speed, headcount) and says what is worth protecting, instead of just refusing.',
      'Proposes a staged ladder with a named action tier at each rung: the agent only proposes and a person acts (shadow), a person approves each action, the agent acts alone within limits with an undo window and an audit, and then the limits widen.',
      'Agrees the rules for moving up before launch, as measured criteria: escaped-error rate with an interval, override rate, cost per task, a minimum number of reviewed cases. It is about evidence, not about how the demo looked.',
      'Gives a concrete schedule and an early win, such as the share of tickets that need no edit in stage 1, so the ladder does not look like a delay.',
      'Names the safeguards that exist at every stage: a kill switch, a spend and action cap enforced in code, an audit trail, and a rollback plan.',
      'Shows ownership of the outcome: states who accepts the residual risk, how the decision is recorded, and what happens when a stage fails its criteria.',
      'Answers in a clear story shape (situation, action, result, what you would change), without blaming the stakeholder.',
    ],
    followUps: [
      {
        q: 'After two weeks, reviewers changed none of the 300 drafts they saw. Can you remove the approval step?',
        lookFor: 'Zero errors in 300 does not mean zero risk: the rule of three puts the 95% upper bound near 3 ÷ 300 = 1%. Decide whether 1% of consequential actions is acceptable, keep a random audit, and check that reviewers were really reading.',
      },
      {
        q: 'The stakeholder says shadow mode doubles the work. What do you say?',
        lookFor: 'Measures review time per item, lets low-risk, template actions go first, batches approvals, and shows the time saved by the drafts. Offers to shorten the stage only if the criteria are met earlier.',
      },
      {
        q: 'Three weeks after full launch, a wrong credit is issued to a customer. What happens?',
        lookFor: 'A pre-agreed response: use the kill switch or lower the limit, fix the customer’s case, review the trace, add a test case, and decide from the criteria whether to step back one rung.',
      },
    ],
    redFlags: [
      'Refuses without offering a path, or gives in without a plan.',
      'Argues from model capability alone and not from measured evidence.',
      'Has no kill switch, cap or audit in the plan.',
      'Blames the stakeholder in the story.',
    ],
    lessons: ['systems/human-in-the-loop-design', 'responsible/human-oversight-and-when-ai-should-not-decide', 'evals/llmops-in-production'],
  },
  {
    id: 'agent-eval-budget-trials-and-pass-k',
    prompt:
      'You own the eval for a support agent: 40 tasks, 5 trials each. An average trial uses 180,000 input and 7,000 output tokens (example prices: $3 and $15 per million), and a model grader for tone adds 3,000 input and 400 output tokens per trial. Estimate one full run, then a week of running it on every one of 30 pull requests against a tiered plan. The product owner wants tasks that are “reliably solved”. What does pass^5 say about a task that succeeds 90% of the time per trial?',
    roles: ['agentic-eng', 'ai-test'],
    level: 'mid',
    kind: 'estimation',
    topics: ['evals', 'agents', 'cost', 'ci'],
    minutes: 18,
    strong: [
      'Counts trials: 40 × 5 = 200. Agent cost per trial is 180,000 ÷ 1,000,000 × $3 = $0.54 plus 7,000 ÷ 1,000,000 × $15 = $0.105, so $0.645, and $129.00 for 200 trials.',
      'Adds the grader: 200 × 3,000 = 600,000 input tokens is $1.80 and 200 × 400 = 80,000 output tokens is $1.20, so $3.00. One full run is about $132.',
      'Compares plans: 30 full runs a week is $3,960. A tiered plan runs a 10-task, 2-trial smoke set on each PR (20 trials × $0.645 = $12.90, so $387 for 30 PRs) plus the full set nightly (7 × $132 = $924), which comes to $1,311 a week, about a third.',
      'Reads reliability: at 90% per trial, pass^5 is 0.9^5 = 59.0% while pass@5 is 99.999%. To make pass^5 at least 90% a task needs about 0.9^(1/5) = 97.9% per trial. Which of the two is right depends on whether the product needs success every time or only once.',
      'States the assumptions: trials are independent and have the same success rate, which real tasks do not, so look at results task by task, and the token counts are measured from real runs, not guessed.',
      'Names the other levers: run only the tasks mapped to the changed tool or prompt plus a fixed core set, cache unchanged results, run cheap code-graded checks often and expensive judged runs rarely, and report cost and noise on every run.',
    ],
    followUps: [
      {
        q: 'A PR changes only the description of the refund tool. Which tasks run?',
        lookFor: 'Tasks tagged with the refund tool and its neighbours (similar tools can be confused with it), plus the always-on core set. Tags on tasks make selective runs possible.',
      },
      {
        q: 'Can a smoke set of 10 tasks with 2 trials catch a drop from 90% to 80%?',
        lookFor: 'No. With 20 trials the standard error is sqrt(0.9 × 0.1 ÷ 20) ≈ 0.067, about 6.7 points. The smoke set catches collapses (broken tools, bad format), and the nightly run catches subtler drift.',
      },
      {
        q: 'Per-trial success is 90% on each of the 40 tasks. How many tasks do you expect to pass all five trials?',
        lookFor: '40 × 0.59 ≈ 23.6, so only about 24 tasks would be reported as reliably solved, even though each trial is right 90% of the time. The wording of the target matters.',
      },
    ],
    redFlags: [
      'Runs the full suite on every change with no cost estimate.',
      'Reports pass@k to a team whose product needs it to work every time.',
      'Ignores the cost of the grader.',
      'Has no plan for noise in the small per-PR set.',
    ],
    lessons: ['evals/evaluating-agents', 'cost/where-the-tokens-go', 'evals/llmops-in-production'],
    game: { label: 'Cost Crunch', href: '/play/cost-crunch/' },
  },
  {
    id: 'approval-fatigue-and-meaningful-gates',
    prompt:
      'Your coding and operations agent asks for approval about 40 times in a typical session, and people click yes on almost everything. The human-in-the-loop lesson cites an Anthropic report that users accepted 93% of one product’s permission prompts. Redesign the permission model so that an approval means something.',
    roles: ['agentic-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['human-in-the-loop', 'agents', 'security', 'permissions'],
    minutes: 25,
    strong: [
      'Explains why the problem matters: a gate that is almost always approved protects little, and fatigue teaches people to approve without reading, which is exactly when a bad action gets through.',
      'Tiers the actions by reversibility and blast radius, not by how the model feels: read-only actions run automatically and are logged, reversible low-impact writes get caps and an audit, and hard-to-undo actions get a real gate. The tiers are enforced in code.',
      'Shrinks the number of prompts with a boundary instead of a question: run in a sandbox with narrow credentials, allowlist safe commands and paths, deny known-dangerous ones, so allowed actions cannot reach what matters. In the example, if 28 of the 40 prompts are reads, 12 remain.',
      'Changes the unit of approval: approve a plan or a batch with a summary of effects, or a time-boxed scope, instead of every step, while each approval is still bound to the exact action and parameters and expires.',
      'Makes the screen worth reading: show the effect and the evidence, not “Are you sure?”, with untrusted content quoted and the review tool unable to act on it.',
      'Measures the gate: approval rate, time to approve, overrides, and how often a seeded known-bad action in a test environment is caught. An approval rate near 100% with near-zero time per item means the gate is theatre.',
      'Considers rule-based or classifier-assisted approval, but treats it as a component with a measured error rate plus a hard deny list, with a random audit of what it let through. Failure or timeout defaults to deny.',
    ],
    followUps: [
      {
        q: 'Could a second model approve the actions instead of a person?',
        lookFor: 'It can reduce load for low-tier actions, but it has false negatives, can be steered by the same untrusted content, and must be measured on labelled cases. High-impact actions still need a person or a hard rule, and the permission limits stay in code.',
      },
      {
        q: 'How would you test that your gates actually catch bad actions?',
        lookFor: 'A set of seeded risky requests in a safe test environment, with fake data and no real side effects, tracking how many a reviewer or classifier stops, plus review of real overrides and a random audit of auto-approved items.',
      },
      {
        q: 'Approvals are bound to exact arguments. The user approves, then the plan changes at step 3. What happens?',
        lookFor: 'The changed action is a new request needing a new approval. Approvals expire, are checked again at execution against the current state, and are never reusable for a different call.',
      },
    ],
    redFlags: [
      'Adds more confirmation prompts as the answer to unsafe actions.',
      'Puts the rule “ask before deleting” only in the prompt.',
      'Never measures approval rate or time per approval.',
      'Lets a timeout default to approve.',
    ],
    lessons: ['systems/human-in-the-loop-design', 'rag-agents/agents-and-tool-use', 'evals/llm-security'],
  },
  {
    id: 'incident-triage-multi-agent-design',
    prompt:
      'Design an assistant that helps an on-call engineer triage a production alert by checking logs, metrics, recent deploys and runbooks. Would you use one agent or several? Describe the structure, the permissions, the budgets, what it returns to the engineer, and how you would evaluate it before anyone relies on it.',
    roles: ['agentic-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['multi-agent', 'agents', 'system design', 'evals'],
    minutes: 30,
    strong: [
      'Starts from one agent with good tools and an eval, and adds agents only for a named reason. Here the reasons exist: independent read-only investigations that can run in parallel, huge logs that deserve their own context, and different data sources with different access.',
      'Proposes a lead that plans and synthesises plus read-only workers (logs, metrics, deploys and runbooks), each with its own tools and a clear objective, output format and boundaries.',
      'Uses structured hand-offs: each worker returns a hypothesis, the evidence as references (query links, log ids), what it checked, and a confidence flag. Large outputs pass by reference, not by copying text through the lead.',
      'Adds a verifier that reads the cited sources, not the workers’ summaries, and has the assistant say “unknown” when evidence is thin, never inventing a cause.',
      'Keeps the system read-only: it recommends, and the engineer acts. Least privilege per worker, with credentials that cannot write.',
      'Treats logs and tickets as untrusted data, since a log line can contain text that looks like an instruction. The permission boundary, not a prompt, stops it from acting.',
      'Sets budgets in code: workers per run, steps, tokens and time (an on-call answer is useful in minutes), a concurrency and cost cap for alert storms, and a fallback to a plain runbook link when a worker fails.',
      'Evaluates by replaying past incidents with a known root cause: is the right cause in the top three, is the evidence real and linked, how long and how much did it take. Compares with a single-agent baseline on cost per solved incident and time, over several trials.',
    ],
    followUps: [
      {
        q: 'Two workers disagree: the deploy worker blames last night’s release and the metrics worker blames a traffic spike. What does the lead return?',
        lookFor: 'Both hypotheses with their evidence and a suggested next check. It does not average them or pick one silently, and the verifier looks at the cited data.',
      },
      {
        q: 'An alert storm sends 50 alerts in five minutes. What stops a bill and a pile-up of runs?',
        lookFor: 'Deduplicate and group alerts, cap concurrent runs and total spend, queue the rest, and show the engineer one summary for the group rather than fifty.',
      },
      {
        q: 'How do you know the multi-agent version is worth its extra cost?',
        lookFor: 'Same incidents, same graders, against the single-agent baseline: accuracy, time to a useful answer, cost per solved incident and pass^k. If a single agent is close, the simpler design wins.',
      },
    ],
    redFlags: [
      'Starts with many agents and no reason for each.',
      'Gives workers write access to production.',
      'Lets the lead accept worker summaries without checking sources.',
      'Has no plan for evaluating it on past incidents.',
    ],
    lessons: ['rag-agents/multi-agent-systems', 'evals/evaluating-agents', 'evals/observability-for-llm-apps', 'evals/llm-security'],
  },
  {
    id: 'agent-dashboard-and-alerts-in-production',
    prompt:
      'Your agent product is going live next week. Which metrics and alerts do you put on the dashboard, how do you decide what pages someone at night, and how does what you collect feed back into your evals?',
    roles: ['agentic-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['observability', 'agents', 'monitoring', 'llmops'],
    minutes: 25,
    strong: [
      'Counts how runs end, with the end reason as a label (success, step limit, budget, timeout, escalated, error), and treats a shift in that mix as the first alert.',
      'Tracks steps per task, tokens and cost per task at the median and the 99th percentile, and cost per solved task, since averages hide the long tail of runaway runs.',
      'Watches the tools: error rate and latency per tool, empty-result rate, repeated-call detections, and approval rate and time per approval for gated actions.',
      'Records quality signals tied to the trace ID: user feedback, edits and retries, a sampled judge calibrated against humans, and an outcome check or reconciliation against the system of record, because “completed” is not “correct”.',
      'Splits everything by release, prompt, model and tool-set version, so a regression points at a change. Uses the OpenTelemetry GenAI conventions where they fit, with the version pinned because they were still marked Development when the lesson was written.',
      'Chooses alerts by rate and by change against a baseline, for example the step-limit share doubling against the previous week, not fixed numbers that fire every day. Separates pages (a runaway cost, a spike in failed actions) from tickets (a slow drift).',
      'Keeps all traces with errors, slow runs, guardrail blocks or negative feedback and samples the rest (tail sampling), while computing the metrics on all traffic. Redacts personal data and sets a retention period.',
      'Feeds failing traces, with consent and redaction, into the eval set, and re-runs the evals on any change to the model, prompt or tools.',
    ],
    followUps: [
      {
        q: 'The median cost per task is flat but the 99th percentile tripled. What do you look for?',
        lookFor: 'A tail of loops or retries: open the most expensive traces, check for repeated calls, tool errors followed by retries, ballooning context from big tool results, and a recent prompt or tool change.',
      },
      {
        q: 'Success rate shows 96% completed but complaints are rising. What is the dashboard missing?',
        lookFor: 'Completion is not correctness. Add outcome verification, reconciliation with records, sampled human review and feedback linked to traces, and slice by task type.',
      },
      {
        q: 'How do you avoid alert fatigue on this dashboard?',
        lookFor: 'Alert on changes from a baseline with grouping, tier alerts by impact, review noisy alerts weekly and retire or retune them, and give every page a runbook.',
      },
    ],
    redFlags: [
      'Shows only request count, average latency and a thumbs-up rate.',
      'Reports average cost per task and nothing about the tail.',
      'Cannot tell which release caused a change.',
      'Stores full prompts and outputs with no redaction or retention plan.',
    ],
    lessons: ['evals/observability-for-llm-apps', 'evals/llmops-in-production', 'rag-agents/agents-and-tool-use'],
    game: { label: 'Incident Room', href: '/play/incident-room/' },
  },
  {
    id: 'code-execution-agent-sandbox',
    prompt:
      'A data-analysis agent writes and runs Python on files that users upload. Design the environment where that code runs, so that a confused or manipulated agent cannot hurt the platform or other users. How would you test the design?',
    roles: ['agentic-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['agents', 'security', 'sandboxing', 'system design'],
    minutes: 25,
    strong: [
      'Starts from the threat model: the code comes from a model that read untrusted file contents, so it is arbitrary code from the internet. The model’s intentions are not a control.',
      'Runs it in a disposable sandbox per session or per run, with stronger isolation than a plain shared container where the risk justifies it (a micro virtual machine or a user-space kernel are examples; check the current docs for what each guarantees), destroyed afterwards.',
      'Gives the sandbox no ambient credentials, runs as a non-root user, and mounts inputs read-only with a scratch directory and a size-limited output folder.',
      'Denies network by default and allows specific destinations through an egress proxy. That blocks data exfiltration and calls to internal or cloud-metadata addresses.',
      'Limits CPU, memory, disk, process count and wall-clock time, and caps the total work per session so a loop cannot run up a bill.',
      'Treats outputs as untrusted: cap and truncate them, scan files before they are returned, and never let output text be read as instructions or rendered without escaping.',
      'Logs the code, its output and resource use, shares no state between users, and requires approval for any action that leaves the sandbox.',
      'Tests defensively with a suite that checks the sandbox denies network access, contains runaway processes and memory, caps huge output, and cannot read another tenant’s files, and runs it on every image or policy change.',
    ],
    followUps: [
      {
        q: 'The agent wants to pip install a library. How do you allow that?',
        lookFor: 'Prefer a prebuilt image with pinned, vetted packages. If installs are needed, use an internal mirror with an allowlist, not open internet access.',
      },
      {
        q: 'An uploaded CSV contains a line telling the agent to send the data to a web address. What stops it?',
        lookFor: 'The environment: no network egress and no secrets, so there is nowhere to send it. The prompt can say to ignore such text, but only the boundary guarantees it.',
      },
      {
        q: 'How do you cap the cost of one session?',
        lookFor: 'A budget of CPU seconds, wall-clock time, steps and tokens enforced outside the agent, with the session ended and the user told when a limit is reached.',
      },
    ],
    redFlags: [
      'Runs generated code in the application’s own process or with its credentials.',
      'Relies on the prompt to stop dangerous code.',
      'Leaves network access open.',
      'Shares a sandbox between users.',
    ],
    lessons: ['evals/llm-security', 'rag-agents/agents-and-tool-use', 'rag-agents/computer-use-and-browser-agents'],
  },
  {
    id: 'agent-test-environment-fault-injection-and-replay',
    prompt:
      'You need to test an agent that calls a ticketing API, a payments API and a search tool. The tests are slow and flaky, one trial leaves data that changes the next, and a test once hit the vendor’s sandbox payment account twice. Design the test environment, including how you inject failures.',
    roles: ['agentic-eng', 'ai-test'],
    level: 'senior',
    kind: 'design',
    topics: ['agents', 'testing', 'evals', 'reliability'],
    minutes: 30,
    strong: [
      'Layers the tests: tool code on its own with no model, the loop and error handling against a scripted fake model that makes the same calls every time, the real model against faked or sandboxed tools, and a few end-to-end runs against vendor sandboxes.',
      'Resets the world for every trial: a fresh seeded database or in-memory fake per trial, unique IDs, and a controlled clock, so one trial’s refund cannot affect the next and results do not depend on order.',
      'Makes fakes faithful: real error shapes, pagination, latency and rate limits, kept in step with the real API by contract tests, since a fake that is too friendly hides bugs that show up in production.',
      'Injects faults on purpose: timeouts, 429 and 500 responses, empty and partial results, malformed output and duplicate delivery. Asserts the agent’s behaviour: bounded retries, an honest error to the user, escalation, and no repeated side effect.',
      'Includes the nasty case where the side effect succeeded but the response was lost. The test passes only if an idempotency key makes the retry harmless.',
      'Records and replays tool responses to make loop logic repeatable, refreshing the recordings regularly. The model call is still not deterministic, so run several trials and report rates.',
      'Grades the outcome by the state of the environment (a state diff and counts such as exactly one refund), with additional checks that forbidden actions did not happen, in both directions.',
      'Guards safety: test credentials only, a check at start-up that the fake or sandbox is wired in, and no real money or customer data anywhere in tests.',
    ],
    followUps: [
      {
        q: 'A test fails one run in ten. How do you tell whether it is the environment or the model?',
        lookFor: 'Rerun with the scripted fake model. If it still flakes, the environment or the test is at fault (shared state, time, ordering). If it is stable, the variance comes from the real model, which is measured as a rate over trials.',
      },
      {
        q: 'The agent passes all tests with the fake search tool but fails in production on long result lists. What went wrong in the design?',
        lookFor: 'The fake did not paginate or truncate like the real tool. Add a contract test against the real API shape, and fault and volume cases to the fake.',
      },
      {
        q: 'How do you prove the double-charge bug cannot come back?',
        lookFor: 'A permanent regression test that injects a timeout after a successful charge and asserts exactly one charge exists, run in CI on every change to the payment tool or the loop.',
      },
    ],
    redFlags: [
      'Tests only with the real model against live vendor accounts.',
      'Shares state between trials.',
      'Tests only the happy path, with no injected failures.',
      'Grades the agent’s final message and not the state of the world.',
    ],
    lessons: ['evals/evaluating-agents', 'rag-agents/agents-and-tool-use', 'evals/llmops-in-production', 'systems/testing-and-deploying-ml-models'],
    game: { label: 'Incident Room', href: '/play/incident-room/' },
  },

  // ---------------------------------------------------------------- ai-test
  {
    id: 'why-assert-equal-fails-for-llm-output',
    prompt:
      'A developer writes a unit test that sends a fixed input to an LLM feature and asserts that the output equals a saved string. It fails about one run in four. Explain why, and how you would test the feature instead.',
    roles: ['ai-test'],
    level: 'junior',
    kind: 'concept',
    topics: ['testing', 'non-determinism', 'evals', 'regression testing'],
    minutes: 12,
    strong: [
      'Says output is sampled: the model picks each next token from a probability distribution, so the same input can give different wording on different runs.',
      'Notes that even with temperature 0 or a fixed seed, repeated outputs are often not guaranteed to be identical (batching, numeric details and provider-side changes), so exact repeat is not a safe assumption. Check the provider’s current docs.',
      'Points out that two correct answers can differ in wording, and that a provider can change the model behind a name, so an exact-match test breaks for reasons that are not bugs and also passes for answers that are wrong in the same way.',
      'Tests properties instead: checks that code can verify (valid JSON, required fields, the key fact is present, nothing forbidden, length and language), and a rubric or judge only for what code cannot check.',
      'Reports a pass rate over several runs, with a gate set from the measured run-to-run variation, rather than a pass or fail on one sample.',
      'Keeps most of the test suite deterministic by faking the model: the code around the model (parsing, retries, routing, formatting) is ordinary code and can be tested exactly with scripted responses.',
      'Pins and records the model version, prompt version and parameters with every result, so a changed score can be traced to a change.',
    ],
    followUps: [
      {
        q: 'Will setting temperature to 0 and a seed make the test reliable?',
        lookFor: 'It reduces variation but does not guarantee identical output, may not be supported by every model, and still breaks on harmless rewording and model updates. Property checks are the durable approach.',
      },
      {
        q: 'Your property check passes on a well-formed but wrong answer. What do you add?',
        lookFor: 'A check of the content: a reference fact the answer must contain, a calibrated judge with the source, or a human-labelled set. Format checks do not test correctness.',
      },
      {
        q: 'What can remain an exact-match test?',
        lookFor: 'Structured fields with fixed values (a classification label, a tool name chosen), and the deterministic code around the model.',
      },
    ],
    redFlags: [
      'Snapshots the full text of the model output and compares it exactly.',
      'Calls the flaky test a framework problem and adds retries until it is green.',
      'Believes temperature 0 makes the output identical on every run.',
    ],
    lessons: ['evals/evals-101', 'llm/parameters-and-hyperparameters'],
  },
  {
    id: 'code-flaky-case-detector',
    prompt:
      'Write a function that runs each eval case N times and reports, for every case, the pass rate and a label: stable pass, stable fail or flaky. Then tell me what you would do with each group, and how many runs you need before you trust the labels.',
    roles: ['ai-test'],
    level: 'junior',
    kind: 'coding',
    topics: ['testing', 'flaky tests', 'python', 'evals'],
    minutes: 20,
    strong: [
      'Takes the cases, the run function (the model call) and the grading function as arguments, so a test can pass a fake that returns scripted outputs, and loops over every case N times.',
      'Records per case the number of passes, the number of runs and the raw outputs of failing runs, and labels the case: all runs pass is stable pass, none is stable fail, anything in between is flaky.',
      'Treats a crash or timeout in the model call as an error, counted separately from a failed answer, so infrastructure trouble is not read as quality.',
      'Reports the overall mean, the count in each group, and the flaky case ids with their pass rates, so a person can read them.',
      'Tests the function with a fake that always passes, always fails and alternates, and checks the labels and the error handling.',
      'Says what to do: for stable fail, check the case and grader first (a 0% pass rate is most often a broken test); for flaky, read the outputs and decide if the grader is brittle or the model truly varies, then report the rate; for long-standing stable pass, consider retiring or merging it into a smaller guard set.',
      'Knows N matters: a case that truly passes 70% of the time looks stable in 3 runs with probability 0.7³ + 0.3³ = 0.343 + 0.027 = 37%, so a few runs miss a lot of flakiness.',
    ],
    followUps: [
      {
        q: 'How many runs do you use, and where do you spend them?',
        lookFor: 'More runs on cases that matter and cases near the pass threshold, fewer on stable easy ones, and a cost estimate. Can run a cheap first pass and spend extra runs only on cases that vary.',
      },
      {
        q: 'The judge that grades the answer is itself non-deterministic. How does that show up in your report?',
        lookFor: 'Flakiness can come from the grader: re-grade the same saved output several times to separate grader variance from model variance, then fix the rubric or use code checks.',
      },
      {
        q: 'Is a flaky case a bad test?',
        lookFor: 'Not necessarily: it may show real variance in the product that users will see. The decision depends on whether the rate is acceptable, and the case should be kept and reported by rate.',
      },
    ],
    redFlags: [
      'Reruns until green and reports only the pass.',
      'Counts provider errors as quality failures, or the reverse.',
      'Uses 3 runs and calls a case stable.',
      'Deletes flaky cases to make the suite pass.',
    ],
    lessons: ['evals/evals-101', 'evals/evaluating-agents', 'evals/llm-as-judge-pitfalls'],
  },
  {
    id: 'bug-report-for-nondeterministic-failure',
    prompt:
      'A user reports: “the assistant told me the wrong refund policy yesterday.” You try the same question three times and get the right answer each time. How do you investigate, and how do you write up the bug so that an engineer can act on it?',
    roles: ['ai-test'],
    level: 'junior',
    kind: 'debugging',
    topics: ['testing', 'debugging', 'non-determinism', 'observability'],
    minutes: 15,
    strong: [
      'Does not close it as “cannot reproduce”. Three clean tries prove little: if the real failure rate is 10%, all three pass with probability 0.9³ = 72.9%, and it takes about 20 tries before you have an 88% chance of seeing one failure (1 − 0.9²⁰ = 87.8%).',
      'Finds the original run by its trace: the exact prompt and prompt version, model and settings, retrieved passages, tool calls, conversation history, and the time. Without a trace the first fix is to log one.',
      'Replays with the same inputs, including the same retrieved context, many times to estimate a failure rate, and then changes one thing at a time to localise the cause.',
      'Lists hypotheses and checks each: retrieval returned a different or outdated passage, the document changed or was re-indexed, a prompt or model release went out, or plain sampling variance with the same context.',
      'Writes the report with the user’s input, expected and actual output, frequency over N replays, the trace and versions, the severity and who is affected, and suggests a regression test.',
      'Adds a case to the eval set with a check that code can run (the answer states the right window and does not state the wrong one), so the bug stays fixed.',
      'Handles personal data in the trace with care: redact before sharing, and follow the retention rules.',
    ],
    followUps: [
      {
        q: 'The trace was not kept. What do you tell the team to change?',
        lookFor: 'Keep full traces for errors, negative feedback and slow runs (tail sampling) and tie user feedback to a trace ID, so a complaint is investigable.',
      },
      {
        q: 'The failure shows up 2 times in 20 replays. What does that tell you, and what next?',
        lookFor: 'A real, repeatable rate of about 10% with wide uncertainty. Check retrieval and context first (the same context may always fail or always pass), try a fix, and re-measure with enough replays to see the difference.',
      },
      {
        q: 'How do you decide the severity?',
        lookFor: 'Impact if wrong (money, safety, legal) times how often and how many users, not how surprising it is. A wrong refund policy affecting real money is high.',
      },
    ],
    redFlags: [
      'Closes the ticket after three good runs.',
      'Writes “the AI sometimes gets it wrong” with no inputs, versions or rate.',
      'Replays without the original retrieved context.',
      'Blames the user’s wording.',
    ],
    lessons: ['evals/observability-for-llm-apps', 'evals/building-an-eval-dataset'],
  },
  {
    id: 'how-many-eval-cases-to-see-a-regression',
    prompt:
      'Your suite has 200 cases and the current prompt passes 85% of them. A new prompt scores 80%. Is that a regression? How many cases would you need to detect a real 5-point drop reliably, and how does running both versions on the same cases change the answer?',
    roles: ['ai-test'],
    level: 'mid',
    kind: 'estimation',
    topics: ['evals', 'statistics', 'regression testing', 'sample size'],
    minutes: 18,
    strong: [
      'Computes the noise on one score: sqrt(0.85 × 0.15 ÷ 200) ≈ 0.025, so a 95% range of about ±4.9 points around 85%.',
      'Computes the noise on the difference between two independent runs: sqrt(0.85 × 0.15 ÷ 200 + 0.80 × 0.20 ÷ 200) ≈ 0.038, so about ±7.4 points. A 5-point drop is inside that range, so this is not yet evidence of a regression, and also not evidence of none.',
      'Sizes an unpaired test for 85% against 80% with a 5% two-sided false-alarm rate and 80% power: n = (1.96 + 0.84)² × (0.85 × 0.15 + 0.80 × 0.20) ÷ 0.05² ≈ 903 cases per version.',
      'Explains the paired design: the same cases are run through both versions and only the cases that flipped carry information. If an example 10% of cases flip (7.5% worse, 2.5% better, a net 5 points) the normal-approximation formula gives about 312 cases. The flip rate is an assumption to measure on a pilot.',
      'Compares the two with a sign test on the flipped cases and reads the flipped cases by hand. Decides the rule before looking: block on any critical-case failure, and otherwise on a drop that passes the test or exceeds an agreed tolerance.',
      'Says “not significant” means “no evidence yet”, and that a small suite is a smoke alarm for big collapses, not a measure of small changes.',
      'Mentions multiple comparisons: checking 10 slices at a 5% false-alarm rate each gives 1 − 0.95¹⁰ ≈ 40% chance that at least one slice looks worse by luck.',
    ],
    followUps: [
      {
        q: 'You only have 30 cases. What can you claim?',
        lookFor: 'At 85% the 95% range is about ±12.8 points, so only big collapses and individual case failures can be seen. Use it to find problems and read the cases, grow the set from real failures, and do not quote small differences.',
      },
      {
        q: 'The run-to-run noise of the model itself is 2 points on the same case set. How does it change the plan?',
        lookFor: 'It adds variance beyond the case sampling. Run each version several times, average per case, and measure noise by running the baseline repeatedly. Set the tolerance band from that measured noise.',
      },
      {
        q: 'A product manager asks for “statistical proof” before every prompt tweak. What do you say?',
        lookFor: 'Proportion to risk: cheap sanity gates on every change, stricter paired tests with more cases for risky ones, and a tolerance for tweaks that cannot be measured at all, backed by online monitoring.',
      },
    ],
    redFlags: [
      'Declares a regression or a win from a 5-point gap on 200 cases.',
      'Treats “not significant” as proof that nothing changed.',
      'Ignores that both versions can be run on the same cases.',
      'Slices into many small groups and reads each one’s noise as signal.',
    ],
    lessons: ['evals/building-an-eval-dataset', 'ml/is-the-difference-real', 'evals/evals-101'],
  },
  {
    id: 'judge-agreement-94-percent-misses-bad-answers',
    prompt:
      'You calibrate a faithfulness judge on 200 outputs labelled by humans: 20 are unfaithful (they contain invented claims) and 180 are faithful. The judge agrees with the humans on 188 of 200 outputs, 94%, and the team wants to ship it as a release gate. What do you check before saying yes?',
    roles: ['ai-test'],
    level: 'mid',
    kind: 'debugging',
    topics: ['llm-as-judge', 'evals', 'calibration', 'base rate'],
    minutes: 20,
    strong: [
      'Looks inside the 94%. The judge flagged 12 of the 20 unfaithful outputs (recall 60%) and passed 176 of the 180 faithful ones (4 false flags). A judge that passes everything would already agree on 180 of 200, which is 90%.',
      'Uses a chance-corrected measure and per-class rates: kappa is (0.94 − 0.836) ÷ (1 − 0.836) ≈ 0.63, where 0.836 is the expected chance agreement (0.10 × 0.08 + 0.90 × 0.92). Reads it alongside recall and precision, not instead of them.',
      'Notes that 12 of 20 is a small sample: the 95% range for recall is roughly 39% to 78%. The set has too few bad examples to be a basis for a gate, so collects more failures, from real traffic and labelled by more than one person.',
      'Works the base rate: at an example 2% production rate on 50,000 outputs a day, 1,000 are bad, 60% recall catches 600, and 2.2% false flags on 49,000 good outputs is about 1,089. Precision is then 600 ÷ 1,689 ≈ 36%, not the 75% seen on the 10%-bad calibration set.',
      'Reads the 8 misses and the 4 false flags to find patterns: claims the judge cannot see because it lacks the source, subtle numbers, or a vague rubric.',
      'Improves the judge before shipping it: give it the source text, split the check into specific yes-or-no questions per claim, ask for reasoning before the verdict, use a different model family, and re-measure.',
      'Positions it correctly: use it to prioritise human review and to track trends, together with code checks, not as the only gate on high-stakes output, and recalibrate when the judge, the rubric or the content changes.',
    ],
    followUps: [
      {
        q: 'What if the judge had 100% recall but flagged 10% of good answers?',
        lookFor: 'Then it is a different trade-off: reviewers drown in false flags. Choose the operating point from the cost of a missed bad answer against the cost of reviewing a good one, using the production base rate.',
      },
      {
        q: 'Two human labellers disagree on 8 of the 200. What do you do with those?',
        lookFor: 'Measure their kappa, read the disagreements, fix the rubric where it is vague, and decide the label by a named owner. Judge “errors” on ambiguous items are not errors.',
      },
      {
        q: 'How do you keep the judge honest over months?',
        lookFor: 'A fixed human-labelled calibration set rescored when the judge model, prompt or content type changes, periodic fresh human audits of a random sample, and pinned judge versions.',
      },
    ],
    redFlags: [
      'Ships on the headline agreement alone.',
      'Does not compare with an always-pass baseline.',
      'Quotes precision from a balanced calibration set as if it held in production.',
      'Calibrates on 20 failures and calls it done.',
    ],
    lessons: ['evals/llm-as-judge-pitfalls', 'evals/building-an-eval-dataset', 'evals/guardrails-in-practice'],
  },
  {
    id: 'test-plan-for-a-rag-help-assistant',
    prompt:
      'You are asked to write the test plan for a help-centre assistant that answers from the company’s articles and cites them. What do you test, with what kinds of questions, and how do you tell a retrieval bug from a generation bug?',
    roles: ['ai-test'],
    level: 'mid',
    kind: 'design',
    topics: ['rag', 'testing', 'evals', 'coverage'],
    minutes: 25,
    strong: [
      'Tests the parts separately and together: retrieval alone (does the right passage appear in the top k, using questions labelled with their source passages), generation given a fixed context (is the answer faithful to the passages), and end to end.',
      'Covers question types on purpose: answerable, unanswerable (must say it does not know, not guess), ambiguous (should ask), needing several documents, outdated or superseded policy, follow-ups that use pronouns, paraphrases and typos, and other languages.',
      'Checks citations: the cited passage exists and actually supports the claim, tested with code for existence and a judge with the source for support.',
      'Tests access: a user without permission for a restricted article must not get content from it through retrieval or through the answer, as a security check with zero tolerance.',
      'Tests freshness: update or delete an article, re-index, and confirm that the old text is gone and the new text is used.',
      'Tests robustness: a document that contains an instruction must not change the assistant’s behaviour, and long or empty retrievals are handled.',
      'Reports by slice (topic, language, answerability), keeps a held-out set, and runs the suite on every change to prompts, chunking, embeddings, index or model.',
      'Separates the bug type with the two layers: if the right passage is not in the retrieved set the fault is retrieval, and if it is there but the answer is wrong it is generation or context order.',
    ],
    followUps: [
      {
        q: 'The answer is correct but cites the wrong article. Is that a pass?',
        lookFor: 'No: users and reviewers trust the citation. It is a defect with its own metric, since the claim is unsupported by what is cited, and is often caused by chunking or by the model attaching a nearby source.',
      },
      {
        q: 'Retrieval recall at 5 is 92% but 20% of answers are wrong. Where do you look?',
        lookFor: 'Generation and context: passage order and length, conflicting passages, the model ignoring context, and answers to unanswerable questions. Check by feeding the right passage alone and see whether it is faithful.',
      },
      {
        q: 'How do you get questions before launch, when you have no traffic?',
        lookFor: 'Real queries from the old search logs and support tickets, expert-written hard cases and, carefully, synthetic ones built from dimension tuples. Replace them with real traffic as soon as it exists.',
      },
    ],
    redFlags: [
      'Tests only with questions written from the articles themselves.',
      'Has no unanswerable questions.',
      'Never tests access control.',
      'Measures only the final answer, so retrieval and generation faults cannot be separated.',
    ],
    lessons: ['rag-agents/rag-from-scratch', 'rag-agents/vector-search-and-retrieval-metrics', 'evals/building-an-eval-dataset', 'evals/guardrails-in-practice'],
  },
  {
    id: 'eval-gate-fails-randomly-in-ci',
    prompt:
      'Your CI runs a 100-case eval and blocks a merge if fewer than 90 cases pass. The team complains that good changes are blocked at random and starts rerunning until it goes green. The prompt’s true pass rate is about 92%. How big is the problem, what is wrong with the rerun habit, and how do you fix the gate?',
    roles: ['ai-test'],
    level: 'mid',
    kind: 'debugging',
    topics: ['ci', 'evals', 'flaky tests', 'release gates'],
    minutes: 20,
    strong: [
      'Computes the false-fail rate from the binomial: with a true rate of 92% on 100 cases, fewer than 90 passes happens about 17.6% of the time (and at a true 90% it is about 42%). Across 20 PRs the chance of at least one spurious block is 1 − (1 − 0.176)²⁰ ≈ 98%.',
      'Names the causes: a threshold sitting close to the true score, a small suite, and model non-determinism, so the score moves from run to run even with no change.',
      'Explains why “rerun until green” is harmful: a real regression to a true 86% passes a single run 15.6% of the time and, with one rerun allowed, about 28.8% of the time (1 − 0.844²). The habit turns the gate into noise and teaches people to ignore it.',
      'Measures the noise: run the unchanged baseline many times (for example 10) and look at the spread. Sets the tolerance from that, not from a round number.',
      'Compares the candidate with the baseline on the same cases in the same run, paired, and fails the gate on a drop larger than the measured tolerance or on a significant change on the flipped cases, instead of on an absolute rate.',
      'Splits the gate in two: a hard part for critical, code-checkable cases that must all pass (rerun a failure several times and treat any failure as real), and a soft part for the overall rate with an interval.',
      'Reduces noise at the source: pin the model snapshot, lower the sampling temperature where that fits, fix or retire flaky cases, add cases, and show the flipped cases in the CI output, not just a percentage.',
    ],
    followUps: [
      {
        q: 'The team proposes lowering the threshold to 85. What happens?',
        lookFor: 'False fails nearly vanish (about 0.6% at a true 92%), but a real regression to 86% now passes about 68% of the time. The threshold trades blocked good changes against missed bad ones, so choose it with both numbers in view.',
      },
      {
        q: 'Which cases should never be rate-based?',
        lookFor: 'Safety, privacy and must-refuse cases, such as one customer’s data shown to another. They get zero tolerance, with several trials per case since a single pass proves little.',
      },
      {
        q: 'How do you stop the suite from becoming too slow for CI?',
        lookFor: 'A fast tier on each PR (code-graded and critical cases), a fuller tier nightly or before release, selective runs by what changed, and cost and time budgets reported on every run.',
      },
    ],
    redFlags: [
      'Accepts rerunning until green.',
      'Fixes the flake by lowering the threshold without looking at what it now misses.',
      'Gates only on one absolute number for a noisy score.',
      'Does not measure the baseline’s run-to-run spread.',
    ],
    lessons: ['evals/llmops-in-production', 'systems/testing-and-deploying-ml-models', 'ml/is-the-difference-real', 'evals/building-an-eval-dataset'],
    game: { label: 'Incident Room', href: '/play/incident-room/' },
  },
  {
    id: 'synthetic-test-data-for-claims-summaries',
    prompt:
      'You must test a feature that summarises insurance claim notes, but you are not allowed to use real claims yet. How do you generate test data you can trust, what can it tell you, and what can it not tell you?',
    roles: ['ai-test'],
    level: 'mid',
    kind: 'design',
    topics: ['test data', 'synthetic data', 'evals', 'privacy'],
    minutes: 20,
    strong: [
      'Defines the dimensions with a domain expert before generating anything: claim type, note quality (abbreviations, typos, copied text), length, missing fields, conflicting information, and language. Four types × three note qualities × two languages × two completeness levels gives 48 tuples, and two phrasings each give 96 cases.',
      'Generates in two steps: expand the tuples by hand or with a model, then turn each tuple into a natural note in a separate call, which avoids a pile of near-identical texts.',
      'Plants known facts (an amount, a date, a name that is fake) so that code can check whether the summary kept them, and builds the negative cases too: a note with the date missing must produce a summary that says the date is unknown, not an invented one.',
      'Generates inputs, not expected outputs, so the cases do not inherit the generator’s blind spots, and keeps the model that generates apart from the model that judges.',
      'Checks realism: a domain expert reads a sample, compares it with any formats you are allowed to see, and removes cases that nobody would write. Dedupes near-copies.',
      'Is clear about the limits: synthetic cases start the work and cover rare situations, but they are tidier than real notes and say nothing about how common a failure is. Replace or supplement them with real, approved data as soon as the rules allow.',
      'Keeps privacy: only invented people and numbers, a check that the generator did not reproduce real details, and approval from the privacy team before using any real data (this is not legal advice).',
    ],
    followUps: [
      {
        q: 'The feature scores 99% on the synthetic set but looks worse on the first real notes. Why?',
        lookFor: 'The synthetic notes are too clean and too easy, and miss real messiness. Compare the distributions of length and noise, add the real failures as cases, and treat the 99% as an upper bound on easy inputs.',
      },
      {
        q: 'Could you redact real claims and use those?',
        lookFor: 'Possibly, with privacy approval and a careful process, but redaction tools miss things, so check the output. Retention and consent rules vary, so ask the privacy team.',
      },
      {
        q: 'How would you detect that your generator is producing near-duplicate cases?',
        lookFor: 'Deduplicate on text and on an embedding similarity threshold, count cases per tuple, and sample for diversity by hand.',
      },
    ],
    redFlags: [
      'Asks one model for “100 test cases” and uses them as they come.',
      'Uses the generator’s own answers as the expected outputs.',
      'Quotes a synthetic pass rate as the expected production quality.',
      'Pastes real customer data into a public tool.',
    ],
    lessons: ['evals/building-an-eval-dataset', 'responsible/privacy-engineering-for-ai'],
  },
  {
    id: 'behavioural-severe-failure-two-days-before-launch',
    prompt:
      'Two days before a launch, your red-team run finds that in 6 of 40 attempts the assistant shows one customer another customer’s order details. Product wants to ship on schedule with a known-issues note. Walk me through what you do.',
    roles: ['ai-test'],
    level: 'senior',
    kind: 'behavioural',
    topics: ['behavioural', 'release gates', 'privacy', 'security'],
    minutes: 20,
    strong: [
      'Starts with facts and a clear classification: showing one customer another’s data is a privacy and security failure, so it is a release blocker for the affected feature, not a quality score to be traded.',
      'Reproduces it, measures the rate over repeated attempts, finds the root cause (is the permission check in the tool code, or only in the prompt?), and scopes who and what is exposed.',
      'Communicates at once, in writing: what happened, how often in testing, how it works at a high level (without sharing the exact attack widely), who could be affected, and the options. Involves the owners of privacy and security.',
      'Lays out options with their cost: fix and retest before launch, launch without the affected tool or feature, or delay. Makes the risk explicit and gets a named owner to accept any residual risk in writing; the tester recommends, and does not quietly decide for others.',
      'Insists the fix is enforced in code (the tool filters by the signed-in user), not by a prompt line, then tests many variants, not just the one prompt that failed.',
      'Is honest about what a clean retest means: 0 failures in 40 attempts puts the 95% upper bound near 3 ÷ 40 = 7.5%, so a short retest proves little, and more variants and attempts are needed.',
      'Adds the case and its variants to a permanent critical list with zero tolerance, and sets up monitoring and an incident plan for after launch.',
    ],
    followUps: [
      {
        q: 'The product manager says 6 of 40 is a rate on adversarial prompts, not on real traffic, so it is rare. How do you respond?',
        lookFor: 'Agrees the adversarial rate is not the production rate, but the severity is high and a motivated user can find it. The harm of one exposure outweighs the rarity, and the design flaw is the same either way.',
      },
      {
        q: 'The proposed fix is one added sentence in the system prompt. Do you accept it?',
        lookFor: 'No, not alone. A prompt is a request, not an access control. Ask for the check in code, and test whether the prompt change really removes the behaviour across variants.',
      },
      {
        q: 'Leadership still decides to launch with the issue. What do you do?',
        lookFor: 'Ensure the decision and the accountable owner are recorded, press for mitigations (limit the exposure, monitoring, a kill switch), escalate through the proper channel if it breaks policy or law, and keep testing. Do not alter the findings.',
      },
    ],
    redFlags: [
      'Treats it as a normal bug with a priority number.',
      'Accepts a prompt-only fix.',
      'Keeps the finding to a small group to avoid conflict.',
      'Declares it fixed after the one failing prompt passes.',
    ],
    lessons: ['evals/llm-security', 'responsible/privacy-engineering-for-ai', 'evals/guardrails-in-practice'],
  },
  {
    id: 'red-team-test-plan-for-a-tool-using-assistant',
    prompt:
      'Write the red-team test plan for a customer-facing assistant that can read orders and issue refunds. Cover scope, what you test, how you decide pass or fail, how you report, and when you run it again. Keep it defensive: describe categories and checks, not attack strings.',
    roles: ['ai-test'],
    level: 'senior',
    kind: 'design',
    topics: ['red teaming', 'security', 'evals', 'test plan'],
    minutes: 30,
    strong: [
      'Sets the scope and rules: the assets to protect (customer data, money, the brand), the kinds of attacker (a curious user, a malicious user, malicious content inside documents or emails), an isolated test environment with fake data and test credentials, and who may run it.',
      'Lists the categories to cover, using a public taxonomy such as the OWASP Top 10 for LLM applications as a checklist: direct and indirect prompt injection, access to another user’s data, exfiltration through links or images, over-permissioned tools, abuse of cost, disclosure of the system prompt (assume it is not secret), and policy-violating content.',
      'Defines pass conditions on what the application did, not on what the model said: no unauthorised tool call, no cross-user data, no request to an unlisted domain, a refusal stays a refusal. Checks them with code against the logs and the environment state.',
      'Builds a coverage matrix of categories by entry point (chat, upload, email, web page, tool result) and tracks which cells have been tried, so gaps are visible.',
      'Mixes human experts, who find new classes of failure, with automated generation, which scales variants of known ones. Because results vary, each case is tried several times and the success rate is reported per category with an interval.',
      'Treats findings as engineering work: severity, owner, a fix enforced in code where possible (permissions, egress limits, validation), and a permanent regression case. Keeps details of working attacks in a restricted place.',
      'Sets a cadence: a fixed suite on every prompt, model or tool change, and a fresh human red-team round before major releases and after incidents.',
    ],
    followUps: [
      {
        q: 'The automated attacker finds nothing this week. Can you say the assistant is safe?',
        lookFor: 'No. Absence of findings is not proof, and the tester covers only what it tries. Report coverage, attempts and the residual risk, and keep fresh human testing in the plan.',
      },
      {
        q: 'How do you know when to stop testing a category?',
        lookFor: 'When new attempts stop revealing new kinds of failure (saturation), coverage targets are met, and the remaining risk is accepted by an owner. Time-boxing alone is not a reason.',
      },
      {
        q: 'A tester discovers a way to extract another user’s data. Who needs to know, and how?',
        lookFor: 'A private, immediate report to the security and privacy owners with a reproduction in a restricted channel, severity, and a fix timeline, not a message in a public chat.',
      },
    ],
    redFlags: [
      'Grades by whether the reply looks polite or refuses.',
      'Tests only the chat box and not documents, emails or tool results.',
      'Has no regression set, so old holes reopen.',
      'Shares working attack details widely.',
    ],
    lessons: ['evals/llm-security', 'evals/guardrails-in-practice', 'evals/building-an-eval-dataset'],
  },
  {
    id: 'eval-suite-saturated-and-stale',
    prompt:
      'Your regression suite of 120 cases has passed at 97 to 98% for six months, yet users keep reporting kinds of failure that the suite never shows. A manager asks whether to retire the suite. What do you tell them, and what do you do?',
    roles: ['ai-test'],
    level: 'senior',
    kind: 'design',
    topics: ['evals', 'regression testing', 'coverage', 'dataset maintenance'],
    minutes: 20,
    strong: [
      'Explains saturation with numbers: at 117 of 120 (97.5%), one case is 0.83 points and the 95% range is about ±2.8 points, so the suite cannot see small gains or small losses, and a pass rate that stays high says the model passes these cases, not that the product is good.',
      'Keeps the suite for what it is good at, a guard against regressions on known behaviour, and stops using it as a measure of progress.',
      'Finds the missing coverage by reading fresh traces: sample about 100, write open notes on what went wrong, group, count, and see which failure kinds have no case. Repeats on a schedule, such as 10 to 20 new traces a week.',
      'Builds a second, harder suite from production failures, escalations, low feedback and judge-human disagreements, aimed at a middling pass rate (for example 40 to 70%) where changes are visible. Reports the two suites separately.',
      'Checks for contamination: whether cases were copied into the prompt as examples or used for tuning, which inflates the score. Keeps a held-out portion that nobody tunes on.',
      'Cleans up: removes duplicates, retires cases that always pass and mean nothing, checks that hard cases are fair (two experts agree and a reference solution exists), and versions the suite so scores across versions are not compared as if they were the same test.',
      'Assigns an owner and a cadence, and ties it to slices and risks (see the coverage matrix), so the suite follows the product as it changes.',
    ],
    followUps: [
      {
        q: 'How do you know the new hard suite is fair and not just broken cases?',
        lookFor: 'A 0% pass rate is most often a broken case. Check that a reference solution exists, that two domain experts agree on the grade, and read transcripts of failures.',
      },
      {
        q: 'The score on the hard suite rose from 52% to 58% after a prompt change on 100 cases. Do you celebrate?',
        lookFor: 'Not yet: the 95% range on 100 cases is about ±10 points, and the flipped cases decide it. Use a paired comparison, read the flips, and check the held-out set.',
      },
      {
        q: 'Should old scores be rewritten when you add cases to the suite?',
        lookFor: 'No: record the suite version with every score and say that scores before and after a change in cases are not comparable. Re-run the old build on the new suite if you need a trend.',
      },
    ],
    redFlags: [
      'Retires the suite because it always passes, with nothing to replace it.',
      'Reads a flat 97% as proof of quality.',
      'Adds cases from the prompt’s own examples.',
      'Compares scores across different suite versions without comment.',
    ],
    lessons: ['evals/building-an-eval-dataset', 'evals/llmops-in-production', 'evals/evals-101'],
  },
  {
    id: 'coverage-matrix-for-an-llm-feature',
    prompt:
      'In code testing we report line coverage. What does “coverage” mean for an LLM feature, how would you measure it, and how would you report it to a team that wants one number?',
    roles: ['ai-test'],
    level: 'senior',
    kind: 'concept',
    topics: ['coverage', 'evals', 'test planning', 'slices'],
    minutes: 20,
    strong: [
      'Says line coverage does not apply, because the behaviour comes from a model and the inputs are open-ended. Coverage here means how much of the input space and the risk space your cases represent.',
      'Builds a matrix from dimensions that matter (topic, language, answerable or not, user type, input length, channel, adversarial) and counts cases per cell. An example grid of 4 topics × 3 languages × 2 answerability levels is 24 cells, so 120 cases average only 5 per cell.',
      'Reads what small cells can say: 4 of 5 passing has a 95% range of about 38% to 96%, which is nearly no information. Weights cells by risk and traffic, with more cases for critical or common cells, and reports empty and thin cells openly.',
      'Compares the case mix with the production mix and finds gaps: cluster real traffic and look for clusters with no nearby test case, treating this as a lead for human review rather than a proof.',
      'Measures other kinds of coverage as well: each policy rule has a case, each tool and guardrail category is exercised, and each known failure type from the error analysis has at least a minimum number of cases.',
      'Keeps a separate list of critical cases (harm, data leaks) with zero tolerance, and reports per-slice floors next to the overall number, since an overall 92% can hide a slice at 60%.',
      'Gives the team a short dashboard, not one number: overall score, slice scores with intervals, coverage of cells, critical-case status, and the largest known gaps. States plainly that 100% coverage is not possible and what is explicitly not covered.',
    ],
    followUps: [
      {
        q: 'You can add 50 more cases this month. Where do they go?',
        lookFor: 'Where risk times uncertainty is highest: critical cells with few cases, slices where users complain, and clusters in real traffic with no cases. Not into cells that already pass with room to spare.',
      },
      {
        q: 'Overall pass rate is 92% but the Spanish-language slice is at 60% on 20 cases. What do you report?',
        lookFor: 'The slice with its interval (about 39% to 78% for 12 of 20), flags it as a likely problem and a thin sample, adds cases, and sets a floor so the gate would fail it. Does not hide it in the average.',
      },
      {
        q: 'A director asks for a single coverage percentage. What do you give?',
        lookFor: 'Offer a small set of honest numbers, for example the share of risk-weighted cells with at least a minimum number of cases, and state what that does not capture. A single figure may be given with its definition, never alone.',
      },
    ],
    redFlags: [
      'Reports the number of test cases as coverage.',
      'Treats an overall score as covering every slice.',
      'Reads a 4-of-5 cell as a result.',
      'Claims the suite covers everything.',
    ],
    lessons: ['evals/building-an-eval-dataset', 'systems/testing-and-deploying-ml-models', 'evals/evals-101'],
  },
];
