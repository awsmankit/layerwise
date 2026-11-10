import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  "synthetic-test-data-for-claims-summaries": {
    short:
      "List the ways claim notes differ with a claims expert before generating anything, then cross the list into a grid: 4 claim types x 3 note qualities x 2 languages x 2 completeness levels is 48 combinations, and 2 phrasings of each gives 96 cases. Build every note around invented facts you planted on purpose (an amount, a date, a fake name), so plain code can check that the summary kept them, and include notes where a fact is missing so the summary has to say it is unknown. Synthetic cases are a good start and cover rare situations, but they are tidier than real notes and cannot tell you how often a failure happens, so replace them with approved real data as soon as the rules allow.",
    explain: [
      {
        heading: "Decide what varies before you generate anything",
        body: "Asking a model for “100 test notes” gives you 100 notes that look alike, because the model writes its most typical note every time. Instead sit down with a claims expert and list the dimensions that change how a note looks: the claim type, the note quality (abbreviations, typos, copied text), the length, missing fields, conflicting information and the language. Each combination of values is a tuple, a row in a grid. With 4 types, 3 qualities, 2 languages and 2 completeness levels that is 4 x 3 x 2 x 2 = 48 tuples, and two phrasings per tuple gives 96 cases.",
      },
      {
        heading: "Generate in two steps, with facts you planted",
        body: "Step one expands the tuples, by hand or with a model: “water damage, messy abbreviations, Spanish, one field missing”. Step two turns each tuple into a natural note in a separate call, so no two notes come from the same long list and you avoid a pile of near-copies. Plant known facts in each note: an amount, a date, a person who does not exist. Code can then check whether the summary kept each fact. Build the negative cases too: when the date is missing, the right summary says the date is unknown, and a summary that invents one has failed.",
      },
      {
        heading: "Generate inputs, not answers, and check they look real",
        body: "Have the generator write the inputs only. If the same model also writes the expected summaries, the cases inherit its blind spots, so check the output with code and with people instead, and keep the model that generates apart from any model that judges. Then check realism: the claims expert reads a sample, compares it with any formats you are allowed to see, and removes notes nobody would write. Remove near-duplicates too, by exact text match and by embedding similarity above a threshold, and count the cases per tuple to see that none ended up empty.",
      },
      {
        heading: "What the data can and cannot tell you",
        body: "Synthetic cases are good at starting the work, at covering rare situations such as conflicting amounts, and at catching obvious breaks before launch. They are tidier than real notes, and the share of failures in them says nothing about how common failures are in the field, because you chose the mix. Treat a pass rate on them as a ceiling for easy inputs, not a forecast. Privacy stays strict: only invented people and numbers, a check that the generator did not reproduce real details, and approval from the privacy team before any real data is used. This is general practice, not legal advice.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "dims", label: "Pick dimensions", sub: "with a claims expert" },
        { id: "tuples", label: "Cross them", sub: "48 tuples" },
        { id: "notes", label: "Write each note", sub: "2 phrasings, 96 cases" },
        { id: "facts", label: "Plant facts", sub: "amount, date, fake name" },
        { id: "review", label: "Expert reads a sample", sub: "drop unrealistic ones" },
        { id: "dedupe", label: "Remove near-copies", sub: "text and embedding match" },
      ],
      highlight: ["facts"],
      caption: "Dimensions come first, then tuples, then natural notes with planted facts, then checks for realism and duplicates.",
    },
    example: {
      title: "Example: how 96 cases turn into code checks",
      text: "The grid sizes follow from the example dimensions in the text. Each note carries three planted facts (an example choice), and half of the 96 cases are the incomplete kind, with one fact left out.",
      rows: [
        { label: "Tuples", value: "4 x 3 x 2 x 2 = 48" },
        { label: "Cases at 2 phrasings each", value: "48 x 2 = 96" },
        { label: "Planted facts per note (example)", value: "3, so 96 x 3 = 288 facts to check by code" },
        { label: "Incomplete notes (one fact missing)", value: "48, where “date unknown” is the correct summary" },
        { label: "If all 96 pass", value: "95% upper bound on the failure rate is about 3 / 96 = 3.1%, for notes like these only" },
      ],
    },
    followUps: [
      {
        q: "The feature scores 99% on the synthetic set but looks worse on the first real notes. Why?",
        a: "The synthetic notes are too clean and too easy, and they miss real messiness. Compare length and noise between the two sets, add the real failures as cases, and read the 99% as an upper bound on easy inputs.",
      },
      {
        q: "Could you redact real claims and use those?",
        a: "Possibly, with privacy approval and a careful process, but redaction tools miss things, so check the output by hand. Retention and consent rules vary, so ask the privacy team.",
      },
      {
        q: "How would you detect that your generator is producing near-duplicate cases?",
        a: "Deduplicate on exact text and on an embedding similarity threshold, count the cases per tuple, and sample by hand for diversity.",
      },
    ],
    mistakes: [
      "Asking one model for “100 test cases” and using them as they come, so they all look alike.",
      "Using the generator’s own answers as the expected outputs, which copies its blind spots into the test.",
      "Quoting a synthetic pass rate as the quality to expect in production.",
      "Pasting real customer data into a public tool to “make the data more realistic”.",
    ],
  },

  "characterisation-tests-before-an-ai-refactor": {
    short:
      "Write the tests first, and make them record what the 600-line function does today: run it on a wide set of real, anonymised and edge-case inputs and save the outputs as the expected values, odd ones included. Check that those tests can fail by breaking the code on purpose, then let the assistant extract one small piece at a time, running the tests after each step and committing as you go. A person decides what counts as a bug to keep or fix and reviews the final diff for removed checks.",
    explain: [
      {
        heading: "Why tests come first",
        body: "An AI assistant can only correct itself when something tells it pass or fail. A legacy function with almost no tests gives it nothing, so it will produce code that looks plausible and may quietly change what the billing does. The first job is therefore to pin down current behaviour. Tests that record what the code does now, right or wrong, are called characterisation tests. A refactor, which changes the structure but not the behaviour, should leave all of them passing.",
      },
      {
        heading: "What the tests look like and how to trust them",
        body: "Feed the function many inputs: anonymised real ones from logs, plus boundaries, error paths and money rounding cases such as half-cent amounts. Record each output as the expected value. A model can draft these quickly, but a person reads what each test asserts. A test should be able to fail, and it should check outputs, not just that the function ran. Do not accept tests derived only from the implementation the assistant is about to change. Then try a deliberate fault: change a rounding rule or flip a comparison (a mutation test, done by hand or with a tool) and confirm that some test fails. Coverage numbers only say which lines ran, not whether anything was checked.",
      },
      {
        heading: "Small steps and a fast loop",
        body: "Ask for one extraction per task: pull out the tax calculation, run the tests, commit. If something breaks, the diff is small and the cause is easy to find. Refuse one giant rewrite, because a regression in a 600-line diff is hard to locate. Keep the loop fast with a command that runs only the relevant tests: with 8 iterations, a 20-second run costs 8 x 20 = 160 seconds, under 3 minutes of waiting, while a 10-minute suite costs 8 x 10 = 80 minutes.",
      },
      {
        heading: "Keep people in charge of the decisions",
        body: "The assistant proposes, but a person decides the boundaries between the new pieces, the names, and which odd behaviours are bugs to preserve for now and which to fix later. Fixing a bug and refactoring should be separate changes, so a test failure always has one possible cause. Before merging, review the final diff for deleted assertions, loosened checks and silent changes in behaviour.",
      },
    ],
    diagram: {
      kind: "timeline",
      steps: [
        { label: "Pin behaviour", detail: "Run the function on many inputs and record the outputs as expected values." },
        { label: "Read the assertions", detail: "A person checks each test can fail and checks outputs, not just that the code runs." },
        { label: "Break it on purpose", detail: "Change a rule by hand or with mutation testing and confirm a test goes red." },
        { label: "One extraction", detail: "The assistant pulls out one small piece of the function." },
        { label: "Run and commit", detail: "Run the fast test command, then commit so a regression points to a small diff." },
        { label: "Review the diff", detail: "A person looks for deleted checks and silent behaviour changes before merging." },
      ],
      caption: "Tests are built and checked before any refactoring starts, then the work proceeds in small committed steps.",
    },
    example: {
      title: "Example: what a fast loop saves",
      text: "Assume 8 small extractions and two ways of running tests. The run times are example values; the arithmetic is the point.",
      rows: [
        { label: "Targeted tests, 20 seconds each run", value: "8 x 20 s = 160 s, about 2.7 minutes" },
        { label: "Full suite, 10 minutes each run", value: "8 x 10 min = 80 minutes" },
        { label: "Difference", value: "about 77 minutes of waiting per refactor" },
        { label: "A rounding bug found in the recording", value: "keep the test marked as a known issue, refactor first, fix in its own change" },
      ],
    },
    followUps: [
      {
        q: "The characterisation tests record a rounding bug as expected behaviour. What do you do?",
        a: "Separate refactoring from bug fixing. Keep the test, mark it as a known issue, finish the refactor, then fix the bug in its own reviewed change.",
      },
      {
        q: "The assistant proposes deleting a test that fails after its refactor. What do you say?",
        a: "Treat it as a regression until proven otherwise, because the test pins behaviour. Investigate whether the refactor or the test is wrong, with a person deciding.",
      },
      {
        q: "How do you know when you have enough tests to start?",
        a: "When tests fail on faults injected in each area you will change, cover the inputs seen in production logs, and run quickly. There is no coverage number that proves it.",
      },
    ],
    mistakes: [
      "Asking the assistant to refactor first and add tests afterwards, which leaves nothing to check its work against.",
      "Trusting a coverage percentage as proof that the tests are good.",
      "Letting the assistant delete or loosen a failing test to make the suite green.",
      "Attempting one large rewrite in a single step instead of small committed ones.",
    ],
  },

  "test-plan-for-a-rag-help-assistant": {
    short:
      "Test retrieval alone, generation alone with a fixed context, and the whole thing end to end, so that when an answer is wrong you can tell which part failed: if the right passage was not retrieved it is a retrieval fault, and if it was retrieved but the answer is wrong it is a generation or context fault. Use questions on purpose across the types that break such assistants: answerable, unanswerable, ambiguous, multi-document, outdated, follow-ups, typos and other languages. Add separate checks for citations, access control, freshness and instructions hidden inside documents, and report results by slice.",
    explain: [
      {
        heading: "Test the parts, then the whole",
        body: "Retrieval is the step that finds passages in the articles. For it, build questions labelled with the passage that answers them, and measure whether that passage appears in the top k results (recall at k). Generation is the step where the model writes an answer from those passages. For it, hand the model a fixed, known-good context and check that the answer is faithful, meaning it says only what the passages support. Then run end to end. Because you tested each part alone, a wrong end-to-end answer can be traced: right passage missing from the retrieved set means retrieval, right passage present but wrong answer means generation or the order and length of the context.",
      },
      {
        heading: "Choose questions on purpose",
        body: "Questions written by reading the articles are too easy, because they share words with the text. Cover answerable questions, unanswerable ones (the assistant must say it does not know, not guess), ambiguous ones (it should ask), questions that need several documents, questions about outdated or superseded policy, follow-ups that use pronouns (“and what about that one?”), paraphrases, typos and other languages. Before launch there is no traffic, so take questions from old search logs and support tickets, have experts write hard cases, and use synthetic ones carefully, replacing them with real traffic once it exists.",
      },
      {
        heading: "Citations, access, freshness and robustness",
        body: "Check each citation with code for existence (the cited passage is real) and with a judge that sees the source for support (the passage actually backs the claim). Test access as a security check with zero tolerance: a user without permission for a restricted article must get nothing from it, neither in the retrieved passages nor in the answer. Test freshness: update or delete an article, re-index, and confirm the old text is gone and the new text is used. Test robustness: a document containing an instruction such as “ignore your rules” must not change behaviour, and empty or very long retrievals must be handled.",
      },
      {
        heading: "Report by slice and rerun on every change",
        body: "One overall number hides weak spots, so report by topic, language and answerability, keep a held-out set that nobody tunes on, and run the suite on every change to prompts, chunking, embeddings, the index or the model. Each change can break a different layer, and the layered tests show which.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["What you feed in", "What you check", "A failure points to"],
      rows: [
        { label: "Retrieval alone", cells: ["Questions labelled with their source passage", "Right passage in the top k", "Chunking, embeddings, index"] },
        { label: "Generation, fixed context", cells: ["Question plus a known-good passage", "Answer faithful to the passage", "Prompt or model"] },
        { label: "End to end", cells: ["Realistic questions of every type", "Correct, grounded, says “I don’t know” when it should", "Either, found by the two rows above"] },
        { label: "Citations", cells: ["Answers with cited sources", "Source exists (code), supports claim (judge)", "Chunking or model attaching a nearby source"] },
        { label: "Access control", cells: ["Users without permission", "Zero content from restricted articles", "A security defect, never a quality score"] },
        { label: "Freshness", cells: ["An edited or deleted article", "Old text gone after re-index", "Indexing pipeline"] },
      ],
      caption: "Each layer has its own input, its own check and its own place to look when it fails.",
    },
    example: {
      title: "Example: telling the two kinds of bug apart",
      text: "Assume 200 labelled questions. Retrieval recall at 5 is 92%, yet 20% of end-to-end answers are wrong. The counts below follow from those two numbers.",
      rows: [
        { label: "Right passage in the top 5", value: "92% of 200 = 184 questions" },
        { label: "Right passage missing", value: "200 minus 184 = 16 questions, at most 16 wrong answers from retrieval" },
        { label: "Wrong answers overall", value: "20% of 200 = 40" },
        { label: "Wrong answers with the right passage present", value: "at least 40 minus 16 = 24, so generation or context order is the larger problem" },
        { label: "Next check", value: "feed the right passage alone and see whether the answer becomes faithful" },
      ],
    },
    followUps: [
      {
        q: "The answer is correct but cites the wrong article. Is that a pass?",
        a: "No. Users and reviewers trust the citation, so the claim is unsupported by what is cited and that is a defect with its own metric. It is often caused by chunking or by the model attaching a nearby source.",
      },
      {
        q: "Retrieval recall at 5 is 92% but 20% of answers are wrong. Where do you look?",
        a: "At generation and context: passage order and length, conflicting passages, the model ignoring the context and answers to unanswerable questions. Feed the right passage alone and see whether the answer is then faithful.",
      },
      {
        q: "How do you get questions before launch, when you have no traffic?",
        a: "Use real queries from old search logs and support tickets, expert-written hard cases and, carefully, synthetic ones built from dimension tuples. Replace them with real traffic as soon as it exists.",
      },
    ],
    mistakes: [
      "Testing only with questions written from the articles themselves, which are far easier than real ones.",
      "Having no unanswerable questions, so a guessing assistant looks perfect.",
      "Never testing access control for restricted articles.",
      "Measuring only the final answer, so retrieval faults and generation faults cannot be separated.",
    ],
  },

  "lead-engineers-ship-without-evals-norm": {
    short:
      "In the room, take the point seriously: speed matters, and “fine last quarter” is evidence. Then ask questions that show the gap, such as what the dashboards caught and how late, and how we would know a prompt change hurt cases we are not watching. Propose the smallest sensible thing, 30 to 50 real cases and a few must-pass checks that run in minutes, scale it by risk, run it as a time-boxed trial with the sceptic as co-designer, and afterwards build the first version and show results instead of repeating the argument.",
    explain: [
      {
        heading: "In the room: respect, then questions",
        body: "Do not lecture and do not shut him down. Say that speed is a real goal and that a good quarter is worth taking seriously. Then ask questions that let the group see the gap themselves. What did the dashboards catch, and how long after the change? How do we know a prompt edit did not hurt cases nobody is watching? What was the last regression a user found before we did? Bring one concrete example from the team’s own history, because a real story persuades better than a general claim about quality. An eval is just a fixed set of test cases that you run and score on every change, the AI version of a regression test.",
      },
      {
        heading: "Propose the smallest useful thing",
        body: "Ask for 30 to 50 real cases and a few must-pass checks that run in minutes on every prompt or model change, not a program. With 40 cases one case is 1 / 40 = 2.5 points, and a pass rate of 90% has a 95% range of about 1.96 x sqrt(0.9 x 0.1 / 40) = 9.3 points either way, so it catches big breaks and a failing must-pass case, not tiny shifts. Scale the effort by risk: light for low-stakes internal summaries, strict where money, health, privacy or law is involved. Make it cheap, with a shared harness and a template, so nobody starts from scratch.",
      },
      {
        heading: "Afterwards: trial, data, standard",
        body: "Invite the sceptical engineer to co-design the checks so he owns the result. Run a time-boxed trial, for example 4 weeks, with agreed measures: regressions caught, time cost and time to detect a problem. Review the data together at the end, and be willing to shrink the process if it is not worth it. Be clear about what is not up for debate, such as security and privacy checks and high-stakes uses, and write the agreed standard down. Follow up one to one after the meeting, build the first version yourself and show results.",
      },
    ],
    diagram: {
      kind: "experiment",
      slug: "no-evals",
      caption: "Try it: change an assistant six times and watch the average rise while one important group of cases breaks.",
    },
    example: {
      title: "Example: what the trial costs",
      text: "Assume the team makes about 30 changes a month and a 40-case check takes 5 minutes to run, mostly unattended. These are example values to show the scale of the cost.",
      rows: [
        { label: "Cases in the first set", value: "40 real cases, so one case is 2.5 points" },
        { label: "Run time per change", value: "5 minutes, mostly waiting" },
        { label: "Monthly machine time", value: "30 changes x 5 min = 150 min, 2.5 hours" },
        { label: "95% range at a 90% pass rate", value: "about 9.3 points either way, so it catches big breaks only" },
        { label: "Trial measures", value: "regressions caught, time cost, time to detect, reviewed after 4 weeks" },
      ],
    },
    followUps: [
      {
        q: "After a month the trial caught nothing. What do you conclude?",
        a: "Read it honestly: it may mean the risk is low, or that the cases are weak. Keep the cost low, check that the cases reflect real failures, scale the effort to the risk, and do not defend the process for its own sake.",
      },
      {
        q: "The sceptic ships a change that breaks something the check would have caught. How do you handle it?",
        a: "No blame and no gloating. Use it as an example in a blameless review, ask what would have made the check feel worth running, and let the team draw the conclusion.",
      },
      {
        q: "A launch is due tomorrow and the evaluation fails on a must-pass case. The CEO says ship. What do you do?",
        a: "Make the risk explicit and put the decision with an accountable owner. Offer mitigations such as a feature flag, a canary, human review, a narrower launch or a rollback plan, and record the risk acceptance and a follow-up.",
      },
    ],
    mistakes: [
      "Mandating evaluations by authority with no reasoning, which breeds quiet resentment.",
      "Humiliating the engineer in front of the team, even when he is wrong.",
      "Applying the same heavy process to every change, including trivial ones.",
      "Giving in completely and setting no standard at all, even for high-stakes features.",
    ],
  },

  "model-change-rolled-back": {
    short:
      "Tell it in six parts: the system and the change and why it looked safe, how you found out and how long that took (including if users found it first), how you rolled back, the root cause with evidence, the measured impact, and the concrete process change that was adopted afterwards. Honesty is the core: say what your own process missed and do not blame the vendor or teammates. Use a real story of your own, with real numbers; the worked example below shows the shape and is made up.",
    explain: [
      {
        heading: "Situation and detection",
        body: "Start with the system, the change (a new model version, a prompt rewrite, a chunking change) and why it seemed safe, with the evidence you used to ship it, such as a passing offline eval on 120 cases. Then say how the problem surfaced: an eval run, monitoring, or user reports. Give the time between release and discovery. If users found it before you did, say so plainly, because that is the most useful fact for the lesson and listeners trust people who admit it.",
      },
      {
        heading: "Rollback and diagnosis",
        body: "Describe the mechanics. A rollback is quick when the old version is still deployable: a pinned model version, a versioned prompt, a feature flag or a traffic split lets you switch back in minutes instead of rebuilding. Then give the root cause with evidence, not a guess: a cluster of failures on format-following in the logs, or a category of request that the eval set did not contain. Say how you confirmed it, for example by replaying the failing requests against the old and new versions.",
      },
      {
        heading: "Impact and what changed",
        body: "Quantify the damage: how many requests were affected, how far the metric dropped and how it recovered, and how you told stakeholders. Then name a concrete process change and show it was adopted: new eval cases for the missed category, a canary or shadow stage, pinned versions, or an alert on the failing metric. A vague promise like “be more careful” is not a change. A canary is the part that limits harm: send the new version to a small share of traffic first and compare it with the old one.",
      },
    ],
    diagram: {
      kind: "experiment",
      slug: "no-canary-release",
      caption: "Try it: release a bad change to everyone at once, or to 1% first with automatic rollback, and count how many users are harmed.",
    },
    example: {
      title: "Example: an illustrative story, with its arithmetic",
      text: "This story is made up to show the shape. A prompt rewrite meant to shorten replies also made the model sometimes break the required JSON format. Assume 20,000 requests a day, a normal format-failure rate of 0.4% and a new rate of 5%, so 4.6 points extra.",
      rows: [
        { label: "Requests per hour", value: "20,000 / 24 = about 833" },
        { label: "Found by users after 28 hours", value: "28 x 833 = about 23,300 requests, of which 4.6% = about 1,070 extra failures" },
        { label: "Rollback through a flag", value: "6 minutes, back to the old prompt version" },
        { label: "If a 5% canary had run for 4 hours", value: "4 x 20,000 x 5% / 24 = about 167 requests, about 8 extra failures, caught by an alert" },
        { label: "Process change adopted", value: "format-failure alert, 5% canary stage, 30 format cases added to the eval set" },
      ],
    },
    followUps: [
      {
        q: "Why didn’t your evals catch it before release?",
        a: "Name a specific gap, such as a missing category, a judge that rewarded the wrong thing or offline data unlike production. Then say how the eval set was fixed, without blaming others.",
      },
      {
        q: "If you could only add one safeguard, which would it be and why?",
        a: "Pick one and tie it to your story, for example a staged rollout with automatic rollback when a metric drops, or a must-pass eval gate. The reason matters more than the choice.",
      },
    ],
    mistakes: [
      "Being unable to say what metric revealed the problem or how it was detected.",
      "Blaming the model provider or teammates with no reflection on your own process.",
      "Ending with no change afterwards, or a vague one such as “be more careful”.",
    ],
  },

  "coverage-matrix-for-an-llm-feature": {
    short:
      "Line coverage does not apply, because an LLM feature has no lines that a test can run through; coverage here means how well your cases represent the input space and the risks. Build a matrix from the dimensions that matter (topic, language, answerable or not, user type, input length, channel, adversarial), count cases per cell, and report thin and empty cells openly. Give the team a short dashboard, not one number: overall score, slice scores with intervals, cell coverage, the status of critical cases and the biggest known gaps.",
    explain: [
      {
        heading: "What coverage means for a model",
        body: "In code, line coverage counts which lines a test executed. The behaviour of a language model comes from learned weights and open-ended text, so there is nothing to count that way. The useful question is how much of the space of inputs and risks your test cases represent. List the dimensions that matter, such as topic, language, answerable or not, user type, input length, channel and adversarial, and build a grid. Each cell is one combination, and you count the cases in it. An example grid of 4 topics x 3 languages x 2 answerability levels has 24 cells, so 120 cases average only 5 per cell.",
      },
      {
        heading: "What a small cell can tell you",
        body: "Five cases say very little. Suppose 4 of 5 pass: the 95% range for the true pass rate runs from about 38% to 96%, which is almost no information. The range narrows only slowly as cases are added, so cells cannot all be well covered. Weight the cases by risk and traffic: more for critical or common cells, fewer where a failure is harmless and rare. Report empty and thin cells openly instead of letting them vanish into an average. An overall 92% can hide a slice at 60%.",
      },
      {
        heading: "Compare with production and other kinds of coverage",
        body: "Compare the mix of your cases with the mix of real traffic. One method is to cluster real queries by embedding and look for clusters with no test case nearby. Treat the result as a lead for a person to review, not as proof. Other kinds of coverage matter as well: every policy rule has a case, every tool and guardrail category is exercised, and each known failure type from error analysis has a minimum number of cases. Keep a separate list of critical cases (harm, data leaks) with zero tolerance.",
      },
      {
        heading: "What to show the team",
        body: "People who ask for one number should get a small dashboard instead: the overall score, slice scores with their intervals, the share of cells with at least a minimum number of cases, the status of critical cases and the largest known gaps. If a director insists on one figure, give a defined one, for example the share of risk-weighted cells with at least a minimum number of cases, and state what it does not capture. Say plainly that 100% coverage is not possible and list what is explicitly not covered.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "cases in one cell",
      yLabel: "95% range, plus or minus points",
      points: [[5, 43.8], [10, 31.0], [20, 21.9], [50, 13.9], [100, 9.8], [200, 6.9]],
      marks: [
        { x: 5, label: "average cell in a 120-case suite" },
        { x: 20, label: "a 20-case slice" },
        { x: 100, label: "100 cases" },
      ],
      caption: "Rough 95% range for a pass rate of about 50% as a cell gets more cases: it narrows only slowly, so thin cells say little.",
    },
    example: {
      title: "Example: reading thin cells and slices",
      text: "The grid sizes use the example dimensions above. The ranges are the Wilson 95% intervals for the pass counts shown, and the curve uses the simpler 1.96 x sqrt(0.25 / n) rule at a 50% pass rate.",
      rows: [
        { label: "Grid", value: "4 x 3 x 2 = 24 cells" },
        { label: "Average cases per cell", value: "120 / 24 = 5" },
        { label: "A cell with 4 of 5 passing", value: "95% range about 38% to 96%" },
        { label: "A slice with 12 of 20 passing", value: "60%, 95% range about 39% to 78%" },
        { label: "At 50 cases in a cell", value: "plus or minus about 13.9 points; at 200 cases about 6.9" },
      ],
    },
    followUps: [
      {
        q: "You can add 50 more cases this month. Where do they go?",
        a: "Where risk times uncertainty is highest: critical cells with few cases, slices where users complain, and clusters in real traffic with no cases. Not into cells that already pass with room to spare.",
      },
      {
        q: "Overall pass rate is 92% but the Spanish-language slice is at 60% on 20 cases. What do you report?",
        a: "The slice with its interval (12 of 20 gives about 39% to 78%), flagged as a likely problem on a thin sample. Add cases and set a floor so the gate would fail it, and do not hide it in the average.",
      },
      {
        q: "A director asks for a single coverage percentage. What do you give?",
        a: "Offer a small set of honest numbers, for example the share of risk-weighted cells with at least a minimum number of cases, and state what that does not capture. A single figure can be given with its definition, never alone.",
      },
    ],
    mistakes: [
      "Reporting the number of test cases as if it were coverage.",
      "Treating an overall score as if it covered every slice.",
      "Reading a 4-of-5 cell as a result instead of as a hint.",
      "Claiming that the suite covers everything.",
    ],
  },

  "eval-suite-saturated-and-stale": {
    short:
      "Do not retire the suite, and do not read its flat 97 to 98% as proof that the product is good. At 117 of 120 passing (97.5%), one case is 0.83 points and the 95% range is about plus or minus 2.8 points, so the suite cannot see small gains or small losses; it can only guard known behaviour against regressions. Keep it for that, and build a second, harder suite from fresh production failures, aimed at a middling pass rate where changes become visible.",
    explain: [
      {
        heading: "Why a flat 97% tells you so little",
        body: "A saturated suite is one that nearly everything passes. With 120 cases, one case is 1 / 120 = 0.83 points. At 97.5% passing the 95% range is about 1.96 x sqrt(0.975 x 0.025 / 120) = 2.8 points either way, so a release that moves from 117 to 119 passes looks better but sits inside the noise. A high steady score also says the model passes these particular cases, not that the product works for users. Users report failure kinds the suite never shows because no case in it asks for them.",
      },
      {
        heading: "Keep it, and find what is missing",
        body: "A regression suite earns its place by catching a change that breaks behaviour you already had right. Keep it for that and stop using it as a measure of progress. To find the missing coverage, read fresh traces: sample about 100 from production, write open notes on what went wrong, group the notes, count them and see which failure kinds have no case. A failure that affects 3% of traffic shows up in a 100-trace sample at least once with probability 1 minus 0.97 to the power of 100, about 95%. Repeat on a schedule, for example 10 to 20 new traces a week.",
      },
      {
        heading: "Build a harder second suite",
        body: "Make the new suite from production failures, escalations, low user ratings and the cases where a model judge and a human disagreed. Aim for a middling pass rate, for example 40 to 70%, because that is where a real change moves the number. Report the two suites separately: the regression suite should stay near its ceiling, and the hard suite is the one that shows progress. Check fairness of the hard cases: two experts should agree on the grade and a reference solution should exist, since a 0% pass rate is usually a broken case.",
      },
      {
        heading: "Contamination, cleanup and ownership",
        body: "Check whether cases were pasted into the prompt as examples or used for tuning, because that inflates the score. Keep a held-out part that nobody tunes on. Remove duplicates, retire cases that always pass and mean nothing, and version the suite so scores from different versions are never compared as if they came from the same test. Give the suite an owner and a cadence, and tie it to the slices and risks in the coverage matrix so that it follows the product as the product changes.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["Regression suite", "Hard suite"],
      rows: [
        { label: "Job", cells: ["Guard known behaviour against regressions", "Show progress on what is still wrong"] },
        { label: "Where cases come from", cells: ["Past bugs, core user needs", "Fresh production failures, escalations, low ratings, judge and human disagreements"] },
        { label: "Healthy pass rate", cells: ["Near the ceiling, 97 to 98%", "Middling, about 40 to 70%"] },
        { label: "One case is worth", cells: ["1 / 120 = 0.83 points", "1 / 100 = 1 point"] },
        { label: "How to read it", cells: ["Any drop is an alarm", "Changes need an interval and a paired comparison"] },
      ],
      caption: "Two suites with different jobs, reported separately. The regression suite stays high and the hard suite measures progress.",
    },
    example: {
      title: "Example: the arithmetic behind the advice",
      text: "Numbers follow the question: a 120-case regression suite passing about 97.5%, and a new 100-case hard suite. The range uses the simple 1.96 x sqrt(p x (1 - p) / n) rule.",
      rows: [
        { label: "117 of 120 passing", value: "97.5%, one case is 0.83 points" },
        { label: "95% range at 97.5%", value: "about plus or minus 2.8 points" },
        { label: "A failure kind at 3% of traffic, 100 traces sampled", value: "seen at least once with probability 1 minus 0.97^100, about 95%" },
        { label: "Hard suite at 52% on 100 cases", value: "95% range about plus or minus 9.8 points" },
        { label: "A move from 52% to 58%", value: "difference range about plus or minus 13.8 points if unpaired, so not yet a result" },
      ],
    },
    followUps: [
      {
        q: "How do you know the new hard suite is fair and not just broken cases?",
        a: "A 0% pass rate is most often a broken case. Check that a reference solution exists, that two domain experts agree on the grade, and read transcripts of the failures.",
      },
      {
        q: "The score on the hard suite rose from 52% to 58% after a prompt change on 100 cases. Do you celebrate?",
        a: "Not yet: each score has a 95% range of about plus or minus 10 points on 100 cases. Use a paired comparison on the same cases, read the cases that flipped, and check the held-out set.",
      },
      {
        q: "Should old scores be rewritten when you add cases to the suite?",
        a: "No. Record the suite version with every score and say that scores before and after a change in cases are not comparable. Re-run the old build on the new suite if you need a trend.",
      },
    ],
    mistakes: [
      "Retiring the suite because it always passes, with nothing to replace it.",
      "Reading a flat 97% as proof of product quality.",
      "Adding cases copied from the prompt’s own examples, which the model has effectively seen.",
      "Comparing scores across different suite versions without comment.",
    ],
  },

  "lead-release-process-for-prompt-and-model-changes": {
    short:
      "Treat prompts, retrieval settings, model IDs and tool definitions as releasable code, versioned together and reproducible, and give each kind of change a gate that matches its risk so low-risk edits stay fast. Gate in CI with a regression suite, must-pass cases, noise-aware thresholds and cost and latency budgets, then roll risky changes out through shadow and a small canary with automatic rollback. Keep it light with a fast lane and automation, give every change an owner, and measure the process itself.",
    explain: [
      {
        heading: "One release unit, owners and risk classes",
        body: "A prompt edit can change behaviour as much as a code change, so version them together: prompt text, retrieval settings, the model ID, tool definitions and guardrail settings go in one manifest with a change log, so any release can be rebuilt and rolled back. Name an owner for each change and a second reviewer for high-risk ones. Then sort changes into classes with different gates: copy edits, prompt logic, retrieval or index changes, model swaps, and new tools or permissions. Without classes you either slow every change or let the risky ones through.",
      },
      {
        heading: "Gates in CI that allow for noise",
        body: "The gate runs a regression suite with must-pass cases (deterministic checks where possible, such as schema validity or a forbidden action) and aggregate thresholds that allow for noise: confidence intervals, repeated runs, and comparison with the current production baseline on the same cases. It also checks cost and latency budgets. A single score from a language-model judge is a noisy gate, so calibrate the judge against human labels and use paired comparisons. Cases grow from incidents, user reports and error reviews, and cases that no longer matter get pruned.",
      },
      {
        heading: "Roll out gradually, with rollback as one step",
        body: "Risky changes go first to shadow (the new version runs on real traffic but its answers are not shown), then to a small canary compared with a control group, with rollback triggers agreed in advance. Track online quality, cost and latency by version, and make rollback a single, tested step. A canary of 5% of 20,000 requests a day is 1,000 requests, whose 95% range on a 50% rate is about 3.1 points, so a canary catches large breaks and the offline gate handles the subtle ones.",
      },
      {
        heading: "Keep it light and measure the process",
        body: "People follow a process that is quick for quick changes: a fast lane for low risk, review time expectations, and automation for everything mechanical. Define an emergency path that is fast and still leaves a record, so the checks run afterwards. Measure the process itself: lead time for a change, change failure rate, number of rollbacks, time to detect, and how flaky the gate is. Run blameless reviews of every regression, and name who is on call and who can approve.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "change", label: "Change proposed", sub: "owner named, versioned" },
        { id: "class", label: "Classify risk", sub: "five classes" },
        { id: "gate", label: "CI gate", sub: "suite, budgets, thresholds" },
        { id: "review", label: "Review", sub: "second person if high risk" },
        { id: "canary", label: "Shadow, then canary", sub: "5% with a control" },
        { id: "full", label: "Full rollout", sub: "watched, one-step rollback" },
      ],
      highlight: ["gate"],
      caption: "Every change follows this path, but the fast lane skips the stages its risk class does not need.",
    },
    example: {
      title: "Example: a month of 30 changes and what it costs to check them",
      text: "The class counts and prices are example values. Assume a case costs about $0.0122 to run, including the judge call (3,000 input and 300 output tokens for the feature, 1,500 input and 100 output for the judge, at illustrative prices of $2 and $8 per million tokens). A smoke set is 40 cases and a full run is 600.",
      rows: [
        { label: "Copy edits, 12 changes", value: "smoke set only, 12 x $0.49 = about $5.86" },
        { label: "Prompt, retrieval and tool changes, 15", value: "full run, 15 x $7.32 = about $109.80, then shadow and canary" },
        { label: "Model swaps, 3", value: "full run three times, 3 x $21.96 = about $65.88, then canary" },
        { label: "Total evaluation cost for the month", value: "about $181.50" },
        { label: "Canary power", value: "5% of 20,000 a day = 1,000 requests, plus or minus 3.1 points at a 50% rate" },
      ],
    },
    followUps: [
      {
        q: "The gate is flaky because the language-model judge gives different scores on reruns. How do you fix it?",
        a: "Reduce the variance with fixed settings where possible, repeated runs, a judge calibrated against human labels and paired comparisons on the same cases. Set thresholds with tolerance and make must-pass cases deterministic checks where you can.",
      },
      {
        q: "A product manager wants to hotfix the prompt in the production console. What is your policy?",
        a: "Have an emergency path that is fast and still leaves a record: the change is versioned, checked after the fact and reviewed. Untracked edits make later incidents impossible to diagnose.",
      },
      {
        q: "The full evaluation suite takes 40 minutes and developers skip it. What do you do?",
        a: "Tier it: a fast smoke set on every change, the full run before release or nightly, parallel execution and caching, and trimming of redundant cases. A gate that people bypass is worse than a smaller one they use.",
      },
    ],
    mistakes: [
      "Applying the same heavy gate to every change, or none at all.",
      "Leaving prompts editable in production with no history.",
      "Relying on a single judge score with no handling of noise.",
      "Having no named owner for the evaluation set, so it slowly goes stale.",
    ],
  },

  "agent-test-environment-fault-injection-and-replay": {
    short:
      "Test in layers: tool code alone with no model, the loop and error handling against a scripted fake model that makes the same calls every time, the real model against faked or sandboxed tools, and only a few end-to-end runs against vendor sandboxes. Reset the world for every trial, make the fakes as awkward as the real services, and inject failures on purpose, including the case where a payment succeeded but the reply was lost. Grade the state of the world, such as exactly one refund, not the agent’s final message, and keep real money and customer data out of every test.",
    explain: [
      {
        heading: "Layers, so that flakes have one cause",
        body: "Most flakiness comes from mixing many sources of randomness in one test. Separate them. The bottom layer tests each tool’s code with no model at all, in milliseconds. The next layer runs the agent loop and its error handling against a scripted fake model that makes the same calls in the same order every time. The third layer uses the real model against fake or sandboxed tools. The top layer is a handful of end-to-end runs against the vendors’ sandboxes. When something fails, the layer tells you the likely cause.",
      },
      {
        heading: "A fresh world for every trial, and faithful fakes",
        body: "One trial must not change the next. Give each trial a freshly seeded database or an in-memory fake, unique IDs and a controlled clock, so a refund made in trial 3 cannot be seen in trial 4 and results do not depend on order. Make fakes faithful: the real error shapes, pagination, latency and rate limits. A fake that is too friendly hides bugs that appear in production, so keep it in step with the real API using contract tests, which check that the fake and the real service answer the same requests in the same shape.",
      },
      {
        heading: "Inject faults on purpose",
        body: "Make the fake tools misbehave: timeouts, 429 (too many requests) and 500 errors, empty and partial results, malformed output and duplicate delivery. Assert the behaviour you want, which is bounded retries, an honest error message to the user, escalation to a person and no repeated side effect. The nastiest case is a side effect that succeeded while the response was lost. The agent retries, and the test passes only if an idempotency key (a unique token that makes the server recognise a repeat) means the retry does no harm. Replaying recorded tool responses makes loop logic repeatable, but the model call is still random, so run several trials and report rates.",
      },
      {
        heading: "Grade the outcome and guard the wiring",
        body: "Judge by the state of the environment: a diff of the database before and after, and counts such as exactly one refund. Add checks that forbidden actions did not happen, in both directions, so the agent neither skipped a needed action nor did an extra one. Protect safety: test credentials only, a start-up check that the fake or sandbox is really wired in (the test aborts otherwise), and no real money or customer data anywhere in tests. That check is what stops a test from hitting the live payment account twice.",
      },
    ],
    diagram: {
      kind: "layers",
      layers: [
        { label: "A few end-to-end runs", sub: "real model, vendor sandboxes, test credentials only" },
        { label: "Real model against fake or sandboxed tools", sub: "injected faults, several trials, results as rates" },
        { label: "Loop and error handling against a scripted fake model", sub: "same calls every time, deterministic" },
        { label: "Tool code alone", sub: "no model, milliseconds per test" },
      ],
      caption: "Listed from the top: the slowest and least predictable layer is the smallest, and every layer below it removes one source of randomness.",
    },
    example: {
      title: "Example: why one trial is not enough, and the lost-reply test",
      text: "Run times and counts are example values. The lost-reply test is the one that proves the double charge cannot return.",
      rows: [
        { label: "Tool unit tests", value: "400 tests x 0.05 s = 20 seconds" },
        { label: "Scripted-model loop tests", value: "60 tests x 0.2 s = 12 seconds" },
        { label: "Real-model scenarios", value: "40 scenarios x 5 trials = 200 runs x 20 s = 4,000 s, about 67 minutes, or about 7 minutes on 10 parallel workers" },
        { label: "A test that fails 1 time in 10", value: "passes 5 trials in a row with probability 0.9^5 = 59%, so one run misses it" },
        { label: "Lost-reply test", value: "inject a timeout after a successful charge, retry, assert exactly 1 charge exists" },
      ],
    },
    followUps: [
      {
        q: "A test fails one run in ten. How do you tell whether it is the environment or the model?",
        a: "Rerun it with the scripted fake model. If it still flakes, the environment or the test is at fault, for example shared state, time or ordering. If it is stable, the variance comes from the real model and is measured as a rate over trials.",
      },
      {
        q: "The agent passes all tests with the fake search tool but fails in production on long result lists. What went wrong in the design?",
        a: "The fake did not paginate or truncate like the real tool. Add a contract test against the real API shape, and add fault and volume cases to the fake.",
      },
      {
        q: "How do you prove the double-charge bug cannot come back?",
        a: "Keep a permanent regression test that injects a timeout after a successful charge and asserts that exactly one charge exists. Run it in CI on every change to the payment tool or the loop.",
      },
    ],
    mistakes: [
      "Testing only with the real model against live vendor accounts, which is slow, flaky and risky.",
      "Sharing state between trials, so results depend on the order of the tests.",
      "Testing only the happy path, with no injected failures.",
      "Grading the agent’s final message instead of the state of the world.",
    ],
  },

  "leaderboard-score-high-internal-task-poor-validity": {
    short:
      "A public score answers a narrow question under particular settings, and your task probably is not in it: the benchmark may have leaked into training, may be saturated, may be sensitive to prompt format, or may have been run differently by each lab. Build the replacement from real inputs for your task, with reference answers or marking guides, a development split and a held-out split, and report every score with an interval and a paired comparison between models on the same cases. Keep the leaderboard as a coarse filter for which models to try, and decide on your own evaluation, re-run when the model, prompt or provider changes.",
    explain: [
      {
        heading: "Validity and reliability, and how scores mislead",
        body: "Two different questions hide in a score. Construct validity asks whether the benchmark measures what you care about. Reliability asks whether it gives stable numbers. A benchmark can be reliable and still irrelevant to your task. Known ways scores mislead: contamination (test questions leaked into training data, so the model has seen the answers), saturation (little headroom left between the top models), sensitivity to prompt wording and format, cherry-picked settings, and different test setups between labs. Any one of these can put a model high on the board and low on your task.",
      },
      {
        heading: "Checking contamination in practice",
        body: "When training data is available, look for overlap between benchmark items and that data. When it is not, test with reworded or newly written variants of the items. Prefer benchmarks that refresh with new questions, for example one that adds recent questions every month. A large drop on the variants is a warning sign, not proof, since the variants may simply be harder. Contamination is also not the only explanation for a poor internal result: a mismatch between the benchmark and your task is often enough.",
      },
      {
        heading: "Building the internal set",
        body: "Sample real inputs from production or realistic cases, and include the failure modes and edge cases that error analysis found. Write reference answers and marking guides, and have more than one person label a sample so you can measure how often they agree. Keep a development split for tuning and a held-out split that nobody tunes on, and split by the unit that repeats (customer, document) so near-copies do not sit on both sides. Add every incident as a new case, and refresh cases as the product changes. Keep the set private and access-controlled, so it does not become contaminated itself.",
      },
      {
        heading: "Reporting with uncertainty",
        body: "Put an interval on every score. Compare models on the same cases with a paired comparison, which looks only at the cases where the two models disagree, so it is much tighter than comparing two separate intervals. Add the slices that matter and show cost and latency next to quality. If a model judge scores the answers, validate it against human labels first. Treat the public benchmark as one input, a filter for which models deserve a trial, and let your own evaluation decide.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "percentage points",
      items: [
        { label: "Observed gap between two models", value: 1.5, note: "71.5% vs 70.0% on 200 cases", hot: true },
        { label: "95% range, comparing two separate intervals", value: 8.9, note: "plus or minus, unpaired" },
        { label: "95% range, paired on the same cases", value: 5.3, note: "plus or minus, 16 vs 13 flipped cases" },
        { label: "Paired range with 4 times the cases", value: 2.6, note: "plus or minus, 800 cases, same flip rate" },
      ],
      caption: "The observed gap is smaller than every range, so on 200 cases the models are a statistical tie. Paired comparison and more cases shrink the range.",
    },
    example: {
      title: "Example: two models 1.5 points apart on 200 internal cases",
      text: "Model A passes 140 of 200 (70.0%) and model B passes 143 (71.5%). Suppose B passes and A fails on 16 cases, and A passes and B fails on 13. These flip counts are example values.",
      rows: [
        { label: "Difference", value: "(16 minus 13) / 200 = 1.5 points" },
        { label: "Paired standard error", value: "sqrt(29 minus 9 / 200) / 200 = about 2.7 points" },
        { label: "Paired 95% range", value: "1.96 x 2.7 = about plus or minus 5.3, so from about minus 3.8 to plus 6.8" },
        { label: "Unpaired 95% range", value: "about plus or minus 8.9 points, wider" },
        { label: "Cases needed to exclude zero at this flip rate", value: "about 1.96^2 x 0.145 / 0.015^2 = about 2,500" },
      ],
    },
    followUps: [
      {
        q: "Two models differ by 1.5 points on your internal set of 200 cases. How do you present it?",
        a: "As a paired interval, which at this size will usually include zero, and say how many more cases would resolve it. If quality is a tie, decide on cost, latency and robustness.",
      },
      {
        q: "A vendor shows a new benchmark where its model leads. What do you ask?",
        a: "Who built it, whether items could be in training data, what settings were used for the other models, whether the task matches yours, and whether the results have been reproduced independently.",
      },
      {
        q: "How do you prevent the internal set itself from becoming contaminated?",
        a: "Keep it private and access-controlled, avoid pasting cases into public tools or vendor training programmes, add fresh cases over time, and keep a held-out part that is never tuned on.",
      },
    ],
    mistakes: [
      "Picking a model from a leaderboard rank alone.",
      "Building the internal set from the same data used to tune prompts.",
      "Reporting differences between models with no interval.",
      "Treating contamination as impossible, or as the only possible explanation.",
    ],
  },

  "design-llm-release-pipeline-eval-gates": {
    short:
      "Version everything that shapes behaviour as one release unit (prompts, a model pinned to a dated snapshot, decoding settings, tool schemas, the retrieval index and embedding model, guardrail settings) and stamp its version on every trace. Gate changes in CI against the current production baseline with noise-aware thresholds, roll out behind a flag through shadow and a small canary with rollback rules agreed in advance, and keep the previous release deployable. Catch silent vendor changes with a scheduled eval against the production endpoint that alerts on drift.",
    explain: [
      {
        heading: "One release unit, stamped on every trace",
        body: "A change to any of these parts can change the answers, so treat them as one unit: prompt templates, the model identifier (pinned to a dated snapshot where the vendor offers one), decoding parameters, tool schemas, the retrieval index and embedding model version, and guardrail settings. Record the unit’s version on every trace, so when something goes wrong you know exactly what produced it. An alias such as “latest” hands control of your behaviour to the vendor, so avoid it in production.",
      },
      {
        heading: "CI gates that compare and allow for noise",
        body: "On every change to the unit, CI runs an offline eval suite: a golden set with task-specific metrics, regression cases from past incidents, safety and prompt-injection cases, and deterministic checks such as schema validity and citations present. Compare with the production baseline, not with a fixed number. Allow for noise with enough cases, several samples or fixed seeds, and confidence intervals, and block the merge on a significant regression in any critical slice, even if the average is fine. If a language-model judge is used, calibrate it against human labels, spot-check it, and pin the judge model too.",
      },
      {
        heading: "Rollout, and rollback that always works",
        body: "Release behind a feature flag. Start with shadow traffic or a canary of a few percent, and compare online signals: a proxy for task success, user feedback, escalations, refusal and format-error rates, latency and cost per task. Agree the automatic rollback criteria before you start. Keep the previous release unit deployable, and keep old index versions until the new one is proven. An embedding change needs a blue-green approach (build the new index next to the old one, switch over, keep the old one) because every document must be re-embedded.",
      },
      {
        heading: "Noticing a silent vendor change",
        body: "The vendor can change a model behind the same name. Run a scheduled canary eval, for example daily, that sends a fixed suite to the production endpoint and alerts on drift in scores, output length, refusal rate or schema failures. Log any model version or fingerprint field the API returns, and track the vendor’s deprecation dates. Deterministic measures such as schema failures and length are less noisy than judged quality, so they are the best first alarms.",
      },
    ],
    diagram: {
      kind: "timeline",
      steps: [
        { label: "Pin the release unit", detail: "Prompts, dated model snapshot, settings, tools, index and embedding version in one manifest." },
        { label: "CI eval", detail: "Golden set, past incidents, safety cases and deterministic checks run on every change." },
        { label: "Compare with baseline", detail: "Noise-aware thresholds block a significant regression in any critical slice." },
        { label: "Shadow, then canary", detail: "A few percent of traffic behind a flag, with rollback criteria agreed in advance." },
        { label: "Ramp up and watch", detail: "Online quality, cost and latency tracked by version, with one-step rollback." },
        { label: "Daily drift canary", detail: "A fixed suite against the production endpoint alerts when the vendor changes the model." },
      ],
      caption: "The unit is pinned first, gated in CI, rolled out gradually, and then watched for silent changes from the vendor.",
    },
    example: {
      title: "Example: a daily drift check, sized with real arithmetic",
      text: "Assume a fixed set of 100 cases sent daily to the production endpoint, a normal schema-failure rate of 1%, and an alert when 5 or more of the 100 outputs fail the schema. The cost uses illustrative prices of $2 and $8 per million tokens and about $0.0122 per case with a judge call.",
      rows: [
        { label: "Cost per day", value: "100 x $0.0122 = $1.22, about $36.60 a month" },
        { label: "False alarm chance on a normal day", value: "P(5 or more failures at a 1% rate) = about 0.3%" },
        { label: "If the true failure rate rises to 8%", value: "alert fires with probability about 91%" },
        { label: "If the true failure rate rises to 3%", value: "alert fires with probability about 18%, so a small drift needs several days or more cases" },
        { label: "Judged quality on 100 cases", value: "range of about 10 points, so use it only for large drift" },
      ],
    },
    followUps: [
      {
        q: "Your golden set has passed every release for six months. Why might that worry you?",
        a: "It may be stale or overfitted by prompt tuning. Refresh it from recent production samples and failures, keep a held-out set, and check coverage of new use cases.",
      },
      {
        q: "The vendor deprecates your pinned snapshot with three months' notice. How do you plan the migration?",
        a: "Run the candidate through the full suite early, compare slices, adapt the prompts, canary with rollback and budget time for re-tuning. Keep a second model option evaluated in case the replacement regresses.",
      },
      {
        q: "How do you keep the CI eval fast and affordable as the suite grows?",
        a: "Tier it: a small smoke set on every commit, the full suite on merge or nightly, caching of unchanged results and sampling with a known confidence. Track the eval cost as a budget.",
      },
    ],
    mistakes: [
      "Calling a model alias such as “latest” in production and assuming the behaviour is stable.",
      "Treating prompt edits as config tweaks that skip review and evals.",
      "Gating on a single average score, with no slices and no allowance for noise.",
    ],
  },

  "behavioural-flawed-eval-or-dataset": {
    short:
      "Pick one real story with real stakes: a launch or a model choice that depended on an evaluation you later found was flawed. Say what made you suspicious, how you confirmed it with evidence (re-splitting, deduplicating, re-labelling a sample), what exactly the flaw was, and how the score changed once it was fixed. Then show that you told the decision makers early, fixed the root cause and the process and not just the number, and say what you would do differently.",
    explain: [
      {
        heading: "The signal and the confirmation",
        body: "A story like this starts with a doubt: a result that looked too good, a gap between the benchmark and production or user feedback, a slice that behaved oddly, or a strange example found while reading raw data. Doubt is not evidence, so show what you did to confirm it: re-split the data by group or by time, remove duplicates, re-label a sample by hand, or run an ablation (remove one thing and see what changes). Quantify the result, for example the score before and after the fix, because a number makes the story concrete and shows you measured instead of guessing.",
      },
      {
        heading: "Name the flaw precisely and say why it mattered",
        body: "Be specific about what was wrong: train and test overlap, leakage (information the model will not have in real use), label errors, a judge prompt that favoured longer answers, or a test set unlike real users. Then explain why it changed the conclusion. In the made-up example below, a random split put near-copies from the same customer on both sides, so the model was partly being tested on what it had memorised, and the grouped split gave a much lower and more honest score.",
      },
      {
        heading: "Telling people, and fixing the process",
        body: "Tell the people who are making decisions early, even when the news is unwelcome or the mistake was yours or a colleague’s, and be clear about what you know and what you do not. Share the evidence with the people involved first where that is kind, and agree together how to correct any reporting that went upward. Then fix the root cause, not just the number: new split rules, a frozen held-out set, data checks, the evaluation in CI and documentation. End with what you would do differently and what the team learned.",
      },
    ],
    diagram: {
      kind: "experiment",
      slug: "data-leakage",
      caption: "Try it: score the same model with a split by row and a split by speaker, and watch a near-perfect score fall on new speakers.",
    },
    example: {
      title: "Example: an illustrative story with its arithmetic",
      text: "This story is made up to show the shape. A team picked a ticket classifier because it scored 94% on a random split. A rise in complaints made one engineer re-split by customer.",
      rows: [
        { label: "Original random split", value: "94% on the test set, chosen for launch" },
        { label: "Overlap found", value: "12% of test tickets had a near-copy from the same customer in training (example)" },
        { label: "Re-split by customer", value: "81%, a drop of 13 points" },
        { label: "Label check on 100 sampled tickets", value: "9 wrong labels, 9% with a 95% range of about plus or minus 5.6 points" },
        { label: "Process change", value: "split by customer by default, frozen held-out set, duplicate check in CI" },
      ],
    },
    followUps: [
      {
        q: "How did the people who had already reported the original number react, and how did you handle it?",
        a: "Without blame: share the evidence privately first where appropriate, focus on the decision and not the person, and agree together how to correct any reporting to management or outside.",
      },
      {
        q: "If you had not found it, what would have happened, and how would the team have found out?",
        a: "State the concrete consequence, such as a weaker model shipped, wasted training budget or a user-facing failure. Name the monitoring or later check that would eventually have caught it, which shows that you think about detection and not luck.",
      },
    ],
    mistakes: [
      "Telling a generic story with no numbers or details, one that could come from any job.",
      "Quietly fixing the problem without telling the people who had made decisions on the flawed results.",
      "Blaming colleagues or the data team without describing your own actions.",
      "Being unable to explain why the flaw changed the conclusion.",
    ],
  },

  "pushing-back-on-weak-evals": {
    short:
      "Describe the concrete stakes (who could be harmed, or what could go wrong) and why the existing evals could not rule it out, then show you understood the deadline, the competitor or the customer promise on the other side. Turn the disagreement into evidence with a quick targeted eval, a red-team session or a sample of real failures, and come with options instead of a plain no: a narrower launch, a staged rollout, human review, a feature flag, or launch criteria agreed in advance. Be honest about the outcome, including being overruled, and say what you would do differently.",
    explain: [
      {
        heading: "Stakes first, and the other side’s goals",
        body: "Say plainly what could go wrong: wrong advice given to a customer, a data leak, a cost overrun. Then say why the evidence in hand could not rule it out, for example that the evaluation covered only easy questions or only 30 cases. Show that you understood why the product lead wanted to ship: a deadline, a competitor, a commitment to a customer. If it sounds like a fight, you have already lost the room. If it sounds like two people trying to protect the same launch, you can find a way forward.",
      },
      {
        heading: "Turn the argument into evidence",
        body: "Opinions are cheap, so make the risk visible: a quick targeted eval of the worst cases, a red-team session (people deliberately trying to make it fail), or a sample of real failures from a pilot. A concrete example does the work of an argument. In the made-up example below, 6 wrong answers in a sample of 60 real tickets is a 10% error rate, with a 95% range of roughly 5% to 20%, which is hard to wave away and easy to understand.",
      },
      {
        heading: "Offer options, and live with the decision",
        body: "A bare “it is not ready” gives the other side only two choices, ship or not. Bring more: a narrower launch to one customer group, a staged rollout behind a flag, human review of the risky answers, or explicit launch criteria agreed in advance. If you are overruled, say so honestly and describe what you did next: monitoring, a rollback plan, quick follow-up evals and documented risks, without sabotage and without “I told you so”. Finish with the lesson, such as agreeing the evaluation criteria at the start of the project.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["What ships", "Risk that remains", "What you need first"],
      rows: [
        { label: "Ship as planned", cells: ["Everything, to everyone", "Highest: failures reach all users", "Strong evidence, which is missing"] },
        { label: "Narrower launch", cells: ["One customer group or one topic", "Lower, limited to where evidence is strong", "A clear boundary and a way to enforce it"] },
        { label: "Staged rollout with a flag", cells: ["1%, then 10%, then everyone", "Harm limited at each stage", "Metrics to watch and a tested rollback"] },
        { label: "Human review of risky answers", cells: ["Full feature, a person approves the risky part", "Low for those answers, costs time", "Review capacity and a rule for what counts as risky"] },
        { label: "Delay", cells: ["Nothing yet", "None from the feature, but cost to the business", "A date and the criteria that will end the delay"] },
      ],
      caption: "Options to put on the table, so the choice is not just ship or do not ship.",
    },
    example: {
      title: "Example: making a weak-evidence risk visible",
      text: "This is a made-up case. A pilot answers customer billing questions, and the existing evaluation has 30 hand-written cases. You sample 60 real tickets and have two experts grade the answers.",
      rows: [
        { label: "Wrong answers in the sample", value: "6 of 60 = 10%" },
        { label: "95% range for the true rate", value: "about 5% to 20%" },
        { label: "Launch criteria agreed in advance (example)", value: "0 failures on 30 must-pass cases, groundedness at least 95% on 200 sampled answers" },
        { label: "What 0 failures in 30 would still allow", value: "a true rate up to about 3 / 30 = 10%, so 30 cases are not enough to prove safety" },
        { label: "Option offered", value: "staged rollout at 5%, human review of refund answers, rollback plan" },
      ],
    },
    followUps: [
      {
        q: "What would have changed your mind and made you agree to ship?",
        a: "Specific, measurable criteria, for example a pass rate on must-pass cases, groundedness on sampled traffic or a leakage test. That shows your position rested on evidence, not taste.",
      },
      {
        q: "Suppose you were overruled and the feature shipped. What did you do next?",
        a: "Commit to making it succeed: monitoring, a rollback plan, fast follow-up evals and documented risks, without sabotage or “I told you so”.",
      },
    ],
    mistakes: [
      "Framing it as winning an argument, with no sign that you understood the business pressure.",
      "Opposing the launch with no data and no proposal beyond “it is not ready”.",
      "Quietly blocking or delaying work instead of raising the concern openly.",
    ],
  },

  "behavioural-severe-failure-two-days-before-launch": {
    short:
      "Classify it first: showing one customer another’s order details is a privacy and security failure, so it blocks the affected feature and is not a quality score to trade against a date. Reproduce it and measure the rate (6 of 40 is 15%), find the root cause, tell the owners of privacy and security in writing, and lay out the options with their costs: fix and retest, launch without the feature, or delay. Insist that the fix is enforced in code and not in a prompt, retest with many variants, and put the case on a permanent zero-tolerance list.",
    explain: [
      {
        heading: "Facts, classification and scope",
        body: "Begin with what you know. In 6 of 40 attempts, which is 15%, the assistant showed one customer another customer’s order details. That is a data exposure, so it is a release blocker for the affected feature, not a bug with a priority number. Reproduce it, run it repeatedly to measure the rate, and find the root cause. The key question is where the permission check lives: in the tool code, which filters by the signed-in user, or only in the prompt, which is a request the model may ignore. Then scope who and what could be exposed.",
      },
      {
        heading: "Tell people at once, with options",
        body: "Write it down and send it to the right people today: what happened, how often in testing, how it works at a high level (without spreading the exact attack widely), who could be affected, and the options. Involve the owners of privacy and security. The options and their costs are: fix and retest before launch, launch without the affected tool or feature, or delay. You recommend, but you do not quietly decide for others, and any residual risk is accepted in writing by a named owner. Product’s wish to ship with a known-issues note is a reasonable thing to hear, but a note does not protect the person whose data is shown.",
      },
      {
        heading: "Fix it in code, and be honest about the retest",
        body: "The fix belongs in the tool code, which must filter by the signed-in user. One added sentence in the system prompt is not an access control. Then test many variants, not just the one prompt that failed. Be honest about what a clean retest proves. If 40 new attempts show 0 failures, the 95% upper bound on the true rate is still about 3 / 40 = 7.5%, so a short retest proves little. 100 clean attempts bound it near 3% and 300 near 1%. Add the case and its variants to a permanent critical list with zero tolerance, and set up monitoring and an incident plan for after launch.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "percent failure rate",
      items: [
        { label: "Found in the red-team run", value: 15, note: "6 of 40 attempts", hot: true },
        { label: "Upper bound after 40 clean retests", value: 7.5, note: "3 / 40" },
        { label: "Upper bound after 100 clean retests", value: 3, note: "3 / 100" },
        { label: "Upper bound after 300 clean retests", value: 1, note: "3 / 300" },
      ],
      caption: "A clean retest only caps the failure rate. The cap shrinks slowly with more attempts, so a short retest proves little.",
    },
    example: {
      title: "Example: the next 48 hours",
      text: "The counts come from the question and the rule of three (about 3 divided by the number of clean attempts is the 95% upper bound on a failure rate). The timeline is an example plan.",
      rows: [
        { label: "Rate found", value: "6 of 40 = 15%, 95% range about 7% to 29%" },
        { label: "Hour 0 to 4", value: "reproduce, find where the permission check is, tell privacy, security and product in writing" },
        { label: "Day 1", value: "move the user filter into the tool code, then retest with 300 varied attempts" },
        { label: "If 0 of 300 fail", value: "upper bound about 3 / 300 = 1%, still not zero, so keep the case on the critical list" },
        { label: "Day 2", value: "launch decision by a named owner, with monitoring, a kill switch and an incident plan" },
      ],
    },
    followUps: [
      {
        q: "The product manager says 6 of 40 is a rate on adversarial prompts, not on real traffic, so it is rare. How do you respond?",
        a: "Agree that the adversarial rate is not the production rate, but the severity is high and a motivated user can find it. One exposure does more harm than rarity makes up for, and the design flaw is the same either way.",
      },
      {
        q: "The proposed fix is one added sentence in the system prompt. Do you accept it?",
        a: "Not on its own. A prompt is a request, not an access control, so ask for the check in code and test whether the prompt change really removes the behaviour across variants.",
      },
      {
        q: "Leadership still decides to launch with the issue. What do you do?",
        a: "Make sure the decision and the accountable owner are recorded, and press for mitigations such as limiting the exposure, monitoring and a kill switch. Escalate through the proper channel if it breaks policy or law, keep testing, and do not alter your findings.",
      },
    ],
    mistakes: [
      "Treating it as a normal bug with a priority number.",
      "Accepting a prompt-only fix as if it were an access control.",
      "Keeping the finding within a small group to avoid conflict.",
      "Declaring it fixed after the one failing prompt passes.",
    ],
  },
};
