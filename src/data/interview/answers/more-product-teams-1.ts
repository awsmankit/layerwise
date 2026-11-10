import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'fde-first-week-discovery-questions': {
    short:
      "Spend week one learning the work, not choosing a model: watch people do the job, ask for real examples and real numbers, map who can say yes and who can only say no, find where the data lives, and write down what you think you heard. By Friday you want a one-page note with a baseline (how long the task takes today and how often it goes wrong), a list of people and data owners, and open questions the customer can confirm. Anything you build before that is a guess.",
    explain: [
      {
        heading: "Start with the job and the person doing it",
        body: "Ask to sit next to someone doing the task for an hour, and ask for ten real examples, including the ugly ones: the blurry scan, the angry email, the case that went to three people. The sponsor (the person who pays and asked for the pilot) describes the process as it is meant to work. The people doing it describe the process as it really runs, and those two stories often differ. Treat the sponsor's version as the intended process and the users' version as the actual one, confirm by watching, and design for what people really do.",
      },
      {
        heading: "Ask for outcomes in numbers, then map the people",
        body: "Ask how many tasks there are a month, how many minutes each takes, how often one is wrong or redone, what a mistake costs, and the question that matters most: how do you know it is going well right now? Without those numbers (a baseline, meaning the starting measurement) you cannot show an improvement later, and the customer will compare with a memory. Then draw the people: who pays (the sponsor), who wants it (the champion), who will live with it every day (the users), and who can say no (security, legal, IT, the owner of the data). Find out who can say yes and who can only say no, because a pilot dies at the second group.",
      },
      {
        heading: "Map the data and systems, and check whether you need an LLM at all",
        body: "Find where the inputs live, who owns them, how long access takes (often days or weeks, so ask early), what may not leave the building, and what the existing tools can already do. Ask what has been tried before and why it stopped. Then be honest about the simplest option: would a rule, a template or a better search box already cover part of the need? If so, say so, because a large language model (LLM) is a costly answer to a problem that a lookup table solves.",
      },
      {
        heading: "Write it down and play it back",
        body: "At the end of the week write down your assumptions and open questions in a page and walk the customer through it in a short call. A wrong assumption caught on Friday of week one costs an hour. The same assumption found in week six costs the pilot. Keep the page alive: it becomes the base for the success criteria and the scope.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "Day 1: listen", detail: "Meet the sponsor, hear the goal in their words, and ask for ten real examples." },
        { label: "Day 2: watch", detail: "Sit with two or three users doing the task today, and note where they work around the official process." },
        { label: "Day 3: numbers", detail: "Collect volume, minutes per task, error rate, cost of a mistake, and how they know it is going well." },
        { label: "Day 4: data and approvals", detail: "Find the data owners, the access lead time, what may not leave the building, and who can say no." },
        { label: "Day 5: play it back", detail: "Share a one-page note of assumptions and open questions, and fix anything the customer says is wrong." },
      ],
      caption: "One plausible shape for the first week. The order matters less than the rule: understand the work before you pick a tool.",
    },
    example: {
      title: "Example: what the Friday note might hold",
      text: "All numbers here are invented to show the shape. Suppose an operations team handles 3,000 requests a month at 12 minutes each, and 8% need rework that takes 30 minutes. That is the baseline any pilot has to beat.",
      rows: [
        { label: "Work time today", value: "3,000 x 12 min = 36,000 min = 600 hours a month" },
        { label: "Rework today", value: "3,000 x 0.08 = 240 cases x 30 min = 7,200 min = 120 hours" },
        { label: "Total", value: "720 hours a month is the number to beat" },
        { label: "People", value: "Sponsor, champion, 12 users, security, data owner" },
        { label: "Open question", value: "Who owns the request archive, and how long does access take?" },
      ],
    },
    followUps: [
      {
        q: "The sponsor says, “Just get us a chatbot.” What do you do?",
        a: "I do not start building. I ask which decision or piece of work the chatbot would help, for whom, and what a good answer looks like, and I ask for ten real questions or tasks. Then I turn the request into a use case with a measurable outcome.",
      },
      {
        q: "The users describe a workflow that is quite different from the one the sponsor described. Which do you believe?",
        a: "Both are useful: the sponsor's version is the intended process and the users' version is the actual one. I confirm by watching the work and reading real cases, design for what people really do, and raise the gap tactfully without treating either side as wrong.",
      },
      {
        q: "You discover that the data you need belongs to a team that has not heard of the pilot. What now?",
        a: "I ask the sponsor for a proper introduction, explain what I need and why, and ask about lead times early. I do not work around the owner or use the data without permission.",
      },
    ],
    mistakes: [
      "Choosing a model or building a prototype in week one, before you understand the work.",
      "Talking only to the sponsor and never watching an actual user.",
      "Accepting “we want AI” as a goal with no number attached to it.",
      "Treating security, legal and data owners as obstacles to dodge instead of people to involve early.",
    ],
  },

  'pm-explain-different-answers-and-hallucination-to-stakeholders': {
    short:
      "A language model writes by predicting the next word from patterns it learned, and it picks among likely words with a little chosen randomness, so it can word things differently each day and can write fluent text that is wrong. We can make answers more repeatable and much better grounded, but we cannot promise zero errors. As the product manager I will ground answers in approved documents with citations, let the assistant say “I do not know”, measure the error rate on real questions and report it honestly, and use fixed text or a person for high-stakes answers.",
    explain: [
      {
        heading: "What the model actually does",
        body: "Think of very powerful autocomplete. The model has read a huge amount of text, and at each step it scores every possible next word (really a piece of a word, called a token) and picks one. If it always took the top word the text would be dull, so a setting called temperature adds some randomness. That is why the same question can get different wording on different days, and why fluent text can still be wrong: the model is matching patterns, not looking facts up. It only has facts to work from if the product hands it a source.",
      },
      {
        heading: "Why the answer changed, and what lowering the randomness does",
        body: "Four things can change an answer: the randomness itself, different context (the retrieved documents or the conversation so far), a changed prompt, or a new model version. Setting the randomness to zero makes answers more repeatable but not guaranteed identical, because batching, the order of floating-point arithmetic and model updates still matter. It also says nothing about correctness. A model that gives the same wrong answer every time is worse than one that is wrong at random, because the error becomes invisible.",
      },
      {
        heading: "Making things up is a property to manage",
        body: "Making things up is called hallucination. It is not a bug we can delete, it is a side effect of how the model works, and it gets more likely when the answer is not in the material provided or the question is unusual. We lower it by grounding the answer in sources, asking the model to say when it does not know, and checking each claim against the source text before it reaches a user. The toy experiment shown with this answer shows a drafted answer with one unsupported sentence passing through, and a sentence-by-sentence check catching it.",
      },
      {
        heading: "What I will do, decided by the stakes",
        body: "I will ground answers in approved documents and show citations, allow “I do not know” with a hand-off to a person, test on a set of real questions, and monitor errors after launch. I will report a measured error rate and where it is worse, not “it will be fixed” and not “it is a black box”. Then I decide by stakes: a low-risk draft can vary, but anything about policy, money or safety needs fixed approved text or a human check.",
      },
    ],
    diagram: {
      kind: 'experiment',
      slug: 'no-grounding-check',
      caption: "A made-up draft with one sentence the sources do not support, with and without a per-sentence grounding check.",
    },
    example: {
      title: "Example: an honest status line for the stakeholder",
      text: "Example figures: we ran 200 real questions from the support inbox through the assistant and a reviewer marked 14 as wrong. That is 14 / 200 = 7%, and with only 200 questions the true rate could plausibly be anywhere from about 4.2% to 11.4% (a 95% interval). We then break it down by topic, because one topic at 20% matters more than the average.",
      rows: [
        { label: "Questions tested", value: "200 (example)" },
        { label: "Wrong answers", value: "14, which is 7%" },
        { label: "95% interval", value: "about 4.2% to 11.4%" },
        { label: "Plain sentence for the stakeholder", value: "About 1 answer in 14 is wrong today; refunds and legal topics get a person" },
      ],
    },
    followUps: [
      {
        q: "The stakeholder says: “So set the randomness to zero and it will be correct.” How do you respond?",
        a: "Zero randomness makes the output more repeatable, but not guaranteed identical, and it says nothing about whether it is right. The same wrong answer every time is worse, so we still need grounding and testing.",
      },
      {
        q: "How would you show them that things are improving?",
        a: "A fixed test set of real questions, scored the same way after each change, with the error rate by topic and an interval, plus examples of cases we fixed. Not anecdotes and not one good demo.",
      },
      {
        q: "For which questions would you not let the model answer freely at all?",
        a: "Questions with legal, financial or safety consequences, or ones that need exact figures or policy wording. There an approved text, a lookup or a person is the better tool, and the model only routes the question or phrases the reply.",
      },
    ],
    mistakes: [
      "Promising that hallucinations will be eliminated.",
      "Saying temperature zero makes the output correct.",
      "Using jargon with a non-technical audience and no example.",
      "Treating the model as a database of facts instead of a writer working from whatever it is given.",
    ],
  },

  'pm-ai-or-not-expense-categorisation': {
    short:
      "I start from the finance team's job and what a wrong category costs, not from the technology. Then I build the simplest baseline (look up the merchant and reuse the last category chosen for it), measure it on real labelled receipts, and climb a ladder of no feature, rules, a trained model, one LLM call and an agent, stopping at the lowest rung that meets the bar. Every step up has to win in numbers on real data, and be counted on total cost including mistakes and upkeep.",
    explain: [
      {
        heading: "Ask about the job, the volume and what already exists",
        body: "Who uses the category and what happens when it is wrong? Maybe a finance person spends 2 minutes fixing it, or an audit fails. How many receipts come in each month, how many different merchants are there, and is there history in which people already chose categories? Those past choices are labelled data, and labelled data means a cheap trained classifier (a model that sorts items into fixed groups) is possible. Ask also what a good result looks like: a target accuracy per category, and what happens to a low-confidence case. Check privacy early, because receipts can hold names and card fragments.",
      },
      {
        heading: "Baseline first, then climb a ladder",
        body: "Build the dumbest thing that could work: look up the merchant name and reuse the category last chosen for it. Measure it on real labelled receipts. Anything fancier has to beat that number, and the win has to show up in numbers, not in a demo. The ladder, from the bottom, is: no feature or a person, plain rules, search, a trained model, one LLM call, an agent. Stop at the lowest rung that meets the bar, and move up when the rules grow into hundreds of special cases nobody can maintain.",
      },
      {
        heading: "Count the total cost, and know where an LLM earns its place",
        body: "The LLM's price per call is the visible part. The full cost is running cost plus the cost of mistakes plus upkeep: evals (tests), monitoring, prompt changes and retraining, and that upkeep lasts as long as the feature does. An LLM does earn a place here for messy free-text line items, receipts in many languages and the long tail of odd merchants that rules miss. A hybrid is common: rules handle the obvious 70% for almost nothing, and a model handles the rest.",
      },
    ],
    diagram: {
      kind: 'layers',
      layers: [
        { label: "An agent that plans and uses tools", sub: "rarely needed for sorting receipts" },
        { label: "One LLM call", sub: "messy text, many languages, odd merchants" },
        { label: "A trained classifier", sub: "needs labelled history, cheap to run" },
        { label: "Search or lookup", sub: "find the same or a similar merchant" },
        { label: "Plain rules", sub: "merchant table: the baseline to beat" },
        { label: "No feature, or a person", sub: "if the job is small or the risk is high" },
      ],
      caption: "Start at the bottom and climb only when the rung below fails the bar on real labelled receipts.",
    },
    example: {
      title: "Example: rules at 78% against an LLM at 90%",
      text: "Example figures: on 5,000 labelled receipts, merchant rules put 78% in the right category and an LLM prompt 90%. A wrong category costs about 2 minutes of finance rework, and the tool sees 30,000 receipts a month. The LLM saves 120 hours a month before its running cost and upkeep, so the next step is to price those and check an interval on the 5,000-case scores.",
      rows: [
        { label: "Rules: errors a month", value: "22% x 30,000 = 6,600" },
        { label: "Rules: rework", value: "6,600 x 2 min = 13,200 min = 220 hours" },
        { label: "LLM: errors a month", value: "10% x 30,000 = 3,000" },
        { label: "LLM: rework", value: "3,000 x 2 min = 6,000 min = 100 hours" },
        { label: "Saved", value: "120 hours a month, before model cost and upkeep" },
      ],
    },
    followUps: [
      {
        q: "On 5,000 labelled receipts, merchant rules route 78% correctly and an LLM prompt 90%. A wrong category costs about 2 minutes of finance rework, and you see 30,000 receipts a month. Which wins?",
        a: "On these example numbers the rules make 6,600 errors (220 hours of rework) and the LLM makes 3,000 (100 hours), a saving of 120 hours a month before the model's running cost and upkeep. I would also want an interval on both scores and to know whether the LLM's errors fall on the costly categories.",
      },
      {
        q: "Both numbers came from receipts your team picked. What could make the live result worse?",
        a: "The sample may differ from live traffic (new merchants, other countries, phone photos), the labels may have been inconsistent, and things drift over time. I would sample live receipts, label them, and track accuracy by slice rather than one average.",
      },
      {
        q: "The finance lead says “just use the biggest model so we never have to think about it again.” What do you say?",
        a: "Bigger is not the same as better for this job, so I would try a cheaper model or a classifier against the same labelled set and compare. Models change and get retired, so “never think again” does not exist: we plan evals and a re-check whenever the model changes.",
      },
    ],
    mistakes: [
      "Starting with “which model should we use” before asking about the job and the cost of a wrong category.",
      "Treating an LLM as free once the demo works, with no counting of mistakes, evals or upkeep.",
      "Never building a rules or lookup baseline to beat.",
      "Ignoring that receipts can contain personal data.",
    ],
  },

  'pm-success-metrics-for-meeting-summaries': {
    short:
      "Pick one primary metric that matches what people want from a summary (for example, the share of action items completed without a follow-up question), then add supporting metrics to diagnose it and guardrails that must not get worse. Copy rate alone is not enough because people copy without checking, and it cannot see what the summary got wrong or left out. So I pair it with a sampled human review of accepted summaries, a baseline to compare with, and intervals on every number.",
    explain: [
      {
        heading: "Start from the user's job",
        body: "People open a summary to learn what was decided and what they must do, without re-reading the chat or re-watching the meeting. The primary metric should reflect that job, such as action items completed without a follow-up question or the time it takes to find a decision, and not a model-centred number such as how fluent the text is. A primary metric is the one number you would stake the launch on.",
      },
      {
        heading: "Supporting metrics, and why copy rate is not enough",
        body: "Supporting metrics help you diagnose: how often a summary is opened, edited, shared or regenerated, and how much of it is edited before use. Heavy edits mean it was used as a starting point, not as written. Copy rate (or acceptance rate) on its own fails in three ways: people may copy without checking, a high rate can sit on top of wrong action items, and it says nothing about what the summary missed. So pair it with sampled human review of accepted summaries, to count the errors that escaped.",
      },
      {
        heading: "Quality on the content, and guardrails",
        body: "Write a short rubric: are the decisions and owners correct, is anything invented, is anything important missing? Label a sample by hand and measure it over time and by meeting type. Guardrails are measures that must not get worse while the main one improves: factual error rate, cost per summary, latency, privacy complaints and opt-outs. A feature that is popular and wrong, or popular and expensive, is not a success.",
      },
      {
        heading: "Baselines, sample sizes and timing",
        body: "Compare with something: users with and without the feature, or a simple alternative like the meeting agenda plus the chat export. Early numbers include a novelty bump that fades. Report every rate with its sample size and an interval, and separate leading signals (edits, regenerations), which move quickly, from lagging outcomes (completed tasks, retention), which tell you whether it mattered. A drop in edits is not automatically good: people may have stopped checking.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Examples", "What it tells you"],
      rows: [
        { label: "Primary metric", cells: ["Action items completed without a follow-up question", "Whether the summary does its job"] },
        { label: "Supporting metrics", cells: ["Opened, edited, shared, regenerated, share of text edited", "Why the primary metric moves"] },
        { label: "Quality audit", cells: ["Sampled summaries checked by a person for wrong owner, invented item, missing decision", "Errors that copy rate cannot see"] },
        { label: "Guardrails", cells: ["Error rate, cost per summary, latency, privacy opt-outs", "Whether a win is hiding a cost"] },
        { label: "Comparison", cells: ["Control group or the old way of finding decisions", "Whether the feature caused the change"] },
      ],
      caption: "The layers of a measurement plan for the summary feature. None of them works alone.",
    },
    example: {
      title: "Example: an 80% copy rate that hides wrong owners",
      text: "Example figures: of 1,000 summaries, 800 are copied (80%). A person audits 80 of the copied ones and finds 10 with the wrong owner on an action item, which is 10 / 80 = 12.5%. With only 80 audited the 95% interval runs from about 6.9% to 21.5%, so the true rate is probably somewhere around 1 in 14 to 1 in 5. If it were 12.5% across all 800 copied summaries, about 100 wrong action items would be acted on.",
      rows: [
        { label: "Copy rate", value: "800 / 1,000 = 80%" },
        { label: "Owner errors in the audit", value: "10 / 80 = 12.5%" },
        { label: "95% interval on that", value: "about 6.9% to 21.5%" },
        { label: "Wrong owners if it holds for all copies", value: "about 100 of 800" },
      ],
    },
    followUps: [
      {
        q: "Copy rate is 80% but a spot check finds 1 in 8 summaries has a wrong owner on an action item. What do you do?",
        a: "I treat the error as the headline: 1 in 8 is 12.5%, and a small audit gives a wide interval around it. I add an owner-accuracy metric, show the source line next to each action item, and put the fix ahead of growth work.",
      },
      {
        q: "Which metrics would you refuse to put on a team's goals, and why?",
        a: "Metrics that are easy to game or disconnected from value, such as raw usage or copy rate alone. Optimised on their own they push toward longer, more confident summaries, not more correct ones.",
      },
      {
        q: "How do you get a baseline before launch?",
        a: "I measure current behaviour (how long it takes to find the decisions, how many follow-up questions people ask), label a sample of real meetings by hand, and run a small pilot with a control group.",
      },
    ],
    mistakes: [
      "Choosing only usage or acceptance numbers.",
      "Having no way to detect wrong or invented content.",
      "Naming metrics with no baseline or comparison group.",
      "Treating a drop in edits as automatically good news.",
    ],
  },

  'review-an-agent-written-pull-request': {
    short:
      "Green tests only prove the code passes the tests someone wrote, and an agent can pass them by changing the tests, inventing a package or missing a case nobody tested. Before approving I read the diff (not the agent's summary), check every new name and dependency, look for logic the tests do not reach, check what happened to the tests, scan for security problems and licence questions, and run the branch myself with an input the author did not try. Whoever typed the code, the person who merges it is accountable for it.",
    explain: [
      {
        heading: "Read the diff, not the chat",
        body: "The agent's transcript tells you what it intended. The diff (the list of lines added and removed) tells you what it did. They can differ, and the diff is what ships. Start with the places where a mistake is most expensive: authentication, data handling, deletion and payment paths, new dependencies and any change to tests. If 400 lines is too many to review properly in the time you have, ask the agent to split it, or ask for a short design walkthrough first.",
      },
      {
        heading: "Invented names and logic the tests skip",
        body: "Assistants sometimes use functions, options or packages that do not exist, or that exist but are not the ones intended. For every new dependency, check that it exists under that exact name, that it is the right one and that it is maintained, because attackers register names that models tend to guess. Then think about what tests rarely reach: off-by-one errors (a loop that runs one time too many or too few), empty and boundary cases, error paths and concurrency, and compare the behaviour with the actual requirement, not with the agent's reading of it.",
      },
      {
        heading: "Check the tests, security and provenance",
        body: "Look at whether any test was weakened, deleted or rewritten so that it passes, and whether the new tests can fail at all: an assertion that cannot fail gives false confidence. Ask to see the command that was run and its output. Review security as for any code: unvalidated input, queries built from strings, secrets in code or logs, permissions that are too broad, and checks that were deleted to make an error disappear. Consider provenance too: generated code may resemble licensed code, so follow your organisation's policy and scanners. That is a question for legal, and this is not legal advice.",
      },
      {
        heading: "Run it and keep it reviewable",
        body: "Check out the branch, run the feature, and try an input the author did not, such as an empty value, a very long one, a repeat of the same request. Notice noise: if the agent also reformatted unrelated files, ask for that to go into a separate change, because it hides the real edits and makes reverting harder.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'diff', label: "Read the diff", sub: "not the agent's summary" },
        { id: 'names', label: "Check names and dependencies", sub: "do they exist and are they the right ones?" },
        { id: 'logic', label: "Check logic the tests skip", sub: "edges, empty cases, errors, concurrency" },
        { id: 'tests', label: "Check the tests", sub: "weakened, deleted, or unable to fail?" },
        { id: 'security', label: "Security and licences", sub: "input, secrets, removed checks, provenance" },
        { id: 'run', label: "Run it yourself", sub: "with an input the author did not try" },
      ],
      highlight: ['tests'],
      caption: "A review order for an agent-written change. Tests passing is one input, not the verdict.",
    },
    example: {
      title: "Example: 400 lines and 20 minutes",
      text: "Twenty minutes is 1,200 seconds, which is 3 seconds a line for 400 lines. That is not enough to read everything with care, so spend the time where mistakes are costly. The split below is one example, not a rule.",
      rows: [
        { label: "Dependencies and config (10 lines)", value: "2 minutes: does each new package exist?" },
        { label: "Test changes (80 lines)", value: "5 minutes: any test weakened or unable to fail?" },
        { label: "Risky paths, auth and data (60 lines)", value: "6 minutes, line by line" },
        { label: "Core logic (200 lines)", value: "5 minutes, read against the requirement" },
        { label: "Run it with a new input", value: "2 minutes" },
        { label: "Not reviewed yet (50 lines)", value: "ask for a split, or a second reviewer" },
      ],
    },
    followUps: [
      {
        q: "The diff is 400 lines and you have 20 minutes. How do you prioritise?",
        a: "Risk first: authentication, data handling, deletion and payment paths, new dependencies and test changes, then the core logic. If it is too large to review properly, I ask for a split or a walkthrough of the design.",
      },
      {
        q: "The agent also reformatted unrelated files. Why does that matter?",
        a: "Noise hides real changes and makes review and reverts harder. I ask for the formatting in a separate change or have it reverted.",
      },
      {
        q: "A teammate says reviewing AI code is a waste because the tests pass. What do you answer?",
        a: "Tests only cover what they cover, and the agent stops when the work looks done. The checks that matter most (requirements, security, design) still need a person.",
      },
    ],
    mistakes: [
      "Approving because the tests pass.",
      "Reviewing the summary the agent wrote instead of the diff.",
      "Not checking new dependencies.",
      "Ignoring changes to the tests themselves.",
    ],
  },

  'when-not-to-use-an-ai-assistant-for-a-coding-task': {
    short:
      "The rule of thumb: the costlier and harder to undo a mistake is, and the weaker the automatic checks are, the more human attention the task needs. Hand over freely the work you can check quickly, such as boilerplate, mechanical refactors with strong tests and first drafts of documentation. Keep a person in charge of deciding what to build, architecture, security, money and anything that touches secrets or production. For a task not on any list, ask two questions: how will I know it is right, and what is the damage if it is wrong and I miss it?",
    explain: [
      {
        heading: "The rule underneath the list",
        body: "A list of tasks goes out of date the week after you write it. The reason behind it does not: an assistant produces plausible code, and plausible is not the same as correct, so the safety has to come from somewhere else. Two things provide it. One is a fast check that can fail, such as a strong test suite, a type checker or a script that verifies the result. The other is a small blast radius, meaning that if the code is wrong the damage is limited and easy to reverse. When both are weak, a person has to supply the safety by reading every line.",
      },
      {
        heading: "Examples on each side",
        body: "Automate more freely: boilerplate and scaffolding, mechanical refactors that have strong tests, drafting tests for behaviour that already exists (then review the assertions, because a test that cannot fail is useless), explaining unfamiliar code, summarising a diff, migrations that a script can verify, and first drafts of documentation. Keep a person in charge: deciding what to build and what done means, architecture and naming that other people will live with, authentication, payments, cryptography and data deletion, approving merges and deployments, and anything that touches secrets or production access.",
      },
      {
        heading: "Two questions for a new task, and when it is the wrong tool",
        body: "For a task that is on no list, ask: how will I know it is right, with a pass or fail check I can run in minutes? And what is the damage if it is wrong and I miss it? No check and high damage means do it by hand, or review line by line. It is also the wrong tool for code you could not review or explain, for a problem you do not yet understand (you will not recognise a wrong answer), and for code or data your policy forbids sending to the provider.",
      },
      {
        heading: "Autonomy is a dial, and you should measure",
        body: "Autocomplete, chat, edit mode, an agent and a background agent need different levels of review: the more autonomous the tool, the more your job becomes specifying the task and checking the result. Do not trust your feeling about speed, either. A 2025 randomised trial of experienced developers found they expected the tools to speed them up and were in fact slower on their own repositories, so time yourself on real tasks and revisit the rule.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Hand over freely", "Keep a person in charge"],
      rows: [
        { label: "Typical tasks", cells: ["Boilerplate, mechanical refactors, explaining code, doc drafts", "What to build, architecture, auth, payments, deletion, merges"] },
        { label: "How you check", cells: ["A fast test, type check or script that can fail", "Reading line by line, a second reviewer, tests written first"] },
        { label: "Cost of a missed mistake", cells: ["Small, easy to undo", "Large or hard to undo: money, data, security"] },
        { label: "Autonomy level", cells: ["Agent in a sandbox, a person approves the merge", "Autocomplete or chat at most, you write the core"] },
      ],
      caption: "The two columns are the ends of a dial, not two boxes. Most tasks sit in between, and the two questions in the text place them.",
    },
    example: {
      title: "Example: three tasks through the two questions",
      text: "Same two questions, three different answers. The tasks are examples, not a ruling for your codebase.",
      rows: [
        { label: "Rename a function across 40 files, tests cover it", value: "Check: tests, 2 minutes. Damage: low. Hand over, review the diff." },
        { label: "Draft the README for a tool you wrote", value: "Check: you read it. Damage: low. Hand over, then edit." },
        { label: "Change how refunds are calculated", value: "Check: weak. Damage: money moves. A person leads, tests first." },
        { label: "Add a login rule", value: "Check: weak. Damage: security hole. Write it yourself, get a second reviewer." },
      ],
    },
    followUps: [
      {
        q: "You are asked to change a function that handles refunds. How does your approach change?",
        a: "Money movement is hard to undo, so I write or review the tests first, use the assistant for drafts or explanations if at all, keep the change small and get a second reviewer. I check idempotency (a repeated request must not refund twice) and the failure paths myself.",
      },
      {
        q: "A tool says it can do the whole migration overnight in the background. What controls do you want?",
        a: "A sandbox with no production credentials, a branch and a pull request, a verification script, limits on steps and cost, and a person approving the merge.",
      },
      {
        q: "How do you avoid becoming dependent on the assistant for work you should understand?",
        a: "I write the core piece myself, or explain every line of the generated version, and I keep practising without the tool on the skills I need in order to review.",
      },
    ],
    mistakes: [
      "Saying everything should be automated, or that nothing should.",
      "Having no way to check the output.",
      "Handing authentication or payment code to an agent with no extra review.",
      "Merging generated code you cannot explain.",
    ],
  },

  'lead-ai-coding-assistant-team-policy': {
    short:
      "The policy has six parts: the person who merges is accountable for the code whoever wrote it, data rules say which tools are approved and what may be sent to them, agents run in a sandbox with no production credentials, extra checks cover typical AI-code risks such as invented packages, people stay in charge of design and security, and value is measured with outcomes like cycle time and rework instead of lines generated. Leadership gets the team's own before-and-after data, compared like with like, because people are poor judges of their own speed.",
    explain: [
      {
        heading: "Accountability and data rules",
        body: "The foundation is one sentence: whoever merges a change is responsible for it, and AI-written changes get the same review and tests as any other. Good tests and a fast feedback loop come first, because they are what lets you catch mistakes at all. Then the data rules: which tools are approved, what code and data may be sent to them, no secrets in prompts or files, and an option for code that must not leave the machine. Check the provider's terms for the exact product and plan you use, because they differ between consumer and business tiers.",
      },
      {
        heading: "Controls for agents and checks for AI-code risks",
        body: "An agent that runs commands needs a sandbox or container, no production credentials, approval for risky commands, read-only tokens where possible, and branch protection so a person approves each merge. Add checks for typical AI-code risks. Models invent package and function names, so every new dependency is verified before it is added. They can write insecure patterns, so security scanners run in the pipeline. And generated code raises licence and provenance questions, which are flagged for review and referred to legal (this is not legal advice).",
      },
      {
        heading: "Where people stay in charge",
        body: "Keep humans in charge of design decisions, security-critical code and anything touching data subjects (the people whose personal data it is). Put a repository context file in the repo with the team's conventions, such as how to name things, how to run tests and which patterns to avoid, so the tools follow them. A context file guides the tools but does not guarantee anything, so review remains.",
      },
      {
        heading: "Measure the value honestly",
        body: "Measure outcomes: cycle time from first commit to merge, review time, rework and reverts within two weeks, and escaped defects (bugs found after release), compared like with like and ideally by randomising which tasks use the tools. Do not count lines generated or suggestions accepted. A published randomised trial of experienced developers found tasks took longer with the early-2025 tools while the developers believed they were faster, and its authors say results depend on task and tool and may be out of date. So the team's own data is the evidence.",
      },
    ],
    diagram: {
      kind: 'layers',
      layers: [
        { label: "Measure outcomes honestly", sub: "cycle time, review time, rework, escaped defects" },
        { label: "People decide the important things", sub: "design, security-critical code, personal data, merges" },
        { label: "Checks for AI-code risks", sub: "verify dependencies, scanners, licence flags" },
        { label: "Agent controls", sub: "sandbox, no production credentials, approval for risky commands" },
        { label: "Data rules", sub: "approved tools, no secrets in prompts, provider terms checked" },
        { label: "Accountability", sub: "the person who merges owns the change" },
      ],
      caption: "The policy as a stack: each layer rests on the one below it, and measurement sits on top of all of them.",
    },
    example: {
      title: "Example: a measurement plan for a team of eight",
      text: "Example figures: eight developers who each merge about six changes a month give about 48 changes a month. A coin flip per task decides whether the tools are used. After three months that is about 144 changes in total, roughly 72 per group, which is enough to see a large effect but not a small one. Say that up front.",
      rows: [
        { label: "Sample (example)", value: "8 developers x 6 changes = 48 a month; about 144 in 3 months" },
        { label: "Primary measure", value: "Cycle time from first commit to merge" },
        { label: "Side measures", value: "Review time, rework within 14 days, escaped defects" },
        { label: "Design", value: "Randomise tasks if possible; otherwise a staggered rollout" },
        { label: "Not counted", value: "Lines generated, suggestions accepted, how fast people feel" },
      ],
    },
    followUps: [
      {
        q: "Leadership wants a single number for “productivity gain” in a month. What do you say?",
        a: "A month is too short and too noisy for one number. I offer a small set of measures with a baseline, and promise an honest range and a clear statement of what is known and what is not.",
      },
      {
        q: "A developer's agent installed a package that turned out not to exist under that name, and a similarly named one was malicious. What does your policy change?",
        a: "New dependencies are verified before they are added (existence, publisher, age, downloads), versions are locked and scanned, and the agent sandbox restricts installs. We also treat the incident as a process lesson, not one person's mistake.",
      },
      {
        q: "Junior engineers use the tools heavily. How do you keep them learning?",
        a: "I ask them to explain the code they merge, pair with them on design and debugging, give tasks that need understanding, and review for comprehension. The tools should be a way to learn faster, not a way to skip understanding.",
      },
    ],
    mistakes: [
      "Banning the tools outright with no data, or allowing everything with no rules.",
      "Measuring lines of code or suggestion acceptance and calling it productivity.",
      "Letting agents run with production credentials.",
      "Treating the developers' own feeling of speed as the measurement.",
    ],
  },

  'lead-candidate-used-ai-in-take-home': {
    short:
      "I would not accuse the candidate. The instructions said nothing about AI tools, so the gap is in our policy, and the real question is whether this person can direct, check and debug the work. I would probe in a live conversation with the same standard I use for everyone, decide on what they show and not on a hunch or a detector, and then fix our process so the next candidate knows the rules.",
    explain: [
      {
        heading: "Do not accuse: the silence is our gap",
        body: "Because the instructions never mentioned AI tools, you cannot fairly say the candidate broke a rule. AI tools are part of the job in most teams now, so the question that matters is not “who typed this?” but “can this person direct the work, check it and fix it?”. Judge the signal the role needs, which is understanding and judgement, and apply the same standard to every candidate for the role.",
      },
      {
        heading: "Probe fairly, live",
        body: "Run a live conversation and ask them to walk through the code, change a requirement on the spot, explain why they chose an approach, say what they would test, and say what they would do if an input changed. A person who understands their submission can do these things whoever wrote the first draft, and a person who cannot will show it kindly and clearly. Do not rely on AI-text detectors, which are unreliable and have wrongly flagged honest writers, and do not decide on a hunch about style.",
      },
      {
        heading: "If the instructions did prohibit tools",
        body: "That is a different conversation. Ask openly, give the candidate a chance to explain, and decide on the facts and not on a suspicion. Write down what you saw and what they said, treat them with respect throughout, and keep the evidence, because hiring decisions can be questioned later.",
      },
      {
        heading: "Fix the process",
        body: "State the tool policy in the instructions. Add a short live extension or code-review session after the take-home, so every candidate explains and modifies their own work. Design tasks that test judgement (framing the problem, choosing what to test, reviewing generated code) instead of the volume of output, because polish is now cheap.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'notice', label: "Notice the gap", sub: "polished work, shaky explanation" },
        { id: 'probe', label: "Probe live", sub: "walk through it, change a requirement" },
        { id: 'judge', label: "Judge understanding", sub: "against the rubric, same for everyone" },
        { id: 'decide', label: "Decide on facts", sub: "written evidence, no detector" },
        { id: 'fix', label: "Fix the process", sub: "state the tool policy, add a live step" },
      ],
      highlight: ['probe'],
      caption: "From suspicion to a fair decision. The live step is where the signal comes from.",
    },
    example: {
      title: "Example: a 30-minute live follow-up",
      text: "The same session for every candidate, scored on the same rubric of four items, each from 1 to 4. The numbers are an example of the shape, not a calibrated test.",
      rows: [
        { label: "5 min: walk me through it", value: "Can they explain the structure in their own words?" },
        { label: "10 min: change a requirement live", value: "Can they edit their own code without help?" },
        { label: "5 min: what would you test?", value: "Do they know where it could break?" },
        { label: "5 min: the input changes, now what?", value: "Do they reason about trade-offs?" },
        { label: "5 min: their questions", value: "Do they understand the role?" },
        { label: "Score", value: "Four rubric items, 1 to 4 each, out of 16, written before the debrief" },
      ],
    },
    followUps: [
      {
        q: "The candidate admits they used AI heavily but walks through every part and spots a bug you plant. What is your view?",
        a: "That is a good signal if the role allows tools: they can direct, verify and debug. I note how they checked the work (tests, reading, running it) and score them on judgement, not on whether they typed the code.",
      },
      {
        q: "Another candidate did it alone and delivered something less polished. How do you compare the two fairly?",
        a: "I compare both against the rubric (problem solving, testing, trade-offs, communication) and not against polish, since polish is cheap with tools. Both get the same live follow-up.",
      },
      {
        q: "Your own team uses AI tools every day. What does that imply for the take-home?",
        a: "Redesign it for how the job is done: allow tools, ask for working notes or prompts, and test the human part (framing, review, evaluation). A test that bans what the job uses measures something else.",
      },
    ],
    mistakes: [
      "Rejecting the candidate on suspicion with no conversation.",
      "Using an AI-detection tool as proof.",
      "Applying the rule to this candidate only.",
      "Having no tool policy and no plan to write one.",
    ],
  },

  'sa-live-demo-goes-wrong': {
    short:
      "In the next minute I stay calm and own the error in one sentence, without blaming the question or quietly re-running until it works. Then I turn it into evidence: show the source the assistant cited, show that it does not support the answer, and show how the system is meant to catch this, such as an “I could not find it” reply, a human review step, or logging. After the call I send a written follow-up within a day with what happened, the cause and the fix.",
    explain: [
      {
        heading: "The next minute",
        body: "Say something like: “That answer is wrong, and I would rather show you why than hide it.” One sentence, no drama. Do not blame the customer's question, and do not re-run until a good answer appears: that is cherry-picking (showing only the cases that worked), and a chief information security officer (CISO) will notice. Then open the source the assistant cited and show that it does not support the claim. That is the real lesson: the system has a trail you can check.",
      },
      {
        heading: "Turn it into evidence",
        body: "Show how the product is meant to handle this: an “I could not find it” response when the sources do not support an answer, a human review step for high-stakes questions, and feedback and logging so the failure is recorded and can be fixed. Say plainly that this is why the product is measured and why important answers need checks, and offer to show how failure categories are tracked. A CISO trusts the people who show their failures more than the people who say they have none.",
      },
      {
        heading: "Follow up in writing",
        body: "Within a day, send what happened (taken from the trace, the saved record of the run), the cause, and what was changed. Do not leave the customer to wonder. If the cause was your bug, say so plainly and do not present it as the model's inevitable weakness.",
      },
      {
        heading: "How to prepare, and how to set expectations",
        body: "Rehearse with realistic and awkward questions, not just friendly ones. Pin the model and data versions so the demo does not change under you, test the network and the quotas (the provider's rate limits), and keep a recorded fallback. Show a small eval summary with known failure types as part of the demo. Open by setting expectations: this is a live system that is sometimes wrong, and here is how it is evaluated. Never present a scripted path as unscripted.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "0 to 10 seconds: own it", detail: "One sentence: the answer is wrong, and here is what we do about that." },
        { label: "10 to 30 seconds: show the source", detail: "Open the cited passage and show it does not support the claim." },
        { label: "30 to 50 seconds: show the safety net", detail: "Show the “could not find it” path, the review step and the logs." },
        { label: "50 to 60 seconds: name the next step", detail: "Offer an agreed test set and criteria for a proof of concept." },
        { label: "Within a day: write it up", detail: "What happened, the cause from the trace, what changed." },
      ],
      caption: "A plan for the first minute and the day after. The goal is to show how failures are handled, not that there are none.",
    },
    example: {
      title: "Example: a rehearsal that makes this less likely",
      text: "Example figures: before the demo, run 50 awkward questions (typos, unknown terms, questions the documents do not answer). If 4 come back wrong, that is 4 / 50 = 8%, and you know your known failure types before the customer does. Put two of them in the demo on purpose with the safety net visible.",
      rows: [
        { label: "Awkward questions rehearsed", value: "50 (example)" },
        { label: "Wrong answers found", value: "4, which is 8%" },
        { label: "Versions pinned", value: "Model, prompt and document set" },
        { label: "Fallback ready", value: "A recorded run, and a smaller offline set of examples" },
      ],
    },
    followUps: [
      {
        q: "The security officer says, “So this is not production-ready?” How do you respond?",
        a: "I separate a demo from a production claim and do not defend the demo. I describe the evidence a production decision needs (an agreed test set, thresholds and controls) and propose a proof of concept with those criteria.",
      },
      {
        q: "A colleague suggests pre-loading the exact questions the customer will ask. Is that acceptable?",
        a: "Rehearsing is fine and sensible. Presenting rehearsed answers as live capability is not, so I disclose what was prepared and invite unscripted questions in a controlled way.",
      },
      {
        q: "Later you find the wrong answer was caused by a bug in your retrieval filter. How do you tell the customer?",
        a: "I report the root cause plainly and promptly, say what changed and how it will be tested, and do not present the bug as the model's inevitable weakness or hide that it was ours.",
      },
    ],
    mistakes: [
      "Blaming the question or the customer's data.",
      "Re-running the demo until the answer looks right and moving on.",
      "Claiming it “never does this”.",
      "Panicking, or ending the demo with no follow-up.",
    ],
  },

  'lead-mentor-engineer-whose-demos-never-ship': {
    short:
      "I would start by asking, not advising: walk through one stalled project together and find where it stopped, whether that is a skills gap, a process gap or an unclear definition of done. Then I would give a concrete definition of done (an evaluation set, a baseline, a launch checklist, a cost per request and monitoring), pair on the next project and build the first evaluation set together from 20 to 50 real cases. Finally I would change the team's system and my own incentives, so the right way is the easy way and production work is rewarded as visibly as demos.",
    explain: [
      {
        heading: "Diagnose with them first",
        body: "Pick one stalled project and walk through it together: where did it stop, and what was missing at that moment? The answer might be a skills gap (they have never built an evaluation set), a process gap (nobody asked for one) or an unclear definition of done (nobody said what shipping requires). Ask questions before giving advice, and recognise what they are good at: demos matter, because they win buy-in. Treat that as a real skill and build on it.",
      },
      {
        heading: "Give a concrete definition of done and pair on it",
        body: "“Be more rigorous” is not coaching. A concrete definition of done is: an evaluation set (fixed test cases with expected results), a baseline to compare with, a launch checklist, a cost per request and monitoring. Pair on the next project and build the first evaluation set together, starting with 20 to 50 real cases, then read the failures together. Show what production looks like with real traces, so the lesson comes from evidence and not from a lecture.",
      },
      {
        heading: "Change the system, not just the person",
        body: "If one person's habits can stall a project, the team's process has a hole. Add templates, a launch checklist, a shared evaluation harness (a script that runs the test cases and prints scores) and a weekly review of evaluation failures, so that the right way is the easy way for everyone and does not depend on one engineer.",
      },
      {
        heading: "Look at your own part, give feedback, and measure outcomes",
        body: "If leadership applauds demos and never asks about evaluation, people optimise for demos. Ask for production evidence in reviews and reward it visibly. Give specific, kind feedback regularly, and measure progress by outcomes (projects shipped with evaluations) rather than hours or effort.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "Week 1: diagnose", detail: "Walk through one stalled project together and find where and why it stopped." },
        { label: "Week 2: define done", detail: "Agree a written checklist: evaluation set, baseline, cost per request, monitoring." },
        { label: "Weeks 3 to 6: pair", detail: "Build the first evaluation set from 20 to 50 real cases and read the failures together." },
        { label: "Ongoing: change the system", detail: "Templates, a shared harness, a weekly look at evaluation failures." },
        { label: "Month 3: review outcomes", detail: "Count projects shipped with evaluations, and adjust the support." },
      ],
      caption: "A coaching plan that also leaves a team process behind.",
    },
    example: {
      title: "Example: what a first evaluation set can show",
      text: "Example figures: the engineer and you pick 30 real cases, run the current prompt, and 9 fail, which is 30%. With only 30 cases the 95% interval is wide, about 17% to 48%, so do not quote the number to anyone. But grouping the 9 failures by cause turns a vague worry into a work list, and the group sizes are what you act on.",
      rows: [
        { label: "Cases", value: "30 real ones (example)" },
        { label: "Failures", value: "9, which is 30%, interval about 17% to 48%" },
        { label: "Cause: retrieval missed the document", value: "4 cases" },
        { label: "Cause: wrong output format", value: "3 cases" },
        { label: "Cause: refused a valid request", value: "2 cases" },
      ],
    },
    followUps: [
      {
        q: "Three months later they still ship without evaluations. What do you do?",
        a: "I have a direct conversation with clear, written expectations and support, and check whether obstacles remain. Then I state consequences appropriate to the situation, keep it factual and follow the company's process.",
      },
      {
        q: "They say, “Evaluations slow me down.” How do you respond?",
        a: "I take it seriously and make evaluation cheap with a harness and a small first set. Then I use their own project to show what a failure found late costs, without lecturing.",
      },
      {
        q: "How do you make production work as visible and rewarded as demos on your team?",
        a: "Show reliability and quality metrics in reviews, celebrate a clean launch or a regression caught before release, include evaluation results in project updates, and tie recognition and promotion criteria to shipped outcomes.",
      },
    ],
    mistakes: [
      "Treating it as a personal failing and saying nothing specific.",
      "Taking over the project and doing it for them.",
      "Changing nothing in team process.",
      "Rewarding demos and then complaining about demos.",
    ],
  },

  'sa-customer-says-just-fine-tune': {
    short:
      "I would start by asking what problem they want to solve, and treat the idea with respect, then separate what each tool changes: prompting changes instructions, retrieval supplies facts at question time, and fine-tuning mostly changes behaviour, style, format or a narrow skill. Fine-tuning is a weak way to add facts, because facts change, answers cannot cite sources, permissions cannot be enforced inside the model, and removing a document later is hard. I would propose prompt first, retrieval for knowledge, and fine-tuning only for a gap we have measured.",
    explain: [
      {
        heading: "What each approach changes",
        body: "Prompting changes the instructions the model sees. Retrieval (looking up the right passages at question time and pasting them into the prompt) supplies facts. Fine-tuning (training a model a little more on your own examples) mostly changes behaviour: tone, output format, or skill at one narrow task. So “it knows our business” is a facts problem, and facts are what retrieval is built for. Start by asking the CTO what the model should do that it cannot do now. Perhaps the real need is something fine-tuning does well.",
      },
      {
        heading: "Why fine-tuning is a weak way to add facts",
        body: "A policy changes next month and the tuned model does not know it changed. Answers cannot cite a source, so nobody can check them. Per-user permissions cannot be enforced inside the weights: if a document was in the training data, anyone who can query the model might get it back. And removing a document later is hard once it has been trained in. Training on internal documents also raises privacy questions about what the model may memorise and who can query it.",
      },
      {
        heading: "Fine-tuning is not free",
        body: "It needs data preparation, an evaluation set, hosting a custom model, and a repeat of the whole job when the base model is replaced or retired, which happens. “Cheaper than retrieval” leaves out all of that. Retrieval has its own costs (indexing, search quality), but they are well understood and a document update is just a re-index.",
      },
      {
        heading: "A sensible order, and make it testable",
        body: "Prompt first, retrieval for knowledge, and fine-tune only for a measured gap, such as a consistent output format or a smaller, cheaper model on a narrow task. Make it testable: build a baseline with a prompt and retrieval, run it on the customer's own evaluation questions, look at what kind of failures remain, and only then decide whether fine-tuning addresses them. That treats the CTO's idea as a hypothesis to test, not a mistake to correct.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Prompting", "Retrieval", "Fine-tuning"],
      rows: [
        { label: "Mostly changes", cells: ["Instructions", "Facts at question time", "Behaviour, style, format, one skill"] },
        { label: "When a fact changes", cells: ["Edit the prompt", "Re-index the document", "Retrain and re-check"] },
        { label: "Can cite a source", cells: ["Only if given one", "Yes", "No"] },
        { label: "Per-user permissions", cells: ["In the app", "Enforced at search time", "Not possible inside the weights"] },
        { label: "Remove a document", cells: ["Delete it", "Delete and re-index", "Hard once trained in"] },
        { label: "Upkeep", cells: ["Low", "Index and search quality", "Data, evals, hosting, retraining"] },
      ],
      caption: "Where each approach fits. The row about changing facts is why fine-tuning is the wrong first tool for company knowledge.",
    },
    example: {
      title: "Example: what a document update costs",
      text: "Example figures: a company has 2,000 policy documents and 100 of them change in a month. With retrieval, those 100 are re-indexed, usually the same day, and a deleted document stops appearing at once. With fine-tuning, the model has to be retrained or tuned again, re-evaluated, and re-deployed to include the changes, and removing a single document means doing that again. When the base model is retired, the whole fine-tune is repeated.",
      rows: [
        { label: "Documents (example)", value: "2,000" },
        { label: "Changed in a month (example)", value: "100, which is 5%" },
        { label: "Retrieval", value: "Re-index 100 documents, check a sample of answers" },
        { label: "Fine-tuning", value: "Rebuild data, retrain, re-run evals, re-deploy" },
      ],
    },
    followUps: [
      {
        q: "“Our terminology is unusual, and the base model does not know it.” What do you do?",
        a: "I try a glossary in the prompt or retrieval first, and test it. If a gap remains in a narrow task such as classification, fine-tuning may be justified, and I measure before and after.",
      },
      {
        q: "What would convince you that fine-tuning is the right move?",
        a: "A measured gap that persists after prompt and retrieval work, stable labelled data, and a volume or latency case where a small tuned model beats a large general one on cost. And a willingness to be proven wrong.",
      },
      {
        q: "Suppose they fine-tune anyway on files that include personal data. What are your concerns?",
        a: "Memorisation and leakage, no easy way to delete, access control over who can query the model, data-processing permissions, and the need to run extraction tests. I would recommend data minimisation and a privacy review before training.",
      },
    ],
    mistakes: [
      "Saying “fine-tuning never works” without nuance.",
      "Agreeing that fine-tuning is the way to give a model company knowledge.",
      "Dismissing the CTO's idea instead of testing it.",
      "Ignoring permissions and deletion.",
    ],
  },

  'lead-roadmap-prioritisation-expected-value': {
    short:
      "Expected net value is chance of success times annual value, minus cost. On the example numbers that gives C (FAQ search) +$160k, D (forecasting) +$115k, A (reply drafting) +$90k and B (contract negotiation) minus $60k, so the order is C, D, A, B, and C also has by far the best return per dollar at 4.0. These inputs are guesses, so I would test which one flips the ranking, look past the arithmetic at risk, data readiness and what each project teaches the team, and give the vice president's favourite a small time-boxed spike with a stated decision rule.",
    explain: [
      {
        heading: "The arithmetic",
        body: "Expected value (EV) is the average result if you could repeat the bet many times: chance times value. A: 0.6 x $400k = $240k, minus the $150k cost, is +$90k. B: 0.2 x $1,200k = $240k, minus $300k, is minus $60k. C: 0.8 x $250k = $200k, minus $40k, is +$160k. D: 0.35 x $900k = $315k, minus $200k, is +$115k. By net value the order is C, D, A, B. Return per dollar spent (net divided by cost) is A 0.6, B minus 0.2, C 4.0 and D about 0.58, so C is far ahead on efficiency. With capacity for two, C plus D costs $240k and returns a net of $275k.",
      },
      {
        heading: "How sure is the ranking?",
        body: "The chances and values are guesses, so test the ranking against them. B has the same expected gross value as A ($240k) but costs twice as much, so it needs a success chance of at least $300k / $1,200k = 25% just to break even in expectation. At 30% it nets +$60k, and the estimate is 20%, so the whole project hangs on one number nobody can measure yet. That sensitivity is the finding to report, because it tells you what to learn before committing.",
      },
      {
        heading: "What I would do beyond the arithmetic",
        body: "Numbers leave things out. Autonomous negotiation carries risk of harm and legal exposure, and it is hard to undo. D is a forecasting problem, a job for classical statistics and machine learning, not an LLM one, so it needs different skills and clean historical data. Ask about data readiness, dependencies, user pull and reversibility, and what each project teaches the team. C is a quick win that also builds an evaluation harness (a repeatable way to score answers) that the later projects can reuse.",
      },
      {
        heading: "Handling the favourite, and writing it down",
        body: "Do not just say no to B and do not fund it in full. Propose a small spike of a few weeks with a stated decision rule: for example, build a narrow version on a handful of real contracts, and continue only if the evidence moves the chance of success to 35% or more (comfortably over the 25% break-even). Write the reasoning on one page with the assumptions visible, and agree when the estimates will be revisited, with new evidence replacing opinion.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "chance that B works (percent)",
      yLabel: "expected net value of B ($ thousand)",
      points: [[10, -180], [20, -60], [25, 0], [30, 60], [40, 180], [50, 300]],
      marks: [
        { x: 20, label: "the estimate: minus $60k" },
        { x: 25, label: "break-even at 25%" },
      ],
      caption: "Net value of B = chance x $1,200k - $300k. It crosses zero at 25%, so the ranking depends on a number the team cannot yet measure.",
    },
    example: {
      title: "Example: all four projects side by side",
      text: "All figures are the question's example estimates, worked out as chance x value minus cost, in thousands of dollars. Net divided by cost is the return per dollar.",
      rows: [
        { label: "A: reply drafting", value: "240 - 150 = +90, return 0.6" },
        { label: "B: contract negotiation", value: "240 - 300 = -60, return -0.2" },
        { label: "C: FAQ search", value: "200 - 40 = +160, return 4.0" },
        { label: "D: forecasting upgrade", value: "315 - 200 = +115, return about 0.58" },
        { label: "Best two by net value", value: "C + D: cost 240, net 275" },
        { label: "B break-even", value: "300 / 1,200 = 25%; at 30%, net +60" },
      ],
    },
    followUps: [
      {
        q: "“Those probabilities are made up.” How do you respond?",
        a: "I agree they are estimates. I improve them by asking several people independently, using ranges, and checking which assumptions would flip the ranking. A decision under uncertainty still has to be made, and explicit guesses are better than hidden ones.",
      },
      {
        q: "Halfway through C, usage data suggests its value is half what you estimated. What do you do?",
        a: "I ignore the money already spent and compare the remaining cost with the revised remaining value, and I consider a cheap way to raise usage before continuing. If the numbers no longer justify finishing, I stop it.",
      },
      {
        q: "Your team can only deliver one project well this half. Which and why?",
        a: "C on return and risk, or D on absolute value if the team has the capacity and skills, with a clear reason and the criteria that would change the choice. I would not split the team thinly across both.",
      },
    ],
    mistakes: [
      "Ranking by value alone and ignoring probability and cost.",
      "Treating the estimates as facts.",
      "Dismissing the vice president's idea with no evidence or alternative.",
      "Funding everything “to keep options open”.",
    ],
  },

  'pm-acceptable-error-rate-invoice-extraction': {
    short:
      "I would set the acceptable error rate from what an escaped error costs and from what the current process achieves, not from a round number. The human baseline is 2% errors, about $34,800 a day all-in; the model with no review costs about $15,000 a day but lets through three times as many errors. A review band for the least confident quarter of invoices brings the total to about $8,928 a day with a 2.2% escape rate, which is slightly above the human rate, so I would show that gap openly and tighten checks on the severe fields before launch.",
    explain: [
      {
        heading: "Price the baseline and the no-review option",
        body: "Humans are the honest baseline. At 2% errors on 20,000 invoices that is 400 errors a day, and at $12 to fix each it is $4,800, plus manual entry at $1.50 x 20,000 = $30,000, so about $34,800 a day. The model with no review: at an example $0.03 an invoice the model costs $600, and its 6% error rate gives 1,200 errors, $14,400 to fix, so about $15,000 a day. That is cheaper, but the escape rate (errors that reach the ledger) is 6%, three times the human rate. “94% correct” alone is not an answer: it has to be turned into a cost.",
      },
      {
        heading: "Design a review path, not all or nothing",
        body: "Have the model report a confidence score, and send the least confident 25% of invoices (5,000) to a person at an example $0.60 each, which is $3,000. Suppose those 5,000 hold 70% of the errors, 840 of the 1,200, and reviewers catch 90% of them, 756. Then 1,200 - 756 = 444 errors escape: 444 / 20,000 = 2.2% of invoices, $5,328 to fix. The total is $600 + $3,000 + $5,328 = $8,928 a day. The honest reading is that this is much cheaper than manual entry and slightly worse on escapes (2.2% against 2.0%), so cheaper is not yet as safe. Widen the band, or show that the errors that escape are less severe.",
      },
      {
        heading: "Error types differ, and the confidence signal must be earned",
        body: "A wrong supplier name is minor. A wrong amount or a wrong bank account is severe. Set a tighter target, or mandatory review, on the severe fields and measure each field separately, not one overall score. Also test the confidence signal on labelled data: the errors must really cluster in the low-confidence band, or the review budget is wasted. Audit a random slice of the auto-approved pile too, because the unreviewed 15,000 invoices still hold 360 errors, 2.4%, a figure no dashboard will show unless you sample for it.",
      },
      {
        heading: "Write the launch criteria before the pilot",
        body: "Turn it into criteria agreed before you look at results: error rate per field with an interval, an escape rate under the human baseline, a review load that fits reviewer capacity (5,000 invoices x 1.2 minutes is 6,000 minutes, or 100 hours of reviewer time a day, which at an example $30 an hour is the $3,000 above), and a rollback rule that returns work to manual entry if the numbers slip.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "dollars a day",
      items: [
        { label: "Manual entry", value: 34800, note: "$30,000 entry + $4,800 for 400 errors (2.0%)" },
        { label: "Model only, no review", value: 15000, note: "$600 model + $14,400 for 1,200 errors (6.0%)" },
        { label: "Model plus review band", value: 8928, note: "$600 + $3,000 + $5,328 for 444 errors (2.2%)", hot: true },
      ],
      caption: "Daily cost for 20,000 invoices with the example prices in the text. The review option is cheapest, but its escape rate is slightly above the human 2.0%.",
    },
    example: {
      title: "Example: the review band, step by step",
      text: "All inputs are the question's examples or labelled as assumptions: 25% of invoices reviewed, 70% of errors fall in that band, reviewers catch 90% of the errors they see, a review costs $0.60 (1.2 minutes at $30 an hour). The 2.2% against 2.0% gap is tiny, so on a pilot of 500 invoices (2.2% is 11 errors, interval about 1.2% to 3.9%) it cannot be separated from the human rate. That is why the pilot needs enough invoices and the same invoices checked both ways.",
      rows: [
        { label: "Invoices reviewed", value: "25% x 20,000 = 5,000 at $0.60 = $3,000" },
        { label: "Errors in the band", value: "70% x 1,200 = 840" },
        { label: "Caught by reviewers", value: "90% x 840 = 756" },
        { label: "Errors that escape", value: "1,200 - 756 = 444, which is 2.2%" },
        { label: "Of those, unreviewed", value: "360 in 15,000 invoices, which is 2.4%" },
        { label: "To reach 2.0% (400 escapes)", value: "catch at least 800 of the 1,200 errors" },
      ],
    },
    followUps: [
      {
        q: "The director says 2.2% versus 2.0% is close enough. Do you agree?",
        a: "It depends on sample size and severity. On a pilot of a few hundred invoices the difference is far inside the noise, so compare with intervals on the same invoices and weigh the types of errors that escape, not the headline rate. I would not say yes or no from one number.",
      },
      {
        q: "Reviewers are slower than assumed and the queue grows. What do you change?",
        a: "I look at load (items sent x minutes each / reviewer minutes available), then narrow the band or add reviewers, sort the queue by risk and age so nothing waits forever, and alert on queue age. I do not quietly raise the auto-approve threshold to clear the backlog.",
      },
      {
        q: "Six months on, a supplier changes its invoice layout and accuracy drops. How would the product have caught it?",
        a: "Per-field monitoring on sampled, human-checked invoices, input checks (new layouts, missing fields), a spike in the low-confidence rate, and an alert on the correction rate. Labels arrive late, so early input signals plus deliberate sampling matter.",
      },
    ],
    mistakes: [
      "Quoting 94% accuracy as the answer with no cost of an error attached.",
      "Treating all fields and all errors as equal.",
      "Choosing between “full automation” and “manual” with no review band.",
      "Having no baseline for the current human error rate.",
    ],
  },

  'is-the-assistant-making-the-team-faster-cycle-time': {
    short:
      "Lines of code and accepted suggestions measure activity, not value, and cycle time (first commit to merge) can improve far less than the typing speed does. On invented numbers, coding time halving from 6 hours to 3 hours still leaves a change at 8 hours instead of 9, only about 11% faster, if review grows from 2 to 3 hours and rework from 1 to 2. Published studies give very different answers depending on the task and tool, so I would measure my own team on matched tasks and report cycle time, review time, rework and escaped defects together.",
    explain: [
      {
        heading: "Activity is not value, and the bottleneck moves",
        body: "Lines generated and suggestions accepted show that the tool is being used. The outcomes that matter are cycle time from first commit to merge, review time, rework (fixes and reverts within two weeks) and escaped defects (bugs found after release). Here is the shape with invented numbers. Before: 6 hours of coding, 2 hours waiting for review and 1 hour of rework is 9 hours a change. After: coding halves to 3 hours, but the diffs are bigger and less familiar so review grows to 3 hours, and rework to 2 hours. That is 8 hours, about 11% faster, not 50%. If coding gets faster and review, testing and deployment do not, the constraint moves, and bigger pull requests can make review slower.",
      },
      {
        heading: "What the studies show, and do not show",
        body: "One controlled experiment (Peng and colleagues, 2023) had developers implement an HTTP server in JavaScript, and the group with the assistant finished 55.8% faster, but on a single isolated task. A 2025 randomised trial by METR of 16 experienced open-source developers on 246 tasks in their own repositories found tasks took 19% longer with the tools of the time, while the developers had expected a 24% speed-up and afterwards believed they had been 20% faster. Its authors say it is not representative of most software work and mark the result as out of date.",
      },
      {
        heading: "The honest summary",
        body: "METR reported in February 2026 that a follow-up showed shorter task times with newer tools, but called its own data unreliable because many developers would not work without AI and withheld tasks. Check the current version of that write-up before quoting it. The fair summary is that the effect depends on the task, the developer, the codebase and the tool, and that people misjudge their own speed. Treat vendor numbers and self-reports as weak evidence, and decide with local data.",
      },
      {
        heading: "How to measure it in your team",
        body: "Compare like with like, ideally by randomising which tasks use the assistant, and track cycle time, review time, rework and escaped defects before and after, with intervals. Watch the quality side and developer experience as well, so that a gain in speed is not borrowed from quality.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Before", "After"],
      rows: [
        { label: "Coding", cells: ["6 hours", "3 hours"] },
        { label: "Waiting for review", cells: ["2 hours", "3 hours"] },
        { label: "Rework", cells: ["1 hour", "2 hours"] },
        { label: "Cycle time per change", cells: ["9 hours", "8 hours, about 11% faster"] },
        { label: "Lines and suggestions", cells: ["baseline", "up a lot, which says nothing about the row above"] },
      ],
      caption: "Invented numbers to show the shape, not data from any team: coding gets twice as fast while the whole change gets only 11% faster.",
    },
    example: {
      title: "Example: the numbers people quote, and how to read them",
      text: "The arithmetic for the invented example is (9 - 8) / 9 = 11%. The study numbers come from the sources above and each has a narrow scope.",
      rows: [
        { label: "Invented example", value: "9 hours down to 8 hours is 11% faster" },
        { label: "Controlled experiment, 2023", value: "55.8% faster, one isolated JavaScript task" },
        { label: "METR trial, 2025", value: "19% slower, 16 developers, 246 tasks, their own repositories" },
        { label: "What they expected / believed", value: "24% faster expected, 20% faster believed afterwards" },
        { label: "February 2026 follow-up", value: "faster, but the authors call the data unreliable" },
      ],
    },
    followUps: [
      {
        q: "Developers say they feel much faster. Does that settle it?",
        a: "No: perceived speed was wrong in the 2025 trial. I measure time on matched tasks and check quality too.",
      },
      {
        q: "You cannot randomise tasks. What is the next best design?",
        a: "A staggered rollout across teams with a comparison group, matching task types and tracking the same metrics before and after. The causal claims are weaker, and I say so.",
      },
      {
        q: "Cycle time improves but the defect rate rises. What do you conclude?",
        a: "The gain may be borrowed from quality. I compare the cost of rework and incidents, strengthen review and tests, and report both numbers.",
      },
    ],
    mistakes: [
      "Using lines of code or acceptance rate as the measure of productivity.",
      "Quoting one study as proof of a large speed-up or slow-down for everyone.",
      "Trusting self-reported speed.",
      "Ignoring review and rework time.",
    ],
  },

  'review-ai-written-function-four-hidden-flaws': {
    short:
      "Each flaw is a different kind of failure that passing tests did not catch: a query built by pasting the id into the text can be rewritten by the input, so use placeholders. A catch-all that returns an empty list makes every failure look like “no orders”, so catch only what you can handle. A shared default list leaks one call's results into the next, so default to None. Comparing floating-point money with == fails on amounts like 0.1 + 0.2, so use integer cents or a decimal type, and write a test for each flaw that fails before the fix.",
    explain: [
      {
        heading: "The query and the swallowed errors",
        body: "String-built SQL: when the customer id is inserted directly into the query text, an input containing query syntax can change what the query does. That is the injection risk, and it also breaks on legitimate characters such as an apostrophe in an id. The fix is a parameterised query (placeholders, with values passed separately so the database never treats them as code) plus validating the id type. Test with an id containing quotes and punctuation. Catch-all returning an empty list: a database outage, a typo and a real customer with no orders all look the same, so errors are hidden and downstream code acts on false data. Catch only the exceptions you can handle, log with context, and let the others propagate or raise a clear error. Test the failure path.",
      },
      {
        heading: "The shared default and the float comparison",
        body: "Mutable default argument: in Python a default value is created once, when the function is defined, so the same list is shared between calls. Results from one request leak into the next, which can expose one customer's orders to another, and the bug only shows on the second call. Use None as the default and create a new list inside the function. Test by calling twice. Float totals and ==: binary floating point cannot represent many decimal amounts exactly, so equal totals compare as unequal. Store money as integer minor units (cents) or use a decimal type, and compare exact values. Test with amounts such as 0.1 and 0.2.",
      },
      {
        heading: "Why the tests passed, and how to prove the fix",
        body: "The existing tests exercised the happy path with simple data: one call, a single customer and values that happen to be exact. They could not fail on any of these flaws. So for each flaw, add a test that fails on the old code and passes on the new, because that is the evidence the fix works. A fix with no failing test first proves nothing.",
      },
      {
        heading: "Tools, and defence in depth",
        body: "Run a linter, a type checker and a security scanner, and treat them as a floor, not a substitute for reading. The common categories of problems in AI-written code are plausible but wrong logic, security flaws, removed or swallowed checks, and tests that assert nothing. Add defence in depth: the database account should have only the permissions the function needs, and per-user access control should be enforced in the data layer, so one mistake in the function is not the only barrier.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["What goes wrong", "Fix and test"],
      rows: [
        { label: "SQL built from a string", cells: ["Input can change the query, and odd characters break it", "Placeholders; validate the id; test an id with quotes"] },
        { label: "Catch-all returns []", cells: ["Outage or bug looks like no orders", "Catch only what you can handle, log, raise; test the failure path"] },
        { label: "Default argument is a list", cells: ["One call's results leak into the next", "Default None, new list inside; test two calls"] },
        { label: "Float total compared with ==", cells: ["Equal amounts compare as unequal", "Integer cents or Decimal; test 0.1 and 0.2"] },
      ],
      caption: "Four flaws, the failure each one causes, and the test that would have caught it.",
    },
    example: {
      title: "Example: the float and shared-default failures in numbers",
      text: "In Python, 0.1 + 0.2 gives 0.30000000000000004, so 0.1 + 0.2 == 0.3 is False. In integer cents it is 10 + 20 == 30, which is True. For the shared default, if the first call appends 2 orders for customer 7 to the default list, a second call for customer 8 that finds one order returns 3 items, two of which belong to customer 7.",
      rows: [
        { label: "Float", value: "0.1 + 0.2 == 0.3 is False" },
        { label: "Integer cents", value: "10 + 20 == 30 is True" },
        { label: "Shared default, call 1 (customer 7)", value: "2 orders returned" },
        { label: "Shared default, call 2 (customer 8)", value: "3 items returned, 2 belong to customer 7" },
      ],
    },
    followUps: [
      {
        q: "How would you ask the assistant to fix this so that the same mistakes are less likely next time?",
        a: "Put the rules in the instruction file (parameterised queries, no bare except, no mutable defaults, money as integers), give it the failing tests first, and keep the review step. The instructions guide but do not guarantee.",
      },
      {
        q: "Which of the four would a unit test written by the same assistant be most likely to miss?",
        a: "Tests written from the implementation tend to share its assumptions, so the swallowed exception and the shared default are easy to miss. I write cases from the requirements, including failure paths and repeated calls.",
      },
      {
        q: "What does a security scanner catch here and what does it not?",
        a: "It may flag the string-built query but not the swallowed error, the shared default or the float comparison. Those are logic issues that need review and tests.",
      },
    ],
    mistakes: [
      "Saying the tests pass so the code is fine.",
      "Fixing the code without adding a test that fails before the fix.",
      "Describing an exploit payload instead of the defensive fix.",
      "Suggesting a catch-all that is just a more careful catch-all.",
    ],
  },

  'fde-vague-ask-to-success-criteria': {
    short:
      "I would pin down every word in the request: faster at which step, measured how and from what baseline; more accurate compared with whom, and which errors matter most. Then I would pick one workflow with one primary metric and guardrails, measure the baseline in week one, and agree in writing the test set, the pass line as a number with its interval, the in-between rule, the scope, the decider and the decision date. Nothing gets built until the sponsor and the people who will run the checks have agreed.",
    explain: [
      {
        heading: "Pin down each word and choose one thing to measure",
        body: "“Faster” needs a step (opening a claim, reading documents, writing the decision letter), a way of measuring it and a starting point. “More accurate” needs a comparison (compared with whom or what?) and a view on which errors matter most: a wrong payout amount is not the same as a wrong category tag. Choose one workflow and one primary metric, for example minutes per claim on one claim type. Add guardrail metrics that must not get worse: error rate on the costly cases, escalation rate, user satisfaction and cost per case.",
      },
      {
        heading: "Baseline, test set and pass line",
        body: "In week one, measure the baseline, for example by timing a sample of real cases, because without it no improvement can be shown and the customer will compare with a memory. Agree in writing the test set: real cases, labelled by the customer's own experts and held out from tuning. Agree the pass line as a number with its interval, and what happens in between: extend, narrow, or stop. Settle these before any result exists, because a bar set after seeing the results is not a bar.",
      },
      {
        heading: "Scope, decision and cost",
        body: "State what is out of scope for the pilot, who decides at the end (go, narrow, stop), and the date of that decision. Include cost and operations in the criteria, such as cost per case and who would run it, so the pilot answers “should we adopt this?” and not only “does it work?”.",
      },
      {
        heading: "Agreement that sticks",
        body: "Get the agreement from the sponsor and from the people who will run the checks, and keep a change log so the criteria cannot drift unnoticed. If something has to change, change it in writing, with the reason, before the next result arrives.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'words', label: "Pin down the words", sub: "faster at what step, accurate compared with what" },
        { id: 'metric', label: "One workflow, one metric", sub: "plus guardrails that must not slip" },
        { id: 'base', label: "Measure the baseline", sub: "time a sample of real cases in week one" },
        { id: 'bar', label: "Agree test set and pass line", sub: "a number with its interval, in writing" },
        { id: 'rule', label: "Set the decision rule", sub: "who decides, by when, and what in between means" },
      ],
      highlight: ['bar'],
      caption: "The order of the first week or two: everything here happens before the build starts.",
    },
    example: {
      title: "Example: why the interval belongs in the agreement",
      text: "Example figures: the agreed bar is 90% correct on real claims. If the test set has 100 cases and the pilot scores 86%, the 95% interval runs from about 77.9% to 91.5%, which includes 90%, so the result is inconclusive. On 400 cases the same 86% gives about 82.3% to 89.1%, which excludes 90%, a clear miss. A set of about 384 cases is what you need for an interval of roughly plus or minus 3 points around 90% (1.96 squared x 0.9 x 0.1 / 0.03 squared).",
      rows: [
        { label: "Bar", value: "90% correct on held-out real cases" },
        { label: "86% on 100 cases", value: "interval 77.9% to 91.5%: cannot tell" },
        { label: "86% on 400 cases", value: "interval 82.3% to 89.1%: below the bar" },
        { label: "Cases for plus or minus 3 points at 90%", value: "about 384" },
      ],
    },
    followUps: [
      {
        q: "The sponsor wants “95% accuracy” and has no basis for the number. What do you do?",
        a: "I ask what a wrong answer costs and what the current process achieves. I treat 95% as a hypothesis, propose measuring the human baseline and the cost of each error type, and set the bar from that and not from a round number.",
      },
      {
        q: "Compliance wants zero errors and operations wants speed. They will not agree. What now?",
        a: "I make the trade-off visible, for example a table of error types with their cost, and propose routing by risk: automate the low-risk part and review the rest. The decision goes to the sponsor, and I do not choose silently.",
      },
      {
        q: "Week three: results are 4 points under the agreed bar, with an interval that includes it. What do you do?",
        a: "I follow the pre-agreed rule for the in-between case and do not move the goalposts. I show which error types are fixable, propose a time-boxed extension or a narrower scope, and report the uncertainty honestly.",
      },
    ],
    mistakes: [
      "Accepting “faster and more accurate” as the definition of success.",
      "Starting to build and planning to “figure out the metrics later”.",
      "Defining success after seeing the results.",
      "Measuring only a demo on cases the team picked.",
    ],
  },

  'lead-interview-loop-for-ai-engineer': {
    short:
      "Start from what the person will do in their first six months, list the signals that matter (building and shipping, evaluation thinking, debugging, product judgement, communication, ownership), and give each stage one distinct signal. Test them with a realistic practical exercise, a design conversation, a direct evaluation question and a behavioural interview, with a rubric written before the first interview and independent notes before the debrief. Avoid puzzles, memorised definitions and pedigree, and keep the loop short and respectful.",
    explain: [
      {
        heading: "Signals first, then one stage for each",
        body: "A loop is a set of measuring instruments, and two instruments that measure the same thing waste the candidate's time. So write down the signals first: can they build and ship, do they think about evaluation, can they debug, is their product judgement sound, can they communicate, do they take ownership? Then give each stage one distinct signal. Expect different depth for a junior and a senior hire, and write the level into the rubric.",
      },
      {
        heading: "How to test each signal",
        body: "Use a realistic practical exercise instead of trivia, for example: here is a trace of a failing retrieval-based assistant, find the cause and propose a fix, or improve a prompt using a small evaluation set. Time-box it, and say plainly whether AI tools are allowed. Add a design conversation on a real scenario with trade-offs (cost, latency, safety, how they would know it works). A behavioural interview asks for specifics and numbers from past projects, not generalities. And test evaluation thinking directly: “How would you know this feature works, and how would you find out it stopped working?” That question separates people who ship demos from people who ship products.",
      },
      {
        heading: "Make the scoring fair",
        body: "Write a rubric before the first interview, with the same questions for the role and behaviour-based anchors (what a 1, a 3 and a 4 look like). Have each interviewer write independent feedback before the debrief, so the loudest voice does not set the answer for everyone, and calibrate interviewers against each other. Afterwards, track how well the interview predicted performance and adjust.",
      },
      {
        heading: "What to avoid, and the candidate's side",
        body: "Avoid puzzles, memorised definitions and questions whose answer is a framework name, and avoid over-weighting pedigree or confident delivery. Keep the candidate experience respectful: clear instructions, a short loop (for example four to five touchpoints), timely decisions and useful feedback.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Signal", "How it is tested"],
      rows: [
        { label: "Conversation with the hiring manager (30 min)", cells: ["Motivation, the role", "Two-way questions, scope of the job"] },
        { label: "Practical exercise (60 min)", cells: ["Building and debugging", "Fix a failing retrieval assistant from a trace; tools policy stated"] },
        { label: "Design conversation (60 min)", cells: ["Trade-offs and judgement", "A real scenario: cost, latency, safety, how would we know it works"] },
        { label: "Behavioural interview (45 min)", cells: ["Ownership, communication", "Specifics and numbers from past projects"] },
        { label: "Evaluation conversation (30 min)", cells: ["Evaluation thinking", "How would you know it works, and that it stopped working?"] },
      ],
      caption: "One distinct signal per stage. The times are an example of a short loop of five touchpoints.",
    },
    example: {
      title: "Example: how long the loop takes, and a rubric anchor",
      text: "Example figures: 30 + 60 + 60 + 45 + 30 = 225 minutes, which is 3.75 hours of candidate time, a reasonable ask for a mid-level hire. Each interviewer scores the signal on a 1 to 4 scale with written anchors, for example for evaluation thinking, a 4 is “describes a test set from real cases, a baseline and a monitoring plan with numbers”, and a 1 is “says they would check it looks right”.",
      rows: [
        { label: "Touchpoints", value: "5" },
        { label: "Candidate time", value: "30 + 60 + 60 + 45 + 30 = 225 minutes" },
        { label: "Before the first interview", value: "Rubric with 1 to 4 anchors for each signal" },
        { label: "Before the debrief", value: "Each interviewer submits written scores and notes alone" },
      ],
    },
    followUps: [
      {
        q: "A candidate is strong on engineering but has never done an evaluation. Do you hire?",
        a: "It depends on level and coachability. For a mid or senior role it is a real gap, so I probe whether they understand the idea when explained and whether the team can teach it, and decide against the rubric and the team's needs, not on a feeling.",
      },
      {
        q: "A candidate answers every question with the name of a framework but cannot say what they shipped. How do you probe?",
        a: "I ask for one concrete project: what was the goal, what did they personally do, what went wrong, what numbers moved, and what would they do differently. I follow the thread until it either becomes specific or does not.",
      },
      {
        q: "A senior stakeholder pushes for a candidate with a famous employer whom the loop scored low. What do you do?",
        a: "I take the evidence to the stakeholder, show the scores against the rubric, ask what signal the loop missed, and hold the bar if the evidence stands. I may add one targeted interview, but I do not override the process quietly.",
      },
    ],
    mistakes: [
      "Filling the loop with puzzles and memorised definitions.",
      "Having no rubric, or writing it after seeing the candidates.",
      "Letting interviewers discuss before writing their own notes.",
      "Testing nothing about evaluation or production experience.",
    ],
  },
};
