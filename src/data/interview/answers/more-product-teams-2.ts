import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  "sa-poc-scope-and-exit-criteria": {
    short:
      "Write the PoC as an experiment, not a small project: one question it must answer, a narrow scope, success criteria agreed in writing before work starts, and a decision date with a named decision maker. Put the customer’s duties in the plan as well (data in week one, an expert to label examples) and say what you deliver, which is an evaluation report and a production estimate, not software they keep running. “Free” then means a capped investment of about 320 working hours, not open-ended delivery.",
    explain: [
      {
        heading: "Start from the one question the PoC must answer",
        body: "A proof of concept (PoC) is a short, small test of whether an idea works well enough to be worth building properly. It should answer one question, for example: “can the assistant find five named clause types in our contracts accurately enough to save reviewer time?” A PoC that tries to prove everything proves nothing, so narrow it: one use case, one slice of the data, files uploaded by hand, and no production integration or single sign-on unless that is the very thing being tested. Before agreeing to a PoC at all, check whether it is needed: an existing product, a reference customer or a short test on public contracts may answer the question faster and cheaper.",
      },
      {
        heading: "Agree what success means before anyone looks at results",
        body: "Write down the metric, the threshold and the test set. The customer provides and labels the test cases, and they are held out, which means nobody tunes prompts on them, otherwise the score only measures how well you memorised the exam. Also write down what happens on a near miss. Take 83% against an agreed 85% on 200 cases: 166 correct, and the 95% interval (the range the true rate plausibly sits in) is about 77.2% to 87.6%, which contains 85%. That result is inconclusive, not a pass or a fail, and the plan should already say whether you then extend, narrow the scope or stop. Criteria set after seeing results drift towards whatever passed.",
      },
      {
        heading: "Say who provides what, by when, and what the customer receives",
        body: "List the customer’s inputs with dates: data in week one, a named expert for labelling, security approvals and a named decision maker. If inputs arrive late, the clock pauses or the scope narrows, and the evaluation is never squeezed to fit. The deliverables are an evaluation report, an architecture and cost estimate for production, and a risk list. Finish with a decision date and the paths afterwards (pilot, production or stop), so a good result leads to a paid next step with a size and a price. That is what stops a four-week free PoC from becoming unpaid delivery.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["In the PoC", "Not in the PoC"],
      rows: [
        { label: "Question", cells: ["Can it find five named clause types accurately enough to save reviewer time?", "Everything else the product might do"] },
        { label: "Data", cells: ["One slice of contracts, labelled by the customer, test set held out", "All contract types and live feeds"] },
        { label: "Systems", cells: ["Files uploaded by hand", "Integrations and single sign-on (unless that is what is tested)"] },
        { label: "Deliverables", cells: ["Evaluation report, production design and cost estimate, risk list", "Software the customer runs for free"] },
        { label: "Decision", cells: ["Date and named decision maker fixed in week zero", "Open-ended extensions"] },
      ],
      caption: "A PoC plan is mostly a list of what it will not do.",
    },
    example: {
      title: "Example: what “free for four weeks” really costs",
      text: "Using example figures: two people for four weeks at 40 hours a week is 2 × 4 × 40 = 320 hours. At an example loaded cost of $100 an hour that is $32,000 of your own time, so the PoC is a capped sales investment and the plan must say where it stops. Separately, a test set of 200 cases can only place a measured 83% somewhere between about 77% and 88%.",
      rows: [
        { label: "Effort cap", value: "2 people × 4 weeks × 40 hours = 320 hours" },
        { label: "Cost of that effort (example $100 an hour)", value: "$32,000" },
        { label: "83% on 200 cases", value: "166 correct, interval about 77.2% to 87.6%" },
        { label: "Against an 85% target", value: "Inside the interval, so inconclusive" },
      ],
    },
    followUps: [
      {
        q: "The customer’s data arrives in week three instead of week one. What do you do?",
        a: "Do not quietly compress the evaluation. Pause the clock or narrow the scope, write the change down, and tell the decision maker what the delay costs in dates.",
      },
      {
        q: "The result is 83% against an agreed 85%, on 200 cases. What does that tell you?",
        a: "The interval of roughly 77% to 88% includes the target, so it is inconclusive. Follow the rule agreed in advance (extend, narrow or stop), show which errors are fixable, and do not move the goalposts.",
      },
      {
        q: "Sales promises the customer a production-ready system “if the PoC goes well”. How do you handle this?",
        a: "Clarify in writing what a good PoC result does and does not imply, and align with sales on what has already been promised. Production needs its own plan, security review, capacity and price.",
      },
    ],
    mistakes: [
      "Agreeing to “prove it works” without defining what working means.",
      "Letting the customer choose the demo data after seeing the results.",
      "Building a custom integration inside a free PoC.",
      "Having no decision date or no named decision maker.",
    ],
  },
  "pm-prioritise-three-ai-bets-by-value-and-evaluability": {
    short:
      "The three ideas are worth about the same order of money, so value alone does not pick the winner. With example figures, A (reply drafter) is 40,000 × 2 minutes × 60% adoption = 800 hours a month, about $24,000 at $30 an hour; B (contract reviewer) is 300 × 45 minutes = 225 hours, about $27,000 at $120; C (email personaliser) is 5,000 × 3 minutes = 250 hours, about $10,000 at $40, with no way to know if it sells more. Choose A first, B as a careful second bet, and hold C until someone can say how success is measured.",
    explain: [
      {
        heading: "Put a number on each idea, and label the guesses",
        body: "Every figure here is an example, and the method matters more than the values. A: 40,000 tickets × 2 minutes saved × 60% adoption = 48,000 minutes, which is 800 hours, and at $30 an hour about $24,000 a month. B: 300 contracts × 45 minutes = 13,500 minutes, 225 hours, and at $120 an hour (lawyer time costs more) about $27,000. C: 5,000 emails × 3 minutes = 15,000 minutes, 250 hours, about $10,000 at $40, and the effect on sales is unknown because it might even go negative if emails read as generic. The values sit in the same range, so something else has to choose.",
      },
      {
        heading: "What separates them: cost of being wrong and ability to test",
        body: "A is a good first bet. The volume is high, the task is clear, a person reads and sends each draft so errors are caught before they matter, and there are thousands of past tickets to build an evaluation set (a fixed set of test cases with known good answers). B is valuable but harder: a missed clause is expensive, the review has to be designed with lawyers, and labelling the evaluation set takes expert time, so it comes second with a human-decision design, a narrow scope and a strict bar. C is not ready: with no agreed success metric it cannot be tested, so either define a metric and a test first or decline.",
      },
      {
        heading: "Count the full cost, and compare with simpler options",
        body: "Model usage is the small part of the bill. Add the evaluation work, monitoring, privacy review, support and upkeep when models or documents change. Then ask for each idea whether something simpler would do: templates and saved replies for A, clause search or a checklist for B, mail-merge fields for C. If a rule or a search box gets most of the value, the AI project loses on effort alone. Finally, run the chosen bet as a pilot with a measurable bar, an exit rule and a review date, and write down the ideas not chosen and why, so the decision can be revisited when facts change.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "example dollars of staff time a month",
      items: [
        { label: "A: reply drafter", value: 24000, note: "800 h at $30; clear task, human sends", hot: true },
        { label: "B: contract reviewer", value: 27000, note: "225 h at $120; costly errors" },
        { label: "C: email personaliser", value: 10000, note: "250 h at $40; no success metric" },
      ],
      caption: "Value is similar in size, so testability and cost of an error decide the order.",
    },
    example: {
      title: "Example: how much the adoption guess matters",
      text: "Value scales in a straight line with adoption, so a guess of 60% is the biggest risk in the estimate for A. A small pilot that measures real adoption, and asks people who do not use the drafts why, is worth more than refining any other number. Unusable drafts also cost time: if 15% are discarded after a one minute read (example), that is 6,000 × 1 minute = 100 hours a month of waste against 800 saved.",
      rows: [
        { label: "Adoption 40%", value: "40,000 × 2 min × 0.4 = 533 hours, about $16,000" },
        { label: "Adoption 60% (the guess)", value: "800 hours, about $24,000" },
        { label: "Adoption 80%", value: "1,067 hours, about $32,000" },
        { label: "15% of drafts discarded, 1 minute each (example)", value: "6,000 × 1 min = 100 hours, about $3,000" },
      ],
    },
    followUps: [
      {
        q: "The adoption rate for A is a guess of 60%. How much does it matter, and how would you find out?",
        a: "Value moves in a straight line with it: about 533 hours at 40% and about 1,067 at 80%. Measure it in a small pilot, look at who uses the drafts and why others do not, and treat it as the main risk to the estimate.",
      },
      {
        q: "Sales leadership strongly prefers C. How do you handle that?",
        a: "Take the goal seriously and propose the metric and experiment that would make C testable, such as a small pilot with a control group that gets no personalised emails. Sequence it after A, and do not dismiss it without data.",
      },
      {
        q: "Midway through A, the eval shows 15% of drafts are unusable. Continue, change or stop?",
        a: "Look at the interval and the type of failure first: on an example 200 drafts, 30 unusable is 15% with a range of about 11% to 21%. Compare with the exit rule agreed at the start and check whether unusable drafts cost more time than the usable ones save, and decide on those criteria, not on sunk cost.",
      },
    ],
    mistakes: [
      "Ranking by value alone and ignoring the cost of errors and how testable the idea is.",
      "Accepting an idea that has no way to measure success.",
      "Treating the adoption rate as certain.",
      "Never asking whether a simpler non-AI option would do.",
    ],
  },
  "instruction-file-and-context-habits-for-a-coding-agent": {
    short:
      "Treat the instruction file as a README for the agent. It already knows the programming language but not your project, so tell it what it cannot discover on its own (setup, the fast test command, code style, folders to leave alone, things to avoid) and keep it short. Anything that must always hold belongs in permission rules, hooks and CI, because a prompt is advice and not enforcement. Hand over small tasks with named files and a check, ask for a plan before multi-file edits, read the diff, and judge the file by cycle time and rework, not lines generated.",
    explain: [
      {
        heading: "What goes in the file and what stays out",
        body: "A coding agent works inside a limited amount of text it can hold at once, called its context. Everything in the instruction file (AGENTS.md or CLAUDE.md) is loaded into that context every time, so a long file crowds out the work and goes stale. Put in the commands to set up and run the project, with the fast, targeted test command first and the full suite second; code style that is not obvious from the code; directories that must not be edited; and a few things to avoid, each with the reason. Leave out what the agent can read for itself, rules a formatter already enforces, and anything nobody will maintain. Never put secrets or private data in the file.",
      },
      {
        heading: "Guidance in the file, enforcement elsewhere",
        body: "The model may ignore a rule, especially in a long session, so a file guides rather than guarantees. For rules that must always hold, use something that does not depend on the model’s attention: deny rules that block edits to protected folders, hooks that run a check after every edit, secret scanning, lint rules, branch protection and CI. A useful test: if breaking the rule would be an incident, it should not live only in a text file.",
      },
      {
        heading: "Small tasks, a plan first, and read the result",
        body: "Give one behaviour per task, name the files, and say how to check it. If you could not describe the task to a colleague in a few sentences, it is too big. For anything touching more than a couple of files, ask for a plan before any edits, then read and correct it. Start from a clean branch and commit before a big task, so version control is the undo button. Afterwards read the diff and the commands the agent ran, not only its summary, and ask for the test output.",
      },
      {
        heading: "How to tell whether the file helps",
        body: "Compare similar tasks with and without the file, or before and after a change to it, on cycle time, review time, rework within two weeks and escaped defects (bugs that reached users). Lines generated and suggestions accepted measure activity, not value. Keep the sample honest: on an example 40 tasks per group, 8 reworked against 5 reworked is 20% against 12.5%, but the plausible ranges (about 10% to 35% and 6% to 26%) overlap heavily, so three tasks of difference is noise. Collect more tasks before changing the file on that evidence.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["Goes in the file", "Enforced elsewhere", "Stays out"],
      rows: [
        { label: "Commands", cells: ["Setup, and the fast targeted test command first", "Full suite runs once in CI", "Long tutorials the agent can find in the docs"] },
        { label: "Style", cells: ["Habits that are not obvious from the code", "Formatter and lint in CI", "Rules the formatter already applies"] },
        { label: "Protected areas", cells: ["Folders not to edit, in one line", "Deny rules and hooks block the edit", "Secrets, keys and customer data"] },
        { label: "Risky actions", cells: ["Things to avoid, with the reason", "Secret scanning, branch protection, no merge rights", "Anything nobody will maintain"] },
      ],
      caption: "The file guides; rules that must hold are enforced by tools that do not forget.",
    },
    example: {
      title: "Example: the cost of a slow test loop",
      text: "Suppose the full suite takes 10 minutes and the agent iterates 8 times on a change. That is 8 × 10 = 80 minutes of waiting. A targeted command that runs only the affected tests in about 20 seconds makes the same 8 iterations 8 × 20 s = 160 s, about 2 minutes 40 seconds, and the full suite runs once in CI. The file’s first test line therefore matters more than a page of style notes.",
      rows: [
        { label: "8 runs of the full suite", value: "8 × 10 min = 80 minutes" },
        { label: "8 runs of the targeted tests", value: "8 × 20 s = 160 s, about 2 min 40 s" },
        { label: "Plus one full run in CI", value: "10 minutes, in the background" },
        { label: "Waiting saved in the loop", value: "about 77 minutes" },
      ],
    },
    followUps: [
      {
        q: "The agent keeps ignoring a rule in the file. What do you do?",
        a: "Check that the rule is clear, short and near the top. If it must always hold, stop relying on the file and enforce it with a hook, a lint rule or CI.",
      },
      {
        q: "A suite takes 10 minutes and the agent iterates 8 times. What is the cost and what do you change?",
        a: "The loop costs 8 × 10 = 80 minutes of waiting, against about 2 minutes 40 seconds for a 20 second targeted test. Give the agent the fast command and run the full suite once in CI.",
      },
      {
        q: "How do you keep the file from becoming a dumping ground?",
        a: "Give it an owner and review changes in pull requests like code. Delete rules the code or CI now enforces, and remove entries that did not change behaviour.",
      },
    ],
    mistakes: [
      "Writing a long file that includes secrets or rules nobody maintains.",
      "Handing the agent large, vague tasks.",
      "Relying on the file to enforce security rules.",
      "Measuring success by lines generated.",
    ],
  },
  "fde-scope-creep-mid-pilot": {
    short:
      "Welcome the enthusiasm, but do not answer yes or no on the spot. Split the three requests, because they differ a lot in size and risk, and show that the two weeks left cannot hold them without weakening the measurements the pilot exists to produce. Then offer options in writing (finish as agreed and plan phase two, swap one item for another, or extend with a new date and criteria), ask what is behind quarter end, and bring the sponsor and your own manager in.",
    explain: [
      {
        heading: "Take the three requests apart",
        body: "Spanish, the CRM link and returns look like one ask but are three different projects. Spanish needs its own evaluation data and native-speaking reviewers, since an English result says nothing about Spanish quality. Connecting to the customer relationship management system (CRM) needs access, a security review and testing. Returns involve money, so they need a design for approval, limits and audit, not just a prompt. None of these is a small change, and saying so with a short list of what each needs is more persuasive than saying “we are busy”.",
      },
      {
        heading: "Tie the answer to what the pilot is for",
        body: "A pilot exists to produce evidence against success criteria agreed at the start. There are two weeks left, and adding scope now takes time from the measurements that are the product of the pilot. Changing what is measured halfway also weakens the result: a number that mixes English FAQs with a half-built Spanish feature does not tell anyone what to do next. Say this in terms of the customer’s own goal, which is a decision they can defend, and not as a rule of yours.",
      },
      {
        heading: "Offer options, find the real need, and keep everyone informed",
        body: "Offer three routes. First, finish the agreed pilot and plan a second phase with the new requests sized. Second, swap: drop something agreed and take one new item. Third, extend, with a new date, resourcing and criteria, all recorded as a change. Ask what sits behind quarter end, because legal may need something specific that a smaller step meets. Include the sponsor, who decides, and not only the champion, and keep your own manager informed so nobody is surprised. Write the requests into a sized phase-two backlog, so the champion feels heard and the ideas are not lost.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "weeks of work (example estimates)",
      items: [
        { label: "Spanish", value: 2, note: "eval data, native reviewers" },
        { label: "CRM link", value: 3, note: "access, security review, tests" },
        { label: "Returns", value: 4, note: "money: approval and limits" },
        { label: "Time left in the pilot", value: 2, note: "week 4 of 6", hot: true },
      ],
      caption: "The new requests need far more than the two weeks that remain.",
    },
    example: {
      title: "Example: a reply to the champion",
      text: "“Thank you, this is great to hear and I want to get Spanish, the CRM link and returns right. They are three separate pieces of work (my example estimates are about 2, 3 and 4 weeks), and we have 2 weeks left to finish the measurements we agreed. Can we meet with your sponsor this week to choose between finishing as planned and starting phase two, or extending with a new date? And what is driving quarter end? There may be a smaller step that meets it.”",
      rows: [
        { label: "Spanish + CRM + returns (example)", value: "2 + 3 + 4 = 9 weeks" },
        { label: "Left in the pilot", value: "2 weeks, so 9 ÷ 2 = 4.5 times too much" },
        { label: "Swap option: drop Spanish, add CRM and returns", value: "3 + 4 = 7 weeks, still too much" },
        { label: "Record", value: "Any change is written down with a date, owner and criteria" },
      ],
    },
    followUps: [
      {
        q: "The champion says their vice president has already promised the CRM integration to customers. What now?",
        a: "Find out exactly what was promised and to whom, and do not commit to a date without an estimate. Escalate inside your team and offer a realistic path such as a read-only prototype before production, keeping the tone cooperative.",
      },
      {
        q: "The champion goes to your manager to get the extra scope approved over your head. How do you avoid being in that position?",
        a: "Share the plan and the scope document with the sponsor and with your own manager from the start. Then there are no surprises, and any decision is made with the trade-offs visible.",
      },
      {
        q: "Is there a case where you would simply say yes?",
        a: "Yes, when the request is small, low-risk and helps the primary metric, or when the sponsor agrees to trade something out. Record it as a change, and never accept it if it removes the ability to measure the original goal.",
      },
    ],
    mistakes: [
      "Saying yes to everything to keep the champion happy.",
      "Saying a flat no, with no options and no link to the customer’s goals.",
      "Adding scope without telling the sponsor or changing the plan.",
      "Treating the champion as the decision maker.",
    ],
  },
  "fde-frontline-users-do-not-trust-it": {
    short:
      "Do not touch the model first. Only 15 of 120 target users have opened the tool, 12.5%, and people who retype answers are telling you something specific. Watch and ask users, measure the funnel (open, accept, edit, ignore), read what they change, and remove friction such as an extra tab or answers with no sources. Be honest about what the tool is for, because fear is a common unspoken reason, and keep usage numbers about the tool, not about named people.",
    explain: [
      {
        heading: "Ask the users before blaming the model",
        body: "The sponsor’s theory (the model is the problem) is one hypothesis among several, and it is the most expensive to test. Sit next to a few people as they work, and ask those who never open the tool why. The common reasons are not about model quality: it is an extra tab, it adds steps, there is no time to check answers, or people are unsure what the tool is for and who sees the results. Retyping an answer by hand usually means checking it was harder than writing it, which points at sources and workflow, not at fluency.",
      },
      {
        heading: "Measure the funnel and read what people edit",
        body: "Replace guessing with a funnel: who opens the tool, how often an answer is accepted as is, edited or ignored, and how long a task takes with and without it, in aggregate and by team. Then read the edits. Consistent edits in one area (for example, every refund answer gets the same sentence added) point to a fixable quality gap. No edits and no use point to a workflow or trust problem, which no model change will fix.",
      },
      {
        heading: "Remove friction, recruit co-designers, and be honest about intent",
        body: "Put the assistant inside the tool people already use, show the sources so checking is cheap, and make rejecting or correcting an answer one click. Ship small improvements that users can see, and recruit a few respected users as co-designers so the tool belongs to them. If people fear the tool will be used to cut jobs or to monitor them, say what is known and what is not, ask the sponsor to communicate plainly, and do not promise what the customer controls. Keep usage data about the tool and teams, never a list of individuals shared with managers.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "watch", label: "Watch and ask", sub: "sit with users, ask non-users why" },
        { id: "measure", label: "Measure the funnel", sub: "open, accept, edit, ignore" },
        { id: "read", label: "Read the edits", sub: "same fix each time, or no use at all" },
        { id: "fix", label: "Remove friction", sub: "sources, one click, in their tool" },
        { id: "again", label: "Measure again", sub: "small visible changes, new numbers" },
      ],
      highlight: ["watch"],
      caption: "Find out why before changing anything, then change one thing at a time.",
    },
    example: {
      title: "Example: reading the funnel",
      text: "The first two rows come from the usage data in the question. The rest is an example of what the next measurement might show for the 15 users in one week. Of 60 answers shown, only 12 were accepted as they were, 30 were edited and 18 were ignored. The 30 edited answers are the richest evidence: read them and group them.",
      rows: [
        { label: "Opened the tool (from the data)", value: "15 of 120 users, 12.5%" },
        { label: "Never opened it", value: "105 users, 87.5%" },
        { label: "Example: 60 answers shown, accepted as is", value: "12, which is 20%" },
        { label: "Example: edited before use", value: "30, which is 50%" },
        { label: "Example: ignored", value: "18, which is 30%" },
      ],
    },
    followUps: [
      {
        q: "The sponsor wants to make it mandatory. What do you say?",
        a: "A mandate before trust is fixed invites box-ticking, resentment and poor data. Recommend it only after workflow fit is fixed, or in a narrow area where it already helps, and offer to measure the effect of the mandate instead of assuming it works.",
      },
      {
        q: "Experienced users say it slows them down. How do you check?",
        a: "Time a sample of tasks with and without the tool and split by experience. It may slow experts and help newcomers, in which case aim it at the people who gain or change the design, for example suggestions only on request.",
      },
      {
        q: "A senior user tells you privately that they fear the pilot is a first step to cutting headcount. You do not know the plan. What do you say?",
        a: "Do not lie and do not reassure with promises you cannot keep. Say what you do and do not know, take the concern to the sponsor and ask for a clear message, and treat the worry as real information about adoption.",
      },
    ],
    mistakes: [
      "Assuming the users are the problem, or that the model is, without asking anyone.",
      "Collecting per-person usage data and sharing it with managers without telling users.",
      "Promising job security on behalf of the customer.",
      "Adding features when the problem is friction.",
    ],
  },
  "behavioural-result-that-did-not-hold-up": {
    short:
      "Choose one concrete case and tell it with numbers: what was claimed, how the problem was found, how big the error was, who you told and what you changed. For example, a new method reported at 87.0% against 84.0% for the old one turned out, over five random seeds each, to be 84.6% against 84.0%, a gap smaller than the new method’s own run-to-run spread. Tell the people who relied on the result as soon as it is clear, correct it in writing with evidence, and change the process so the same mistake cannot pass quietly.",
    explain: [
      {
        heading: "A concrete case, in numbers",
        body: "Vague stories (“we found an issue”) teach nothing, so name the claim and the size of the error. A seed is the random number that decides a training run’s starting weights and data order, so two runs with different seeds give slightly different scores. In this example (made-up figures) the team shared one run per method: 87.0% for the new method against 84.0%, a gain of 3.0 points. Re-running five seeds each gave the new method 87.0, 83.5, 84.5, 82.0 and 86.0, a mean of 84.6 with a standard deviation of about 2.0, and the old method 84.0, 83.8, 84.4, 84.2 and 83.6, a mean of 84.0. The real gap is 0.6 points, well inside the spread, so the first run was a lucky draw. Other common causes of the same story are a leak between training and test data, a bug in the metric, or tuning choices made on the test set.",
      },
      {
        heading: "Tell people early, and keep blame out of it",
        body: "The moment the result looks wrong, tell the people who are relying on it, even if you do not yet know the full cause. Say what is known, what is not, and when you will update them. Waiting for a perfect explanation lets decisions keep being made on a number you no longer trust. Keep the conversation about how the process allowed the error (one run, no second pair of eyes) and not about a person, because blame teaches people to hide the next problem.",
      },
      {
        heading: "Fix it with evidence, and change how you work",
        body: "Re-run with a clean split or more seeds, report the corrected number with its range, and withdraw or update the original claim in writing, so nobody keeps quoting the old figure. Then change the process: a held-out test set that nobody tunes on, fixed seeds and logged settings, a second person reproducing key numbers before any announcement, and a short checklist covering leakage and baselines (simple models that any claimed gain must beat). Negative results are information, and an honest correction builds more trust than a hidden problem that is found later.",
      },
      {
        heading: "What would have caught it sooner",
        body: "End with a specific lesson, not a vague promise. A gain of 3 points from a single run on a noisy task should have triggered extra checks before anyone shared it. The habit is to treat a surprisingly good result as a reason to look for the boring explanation first (a leak, a lucky seed, a metric difference) before the exciting one.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["As first shared", "After the re-check"],
      rows: [
        { label: "Runs", cells: ["One run per method", "Five seeds per method"] },
        { label: "New method", cells: ["87.0%", "84.6% (runs from 82.0% to 87.0%)"] },
        { label: "Old method", cells: ["84.0%", "84.0% (runs from 83.6% to 84.4%)"] },
        { label: "Gap", cells: ["3.0 points", "0.6 points, smaller than the new method’s spread of about 2.0"] },
        { label: "Honest claim", cells: ["The new method is better", "Not shown yet: more seeds or a bigger test set needed"] },
      ],
      caption: "Example figures. One lucky run looked like a win; five runs show the gap is within noise.",
    },
    example: {
      title: "Example: the message to the people who relied on it",
      text: "“Update on the model comparison I shared on Monday. Re-running with five seeds, the new method averages 84.6% and the old 84.0%, not 87.0% against 84.0%. The difference is within normal run-to-run variation, so please do not use the 3 point figure. I do not yet know whether a real gain exists. We will repeat with more seeds and a fresh test set and report by Friday. The cause was that I shared one run; from now on key numbers are reproduced by a second person first.”",
      rows: [
        { label: "Claimed gain", value: "87.0 - 84.0 = 3.0 points" },
        { label: "Re-checked gain", value: "84.6 - 84.0 = 0.6 points" },
        { label: "New method’s own spread", value: "standard deviation about 2.0 points" },
        { label: "Process change", value: "five seeds, fixed settings, second person reproduces" },
      ],
    },
    followUps: [
      {
        q: "The result had already been shown to leadership and a decision depended on it. What did you do?",
        a: "Tell the decision makers directly, with the corrected number, what it changes for the decision and the options now open. Do not let it fade quietly, because they may be committing money on the old figure.",
      },
      {
        q: "How do you decide when a surprisingly good result needs extra checks?",
        a: "Treat a large gain, especially from a single run, as a trigger for leakage, evaluation and baseline checks. Look for the simplest explanation before the most exciting one.",
      },
      {
        q: "A junior colleague finds an error in your result. How do you react?",
        a: "Thank them, verify it, and correct it publicly. Make it easy for others to raise problems, because that is how the next error gets found sooner.",
      },
    ],
    mistakes: [
      "Saying you have never been wrong.",
      "Blaming the data, the tools or colleagues.",
      "Quietly changing the number without telling anyone who used it.",
      "Taking no process lesson from it.",
    ],
  },
  "sa-build-vs-buy-tco": {
    short:
      "Build costs 2 × 4 × $15,000 = $120,000 up front, then 0.5 × $180,000 + $24,000 = $114,000 a year, so $120,000 + 3 × $114,000 = $462,000 over three years. Buy costs 3 × $90,000 + $15,000 of integration = $285,000, which is $177,000 cheaper. That ordering survives reasonable changes (it flips only if the vendor charges more than about $149,000 a year), but fit to requirements, whether the capability is core, lock-in and opportunity cost decide the question as much as the table does.",
    explain: [
      {
        heading: "Add up three years for each option",
        body: "Total cost of ownership (TCO) means everything you pay over the life of a choice, not only the sticker price. Build: 2 engineers × 4 months × $15,000 per engineer-month = $120,000 up front. Running it takes half of one engineer, 0.5 × $180,000 = $90,000 a year, plus $24,000 of infrastructure, so $114,000 a year and 3 × $114,000 = $342,000 over three years. The total is $120,000 + $342,000 = $462,000. Buy: 3 × $90,000 = $270,000 in licences plus one engineer-month of integration at $15,000, which is $285,000. Under these assumptions buying is $462,000 - $285,000 = $177,000 cheaper.",
      },
      {
        heading: "Test the estimates, because every input is a guess",
        body: "If maintenance is only a quarter of an engineer ($45,000 a year), build is $120,000 + 3 × ($45,000 + $24,000) = $327,000, still above $285,000. If the vendor raises its price by half to $135,000, buying costs 3 × $135,000 + $15,000 = $420,000, still below $462,000. The break-even vendor price is ($462,000 - $15,000) ÷ 3 = $149,000 a year. Building only wins on cost if the vendor price rises by about two thirds or the build turns out much cheaper than estimated, and build estimates usually run over, not under.",
      },
      {
        heading: "What the table leaves out",
        body: "Ask whether the capability is core to the business or a commodity, and whether the vendor product meets the requirements on the customer’s own documents, tested on a held-out sample and not on the vendor’s demo. Count speed: buying delivers value in about a month, building in about four, so three months of value arrive earlier. Count opportunity cost, which is what the same two engineers would build instead, and whether their time is better spent on the layer that differentiates the product. Interest in building and learning is a legitimate reason, but say it out loud and weigh it honestly.",
      },
      {
        heading: "Risks on both sides, and a reversible path",
        body: "Building risks overruns and models that change faster than a small team can track. Buying risks price changes, usage-based pricing that grows with volume, lock-in and exit costs, and changes to the underlying model. Ask whether data, prompts and evaluation sets can be exported. A good default is a hybrid: buy the commodity layer, build the part that is unique, and keep the evaluation set and data portable so the decision can be revisited.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "Vendor price (thousand dollars a year)",
      yLabel: "Three-year cost of buying (thousand dollars)",
      points: [[60, 195], [90, 285], [120, 375], [149, 462], [180, 555]],
      marks: [
        { x: 90, label: "Today’s price: $285,000" },
        { x: 149, label: "Equals the cost of building: $462,000" },
      ],
      caption: "Buying costs 15 + 3 × price (thousand dollars). It stays below the $462,000 of building until the price passes about $149,000 a year.",
    },
    example: {
      title: "Example: volume grows fivefold on a usage-based price",
      text: "Suppose the vendor bills by volume and volume grows fivefold (example). The yearly vendor bill becomes 5 × $90,000 = $450,000 and the three-year cost 3 × $450,000 + $15,000 = $1,365,000. Building also grows, but less steeply: if infrastructure rises fivefold to $120,000 and maintenance stays half an engineer, the three-year cost is $120,000 + 3 × ($90,000 + $120,000) = $750,000. At that volume building wins, so ask the vendor for tiers or a cap.",
      rows: [
        { label: "Buy at 1× volume", value: "$285,000" },
        { label: "Build at 1× volume", value: "$462,000" },
        { label: "Buy at 5× volume", value: "3 × $450,000 + $15,000 = $1,365,000" },
        { label: "Build at 5× volume (infrastructure ×5)", value: "$120,000 + 3 × $210,000 = $750,000" },
        { label: "Break-even if build stays flat", value: "vendor bill of $149,000 a year, about 1.66 times today’s volume" },
      ],
    },
    followUps: [
      {
        q: "The vendor price is usage-based and volume could grow fivefold. How does that change the analysis?",
        a: "Model the vendor bill as a function of volume and find the crossover where building wins: with a flat build cost it is about 1.66 times today’s volume, and at fivefold the vendor costs $1,365,000 against about $750,000 to build. Ask for volume tiers or a cap, and check whether the build cost also grows with volume.",
      },
      {
        q: "The team’s real motive is that building is interesting and builds skills. How do you handle that?",
        a: "Say it out loud and weigh it honestly: learning has value, but so does delivery, and so does the opportunity cost. Suggest building a small part, or a time-boxed experiment, instead of the whole platform.",
      },
      {
        q: "The vendor’s product calls a third-party model whose price may change. What do you ask for?",
        a: "Ask for notice periods and price caps in the contract, transparency about which model is used and how changes are tested, and an exit plan. Contract wording itself goes through legal.",
      },
    ],
    mistakes: [
      "Comparing the licence price with the cloud bill only and leaving out engineering time.",
      "Treating the estimates as certain instead of testing how the answer moves.",
      "Deciding from a preference for building or for buying before the numbers.",
      "Ignoring exit costs and lock-in.",
    ],
  },
  "fde-handover-and-leaving-the-customer-team": {
    short:
      "Treat the handover as a deliverable planned from day one, so nothing important lives only in the head of the person leaving. Hand over runbooks, an architecture and cost description, the evaluation set with a one-command re-run, and an honest list of limits, all living in the customer’s own accounts. Then test the handover by watching the three-person platform team deploy, roll back, add an eval case and debug a trace without you, and agree who owns it and what support lasts afterwards.",
    explain: [
      {
        heading: "Plan it from the start and move everything into their hands",
        body: "A handover written in the last week is a list of things you forgot to mention. From the start of the engagement, keep everything in the customer’s repositories and accounts: versioned configuration (prompts, model IDs, index settings), continuous integration (CI, the automatic checks on each change) with the evaluation gate, dashboards, alerts, secrets and identities. No personal API keys, no notebooks only you can run, no tools on your laptop. The test of a good handover is not the amount of documentation but what the team can do alone.",
      },
      {
        heading: "What to hand over",
        body: "Runbooks for the jobs they will actually do: deploy, roll back, pin model versions, rotate keys, and what each alert means. An architecture and data-flow description and a cost model showing which levers change the bill. The evaluation set (a fixed collection of test cases) with a one-command way to re-run it and the current baseline and thresholds, because this is what lets them change a prompt or a model safely after you leave. And an honest list of known limits, failure modes, open bugs and dated external dependencies, such as a model retirement, so the owners are not surprised.",
      },
      {
        heading: "Hand over by handing over control",
        body: "Do not trust the handover, test it. Use the three weeks to move control across: you drive while they watch, then they drive while you watch, then they run alone and you answer only after they have tried. In the last week they deploy a prompt change through the gate, roll it back, add an eval case and debug a trace, and a short game day with a simulated incident shows the gaps. Finish by agreeing what follows: a named owner and on-call rota, a limited support window with a clear end date, and a route for paid help.",
      },
    ],
    diagram: {
      kind: "layers",
      layers: [
        { label: "Practised", sub: "they ran a deploy, a rollback, an eval re-run and an incident drill without you" },
        { label: "Owned", sub: "named owner, on-call rota, support window with an end date" },
        { label: "Runnable", sub: "runbooks, eval set with a one-command re-run, CI gate, dashboards and alerts" },
        { label: "In their hands", sub: "code, config, keys and identities in the customer’s accounts" },
      ],
      caption: "Each layer rests on the one below it. A handover is finished only when the top layer is true.",
    },
    example: {
      title: "Example: three weeks to hand over",
      text: "The numbers are an example plan, not a rule. The aim is that by the end of week three the customer’s three engineers have done every routine job at least once with you only watching, and each of those jobs was written into a runbook the first time it was done.",
      rows: [
        { label: "Week 1: you drive, they watch", value: "Walk through deploy and rollback; they write the runbook steps as you go" },
        { label: "Week 2: they drive, you watch", value: "Pass a prompt change through the eval gate, then roll it back" },
        { label: "Week 3: they run alone", value: "Add an eval case, debug a trace, rotate a key, one-hour simulated incident" },
        { label: "After you leave (example)", value: "4 weeks of limited support, then paid help only" },
      ],
    },
    followUps: [
      {
        q: "The platform team says they are stretched and will not have time to learn the system. What do you do?",
        a: "Raise it with the sponsor now: either the team is staffed or the scope is reduced. A simpler system they can own beats a clever one they cannot, so consider managed services and fewer moving parts, and do not quietly keep running it yourself.",
      },
      {
        q: "Two months after you leave, the customer messages that quality has dropped. What do you do?",
        a: "Point to the runbook and the eval, and help diagnose within the agreed support window by looking at what changed (model version, documents, prompt). Then ask what the handover missed and fix that for the next engagement.",
      },
      {
        q: "Which parts of what you built would you simplify now, to make it easier to hand over?",
        a: "Name specific parts: custom glue code, extra services and clever orchestration that only one person understands, and unpinned versions. Accept a slightly weaker system if it is easier to run.",
      },
    ],
    mistakes: [
      "Planning to “write the documentation in the last week”.",
      "Leaving keys, notebooks or scripts that only the departing engineer can use.",
      "Judging a handover by the amount of documentation and not by what the team can do alone.",
      "Offering unlimited informal support so that the customer never has to learn the system.",
    ],
  },
  "pm-launch-gates-and-staged-rollout": {
    short:
      "Write the launch criteria before the data arrives: pass bars per slice with ranges, a limit on severe failures, latency and cost targets, an incident path and named owners who can say no. “Zero failures in 100 tests” only shows the true failure rate is probably below about 3 ÷ 100 = 3%, and arguing for under 1% needs about 300 clean, independent, representative cases. Then roll out in stages with a pre-agreed stop at each, and keep a kill switch and a fallback ready from day one.",
    explain: [
      {
        heading: "Set the bar before you see the results",
        body: "Launch criteria written after the data arrives drift towards whatever passed. Before testing, write: the pass rate required for each slice (type of request) with its uncertainty range, a limit on severe failure types (for example wrong refund amounts), latency and cost targets, the incident path, and named owners who can say no. “Engineering says it is ready” is an opinion; the criteria turn it into a check. Add guardrail metrics beside the success metric: escalations, complaints, edit rate, reopened tickets, cost per conversation and latency, and compare against a control group and not against last month.",
      },
      {
        heading: "Why “0 failures in 100” is weak evidence",
        body: "If the true failure rate were 3%, a test of 100 independent cases would still show zero failures about 5% of the time, so zero in 100 only shows the rate is probably below about 3 ÷ 100 = 3% (the rule of three). To argue a rate under 1% from zero failures you need about 300 clean cases, since 0.99 multiplied by itself 299 times is about 0.05. Both statements assume the cases are independent and look like real traffic: 100 easy, hand-picked cases prove far less. And zero failures says nothing about severity, which is why severe failure types get their own limit.",
      },
      {
        heading: "Stage the rollout, with a way out",
        body: "Each stage has a minimum sample and a pre-agreed stop. Internal use first, then shadow mode (the assistant drafts but nothing is sent, and reviewers judge the drafts), then a small cohort with human approval, a wider cohort with sampling, then everyone. Choose the human-in-the-loop level by risk: auto-send only low-risk replies, approve before sending anything touching money, legal or health, and audit a random slice of what is auto-approved. Build the way out before you need it: a kill switch that does not need a deploy, a fallback to the non-AI path, and a rollback of prompts and model versions together, tested before launch.",
      },
      {
        heading: "Launch is the start of the quality work",
        body: "Re-run the evaluation on every model, prompt or provider change, sample human review of live traffic by slice, watch drift in inputs, and alert on the guardrail metrics. Give each of these an owner and a dashboard. A model that was good in March can be worse in June because the world, the documents or the provider changed under it.",
      },
    ],
    diagram: {
      kind: "experiment",
      slug: "no-canary-release",
      caption: "Release the same bad change to everyone at once, or to 1% first with automatic rollback, and compare how many users are harmed.",
    },
    example: {
      title: "Example: shadow mode misses the 5% target, and a canary limits harm",
      text: "In shadow mode reviewers judged 18 of 300 drafts unacceptable, which is 6% against a 5% target. The 95% range for 18 of 300 is about 3.8% to 9.3%, so the target sits inside it: the result is inconclusive, not a failure and not a pass. With 1,000 reviewed drafts and the same 6% (60 bad) the range narrows to about 4.7% to 7.6%, still containing 5%. The decision then rests on the severity mix and the controls, set by the criteria written earlier. Separately, suppose a bad change makes 6% of drafts unacceptable and traffic is 100,000 drafts a day (example): at a 1% canary that is 100,000 × 1% × 6% = 60 bad drafts, against 100,000 × 6% = 6,000 when released to everyone.",
      rows: [
        { label: "Zero failures in 100 cases", value: "true rate probably below about 3%" },
        { label: "Cases needed to argue below 1%", value: "about 299 clean cases (0.99^299 is about 0.05)" },
        { label: "18 of 300 unacceptable (6%)", value: "range about 3.8% to 9.3%, target 5% inside" },
        { label: "Bad drafts: 1% canary against everyone at once", value: "60 against 6,000 (example traffic)" },
      ],
    },
    followUps: [
      {
        q: "In shadow mode, 6% of drafts are judged unacceptable. The target was 5%. The team wants to ship anyway and fix it later. What do you do?",
        a: "Look at the range around 6% and the mix of severity, not just the number. Either hold the stage or ship with tighter control (approval for the risky categories) and a dated fix plan, and record the decision and who made it instead of changing the bar silently.",
      },
      {
        q: "Marketing wants the launch date fixed for a conference. How do you handle that pressure?",
        a: "Separate the date from the scope: ship a limited, safe version (fewer categories, approval on) by the date. Show the data behind the gate, offer options with their risk, and leave the decision with the people accountable for it.",
      },
      {
        q: "After full launch, how do you know the assistant is still good in three months?",
        a: "Sample live conversations for human review by slice, watch input drift, alert on guardrail metrics, refresh the evaluation set from new failures, and re-check on every provider or model change.",
      },
    ],
    mistakes: [
      "Treating “no failures in a few dozen tests” as proof of safety.",
      "Launching to everyone at once with no kill switch.",
      "Setting or changing the bar after seeing the result.",
      "Having no comparison group, only before-and-after numbers.",
    ],
  },
  "team-conventions-for-ai-assisted-pull-requests": {
    short:
      "Make ownership, data and size the fixed rules and leave the rest to judgement. Whoever opens the pull request owns it and must be able to explain every line; secrets and customer data never go into prompts; changes stay small, with intent and test evidence in the description. Review gets stricter as risk grows (authentication, payments, deletion, infrastructure need a code owner), a person always does the merge, and the team measures cycle time, review time, rework and escaped defects instead of lines generated.",
    explain: [
      {
        heading: "Ownership and data rules",
        body: "A pull request (PR) is a proposed change that others review before it joins the main code. The author owns it whatever wrote it, and “the AI wrote it” is not a defence. Set data rules: which tools are approved for which code and data, no secrets or customer data in prompts, files or logs, secret scanning and push protection on, and where code must not leave the company, a local or self-hosted model, with its trade-offs in quality and upkeep. Do not ban tools without offering an approved alternative, or people will use unapproved ones anyway.",
      },
      {
        heading: "Pull-request rules that protect the reviewers",
        body: "Generated code makes big changes cheap to write and expensive to read, so protect reviewers. Keep changes small and scoped, with a size limit after which the change must be split. Require a description of intent, how it was tested, the test command and its output, and no unrelated reformatting. New behaviour comes with tests that can fail, and changes to existing tests are flagged for extra attention, since a test edited to pass proves nothing. Apply review by risk: code owners must approve authentication, payments, cryptography, data deletion and infrastructure; an agent never holds production credentials or merge rights; and branch protection keeps a person on the merge.",
      },
      {
        heading: "Dependencies, licences, and what stays with judgement",
        body: "Assistants sometimes suggest packages that do not exist or are unmaintained, so new dependencies are checked and reviewed as a separate step. If the organisation requires it, use a licence or code-similarity scanner, and send legal questions to counsel (this is not legal advice). Leave style choices, how much to lean on the tool for low-risk work, and the choice of prompts to individual judgement. Rules should be strict in risky areas and light elsewhere.",
      },
      {
        heading: "Measure, adjust and invest in people",
        body: "Track cycle time, review time, rework within two weeks and escaped defects, and review the conventions each quarter, dropping rules that do not help. Do not measure adoption by volume of generated code. Train people to review generated code, share instruction files, collect examples of good and bad use, and give the team a place to share failures without blame.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "self", label: "Author self-review", sub: "can explain every line" },
        { id: "auto", label: "Automated checks", sub: "tests, lint, secret and licence scan" },
        { id: "rev", label: "Reviewer", sub: "intent and test evidence" },
        { id: "owner", label: "Code owner", sub: "auth, payments, deletion, infrastructure" },
        { id: "merge", label: "Person merges", sub: "agents never merge" },
      ],
      highlight: ["owner"],
      caption: "Every AI-assisted change takes the same path, with stricter steps where the risk is higher.",
    },
    example: {
      title: "Example: why a size limit matters",
      text: "Example figures for a 25-person group. Before AI tools, each engineer opens 5 PRs a week and a review takes 30 minutes. If AI tools raise output to 7 PRs a week and nothing else changes, review work grows 40%. If the PRs are also twice as large and review time scales with size, a review takes 60 minutes and the load is 2.8 times what it was, which is how reviewers burn out. A size limit and a test-evidence rule keep the cost of reading in check.",
      rows: [
        { label: "Before: 25 × 5 PRs, 30 minutes each", value: "125 PRs, 62.5 review hours a week" },
        { label: "More PRs: 25 × 7, same size", value: "175 PRs, 87.5 hours (+40%)" },
        { label: "Also twice as large: 60 minutes each", value: "175 hours a week, 2.8 times the original" },
        { label: "With a size limit that keeps reviews at 30 minutes", value: "back to 87.5 hours, which a person can plan for" },
      ],
    },
    followUps: [
      {
        q: "Reviewers report that review time has doubled. What do you do?",
        a: "Look at PR size and quality first, enforce the size limit, and require self-review and test evidence. Use tools to pre-check style and security, and add reviewer capacity if the data supports it.",
      },
      {
        q: "A senior engineer says conventions slow them down. How do you respond?",
        a: "Ask which rule and why, and test the claim against the metrics. Keep risky areas strict and low-risk areas light, and be willing to drop rules that do not help.",
      },
      {
        q: "Should you require people to label AI-assisted pull requests?",
        a: "A label can help reviewers apply extra attention and help you measure effects, but it must not be a punishment or a substitute for ownership. Decide with the team and apply it consistently.",
      },
    ],
    mistakes: [
      "Banning tools without offering an approved alternative.",
      "Allowing unlimited pull-request size.",
      "Leaving no owner for generated code.",
      "Measuring adoption by volume of generated code.",
    ],
  },
  "fde-communicating-limits-to-an-exec": {
    short:
      "Acknowledge the auditors’ requirement first, then give the number plainly: 261 of 300 is 87%, which on a sample this size means somewhere between about 83% and 90%. Translate it to their volume (at 10,000 invoices a month, about 1,300 would carry an error), ask what the auditors actually measure, and propose a design where the system accepts only when it is very sure and people check the rest. Promise a dated error analysis, not a dated 99%, and say openly that the model alone may not get there.",
    explain: [
      {
        heading: "Stay calm, say the number plainly, and show its uncertainty",
        body: "Start by agreeing that the auditors’ bar is real, before arguing with it. Then be exact. 261 ÷ 300 = 0.87, so 87% of invoices were fully correct. Because the test set is only 300 invoices, the 95% range (where the true rate plausibly sits) is about 82.7% to 90.3%, so quote it as “about 87%, plausibly 83% to 90%” and not as a precise figure. The size of the gap matters more than the argument about it: 99% means at most 100 invoices with an error per 10,000, and today is about 1,300.",
      },
      {
        heading: "Translate to their volume, and ask what 99% means",
        body: "An executive thinks in invoices and audit findings, so convert: at 10,000 invoices a month, 13% with an error is about 1,300 invoices, and across the range roughly 970 to 1,730. Then ask what “99%” means to the auditors: per invoice or per field, which fields matter (a wrong total matters more than a wrong supplier address line), and what they actually require. Auditors often accept a controlled process, such as review of uncertain items, reconciliation to the ledger or a sample check, rather than raw model accuracy.",
      },
      {
        heading: "Propose a design, not a promise",
        body: "Models give a confidence signal, so the system can accept an invoice automatically only when it is very sure and send the rest to a person, and the combined process is measured on a held-out set of the customer’s own invoices. This can reach a bar that the model alone cannot, but only if the confident group really is accurate, which has to be measured, so do not state a date for 99% that the evidence does not support. Also ask that the human baseline be measured, because manual entry has errors too, and do not invent a figure for it.",
      },
      {
        heading: "Commit to something checkable, and name the fallbacks",
        body: "Offer a concrete step: an error analysis by field and by supplier within two weeks, to see how much is fixable (formats, templates, poor scans) and how much is not, with a checkpoint where you report figures honestly. Say plainly that the model alone may not reach 99%, and name the fallbacks: narrower scope, human review of a share of invoices, or a different approach. Do not blame the model or the data.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "invoices with an error per 10,000 a month",
      items: [
        { label: "Best case (90.3% correct)", value: 970 },
        { label: "Measured (87% correct)", value: 1300, hot: true },
        { label: "Worst case (82.7% correct)", value: 1730 },
        { label: "Auditors’ bar (99% correct)", value: 100 },
      ],
      caption: "The 300-invoice test gives a range, not a single number, and every point in it is far from the 99% bar.",
    },
    example: {
      title: "Example: what a confidence-gated process could look like",
      text: "These are example figures that would have to be measured, not promised. Suppose the system is very sure about 6,000 of 10,000 invoices and gets 99.5% of those right, while the other 4,000 go to a reviewer who gets 98.5% right. Errors are 6,000 × 0.5% = 30 plus 4,000 × 1.5% = 60, so 90 per 10,000, which is 99.1% correct overall. The idea works only if both groups really hit those rates on the customer’s own invoices.",
      rows: [
        { label: "Measured today", value: "261 of 300 = 87%, range about 82.7% to 90.3%" },
        { label: "Errors at 10,000 a month", value: "about 1,300 (range about 970 to 1,730)" },
        { label: "Example: 6,000 auto-accepted at 99.5%", value: "30 errors" },
        { label: "Example: 4,000 reviewed at 98.5%", value: "60 errors" },
        { label: "Example combined", value: "90 errors per 10,000 = 99.1%" },
      ],
    },
    followUps: [
      {
        q: "The COO says, “A competitor told us they can do 99%.” How do you respond?",
        a: "Do not disparage the competitor. Ask on whose data and how it was measured, and invite a fair comparison on a held-out set of the customer’s own invoices.",
      },
      {
        q: "“Can’t you just use a bigger model?” What do you say?",
        a: "It may help, so test it as a bounded experiment on the same test set with cost and latency recorded and a stop rule, rather than promising it. Say which errors a bigger model is unlikely to fix, such as unreadable scans and missing data.",
      },
      {
        q: "Two weeks later you are at 93%. What do you bring to the next meeting?",
        a: "The honest number with its range (93% of 300 is 279, plausibly 89.5% to 95.4%, about 700 errors per 10,000), what moved it and what remains. Offer options: ship with review for the uncertain share, narrow the scope to invoice types that clear the bar, or stop, and let the customer decide with the evidence.",
      },
    ],
    mistakes: [
      "Saying “we will get there” with no basis.",
      "Getting defensive or technical and never addressing what the auditors need.",
      "Quoting 87% as exact, with no range or sample size.",
      "Offering to “tune the model” as the whole plan.",
    ],
  },
  "lead-exec-wants-agents-everywhere": {
    short:
      "Respond with interest, not a flat yes or no. Ask what outcome the CEO wants in numbers and what the competitors really do, then score the three workflows by how structured the task is, what an error costs, whether it can be undone and whether the data and access are ready. Propose one workflow in assisted mode with a person approving this quarter, plus a readiness check for the other two, and be clear about what that costs the current roadmap.",
    explain: [
      {
        heading: "Start with the outcome, not the technology",
        body: "A CEO who says “agents for everything” is worried about a competitor, a cost or a growth target. Ask for the outcome in numbers (days to close the books, onboarding time, procurement cycle time) and what the competitors are actually doing, since conference claims often describe a demo or a narrow pilot. An agent here means a language model that can take actions through tools in a loop, such as reading a system, drafting an entry or sending a request. Do not say it is impossible, and do not say yes to be agreeable.",
      },
      {
        heading: "Score the three workflows separately",
        body: "Finance close, onboarding and procurement are different. Score each on how structured the task is, the cost of an error, how reversible the action is, data readiness, access to systems, volume, and whether a baseline exists to compare with (how well people do it today). Finance close and procurement touch money and audit, so an error costs more and some actions cannot be undone. Onboarding may be more bounded. The score tells you which has the best chance of a win in a quarter.",
      },
      {
        heading: "Explain the ladder, and why reliability compounds",
        body: "Explain it in plain words. The first rung is a fixed workflow with a model in one step. The second is an assistant that prepares work while a person approves. The third is limited autonomy, earned as evidence builds. Agents are harder than they look because small error rates compound: if each step is right 95% of the time and the steps are independent, ten steps all succeed only 0.95^10, about 60% of the time. They also cost more, since each step re-reads a growing context: in an example run, ten steps that each add 1,500 tokens to a 2,000 token prompt read 87,500 tokens in total, about 44 times a single call.",
      },
      {
        heading: "Propose a target that can win, and state the trade-off",
        body: "For next quarter, propose one workflow in assisted mode with measured results and approval, plus a readiness assessment for the other two with clear criteria for promoting each one. State what you need: owners in finance and operations, data and system access, security sign-off and an evaluation set. Name the trade-off with the current roadmap with sizes, so the CEO chooses with eyes open instead of the team being quietly overloaded. Offer a short regular report with metrics and demos, so confidence is earned.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "Steps in the run (each step 95% reliable)",
      yLabel: "Chance the whole run is correct (%)",
      points: [[1, 95], [2, 90.2], [3, 85.7], [5, 77.4], [7, 69.8], [10, 59.9], [15, 46.3], [20, 35.8]],
      marks: [{ x: 10, label: "Ten steps: about 60%" }],
      caption: "Assuming independent steps, success is 0.95 raised to the number of steps. Long autonomous runs need evidence before they get trusted.",
    },
    example: {
      title: "Example: how fast reliability and cost move with the number of steps",
      text: "These figures assume independent steps and an example context that grows by 1,500 tokens a step with no caching. They show why the plan climbs the ladder gradually instead of starting with full autonomy. Raising each step to 99% lifts ten steps to about 90%, which is why improving the weakest step is usually the best use of time.",
      rows: [
        { label: "1 step at 95%", value: "95%" },
        { label: "5 steps at 95%", value: "0.95^5, about 77%" },
        { label: "10 steps at 95%", value: "0.95^10, about 60%" },
        { label: "10 steps at 99%", value: "0.99^10, about 90%" },
        { label: "Tokens read: one call against ten steps (example)", value: "2,000 against 87,500, about 44 times" },
      ],
    },
    followUps: [
      {
        q: "The CEO says, “Just try it and we will figure it out as we go.” What do you say?",
        a: "Agree to experiment, but with limits: a time-boxed pilot with success criteria, stop rules and a named owner, read-only or approval-gated actions, and a review date. That protects the company without blocking progress.",
      },
      {
        q: "The CFO is worried about errors in the finance close. How do you respond?",
        a: "Take it seriously and start with the assistant preparing and a person approving. Measure the error rate against the human baseline, keep audit trails and limits, and give more autonomy only on evidence.",
      },
      {
        q: "What would you give up on the current roadmap to do this?",
        a: "Name the real trade-offs with sizes and effects, for example which two features slip by how many weeks, and ask the CEO to decide. Do not quietly overload the team or promise both.",
      },
    ],
    mistakes: [
      "Saying yes to all three with no evidence or plan.",
      "Saying it cannot be done and offering nothing.",
      "Lecturing the CEO about hype.",
      "Hiding the trade-off with the existing roadmap.",
    ],
  },
  "sa-rfp-demands-no-hallucination-guarantee": {
    short:
      "Do not answer “yes, with our guardrails”. Language models produce fluent, plausible mistakes, and every control lowers the rate without making it zero, so a guarantee of never being wrong is a promise nobody can honestly keep. Offer what can be measured (accuracy on an agreed test set, answers that cite sources, an honest “not found”, human review for high-stakes answers, monitoring), raise the liability clause in writing with sales leadership and legal, and be willing to lose the deal over a promise the product cannot keep.",
    explain: [
      {
        heading: "Why no one can make this guarantee",
        body: "A language model writes the most plausible continuation of the text, not a verified fact, so it can state a wrong answer as confidently as a right one. This is often called hallucination. Grounding the answer in the customer’s documents, citing sources, checking outputs and adding human review each cut the error rate, but none cuts it to zero. At example volume of 100,000 answers a year, even a 0.5% error rate is 100,000 × 0.005 = 500 wrong answers. A promise of “never” is therefore a promise you would eventually break, and then it is the customer’s first complaint.",
      },
      {
        heading: "Offer what can be committed to and measured",
        body: "Replace the absolute with commitments the buyer can verify: accuracy on an agreed test set drawn from their own data, reported with its sample size and range; answers that cite the passage they came from; the ability to say “I could not find this” instead of guessing; human review for high-stakes answers; monitoring in production; and incident response times. Propose a pilot with agreed metrics so the numbers are real. For example, 270 correct answers out of 300 is 90%, with a plausible range of about 86.1% to 92.9%, and that is a statement you can stand behind.",
      },
      {
        heading: "Reframe, escalate and write clearly",
        body: "The buyer’s real worry is harm from wrong answers, so design around that: decision support, not automated decisions, with a named person accountable. Liability and contract wording are for legal and business leaders, not for the architect, and this is not legal advice. Flag the clause early and in writing to sales leadership and legal, and do not quietly accept it. In the response, state what is measured, how, and what is not covered, in plain words. Caveats hidden in fine print turn into disputes later.",
      },
      {
        heading: "Work with the sales lead, and accept the cost",
        body: "Sales wants the deal and you want a customer who is still happy in a year. Explain the risk in the deal’s own terms: a false “yes” is the first thing quoted back in the first incident. Be a partner by writing the strongest honest answer you can. Be willing to lose the deal rather than win it on a promise the product cannot keep.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["The clause asks for", "What can be committed and measured"],
      rows: [
        { label: "Accuracy", cells: ["Never an incorrect answer", "Measured accuracy on an agreed test set, with sample size and range"] },
        { label: "Wrong answers", cells: ["None, ever", "Answers cite their source, and the system can say “not found”"] },
        { label: "High stakes", cells: ["Full responsibility for any error", "A person reviews high-stakes answers; the system supports decisions"] },
        { label: "After launch", cells: ["Unstated", "Monitoring, incident response times and a remedy process"] },
        { label: "Contract wording", cells: ["Unlimited liability", "A matter for legal and business leaders, not the architect"] },
      ],
      caption: "Reframe an absolute into things that can be tested, monitored and fixed.",
    },
    example: {
      title: "Example: a reply to procurement",
      text: "“We cannot guarantee that any AI system never gives an incorrect answer, and we would rather say so now. What we can commit to is the following: accuracy measured on a test set of your own documents agreed with you, reported with its sample size and range; answers that cite their source or say they could not find one; human review for high-stakes decisions; monitoring and a defined incident response time. We propose a four-week pilot to set the numbers. Contract terms, including liability, we will take up with our legal team.”",
      rows: [
        { label: "Example volume", value: "100,000 answers a year" },
        { label: "At a 0.5% error rate", value: "500 wrong answers a year" },
        { label: "Zero errors in 300 test cases", value: "only shows the rate is probably below 3 ÷ 300 = 1%" },
        { label: "Example pilot: 270 of 300 correct", value: "90%, range about 86.1% to 92.9%" },
      ],
    },
    followUps: [
      {
        q: "The sales lead says, “Every competitor will say yes.” How do you answer?",
        a: "Someone who says yes will face the audit and the complaint later. Offer a differentiated answer: measured results on the customer’s own data, transparent limits and a safer design, and accept that it may cost the deal.",
      },
      {
        q: "Procurement insists on one number and asks what accuracy you will commit to. What do you say?",
        a: "Only on their data after measurement. Give a measured range with its sample size from the pilot, framed as a target with a remedy process and not as a guarantee, and leave the exact contract wording to legal.",
      },
      {
        q: "After a softer clause is agreed, the customer’s champion tells their executives the product is “99% accurate”. What do you do?",
        a: "Correct it promptly and in writing, and share the measured figures with their conditions. Make the correct statement easy to repeat, for example in a one-page summary.",
      },
    ],
    mistakes: [
      "Saying “yes, with guardrails” to avoid a difficult conversation.",
      "Negotiating liability terms alone.",
      "Writing an answer full of technical caveats nobody will read, or hiding the issue in an appendix.",
      "Treating the clause as sales theatre that can be ignored.",
    ],
  },
  "behavioural-keeping-skills-sharp-and-mentoring-with-ai": {
    short:
      "The risk is that nobody can review what they do not understand, and reviewing is the human’s main job when an assistant writes the code. Set a norm that the author can explain every line, build practice into the work (write the first version of core logic or a key test yourself, pair sessions where the junior drives and explains), and change review to ask for intent and test evidence. Do the same for yourself by reading the diff instead of approving it, and measure whether the approach works.",
    explain: [
      {
        heading: "The underlying risk",
        body: "A clean pull request that its author cannot explain is a quality risk and a growth risk. If you cannot say why a change works, you cannot judge whether it is right, cannot debug it when it breaks at night, and cannot learn from having written it. Your own habit of accepting suggestions without thinking is the same problem seen from the other side. The point is not to blame the tools but to keep a human who understands the system in the loop.",
      },
      {
        heading: "What the evidence says, and what it does not",
        body: "Some studies are relevant, and each applies to a specific setting. Some field studies found the biggest gains among less experienced workers. A 2025 randomised trial of experienced open-source developers found they believed assistants made them faster when, on those tasks, the measured result was slower. A 2023 study of consultants found that people who leaned on the tool did worse on a task outside what the tool does well, as reported by its authors. None of these is a verdict on the tools. The lesson is the habit of checking, and measuring real effects instead of trusting a feeling of speed.",
      },
      {
        heading: "Practice, review and pairing",
        body: "Set the norm that the author can explain every line, and ask “why this way?” of human and assistant code alike, without shaming anyone. Build practice into the work: junior engineers write the first version of core logic or a key test themselves, then compare with the assistant’s version; pair sessions where the junior drives and explains; reading and debugging exercises without the tool; short write-ups of what the assistant got wrong. In review, ask for the intent and the test evidence, spot-check understanding with a short walkthrough for larger changes, and praise errors caught in assistant output.",
      },
      {
        heading: "The same for you, and how to know it works",
        body: "Schedule periods of working without the tool on skills you want to keep, read the diff and not only the summary, time the real effect on a few tasks, and keep a list of what the tool gets wrong in your codebase. Define growth paths that include specification, testing, debugging and system thinking, which stay valuable as tools change. Revisit the approach with the team, because nobody yet knows how the skills mix will settle. Signs it is not working: repeated defects of a kind the team should catch, juniors unable to debug without the tool, slower reviews, or lower morale.",
      },
    ],
    diagram: {
      kind: "layers",
      layers: [
        { label: "Can debug it without the assistant", sub: "the skill to keep: find a fault from the symptoms" },
        { label: "Can change it safely", sub: "knows what breaks if the input is empty or huge" },
        { label: "Can explain it", sub: "why this way, line by line, in a short walkthrough" },
        { label: "Can run it", sub: "the tests pass and the review is clean" },
      ],
      caption: "Passing review is the bottom rung. A review habit and some practice without the tool are how a team climbs to the top one.",
    },
    example: {
      title: "Example: what the practice costs",
      text: "All figures are an example, to show the cost is small and visible. Suppose each of six juniors writes the first version of one core piece by hand every second week, about one working day in ten. That is 10% of a 40-hour week, 4 hours, and across six people 6 × 10% = 0.6 of a person. In review, a 10 minute walkthrough on larger changes is asked of everyone, with the question “what happens if this input is empty?”",
      rows: [
        { label: "Hand-written practice", value: "1 day in 10 = 4 hours of a 40-hour week each" },
        { label: "Team of six juniors", value: "6 × 10% = 0.6 of a person" },
        { label: "Walkthrough for larger changes", value: "10 minutes, asked of everyone" },
        { label: "Review after a few months", value: "defects, debugging speed, review time, morale" },
      ],
    },
    followUps: [
      {
        q: "The junior says the team is slower if they do things by hand. How do you respond?",
        a: "Agree that the aim is not to ban the tool. Invest the time where learning matters most, use the tool freely for low-risk work, and check the results over a few months.",
      },
      {
        q: "How do you assess whether someone understands the change without making it an interrogation?",
        a: "Use a short walkthrough or a what-if question in review (what happens if this input is empty?), asked of everyone. The purpose is to find gaps early, not to catch people out.",
      },
      {
        q: "What would convince you that the approach is not working?",
        a: "Measurable signs: repeated defects of a type the team should catch, juniors unable to debug without the tool, slower reviews, or lower morale. Track them and discuss them openly.",
      },
    ],
    mistakes: [
      "Banning the tools or ignoring the issue entirely.",
      "Shaming a person for not understanding.",
      "Believing experienced developers are immune to over-reliance.",
      "Having no way of checking understanding.",
    ],
  },
  "lead-incident-wrong-answers-reached-customers": {
    short:
      "Contain the harm first and diagnose second: switch off the affected topic, route it to a person, or roll back to the last known good release, with a record of each change. Assign an incident lead, an investigator and one person for communication, find out how many conversations were affected, and brief executives with a short factual note and the time of the next update. Over the next week find the cause with the version record, fix it, add regression cases and freshness checks, and hold a blameless review with owners and dates.",
    explain: [
      {
        heading: "The first hour: contain, organise, scope",
        body: "Stopping the harm comes before finding the cause. Use the kill switch to turn off the affected topic, route those questions to a person, or roll back to the last known good release, and do not edit the production prompt ad hoc without a record. Assign roles within minutes: an incident lead who decides, a technical investigator, and one person who communicates, plus a timeline someone keeps. Involve support, legal and communications as appropriate, and involve privacy or legal early if personal data or regulation is touched. Then scope the damage from logs: how many conversations mentioned the plan, how many users acted, and for how long. Give support approved wording and a way to correct affected customers.",
      },
      {
        heading: "What to tell the executives",
        body: "Send a short, factual note: what happened, what is known and unknown, the size of the impact, the actions under way and the time of the next update. Do not speculate, do not assign blame, and do not say “it is fixed” before the scope is checked. A regular update, even when it says “no change”, calms an executive more than silence does.",
      },
      {
        heading: "The next week: cause, fix, prevention",
        body: "Find the cause with the version record. Did a source document change, was the index (the searchable copy of the documents) stale, did a prompt or model change, or did retrieval pull the wrong text? Fix it, then add regression cases so the failure cannot quietly return. Prevent the class of problem: freshness checks on source documents, alerts when content changes, canary releases, a named owner for the knowledge base and an updated runbook.",
      },
      {
        heading: "The blameless review and the team",
        body: "Within about a week hold a blameless review: a timeline, the contributing factors and actions with owners and dates. Blameless means the question is what in the process allowed this, not who. Look after the team too, since people may have worked through a Friday evening: plan rest and rotate the on-call.",
      },
    ],
    diagram: {
      kind: "timeline",
      steps: [
        { label: "0 to 10 minutes", detail: "Declare the incident, name a lead, an investigator and a communicator, start the timeline." },
        { label: "10 to 20 minutes", detail: "Contain: turn off the plan topic or route it to a person, or roll back to the last good release." },
        { label: "20 to 40 minutes", detail: "Scope from logs: how many conversations, how many users acted, since when." },
        { label: "40 to 50 minutes", detail: "Approved wording for support and a first factual note to executives, with the time of the next update." },
        { label: "50 to 60 minutes", detail: "Start the cause search with the version record, and hand the on-call over so people can rest." },
      ],
      caption: "The first hour is about harm, roles and facts. The root cause can wait until the bleeding stops.",
    },
    example: {
      title: "Example: scoping the damage from the logs",
      text: "Example figures. Over the last 7 days the assistant had 18,000 conversations, 1.5% of which mention the discontinued plan, so 18,000 × 0.015 = 270. In 210 of them it said the plan was still available, which is 210 ÷ 270, about 78%. Those 210 customers are the ones to correct. If the assistant handles 40% of support volume, switching it all off costs far more than switching off the one topic, which touches only 1.5% of its conversations.",
      rows: [
        { label: "Conversations in 7 days (example)", value: "18,000" },
        { label: "Mention the plan (1.5%)", value: "270" },
        { label: "Said it was still available", value: "210, about 78%" },
        { label: "Share affected if only the plan topic is switched off", value: "1.5% of conversations, against 100% if the whole assistant is off" },
      ],
    },
    followUps: [
      {
        q: "An executive asks, “Whose fault is this?” What do you say?",
        a: "The gaps in the process are what to fix: no content-freshness check, no alert and unclear ownership. Name owners for the actions but do not name individuals as the cause, and offer the date of the review.",
      },
      {
        q: "Support wants the assistant switched off completely. An executive says it handles 40% of volume and must stay up. How do you decide?",
        a: "Use severity and scope: can the affected topic be switched off, or reviewed by a person, while the rest runs? Set out the options and the risk of each, decide or escalate to the accountable person, and record the risk acceptance.",
      },
      {
        q: "Can you guarantee this will not happen again?",
        a: "No. Say what is now detected and what is not, what risk remains, and when the next check will report. Be specific, not vaguely reassuring.",
      },
    ],
    mistakes: [
      "Starting by finding the root cause while the harm continues.",
      "Changing the live prompt repeatedly with no record.",
      "Telling executives “it is fixed” before checking the scope.",
      "Blaming a person, the vendor or the model with no change to the process.",
    ],
  },
  "pm-saying-no-to-ai-everywhere-roadmap": {
    short:
      "Take the goal behind the request seriously and turn “an AI feature in every product area” into outcomes: which user problem, which metric, by when. Score each idea on value if right, cost if wrong, readiness to test and effort, and ask whether AI is the right tool at all. Then propose one or two bets with success metrics, staged rollout and exit rules, show the demo-to-production gap in engineer-months, and keep a visible list of what is not being done and why.",
    explain: [
      {
        heading: "Engage with the goal, not just the request",
        body: "Leaders asking for AI everywhere usually have a real worry: growth, cost or a competitor. Do not say a flat no, and do not say yes to everything. Ask what outcome they want, for which user problem, measured how and by when. That turns a slogan into something that can be planned and tested, and it shows that you are on their side.",
      },
      {
        heading: "Score ideas by value, risk and readiness",
        body: "For each idea, estimate the value if it works, the cost if it is wrong, the readiness (can we write down what correct looks like, do we have data, can we test it cheaply) and the effort. Ask whether AI is the right tool at all, and pick the lowest rung of the ladder that meets the bar (a rule, a search, a template, a fixed workflow, then a model). Ideas with a clear task, available data and a cheap check go first. Vague ideas such as “an assistant for everything” wait for a definition.",
      },
      {
        heading: "Make the demo-to-production gap visible",
        body: "A prototype works on chosen cases and takes days. Production needs evaluations, monitoring, privacy review, fallbacks, support, and upkeep as models and documents change. Show the real cost per idea in engineer-months, next to the team’s actual capacity, and let the numbers argue. Offer options such as narrowing scope, moving the date or adding people, instead of absorbing the overload and shipping risk.",
      },
      {
        heading: "Propose a few bets and share evidence as it arrives",
        body: "Propose one or two bets with success metrics, a staged rollout and exit rules, a date to revisit, and a visible list of what is not being done and why. Share evidence as it arrives, not slides: pilot numbers with ranges, user feedback, cost per task, and what was learned. A stop that the evidence supports is a good outcome, because the team spends its time on something better.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["Reply drafter", "Contract reviewer", "Sales email writer"],
      rows: [
        { label: "Value if right (example)", cells: ["800 hours a month, about $24,000", "225 hours, about $27,000", "250 hours, about $10,000, sales effect unknown"] },
        { label: "Cost if wrong", cells: ["Low: a person reads and sends", "High: a missed clause", "Low to medium: generic emails"] },
        { label: "Can we test it?", cells: ["Yes: 40,000 past tickets a month", "Yes, but needs lawyers’ time", "No: no success metric"] },
        { label: "Verdict", cells: ["First bet", "Second bet, human decides", "Define the metric first"] },
      ],
      caption: "Example figures. The values are similar, so readiness and the cost of a mistake set the order.",
    },
    example: {
      title: "Example: why six AI features in a quarter do not fit",
      text: "Example capacity: 4 engineers for 3 months is 4 × 3 = 12 engineer-months. If half is already committed, 6 are free. Suppose a prototype costs about 0.5 engineer-months and a production-grade feature, with evals, monitoring, privacy review and fallbacks, about 4. One production feature and two prototypes is 4 + 2 × 0.5 = 5, which fits. A production feature in each of six areas is 6 × 4 = 24, twice the whole team’s capacity and four times what is free.",
      rows: [
        { label: "Team capacity (4 engineers, 3 months)", value: "12 engineer-months" },
        { label: "Free after existing commitments (example)", value: "6 engineer-months" },
        { label: "One production feature + two prototypes", value: "4 + 1 = 5, fits" },
        { label: "Six production features", value: "6 × 4 = 24, twice the whole capacity" },
      ],
    },
    followUps: [
      {
        q: "Three ideas are on the table: a reply drafter for support (high volume, low stakes), a contract reviewer (low volume, high stakes), and a sales email writer (unclear metric). Which goes first, and why?",
        a: "With example figures the value is similar: 40,000 tickets × 2 minutes × 60% adoption is 800 hours a month, against 225 hours for 300 contracts at 45 minutes, which has a higher hourly value and cost of error. The drafter goes first because the task is clear, an error is cheap with a person sending, and it is easy to measure; the reviewer needs a stronger review design, and the email writer needs a metric first.",
      },
      {
        q: "An executive overrules you and wants the contract reviewer first. What now?",
        a: "Do not sabotage the decision or comply silently. Restate the risks and the conditions for a safe version (human decision, narrow scope, evaluation bar), document the decision, and build the safeguards in, escalating only on real risk to users.",
      },
      {
        q: "Six weeks later the first bet shows weak numbers. How do you report it?",
        a: "Report plainly with data and ranges: for example, 30 of 100 drafts used is 30%, plausibly 22% to 40%, against a 50% bar. Say what was learned and propose continue, change or stop according to the exit rule agreed in advance.",
      },
    ],
    mistakes: [
      "Agreeing to everything and letting the team carry the risk.",
      "Rejecting the request without engaging with the goal behind it.",
      "Ranking ideas by excitement and not by testability and cost of error.",
      "Reporting a demo as if it were a production result.",
    ],
  },
  "pm-trust-after-a-viral-wrong-answer": {
    short:
      "Start with scope and harm, not blame: pull the traces to see how many conversations gave the wrong refund guidance and who acted on it. Contain quickly with the kill switch, a fixed correct answer or sources-only mode, look after the affected customers with support and legal, and tell people plainly what happened and when you will update them. Then run a blameless review and fix the system: add the case to the evaluation set, require a source for policy claims, add an “I am not sure, let me get a person” path, and alert on complaints.",
    explain: [
      {
        heading: "Hours 0 to 6: scope and contain",
        body: "Find out how many conversations gave this answer, who acted on it, and what it cost them, using the logs, before explaining anything to anyone. Pull the traces to find the cause: a stale policy document, a retrieval miss, no source cited, or a prompt change. Contain with a narrow, fast action: turn off the topic, put a fixed correct answer in place for that question, or switch the assistant to citing sources only. Use the kill switch or a rollback, not a hot fix nobody has tested.",
      },
      {
        heading: "Hours 6 to 48: customers, communication, one timeline",
        body: "Identify the affected customers, correct the guidance directly and work with support and legal on what is owed, and do not give legal conclusions on your own. Communicate plainly and early: what happened, who was affected, what has been done and what comes next, with a named owner and a time for the next update. Do not blame “the AI” as if it were a separate party, because the company shipped it. Keep one factual timeline shared with engineering, support, legal and communications, so each speaks from the same facts and nobody guesses in public.",
      },
      {
        heading: "The review: system causes, not blame",
        body: "A blameless review asks why the evaluation did not cover refund policy, why there was no citation or abstain path (a way to say “I do not know”), why the policy source was out of date, and what monitoring would have caught it sooner. The answers are process gaps, and each becomes an action with an owner and a date.",
      },
      {
        heading: "What changes so it does not repeat",
        body: "Add the case and its whole slice (policy questions) to the evaluation set, require grounded answers with a source for policy claims, add the “let me get a person” path, put approval before send on high-stakes topics, and set an alert on complaints and escalations. Track the follow-ups to completion. Trust returns through visible behaviour over the following months: sources shown, easy escalation to a person, a published fix, and quality data shared inside the company.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "scope", label: "Scope the harm", sub: "logs and traces: who, how many, what cost" },
        { id: "contain", label: "Contain", sub: "kill switch, fixed answer, sources only" },
        { id: "care", label: "Look after customers", sub: "correct, with support and legal" },
        { id: "say", label: "Say it plainly", sub: "owner and next update time" },
        { id: "cause", label: "Find the system cause", sub: "blameless review" },
        { id: "fix", label: "Fix and monitor", sub: "evals, sources, abstain path, alerts" },
      ],
      highlight: ["contain"],
      caption: "Harm first, then the story, then the cause. Each step has an owner.",
    },
    example: {
      title: "Example: sizing the incident and the topic decision",
      text: "Example figures. In three weeks the assistant had 30,000 conversations, 1,200 of them about refunds, which is 4%. If 9% of those gave wrong guidance, that is 1,200 × 0.09 = 108 conversations. If 30 customers acted on it and each is owed an example $40, the cost to honour is 30 × $40 = $1,200. Legal wants the topic off permanently and support fears the load: 1,200 refund conversations sent to people at an example $3 each is $3,600 over three weeks, which is a modest price compared with the risk, and a fixed answer from the policy table removes most of it.",
      rows: [
        { label: "Refund conversations in 3 weeks (example)", value: "1,200 of 30,000, 4%" },
        { label: "Wrong guidance at 9%", value: "108 conversations" },
        { label: "30 customers acted, $40 each (example)", value: "$1,200 to honour" },
        { label: "If all 1,200 go to a person at $3 each (example)", value: "$3,600 over three weeks" },
      ],
    },
    followUps: [
      {
        q: "Leadership asks whether you can guarantee it never happens again. What do you say?",
        a: "Be honest that a model cannot be guaranteed, but the risk can be reduced and its impact bounded: grounding, an abstain path, approval on high-stakes topics and monitoring. Offer measurable commitments, not a promise of zero.",
      },
      {
        q: "Legal wants the topic switched off permanently. Support says that will hurt resolution. How do you decide?",
        a: "Quantify both sides (volume of the topic, escalation cost, risk) and offer a middle path such as source-only answers, a deterministic answer for the refund policy, or approval before send. Agree the criteria under which the topic can return.",
      },
      {
        q: "How would you rebuild customer trust over the following months?",
        a: "Through visible, honest behaviour: clear labelling and sources, easy escalation to a person, a published fix, and quality data shared internally. Measure trust by behaviour and complaints, not by a slogan.",
      },
    ],
    mistakes: [
      "Blaming the model or the provider instead of owning the product decision.",
      "Debating the root cause for days before containing the issue.",
      "Making legal or compensation promises without legal and support involved.",
      "Ending with “we will improve the prompt” and no change to evals or monitoring.",
    ],
  },
};
