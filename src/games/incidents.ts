/**
 * Incident Room: diagnose a production failure from evidence, then choose the
 * fix. Evidence costs points to open, so reading the right things first pays.
 *
 * The incidents are composites of failure patterns that recur in real
 * systems. Numbers and names are invented.
 */

export type Evidence = {
  id: string;
  label: string;
  /** Monospaced lines, shown like a log or dashboard excerpt. */
  lines: string[];
};

export type Incident = {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  /** What someone told you, in their words. */
  report: string;
  evidence: Evidence[];
  causes: { id: string; label: string; ruledOut: string }[];
  cause: string;
  fixes: { id: string; label: string; why: string }[];
  fix: string;
  explanation: string;
  lessons: { label: string; href: string }[];
};

export const incidents: Incident[] = [
  {
    id: 'stale-policy',
    level: 1,
    title: 'The bot quotes last year’s policy',
    report: 'The HR assistant told an employee they get 10 days of parental leave. The policy changed to 16 weeks in March. People are asking why the bot is wrong.',
    evidence: [
      {
        id: 'answer',
        label: 'The answer',
        lines: [
          'Q: How much parental leave do I get?',
          'A: Employees receive 10 days of paid parental leave.',
          '   Source: Leave Policy 2023.pdf, section 4',
        ],
      },
      {
        id: 'retrieval',
        label: 'Retrieved passages',
        lines: [
          '#1  Leave Policy 2023.pdf  s4        score 0.83   last_indexed 2024-01-12',
          '#2  Benefits FAQ.pdf       s2        score 0.61   last_indexed 2025-02-03',
          '    "...for parental leave see the Parental Leave Policy 2025."',
          '#3  Leave Policy 2023.pdf  s5        score 0.58   last_indexed 2024-01-12',
        ],
      },
      {
        id: 'ingest',
        label: 'Ingestion job',
        lines: [
          'source: Parental Leave Policy 2025.pdf   modified 2025-03-04',
          'indexed: never',
          'last successful run: 2025-02-03',
          'runs since: 56   failed: 56',
          'error: PDFParseError: password-protected file (x27), timeout (x29)',
          'alerts configured: none',
        ],
      },
      {
        id: 'model',
        label: 'Model settings',
        lines: ['model: pinned version', 'temperature: 0.2', 'prompt: "Answer only from the passages. Cite the source."'],
      },
    ],
    causes: [
      { id: 'hallucination', label: 'The model made up the number', ruledOut: 'The answer matches the retrieved 2023 policy exactly and cites it. The model followed its instructions faithfully.' },
      { id: 'stale-index', label: 'The ingestion pipeline has been failing silently, so the index is out of date', ruledOut: '' },
      { id: 'chunk-size', label: 'Chunks are too large to find the right clause', ruledOut: 'The right clause was found. It is simply from an old document.' },
      { id: 'embeddings', label: 'The embedding model is too weak to match the question', ruledOut: 'Retrieval worked: the top results are on topic. The newest document is just not in the index.' },
    ],
    cause: 'stale-index',
    fixes: [
      { id: 'monitor', label: 'Fix the parser, alert on ingestion failures and document counts, and show document dates in citations', why: 'Fixes the cause, makes the next failure visible within a day, and lets readers judge freshness.' },
      { id: 'bigger', label: 'Switch to a larger model', why: 'A larger model faithfully quoting an old document is still wrong.' },
      { id: 'temp', label: 'Lower the temperature to zero', why: 'Temperature does not change what is in the index.' },
      { id: 'warn', label: 'Add a banner telling users to double-check answers', why: 'Does not fix it, and teaches users the tool cannot be trusted.' },
    ],
    fix: 'monitor',
    explanation: 'The system worked exactly as designed on out-of-date data. The newest policy was never indexed because the ingestion job failed 56 times in a row and nobody was told. The answer cited the old policy, which is the clue: when a faithful, cited answer is wrong, suspect the data before the model.',
    lessons: [
      { label: 'RAG from scratch', href: '/learn/rag-agents/rag-from-scratch/' },
      { label: 'RAG service architecture', href: '/learn/systems/rag-service-architecture/' },
    ],
  },
  {
    id: 'split-answer',
    level: 1,
    title: '“I don’t know”, but it is in the docs',
    report: 'The support bot says it has no information about the refund window. It is on the Returns page. This happens a lot with questions that have a number in the answer.',
    evidence: [
      {
        id: 'answer',
        label: 'The answer',
        lines: [
          'Q: How long do I have to return something for a refund?',
          'A: I don’t have information about the refund window in the provided documents.',
        ],
      },
      {
        id: 'retrieval',
        label: 'Retrieved passages',
        lines: [
          '#1  returns.md  chunk 7   score 0.71',
          '    "...Items can be returned if unused and in original packaging. Return shipping is free for faulty goods. ## Refund"',
          '#2  shipping.md chunk 2   score 0.64',
          '    "...Standard delivery takes 3 to 5 working days. Express delivery..."',
          '#3  returns.md  chunk 3   score 0.60',
        ],
      },
      {
        id: 'chunking',
        label: 'Chunking config',
        lines: ['splitter: fixed 300 characters', 'overlap: 0', 'respects headings: no', 'embedded text: chunk body only (no title or heading)'],
      },
      {
        id: 'source',
        label: 'The source page',
        lines: [
          '## Refund window',
          'We refund returns within 30 days of delivery,',
          'provided the item passes inspection.',
          '',
          '(chunk 7 ends after "## Refund"; chunk 8 begins "window ... We refund returns within 30 days")',
        ],
      },
      {
        id: 'prompt',
        label: 'Prompt',
        lines: ['"Answer only using the passages. If they do not contain the answer, say you do not know."'],
      },
    ],
    causes: [
      { id: 'prompt-strict', label: 'The prompt is too strict and makes the model refuse', ruledOut: 'Refusing was correct: the number is not in any passage the model was given. A looser prompt would invite guessing.' },
      { id: 'chunk-split', label: 'Chunking split the heading from its answer, so the passage with the number was never retrieved', ruledOut: '' },
      { id: 'weak-model', label: 'The model is not capable enough', ruledOut: 'The model had no passage containing the figure to read.' },
      { id: 'no-docs', label: 'The refund policy is missing from the knowledge base', ruledOut: 'It is present: chunk 8 of returns.md contains it. It was just not retrieved.' },
    ],
    cause: 'chunk-split',
    fixes: [
      { id: 'structure', label: 'Chunk on headings with some overlap, embed the heading with each chunk, and add a retrieval test for number-bearing questions', why: 'Keeps each answer attached to its heading, so the right chunk matches the question.' },
      { id: 'loosen', label: 'Tell the model to answer from general knowledge when unsure', why: 'It would invent a refund window. Wrong answers about refunds cost money.' },
      { id: 'bigger', label: 'Move to a larger model', why: 'The model is behaving correctly with the context it has.' },
      { id: 'topk', label: 'Retrieve 50 passages instead of 3', why: 'Might surface chunk 8 but adds cost and noise. It treats the symptom.' },
    ],
    fix: 'structure',
    explanation: 'Fixed-size splitting cut the page in the middle of a sentence and left the heading with the wrong half. The chunk that contained "30 days" had no mention of "refund" in a way the search could match on. Structure-aware chunking, with the heading included in what gets embedded, is the standard remedy.',
    lessons: [{ label: 'Chunking and retrieval quality', href: '/learn/rag-agents/chunking-and-retrieval-quality/' }],
  },
  {
    id: 'bill-spike',
    level: 2,
    title: 'The bill tripled, traffic did not',
    report: 'Finance says the AI bill for this week is three times last week’s. Product says usage is flat. Nobody changed the model.',
    evidence: [
      {
        id: 'metrics',
        label: 'Daily metrics',
        lines: [
          'day   requests   avg_in_tokens   avg_out_tokens   cost',
          'Mon   20,100     3,080           385              $1,160',
          'Tue   19,800     3,120           381              $1,150',
          'Wed   20,300     11,420          379              $3,730',
          'Thu   20,000     11,390          383              $3,690',
          'Fri   19,900     11,460          380              $3,710',
        ],
      },
      {
        id: 'prompt',
        label: 'Prompt breakdown (a Thursday request)',
        lines: ['system prompt        900 tokens', 'conversation so far  2,100 tokens', 'tool result          8,200 tokens   <- raw JSON, 40 orders, all fields', 'user question           60 tokens'],
      },
      {
        id: 'deploys',
        label: 'Deploy log',
        lines: ['Tue 16:40  v2.14  "Show order status in the assistant"', 'Wed 09:10  v2.15  "Agent keeps full tool results in conversation history"', '(no model or config changes)'],
      },
      {
        id: 'pricing',
        label: 'Provider pricing and quota',
        lines: ['input $/1M tokens: unchanged since contract start', 'output $/1M tokens: unchanged', 'no new rate tiers'],
      },
    ],
    causes: [
      { id: 'price', label: 'The provider raised prices', ruledOut: 'Per-token prices are unchanged. Cost rose because tokens per request rose.' },
      { id: 'traffic', label: 'More users or more requests', ruledOut: 'Request count is flat at about 20,000 a day.' },
      { id: 'tool-output', label: 'A release started sending whole raw tool results in every prompt', ruledOut: '' },
      { id: 'long-answers', label: 'The model started writing longer answers', ruledOut: 'Average output tokens are flat at about 380.' },
    ],
    cause: 'tool-output',
    fixes: [
      { id: 'trim-tools', label: 'Return only the fields the model needs from tools, summarise or drop old tool results, and cap tool output size', why: 'Removes the extra 8,000 tokens at the source, for every later call too.' },
      { id: 'small', label: 'Switch to a cheaper model', why: 'Cuts the price but keeps sending 8,000 tokens of irrelevant JSON, and risks quality.' },
      { id: 'cache', label: 'Turn on prompt caching only', why: 'Tool output differs on every request, so it will not be cached. Partial at best.' },
      { id: 'limit', label: 'Rate-limit users', why: 'Traffic was never the problem.' },
    ],
    fix: 'trim-tools',
    explanation: 'Cost equals tokens times price, and only tokens changed: input per request almost quadrupled the day a release began keeping raw tool output in the conversation. The prompt breakdown shows it at a glance. Always check input tokens per request before blaming price or traffic.',
    lessons: [
      { label: 'Where the tokens go', href: '/learn/cost/where-the-tokens-go/' },
      { label: 'Agents and tool use', href: '/learn/rag-agents/agents-and-tool-use/' },
    ],
  },
  {
    id: 'retry-storm',
    level: 2,
    title: 'Every morning at nine it falls over',
    report: 'Every weekday at 9:00 we get a burst of errors and everything slows for ten minutes. Then it recovers by itself.',
    evidence: [
      {
        id: 'errors',
        label: 'Error log, 09:00:01',
        lines: [
          '09:00:01.102  req 4f1  ThrottlingException (429)  retry 1',
          '09:00:01.104  req 4f1  ThrottlingException (429)  retry 2',
          '09:00:01.105  req 4f1  ThrottlingException (429)  retry 3',
          '09:00:01.107  req 4f1  ThrottlingException (429)  retry 4',
          '09:00:01.109  req 4f1  ThrottlingException (429)  retry 5  -> giving up',
        ],
      },
      {
        id: 'traffic',
        label: 'Requests per minute',
        lines: ['08:55  620', '08:58  780', '09:00  4,100   <- includes retries', '09:01  4,350', '09:04  3,900', '09:10  900'],
      },
      {
        id: 'config',
        label: 'Client config and quota',
        lines: ['max_retries: 5', 'backoff: none', 'jitter: none', 'provider quota: 1,000 requests/minute', 'legitimate peak (from logs): ~900/minute'],
      },
      {
        id: 'latency',
        label: 'Model latency',
        lines: ['p50 time to first token: 640 ms (all day)', 'p95: 1.4 s (all day)', 'no provider incident reported'],
      },
    ],
    causes: [
      { id: 'model-slow', label: 'The model is slow at 9am', ruledOut: 'Latency is steady all day, and the provider reports no incident.' },
      { id: 'retry-storm', label: 'Immediate retries with no backoff multiply the load past the quota', ruledOut: '' },
      { id: 'low-quota', label: 'The quota is simply too low for legitimate traffic', ruledOut: 'Legitimate peak is about 900 a minute, under the 1,000 quota. Retries are what push it to 4,100.' },
      { id: 'bad-network', label: 'A network problem at the office', ruledOut: 'The errors are explicit 429 responses from the provider, not timeouts.' },
    ],
    cause: 'retry-storm',
    fixes: [
      { id: 'backoff', label: 'Exponential backoff with jitter, a retry cap, a client-side limiter, and a fallback path for requests that cannot wait', why: 'Spreads retries over time, stops the amplification, and gives users an answer while the primary recovers.' },
      { id: 'more-retries', label: 'Raise max_retries to 10', why: 'Makes the storm bigger. Each failed request now sends ten more.' },
      { id: 'larger', label: 'Move to a larger model', why: 'Throttling is about request volume, not model capability.' },
      { id: 'ignore', label: 'Do nothing, it recovers by itself', why: 'Users get errors every morning and the quota stays at risk.' },
    ],
    fix: 'backoff',
    explanation: 'Real traffic of about 900 a minute fits the quota, but five instant retries per failed call turn it into 4,100 a minute, which guarantees more failures. Backoff with jitter is the textbook cure because it spreads retries out instead of synchronising them.',
    lessons: [
      { label: 'Model routing and fallbacks', href: '/learn/systems/model-routing-and-fallbacks/' },
      { label: 'Life of a request', href: '/learn/serving/life-of-a-request/' },
    ],
  },
  {
    id: 'agent-loop',
    level: 2,
    title: 'A 20-minute task that cost $14',
    report: 'One support task ran for twenty minutes and used $14 of tokens before someone killed it. The customer’s order did exist.',
    evidence: [
      {
        id: 'trace',
        label: 'Trace',
        lines: [
          'step 1   tool search_orders(email="a@x.com")        -> ""',
          'step 2   tool search_orders(email="a@x.com ")       -> ""',
          'step 3   tool search_orders(name="A. Customer")     -> ""',
          'step 4   tool search_orders(email="A@X.COM")        -> ""',
          '...',
          'step 41  tool search_orders(email="a@x.com")        -> ""',
        ],
      },
      {
        id: 'tool',
        label: 'Tool source',
        lines: ['def search_orders(**kw):', '    try:', '        return db.query(**kw)', '    except Exception:', '        return ""'],
      },
      {
        id: 'logs',
        label: 'Database log',
        lines: ['09:14:02 search_orders  ERROR  connection refused (replica-3)', '09:14:03 search_orders  ERROR  connection refused (replica-3)', '... 41 identical errors ...'],
      },
      {
        id: 'prompt',
        label: 'Prompt and limits',
        lines: ['"Keep trying different searches until you find the customer’s order."', 'max_steps: not set', 'token budget: not set', 'timeout: not set'],
      },
    ],
    causes: [
      { id: 'weak-model', label: 'The model is not smart enough to find the order', ruledOut: 'The database was unreachable. No search could have worked, and the model had no way to know that.' },
      { id: 'swallowed', label: 'The tool hides a database error as an empty result, and nothing limits the loop', ruledOut: '' },
      { id: 'bad-args', label: 'The model is passing the wrong arguments', ruledOut: 'It varied them sensibly. They were never the problem.' },
      { id: 'no-order', label: 'The order does not exist', ruledOut: 'The report says it did, and the database error shows nothing was actually searched.' },
    ],
    cause: 'swallowed',
    fixes: [
      { id: 'errors-limits', label: 'Return explicit errors from tools, add step, time and token limits, and tell the agent to stop and escalate on repeated errors', why: 'The model learns the search is failing, and the limits cap the damage when something else goes wrong.' },
      { id: 'bigger', label: 'Use a larger model', why: 'It would loop just as confidently with a database that is down.' },
      { id: 'more-tools', label: 'Give the agent more search tools', why: 'More ways to hit the same dead database.' },
      { id: 'persist', label: 'Make the prompt even more insistent about trying again', why: 'That instruction is part of how it got stuck.' },
    ],
    fix: 'errors-limits',
    explanation: 'Three small flaws combined: the tool returned an empty string instead of an error, the prompt demanded persistence, and nothing capped steps, time or tokens. The model did what it was told. Agents need honest tool errors and hard budgets.',
    lessons: [{ label: 'Agents and tool use', href: '/learn/rag-agents/agents-and-tool-use/' }],
  },
  {
    id: 'json-truncated',
    level: 2,
    title: 'Four per cent of responses are invalid JSON',
    report: 'Our summarisation service returns broken JSON for about 4% of requests and the parser throws. The prompt clearly asks for valid JSON.',
    evidence: [
      {
        id: 'samples',
        label: 'Failed outputs',
        lines: [
          '{"customer":"Mara T.","priority":"high","summary":"The customer reports that the ord',
          '{"customer":"J. Okafor","priority":"low","summary":"Asked about invoice 4471 and whether the',
        ],
      },
      {
        id: 'finish',
        label: 'Finish reasons on failures',
        lines: ['finish_reason = max_tokens   96%', 'finish_reason = stop         4%', '(successful requests: finish_reason = stop 100%)'],
      },
      {
        id: 'length',
        label: 'Failure rate by input length',
        lines: ['input < 2k tokens    0.1%', 'input 2k-6k          1.9%', 'input > 6k tokens    11.4%'],
      },
      {
        id: 'config',
        label: 'Request config',
        lines: ['max_tokens: 300', 'temperature: 0', 'response format: free text, prompt asks for JSON', 'validation + retry: none'],
      },
    ],
    causes: [
      { id: 'temperature', label: 'Temperature is too low', ruledOut: 'Temperature does not cause cut-off output, and successful requests use the same setting.' },
      { id: 'truncated', label: 'Responses are cut off at the token limit, more often for longer inputs', ruledOut: '' },
      { id: 'prompt-unclear', label: 'The prompt does not make clear that JSON is required', ruledOut: 'It does, and 96% of failures are visibly cut off mid-string rather than malformed in structure.' },
      { id: 'model-bug', label: 'A bug in the provider’s JSON handling', ruledOut: 'The outputs are valid up to the exact point where the token limit was reached.' },
    ],
    cause: 'truncated',
    fixes: [
      { id: 'limit-validate', label: 'Raise max_tokens with headroom, set length limits on fields, use structured output if the platform supports it, and validate and retry on parse failure', why: 'Addresses the truncation, reduces output size, and makes remaining failures recoverable.' },
      { id: 'say-please', label: 'Add “please return valid JSON” to the prompt', why: 'It already says so. The model never got to finish.' },
      { id: 'temp', label: 'Raise the temperature', why: 'Unrelated to the cut-off.' },
      { id: 'swallow', label: 'Catch the parse error and return an empty result', why: 'Hides the problem and loses data.' },
    ],
    fix: 'limit-validate',
    explanation: 'The finish reason is the tell: max_tokens on 96% of failures. Longer inputs produce longer summaries, so the longest documents hit the 300-token ceiling mid-string. The remedy combines enough headroom, shorter fields, structured output and validation with retry.',
    lessons: [
      { label: 'Prompting and structured output', href: '/learn/llm/prompting-and-structured-output/' },
      { label: 'Life of a request', href: '/learn/serving/life-of-a-request/' },
    ],
  },
  {
    id: 'cache-leak',
    level: 3,
    title: 'A customer saw someone else’s order',
    report: 'A customer says the assistant showed them another person’s order number and delivery address. This is a data breach until proven otherwise.',
    evidence: [
      {
        id: 'cache-log',
        label: 'Cache log',
        lines: [
          '11:02:14 user=A  q="where is my order?"   cache MISS  -> generated, stored',
          '11:05:51 user=B  q="Where is my order"    cache HIT   -> returned stored answer',
          '        stored answer: "Order #A-10293 ships to 12 Elm Street, arriving Thursday."',
        ],
      },
      {
        id: 'cache-config',
        label: 'Cache configuration',
        lines: ['layer: response cache, in front of the orchestrator', 'key: hash(lowercase(strip_punctuation(question)))', 'ttl: 24 hours', 'scoped by user: no'],
      },
      {
        id: 'retrieval',
        label: 'Retrieval and access control',
        lines: ['order lookup tool: filters by authenticated user_id   (verified for both requests)', 'permission filter on documents: applied'],
      },
      {
        id: 'injection',
        label: 'Prompt-injection scan',
        lines: ['user B input: "Where is my order"', 'no instruction-like text, no suspicious attachments'],
      },
    ],
    causes: [
      { id: 'injection', label: 'User B tricked the model with a prompt injection', ruledOut: 'User B’s message was ordinary and the lookup tool was correctly filtered. The answer was replayed from the cache.' },
      { id: 'cache-scope', label: 'The response cache is keyed on question text alone and sits in front of access control', ruledOut: '' },
      { id: 'hallucinated', label: 'The model hallucinated plausible details', ruledOut: 'The details are user A’s real order, which the model could not have invented.' },
      { id: 'filter-missing', label: 'The order lookup tool has no user filter', ruledOut: 'It filters by user_id and was verified for both requests.' },
    ],
    cause: 'cache-scope',
    fixes: [
      { id: 'scope', label: 'Do not cache personalised answers, or include the user or permission scope in the key; purge the cache; add a test that two users never share an answer; start the breach process', why: 'Fixes the structural flaw, removes the leaked entries, prevents regression, and treats it as the incident it is.' },
      { id: 'shorter', label: 'Shorten the cache TTL to one hour', why: 'Still leaks, for a shorter window.' },
      { id: 'prompt', label: 'Add “never reveal other customers’ data” to the prompt', why: 'The model never saw user A’s data in B’s request; the cache replayed it. A prompt cannot fix that.' },
      { id: 'remove-cache', label: 'Remove all caching, including prompt caching', why: 'Throws away a safe saving. Only the shared response cache was the problem.' },
    ],
    fix: 'scope',
    explanation: 'Each component did its own job, but the response cache ignored identity and sat in front of access control. Two different users produced the same normalised key, so one received the other’s stored answer. Caches of personalised output must be scoped to the person, or not used.',
    lessons: [
      { label: 'RAG service architecture', href: '/learn/systems/rag-service-architecture/' },
      { label: 'Cost levers', href: '/learn/cost/cost-levers/' },
    ],
  },
  {
    id: 'silent-regression',
    level: 3,
    title: 'Quality dropped on Monday, nobody deployed',
    report: 'Support is seeing worse answers since Monday morning. The last deploy was Thursday and it was a copy change.',
    evidence: [
      {
        id: 'evals',
        label: 'Nightly eval pass rate',
        lines: ['Thu 91%', 'Fri 91%', 'Sat 92%', 'Sun 91%', 'Mon 78%   <- first run after Sunday night', 'Tue 78%'],
      },
      {
        id: 'config',
        label: 'Model configuration',
        lines: ['model_id: "provider-large-latest"', 'version pinned: no', 'prompt version: unchanged since Thursday (hash a41f9c)'],
      },
      {
        id: 'changelog',
        label: 'Provider changelog',
        lines: ['Sun 23:00 UTC  "provider-large-latest now points to the new release. Improved reasoning, more concise default style."'],
      },
      {
        id: 'diff',
        label: 'Sample output diff',
        lines: ['before: {"answer":"...","sources":[1,2]}', 'after:  Sure! Here is the answer:\\n- ...\\n(sources omitted)', 'failures cluster on: format-following cases (62%), citation cases (24%)'],
      },
    ],
    causes: [
      { id: 'data-drift', label: 'Users started asking harder questions', ruledOut: 'The eval set is fixed. The same questions are now answered worse.' },
      { id: 'alias-moved', label: 'The unpinned model alias was moved to a new version with different behaviour', ruledOut: '' },
      { id: 'our-deploy', label: 'Thursday’s copy change broke the prompt', ruledOut: 'Evals stayed at 91% on Friday, Saturday and Sunday, after that deploy.' },
      { id: 'index', label: 'The retrieval index got corrupted', ruledOut: 'Failures are about output format and citations, not missing facts.' },
    ],
    cause: 'alias-moved',
    fixes: [
      { id: 'pin', label: 'Pin an exact model version, run the eval suite on a schedule against production, alert on drops, and test new versions before moving', why: 'Makes model changes something you choose and verify instead of discover.' },
      { id: 'prompt-tweak', label: 'Keep rewriting the prompt until Monday’s numbers recover', why: 'Chases a moving target. The next silent update will break it again.' },
      { id: 'rollback', label: 'Roll back Thursday’s copy change', why: 'Not the cause. Evals were fine after it.' },
      { id: 'switch', label: 'Switch provider', why: 'The same unpinned-alias risk exists everywhere.' },
    ],
    fix: 'pin',
    explanation: 'Nothing in your code changed, but your dependency did. A “latest” alias moved on Sunday night and the new version formats output differently. Without a pinned version you cannot control when behaviour changes, and without scheduled evals you only learn from users. Evals are what turned this from a mystery into a diagnosis.',
    lessons: [
      { label: 'Evals 101', href: '/learn/evals/evals-101/' },
      { label: 'Model routing and fallbacks', href: '/learn/systems/model-routing-and-fallbacks/' },
    ],
  },
  {
    id: 'judge-bias',
    level: 3,
    title: 'The judge loves Prompt B, the agents hate it',
    report: 'Our automatic judge scores the new prompt (B) 12 points better than the old one (A). Support agents who read real conversations say B is worse. Who is right?',
    evidence: [
      {
        id: 'scores',
        label: 'Judge results',
        lines: ['pairwise, B shown second: B preferred 62%, A 38%', 'judge model: same family as the answering model', 'rubric: "Which answer is more helpful and thorough?"'],
      },
      {
        id: 'length',
        label: 'Answer length',
        lines: ['prompt A: mean 110 words', 'prompt B: mean 240 words', 'preference for the longer answer within A-only comparisons: 71%'],
      },
      {
        id: 'swap',
        label: 'Order-swap test',
        lines: ['re-ran 200 pairs with the order reversed', 'verdict changed on 31% of pairs'],
      },
      {
        id: 'humans',
        label: 'Human audit (100 conversations, blind)',
        lines: ['agents prefer A: 58', 'agents prefer B: 30', 'tie: 12', 'common comment on B: "rambling, buries the actual answer"'],
      },
    ],
    causes: [
      { id: 'humans-wrong', label: 'The agents are biased towards the old prompt', ruledOut: 'The audit was blind, so agents did not know which prompt was which.' },
      { id: 'judge-bias', label: 'The judge is biased towards longer answers and towards position, and the rubric rewards thoroughness', ruledOut: '' },
      { id: 'sample-size', label: 'The judge sample is too small', ruledOut: 'The swap test and the length effect are large and consistent. More data would not remove the bias.' },
      { id: 'b-better', label: 'B really is better and agents dislike change', ruledOut: 'A blind audit found agents prefer A, with specific complaints about rambling.' },
    ],
    cause: 'judge-bias',
    fixes: [
      { id: 'calibrate', label: 'Rewrite the rubric around correctness and concision, randomise order, control for length, and check judge agreement against human labels before trusting it', why: 'Removes the known biases and ties the metric back to what people actually want.' },
      { id: 'ship-b', label: 'Ship B, the judge scored it higher', why: 'You would optimise for what the judge likes, not what users need.' },
      { id: 'drop-evals', label: 'Stop using automatic judging', why: 'A calibrated judge is still the only way to scale review. The answer is to fix it, not abandon it.' },
      { id: 'bigger-judge', label: 'Use a larger judge model without changing anything else', why: 'Bigger models show verbosity and position bias too.' },
    ],
    fix: 'calibrate',
    explanation: 'Judges are instruments and this one was miscalibrated: it favoured longer answers and whichever came second, and the rubric asked for “thorough”. The order-swap test and the length comparison exposed it, and the blind human audit confirmed it. Always calibrate an automatic judge against people before letting it decide anything.',
    lessons: [{ label: 'LLM-as-judge and its pitfalls', href: '/learn/evals/llm-as-judge-pitfalls/' }],
  },
  {
    id: 'device-latency',
    level: 3,
    title: '3 ms on the laptop, glitching on the device',
    report: 'The noise-suppression model runs in 3 ms on the dev laptop, comfortably under our 10 ms budget. On the actual device the audio stutters.',
    evidence: [
      {
        id: 'laptop',
        label: 'Laptop profile',
        lines: ['hardware: laptop CPU, plugged in', 'inference: mean 3.1 ms, p99 4.0 ms', 'precision: FP32'],
      },
      {
        id: 'device',
        label: 'Device profile (60-second run)',
        lines: ['hardware: target NPU + small CPU, on battery', 'inference: mean 14 ms, p99 22 ms', 'precision: INT8 (calibrated on clean speech only)', 'budget: 10 ms'],
      },
      {
        id: 'ops',
        label: 'Operator report',
        lines: ['layers on NPU: 41 of 44', 'unsupported on NPU, running on CPU: layer_norm, gelu, custom_resample', 'CPU<->NPU transfers per frame: 6'],
      },
      {
        id: 'thermal',
        label: 'Thermals and memory',
        lines: ['after 90 s sustained: clock throttled 30%', 'peak memory: 82% of model budget'],
      },
    ],
    causes: [
      { id: 'python', label: 'The Python code around the model is slow', ruledOut: 'On the laptop the same code runs in 3 ms. The device profile points at operators and transfers.' },
      { id: 'ops-fallback', label: 'Operators unsupported on the NPU fall back to the CPU, adding transfers, and nobody measured on the target', ruledOut: '' },
      { id: 'bigger-laptop', label: 'The laptop benchmark is wrong', ruledOut: 'It is accurate for the laptop. It is just not the target hardware.' },
      { id: 'quant', label: 'INT8 quantization made the model slower', ruledOut: 'INT8 is what the NPU is built for. The slowdown is from the three CPU-bound operators and the transfers around them.' },
    ],
    cause: 'ops-fallback',
    fixes: [
      { id: 'redesign', label: 'Replace or fuse the unsupported operators with NPU-friendly ones, retrain or re-quantize, make profiling on the target under sustained load part of the workflow, and add noisy audio to calibration', why: 'Removes the CPU fallbacks, tests the real conditions, and keeps accuracy honest in noise.' },
      { id: 'laptop-faster', label: 'Buy faster laptops for development', why: 'The laptop was never the bottleneck.' },
      { id: 'lower-rate', label: 'Lower the audio sample rate', why: 'Changes the product to hide a profiling problem.' },
      { id: 'cloud', label: 'Run the model in the cloud', why: 'A network round trip alone would exceed a 10 ms budget.' },
    ],
    fix: 'redesign',
    explanation: 'The laptop number was true and irrelevant. On the device, three operators the NPU cannot run fall back to the CPU, forcing transfers every frame, and sustained load throttles the clock. Only profiling on the target hardware, under realistic load, reveals this. Calibrating quantization on clean speech only is a second trap waiting in the field.',
    lessons: [
      { label: 'Fitting a model onto a small device', href: '/learn/edge/quantization-for-edge/' },
      { label: 'Edge or cloud inference', href: '/learn/edge/edge-vs-cloud-inference/' },
    ],
  },
];

/* ---------- scoring ---------- */

export const COST_PER_EVIDENCE = 4;
export const COST_PER_WRONG_CAUSE = 15;
export const COST_PER_WRONG_FIX = 10;
export const MIN_SCORE = 10;

export function scoreIncident(opened: number, wrongCauses: number, wrongFixes: number) {
  return Math.max(
    MIN_SCORE,
    100 - COST_PER_EVIDENCE * opened - COST_PER_WRONG_CAUSE * wrongCauses - COST_PER_WRONG_FIX * wrongFixes,
  );
}

export function rating(score: number) {
  if (score >= 85) return 'Sharp';
  if (score >= 65) return 'Solid';
  return 'Keep practising';
}
