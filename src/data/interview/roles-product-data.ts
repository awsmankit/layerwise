import type { Question } from './types';

/**
 * Interview questions for three roles: AI product manager, data engineer for AI, and data scientist / analyst.
 * Every worked number in a prompt or a strong point was recomputed in a scratch script; money figures, rates and volumes
 * are labelled as examples and are not benchmarks. Legal and regulatory topics are hedged and are not legal advice.
 */
export const questionsProductData: Question[] = [
  // ---------------------------------------------------------------- AI product manager
  {
    id: 'pm-ai-or-not-expense-categorisation',
    prompt:
      'A finance lead asks you to “add AI” to your expense tool so every receipt is put in a category (travel, meals, software and so on). Nothing is built yet. What do you ask, and how do you decide whether the answer is an LLM, a trained classifier, plain rules or no AI at all?',
    roles: ['ai-pm'],
    level: 'junior',
    kind: 'concept',
    topics: ['product thinking', 'cost', 'baselines', 'evals'],
    minutes: 12,
    strong: [
      'Starts from the user’s job and the cost of being wrong, not from the technology: who uses the category, what a wrong one costs (rework minutes, a failed audit) and who notices.',
      'Asks about volume and variety, and what already exists: how many receipts a month, how many distinct merchants, and whether there is labelled history (past categories chosen by people), which is training data for a cheap classifier.',
      'Builds the simplest baseline first (look up the merchant name, reuse the category last chosen for it) and measures it on real labelled receipts. Anything fancier must beat that number, and the win must show up in numbers, not in a demo.',
      'Climbs a ladder in order: no feature or a person, rules, search, a trained model, one LLM call, an agent. Stops at the lowest rung that meets the bar, and moves up when rules grow into hundreds of special cases.',
      'Compares options on total cost: running cost plus the cost of mistakes plus upkeep (evals, monitoring, prompt changes, retraining). The LLM is the visible price per call; the rest is work for as long as the feature lives.',
      'Notes where an LLM does earn its place here: messy free-text line items, receipts in many languages, and the long tail of odd merchants that rules miss. A hybrid (rules for the obvious 70%, a model for the rest) is common.',
      'Defines before building what a good result looks like (target accuracy per category, a review path for low-confidence cases) and checks privacy early, because receipts can hold names and card fragments.',
    ],
    followUps: [
      {
        q: 'On 5,000 labelled receipts, merchant rules route 78% correctly and an LLM prompt 90%. A wrong category costs about 2 minutes of finance rework, and you see 30,000 receipts a month. Which wins?',
        lookFor: 'Example figures: rules make 22% × 30,000 = 6,600 errors, about 220 hours of rework; the LLM makes 3,000, about 100 hours. That is 120 hours a month saved before adding the model’s running cost and upkeep. It also asks for an interval on the 5,000-case scores, and whether the errors are the costly categories.',
      },
      {
        q: 'Both numbers came from receipts your team picked. What could make the live result worse?',
        lookFor: 'A sample that differs from live traffic (new merchants, other countries, scanned photos), labels that were inconsistent, and drift over time. Sample live receipts, label them, and track accuracy by slice, not one average.',
      },
      {
        q: 'The finance lead says “just use the biggest model so we never have to think about it again.” What do you say?',
        lookFor: 'Bigger is not the same as better for this job; try a cheaper model or a classifier against the same labelled set and compare. Models are retired and change, so “never think again” does not exist; plan evals and a re-check when the model changes.',
      },
    ],
    redFlags: [
      'Starts with “which model should we use” before asking about the job and the cost of a wrong category.',
      'Treats an LLM as free once the demo works, with no counting of mistakes, evals or upkeep.',
      'Never builds a rules or lookup baseline to beat.',
      'Ignores that receipts can contain personal data.',
    ],
    lessons: ['systems/when-not-to-use-an-llm', 'foundations/classical-ml-essentials', 'systems/ux-for-ai-features'],
  },
  {
    id: 'pm-acceptable-error-rate-invoice-extraction',
    prompt:
      'Your team can extract fields from supplier invoices with a model that is 94% correct per invoice (an example figure). You handle 20,000 invoices a day. A wrong invoice that reaches the ledger costs about $12 to fix later (also an example). Manual entry costs $1.50 an invoice with a 2% error rate. How do you decide what error rate is acceptable, and what would you propose to the finance director?',
    roles: ['ai-pm'],
    level: 'mid',
    kind: 'estimation',
    topics: ['error rates', 'cost', 'human-in-the-loop', 'launch gating'],
    minutes: 18,
    strong: [
      'Sets the acceptable error rate from the cost of an escaped error and the current process, not from a round number. The honest baseline is the human rate: 2% of 20,000 is 400 errors a day, so $4,800 a day at $12 each, plus $30,000 of entry cost, about $34,800 a day.',
      'Prices “AI with no review”: model cost at an example $0.03 an invoice is $600, and 6% errors is 1,200 a day, $14,400, so about $15,000 a day. Cheaper, but the escape rate is three times the human rate.',
      'Designs a review path rather than choosing all or nothing. If review targets the 25% of invoices with the lowest confidence (5,000 invoices at an example $0.60 each, $3,000) and those hold 70% of the errors (840 of 1,200), with reviewers catching 90% of them (756), then 444 errors escape: 2.2% of invoices, $5,328, total about $8,928 a day.',
      'Notes that the 2.2% escape rate is slightly above the 2.0% human rate, so “cheaper” is not yet “as safe”. Proposes either widening the review band or checking that errors are lower in severity, and does not hide the gap.',
      'Separates error types: a wrong supplier name is minor, a wrong amount or bank account is severe. Sets a tighter target (or mandatory review) on the severe fields and measures each field, not one overall score.',
      'Requires that the confidence signal is checked on labelled data: errors must cluster in the low-confidence band, or the review budget is wasted. Audits a random slice of the auto-approved pile to estimate what escapes.',
      'Turns it into launch criteria written before the pilot: error rate per field with an interval, escape rate under the human baseline, review load within reviewer capacity, and a rollback rule.',
    ],
    followUps: [
      {
        q: 'The director says 2.2% versus 2.0% is close enough. Do you agree?',
        lookFor: 'Depends on sample size and severity. On a pilot of a few hundred invoices the difference is far inside the noise, so compare with intervals on the same invoices. Weigh the escaped error types, not the headline rate. Does not say yes or no from one number.',
      },
      {
        q: 'Reviewers are slower than assumed and the queue grows. What do you change?',
        lookFor: 'Looks at load (items sent × minutes ÷ reviewer minutes), narrows the band or adds reviewers, sorts by risk and age so nothing waits forever, and alerts on queue age. Does not quietly raise the auto-approve threshold to clear the backlog.',
      },
      {
        q: 'Six months on, a supplier changes its invoice layout and accuracy drops. How would the product have caught it?',
        lookFor: 'Per-field monitoring on sampled, human-checked invoices, input checks (new layouts, missing fields), a spike in low-confidence rate, and an alert on correction rate. Labels arrive late, so use early input signals plus deliberate sampling.',
      },
    ],
    redFlags: [
      'Quotes 94% accuracy as the answer with no cost of an error attached.',
      'Treats all fields and all errors as equal.',
      'Chooses between “full automation” and “manual” with no review band.',
      'Has no baseline for the current human error rate.',
    ],
    lessons: ['systems/human-in-the-loop-design', 'systems/when-not-to-use-an-llm', 'ml/is-the-difference-real'],
  },
  {
    id: 'pm-evals-as-product-requirements',
    prompt:
      'Your engineers say the new contract-summary feature “seems good” after trying 20 examples. You are the product manager and must decide whether it can ship. How do you turn quality into requirements, who owns each part, and what would you do with a result of 186 correct out of 200 against a bar of 90%?',
    roles: ['ai-pm'],
    level: 'mid',
    kind: 'design',
    topics: ['evals', 'requirements', 'launch gating', 'sample size'],
    minutes: 20,
    strong: [
      'Treats the eval as the acceptance test and writes it into the product requirements: the task, the scoring rule, the pass bar per slice, and what a failure looks like to a user. “Seems good on 20 examples” is a demo, not evidence.',
      'Owns the question “what counts as correct”: a rubric agreed with domain experts (for example lawyers or contract managers), with examples of pass, borderline and fail, and two people labelling a sample to check they agree.',
      'Builds the set from real or realistic cases, including the hard and rare ones and the cases where the right answer is “I cannot tell”, and splits it into a development set and a held-out set that engineers do not tune against.',
      'Sets separate bars for what matters most: a wrong party name or a missed termination clause is not the same as a clumsy sentence. Includes cost, latency, refusal and safety checks next to correctness.',
      'Reads 186 of 200 correctly: 93% observed, but a 95% interval is wide, roughly 88.6% to 95.8% (Wilson, an example calculation). The bar of 90% is inside it, so the data does not show the feature clears the bar. Showing a lower bound above 90% at about 93% true quality needs about 280 cases.',
      'Does not average away the slices: a contract type with 12 cases and 70% hides inside a 93% total. Asks for results per slice and flags the slices that are too small to judge.',
      'Makes the eval a living gate, re-run on every model, prompt or retrieval change and fed by production failures, so a green result today is not assumed to hold after a provider update.',
    ],
    followUps: [
      {
        q: 'Engineers want to tune the prompt until the eval reaches 95%. What risk is there, and what do you ask for?',
        lookFor: 'Overfitting to the test set: the score rises because the prompt learned those cases. Ask for a held-out set the team has not seen, a fresh sample from live traffic, and an interval on the final number.',
      },
      {
        q: 'An LLM judge grades the summaries and says 94%. Do you accept that as the bar?',
        lookFor: 'Only after checking the judge against human grades on a sample (agreement, per-class), looking for known biases (length, own-output preference), and keeping a human-labelled core for the high-stakes fields.',
      },
      {
        q: 'The eval says the feature is ready but customer-facing teams are nervous. How do you decide?',
        lookFor: 'Explains the gap: the eval may not reflect real use. Agrees a staged rollout with guardrail metrics, shadow mode or a small cohort, and a rollback rule, rather than overruling either side from opinion.',
      },
    ],
    redFlags: [
      'Accepts a demo or a small hand-picked set as proof of quality.',
      'Reads 93% against a 90% bar as a pass without asking about uncertainty.',
      'Leaves the definition of “correct” to engineers alone.',
      'Has no plan to re-run the eval when the model or prompt changes.',
    ],
    lessons: ['evals/building-an-eval-dataset', 'evals/evals-101', 'ml/is-the-difference-real'],
  },
  {
    id: 'pm-cost-per-resolved-conversation',
    prompt:
      'You are costing an AI support assistant before it launches. An example conversation uses 9,000 input tokens (the history is resent each turn) and 700 output tokens, at example prices of $3 per million input tokens and $15 per million output tokens. You expect 100,000 conversations a month. The assistant resolves 55% without a person, and a human agent costs about $5 per handled conversation. Work out the unit economics, and say which number you are least sure of.',
    roles: ['ai-pm'],
    level: 'mid',
    kind: 'estimation',
    topics: ['cost', 'unit economics', 'support', 'metrics'],
    minutes: 15,
    strong: [
      'Computes the model cost per conversation from tokens: 9,000 × $3 ÷ 1,000,000 = $0.027 input, 700 × $15 ÷ 1,000,000 = $0.0105 output, so $0.0375 a conversation, $3,750 a month at 100,000.',
      'Prices the whole funnel, not only the model: the 45% not resolved still cost the model call plus a human, so the blended cost is $0.0375 + 0.45 × $5 = $2.29 against $5 for all-human, a saving of about $2.71 a conversation, $271,250 a month before fixed costs.',
      'Says the model bill is a small slice (about 1.6% of the blended cost). What moves the economics is the resolution rate and what a wrong “resolved” costs, not the token price.',
      'Counts hidden costs: evaluation and monitoring, prompt upkeep, a review sample, and the cost of failures. If 8% of “resolved” conversations come back as a repeat contact at $5, blended cost rises to about $2.51 and the saving falls to about $249,000 before fixed costs.',
      'Defines the right unit: cost per resolved conversation (not per call) and, better, cost per correctly resolved conversation, since a deflected customer who is not helped is a cost, not a saving.',
      'Names the weakest assumption: the 55% resolution rate, which comes from a forecast and not live data. Shows sensitivity: at 35% the blended cost is about $3.29 and the monthly saving about $171,000. Plans to measure it in a staged pilot.',
      'Covers levers if cost matters: shorter or trimmed history, prompt caching of a stable prefix, a smaller model for easy turns, and limits on steps and tokens, each checked against quality on the eval set.',
    ],
    followUps: [
      {
        q: 'Finance asks for a single “cost per conversation” for the board. What do you give them, and what do you warn them about?',
        lookFor: 'A range and its assumptions: blended cost per conversation with resolution rate, repeat-contact rate and fixed costs shown. Warns that a point estimate before launch is a forecast and quotes the scenarios rather than one figure.',
      },
      {
        q: 'Customer satisfaction drops two points among customers who talked to the assistant. How does that enter the economics?',
        lookFor: 'Treats it as a cost: look at who is affected, repeat contacts and churn, compare with a holdout, and decide whether the saving covers the loss. Does not report savings without the guardrail metric.',
      },
      {
        q: 'The provider cuts its price per token by half. Does the business case change much?',
        lookFor: 'Only a little here, since model cost is a small share ($0.0375 to about $0.019 per conversation against a $5 human cost). Shows the dominant terms are resolution and error cost, and says to still re-evaluate, because a newer or cheaper model changes quality too.',
      },
    ],
    redFlags: [
      'Reports only the token cost and calls it the cost of the feature.',
      'Counts every automated conversation as a saving.',
      'Gives a single confident figure with no sensitivity to the resolution rate.',
      'Forgets fixed costs: evals, monitoring and review.',
    ],
    lessons: ['cost/where-the-tokens-go', 'cost/cost-levers', 'systems/when-not-to-use-an-llm'],
    game: { label: 'Cost Crunch', href: '/play/cost-crunch/' },
  },
  {
    id: 'pm-launch-gates-and-staged-rollout',
    prompt:
      'You are about to launch an AI assistant that drafts replies to customers. Engineering says it is ready. What launch criteria do you set, how do you stage the rollout, and what is your answer when a stakeholder points to “0 failures in our first 100 test cases” as proof it is safe?',
    roles: ['ai-pm'],
    level: 'senior',
    kind: 'design',
    topics: ['launch gating', 'rollout', 'evals', 'reliability'],
    minutes: 25,
    strong: [
      'Writes launch criteria before the data arrives: eval pass bars per slice with intervals, a limit on severe failure types, latency and cost targets, an incident path, and named owners who can say no. Criteria set after seeing results drift towards whatever passed.',
      'Explains the “0 in 100” trap: zero failures in n independent cases only shows the true failure rate is probably below about 3 ÷ n (the rule of three), so 3% at n = 100. To argue a rate under 1% from zero failures needs about 300 clean cases (0.99^299 ≈ 0.05), assuming the cases are independent and representative.',
      'Stages the rollout, each step with an exit rule: internal use, shadow mode (the assistant drafts but nothing is sent), a small cohort with human approval, a wider cohort with sampling, then general availability. Each stage has a minimum sample and a pre-agreed stop.',
      'Picks guardrail metrics alongside the success metric: escalations, complaints, edit rate, reopened tickets, cost per conversation and latency. Compares with a control group, not with last month.',
      'Builds the way out: a kill switch that does not need a deploy, a fallback to the non-AI path, and a rollback of prompts and model versions together. Tests the rollback before launch.',
      'Chooses the human-in-the-loop level by risk: auto-send only for low-risk replies, approve-before-send for anything touching money, legal or health, and audits a random slice of what is auto-approved.',
      'Plans for the long run: the eval re-runs on every model, prompt or provider change, with owners and a monitoring dashboard, so launch is the start of the quality work.',
    ],
    followUps: [
      {
        q: 'In shadow mode, 6% of drafts are judged unacceptable by reviewers. The target was 5%. The team wants to ship anyway and fix it later. What do you do?',
        lookFor: 'Looks at the interval around 6% and the severity mix, not just the number. Either holds the stage or ships with a tighter control (approval for the risky categories) and a dated fix plan. Does not change the bar silently, and records the decision and who made it.',
      },
      {
        q: 'Marketing wants the launch date fixed for a conference. How do you handle that pressure?',
        lookFor: 'Separates a date from a scope: ship a limited, safe version (fewer categories, approval on) by the date. Shows the data behind the gate, offers options with their risk, and keeps the decision with the people accountable for it.',
      },
      {
        q: 'After full launch, how do you know the assistant is still good in three months?',
        lookFor: 'Sampled human review and live metrics by slice, drift in inputs, alerts on guardrail metrics, a regular eval refresh from new failures, and a re-check on every provider or model change.',
      },
    ],
    redFlags: [
      'Treats “no failures in a few dozen tests” as proof of safety.',
      'Launches to everyone at once with no kill switch.',
      'Sets or changes the bar after seeing the result.',
      'Has no comparison group, only before-and-after numbers.',
    ],
    lessons: ['evals/llmops-in-production', 'systems/human-in-the-loop-design', 'evals/building-an-eval-dataset', 'ml/is-the-difference-real'],
    game: { label: 'Incident Room', href: '/play/incident-room/' },
  },
  {
    id: 'pm-ux-for-prefilled-fields-and-uncertain-extraction',
    prompt:
      'Your product reads uploaded onboarding documents and pre-fills a 12-field form that the customer then submits. The model gets each field right 97% of the time (an example figure). Design the experience so people catch the mistakes, and say how you would measure whether the design works.',
    roles: ['ai-pm'],
    level: 'mid',
    kind: 'design',
    topics: ['ux', 'uncertainty', 'human-in-the-loop', 'metrics'],
    minutes: 20,
    strong: [
      'Computes form-level accuracy: 0.97^12 ≈ 69%, so roughly three forms in ten contain at least one wrong field (assuming the fields fail independently). A per-field score that sounds excellent still leaves many forms needing a fix.',
      'Shows the source next to the value: highlight the part of the document each field came from so checking costs seconds. A pre-filled value with no evidence invites rubber-stamping.',
      'Handles uncertainty per field and only where it is calibrated: flags the low-confidence fields with an action (“check against page 2”), because a badly calibrated flag gives false comfort and a generic disclaimer on every form teaches users to ignore it.',
      'Guards against automation bias: people accept what is pre-filled. Does not offer an “accept all” shortcut for high-stakes fields, requires an explicit confirmation on the fields that carry the most risk, and keeps correction cheap (edit in place, undo).',
      'Provides a clear path when the model finds nothing or is unsure: leave the field empty and say why, rather than guessing a plausible value.',
      'Measures what matters: field correction rate and form error rate found by a later audit (not only acceptance rate), time to complete the form, abandonment, and errors that escape to downstream steps. Samples submitted forms for human review to estimate escapes.',
      'Tests the design with a controlled comparison and with people, including a version with deliberately planted wrong values to see how many users catch them, and checks accessibility of the review flow.',
    ],
    followUps: [
      {
        q: 'Acceptance of pre-filled values rises to 96% after a redesign. Is that a success?',
        lookFor: 'Not by itself: users may be checking less. Look at the planted-error catch rate and audited error rate. Acceptance is a sign of use, not of correctness.',
      },
      {
        q: 'Which fields would you never pre-fill, and why?',
        lookFor: 'Fields where a wrong value has a legal or financial effect and where the user is the authority (consent, declarations, bank details), or where the model cannot be checked against a source. Reasoning is by cost of error, not by model accuracy.',
      },
      {
        q: 'Support reports customers saying “the AI got it wrong, so I do not trust the product”. What do you change?',
        lookFor: 'Looks at how errors are shown and fixed, the first-run expectation (“check these fields”), and the error path. Trust comes from findable and fixable mistakes and honest limits more than from higher accuracy alone.',
      },
    ],
    redFlags: [
      'Optimises acceptance rate and calls it quality.',
      'Shows pre-filled values with no source or flag.',
      'Adds a generic “AI can make mistakes” footer and considers the uncertainty handled.',
      'Fills a plausible value when the document has no answer.',
    ],
    lessons: ['systems/ux-for-ai-features', 'systems/human-in-the-loop-design', 'responsible/human-oversight-and-when-ai-should-not-decide'],
  },
  {
    id: 'pm-trust-after-a-viral-wrong-answer',
    prompt:
      'A screenshot of your in-app assistant giving confidently wrong guidance on a refund policy is spreading on social media. Some customers have already acted on it. You are the product manager. Walk through the first 48 hours, and then what you change so it does not repeat.',
    roles: ['ai-pm'],
    level: 'senior',
    kind: 'behavioural',
    topics: ['incident response', 'trust', 'communication', 'reliability'],
    minutes: 20,
    strong: [
      'Starts with scope and harm, not blame: how many conversations gave this answer, who acted on it, what it cost them. Pulls the traces to find the cause (stale policy document, retrieval miss, no source, prompt change) before explaining it to anyone.',
      'Contains first: a narrow, fast action such as turning off the topic, adding a fixed correct answer for that question, or switching the assistant to citing sources only. Uses the kill switch or rollback rather than a hot fix nobody has tested.',
      'Looks after affected customers: identifies them, corrects the guidance directly, and honours reasonable commitments. Works with support and legal on what is owed. Does not give legal conclusions on its own.',
      'Communicates plainly and early: says what happened, who was affected, what has been done and what is next, with a named owner and a time for the next update. Avoids blaming “the AI” as if it were a separate party, since the company shipped it.',
      'Aligns the internal story: one factual timeline shared with engineering, support, legal and communications, so each speaks from the same facts and nobody guesses in public.',
      'Runs a blameless review that finds the system causes: why the eval did not cover refund policy, why there was no citation or abstain path, why the policy source was out of date, and what monitoring would have caught it sooner.',
      'Fixes the system: adds the case and its slice to the eval set, requires grounded answers with a source for policy claims, adds an “I am not sure, let me get a person” path, and sets an alert on complaints and escalations. Tracks follow-up to completion.',
    ],
    followUps: [
      {
        q: 'Leadership asks whether you can guarantee it never happens again. What do you say?',
        lookFor: 'Honest about limits: a model cannot be guaranteed, but the risk can be reduced and its impact bounded (grounding, abstain path, approval on high-stakes topics, monitoring). Offers measurable commitments, not a promise of zero.',
      },
      {
        q: 'Legal wants the topic switched off permanently. Support says that will hurt resolution. How do you decide?',
        lookFor: 'Quantifies both sides (volume of the topic, escalation cost, risk), offers a middle path (source-only answers, a deterministic answer for the refund policy, approval before send), and agrees the criteria under which the topic can return.',
      },
      {
        q: 'How would you rebuild customer trust over the following months?',
        lookFor: 'Visible, honest behaviour: clear labelling and sources, easy escalation to a person, a published fix, and quality data shared internally. Measures trust through behaviour and complaints, not a slogan.',
      },
    ],
    redFlags: [
      'Blames the model or the provider instead of owning the product decision.',
      'Debates the root cause for days before containing the issue.',
      'Makes legal or compensation promises without legal and support involved.',
      'Ends with “we will improve the prompt” and no change to evals or monitoring.',
    ],
    lessons: ['evals/llmops-in-production', 'systems/ux-for-ai-features', 'responsible/running-ai-governance'],
    game: { label: 'Incident Room', href: '/play/incident-room/' },
  },
  {
    id: 'pm-working-with-legal-on-customer-data-in-prompts',
    prompt:
      'Your team wants to send customer support transcripts to a third-party model API to power a summary feature. Legal is uneasy and engineering says “everyone does it”. As the product manager, how do you move this forward, and what questions do you bring to the conversation? (This is a process question, not a request for legal advice.)',
    roles: ['ai-pm'],
    level: 'mid',
    kind: 'behavioural',
    topics: ['privacy', 'regulation', 'communication', 'governance'],
    minutes: 15,
    strong: [
      'Treats legal as a partner who owns the decision on legal questions, and brings facts: what data fields go to the model, where it is processed, who the provider is, what contract terms apply on retention and training use, and the purpose.',
      'Asks the data-minimisation question first: does the feature need the whole transcript? Often the last messages, with names, emails and card details redacted before sending, are enough. Measures the redaction recall on a labelled sample, since detectors miss things.',
      'Separates the risks: personal data going to a vendor, the vendor retaining or training on it, the output containing personal data, and what users were told. Checks the provider’s current terms and options (such as zero-retention or regional processing) rather than assuming them.',
      'Offers options with trade-offs instead of a yes or no: redact and send, a region-restricted deployment, a self-hosted model for the sensitive tier, or a limited launch to customers who have opted in. Each is priced in cost, quality and delay.',
      'Documents the decision: purpose, data flow, retention, access, who approved, and a review date. Aligns with the organisation’s governance or risk process and the rules that apply to its customers and region, which differ and should be checked with legal.',
      'Sets engineering requirements from the outcome: logging that does not store raw transcripts, deletion that reaches caches, logs and indexes, an access model, and a test that a planted fake personal detail does not leak.',
      'Keeps the conversation useful under pressure: agrees a timeline, escalates disagreements to the accountable owner instead of working around legal, and does not ship a pilot with real data “just to try”.',
    ],
    followUps: [
      {
        q: 'Engineering offers to use real transcripts in a quick pilot, “just internally”. What is your response?',
        lookFor: 'Internal use of real customer data is still processing under the same rules. Suggests synthetic or redacted data for the pilot and getting the data flow approved first.',
      },
      {
        q: 'Legal approves the vendor but the contract says nothing about model training on your data. What do you do?',
        lookFor: 'Takes it back to legal and procurement to settle in writing, using the provider’s current documentation, and does not assume. Holds sensitive data back until it is settled.',
      },
      {
        q: 'A customer asks for their data to be deleted. Where might it still exist in your AI feature?',
        lookFor: 'Prompts and logs, caches, traces, a vector index, analytics, evaluation sets, backups, and possibly the provider’s retention. Deletion is a product requirement with owners, not a database delete.',
      },
    ],
    redFlags: [
      'Treats legal as an obstacle to route around.',
      'Says “everyone does it” as the argument.',
      'Cannot say what data is sent, to whom and under what terms.',
      'Has no plan for deletion requests or retention.',
    ],
    lessons: ['responsible/privacy-engineering-for-ai', 'responsible/running-ai-governance', 'evals/eu-ai-act-for-engineers'],
  },
  {
    id: 'pm-saying-no-to-ai-everywhere-roadmap',
    prompt:
      'Your executive team returns from a conference and asks for “an AI feature in every product area this quarter”. Engineering is stretched and there are no agreed measures of success. How do you respond, and how do you decide what to build first?',
    roles: ['ai-pm'],
    level: 'senior',
    kind: 'behavioural',
    topics: ['prioritisation', 'stakeholders', 'product thinking', 'roadmap'],
    minutes: 20,
    strong: [
      'Takes the goal behind the request seriously (growth, cost, competitive worry) and turns “an AI feature everywhere” into outcomes: which user problem, which metric, by when. Does not say no flatly or yes to everything.',
      'Scores each idea on value if right, cost if wrong, data and eval readiness, and effort. Asks whether AI is the right tool at all, and picks the lowest rung of the ladder that meets the bar.',
      'Uses readiness to separate ideas: can we write down what correct looks like and test it? Ideas with a clear task, available data and a cheap check go first; vague “assistant for everything” ideas wait for a definition.',
      'Makes the demo-to-production gap visible: a prototype works on chosen cases, while production needs evals, monitoring, privacy review, fallbacks, ongoing model upkeep and support. Shows the real cost per idea.',
      'Proposes a small number of bets (one or two) with success metrics, a staged rollout and exit rules, and a visible list of what is not being done and why. Offers a date to revisit.',
      'Shares evidence as it arrives, so leaders see results rather than slides: pilot numbers with intervals, user feedback, cost per task, and what was learned.',
      'Protects the team and the users: says what the team cannot do safely in the time, and offers options such as scope, date or resources, rather than absorbing the overload and shipping risk.',
    ],
    followUps: [
      {
        q: 'Three ideas are on the table: a reply drafter for support (high volume, low stakes), a contract reviewer (low volume, high stakes), and a sales email writer (unclear metric). Which goes first, and why?',
        lookFor: 'With example figures, value can be similar: 40,000 tickets × 2 minutes saved × 60% adoption is 800 hours a month; 300 contracts × 45 minutes saved is 225 hours but at a higher hourly value and cost of error. Picks the drafter first because the task is clear, the cost of an error is low with a human sending, and it is easy to measure; the contract reviewer needs a stronger review design; the email writer needs a metric first.',
      },
      {
        q: 'An executive overrules you and wants the contract reviewer first. What now?',
        lookFor: 'Does not sabotage or silently comply. Restates the risks and the conditions for a safe version (human decision, narrow scope, eval bar), documents the decision, and builds the safeguards in. Escalates only on real risk to users.',
      },
      {
        q: 'Six weeks later the first bet shows weak numbers. How do you report it?',
        lookFor: 'Reports plainly with data and intervals, says what was learned, and proposes continue, change or stop according to the exit rule agreed in advance. Treats a stop as a good outcome when the evidence says so.',
      },
    ],
    redFlags: [
      'Agrees to everything and lets the team carry the risk.',
      'Rejects the request without engaging with the goal behind it.',
      'Ranks ideas by excitement and not by evaluability and cost of error.',
      'Reports a demo as if it were a production result.',
    ],
    lessons: ['systems/when-not-to-use-an-llm', 'systems/llm-app-system-design', 'evals/evals-101'],
  },
  {
    id: 'pm-pricing-ai-seat-heavy-user-tail',
    prompt:
      'You plan to sell an AI writing assistant at $20 per user per month. Each task costs about $0.15 in model usage (an example figure). Light users run about 20 tasks a month, but the top 5% of users run about 800. Work out the margin, show who pays for whom, and say what you would change in the pricing or the product.',
    roles: ['ai-pm'],
    level: 'senior',
    kind: 'estimation',
    topics: ['pricing', 'unit economics', 'cost', 'product thinking'],
    minutes: 15,
    strong: [
      'Computes average usage: 0.95 × 20 + 0.05 × 800 = 59 tasks a user, so 59 × $0.15 = $8.85 in model cost and a gross margin of $11.15 on $20, about 55.8% (before support, hosting and evals).',
      'Shows the split: a light user costs $3 and leaves $17; a heavy user costs 800 × $0.15 = $120 and loses $100. For 10,000 users, 500 heavy users lose $50,000 while 9,500 light users bring $161,500, net $111,500 on $200,000.',
      'Explains that the average hides the tail: the 5% who use the most are 68% of the usage (40 of 59 tasks) but pay the same, and are probably the most engaged. A cheap model price or a good average can mask a margin problem.',
      'Offers levers and their side effects: a fair-use cap or credits (a cap at 300 tasks lowers average usage to 34 tasks, cost $5.10 and margin 74.5%, but frustrates the best users), a higher tier or usage-based add-on, routing easy tasks to a cheaper model, caching, and shorter outputs. Notes that behaviour changes when the price changes.',
      'Checks quality against cost: any cheaper route (smaller model, shorter context) must be tested on the eval set, since savings that lower quality lose users.',
      'Notes that the price per token can change and models are retired, so the margin is a moving figure. Re-computes with measured usage once real data exists, and models a range of cost per task rather than one number.',
      'Considers the value and the competition: willingness to pay, what a heavy user gets, and whether outcome- or usage-based pricing fits the buyer.',
    ],
    followUps: [
      {
        q: 'The model price per task falls by half. Do you cut prices or keep the margin?',
        lookFor: 'Depends on competition, value and elasticity, not on cost alone. The heavy-user loss falls from $100 to $40 a user at half the cost, but the tail still needs handling. Re-runs the numbers and tests the price change rather than assuming.',
      },
      {
        q: 'Usage data shows the heavy users are your best advocates. Does that change your plan?',
        lookFor: 'Weighs the cost of capping them against the loss of advocacy: a higher tier priced for them, or a soft limit with an upgrade path, over a hard cap that upsets them. Verifies with data on retention and referrals.',
      },
      {
        q: 'How would you measure the real cost per task in production, not from a spreadsheet?',
        lookFor: 'Logs token usage per request and per feature (the usage field), includes retries and agent steps and cached versus uncached tokens, and joins cost to user and task type. Looks at the tail and the distribution, not only the mean.',
      },
    ],
    redFlags: [
      'Prices from the average user and never looks at the distribution.',
      'Assumes usage will not change after the price or the cap changes.',
      'Ignores fixed costs such as evals, support and monitoring.',
      'Cuts cost with a cheaper model and never re-checks quality.',
    ],
    lessons: ['cost/where-the-tokens-go', 'cost/cost-levers', 'local/self-hosting-vs-api-economics'],
    game: { label: 'Cost Crunch', href: '/play/cost-crunch/' },
  },
  {
    id: 'pm-success-metrics-for-meeting-summaries',
    prompt:
      'You own a new feature that writes a summary of every meeting and lists action items. What would you track to know whether it works? Give a primary metric, supporting metrics and guardrails, and explain why the share of summaries people copy is not enough.',
    roles: ['ai-pm'],
    level: 'junior',
    kind: 'concept',
    topics: ['metrics', 'product thinking', 'ux', 'evals'],
    minutes: 12,
    strong: [
      'Starts from the user’s job: people want to know what was decided and what they must do without re-reading or re-watching the meeting. The primary metric should reflect that job (for example, action items completed without follow-up questions), not model-centred numbers.',
      'Uses supporting metrics for diagnosis: how often the summary is opened, edited, shared or regenerated, and how much of it is edited before use, which separates “used as written” from “used as a starting point”.',
      'Explains why acceptance or copy rate is not enough: people may copy without checking, a high rate can hide wrong action items, and it says nothing about what the summary missed. Pairs it with sampled human review of accepted summaries to count errors that escaped.',
      'Defines quality on the content: are decisions and owners correct, is anything invented, is anything important missing. Writes a short rubric, labels a sample, and measures it over time and by meeting type.',
      'Sets guardrails: factual error rate, cost per summary, latency, privacy complaints and opt-outs, since a feature that is popular and wrong, or costly, is not a success.',
      'Compares with a baseline: users with and without the feature, or against a simple approach such as the meeting agenda and the chat export. Notes that a novelty bump early on fades.',
      'Reads the numbers with sample sizes and intervals, and separates leading signals (edits, regenerations) from lagging outcomes (completed tasks, retention).',
    ],
    followUps: [
      {
        q: 'Copy rate is 80% but a spot check finds 1 in 8 summaries has a wrong owner on an action item. What do you do?',
        lookFor: 'Treats the error as the headline: 1 in 8 is 12.5%, with an interval from a small audit. Adds an owner-accuracy metric, shows the source line, and prioritises the fix over growth.',
      },
      {
        q: 'Which metrics would you refuse to put on a team’s goals, and why?',
        lookFor: 'Metrics easy to game or disconnected from value, such as raw usage or copy rate alone. Names what they would do to the product if optimised (summaries that are longer and more confident, not more correct).',
      },
      {
        q: 'How do you get a baseline before launch?',
        lookFor: 'Measures the current behaviour (time to find decisions, follow-up questions), labels a sample of real meetings by hand, and runs a small pilot with a control group.',
      },
    ],
    redFlags: [
      'Picks only usage or acceptance numbers.',
      'Has no way to detect wrong or invented content.',
      'Names metrics with no baseline or comparison group.',
      'Treats a drop in edits as automatically good.',
    ],
    lessons: ['systems/ux-for-ai-features', 'evals/evals-101', 'systems/human-in-the-loop-design'],
  },
  {
    id: 'pm-explain-different-answers-and-hallucination-to-stakeholders',
    prompt:
      'A senior stakeholder asks: “Why does the assistant give a different answer to the same question on two days, and why does it sometimes make things up? Fix it.” Explain it in plain terms, say what can and cannot be fixed, and say what you will do about it as the product manager.',
    roles: ['ai-pm'],
    level: 'junior',
    kind: 'concept',
    topics: ['product thinking', 'hallucination', 'communication', 'reliability'],
    minutes: 10,
    strong: [
      'Explains in plain words that a language model predicts the next word from patterns, with some chosen randomness, so it can word things differently each time and can produce fluent text that is wrong. It is not looking up facts unless the product gives it a source.',
      'Separates the causes of a changed answer: sampling randomness, different context or retrieved documents, a changed prompt, or a changed model version. Lowering the randomness makes answers more repeatable, but not guaranteed identical, and a repeatable answer can still be wrong.',
      'Explains “making things up” (hallucination) as a property to manage and not a bug to remove: it is more likely when the answer is not in the provided material or the question is unusual. It is reduced by grounding the answer in sources, asking the model to say when it does not know, and checking.',
      'States what the product will do: ground answers in approved documents with citations, allow “I do not know” and a hand-off to a person, test on a set of real questions, and monitor errors after launch.',
      'Sets expectations honestly: gives a measured error rate on the test set and where it is worse, rather than “it will be fixed” or “it is a black box”.',
      'Decides by stakes: low-risk drafts can show variation; policy, money and safety answers need fixed approved text or a human check.',
    ],
    followUps: [
      {
        q: 'The stakeholder says: “So set the randomness to zero and it will be correct.” Respond.',
        lookFor: 'Zero randomness makes output more repeatable, but not guaranteed identical (batching, floating-point order and model updates still matter), and says nothing about correctness. The same wrong answer every time is worse.',
      },
      {
        q: 'How would you show them that things are improving?',
        lookFor: 'A fixed test set of real questions, scored the same way after each change, with the error rate by topic and an interval, plus examples of cases fixed. Not anecdotes or one demo.',
      },
      {
        q: 'For which questions would you not let the model answer freely at all?',
        lookFor: 'Questions with legal, financial or safety consequences, or exact figures and policies, where an approved text, a lookup or a person is the better tool, and the model only routes or phrases.',
      },
    ],
    redFlags: [
      'Promises that hallucinations will be eliminated.',
      'Says temperature zero makes the output correct.',
      'Uses jargon with a non-technical audience and no example.',
      'Treats the model as a database of facts.',
    ],
    lessons: ['evals/why-models-make-things-up', 'start/using-ai-without-getting-burned', 'evals/guardrails-in-practice'],
  },
  {
    id: 'pm-prioritise-three-ai-bets-by-value-and-evaluability',
    prompt:
      'You have capacity for one AI project this half. Candidates: (A) a reply drafter for 40,000 support tickets a month, (B) a contract-clause reviewer for about 300 contracts a month, (C) a sales-email personaliser for 5,000 emails a month with no agreed success metric. Estimate the value of each with the example figures you choose, and say how you would choose.',
    roles: ['ai-pm'],
    level: 'mid',
    kind: 'design',
    topics: ['prioritisation', 'product thinking', 'cost', 'evals'],
    minutes: 18,
    strong: [
      'Estimates time saved with stated assumptions: A: 40,000 tickets × 2 minutes saved × 60% adoption is 48,000 minutes, 800 hours a month, about $24,000 at an example $30 an hour. B: 300 contracts × 45 minutes saved is 225 hours, about $27,000 at an example $120 an hour. C: 5,000 emails × 3 minutes is 250 hours, about $10,000 at $40, with the effect on sales unknown.',
      'Notes that the values are the same order of size, so value alone does not pick the winner. What separates the ideas is cost of being wrong, how clearly “correct” can be defined, data and the ability to test it, and effort.',
      'Scores A as a good first bet: high volume, a draft that a person reads and sends, a clear task and plenty of past tickets for an eval set. Errors are caught by the human before they matter.',
      'Treats B as valuable but harder: a missed clause is costly, review must be designed with lawyers, and the eval set takes expert time. Proposes it as a second bet with a human-decision design, narrow scope and a strict bar.',
      'Treats C as not ready: without a success metric it cannot be tested, and the benefit may be small or negative if emails feel generic. Defines a metric and a test first, or declines.',
      'Includes cost beyond model usage in the choice: evals, monitoring, privacy review, support and upkeep, and compares with simpler options (templates, search, rules) for each idea.',
      'Plans the bet with a pilot, a measurable bar, an exit rule and a date to review, and records the ideas not chosen and why.',
    ],
    followUps: [
      {
        q: 'The adoption rate for A is a guess of 60%. How much does it matter, and how would you find out?',
        lookFor: 'Value scales linearly: at 40% it is about 533 hours, at 80% about 1,067. Measures adoption in a small pilot, looks at who uses it and why not, and treats it as the main risk to the estimate.',
      },
      {
        q: 'Sales leadership strongly prefers C. How do you handle that?',
        lookFor: 'Takes the goal seriously, proposes the metric and experiment that would make C testable, offers a small pilot with a control group, and sequences it. Does not dismiss it without data.',
      },
      {
        q: 'Midway through A, the eval shows 15% of drafts are unusable. Continue, change or stop?',
        lookFor: 'Looks at the interval and the type of failure, compares with the exit rule agreed at the start, and checks whether unusable drafts cost more time than they save. Acts on the criteria, not on sunk cost.',
      },
    ],
    redFlags: [
      'Ranks by value alone and ignores the cost of errors and testability.',
      'Accepts an idea with no way to measure success.',
      'Treats adoption as certain.',
      'Never considers a simpler non-AI option.',
    ],
    lessons: ['systems/when-not-to-use-an-llm', 'evals/building-an-eval-dataset', 'cost/where-the-tokens-go'],
  },

  // ---------------------------------------------------------------- Data engineer for AI
  {
    id: 'de-batch-or-streaming-for-rag-freshness',
    prompt:
      'You are building ingestion for a RAG assistant over three sources: a policy wiki edited a few hundred times a day, a ticket system adding about 200,000 tickets a day, and a contracts store that rarely changes. Choose batch, micro-batch or streaming for each, say what freshness you would promise, and explain how you keep cost and complexity honest.',
    roles: ['data-eng'],
    level: 'mid',
    kind: 'design',
    topics: ['rag', 'streaming', 'batch', 'data pipelines'],
    minutes: 20,
    strong: [
      'Derives freshness from the user’s need and the cost of staleness, not from what is technically possible: a wrong answer about a policy that changed this morning is costly, so minutes; tickets might be fine within an hour; contracts nightly.',
      'Computes worst-case staleness as the interval plus processing and indexing time: a 15-minute micro-batch that takes up to 5 minutes to parse, embed and index can serve data up to 20 minutes old.',
      'Sizes the load before choosing the tool: 200,000 tickets a day is about 2.3 a second on average (200,000 ÷ 86,400). Even at 10 times that at peak, around 23 a second, volume alone does not demand a streaming platform; a small scheduled job may do.',
      'Reduces work by detecting change: a modified timestamp, an ETag or a change data capture feed, plus a content hash, so unchanged documents are not parsed and embedded again, which also saves embedding cost.',
      'Makes writes idempotent with stable IDs (document ID plus chunk position plus content hash) so a retry or replay upserts, never duplicates, and propagates deletes and permission changes, which need a faster path than content edits.',
      'Handles the awkward cases: coalesces a document edited 50 times in 10 minutes into one update, respects embedding rate limits with a queue, retries with backoff, and sends repeated failures to a dead-letter store with the reason.',
      'Measures freshness as a metric: the age of the newest indexed item per source against the source of truth, alerted against the promise. Shows “last updated” in answers where it matters.',
      'Chooses the simplest option that meets the promise per source, and says streaming costs more to build, operate and debug, so it must earn its place.',
    ],
    followUps: [
      {
        q: 'The embedding API starts rejecting requests for 40 minutes. What happens to your pipeline and your freshness promise?',
        lookFor: 'Items queue and retry with backoff; the freshness metric rises and alerts; the index keeps serving older data rather than failing; replay from the queue when the API returns. Considers a fallback or a second provider only if the promise needs it.',
      },
      {
        q: 'A user is removed from a group at 10:00 and should lose access to documents indexed from that group’s folder. How quickly does your design reflect that?',
        lookFor: 'Permissions are separate from content: read access from the source of truth at query time or sync access control lists on a short interval. A nightly batch is not enough for a revocation.',
      },
      {
        q: 'How would you prove to the business that the answers reflect last week’s policy change?',
        lookFor: 'A canary document with a known edit is injected and checked end to end, freshness lag per source is graphed, and answers show document version or date. The test runs continuously, not once.',
      },
    ],
    redFlags: [
      'Picks streaming for everything because it sounds modern.',
      'Cannot say how stale the index can be, or how it would know.',
      'Re-embeds the whole corpus on every run.',
      'Treats permission changes the same as content changes.',
    ],
    lessons: ['systems/data-pipelines-and-data-quality', 'systems/batch-vs-online-inference-and-feature-stores', 'rag-agents/chunking-and-retrieval-quality'],
  },
  {
    id: 'de-reembed-index-when-the-embedding-model-changes',
    prompt:
      'You run a vector index of 50 million chunks (about 350 tokens each, 1,024-dimension float32 vectors). The embedding provider announces it will retire your model in 90 days. Plan the migration: what is the cost and the time at an example $0.02 per million tokens and 2,000 chunks a second, how much storage do you need, and how do you cut over without an outage or a quality regression?',
    roles: ['data-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['vector search', 'rag', 'embeddings', 'data pipelines'],
    minutes: 25,
    strong: [
      'Explains why vectors from two embedding models cannot be mixed: each model has its own space (and often its own dimension), so distances between old and new vectors are meaningless. The whole corpus must be re-embedded, not just new content.',
      'Computes the job: 50,000,000 × 350 = 17.5 billion tokens, which at an example $0.02 per million is $350; at 2,000 chunks a second that is 25,000 seconds, about 6.9 hours of continuous work, longer with retries and rate limits.',
      'Computes storage: 50,000,000 × 1,024 × 4 bytes = 204.8 GB per copy before index overhead, so running old and new side by side needs about 410 GB. Notes that quantised or smaller-dimension options reduce this but must be checked for quality.',
      'Builds the new index next to the old (blue and green): dual-write fresh changes to both, backfill history in checkpointed, idempotent batches, then compare before switching traffic with an alias or flag.',
      'Gates the cut-over on a retrieval eval run against both indexes (recall at k, MRR, filtered queries with real access filters), by slice, because a better benchmark score does not guarantee better results on your documents.',
      'Stores with every vector the embedding model name, version, dimension and chunking parameters, plus the chunk text hash, so a future change is a query, not archaeology. Keeps parsed text, so re-embedding does not require re-parsing.',
      'Plans rollback and clean-up: keep the old index for an agreed window, shift traffic gradually while watching quality and latency, then delete it. Checks that deletions made during the migration reached both.',
      'Starts early because of the deadline: 90 days is a risk if the backfill needs quota the provider will not grant quickly, so request quota and rehearse on a sample first.',
    ],
    followUps: [
      {
        q: 'The new model scores better on a public benchmark but 3 points worse recall at 5 on your internal eval. What do you do?',
        lookFor: 'Trusts the eval that reflects your data, but checks its size and slices (an interval around 3 points). Looks at which queries lost, and tests tuning chunk size, hybrid search or a reranker before choosing. The choice is made with data and recorded.',
      },
      {
        q: 'Midway through, a user asks to delete their documents. What goes wrong if you are not careful?',
        lookFor: 'The deletion reaches the old index but not the half-built new one, so the data comes back after cut-over. Writes of deletions go to both, and the backfill checks a tombstone list before inserting.',
      },
      {
        q: 'How would you reduce cost and time if the corpus were 20 times larger?',
        lookFor: 'Skip duplicates and unchanged chunks, embed in large batches in parallel within quota, prioritise the most-queried content first, and consider a smaller dimension or quantised vectors if quality holds. Re-checks every shortcut on the eval.',
      },
    ],
    redFlags: [
      'Plans to re-embed only new documents and keep the old vectors.',
      'Switches traffic with no evaluation on the new index.',
      'Does not store which model produced each vector.',
      'Overwrites the old index in place with no rollback.',
    ],
    lessons: ['rag-agents/vector-search-and-retrieval-metrics', 'rag-agents/chunking-and-retrieval-quality', 'foundations/tokens-and-embeddings', 'systems/data-pipelines-and-data-quality'],
  },
  {
    id: 'de-code-dedupe-exact-and-near-duplicates',
    prompt:
      'Write a function dedupe(docs, threshold) that removes exact and near-duplicate documents from a list of texts before they go into a training set or a search index. Then explain how you would run it on 10 million documents, and how you would decide the threshold.',
    roles: ['data-eng'],
    level: 'mid',
    kind: 'coding',
    topics: ['deduplication', 'python', 'data quality', 'rag'],
    minutes: 25,
    strong: [
      'Normalises first (lower-case, collapse whitespace, strip boilerplate such as footers) and removes exact duplicates cheaply by hashing the normalised text (for example SHA-256) into a set, keeping the first or best-quality copy deterministically.',
      'Defines near-duplicates with set similarity: split into word shingles (say 3 words), then Jaccard similarity is the shared shingles over all distinct shingles. For “the cat sat on the mat” and the same text plus “today”, 4 shingles are shared out of 5, so 0.8.',
      'Notes that the threshold interacts with length: one extra word on a 14-word text gives 12 shared of 13, about 0.92, while on a short text the same edit scores lower. Handles texts too short to shingle by falling back to exact match.',
      'Says the all-pairs approach does not scale: 10 million documents make about 5 × 10^13 pairs. Uses MinHash signatures and locality-sensitive hashing so only likely pairs are compared.',
      'Gives the banding arithmetic: with 100 hash values split into 20 bands of 5, a pair with Jaccard s becomes a candidate with probability 1 − (1 − s^5)^20, about 0.6% at 0.2, 47% at 0.5 and 99.96% at 0.8. Then verifies candidates with the exact Jaccard score so false candidates are dropped.',
      'Groups matches into clusters (union-find or connected components), keeps one canonical document per cluster, and records the cluster ID and removed IDs for lineage and for deletion requests.',
      'Explains why it matters: duplicates skew training towards repeated text, raise memorisation risk, fill the top results of a search with copies, and, when copies sit on both sides of a train and test split, inflate the test score.',
      'Tests it: plant known duplicates and near-duplicates, check recall and precision at the chosen threshold, and check the result does not depend on input order.',
    ],
    followUps: [
      {
        q: 'Two price lists differ in one number, 100 became 1,000, and score 0.92. Should they be merged?',
        lookFor: 'Not automatically. High similarity is not equivalence: meaning can change in a few tokens. Keep the newest by version metadata, or compare key fields, and choose by use case rather than only by threshold.',
      },
      {
        q: 'How do you choose the threshold?',
        lookFor: 'Label a sample of candidate pairs as same or different, plot precision and recall by threshold, and pick for the cost of each mistake. Re-check per document type, since lengths and boilerplate differ.',
      },
      {
        q: 'You dedupe the training set after splitting. What can still go wrong?',
        lookFor: 'Near-duplicates across the split leak test content into training. Deduplicate before splitting, or remove from train anything similar to a test document.',
      },
    ],
    redFlags: [
      'Compares every pair of documents.',
      'Only removes exact matches and calls it deduplication.',
      'Uses Python’s built-in hash for stored fingerprints (it is randomised per process).',
      'Picks the threshold by feel and never measures it.',
    ],
    lessons: ['systems/data-pipelines-and-data-quality', 'rag-agents/chunking-and-retrieval-quality', 'responsible/privacy-engineering-for-ai'],
  },
  {
    id: 'de-green-pipeline-null-spike-schema-drift',
    prompt:
      'On Monday the nightly features job finished green, but the share of nulls in the plan_type column jumped from 0.3% to 38% and the model score distribution moved. Nobody on your team changed any code. How do you investigate, what do you do right now, and what do you put in place so it does not recur?',
    roles: ['data-eng'],
    level: 'junior',
    kind: 'debugging',
    topics: ['schema drift', 'data quality', 'monitoring', 'data contracts'],
    minutes: 15,
    strong: [
      'Points out that a green job only means the code ran, not that the data is right. The failure is silent because no rule checked the content.',
      'Looks for what changed upstream first: a renamed or retyped column, a new category value, a changed unit, a producer release. Compares a sample of yesterday’s and today’s raw rows, and breaks the nulls down by source, partition and value.',
      'Finds the likely mechanism by looking at the raw values of the null rows: for example a new plan name that the mapping does not know, so it becomes null, or a column renamed so a join no longer matches.',
      'Contains the damage now: stop publishing the affected table or feature, keep serving the last good version, and mark the affected days so the broken values are not used for training (served data often becomes tomorrow’s training data).',
      'Repairs deterministically: fix the mapping or the column name, backfill the affected partitions, and check row counts and null rates against the baseline afterwards.',
      'Adds checks at the boundary: expected columns and types, allowed values (with a counter for unknown ones), null-rate and distribution checks against a baseline, and row counts. Plants a fault on purpose to confirm each check fires.',
      'Moves the check upstream with a data contract: schema, meaning of fields, allowed values and a change notice, so the producer learns they broke a consumer before the consumer does.',
    ],
    followUps: [
      {
        q: 'Would a drop in model accuracy have caught this?',
        lookFor: 'Late and weakly: labels arrive after a delay and accuracy is an average, so a fault in a slice can hide for days. Input checks fire first; accuracy confirms later.',
      },
      {
        q: 'The producer says they never promised column names. What is your response?',
        lookFor: 'Agree a contract with owners and a change process; until then, validate on arrival and quarantine failures so the producer’s change cannot silently break consumers.',
      },
      {
        q: 'Your new null-rate alert fires every few days on harmless noise. How do you tune it?',
        lookFor: 'Set the threshold from observed variation (a few standard errors or a percentage over a same-weekday baseline), alert on size of change that matters to the model, include context in the alert, and review false alarms regularly.',
      },
    ],
    redFlags: [
      'Assumes the pipeline is fine because the job succeeded.',
      'Fills the nulls with a default and moves on without finding the cause.',
      'Relies on a model metric to detect data faults.',
      'Drops the bad rows silently with no record.',
    ],
    lessons: ['systems/data-pipelines-and-data-quality', 'systems/monitoring-and-drift', 'ml/getting-data-ready'],
  },
  {
    id: 'de-pii-handling-in-training-and-rag-pipelines',
    prompt:
      'Your pipeline ingests a million support records a day for both fine-tuning and a RAG index. About 2% contain personal data such as names, emails and phone numbers. Design how you detect, remove and track it, and say what you do when the detector is not perfect. (This is an engineering question, not legal advice.)',
    roles: ['data-eng'],
    level: 'mid',
    kind: 'design',
    topics: ['privacy', 'pii', 'data pipelines', 'governance'],
    minutes: 20,
    strong: [
      'Treats personal data as a lifecycle: collect less, detect, redact, limit retention, control access and be able to delete. Starts by asking whether the use case needs the personal fields at all.',
      'Detects with several methods: patterns for emails, phone and card numbers, plus a named-entity model for names and places. Measures recall and precision on a hand-labelled sample, because a detector is a model that misses things.',
      'Does the arithmetic of misses: 2% of 1,000,000 is 20,000 records with personal data; at 95% recall about 1,000 records slip through each day, at 99% about 200. Whether that is acceptable depends on the data’s sensitivity and the destination.',
      'Redacts before the data reaches logs, vector indexes, training sets and any third-party API, using typed placeholders such as [PERSON_1], and stores any restore mapping separately with its own access control.',
      'Uses defence in depth for the misses: sensitivity tiers, limited access, short retention on raw data, sampling audits of the “clean” output, and tests with planted fake identifiers to confirm they never appear downstream.',
      'Makes deletion possible by design: stable record and person keys, lineage from raw records to derived tables, embeddings, caches, eval sets and training snapshots, and a process that reaches each. Keeps data that may need deletion out of model weights where possible, since removing it from a trained model is hard.',
      'Notes that pseudonymised data can still be personal data when it can be re-linked, and that rules and purposes differ by region and contract, so checks with privacy and legal staff belong in the process.',
    ],
    followUps: [
      {
        q: 'A user asks for deletion. List where their data may still exist.',
        lookFor: 'Raw store, staged and derived tables, feature tables, vector index and its metadata, caches, logs and traces, evaluation sets, training snapshots, backups, and any model trained on it. Says which are deleted at once and which on a schedule.',
      },
      {
        q: 'The detector misses names written in lower case in chat messages. How do you find and fix that?',
        lookFor: 'Sample outputs and audit by hand, add that slice to the labelled set, improve or add rules, re-measure recall, and keep the audit running. Treats detector quality as ongoing evaluation.',
      },
      {
        q: 'Should the fine-tuning data keep real names to help the model with customer-name tasks?',
        lookFor: 'Generally no: use placeholders or synthetic names; keeping real names raises memorisation and deletion risk without needing them for the task. If it is truly needed, justify it, restrict it, and test for extraction.',
      },
    ],
    redFlags: [
      'Assumes the detector is perfect, or never measures it.',
      'Redacts only the model prompt, while logs and indexes keep raw text.',
      'Has no way to find where one person’s data lives.',
      'Puts personal data into training data without asking whether it is needed.',
    ],
    lessons: ['responsible/privacy-engineering-for-ai', 'systems/data-pipelines-and-data-quality', 'rag-agents/reading-real-documents'],
  },
  {
    id: 'de-idempotent-backfill-540-days',
    prompt:
      'A bug has made a revenue feature wrong for the last 540 days. You must recompute it for all history and refresh downstream training sets while the daily pipeline keeps running. Each daily partition takes about 25 minutes on one worker, and you may use 12 workers (example figures). Design the backfill and estimate how long it takes.',
    roles: ['data-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['backfill', 'idempotency', 'data pipelines', 'reliability'],
    minutes: 25,
    strong: [
      'Computes the work: 540 × 25 minutes is 13,500 minutes, 225 worker hours; with 12 workers in parallel about 1,125 minutes, 18.75 hours of wall-clock time at best. Adds margin for retries, throttling and source limits, and tests the estimate on a week first.',
      'Makes each partition task idempotent: it computes a given date from the same inputs and replaces that partition atomically (write to a temporary location, then swap), so a re-run gives the same result and never appends duplicates.',
      'Checks dependencies between days: if the feature uses running totals or yesterday’s value, partitions are not independent, so the order or the parallelism is limited, or the recurrence is re-expressed as a window over raw data.',
      'Keeps consumers safe: writes to a new versioned table and switches readers once validated, so a model or dashboard sees the old or the new data and never a mix. Pauses or isolates the daily job’s writes to the same partitions.',
      'Validates before switching: compare row counts and checksums by partition, diff old against new on a sample, and quantify how much the values changed, since that tells you which models and reports are affected.',
      'Confirms the source still holds 540 days of raw data and records which late corrections apply, deciding whether to recompute from what was known then or from corrected data.',
      'Checkpoints progress so a failure on day 311 resumes there, throttles to avoid starving production jobs and respecting quotas, and logs a run ID per partition for lineage.',
      'Follows through downstream: lists the training sets and models built on the wrong values (lineage), retrains where the change matters, and tells consumers what changed and when.',
    ],
    followUps: [
      {
        q: 'Partition 311 fails and the rest succeed. How do you make sure the final table is complete and correct?',
        lookFor: 'A manifest of partitions with status, row counts and checksums, a re-run of only the failed partition, and a completeness check before the swap. Never declares success from the job exit code alone.',
      },
      {
        q: 'The feature depends on a 90-day rolling sum. What does that do to the plan?',
        lookFor: 'Each partition needs the previous 90 days of inputs, so reads grow and the first 90 days need earlier raw data. Express it as a windowed computation over raw events, which can still run in parallel because each day reads its own window.',
      },
      {
        q: 'A production model was trained on the wrong values. How do you decide whether to retrain?',
        lookFor: 'Measure: retrain a candidate on corrected data and compare on a frozen test set, and look at the size of the value change on training rows. Retrain if the effect is material or the corrected data is cheap to use; record the decision.',
      },
    ],
    redFlags: [
      'Appends the new values on top of the old partitions.',
      'Runs the backfill straight into the table that consumers read.',
      'Estimates time without considering retries or limits.',
      'Never checks which models were trained on the bad values.',
    ],
    lessons: ['systems/data-pipelines-and-data-quality', 'systems/batch-vs-online-inference-and-feature-stores', 'systems/from-notebook-to-production'],
  },
  {
    id: 'de-labelling-pipeline-throughput-and-quality',
    prompt:
      'You must get 24,000 support messages labelled for a classifier. A label takes about 2.5 minutes, and you want 15% of items labelled by two people to measure agreement. Estimate the effort, then design the pipeline so the labels are trustworthy and versioned. Say where a model could help and where it could hurt.',
    roles: ['data-eng', 'data-scientist'],
    level: 'mid',
    kind: 'design',
    topics: ['labelling', 'data quality', 'evals', 'data pipelines'],
    minutes: 20,
    strong: [
      'Estimates effort: 24,000 × 2.5 minutes is 1,000 hours; double-labelling 15% (3,600 items) adds 150 hours; if 15% of those disagree (540 items) at 5 minutes each to adjudicate, 45 hours more. Total about 1,195 hours, roughly four weeks for ten labellers at 30 hours a week (example figures).',
      'Writes guidelines with examples, including the borderline cases, before labelling starts, versions them, and records the guideline version beside every label.',
      'Builds the parts: an item queue with assignment, a labelling tool, a label store that keeps who, when and which guideline, and a path for questions and edge cases that updates the guideline.',
      'Measures quality three ways: planted gold items with known answers to check each labeller, overlap items to compute agreement (Cohen’s kappa, which discounts agreement expected by chance), and adjudication of disagreements by a senior person. Reads the disagreements to improve the guideline, then relabels.',
      'Chooses what to label on purpose: a random sample for an unbiased evaluation set, and uncertainty-based or active selection for training, but never evaluates on the actively selected items.',
      'Uses a model carefully: pre-labels can speed work, but people anchor on suggestions, and a model grading itself measures agreement with itself. Scores any model labeller against a human gold sample per class (raw agreement hides rare classes) and re-checks when the model version changes.',
      'Protects data and people: redacts personal data before items reach labellers, limits access, and rotates hard or distressing content with support.',
    ],
    followUps: [
      {
        q: 'Two labellers agree on 80% of items. Is that good enough?',
        lookFor: 'Not by itself: chance agreement depends on class balance (if each marks 30% as urgent, chance gives 58% agreement), so compute kappa, about 0.52 here. Look at per-class disagreement and the guideline before relabelling.',
      },
      {
        q: 'Halfway through, the product team changes the definition of “urgent”. What happens to the labels you have?',
        lookFor: 'Version the guideline, decide which items need relabelling, keep the old labels with their version, and do not mix definitions silently in one training set.',
      },
      {
        q: 'An LLM could pre-label everything for a tenth of the cost. How do you decide whether to use it?',
        lookFor: 'Label a gold sample by hand (200 or more items), score the model per class, keep humans on uncertain or disagreeing items, and check terms and privacy before sending text to an outside API. Treat a published result for one model and task as a reason to test, not a guarantee.',
      },
    ],
    redFlags: [
      'Has no way to measure label quality, only label counts.',
      'Evaluates a model on labels the same model produced.',
      'Changes the labelling rules with no versioning.',
      'Sends raw personal data to labellers or to an outside model without checking.',
    ],
    lessons: ['systems/data-pipelines-and-data-quality', 'evals/building-an-eval-dataset', 'ml/getting-data-ready'],
  },
  {
    id: 'de-lineage-walk-after-a-corrupted-partner-feed',
    prompt:
      'You discover that a partner feed delivered corrupted prices for three days last month. Since then the data has flowed through several tables, a feature store, two training sets and one model that is now in production. How do you find everything that was touched, decide what to rebuild, and make sure it does not happen silently again?',
    roles: ['data-eng'],
    level: 'senior',
    kind: 'debugging',
    topics: ['lineage', 'data quality', 'incident response', 'mlops'],
    minutes: 25,
    strong: [
      'Uses lineage as a graph of datasets, jobs and runs: starts at the three corrupted partitions and walks downstream through every job run that read them, by run and partition, so the scope is the three days and what depends on them, not “everything”.',
      'Lists the affected assets: derived tables and partitions, feature values, training sets built after that date, the models trained on those sets, and the model versions and predictions served in the window.',
      'Quantifies the impact before acting: what share of each training set came from the bad days, in which slices, and how far values were off, so the response fits the size of the problem.',
      'Contains and repairs: quarantine the corrupted raw partitions with a reason, get a corrected feed or exclude the days, rebuild affected derived partitions through an idempotent backfill, and keep the raw data immutable so reprocessing is possible.',
      'Decides on the model with evidence: retrain a candidate on corrected data and compare on a frozen test set, then promote or keep, with a rollback ready. Records the dataset versions used by each model in the registry.',
      'Handles online effects: from logged feature values, finds the decisions made in the window (for example prices shown) and gives the owners the list so they can decide on follow-up.',
      'Prevents a repeat: checks on arrival (schema, range, distribution, volume and freshness), a data contract with the partner, alerts to a named owner, and an incident note with the lineage gap that made the search slow.',
    ],
    followUps: [
      {
        q: 'You have no lineage tool. How do you reconstruct the picture?',
        lookFor: 'Reads job definitions and schedules, query logs and table histories, searches code for the source table, and builds the graph by hand for this incident. Then records the result and adopts a standard such as OpenLineage so the next search is a query.',
      },
      {
        q: 'Only 4% of the training rows came from the corrupted days. Do you retrain?',
        lookFor: 'Not automatically; measure. A small share can still matter if it falls in a slice that matters or the errors are large. Compare candidate models on a frozen test set, check the slices, and keep the decision and its evidence.',
      },
      {
        q: 'The partner insists nothing changed on their side. How do you proceed?',
        lookFor: 'Presents the evidence (the affected rows and values, with timestamps and checks), asks for their release and job logs, and focuses on a contract and a validation step regardless of blame.',
      },
    ],
    redFlags: [
      'Retrains and redeploys immediately with no measurement.',
      'Cannot say which models or datasets read the bad partitions.',
      'Deletes the corrupted raw data instead of quarantining it.',
      'Fixes this feed and adds no checks.',
    ],
    lessons: ['systems/data-pipelines-and-data-quality', 'systems/from-notebook-to-production', 'systems/monitoring-and-drift'],
  },
  {
    id: 'de-row-count-check-that-fires-every-sunday',
    prompt:
      'A volume check alerts when today’s row count is less than 50% of yesterday’s. It fires every Sunday and nobody trusts it any more. The last eight Sundays averaged 61,000 rows with a standard deviation near 3,000, and Saturdays about 130,000. This Sunday the table has 36,500 rows. Explain the false alarms, say whether this Sunday is a real fault, and redesign the check.',
    roles: ['data-eng'],
    level: 'junior',
    kind: 'estimation',
    topics: ['data quality', 'monitoring', 'thresholds', 'data pipelines'],
    minutes: 12,
    strong: [
      'Explains the false alarm: the check compares each day with the day before, and Sunday’s usual 61,000 is only about 47% of Saturday’s 130,000 (61,000 ÷ 130,000), below the 50% line, so a normal weekly pattern looks like a fault.',
      'Compares like with like: the baseline is the same weekday over recent weeks (the last eight Sundays), so the weekly cycle is part of what “normal” means. Holidays and known events are handled with a calendar.',
      'Judges this Sunday: 36,500 is 24,500 below the 61,000 average, about 8.2 standard deviations (24,500 ÷ 3,000) and about 40% down. That is far outside normal variation, so it is a real fault to investigate, and the new rule must catch it.',
      'Sets the rule from the data: alert beyond a chosen number of standard deviations (or a percentage band) of the same-weekday baseline, and tunes it by counting false alarms and missed faults on past data. For small counts, normal noise grows like the square root of the count, so a table of 100 rows needs a wider band than one of 100,000.',
      'Checks both directions, since a sudden spike can mean a duplicated batch, and adds a freshness check (the newest timestamp), because a stalled feed can keep an old count.',
      'Writes an alert people can act on: expected range, observed value, the table and owner, a link to a sample, and a severity. Alerts that fire without cause teach people to ignore them.',
      'Proves the check works by planting a fault on purpose, and decides what the pipeline does on failure: stop downstream jobs, keep serving the last good data and quarantine the batch.',
    ],
    followUps: [
      {
        q: 'On Black Friday the count doubles and the check fires. What do you do?',
        lookFor: 'Add known events to the calendar or use a wider band on flagged days, and keep an eye on the lift being plausible; do not disable the check. A holiday-aware baseline reduces noise without hiding faults.',
      },
      {
        q: 'The check passes but the model gets worse. What other checks would you add?',
        lookFor: 'Distribution and schema checks (value ranges, category mix, null rates), duplicates, and freshness. Volume only sees how many rows, not what is in them.',
      },
      {
        q: 'How would you decide the threshold for hundreds of tables without hand-tuning each?',
        lookFor: 'Compute baselines automatically from history per table and weekday, start with a default band, tier tables by importance, and review alerts weekly to adjust bands. Keeps owner feedback in the loop.',
      },
    ],
    redFlags: [
      'Keeps a check that cries wolf every week.',
      'Compares with yesterday and ignores the weekly cycle.',
      'Turns the alert off instead of fixing its baseline.',
      'Has no one named to act on an alert.',
    ],
    lessons: ['systems/data-pipelines-and-data-quality', 'systems/monitoring-and-drift', 'ml/anomaly-detection'],
  },
  {
    id: 'de-late-events-watermarks-and-streaming-features',
    prompt:
      'You compute a feature such as “purchases in the last 10 minutes” from a stream of events for a fraud model. Phones send events late when they are offline, and some events arrive twice. Explain event time versus processing time, what a watermark is, how you decide how long to wait, and why the way you handle lateness can make training and serving disagree.',
    roles: ['data-eng'],
    level: 'senior',
    kind: 'concept',
    topics: ['streaming', 'feature stores', 'data pipelines', 'training-serving skew'],
    minutes: 20,
    strong: [
      'Defines event time (when it happened) and processing time (when the system saw it). Windows should be on event time, otherwise a delay in the network changes what counts as “the last 10 minutes”.',
      'Defines a watermark as the system’s estimate that no events older than some time will still arrive, so a window can be closed and its result emitted. Waiting longer gives completeness; waiting less gives lower latency, and the right setting is a product decision.',
      'Sets the wait from the measured lateness distribution (for example, if 99% of events arrive within 10 minutes, a 10-minute allowance covers 99%), not a guess, and monitors lateness percentiles over time.',
      'Says what happens to events later than the watermark: drop them with a counter, route them to a side output, or correct the result later with a batch reconciliation. If 1% of 5 million events an hour are later than the watermark, that is 50,000 events an hour that the live feature missed.',
      'Handles duplicates: at-least-once delivery means retries produce repeats, so each event carries a unique ID and the job deduplicates within a bounded window. Notes that exactly-once claims depend on the whole pipeline, including the sink.',
      'Explains the skew: training features are usually built later from complete data, so they include late events, while the live feature missed them. The model then sees different values in production than it trained on. Fixes include logging the live feature values for training, or replaying the same streaming logic over history.',
      'Notes that a fraud use case may choose to act on partial data quickly and update the feature as late events arrive, and that the choice should be tested against what the model needs.',
    ],
    followUps: [
      {
        q: 'Some fraud-relevant events arrive two hours late. Do you raise the watermark to two hours?',
        lookFor: 'Not for every feature: that delays all results. Keep a short watermark for the live feature and add a slower correction path for late data, or a second feature that reflects it. Decide from the cost of delay versus the cost of missed events.',
      },
      {
        q: 'You find the live feature is on average 2% lower than the training one. How do you confirm lateness is the cause?',
        lookFor: 'Log live feature values and compare example by example with the recomputed value, split by event lateness; check the share of events beyond the watermark. Also checks code and unit differences.',
      },
      {
        q: 'Why not just process events as they arrive, in order, and avoid watermarks?',
        lookFor: 'Arrival order is not event order; without event-time handling the windows depend on network behaviour and results change between runs. Watermarks make the trade-off explicit.',
      },
    ],
    redFlags: [
      'Windows on processing time and does not see the problem.',
      'Picks a watermark with no data on lateness.',
      'Assumes the stream has no duplicates.',
      'Does not notice that training and serving see different data.',
    ],
    lessons: ['systems/batch-vs-online-inference-and-feature-stores', 'systems/data-pipelines-and-data-quality', 'systems/monitoring-and-drift'],
  },
  {
    id: 'de-rag-ingestion-stable-ids-acls-and-deletes',
    prompt:
      'Design the ingestion pipeline for a RAG system over company PDFs, wiki pages and slide decks. It must respect who can read what, handle edits and deletions, and be safe to re-run. What do you store with each chunk, and how do you make updates idempotent?',
    roles: ['data-eng'],
    level: 'mid',
    kind: 'design',
    topics: ['rag', 'data pipelines', 'idempotency', 'security'],
    minutes: 22,
    strong: [
      'Lays out the stages: connectors read sources, a parser extracts text and structure (OCR where needed, tables handled on purpose), cleaning, chunking, embedding, and an upsert into the index, with each stage able to fail and retry on its own.',
      'Gives each chunk a stable ID built from the document ID, position and a content hash, so re-running the same document upserts the same records instead of adding duplicates, and unchanged chunks need no new embedding.',
      'Handles edits by replacing the whole set of chunks for a document version (delete the old ones, insert the new, or swap by version tag), so stale chunks from a longer previous version never remain. Propagates deletions with tombstones.',
      'Stores metadata that retrieval and audits need: source and URL, document version, page or section, ingest time, parser and chunker versions, language, and the access list (groups or tenant). Keeps this out of the text sent to the model unless it is useful there.',
      'Enforces permissions at retrieval using the source system’s access list, syncs permission changes on a short cycle (revocations cannot wait for a nightly job), and tests filtered search for recall because strict filters can hide good results.',
      'Quarantines failures with the reason (a scanned page with no text, a corrupt file) instead of dropping them, and tests the parsing step itself on a sample, since many retrieval failures start with bad extraction, not with the model.',
      'Keeps the originals and the parsed text so a change to parser, chunker or embedding model can be re-run without re-fetching, and monitors documents ingested, failure rate, chunks per document and freshness lag.',
    ],
    followUps: [
      {
        q: 'A user is removed from the finance group. How fast should they lose access to finance documents in the assistant, and how do you build that?',
        lookFor: 'As fast as the source system’s change, which in practice means a short sync interval or a query-time check against the source of truth. A prompt instruction is not access control.',
      },
      {
        q: 'The same slide deck lives in five folders. What happens in your index?',
        lookFor: 'Five copies of every chunk fill the top results and can differ in access. Deduplicate by content hash while keeping each location’s access list, and cite one canonical source.',
      },
      {
        q: 'A table in a PDF is read as a jumble of numbers. How do you find that and fix it?',
        lookFor: 'Parsing evals on a sample of documents with tables, a layout-aware parser or table extraction, and keeping the page image or a table-as-text representation. Measure retrieval on questions that need the table.',
      },
    ],
    redFlags: [
      'Appends chunks on every run with no stable IDs.',
      'Leaves old chunks of an edited document in the index.',
      'Filters by permission only in the prompt.',
      'Never examines what the parser actually produced.',
    ],
    lessons: ['rag-agents/reading-real-documents', 'rag-agents/chunking-and-retrieval-quality', 'rag-agents/vector-search-and-retrieval-metrics'],
  },
  {
    id: 'de-parquet-and-date-partitions-for-a-2tb-table',
    prompt:
      'A teammate keeps a 2 TB training table as CSV files, and every query scans all of it. You propose Parquet with date partitions. Explain why that helps, estimate how much data a query reads when it needs 3 of 40 columns for 7 days of a 365-day year, and say what can go wrong.',
    roles: ['data-eng'],
    level: 'junior',
    kind: 'estimation',
    topics: ['data formats', 'storage', 'data pipelines', 'cost'],
    minutes: 12,
    strong: [
      'Explains that Parquet stores data by column, so a query reading 3 columns reads only those, and each column compresses well because similar values are stored together. CSV is row-based text with no types, so the whole row must be read.',
      'Explains partitioning by date into folders: a filter on the date lets the engine skip whole folders it does not need (partition pruning), and Parquet row-group statistics (minimum and maximum) let it skip blocks inside a file.',
      'Estimates the read: 3 of 40 columns is 7.5% of the data if columns are equal in size, and 7 of 365 days is about 1.9% of partitions, so the query touches about 0.14% of 2 TB, around 2.9 GB. Says this is a rough model: real columns differ in size, and compression and encodings change the file sizes, so measure it.',
      'Names the pitfalls: many tiny files make listing and opening slow (compact them into larger files, guided by the engine’s documentation), too many partitions (partitioning by a high-cardinality column such as user ID) creates the same problem, and partitions should match how queries filter.',
      'Notes that Parquet carries a schema and types, so it avoids the CSV problems of delimiters, newlines in text, and a number read as a string. Schema changes still need care when files of different versions are mixed.',
      'Mentions table formats built on top (for example Iceberg or Delta) that add transactions, schema evolution and time travel, which help with safe updates and reproducible training sets.',
    ],
    followUps: [
      {
        q: 'A streaming job writes a new file every few seconds into the daily partition. What happens to read performance and what do you do?',
        lookFor: 'Thousands of tiny files slow queries and strain the metadata layer. Batch the writes, run a compaction job that merges them into larger files, and consider a table format that handles it.',
      },
      {
        q: 'Your analysts mostly filter by customer ID, not date. Is date partitioning still right?',
        lookFor: 'Partition by what queries filter on, but avoid very high cardinality. Consider partitioning by date and sorting or bucketing by customer ID, or clustering, and check against real query patterns.',
      },
      {
        q: 'How would you check that the conversion did not change the data?',
        lookFor: 'Compare row counts, column types, null counts, and checksums or aggregates per partition between CSV and Parquet, and diff a random sample. Be careful with timestamps, number precision and text encoding.',
      },
    ],
    redFlags: [
      'Says Parquet is “just compressed CSV”.',
      'Partitions by a column with millions of values.',
      'Does not check the converted data against the original.',
      'Quotes the 2.9 GB estimate as exact.',
    ],
    lessons: ['systems/data-pipelines-and-data-quality', 'ml/getting-data-ready', 'systems/from-notebook-to-production'],
  },
  {
    id: 'de-reproducible-datasets-and-stable-splits',
    prompt:
      'Your training table grows every night. Last month’s model scored 0.91 and this month’s scores 0.88, and nobody can say whether the data, the split or the code changed. Design how you version training datasets and how you assign rows to train and test, so results are comparable and reproducible.',
    roles: ['data-eng'],
    level: 'mid',
    kind: 'design',
    topics: ['reproducibility', 'data versioning', 'leakage', 'mlops'],
    minutes: 20,
    strong: [
      'Freezes each training set as an immutable snapshot (or a table-format version with time travel) with a manifest: source tables and their versions, the query or code commit, the time range, row counts and checksums, and the feature definitions used.',
      'Assigns rows to splits by a deterministic function of a stable key, for example hash(customer_id) mod 100 below 80 is train, so the same customer always lands on the same side as data grows. A random split per run would move rows between train and test and make scores incomparable.',
      'Uses a stable hash such as SHA-256, not a language’s built-in hash: Python’s string hash is randomised per process, so a split built on it changes between runs.',
      'Splits by the entity that can leak, not by row: all rows of one customer, patient or document group go to the same side, otherwise the model is tested on people it trained on. For forecasting or anything with time, holds out the most recent period instead.',
      'Keeps the test set frozen between model versions so scores can be compared, refreshes it deliberately on a schedule with a new name, and removes near-duplicates across the split.',
      'Records the dataset version, split rule, code commit and settings in the model registry entry for each run, so “reproduce last month’s model” is a lookup and a re-run.',
      'Diagnoses the 0.91 to 0.88 drop by diffing the two dataset versions (schema, row counts, label rate, feature distributions) and by scoring both models on the same frozen test set, which separates a data change from a model change.',
      'Notes the tension with deletion requests: an immutable snapshot may hold data that must be removed, so plan retention and rebuild rules with privacy staff.',
    ],
    followUps: [
      {
        q: 'A customer appears in 40 rows. You split by row. What is wrong?',
        lookFor: 'Rows of the same customer land in train and test, so the model can recognise the customer and the score is inflated. Split by customer, and check that no key appears on both sides.',
      },
      {
        q: 'The test set has been frozen for a year and the product has changed. What do you do?',
        lookFor: 'A frozen set protects comparability but ages. Add a fresh set sampled from recent data, keep the old one for trend, and report both. Does not quietly swap the test set and compare to old numbers.',
      },
      {
        q: 'How would you prove that two runs used identical data?',
        lookFor: 'Compare snapshot IDs and checksums in the manifest, row counts and a hash of the sorted keys per split, and record them with the run. Equal scores do not prove equal data.',
      },
    ],
    redFlags: [
      'Re-splits at random every run and compares the scores.',
      'Builds the split on a hash function that changes between processes.',
      'Cannot say which data a past model was trained on.',
      'Lets the same entity appear on both sides of the split.',
    ],
    lessons: ['systems/from-notebook-to-production', 'systems/data-pipelines-and-data-quality', 'foundations/classical-ml-essentials'],
  },

  // ---------------------------------------------------------------- Data scientist / analyst
  {
    id: 'ds-frame-the-churn-request-before-modelling',
    prompt:
      'A product manager tells you: “Build me a churn model.” You have access to the data warehouse and a month. What do you do before you open a notebook, and what do you bring back to agree?',
    roles: ['data-scientist'],
    level: 'junior',
    kind: 'behavioural',
    topics: ['problem framing', 'metrics', 'classical ml', 'stakeholders'],
    minutes: 15,
    strong: [
      'Starts with the decision: what action will be taken, for whom, by when, and at what cost per customer (a discount, a call, an email). A prediction that no one acts on has no value.',
      'Defines churn precisely and in writing: cancelled, or no purchase in 90 days; for which customers (only active ones); and the date on which the prediction is made, with the horizon (will they churn in the next 30 days).',
      'Builds the label and the features around that date: features only from before it, labels only from after it, so the model is not told the answer. Plans a time-based split so the test mimics future use.',
      'Picks a metric tied to the decision. If the team can contact 5,000 customers a month, the useful numbers are precision and the share of churners captured in the top 5,000, and the net value per contact, not overall accuracy.',
      'Asks whether prediction is the right question: knowing who will leave is not the same as knowing who can be saved. If the aim is to change behaviour, a randomised test of the offer (and perhaps an uplift model later) matters.',
      'Proposes a baseline before any model: a rule such as “no login in 30 days” or last quarter’s churners, and judges the model by how much better it is on the same split.',
      'Checks feasibility and risk early: data available at the prediction date, label delay, privacy and fairness concerns (an offer that excludes a group), and who owns the result after hand-over.',
      'Brings back a one-page plan: the decision, the definitions, the success measure and baseline, the timeline and what would make them stop, and gets it agreed before modelling.',
    ],
    followUps: [
      {
        q: 'About 3% of customers churn each quarter. A model that predicts “no one churns” is right 97% of the time. What do you report instead?',
        lookFor: 'Precision and recall at the contact budget, lift over the base rate, and a comparison with the baseline rule. Overall accuracy is meaningless when one class is rare.',
      },
      {
        q: 'The PM says the definition does not matter, “just predict who is unhappy”. How do you respond?',
        lookFor: 'Explains that a vague target cannot be built or tested, and offers two or three concrete definitions with the action each would drive. Gets one chosen, and records it.',
      },
      {
        q: 'Midway, you find that customers who contact support are far more likely to churn. Is that a good feature?',
        lookFor: 'Check when the contact happens relative to the prediction date; a cancellation call logged as a support contact is leakage. Also asks what action it supports. A strong signal can be a symptom, not a cause.',
      },
    ],
    redFlags: [
      'Starts with data exploration and model choice and never asks about the decision.',
      'Leaves “churn” undefined or changes the definition midway.',
      'Judges the model by accuracy on an imbalanced label.',
      'Uses features that are not available at the time of prediction.',
    ],
    lessons: ['foundations/classical-ml-essentials', 'ml/getting-data-ready', 'ml/linear-and-logistic-regression'],
  },
  {
    id: 'ds-first-hour-of-exploratory-analysis',
    prompt:
      'You receive a new table of 200,000 rows with a target column and 50 features, and no documentation. Describe the first hour of your exploratory analysis. What are you looking for, and which results would make you stop and ask someone a question?',
    roles: ['data-scientist'],
    level: 'junior',
    kind: 'concept',
    topics: ['eda', 'data quality', 'leakage', 'classical ml'],
    minutes: 12,
    strong: [
      'Sets aside a test split before exploring in depth (by time or group where relevant), so decisions made while looking do not leak into the evaluation.',
      'Checks the structure: rows and columns, the key and whether it is unique, types and units (dates stored as text, prices in different currencies), duplicates, and the time range and any gaps.',
      'Looks at missing values by column and by pattern, and asks whether missing means “not applicable”, “not collected” or “unknown”, since missing is often informative and imputing blindly hides it.',
      'Looks at distributions and ranges with context: impossible values (negative ages), pile-ups at defaults (a date of 1970-01-01 or a value of -1), and outliers, which are checked and explained before any are removed.',
      'Looks at the target: its balance, how it changes over time and across groups, and how it was defined and recorded. A label that changed definition midway needs to be known early.',
      'Looks at each feature against the target, but treats a suspiciously strong single feature (for example one column alone gives near-perfect separation) as a leakage candidate: asks when it is recorded relative to the outcome.',
      'Writes down assumptions and surprises as they go, and lists questions for the data owner: what each column means, when it is populated, what changed and when.',
      'Stops and asks when the label is ambiguous, a key column is populated after the outcome, or the sample clearly differs from the population the model will serve.',
    ],
    followUps: [
      {
        q: 'One feature on its own separates the classes almost perfectly (AUC 0.98). What now?',
        lookFor: 'Suspect leakage: find how and when the column is created, check whether it exists at prediction time, and compare with and without it. A real feature that strong would be a surprise worth explaining before celebrating.',
      },
      {
        q: '12% of income values are missing. Do you impute with the median?',
        lookFor: 'First ask why missing and whether it relates to the target. Consider a missing flag, impute inside the training fold only, and compare with simpler handling. Notes the effect on the distribution and checks the result is not driven by the imputation.',
      },
      {
        q: 'You find that 3% of rows have order values 50 times the median. Do you delete them?',
        lookFor: 'Investigate: data error, unit mix-up, or real large customers. Fix errors, keep real values, and consider robust methods or a flag. Decide by the use of the model, record the choice and compare results with and without.',
      },
    ],
    redFlags: [
      'Fits a model in the first hour and looks at nothing else.',
      'Explores the whole dataset including the test portion.',
      'Deletes outliers or fills missing values without finding out why.',
      'Celebrates a feature that is almost too good.',
    ],
    lessons: ['ml/getting-data-ready', 'foundations/classical-ml-essentials', 'systems/data-pipelines-and-data-quality'],
  },
  {
    id: 'ds-survivorship-bias-in-customer-tenure',
    prompt:
      'Marketing says “our customers stay 5.5 years on average”, taken from the table of currently active customers. You check one sign-up cohort of 1,000 people: 500 left within a year (average stay 0.5 years), 300 left after about 2 years, and 200 are still active with 5.5 years each. Is the claim right? What would you report instead?',
    roles: ['data-scientist'],
    level: 'junior',
    kind: 'concept',
    topics: ['bias', 'statistics', 'metrics', 'communication'],
    minutes: 12,
    strong: [
      'Names the problem: survivorship bias. The active table contains only the people who stayed, so the average is taken from the longest stayers and tells you nothing about the people who left.',
      'Computes the cohort figure: (500 × 0.5 + 300 × 2 + 200 × 5.5) ÷ 1,000 = (250 + 600 + 1,100) ÷ 1,000 = 1.95 years of observed tenure, against 5.5 for the survivors alone.',
      'Notes the active customers are still counting: their tenure is cut off (censored) at today, so even 1.95 understates the final average stay. A mean needs a method that handles censoring, such as a survival or retention curve (Kaplan-Meier), not a plain average.',
      'Suggests reporting retention instead of one average: 50% of the cohort left within a year, so 50% were retained at one year, and 20% (200 of 1,000) were still there once the 300 who left around year 2 had gone, with the number of customers behind each point.',
      'Explains how to avoid the trap: define the population at the start of the period (everyone who signed up), not at the end, and follow the whole cohort. Ask “who is missing from this table and why”.',
      'Generalises beyond customers: a model trained only on approved loan applicants never sees outcomes for the rejected, a survey with a low response rate hears from the keen, and “top 100 funds” lists drop the ones that closed. Missingness that depends on the outcome biases results and cannot be fixed by averaging.',
    ],
    followUps: [
      {
        q: 'Another cohort joined six months ago and 95% are still active. Does that mean retention is excellent?',
        lookFor: 'Not yet: they have had only six months to leave, so compare cohorts at the same age. Cohort retention curves by age, not by calendar date, are the fair comparison.',
      },
      {
        q: 'A survey has an 8% response rate and satisfaction is high. How much do you trust it?',
        lookFor: 'Non-response bias: people who reply may differ from those who do not. Compare respondents with the customer base on known traits, follow up with a random sample of non-responders, and report the response rate and the limit.',
      },
      {
        q: 'How would this bias show up in a churn model you build?',
        lookFor: 'Training only on customers present at a later date drops early leavers and makes churn look rarer and later than it is. Build the training set from everyone active at each prediction date.',
      },
    ],
    redFlags: [
      'Accepts the 5.5-year average without asking who is missing.',
      'Averages tenure for still-active customers as if it were final.',
      'Fixes the bias by dropping or imputing without looking at why data is missing.',
      'Reports one number with no sample size.',
    ],
    lessons: ['ml/getting-data-ready', 'responsible/when-examples-are-unfair', 'ml/is-the-difference-real'],
  },
  {
    id: 'ds-sql-day-7-retention-by-signup-cohort',
    prompt:
      'Tables: users(user_id, signup_date) and events(user_id, event_date). Write a query for day-7 retention by signup date: the share of each day’s signups who were active exactly 7 days after signing up. Then explain which mistakes would make the answer wrong, and what you would check before showing it to anyone.',
    roles: ['data-scientist'],
    level: 'junior',
    kind: 'coding',
    topics: ['sql', 'metrics', 'cohorts', 'data quality'],
    minutes: 20,
    strong: [
      'Starts from users and left-joins events on the user and on event_date equal to signup_date plus 7 days, groups by signup_date, and computes COUNT(DISTINCT e.user_id) ÷ COUNT(DISTINCT u.user_id). The date arithmetic syntax depends on the database, which is worth saying.',
      'Uses the users table as the denominator. An inner join, or starting from events, drops everyone who did not come back and inflates the rate, often to 100%.',
      'Counts distinct users, not rows: a user with two events on day 7 would be counted twice by COUNT(*), which also corrupts the denominator in a join.',
      'Excludes cohorts that are too young: a user who signed up 3 days ago cannot yet be seen on day 7, so including them pulls the rate down. Filters to signup_date at most today minus 7 days.',
      'Tests on a small table by hand: with signups on 1 October (3 users) and 2 October (2 users), where only one user from each day has an event 7 days later, the answer is 1 of 3 (33.3%) for the first and 1 of 2 (50%) for the second. A 30 October signup is excluded as of 5 November.',
      'Clarifies the definition with the product team: exactly day 7, or any activity in days 7 to 13 (week-1 retention); which events count as active; and which time zone defines a date. Different definitions give different numbers, so states the one used.',
      'Shows the cohort size next to each rate: 1 of 3 and 1 of 2 are not evidence of anything, and tiny cohorts need an interval or grouping by week.',
      'For a big events table, reduces it to distinct user-days for the needed date range first, then joins, and prunes by date partition.',
    ],
    followUps: [
      {
        q: 'Cohort A has 40% retention and cohort B 52%, each with 50 users. Is B better?',
        lookFor: 'The gap is 12 points but the standard error of the difference is about 10 points (z about 1.2, interval roughly -7 to +31 points), so no. Need more users, or group into weeks, and report intervals.',
      },
      {
        q: 'The result for last week’s cohort is 4 points lower than usual. What do you check before telling the team retention dropped?',
        lookFor: 'Cohort maturity, a change in what counts as an event or in logging, a data delay for the latest dates, a change in acquisition source or mix, and the cohort size. Confirms the data is complete before interpreting.',
      },
      {
        q: 'The events table has 2 billion rows and the query is slow. What do you change?',
        lookFor: 'Filter events to the date range, aggregate to distinct user and date first, use partitions and only needed columns, and consider a precomputed daily active table. Checks the output against the slow version on a sample.',
      },
    ],
    redFlags: [
      'Joins from events and calls the result retention.',
      'Counts rows instead of distinct users.',
      'Includes cohorts that have not reached day 7.',
      'Does not check the query against a small example worked by hand.',
    ],
    lessons: ['systems/data-pipelines-and-data-quality', 'ml/is-the-difference-real', 'ml/getting-data-ready'],
  },
  {
    id: 'ds-conversion-fell-but-every-segment-rose',
    prompt:
      'The dashboard shows overall conversion falling from 8.4% last week to 4.6% this week, and the head of growth wants to roll back the new checkout. Both weeks had 10,000 visits. Desktop conversion rose from 10% to 11% and mobile from 2% to 3%, but desktop was 8,000 visits last week and 2,000 this week. What is going on, what do you tell her, and what would you do next?',
    roles: ['data-scientist'],
    level: 'mid',
    kind: 'debugging',
    topics: ['statistics', 'simpsons paradox', 'metrics', 'a/b testing'],
    minutes: 15,
    strong: [
      'Recognises a mix shift (Simpson’s paradox): overall conversion is a weighted average of the segments, and the weights changed. Last week 8,000 desktop at 10% gave 800 and 2,000 mobile at 2% gave 40, so 840 of 10,000 is 8.4%. This week 2,000 desktop at 11% gave 220 and 8,000 mobile at 3% gave 240, so 460 of 10,000 is 4.6%.',
      'Shows it with a like-for-like comparison: this week’s rates on last week’s mix give 0.8 × 11% + 0.2 × 3% = 9.4%, higher than 8.4%. Last week’s rates on this week’s mix would have given 0.2 × 10% + 0.8 × 2% = 3.6%, so the mix alone explains the drop.',
      'Asks why the mix changed before deciding anything: a campaign sending more mobile visitors, a change in search ranking, a tracking change, a bot wave, or an effect of the checkout itself. The cause decides which comparison to trust.',
      'Explains that neither the total nor the segments are automatically “right”: the question is causal (did the new checkout help), so the sound evidence is a randomised comparison, or, failing that, a comparison within comparable segments with the reasoning for why they are comparable.',
      'Checks the sample sizes and intervals in each segment before concluding the improvements are real: 2,000 desktop visits at 11% has a standard error of about 0.7 points, so 10% to 11% is within noise.',
      'Communicates plainly to a non-technical lead: one small table with visits, conversion and the mix for both weeks, the like-for-like figure, and a recommendation (do not roll back on this evidence; confirm with a test).',
      'Sets up monitoring that avoids the confusion: report conversion by segment alongside the total, show the mix, and alert on within-segment change.',
    ],
    followUps: [
      {
        q: 'How do you decide whether the segment view or the overall view should drive the decision?',
        lookFor: 'Draw the causal story: if device mix is driven by something unrelated to the checkout (a campaign), the segment view answers the checkout question; if the checkout itself changed who arrives, the total can matter. A test removes the ambiguity.',
      },
      {
        q: 'You split further by country, browser and source and find a segment where the new checkout is worse. What do you do?',
        lookFor: 'Slicing many ways creates false alarms (20 comparisons at 5% give about a 64% chance of at least one), so treat it as a hypothesis, check the sample size, and confirm on fresh data or a pre-planned test.',
      },
      {
        q: 'The growth lead says she does not care about the maths, just whether to roll back. What do you say?',
        lookFor: 'A clear recommendation with a reason in one sentence (the drop is explained by more mobile visitors, and within each device conversion improved), the risk if wrong, and the test that settles it.',
      },
    ],
    redFlags: [
      'Agrees to roll back because the headline number fell.',
      'Cannot explain how both views can be true.',
      'Reports segment differences without sample sizes.',
      'Never asks why the traffic mix changed.',
    ],
    lessons: ['ml/is-the-difference-real', 'systems/monitoring-and-drift', 'ml/getting-data-ready'],
  },
  {
    id: 'ds-ab-test-sample-ratio-mismatch',
    prompt:
      'An A/B test was designed as a 50/50 split of 100,000 users. The report shows 50,800 users in treatment and 49,200 in control, and a very positive effect on revenue. A colleague says the split is close enough to 50/50. What do you say, and what do you do?',
    roles: ['data-scientist'],
    level: 'mid',
    kind: 'debugging',
    topics: ['a/b testing', 'statistics', 'data quality', 'experimentation'],
    minutes: 15,
    strong: [
      'Runs a sample ratio mismatch (SRM) check: with 100,000 users, 50,000 are expected in each arm; the chi-squared statistic is (800² ÷ 50,000) × 2 = 25.6 on one degree of freedom, a p-value of about 4 in ten million. A random 50/50 assignment would almost never land this far off, so the assignment or the counting is broken.',
      'Contrasts it with a harmless gap: 50,150 against 49,850 gives a statistic of 0.9 and p of about 0.34, which is within chance. The size of the gap is judged against the sample size, not by eye.',
      'Explains why it invalidates the result: if some users are lost from one arm for a reason related to the outcome (a redirect that fails for slow connections, bot filtering, a crash), the arms are no longer comparable, so the revenue difference may come from who is counted, not from the treatment.',
      'Does not analyse or report the treatment effect until the cause is found. Investigates by splitting the mismatch by platform, browser, country, entry point and day, and checking assignment and logging code.',
      'Lists common causes: triggering conditions that differ by arm, assignment after a step that only some users reach, differing bot or fraud filters, redirects, caching and logging bugs, and a rollout that overlapped with another test.',
      'Fixes the cause and reruns, or if the cause is understood and independent of the outcome, documents it and reports with strong caveats. Adds an automatic SRM check to the experiment platform and an A/A test for new setups.',
      'Mentions other checks that belong before reading the result: pre-experiment balance on key traits, the unit of randomisation versus the unit of analysis, a fixed stopping rule, and guardrail metrics.',
    ],
    followUps: [
      {
        q: 'The treatment effect looks large and positive. Why is that not a reason to keep the result?',
        lookFor: 'A broken assignment can create or hide an effect. The missing users may be the low-spenders in one arm. A bias can be large and in the direction people hope; wanting the result is a reason for more care, not less.',
      },
      {
        q: 'The mismatch appears only on one browser. How do you proceed?',
        lookFor: 'Look at how that browser reaches assignment and logging (a script that fails, a redirect). Test whether excluding that browser from both arms restores balance, with a note that the result then applies to the others. Fix the bug and rerun.',
      },
      {
        q: 'In a marketplace test, treatment sellers take buyers from control sellers. What does that do to the estimate?',
        lookFor: 'Interference: arms are not independent, so the measured gain overstates the true effect. Consider randomising by cluster or market, a switchback design or a holdout of whole regions.',
      },
    ],
    redFlags: [
      'Says “close enough” without computing anything.',
      'Reports the effect and mentions the mismatch as a footnote.',
      'Drops users from one arm to rebalance the counts.',
      'Cannot name causes of a sample ratio mismatch.',
    ],
    lessons: ['ml/is-the-difference-real', 'evals/llmops-in-production', 'systems/monitoring-and-drift'],
  },
  {
    id: 'ds-top-k-lift-and-net-value-of-a-retention-offer',
    prompt:
      'You have 100,000 customers and about 3% churn each quarter (3,000 customers). Your model’s backtest says the top 5%, 10% and 20% by score hold 25%, 40% and 60% of the churners. A retention offer costs $5 per customer contacted and saves 25% of the churners who receive it, and a saved customer is worth $300 (all example figures). How many do you contact, and what is the weakness in this analysis?',
    roles: ['data-scientist'],
    level: 'mid',
    kind: 'estimation',
    topics: ['metrics', 'classical ml', 'thresholds', 'uplift'],
    minutes: 18,
    strong: [
      'Computes precision and lift: the top 10% is 10,000 customers holding 1,200 churners, a precision of 12%, four times the 3% base rate. The top 5% holds 750 of 5,000 (15%, five times) and the top 20% holds 1,800 of 20,000 (9%, three times).',
      'Computes net value for each cut: top 5%: cost $25,000, saved 750 × 25% = 187.5 customers worth $56,250, net +$31,250. Top 10%: cost $50,000, saved 300 worth $90,000, net +$40,000. Top 20%: cost $100,000, saved 450 worth $135,000, net +$35,000. The best of the three is the top 10%.',
      'Looks at the marginal step: going from 5% to 10% adds $25,000 of cost and 450 churners, so 112.5 saves worth $33,750, a gain of $8,750; going from 10% to 20% adds $50,000 for $45,000, a loss of $5,000. The optimum is where the marginal value reaches zero, so a finer search around 10% to 15% would find it.',
      'Gives the break-even precision: contacting a customer costs $5 and returns precision × 25% × $300 = precision × $75 on average, so precision must exceed about 6.7%. If live precision at the top 10% falls from 12% to 9%, net is 900 churners × 25% × $300 − $50,000 = +$17,500, still positive.',
      'Names the main weakness: the 25% save rate is an assumption, and it is not the same for everyone. The customers most likely to leave are not necessarily the most persuadable, and some would stay anyway or react badly to an offer. A randomised holdout measures the real effect.',
      'Points out that ranking by churn risk is not ranking by benefit: an uplift model estimates the change caused by the offer. It needs randomised data to train and is harder to evaluate than a risk model.',
      'Checks the backtest is honest: a time-based split, features known at the prediction date, and an interval on the capture rates, since 40% from a small test set is uncertain.',
      'Does not pick a cut by AUC alone, which summarises ranking across all thresholds and ignores the budget and the cost per contact.',
    ],
    followUps: [
      {
        q: 'How would you measure the real save rate before scaling the programme?',
        lookFor: 'Randomise a holdout among the targeted customers (for example 10% receive nothing), compare churn between treated and held-out groups, and report the difference with an interval. Run for a full cycle.',
      },
      {
        q: 'The offer is a 20% discount instead of a $5 call. What changes in the analysis?',
        lookFor: 'The cost lands on everyone who accepts, including people who would have stayed, so it is a margin cost on the retained base and not only on churners. The break-even moves and incremental effect becomes the main number.',
      },
      {
        q: 'Customers are scored once a quarter. Why might the model get worse over time?',
        lookFor: 'Behaviour, prices and the customer mix change, and the offer itself changes who churns (a feedback loop). Monitor precision at the cut with delayed labels, track input drift, and retrain on a schedule.',
      },
    ],
    redFlags: [
      'Chooses the cut-off from accuracy or AUC.',
      'Treats the 25% save rate as a fact.',
      'Ignores the cost of contacting customers who would have stayed.',
      'Cannot compute precision and net value from the table.',
    ],
    lessons: ['foundations/classical-ml-essentials', 'ml/anomaly-detection', 'ml/linear-and-logistic-regression'],
  },
  {
    id: 'ds-random-split-score-too-good-group-leakage',
    prompt:
      'A model predicts hospital readmission from 40,000 visits by 8,000 patients (about five visits each). A random 80/20 split of the rows gives an AUC of 0.93 and the team is delighted. Why do you distrust it, how would you validate the model properly, and what would you report?',
    roles: ['data-scientist'],
    level: 'mid',
    kind: 'design',
    topics: ['validation', 'leakage', 'classical ml', 'cross-validation'],
    minutes: 20,
    strong: [
      'Spots group leakage: with a random row split, visits of the same patient land on both sides, so the model can recognise the patient and their pattern. The test no longer measures performance on new patients, so the score is optimistic.',
      'Validates by group: all visits of a patient go to the same fold (grouped k-fold), and checks that no patient ID appears in both train and test. If the model will predict future visits, also uses a time-based split: train on earlier visits and test on later ones.',
      'Matches the split to how the model will be used: a new patient, a new hospital or a new year each call for splitting by that unit, and the score is the one for the case that matches deployment.',
      'Checks features for leakage in time: values only known after the prediction point (the discharge summary, the total length of stay) cannot be used if the prediction is made at admission. Builds features as of the prediction time.',
      'Fits all preprocessing (scaling, imputation, encoding, feature selection) inside each training fold, and does not tune hyperparameters on the test folds. For many configurations uses nested validation or a separate untouched test set.',
      'Compares with a simple baseline (for example prior admissions count) on the same splits, and expects the honest score to be lower than 0.93. Reports the mean and spread across folds, an interval, and the performance by subgroup.',
      'Goes beyond AUC for use: calibration (do predicted risks match observed rates), the threshold chosen from the cost of a missed case versus a false alarm, and the performance at that threshold.',
    ],
    followUps: [
      {
        q: 'With grouped validation the AUC falls from 0.93 to 0.78. What do you tell the team?',
        lookFor: 'The 0.78 is the number to quote; the 0.93 measured memory of known patients. Explains why, shows both side by side, then looks for real improvements (features, data, calibration) judged on the grouped score.',
      },
      {
        q: 'You tried 200 hyperparameter settings and report the best cross-validated score. What is wrong?',
        lookFor: 'Selecting the best of many on the same folds inflates the score (the winner’s curse). Use nested cross-validation or confirm on an untouched final set, and report that figure.',
      },
      {
        q: 'The model will be deployed at a hospital that is not in the data. How does that change validation?',
        lookFor: 'Hold out whole hospitals (leave-one-site-out) to measure transfer to a new site, and expect differences in practice patterns and coding. Plan local calibration and monitoring after deployment.',
      },
    ],
    redFlags: [
      'Splits rows at random when rows are grouped by person.',
      'Fits scalers or imputers on the whole dataset before splitting.',
      'Tunes on the test set and reports the same set as the result.',
      'Reports a single AUC with no baseline or spread.',
    ],
    lessons: ['foundations/classical-ml-essentials', 'ml/overfitting-and-bias-variance', 'ml/getting-data-ready'],
  },
  {
    id: 'ds-choose-a-model-for-credit-risk-with-explanations',
    prompt:
      'A lender wants a model that estimates default risk from 120,000 past loans with about 60 columns, and customers and regulators expect an explanation for each decision. Which models do you try and in what order, how do you choose between them, and what are the traps specific to this problem? (Regulatory rules vary by place; say what you would check with compliance rather than quoting rules.)',
    roles: ['data-scientist'],
    level: 'mid',
    kind: 'concept',
    topics: ['classical ml', 'model selection', 'calibration', 'fairness'],
    minutes: 20,
    strong: [
      'Starts with baselines: a simple rule or scorecard and a logistic regression on a few well-chosen features. This is a strong, explainable benchmark, and anything more complex must beat it on the same data and splits.',
      'Tries gradient-boosted trees next, which are often the most accurate on tabular data, and notes deep networks rarely justify their cost here. Uses monotonic constraints where a feature should only push risk one way (more missed payments never lowers risk).',
      'Compares models with the same time-based splits and folds, reporting intervals. If boosting beats logistic regression by 0.01 AUC with overlapping intervals, the simpler model may be the better choice given explanation and upkeep.',
      'Treats calibration as essential, since the probabilities drive pricing and limits: checks a reliability curve and the Brier score, and recalibrates (Platt scaling or isotonic regression) on separate data if needed.',
      'Plans explanations: coefficients and scorecard points for a linear model; for boosting, per-decision attributions such as SHAP, with caveats that they describe the model’s behaviour and not causes, and may not satisfy a required reason format. Checks the requirement with compliance.',
      'Raises selection bias: outcomes exist only for approved applicants, so the model has never seen how rejected applicants would have done. Mentions reject inference and cautious rollout, and avoids claiming it knows risk for people the old policy excluded.',
      'Checks fairness and legality: performance and error rates by group, proxy features for protected traits, and documentation of the choices, with compliance and legal involved because rules differ.',
      'Plans for life after launch: monitoring drift and calibration with delayed labels, a retraining schedule, and a fallback.',
    ],
    followUps: [
      {
        q: 'Boosting gets 0.82 AUC and logistic regression 0.80 on the same time-based test. Which do you ship?',
        lookFor: 'Looks at intervals and where the gain arises, the value of 0.02 in decisions, the explanation and audit burden, and the cost of upkeep. May ship either, with reasons; does not pick the highest number by default.',
      },
      {
        q: 'The model’s predicted default rate for a score band is 5% but the observed rate is 8%. What does it mean and what do you do?',
        lookFor: 'Poor calibration: the ranking can be fine while probabilities are off. Check for drift, recalibrate on recent data, and re-check by band. Pricing built on the stated probabilities would be wrong.',
      },
      {
        q: 'A feature, postcode, improves accuracy but correlates strongly with a protected group. What do you do?',
        lookFor: 'Test the effect on group outcomes with and without it, consider the business need and alternatives, and take the decision to legal and compliance, documenting the evidence. Does not decide alone, and does not ignore it because it helps accuracy.',
      },
    ],
    redFlags: [
      'Starts with a deep network and no baseline.',
      'Picks a model by the highest single AUC with no interval.',
      'Treats SHAP values as proof of why a customer defaulted.',
      'Ignores that outcomes exist only for approved loans.',
    ],
    lessons: ['foundations/classical-ml-essentials', 'ml/gradient-boosting', 'ml/linear-and-logistic-regression', 'responsible/fairness-for-builders'],
  },
  {
    id: 'ds-code-bootstrap-interval-with-a-whale-user',
    prompt:
      'In an A/B test on revenue per user, group A has 100 users with a mean of $11.80 and group B has 100 users with a mean of $2.00. In A, one user spent $1,000, nine spent $20 and ninety spent nothing; in B, ten spent $20 and ninety nothing. Write a function bootstrap_diff_ci(a, b, stat, n_boot, seed) that returns a 95% interval for the difference in a statistic, then say what you would do about this data.',
    roles: ['data-scientist'],
    level: 'mid',
    kind: 'coding',
    topics: ['bootstrap', 'a/b testing', 'statistics', 'python'],
    minutes: 25,
    strong: [
      'Writes the function: with a random generator built from the seed, for each of n_boot rounds resample a with replacement to its own length, resample b the same way, store stat(b*) − stat(a*) (or the other order, stated), then return the 2.5th and 97.5th percentiles of the stored differences.',
      'Resamples users, the unit of randomisation, not sessions or orders, and resamples each group separately because the groups are independent. Uses several thousand rounds and a fixed seed for repeatability, and passes the statistic as an argument so it works for a mean, a median or a trimmed mean.',
      'Reads the data: the mean difference of $9.80 is driven by one user. Without that user, A’s mean is $1.82 (180 ÷ 99) against $2.00 in B, so the sign reverses. The medians are both $0 and say nothing.',
      'Interprets the interval honestly: with this data the percentile interval for the difference (A minus B) is very wide and spans zero (about −1 to +31 in a run with 5,000 resamples), so the data cannot say which group earns more per user.',
      'Offers sound options for heavy-tailed money data: report the share of users who spend and the spend per spender separately, cap (winsorise) values at a threshold set before the test, use a variance-reduction method such as adjusting for pre-experiment spend, and collect more users. Notes capping changes what is measured, which matters if the business cares about total revenue.',
      'Investigates the $1,000 user: a real large customer, a test account, fraud or a data error. Decides outlier rules before the test where possible, and writes the rule in the analysis plan.',
      'Knows what the bootstrap does not fix: a biased sample, dependence between users, tiny samples, or a statistic that depends on rare extremes, where the percentile interval can be unreliable.',
    ],
    followUps: [
      {
        q: 'Why not use a t-test on the means?',
        lookFor: 'It assumes the average is roughly normal, which fails with 100 users and one dominant value; the answer is driven by the tail. A test can be run, but the interval is not trustworthy here, and the bootstrap or a different statistic is more honest.',
      },
      {
        q: 'Your team caps revenue at the 99th percentile after seeing this result. Is that acceptable?',
        lookFor: 'Choosing the rule after seeing the data and the outcome is a way to steer the result. Fix the rule in advance, or report results with and without capping and say which was planned.',
      },
      {
        q: 'How would you estimate how many users you would need to detect a $1 difference given this spread?',
        lookFor: 'Use the standard deviation of revenue per user (large here) in a sample-size calculation or simulate from past data, noting that heavy tails make the requirement large and that variance reduction cuts it. Plan before starting.',
      },
    ],
    redFlags: [
      'Resamples orders or sessions instead of users.',
      'Declares A the winner on the $9.80 difference.',
      'Removes the big spender because it “looks like an outlier” without checking.',
      'Uses the median when most users spend nothing.',
    ],
    lessons: ['ml/is-the-difference-real', 'foundations/classical-ml-essentials', 'skills/python-first-steps'],
  },
  {
    id: 'ds-ai-assistant-ab-test-faster-but-more-reopens',
    prompt:
      'You analyse an A/B test of an AI assistant that drafts replies for support agents, with 20,000 tickets per arm. Treatment agents handle 12% more tickets per hour, but the reopen rate rose from 6.0% to 7.1% and customer satisfaction is 1.5 points lower. The product manager wants to ship because “speed is the goal”. How do you analyse it and what do you report?',
    roles: ['data-scientist', 'ai-pm'],
    level: 'mid',
    kind: 'debugging',
    topics: ['a/b testing', 'metrics', 'statistics', 'ux'],
    minutes: 20,
    strong: [
      'Checks the setup first: sample ratio mismatch, how randomisation was done (by agent or by ticket), whether agents saw both arms, and whether the arms are balanced on ticket type and agent experience.',
      'Checks the unit of analysis: tickets from the same agent are not independent, so an interval that treats 20,000 tickets as independent is too narrow. Analyses at the agent level or uses cluster-robust methods, and says how many agents there are.',
      'Quantifies the reopen increase: 7.1% − 6.0% = 1.1 points, with a standard error of about 0.25 points if tickets were independent (95% interval roughly 0.6 to 1.6 points), which is wider once agent clustering is allowed for. On 20,000 tickets, 1.1 points is about 220 extra reopened tickets per arm.',
      'Puts the trade-off in the same units: what an extra reopen costs in agent time and customer goodwill against the value of the 12% throughput gain, and whether faster handling means shorter or lower-quality replies. A speed metric alone is not the goal if quality falls.',
      'Separates primary, guardrail and diagnostic metrics defined before the test, and treats a significant fall in a guardrail as a result to act on, not a footnote. Accounts for looking at several metrics when judging the smaller ones.',
      'Looks for heterogeneity: new versus experienced agents, simple versus complex tickets, languages. The assistant may help on routine tickets and hurt on hard ones, which suggests a narrower rollout.',
      'Adds the AI-specific checks: sample and grade drafts for factual errors, how often agents send drafts unchanged, and novelty or learning effects over the test period, so a first-weeks result is not taken as the steady state.',
      'Reports a recommendation with conditions (for example ship for simple ticket types with review, keep measuring reopens) rather than a bare yes or no, with the uncertainty stated.',
    ],
    followUps: [
      {
        q: 'Agents in treatment and control share one queue. Why might that bias the result?',
        lookFor: 'Interference: faster treatment agents take more tickets, or the easy tickets, leaving harder ones for control. The arms are no longer independent. Randomise by team or time block, or check ticket mix and adjust.',
      },
      {
        q: 'The reopen difference is “significant” but the PM says 1.1 points is tiny. How do you respond?',
        lookFor: 'Significance and size are different questions. Translate into tickets and cost (about 220 per 20,000), compare with the throughput value, and let the decision rest on that, with the interval. Neither dismiss nor inflate it.',
      },
      {
        q: 'How would you keep checking quality after launch?',
        lookFor: 'A permanent small holdout or a sampled human review, tracked reopen and satisfaction by segment, and alerts on guardrails, since the model, the prompts and the tickets change over time.',
      },
    ],
    redFlags: [
      'Ships because the primary metric improved and ignores the guardrails.',
      'Treats tickets from one agent as independent without comment.',
      'Reports a p-value with no effect size in business terms.',
      'Never checks randomisation or interference.',
    ],
    lessons: ['ml/is-the-difference-real', 'systems/ux-for-ai-features', 'evals/llmops-in-production'],
  },
  {
    id: 'ds-coupon-lift-is-it-causal-confounding-and-holdouts',
    prompt:
      'Customers who were sent a coupon bought 12% of the time, against 5% for customers who were not, so the team claims the coupon adds 7 points. You learn the coupons went to people who had recently visited the pricing page. What is wrong with the claim, how would you estimate the true effect, and what would you tell the business?',
    roles: ['data-scientist'],
    level: 'senior',
    kind: 'concept',
    topics: ['causal inference', 'confounding', 'a/b testing', 'statistics'],
    minutes: 25,
    strong: [
      'Names confounding by targeting: the coupon was sent to people who were already more likely to buy, so the groups differ before the coupon. The 7-point gap mixes the effect of the coupon with the difference between the people.',
      'Prefers a randomised holdout: among the targeted customers, randomly withhold the coupon from some. This breaks the link between who gets it and their intent, so the difference between the groups estimates the effect of the coupon.',
      'Shows what a holdout might find, with example numbers: among 100,000 targeted customers, 7.0% buy with the coupon and 6.4% without, an effect of 0.6 points, or 600 extra purchases, against the naive claim of 7 points and 7,000. The naive figure overstates by about 11.7 times.',
      'Draws the business consequence: 6,400 of the 7,000 buyers would have bought anyway but still got the discount, so the discount cost is spread over 7,000 purchases to gain 600. The decision is about incremental profit, not conversion.',
      'Lists observational alternatives if randomisation is impossible: adjusting for measured differences (regression, matching or propensity weighting), difference-in-differences with a comparison group and a trend assumption, regression discontinuity at an eligibility cut-off, or instrumental variables. Each depends on assumptions that cannot be fully tested, chiefly that no unmeasured factor drives both coupon and purchase.',
      'Warns about adjustment mistakes: do not control for variables the coupon itself changes (such as later site visits), which can bias the estimate, and check that the groups overlap in the measured traits.',
      'Notes effects differ across people: some respond a lot, some not at all, and some are put off. Heterogeneity analysis or uplift modelling can focus the offer, and needs randomised data to be trusted.',
      'Communicates with ranges and plain words: “the coupon probably adds about half a point; the rest was people who were going to buy anyway”, with the interval and what would change the conclusion.',
    ],
    followUps: [
      {
        q: 'Legal and sales will not allow withholding the coupon from anyone. What can you do?',
        lookFor: 'Find natural variation (a staggered rollout, a delay, an eligibility rule), use a comparison group with difference-in-differences, or hold out a small share for a short time with a clear rationale. State the assumptions and what would break them.',
      },
      {
        q: 'A matched analysis gives a 3-point effect and the holdout gives 0.6. How do you explain the difference?',
        lookFor: 'Matching adjusts only for the measured traits; intent signals that were not measured still confound. Trust the experiment, treat the gap as a sign of unmeasured confounding, and use it to learn what the model missed.',
      },
      {
        q: 'How would you explain the difference between correlation and causation to an executive using this case?',
        lookFor: 'One plain story: coupons went to people already close to buying, so they would have bought anyway. A fair comparison needs two similar groups, which only random assignment guarantees. Avoids jargon and gives the money consequence.',
      },
    ],
    redFlags: [
      'Accepts a before-and-after or sent-versus-not-sent gap as the effect.',
      'Controls for everything available without thinking about what causes what.',
      'Presents a matched estimate as proof of causation.',
      'Reports conversion and ignores incremental profit.',
    ],
    lessons: ['ml/is-the-difference-real', 'foundations/classical-ml-essentials', 'ml/recommenders-and-ranking'],
  },
  {
    id: 'ds-explain-an-inconclusive-test-to-a-vice-president',
    prompt:
      'A vice president asks: “Which email subject line is better, A or B? Give me one number and a yes or no.” The data: A converted 120 of 2,000 recipients, B converted 138 of 2,000, and the team had agreed beforehand that anything under half a point of lift is not worth the effort. How do you answer, and what do you do if she insists on a yes or no?',
    roles: ['data-scientist'],
    level: 'senior',
    kind: 'behavioural',
    topics: ['communication', 'statistics', 'a/b testing', 'decision making'],
    minutes: 18,
    strong: [
      'Gives the number with its range in plain words: A converted 6.0%, B 6.9%, a gap of 0.9 points, but the plausible range is about −0.6 to +2.4 points (standard error about 0.78 points). So B looks better, and “no difference” and “a clear gain” are both still possible.',
      'Explains the p-value of about 0.25 correctly and briefly: if there were no real difference, a gap this large would show up about a quarter of the time by chance. It is not a 75% chance that B is better, and “not significant” does not mean “no effect”.',
      'Connects to the decision threshold: the range includes values below the 0.5-point bar and above it, so the data cannot say whether the gain is worth the effort. Gives the next step with a cost: about 11,700 recipients per arm (80% power, 5% level) to resolve a 0.9-point gap, nearly six times the sample.',
      'Frames the decision, not only the statistics: for a low-cost, reversible choice like a subject line, picking B and carrying on is reasonable even without certainty, provided it is said plainly. For a costly or irreversible choice, the bar for evidence is higher.',
      'Avoids false precision and false drama: no “B wins by 15%” from 0.9 on 6.0 (which is true as a relative figure but misleads), no hiding the interval, and no overclaiming caution either. Uses a picture of the interval if it helps.',
      'Separates what is known, what is not and what would change the answer: more data, a repeat on the next send, or a larger real gap. Commits to a follow-up date so the uncertainty has an owner.',
      'Does not peek or stretch the test to find significance: agrees how long to run and stops by the plan, or uses a sequential method planned in advance.',
    ],
    followUps: [
      {
        q: 'She says: “So there is a 75% chance B is better?” How do you reply?',
        lookFor: 'No: the p-value is the chance of data this extreme if there were no difference, not the probability B is better. A statement like that needs a prior and a Bayesian model; if offered, show it with its assumptions, otherwise decline to quote one.',
      },
      {
        q: 'After three more days the p-value is 0.04. Do you tell her B has won?',
        lookFor: 'Not on its own: the extra look after seeing p = 0.25 inflates false positives. Check against the agreed plan, report the new interval, and keep the effect size in view. A repeated test is more convincing than a stretched one.',
      },
      {
        q: 'She still says: “I need a yes or no today.” What do you say?',
        lookFor: 'Give a decision, with the reason and the risk: “Use B; the downside if it is no better is nothing, and we will keep testing.” A decision with an honest statement of confidence beats a refusal to answer or a false yes.',
      },
    ],
    redFlags: [
      'Says “not significant, so they are the same”.',
      'Reports only a p-value or only a point estimate.',
      'Keeps the test running until it crosses 0.05.',
      'Refuses to give a recommendation at all.',
    ],
    lessons: ['ml/is-the-difference-real', 'foundations/classical-ml-essentials', 'evals/building-an-eval-dataset'],
  },
  {
    id: 'ds-forecast-weekly-demand-and-order-quantities',
    prompt:
      'A retailer wants weekly demand forecasts for 5,000 products in 200 stores, with promotions and holidays, to decide stock orders. How do you frame the problem, what baselines and error measures do you use, how do you validate, and how do you turn forecasts into order quantities?',
    roles: ['data-scientist'],
    level: 'senior',
    kind: 'design',
    topics: ['forecasting', 'time series', 'metrics', 'inventory'],
    minutes: 25,
    strong: [
      'Starts from the decision: an order quantity per product and store, a lead time (say 4 weeks) and the costs of stock-outs and surplus. The forecast horizon, granularity and error measure follow from that decision.',
      'Sets baselines before anything clever: the same week last year or seasonal naive, a recent-average, and a drift forecast. Reports error as a ratio to the seasonal-naive method or with MASE, which handles zeros and scale; avoids MAPE where demand is near zero, and says that a model that cannot beat the baseline should not ship.',
      'Models with features known in advance: calendar, holidays, planned promotions and prices, store and product attributes, and lags of demand. Gradient-boosted trees on lag features are a strong option (the M5 competition winner was built on LightGBM), alongside classical per-series methods; the result on your data decides.',
      'Handles the structure: a hierarchy (product, store, region) where forecasts should add up, many items with intermittent demand (mostly zero weeks), new products with no history (use similar items or attributes), and sparse stores borrowing strength from the group.',
      'Backtests with a rolling origin: train on the past, forecast the next lead-time window, move forward, and average over many origins, never shuffling time. Checks for leakage, for example using realised promotions or actual weather rather than the plan and the forecast available at the time.',
      'Notices the demand-versus-sales trap: when a product is out of stock, recorded sales are zero or low even though demand existed, so training on sales understates demand. Flags stock-out periods and treats them as missing or censored.',
      'Turns a point forecast into an order using uncertainty: with a mean of 200 a week over a 4-week lead time (800 units) and an example weekly error standard deviation of 40, independent errors give a lead-time standard deviation of about 80 (40 × √4). A 95% service level adds 1.645 × 80 ≈ 132 units of safety stock, so order up to about 932. States that independence is an assumption and that quantile forecasts can give the same without it.',
      'Judges by business results as well as forecast error: stock-outs, waste and holding cost against the current method, ideally in a controlled store trial. Plans monitoring and retraining.',
    ],
    followUps: [
      {
        q: 'Your model beats the seasonal-naive baseline by only 3% in error. Is it worth shipping?',
        lookFor: 'Look at the cost and the value of 3%: in money terms, at the items and weeks that matter, and by segment. Consider the upkeep, and test the effect on stock-outs. If the gain is not material, the simple baseline is the right answer.',
      },
      {
        q: 'A promotion lifts sales of one product and lowers sales of a similar one. How does that affect your model?',
        lookFor: 'Cannibalisation: promotion features for a product should include related products’ promotions, or the forecast is evaluated at a group level. Check the model’s promotion effects in backtests on past promotions.',
      },
      {
        q: 'How would you tell, a few months after launch, whether the forecasts have degraded?',
        lookFor: 'Track error ratio to baseline by segment over time, the share of items outside their predicted intervals, bias (consistent over- or under-forecast), and input changes such as new price regimes. Alert when the error ratio drifts and retrain on a schedule.',
      },
    ],
    redFlags: [
      'Shuffles the data into random train and test sets.',
      'Reports MAPE on items with many zero weeks.',
      'Trains on sales without considering stock-outs.',
      'Gives a point forecast and stops, with no use of uncertainty.',
    ],
    lessons: ['ml/time-series-forecasting', 'ml/gradient-boosting', 'systems/monitoring-and-drift'],
  },
];
