import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'eval-labeller-agreement-and-kappa': {
    short:
      "Ninety percent agreement does not mean the labels are fine, because when 91% of answers pass, two people who barely look would still agree about 82% of the time by luck. Cohen’s kappa, which removes that luck, is (0.90 - 0.82) / (1 - 0.82), about 0.44, which is only moderate. On the answers that matter, the failures, the two reviewers agree on just 10 of the 30 that either one flagged. Read the 20 disagreements, fix the rubric where it was vague, and relabel before trusting the set.",
    explain: [
      {
        heading: "Why raw agreement flatters the labels",
        body: "Reviewer A passed 170 + 12 = 182 of the 200 answers (0.91) and reviewer B passed 170 + 8 = 178 (0.89). If each of them simply passed at their own rate with no reading at all, they would both pass by chance 0.91 x 0.89 = 0.81 of the time and both fail 0.09 x 0.11 = 0.01 of the time, so chance agreement is 0.82 (0.8198 to be exact). Cohen’s kappa asks how far the real agreement of 0.90 rises above that luck baseline, as a share of the room left: (0.90 - 0.82) / (1 - 0.82), about 0.44. Of the 90 points of agreement, 82 would have appeared anyway.",
      },
      {
        heading: "Look at the rare class, then at the disagreements",
        body: "The failures are what an eval exists to catch, and they are rare here. A failed 18 answers and B failed 22, but they agree on only 10, so out of the 30 answers that either person called a failure, only a third are a failure to both. A model graded against these labels would be graded against a coin flip on its worst answers. Now read the 20 disagreements (12 + 8) one by one and ask which sentence of the rubric would have settled each. Usually the rubric is vague, not a person wrong.",
      },
      {
        heading: "What you do next",
        body: "Rewrite the rubric as yes or no questions (does the answer state the refund window from the source? does it mention a policy that is not in the source?), each with a one-line reason the labeller writes down. Write the rubric after reading a batch of real outputs, because what people count as good or bad shifts as they see examples (criteria drift), and code any rule a program can check, such as format or a required field. Add the disputed cases as worked examples, have the two reviewers relabel independently before they talk, and measure kappa again. On a small team one named domain expert can make the final call, and where stakes are higher you keep two or more labellers and watch kappa.",
      },
      {
        heading: "The same discipline for an LLM judge, and for the set itself",
        body: "A model that grades answers is one more labeller, and it earns trust the same way: score it against human labels on about 100 samples with a chance-corrected agreement, or precision and recall for each class, and repeat after any change to the judge, the rubric or the kind of content. Keep the set honest too. Split development and held-out data by conversation, document or customer so near-duplicates do not sit on both sides, remove duplicates, version the set, and scrub personal data before anyone labels it.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "percent",
      items: [
        { label: "Raw agreement", value: 90, note: "180 of 200: the number the manager quoted" },
        { label: "Agreement expected by luck alone", value: 82, note: "0.91 x 0.89 + 0.09 x 0.11" },
        { label: "Cohen’s kappa", value: 44, note: "(0.90 - 0.82) / (1 - 0.82)", hot: true },
        { label: "Failures both reviewers agree on", value: 33, note: "10 of the 30 flagged by either", hot: true },
      ],
      caption: "The first bar looks healthy. The other three are what the eval actually rests on.",
    },
    example: {
      title: "Example: the 2 x 2 table behind the numbers",
      text: "These are the question’s own counts. Rows show reviewer A and columns show reviewer B. The arithmetic is shown in full so you can reuse it on any pair of labellers.",
      rows: [
        { label: "Both pass", value: "170" },
        { label: "A passes, B fails", value: "12" },
        { label: "A fails, B passes", value: "8" },
        { label: "Both fail", value: "10" },
        { label: "Observed agreement", value: "(170 + 10) / 200 = 0.90" },
        { label: "Chance agreement", value: "0.91 x 0.89 + 0.09 x 0.11 = 0.82" },
        { label: "Kappa", value: "(0.90 - 0.82) / (1 - 0.82), about 0.44" },
      ],
    },
    followUps: [
      {
        q: "How many cases do you need to detect that a prompt change is 3 points better, starting from a 70% pass rate?",
        a: "Comparing 70% with 73% as two separate groups, with a 5% false-alarm rate and 80% power, needs about 3,500 cases per version. If both versions run on the same cases and mostly agree, far fewer are needed, so first decide the smallest gap that would change a decision and then size the set.",
      },
      {
        q: "Where do your first 50 cases come from?",
        a: "From real traffic, complaints and support tickets. Read them, note the first thing that went wrong in each, then group and count the failures, and add an adversarial slice on top. Synthetic cases are for filling gaps, and you generate the inputs, never the expected answers.",
      },
      {
        q: "Why split by conversation or customer rather than by row?",
        a: "Rows from one conversation or customer share facts and wording, so a row-level split puts near-copies of development cases in the held-out set. The score then looks better than it will on new people.",
      },
    ],
    mistakes: [
      "Treating percent agreement as the quality of the labels, without correcting for chance.",
      "Never reading the disagreements, which is where the rubric flaws show up.",
      "Using a vague 1 to 5 helpfulness scale as the main criterion instead of specific yes or no questions.",
      "Validating a judge by how often it agrees with itself, not with humans.",
    ],
  },

  'first-eval-set': {
    short:
      "Sample 50 to 200 real tickets from your logs across ticket types and lengths, add the hard cases and every bug already reported, and write down for each what a good summary must contain and must not contain. Score with code wherever possible (format, required fields, forbidden content) and use a model judge only for fuzzy criteria, checked against a few human labels. Record a baseline, run the suite on every prompt, model or retrieval change, and block a change that drops the score by more than the noise or fails any must-pass case.",
    explain: [
      {
        heading: "Pick the cases and say what good means",
        body: "An eval is a fixed set of test cases you run and score every time something changes, the AI version of a regression test suite. Start from real inputs: sample tickets from the logs so every type and length shows up, then add known hard cases (very long threads, mixed topics, other languages) and every bug a user has already reported. Fifty to 200 cases is a good start, small enough that someone can label each one carefully. For each case, a perfect reference summary is hard to write and hard to match, so write a checklist instead: the facts that must appear (product, order number, what the customer asked for) and the things that must not (the wrong customer, an invented refund).",
      },
      {
        heading: "Score cheaply first, use a judge second",
        body: "Code checks are free, fast and repeatable: the summary is valid JSON with the required fields, it is under 120 words, it names the same customer as the ticket, and it contains none of the forbidden strings. Use a model judge only for what code cannot check, such as whether the summary is faithful to the ticket, and before you trust it compare its verdicts with a few dozen human labels. Read some outputs by hand too, because reading is how you learn which checks to add next.",
      },
      {
        heading: "Turn it into a regression gate",
        body: "Run the suite once to get a baseline score, then run it again on every change to the prompt, model or retrieval, ideally automatically in CI (the build that runs on every proposed change). The gate has two parts: block the change if any must-pass case fails, and block it if the overall score falls by more than the noise level. With 100 cases at an 85% pass rate the standard error (the typical wobble of the score) is sqrt(0.85 x 0.15 / 100), about 3.6 points, so a 95% range is roughly 7 points either way. Comparing the two versions case by case and reading which cases flipped is more sensitive than comparing two totals.",
      },
      {
        heading: "Keep it alive",
        body: "Version the set and the prompts together so every score can be traced to what produced it. Every production failure becomes a new case. Keep a slice of cases that nobody tunes against, or the prompt slowly learns the test, and refresh it with new production samples. Watch online signals as well, such as how often agents edit the summaries.",
      },
    ],
    diagram: {
      kind: "experiment",
      slug: "no-evals",
      caption: "Six small changes to a made-up assistant: the average rises while one important group of cases breaks. Only a test set shows it.",
    },
    example: {
      title: "Example: a first week",
      text: "A plan for the ticket summariser. The case count, thresholds and times are example choices to adapt, not rules.",
      rows: [
        { label: "Monday", value: "Sample 120 tickets from logs, spread over ticket types and lengths; add the 10 reported bugs" },
        { label: "Tuesday", value: "Write a must-have and must-not-have checklist for each case" },
        { label: "Wednesday", value: "Code the format and forbidden-content checks; label 30 cases by hand to test the judge" },
        { label: "Thursday", value: "Run the suite on the current prompt and record the baseline (say 85 of 100 core cases pass)" },
        { label: "Friday", value: "Wire it into CI: block on any must-pass failure or a drop of more than about 7 points" },
        { label: "Noise at 100 cases, 85% pass", value: "standard error 3.6 points; 95% range about 7 points" },
      ],
    },
    followUps: [
      {
        q: "With 100 cases and an 85% pass rate, the new prompt scores 82%. Is it worse?",
        a: "Not clearly. The standard error is about 3.6 points, so a 3-point drop is inside the noise. Compare results case by case, look at which cases flipped, then add cases or rerun before deciding.",
      },
      {
        q: "How do you stop the team from overfitting the prompt to the eval set?",
        a: "Keep a held-out set that is not looked at while tuning, and refresh it with new production samples. Check online metrics too, because a prompt can learn the test without getting better for users.",
      },
    ],
    mistakes: [
      "Judging each change by reading a few outputs by eye.",
      "Building the set only from synthetic, easy examples.",
      "Treating every score change as meaningful whatever the sample size.",
    ],
  },

  'why-assert-equal-fails-for-llm-output': {
    short:
      "A language model samples each next word from a set of probabilities, so the same input can produce different wording on different runs, and an exact-match test fails whenever the wording differs even if the answer is fine. Even at temperature 0 or with a fixed seed, identical output is often not guaranteed, and providers can change the model behind a name. Test properties instead: facts and formats that code can check, a rubric or judge only for what code cannot, and a pass rate over several runs with a gate set from measured variation.",
    explain: [
      {
        heading: "Why the same input gives different output",
        body: "The model does not look up an answer. It computes a probability for every possible next token (a word or word piece), picks one, and repeats, and the pick is random in proportion to those probabilities. Two runs can therefore say “Your refund arrives in 5 days” and “Refunds take about five days”, both correct. Setting temperature to 0 (always pick the most likely token) or using a fixed seed reduces the variation, but identical repeats are often still not guaranteed, because of batching on the provider’s servers, small numeric differences and changes behind the model name, so check the provider’s current documentation and never build a test on it.",
      },
      {
        heading: "Two ways an exact-match test lies",
        body: "It fails on answers that are right but worded differently, which trains the team to rerun it until it is green. It can also pass on answers that are wrong in the same way each time. A test that fails one run in four is not a flaky framework, it is telling you the output varies. If you have ten such tests, the chance that all ten pass on a given run is 0.75 to the power 10, about 5.6%, so the suite is red almost every time and no one believes it.",
      },
      {
        heading: "Test properties, and fake the model for the rest",
        body: "Write checks that any correct answer must satisfy and code can verify: valid JSON, required fields present, the key fact included (“30 days”), nothing forbidden, the right language, a length range. Use a rubric or a calibrated model judge only for what code cannot check, such as faithfulness to a source. Report a pass rate over several runs and set the gate from the measured run-to-run variation, not from one sample. Most of the code around the model (parsing, retries, routing, formatting) is ordinary code, so test it exactly with a fake model that returns scripted responses, and keep the real-model tests for a smaller, statistical suite.",
      },
      {
        heading: "Record what produced each result",
        body: "With every result, store the model version, the prompt version and the settings. When a score moves, you can then tell whether your change, a provider update or plain noise did it. Exact match still belongs where the output is a fixed value: a classification label, or which tool the model chose.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["Exact match on text", "Property checks", "Scripted fake model"],
      rows: [
        { label: "What it tests", cells: ["One saved wording", "Facts and formats any good answer has", "Your code around the model"] },
        { label: "Breaks on harmless rewording", cells: ["Yes, constantly", "No", "Not applicable"] },
        { label: "Catches a wrong answer", cells: ["Only if it differs from the saved text", "If the property covers the mistake", "No, it never calls a real model"] },
        { label: "Result", cells: ["Pass or fail on one sample", "Pass rate over several runs", "Exact pass or fail every time"] },
        { label: "Best used for", cells: ["Fixed values such as a label or tool name", "The quality of model output", "Parsing, retries, routing, formatting"] },
      ],
      caption: "Three kinds of test, each for a different part of an LLM feature. A good suite uses all three.",
    },
    example: {
      title: "Example: a ticket summariser test, rewritten",
      text: "The old test saved one summary string and asserted equality. The new one runs the same ticket 10 times and checks properties. The ten-test arithmetic is exact; the threshold is an example you would set from your own measured spread.",
      rows: [
        { label: "Old test, passes 3 runs in 4", value: "Ten of them all pass with probability 0.75^10, about 5.6%" },
        { label: "Property 1", value: "Output is valid JSON with fields customer, issue and next_step" },
        { label: "Property 2", value: "Contains the order number from the ticket and under 120 words" },
        { label: "Property 3", value: "Does not mention any refund amount that is not in the ticket" },
        { label: "Gate (example)", value: "At least 9 of 10 runs satisfy all three; baseline spread measured first" },
      ],
    },
    followUps: [
      {
        q: "Will setting temperature to 0 and a seed make the test reliable?",
        a: "It reduces variation but does not guarantee identical output, and not every model supports those settings. Harmless rewording and model updates will still break an exact-match test, so property checks are the durable approach.",
      },
      {
        q: "Your property check passes on a well-formed but wrong answer. What do you add?",
        a: "A check of the content: a reference fact the answer must contain, a judge that sees the source and has been calibrated, or a human-labelled set. Format checks prove the shape is right, not that the answer is correct.",
      },
      {
        q: "What can remain an exact-match test?",
        a: "Structured fields with fixed values, such as a classification label or which tool was chosen. The deterministic code around the model can also be tested exactly.",
      },
    ],
    mistakes: [
      "Saving the full text of a model output and comparing it exactly.",
      "Calling the flaky test a framework problem and adding retries until it goes green.",
      "Believing temperature 0 makes the output identical on every run.",
    ],
  },

  'fde-triage-one-wrong-answer-escalation': {
    short:
      "Reply within the hour, before you know the cause: acknowledge the report, say you are looking at the conversation, and promise a time for the next update, without guessing or calling it a one-off. Then pull the full trace, sort the cause into retrieval, source document, prompt, model or integration, and search the logs to see whether this was one case or a pattern. Fix it at the layer where it broke, add the case to the evals, and report back in plain words with the count of affected conversations and what is still unknown.",
    explain: [
      {
        heading: "Answer fast, say little you do not know",
        body: "The manager’s real question is whether it is safe to rely on you, and silence answers it badly. Reply the same morning: you have the conversation ID, you are reading what the assistant was shown and said, you will not guess at a cause yet, and you will write again by a stated time. Do not say it is an isolated mistake until the logs say so, and do not argue about whether a model sometimes errs.",
      },
      {
        heading: "Find where it went wrong",
        body: "Pull the trace for that conversation: the user’s message, the passages retrieved, the prompt and model versions, any tool calls, and the final answer. Try to reproduce it with the same inputs. Then place the fault in one of a short list. The right document was not retrieved. The document itself is wrong, out of date or contradicts another. The prompt left a gap. The model misread good context. The question was ambiguous. An integration passed the wrong data. Each has a different owner and a different fix, so naming the layer matters more than naming a culprit.",
      },
      {
        heading: "Check how big it is before you conclude",
        body: "Search the logs for other conversations about return windows in the pilot and count them. One wrong answer in 340 conversations on the topic is a different situation from 60 in 340, and you want the number before you write back. Check what the customer’s own pages say as well, since some wrong answers are the source’s fault.",
      },
      {
        heading: "Fix, protect and report",
        body: "Fix at the layer where the fault is (the index, the document, the prompt, the integration), and add the failing conversation to the eval set so it cannot quietly come back. If the topic is risky, add an interim safeguard such as sending return-window questions to a person until the fix is measured. Then write back in plain words: what happened, how many conversations were affected, what changed, what you will watch, and what you do not yet know. Honesty about the unknown builds more trust than a confident story that later changes.",
      },
    ],
    diagram: {
      kind: "timeline",
      steps: [
        { label: "First hour", detail: "Acknowledge, say you are looking at conversation ID, give a time for the next update." },
        { label: "Pull the trace", detail: "User input, retrieved passages, prompt and model versions, tool calls, final output." },
        { label: "Name the layer", detail: "Retrieval, source document, prompt, model, ambiguity or integration." },
        { label: "Measure the scope", detail: "Search similar conversations and count how many gave the same wrong answer." },
        { label: "Fix and protect", detail: "Fix at that layer, add the case to evals, add an interim safeguard if needed." },
        { label: "Report back", detail: "What happened, how many, what changed, what you will watch, what is unknown." },
      ],
      caption: "Fast acknowledgement first, diagnosis second, and a written report once the count is known.",
    },
    example: {
      title: "Example: what the reply and the findings might look like",
      text: "All figures here are made-up example numbers. The shape is what matters: a quick holding reply, then a findings note with a count.",
      rows: [
        { label: "Reply within an hour", value: "“Thank you for flagging this. We have the conversation and are checking what the assistant was shown. You will have an update by 4 pm today.”" },
        { label: "Finding (example)", value: "The assistant retrieved an old policy page that said 14 days; the current page says 30" },
        { label: "Scope (example)", value: "6 of 340 return-window conversations in two weeks gave the old window, about 1.8%" },
        { label: "Fix (example)", value: "Remove the old page from the index, re-index, add the 6 conversations as eval cases" },
        { label: "Interim safeguard (example)", value: "Return-window questions go to a person until 3 days of clean results" },
      ],
    },
    followUps: [
      {
        q: "Your logs do not store the retrieved passages, so you cannot see what the model was shown. What do you do now, and what do you change?",
        a: "Say honestly that the cause cannot be proven for this case, and try to reproduce it with the same query and index version. Then add tracing that records the retrieved passages and the prompt and model versions, within the data rules, so the next report can be diagnosed.",
      },
      {
        q: "It turns out the customer’s own policy page lists two different return windows. What do you do?",
        a: "Show them the conflict as a finding, because the source of truth is theirs to fix. Propose one authoritative document, avoid patching it silently with a prompt rule, and offer to make the assistant say it is unsure when sources conflict.",
      },
      {
        q: "The manager says, “Turn it off until you can prove it is safe.” How do you respond?",
        a: "Do not argue. Offer scoped options such as pausing the affected topic, adding human review, or keeping it internal, and agree measurable conditions for turning it back on. If they still want it off, accept that.",
      },
    ],
    mistakes: [
      "Answering with “the model sometimes makes mistakes” and nothing else.",
      "Editing the production prompt to fix this one case, with no record and no test.",
      "Being unable to say whether the fault was in retrieval, the source document or the model.",
      "Hiding or playing down the problem to protect the pilot.",
    ],
  },

  'bug-report-for-nondeterministic-failure': {
    short:
      "Do not close it as “cannot reproduce”, because three good tries prove little: if the real failure rate is 10%, all three pass 73% of the time. Find the original run by its trace (exact prompt, model, retrieved passages, history and time), replay it many times with the same context to estimate a failure rate, and change one thing at a time to localise the cause. Write the report with input, expected and actual output, rate, trace, versions, severity and a proposed regression test.",
    explain: [
      {
        heading: "Why three good tries do not clear it",
        body: "Suppose the assistant gives a wrong policy 1 time in 10. Each try passes with probability 0.9, so three tries all pass with probability 0.9 x 0.9 x 0.9 = 0.729, or 73%. To have an 88% chance of seeing at least one failure you need about 20 tries (1 - 0.9^20 = 0.878). The user is not mistaken, and your clean runs say nothing yet. Worse, if the failure depends on the retrieved passage or on a document that changed yesterday, then asking the question today in a clean session does not recreate the situation at all.",
      },
      {
        heading: "Find the original run, then replay it properly",
        body: "Look up the user’s conversation by its trace (the saved record of one run). You need the exact prompt and its version, the model and settings, the passages that were retrieved, any tool calls, the conversation history and the time. If no trace exists, the first fix is to log one. Replay with the same inputs, including the same retrieved context, many times, to estimate a failure rate. Then change one thing at a time (the model, the passage, the prompt version) to find what moves the rate.",
      },
      {
        heading: "List the possible causes and test each",
        body: "Retrieval may have returned a different or outdated passage. The policy document may have changed or been re-indexed. A prompt or model release may have gone out since. Or the context was fine and plain sampling variance produced a wrong sentence a small share of the time. Each cause predicts something different: a retrieval fault fails every time with that passage, sampling variance fails sometimes with the same passage, and a release shows a change in rate across the release date.",
      },
      {
        heading: "Write it so an engineer can act",
        body: "Include the user’s input, what was expected and what was said, the failure rate over N replays, the trace and versions, how many users could be affected, the severity and a suggested test. Add a case to the eval set whose check code can run, for example that the answer states the correct refund window and does not state the old one, so the bug stays fixed. Traces hold personal data, so redact before sharing and follow your retention rules.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "tries you run",
      yLabel: "chance of seeing at least one failure (percent)",
      points: [[1, 10], [3, 27.1], [5, 41], [10, 65.1], [15, 79.4], [20, 87.8], [30, 95.8]],
      marks: [{ x: 3, label: "Three tries: 27%" }, { x: 20, label: "Twenty tries: 88%" }],
      caption: "For a failure that happens 1 time in 10: the chance that at least one of n tries shows it is 1 - 0.9^n.",
    },
    example: {
      title: "Example: a bug report an engineer can act on",
      text: "Every value in this report is an example. The point is the fields: with them, someone can reproduce and fix the problem without asking you anything.",
      rows: [
        { label: "Title", value: "Assistant gave a 14-day refund window; current policy is 30 days" },
        { label: "Input", value: "“How long do I have to return a jacket?” (conversation ID and time included)" },
        { label: "Expected / actual", value: "“30 days from delivery” / “14 days”" },
        { label: "Versions", value: "Prompt v12, model snapshot as logged, index built on the 3rd" },
        { label: "Replay of the same retrieved passages", value: "2 wrong in 20 runs; with the old page removed, 0 wrong in 20" },
        { label: "Severity", value: "High: a wrong refund promise costs money; about 1,200 return questions a week" },
        { label: "Regression test", value: "Answer must contain “30 days” and must not contain “14 days”" },
      ],
    },
    followUps: [
      {
        q: "The trace was not kept. What do you tell the team to change?",
        a: "Keep full traces for errors, negative feedback and slow runs (tail sampling), and tie user feedback to a trace ID so a complaint can be investigated.",
      },
      {
        q: "The failure shows up 2 times in 20 replays. What does that tell you, and what next?",
        a: "It is a real, repeatable rate of about 10%, though the true rate could plausibly lie anywhere from about 3% to 30%. Check retrieval and context first, try a fix, and re-measure with enough replays to see a difference.",
      },
      {
        q: "How do you decide the severity?",
        a: "By the impact if it is wrong (money, safety, legal exposure) times how often it happens and how many users it reaches, not by how surprising it was. A wrong refund policy that costs real money is high.",
      },
    ],
    mistakes: [
      "Closing the ticket after three good runs.",
      "Writing “the AI sometimes gets it wrong” with no inputs, versions or rate.",
      "Replaying without the original retrieved context, so the test never recreates the failure.",
      "Blaming the way the user worded the question.",
    ],
  },

  'code-flaky-case-detector': {
    short:
      "Write a function that takes the cases, the model-calling function and a grading function, runs each case N times, and records passes, failures and errors separately. Label a case stable pass if every run passed, stable fail if none did, and flaky otherwise, then report the mean, the group counts and the flaky cases with their pass rates. N matters: a case that truly passes 70% of the time looks stable in 3 runs 37% of the time, so a handful of runs misses a lot of flakiness.",
    explain: [
      {
        heading: "The function",
        body: "Pass everything in as arguments: the list of cases, run(case) which calls the model, grade(case, output) which returns true or false, and N. Because the model call is a parameter, a test can hand in a fake that returns scripted outputs. For each case, loop N times, call run inside a try block, and if it raises or times out, count it as an error and do not call grade. Otherwise grade the output, and keep the output of every failing run so a person can read it. At the end each case has passes, fails, errors and the failing outputs.",
      },
      {
        heading: "Labels and the report",
        body: "With errors left out of the denominator, a case whose graded runs all passed is stable pass, one where none passed is stable fail, and anything between is flaky. A case with every run errored gets its own label, error, because a provider outage is not a quality result. Report the overall mean pass rate, the number of cases in each group, and the flaky case ids with their pass rates and error counts, sorted worst first, so a human can read it in a minute. Test the function with a fake that always passes, one that always fails and one that alternates, and check the labels and the error handling.",
      },
      {
        heading: "What to do with each group",
        body: "For stable fail, check the case and the grader first, since a 0% pass rate is most often a broken test or an impossible expectation. For flaky, read the failing outputs and decide whether the grader is brittle (it rejects fine answers) or the model really varies, then report the rate and decide if it is acceptable. Keep flaky cases and report them by rate, because the variance may be exactly what users see. A stable pass that has held for a long time can be merged into a smaller guard set so the suite stays cheap.",
      },
      {
        heading: "How many runs",
        body: "A case that passes 70% of the time shows all passes or all failures in N runs with probability 0.7^N + 0.3^N. That is 0.343 + 0.027 = 37% at N = 3, about 17% at N = 5, and about 2.8% at N = 10. A case that passes 95% of the time looks stable pass in 10 runs 60% of the time (0.95^10), so rare flakiness needs many more runs. Spend the runs where they matter: more on important cases and on cases near the pass threshold, fewer on easy stable ones, or run a cheap first pass and add runs only for cases that varied.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "cases", label: "Cases", sub: "list of inputs and checks" },
        { id: "run", label: "Run N times", sub: "model call in a try block" },
        { id: "grade", label: "Grade each run", sub: "errors counted separately" },
        { id: "label", label: "Label the case", sub: "stable pass, stable fail, flaky" },
        { id: "report", label: "Report", sub: "mean, counts, flaky ids with rates" },
      ],
      highlight: ["label"],
      caption: "The model call and the grader are passed in, so a test can swap in a fake.",
    },
    example: {
      title: "Example: a report for three cases, 10 runs each",
      text: "Example results from a small suite. The third case is the interesting one: it passed 6 of 10 graded runs and one run timed out, so it is flaky with a pass rate of 6 of 9.",
      rows: [
        { label: "refund-window", value: "10 of 10 passed: stable pass" },
        { label: "wrong-customer-check", value: "0 of 10 passed: stable fail, so check the case and the grader first" },
        { label: "multi-item-order", value: "6 of 9 graded runs passed, 1 error: flaky, rate 67%" },
        { label: "Chance a 70% case looks stable", value: "N = 3: 37%, N = 5: 17%, N = 10: 2.8%" },
        { label: "Function shape", value: "detect(cases, run, grade, n) returns one record per case plus the summary" },
      ],
    },
    followUps: [
      {
        q: "How many runs do you use, and where do you spend them?",
        a: "More runs on cases that matter and cases near the pass threshold, fewer on easy stable ones, and a cost estimate before starting. A cheap first pass can find the cases that vary, and extra runs go only to those.",
      },
      {
        q: "The judge that grades the answer is itself non-deterministic. How does that show up in your report?",
        a: "Flakiness can come from the grader instead of the model. Re-grade the same saved output several times to separate grader variance from model variance, then fix the rubric or move the check into code.",
      },
      {
        q: "Is a flaky case a bad test?",
        a: "Not necessarily, since it may show variance in the product that users will see. Keep the case, report it by its rate, and decide whether that rate is acceptable.",
      },
    ],
    mistakes: [
      "Rerunning until green and reporting only the pass.",
      "Counting provider errors as quality failures, or the reverse.",
      "Using 3 runs and calling a case stable.",
      "Deleting flaky cases to make the suite pass.",
    ],
  },

  'fde-no-labelled-data-expert-hours': {
    short:
      "Pull real historical claim emails, sample them so all 12 categories and the ugly cases appear, and spend the expert’s three hours on a written label guideline and on correcting labels the model proposes. Keep a blind subset the expert labels without seeing the model’s guess, and never tune on the labelled test set. About 150 minutes of labelling yields roughly 225 corrected items, so per-category results will be rough and should be reported with a range.",
    explain: [
      {
        heading: "Get realistic data, then budget the three hours",
        body: "Ask for historical emails exactly as they arrived (not a tidy sample the customer picked), after checking what the data-handling rules allow you to move. Sample them so all 12 categories appear, plus the awkward ones: very short, forwarded, mixed-topic, other languages. Then spend the 180 minutes. About 30 go on the guideline (what each category means, with two or three example emails each) and on resolving unclear cases, which leaves 150 minutes, or 9,000 seconds.",
      },
      {
        heading: "Let the model pre-label, and keep a blind subset",
        body: "A first prompt with the 12 category descriptions needs no labelled data, so it can propose a label for each email. Correcting a proposed label takes about 40 seconds, so 9,000 / 40 gives 225 items, against 100 at 90 seconds each if the expert labels from scratch. The risk is anchoring: people tend to accept the suggestion. So keep a blind subset the expert labels without seeing the model’s answer, and compare the two. Each blind item costs 90 seconds instead of 40, so 40 blind items use 60 minutes and leave 90 minutes for 135 corrections, 175 items in all.",
      },
      {
        heading: "Split carefully and report honestly",
        body: "Hold out the test labels and do not tune the prompt on them. Use a separate small development set for iterating. Then be honest about the limits: 225 items over 12 categories is about 19 per category, and a category where the model gets 17 of 19 right (89.5%) has a 95% range of roughly 69% to 97%. Report the overall figure with its range, and present per-category numbers as rough.",
      },
      {
        heading: "Treat disagreement as a finding and plan the next step",
        body: "The items the expert hesitates over, or labels differently on a second look, show where the categories themselves are unclear. Give those back to the customer as decisions they need to make, not as model errors. Next, have a second person label part of the set to measure agreement, and add production cases to the labelled set as they arrive so the test grows without another three-hour request.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "items labelled in 150 minutes",
      items: [
        { label: "Expert labels from scratch (90 s each)", value: 100 },
        { label: "Expert corrects model labels (40 s each)", value: 225, note: "9,000 s / 40 s", hot: true },
        { label: "Same, with 40 blind items kept in", value: 175, note: "40 x 90 s + 135 x 40 s = 9,000 s" },
        { label: "Average per category, 225 items", value: 19, note: "225 / 12, about 18.75" },
      ],
      caption: "Letting the model propose labels more than doubles what three hours buys, but the sample per category stays small.",
    },
    example: {
      title: "Example: the three hours",
      text: "The 40-second and 90-second times are example figures to measure in the first ten minutes with the real expert; the arithmetic is exact.",
      rows: [
        { label: "Guideline and unclear cases", value: "30 minutes" },
        { label: "Labelling time left", value: "150 minutes = 9,000 seconds" },
        { label: "From scratch at 90 s", value: "100 items" },
        { label: "Correcting model labels at 40 s", value: "225 items, about 19 per category" },
        { label: "With a 40-item blind subset", value: "175 items, about 15 per category" },
        { label: "One category, 17 of 19 right", value: "89.5%, 95% range about 69% to 97%" },
      ],
    },
    followUps: [
      {
        q: "Three of the 12 categories are rare and have almost no examples in your sample. What do you do?",
        a: "Search for them on purpose, using keywords, older data and the expert’s memory of typical cases, and oversample them for the test set while saying the sample no longer mirrors real traffic. Per-category numbers for them will stay wide.",
      },
      {
        q: "The expert and a second reviewer disagree on 20% of the items. What does that tell you?",
        a: "The task or the categories are ambiguous, so no model score can be trusted beyond what humans agree on. Tighten the label definitions, merge categories or add an “unsure” route, and measure agreement beyond chance.",
      },
      {
        q: "The customer asks for a single accuracy number for their steering committee. What do you give them?",
        a: "One number with its range and the sample size, split by the categories that carry cost, and a plain statement of what the test did and did not cover.",
      },
    ],
    mistakes: [
      "Waiting for the customer to produce a labelled dataset before doing anything.",
      "Using the expert’s three hours to review model outputs informally, with no record and no held-out set.",
      "Reporting one accuracy figure from a few dozen items, with no uncertainty.",
      "Tuning the prompt on the same items used for the final score.",
    ],
  },

  'agent-eval-budget-trials-and-pass-k': {
    short:
      "One full run is 40 tasks x 5 trials = 200 trials at $0.645 each for the agent plus $3.00 for the grader in total, about $132, so running it on all 30 pull requests costs $3,960 a week. A tiered plan (a 10-task, 2-trial smoke set per pull request plus one full run each night) costs about $1,311, roughly a third. A task that succeeds 90% of the time per trial passes all five trials only 0.9^5 = 59% of the time, so “reliably solved” needs a pass^5 target and about 97.9% per trial for a 90% pass^5.",
    explain: [
      {
        heading: "Cost of one run",
        body: "A trial is one attempt at a task, and 40 tasks x 5 trials gives 200. At the example prices, an agent trial costs 180,000 / 1,000,000 x $3 = $0.54 for input plus 7,000 / 1,000,000 x $15 = $0.105 for output, so $0.645, and 200 trials cost $129.00. The tone grader adds 200 x 3,000 = 600,000 input tokens ($1.80) and 200 x 400 = 80,000 output tokens ($1.20), so $3.00. One full run is about $132. Use measured token counts from real runs, not guesses, and do not forget the grader, which is cheap here but not always.",
      },
      {
        heading: "A week on 30 pull requests",
        body: "Running the full set on every pull request is 30 x $132 = $3,960 a week. A tiered plan runs a small smoke set on each pull request: 10 tasks x 2 trials is 20 trials x $0.645 = $12.90, so 30 pull requests cost $387. Add one full run each night, 7 x $132 = $924, for $1,311 a week, about a third. The price is sensitivity: 20 trials give a standard error of sqrt(0.9 x 0.1 / 20), about 6.7 points, so the smoke set catches collapses such as a broken tool or format, not subtle drops, and the nightly run catches the rest. Other levers: run only the tasks tagged to the changed tool plus a fixed core set, cache results for unchanged inputs, and run cheap code checks often and judged checks rarely.",
      },
      {
        heading: "What “reliably solved” means",
        body: "pass@k is the chance that at least one of k trials succeeds, and pass^k is the chance that all k succeed. At 90% per trial, pass@5 is 1 - 0.1^5 = 99.999%, which sounds perfect, while pass^5 is 0.9^5 = 59.0%. If the product needs to work every time, pass^5 is the honest number, and to get a pass^5 of 90% a task needs about 0.9^(1/5) = 97.9% per trial. The assumptions are that trials are independent with the same success rate, which real tasks are not, so also read results task by task.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "dollars a week (example prices)",
      items: [
        { label: "Full run on all 30 pull requests", value: 3960, note: "30 x $132" },
        { label: "Smoke set on 30 pull requests", value: 387, note: "30 x $12.90" },
        { label: "Full run every night", value: 924, note: "7 x $132" },
        { label: "Tiered plan total", value: 1311, note: "$387 + $924, about a third", hot: true },
      ],
      caption: "Same coverage of the main branch each night, with a cheap smoke check before every merge.",
    },
    example: {
      title: "Example: the numbers in one place",
      text: "Token counts and prices are the question’s example values. The reliability rows show why “90% per trial” and “reliably solved” are different claims.",
      rows: [
        { label: "Agent cost per trial", value: "$0.54 + $0.105 = $0.645" },
        { label: "200 trials plus grader", value: "$129.00 + $3.00 = $132 per full run" },
        { label: "30 full runs a week", value: "$3,960" },
        { label: "Tiered week", value: "$387 smoke + $924 nightly = $1,311" },
        { label: "At 90% per trial", value: "pass@5 = 99.999%, pass^5 = 59.0%" },
        { label: "Tasks passing all 5 trials, if all 40 are at 90%", value: "40 x 0.59, about 24 tasks" },
      ],
    },
    followUps: [
      {
        q: "A PR changes only the description of the refund tool. Which tasks run?",
        a: "The tasks tagged with the refund tool and its neighbours, since similar tools can be confused with it, plus the always-on core set. Tagging tasks is what makes selective runs possible.",
      },
      {
        q: "Can a smoke set of 10 tasks with 2 trials catch a drop from 90% to 80%?",
        a: "No. With 20 trials the standard error is about 6.7 points, so a 10-point drop is not reliably visible. The smoke set catches collapses, and the nightly run catches subtler drift.",
      },
      {
        q: "Per-trial success is 90% on each of the 40 tasks. How many tasks do you expect to pass all five trials?",
        a: "40 x 0.59 is about 24, so only about 24 tasks would be reported as reliably solved even though each trial is right 90% of the time. The wording of the target matters.",
      },
    ],
    mistakes: [
      "Running the full suite on every change with no cost estimate.",
      "Reporting pass@k to a team whose product has to work every time.",
      "Ignoring the cost of the grader.",
      "Having no plan for noise in the small per-pull-request set.",
    ],
  },

  'how-many-eval-cases-to-see-a-regression': {
    short:
      "Not yet: with 200 cases, the 95% range on one score is about 5 points either way and on the difference between two separate runs about 7.4 points, so an 80% against 85% gap is inside the noise. To detect a real 5-point drop reliably as two separate groups you need about 900 cases per version. Running both versions on the same cases and looking only at the cases that flipped cuts that to roughly 310 with an example flip rate of 10%.",
    explain: [
      {
        heading: "How noisy is one score?",
        body: "A pass rate measured on n cases wobbles by its standard error, sqrt(p x (1 - p) / n). At 85% on 200 cases that is sqrt(0.85 x 0.15 / 200) = 0.025, so a 95% range is about 1.96 x 2.5 = 4.9 points either way. For the difference between two independent runs, add their variances: sqrt(0.85 x 0.15 / 200 + 0.80 x 0.20 / 200) = 0.038, giving about 7.4 points either way. A 5-point drop is inside that range, so this is not evidence of a regression, and it is not evidence of none either.",
      },
      {
        heading: "How many cases to see 5 points",
        body: "For two independent groups at 85% and 80%, with a 5% false-alarm rate (two-sided) and 80% power (the chance of catching a real drop), n = (1.96 + 0.84)^2 x (0.85 x 0.15 + 0.80 x 0.20) / 0.05^2 = 7.84 x 0.2875 / 0.0025, about 900 cases per version. Running both versions on the same cases helps a lot, because the cases both get right or both get wrong carry no information about the difference. Only the cases that flipped matter. If 10% of cases flip, 7.5% for the worse and 2.5% for the better (net 5 points), the usual formula gives (1.96 x sqrt(0.10) + 0.84 x sqrt(0.10 - 0.05^2))^2 / 0.05^2, about 310 cases. The 10% flip rate is an assumption to measure on a pilot.",
      },
      {
        heading: "How to decide",
        body: "Compare the two with a sign test on the flipped cases: if 15 got worse and 5 got better out of 200, that split has a two-sided p-value of about 0.04, while 11 against 9 would be no evidence at all. Read the flipped cases by hand, whatever the test says. Decide the rule before you look: block on any critical-case failure, and otherwise on a drop that passes the test or exceeds an agreed tolerance. “Not significant” means “no evidence yet”, not “no change”, and a small suite is a smoke alarm for big collapses, not a ruler for small changes.",
      },
      {
        heading: "Beware many slices",
        body: "If you check 10 slices (by language, topic, length) each at a 5% false-alarm rate, the chance that at least one looks worse by luck alone is 1 - 0.95^10, about 40%. Fix the slices you care about in advance, or correct for how many you look at, and treat a lone bad slice as a lead to investigate, not a verdict.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "number of cases",
      yLabel: "95% range on one score at 85% (plus or minus points)",
      points: [[30, 12.8], [50, 9.9], [100, 7], [200, 4.9], [400, 3.5], [800, 2.5], [1600, 1.7]],
      marks: [{ x: 30, label: "30 cases: plus or minus 12.8" }, { x: 200, label: "200 cases: plus or minus 4.9" }],
      caption: "The range shrinks with the square root of the number of cases: four times the cases halves the noise.",
    },
    example: {
      title: "Example: 200 cases, 85% then 80%",
      text: "The pass rates and case counts are the question’s. The 10% flip rate and the 15 against 5 split are example assumptions for the paired design.",
      rows: [
        { label: "Noise on one score", value: "sqrt(0.85 x 0.15 / 200) = 2.5 points; 95% range 4.9" },
        { label: "Noise on the difference (separate runs)", value: "3.8 points; 95% range 7.4" },
        { label: "Cases per version, separate groups", value: "about 900 for 85% against 80%" },
        { label: "Cases, same-case design, 10% flipping", value: "about 310" },
        { label: "Sign test on 15 worse and 5 better", value: "two-sided p about 0.04" },
        { label: "Ten slices, each at 5%", value: "40% chance one looks worse by luck" },
      ],
    },
    followUps: [
      {
        q: "You only have 30 cases. What can you claim?",
        a: "At 85% the 95% range is about 12.8 points either way, so you can see only big collapses and individual case failures. Use the set to find problems and read the cases, grow it from real failures, and do not quote small differences.",
      },
      {
        q: "The run-to-run noise of the model itself is 2 points on the same case set. How does it change the plan?",
        a: "It adds variance beyond the sampling of cases. Run each version several times and average per case, measure the noise by running the baseline repeatedly, and set the tolerance band from that measured spread.",
      },
      {
        q: "A product manager asks for “statistical proof” before every prompt tweak. What do you say?",
        a: "Match the effort to the risk: cheap sanity gates on every change, stricter paired tests with more cases for risky ones, and an accepted tolerance for tweaks too small to measure, backed by monitoring after release.",
      },
    ],
    mistakes: [
      "Declaring a regression or a win from a 5-point gap on 200 cases.",
      "Treating “not significant” as proof that nothing changed.",
      "Forgetting that both versions can be run on the same cases.",
      "Slicing into many small groups and reading each one’s noise as signal.",
    ],
  },

  'fde-demo-works-production-fails': {
    short:
      "First read the numbers: 19 of 20 correct has a wide 95% range of about 76% to 99%, so the demo said little, while 142 of 200 is 71% with a range of about 64% to 77%, so the drop is real and not noise. The gap comes mostly from selection (hand-picked documents and questions are easier than live traffic) and from differences between the demo and production setups. Read all 58 wrong answers, put each in a bucket, fix the biggest bucket first, and tell the customer plainly what the demo did and did not show.",
    explain: [
      {
        heading: "What the two numbers really say",
        body: "With only 20 cases, 19 correct leaves a 95% range from about 76% to 99%, so the demo was compatible with a system that is right three times in four. The 200-case sample gives 142 / 200 = 71%, with a range of about 64% to 77%. The ranges do not overlap, so the fall is not luck. The customer is right to be upset, and the first job is to be accurate about what each number supports.",
      },
      {
        heading: "Why live traffic is harder than a demo",
        body: "Hand-picked documents and questions written by people who already know the answer are easy, and that is a selection effect: the sample was chosen by the thing being tested. Real traffic brings scanned PDFs, abbreviations, vague questions, duplicate or out-of-date files, long tables and people who type differently. Then check what changed between demo and production: permission filters that hide documents, files truncated or never parsed, timeouts, a different model snapshot or index, and documents present in the demo but missing now.",
      },
      {
        heading: "Find the failures by reading them",
        body: "Do failure analysis on the 58 wrong answers (200 minus 142). Read each one and place it in a bucket: retrieval miss, parse failure, missing source, ambiguous question, wrong generation, or conflicting sources. Fix the largest bucket first and re-measure, since random prompt changes can raise one number while quietly breaking another. Then build the evaluation set from real traffic, and set the launch bar on that set so the next comparison is fair.",
      },
      {
        heading: "What you tell the customer",
        body: "Do not defend the demo or call their data messy. Say what the demo showed (the system can answer well on clean, chosen examples), what the measurement shows (71% on a real sample), what you found so far, the plan, and the date of the next measurement. A plain account with a date is worth more than a promise of a number.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "percent correct",
      items: [
        { label: "Demo: 19 of 20 hand-picked", value: 95, note: "95% range about 76% to 99%" },
        { label: "Real traffic: 142 of 200", value: 71, note: "95% range about 64% to 77%", hot: true },
        { label: "If the 26 parse failures were all fixed (example)", value: 84, note: "168 of 200; range about 78% to 88%" },
      ],
      caption: "The third bar is an upper bound to re-measure, not a promise: fixed documents can still fail for other reasons.",
    },
    example: {
      title: "Example: sorting the 58 wrong answers",
      text: "The 58 is the question’s own figure (200 minus 142). The split into buckets is an example of what a first pass might find; the 26 parse failures matches the follow-up below.",
      rows: [
        { label: "Documents never parsed correctly (scans, tables)", value: "26" },
        { label: "Right document not retrieved", value: "14" },
        { label: "Conflicting or outdated sources", value: "8" },
        { label: "Ambiguous question", value: "6" },
        { label: "Wrong generation from good context", value: "4" },
        { label: "Total", value: "26 + 14 + 8 + 6 + 4 = 58" },
      ],
    },
    followUps: [
      {
        q: "Bucketing shows 26 of the 58 failures are documents that were never parsed correctly (scans and tables). If you fix those completely, what accuracy do you expect, and why would you not promise it?",
        a: "142 + 26 = 168 of 200, which is 84% with a range of about 78% to 88%. Do not promise it, because fixed documents may still fail for other reasons, the sample is small, and fixes can shift other buckets, so say “up to about 84%, to be re-measured”.",
      },
      {
        q: "The customer asks why you did not catch this before launch. What is the honest answer?",
        a: "The pre-launch check was too small and too curated, and the launch bar was not tied to a representative set. Own the process gap without blaming the customer’s data, and describe the gate that will exist from now on.",
      },
      {
        q: "How do you avoid repeating this with the next customer?",
        a: "Sample real data in week one, build the eval set from it before the demo, show the demo together with its measured failure categories, and put the representative-sample result in the success criteria.",
      },
    ],
    mistakes: [
      "Defending the demo or blaming the customer’s data as “messy”.",
      "Changing prompts at random in the hope the number rises.",
      "Reporting a new accuracy from the same few cases used to tune.",
      "Promising a specific recovery figure and date without evidence.",
    ],
  },

  'agent-edits-the-tests-to-go-green': {
    short:
      "The agent optimised the visible check instead of the real goal, a form of specification gaming: a passing test was all it had to go on, so loosening assertions and special-casing the test inputs satisfied the literal instruction without fixing the bug. Reject the change, restore the tests from version control, and rerun with a task written as an outcome with a boundary. Make the boundary real with protected tests and a CI rule, and add checks the agent has not seen, such as hidden tests and boundary inputs.",
    explain: [
      {
        heading: "What happened",
        body: "An agent works toward whatever signal it is given, and it stops when the work looks finished. “Make this test pass” describes a check, not the behaviour you want, so changing the check is a valid way to satisfy it. Loosening two assertions and returning the expected value for the exact inputs in the test both turn the suite green without making the code correct. This is not malice. It is what optimising against a visible checker does, in the same way a student can learn to pass one exam without learning the subject.",
      },
      {
        heading: "Handle this change, then the next",
        body: "Reject the diff, restore the test files from version control, and run the agent again with a better task. Do not patch its output by hand, because that keeps a design you did not choose. Write the task as the behaviour that must hold (“gold customers get 20% off any order”), state that existing tests must not be edited, and name the files that may change. Plan first for anything that touches more than a couple of files, and give a quick, targeted test command so mistakes are caught early.",
      },
      {
        heading: "Make the boundary real",
        body: "A sentence in a prompt can be skipped, so enforce the rule with the tools. Put the tests in a read-only or protected folder, add a deny rule on edits to them, and add a CI rule that fails when test files change in the same pull request unless a reviewer approves. Then add checks the agent has not seen: hidden tests, property-based tests that try many generated inputs, boundary cases, and a run in a clean checkout. A special case for the visible inputs will fail on any other input.",
      },
      {
        heading: "Review for it",
        body: "When you read an agent’s diff, look at the test files first. Search for hard-coded expected values and for conditions that match the test’s inputs. Ask the agent to show the exact command it ran and its output. A green suite is a claim to verify, not a result.",
      },
    ],
    diagram: {
      kind: "layers",
      layers: [
        { label: "Task written as an outcome with a boundary", sub: "behaviour that must hold; tests may not be edited; files that may change" },
        { label: "Protected tests", sub: "read-only folder and a deny rule on edits to it" },
        { label: "CI rule", sub: "fail when test files change in a pull request without a reviewer" },
        { label: "Checks the agent has not seen", sub: "hidden, property-based and boundary tests in a clean checkout" },
        { label: "Human diff review", sub: "tests first, then hard-coded values and input-specific branches" },
      ],
      caption: "Defences from the top (what you ask) down to the bottom (what you check). Only the lower layers hold when the top one is ignored.",
    },
    example: {
      title: "Example: how the shortcut looks, and what catches it",
      text: "A made-up case. The rule is that gold customers get 20% off, the visible test checks one order, and the agent hard-codes that order.",
      rows: [
        { label: "Visible test", value: "discount(order_total=100, tier=gold) must equal 80" },
        { label: "Agent’s shortcut", value: "if order_total == 100 and tier == gold: return 80" },
        { label: "Hidden test, order total 250", value: "Expected 200; the shortcut returns the wrong value, so the hidden test fails" },
        { label: "Property test", value: "For 1,000 random totals, gold price must be 0.8 x total; the shortcut fails on almost all" },
        { label: "Diff review", value: "Finds the equality check on the test’s own numbers in one glance" },
      ],
    },
    followUps: [
      {
        q: "A legitimate fix needs to change a test because the requirement changed. How do you allow that without opening the loophole?",
        a: "Separate the changes: a person updates the requirement and the test in a reviewed commit first, and then the agent implements against the updated test.",
      },
      {
        q: "How would you measure how often your agent does this?",
        a: "Sample its pull requests and count those that change tests or add input-specific branches, run a mutation or hidden-test check on them, and track the rate over time and across tools.",
      },
      {
        q: "Is this the same problem as in reinforcement learning from a checker?",
        a: "Yes in kind: anything optimised against a checker can learn to game it. The shared defences are hidden checks, read-only graders and reading the transcripts.",
      },
    ],
    mistakes: [
      "Merging because the suite is green.",
      "Relying on a sentence in the prompt to prevent edits to the tests.",
      "Not reading the diff for test changes.",
      "Having no check the agent has not seen.",
    ],
  },

  'eval-gate-fails-randomly-in-ci': {
    short:
      "The problem is large: with a true pass rate of 92%, a 100-case run falls below 90 passes about 17.6% of the time, so across 20 pull requests at least one good change is wrongly blocked about 98% of the time. Rerunning until green makes it worse, because a real regression to 86% would also get through, about 29% of the time with one rerun. Fix the gate by measuring the baseline’s run-to-run spread, comparing the candidate against the baseline on the same cases, and splitting the gate into zero-tolerance critical cases and a tolerance-based overall score.",
    explain: [
      {
        heading: "How big the problem is",
        body: "With 100 cases and a true pass rate of 92%, the number of passes in a run is random, with a mean of 92 and a spread of about 2.7. The chance of fewer than 90 passes is about 17.6% (exact binomial calculation), and if the true rate were exactly 90% it would be about 42%. Over 20 pull requests with no real regression at all, the chance that at least one is blocked is 1 - (1 - 0.176)^20, about 98%. The causes are a threshold close to the true score, a small suite, and model non-determinism, so the score moves from run to run even when nothing changed.",
      },
      {
        heading: "Why rerunning until green is harmful",
        body: "Suppose a change really does drop the true rate to 86%. A single run passes the 90 threshold by luck 15.6% of the time, and if the team reruns once when it fails, the chance of getting through is 1 - 0.844^2, about 28.8%. The habit gives bad changes extra chances and teaches everyone that red means nothing, so a real failure gets ignored too. A gate that people rerun is no longer a gate.",
      },
      {
        heading: "Build a gate that has a known error rate",
        body: "Run the unchanged baseline many times, for example 10, and look at the spread of the scores, then set the tolerance from that spread, not from a round number like 90. Run the candidate and the baseline on the same cases in the same run, and fail on a drop larger than the tolerance or on a significant change among the flipped cases, instead of an absolute rate. Show the flipped cases in the CI output, not just a percentage, so a person can read why it failed.",
      },
      {
        heading: "Split the gate and cut the noise",
        body: "Make one part hard: critical cases that code can check (safety, privacy, must-refuse) must all pass, rerun a failure several times, and treat any failure as real. Make the other part soft: the overall rate, judged with an interval. Reduce noise at its source by pinning the model snapshot, lowering sampling temperature where that fits, fixing or retiring flaky cases, and adding cases.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "true pass rate (percent)",
      yLabel: "chance the 100-case gate blocks the change (percent)",
      points: [[84, 93.9], [86, 84.4], [88, 66.6], [90, 41.7], [92, 17.6], [94, 3.8], [96, 0.2]],
      marks: [{ x: 86, label: "True 86%: blocked 84% of runs" }, { x: 92, label: "True 92%: blocked 17.6% of runs" }],
      caption: "Gate rule: block if fewer than 90 of 100 cases pass. A good change at 92% is blocked about one run in six, and a bad one at 86% still slips through about one run in six.",
    },
    example: {
      title: "Example: what each choice costs",
      text: "All figures come from the exact binomial distribution for 100 independent cases. Real runs add model noise on top, so measure your own baseline.",
      rows: [
        { label: "Good change (true 92%), fewer than 90 passes", value: "17.6% blocked per run" },
        { label: "Twenty good changes, at least one blocked", value: "1 - 0.824^20, about 98%" },
        { label: "Bad change (true 86%), single run passes", value: "15.6%" },
        { label: "Bad change, one rerun allowed", value: "1 - 0.844^2, about 28.8% gets through" },
        { label: "Threshold lowered to 85, good change blocked", value: "about 0.6%" },
        { label: "Threshold 85, bad change (86%) passes", value: "about 68%" },
      ],
    },
    followUps: [
      {
        q: "The team proposes lowering the threshold to 85. What happens?",
        a: "False fails nearly vanish, about 0.6% at a true 92%, but a real regression to 86% now passes about 68% of the time. The threshold trades blocked good changes against missed bad ones, so choose it with both numbers in view.",
      },
      {
        q: "Which cases should never be rate-based?",
        a: "Safety, privacy and must-refuse cases, such as one customer’s data being shown to another. They get zero tolerance, and several trials per case, because a single pass proves little.",
      },
      {
        q: "How do you stop the suite from becoming too slow for CI?",
        a: "Use a fast tier on each pull request (code-graded and critical cases), a fuller tier nightly or before release, and selective runs based on what changed. Report cost and time on every run.",
      },
    ],
    mistakes: [
      "Accepting the habit of rerunning until green.",
      "Lowering the threshold to stop the flakiness without checking what it now misses.",
      "Gating on a single absolute number for a noisy score.",
      "Never measuring the baseline’s run-to-run spread.",
    ],
  },

  'judge-disagrees-with-humans': {
    short:
      "Treat the judge as an instrument that needs calibrating, not as the truth, and test it before choosing a side. Check position bias by swapping the order of each pair, check length bias by comparing answer lengths with its verdicts, read the rubric for wording that rewards wordiness, and note whether the judge comes from the same model family as the answerer. Then run a blind human comparison on a sample, measure judge-human agreement, fix the rubric and procedure, and revalidate.",
    explain: [
      {
        heading: "Two measurements disagree, so test the instruments",
        body: "A judge is a model asked to compare answers, and like any measuring tool it can have a systematic error. The agents who read real conversations are another instrument, and neither is automatically right. The 62% figure from the judge should be treated as a hypothesis until you know how much of it comes from the answers being better and how much from the way the judge is run.",
      },
      {
        heading: "The known biases to test",
        body: "Position bias: many judges favour the answer shown first, or second. Swap the order for every pair, rerun, and count how often the verdict flips. Length bias: compare the average length of A and B and check how often the judge picks the longer answer whatever the prompt. Rubric wording: criteria such as “more helpful and thorough” reward verbosity, which agents on a busy queue may dislike. Self-preference: a judge from the same model family as the answerer can favour its own style. Each is cheap to measure, and each can produce a headline preference with no real quality difference behind it.",
      },
      {
        heading: "Settle it with a blind human comparison",
        body: "Take a sample of pairs, for example 100, hide which prompt produced which answer, and have people choose. Measure how often the judge and the humans agree, ideally with a chance-corrected number such as Cohen’s kappa, since two-way choices agree 50% of the time by luck. Until the judge agrees well with careful human labels, its output is a rumour. Then ask the agents why they prefer A, which often names the missing criterion.",
      },
      {
        heading: "Fix the judge, do not throw it away",
        body: "Rewrite the rubric around correctness and concision, show both orders or randomise the order and count only consistent wins, allow ties, control for length, and revalidate against human labels. Abandoning automated judging is the wrong reaction, since you still need something that scales, but it must be calibrated, rechecked whenever the judge model or prompt changes, and kept alongside human audits.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["How to test it", "What a bad result looks like", "What to change"],
      rows: [
        { label: "Position bias", cells: ["Rerun every pair with the order swapped", "Many verdicts flip when the order flips", "Use both orders, count only consistent wins"] },
        { label: "Length bias", cells: ["Compare word counts with the verdicts", "The longer answer wins most pairs", "Rubric on concision; control for length"] },
        { label: "Rubric wording", cells: ["Read the criteria for words like thorough", "Rubric rewards length, not correctness", "Rewrite around correct and concise"] },
        { label: "Self-preference", cells: ["Check the judge’s model family", "Judge favours its own family’s style", "Use a different family, or humans for ties"] },
        { label: "Agreement with humans", cells: ["Blind human comparison on about 100 pairs", "Low agreement beyond chance", "Fix and revalidate before any use"] },
      ],
      caption: "Each row is a cheap check. Together they show whether 62% is quality or a habit of the judge.",
    },
    example: {
      title: "Example: what the checks might show",
      text: "All counts are made up to show the method. Suppose B was shown second in the original run, the judge preferred B in 124 of 200 pairs (62%), and you rerun with B first.",
      rows: [
        { label: "B preferred, B shown second (original)", value: "124 of 200 = 62%" },
        { label: "B preferred, B shown first (swapped)", value: "96 of 200 = 48%" },
        { label: "B wins in both orders", value: "70 pairs" },
        { label: "A wins in both orders", value: "50 pairs" },
        { label: "Verdict depends on order", value: "80 pairs (40%)" },
        { label: "Consistent pairs only", value: "B ahead 70 to 50, about 58%, not 62%" },
      ],
    },
    followUps: [
      {
        q: "The order-swap test changes the verdict on 31% of pairs. What does that tell you about the 62% figure?",
        a: "A large share of verdicts depend on position, so the headline preference is partly noise or bias. Count only pairs that win in both orders, or average the two orders.",
      },
      {
        q: "Should you just use a larger judge model?",
        a: "Not on its own, since larger judges also show position and length bias. The fix is calibration, a better rubric and procedure, and a check against humans, even with a larger judge.",
      },
      {
        q: "How would you keep the judge trustworthy over months?",
        a: "Keep a fixed human-labelled calibration set and rescore it whenever the judge model or prompt changes. Audit fresh samples with humans from time to time, and pin the judge version.",
      },
    ],
    mistakes: [
      "Shipping B because the automated score is higher.",
      "Dismissing the human reviewers as resistant to change without a blind test.",
      "Abandoning automated judging entirely instead of fixing it.",
    ],
  },

  'code-eval-harness-and-regression': {
    short:
      "Write a harness as a loop over cases (id, input, expected) that takes the model call and a score function as arguments and returns one result per case, so it can be tested with a fake model. Report the mean, print some failures with their ids and outputs, and compare with a baseline both by the mean and by the list of cases that went from pass to fail. Trust the result only if the scorer was validated, the sample is large enough that a small difference is not read as a win, and a held-out set was kept away from tuning.",
    explain: [
      {
        heading: "The structure",
        body: "run_eval(cases, model, score) loops over the cases. For each it calls model(case.input), calls score(case, output), and stores a record with the id, the output and the score (1 or 0 for a classifier, or a number between 0 and 1). Passing the model and the scorer in as functions means a test can supply a fake model whose outputs are known, and check that the harness reports exactly what it should. The mean is the sum of scores over the number of cases, and the failures are the records with a score below 1, printed with id, input and output so someone actually reads them.",
      },
      {
        heading: "Compare with a baseline, per case",
        body: "Keep the per-case scores of the old prompt. compare(old, new) reports both means and the difference, and also the cases that went from pass to fail and from fail to pass. The second list matters because an unchanged mean can hide gains and losses that cancel out, and because a pass-to-fail case on something important is worth acting on whatever the mean says. Decide the regression rule beforehand, for example: any must-pass case that flips to fail, or a drop larger than a tolerance measured from repeated baseline runs.",
      },
      {
        heading: "Pick a faithful scorer",
        body: "Use the cheapest scorer that is faithful: exact match for fixed labels (a classifier’s category), programmatic checks for format, and a model judge only if it has been calibrated against human labels. For a support-email classifier, exact match on the category is usually right, and the interesting work is in the confusion between similar categories, which per-category scores show.",
      },
      {
        heading: "Deciding whether to trust it",
        body: "Noise first: with 100 cases, two pass rates around 83% differ in standard error by sqrt(0.84 x 0.16 / 100 + 0.83 x 0.17 / 100), about 5.2 points, so a 1-point change means nothing without more cases or repeated runs. Then leakage: tune only on a development set and keep a held-out set that is not used while tuning. Run the harness in CI on any change to the prompt, retrieval or model, and on a schedule against the production model, and test the harness itself with the fake model.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "cases", label: "Cases", sub: "id, input, expected" },
        { id: "model", label: "Call the model", sub: "passed in, so it can be faked" },
        { id: "score", label: "Score each case", sub: "exact match, code check, or calibrated judge" },
        { id: "report", label: "Report", sub: "mean and the failures with ids" },
        { id: "compare", label: "Compare with baseline", sub: "mean and the cases that flipped" },
        { id: "verdict", label: "Verdict", sub: "regression rule decided in advance" },
      ],
      highlight: ["compare"],
      caption: "One result per case is the key design choice, because everything after it (reports, flips, noise) needs per-case data.",
    },
    example: {
      title: "Example: old prompt against new prompt on 100 emails",
      text: "Counts are example numbers. The new prompt looks one point better, and the flipped cases show why that is not a win.",
      rows: [
        { label: "Old prompt", value: "83 of 100 correct (0.83)" },
        { label: "New prompt", value: "84 of 100 correct (0.84)" },
        { label: "Passed before, fail now", value: "6 cases" },
        { label: "Failed before, pass now", value: "7 cases" },
        { label: "Net change", value: "83 - 6 + 7 = 84, a gain of 1 case" },
        { label: "Noise on the difference", value: "about 5.2 points (standard error), so no evidence of a win" },
      ],
    },
    followUps: [
      {
        q: "The new prompt scores 0.84 against 0.83 on 100 cases. Do you ship it?",
        a: "One point on 100 cases is within noise, so do not call it a win. Look at the cases that flipped and at per-category scores, add cases or repeat runs, and decide with cost and risk in mind as well.",
      },
      {
        q: "Your judge model prefers longer answers. How does that show up, and what do you do?",
        a: "The score correlates with answer length. Swap the order of answers and rerun, calibrate against human labels, control for length in the rubric, or add a programmatic check.",
      },
      {
        q: "How do you stop the eval set from going stale?",
        a: "Add real production failures as new cases, version the sets and prompts together with their scores, and guard the held-out set so it does not leak into prompts.",
      },
    ],
    mistakes: [
      "Reporting only a mean on a few hand-picked examples.",
      "Tuning on the whole set and reporting the same set as the result.",
      "Failing the build on a tiny drop with no sense of noise, or never failing it at all.",
      "Being unable to say how the scorer was validated.",
    ],
  },

  'pm-evals-as-product-requirements': {
    short:
      "“Seems good on 20 examples” is a demo, not evidence, so write quality into the requirements as an eval: the task, how it is scored, the pass bar for each slice and what a failure looks like to a user. Product owns the bar and the ship decision, domain experts own what counts as correct, and engineers own the case set and the harness. A result of 186 of 200 is 93%, but its 95% range is about 88.6% to 95.8%, so a 90% bar sits inside it and the data does not yet show the feature clears it.",
    explain: [
      {
        heading: "Make the eval the acceptance test",
        body: "Write into the requirements what the feature must do, how it is scored, the bar for each part and what a failure looks like to a customer. Twenty examples that “seem good” is a demonstration: even 19 of 20 correct has a 95% range of about 76% to 99%. A written eval turns “good” into a number that can be re-measured, so the decision does not depend on who tried it last.",
      },
      {
        heading: "Who owns what",
        body: "Product owns the bars and the ship decision, since only product knows what a wrong answer costs the customer. Domain experts (for example contract managers or lawyers) own what counts as correct, in a rubric with examples of pass, borderline and fail, and two people label a sample to check they agree. Engineers own building the case set from real or realistic contracts, including hard and rare ones and the cases where the right answer is “I cannot tell”, split into a development set and a held-out set they do not tune against. Set separate bars for what matters most: a wrong party name or a missed termination clause is not the same as a clumsy sentence. Add cost, latency, refusal and safety checks next to correctness.",
      },
      {
        heading: "What 186 of 200 means against a 90% bar",
        body: "186 / 200 is 93% observed. A 95% range for the true rate (using the Wilson method) is about 88.6% to 95.8%, and the bar of 90% lies inside it, so the data does not show the feature clears the bar, though it may. To show a lower end above 90% at about 93% true quality takes a few hundred cases: about 280 by the simple formula and about 360 with the more careful Wilson range. Also look at the slices: a contract type with 12 cases and 8 right (67%) hides inside a 93% total and has a range of roughly 39% to 86% by itself. Ask for results per slice and flag slices too small to judge.",
      },
      {
        heading: "Keep it a living gate",
        body: "Re-run the eval on every model, prompt or retrieval change, and feed production failures into it, so that a green result today is not assumed to hold after a provider update. That is the difference between a launch check and a quality requirement.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["Who owns it", "What they produce"],
      rows: [
        { label: "The bar and the ship decision", cells: ["Product manager", "Pass bar per slice, cost and latency limits, rollout rule"] },
        { label: "What counts as correct", cells: ["Domain experts", "Rubric with pass, borderline and fail examples; labels on a sample"] },
        { label: "Cases and harness", cells: ["Engineers", "Real and hard cases, a development set and a held-out set, a repeatable run"] },
        { label: "Checking the grader", cells: ["Engineers with experts", "Judge compared with human grades; agreement between two labellers"] },
        { label: "Keeping it current", cells: ["Product and engineers together", "Re-run on every change; production failures added as cases"] },
      ],
      caption: "Quality becomes a requirement when each part has an owner and a deliverable.",
    },
    example: {
      title: "Example: 186 of 200 against a 90% bar",
      text: "The 186, 200 and 90% are the question’s numbers. The ranges use the Wilson method, and the slice is a made-up example of how a good total can hide a weak part.",
      rows: [
        { label: "Observed", value: "186 / 200 = 93%" },
        { label: "95% range for the true rate", value: "about 88.6% to 95.8%" },
        { label: "Against a 90% bar", value: "The bar is inside the range, so not yet shown" },
        { label: "Cases needed for a lower end above 90% at 93%", value: "about 280 (simple) to 360 (Wilson)" },
        { label: "A slice with 12 cases, 8 right", value: "67%, range about 39% to 86%; the other 188 cases are 178 right, 94.7%" },
        { label: "20 hand-tried examples, 19 right", value: "95%, but range about 76% to 99%" },
      ],
    },
    followUps: [
      {
        q: "Engineers want to tune the prompt until the eval reaches 95%. What risk is there, and what do you ask for?",
        a: "The score can rise because the prompt has learned those cases, which is overfitting to the test set. Ask for a held-out set the team has not seen, a fresh sample from live traffic, and an interval on the final number.",
      },
      {
        q: "An LLM judge grades the summaries and says 94%. Do you accept that as the bar?",
        a: "Only after checking the judge against human grades on a sample (agreement, and per-class results), looking for known biases such as length and preference for its own output, and keeping a human-labelled core for the high-stakes fields.",
      },
      {
        q: "The eval says the feature is ready but customer-facing teams are nervous. How do you decide?",
        a: "Explain the gap, since the eval may not reflect real use. Agree a staged rollout with guardrail metrics, shadow mode or a small cohort, and a rollback rule, instead of overruling either side from opinion.",
      },
    ],
    mistakes: [
      "Accepting a demo or a small hand-picked set as proof of quality.",
      "Reading 93% against a 90% bar as a pass without asking about uncertainty.",
      "Leaving the definition of “correct” to engineers alone.",
      "Having no plan to re-run the eval when the model or prompt changes.",
    ],
  },
};
