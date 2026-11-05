import type { Question } from './types';

/**
 * Interview questions for customer-facing and leadership roles: forward deployed engineer, AI solutions architect
 * and AI engineering lead. Every worked number was recomputed in a scratch script. Prices, rates, salaries and
 * costs are labelled examples, not real quotes. Legal and compliance topics are hedged and are not legal advice.
 */
export const questionsCustomerLead: Question[] = [
  // ---------------------------------------------------------------------------
  // Forward deployed engineer
  // ---------------------------------------------------------------------------
  {
    id: 'fde-first-week-discovery-questions',
    prompt:
      'You have just been embedded with a customer’s operations team to run a pilot of an AI tool. In your first week, what do you want to learn, who do you talk to, and what do you ask?',
    roles: ['fde'],
    level: 'junior',
    kind: 'concept',
    topics: ['discovery', 'customer-facing', 'pilot scoping', 'stakeholders'],
    minutes: 10,
    strong: [
      'Starts from the job and the person doing it: shadows people doing the work today, asks to see real examples including the ugly ones, and does not rely only on the sponsor’s description of the process.',
      'Asks for outcomes in numbers: volume, time per task, error rate today, cost of a mistake, and “how do you know it is going well right now?”. Without a baseline, an improvement cannot be shown later.',
      'Maps the people: who pays (sponsor), who wants it (champion), who will live with it (users), and who can say no (security, legal, IT, the data owner). Finds out who can say yes and who can only say no.',
      'Maps the data and systems: where the inputs live, who owns them, how long access takes, what may not leave the building, and what the existing tools can already do.',
      'Asks what has been tried before and why it stopped, and whether a simple rule, a template or a search box would already cover part of the need. Checks honestly whether an LLM is needed at all.',
      'Writes down assumptions and open questions and plays them back in a short document or call, so a misunderstanding surfaces in week one instead of week six.',
    ],
    followUps: [
      {
        q: 'The sponsor says, “Just get us a chatbot.” What do you do?',
        lookFor: 'Does not start building. Asks which decision or piece of work the chatbot would help, for whom, and what a good answer looks like. Asks for ten real examples of questions or tasks and turns the request into a use case with a measurable outcome.',
      },
      {
        q: 'The users describe a workflow that is quite different from the one the sponsor described. Which do you believe?',
        lookFor: 'Treats the sponsor’s version as the intended process and the users’ version as the actual one. Confirms by watching the work and reading real cases, designs for what people really do, and raises the gap tactfully rather than treating either side as wrong.',
      },
      {
        q: 'You discover that the data you need belongs to a team that has not heard of the pilot. What now?',
        lookFor: 'Asks the sponsor for a proper introduction, explains what is needed and why, asks about lead times early, and does not work around the owner or use data without permission.',
      },
    ],
    redFlags: [
      'Starts choosing a model or building a prototype in week one, before understanding the work.',
      'Talks only to the sponsor and never watches an actual user.',
      'Accepts “we want AI” as a goal with no number attached.',
      'Treats security, legal and data owners as obstacles to avoid rather than people to involve early.',
    ],
    lessons: ['systems/when-not-to-use-an-llm', 'start/using-ai-without-getting-burned', 'systems/llm-app-system-design'],
  },
  {
    id: 'fde-triage-one-wrong-answer-escalation',
    prompt:
      'Two weeks into a pilot, the customer’s operations manager emails: “Your AI told one of our customers the wrong return window yesterday. Is this thing safe to use?” You have the conversation ID. Walk through how you investigate, what you reply, and when.',
    roles: ['fde'],
    level: 'junior',
    kind: 'debugging',
    topics: ['debugging', 'tracing', 'communication', 'incident response'],
    minutes: 12,
    strong: [
      'Replies quickly, before the diagnosis is finished: acknowledges the report, says you are looking at it, and gives a time for the next update. Does not guess at a cause, and does not say it is a one-off before checking.',
      'Pulls the full trace for that conversation: the user input, what was retrieved, the prompt and model versions, the tool calls and the final output. Reproduces it if possible.',
      'Sorts the cause into a small set: the right document was not retrieved, the document itself is wrong, stale or contradicts another, the prompt left a gap, the model misread good context, the question was ambiguous, or an integration passed the wrong data.',
      'Checks scope before concluding: searches the logs for other conversations on the same topic to see whether it is one case or a pattern, and counts them.',
      'Fixes at the layer where the fault is, adds the failing case to the eval set so it cannot quietly return, and decides on an interim safeguard if needed, such as sending that topic to a person.',
      'Reports back in plain words: what happened, how many conversations were affected, what changed, and what you will watch. Is honest about what is still unknown.',
    ],
    followUps: [
      {
        q: 'Your logs do not store the retrieved passages, so you cannot see what the model was shown. What do you do now, and what do you change?',
        lookFor: 'Says honestly that the cause cannot be proven for this case. Tries to reproduce with the same query and index version, and adds tracing that records retrieved passages, prompt version and model version (respecting data rules) so the next report can be diagnosed.',
      },
      {
        q: 'It turns out the customer’s own policy page lists two different return windows. What do you do?',
        lookFor: 'Shows the customer the conflict as a finding. The source of truth is theirs to fix. Proposes one authoritative document, resists patching it silently with a prompt rule, and offers to make the assistant say it is unsure when sources conflict.',
      },
      {
        q: 'The manager says, “Turn it off until you can prove it is safe.” How do you respond?',
        lookFor: 'Does not argue. Offers scoped options (pause the affected topic, add human review, keep it internal) and agrees measurable conditions for turning it back on. Accepts the pause if the customer insists.',
      },
    ],
    redFlags: [
      'Answers the email with “the model sometimes makes mistakes” and nothing else.',
      'Edits the prompt in production to fix this one case without a record or a test.',
      'Cannot tell whether the fault is in retrieval, the source document or the model.',
      'Hides or minimises the problem to protect the pilot.',
    ],
    lessons: ['evals/observability-for-llm-apps', 'evals/why-models-make-things-up', 'rag-agents/rag-from-scratch'],
  },
  {
    id: 'fde-no-labelled-data-expert-hours',
    prompt:
      'A customer wants incoming claim emails sorted into 12 categories automatically, but they have no labelled data and their one domain expert can give you three hours in total. How do you get to a first measurable result?',
    roles: ['fde'],
    level: 'junior',
    kind: 'design',
    topics: ['evals', 'labelling', 'pilot scoping', 'data'],
    minutes: 12,
    strong: [
      'Pulls real historical emails, not curated ones, and samples them so that every category and the ugly cases (short, forwarded, mixed topics, other languages) appear. Checks data-handling rules before moving any of it.',
      'Spends the expert’s time on labelling and on writing the guideline. Reserves about 30 minutes for the guideline and for resolving unclear cases, leaving 150 minutes: at about 40 seconds per item when the model pre-labels and the expert corrects, that is 225 items; labelling from scratch at 90 seconds each is only 100.',
      'Keeps a blind subset that the expert labels without seeing the model’s suggestion, because corrections of a suggestion are biased toward agreeing with it.',
      'Holds out the labelled test set and does not tune prompts on it. Uses a separate small development set to iterate.',
      'Notes the limit honestly: 225 items over 12 categories is about 19 per category, so a category measured at 17 of 19 (89.5%) has a 95% interval of roughly 69% to 97%. Reports overall results with an interval and per-category results as rough.',
      'Records the ambiguous cases and disagreements as findings, since they show where the categories themselves are unclear, and asks the customer to decide the rule.',
      'Plans the next step: a second labeller for part of the set to check agreement, and a way to add production cases as they appear.',
    ],
    followUps: [
      {
        q: 'Three of the 12 categories are rare and have almost no examples in your sample. What do you do?',
        lookFor: 'Searches for them on purpose (keywords, older data, the expert’s memory of typical cases), oversamples them for the test set while reporting that the sample is no longer representative of traffic, and says per-category numbers will stay wide.',
      },
      {
        q: 'The expert and a second reviewer disagree on 20% of the items. What does that tell you?',
        lookFor: 'The task or the categories are ambiguous, so no model score can be trusted above human agreement. Tightens the label definitions, merges categories, or adds an “unsure” route, and measures agreement beyond chance.',
      },
      {
        q: 'The customer asks for a single accuracy number for their steering committee. What do you give them?',
        lookFor: 'One number with its interval and the sample size, split by the categories that carry cost, and a plain statement of what the test did and did not cover.',
      },
    ],
    redFlags: [
      'Waits for the customer to produce a labelled dataset before doing anything.',
      'Uses the expert’s three hours to review the model’s outputs informally, with no record or held-out set.',
      'Reports a single accuracy figure from a few dozen items with no uncertainty.',
      'Tunes the prompt on the same items used for the final score.',
    ],
    lessons: ['evals/building-an-eval-dataset', 'evals/evals-101', 'ml/is-the-difference-real'],
  },
  {
    id: 'fde-vague-ask-to-success-criteria',
    prompt:
      'A customer’s vice president says: “We want AI to make our claims handlers faster and more accurate.” You have six weeks. How do you turn that into a pilot with success criteria that both sides agree on before you build anything?',
    roles: ['fde'],
    level: 'mid',
    kind: 'design',
    topics: ['pilot scoping', 'success criteria', 'discovery', 'evals'],
    minutes: 15,
    strong: [
      'Pins down each word: faster at which step, measured how, from what baseline; more accurate compared with whom, and which kinds of error matter most.',
      'Chooses one workflow and one primary metric, plus guardrail metrics that must not get worse (error rate on the costly cases, escalation rate, user satisfaction, cost per case).',
      'Measures the baseline in week one, for example timing a sample of real cases. Without it, no improvement can be shown, and the customer will compare with a memory.',
      'Agrees in writing the test set (real cases, labelled by their experts, held out from tuning), the pass line as a number with its interval, and what happens in between: extend, narrow, or stop.',
      'States what is out of scope for the pilot, who decides at the end (go, narrow, stop), and the date of that decision.',
      'Includes cost and operations in the criteria, such as cost per case and who would run it, so the pilot answers “should we adopt this?” and not only “does it work?”.',
      'Gets the agreement from the sponsor and the people who will run the checks, and keeps a change log so the criteria cannot drift unnoticed.',
    ],
    followUps: [
      {
        q: 'The sponsor wants “95% accuracy” and has no basis for the number. What do you do?',
        lookFor: 'Asks what a wrong answer costs and what the current process achieves. Treats 95% as a hypothesis, proposes measuring the human baseline and the cost of each error type, and sets the bar from that, not from a round number.',
      },
      {
        q: 'Compliance wants zero errors and operations wants speed. They will not agree. What now?',
        lookFor: 'Makes the trade-off visible, for example a table of error types with their cost, and proposes routing by risk (automate the low-risk part, review the rest). Escalates the decision to the sponsor rather than choosing silently.',
      },
      {
        q: 'Week three: results are 4 points under the agreed bar, with an interval that includes it. What do you do?',
        lookFor: 'Follows the pre-agreed rule for the in-between case and does not move the goalposts. Shows which error types are fixable, proposes a time-boxed extension or a narrower scope, and reports the uncertainty honestly.',
      },
    ],
    redFlags: [
      'Accepts “faster and more accurate” as the success definition.',
      'Starts building and plans to “figure out the metrics later”.',
      'Defines success after seeing the results.',
      'Measures only a demo on cases the team picked.',
    ],
    lessons: ['evals/evals-101', 'evals/building-an-eval-dataset', 'systems/from-notebook-to-production'],
  },
  {
    id: 'fde-messy-documents-sample-and-ocr-estimate',
    prompt:
      'A customer says they have “about 400,000 documents, mostly PDFs” that the assistant must read. You cannot open them all, so you take a random sample of 200 and find 46 are scans (images of paper with no text layer), averaging 6 pages each. Estimate how many scans there are with a margin of error, how many pages need optical character recognition (OCR, turning an image of text into text), and what that costs at an example $1.50 per 1,000 pages. What else do you check in the sample?',
    roles: ['fde'],
    level: 'mid',
    kind: 'estimation',
    topics: ['data quality', 'estimation', 'document parsing', 'pilot scoping'],
    minutes: 12,
    strong: [
      'Computes the share: 46 ÷ 200 = 23%. Scales it: 400,000 × 0.23 = 92,000 scanned documents.',
      'Puts a margin on it. A 95% Wilson interval for 46 of 200 is about 17.7% to 29.3%, so roughly 70,800 to 117,200 scans. Says the sample size limits how precisely this is known, and that it only holds if the sample was truly random and not “the files the customer sent first”.',
      'Converts to pages: 92,000 × 6 = 552,000 pages, and to cost: 552,000 ÷ 1,000 × $1.50 = $828, which is roughly $640 to $1,055 across the interval for the scan share. The price is an example, so the figure is a shape, not a quote.',
      'Notes that the OCR bill is small next to the engineering effort and the quality risk: tables, handwriting, stamps, skewed or low-resolution scans and multi-column pages all lose information, and an error here becomes a wrong answer later.',
      'Also records in the sample what else will matter: languages, duplicates and versions of the same file, password-protected or corrupt files, very long documents, tables and forms, and sensitive content.',
      'Reports the result as a range with its assumptions, and tells the customer what they must confirm, such as whether the average page count is typical.',
    ],
    followUps: [
      {
        q: 'The 6-page average came from 46 scans, and two of them were 300 pages. How does that change your estimate?',
        lookFor: 'The page count is heavy-tailed, so the mean is unstable. Looks at the median and the total pages in the sample, asks for file-size or page-count metadata for the whole set, stratifies by size, and gives a wider range.',
      },
      {
        q: 'You find that about 40% of the files are near-duplicates, many of them older versions of the same document. Why does that matter?',
        lookFor: 'Duplicates inflate indexing cost and, more importantly, give the assistant conflicting versions to quote. De-duplicates by hash and near-duplicate matching, picks the current version by rule, and keeps version metadata so answers can cite the right one.',
      },
      {
        q: 'How would you present the OCR number to a finance lead?',
        lookFor: 'As a range with the assumptions listed, flagged as an example price to be replaced by a quote, with a note that the larger cost is people time to check quality on a sample of the output.',
      },
    ],
    redFlags: [
      'Says “400,000 documents” and plans to process all of them without looking at any.',
      'Reports 92,000 scans as exact, with no margin.',
      'Takes the sample from whatever the customer chose to send.',
      'Ignores quality and checks only price.',
    ],
    lessons: ['rag-agents/reading-real-documents', 'systems/data-pipelines-and-data-quality', 'ml/getting-data-ready'],
  },
  {
    id: 'fde-demo-works-production-fails',
    prompt:
      'The demo on 20 hand-picked customer documents answered 19 questions correctly (95%). After going live on real traffic, a 200-case sample shows 142 correct (71%). The customer is upset. What do you do first, and what explains the gap?',
    roles: ['fde'],
    level: 'mid',
    kind: 'debugging',
    topics: ['debugging', 'evals', 'distribution shift', 'production'],
    minutes: 15,
    strong: [
      'First reads the numbers: 19 of 20 has a wide 95% interval (about 76% to 99%), so the demo said little. 142 of 200 is 71% with an interval of about 64% to 77%. The intervals do not overlap, so the drop is real and not noise.',
      'Names the selection effect: hand-picked documents and questions written by people who know the answer are easier than live traffic. Production brings scans, abbreviations, ambiguous questions, stale or duplicate files, long tables and users who type differently.',
      'Checks the integration differences between demo and production: permission filters, truncated or unparsed documents, timeouts, a different model snapshot, a different index, and missing documents that were present in the demo.',
      'Does failure analysis on the 58 wrong cases (200 minus 142): reads each, puts it in a bucket (retrieval miss, parse failure, missing source, ambiguous question, wrong generation, conflicting sources), and fixes the largest bucket first.',
      'Builds the evaluation set from real traffic and sets the launch bar on that, so the next comparison is fair.',
      'Tells the customer plainly what the demo did and did not show, what the measured number is, the plan and a date for the next measurement, instead of defending the demo.',
    ],
    followUps: [
      {
        q: 'Bucketing shows 26 of the 58 failures are documents that were never parsed correctly (scans and tables). If you fix those completely, what accuracy do you expect, and why would you not promise it?',
        lookFor: '142 + 26 = 168 of 200, which is 84% (interval about 78% to 88%). Would not promise it because fixed documents may still fail for other reasons, the sample is small, and fixes can shift other buckets. Says “up to about 84%, to be re-measured”.',
      },
      {
        q: 'The customer asks why you did not catch this before launch. What is the honest answer?',
        lookFor: 'The pre-launch check was too small and too curated, and the launch bar was not tied to a representative set. Owns the process gap without blaming the customer’s data, and describes the gate that will exist from now on.',
      },
      {
        q: 'How do you avoid repeating this with the next customer?',
        lookFor: 'Sample real data in week one, build the eval set from it before the demo, show the demo with its measured failure categories, and put the representative-sample result in the success criteria.',
      },
    ],
    redFlags: [
      'Defends the demo or blames the customer’s data as “messy”.',
      'Changes prompts at random hoping the number rises.',
      'Reports a new accuracy from the same few cases used to tune.',
      'Promises a specific recovery figure and date without evidence.',
    ],
    lessons: ['evals/building-an-eval-dataset', 'systems/from-notebook-to-production', 'ml/is-the-difference-real', 'systems/monitoring-and-drift'],
  },
  {
    id: 'fde-security-review-for-a-pilot',
    prompt:
      'Before your pilot may touch the customer’s data, their security team sends a 60-question review. Several answers depend on how the model provider handles data. How do you approach the review, and how do you answer questions such as “is our data used to train the model?” and “where is it processed?”',
    roles: ['fde', 'solutions-architect'],
    level: 'mid',
    kind: 'concept',
    topics: ['security', 'privacy', 'compliance', 'customer-facing'],
    minutes: 15,
    strong: [
      'Treats the review as part of the work, starts it early because reviews often take longer than a prototype, and finds the right contact on the security side instead of sending answers into a queue.',
      'Draws a data-flow diagram: what data enters, where it is stored, where it is processed, who can see it, how long it is kept, and what is logged. Most questions can then be answered from the diagram.',
      'Answers from sources, not memory: the provider’s current terms and documentation for the exact service and features in use, and the contract. Gives a dated, sourced answer and avoids absolute claims.',
      'Separates stored from processed location, and notes features that can retain data even when the base model does not, such as caching, stored conversation state, abuse monitoring, and the team’s own prompt logs.',
      'Reduces what is sent: redacts or omits fields the task does not need, gives the application its own narrowly scoped identity, uses private connectivity and customer-managed keys where the customer requires them and the feature supports them, and decides deliberately whether prompts are logged.',
      'Says “I will confirm that in writing by Thursday” when unsure, and follows through. Sends contractual and legal points to the customer’s and the company’s counsel. This is not legal advice.',
    ],
    followUps: [
      {
        q: 'The questionnaire asks for “zero data retention”. What do you check before saying yes?',
        lookFor: 'Zero retention is not one switch. Lists every feature in use (caching, conversation state, grounding, abuse-monitoring stores, logs, fine-tuning data), looks up what each stores and for how long, disables what cannot be justified, and answers per feature.',
      },
      {
        q: 'The security team rejects any external model API. What are the options?',
        lookFor: 'A private endpoint inside the customer’s own cloud account, a deployment in their tenant, an open-weights model on their hardware (with the cost, quality and operations trade-offs measured), or a narrower scope of data. Presents the options with their costs and lets the customer choose.',
      },
      {
        q: 'The pilot starts Friday and the review is not finished. Someone suggests testing with a small sample of real data “just to be fast”. What do you do?',
        lookFor: 'Does not use unapproved real data. Proposes synthetic or public data for now, or asks for an approved, redacted sample, and explains to the sponsor that the delay belongs to the review, not to the team.',
      },
    ],
    redFlags: [
      'Answers “no, it is not used for training” from memory with no source or date.',
      'Treats the review as an obstacle and tries to start before it finishes.',
      'Cannot say where data is stored and processed.',
      'Logs full prompts with customer data into a tool nobody has reviewed.',
    ],
    lessons: ['cloud/cloud-security-and-networking-for-ai', 'responsible/privacy-engineering-for-ai', 'local/private-and-air-gapped-ai'],
  },
  {
    id: 'fde-frontline-users-do-not-trust-it',
    prompt:
      'A month into a pilot, usage data shows that only 15 of the 120 target users open the tool, and those who do often retype the answer themselves. The sponsor thinks the model is the problem. What do you do?',
    roles: ['fde'],
    level: 'mid',
    kind: 'behavioural',
    topics: ['adoption', 'ux', 'change management', 'customer-facing'],
    minutes: 12,
    strong: [
      'Goes to the users before touching the model: watches people work, asks why they do not open it, and listens for the real reasons, which are often trust, an extra tab, extra steps, no time to check answers, or fear about what the tool is for.',
      'Instruments the funnel instead of guessing: who opens it, how often answers are accepted, edited or ignored, and how long tasks take with and without it, in aggregate and by team.',
      'Reads what people edit. Consistent edits in one area point to a fixable quality gap; no edits and no use point to a workflow problem.',
      'Fixes the friction: puts the assistant inside the tool people already use, shows sources so checking is cheap, makes correcting and rejecting easy, and ships small improvements that users can see.',
      'Recruits a few respected users as co-designers and lets them shape what is built, so the tool belongs to them.',
      'Is honest about intent. If people fear the tool will be used to cut jobs or to monitor them, says what is known and what is not, asks the sponsor to communicate plainly, and does not promise what the customer controls. Keeps usage metrics about the tool, not about individuals.',
    ],
    followUps: [
      {
        q: 'The sponsor wants to make it mandatory. What do you say?',
        lookFor: 'Warns of box-ticking use, resentment and poor data, and recommends a mandate only after trust and workflow fit are fixed, or in a narrow area where it already helps. Offers to measure the effect of a mandate rather than assume it works.',
      },
      {
        q: 'Experienced users say it slows them down. How do you check?',
        lookFor: 'Times a sample of tasks with and without the tool and segments by experience. It may slow experts and help newcomers; then targets it at the users who gain, or changes the design (for example, suggestions only on request).',
      },
      {
        q: 'A senior user tells you privately that they fear the pilot is a first step to cutting headcount. You do not know the plan. What do you say?',
        lookFor: 'Does not lie or reassure with promises. Says what they do and do not know, takes the concern to the sponsor and asks for a clear message, and treats the worry as legitimate information about adoption.',
      },
    ],
    redFlags: [
      'Assumes the users are the problem or the model is the problem without asking anyone.',
      'Collects per-person usage data and shares it with managers without telling users.',
      'Promises job security on behalf of the customer.',
      'Adds features rather than removing friction.',
    ],
    lessons: ['systems/ux-for-ai-features', 'systems/human-in-the-loop-design', 'responsible/ai-and-work'],
  },
  {
    id: 'fde-scope-creep-mid-pilot',
    prompt:
      'Role-play: it is week 4 of a 6-week pilot. The customer’s champion says, “This is going great! Can you also add Spanish, connect it to our CRM, and have it handle returns? Legal says we need it by quarter end.” The agreed scope was English FAQ answers only. How do you respond?',
    roles: ['fde'],
    level: 'mid',
    kind: 'behavioural',
    topics: ['behavioural', 'scope', 'pilot scoping', 'stakeholders'],
    minutes: 10,
    strong: [
      'Welcomes the enthusiasm and does not answer yes or no on the spot. Takes the three requests apart, because they differ in effort and risk.',
      'Sizes each one: Spanish needs eval data and native-speaking reviewers; the CRM link needs access, a security review and testing; returns involve money, so they need a design for approval and limits. None of them is a small change.',
      'Ties the answer to the agreed success criteria: there are two weeks left, and adding scope now takes time from the measurements the pilot was meant to produce. Changing what is measured mid-pilot weakens the result.',
      'Offers options: finish the agreed pilot and plan a second phase; swap one item for another; or extend with a new date, resourcing and criteria, all in writing as a change.',
      'Asks what is behind the quarter-end date, since there may be a better way to meet the real need.',
      'Includes the sponsor, who decides, not only the champion, and keeps your own manager informed so nobody is surprised. Captures the requests as a sized phase-two backlog so the champion feels heard.',
    ],
    followUps: [
      {
        q: 'The champion says their vice president has already promised the CRM integration to customers. What now?',
        lookFor: 'Finds out exactly what was promised and to whom, does not commit to a date without an estimate, escalates inside the team, and offers a realistic path such as a read-only prototype before production. Keeps the tone cooperative.',
      },
      {
        q: 'The champion goes to your manager to get the extra scope approved over your head. How do you avoid being in that position?',
        lookFor: 'Shares the plan and the scope document with the sponsor and with your own manager from the start, so there are no surprises and the decision is made with the trade-offs visible.',
      },
      {
        q: 'Is there a case where you would simply say yes?',
        lookFor: 'Yes, when the request is small, low-risk, helps the primary metric, or the sponsor agrees to trade something out. Always recorded as a change, and never when it removes the ability to measure the original goal.',
      },
    ],
    redFlags: [
      'Says yes to everything to keep the champion happy.',
      'Says no flatly, with no options and no tie to the customer’s goals.',
      'Adds scope without telling the sponsor or changing the plan.',
      'Treats the champion as the decision maker.',
    ],
    lessons: ['systems/when-not-to-use-an-llm', 'responsible/human-oversight-and-when-ai-should-not-decide', 'systems/llm-app-system-design'],
  },
  {
    id: 'fde-value-story-pilot-roi',
    prompt:
      'The pilot of a ticket-drafting assistant is ending. The customer handles 12,000 tickets a month. Agents used the draft on 60% of tickets and said it saved about 3 minutes each time. On the other 40% they discarded the draft after about 30 seconds. Use an example loaded agent cost of $30 an hour and an example model cost of $0.05 per ticket. Build the value story for the customer’s finance lead, including what you would not claim.',
    roles: ['fde'],
    level: 'senior',
    kind: 'estimation',
    topics: ['roi', 'value', 'estimation', 'communication'],
    minutes: 15,
    strong: [
      'Computes the gain: 12,000 × 0.6 × 3 minutes = 21,600 minutes = 360 hours, which at $30 an hour is $10,800 a month.',
      'Subtracts the waste: 12,000 × 0.4 × 0.5 minutes = 2,400 minutes = 40 hours = $1,200. Subtracts the model cost: 12,000 × $0.05 = $600. The net is $10,800 − $1,200 − $600 = $9,000 a month before fixed costs such as hosting, support and the pilot build.',
      'Shows a pessimistic case next to the base case, because the inputs are estimates: at 40% use and 2 minutes saved, the gain is $4,800, the waste is 12,000 × 0.6 × 0.5 = 3,600 minutes = $1,800, and the net is $2,400 a month. So the honest statement is a range, about $2,400 to $9,000 a month.',
      'Questions the evidence: minutes “saved” reported by agents are weak. Prefers timestamps from the tool or a timed sample, and a control group, and checks that speed was not bought with quality (reopened tickets, satisfaction, escalations).',
      'Says that saved time is not saved money unless the customer uses it: absorbing growth without hiring, shrinking the backlog, cutting overtime or response times. Does not claim headcount savings.',
      'Notes that at this scale the model cost is small (about 7% of the base-case net and 25% of the pessimistic net) and that acceptance rate and minutes saved drive the result, so effort belongs there.',
      'Asks finance what they value and in which unit, and puts the result in their terms.',
    ],
    followUps: [
      {
        q: 'The finance lead asks, “So we can cut two agents?” What do you say?',
        lookFor: '360 hours is about 2.25 full-time people (at 160 hours) only if the hours could be collected from one place; they are spread across many agents in small pieces. The low case is about one person. Headcount decisions are the customer’s, and the evidence supports a capacity statement, not a layoff number.',
      },
      {
        q: 'The pilot had 20 agents. Will the result hold for all 100?',
        lookFor: 'Not necessarily: novelty effects, volunteer bias, ticket mix and different skill levels. Proposes a staged roll-out with the same measurement and says what result would change the conclusion.',
      },
      {
        q: 'The customer wants a bigger model that costs twice as much per ticket. How does it change the story?',
        lookFor: 'At $0.10 per ticket the model cost is $1,200 and the net is $10,800 − $1,200 − $1,200 = $8,400, so cost barely changes the case, while a few points of acceptance would. Decides by measured acceptance and minutes saved, not by price per token.',
      },
    ],
    redFlags: [
      'Quotes only the best-case saving and omits the wasted review time.',
      'Treats self-reported minutes as hard data.',
      'Claims headcount reduction on the customer’s behalf.',
      'Shows a single precise number with no range or assumptions.',
    ],
    lessons: ['cost/where-the-tokens-go', 'responsible/ai-and-work', 'evals/evals-101'],
    game: { label: 'Practise estimating costs in Cost Crunch', href: '/play/cost-crunch/' },
  },
  {
    id: 'fde-communicating-limits-to-an-exec',
    prompt:
      'Role-play: I am the customer’s chief operating officer. Your pilot extracts fields from supplier invoices. On a 300-invoice test set it got 261 fully correct (87%). I say: “Our auditors need 99%. Can you get us there by the end of the month? If not, I want to cancel.” Respond to me.',
    roles: ['fde', 'solutions-architect'],
    level: 'senior',
    kind: 'behavioural',
    topics: ['behavioural', 'communication', 'expectations', 'evals'],
    minutes: 15,
    strong: [
      'Stays calm and acknowledges the requirement before arguing with it. Gives the number plainly: 261 of 300 is 87%, with a 95% interval of about 82.7% to 90.3%.',
      'Translates it to their volume: at 10,000 invoices a month, 13% with an error is about 1,300 invoices (roughly 970 to 1,710 across the interval). Shows the size of the gap to 99% in business terms.',
      'Asks what “99%” means: per invoice or per field, which fields matter, and what the auditors actually need. An auditor may accept a controlled process (review of uncertain items, reconciliation, a sample check) rather than raw model accuracy.',
      'Proposes a design instead of a promise: the system accepts automatically only when it is very sure, sends the rest to people, and the combined process is measured on a held-out set. Does not state a date for 99% that the evidence does not support.',
      'Commits to something checkable: an error analysis by field and vendor within two weeks to see how much is fixable (formats, templates, scans), with a checkpoint and the figures reported honestly.',
      'Says openly that the model alone may not reach 99% and names the fallback options (narrower scope, human review of a share, a different approach). Does not blame the model or the data.',
      'Asks that the human baseline be measured too, since manual entry also has errors, and does not invent a figure for it.',
    ],
    followUps: [
      {
        q: 'The COO says, “A competitor told us they can do 99%.” How do you respond?',
        lookFor: 'Does not disparage the competitor. Asks on whose data and how it was measured, and invites a fair comparison on a held-out set of the customer’s own invoices.',
      },
      {
        q: '“Can’t you just use a bigger model?” What do you say?',
        lookFor: 'It may help, so test it as a bounded experiment on the same test set with cost and latency recorded and a stop rule, rather than promising it. Says which error types a bigger model is unlikely to fix (unreadable scans, missing data).',
      },
      {
        q: 'Two weeks later you are at 93%. What do you bring to the next meeting?',
        lookFor: 'The honest number with its interval, what moved it, what remains, and options: ship with review for the uncertain share, narrow the scope to the invoice types that clear the bar, or stop. Lets the customer decide with the evidence.',
      },
    ],
    redFlags: [
      'Says “we will get there” with no basis.',
      'Gets defensive or technical and never addresses the auditors’ need.',
      'Quotes 87% as exact, with no interval or sample size.',
      'Offers to “tune the model” as the whole plan.',
    ],
    lessons: ['evals/evals-101', 'systems/human-in-the-loop-design', 'ml/is-the-difference-real'],
  },
  {
    id: 'fde-agent-writes-to-legacy-system',
    prompt:
      'The customer wants your assistant to do more than draft purchase-order updates: they want it to write them directly into a 20-year-old ERP (enterprise resource planning) system that has a nightly batch import, no test environment and a single API user with broad rights. Design the integration and the roll-out.',
    roles: ['fde'],
    level: 'senior',
    kind: 'design',
    topics: ['integration', 'agents', 'safety', 'rollout'],
    minutes: 20,
    strong: [
      'Starts with read-only and suggest-only, then moves to approved writes, then to narrow autonomous writes, and ties each step to evidence. Tiers the actions by value and reversibility, so reversible low-value changes come first.',
      'Does not let the agent hold the broad credential. Puts a thin gateway service in between that exposes only narrow operations (create draft change, submit change within limits), and enforces the permission boundary in code, not in the prompt.',
      'Validates in code with the same rules a human entry would face: schema, allowed ranges, referential checks, duplicate detection, and an idempotency key so a retry cannot create a second order.',
      'Shows a preview or diff and ties the approval to the exact change. Keeps an audit record of who or what proposed it, the inputs, the model and prompt versions, and who approved.',
      'Compensates for having no test environment: runs in shadow mode for several weeks, where the system proposes the entries and compares them with what humans actually entered, with nothing written. Measures match rate, rejection reasons and the cost of the mismatches.',
      'Plans for the batch import: writes land in a queue and show up the next day, so reads can be stale and the agent must not assume a write took effect. Reconciles after each import.',
      'Adds a kill switch, rate and value caps, an on-call owner, a rollback or reversal procedure for the ERP, and a reconciliation report. Says who gets paged at 2 a.m.',
    ],
    followUps: [
      {
        q: 'IT says the single broad API user cannot be changed. What do you do?',
        lookFor: 'Keeps the credential inside the gateway, never in the agent or its tools, limits the exposed operations, logs everything, documents the remaining risk in writing for the customer, and raises a request to narrow the account over time.',
      },
      {
        q: 'Shadow mode shows a 97% match with human entries. Do you turn on writes?',
        lookFor: 'Not by that number alone. Looks at what the 3% are: their value, reversibility and whether they cluster in certain suppliers. Starts with low-value reversible entries, keeps approval for the rest, and sets promotion criteria with intervals.',
      },
      {
        q: 'At 2 a.m. the agent has created 40 wrong orders. What happens?',
        lookFor: 'The kill switch stops writes, the on-call person follows a runbook to list the affected entries from the audit log, reverses them before the import window if possible, informs the owners, and a blameless review adds a limit or a test.',
      },
    ],
    redFlags: [
      'Gives the agent the broad API credential directly.',
      'Relies on the prompt to stop it making large or duplicate orders.',
      'Turns on writes in production with no shadow period or evidence.',
      'Ignores the batch delay and assumes writes are immediate.',
    ],
    lessons: ['rag-agents/agents-and-tool-use', 'systems/human-in-the-loop-design', 'rag-agents/designing-tools-for-agents', 'evals/guardrails-in-practice'],
  },
  {
    id: 'fde-handover-and-leaving-the-customer-team',
    prompt:
      'Your embedded engagement ends in three weeks. The pilot succeeded and the customer’s three-person platform team will run the system. What do you hand over, and how do you know they can run it without you?',
    roles: ['fde'],
    level: 'senior',
    kind: 'design',
    topics: ['handover', 'operations', 'documentation', 'customer-facing'],
    minutes: 15,
    strong: [
      'Treats the handover as a deliverable with a plan from the start, not a document in the last week. The aim is that nothing important lives only in the head of the person leaving.',
      'Hands over runbooks (deploy, roll back, pin model versions, rotate keys, what each alert means), an architecture and data-flow description, and a cost model with the levers that change it.',
      'Hands over the evaluation set and a one-command way to re-run it, with the current baseline and thresholds. This is what lets them change a prompt or model safely after you leave.',
      'Moves everything into the customer’s own accounts and repositories: versioned configuration (prompts, model IDs, index settings), CI with the eval gate, dashboards and alerts, secrets and identities. No personal keys, notebooks only you can run, or tools on your laptop.',
      'Writes an honest list of known limits, failure modes, open bugs and a dated list of external dependencies, such as a model retirement, so the owners are not surprised.',
      'Tests the handover instead of trusting it: for the last week, they operate and you watch. They deploy a prompt change through the gate, roll back, add an eval case and debug a trace on their own. A short game day with a simulated incident shows the gaps.',
      'Agrees what happens after: a named owner and on-call, a limited support window with a clear end, and a path for paid help.',
    ],
    followUps: [
      {
        q: 'The platform team says they are stretched and will not have time to learn the system. What do you do?',
        lookFor: 'Raises it with the sponsor now: either the team is staffed or the scope is reduced. A simpler system they can own beats a clever one they cannot, so considers managed services and removing moving parts. Does not quietly keep running it.',
      },
      {
        q: 'Two months after you leave, the customer messages that quality has dropped. What do you do?',
        lookFor: 'Points to the runbook and the eval, helps diagnose within the agreed support window, and looks for what changed (model version, documents, prompt). Then asks what the handover missed and fixes it for the next engagement.',
      },
      {
        q: 'Which parts of what you built would you simplify now, to make it easier to hand over?',
        lookFor: 'Removes custom glue, extra services and clever orchestration that only one person understands, and pins versions. Names specific parts and the reason, and accepts a slightly weaker system if it is easier to run.',
      },
    ],
    redFlags: [
      'Plans to “write the documentation in the last week”.',
      'Leaves keys, notebooks or scripts that only the departing engineer can use.',
      'Measures a good handover by the amount of documentation, not by what the team can do alone.',
      'Offers unlimited informal support so that the customer never has to learn it.',
    ],
    lessons: ['evals/llmops-in-production', 'systems/from-notebook-to-production', 'systems/testing-and-deploying-ml-models'],
  },

  // ---------------------------------------------------------------------------
  // AI solutions architect / pre-sales engineer
  // ---------------------------------------------------------------------------
  {
    id: 'sa-explain-rag-to-a-non-technical-buyer',
    prompt:
      'You have two minutes with a customer’s head of legal, who is not technical. They ask: “How can an AI assistant answer questions about our own contracts without us handing them over so a model can learn from them?” Explain retrieval-augmented generation (RAG) in plain words, and say what you would say about their data.',
    roles: ['solutions-architect'],
    level: 'junior',
    kind: 'concept',
    topics: ['rag', 'communication', 'customer-facing', 'privacy'],
    minutes: 8,
    strong: [
      'Uses a plain picture, such as an open-book exam: the assistant first looks up the relevant passages in their own documents, then writes an answer using only those passages. It does not need to have memorised the contracts.',
      'Says clearly that using retrieval does not retrain the model. The documents stay in their store; the relevant passages are sent along with the question at the moment it is asked.',
      'Explains the data point honestly: because passages are sent to a model at question time, what matters is where that model runs and the provider’s terms on retention and training. Says these are confirmed in writing for the exact service, not improvised on the call. This is not legal advice.',
      'Mentions citations: each answer points to the passage it used, so a lawyer can check it. Says that if the right passage is not found, the answer will be weak, and the assistant should say it could not find it.',
      'Mentions permissions: the search should only look at documents the asking person is allowed to open, and that can be tested.',
      'Is honest about limits: it can still be wrong, so high-stakes use needs review. Avoids jargon such as embeddings and vectors, or defines them in one line.',
      'Ends with a next step the customer can say yes to, such as a small demo on ten contracts they choose.',
    ],
    followUps: [
      {
        q: '“Does it learn from our documents over time?”',
        lookFor: 'No, not by default. Retrieval looks documents up each time and nothing changes in the model. Learning would be a separate, deliberate step such as fine-tuning or stored memory, with its own data and privacy questions.',
      },
      {
        q: '“Can you guarantee it never makes things up?”',
        lookFor: 'No, and says so plainly. Describes what reduces the risk (retrieval, citations, saying “not found”, review for important answers) and offers to measure the error rate on their own questions.',
      },
      {
        q: '“What if a junior associate could see a partner-only contract through the assistant?”',
        lookFor: 'Permissions must be applied at retrieval, on the user’s identity, so the document never reaches the model for that user. Proposes testing with accounts of different access levels and checking how quickly access changes take effect.',
      },
    ],
    redFlags: [
      'Answers with jargon (embeddings, vector database, tokens) and loses the listener.',
      'Says “your data is completely safe” with no specifics.',
      'Claims the assistant will not be wrong.',
      'Says the model “learns” from their documents.',
    ],
    lessons: ['rag-agents/rag-from-scratch', 'start/how-apps-use-ai', 'cloud/cloud-security-and-networking-for-ai'],
  },
  {
    id: 'sa-do-you-train-on-our-data',
    prompt:
      'A prospect’s procurement form asks: “Will our data be used to train your models or anyone else’s?” You are on the call. What is a good answer, and what is a bad one?',
    roles: ['solutions-architect', 'fde'],
    level: 'junior',
    kind: 'concept',
    topics: ['privacy', 'security', 'compliance', 'customer-facing'],
    minutes: 8,
    strong: [
      'Does not answer from memory or marketing. Separates the parties: your own company, the cloud or model provider, and any other subprocessors, since each has its own terms.',
      'Reads the current terms for the exact service and features: prompts, outputs, fine-tuning data, feedback, logs and caching can each be treated differently, and preview features may differ from general ones.',
      'Gives a precise, dated, sourced answer and points to the documentation or contract clause. “Not used to train” is a different claim from “not stored”, and the answer says which one is meant.',
      'Names the caveats that real terms contain, for example abuse monitoring with a retention period, the customer’s own logging, and fine-tuned models, and says what the customer can control (turning off logging, redaction, retention windows).',
      'Offers to put the commitment in the contract. Leaves the legal wording to legal teams and says this is not legal advice.',
      'If unsure, says “I will confirm that in writing by Friday” and does. A late right answer beats a quick wrong one.',
    ],
    followUps: [
      {
        q: 'They ask for a blanket statement that data is “never stored anywhere”. What do you say?',
        lookFor: 'Does not promise it. Zero retention is not one switch: lists each feature in use and what it keeps, for how long and where, and commits only to what can be verified and disabled.',
      },
      {
        q: 'Next year the model provider changes its terms. How do you protect the customer?',
        lookFor: 'Asks for notice of changes in the contract, pins versions and regions where possible, schedules a re-review of the provider’s terms, and keeps the data map up to date.',
      },
      {
        q: 'Your sales colleague says, “Just tick yes, it is fine, we will sort it out later.” What do you do?',
        lookFor: 'Refuses to overstate, explains that the cost of a false statement is much higher than a few days’ delay, escalates to legal and the sales lead, and offers a quick, accurate answer instead.',
      },
    ],
    redFlags: [
      'Says “no, never” with no source or date.',
      'Mixes up the model provider, the cloud and the vendor’s own platform.',
      'Ignores logs, caching and fine-tuning data.',
      'Treats it as a sales form to fill in rather than a commitment.',
    ],
    lessons: ['cloud/cloud-security-and-networking-for-ai', 'responsible/privacy-engineering-for-ai', 'local/private-and-air-gapped-ai'],
  },
  {
    id: 'sa-live-demo-goes-wrong',
    prompt:
      'Role-play: in a live demo for a prospect, the assistant gives a confidently wrong answer to the customer’s first question, in front of eight people including their chief information security officer. What do you do in the next minute, and how would you have prepared to make this less likely?',
    roles: ['solutions-architect'],
    level: 'junior',
    kind: 'behavioural',
    topics: ['behavioural', 'demos', 'communication', 'evals'],
    minutes: 10,
    strong: [
      'Stays calm and owns it in one sentence. Does not hide the error, blame the customer’s question, or quietly re-run until it works, because that is cherry-picking.',
      'Turns it into evidence: shows the source the assistant cited, shows that it does not support the answer, and shows how the system is meant to catch this, such as an “I could not find it” response, a human review step or feedback and logging.',
      'Says plainly that this is why the product is measured and why high-stakes answers need checks. Offers to show how the failure categories are tracked.',
      'Follows up in writing within a day: what happened (from the trace), the cause, and what was changed. Does not leave the customer to wonder.',
      'Prepares beforehand: rehearses with realistic and awkward questions, pins the model and data versions, tests the network and the quotas, keeps a recorded fallback, and shows a small eval summary with known failure types in the demo.',
      'Sets expectations at the start: this is a live system that is sometimes wrong, and here is how it is evaluated. Does not present a scripted path as unscripted.',
    ],
    followUps: [
      {
        q: 'The security officer says, “So this is not production-ready?” How do you respond?',
        lookFor: 'Separates a demo from a production claim. Describes what evidence a production decision needs (an agreed test set, thresholds, controls), proposes a proof of concept with those criteria, and does not defend the demo.',
      },
      {
        q: 'A colleague suggests pre-loading the exact questions the customer will ask. Is that acceptable?',
        lookFor: 'Rehearsing is fine and sensible; presenting rehearsed answers as live capability is not. Discloses what was prepared and invites unscripted questions in a controlled way.',
      },
      {
        q: 'Later you find the wrong answer was caused by a bug in your retrieval filter. How do you tell the customer?',
        lookFor: 'Reports the root cause plainly and promptly, says what changed and how it will be tested, and does not present the bug as the model’s inevitable weakness or hide that it was your fault.',
      },
    ],
    redFlags: [
      'Blames the question or the customer’s data.',
      'Re-runs the demo until the answer looks right and moves on.',
      'Claims it “never does this”.',
      'Panics or ends the demo with no follow-up.',
    ],
    lessons: ['evals/why-models-make-things-up', 'evals/evals-101', 'systems/ux-for-ai-features'],
  },
  {
    id: 'sa-reference-architecture-internal-assistant',
    prompt:
      'A 5,000-person company, already standardised on one public cloud, wants an internal assistant that answers questions over its document library and ticketing system, respects each person’s permissions, and must not send data over the public internet. Sketch the reference architecture you would present, name the decisions you would explain, and list the questions you ask before drawing it.',
    roles: ['solutions-architect'],
    level: 'mid',
    kind: 'design',
    topics: ['architecture', 'rag', 'security', 'cloud'],
    minutes: 20,
    strong: [
      'Asks before drawing: which sources and how much data, how permissions are defined and synced, expected users and peaks, latency needs, languages, compliance and residency, identity and single sign-on, who will run it, and what success looks like.',
      'Shows the main blocks and why each exists: ingestion and parsing with metadata (including access lists), a hybrid index (keyword plus vector), a query layer that filters by the user’s groups at retrieval time, a model gateway, orchestration (a single call or fixed workflow before any agent), output checks, logging and tracing, an evaluation pipeline, and a front end with sign-on.',
      'Maps the blocks to the customer’s cloud using its managed model service, search or vector store, identity, private connectivity and key management, and checks that each feature is supported for the chosen model and region before promising it.',
      'Covers security explicitly: one identity per application with least privilege, private endpoints so there is no public path, customer-managed keys where required, residency scope chosen on purpose, audit logs on, and a deliberate decision about logging prompt content.',
      'Names the decisions with trade-offs: managed versus self-run vector store, which model per quality, cost and latency measured on their data, caching, and how to avoid lock-in with a thin gateway and a portable evaluation set.',
      'Plans capacity and cost: tokens per minute at peak, quotas and the lead time to get them, a fallback model, and a cost estimate with ranges.',
      'Phases the work (proof of concept, pilot, production), lists what version one will not do (for example, actions that write to other systems), and says how each phase is judged.',
    ],
    followUps: [
      {
        q: 'Some source systems have no usable access lists. What do you do?',
        lookFor: 'Does not guess. Defaults to deny, ingests only content that can be labelled, or asks the owner to define access first. Also designs for permission changes: revoked access must disappear from the index within an agreed time, and tests it.',
      },
      {
        q: 'The CTO asks, “Why not just fine-tune a model on all our documents instead?”',
        lookFor: 'Fine-tuning is poor at adding reliable, changing facts, cannot show sources, cannot enforce per-user permissions and makes deletion hard. Retrieval first; fine-tune only for a measured behaviour gap.',
      },
      {
        q: 'They want it live in eight weeks. What do you cut?',
        lookFor: 'Narrows to one or two sources and one user group, defers write actions and extra languages, keeps the security controls and the evaluation, and agrees what the first release must prove.',
      },
    ],
    redFlags: [
      'Draws boxes without asking about data, permissions or volume.',
      'Applies permissions in the prompt (“only show what the user may see”).',
      'Proposes an agent with write access in version one.',
      'Names no evaluation or capacity plan.',
    ],
    lessons: ['systems/rag-service-architecture', 'systems/llm-app-system-design', 'cloud/cloud-ai-service-map', 'cloud/cloud-security-and-networking-for-ai'],
    game: { label: 'Design under constraints in Blueprint', href: '/play/blueprint/' },
  },
  {
    id: 'sa-sizing-tokens-cost-and-peak-tpm',
    prompt:
      'A customer will give an internal assistant to 2,000 daily active users, each sending about 6 questions a day. A typical call has 3,000 input tokens (instructions, retrieved passages, history) and 400 output tokens. Use an example price of $3 per million input tokens and $15 per million output tokens, 22 working days a month, and assume 20% of a day’s traffic lands in the busiest hour. Estimate the monthly bill and the peak tokens per minute you need quota for, and say what would change the numbers.',
    roles: ['solutions-architect'],
    level: 'mid',
    kind: 'estimation',
    topics: ['cost', 'sizing', 'quotas', 'estimation'],
    minutes: 15,
    strong: [
      'Computes the cost of one call: 3,000 × $3 ÷ 1,000,000 = $0.009 for input and 400 × $15 ÷ 1,000,000 = $0.006 for output, so $0.015 a call. Notes that output is only about 12% of the tokens (400 of 3,400) but 40% of the cost.',
      'Scales it: 2,000 × 6 = 12,000 calls a day, so $180 a day and 22 × $180 = $3,960 a month at the example prices.',
      'Computes the peak: 20% of 12,000 = 2,400 calls in the busiest hour, which is 40 a minute, so 40 × 3,400 = 136,000 tokens per minute. Adds headroom for bursts and retries (for example 2×, about 272,000), and says the factor is a planning choice. The busiest single minute can be well above the hourly average.',
      'Says the prices are placeholders to be replaced by the customer’s real rate card, and that the answer should be shown as a low, expected and high case.',
      'Names what moves the numbers: growth in users, longer conversations (history is resent on each turn), deeper retrieval, extra steps if an agent is used, and costs outside the model such as search, hosting, ingestion and evaluation. Checks these against the whole bill.',
      'Names the levers: caching a stable prompt prefix, trimming retrieved passages and history, a smaller model for easy questions, and an output cap. Validates the 3,000-token figure by running real queries in a pilot and reading the usage counts.',
    ],
    followUps: [
      {
        q: 'Adoption triples in six months and prompts grow to 5,000 input tokens. What is the new monthly bill?',
        lookFor: 'Cost per call is 5,000 × $3 ÷ 1,000,000 + $0.006 = $0.021. Calls are 36,000 a day, so $756 a day and 22 × $756 = $16,632 a month, about 4.2 times the original. Shows that prompt growth and adoption multiply.',
      },
      {
        q: 'The customer wants a fixed price for the model usage. What do you offer?',
        lookFor: 'Does not guarantee a flat price for usage-based costs. Offers a budget with alerts and caps, a range with the assumptions, and a review point after the pilot gives measured usage.',
      },
      {
        q: 'How would you check the 3,000-token estimate before committing?',
        lookFor: 'Runs a few hundred realistic queries through the proposed design, records input and output tokens from the usage fields, and looks at the spread (the tail matters, not only the mean) and at conversations of several turns.',
      },
    ],
    redFlags: [
      'Prices only input tokens and forgets that output costs more per token.',
      'Quotes the average rate and ignores the peak.',
      'Presents example prices as current list prices.',
      'Gives a single figure with no range or assumptions.',
    ],
    lessons: ['cost/where-the-tokens-go', 'cost/cost-levers', 'llm/context-window-and-caching'],
    game: { label: 'Practise estimating costs in Cost Crunch', href: '/play/cost-crunch/' },
  },
  {
    id: 'sa-launch-day-quota-and-throttling',
    prompt:
      'A customer plans to switch an assistant on for 30,000 employees one morning, after a company-wide email. The default on-demand quota for the chosen model in their region is, as an example, 200,000 tokens per minute and 300 requests per minute. Assume 3,000 people try it in the first 15 minutes, each asking 3 questions of about 3,400 tokens per call. Will it hold, and what do you recommend?',
    roles: ['solutions-architect'],
    level: 'mid',
    kind: 'estimation',
    topics: ['quotas', 'capacity', 'launch planning', 'estimation'],
    minutes: 15,
    strong: [
      'Computes the load: 3,000 × 3 = 9,000 calls in 15 minutes, which is 600 requests per minute, twice the 300 limit. Tokens: 9,000 × 3,400 = 30.6 million in 15 minutes, which is 2.04 million per minute, about ten times the 200,000 limit.',
      'Shows what happens: throttled requests (HTTP 429) queue or fail. At 200,000 tokens per minute the backlog takes 30.6 million ÷ 200,000 = 153 minutes to clear, so users wait, retry, and make it worse. A 429 is normal behaviour, not a bug to be surprised by.',
      'Separates quota (a permission limit) from capacity (real hardware): files the quota increase early because approvals can take days, and verifies capacity by creating the deployment in a test, since quota does not guarantee it.',
      'Recommends staged roll-out by department in small waves. Checks the arithmetic: about 250 users per 15-minute wave gives 250 × 3 × 3,400 ÷ 15 ≈ 170,000 tokens per minute, under the example limit.',
      'Combines capacity types: reserved or provisioned throughput for the steady baseline, on-demand for spikes, a router or fallback model, and cross-region routing only if the residency rules allow it.',
      'Handles the client side properly: a queue with exponential backoff and jitter, per-user rate limits, a clear message in the interface instead of silent spinning, and cached answers for common first questions.',
      'Load-tests with a realistic mix before launch and watches throttle rates and latency on the day.',
    ],
    followUps: [
      {
        q: 'The customer asks you to “just ask the provider to raise the quota to 3 million per minute”. What do you tell them?',
        lookFor: 'It may or may not be granted, and approval is not capacity. Asks early, has a plan B (smaller waves, another region or model, provisioned capacity), and does not make the launch date depend on an answer nobody controls.',
      },
      {
        q: 'You buy reserved capacity sized for the launch-morning peak. What is the risk?',
        lookFor: 'Reserved capacity costs the same when idle, so sizing for a one-off peak wastes money for months. Sizes reserved capacity for the steady baseline and lets on-demand and staging absorb the peak, then measures utilisation after launch.',
      },
      {
        q: 'Why is a staged roll-out by department not enough by itself?',
        lookFor: 'If a wave is large, its 15-minute spike can still exceed the quota (3,000 users per wave is still 2.04 million tokens per minute). Wave size has to be set from the arithmetic, not from the org chart.',
      },
    ],
    redFlags: [
      'Plans from daily averages and ignores the first-day spike.',
      'Treats quota and capacity as the same thing.',
      'Has no queue, backoff or user-facing message for a 429.',
      'Promises the launch date before the quota is confirmed.',
    ],
    lessons: ['cloud/quotas-capacity-and-regions', 'systems/model-routing-and-fallbacks', 'cost/semantic-caching-and-batch-apis'],
    game: { label: 'Practise estimating costs in Cost Crunch', href: '/play/cost-crunch/' },
  },
  {
    id: 'sa-data-residency-question',
    prompt:
      'A European customer says: “Our prompts must stay in the EU.” They have chosen a managed model API on one of the three big clouds. What exactly do you check, and what do you tell them, including the trade-off with capacity?',
    roles: ['solutions-architect'],
    level: 'mid',
    kind: 'concept',
    topics: ['residency', 'compliance', 'cloud', 'capacity'],
    minutes: 12,
    strong: [
      'Asks what rule they must meet, because “EU”, a single country, a contractual promise and a legal requirement are different, and the answer changes the design. Sends legal interpretation to their counsel. This is not legal advice.',
      'Separates where data is stored from where it is processed. Checks the deployment scope: regional versus broader deployment types on one cloud, regional versus global endpoints on another, and cross-region inference profiles that can route requests to other Regions on a third. Chooses the region-bound option.',
      'Confirms per model and per feature, because availability, routing and retention can differ: caching, logging, abuse monitoring, fine-tuned models, search grounding and preview features.',
      'Counts every other copy of the data: application logs, traces, the vector index, backups, telemetry sent to monitoring tools, and support access.',
      'Explains the capacity trade-off: a narrower scope can mean lower quotas, fewer models and newer models arriving later, so quota and a fallback within the region must be planned.',
      'Produces evidence, such as links to the documentation and an export of the configuration, and sets a date to re-check when the provider changes its terms or regions.',
    ],
    followUps: [
      {
        q: 'The best-scoring model for their task is only offered through a global endpoint. What are the options?',
        lookFor: 'Use an in-region model that passes the evaluation, ask whether a regional option is coming, use self-hosted open weights in the region, or ask the customer’s legal team whether this use is acceptable. Does not route quietly.',
      },
      {
        q: 'Your application logs, including prompt text, go to a monitoring service hosted outside the EU. Is that a problem?',
        lookFor: 'Yes, logs are part of the data flow. Redacts or removes content before export, keeps logs in region, or switches to a regional monitoring option, and adds this to the data-flow diagram.',
      },
      {
        q: 'The customer says, “Keep it in Germany.” What changes?',
        lookFor: 'Checks whether the model and the features exist in a region there, notes that availability and capacity may be narrower, asks about sovereign or dedicated offerings without assuming they exist, and reports what the documentation says as of a date.',
      },
    ],
    redFlags: [
      'Says “it is hosted in the EU” without checking the deployment type.',
      'Confuses stored location with processed location.',
      'Forgets logs, indexes and backups.',
      'Gives a legal opinion.',
    ],
    lessons: ['cloud/cloud-security-and-networking-for-ai', 'cloud/quotas-capacity-and-regions', 'responsible/ai-rules-around-the-world'],
  },
  {
    id: 'sa-poc-scope-and-exit-criteria',
    prompt:
      'A prospect wants a proof of concept (PoC) for a contract-review assistant. Sales has already told them “four weeks, free”. What do you put in the PoC plan so that it proves something, ends on time, and does not turn into unpaid delivery?',
    roles: ['solutions-architect', 'fde'],
    level: 'mid',
    kind: 'design',
    topics: ['poc', 'pilot scoping', 'success criteria', 'pre-sales'],
    minutes: 15,
    strong: [
      'Starts from one question the PoC must answer, for example “can it find five named clause types in our contracts accurately enough to save reviewer time?”. A PoC that tries to prove everything proves nothing.',
      'Narrows the scope: one use case, one slice of data, no production integration and no single sign-on unless it is the thing being tested.',
      'Agrees success criteria in writing before starting: the metric, a test set provided and labelled by the customer and held out from tuning, the threshold, and what happens on a near miss.',
      'States who provides what and by when: data in week one, a named expert for labelling, security approvals and a named decision maker. If the customer’s inputs arrive late, the clock pauses or the scope narrows, and the evaluation is not compressed.',
      'Defines the deliverables: an evaluation report, an architecture and cost estimate for production, and a risk list, not software the customer runs for free.',
      'Includes a decision date and the path afterwards (pilot, production, stop), so a good result leads to a paid next step with sizing.',
      'Checks whether a PoC is needed at all: an existing product, a reference customer or a short test on public data may answer the question faster.',
    ],
    followUps: [
      {
        q: 'The customer’s data arrives in week three instead of week one. What do you do?',
        lookFor: 'Does not silently compress the evaluation. Resets the plan: pauses the clock, shrinks the scope or extends the date, records the change, and tells the decision maker what the delay costs.',
      },
      {
        q: 'The result is 83% against an agreed 85%, on 200 cases. What does that tell you?',
        lookFor: 'An interval of roughly 77% to 88% includes the target, so the result is inconclusive, not a failure or a pass. Follows the rule agreed in advance (extend, narrow or stop), shows which errors are fixable, and does not move the goalposts.',
      },
      {
        q: 'Sales promises the customer a production-ready system “if the PoC goes well”. How do you handle this?',
        lookFor: 'Clarifies in writing what a good PoC result does and does not imply, and aligns with sales on what has been promised. Production needs its own plan, security review, capacity and price.',
      },
    ],
    redFlags: [
      'Agrees to “prove it works” with no definition of working.',
      'Lets the customer choose the demo data after seeing results.',
      'Delivers a custom integration inside a free PoC.',
      'Has no decision date or no named decision maker.',
    ],
    lessons: ['systems/when-not-to-use-an-llm', 'evals/building-an-eval-dataset', 'evals/evals-101'],
  },
  {
    id: 'sa-customer-says-just-fine-tune',
    prompt:
      'A customer’s CTO says: “We will fine-tune a model on all our documents so it knows our business. That is cheaper than building retrieval.” How do you respond, and what do you propose instead or as well?',
    roles: ['solutions-architect'],
    level: 'mid',
    kind: 'concept',
    topics: ['fine-tuning', 'rag', 'build vs buy', 'objection handling'],
    minutes: 12,
    strong: [
      'Starts by asking what problem they are trying to solve, and respects the idea. Then separates what each approach changes: prompting changes instructions, retrieval supplies facts at question time, and fine-tuning mostly changes behaviour, style, format or a narrow skill.',
      'Explains why fine-tuning is a weak way to add facts: facts change and the model does not know when, answers cannot cite sources, per-user permissions cannot be enforced inside the weights, and removing a document later is hard once it has been trained in.',
      'Says fine-tuning is not free: data preparation, evaluation, hosting a custom model, and retraining when the base model is replaced or retired.',
      'Proposes a sensible order: prompt first, retrieval for knowledge, fine-tune only for a gap that has been measured, such as a consistent output format or a smaller, cheaper model on a narrow task.',
      'Makes it testable: build a baseline with prompt and retrieval, run it on the customer’s evaluation questions, look at what kind of failures remain, and only then decide whether fine-tuning addresses them.',
      'Notes that fine-tuning on internal documents also raises privacy questions about what the model may memorise and who can query it.',
    ],
    followUps: [
      {
        q: '“Our terminology is unusual, and the base model does not know it.” What do you do?',
        lookFor: 'Tries a glossary in the prompt or retrieval first, and tests it. If a gap remains in a narrow task such as classification, fine-tuning may be justified. Measures before and after.',
      },
      {
        q: 'What would convince you that fine-tuning is the right move?',
        lookFor: 'A measured gap that persists after prompt and retrieval work, stable labelled data, and a volume or latency case where a small tuned model beats a large general one on cost. A willingness to be proven wrong.',
      },
      {
        q: 'Suppose they fine-tune anyway on files that include personal data. What are your concerns?',
        lookFor: 'Memorisation and leakage, no easy way to delete, access control for who can query the model, data-processing permissions, and the need to run extraction tests. Recommends data minimisation and review before training.',
      },
    ],
    redFlags: [
      'Says “fine-tuning never works” without nuance.',
      'Agrees that fine-tuning is the way to give a model company knowledge.',
      'Dismisses the CTO’s idea instead of testing it.',
      'Ignores permissions and deletion.',
    ],
    lessons: ['llm/prompting-vs-rag-vs-fine-tuning', 'llm/fine-tuning-in-practice', 'rag-agents/rag-from-scratch'],
  },
  {
    id: 'sa-self-host-demand-from-security-team',
    prompt:
      'A bank’s security team says the assistant must run on GPUs in its own data centre: “no API, ever.” Expected demand is 20 million tokens a day. Use these example figures: a GPU costs $4 an hour, aggregate throughput is 1,500 tokens per second per GPU when busy, an equivalent API would cost $1 per million tokens (blended), and you want two GPUs for redundancy. Work out the unit cost of self-hosting, compare it with the API, and say how you handle the conversation.',
    roles: ['solutions-architect'],
    level: 'senior',
    kind: 'estimation',
    topics: ['self-hosting', 'cost', 'security', 'estimation'],
    minutes: 20,
    strong: [
      'Computes demand: 20,000,000 ÷ 86,400 ≈ 231 tokens per second on average. Two GPUs give 3,000 tokens per second, so average utilisation is about 7.7%. Says peak demand is higher than the average, so capacity must cover the peak, but the GPUs are mostly idle.',
      'Computes cost: 2 × $4 × 730 hours = $5,840 a month. Tokens a month: 20 million × 30 = 600 million. So $5,840 ÷ 600 = about $9.73 per million tokens, roughly 9.7 times the $1 API price, which would be about $600 a month for the same volume.',
      'Adds what the GPU price leaves out: engineers, on-call, security work, upgrades, evaluation of each new model, and lead time to get hardware. Says the figures are examples and that real quotes and a measured throughput test must replace them.',
      'Does not simply say no. Finds out what “no API” protects: data leaving the building, third-party processing, a regulator’s expectation or an internal policy. A private endpoint in the bank’s own cloud tenancy or a dedicated deployment might meet the real concern, or might not; the customer decides.',
      'Says that for a hard requirement, compliance can outweigh cost, and shows how to improve the economics: consolidate more workloads onto the same GPUs, schedule batch work in the quiet hours, right-size the model, and use quantization after measuring quality.',
      'Notes that an open-weights model must pass the customer’s own evaluation and licence review, since it may be weaker than the API model for the task, and that model-weight supply chain security applies.',
      'Presents the options as a cost and risk table with stated assumptions, to security and finance together.',
    ],
    followUps: [
      {
        q: 'What utilisation would make self-hosting cost the same as the $1 API?',
        lookFor: 'At $5,840 a month the break-even is 5,840 million tokens a month. Two GPUs at full utilisation produce 3,000 × 3,600 × 730 ≈ 7.88 billion tokens a month, so the break-even is about 74% utilisation, far above the 7.7% in this case.',
      },
      {
        q: 'Security would accept a managed service as long as it runs in their own cloud account and no data leaves their tenancy. What now?',
        lookFor: 'This is much cheaper to run and faster to start. Checks that the chosen model and features are available there, that private connectivity and keys are in place, and that the retention terms satisfy the bank’s policy, in writing.',
      },
      {
        q: 'What do you say to the question, “Will the self-hosted model be as good?”',
        lookFor: 'Not necessarily. Offers to run the customer’s own evaluation questions on candidate open models before any purchase and to report the gap, with the cost of closing it (a larger model, more GPUs, fine-tuning).',
      },
    ],
    redFlags: [
      'Compares a GPU’s hourly price with an API’s per-token price without utilisation.',
      'Says self-hosting is always cheaper, or always more expensive.',
      'Argues with the security requirement instead of asking about it.',
      'Presents example figures as quotes.',
    ],
    lessons: ['local/self-hosting-vs-api-economics', 'local/private-and-air-gapped-ai', 'cost/cost-levers'],
    game: { label: 'Practise estimating costs in Cost Crunch', href: '/play/cost-crunch/' },
  },
  {
    id: 'sa-rfp-demands-no-hallucination-guarantee',
    prompt:
      'An RFP (request for proposal) says: “Vendor must guarantee that the AI never gives an incorrect answer and accept unlimited liability for AI errors.” Your sales lead wants to answer “yes, with our guardrails”. What do you do?',
    roles: ['solutions-architect', 'ai-lead'],
    level: 'senior',
    kind: 'behavioural',
    topics: ['behavioural', 'pre-sales', 'expectations', 'risk'],
    minutes: 15,
    strong: [
      'Refuses to sign up to a guarantee nobody can honestly make. Explains why in plain terms: language models produce fluent, plausible mistakes, and every control lowers the rate without removing it.',
      'Offers what can be committed to and measured: accuracy on an agreed test set, grounding with citations, the ability to say “not found”, human review for high-stakes answers, monitoring, and incident response times.',
      'Reframes the requirement behind the clause: the buyer is worried about harm from wrong answers. Designs the scope and controls around that, for example decision support rather than automated decisions, with a person accountable.',
      'Recognises that liability and contract wording are for legal and business leaders, not for the architect to decide. Flags the clause early and in writing to sales leadership and legal, instead of quietly accepting it.',
      'Writes a clear response that states what is measured, how and what is not covered. Does not hide caveats in fine print, because an overpromise turns into a dispute or a lost customer later.',
      'Proposes a pilot with agreed metrics so that the numbers are grounded, and is willing to lose the deal rather than win it on a promise the product cannot keep.',
      'Works with the sales lead as a partner, explaining the risk in terms of the deal: a false “yes” becomes the customer’s first complaint.',
    ],
    followUps: [
      {
        q: 'The sales lead says, “Every competitor will say yes.” How do you answer?',
        lookFor: 'Someone who says yes will face the audit and the complaint later. Offers a differentiated answer: measured results on the customer’s own data, transparent limits, and a safer design. Accepts that it may cost the deal.',
      },
      {
        q: 'Procurement insists on one number: “What accuracy will you commit to?”',
        lookFor: 'Only on their data after measurement. Gives a measured range with its sample size and interval from the pilot, framed as a target with a remedy process (and leaves exact contract wording to legal), not as a guarantee.',
      },
      {
        q: 'After a softer clause is agreed, the customer’s champion tells their executives the product is “99% accurate”. What do you do?',
        lookFor: 'Corrects it promptly and in writing, shares the measured figures with their conditions, and makes the correct statement easy to repeat, for example a one-page summary.',
      },
    ],
    redFlags: [
      'Says “yes, with guardrails” to avoid a difficult conversation.',
      'Negotiates liability terms alone.',
      'Writes an answer full of technical caveats nobody will read, or hides the issue in an appendix.',
      'Treats the clause as pure sales theatre that can be ignored.',
    ],
    lessons: ['evals/why-models-make-things-up', 'responsible/human-oversight-and-when-ai-should-not-decide', 'evals/evals-101'],
  },
  {
    id: 'sa-build-vs-buy-tco',
    prompt:
      'A customer’s AI team wants to build its own document-processing platform. A vendor sells one for an example $90,000 a year. Use these example figures: building takes 2 engineers for 4 months at a loaded cost of $15,000 per engineer-month, then half of one engineer ($180,000 a year loaded for a full engineer) to maintain it, plus $24,000 a year of infrastructure. Buying needs one engineer-month of integration. Compare the three-year costs and say what else decides the question.',
    roles: ['solutions-architect', 'ai-lead'],
    level: 'senior',
    kind: 'estimation',
    topics: ['build vs buy', 'cost', 'tco', 'decision making'],
    minutes: 15,
    strong: [
      'Computes the build: 2 × 4 × $15,000 = $120,000 up front. Ongoing: 0.5 × $180,000 = $90,000 plus $24,000 = $114,000 a year, so $342,000 over three years. Total $462,000.',
      'Computes the buy: 3 × $90,000 = $270,000 plus one engineer-month of integration at $15,000 = $285,000. Under these assumptions buying is $177,000 cheaper over three years.',
      'Shows sensitivity because every input is an estimate: if maintenance is only a quarter of an engineer, build is $120,000 + 3 × ($45,000 + $24,000) = $327,000, still above $285,000. If the vendor raises its price by 50% to $135,000, buy is $420,000, still below $462,000. The vendor price at which the two are equal is ($462,000 − $15,000) ÷ 3 = $149,000 a year.',
      'Says the cost table is only part of the decision. Asks whether the capability is core to the business, whether the vendor product meets the requirements on the customer’s own evaluation, and how fast value arrives (months saved by buying).',
      'Covers risks on both sides: build estimates usually run over and models change faster than a small team can track; vendor risks include price changes, usage-based pricing growing with volume, lock-in and exit costs (can data, prompts and evaluations be exported?), and changes to the underlying model.',
      'Includes opportunity cost: what the same engineers would otherwise build, and whether the team’s time is better spent on the layer that differentiates the product.',
      'Suggests a hybrid and a reversible path: buy the commodity layer, build the part that is unique, and keep the evaluation set and data portable so the decision can be revisited.',
    ],
    followUps: [
      {
        q: 'The vendor price is usage-based and volume could grow fivefold. How does that change the analysis?',
        lookFor: 'Models the vendor bill as a function of volume, finds the crossover volume where building wins, asks for volume tiers or a cap, and checks whether the build cost also grows with volume (infrastructure, support).',
      },
      {
        q: 'The team’s real motive is that building is interesting and builds skills. How do you handle that?',
        lookFor: 'Says it out loud and weighs it honestly: learning has value, but so does delivery, and the cost of the opportunity. May suggest building a small part, or a time-boxed experiment, rather than the whole platform.',
      },
      {
        q: 'The vendor’s product calls a third-party model whose price may change. What do you ask for?',
        lookFor: 'Contract protections such as notice periods and price caps, transparency about which model is used and how changes are tested, and an exit plan.',
      },
    ],
    redFlags: [
      'Compares the licence price with the cloud bill only and leaves out engineering time.',
      'Treats the estimates as certain.',
      'Decides from a preference for building or for buying before the numbers.',
      'Ignores exit costs and lock-in.',
    ],
    lessons: ['systems/when-not-to-use-an-llm', 'local/self-hosting-vs-api-economics', 'rag-agents/choosing-ai-libraries'],
    game: { label: 'Practise estimating costs in Cost Crunch', href: '/play/cost-crunch/' },
  },
  {
    id: 'sa-multi-cloud-model-choice',
    prompt:
      'A customer runs most workloads on Cloud A, but the model your team evaluated as best for their use case is offered through Cloud B’s managed service and by the model maker’s own API. Their data lives on Cloud A. How do you frame the options and your recommendation?',
    roles: ['solutions-architect'],
    level: 'senior',
    kind: 'design',
    topics: ['cloud', 'model selection', 'trade-offs', 'architecture'],
    minutes: 20,
    strong: [
      'First challenges the premise: “best” on whose evaluation, at what cost and latency, and by how much? A gap inside the noise is not a reason to cross clouds. Compares models on the customer’s own tasks with intervals.',
      'Lays out the options: a good-enough model in Cloud A, a cross-cloud call to Cloud B, the maker’s own API, a self-hosted open-weights model, or routing so that most traffic stays in Cloud A and only the hard cases go to the best model.',
      'Names the criteria: data classification and contract limits, the extra network hop and its latency, egress charges, a second security review and a second vendor contract, identity federation and private connectivity across clouds, quota and capacity in each place, and which features (caching, batch, tool use, structured output) exist for each model on each platform.',
      'Counts the operational cost of two clouds: two sets of identities and permissions, two monitoring and billing paths, and a second place for an incident to start. Notes that existing commitments or discounts with Cloud A may change the price comparison, to be checked in the contract.',
      'Reduces lock-in with a thin model gateway, portable prompts and evaluation sets, and a record of which provider-specific features are used.',
      'Recommends with conditions: for example “start in Cloud A with the in-cloud model, and move the hardest 10% of cases only if the measured gain is worth the added risk and cost”. Says what evidence would change the recommendation, and re-checks as model catalogues change quickly.',
    ],
    followUps: [
      {
        q: 'The best model scores 88% on 300 cases and the in-cloud model 85%. Is the difference real?',
        lookFor: 'No clear answer from the totals: 264 of 300 has an interval of about 83.8% to 91.2% and 255 of 300 about 80.5% to 88.6%, which overlap a lot. Uses a paired comparison on the same cases, a larger or fresh test set, and weighs the cost of being wrong.',
      },
      {
        q: 'The customer’s cloud team vetoes any cross-cloud traffic. What do you do?',
        lookFor: 'Accepts the constraint and improves the in-cloud result with prompting, retrieval and, if measured, fine-tuning, with a clear statement of the remaining gap and its effect on the use case.',
      },
      {
        q: 'How do you keep the design portable in case the preferred model is withdrawn?',
        lookFor: 'A gateway interface, prompts tested per model, a harness that re-runs the evaluation on any model, avoiding provider-specific features unless the benefit is measured, and a fallback model that has already been tested.',
      },
    ],
    redFlags: [
      'Picks the highest score without checking the margin or the cost.',
      'Ignores security, network and contract consequences of crossing clouds.',
      'Presents a single recommended answer with no conditions.',
      'Builds code that depends on one provider’s special features without noting it.',
    ],
    lessons: ['cloud/cloud-ai-service-map', 'cloud/bedrock-sagemaker-foundry-vertex', 'llm/choosing-and-comparing-models', 'systems/model-routing-and-fallbacks'],
    game: { label: 'Match models to jobs in Fit the Model', href: '/play/fit-the-model/' },
  },

  // ---------------------------------------------------------------------------
  // AI engineering lead / manager
  // ---------------------------------------------------------------------------
  {
    id: 'lead-interview-loop-for-ai-engineer',
    prompt:
      'You need to hire an AI engineer who builds LLM features. Design the interview loop. What signals do you want, how do you test each one, and what do you deliberately avoid?',
    roles: ['ai-lead'],
    level: 'mid',
    kind: 'design',
    topics: ['hiring', 'interviewing', 'team process', 'behavioural'],
    minutes: 15,
    strong: [
      'Starts from the job: what the person will do in their first six months. Lists the signals that matter, such as building and shipping, thinking about evaluation, debugging, product judgment, communication and ownership, and gives each stage one distinct signal so the loop does not repeat itself.',
      'Uses a realistic practical exercise instead of trivia: for example, given a trace of a failing retrieval-based assistant, find the cause and propose a fix; or improve a prompt with a small evaluation set. Time-boxes it and says plainly whether AI tools are allowed.',
      'Includes a design conversation on a real scenario with trade-offs (cost, latency, safety, how they would know it works), and a behavioural interview that asks for specifics and numbers from past projects, not generalities.',
      'Tests evaluation thinking directly with a question such as “How would you know this feature works, and how would you find out it stopped working?”. It separates people who ship demos from people who ship products.',
      'Prepares a scoring rubric before the first interview, with the same questions per role and behaviour-based anchors. Has each interviewer write independent feedback before the debrief to limit anchoring on the loudest voice, and calibrates interviewers.',
      'Avoids puzzles, memorised definitions and questions where the answer is a framework name, and avoids over-weighting pedigree or confident delivery. Looks at the candidate’s level and expects different depth for junior and senior hires.',
      'Keeps the candidate experience respectful: clear instructions, a short loop (for example four to five touchpoints), timely decisions and useful feedback. Tracks later how well the interview predicted performance and adjusts.',
    ],
    followUps: [
      {
        q: 'A candidate is strong on engineering but has never done an evaluation. Do you hire?',
        lookFor: 'Depends on level and coachability. For a mid or senior role it is a real gap; probes whether they understand the idea when explained and whether the team can teach it. Decides against the rubric and the team’s needs, not on a feeling.',
      },
      {
        q: 'A candidate answers every question with the name of a framework but cannot say what they shipped. How do you probe?',
        lookFor: 'Asks for a concrete project: what was the goal, what did they personally do, what went wrong, what numbers moved, what would they do differently. Follows the thread until it either becomes specific or does not.',
      },
      {
        q: 'A senior stakeholder pushes for a candidate with a famous employer whom the loop scored low. What do you do?',
        lookFor: 'Takes the evidence to the stakeholder, shows the scores against the rubric, asks what signal the loop missed, and holds the bar if the evidence stands. May add one targeted interview but does not override the process quietly.',
      },
    ],
    redFlags: [
      'Fills the loop with puzzles and memorised definitions.',
      'Has no rubric, or writes it after seeing the candidates.',
      'Lets interviewers discuss before writing their own notes.',
      'Tests nothing about evaluation or production experience.',
    ],
    lessons: ['start/ai-and-careers', 'llm/ai-assisted-software-development', 'evals/evals-101'],
  },
  {
    id: 'lead-candidate-used-ai-in-take-home',
    prompt:
      'A candidate’s take-home project is polished and strong, but in the follow-up call they cannot explain a key design choice or change their own code when asked. You suspect an AI tool wrote most of it. Your instructions never mentioned AI tools. What do you do?',
    roles: ['ai-lead'],
    level: 'junior',
    kind: 'behavioural',
    topics: ['hiring', 'interviewing', 'ai tools', 'fairness'],
    minutes: 10,
    strong: [
      'Does not accuse. The instructions were silent, so the gap in the policy belongs to the team. AI tools are part of the job, so the real question is whether the candidate can direct, check and debug the work.',
      'Probes fairly in a live conversation: asks them to walk through the code, change a requirement on the spot, explain why they chose an approach, say what they would test, and say what they would do if an input changed.',
      'Judges the signal the role needs, which is understanding and judgment, and applies the same standard to every candidate for the role.',
      'If the instructions did prohibit tools, treats it as a different conversation: asks openly, gives the candidate a chance to explain, and decides on the facts rather than on a suspicion.',
      'Does not rely on AI-text detectors, which are unreliable, and does not decide on a hunch about style.',
      'Fixes the process: states the tool policy in the instructions, adds a short live extension or code-review session after the take-home, and designs tasks that test judgment instead of output volume.',
      'Documents the decision and the evidence, and treats the candidate with respect throughout.',
    ],
    followUps: [
      {
        q: 'The candidate admits they used AI heavily but walks through every part and spots a bug you plant. What is your view?',
        lookFor: 'That is a good signal if the role permits tools: they can direct, verify and debug. Notes how they checked the work (tests, reading, running it) and scores them on judgment, not on whether they typed the code.',
      },
      {
        q: 'Another candidate did it alone and delivered something less polished. How do you compare the two fairly?',
        lookFor: 'Compares the signals against the rubric (problem solving, testing, trade-offs, communication) rather than polish, accepts that polish is cheap with tools, and uses the same live follow-up for both.',
      },
      {
        q: 'Your own team uses AI tools every day. What does that imply for the take-home?',
        lookFor: 'Redesign it for how the job is done: allow tools, ask for the working notes or prompts, and test the human part (problem framing, review, evaluation). A test that bans what the job uses measures something else.',
      },
    ],
    redFlags: [
      'Rejects the candidate on suspicion with no conversation.',
      'Uses an AI-detection tool as proof.',
      'Applies the rule to this candidate only.',
      'Has no tool policy and no plan to write one.',
    ],
    lessons: ['llm/ai-assisted-software-development', 'start/ai-and-careers'],
  },
  {
    id: 'lead-mentor-engineer-whose-demos-never-ship',
    prompt:
      'An engineer on your team builds impressive demos, but their projects stall before production: no evaluation set, hand-edited prompts, surprise failures on real data. They are frustrated. How do you coach them, and what do you change in the team so it does not depend on one person?',
    roles: ['ai-lead'],
    level: 'junior',
    kind: 'behavioural',
    topics: ['mentoring', 'team process', 'evals', 'behavioural'],
    minutes: 12,
    strong: [
      'Diagnoses with them first. Walks through one stalled project together and finds where it stopped: a skills gap, a process gap, or an unclear definition of done. Asks questions before giving advice.',
      'Gives a concrete definition of done: an evaluation set, a baseline, a launch checklist, a cost per request and monitoring. Vague feedback like “be more rigorous” is not coaching.',
      'Pairs on the next project and builds the first evaluation set together, starting with 20 to 50 real cases and a look at the failures. Shows what production looks like with real traces, so the lesson comes from evidence.',
      'Recognises what they are good at: demos matter for getting buy-in. Separates that skill from the production skill and builds on it.',
      'Changes the system, not just the person: templates, a launch checklist, a shared evaluation harness, a weekly review of evaluation failures, so the right way is the easy way for everyone.',
      'Examines their own part: if leadership applauds demos and never asks about evaluation, people optimise for demos. Asks for production evidence in reviews and rewards it visibly.',
      'Gives specific, kind feedback regularly, and measures progress by outcomes (projects shipped with evaluations) rather than hours or effort.',
    ],
    followUps: [
      {
        q: 'Three months later they still ship without evaluations. What do you do?',
        lookFor: 'Has a direct conversation with clear, written expectations and support, checks whether obstacles remain, and states consequences appropriate to the situation. Keeps it factual and follows the company’s process.',
      },
      {
        q: 'They say, “Evaluations slow me down.” How do you respond?',
        lookFor: 'Takes it seriously: makes evaluation cheap with a harness and a small first set, and shows the cost of failures found late using their own project as the example, without lecturing.',
      },
      {
        q: 'How do you make production work as visible and rewarded as demos on your team?',
        lookFor: 'Shows reliability and quality metrics in reviews, celebrates a clean launch or a regression caught before release, includes evaluation results in project updates, and ties recognition and promotion criteria to shipped outcomes.',
      },
    ],
    redFlags: [
      'Treats it as a personal failing and says nothing specific.',
      'Takes over the project and does it for them.',
      'Changes nothing in team process.',
      'Rewards demos and then complains about demos.',
    ],
    lessons: ['systems/from-notebook-to-production', 'evals/building-an-eval-dataset', 'evals/evals-101'],
  },
  {
    id: 'lead-ai-coding-assistant-team-policy',
    prompt:
      'Your team of eight wants to use AI coding assistants and agents on a production codebase. Leadership asks for a policy and for evidence that it is worth it. What goes in the policy, and how do you measure the value honestly?',
    roles: ['ai-lead'],
    level: 'junior',
    kind: 'design',
    topics: ['ai tools', 'policy', 'productivity', 'team process'],
    minutes: 15,
    strong: [
      'Sets accountability: the person who merges is responsible for the code, whoever or whatever wrote it. AI-written changes get the same review and tests as any other, and tests and a fast feedback loop come first.',
      'Defines data rules: which tools are approved, what code and data may be sent to them, no secrets in prompts or files, and an option for code that must not leave the machine. Checks provider terms for the exact product and plan.',
      'Sets controls for agents that run commands: a sandbox or container, no production credentials, approval for risky commands, read-only tokens where possible, and branch protection so a person approves each merge.',
      'Adds checks for typical AI-code risks: invented package or function names (verify every new dependency), insecure patterns, and licence or provenance questions, which are flagged for review and referred to legal.',
      'Says where to keep humans in charge, such as design decisions, security-critical code and anything touching data subjects, and shares a repository context file with the team’s conventions so the tools follow them.',
      'Measures honestly: cycle time from first commit to merge, review time, rework and reverts within two weeks, and escaped defects, compared like with like, ideally by randomising which tasks use the tools. Does not count lines generated or suggestions accepted as value.',
      'Notes that people misjudge their own speed (a published randomised trial of experienced developers found tasks took longer with early-2025 tools while the developers believed they were faster, and its authors say results depend on task and tool and may be out of date), so the team’s own data is the evidence.',
    ],
    followUps: [
      {
        q: 'Leadership wants a single number for “productivity gain” in a month. What do you say?',
        lookFor: 'Explains that a month is too short and too noisy for one number, offers a small set of measures with a baseline, and promises an honest range and what is known and unknown.',
      },
      {
        q: 'A developer’s agent installed a package that turned out not to exist under that name, and a similarly named one was malicious. What does your policy change?',
        lookFor: 'Verify new dependencies before adding them (existence, publisher, age, downloads), lock and scan dependencies, restrict install permissions in the agent sandbox, and treat the incident as a process lesson.',
      },
      {
        q: 'Junior engineers use the tools heavily. How do you keep them learning?',
        lookFor: 'Asks them to explain the code they merge, pairs on design and debugging, gives tasks that need understanding, and reviews for comprehension. Treats the tools as a way to learn faster, not a way to skip understanding.',
      },
    ],
    redFlags: [
      'Bans the tools outright with no data, or allows everything with no rules.',
      'Measures lines of code or suggestion acceptance and calls it productivity.',
      'Lets agents run with production credentials.',
      'Assumes the developers’ own feelings of speed are the measurement.',
    ],
    lessons: ['llm/ai-assisted-software-development', 'evals/llm-security', 'responsible/running-ai-governance'],
  },
  {
    id: 'lead-roadmap-prioritisation-expected-value',
    prompt:
      'You lead an AI team with capacity for two projects this half. Four ideas, with example estimates: (A) support reply drafting, annual value $400k, 60% chance it works, cost $150k; (B) autonomous contract negotiation, $1.2M, 20%, $300k; (C) internal FAQ search, $250k, 80%, $40k; (D) demand forecasting upgrade, $900k, 35%, $200k. Rank them, say what you would do beyond the arithmetic, and explain your choice to a vice president whose favourite is B.',
    roles: ['ai-lead'],
    level: 'mid',
    kind: 'estimation',
    topics: ['roadmap', 'prioritisation', 'decision making', 'estimation'],
    minutes: 15,
    strong: [
      'Computes expected value (chance × value) and net of cost: A is 0.6 × 400k = $240k, net $90k; B is 0.2 × 1.2M = $240k, net −$60k; C is 0.8 × 250k = $200k, net $160k; D is 0.35 × 900k = $315k, net $115k. By net value: C, D, A, B.',
      'Looks at return per dollar as well: A 0.6, B −0.2, C 4.0 and D about 0.58. C is by far the best ratio and D the highest absolute net after C. Notes that C and D together cost $240k.',
      'Says the probabilities and values are guesses, and tests the ranking against them. B needs a success chance of at least 300 ÷ 1,200 = 25% just to break even in expectation; at 30% it nets +$60k. The ranking is sensitive to that one number.',
      'Goes beyond the arithmetic: risk of harm or legal exposure (autonomous negotiation), reversibility, data readiness, team skills (D is a forecasting problem, not an LLM one), dependencies, user pull and what each project teaches the team. Notes that a quick win such as C also builds an evaluation harness that later projects reuse.',
      'Handles the favourite honestly: proposes a small, time-boxed spike on B (for example, a few weeks) to learn whether the 20% is too low or too high, with a stated decision rule, instead of simply saying no or funding it in full.',
      'Communicates the reasoning on one page, with assumptions visible, and agrees when the estimates will be revisited, with new evidence replacing opinion.',
    ],
    followUps: [
      {
        q: '“Those probabilities are made up.” How do you respond?',
        lookFor: 'Agrees they are estimates. Improves them by asking several people independently, using ranges, and checking which assumptions would flip the ranking. A decision under uncertainty still has to be made, and explicit guesses are better than hidden ones.',
      },
      {
        q: 'Halfway through C, usage data suggests its value is half what you estimated. What do you do?',
        lookFor: 'Ignores the money already spent and compares remaining cost with the revised remaining value, and considers a cheap way to raise usage before continuing. Stops it if the numbers no longer justify finishing.',
      },
      {
        q: 'Your team can only deliver one project well this half. Which and why?',
        lookFor: 'Chooses C on return and risk, or D on absolute value if the team has the capacity and skills, with a clear reason and the criteria that would change the choice. Does not split the team thin across both.',
      },
    ],
    redFlags: [
      'Ranks by value alone and ignores probability and cost.',
      'Treats the estimates as facts.',
      'Dismisses the vice president’s idea with no evidence or alternative.',
      'Funds everything “to keep options open”.',
    ],
    lessons: ['systems/when-not-to-use-an-llm', 'systems/from-notebook-to-production', 'cost/where-the-tokens-go'],
  },
  {
    id: 'lead-measuring-roi-with-a-holdout',
    prompt:
      'Six months after launch, the CEO asks: “Is the support assistant paying for itself?” 100 agents work 160 hours a month each. You staggered the roll-out, so 20 agents never had the tool. Agents with it closed 6.4 tickets per hour; the 20 without it closed 5.8. Model and hosting cost $2,400 a month, and half of two engineers’ time ($15,000 a month each, example loaded cost) goes to the system. An agent hour costs $30 (example). Answer with numbers and caveats.',
    roles: ['ai-lead'],
    level: 'mid',
    kind: 'estimation',
    topics: ['roi', 'measurement', 'experiment design', 'communication'],
    minutes: 15,
    strong: [
      'Computes the uplift: 6.4 ÷ 5.8 = 1.103, about 10.3% more tickets per hour. The same ticket volume needs 5.8 ÷ 6.4 = 90.6% of the hours, so about 9.4% of hours are freed.',
      'Converts to money: 100 × 160 = 16,000 hours; 16,000 × (1 − 5.8 ÷ 6.4) = 1,500 hours; 1,500 × $30 = $45,000 a month.',
      'Computes the cost: $2,400 + 0.5 × 2 × $15,000 = $17,400 a month. Net $27,600 a month, a ratio of about 2.6 to 1.',
      'Shows sensitivity because the uplift is an estimate from 20 control agents: at a 5% uplift, freed hours are 16,000 × (1 − 1 ÷ 1.05) ≈ 762, worth about $22,900, a net of about $5,500. The break-even is 17,400 ÷ 30 = 580 hours, which is a 3.6% share of hours, an uplift of about 3.8%.',
      'Questions the comparison: a staggered roll-out is not random, so checks whether the 20 differ in tenure, queue or ticket type, looks at the period before launch, and asks for the uncertainty of the 6.4 versus 5.8 difference given the small group.',
      'Looks beyond speed: reopen rate, satisfaction, escalations and any quality drift, because tickets per hour can rise while quality falls.',
      'Says freed hours are only value if used (growth without hiring, backlog, shorter response times), and does not turn them into a headcount claim. Adds the costs that are often forgotten: security, evaluation and incident time.',
    ],
    followUps: [
      {
        q: 'The CEO wants “the number”. What do you give?',
        lookFor: 'A headline with its range: about $27,600 a month net in the base case, down to roughly $5,000 if the true uplift is half as large, with the conditions that make the savings real. Does not give a single figure without assumptions.',
      },
      {
        q: 'How would you have designed the measurement from the start?',
        lookFor: 'Randomise which agents or teams get the tool, define the metrics before launch, record the baseline, keep the comparison group long enough to cover novelty effects, and include a quality metric and a cost model.',
      },
      {
        q: 'Should you keep a permanent holdout group?',
        lookFor: 'Reasonable to keep a small rotating one for ongoing measurement if it is acceptable to the people involved, or to repeat the comparison periodically, since models, prompts and ticket mix change. Weighs fairness to the holdout agents against the value of ongoing evidence.',
      },
    ],
    redFlags: [
      'Reports only the engineering and model costs and forgets staff time.',
      'Treats the 10% uplift as certain.',
      'Equates freed hours with cash savings.',
      'Never checked quality, only speed.',
    ],
    lessons: ['evals/llmops-in-production', 'ml/is-the-difference-real', 'responsible/ai-and-work', 'cost/where-the-tokens-go'],
  },
  {
    id: 'lead-technical-debt-in-ai-system',
    prompt:
      'Your team’s year-old LLM product works but is fragile: 30 prompts live in code strings edited by five people, nothing is versioned together, the evaluation set is the 25 cases written at launch, three model versions are in use, and nobody has rebuilt the search index since launch. Product wants new features. How do you decide which debt to pay down, and how do you make the case?',
    roles: ['ai-lead'],
    level: 'mid',
    kind: 'design',
    topics: ['technical debt', 'llmops', 'prioritisation', 'team process'],
    minutes: 15,
    strong: [
      'Names the AI-specific debt: prompts and settings scattered and unversioned, model, prompt and index not released as one unit, a stale evaluation set that never absorbed new failures, unpinned model IDs that expose the product to a retirement or silent change, undocumented data pipelines and no monitoring of quality or cost by version.',
      'Prioritises by likelihood and impact of an incident, by how much each item slows every feature, and by deadlines such as a model retirement. Puts a debt register in front of the team with owners.',
      'Starts with the highest-leverage small items: version prompts and settings in one release manifest, pin model IDs, build a regression evaluation that runs on every change and grows from real failures, and track quality and cost per version. Without an evaluation harness every change is a gamble, so this comes first.',
      'Avoids a big rewrite. Pays debt in small steps attached to feature work: “to ship feature X safely we need Y”, and reserves a steady share of capacity (a planning choice such as 15% to 20%, not a standard).',
      'Makes the case in business terms: incidents, the time a prompt change takes to reach users safely, regressions found by customers, and the risk date of a retirement, not “code quality”.',
      'Measures progress with outcomes: time to ship a prompt change, regressions caught before release, share of features with evaluations, and incident count. Prevents new debt with a definition of done and review checklist.',
    ],
    followUps: [
      {
        q: 'Product says there is no capacity for debt this quarter. What do you do?',
        lookFor: 'Negotiates with visible trade-offs: shows the risk register and the cost of delay, offers the smallest slice that reduces the biggest risk, and ties it to a feature the product team cares about. Escalates only with evidence.',
      },
      {
        q: 'If you could fix only one item, which and why?',
        lookFor: 'The evaluation harness together with versioning, because it makes every other change safe and measurable. Explains the reasoning, and names the next one.',
      },
      {
        q: 'How do you stop the debt from coming back?',
        lookFor: 'A definition of done that includes a versioned config and evaluation cases, a pull-request checklist, a regular review of the debt register, and making the safe path the easy one with templates and tooling.',
      },
    ],
    redFlags: [
      'Proposes a rewrite from scratch.',
      'Argues for “clean code” with no link to risk or delivery.',
      'Lists every item as equally urgent.',
      'Has no way to know whether the debt work helped.',
    ],
    lessons: ['evals/llmops-in-production', 'systems/from-notebook-to-production', 'systems/testing-and-deploying-ml-models'],
  },
  {
    id: 'lead-model-deprecation-migration-plan',
    prompt:
      'A model provider announces that the model behind 14 of your features retires in 90 days. Each migration needs about 0.5 day to run evaluations, 2 days of prompt and parser fixes on average, and 1 day to stage the roll-out. Three of the 14 features have no evaluation set, and building one takes about 4 days each. Four engineers can give 60% of their time. Is 90 days enough, and how do you plan it?',
    roles: ['ai-lead'],
    level: 'mid',
    kind: 'estimation',
    topics: ['llmops', 'migration', 'planning', 'estimation'],
    minutes: 15,
    strong: [
      'Computes the work: 14 × (0.5 + 2 + 1) = 14 × 3.5 = 49 engineer-days, plus 3 × 4 = 12 days for the missing evaluation sets, 61 engineer-days.',
      'Computes capacity: 90 calendar days is about 64 working days (90 × 5 ÷ 7, before holidays); four engineers at 60% is 2.4 engineers, so about 154 engineer-days. The plan uses roughly 40% of that capacity.',
      'Does not stop at the average: the features differ, some may need redesign, the new model behaves differently, other teams are involved, and incidents will take time. The plan should finish well before the deadline, for example by day 60, and treats the date as a hard stop.',
      'Starts with an inventory by usage, criticality and owner, then orders by risk: the three features with no evaluations take the longest and are the least understood, so they go first. Builds one shared evaluation harness for all 14.',
      'Runs old and new models side by side on the evaluation sets, then a staged roll-out with a quality comparison and a rollback, and decides per feature whether to migrate, redesign or retire it.',
      'Checks cost and latency of the new model, not only quality, and asks the provider about extensions. Tells stakeholders the deadline and the plan now. Watches for the next retirement notice.',
    ],
    followUps: [
      {
        q: 'The new model costs 30% more per token. What do you do?',
        lookFor: 'Measures cost per task, not per token, because the new model may use fewer tokens or fewer retries. Considers routing easy requests to a smaller model, caching and shorter prompts, and brings the measured cost to the owners of each feature.',
      },
      {
        q: 'Two features lose 8 points of accuracy on the new model and prompt changes do not recover it. What are the options?',
        lookFor: 'Try another model, fine-tune if there is enough data, accept the loss with human review for the affected cases, redesign the task, retire the feature, or ask for an extension. Decides with the feature owner using measured impact.',
      },
      {
        q: 'In week three an incident takes two engineers for two weeks. What do you do?',
        lookFor: 'Re-plans openly: recomputes capacity (the buffer exists for this), protects the highest-risk migrations, drops or defers low-value features, and tells stakeholders early with a revised plan and date.',
      },
    ],
    redFlags: [
      'Plans from the average and has no buffer.',
      'Leaves the unevaluated features until last.',
      'Does not check the new model’s cost or latency.',
      'Tells stakeholders only when something has slipped.',
    ],
    lessons: ['evals/llmops-in-production', 'systems/model-routing-and-fallbacks', 'evals/building-an-eval-dataset'],
  },
  {
    id: 'lead-engineers-ship-without-evals-norm',
    prompt:
      'Role-play: in a design review a respected senior engineer says, “Evaluations are overhead. We ship fast, watch the dashboards, and fix what breaks. Last quarter that was fine.” Others nod. You are the lead and you believe the team needs a quality bar. How do you respond in the room, and what do you do afterwards?',
    roles: ['ai-lead'],
    level: 'mid',
    kind: 'behavioural',
    topics: ['behavioural', 'evals', 'team culture', 'influence'],
    minutes: 12,
    strong: [
      'Does not shut him down or lecture. Acknowledges that speed matters and that “fine last quarter” is evidence worth taking seriously.',
      'Asks questions that surface the gap: what did the dashboards catch and how late, how do we know a prompt change did not hurt cases we are not watching, and what was the last regression a user found before we did? Brings a concrete example from the team’s own history.',
      'Proposes the smallest sensible thing: 30 to 50 real cases and a few must-pass checks that run in minutes on every prompt or model change. Scales the effort by risk: light for low-stakes internal summaries, strict where money, health, privacy or law is involved.',
      'Makes it cheap and shared: a harness and a template so no one writes it from scratch, and invites the sceptical engineer to co-design it so he owns the result.',
      'Runs it as a time-boxed trial with agreed measures (regressions caught, time cost, time to detect), and reviews the data together at the end. Is willing to reduce it if the data says it is not worth it.',
      'Is clear about what is not up for debate, for example security and privacy checks and high-stakes use cases, and writes the agreed standard down after the discussion.',
      'Follows up one to one after the meeting, builds the first version, and shows results instead of repeating the argument.',
    ],
    followUps: [
      {
        q: 'After a month the trial caught nothing. What do you conclude?',
        lookFor: 'Reads it honestly: it may mean low risk or a weak evaluation set. Keeps the cost low, checks that cases reflect real failures, scales the effort to risk, and does not defend the process for its own sake.',
      },
      {
        q: 'The sceptic ships a change that breaks something the check would have caught. How do you handle it?',
        lookFor: 'No blame or gloating. Uses it as an example in a blameless review, asks what would have made the check feel worth it, and lets the team draw the conclusion.',
      },
      {
        q: 'A launch is due tomorrow and the evaluation fails on a must-pass case. The CEO says ship. What do you do?',
        lookFor: 'Makes the risk explicit and puts the decision in the hands of an accountable owner. Proposes mitigations (feature flag, canary, human review, a narrower launch, a rollback plan) and records the risk acceptance and a follow-up.',
      },
    ],
    redFlags: [
      'Mandates evaluations by authority with no reasoning.',
      'Humiliates the engineer in front of the team.',
      'Applies the same heavy process to everything.',
      'Gives in completely and sets no standard.',
    ],
    lessons: ['evals/evals-101', 'evals/llmops-in-production', 'evals/building-an-eval-dataset'],
  },
  {
    id: 'lead-incident-wrong-answers-reached-customers',
    prompt:
      'Scenario: at 4 p.m. on Friday, support tells you the customer-facing AI assistant has been telling users that a discontinued plan is still available, and a customer has posted a screenshot publicly. You lead the AI team. Walk me through the first hour, the next week, and what you tell the executives.',
    roles: ['ai-lead'],
    level: 'senior',
    kind: 'behavioural',
    topics: ['incident response', 'communication', 'llmops', 'leadership'],
    minutes: 20,
    strong: [
      'Contains the harm first and diagnoses second: turns off the affected topic, uses a kill switch, routes to a person, or rolls back to the last known good release. Does not edit the production prompt ad hoc without a record.',
      'Assigns roles quickly: an incident lead, a technical investigator, and one person for communication, and keeps a timeline. Brings in support, legal and communications as appropriate, and involves privacy or legal early if personal data or regulation is touched.',
      'Scopes the damage: searches logs to count how many conversations mentioned the plan, how many users acted on it, and for how long. Gives support approved wording and a way to correct affected customers.',
      'Briefs executives with a short, factual note: what happened, what is known and unknown, the size of the impact, actions under way and the time of the next update. Does not speculate or assign blame.',
      'Finds the cause with the version record: did a source document change, was the index stale, did a prompt or model change, or was retrieval wrong? Fixes it, and adds regression cases so it cannot quietly return.',
      'Prevents recurrence: freshness checks on source documents, alerts on content that changes, canaries, a named owner for the knowledge base, and an updated runbook.',
      'Holds a blameless review within about a week with a timeline, contributing factors and actions with owners and dates. Looks after the team, who may be working a Friday evening, and plans rest and rotation.',
    ],
    followUps: [
      {
        q: 'An executive asks, “Whose fault is this?” What do you say?',
        lookFor: 'Says the gaps in the process are what to fix: no content-freshness check, no alert, unclear ownership. Names the owners for actions without naming individuals as the cause, and offers the review date.',
      },
      {
        q: 'Support wants the assistant switched off completely. An executive says it handles 40% of volume and must stay up. How do you decide?',
        lookFor: 'Uses severity and scope: can the affected topic be switched off or reviewed by a person while the rest runs? Sets out the options and the risk of each, decides or escalates to the accountable person, and records the risk acceptance.',
      },
      {
        q: '“Can you guarantee this will not happen again?”',
        lookFor: 'No. Says what is now detected and what is not, what the remaining risk is, and when the next check will report. Honest and specific, not reassuring and vague.',
      },
    ],
    redFlags: [
      'Starts by finding the root cause while the harm continues.',
      'Changes the live prompt repeatedly with no record.',
      'Tells executives “it is fixed” before checking the scope.',
      'Blames a person, the vendor or the model with no process change.',
    ],
    lessons: ['evals/llmops-in-production', 'responsible/running-ai-governance', 'evals/observability-for-llm-apps'],
    game: { label: 'Run the clock in Incident Room', href: '/play/incident-room/' },
  },
  {
    id: 'lead-exec-wants-agents-everywhere',
    prompt:
      'Role-play: your CEO comes back from a conference and says, “Our competitors are using AI agents for everything. I want agents running our finance close, customer onboarding and procurement by next quarter. Can your team do it?” Respond as the AI lead.',
    roles: ['ai-lead'],
    level: 'senior',
    kind: 'behavioural',
    topics: ['expectations', 'executive communication', 'agents', 'roadmap'],
    minutes: 15,
    strong: [
      'Responds with interest, not a flat yes or no. Asks what outcomes the CEO wants in numbers, and what the competitors are actually doing, instead of accepting the premise.',
      'Separates the three workflows and scores each by structure of the task, cost of an error, reversibility, data readiness, access to systems, volume and whether a baseline exists. Finance close and procurement involve money and audit; onboarding may be more bounded.',
      'Explains the ladder in plain words: a fixed workflow, then an assistant with a person approving, then limited autonomy as evidence builds. Notes that reliability compounds, so ten steps at 95% each succeed only about 60% of the time (0.95^10 ≈ 0.60), and that multi-step runs cost many times more tokens than one call.',
      'Proposes a concrete next-quarter target that can win: one workflow in assisted mode with measured results and approval, plus a readiness assessment for the other two with criteria for promoting each one.',
      'States what is needed: owners in finance and operations, data and system access, security sign-off, and an evaluation set. Names the trade-off with the current roadmap, so the CEO chooses with eyes open.',
      'Is honest about unknowns and risks, and sets up a regular, short report with metrics and demos so confidence is earned. Does not sandbag by saying it is impossible, and does not overpromise to be agreeable.',
    ],
    followUps: [
      {
        q: 'The CEO says, “Just try it and we will figure it out as we go.” What do you say?',
        lookFor: 'Agrees to experiment, but within limits: a time-boxed pilot with success criteria, stop rules and a named owner, read-only or approval-gated actions, and a review date. Protects the company without blocking progress.',
      },
      {
        q: 'The CFO is worried about errors in the finance close. How do you respond?',
        lookFor: 'Takes it seriously: starts with the assistant preparing and a person approving, measures the error rate against the human baseline, keeps audit trails and limits, and promotes autonomy only on evidence.',
      },
      {
        q: 'What would you give up on the current roadmap to do this?',
        lookFor: 'Names the real trade-offs with sizes and effects, and gets the CEO to decide, rather than quietly overloading the team or promising both.',
      },
    ],
    redFlags: [
      'Says yes to all three with no evidence or plan.',
      'Says it cannot be done and offers nothing.',
      'Lectures the CEO about hype.',
      'Hides the trade-off with the existing roadmap.',
    ],
    lessons: ['rag-agents/agents-and-tool-use', 'systems/when-not-to-use-an-llm', 'evals/evaluating-agents', 'rag-agents/multi-agent-systems'],
  },
  {
    id: 'lead-release-process-for-prompt-and-model-changes',
    prompt:
      'Your team makes about 30 changes a month across prompts, retrieval settings, model versions and tools. Two recent regressions reached users. Design the team’s release process: who owns what, what gates a change, how you roll it out, and how you keep it light enough that people follow it.',
    roles: ['ai-lead'],
    level: 'senior',
    kind: 'design',
    topics: ['llmops', 'release process', 'evals', 'team process'],
    minutes: 20,
    strong: [
      'Treats prompts, retrieval settings, model IDs and tool definitions as releasable code: versioned together in one manifest with a change log, and reproducible so any release can be rebuilt and rolled back.',
      'Classifies changes by risk, such as copy edits, prompt logic, retrieval or index changes, model swaps and new tools or permissions, and gives each class a different gate. This keeps low-risk changes fast.',
      'Gates in CI: a regression suite with must-pass cases and aggregate thresholds that allow for noise (intervals, repeated runs), plus cost and latency budgets. Every change names its owner, and a second person reviews high-risk ones.',
      'Rolls out risky changes gradually: shadow, then a small canary compared with a control, with automatic rollback triggers. Tracks online quality, cost and latency by version, and makes rollback a single tested step.',
      'Grows the evaluation set from incidents, user reports and error reviews, and reviews failures regularly. Prunes cases that no longer matter.',
      'Keeps the process light: small changes, a fast lane for low risk, review time expectations, automation for everything mechanical, and a defined emergency path that records the change and runs the checks afterwards.',
      'Measures the process itself: lead time for a change, change failure rate, rollbacks, time to detect, and gate flakiness, and runs blameless reviews of regressions. Names who is on call and who can approve.',
    ],
    followUps: [
      {
        q: 'The gate is flaky because the language-model judge gives different scores on reruns. How do you fix it?',
        lookFor: 'Reduces variance (fixed settings where possible, repeated runs, a calibrated judge checked against human labels, paired comparisons on the same cases), sets thresholds with tolerance, and makes must-pass cases deterministic checks where possible.',
      },
      {
        q: 'A product manager wants to hotfix the prompt in the production console. What is your policy?',
        lookFor: 'An emergency path that exists, is fast, and still leaves a record: the change is versioned, checked after the fact, and reviewed. Explains why untracked edits make later incidents impossible to diagnose.',
      },
      {
        q: 'The full evaluation suite takes 40 minutes and developers skip it. What do you do?',
        lookFor: 'Tiers the suite: a fast smoke set on every change, the full run before release or nightly, parallel execution and caching, and trimming redundant cases. A gate people bypass is worse than a smaller one they use.',
      },
    ],
    redFlags: [
      'Applies the same heavy gate to every change, or none at all.',
      'Leaves prompts editable in production with no history.',
      'Relies on a single judge score with no noise handling.',
      'Has no owner for the evaluation set.',
    ],
    lessons: ['evals/llmops-in-production', 'evals/llm-as-judge-pitfalls', 'systems/testing-and-deploying-ml-models'],
  },
];
