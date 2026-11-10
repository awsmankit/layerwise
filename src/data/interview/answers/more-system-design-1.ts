import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'code-retry-backoff-full-jitter': {
    short:
      "Retry only failures that can go away on their own (429, 5xx, timeouts, dropped connections) and fail at once on 400, 401, 403, 404 and content-policy errors. Wait a random time between 0 and min(cap, base x 2^attempt) before each retry, which is called full jitter, honour any retry-after header, and stop at a maximum number of attempts or a total time budget. Inject the sleep, clock and random source so a test can check the exact delays without waiting.",
    explain: [
      {
        heading: "Which errors deserve a retry",
        body: "A retry helps only when waiting can change the outcome. HTTP 429 means too many requests, 5xx means the server had a problem (including the overload codes some providers use), and timeouts and dropped connections are usually brief. A 400 (bad request), 401 or 403 (not allowed), 404 (not found) or a content-policy refusal will fail the same way every time, so retrying only wastes quota and hides the bug. The function should classify the error first and raise straight away for the second group.",
      },
      {
        heading: "Exponential backoff, full jitter and the cap",
        body: "Exponential backoff means each wait is longer than the last: the window doubles, so with a base of 0.5 seconds the windows are 0.5, 1, 2, 4 and then 8. The cap stops it growing without limit, and you should also limit the exponent itself (for example use min(attempt, 30)) so 2^attempt can never overflow or give absurd numbers. Full jitter means the actual wait is a uniform random number between 0 and the window. If 1,000 clients failed at the same moment, plain backoff makes all of them return together at 0.5 s, then 1 s, then 2 s, in waves. Full jitter spreads them across the whole window, so the server sees a steady trickle instead.",
      },
      {
        heading: "Bounds, retry-after and safe repetition",
        body: "Two limits keep the loop honest: a maximum number of attempts and a total time budget (a deadline). When the last attempt fails, raise the last error with context (how many attempts, how long) instead of returning nothing. If the response carries a retry-after header, the provider is telling you when to come back, so use it as a floor for the delay, and if it is longer than the time you have left, stop and raise rather than hammer the server. Retrying must also be safe: only repeat calls that are idempotent (repeating them changes nothing more) or that carry an idempotency key, and never retry a streaming reply once some text has already reached the user.",
      },
      {
        heading: "How to test it",
        body: "Pass in the things that make tests slow or random: a sleep function, a clock and a random source. Then a test can feed in a fake call that fails twice and succeeds, make random return 0.5, and assert that the recorded sleeps are exactly 0.25 and 0.5 seconds without waiting at all. Further tests check that a 401 is raised after one attempt, that the delay never exceeds the cap even at attempt 50, that retry-after of 3 seconds wins over a smaller random delay, that the deadline stops the loop, and that the final error is raised. Count or log every retry so a dashboard can show when the provider is struggling.",
      },
    ],
    diagram: {
      kind: 'experiment',
      slug: 'no-backoff',
      caption: "Run the burst with immediate retries and then with backoff and jitter, and watch what happens to the server.",
    },
    example: {
      title: "Example: the delays with base 0.5 s and cap 8 s",
      text: "A sketch of the function: for attempt from 0 to max_attempts minus 1, try the call and return its result; on an error, if it is not retryable, or it was the last attempt, or the deadline has passed, raise it with context; otherwise set window = min(cap, base x 2^min(attempt, 30)), delay = random(0, window), raise delay to the retry-after value if there is one (and stop if that is beyond the deadline), then sleep(delay). The numbers below are an example with 5 attempts, so there are 4 waits.",
      rows: [
        { label: "Windows for waits 1 to 4", value: "0.5, 1, 2, 4 seconds (the next would be 8, the cap)" },
        { label: "Longest possible total wait", value: "0.5 + 1 + 2 + 4 = 7.5 seconds" },
        { label: "Average total wait with full jitter", value: "7.5 / 2 = 3.75 seconds" },
        { label: "Test with random fixed at 0.5", value: "waits of 0.25, 0.5, 1 and 2 seconds" },
        { label: "Test with retry-after of 3 s on the first failure", value: "first wait is max(0.25, 3) = 3 seconds" },
        { label: "Three layers that each retry 3 times", value: "3 x 3 x 3 = 27 calls for one user request" },
      ],
    },
    followUps: [
      {
        q: "Why full jitter rather than plain exponential backoff?",
        a: "Plain backoff keeps clients in step, so their retries arrive in waves and the server is hit by the same crowd again and again. Choosing a random point in the whole window spreads the load, and usually everyone finishes sooner because the server is not repeatedly overloaded.",
      },
      {
        q: "Many services each retry three times, and they call each other in a chain. What goes wrong?",
        a: "Retries multiply at each layer, so three layers of three tries turn one failure into 27 calls just when the system is weakest. Retry at one layer only, use a retry budget or a circuit breaker, and pass a deadline down so lower layers stop when the caller has given up.",
      },
      {
        q: "Now add a client-side token-bucket rate limiter in front of it. What are its parameters and behaviour?",
        a: "A bucket has a capacity (the burst you allow) and a refill rate that matches your quota, and it may count tokens rather than requests. A request takes from the bucket, and if the bucket is empty it waits or is rejected. It must be safe across threads and use a monotonic clock.",
      },
    ],
    mistakes: [
      "Retrying every exception, including authentication and bad-request errors that can never succeed.",
      "Using a fixed delay or no jitter, so all the clients that failed together come back together.",
      "Looping with no maximum number of attempts and no overall deadline, or swallowing the last error.",
      "Retrying a streaming response after part of it was already shown, or retrying a call that is not safe to repeat.",
    ],
  },

  'debug-morning-429-storm': {
    short:
      "A 429 means you were rate limited, and provider limits are per minute (requests and tokens), per model and per region, so a healthy monthly budget says nothing about 09:00. Measure tokens and requests per minute against the quota, split the 429s by caller and model, and look for retries and scheduled jobs that make the burst worse. Then fix it in three layers: polite clients (backoff with jitter, a limiter), smarter traffic (interactive before batch, smaller prompts and output limits), and more capacity (a quota increase, more regions, a fallback).",
    explain: [
      {
        heading: "Why the monthly budget is the wrong number",
        body: "A budget is money over a month. A rate limit is a speed limit: for example 200,000 tokens per minute for one model in one region. You can use 5% of the monthly budget and still hit the speed limit for 20 minutes, the way a road can be empty all week and jammed at 09:00. So the first job is to plot requests per minute and tokens per minute against the quota, per model and region, and to read the rate-limit and retry-after headers on the 429 responses. Split the 429s by caller, model and endpoint to see who is using the quota.",
      },
      {
        heading: "What turns a short burst into a 20 minute storm",
        body: "Look for amplification. If clients retry immediately or on a fixed interval, every rejected request comes back at once and the limiter stays saturated, so a two minute spike becomes twenty. Look for scheduled work at 09:00 too, such as a batch summary job or a cache warm-up, which competes with real users. And check token accounting: some providers count the maximum output you asked for against the per-minute quota when they admit the request, so a request that asks for up to 4,000 output tokens but only writes 300 still uses 4,000 worth of room.",
      },
      {
        heading: "Fix it in three layers",
        body: "Client: exponential backoff with full jitter and a cap, honour retry-after, a retry budget, and a client-side token-bucket limiter sized just under the quota so extra requests wait in a queue instead of failing. Traffic: give interactive requests priority over batch, move batch work off-peak or to a batch API, shorten prompts, set the maximum output tokens to what you need, and use prompt caching where the provider counts cached tokens less. Capacity: ask for a quota increase before you need it (it can take days), spread across regions or deployments, consider reserved or provisioned throughput for the predictable peak, and add a fallback model or region. Also tell your quota apart from the provider's own overload: if the provider is out of capacity, more quota will not help, but a fallback will.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "minutes after 08:50",
      yLabel: "tokens per minute offered, in thousands (example)",
      points: [[0, 60], [10, 150], [15, 230], [25, 260], [35, 210], [40, 150], [50, 90]],
      marks: [{ x: 10, label: "09:00 rush begins" }, { x: 25, label: "retries pile on" }],
      caption: "An example day: the quota is 200 thousand tokens a minute, so demand above that line gets a 429, and the retries push it higher for a while.",
    },
    example: {
      title: "Example: how the output limit eats the quota",
      text: "Example numbers: a quota of 200,000 tokens per minute, a prompt of 1,500 tokens, an answer that is really about 300 tokens, and a provider that counts the requested maximum output when it admits a request. The first three rows show how many requests a minute fit, and the last row shows why immediate retries make things worse.",
      rows: [
        { label: "Max output set to 4,000", value: "200,000 / (1,500 + 4,000) = about 36 requests a minute" },
        { label: "Max output set to 500", value: "200,000 / (1,500 + 500) = 100 requests a minute" },
        { label: "If the real size were counted (1,800)", value: "200,000 / 1,800 = about 111 requests a minute" },
        { label: "100 callers, each retrying at once up to 10 times", value: "up to 100 x 10 = 1,000 extra calls into a full limiter" },
        { label: "Same callers with full jitter and a 30 s cap", value: "retries spread over seconds, so the limiter can drain" },
      ],
    },
    followUps: [
      {
        q: "Why is 'retry immediately up to 10 times' dangerous here?",
        a: "It adds load during exactly the period when the quota is already used up, so the limiter stays full and recovery is delayed. Retries must be delayed, randomised and limited in number.",
      },
      {
        q: "Leadership asks for a fallback to a second cloud provider. What has to be true for that to work in an incident?",
        a: "The quota and capacity must already be approved in the second cloud and region, the fallback model must have been evaluated on your task, and prompts, data residency and contracts must be checked. Health-based routing with a circuit breaker and a little live traffic keep the path known to work.",
      },
      {
        q: "How would you alert on this before users notice?",
        a: "Alert on tokens and requests per minute as a percentage of the quota, on the 429 rate and on the retry rate, broken down by model and region. A warning at 70% of quota gives time to act before the limit is hit.",
      },
    ],
    mistakes: [
      "Assuming a 429 is a provider bug and opening a ticket without measuring per-minute usage.",
      "Adding more retries with no backoff or jitter, which makes the storm longer.",
      "Believing the monthly spend or monthly token total is the limit that matters.",
      "Leaving the maximum output tokens at a huge default when the answers are short.",
    ],
  },

  'choosing-an-ai-library-without-lock-in': {
    short:
      "Start from the job: three model calls and one tool call need a function or a short loop, not a framework, so write plain code first. If a library still earns its place, judge it by its repository (recent releases, answered issues, no archived notice), by how much it hides, by its real licence file, and by how long it would take to remove. Try the smallest candidate for an afternoon, keep it at the edge of your code behind your own types, pin the version, and re-check its status because these things change.",
    explain: [
      {
        heading: "Do you have the problem today?",
        body: "A framework solves problems such as long-running state, branching workflows, many tools and resuming after a crash. A flow with three model calls and one tool call has none of those. Plain code costs you writing and testing the loop, perhaps 50 to 100 lines (an example guess), and you can read every line. A framework costs you learning its ideas, its defaults and its upgrades. Adopting one in case the project grows later means paying the cost now for a benefit you may never need, and you can adopt it later when the problem is real.",
      },
      {
        heading: "How to compare candidates",
        body: "Check maintenance from the repository, not from star counts: the date of the latest release and the last push, whether recent issues get replies, and whether there is an archived notice. Statuses change, so treat these as dated. At the time of writing, the AutoGen README says the project is archived with Microsoft Agent Framework as the successor, and the Text Generation Inference README says it is in maintenance mode and points to vLLM and SGLang. Then ask how much the library hides: its built-in prompts, retries and output parsing are your app's behaviour, so can you see and change them? Read the LICENSE file, not the badge: some projects keep directories under a separate enterprise licence, and some use source-available terms such as the Elastic License 2.0 instead of an OSI-approved open-source licence, which can decide whether you may use it for your case. Finally check what data it sends out (telemetry is sometimes on by default), that the docs match the major version you installed, and that you install from the project's own documented command, not a script nobody has read.",
      },
      {
        heading: "Keep the exit door open",
        body: "Ask: if I had to remove this, how long would it take? If rewriting to plain calls is a day's work, the risk is small, and if it is a month, you are locked in. Keep the library at the edge: wrap it behind your own thin interface, use your own message and tool types, store prompts in versioned files rather than framework templates, and make sure you can still call the provider's SDK directly. Run evals at the boundary of your app so a rewrite can be checked against the same cases. Before committing, build the same small flow with the smallest candidate in an afternoon, then pin the version and plan upgrades from the project's release policy.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Plain code", "Thin library for one job", "Full agent framework"],
      rows: [
        { label: "Fits when", cells: ["Few calls, clear flow", "One awkward piece, such as retries or parsing", "Long-running, branching, many tools"] },
        { label: "What you write and test", cells: ["The loop yourself", "Your code plus a small call", "Mostly framework concepts"] },
        { label: "What it hides", cells: ["Nothing", "A little, easy to inspect", "Prompts, retries, state"] },
        { label: "Cost of leaving", cells: ["None", "Hours to a day", "Weeks if it owns your data model"] },
        { label: "Main risk", cells: ["You rebuild what you later need", "Abandoned or changed", "Lock-in and hard debugging"] },
      ],
      caption: "Three ways to build the same support assistant, and what each one costs you.",
    },
    example: {
      title: "Example: the afternoon test for the support assistant",
      text: "The assistant makes three model calls (classify, draft, check) and one tool call (look up the order). The counts below are an example of what a team might find, to show the decision rule rather than a measurement of any real library.",
      rows: [
        { label: "Plain version", value: "about 60 lines, one file, every prompt visible" },
        { label: "Candidate framework version", value: "about 40 lines, plus a new concept for state and a default retry rule nobody set" },
        { label: "Time to rewrite the framework version to plain calls", value: "about 1 day, so the risk is low" },
        { label: "Same, if the framework owned messages and prompts", value: "about 4 weeks, so treat it as lock-in" },
        { label: "Decision for three calls and one tool", value: "plain code, and revisit when the flow has loops or many tools" },
      ],
    },
    followUps: [
      {
        q: "The prototype already uses the framework heavily. What would have made leaving a one-day job?",
        a: "Thin interfaces of your own around it, your own message and tool types, prompts in versioned files instead of framework templates, and evals that run at the app boundary. Then a rewrite can be checked against the same cases.",
      },
      {
        q: "You find that a library you depend on has been archived. What do you do?",
        a: "Look for the named successor and its migration notes, and check which parts of the library the app actually uses. Pin the current version, plan the move rather than rushing, and re-run the evals after any change.",
      },
      {
        q: "Legal asks whether you can use an open-source observability tool in a commercial product. How do you answer?",
        a: "Read the actual LICENSE file, separate OSI-approved licences from source-available ones, and note any directories under another licence. Take hosting or resale cases to legal, since this is not legal advice.",
      },
    ],
    mistakes: [
      "Choosing by star count, a blog post or what is popular this month.",
      "Adopting a framework for a three-call flow in case it grows.",
      "Never having looked at the library's default prompts or retry rules.",
      "Being unable to say how long it would take to remove the library, or trusting a licence badge or an unread install script.",
    ],
  },

  'lead-technical-debt-in-ai-system': {
    short:
      "Name the debt that is specific to AI systems (unversioned prompts, a stale evaluation set, unpinned model IDs, a never-rebuilt index), rank it by how likely and how costly an incident is and by how much it slows every feature, and start with small, high-leverage fixes. The first is a release manifest plus a regression evaluation that grows from real failures, because without it every change is a gamble. Pay in small steps tied to feature work, keep a steady slice of capacity, and argue in business terms such as incidents and time to ship a safe change.",
    explain: [
      {
        heading: "What the debt looks like in an AI product",
        body: "Technical debt is a shortcut you took that you now pay interest on. In this system the interest shows up in specific ways. Thirty prompts in code strings, edited by five people, mean nobody knows which wording is live or who changed it. Model, prompt and search index are not released as one unit, so you cannot roll back to a state that was tested. A 25-case evaluation set from launch has not absorbed a year of real failures. Three model versions in use, with unpinned IDs, expose you to a retirement or a silent change. And a search index nobody has rebuilt may be missing a year of new documents, with no monitoring of quality or cost by version to tell you.",
      },
      {
        heading: "How to rank it",
        body: "Make a debt register: each item gets an owner, the chance it hurts you, how bad it would be, whether it slows every feature, how big the fix is, and any deadline such as a model retirement date. Items that score high on risk and that slow everything come first, and a hard deadline jumps the queue. The evaluation harness usually wins, because it makes every other change safe and measurable. A 25-case set also cannot tell small changes from noise: 22 of 25 correct is 88%, but the plausible range is roughly 70% to 96%.",
      },
      {
        heading: "Pay in small steps, and make the case in business terms",
        body: "Avoid the big rewrite, which stops features for months and carries its own risk. Instead attach debt work to features: to ship feature X safely we need Y. Reserve a steady share of capacity, a planning choice such as 15% to 20% rather than a standard. Argue with things the business feels: incidents, how long a prompt change takes to reach users safely, regressions that customers found first, and the date a model is retired. Then measure progress by outcomes (time to ship a prompt change, regressions caught before release, the share of features with evaluations, incident count) and stop new debt with a definition of done and a review checklist.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "Week 1: list and rank", detail: "Build the debt register with owners, risk and the retirement date, and share it with product." },
        { label: "Weeks 1 to 2: pin and manifest", detail: "Pin model IDs and put prompts and settings into one versioned release manifest." },
        { label: "Weeks 2 to 4: regression evals", detail: "Grow the 25 cases from real failures and run them on every change." },
        { label: "Month 2: observe", detail: "Track quality and cost per version, and rebuild the index on a schedule." },
        { label: "Ongoing: prevent", detail: "Definition of done, a review checklist and a regular look at the register." },
      ],
      caption: "A rough order of work, each step small enough to ship next to feature work.",
    },
    example: {
      title: "Example: capacity and why 25 cases is too few",
      text: "Example team of 5 engineers on two-week sprints. The sums show what a debt slice costs and why the first fix is a bigger evaluation set. The interval uses a standard 95% method (Wilson) for a pass rate.",
      rows: [
        { label: "Capacity per sprint", value: "5 engineers x 10 days = 50 person-days" },
        { label: "A 15% to 20% debt slice", value: "7.5 to 10 person-days a sprint" },
        { label: "22 correct out of 25", value: "88%, plausible range about 70% to 96%" },
        { label: "88 correct out of 100", value: "88%, plausible range about 80% to 93%" },
        { label: "One case in a 25-case set", value: "moves the score by 4 percentage points" },
      ],
    },
    followUps: [
      {
        q: "Product says there is no capacity for debt this quarter. What do you do?",
        a: "Show the risk register and the cost of delay, and offer the smallest slice that reduces the biggest risk, tied to a feature product cares about. Escalate only with evidence, such as the retirement date.",
      },
      {
        q: "If you could fix only one item, which and why?",
        a: "The evaluation harness together with versioning, because it makes every other change safe and measurable. The next would be pinning model IDs ahead of any retirement date.",
      },
      {
        q: "How do you stop the debt from coming back?",
        a: "A definition of done that includes a versioned config and evaluation cases, a pull-request checklist, and a regular review of the register. Make the safe path the easy one with templates and tooling.",
      },
    ],
    mistakes: [
      "Proposing a rewrite from scratch instead of small steps next to feature work.",
      "Arguing for clean code with no link to risk or delivery.",
      "Treating every item as equally urgent, so nothing gets chosen.",
      "Having no way to tell whether the debt work helped.",
    ],
  },

  'ux-for-an-ai-summary-feature': {
    short:
      "Stream the summary: the model needs 1.8 + 160 / 40 = 5.8 seconds to finish, but the first words can appear at 1.8 seconds, and because people read slower than the model writes they also finish sooner. Make trust checkable with citations built from your own passage IDs, show uncertainty only where it is calibrated and tied to an action, and make correction cheaper than regenerating. Tie every feedback signal to the request trace, and judge success by task outcomes such as edit distance, task time and audited escaped errors, not thumbs-up alone.",
    explain: [
      {
        heading: "Waiting: streaming changes what the user feels",
        body: "Without streaming the agent stares at a spinner for the time to first token plus the writing time: 1.8 + 160 / 40 = 5.8 seconds. With streaming, words start at 1.8 seconds. The model is no faster, but people read at roughly 240 words per minute (an example figure), and 160 tokens is about 120 words, so reading takes about 30 seconds. The model writes faster than that, so the reader is the slow part and starts earlier, which means they finish about 4 seconds sooner. Streaming has costs: partial text can be wrong or be retracted, checks that need the whole answer cannot run first, structured output cannot render until it is valid, the connection must survive proxies, and a long agent task needs progress messages rather than text.",
      },
      {
        heading: "Trust, uncertainty and correction",
        body: "Agents will rely on this, so let them check it. Build citations from retrieved passage IDs rendered from your own index, because a URL the model types can be invented, verify any quoted span in code, take the user to the highlighted passage, and have a clear state for no source. This matters: a 2023 audit of four generative search products found only about half of the sentences were fully supported by their citations, which shows the failure mode, not a current score. A footer saying AI can be wrong tells the user nothing about where to look. A per-claim cue helps only if it is calibrated, since a badly calibrated check this flag gives false comfort, so tie each cue to an action (compare with the ticket) and test the wording, because the research on hedging is mixed. Make correction cheaper than regeneration with edit in place, undo for anything applied, regenerate with a reason, and a preview of what will change before anything with side effects.",
      },
      {
        heading: "Feedback, measurement and the edges",
        body: "Attach every signal to the trace of the request: explicit ones (thumbs, comments) and implicit ones (accepted, edited, regenerated). Read them with their traps, because accepting is not the same as checking. Measure task outcomes: edit distance, time to finish the ticket, retries and abandonment, plus a sampled audit of accepted summaries for errors that escaped, each paired with a cost and an error metric. Design the edges too: a refusal state, a timeout with a non-AI fallback such as the first lines of the ticket, an empty state with examples, and accessibility for keyboard and screen reader users.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "seconds",
      items: [
        { label: "First words, no streaming", value: 5.8, note: "1.8 + 160 / 40" },
        { label: "First words, streaming", value: 1.8, note: "time to first token", hot: true },
        { label: "Done reading, no streaming", value: 35.8, note: "5.8 + 30 to read" },
        { label: "Done reading, streaming", value: 31.8, note: "1.8 + 30 to read" },
      ],
      caption: "Example reading speed of 240 words a minute for a 120 word summary. The model is no faster with streaming, but the user starts reading sooner.",
    },
    example: {
      title: "Example: the numbers behind the wait",
      text: "From the question: 1.8 seconds to the first token, 40 tokens a second and 160 tokens a summary. The reading speed and the words-per-token ratio are rough example figures.",
      rows: [
        { label: "Time to write the whole summary", value: "160 / 40 = 4 seconds" },
        { label: "Total with no streaming", value: "1.8 + 4 = 5.8 seconds of spinner" },
        { label: "Words in the summary", value: "160 tokens x 0.75 = about 120 words" },
        { label: "Time to read it at 240 words a minute", value: "120 / 240 = 0.5 minutes = 30 seconds" },
        { label: "Time saved by streaming", value: "5.8 - 1.8 = 4 seconds" },
      ],
    },
    followUps: [
      {
        q: "Acceptance is 92%. Is the feature working?",
        a: "Not necessarily, because people may accept without checking. Audit a random sample of accepted summaries for errors, and look at edit distance, task time and the same numbers by segment.",
      },
      {
        q: "Compliance wants every summary moderated before display. What do you do about streaming?",
        a: "A check on the full output needs the whole answer. Either buffer it (more delay, more accurate), stream only progress, or check asynchronously and accept that exposure, and test the end of the stream where gaps tend to be.",
      },
      {
        q: "How should a screen reader user experience the stream?",
        a: "Do not put the token container in an aria-live region, which would announce fragments. Mark it busy while streaming, use a separate status element that says Generating and then Summary ready, do not move focus, and give a real, focusable stop button.",
      },
    ],
    mistakes: [
      "Discussing only the prompt and the model and not the interface.",
      "Treating a generic disclaimer as the whole uncertainty design.",
      "Showing citations the model typed without verifying them against your index.",
      "Judging success by thumbs-up alone.",
    ],
  },

  'pm-ux-for-prefilled-fields-and-uncertain-extraction': {
    short:
      "A per-field accuracy of 97% sounds excellent, but with 12 fields 0.97^12 is about 69%, so roughly three forms in ten contain at least one wrong value (assuming the fields fail independently). Show the source next to every pre-filled value, flag only the fields where a flag is calibrated and attach an action to it, and do not offer an accept-all shortcut for high-stakes fields. Measure field correction rate, audited error rate, planted-error catch rate and time to complete, not acceptance rate.",
    explain: [
      {
        heading: "Why 97% per field is not good enough",
        body: "The chance that all 12 fields are right is 0.97 multiplied by itself 12 times, which is about 0.694, or 69%. So about 31 forms in 100 carry at least one wrong value, and the average form has 12 x 0.03 = 0.36 wrong fields. That assumes the fields fail independently, and in real documents errors often cluster, so check it on your own data. The lesson is that a per-field score hides how often a whole form needs a fix, so design for the form, not the field.",
      },
      {
        heading: "Make mistakes easy to catch",
        body: "Show the source next to the value: highlight the part of the document each field came from, so a check takes seconds. A pre-filled value with no evidence invites rubber-stamping. Flag low-confidence fields with an action (check against page 2), but only if the confidence is calibrated, meaning that fields marked 60% are right about 60% of the time, because a badly calibrated flag gives false comfort. A generic AI can make mistakes notice on every form teaches people to ignore it. If the document has no answer, leave the field empty and say why, rather than filling a plausible guess.",
      },
      {
        heading: "Automation bias and how to measure the design",
        body: "Automation bias is the habit of trusting what a machine pre-filled. Fight it: no accept-all button for the fields that carry the most risk, an explicit confirmation on those fields, and cheap correction with edit in place and undo. Measure what matters: the field correction rate, the form error rate found by a later audit of submitted forms, time to complete, abandonment and errors that escape to later steps. Test the design with a controlled comparison and with real people, including a version with deliberately planted wrong values to see how many users catch them, and check that the review flow is accessible.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "number of fields on the form",
      yLabel: "forms with every field right (%)",
      points: [[1, 97], [3, 91.3], [6, 83.3], [12, 69.4], [20, 54.4]],
      marks: [{ x: 12, label: "12 fields: about 69%" }],
      caption: "With 97% accuracy per field (an example figure) and independent errors, the share of fully correct forms falls as the form gets longer.",
    },
    example: {
      title: "Example: how many wrong forms reach submission",
      text: "Example numbers: 12 fields at 97% each, so 30.6% of forms contain an error before review. The rows show how many still contain one after a review that catches a given share of wrong fields, using 1 - (1 - 0.03 x missed)^12 and assuming independence.",
      rows: [
        { label: "Forms with at least one wrong field, no review", value: "1 - 0.97^12 = 30.6%" },
        { label: "Reviewers catch 70% of wrong fields", value: "1 - (1 - 0.03 x 0.3)^12 = about 10.3%" },
        { label: "Reviewers catch only 30% (rubber-stamping)", value: "1 - (1 - 0.03 x 0.7)^12 = about 22.5%" },
        { label: "Average wrong fields per form before review", value: "12 x 0.03 = 0.36" },
        { label: "What to track", value: "planted-error catch rate, audited error rate" },
      ],
    },
    followUps: [
      {
        q: "Acceptance of pre-filled values rises to 96% after a redesign. Is that a success?",
        a: "Not by itself, because users may be checking less. Look at the planted-error catch rate and the audited error rate, since acceptance shows use and not correctness.",
      },
      {
        q: "Which fields would you never pre-fill, and why?",
        a: "Fields where a wrong value has a legal or financial effect and the user is the authority, such as consent, declarations and bank details, or fields that cannot be checked against a source. The reasoning is by cost of error, not by model accuracy.",
      },
      {
        q: "Support reports customers saying the AI got it wrong, so they do not trust the product. What do you change?",
        a: "Look at how errors are shown and fixed, set the expectation on first use (check these fields), and improve the error path. Trust comes from mistakes that are findable and fixable and from honest limits, more than from accuracy alone.",
      },
    ],
    mistakes: [
      "Optimising acceptance rate and calling it quality.",
      "Showing pre-filled values with no source and no flag.",
      "Adding a generic AI can make mistakes footer and considering uncertainty handled.",
      "Filling a plausible value when the document has no answer.",
    ],
  },

  'sa-reference-architecture-internal-assistant': {
    short:
      "Before drawing, ask about sources and data volume, how permissions are defined, users and peaks, latency, languages, compliance and residency, sign-on, who runs it, and what success means. Then present blocks that each have a reason: ingestion with access lists, a hybrid index, a query layer that filters by the user's groups, a model gateway, simple orchestration, output checks, tracing, evaluation and a front end. Map them to the customer's own cloud over private connections, plan quota and cost with ranges, and phase the work from proof of concept to production.",
    explain: [
      {
        heading: "Ask first, then draw",
        body: "A reference architecture is a standard pattern you adapt, and the questions decide the adaptation. Which sources are in scope and how much data is there? How are permissions defined, and can they be synced? How many users, and when are the peaks? What latency is acceptable, which languages, which compliance and residency rules? How does sign-on work, who will run the system after you leave, and what does success look like? Without the answers you are drawing boxes for a guess.",
      },
      {
        heading: "The blocks and why each exists",
        body: "Ingestion reads the documents and tickets, parses them and attaches metadata, including each item's access list. A hybrid index combines keyword and vector search, because names and codes need exact match and paraphrases need meaning. The query layer filters by the user's groups at retrieval time, so the model never receives a passage the person may not see, and the permission rule lives in code, never in the prompt. A model gateway gives one place to switch models, set limits and log. Orchestration starts as a single call or a fixed workflow, with an agent only if the task needs one. Output checks, logging and tracing, an evaluation pipeline and a front end with single sign-on complete the picture.",
      },
      {
        heading: "Mapping it to the cloud, and the decisions to explain",
        body: "Use the customer's cloud: its managed model service, its search or vector store, its identity service, private endpoints and key management, and check that each feature is supported for the chosen model and region before promising it. Security is explicit: one identity per application with least privilege, private endpoints so there is no public path, customer-managed keys where required, a deliberate residency scope, audit logs on, and a decision on whether prompt content is logged. Explain trade-offs: managed or self-run vector store, which model per quality, cost and latency measured on their data, caching, and lock-in reduced with a thin gateway and a portable evaluation set. Phase it as proof of concept, pilot and production, say what version one will not do (for example, actions that write to other systems), and say how each phase is judged.",
      },
    ],
    diagram: {
      kind: 'layers',
      layers: [
        { label: "Front end and single sign-on", sub: "who is asking, over a private connection" },
        { label: "Orchestration and output checks", sub: "fixed workflow first, citations, refusals" },
        { label: "Query layer with permission filter", sub: "groups from the identity service, applied at retrieval" },
        { label: "Hybrid index", sub: "keyword plus vector, with access lists as metadata" },
        { label: "Model gateway", sub: "model choice, quotas, fallback, logging" },
        { label: "Ingestion, identity, keys, network, logs", sub: "parsing, private endpoints, customer-managed keys, audit" },
      ],
      caption: "A reference stack from what the user sees down to the platform it runs on. The permission filter sits between the question and the index.",
    },
    example: {
      title: "Example: sizing the first estimate",
      text: "All numbers are example assumptions to show the method, with illustrative prices of $3 per million input tokens and $15 per million output tokens. Replace them with the customer's real figures and show a range, for example half to double.",
      rows: [
        { label: "Daily users and questions", value: "5,000 x 30% = 1,500 users x 6 questions = 9,000 a day" },
        { label: "Busiest hour (20% of the day)", value: "1,800 questions = 30 a minute" },
        { label: "Tokens per question", value: "6,000 in (about 5 passages plus prompt) + 400 out" },
        { label: "Tokens per minute at that peak", value: "30 x 6,400 = 192,000, and 576,000 at a 3x burst" },
        { label: "Cost per question", value: "0.018 + 0.006 = $0.024" },
        { label: "Cost per month (22 working days)", value: "9,000 x 0.024 x 22 = about $4,752" },
      ],
    },
    followUps: [
      {
        q: "Some source systems have no usable access lists. What do you do?",
        a: "Do not guess. Default to deny, ingest only content that can be labelled, or ask the owner to define access first. Also design for permission changes: revoked access should leave the index within an agreed time, and you test it.",
      },
      {
        q: "The CTO asks, why not just fine-tune a model on all our documents instead?",
        a: "Fine-tuning is poor at adding reliable facts that change, cannot show sources, cannot enforce per-user permissions and makes deletion hard. Retrieval comes first, and you fine-tune only for a measured behaviour gap.",
      },
      {
        q: "They want it live in eight weeks. What do you cut?",
        a: "Narrow it to one or two sources and one user group, and defer write actions and extra languages. Keep the security controls and the evaluation, and agree what the first release must prove.",
      },
    ],
    mistakes: [
      "Drawing boxes without asking about data, permissions or volume.",
      "Applying permissions in the prompt, such as only show what the user may see.",
      "Proposing an agent with write access in version one.",
      "Naming no evaluation plan, no capacity plan and no quota lead time.",
    ],
  },

  'sa-multi-cloud-model-choice': {
    short:
      "First challenge the premise: best on whose evaluation, by how much, at what cost and latency? If the gap is inside the noise, stay in Cloud A. Lay out the options (an in-cloud model, a cross-cloud call, the maker's own API, self-hosted open weights, or routing most traffic in Cloud A and only the hard cases out), compare them on data rules, latency, egress, contracts, security review, operations and features, and recommend with conditions and the evidence that would change your mind.",
    explain: [
      {
        heading: "Challenge the premise",
        body: "A single score hides a lot. On the customer's own tasks, how large is the gap, and what is the uncertainty? A model that scores 88% on 300 cases and one that scores 85% have overlapping ranges, so the gap may be luck. Also compare cost and latency, since a model that is slightly better and five times the price may not be best for the customer. Only a gap that is real, large enough to matter and worth the extra risk justifies crossing clouds.",
      },
      {
        heading: "The options and the criteria",
        body: "The options are a good-enough model in Cloud A, a cross-cloud call to Cloud B, the model maker's own API, a self-hosted open-weights model, or routing so most traffic stays in Cloud A and only the hard cases go to the best model. Compare them on data classification and contract limits, the extra network hop and its latency, egress charges (usually small for text), a second security review and a second vendor contract, identity federation and private connectivity across clouds, quota and capacity in each place, and which features (caching, batch, tool use, structured output) exist for each model on each platform. The hidden bill is operations: two sets of identities and permissions, two monitoring and billing paths, and a second place for an incident to start. Existing commitments or discounts with Cloud A may change the price comparison, so check the contract.",
      },
      {
        heading: "Recommend with conditions",
        body: "A good recommendation is conditional: start in Cloud A with the in-cloud model, and move the hardest 10% of cases to the best model only if the measured gain is worth the added risk and cost. State what evidence would change it, such as a larger gap on a bigger test set, or a customer security team that approves the path. Reduce lock-in with a thin model gateway, portable prompts and evaluation sets, and a record of which provider-specific features you use. Model catalogues change quickly, so re-check the recommendation on a schedule.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Model in Cloud A", "Call to Cloud B", "Maker's own API", "Route: hard cases out"],
      rows: [
        { label: "Data path", cells: ["Stays in Cloud A", "Leaves Cloud A", "Leaves to a third party", "Mostly stays, some leaves"] },
        { label: "Latency", cells: ["Lowest", "Extra network hop", "Extra network hop", "Mixed, mostly low"] },
        { label: "New contracts and reviews", cells: ["None", "Second cloud", "A new vendor", "One more path to review"] },
        { label: "Quality on your task", cells: ["Measured, maybe lower", "Measured, maybe higher", "Measured, maybe higher", "Best on the hard cases"] },
        { label: "Operations", cells: ["One cloud", "Two clouds", "Third system", "Gateway and two paths"] },
      ],
      caption: "Four ways to use the model the team liked. Fill the quality row from your own evaluation, not from a leaderboard.",
    },
    example: {
      title: "Example: is 88% really better than 85%?",
      text: "From the follow-up: the best model gets 264 of 300 right and the in-cloud model 255 of 300. The paired figures and the prices are examples, to show the method. A real decision needs the customer's data and the current price lists.",
      rows: [
        { label: "Best model: 264 / 300", value: "88%, 95% range about 83.8% to 91.2%" },
        { label: "In-cloud model: 255 / 300", value: "85%, 95% range about 80.5% to 88.6%" },
        { label: "Paired example: only best right 20, only in-cloud right 11", value: "difference 9 cases, two-sided p about 0.15, so not clear" },
        { label: "Egress, example 20 million calls x 6 KB at $0.09 per GB", value: "120 GB, about $11 a month, so it is not the main cost" },
        { label: "Cost per 1,000 requests (example prices)", value: "in-cloud $4.20, best $21.00, routing 10% to best $5.88" },
      ],
    },
    followUps: [
      {
        q: "The best model scores 88% on 300 cases and the in-cloud model 85%. Is the difference real?",
        a: "There is no clear answer from the totals: 264 of 300 has a range of about 83.8% to 91.2% and 255 of 300 about 80.5% to 88.6%, which overlap a lot. Use a paired comparison on the same cases, a larger or fresh test set, and weigh the cost of being wrong.",
      },
      {
        q: "The customer's cloud team vetoes any cross-cloud traffic. What do you do?",
        a: "Accept the constraint and improve the in-cloud result with prompting, retrieval and, if measured, fine-tuning. State the remaining gap and its effect on the use case.",
      },
      {
        q: "How do you keep the design portable in case the preferred model is withdrawn?",
        a: "Use a gateway interface, test prompts per model, and keep a harness that re-runs the evaluation on any model. Avoid provider-specific features unless the benefit is measured, and keep a fallback model that has already been tested.",
      },
    ],
    mistakes: [
      "Picking the highest score without checking the margin or the cost.",
      "Ignoring the security, network and contract consequences of crossing clouds.",
      "Presenting one recommendation with no conditions and no evidence that would change it.",
      "Building code that depends on one provider's special features without noting it.",
    ],
  },

  'design-card-fraud-detector': {
    short:
      "Choose the operating point from costs and capacity, not accuracy: approving everything is 99.8% accurate and catches nothing. With 20,000 frauds a day, the middle point (75% recall, 0.4% false alarms) costs about $360,000 a day, against $555,000 for a strict point and $369,000 for a loose one. Only 2,400 alerts a day can be reviewed by people, so use tiers (approve, step-up verification, human review), train on time-split data with delayed labels, and launch in shadow before a champion-challenger test.",
    explain: [
      {
        heading: "Pick the operating point from costs",
        body: "A model gives each payment a score, and the operating point is the score above which you flag it. Fraud is 0.2% of 10 million payments, which is 20,000 a day, so approving everything is 99.8% accurate yet misses all of it. Compare three points by total cost: a missed fraud costs $60 and a false alarm $1.50 (example costs). The strict point (55% recall, 0.1% false-positive rate) misses 9,000 and raises 9,980 false alarms. The middle point (75%, 0.4%) misses 5,000 and raises 39,920. The loose point (88%, 1.5%) misses 2,400 and raises 149,700. The middle is cheapest, though the loose one catches the most, and the best point depends on the cost ratio.",
      },
      {
        heading: "Capacity, labels and the model",
        body: "Forty investigators at 60 reviews each can read 2,400 alerts a day, while the middle point flags 54,920, so use tiers: approve low scores, send a middle band to step-up verification (a code to the phone, for example), and send only the top slice to people. Labels are tricky: they arrive late because disputes can take one to three months, they are biased by what the system already flagged, and a payment with no dispute yet is not a true negative. Split by time with a delay before the test window, drop old data because fraud patterns drift, and keep a small controlled exploration. Start with rules plus logistic regression or gradient-boosted trees on tabular features, including per-card, per-device and per-merchant counts over the last minute, hour and day, which need streaming computation.",
      },
      {
        heading: "Serving and monitoring",
        body: "The customer waits, so set a p99 latency budget, fall back to rules and a safe default if the feature store is slow (never fail the payment), define each feature once for training and serving, and log the features used at serving. Launch in shadow mode (score but do not act), then run a champion-challenger test with a holdout. Monitor score drift, the approve, review and decline mix, queue size and daily alert precision, and measure recall and precision on mature labels as disputes arrive. Expect attackers to adapt and keep a fast path to deploy new rules in hours.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "thousand dollars a day",
      items: [
        { label: "Approve everything", value: 1200, note: "20,000 x $60, no alerts" },
        { label: "Strict (55% recall)", value: 555, note: "9,000 missed, 9,980 false alarms" },
        { label: "Middle (75% recall)", value: 360, note: "5,000 missed, 39,920 false alarms", hot: true },
        { label: "Loose (88% recall)", value: 369, note: "2,400 missed, 149,700 false alarms" },
      ],
      caption: "Total daily cost at each operating point, using the question's example costs of $60 per missed fraud and $1.50 per false alarm.",
    },
    example: {
      title: "Example: the full arithmetic at each point",
      text: "10 million payments, 0.2% fraud, so 20,000 fraudulent and 9,980,000 genuine payments. Cost = missed x $60 + false alarms x $1.50, and precision is caught frauds divided by all flags. The costs are the question's examples.",
      rows: [
        { label: "Strict: 55% recall, 0.1% false-positive rate", value: "540,000 + 14,970 = $554,970; precision 52.4%" },
        { label: "Middle: 75% recall, 0.4%", value: "300,000 + 59,880 = $359,880; precision 27.3%" },
        { label: "Loose: 88% recall, 1.5%", value: "144,000 + 224,550 = $368,550; precision 10.5%" },
        { label: "Review capacity", value: "40 x 60 = 2,400 a day, against 54,920 flags at the middle point" },
        { label: "If a miss costs $200", value: "strict $1.81M, middle $1.06M, loose $0.70M, so loose wins" },
      ],
    },
    followUps: [
      {
        q: "A missed fraud now costs $200 instead of $60. Which operating point do you choose?",
        a: "Recompute: strict is about $1.81 million, middle about $1.06 million and loose about $0.70 million, so the loose point is now cheapest. The choice follows the cost ratio, so revisit it when costs change.",
      },
      {
        q: "Fraudsters adapt after a week. What breaks and what do you do?",
        a: "This is concept drift: scores and precision decay as patterns change. Retrain on a schedule or a trigger, monitor on mature labels despite the delay, keep rules deployable in hours, and watch the review queue for new patterns.",
      },
      {
        q: "False declines concentrate in one country. How do you respond?",
        a: "Slice the metrics, look for a data or feature cause, and consider fairness and legal limits on per-group thresholds, which is a question for legal and compliance. Document the trade-off.",
      },
    ],
    mistakes: [
      "Reporting accuracy or AUC as the headline instead of cost at an operating point.",
      "Splitting at random and treating payments with no dispute yet as genuine.",
      "Having no fallback when a dependency such as the feature store is slow.",
      "Assuming investigators can review every alert.",
    ],
  },

  'design-home-feed-ranking': {
    short:
      "Start with the goal and metric (for example retention or satisfied watch time, with guardrails for diversity, creator exposure and harmful content), then do the scale arithmetic: 30 million users x 6 loads is 180 million loads a day, about 2,083 a second and 6,250 at a 3x peak. Build in stages: a popularity baseline, a two-tower candidate generator that cuts 50 million videos to about 1,000, a ranker, and a re-ranker for diversity and freshness, all inside a latency budget with a fallback list. Log every impression with position, split data by time, launch by shadow then A/B test, and monitor drift and diversity.",
    explain: [
      {
        heading: "Metric, scale and data",
        body: "The model comes after the goal. Clicks alone reward attention-grabbing videos, so the primary online metric should be closer to the goal, such as next-month retention or satisfied watch time, with guardrails for diversity, creator exposure and harmful content. Offline you measure recall at k for retrieval and NDCG or AUC for ranking, and you argue how they relate to the online metric. At scale: 30 million x 6 = 180 million loads a day, 180,000,000 / 86,400 = about 2,083 a second on average and 6,250 at a 3x peak. An embedding is a list of numbers describing a video: 50 million videos x 96 numbers x 4 bytes is 19.2 GB as float32, or 4.8 GB as int8.",
      },
      {
        heading: "Labels and the feedback loop",
        body: "Log every impression with the features used at serving time, the position and the outcome. Position matters because the top slots get clicks whatever the quality, so add a position feature and keep some exploration. A video that was shown and not clicked is not a true negative, and a video that was never shown has no label at all. The degenerate feedback loop is the central danger: what the model shows is what gets clicked, so it trains on its own choices and gets narrower. Exploration, diversity rules and a holdout fight it.",
      },
      {
        heading: "Stages, latency and rollout",
        body: "Begin with a heuristic baseline such as recently popular. Candidate generation uses a two-tower model whose item embeddings are precomputed, cutting 50 million videos to about 1,000 (99.998% fewer). A ranker scores those candidates with user, item and context features, and a re-ranking step adds diversity, freshness and rules. For an example 200 ms p99 target: retrieval 30 ms, features 30 ms, ranking 60 ms, re-ranking 20 ms is 140 ms, leaving 60 ms of slack, and if ranking times out you serve a popular or last-good list. Evaluate with a time-based split and by slice (new and returning users, region, creator size), separately for retrieval and ranking. Launch through shadow traffic and an A/B test with guardrails, a pre-set duration, a holdout and rollback criteria, then monitor input and score drift, engagement and diversity, log serving features to catch skew, and set retraining triggers, remembering labels arrive with delay.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'all', label: "50 million videos", sub: "embeddings precomputed" },
        { id: 'cand', label: "Candidate generation", sub: "two-tower model keeps about 1,000" },
        { id: 'rank', label: "Ranker", sub: "scores each candidate, 60 ms" },
        { id: 'rerank', label: "Re-ranker", sub: "diversity, freshness, rules, 20 ms" },
        { id: 'feed', label: "The feed", sub: "fallback list if ranking is late" },
      ],
      highlight: ['cand'],
      caption: "The funnel from the whole catalogue to the page the user sees. Each stage is cheaper per item than the one after it.",
    },
    example: {
      title: "Example: the scale and budget arithmetic",
      text: "From the question: 50 million videos, 30 million daily users, 6 loads each. The ranking cost assumes 1,000 candidates are scored on every load, which is an example choice. The latency numbers are an example budget, not a measurement.",
      rows: [
        { label: "Feed loads a day", value: "30,000,000 x 6 = 180,000,000" },
        { label: "Average and peak requests", value: "180,000,000 / 86,400 = 2,083 a second; x 3 = 6,250" },
        { label: "Embedding table, 96 dimensions", value: "50,000,000 x 96 x 4 bytes = 19.2 GB (4.8 GB as int8)" },
        { label: "Candidates scored per second", value: "2,083 x 1,000 = about 2.1 million; 6.25 million at peak" },
        { label: "Latency budget at p99", value: "30 + 30 + 60 + 20 = 140 ms, with 60 ms of slack in 200 ms" },
      ],
    },
    followUps: [
      {
        q: "New users have no history. What do you serve?",
        a: "A cold-start path: popular and context-based items, some exploration, and signals from onboarding. Precomputed batch results cannot serve them, so you need online scoring or a fallback list.",
      },
      {
        q: "Engagement is up 3% in the A/B test but retention is flat after a month. Why?",
        a: "Engagement is a proxy: novelty, clickbait or a feedback loop can raise it without raising satisfaction. Run the test longer, use a holdout, check guardrails and slices, and optimise a metric closer to the goal.",
      },
      {
        q: "Ranking p99 is 90 ms instead of 60 ms. What do you change?",
        a: "Spend the budget stage by stage: reduce the number of candidates, fetch features in parallel, use a smaller or distilled ranker and cache hot features. Measure the quality cost of each change.",
      },
    ],
    mistakes: [
      "Starting with a deep model before choosing the metric.",
      "Splitting data at random for a problem that is ordered in time.",
      "Having no simple baseline and no fallback when ranking is slow.",
      "Optimising clicks with no guardrails.",
    ],
  },

  'policy-assistant-per-role-access': {
    short:
      "Sync each document's access list from its source system, store it as metadata, and filter retrieval by the signed-in user's identity and groups, so the model never receives a passage the user may not see. Use hybrid search with a reranker, answer only from retrieved passages with citations, prefer the current version by effective date, and say so when nothing relevant is found. Keep permissions fresh, scope caches by who is asking, and test explicitly that no role ever receives another role's content.",
    explain: [
      {
        heading: "Ask first, then ingest with permissions attached",
        body: "Clarify who the users are, the latency target, how fresh answers must be, what a wrong or leaked answer costs, and which sources and languages are in scope. Then ingest each source separately: parse it, chunk it by its structure (headings and sections, not fixed lengths), and attach metadata such as source, version, effective date and owner. Most important, copy each document's access-control list (ACL), the list of who may read it, from the source system. If you cannot get an ACL for a source, treat it as deny by default.",
      },
      {
        heading: "Enforce access at retrieval, never in the prompt",
        body: "Take the user's identity and groups from the sign-in, and apply them as a filter on the search itself, so a manager's compensation guidelines can only be matched for managers. Telling the model to only show what the user may see is not a control: the model has already read the text and can be talked into repeating it. Permissions also change, so sync ACL changes quickly and treat revocation as urgent, with a query-time check against the identity provider for the most sensitive collections. Scope any cache by user or permission set, since a cache keyed by question text alone would hand one person's answer to another.",
      },
      {
        heading: "Answer quality, versions and evaluation",
        body: "Use hybrid search (keyword plus meaning) with a reranker, answer only from the passages found with citations to document and section, and say it does not know when nothing relevant is found. Policies change, so prefer the current one by effective date, show dates in citations, and monitor ingestion failures and document counts with alerts. Log traces with sensitive text redacted for audit. Evaluate retrieval (recall at k), groundedness and citation accuracy per role, plus explicit leakage tests: ask questions as one role that target another role's documents and check that nothing comes back.",
      },
    ],
    diagram: {
      kind: 'experiment',
      slug: 'no-metadata-filters',
      caption: "A toy search index with and without metadata filters. Permission labels work the same way: the filter, not the prompt, keeps other people's pages out.",
    },
    example: {
      title: "Example: sizing the checks and the exposure window",
      text: "Example assumptions: 30,000 documents of about 20 chunks each, and three roles (everyone, manager, HR) where HR content must never reach the other two and manager content must never reach everyone. Counts are example figures to show how to plan tests, not a standard.",
      rows: [
        { label: "Chunks in the index", value: "30,000 x 20 = 600,000, each carrying an ACL" },
        { label: "Questions a day at 2 per employee", value: "5,000 x 2 = 10,000" },
        { label: "Denied role pairs to probe", value: "everyone to manager, everyone to HR, manager to HR = 3" },
        { label: "Leakage probes at 50 questions per pair", value: "3 x 50 = 150, and the pass mark is 0 leaks" },
        { label: "Exposure after losing manager rights, sync every 15 min", value: "up to 15 minutes; seconds with events or a live group check" },
      ],
    },
    followUps: [
      {
        q: "Someone loses manager rights at 10:00. When can they no longer see compensation guidelines, and how do you guarantee it?",
        a: "It depends on the ACL sync: event-driven updates or short intervals, plus a query-time group lookup from the identity provider for sensitive collections. Purge user-scoped caches, and keep a test that checks revocation.",
      },
      {
        q: "Two policies conflict: a regional addendum and the global handbook. What does the assistant say?",
        a: "It retrieves both, ranks by specificity and effective date, and cites both. It states which one applies to the user's region if known, or shows the conflict instead of silently choosing.",
      },
      {
        q: "How would you roll this out, and what would make you pause it?",
        a: "Pilot with one department, with eval gates before launch and monitoring of leakage tests, groundedness, the no-answer rate and user feedback. Pause on any confirmed cross-role leak.",
      },
    ],
    mistakes: [
      "Putting all documents in one index and telling the model which ones the user may see.",
      "Ignoring document versions and ingestion failures, so old or missing policies are cited.",
      "Caching answers by question text alone, ignoring who asked.",
    ],
  },
};
