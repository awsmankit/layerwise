import type { Question } from './types';

/**
 * Interview questions added in wave 5 (builder-risk): building with LLMs, MLOps and ML system design, responsible AI.
 * Every worked number in a prompt or a strong point was recomputed in a scratch script; figures that depend on a vendor
 * or a study are tied to the lesson that cites it and dated there. Legal topics are hedged and are not legal advice.
 */
export const questionsBuilderRisk: Question[] = [
  {
    id: 'agent-tools-not-endpoint-wrappers',
    prompt:
      'You are giving an internal assistant access to your CRM through an API with 45 endpoints (list_customers, get_customer, list_orders, list_notes, update_contact and so on). The first prototype wraps every endpoint as a tool. It picks the wrong tool about one time in five, and list_customers returns whole records and floods the context. How do you redesign the tools, and how do you know the redesign worked?',
    roles: ['ai-eng'],
    level: 'mid',
    kind: 'design',
    topics: ['agents', 'tool use', 'tool design', 'evals'],
    minutes: 20,
    strong: [
      'Treats the name, description and schema as prompt text for a reader that guesses: the description says what the tool does, when to use it and when not to, what each parameter means and what it does not return. Applies the new-hire test: could a person use it from only what the model sees?',
      'Builds fewer, task-shaped tools instead of one per endpoint (for example a get_customer_context that replaces get_customer, list_transactions and list_notes), namespaces them by service and resource, and does not ask the model for values the code already knows, such as the signed-in user’s ID.',
      'Makes invalid states unrepresentable: enums instead of free strings, units in the name (amount_usd), unambiguous parameter names (customer_id, not customer), and strict schema mode where the provider offers it.',
      'Controls what comes back: readable names or short IDs instead of raw UUID dumps, a concise or detailed format the model can choose, pagination, filters and a default cap, and a hint on how to narrow the request when a result is truncated.',
      'Writes errors as the model’s next instruction: what went wrong, what is allowed and whether to retry, for example “No customer with ID maya@example.com. get_customer needs an ID like cus_8f3a21; call search with an email to find one.” Returns it as a tool execution error the model can read, not a bare status code or a stack trace.',
      'For anything that changes the world, previews first and confirms second, marks tools as destructive or idempotent knowing those annotations are hints rather than guarantees, and enforces approval in code, not in the prompt.',
      'Measures with realistic multi-call tasks that have checkable outcomes, recording accuracy, number of calls, tokens and errors, reads the transcripts, changes one thing at a time, keeps a held-out set, and re-runs when the model or a connected server changes.',
    ],
    followUps: [
      {
        q: 'The 45 definitions come to about 350 tokens each and a run takes 25 steps. What does that cost before any real work, and what are your options?',
        lookFor: '45 × 350 = 15,750 tokens, resent on each step: 393,750 input tokens a run, about $1.18 at an example $3 per million, or about $0.12 if a stable prefix is read from a cache at 0.1×. Options: fewer and clearer tools, loading definitions on demand through a tool-search step, and a stable prefix. Notes that vendors give soft limits (tens of tools) that are guidance to test, not a rule.',
      },
      {
        q: 'A refund tool times out and the model calls it again. What happens, and what should the design have done?',
        lookFor: 'Without protection a retry can pay twice. The code, not the model, generates an idempotency key from the request so a repeat returns the saved result; a preview step and a confirmation bound to the exact arguments make the action deliberate.',
      },
      {
        q: 'How would you tell whether the descriptions or the number of tools is the problem?',
        lookFor: 'Reads transcripts: many invalid-parameter errors point to unclear descriptions, repeated calls to a missing filter or limit, and wrong picks among near-identical tools to overlap. Runs one change at a time (rewrite three descriptions, then merge tools) on a held-out set.',
      },
    ],
    redFlags: [
      'Wraps every endpoint one-to-one and passes raw API payloads back to the model.',
      'Writes one-line descriptions and assumes the model will work it out.',
      'Returns “Error: 404” or a stack trace as the tool result.',
      'Relies on the prompt to make the model ask before a destructive action.',
      'Has no evaluation of tool use beyond trying it a few times.',
    ],
    lessons: ['rag-agents/designing-tools-for-agents', 'rag-agents/agents-and-tool-use', 'rag-agents/mcp-in-depth'],
  },
  {
    id: 'agent-context-compaction-long-run',
    prompt:
      'A coding agent works for an hour on a large refactor. Tool output, file contents and its own reasoning have filled the context window twice, and after the last compaction it forgot a rule the user gave at the start (never edit the vendor directory) and edited it. Design how the agent should manage context and memory over a long run, and how you would test it.',
    roles: ['ai-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['agents', 'memory', 'context engineering', 'compaction'],
    minutes: 20,
    strong: [
      'Treats the window as a budget, not a store: more context is not better context. Cites context rot and the position effect (information at the start or end is used better than in the middle) and aims for the smallest set of high-signal tokens.',
      'Separates short-term memory (the thread), working memory (notes the agent writes: a plan, a to-do list, a NOTES.md) and long-term memory (retrieved facts, episodes and instructions). Says memory is not the same as RAG: the agent or app writes it, it changes constantly, it is scoped per user or task, and the hard question is what is worth remembering and whether it is still true.',
      'Names the strategies and what each loses: truncation silently drops early rules; summarisation blurs, and a summary of a summary is lossier; clearing old tool results is the lightest-touch option; notes in files survive but depend on what the agent chose to write; sub-agents with clean contexts return a short summary but multiply tokens; just-in-time retrieval keeps references and loads on demand.',
      'Fixes the bug directly: pins user rules and safety constraints verbatim in a block that compaction cannot rewrite, restates a constraint when it becomes relevant, and tunes the compaction prompt on real long traces, maximising recall first and precision second.',
      'Notes the cache interaction: rewriting early context changes the prompt prefix, so a cached prefix stops matching; compact rarely, at fixed points.',
      'Treats memory as untrusted and scoped: records where each entry came from, does not let tool results write rules, dates entries and supersedes stale ones instead of appending, scopes by user and tenant in the store rather than the prompt, and never stores credentials.',
      'Tests memory like any component: plant a fact at turn k and ask at turn n, change a fact and check the new value wins, give a fake secret and check it never reaches the store, check isolation between users, probe with an injected instruction, and replay the same long trace after any change to the compaction prompt.',
    ],
    followUps: [
      {
        q: 'Why not just buy a bigger context window?',
        lookFor: 'A window is a capacity limit, not a promise about use: accuracy can fall with length, distractors and middle position. Cost and latency grow because the whole context is resent on every step, and pinning is still needed.',
      },
      {
        q: 'On day 1 the agent noted “staging URL is X”. On day 3 the URL changed. How does memory fail here and what do you build?',
        lookFor: 'Stale facts: store a date and source with each entry, overwrite or supersede rather than append, expire what is unused, and verify before relying on a high-impact entry.',
      },
      {
        q: 'A web page the agent read contains an instruction and it ends up in the notes file. Why is that worse than a one-off injection?',
        lookFor: 'Persistent poisoning carries the attacker’s text into every later session (a published attack on agent memory reported high success from a very small share of poisoned entries). Track provenance, do not let tool content write rules, review high-impact entries, and keep the permission boundary in code.',
      },
    ],
    redFlags: [
      'Says “summarise when full” with no thought about which rules must survive.',
      'Treats agent memory as the same thing as RAG over a static corpus.',
      'Stores everything the user says, including credentials, with no deletion path.',
      'Has no replayable test for compaction.',
    ],
    lessons: ['rag-agents/agent-memory-and-context-engineering', 'llm/context-window-and-caching', 'evals/llm-security'],
  },
  {
    id: 'multi-agent-or-single-agent-cost',
    prompt:
      'A product manager proposes replacing a single-agent research assistant with a team of cooperating agents. Assume one chat-style answer uses 8,000 tokens, a blended price of $5 per million tokens, and 6,000 tasks a day. A vendor engineering write-up reports agents using about 4 times the tokens of a chat and multi-agent systems about 15 times. Estimate the daily cost of each design, then say what else you would want to know before agreeing.',
    roles: ['ai-eng'],
    level: 'mid',
    kind: 'estimation',
    topics: ['multi-agent', 'cost', 'reliability', 'agents'],
    minutes: 12,
    strong: [
      'Computes tokens per task: chat 8,000, single agent 32,000, multi-agent 120,000.',
      'Converts with units checked (tokens ÷ 1,000,000 × $5): $0.04, $0.16 and $0.60 a task, so $240, $960 and $3,600 a day at 6,000 tasks. The multi-agent bill is 15 times the chat bill.',
      'Says the 4× and 15× multipliers are one vendor’s reported figures for its own system, not constants: measure your own token counts from the usage field, per feature.',
      'Compares cost per solved task, not per call. With example success rates of 70% for the single agent and 85% for the multi-agent design, that is $0.16 ÷ 0.70 = $0.23 against $0.60 ÷ 0.85 = $0.71, so the extra spend must be worth more than the extra solved tasks.',
      'Notes that reliability and time multiply too: ten steps at 95% each succeed about 60% of the time (0.95^10), four workers that must all be right at 93% each about 75% (0.93^4), assuming independence; parallel work waits for the slowest worker and adds a planning and a synthesis call.',
      'Gives the cases that justify more than one agent (parallel breadth, separate contexts, different tools or permissions) and says to start with one agent and an eval. Writing in parallel does not merge the way reading does.',
      'Names controls: budgets in code for steps, tokens, time and workers, structured hand-offs, a verifier that sees the sources, least privilege per agent, and tracing.',
    ],
    followUps: [
      {
        q: 'On your eval the multi-agent version solves 85% of tasks and the single agent 70%. Is it worth it?',
        lookFor: 'The extra cost is about $0.48 per solved task for 15 more points. Compare it with the value of a solved task and with cheaper options (a better single agent, retrieval, a fixed workflow), put intervals on both scores, and check pass^k, not one run.',
      },
      {
        q: 'Which tasks would you not split across agents?',
        lookFor: 'Tasks that write one shared artefact, such as coding, and sequential planning: workers act on different implicit assumptions and the pieces do not fit. Independent read-only investigations parallelise well.',
      },
      {
        q: 'How do you stop it spawning fifty sub-agents for a simple query?',
        lookFor: 'Caps in code per run and per worker. Effort rules in the prompt are guidance because models misjudge effort; the cap is the guarantee.',
      },
    ],
    redFlags: [
      'Treats the 15× figure as exact, or as proof that more agents are smarter.',
      'Compares cost per call rather than cost per solved task.',
      'Assumes step failures are independent without saying so.',
      'Adds agents for tidiness rather than a named reason.',
    ],
    lessons: ['rag-agents/multi-agent-systems', 'cost/where-the-tokens-go', 'rag-agents/agents-and-tool-use'],
  },
  {
    id: 'constrained-decoding-guarantees',
    prompt:
      'Your extraction service must return an object with a category and an urgency from 1 to 5, and you switch on the provider’s schema-constrained output. Explain what the platform does to the model’s next-token choice, what that guarantees and what it does not. After a vendor change one of your numeric bounds stops being enforced; how do you design so that it does not matter?',
    roles: ['ai-eng', 'ml-eng'],
    level: 'mid',
    kind: 'concept',
    topics: ['structured output', 'constrained decoding', 'inference', 'schemas'],
    minutes: 14,
    strong: [
      'Explains the mechanism: a grammar derived from the schema says which tokens can still lead to a valid output; every other token has its score set to minus infinity, so its probability becomes zero, and the rest are rescaled to sum to one. The model then samples as usual.',
      'Works a number: if the allowed tokens carry 30%, 20% and 14% and the blocked ones 36%, the allowed ones become 30/64 = 46.9%, 20/64 = 31.3% and 14/64 = 21.9%. The odds between allowed tokens do not change.',
      'Knows it works on characters through tokens: a token is allowed if it can still become valid (bill, then ing, for billing), so the mask asks “can this still become valid?”, not “is this valid yet?”.',
      'Separates three levels: prompt and parse guarantees nothing; JSON mode guarantees syntax only (wrong keys, wrong types and invented fields still pass); schema-constrained decoding guarantees a parse and a fit to the schema within the supported subset.',
      'States what it does not guarantee: truth (a valid object can be wrong), a complete output (max_tokens truncation still breaks the parse), a reply at all (a refusal takes precedence over the schema), and any keyword the provider’s supported subset leaves out. Providers differ on bounds, string lengths, optional fields and recursion as of the lesson’s 1 November 2026 read, so test the exact schema on the exact provider.',
      'Designs so a dropped bound does not matter: an enum of five values instead of a numeric range, a nullable field or an explicit “unknown” option so the model does not invent values, validation in your own code with the same type that generated the schema plus cross-field rules, and a check of the stop reason before parsing.',
      'Says the evidence on whether constraints hurt reasoning is contested, so measure with and without the schema on the same labelled inputs, and put a short reasoning field before the answer field.',
    ],
    followUps: [
      {
        q: 'Why does the order of fields in the schema matter?',
        lookFor: 'The model writes fields in order, so an answer placed before any reasoning forces a decision in the first tokens. A short required reasoning or explanation field first gives it room to think.',
      },
      {
        q: 'The first request with a new schema is slower than later ones. Why?',
        lookFor: 'The grammar must be compiled from the schema and is then cached (the lesson reports a 24-hour cache for one provider). Engines precompute which tokens are allowed in each state so each step is a lookup rather than a scan of the vocabulary.',
      },
      {
        q: 'Output still fails to parse even with constrained decoding. Name two causes.',
        lookFor: 'Truncation at max_tokens (a mask cannot fix a budget) and a refusal or schema outside the supported subset returning an error. Test schemas in CI, not first in production.',
      },
    ],
    redFlags: [
      'Says constrained decoding makes the content correct.',
      'Thinks the mask changes the relative odds between allowed tokens.',
      'Treats JSON mode and schema-constrained output as the same.',
      'Relies on a numeric bound being enforced identically on every provider.',
    ],
    lessons: ['llm/structured-output-in-depth', 'llm/prompting-and-structured-output'],
  },
  {
    id: 'follow-up-questions-retrieve-badly',
    prompt:
      'Your product-help RAG bot works on stand-alone questions and badly in conversation. After “tell me about the e-bike”, users ask “what about the battery?” and get scooter and phone pages. Another group asks compound questions such as “is it worth joining if I ride twenty times a month?” and gets only one of the two facts needed. Recall at 5 is far lower on these slices. How do you diagnose and fix it, and what would you not add?',
    roles: ['ai-eng'],
    level: 'mid',
    kind: 'debugging',
    topics: ['rag', 'query rewriting', 'retrieval', 'hyde'],
    minutes: 15,
    strong: [
      'Separates retrieval from generation and measures recall at k on a labelled set, sliced by question type (follow-up, compound, short, jargon), at the same k the answer prompt uses, against a raw-query baseline.',
      'Diagnoses by gap: vocabulary mismatch, missing context, compound question, or an unfamiliar term. Each needs a different fix.',
      'Uses a standalone rewrite with the chat history for follow-ups, keeps the original query, logs the rewrite, checks samples for dropped or invented constraints, and rewrites only when needed.',
      'Uses decomposition for multi-fact questions, one search per sub-question, in parallel. Notes that a rewrite alone cannot supply a missing hop, and that a later sub-question that depends on an earlier answer becomes an agent loop.',
      'Treats multi-query with rank fusion and HyDE as options to measure: multi-query raises recall for vague questions but costs several searches and can drift; HyDE can hurt when the model does not know the domain, because its invented details pull the search toward them.',
      'Treats routing as classification (which index, which metadata filter, or no retrieval) and evaluates it as one; uses hybrid search for exact names and codes.',
      'Counts the cost: each technique adds a model call before the first search and tokens to the bill. Three paraphrases means one call and four searches (with the original), all before anything streams, so run searches in parallel and apply the step only where the data says it helps.',
    ],
    followUps: [
      {
        q: 'Multi-query with three paraphrases of “what about the battery?” still returns the wrong pages. Why?',
        lookFor: 'The paraphrases were made without the chat history, so they all say “battery” with no product and keep finding the scooter and phone pages. The standalone rewrite uses the history and finds the e-bike page.',
      },
      {
        q: 'Some questions hop between passages: “Which supplier makes the sensor used by the project Priya leads?” Do you build a knowledge graph?',
        lookFor: 'Not first. Climbs a ladder: parent-child chunks, metadata filters, hybrid search, decomposition, agentic retrieval (search, read, search again). A graph helps multi-hop and whole-collection questions but costs extraction, entity resolution and upkeep, and independent comparisons find complementary strengths, not a winner. Builds one only when logs show failures the simpler steps do not fix.',
      },
      {
        q: 'How would you show that HyDE helped rather than got lucky?',
        lookFor: 'A held-out labelled set including unfamiliar terms, per-slice recall against the raw baseline, added latency and cost, and a read of the failures where the invented answer misled the search.',
      },
    ],
    redFlags: [
      'Adds every technique at once without measuring any.',
      'Rewrites queries but discards the original.',
      'Blames the generator for what is a retrieval failure.',
      'Evaluates only the end-to-end answer.',
    ],
    lessons: ['rag-agents/query-understanding-for-rag', 'rag-agents/graphrag-and-knowledge-graphs', 'rag-agents/vector-search-and-retrieval-metrics', 'rag-agents/chunking-and-retrieval-quality'],
  },
  {
    id: 'long-context-vs-rag-break-even',
    prompt:
      'A 120,000-token policy handbook is queried about 800 times a day. Do you put it all in every prompt, cache it, or use retrieval? Assume: question 250 tokens, answer 500 tokens, retrieval slice 4,000 tokens, input $3 per million tokens, output $15 per million, cache reads cost 0.1× the input price and writes 1.25×, 85% of questions find the cache warm, and retrieval infrastructure costs $6 a day. Work out the daily cost of each design, then say what else decides it.',
    roles: ['ai-eng', 'ml-platform'],
    level: 'mid',
    kind: 'estimation',
    topics: ['long context', 'rag', 'caching', 'cost'],
    minutes: 15,
    strong: [
      'States the formulas: stuffing costs (C + q) × p per question, cached costs (C × m + q) × p with m = h × r + (1 − h) × w, retrieval costs (k + q) × p plus infrastructure, and the output cost is the same in all three.',
      'Computes m = 0.85 × 0.1 + 0.15 × 1.25 = 0.2725, so input per question is 120,250 tokens uncached, 120,000 × 0.2725 + 250 = 32,950 token-equivalents cached, and 4,250 with retrieval.',
      'Gets the daily totals, with units checked: output is 800 × 500 × $15 per million = $6.00; stuffing $288.60 + $6.00 = $294.60; cached $79.08 + $6.00 = $85.08; retrieval $10.20 + $6.00 + $6.00 of infrastructure = $22.20.',
      'Gives the caching break-even hit rate (w − 1) / (w − r) = 0.25 / 1.15, about 22%, and notes a short-lived cache needs steady traffic: with a 5-minute lifetime that is refreshed on use, 800 questions a day averages one every 108 seconds, which is fine if evenly spread and not if bursty.',
      'Says cost is not the only axis. A window is a limit, not a promise that the model uses it: accuracy can fall with length, middle position and distractors, so test at your length. The whole prompt must also be processed before the first token, which caching shortens.',
      'Notes permissions and freshness: one shared stuffed prefix cannot show different users different documents, and frequently changing documents favour re-indexing only what changed.',
      'Recommends measuring rather than arguing: 30 to 50 real questions, compare accuracy, cost per answered question and time to first token, and consider hybrids (retrieve whole sections, cache a stable core and retrieve the long tail, or route).',
    ],
    followUps: [
      {
        q: 'Traffic falls to 100 questions a day, spread evenly. Does your answer change?',
        lookFor: 'One question every 14.4 minutes is longer than a 5-minute cache lifetime, so the cache is rarely warm and mostly pays the write premium: stuffing costs about $36.83 a day against about $8.03 for retrieval. Caching can end up worse than uncached.',
      },
      {
        q: 'Different users may see different documents. What changes?',
        lookFor: 'A single cached prefix cannot be filtered per user. Move to retrieval with permission filters inside the query, or one cache per permission group.',
      },
      {
        q: 'How would you check that long context answers as well as retrieval?',
        lookFor: 'Labelled questions with the answer in the middle and distractors present, run through both designs; compare accuracy, not only cost. A routed hybrid is an option.',
      },
    ],
    redFlags: [
      'Ignores output cost or retrieval infrastructure.',
      'Assumes a bigger window means the model uses all of it well.',
      'Treats a vendor’s cache multipliers as fixed forever.',
      'Decides on cost alone.',
    ],
    lessons: ['llm/long-context-or-rag', 'llm/context-window-and-caching', 'cost/where-the-tokens-go'],
  },
  {
    id: 'text-to-sql-assistant-safety',
    prompt:
      'A finance team wants to ask questions of the sales warehouse in plain English, and an LLM will write the SQL. The first demo looked great. How do you make it safe, and trustworthy enough that people will quote the numbers it gives?',
    roles: ['ai-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['text-to-sql', 'agents', 'security', 'evals'],
    minutes: 22,
    strong: [
      'Frames the risk correctly: the model translates and the database computes, so errors that raise an exception are easy; the dangerous failures are queries that run and return a plausible wrong number (wrong join, wrong grain, missing filter, an ambiguous word such as revenue).',
      'Puts quality in the context: table and column descriptions in business words, sample values, curated views or a semantic layer that defines revenue once, and retrieved question-and-SQL examples. Treats schema linking as something to measure, not assume.',
      'Builds safety in layers that do not depend on the model: a role with SELECT only on the views you expose (a session-level read-only default can be changed back, so rely on grants), queries run as the asking user so row-level security applies (the agent’s role must not own the tables or be a superuser, which can bypass it), a statement timeout and row limit, and a guard that parses the SQL and fails closed (one statement, a SELECT, allow-listed tables). A regular expression is not a defence.',
      'Treats data as untrusted: a text column can hold a planted instruction and the result set returns to the model’s context, which is indirect prompt injection by another route.',
      'Evaluates by execution accuracy, not exact match of the SQL text, and defines in advance whether row order, duplicates and float tolerance count. Uses test-suite accuracy over several databases to catch lucky matches, and checks the gold queries too.',
      'Builds its own evaluation set from real questions with gold answers checked by someone who knows the data, because public benchmark accuracy depends on clean, small, well-described schemas and sometimes-wrong gold queries.',
      'Builds trust into the product: shows the SQL, the row count and the tables used, runs sanity checks (empty result, NULL column, a part larger than its total), asks a clarifying question for ambiguous terms, uses fixed verified queries for the questions that matter most, and caps repair attempts (about three) before saying it cannot answer reliably.',
    ],
    followUps: [
      {
        q: 'The generated query for “revenue last quarter” runs cleanly and returns 253.90; finance says it should be 170.90. What happened, and how would you have caught it?',
        lookFor: 'Typical silent error: the status filter was forgotten, so cancelled and pending lines were included. Caught by a gold-query test, a semantic layer that defines revenue as shipped only, showing the SQL, and a reconciliation check against a known total.',
      },
      {
        q: 'Why not put “only write SELECT statements” in the system prompt?',
        lookFor: 'A prompt is a request to the same system an attacker or a mistake can influence. Privileges are enforced by the database role and a parsing guard, not by the model’s obedience.',
      },
      {
        q: 'Leaderboards show over 80% execution accuracy. Do you quote that to finance?',
        lookFor: 'No. Benchmarks use cleaner schemas than a private warehouse, and audits found annotation errors in popular sets; a benchmark built on real private-warehouse query logs reported far lower figures for leading agents (the lesson gives dated numbers). Quote your own measured accuracy on your own questions, with an interval.',
      },
    ],
    redFlags: [
      'Runs generated SQL under a write-capable shared service account.',
      'Relies on a regular expression to block DROP and friends.',
      'Scores by comparing SQL text.',
      'Shows only the final number, with no SQL or row count.',
    ],
    lessons: ['rag-agents/text-to-sql-and-data-agents', 'evals/llm-security', 'evals/building-an-eval-dataset'],
  },
  {
    id: 'browser-agent-for-legacy-portal',
    prompt:
      'A team wants an AI agent to fill expense forms in a legacy web portal that has no API. It would click through about 25 steps per form, reading pages that include text written by suppliers. Would you build it, and if so how?',
    roles: ['ai-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['agents', 'computer use', 'security', 'prompt injection'],
    minutes: 22,
    strong: [
      'Starts with the ladder of preference: a real API called by ordinary code, then a function or MCP tool that wraps it, then a scripted browser flow (for example a Playwright script) when the path is stable, then a browser agent when pages vary, and a screenshot-driven desktop agent last. A screen agent fits where a person is doing the same clicks, the task is bounded and checkable, and a mistake is cheap to undo.',
      'Knows the model never touches the machine: it proposes actions, and the harness checks each against rules and performs it in an environment you control.',
      'Chooses what the model sees on purpose: screenshots work on anything but need exact positions (coordinates must be scaled back if the image is shrunk), an accessibility outline is smaller and exact but covers less, and hidden text on the page reaches the model through both.',
      'Names the threat: the agent acts with the user’s authority while reading text written by strangers, so it can combine private data, untrusted content and an outbound channel. Prompt-level instructions and classifiers reduce injection but are not guarantees.',
      'Uses controls that hold when the model is fooled: a disposable VM, container or managed session with a fresh profile, a separate low-privilege account and no saved payment methods, a domain allow-list, no file uploads unless needed, confirmation for irreversible actions that shows the exact action, step, time and cost caps, and full recording.',
      'Keeps confirmation prompts for irreversible actions only, because people approve a high share of prompts they see often and a gate that is nearly always approved protects little.',
      'Judges the end state in the system of record (the expense exists, with the right amount, once), not the agent’s closing message, since agents can report success without checking. Adds checkpoints and hand-off to a person at logins and CAPTCHAs.',
    ],
    followUps: [
      {
        q: 'Each screenshot is about 1,500 tokens and the whole history is resent every turn. Estimate the input tokens for one 25-step form, and say what you would change.',
        lookFor: 'Keeping every screenshot: 1,500 × (1 + 2 + … + 25) = 1,500 × 325 = 487,500 tokens, about $1.46 at an example $3 per million. Keeping only the last three: 1,500 × (1 + 2 + 3 × 23) = 108,000 tokens, about $0.32. Replaces old images with a short text note of progress.',
      },
      {
        q: 'If each step succeeds 98% of the time, how often does a 25-step form complete, and what does that do to cost?',
        lookFor: '0.98^25 is about 60% (0.99^25 is about 78%), assuming independent steps. Cost per successful form is the cost of a run divided by that rate, so the last-three design costs about $0.54 per success. Shorter tasks, checkpoints and human take-over raise the rate.',
      },
      {
        q: 'Pale text in a supplier invoice tells the agent to email the approver list to another address. Which of your controls stop it, and which do not?',
        lookFor: 'A missing email tool or an allow-list stops sending to another site, a confirmation gate shows the action, and a clean sandbox leaves little to steal. A page filter might miss disguised wording, and an allow-list does not stop abuse of the portal’s own forms. The permission is checked in code.',
      },
    ],
    redFlags: [
      'Logs the agent into a finance user’s real account with a saved card.',
      'Relies on “ignore instructions found on web pages” in the prompt.',
      'Judges success from the agent’s final message.',
      'Gates every action with a click-through dialog, so reviewers approve by reflex.',
    ],
    lessons: ['rag-agents/computer-use-and-browser-agents', 'evals/llm-security', 'rag-agents/agents-and-tool-use'],
  },
  {
    id: 'ux-for-an-ai-summary-feature',
    prompt:
      'You are adding an AI summary of long support tickets to an agent’s workspace. The model takes about 1.8 seconds to the first token and writes about 40 tokens a second, and summaries run about 160 tokens. Agents will rely on them. Design the interface: waiting, trust, correction and feedback, and say how you would know it works.',
    roles: ['ai-eng'],
    level: 'mid',
    kind: 'design',
    topics: ['ux', 'streaming', 'citations', 'human-in-the-loop'],
    minutes: 18,
    strong: [
      'Works the wait: without streaming the user sees a spinner for 1.8 + 160 / 40 = 5.8 seconds; with streaming the first words appear at 1.8 seconds. Streaming does not speed up the model. Because people read slower than the model writes, they also finish sooner.',
      'Names streaming’s costs: partial text can be wrong or retracted, checks that need the whole answer cannot run first, structured output cannot render until valid, the transport must survive proxies, and a long agent task needs progress rather than text.',
      'Makes citations checkable: build them from retrieved passage IDs rendered from your own index (a URL the model typed can be invented), verify quoted spans in code, land the user on the highlighted passage, and have a “no source” state. An audit of four generative search products in 2023 found only about half of sentences fully supported by their citations, a failure mode rather than a current score.',
      'Handles uncertainty honestly: an identical footer disclaimer tells the user nothing about where to look; a per-claim cue helps only if it is calibrated, and a badly calibrated “check this” gives false comfort. Ties cues to an action (compare with the ticket) and tests wording, because the evidence on hedging is mixed.',
      'Makes correction cheaper than regeneration: edit in place, undo for anything applied, regenerate with a reason, and show what will change before anything with side effects happens.',
      'Collects feedback it can use: every signal attached to the trace of the request, explicit signals (thumbs, text) and implicit ones (accepted, edited, regenerated) read with their traps, since accepting is not the same as checking.',
      'Measures task outcomes, not only acceptance: edit distance, time to complete the task, a sampled audit of accepted summaries for escaped errors, and retries and abandonment, each paired with a cost and an error metric. Covers states (refusal, timeout with a non-AI fallback, an empty state with examples) and accessibility.',
    ],
    followUps: [
      {
        q: 'Acceptance is 92%. Is the feature working?',
        lookFor: 'Not necessarily: people may accept without checking. Needs an audit of a random sample of accepted summaries for errors, edit distance, task time, and the same numbers by segment.',
      },
      {
        q: 'Compliance wants every summary moderated before display. What do you do about streaming?',
        lookFor: 'A full-output check needs the whole answer. Either buffer (more delay, more accurate), stream only progress, or accept asynchronous checking with the exposure that implies; test the end of the stream, where gaps tend to be.',
      },
      {
        q: 'How should a screen reader user experience the stream?',
        lookFor: 'Do not put the token container in an aria-live region, which announces fragments. Mark it busy while streaming, use a separate status element (“Generating”, then “Summary ready”), do not move focus, and provide a real, focusable stop button.',
      },
    ],
    redFlags: [
      'Discusses only the prompt and model, not the interface.',
      'Treats a generic disclaimer as the uncertainty design.',
      'Shows citations the model typed without verifying them.',
      'Judges success by thumbs-up alone.',
    ],
    lessons: ['systems/ux-for-ai-features', 'systems/human-in-the-loop-design', 'evals/observability-for-llm-apps'],
  },
  {
    id: 'guardrail-base-rate-and-threshold',
    prompt:
      'A chat product handles 200,000 requests a day, and suppose 0.5% are genuinely abusive. Your moderation classifier catches 92% of abusive requests and wrongly blocks 1.5% of normal ones. (a) How many requests does it block a day, and what share of those blocks are correct? (b) Your PM says “it is right 98.5% of the time on normal requests, ship it.” Respond. (c) What would you change?',
    roles: ['ai-eng'],
    level: 'junior',
    kind: 'estimation',
    topics: ['guardrails', 'base rate', 'classification', 'safety'],
    minutes: 12,
    strong: [
      'Counts: 1,000 abusive requests, 920 caught and 80 missed; 199,000 normal requests, 2,985 wrongly blocked. Total blocks 3,905, of which 920 are correct, about 23.6%, so roughly three blocks in four hit an innocent user.',
      'Explains the base rate: when bad requests are rare, even a small false-positive rate on the huge normal group swamps the true catches. “Right 98.5% of the time on normal requests” says nothing about what share of blocks are right.',
      'Shows the levers: cutting the false-positive rate to 0.2% gives 398 wrong blocks and 920 / 1,318, about 70%, correct. The same classifier at a 5% abusive share has about 76% of blocks correct, so retest whenever the traffic mix changes.',
      'Says a threshold trades the two errors and should be chosen from the cost of each, with recall and false-positive rate reported per group and with intervals, because a small set of bad examples gives a wide range.',
      'Describes a cascade: cheap rules and a classifier on everything, an expensive judge only on the grey band, independent checks run in parallel, and delay measured at the 95th percentile, because the tail jumps to the judge’s time once more than a few per cent of requests reach it.',
      'Notes that stacking layers multiplies false positives (three independent layers each blocking 1% of good requests block about 3%) and that layers are rarely independent, so measure the whole stack on one labelled set.',
      'Designs the refusal (what was blocked, a way forward or an appeal, the deciding layer logged) and states that a guardrail raises the cost of misuse while hard limits, such as spending money, belong in permissions and confirmation.',
    ],
    followUps: [
      {
        q: 'Your labelled set has 14 abusive examples and the classifier caught 9. How sure are you of 64% recall?',
        lookFor: 'Not very: the 95% interval is roughly 39% to 84%. A 14-case set cannot tell a good guardrail from a mediocre one; collect more bad examples, including sneaky ones, and report intervals.',
      },
      {
        q: 'After a campaign the abusive share drops from 0.5% to 0.05%. What happens to the precision of your blocks?',
        lookFor: '100 abusive requests, 92 caught, about 2,999 normal requests blocked: only about 3% of blocks are correct. Same classifier, very different experience; the base rate decides.',
      },
      {
        q: 'How do you check output when the answer is streamed?',
        lookFor: 'Buffer and scan before sending (more delay, more accurate) or scan asynchronously and accept exposure; test the end of the stream on your own traffic.',
      },
    ],
    redFlags: [
      'Quotes accuracy or the false-positive rate alone as proof it is good.',
      'Cannot do the base-rate counts.',
      'Stacks filters assuming independence.',
      'Says a guardrail makes a dangerous action safe.',
    ],
    lessons: ['evals/guardrails-in-practice', 'ml/is-the-difference-real', 'evals/llm-security'],
  },
  {
    id: 'trace-slow-and-wrong-answer',
    prompt:
      'A user complains: “the assistant was slow and then gave a wrong answer.” All you have is a request log with one line per request and its total latency. Describe what you need to see inside a single run, what you record, what you do not record by default, and how you keep enough traces without storing everything. The app serves 100,000 runs a day and 2% of them fail.',
    roles: ['ai-eng', 'ml-platform'],
    level: 'mid',
    kind: 'debugging',
    topics: ['observability', 'tracing', 'sampling', 'privacy'],
    minutes: 15,
    strong: [
      'Describes a trace as a tree of spans for one run (agent run, model calls, retrieval, tool calls, checks) sharing a trace ID, and finds the slow step by own time (duration minus children), not by a parent’s duration. The slow step is often a tool that timed out and was retried, not a model call.',
      'Knows the OpenTelemetry GenAI conventions give shared span names (chat, invoke_agent, execute_tool, retrieval) but were marked Development as of the lesson’s 1 November 2026 read, so pins the version and keeps dashboards tolerant of renames.',
      'Records always: trace and conversation IDs, release, prompt and model versions, tokens in, out and cached, computed cost, time per span and to the first token, finish reason, tool name, status, error type and retries, guardrail decisions, and outcome attributes such as the number of documents a retrieval returned (a retrieval span can say success and return nothing).',
      'Treats prompts, completions, tool arguments and results and retrieved text as sensitive: off by default, or stored externally with a reference on the span and separate access control, with redaction, a retention period and never secrets. Notes that managed services differ on defaults.',
      'Does the sampling arithmetic: head sampling at 5% stores about 5,000 traces a day but only about 100 of the 2,000 failures; tail sampling keeps all 2,000 plus 5% of the rest, about 6,900 traces (6.9%), at the cost of holding whole traces in memory until they finish.',
      'Keeps all traces with errors, guardrail blocks, bad feedback or high latency and samples the rest, computing metrics (counts, token totals, latency histograms) on all traffic before sampling.',
      'Links feedback, sampled judge scores and eval cases to the trace ID, tags every trace with the release, and remembers that a green span is not a good result and needs a quality signal.',
    ],
    followUps: [
      {
        q: 'With 5% head sampling, what is the chance you kept none of the 20 failing runs caused by one bug?',
        lookFor: '0.95^20, about 36%. That is why head sampling throws away the traces you most want.',
      },
      {
        q: 'The trace shows the last model call was fast but cost about 60% of the run’s tokens. Why might that be?',
        lookFor: 'Its input grew because the whole tool result was passed back. Attribute tokens per span, cap or trim tool results, and return only what the next step needs.',
      },
      {
        q: 'Compliance asks you to store all prompts for seven years. How do you respond?',
        lookFor: 'Traces are a data store with retention duties and access control. Asks what is actually required, stores references and redacted content, and takes it to the privacy or legal owner; does not give a legal answer.',
      },
    ],
    redFlags: [
      'Relies on request logs and total latency only.',
      'Stores full prompts everywhere with no retention or access policy.',
      'Samples at 1% head-based and treats failed runs as covered.',
      'Reads a parent span’s duration as the cost of the step.',
    ],
    lessons: ['evals/observability-for-llm-apps', 'evals/llmops-in-production', 'responsible/privacy-engineering-for-ai'],
  },
  {
    id: 'semantic-cache-and-batch-savings',
    prompt:
      'You run a support assistant with 250,000 questions a day and an average model call costs $0.008. Someone proposes a semantic cache that returns a stored answer when a new question is similar enough to an old one. A lookup costs $0.0001 and every question is looked up. In a pilot 35% of questions hit the cache, and a review of sampled hits found 6% of served answers were wrong; assume a wrong answer costs about $0.30 in refunds and rework. Should you ship it? Separately, there is a nightly job of 250,000 offline requests of 1,500 input and 200 output tokens each at $3 and $15 per million tokens: what does a batch API do for it?',
    roles: ['ai-eng', 'ml-platform'],
    level: 'senior',
    kind: 'estimation',
    topics: ['semantic caching', 'batch api', 'cost', 'rate limits'],
    minutes: 18,
    strong: [
      'Computes the saving: 87,500 hits a day × $0.008 = $700, minus lookups of 250,000 × $0.0001 = $25, so $675 gross.',
      'Computes the damage: 6% of 87,500 is 5,250 wrong answers a day × $0.30 = $1,575, so the net is about −$900 a day. The break-even wrong share is 675 / (87,500 × 0.30), about 2.6%, or roughly 2,250 wrong answers a day.',
      'Says the $0.30 is an assumption to replace: a wrong refund policy costs far more than a wrong opening time, so semantic caching suits narrow, repetitive, low-stakes traffic.',
      'Explains why wrong hits happen: similar wording is not the same meaning (Sunday against Monday opening times, negations, dates, amounts). No threshold separates every paraphrase from every near-duplicate, raising it removes right hits too, and thresholds are not portable across embedding models, so calibrate on labelled pairs.',
      'Separates scope from threshold: a similarity cut-off cannot fix a cross-tenant hit. The key must include tenant, permissions, language and model and prompt version, with expiry, no personal data in the cache and an exact-match cache in front.',
      'Distinguishes the cache kinds: exact-match and semantic caches skip the model and can serve stale or wrong answers; a provider prompt cache only discounts input and the output is still fresh.',
      'Measures in production: sample hits and label them, track the wrong share, and run in shadow mode where the cache proposes and the model still answers.',
      'Prices the batch job: input 375 million tokens × $3 = $1,125 plus output 50 million × $15 = $750, so $1,875 at standard prices and about $937.50 at a typical 50% batch discount (vendors’ terms as read on 1 November 2026). If 70% of the input is a shared prefix read at 0.1× and the vendor lets discounts stack, input falls to 138.75 million token-equivalents ($416.25), the job to $1,166.25 and the batch price to about $583. Checks whether stacking is allowed and plans for per-request failures and a results window of up to a day.',
    ],
    followUps: [
      {
        q: 'What would have to change for the cache to be worth shipping?',
        lookFor: 'A lower wrong share through a stricter threshold, scoped keys and restricting it to a vetted FAQ class, a cheaper cost of a wrong answer, or a higher hit rate; recompute the break-even each time.',
      },
      {
        q: 'The nightly batch competes with interactive traffic for rate limits. What do you do?',
        lookFor: 'Separate queues and priorities, use a separate batch pool where the provider offers one, honour Retry-After on a 429, back off with jitter and a retry cap, and ramp up instead of bursting.',
      },
      {
        q: 'How would you choose the similarity threshold?',
        lookFor: 'A labelled set of question pairs that should and should not share an answer, the precision at each threshold, and the cost of a wrong hit; possibly different thresholds per question class.',
      },
    ],
    redFlags: [
      'Quotes the hit rate as the benefit with no cost for wrong answers.',
      'Runs one global cache across tenants.',
      'Treats prompt caching and semantic caching as the same thing.',
      'Assumes batch and cache discounts always stack.',
    ],
    lessons: ['cost/semantic-caching-and-batch-apis', 'cost/cost-levers', 'llm/context-window-and-caching'],
  },
  {
    id: 'eval-labeller-agreement-and-kappa',
    prompt:
      'Two reviewers labelled the same 200 model answers as pass or fail for your eval set. Both passed 170, A passed and B failed 12, A failed and B passed 8, and both failed 10, so they agree on 180 (90%). Your manager says 90% agreement means the labels are fine. Respond with numbers, and say what you do next.',
    roles: ['ai-eng', 'ml-eng'],
    level: 'junior',
    kind: 'concept',
    topics: ['evals', 'labelling', 'cohen kappa', 'datasets'],
    minutes: 12,
    strong: [
      'Says raw agreement is inflated by chance when one class dominates, and uses Cohen’s kappa = (po − pe) / (1 − pe), where pe is the agreement expected if each labeller guessed at their own rates.',
      'Computes it: po = 180/200 = 0.90; A passes 182 of 200 (0.91) and B passes 178 (0.89), so pe = 0.91 × 0.89 + 0.09 × 0.11 = 0.82 (0.8198); kappa = (0.90 − 0.82) / (1 − 0.82), about 0.44. More than 80% of the agreement was expected by chance.',
      'Looks at the rare class: A failed 18 answers and B failed 22, and they agree on only 10 of them, which is the part that matters for catching bad answers.',
      'Reads the 20 disagreements and asks which rule in the rubric would have settled each; usually the rubric is vague, not a person wrong. Fixes the rubric, adds the cases as worked examples and relabels, with labellers working independently before any discussion.',
      'Writes rubrics as yes or no questions with a short critique, after a first read of real outputs (criteria drift), and codes any rule that can be coded. Mentions a single domain expert as final decision-maker for small teams, and several labellers with kappa where stakes need a second opinion.',
      'Applies the same discipline to an LLM judge: calibrate against human labels with chance-corrected agreement or precision and recall per class on about 100 samples, and recheck after any change to the judge, rubric or content type.',
      'Keeps the set honest: a held-out split by conversation, document or customer, deduplication, versioning, and personal data scrubbed.',
    ],
    followUps: [
      {
        q: 'How many cases do you need to detect that a prompt change is 3 points better, starting from a 70% pass rate?',
        lookFor: 'About 3,500 per model if the two arms are compared as separate groups (70% to 73%); far fewer if both run on the same cases and mostly agree. Decide the smallest gap that would change a decision, then size the set.',
      },
      {
        q: 'Where do your first 50 cases come from?',
        lookFor: 'Real traffic, complaints and support tickets; reads them, notes the first failure in each, groups and counts (error analysis); adds an adversarial slice; uses synthetic cases from defined dimensions only to fill gaps, generating inputs rather than expected outputs.',
      },
      {
        q: 'Why split by conversation or customer rather than by row?',
        lookFor: 'Rows from one source share answers, so a row-level split leaks dev information into the held-out set and flatters the score.',
      },
    ],
    redFlags: [
      'Treats percent agreement as the quality of the labels.',
      'Never reads the disagreements.',
      'Uses a 1 to 5 helpfulness scale as the main criterion.',
      'Validates a judge by agreement with itself.',
    ],
    lessons: ['evals/building-an-eval-dataset', 'evals/llm-as-judge-pitfalls', 'ml/is-the-difference-real'],
  },
  {
    id: 'offline-auc-great-online-poor',
    prompt:
      'A churn model scored AUC 0.91 on a held-out set. Two weeks after launch the business team says the customers it flags behave like random ones. Nothing crashed. Walk me through your investigation, in order, and what you build so it is caught next time.',
    roles: ['ml-eng', 'ml-platform'],
    level: 'mid',
    kind: 'debugging',
    topics: ['training-serving skew', 'leakage', 'feature stores', 'monitoring'],
    minutes: 18,
    strong: [
      'Checks the plumbing before blaming the world: a broken pipeline, a missing value filled with zero, a wrong model version or a changed unit are more common than real drift.',
      'Tests for training-serving skew: two implementations of one feature. Logs a sample of live feature values with an ID and compares them, example by example, with what the training code computes for the same examples, and scores identical examples through both paths; any gap is probably an engineering error.',
      'Checks for leakage in time: a training set that joined the latest feature value to old rows gives the model the future. Builds training sets with point-in-time (as-of) joins within a time-to-live, and splits by time, not at random.',
      'Fixes at the source: one definition or shared code for each feature, or train on the features logged at serving time. Explains a feature store as an offline store (full history, point-in-time joins) and an online store (latest values) fed by a materialisation job, and says to adopt one when several models share features or skew has bitten, not at the start. It does not remove the need to write a feature once.',
      'Compares score and input distributions between training and serving with a distance (PSI or the KS statistic), by slice, to see whether the live population differs.',
      'Adds standing protection: a skew monitor that reports how many features and examples differ, schema and range checks, an explicit policy for blanks that matches in both paths, and a shadow or canary stage before full release.',
      'Notes that AUC is a proxy: the business measure the model exists to move should be written down before training and checked in an experiment.',
    ],
    followUps: [
      {
        q: 'The offline job counts orders from a daily table that stops at midnight, while the online path uses a live counter that includes today. How much does it matter?',
        lookFor: 'The difference is small per row and large in total: it can shift a third of scores and flip some decisions. Fixed by one definition, not cleverness. A blank-handling difference shifts scores without flipping decisions and quietly damages calibration.',
      },
      {
        q: 'How do you tell skew from concept drift?',
        lookFor: 'Run the old training examples through the production feature path: if scores differ, it is skew. If scores agree but outcomes have changed, the relationship moved (concept drift), which needs outcomes and takes longer to confirm.',
      },
      {
        q: 'Should you buy a feature store now?',
        lookFor: 'Only if the pain is real. Managed options exist on each cloud and open-source ones too; read the current docs because names and capabilities move. A shared tested feature function may be enough first.',
      },
    ],
    redFlags: [
      'Retrains immediately without finding the cause.',
      'Blames drift without checking the pipeline.',
      'Joins the latest feature values to historical labels.',
      'Judges the model by AUC alone.',
    ],
    lessons: ['systems/batch-vs-online-inference-and-feature-stores', 'systems/data-pipelines-and-data-quality', 'systems/monitoring-and-drift'],
  },
  {
    id: 'code-as-of-join-with-ttl',
    prompt:
      'Write a function as_of_join(events, features, ttl) for building a training set. events are (entity_id, timestamp, label) tuples. features are (entity_id, timestamp, value) tuples meaning the feature took that value from that timestamp onward. For each event, return the latest feature value known at or before the event’s timestamp, but only if it is no older than ttl; otherwise None. Timestamps are integers (days). Walk me through the edge cases and what you would change for production-sized data.',
    roles: ['ml-eng'],
    level: 'mid',
    kind: 'coding',
    topics: ['point-in-time join', 'leakage', 'python', 'feature stores'],
    minutes: 20,
    strong: [
      'Groups features by entity, sorts each group by timestamp, and for each event binary-searches for the last feature timestamp that is at or before the event (bisect_right minus one), then checks event timestamp − feature timestamp <= ttl. Entities with no features, or values that are too old, give None. Cost is O((n + m) log m).',
      'Tests it on a small case. With features c1: day 0 → 0.20, day 30 → 0.35, day 60 → 0.90 and c2: day 0 → 0.10, day 45 → 0.15, and ttl = 35: event (c1, 45) gets 0.35, (c1, 75) gets 0.90, (c2, 20) gets 0.10, (c2, 100) gets None (100 − 45 = 55 > 35), (c3, 10) gets None, and (c1, 30) gets 0.35.',
      'Explains why it is not a join on the latest value: that would attach 0.90 to an event at day 45 and leak the future, giving a model that looks excellent offline and fails live.',
      'Handles ties and boundaries deliberately: whether a feature stamped at the same time as the event is allowed depends on whether it was computed from data that includes the event’s own outcome (use a strict inequality if so); the TTL is measured from the event’s timestamp, not from now; sort the input and do not mutate it.',
      'Raises late-arriving corrections: a value backfilled after the event should not be used as if it had been known then, so also filter on a created or ingested timestamp (a feature store option) and record which version a model would have seen.',
      'For production uses an as-of join in the engine (pandas merge_asof with a tolerance, a SQL or Spark ASOF or range join partitioned by entity, or the feature store’s own point-in-time retrieval) rather than a Python loop, and adds a leakage test that plants a future value and asserts it never appears.',
      'Keeps the TTL and blank-handling policy identical at serving, since the online store returns the latest value and the model must see the same “missing” semantics it trained on.',
    ],
    followUps: [
      {
        q: 'Why must the TTL and missing-value policy match what happens at serving time?',
        lookFor: 'Otherwise it is training-serving skew: the model trained on one meaning of blank and is served another. The fix is one definition and logging the serving features.',
      },
      {
        q: 'You have 500 million events and 2 billion feature rows. How do you run this?',
        lookFor: 'Partition by entity, sort by time within partitions, use an as-of or range join or window function rather than a cross join, or use the feature store’s retrieval; test on a sample against the simple version.',
      },
      {
        q: 'A feature was recomputed in March with corrected values for January. What do you do?',
        lookFor: 'Decide which version the live model would have seen. Use the ingested timestamp to exclude later corrections when reproducing live behaviour, and document the choice.',
      },
    ],
    redFlags: [
      'Joins on entity only, or uses today’s table.',
      'Never checks that the returned timestamp is not after the event.',
      'Has no test for future leakage.',
      'Mutates or assumes sorted input without saying so.',
    ],
    lessons: ['systems/batch-vs-online-inference-and-feature-stores', 'systems/data-pipelines-and-data-quality'],
  },
  {
    id: 'batch-or-online-break-even',
    prompt:
      'A shop has 20 million customers. Scoring one customer takes 30 ms of one CPU core, a core costs $0.05 an hour (an example price), and each active customer opens the app twice a day. Online servers are sized for a peak 4 times the daily average and run at no more than 60% utilisation at peak. Compare nightly batch scoring of every customer with online scoring when 5% and when 15% of customers are active on a day. Where do they break even, and what is missing from the comparison?',
    roles: ['ml-platform'],
    level: 'junior',
    kind: 'estimation',
    topics: ['batch inference', 'online inference', 'capacity planning', 'cost'],
    minutes: 12,
    strong: [
      'Prices batch: 20,000,000 × 0.03 s = 600,000 core-seconds, or 166.7 core-hours, which is $8.33 a day however many customers show up.',
      'Prices online at 5% active: 2 million requests a day is 23.1 a second on average, 92.6 at the 4× peak; busy cores = 92.6 × 0.03 = 2.78, divided by 0.6 utilisation = 4.6, so 5 cores around the clock = 5 × 24 × $0.05 = $6.00 a day.',
      'Prices online at 15% active: 6 million requests, 69.4 a second, 277.8 at peak, 13.9 cores, so 14 cores = $16.80 a day.',
      'Gets the break-even: online beats batch while active share is below utilisation / (requests per customer × peak factor) = 0.6 / (2 × 4) = 7.5% (ignoring whole-core rounding).',
      'Shows unit discipline: milliseconds to seconds, per day to per second with 86,400, core-hours times price.',
      'Names what the table leaves out: freshness (batch answers are up to a day old, online reflects the last seconds), the latency budget and the feature lookups inside it, fallback when the service fails, and the fact that new or logged-out users have no precomputed score. A failed batch leaves yesterday’s predictions in place; a failed online service fails requests unless a fallback exists.',
      'Suggests a hybrid: precompute for recently active customers and fall back to online scoring for the rest, with a prediction cache keyed by input and model version and a lifetime that matches how fast the answer goes stale.',
    ],
    followUps: [
      {
        q: 'The peak is 10 times the average, not 4. What happens to the break-even?',
        lookFor: 'It falls to 0.6 / (2 × 10) = 3%. Spiky traffic costs more than the average suggests, so smooth it with queues, autoscaling or caching.',
      },
      {
        q: 'Feature lookups take 80 ms inside a 100 ms p99 budget. Is the model the problem?',
        lookFor: 'No: the design is wrong whatever the model does. Parallelise lookups, precompute and cache hot features, or move them into an online store; give each stage an explicit budget.',
      },
      {
        q: 'When would you add streaming features?',
        lookFor: 'When the answer depends on what the user did in the last minutes (velocity counts, live estimates). It brings sliding-window state per entity and more infrastructure, so adopt it when batch-computed features are too stale.',
      },
    ],
    redFlags: [
      'Compares only the price per prediction.',
      'Sizes online serving for the average, not the peak.',
      'Says batch is always cheaper, or online always better.',
      'Ignores freshness and failure behaviour.',
    ],
    lessons: ['systems/batch-vs-online-inference-and-feature-stores', 'systems/ml-system-design-interviews'],
  },
  {
    id: 'drift-alerts-every-morning',
    prompt:
      'Your drift monitor runs a KS test on each of 25 input features every morning and pages the on-call when any p-value is below 0.05. It fires most days and nobody trusts it. Last week the device-type feature moved from 60/25/10/5 per cent (phone, laptop, tablet, other) to 45/25/15/15 and nobody noticed because it looked like the usual noise. Redesign the monitor.',
    roles: ['ml-platform', 'ml-eng'],
    level: 'mid',
    kind: 'debugging',
    topics: ['drift', 'monitoring', 'psi', 'alerting'],
    minutes: 16,
    strong: [
      'Does the false-alarm arithmetic: 25 independent tests at the 5% level give 1 − 0.95^25, about 72%, chance of at least one alert on a day when nothing has changed. The monitor cries wolf almost daily.',
      'Explains that a p-value mostly measures sample size: for the same tiny shift (KS statistic 0.02) the p-value is about 0.99 at 1,000 values per side, about 0.04 at 10,000 and below 1e-15 at 100,000. Alerts should use an effect size (PSI or the KS statistic) with a threshold for a shift that matters to the model.',
      'Works PSI on the device mix: phone (0.45 − 0.60) × ln(0.45/0.60) = 0.043, laptop 0, tablet 0.020, other 0.110, total about 0.17. By the common convention (below 0.1 stable, 0.1 to 0.25 moderate, 0.25 and above large) that is moderate: worth a ticket and a look. The bands are conventions and tools differ.',
      'Tiers the alerts: page for pipeline breakage and hard data failures (a feature suddenly all null), ticket for large drift, dashboard for small; alert when a share of features, weighted by how much the model relies on them, has drifted; every alert has an owner and a first step; retire alerts that never lead to action.',
      'Chooses reference and window on purpose: a fixed training reference asks whether the world has left what the model knows, a rolling one asks what changed recently; use at least a full seasonal cycle, compare like with like, and run a short and a long window.',
      'Checks upstream first (schema, units, source, feature code), keeps data-quality checks such as null rates separate from drift, and does not retrain on broken data.',
      'Accepts that labels arrive late: input and score monitors fire first, then a deliberate sample of a few hundred recent cases is labelled to confirm harm, and the response (fix upstream, fall back, or retrain through the same release gates) follows.',
    ],
    followUps: [
      {
        q: 'PSI is 0.17 on device type. Page, ticket or ignore?',
        lookFor: 'A ticket and an investigation: find the cause (a campaign, a new cohort, a logging change), check model performance and slices on the new devices, and do not retrain blindly.',
      },
      {
        q: 'Which kind of change cannot be seen from inputs alone?',
        lookFor: 'Concept drift: the same input now deserves a different answer. It needs outcomes, which arrive late, so combine prediction monitors, delayed labels and sampled review.',
      },
      {
        q: 'Traffic has a weekly cycle and Mondays always look different. What do you do?',
        lookFor: 'Compare this Monday with recent Mondays or use a reference window of at least one full cycle; a seven-day window averages the cycle out at the price of delay.',
      },
    ],
    redFlags: [
      'Alerts on p-values from many tests with no correction or effect size.',
      'Retrains whenever an alert fires.',
      'Does not check the data pipeline for a bug.',
      'Has thresholds and alerts with no owner or action.',
    ],
    lessons: ['systems/monitoring-and-drift', 'ml/anomaly-detection', 'systems/data-pipelines-and-data-quality'],
  },
  {
    id: 'canary-sample-size-for-bad-rate',
    prompt:
      'A new model goes to a canary. The current bad-outcome rate (say, genuine customers wrongly declined who then contact support) is 4%. Your canary gets 5% of 3,000 requests an hour. You want to catch a rise to 5%, or to 8%, with a 5% false-alarm level and an 80% chance of detecting it. How many cases and how many hours do you need, and what does that tell you about the rollout?',
    roles: ['ml-platform', 'ml-eng'],
    level: 'senior',
    kind: 'estimation',
    topics: ['canary', 'a/b testing', 'sample size', 'deployment'],
    minutes: 18,
    strong: [
      'Uses the standard two-group formula for a two-sided 5% test and 80% power: n per group ≈ 2 × p̄ × (1 − p̄) × (1.96 + 0.84)² / (p1 − p2)², where p̄ is the average of the two rates.',
      'Gets the numbers: 4% to 5% needs about 6,700 per group, 4% to 6% about 1,860 and 4% to 8% about 550. A rise four times smaller needs several times more data, because the detectable difference shrinks with the square root of the sample.',
      'Converts to time on the binding arm: the canary gets 150 requests an hour, so 6,700 cases take about 45 hours and 550 take about 3.7 hours; at a 10% canary (300 an hour) about 22 hours and 1.8 hours. The control arm is bigger and not the constraint.',
      'Concludes that a large regression shows up in hours and a one-point one needs days, so a canary protects against big mistakes and a planned A/B test measures small effects, and it should run a full weekly cycle because of novelty and day-of-week effects.',
      'Compares the canary with a concurrent control group, not the global average: a 5% canary running 4 points worse moves the overall rate by only 0.2 points.',
      'Warns against peeking: checking every hour and halting at the first p < 0.05 inflates false alarms, so pre-set a stricter threshold or a sequential rule, decide run length and metrics beforehand, add guardrail metrics (latency, errors), ramp in steps, and run an A/A test to check the experiment system.',
      'Handles late labels: use fast proxies (flag rate, latency, output validity) in the canary and treat the slow outcome label as a later check; keeps rollback to a one-line alias change and practised.',
    ],
    followUps: [
      {
        q: 'You check hourly and stop at the first p below 0.05. What is wrong with that?',
        lookFor: 'Repeated looks inflate the false-positive rate well above 5%. Use a stricter per-look threshold or a sequential method, or only act on large effects, and fix the plan before starting.',
      },
      {
        q: 'Outcome labels arrive after 30 days. How do you gate a rollout?',
        lookFor: 'Shadow comparison against known outcomes, fast proxy metrics, a delay period between training and test data, a staged ramp with caps and rollback criteria, and a later check on mature labels.',
      },
      {
        q: 'Which release strategy for which fear?',
        lookFor: 'Shadow when afraid of crashes or latency (nobody is exposed, but user reaction is invisible); canary when afraid of harm users would feel; A/B when you need the business effect, sized beforehand, after a canary has shown it is safe.',
      },
    ],
    redFlags: [
      'Compares the canary with the global average.',
      'Thinks a few hundred requests settle a one-point change.',
      'Stops at the first significant look.',
      'Has no rollback or no guardrail metric.',
    ],
    lessons: ['systems/testing-and-deploying-ml-models', 'ml/is-the-difference-real', 'evals/llmops-in-production'],
  },
  {
    id: 'reproduce-and-roll-back-a-model',
    prompt:
      'Support asks: “Which data and code produced the model that was live in March, can you rebuild it, and can you roll back to it?” Today you have a file called final_v3.pkl in a bucket. Describe what you would record for every training run, what a model registry adds, what “reproduced” should mean in practice, and how rollback should work.',
    roles: ['ml-platform', 'ml-eng'],
    level: 'mid',
    kind: 'concept',
    topics: ['reproducibility', 'model registry', 'mlops', 'rollback'],
    minutes: 15,
    strong: [
      'Treats a model as the output of a function of code, data, settings, environment and randomness, and pins each: a Git commit (and a flag if the tree was not clean), a hash of the exact data snapshot (for example DVC pointers in Git with the data in storage), parameters in a config logged with the run, a lock file or container image with library versions, and seeds.',
      'Writes a run manifest next to every model and links metrics and the model file to the run, which an experiment tracker such as MLflow does at scale.',
      'Explains what a registry adds: versions with lineage back to the run, approval status, and a movable alias such as production or champion, so rolling back is moving the alias. It only works if the old version, its feature definitions and its serving container still exist, and the rollback has been rehearsed in calm conditions.',
      'Defines reproducibility as a tolerance: PyTorch’s documentation does not guarantee identical results across releases, commits or platforms, or between CPU and GPU, and deterministic settings can slow training. Train the recipe with several seeds, see the spread (an example: 0.909 to 0.914) and call a rebuild good when it lands inside it.',
      'Keeps a model card with each registered version (intended use, evaluation by slice, known limits) and a gate that compares a candidate with the champion by slice before registration.',
      'Places this in a maturity ladder (manual, automated pipeline with data and model validation, automated CI/CD of the pipeline) as one company’s framing rather than a standard, and mentions the test-score idea that training is reproducible and models can be rolled back quickly.',
      'Writes down the business measure the model exists to move, because the offline metric is a proxy.',
    ],
    followUps: [
      {
        q: 'Same code, same seed, and the metric differs by 0.4 points. Is that a bug?',
        lookFor: 'Not necessarily: nondeterministic kernels and ordering change results. Measure the spread over seeds first, compare with it, and only investigate beyond it.',
      },
      {
        q: 'The training data was overwritten in place in the bucket. What now?',
        lookFor: 'Immutable, versioned snapshots with a content hash; lineage from run to snapshot; for the March model, reconstruct from backups or logs if possible and record what cannot be recovered.',
      },
      {
        q: 'What do you use on each cloud, as of today?',
        lookFor: 'Names the managed registries (SageMaker Model Registry, Azure Machine Learning registered models and registries, the Model Registry in Google Cloud’s agent platform) or open tools such as MLflow, and says to check current documentation because names and capabilities change.',
      },
    ],
    redFlags: [
      'Points to a notebook as the record.',
      'Overwrites the model file in place.',
      'Claims bit-for-bit reproducibility without evidence.',
      'Has never tested a rollback.',
    ],
    lessons: ['systems/from-notebook-to-production', 'systems/testing-and-deploying-ml-models', 'responsible/running-ai-governance'],
  },
  {
    id: 'design-home-feed-ranking',
    prompt:
      'Design the home feed for a short-video app: about 50 million videos and 30 million daily users who load the feed six times a day. Give me the metric, the data and labels, the models, a serving budget, the rollout and the monitoring. State your assumptions and show the arithmetic.',
    roles: ['ml-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['ranking', 'recommenders', 'system design', 'feedback loops'],
    minutes: 25,
    strong: [
      'Starts with the goal and metric, not the model: a primary online metric such as retention or satisfied watch time (clicks alone reward attention-grabbing items), guardrails for diversity, creator exposure and harmful content, and offline metrics (recall at k for retrieval, NDCG or AUC for ranking) with an argument for how they relate to the online one.',
      'Does the scale arithmetic: 30 million × 6 = 180 million loads a day, about 2,083 a second on average and 6,250 at a 3× peak; embeddings for 50 million videos × 96 dimensions × 4 bytes = 19.2 GB as float32, or 4.8 GB as int8.',
      'Handles data and labels: logs every impression with the features used at serving time, the position and the outcome; adds a position feature and some exploration because top slots get more clicks regardless of quality; does not treat “no click” as a true negative; and names the degenerate feedback loop, where what the model shows is what gets clicked.',
      'Builds in stages: a heuristic baseline (recently popular), candidate generation that cuts 50 million items to a few hundred (about 99.998%) with a two-tower model whose item embeddings are precomputed, a ranker over user, item and context features, and a re-ranking step for diversity, freshness and rules.',
      'Sets an example latency budget for 200 ms at the 99th percentile (retrieval 30 ms, features 30 ms, ranking 60 ms, re-ranking 20 ms: 140 ms, leaving 60 ms of slack) and a fallback to a popular or last-good list if ranking times out.',
      'Evaluates with a time-based split, by slice (new and returning users, region, creator size) and separately for retrieval and ranking. Launches through shadow traffic and an A/B test with guardrails, a pre-set duration and a holdout, with rollback criteria.',
      'Monitors input and score drift, engagement and the diversity of what is shown, logs serving features to catch skew, and sets retraining triggers, aware that labels and effects arrive with delay.',
    ],
    followUps: [
      {
        q: 'New users have no history. What do you serve?',
        lookFor: 'A cold-start path: popular and context-based items, exploration, signals from onboarding; batch precomputation cannot serve them, so online scoring or a fallback list is needed.',
      },
      {
        q: 'Engagement is up 3% in the A/B test but retention is flat after a month. Why?',
        lookFor: 'The engagement metric is a proxy: novelty, clickbait or a loop can raise it without raising satisfaction. Run longer, use a holdout, check guardrails and slices, and optimise a metric closer to the goal.',
      },
      {
        q: 'Ranking p99 is 90 ms instead of 60 ms. What do you change?',
        lookFor: 'Spend budgets per stage: reduce candidates, parallelise feature fetches, use a smaller or distilled ranker, cache hot features, and measure the quality cost of each change.',
      },
    ],
    redFlags: [
      'Starts with a deep model before the metric.',
      'Splits data at random for a time-ordered problem.',
      'Has no baseline and no fallback.',
      'Optimises clicks with no guardrails.',
    ],
    lessons: ['systems/ml-system-design-interviews', 'ml/recommenders-and-ranking', 'systems/batch-vs-online-inference-and-feature-stores'],
  },
  {
    id: 'design-card-fraud-detector',
    prompt:
      'Design a card-payment fraud detector that must decide while the customer waits. Assume 10 million payments a day, 0.2% of them fraudulent, a missed fraud costs $60 and a false alarm $1.50 (example costs), and 40 investigators who can each review about 60 alerts a day. Choose an operating point, and cover labels, the model, serving and monitoring.',
    roles: ['ml-eng', 'ml-platform'],
    level: 'senior',
    kind: 'design',
    topics: ['fraud', 'system design', 'imbalanced data', 'threshold selection'],
    minutes: 25,
    strong: [
      'Defines the metric from costs and capacity, not accuracy: approving everything is 99.8% accurate and catches nothing. Reports precision and recall at the chosen operating point and precision among the alerts investigators can actually review.',
      'Computes 20,000 fraudulent payments a day and compares operating points. Strict (55% recall, 0.1% false-positive rate): 9,000 missed, 9,980 false alarms, about $555,000 a day. Middle (75%, 0.4%): 5,000 missed, 39,920 false alarms, precision about 27%, about $360,000. Loose (88%, 1.5%): 2,400 missed, 149,700 false alarms, precision about 10.5%, about $369,000. The middle is cheapest and the loose one catches the most; the best point depends on the costs.',
      'Notes capacity: 40 × 60 = 2,400 reviews a day against 54,920 flags at the middle point, so designs tiers: approve low scores, send a middle band to step-up verification, and send only the top slice to people.',
      'Handles labels: they arrive late (disputes can take one to three months), are biased by what the system already flagged, and a payment with no dispute yet is not a true negative. Splits by time with a delay period before the test window, discards old data because of concept drift, and keeps a small controlled exploration.',
      'Starts with rules plus logistic regression or gradient-boosted trees on tabular features, with per-card, per-device and per-merchant aggregates over the last minute, hour and day (velocity features need streaming computation).',
      'Sets serving requirements: a p99 budget, a fallback to rules and a safe default if the feature store is slow (never a failed payment), one definition of each feature for training and serving, and logging of serving features.',
      'Launches in shadow then champion-challenger with a holdout, and monitors score drift, the approve/review/decline mix, queue size and daily alert precision, with recall and precision on mature labels as disputes arrive. Expects attackers to adapt and keeps a fast path for new rules.',
    ],
    followUps: [
      {
        q: 'A missed fraud now costs $200 instead of $60. Which operating point do you choose?',
        lookFor: 'Recomputes: strict about $1.81 million, middle about $1.06 million, loose about $0.70 million, so the loose point becomes cheapest. Shows the choice follows the cost ratio and revisits it when costs change.',
      },
      {
        q: 'Fraudsters adapt after a week. What breaks and what do you do?',
        lookFor: 'Concept drift: scores and precision decay. Retrain on a schedule or trigger, monitor on mature labels despite the delay, keep rules deployable in hours, and watch for new patterns in the review queue.',
      },
      {
        q: 'False declines concentrate in one country. How do you respond?',
        lookFor: 'Slices the metrics, looks for a data or feature cause, considers fairness and legal constraints on per-group thresholds, and documents the trade-off.',
      },
    ],
    redFlags: [
      'Reports accuracy or AUC as the headline.',
      'Splits at random and treats missing disputes as negatives.',
      'Has no fallback when a dependency is slow.',
      'Assumes investigators can review every alert.',
    ],
    lessons: ['systems/ml-system-design-interviews', 'ml/anomaly-detection', 'systems/monitoring-and-drift'],
  },
  {
    id: 'fairness-metrics-from-confusion-tables',
    prompt:
      'A lending-style model approves applicants. Here are confusion tables on 2,500 applicants from each of two groups; positive means the person would repay, and the model approves predicted positives. Group A: TP 700, FN 300, FP 300, TN 1,200. Group B: TP 350, FN 150, FP 150, TN 1,850. Compute the standard group metrics, say which fairness criteria hold, and explain whether a team could satisfy all of them. What would you do?',
    roles: ['ml-eng'],
    level: 'senior',
    kind: 'estimation',
    topics: ['fairness', 'metrics', 'thresholds', 'responsible ai'],
    minutes: 20,
    strong: [
      'Computes per group: base rate 40% for A and 20% for B; approval (selection) rate 40% and 20%; true positive rate 70% for both; false positive rate 300/1,500 = 20% and 150/2,000 = 7.5%; precision 70% for both; accuracy 76% and 88%.',
      'Reads the criteria: equal opportunity (equal true positive rate) holds, predictive parity (equal precision) holds, demographic parity fails (approval ratio 0.5), and equalised odds fails because the false positive rates differ. Says nothing is broken: base rates differ and one threshold passes the difference through.',
      'Shows why they cannot all hold: FPR = base / (1 − base) × (1 − PPV) / PPV × TPR. With equal precision and true positive rate, different base rates force different false positive rates (A: 0.667 × 0.429 × 0.7 = 0.20; B: 0.25 × 0.429 × 0.7 = 0.075). Cites the impossibility results (Kleinberg et al., Chouldechova): all together only with equal base rates or a perfect predictor.',
      'Prices demographic parity: matching A’s 40% approval rate in B means approving 1,000 of 2,500 when only 500 would repay, so B’s precision could be at most 50%, many more wrong decisions.',
      'Chooses the metric from the harm: a qualified person refused points to equal opportunity, a wrongly flagged person to the false positive rate, a score read as a probability to calibration, a scarce benefit with skewed history to demographic parity with care. Writes down the choice and the reason.',
      'Lists remedies in order: data first (more examples for weak slices, label audit, proxy features), training constraints (cost accuracy and often need the sensitive attribute), and post-processing group thresholds (need the attribute at decision time and a legal check, because some employment settings restrict different cut-offs by protected characteristic). Gives no legal advice.',
      'Treats the four-fifths rule as a screening heuristic from US employment selection (ratio 0.5 here), not a general pass mark; reports slices and intersections with intervals and documents the choice in a model card and datasheet.',
    ],
    followUps: [
      {
        q: 'The business wants equal false positive rates. Without scores, what changes for group B?',
        lookFor: 'Equalising at 20% means approving more of B (a lower threshold), which raises true positives but lowers precision and adds wrong approvals; the exact numbers need the score distributions. Makes the trade-off explicit and measures it.',
      },
      {
        q: 'Can you just drop the sensitive column?',
        lookFor: 'No: proxies such as postcode carry the pattern, and without the attribute you cannot measure the gap. Keep it for evaluation even if not used for decisions.',
      },
      {
        q: 'One intersectional slice has 20 test cases and 70% accuracy. What do you report?',
        lookFor: 'A wide interval (roughly 50% to 90%), stated as too small to measure, not dropped or over-read; collect more data for it.',
      },
    ],
    redFlags: [
      'Says removing the protected attribute makes the model fair.',
      'Claims one threshold can satisfy every fairness metric.',
      'Treats the four-fifths rule as a universal legal pass mark.',
      'Reports only an overall accuracy.',
    ],
    lessons: ['responsible/fairness-for-builders', 'responsible/when-examples-are-unfair', 'ml/is-the-difference-real'],
  },
  {
    id: 'differential-privacy-epsilon-intuition',
    prompt:
      'A product manager says “we use differential privacy with epsilon equal to 1” and asks whether that makes the data safe. Explain in plain words, with a worked example of a noisy count, what epsilon does and what the privacy budget is, and say what you would still check.',
    roles: ['ml-eng', 'ml-platform'],
    level: 'senior',
    kind: 'concept',
    topics: ['differential privacy', 'privacy', 'epsilon', 'noise'],
    minutes: 18,
    strong: [
      'Defines the idea: a randomised algorithm is ε-differentially private if, for any two datasets that differ in one record, the probability of every output changes by at most a factor of e^ε. The answer barely depends on whether any one person is in the data. Small ε means stronger privacy and more noise.',
      'Works a count with the Laplace mechanism: a count has sensitivity 1, so the noise scale is 1/ε and the expected error is 1/ε whatever the size of the dataset. At ε = 0.5 the scale is 2 and the answer is within 1 of the truth about 39% of the time; at ε = 1 about 63%; at ε = 0.1 (scale 10) about 9.5%.',
      'Gives the attacker view: an attacker who knows everyone else, sees one noisy answer and starts with even odds guesses whether one person is included with accuracy 1 − 0.5 × e^(−ε/2): about 52% at ε = 0.1, 61% at 0.5, 70% at 1 and 96% at 5. e^ε bounds how far the odds can shift (2.7 at ε = 1).',
      'Explains the budget: with simple composition the epsilons of separate answers add, so ten answers at ε = 0.1 cost 1. Asking the same question again spends more; averaging 100 fresh answers cuts the noise tenfold but costs 100 times the epsilon. A system needs accounting for the whole dataset and a refusal when the budget is gone.',
      'Warns that epsilon alone does not say how safe it is: the unit that counts as one record matters (a person with k records is protected at roughly kε), and implementation mistakes are common (NIST SP 800-226 is written to help evaluate such claims).',
      'Describes DP-SGD briefly (clip each example’s gradient, add noise, track the total cost) and its price in accuracy and compute, with large pre-trained models and tuned settings narrowing the gap in reported results.',
      'Separates it from neighbours: it is not redaction, not unlearning (DP keeps each point’s contribution small, not zero) and not the same as federated learning, which needs secure aggregation and noise because updates can leak. Notes regulators judge anonymity case by case and gives no legal conclusion.',
    ],
    followUps: [
      {
        q: 'The counts are around 10,000. Does ε = 1 noise matter?',
        lookFor: 'An expected error of about 1 on 10,000 is negligible relative to the count, but small groups suffer: relative error is large for small cells, which is also a fairness concern for small subgroups.',
      },
      {
        q: 'Analysts run 500 queries a day against the dataset. What happens?',
        lookFor: 'The budget is spent fast under composition. Options: per-analyst budgets, caching and reusing released answers, answering fewer, aggregated queries, or refusing once exhausted.',
      },
      {
        q: 'Is federated learning private by itself?',
        lookFor: 'No: updates computed from private data can leak (gradients have been inverted in research). Add secure aggregation and differential privacy on the updates.',
      },
    ],
    redFlags: [
      'Says differential privacy means the data is encrypted or anonymised.',
      'Thinks epsilon 10 is ten times safer than epsilon 1.',
      'Ignores composition and the budget.',
      'States a legal conclusion about anonymity.',
    ],
    lessons: ['responsible/privacy-engineering-for-ai', 'local/private-and-air-gapped-ai'],
  },
  {
    id: 'pii-and-memorisation-in-an-llm-app',
    prompt:
      'You are adding an LLM feature that reads customer support tickets. A reviewer asks: “Could this leak customers’ personal data?” List the ways it could, what you build to reduce each, and what you do when a customer asks you to delete their data.',
    roles: ['ai-eng'],
    level: 'junior',
    kind: 'concept',
    topics: ['privacy', 'pii', 'memorisation', 'retention'],
    minutes: 15,
    strong: [
      'Names five channels: the model itself (memorised training text), membership inference (was this record in the training set), the prompt and context (anything in the window can be repeated), logs, traces and caches, and retrieval (a mixed index whose permission check happens after ranking).',
      'Explains memorisation evidence at the right strength: repetition matters most (one study found a sequence present 10 times generated about 1,000 times more often than one present once), larger models memorise more, deduplication reduces it, and a planted canary string can be used to test extraction before release. Fine-tuning on a small private set should be tested, not assumed safe.',
      'Handles personal data as a lifecycle: collect less (send the last message, not the whole thread), detect with patterns and a named-entity model while measuring recall, redact with typed placeholders such as [PERSON_1] before logging or sending to a third party (any mapping stored separately), and put a retention timer on every store, including logs, caches, the vector index, analytics and backups.',
      'Puts access control in the retrieval query (filter by the caller’s permissions before ranking), not in a prompt that says “do not reveal other customers”.',
      'Knows deleting from a store is easy and making a trained model forget is not, so keeps facts that may need deleting in a retrieval store rather than in weights, records which datasets trained which model version, and removes personal data and duplicates before fine-tuning.',
      'Maps the common data-protection principles to engineering (purpose limitation, minimisation, storage limitation, a recorded lawful basis, rights requests answered in about a month) and sends the legal questions to the privacy owner without giving legal advice; notes that sending text to an outside API is a data transfer to check against the terms.',
      'Does not oversell tools: on-device processing and federated learning remove some paths but not logging mistakes or injection, and differential privacy has a cost in accuracy.',
    ],
    followUps: [
      {
        q: 'Your redaction detector finds 90% of emails and names in a labelled sample. Is that enough?',
        lookFor: 'The 10% it misses leaks. Report recall like any eval, layer controls, treat logs as sensitive anyway, limit retention and access, and improve the detector on the misses.',
      },
      {
        q: 'A customer asks you to delete their data. Where might it be?',
        lookFor: 'Builds an inventory: tickets, the vector index and embeddings, logs and traces, caches, eval and fine-tuning datasets, backups and vendors; a process with owners and a time limit.',
      },
      {
        q: 'Could the model itself reveal a ticket it never saw at inference time?',
        lookFor: 'If it was fine-tuned on tickets, yes through memorisation. Retrieval avoids baking data into weights; dedupe, test with canaries and keep the tuning set minimal.',
      },
    ],
    redFlags: [
      'Says an enterprise API means nothing can leak.',
      'Logs full prompts forever with wide access.',
      'Relies on a prompt instruction for access control.',
      'Has no inventory of where personal data is stored.',
    ],
    lessons: ['responsible/privacy-engineering-for-ai', 'evals/llm-security', 'systems/rag-service-architecture'],
  },
  {
    id: 'reward-hacking-and-sycophancy',
    prompt:
      'You are tuning an assistant with preference data and a reward model. After a few rounds the reward goes up and answers read more confidently, yet users report more flattery and some wrong answers stated firmly. Explain what may be happening, what evidence shows this is a general problem, and what you change in training, evaluation and the product.',
    roles: ['ai-eng', 'ml-eng'],
    level: 'senior',
    kind: 'concept',
    topics: ['alignment', 'reward hacking', 'sycophancy', 'rlhf'],
    minutes: 20,
    strong: [
      'Explains the proxy problem: a reward model stands in for what people want, and optimising it hard finds loopholes (Goodhart’s law). Defines reward hacking or specification gaming as satisfying the literal objective without the intended outcome, with a documented example such as a boat-racing agent circling to hit reward blocks instead of finishing.',
      'Cites language-model evidence at the right strength: over-optimising a learned reward model lowers the score on a held-out gold reward model (Gao et al.); five assistants showed sycophancy, and preference data and preference models sometimes favoured agreeable or convincing wrong answers (Sharma et al.); METR reported on 5 June 2025 that an OpenAI model modified or bypassed scoring code in 39 of 128 runs on one task set; monitoring a model’s chain of thought can catch hacking but heavy optimisation pressure on it can teach models to hide intent.',
      'Distinguishes goal misgeneralisation: the reward is right and training behaviour looks right, but in new situations the agent pursues a different goal (the CoinRun agent that ran to the end of the level instead of taking the coin once it moved).',
      'Changes training and measurement: tracks a held-out gold or human evaluation that is never optimised, watches for divergence from the proxy and stops or slows when it appears, audits and diversifies preference data, and keeps a regression set of failures found.',
      'Tests sycophancy directly with matched prompts that state opposite user opinions on the same fact and compares the answers, reporting rates with intervals, and checks accuracy as well as agreement.',
      'For agentic evals, makes graders read-only and out of the agent’s reach, uses hidden tests, checks the outcome in a clean environment and reads transcripts for tampering.',
      'States what builders can and cannot rely on: no tuning removes the tension between helpful, honest and harmless; model behaviour is not a security boundary; refusals are not access control; behaviour can change with a vendor update; so use guardrails, least privilege, confirmation for consequential actions and monitoring in layers.',
    ],
    followUps: [
      {
        q: 'How would you measure sycophancy before and after a tuning run?',
        lookFor: 'Paired prompts that differ only in the user’s stated belief, a labelled set with known answers, the rate at which the answer flips with the stated opinion, intervals, and a held-out split not used in tuning.',
      },
      {
        q: 'In your coding-agent eval the model edits the test file so the checks pass. What do you do?',
        lookFor: 'Reward hacking of the checker. Make tests read-only or hidden, run grading outside the agent’s environment, grade the outcome in a clean checkout, and read transcripts.',
      },
      {
        q: 'Would a bigger reward model fix it?',
        lookFor: 'Not by itself: over-optimisation follows regular patterns as models grow. Needs a held-out gold measure, early stopping, diverse data and human audits.',
      },
    ],
    redFlags: [
      'Says RLHF solves alignment.',
      'Treats the reward as the goal rather than a proxy.',
      'Has no held-out evaluation that tuning cannot touch.',
      'Relies on the model’s refusal as the security control.',
    ],
    lessons: ['responsible/teaching-a-model-to-behave', 'deep-learning/rl-post-training', 'deep-learning/reinforcement-learning-from-scratch'],
  },
  {
    id: 'explaining-a-decision-shapley-and-limits',
    prompt:
      'A credit model scores Asha 53 and the cut-off is 55. She asks why, a regulator asks how the model decides, and a colleague suggests showing attention maps or asking the model to explain itself. Which explanation would you give each, and where does each method fall short? Work a Shapley value on a two-feature toy: the model scores 50 with neither feature known, 62 with only income known, 44 with only debt known, and 60 with both.',
    roles: ['ml-eng'],
    level: 'mid',
    kind: 'concept',
    topics: ['explainability', 'shapley', 'interpretability', 'regulation'],
    minutes: 18,
    strong: [
      'Works the toy: income’s Shapley value is the average of its gain with debt absent (62 − 50 = 12) and present (60 − 44 = 16), so 14; debt’s is the average of 44 − 50 = −6 and 60 − 62 = −2, so −4. They sum to 10 = 60 − 50 (the values add up to the difference from the typical case).',
      'Says what Shapley values are and are not: a fair split of one prediction’s difference from a typical case, with interactions shared equally; cost doubles with each feature so tools approximate; “unknown” needs a background definition that can create unrealistic combinations; and they are not a what-if (they do not say how much a change would raise the score).',
      'Gives Asha a counterfactual: what would have to change to reach the cut-off, for example lower debt if the model’s slope allows, which says what to change without opening the model; mentions local surrogate models such as LIME.',
      'Gives the regulator and builder whole-model tools: permutation importance on held-out data (shuffle a column, see the error rise) describes this model not the world, shares credit across correlated columns, and says how much but not which way.',
      'Does not accept attention maps or saliency maps as explanations without a test: attention weights can be uncorrelated with other importance measures (Jain and Wallace) though the definition of explanation is disputed (Wiegreffe and Pinter), and some saliency methods were found independent of the model.',
      'Treats a language model’s own explanation as evidence, not proof: reasoning can rationalise a bias it never mentions (Turpin et al.) and reasoning models often omit hints they used, so test by changing the input and checking the stated reason predicts what changes.',
      'Matches the explanation to the reader (affected person: plain reasons, counterfactuals and a way to contest; reviewer: main factors and evidence; builder: importance and Shapley plus error analysis; auditor: documentation, slice tests and logs) and tries an interpretable model first where it is accurate enough. Notes the EU AI Act gives certain affected people a right to an explanation of the role of a high-risk system, with scope for a lawyer.',
    ],
    followUps: [
      {
        q: 'Two income columns are near copies and permutation importance shows each as small. Why?',
        lookFor: 'Correlated columns share the credit: shuffling one leaves the other to cover. Cluster correlated features, or permute them together.',
      },
      {
        q: 'How would you check that an explanation method is faithful?',
        lookFor: 'Remove the features it calls important and check the score drops more than for random features; plant a model with one secretly decisive feature; randomise the model’s weights and check the explanation changes.',
      },
      {
        q: 'Does mechanistic interpretability solve this?',
        lookFor: 'Not yet: probes show information is present, not used; sparse autoencoders give nameable features but the authors state limits. It is useful research for investigation, not an audit button.',
      },
    ],
    redFlags: [
      'Shows a Shapley chart to a loan applicant as the reason.',
      'Presents attention weights as the model’s reasoning.',
      'Trusts a chatbot’s self-explanation without testing it.',
      'Treats feature importance as causation.',
    ],
    lessons: ['responsible/why-did-it-say-that', 'responsible/fairness-for-builders', 'foundations/attention-intuition'],
  },
  {
    id: 'oversight-queue-design-and-sizing',
    prompt:
      'Your agent drafts customer replies and proposes refunds. Management says “a human will approve everything.” Volume is 6,000 drafts a day and about 8% are wrong. Each review takes 2.5 minutes, and you have 4 reviewers with 7 productive hours each. Evaluate the plan with numbers, then design human oversight that actually works.',
    roles: ['ai-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['human oversight', 'human-in-the-loop', 'automation bias', 'capacity planning'],
    minutes: 25,
    strong: [
      'Does the capacity arithmetic: 4 × 420 = 1,680 reviewer-minutes, enough for 672 reviews a day. Review-everything needs 6,000 × 2.5 / 1,680, about 893% load, so the backlog grows and the reviews become rubber stamps.',
      'Routes by risk and labels the assumptions: if the top 10% by score (600 items) held 55% of the errors (an assumption to measure), load is about 89%; of 480 wrong drafts 264 are reviewed, at an assumed 90% catch rate 238 are fixed, and 242 reach customers, about 4% of drafts against 8% with no review.',
      'Insists on measuring the score: error rate should rise across score bands on labelled data; a ranking can be useful before stated probabilities are trustworthy; rebuild the table monthly and after any model or prompt change.',
      'Audits a random slice of what is not reviewed, because reviewing only flagged items cannot tell how many errors are in the rest. Estimating a 2% error rate to ±1 point at 95% confidence needs about 753 items (1.96² × 0.02 × 0.98 / 0.01²), which at 2.5 minutes is about 1,880 minutes, more than a day of capacity; spread over a week it is about 108 a day (about 16% of capacity), which pushes the total load above 100% so the review share must fall or a reviewer be added.',
      'Chooses the placement per action by reversibility and harm: gate before the action, undo window after, sampled audit later, or hand-off, with a handoff packet that saves the reviewer starting cold. Enforces tiers and limits (refund caps) in code, not in the prompt.',
      'Builds the gate properly: the pause lives in code, the approval binds to the exact action (tool, arguments, a hash) and expires, the action runs once with an idempotency key, the screen shows the effect and the evidence, untrusted text is shown quoted, and no response defaults to safe.',
      'Designs against automation bias and alert fatigue: review needs time, evidence and a cheap safe way to say no; commit-first designs (decide before seeing the AI’s answer) cut over-reliance though people like them less; repeated low-value alerts wear reviewers down; gate sparingly because prompts that are approved almost every time protect little.',
      'Measures the loop: automation rate and escaped-error rate as a pair, override rate, time per item, reviewer agreement (kappa), queue age, and treats a reject rate near zero as a warning. Feeds overrides into the eval set, using the random audit slice, not the flagged items, for overall error estimates.',
    ],
    followUps: [
      {
        q: 'The reject rate is 0.4% and the median time per item is 9 seconds. What do you conclude?',
        lookFor: 'Probably a rubber stamp. Seed known-bad items to test attention, move to commit-first, cut low-value items, rotate reviewers and check that rejecting is cheap.',
      },
      {
        q: 'Queue age keeps growing. What do you do about ordering and alerts?',
        lookFor: 'Sort by risk and age so nothing waits forever, alert on queue age as well as length, and hold or escalate when overloaded, telling the user, instead of auto-approving.',
      },
      {
        q: 'An attacker floods the queue with approval requests. What happens?',
        lookFor: 'Reviewers are worn down and real items are buried. Rate-limit per source, group by cause, hold and escalate, and keep the review tool free of powers over what it displays.',
      },
    ],
    redFlags: [
      'Offers “human in the loop” as the whole design with no capacity numbers.',
      'Uses a generic “Are you sure?” dialog as the approval screen.',
      'Audits only flagged items.',
      'Gives reviewers no cheap, safe way to reject.',
    ],
    lessons: ['systems/human-in-the-loop-design', 'responsible/human-oversight-and-when-ai-should-not-decide', 'evals/building-an-eval-dataset'],
  },
  {
    id: 'governance-for-forty-ai-features',
    prompt:
      'Your company has about forty AI features built by different teams on three vendors’ models. A director asks, “Which of these touch personal data, who approved them, and what happens if one goes wrong?” Nobody can answer. You are asked to set up the minimum governance in a quarter. How do you start, how do you get engineering teams to cooperate, and what do you say when a team calls it bureaucracy?',
    roles: ['ai-eng', 'ml-platform'],
    level: 'mid',
    kind: 'behavioural',
    topics: ['governance', 'model cards', 'risk management', 'incident response'],
    minutes: 18,
    strong: [
      'Starts with an inventory of every AI system, including bought ones, each with a named owner, built from a light intake form and from procurement, security and API-key records rather than a survey nobody answers.',
      'Sets risk tiers by use, not technology, with minimum evidence per tier. For example: an internal summariser without personal data needs owner sign-off and an inventory entry; a customer-facing chatbot needs an evaluation report, a security review and a monitoring plan; decisions about people need an impact assessment, independent review, designed human oversight and an incident drill.',
      'Covers the seven recurring practices: inventory, tiers, roles (an owner per system and an accountable executive), review gates before launch and after big changes, post-deployment monitoring, incident handling and supplier checks including a contingency plan for third-party failure.',
      'Uses frameworks as organisers, not checklists: NIST’s AI RMF (Govern, Map, Measure, Manage) is voluntary and, as of the lesson’s 1 November 2026 read, under revision; the generative AI profile’s twelve risks make a review-gate checklist; ISO/IEC 42001 is a paid standard, so read it or ask an accredited auditor rather than rely on summaries.',
      'Handles incidents with a fixed minimum form (system, reporter, dates, description, impacts, who is affected), a rule for who decides seriousness, and anyone able to escalate without penalty; notes that laws set their own incident thresholds and deadlines for some high-risk systems, scope depends on role and dates, and the lawyers decide.',
      'Reads model cards by their red flags: claims with no number, a single accuracy figure, no out-of-scope use, no results by group, possible overlap between evaluation and training data, and “no known limitations”.',
      'Wins cooperation with proportionate effort: tier 1 takes minutes, reuse eval sets and traces teams already have, set a turnaround time for reviews, start with the highest tier and two pilot teams, publish the answers to the director’s questions, and remove controls that never change a decision. Measures coverage of the inventory, time to approval, incidents found by monitoring rather than complaints, and drill results.',
    ],
    followUps: [
      {
        q: 'Two weeks in you find a customer-facing feature that scores job candidates. What do you do?',
        lookFor: 'Treats it as the top tier: names the owner, does not shame the team, requires an impact assessment, designed human oversight and independent review before it expands, and asks legal whether it falls under specific high-risk rules; does not state a legal conclusion.',
      },
      {
        q: 'A vendor’s system card says the model is “state of the art on diverse users”. How do you treat it?',
        lookFor: 'As a red flag: asks for numbers, which groups, the evaluation data and out-of-scope uses, and tests the model on your own data.',
      },
      {
        q: 'How do you know the programme is working?',
        lookFor: 'Inventory coverage, time to approve by tier, share of incidents caught by monitoring, drill results and audit samples; not the count of documents produced.',
      },
    ],
    redFlags: [
      'Starts with a long policy document nobody reads.',
      'Treats NIST’s framework as a compliance checklist.',
      'Applies one review process to every feature regardless of risk.',
      'Gives legal conclusions about what the company must do.',
    ],
    lessons: ['responsible/running-ai-governance', 'evals/eu-ai-act-for-engineers', 'responsible/ai-rules-around-the-world'],
  },
  {
    id: 'scraped-data-licence-and-copyright-check',
    prompt:
      'A teammate has scraped two million web pages and a set of books from a shadow library, and wants to fine-tune an open-weights model on them for a commercial product next month. The manager wants to ship. What do you say and do?',
    roles: ['ml-eng', 'ai-eng'],
    level: 'mid',
    kind: 'behavioural',
    topics: ['copyright', 'licensing', 'data provenance', 'behavioural'],
    minutes: 18,
    strong: [
      'Is clear that this is not legal advice and the law is unsettled: as of the lesson’s 1 November 2026 read, courts in different countries have decided narrow cases differently and some are on appeal. Escalates the legal questions to counsel and does not offer a confident opinion.',
      'Breaks the question into three: the input (is copying works into a dataset and training on them allowed?), the model (do the weights contain the works?) and the output (can it reproduce them, and who owns what it makes?).',
      'Challenges the sources: a web crawl is not a licence (a crawl’s own terms say users must respect third-party copyright), robots.txt is a request, not authorisation, though in the EU the form of an opt-out can matter, so honour it and log it; and a shadow library is the source at least one US court treated differently from lawfully acquired books.',
      'Checks three licences, not one: the code, the weights and the data, each at the exact version. Data licences such as the Creative Commons NonCommercial, ShareAlike and NoDerivatives variants, ODbL and CDLA do not say whether a trained model is an adaptation of its data, so that stays an open question. Reads the base model’s licence (acceptable-use terms, thresholds, naming rules) and any provider terms that bar training competing models on outputs.',
      'Brings in memorisation and privacy: the weights question connects to what a model can reproduce, so dedupe, test extraction, and put personal data through the privacy process.',
      'Proposes a practical path: a provenance record per dataset (source, licence or basis, date fetched, owner), logged opt-outs, licensed or openly licensed data, retrieval over documents you may use instead of training on them, a named owner for the legal questions, and the ability to answer “was this work in the training set?” per model version. For EU general-purpose model providers, notes a copyright policy and training-content summary are required.',
      'Handles the people side: frames it as risk and timeline, not a blocker, offers an alternative that can ship (a smaller scope with clean data), records the decision, and escalates calmly if overruled instead of quietly going along or quietly going around.',
    ],
    followUps: [
      {
        q: 'Legal clears the licensed subset. Do you still need to check the model’s own licence?',
        lookFor: 'Yes. Code, weights and data have separate licences, and the base model’s terms, output-use rules and provider terms apply independently of the data.',
      },
      {
        q: 'A customer asks whether a particular book was in your training data. Can you answer?',
        lookFor: 'Only from provenance records per model version; weights cannot reliably say, and membership inference is weak evidence. This is why the records matter.',
      },
      {
        q: 'The manager says competitors do the same. What now?',
        lookFor: 'That is not an argument about risk. Restates the exposure and the alternative, asks for a documented decision from the person who owns the risk, and escalates if needed.',
      },
    ],
    redFlags: [
      '“It is on the internet, so it is fine.”',
      'Gives a confident legal opinion in either direction.',
      'Checks only the dataset licence and forgets weights and provider terms.',
      'Keeps no provenance record.',
    ],
    lessons: ['responsible/where-the-data-comes-from', 'responsible/privacy-engineering-for-ai', 'llm/choosing-and-comparing-models'],
  },
  {
    id: 'energy-estimate-for-an-ai-feature',
    prompt:
      'Your product team asks how much electricity and carbon an AI feature uses. The service runs on 16 GPUs, each averaging 550 W while serving around the clock, in a facility with a power usage effectiveness (PUE) of 1.2, and handles 3 million requests a day. Estimate the energy per request and the daily carbon on a grid of 400 g CO2e per kWh (an example figure), say what the number leaves out, and name three levers to reduce it.',
    roles: ['ml-platform', 'ai-eng'],
    level: 'junior',
    kind: 'estimation',
    topics: ['energy', 'carbon', 'sustainability', 'capacity planning'],
    minutes: 12,
    strong: [
      'Computes power × time × overhead with units: 16 × 550 W = 8.8 kW; × 24 h = 211.2 kWh; × 1.2 PUE = 253.4 kWh a day; ÷ 3 million requests = about 0.085 Wh (85 mWh) per request.',
      'Converts to carbon: 253.4 kWh × 0.4 kg/kWh = about 101 kg CO2e a day, or about 0.034 g per request; about 92.5 MWh a year. On a 12 g/kWh grid the same service is about 3 kg a day and on an 820 g/kWh grid about 208 kg, a spread of almost 70 times, so where and when it runs matters.',
      'States what the figure leaves out: the manufacture of the hardware, host computers, network and storage if the 550 W is only the GPU, idle or spare capacity, training, the user’s device and water. The boundary (chip only, server, facility, life cycle) can change published figures by two times or more, and published per-query numbers are mostly company self-reports with different boundaries and dates, so they cannot be lined up like a league table.',
      'Ties energy to tokens: at an example 400-token reply the figure is about 0.21 mWh per token, and a reasoning model that writes many times more tokens spends roughly in proportion if the fleet stays equally busy.',
      'Knows busy chips matter: batching and utilisation lower the energy per request, and idle machines still draw power.',
      'Names levers: the smallest model that passes the tests (and routing easy requests to it), fewer tokens (shorter outputs, caps on reasoning), caching and batching, shrinking or quantising the model or running it on the device, and choosing the region and time on a cleaner grid.',
      'Presents it as a dated range with assumptions, not a point value, and recommends measuring with an open tool rather than guessing.',
    ],
    followUps: [
      {
        q: 'Batching lets the same 16 GPUs serve 6 million requests a day. What happens to energy per request?',
        lookFor: 'Roughly halves, to about 0.042 Wh, if power draw stays similar; in practice power rises somewhat with load, so measure it.',
      },
      {
        q: 'Marketing wants one claim: “an AI query uses X”. How do you respond?',
        lookFor: 'Insists on the boundary, the date, the source, the median or mean and the prompt and model, and avoids false precision.',
      },
      {
        q: 'What about water?',
        lookFor: 'On-site cooling figures and figures that include the water behind electricity and chip manufacture can differ by more than 100 times; define the boundary before quoting.',
      },
    ],
    redFlags: [
      'Forgets the facility overhead.',
      'Makes a unit error between W, kW, Wh and kWh.',
      'Quotes a competitor’s per-query number as directly comparable.',
      'States the result to three significant figures from rough inputs.',
    ],
    lessons: ['responsible/energy-and-water-of-ai', 'serving/inference-optimisation', 'cost/cost-levers'],
  },
];
