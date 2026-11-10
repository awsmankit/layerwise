import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'poisoned-wiki-page-in-rag-index': {
    short:
      "Contain first, then investigate. Take the page out of the index, block the look-alike address so the assistant cannot send anyone there, and decide whether to pause answers on payroll until you know how far this went. Keep the evidence, count who saw the answer, clean up and warn the people affected, then fix the real cause: people who should not be trusted could write into a source the assistant treats as authoritative.",
    explain: [
      {
        heading: "The first hour: contain, then keep the evidence",
        body: "Retrieval-augmented generation (RAG) means the assistant looks up pages and pastes them into the prompt before answering. A page that carries hidden instructions is an indirect prompt injection: the model reads the planted text as if it were part of its task. Stop the harm first. Remove or quarantine the page so it is no longer retrieved, block the look-alike destination at the output filter or at the network edge, and consider pausing payroll answers until the scope is known. Before you overwrite anything, save the page history (who edited it and when), the retrieval and answer traces, and the version of the index. Deleting the page without recording it destroys the thing you need to investigate.",
      },
      {
        heading: "Find out how far it went, then clean up",
        body: "Work from data, not guesses. Search the traces for every answer that retrieved the page, count the distinct users who saw it, and check whether any of them followed the link (link-click logs, proxy logs). Then look sideways: what else did the same account edit, and did similar accounts edit other indexed pages? You also need to know whether the contractor did it or whether the account was taken over, which changes who you talk to. To clean up, revert the page, re-ingest and re-embed so no stale vectors of the bad version remain, and tell the affected users in plain words what happened and what to do, including changing any password or detail they typed into the fake form. Involve the account owner, HR, and legal or privacy where needed.",
      },
      {
        heading: "The root cause is trust, not the model",
        body: "The model did what a model does: it treated text in its context as something to act on. The failure is that authors who are not fully trusted could write into a source the assistant treated as authoritative. So the lasting fix is about data and access. Give each source a trust tier, and make high-authority pages (payroll, benefits, security) need review or approval before an edit reaches the index. Limit write access to people who need it. At ingestion, strip hidden text and invisible formatting and keep provenance (source, editor, time) with every chunk. At answer time, allow the assistant to output links only to an allowlist of destinations. The wording of the system prompt is not on this list on purpose.",
      },
      {
        heading: "Detect it next time and make it a test",
        body: "Add alerts for edits to indexed pages by new or external accounts, and for instruction-like text in documents (for example sentences that address the assistant). Add this exact case to the adversarial eval set, a collection of attack examples run before every release, so the release gate fails if the behaviour ever returns. Then rehearse the response, so the next page is contained in minutes rather than days.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "Contain", detail: "Quarantine the page, block the look-alike address, consider pausing payroll answers." },
        { label: "Preserve", detail: "Save page history, traces and the index version before changing anything." },
        { label: "Scope", detail: "Find every trace that retrieved the page, who saw it, who clicked, and what else the account edited." },
        { label: "Clean up", detail: "Revert, re-ingest and re-embed, warn users plainly, involve HR, legal and the account owner." },
        { label: "Fix the cause", detail: "Trust tiers, approval on high-authority pages, least-privilege write access." },
        { label: "Detect and test", detail: "Alert on risky edits, add the case to the adversarial eval set." },
      ],
      caption: "The order matters: stop the harm, keep the evidence, measure the damage, then fix the system.",
    },
    example: {
      title: "Example: scoping from the traces",
      text: "Every number here is an example, to show the questions you answer from data. The page was edited three days ago, so the window to search is three days of traces.",
      rows: [
        { label: "Traces that retrieved the page (example)", value: "38 answers" },
        { label: "Distinct users who saw it (example)", value: "21 people" },
        { label: "Users whose click on the look-alike address is logged (example)", value: "6 people, who get a direct message first" },
        { label: "Other pages edited by the same account (example)", value: "4 pages, all reviewed before reopening" },
        { label: "Index state after cleanup", value: "page reverted, old vectors deleted, new ones built" },
      ],
    },
    followUps: [
      {
        q: "Why can’t the model just be told to ignore instructions in wiki pages?",
        a: "That instruction is a request to the same system the page’s author is writing to, so some injections will still get through. The page cannot be made harmless by wording, so the controls are about who can write, what the assistant may output and what it may do.",
      },
      {
        q: "Is a poisoned retrieval index the same risk as poisoned training data?",
        a: "Related but different. Retrieval poisoning takes effect as soon as the page is indexed and is fixed by removing it, while poisoning of training or fine-tuning data is baked into the weights and is much harder to undo. Both come from weak control over who can write to the data.",
      },
      {
        q: "How do you decide whether this is a reportable incident?",
        a: "Apply your incident rubric: impact on people (did anyone enter credentials into the fake form?), what data was exposed, and how many were affected. Bring in the security and privacy leads, who decide on any external notification, and do not decide that alone.",
      },
    ],
    mistakes: [
      "Blaming the model and shipping only a prompt change, which leaves the open write access in place.",
      "Deleting the page and the history before recording who edited it and what was retrieved.",
      "Fixing this one page without checking what else the same account, or similar accounts, edited.",
      "Leaving broad write access on the indexed sources, so the next contractor account has the same power.",
    ],
  },

  'rubber-stamp-reviewer-metrics': {
    short:
      "Not as measured. A human who approves 98% of items in 4 seconds each is a signature, not a safeguard, and the planted-error test backs that up: reviewers caught 2 of 10 known-bad drafts. Measure catch rate on planted errors, edit and reject rates, and time per item, then redesign the work so that rejecting is easy and there is time to read evidence. Keep hard limits in code that do not depend on anyone paying attention.",
    explain: [
      {
        heading: "Do the sums before judging",
        body: "500 items at 4 seconds is 2,000 seconds, about 33 minutes of review in a working day. If the whole 8-hour day were spent reviewing, 500 items would allow about 58 seconds each, so 4 seconds means almost nobody is reading the claim file. Still, a 98% approval rate does not prove failure on its own: the drafts might simply be 98% right. That is why the direct test matters. Reviewers flagged 2 of 10 planted errors, a catch rate of 20%. With only 10 planted, the 95% interval (a range the true rate probably sits in) is about 6% to 51%, so the test is too small to give an exact figure, but even the top of that range means most bad drafts get through.",
      },
      {
        heading: "Why people stop checking",
        body: "Automation bias is the tendency to accept a machine’s suggestion because it is there, and it affects experts as well as novices. Training alone does not remove it. Add the causes in this setup: hundreds of items a day and time pressure, many low-value alerts that teach people to click past them, and an interface where approving is the easy path and rejecting takes several steps. Blaming the reviewers misses that the system was built to make approval the natural result.",
      },
      {
        heading: "What to change",
        body: "Cut the items per reviewer so there is time to think, and show the evidence and sources with the recommendation. For the highest-stakes items, have the reviewer record their own decision first and only then see the AI’s answer (commit first), which fights anchoring. Make rejecting one click with no penalty. Route items by a confidence score only after you have checked that the score is calibrated, meaning that items it calls 90% sure really are right about 90% of the time. Do not set targets that reward approving, or rejecting, for its own sake.",
      },
      {
        heading: "Measure the loop and keep hard limits",
        body: "Track reject and edit rates, the distribution of time per item, the planted-error catch rate (plant more, across item types, and do not tell reviewers which ones), later reversals and appeals, and agreement between reviewers. A reject rate near zero is a warning, not a success. Underneath it all keep limits that do not rely on attention: amount caps, permission checks, a sampled audit that includes unflagged items, and a stop button. For high-risk systems the EU AI Act’s Article 14 describes oversight in this practical sense, with scope left to a lawyer.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "minutes of review time for 500 items",
      items: [
        { label: "Today: 4 seconds each", value: 33, note: "2,000 seconds", hot: true },
        { label: "20 seconds each", value: 167, note: "about 2.8 hours" },
        { label: "30 seconds each", value: 250, note: "about 4.2 hours" },
        { label: "Whole 8-hour day on review", value: 480, note: "about 58 seconds each" },
      ],
      caption: "Time spent per item decides how much checking is possible. Each bar is 500 items multiplied by the seconds shown.",
    },
    example: {
      title: "Example: reading the planted-error test",
      text: "10 known-bad drafts were hidden among 500, and reviewers flagged 2. The interval below is a standard 95% Wilson interval, a way to show how much a small sample can move the answer.",
      rows: [
        { label: "Planted errors caught", value: "2 of 10 = 20%" },
        { label: "95% interval for the true catch rate", value: "about 6% to 51%" },
        { label: "Review time at 4 seconds each", value: "500 x 4 = 2,000 seconds, about 33 minutes" },
        { label: "Plant 100 errors and catch 20 (example)", value: "interval narrows to about 13% to 29%" },
        { label: "What the 98% approval rate tells you", value: "nothing on its own; the catch rate does" },
      ],
    },
    followUps: [
      {
        q: "Managers want to add a second reviewer for everything. Does that help?",
        a: "Only if the reviewers are independent and have time. Two people who both see the AI’s suggestion first and skim add cost without much protection, so it is better to reduce volume, target high-risk items and measure the catch rate.",
      },
      {
        q: "Reviewers say the interface makes it hard to see the source documents. How do you use that?",
        a: "Treat it as a design finding: put the evidence beside the draft, highlight what the system used and what it was unsure about, then re-measure time and catch rate. Fix the tool before blaming the people.",
      },
      {
        q: "Do explanations of the AI’s reasoning reduce over-reliance?",
        a: "Not by themselves. In one experiment with 199 people, explanations did not reduce over-reliance while designs that forced people to decide first did, although people liked those designs less. Measure the effect on your own task.",
      },
    ],
    mistakes: [
      "Taking the 98% approval rate as proof of quality, or as proof of failure, when it is neither.",
      "Blaming the reviewers instead of the volume, the interface and the incentives.",
      "Planting a handful of errors and treating 20% as an exact figure.",
      "Answering with more reviewers or more training and changing nothing about the design.",
    ],
  },

  'code-allowlist-links-and-images-in-model-output': {
    short:
      "Parse every destination with a real URL parser, require an https scheme, and compare the lower-cased hostname exactly (or by suffix with a dot boundary) against an allowlist. Check every place a destination can appear, fail closed by dropping the element and keeping its text, and ideally proxy images or strip their query strings. Test it with a table of lookalike hosts and odd forms, and add a content security policy as a second layer.",
    explain: [
      {
        heading: "Why the renderer must not trust the model",
        body: "Model output is untrusted input to your page, because the model can be steered by text it read. A markdown image loads automatically, so if its address carries private data in the query string, the data leaves the moment the page renders, with no click at all. Links can lead a user to a hostile page. Telling the model “do not use external links” is a request to the same system an attacker is influencing. A filter written in code at the renderer holds even when the model is fooled.",
      },
      {
        heading: "How to check an address properly",
        body: "Never use a regular expression, a substring test or a starts-with test on the raw string. A lookalike such as docs.example.com.other.example contains your allowed host and passes those tests, but its real host is other.example. Instead, parse the address with the language’s URL parser, take the parsed hostname, lower-case it, and compare for an exact match with an allowed host. If you allow subdomains, accept only the host itself or a name that ends in a dot plus the allowed domain, so notexample.com does not match example.com. Require the scheme to be https and reject scripts, data URLs, scheme-relative addresses and anything the parser cannot read. Test explicitly for user-info (the part before an @, as in docs.example.com@other.example), unusual ports, upper case, percent-encoding and unicode hosts, since each has been used to confuse naive checks.",
      },
      {
        heading: "Cover every form and fail closed",
        body: "A destination can appear in inline links and images, in reference-style definitions that sit elsewhere in the text, in autolinks (a bare address in angle brackets) and in raw HTML tags if HTML is allowed. Missing one form defeats the filter, and the safest move is to escape HTML entirely so only markdown forms exist. On any parse error or doubt, drop the element and leave its visible text. Do not try to repair a bad address. For allowed image hosts, consider dropping the query string or proxying images through your own server, so that even an allowed host cannot receive private data.",
      },
      {
        heading: "Tests and the layer behind it",
        body: "Write a table-driven test: allowed hosts, lookalike hosts, odd schemes, nested and reference-style cases, and idempotence (running the function twice gives the same result as once). Fuzz it by asserting one invariant: no address in the output has a host outside the list. Behind the function put a content security policy that limits where images may load from, so a bug in your filter is caught by the browser as well.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Substring check on the raw text", "Parsed hostname, exact match"],
      rows: [
        { label: "https://docs.example.com/guide", cells: ["kept", "kept"] },
        { label: "https://docs.example.com.other.example/x", cells: ["kept (wrong)", "dropped: host is other.example"] },
        { label: "https://other.example/?ref=docs.example.com", cells: ["kept (wrong)", "dropped: host is other.example"] },
        { label: "https://docs.example.com@other.example/", cells: ["kept (wrong)", "dropped: host is other.example"] },
        { label: "https://DOCS.EXAMPLE.COM/guide", cells: ["dropped (wrong)", "kept after lower-casing"] },
        { label: "http://docs.example.com/guide", cells: ["kept (wrong)", "dropped: not https"] },
      ],
      caption: "Allowlist is docs.example.com. The substring check fails in both directions. Parsing the address first removes the confusion.",
    },
    example: {
      title: "Example: test table for the filter",
      text: "The allowlist is docs.example.com and the rule is https only. Each row is one case in the test table. Run the function on every markdown form (inline, reference, autolink) for each address, then run it again on its own output to check idempotence.",
      rows: [
        { label: "https://docs.example.com/a.png", value: "kept" },
        { label: "https://notexample.com/a.png", value: "dropped (suffix has no dot boundary)" },
        { label: "https://docs.example.com:8443/a.png", value: "dropped (only the default port is allowed)" },
        { label: "a script scheme, or a data URL", value: "dropped" },
        { label: "//docs.example.com/a.png (no scheme)", value: "dropped" },
        { label: "unparseable text in the brackets", value: "dropped, the visible text stays" },
      ],
    },
    followUps: [
      {
        q: "Why not ask the model to avoid external links?",
        a: "The model can be steered by injected text, and a prompt is a request to the same system. A filter in code at the renderer holds even when the model is fooled.",
      },
      {
        q: "An allowed host runs a service where anyone can host a page. Is the allowlist enough?",
        a: "No, because a host that lets third parties upload content gives an attacker a destination on your list. Allow specific paths or your own domains, proxy images, or show the link as plain text that needs a confirmation.",
      },
      {
        q: "How do you fuzz this?",
        a: "Generate many variants of markdown and address forms, assert the invariant that no address in the output has a host outside the list, and compare against a second renderer’s parse. Add every real bypass you find as a regression test.",
      },
    ],
    mistakes: [
      "Using a regular expression or a substring match on the whole string, which lookalike hosts pass.",
      "Filtering markdown syntax but letting raw HTML through.",
      "Failing open: keeping the element when the address does not parse.",
      "Believing the system prompt is the right place to enforce the rule.",
    ],
  },

  'unreviewed-model-download-supply-chain': {
    short:
      "Say plainly that a model file is software you are about to run. A pickle-based checkpoint can execute code the moment it is loaded, and a repository that asks you to trust remote code ships Python that runs on your server, so this is a code execution risk and not only a quality risk. Stop using the file on that server now, verify who published it, and put in place a process of staging, pinning, an internal registry and a sandboxed evaluation.",
    explain: [
      {
        heading: "Why this is a security problem, not only a quality problem",
        body: "Pickle is a Python format that can describe objects and also instructions for building them, so loading a pickle-based checkpoint can run code before any model exists. Loaders that trust remote code go further: they download and execute Python written by the repository owner. On a shared GPU server with access to an internal data lake, that code would run with the server’s credentials and mounts. The publisher’s name being one letter off from the original lab is a typosquat warning sign. Do not trust names, star counts or leaderboard rank. Check the official account from the lab’s own site and compare the file hash with a value published through a different channel.",
      },
      {
        heading: "Contain it now",
        body: "Stop using the file on that machine. Check what the loading process could reach: credentials in environment variables, mounted data, network access. If the file was already loaded, look at the logs for anything unusual, such as unexpected outbound connections or new processes, and rotate whatever it could have read. Do this before you debate the model’s quality, because the exposure exists whether or not the model is any good.",
      },
      {
        heading: "The safer path and the process around it",
        body: "Prefer safetensors, a format that stores plain numbers and does not run code on load. Keep remote code switched off unless someone has read it. GGUF is also a data format, but parsers can have bugs, so keep the runtime up to date. Build a process: download once on a staging machine, scan it, read the licence and model card, pin the exact repository revision and file hash, mirror it into an internal registry, and let production pull only from that registry, never “latest”. Treat containers, Python packages and drivers with the same care.",
      },
      {
        heading: "Judge the behaviour, and isolate the testing",
        body: "A safe file format does not make a bad model good. Run the model against your own eval set and an adversarial set before use, and check the licence of the fine-tune on top of the base model’s licence. Evaluation itself should happen in a sandbox or a separate account with no network egress, no credentials for the data lake, and short-lived access that expires.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'find', label: "Find a model", sub: "check the publisher is the real one" },
        { id: 'stage', label: "Download once on staging", sub: "no production access" },
        { id: 'scan', label: "Scan and read", sub: "format, licence, model card" },
        { id: 'pin', label: "Pin revision and hash", sub: "never use latest" },
        { id: 'registry', label: "Internal registry", sub: "the only source for production" },
        { id: 'eval', label: "Sandboxed evaluation", sub: "no egress, no data lake credentials" },
      ],
      highlight: ['scan', 'eval'],
      caption: "A model is software. It enters through a staging step and an internal registry, not straight from the public hub to a machine with data access.",
    },
    example: {
      title: "Example: what to say in the review",
      text: "Three findings in the review, each with the action. The names and numbers are illustrative.",
      rows: [
        { label: "Pickle-based checkpoint", value: "do not load; ask for a safetensors version or convert it in an isolated machine" },
        { label: "Remote code requested", value: "keep it off; read the code line by line first, or use the library’s own implementation" },
        { label: "Publisher name one letter off", value: "treat as a possible typosquat; find the lab’s official page and compare hashes" },
        { label: "Server with data lake access", value: "move evaluation to a sandbox with no credentials and no egress" },
        { label: "After approval", value: "pin repo revision plus file hash, mirror to the registry" },
      ],
    },
    followUps: [
      {
        q: "The team says the model is only for a one-day evaluation. Does that change the controls?",
        a: "The risk of code execution is the same on day one, so the isolation requirement stays. What can relax is the long-term registry and review work, with an expiry date on the sandbox and its data.",
      },
      {
        q: "How does this change for a model you fine-tuned yourself?",
        a: "It is still a supply chain with its own inputs: the base weights, the training data and its provenance, the libraries and the pipeline that writes the file. Sign or hash the output, store it in the registry and record its lineage.",
      },
      {
        q: "What would you add for an air-gapped site?",
        a: "An offline registry and a verify, scan, sign, transfer, verify path for every update, with no phone-home behaviour in the runtime. The eval set travels with each new model version.",
      },
    ],
    mistakes: [
      "Treating the download as fine because many people use the hub.",
      "Trusting remote code or pickle files by default.",
      "Scanning for malware but never reading the licence or testing the behaviour.",
      "Letting the evaluation environment see production data or hold production credentials.",
    ],
  },

  'adverse-decision-explanation-for-an-applicant': {
    short:
      "Do not hand one explanation to everyone, and do not ask a chat model to invent a reason. Give the applicant plain reasons that come from the real model, with a feasible counterfactual and a human route to contest. Keep the main factors, evidence, logs, model version and tests for reviewers and auditors, and be honest about where attribution methods fall short. Legal decides how the rules apply.",
    explain: [
      {
        heading: "Start from the reader",
        body: "Four people need four things. The applicant needs reasons they can understand and act on, and a way to contest. A reviewer needs the main factors and the evidence behind them. The builder needs debugging tools. The auditor needs documentation, logs and tests. One output cannot serve all four, and a chart of attribution values handed to an applicant serves none of them. For high-stakes decisions, prefer an interpretable model if it is nearly as accurate, because then the reasons come from the model itself (this is Cynthia Rudin’s argument). If you must use a black box, explain it with care.",
      },
      {
        heading: "What the applicant gets",
        body: "Plain-language reasons taken from the real model: the main factors that lowered the score, in words such as “the amount requested is high compared with your stated income”. Where possible add a counterfactual, a statement of what would have changed the result. It must be feasible and appropriate: do not advise someone to change something they cannot change, or should not be asked to change. Include a human route to contest. GDPR Article 22, as the European Commission describes it, says people should not be subject to solely automated decisions with legal or similarly significant effects, with limited exceptions, and that organisations must arrange human intervention and a way to contest. A ruling in the SCHUFA case suggests that a human who just follows a score may not remove the automation. This is not legal advice, so the compliance team and counsel decide how it applies.",
      },
      {
        heading: "Where popular methods fall short",
        body: "Shapley values explain one prediction of this model, not how the world works. Permutation importance describes the model overall, and correlated features share credit between them. Neither tells you which way a feature pushes unless you show the sign. Attention maps are not explanations. Do not use the chat model’s own story as the reason either: a generated explanation may sound plausible without reflecting what drove the decision. Test faithfulness by changing the stated factors in the input and checking whether the decision actually moves.",
      },
      {
        heading: "What you keep for compliance",
        body: "Store the reasons actually given, the model version, the inputs and the explanation method, so any decision can be reproduced and checked later. Test the explanation process on slices of applicants, to see that reasons are consistent and not systematically different for one group.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["What they need", "What you give or keep"],
      rows: [
        { label: "Applicant", cells: ["Reasons they can act on, and a way to contest", "Plain-language main factors, a feasible counterfactual, a human route to appeal"] },
        { label: "Reviewer", cells: ["The factors and the evidence", "Per-decision factors with the input data shown"] },
        { label: "Builder", cells: ["To find and fix errors", "Attribution tools, with their limits stated"] },
        { label: "Auditor", cells: ["To reproduce and check", "Reasons given, model version, inputs, method, test results"] },
      ],
      caption: "Different readers need different artefacts. The applicant letter is one of several, not the whole record.",
    },
    example: {
      title: "Example: an applicant reason and its check",
      text: "All values are invented for illustration. The reason text is built from the real model’s main factors, and the faithfulness test asks whether changing those factors moves the decision.",
      rows: [
        { label: "Reason 1 (example)", value: "Requested amount is high compared with income" },
        { label: "Reason 2 (example)", value: "Several recent missed payments on existing credit" },
        { label: "Counterfactual (example)", value: "Approval would have been likely with a requested amount about 20% lower" },
        { label: "Faithfulness test", value: "Re-run the model with those two inputs changed; the decision should flip" },
        { label: "Kept on file", value: "Reasons sent, model version, inputs, method, date" },
      ],
    },
    followUps: [
      {
        q: "The top reason is a postcode feature. What do you do?",
        a: "Treat it as a proxy risk: check whether it stands in for a protected attribute, test error rates by group, and consider removing or constraining it. Be careful about telling an applicant to move house, and escalate to a fairness review.",
      },
      {
        q: "Two similar applicants get different reasons for the same outcome. Is that a problem?",
        a: "Not necessarily, since local explanations differ by case, but each must be traceable and consistent with how the model behaves. Check the stability of the method and that the reason codes map to real model behaviour.",
      },
      {
        q: "Is a short list of reason codes enough for the regulator?",
        a: "Probably not on its own. A regulator or auditor asks how the model works, how it was tested and how it is monitored, so the applicant-facing reasons are one artefact among documentation, tests and logs.",
      },
    ],
    mistakes: [
      "Having the chat model write the reason and presenting it as the real one.",
      "Showing the applicant a chart of attribution values with no plain explanation.",
      "Offering no route to challenge the decision, or a human who just confirms the score.",
      "Claiming that one method explains the model to every audience.",
    ],
  },

  'deletion-request-across-ai-stores': {
    short:
      "Treat it as a process with a deadline, not a database delete. Verify the person, log the request, bring in the privacy lead, and use a data map to work through every store: database, traces, vector index, analytics, backups and the model provider. Be honest about the fine-tuned model: you can delete the rows quickly, but you cannot promise a trained model has forgotten them, so say what you did and what remains.",
    explain: [
      {
        heading: "Start with the process and a data map",
        body: "Verify the requester is who they say they are, log the request with its date, and involve the data protection officer or privacy lead. As the European Commission describes the GDPR, requests must be answered without undue delay and in principle within one month. Which rights and exceptions apply is for the privacy lead and a lawyer. Everything depends on a data map: a list of every store that holds personal data and who owns it. Without one you cannot honestly say you deleted everything, so building the map is part of the fix, not a side task.",
      },
      {
        heading: "Handle each store on its own terms",
        body: "Delete or redact the person’s records in the main database, the traces in the observability tool and the analytics exports. In the vector index, remove their documents and the embeddings built from them by document ID, because a vector made from their ticket can leak it even after the ticket is gone. Backups usually cannot be edited, so check that they expire on schedule and that a restore never re-ingests deleted data. Ask the model provider and any other processors to delete what they hold, using the contract, and keep their confirmation.",
      },
      {
        heading: "What you cannot honestly promise",
        body: "Removing a person’s rows from a training set is easy. Making a fine-tuned model forget them is hard, because their text has already shaped the weights. Your options are to retrain without the data on a schedule, to test the model for extraction using planted canary strings (made-up unique strings you can check for), and to filter outputs while a retrain is planned. The European Data Protection Board’s Opinion 28/2024 says models trained on personal data cannot in all cases be considered anonymous and that each case is judged on its facts, so do not tell the person the model has forgotten them.",
      },
      {
        heading: "Reply plainly and stop it recurring",
        body: "Tell the person what was deleted, what remains and why (for example data you must keep under a legal duty), and when the rest will be gone. Keep only the minimum record that the request happened. To prevent a repeat: a suppression list so deleted data is not re-ingested, retention timers on every store, redaction before logging, and a design that keeps facts people may ask to delete in retrieval stores or databases rather than in weights.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["What you do", "What you can promise"],
      rows: [
        { label: "Main database", cells: ["Delete or redact the person’s records", "Deleted, except data held under a legal duty"] },
        { label: "Chat traces and analytics", cells: ["Delete or redact; fix the export jobs", "Deleted from live systems"] },
        { label: "Vector index", cells: ["Remove their documents and embeddings by document ID", "Removed, and not re-ingested because of the suppression list"] },
        { label: "Backups", cells: ["Let them expire; block restore into live data", "Gone when the backup cycle ends, on a stated date"] },
        { label: "Model provider", cells: ["Request deletion under the contract", "Only what the provider confirms in writing"] },
        { label: "Fine-tuned model", cells: ["Test for extraction, filter outputs, schedule a retrain", "No promise that the model has forgotten"] },
      ],
      caption: "Each store needs its own action, and each action supports a different promise. The last row is the one to be honest about.",
    },
    example: {
      title: "Example: one request through the stores",
      text: "All counts are examples. A request arrives on 3 November, so in principle the answer is due within one month, by 3 December, unless the privacy lead sets out a lawful extension.",
      rows: [
        { label: "Day 0", value: "verify identity, log the request, tell the privacy lead" },
        { label: "Vector index (example)", value: "40 tickets by this person, about 5 chunks each, so 200 vectors removed by document ID" },
        { label: "Traces and analytics", value: "delete the person’s rows, then rerun the export to confirm" },
        { label: "Provider and processors", value: "written deletion request sent; confirmation filed" },
        { label: "Fine-tuned model", value: "extraction test run with canary strings; retrain scheduled, outputs filtered meanwhile" },
        { label: "Reply by 3 December", value: "what was deleted, what remains and why, and when backups expire" },
      ],
    },
    followUps: [
      {
        q: "The person’s text is in last quarter’s fine-tune. Do you retrain tomorrow?",
        a: "Assess the risk first: test whether the model reproduces the text, check how the data entered the set, and decide with the privacy lead whether a retrain is proportionate. Then schedule it, apply output filtering meanwhile and document the decision.",
      },
      {
        q: "How do you design so this is easier next time?",
        a: "Keep personal facts in retrieval or databases rather than in weights, remove personal data and duplicates before fine-tuning, record which datasets trained which model version, set retention on every store, and keep the data map up to date.",
      },
      {
        q: "Does differential privacy mean you no longer need to handle such requests?",
        a: "No. It limits what any answer reveals about one person under defined assumptions, which is not the same as forgetting, and the unit of protection matters. It is one tool and not an exemption.",
      },
    ],
    mistakes: [
      "Deleting the main database row and declaring the request complete.",
      "Promising that the model has forgotten the person.",
      "Having no inventory of where personal data lives, so nobody can say what was missed.",
      "Giving a firm legal answer without involving the privacy lead.",
    ],
  },

  'measuring-fairness-without-sensitive-attributes': {
    short:
      "Not collecting gender, ethnicity or age does not make the model fair. Other columns can act as proxies, so the pattern can stay in the model while becoming invisible to you, and you cannot manage what you cannot measure. Choose a measurement route (a voluntary audit sample, a survey, an outside auditor, or inference as a last resort), keep that data apart from decisions, report each group with its sample size and uncertainty, and get legal advice on what is allowed.",
    explain: [
      {
        heading: "Why leaving the data out does not protect anyone",
        body: "A proxy is a column that correlates with a protected attribute: postcode, shopping pattern or the type of phone can all stand in for something you did not collect. A model can learn those links, so unfairness can remain while your ability to see it disappears. Privacy is a real goal, and so is measuring harm. The task is to measure carefully while collecting as little as you can.",
      },
      {
        heading: "Ways to measure, and what each costs",
        body: "Option one is a voluntary, self-reported sample collected for auditing only. Option two is a survey of a random sample of customers, which suffers less from self-selection. Option three is an independent auditor who holds the data and reports aggregates. The last resort is inferring the attribute from proxies such as name or area. Inferred labels have errors that bias the measurement and are a privacy risk in themselves. Whichever route you use, keep the audit use separate from decisions: store the attribute apart, restrict access, state the purpose, set a retention period, never use it as a model input, and get the data protection or privacy lead to agree. Rules about collecting or using sensitive attributes differ by country and sector, and in some settings using them at decision time is restricted. This is not legal advice, so ask counsel.",
      },
      {
        heading: "Report with honest uncertainty",
        body: "Give each group’s rate with its sample size and an interval, and say when a group is too small to measure. Pick the metric from the harm. For lending the main harm is a person who would have repaid being refused, so look at how often that happens in each group, and write down what you traded away by choosing it, since fairness measures cannot all be satisfied at once. Add checks that need no personal data on customers: look for proxy features, test with synthetic or paired profiles that differ in one respect, and review outcomes by area or product.",
      },
      {
        heading: "Plan for imperfection",
        body: "Write down the limits of the method, repeat the audit at intervals, and treat the result as evidence, not as proof that the model is fair. A clean result from a small, biased sample should make you more careful, not less.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "percentage points of uncertainty (plus or minus) at 95%, for a rate near 50%",
      items: [
        { label: "25 people in the group", value: 19.6 },
        { label: "100 people", value: 9.8, hot: true, note: "the group in the example" },
        { label: "400 people", value: 4.9 },
        { label: "1,600 people", value: 2.5 },
      ],
      caption: "The uncertainty shrinks with the square root of the group size, so four times the people halves it. Small groups cannot support firm claims.",
    },
    example: {
      title: "Example: why sample size matters in the audit",
      text: "The company has 50,000 customers and 4% volunteer their details, so 2,000 people. Suppose 1,900 are in group A and 100 are in group B (example numbers). A refusal rate of 25% for A and 30% for B looks like a 5 point gap, but the intervals below, worked with the Wilson formula, overlap heavily.",
      rows: [
        { label: "Volunteers", value: "4% of 50,000 = 2,000" },
        { label: "Group A refused (example)", value: "475 of 1,900 = 25%, interval 23.1% to 27.0%" },
        { label: "Group B refused (example)", value: "30 of 100 = 30%, interval 21.9% to 39.6%" },
        { label: "What it shows", value: "the data cannot tell a 5 point gap from no gap; the plan is more data, not a verdict" },
      ],
    },
    followUps: [
      {
        q: "Only 4% of customers volunteer the information. Is the sample usable?",
        a: "It may be biased, because who volunteers differs from who does not. Compare it with known customer profile data, weight carefully, widen the intervals and say what it can and cannot show.",
      },
      {
        q: "The vendor offers to infer ethnicity from names and addresses to run the audit. What do you ask?",
        a: "How accurate the inference is for each group, who holds the inferred labels, whether they could be used for decisions, how they are protected and deleted, and what the legal basis is. The errors are not random and the output is sensitive.",
      },
      {
        q: "The audit shows a gap you can only close by using the attribute at decision time. What now?",
        a: "Stop and consult legal, because it may be unlawful in some settings. Look first at data, feature and training changes that need no attribute at run time, and document the choice and its cost.",
      },
    ],
    mistakes: [
      "Saying the model is fair because the attribute is not an input.",
      "Collecting the audit data and storing it next to the model’s inputs and logs.",
      "Reporting group figures with no sample sizes or intervals.",
      "Stating a legal conclusion as if it were certain.",
    ],
  },

  'threat-model-customer-support-rag-bot': {
    short:
      "Start with a data-flow diagram that names the assets, the actors and the trust boundaries, then walk each boundary with a structured prompt such as STRIDE or the OWASP Top 10 for LLM applications and write the abuse cases in plain words. For this bot the likely findings are cross-customer data access, indirect injection, data leaving through images, a misusable return-label tool and cost abuse. Rank them, turn them into controls in code and tests, and re-run the model whenever something changes.",
    explain: [
      {
        heading: "Draw it first",
        body: "A threat model begins with a picture of how data moves. The assets are the things worth protecting: customer records, the system prompt and tool definitions, the retrieval index, the budget and brand trust. The actors are anonymous visitors, a signed-in customer acting maliciously, authors of any indexed content, insiders and a compromised vendor. The trust boundaries are the places where data crosses between parties with different levels of trust: browser to app, app to model, app to retrieval store, app to tools, and app to logs and the provider. Most findings sit on a boundary.",
      },
      {
        heading: "Walk each boundary and write abuse cases",
        body: "STRIDE is a checklist of six questions to ask at each point: what can be spoofed, tampered with, denied, disclosed, overloaded or elevated. The OWASP Top 10 for LLM applications adds model-specific risks. Use them as prompts, and write each result as a short abuse case in plain words, such as “a customer asks for another customer’s tickets by changing a name in the question”, rather than a long list of labels. For this design expect: retrieval that does not filter by the caller’s identity, so one customer reads another’s tickets; indirect injection through ticket text or a help article; an auto-loaded markdown image that carries data out; a return-label tool called with arguments the user should not control; a cache keyed by question text alone; system prompt extraction; and cost abuse from very long inputs and agent loops.",
      },
      {
        heading: "Rank, decide and turn findings into code",
        body: "Rank by impact and likelihood for this product: a cross-customer leak outranks a rude answer. Decide what to fix before launch, what to accept with a named owner, and what to monitor. Then turn findings into controls that live in code: identity-derived filters in the retrieval query, tool arguments checked against the session’s customer, a confirmation step on label creation, escaped output with an image allowlist, per-user caches, token-based rate limits, and no secrets in prompts.",
      },
      {
        heading: "Keep it alive",
        body: "Each abuse case becomes a test in the adversarial eval set and a field in the logs or an alert, so the threat model is a living document wired into the release process. Re-run it when something changes: a new tool, a new data source, a new model or a new kind of customer. Name an owner, because a model written once goes stale.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'browser', label: "Customer browser", sub: "anonymous or signed in" },
        { id: 'app', label: "App server", sub: "authentication and rate limits" },
        { id: 'retrieval', label: "Retrieval", sub: "help articles and this customer’s tickets" },
        { id: 'model', label: "Model", sub: "reads everything as text" },
        { id: 'tools', label: "Tools", sub: "return label, order lookup" },
        { id: 'render', label: "Rendered answer", sub: "markdown, links, images" },
      ],
      highlight: ['retrieval', 'tools', 'render'],
      caption: "Every arrow crosses a trust boundary. The highlighted boxes are where this design is most likely to leak data or take an action it should not.",
    },
    example: {
      title: "Example: abuse cases ranked for launch",
      text: "Ranks and decisions are example judgements for this product, written the way a team would record them. Impact and likelihood are each scored low, medium or high.",
      rows: [
        { label: "Customer reads another customer’s tickets", value: "high impact, medium likelihood: fix before launch with an identity filter in the query" },
        { label: "Return label created for someone else’s order", value: "high impact, medium likelihood: check arguments against the session, confirm first" },
        { label: "Data leaks through an auto-loaded image", value: "medium impact, medium likelihood: escape output, image allowlist" },
        { label: "Injection through a help article", value: "medium impact, low likelihood: limit who can edit, monitor" },
        { label: "Long inputs drive up cost", value: "low impact, high likelihood: token limits per user, alert on spend" },
        { label: "Rude or off-brand answer", value: "low impact: accept with monitoring" },
      ],
    },
    followUps: [
      {
        q: "Product adds a “look up any order by number” tool next month. What do you do?",
        a: "Re-open the model, because the new tool changes both the data and the action surface. Check that the lookup is bound to the signed-in customer in code, that order numbers cannot be enumerated, and that the abuse case and its test are added before release.",
      },
      {
        q: "You have two days. What do you cut?",
        a: "Keep the highest-impact boundaries (data access, tools, output rendering) and skip a full STRIDE pass on low-risk parts. Write down what was not covered, so the gap is visible and not assumed to be safe.",
      },
      {
        q: "How do you handle a risk the business wants to accept?",
        a: "Record it with the risk owner’s name, the reason, a review date, a compensating control such as monitoring or a kill switch, and the trigger that would reopen it. Security informs the decision and does not own the business risk.",
      },
    ],
    mistakes: [
      "Producing a generic checklist with no diagram and no named boundaries.",
      "Analysing only the model and ignoring retrieval, logs and tools.",
      "Marking every finding critical, so nothing is prioritised.",
      "Writing the threat model once and never revisiting it.",
    ],
  },

  'impact-assessment-housing-triage-model': {
    short:
      "Start with the purpose and the decision: what the ranking changes, who is affected and what each kind of error costs, since a missed urgent case is worse than a case ranked too high. Ask whether a model is needed at all, place the system in a risk tier, examine the data and labels, specify measurement by group, and design oversight and appeal that are real. Then run in shadow mode before launch, and write down the conditions under which you would recommend against it.",
    explain: [
      {
        heading: "Purpose, harm and whether a model is needed",
        body: "Begin with what the ranking changes in practice and who is affected. The applicants did not choose this system and may not know it exists, and caseworkers are affected too. List each error type and its harm: an urgent case ranked low can mean someone sleeping outside, while a case ranked too high costs a caseworker some time, so the two errors are not equal. Ask whether the harm can be undone. Then ask whether a model is needed. Compare it with a rules-based queue, waiting time or a short checklist, and record why a model is better, because a simpler method is easier to explain and to contest.",
      },
      {
        heading: "Risk tier and data",
        body: "Tier the system by its use, not its technology. Access to essential public services is a high-risk area in Annex III of the EU AI Act, so assume the heavier duties of documentation, logging, human oversight and monitoring, and leave exactly which rules apply to a lawyer. Then examine the data: where it came from, what the labels are, and who is missing. Past caseworker decisions as labels carry past bias and are not a measure of need. Columns such as postcode may stand in for protected characteristics.",
      },
      {
        heading: "Measurement and oversight",
        body: "Do not settle for overall accuracy. Measure recall of truly urgent cases in the top of the ranking (the share of urgent cases the model puts where caseworkers will actually reach them), calibration, error rates and ranking quality by group and by intersection of groups, each with sample sizes and intervals. Write down your choice of fairness metric and the trade-off you accept. Design oversight so it is real: caseworkers see the reasons and the data, can override in one step, decide before seeing the score where practical, and applicants have a human appeal. Put limits in code on what the score alone can do.",
      },
      {
        heading: "Launch, and when to say no",
        body: "Run in shadow mode alongside existing practice first, then decide with a named approver and written conditions. Plan monitoring by group, an incident route, a review date and a description of the system that others can read. Recommend against launch if there is no reliable ground truth for need, no meaningful appeal, no way to measure by group, or evidence that it performs worse for a protected or vulnerable group with no remedy.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "percent of truly urgent cases placed in the top 3,000",
      items: [
        { label: "All applicants", value: 80, note: "1,200 of 1,500" },
        { label: "Group A", value: 85, note: "1,020 of 1,200" },
        { label: "Group B", value: 60, note: "180 of 300", hot: true },
      ],
      caption: "Example numbers from a shadow-mode run. An overall figure of 80% hides a much lower figure for one group.",
    },
    example: {
      title: "Example: reading a shadow-mode result",
      text: "Every figure is an example. The office receives 30,000 applications a year and caseworkers can work the top 10%, which is 3,000. Suppose 1,500 applications (5%) are truly urgent, judged by a review panel and not by past decisions.",
      rows: [
        { label: "Top of the ranking that caseworkers reach", value: "10% of 30,000 = 3,000" },
        { label: "Urgent cases in the top 3,000", value: "1,200 of 1,500 = 80% (interval about 78% to 82%)" },
        { label: "Group A (1,200 urgent)", value: "1,020 caught = 85% (about 83% to 87%)" },
        { label: "Group B (300 urgent)", value: "180 caught = 60% (about 54% to 65%)" },
        { label: "Cases missed per year", value: "300 urgent cases not reached; 120 are in group B" },
        { label: "Recommendation", value: "do not approve as is; find the cause and re-measure by group" },
      ],
    },
    followUps: [
      {
        q: "In shadow mode the model ranks urgent cases well overall but worse for non-native speakers. What do you recommend?",
        a: "Not to launch as is. Investigate why (text features, translation, missing fields), fix the data and features or limit the model’s role, recheck the slice with intervals, and decide with a named owner. Document the finding and the conditions for proceeding.",
      },
      {
        q: "Caseworkers follow the ranking almost always. Why does that matter?",
        a: "That is automation bias, and a person in the loop who just agrees is not oversight. Measure the override rate and the planted-error catch rate, redesign the task and reduce the volume per reviewer.",
      },
      {
        q: "Who should sign off?",
        a: "An accountable business owner with authority over the service, informed by independent review from governance, legal or privacy, and security. The team that built it should not be the only approver.",
      },
    ],
    mistakes: [
      "Evaluating only overall accuracy, which hides group differences.",
      "Using past decisions as the definition of need without questioning them.",
      "Giving applicants no appeal and caseworkers no easy override.",
      "Treating the assessment as a form to complete rather than a decision that can end in no.",
    ],
  },

  'pm-working-with-legal-on-customer-data-in-prompts': {
    short:
      "Treat legal as a partner who owns the legal questions, and arrive with facts: which data fields go to the model, where they are processed, who the provider is and what the contract says about retention and training. Ask first whether the feature needs the whole transcript, and offer options with trade-offs instead of a yes or no. Write the decision down, turn it into engineering requirements, and never run a pilot on real data to see what happens.",
    explain: [
      {
        heading: "Bring facts, not pressure",
        body: "“Everyone does it” is not an argument about risk, and legal is not an obstacle to route around. Legal owns the decision on legal questions, and your job is to make it easy to decide. Bring a one-page summary: the fields sent (names, emails, order numbers, free text), where processing happens, who the provider is, what the contract says about retention and about using the data to train models, and the purpose of the feature. Check the provider’s current terms and options, such as zero retention or regional processing, instead of assuming what they are. This is a process question and not legal advice.",
      },
      {
        heading: "Minimise first, and measure the redaction",
        body: "The data-minimisation question comes first: does the feature need the whole transcript? Often the last few messages, with names, emails and card details redacted before sending, are enough. Redaction is software and software misses things, so measure its recall (the share of personal items it catches) on a labelled sample. A simple pattern filter in the What if experiment below catches 9 of 17 personal items on made-up lines, which is the kind of gap you should expect and measure.",
      },
      {
        heading: "Separate the risks and offer options",
        body: "Four risks get mixed up: personal data going to a vendor, the vendor retaining or training on it, the output containing personal data, and what users were told. List them separately. Then offer options, each priced in cost, quality and delay: redact and send, a region-restricted deployment, a self-hosted model for the sensitive tier, or a limited launch to customers who have opted in. Legal can pick, or ask for changes, much more easily from a menu than from a yes-or-no.",
      },
      {
        heading: "Document, set requirements, and keep to the process",
        body: "Record the decision: purpose, data flow, retention, access, who approved and a review date, aligned with your organisation’s governance process and with the rules that apply to your customers and region, which differ and should be checked with legal. Turn it into engineering requirements: logs that do not store raw transcripts, deletion that reaches caches, logs and indexes, an access model, and a test that a planted fake personal detail does not leak. Agree a timeline, escalate disagreement to the accountable owner instead of working around legal, and do not ship a pilot on real data “just to try”.",
      },
    ],
    diagram: {
      kind: 'experiment',
      slug: 'no-pii-filter',
      caption: "A simple redaction filter on made-up chat lines: what it catches, what it misses, and how longer retention adds exposure.",
    },
    example: {
      title: "Example: the one-page brief for legal",
      text: "Every value is an example of what the page should contain. The aim is that legal can decide in one meeting, and that the decision is recorded.",
      rows: [
        { label: "Purpose", value: "summarise a support conversation for the next agent" },
        { label: "Data sent (example)", value: "last 10 messages, names and emails and card numbers redacted first" },
        { label: "Processing and provider terms", value: "region, retention period, training use: copied from the current contract, not from memory" },
        { label: "Options with trade-offs", value: "redact and send; regional deployment; self-hosted for the sensitive tier; opt-in launch" },
        { label: "Engineering requirements", value: "no raw transcripts in logs, deletion that reaches all stores, planted-detail leak test" },
        { label: "Decision record", value: "approver, date, review date" },
      ],
    },
    followUps: [
      {
        q: "Engineering offers to use real transcripts in a quick pilot, “just internally”. What is your response?",
        a: "Internal use of real customer data is still processing under the same rules. Suggest synthetic or redacted data for the pilot, and get the data flow approved first.",
      },
      {
        q: "Legal approves the vendor but the contract says nothing about model training on your data. What do you do?",
        a: "Take it back to legal and procurement to settle in writing, using the provider’s current documentation, and do not assume. Hold sensitive data back until it is settled.",
      },
      {
        q: "A customer asks for their data to be deleted. Where might it still exist in your AI feature?",
        a: "In prompts and logs, caches, traces, a vector index, analytics, evaluation sets, backups, and possibly the provider’s retention. Deletion is a product requirement with owners, not a single database delete.",
      },
    ],
    mistakes: [
      "Treating legal as an obstacle and looking for a way around them.",
      "Using “everyone does it” as the argument.",
      "Being unable to say what data is sent, to whom and under what terms.",
      "Having no plan for deletion requests or retention.",
    ],
  },

  'governance-for-forty-ai-features': {
    short:
      "Start with an inventory, because you cannot govern what you cannot list: every AI system, bought or built, with a named owner, filled from procurement, security and API-key records. Then set risk tiers by use with a minimum of evidence for each, add review gates, monitoring, incident handling and supplier checks, and use frameworks as organisers and not as checklists. Teams cooperate when the effort is proportionate: the lowest tier takes minutes, and the heavy work is reserved for features that affect people.",
    explain: [
      {
        heading: "Inventory first, from records and not surveys",
        body: "The director’s three questions (which touch personal data, who approved them, what happens if one goes wrong) are all answered from an inventory with one row per AI system, including ones the company bought, each with a named owner. Build it from a light intake form and from records that already exist, such as procurement, security reviews and API-key lists, because a survey nobody answers produces nothing. Expect surprises: a quarter is enough to list forty features, but only if you start from the records.",
      },
      {
        heading: "Tiers by use, with minimum evidence",
        body: "Set risk tiers by what the system is used for, not by the technology. For example, an internal summariser with no personal data needs owner sign-off and an inventory entry. A customer-facing chatbot needs an evaluation report, a security review and a monitoring plan. A system that decides things about people needs an impact assessment, independent review, designed human oversight and an incident drill. Across all tiers you need seven recurring practices: inventory, tiers, roles (an owner per system and an accountable executive), review gates before launch and after big changes, post-deployment monitoring, incident handling, and supplier checks that include a contingency plan for a third-party failure.",
      },
      {
        heading: "Use frameworks as organisers, read cards for red flags, and handle incidents",
        body: "NIST’s AI Risk Management Framework (Govern, Map, Measure, Manage) is voluntary and, as of 1 November 2026, under revision, so use it to organise the work. Its generative AI profile lists twelve risks, which make a good review-gate checklist. ISO/IEC 42001 is a paid standard, so read it or ask an accredited auditor and do not rely on summaries. When you read a model card, watch for red flags: claims with no number, a single accuracy figure, no out-of-scope use, no results by group, possible overlap between evaluation and training data, and “no known limitations”. For incidents use a fixed minimum form (system, reporter, dates, description, impacts, who is affected), a rule for who decides seriousness, and a way for anyone to escalate without penalty. Laws set their own incident thresholds and deadlines for some high-risk systems, depending on your role and on dates, so the lawyers decide.",
      },
      {
        heading: "Winning cooperation, and answering “bureaucracy”",
        body: "Make tier 1 take minutes, reuse eval sets and traces teams already have, promise a turnaround time for reviews, and start with the highest tier and two pilot teams. Publish the answers to the director’s questions so teams see what the effort buys, and remove any control that never changes a decision. When a team says “bureaucracy”, ask which step never changed an outcome, and remove it. Measure coverage of the inventory, time to approval by tier, incidents found by monitoring rather than by complaints, and drill results.",
      },
    ],
    diagram: {
      kind: 'layers',
      layers: [
        { label: "Tier 3: decisions about people", sub: "impact assessment, independent review, designed human oversight, incident drill" },
        { label: "Tier 2: customer-facing features", sub: "evaluation report, security review, monitoring plan" },
        { label: "Tier 1: internal, no personal data", sub: "owner sign-off and an inventory entry, minutes of effort" },
        { label: "Base for all tiers", sub: "inventory, named owners, incident form, supplier checks" },
      ],
      caption: "Effort rises with the stakes. The base layer applies to every system, so the director’s three questions can always be answered.",
    },
    example: {
      title: "Example: a quarter-one plan for forty features",
      text: "The split of features across tiers is invented to show the shape of the work. The point is that the heaviest process lands on a few systems.",
      rows: [
        { label: "Features listed in the inventory", value: "40, each with an owner" },
        { label: "Tier 1 (example)", value: "22 features, an inventory entry and sign-off, a few minutes each" },
        { label: "Tier 2 (example)", value: "14 features, evaluation, security review, monitoring plan" },
        { label: "Tier 3 (example)", value: "4 features, impact assessment, independent review, drill" },
        { label: "Pilot teams", value: "2, chosen from tier 3 and tier 2" },
        { label: "Answer for the director", value: "which touch personal data, who approved, what the incident route is" },
      ],
    },
    followUps: [
      {
        q: "Two weeks in you find a customer-facing feature that scores job candidates. What do you do?",
        a: "Treat it as the top tier: name the owner without shaming the team, and require an impact assessment, designed human oversight and independent review before it expands. Ask legal whether it falls under specific high-risk rules, and do not state a legal conclusion yourself.",
      },
      {
        q: "A vendor’s system card says the model is “state of the art on diverse users”. How do you treat it?",
        a: "As a red flag. Ask for numbers, which groups, the evaluation data and the out-of-scope uses, and test the model on your own data.",
      },
      {
        q: "How do you know the programme is working?",
        a: "Look at inventory coverage, time to approve by tier, the share of incidents caught by monitoring, drill results and audit samples, and not at the number of documents produced.",
      },
    ],
    mistakes: [
      "Starting with a long policy document nobody reads, instead of a list of systems.",
      "Treating NIST’s framework as a compliance checklist.",
      "Applying the same heavy review to every feature regardless of risk.",
      "Giving legal conclusions about what the company must do.",
    ],
  },

  'scraped-data-licence-and-copyright-check': {
    short:
      "Say plainly that this is a risk and timeline problem for counsel, not something to wave through or to rule on yourself, and that the law is unsettled. Split the question into input, model and output, challenge the sources (a web crawl is not a licence, robots.txt is a request, and a shadow library is the worst case), and check three licences: data, weights and code. Then offer a path that can ship, such as clean data or retrieval over documents you may use.",
    explain: [
      {
        heading: "Start with a hedge, then split the question",
        body: "This is an engineering view and not legal advice. As of 1 November 2026, courts in different countries have decided narrow cases differently and some decisions are on appeal, so nobody can promise an outcome, and legal questions go to counsel. The useful move is to break one scary question into three. Input: is copying works into a dataset and training on them allowed? Model: do the weights contain the works? Output: can the model reproduce them, and who owns what it makes? Each has a different answer and different evidence.",
      },
      {
        heading: "Challenge the sources",
        body: "A web crawl is not a licence, and the terms of a crawl dataset itself tell users to respect third-party copyright. The robots.txt file is a request and not an authorisation, although in the EU the form of an opt-out can matter, so honour it and log that you did. A shadow library is the weakest source: at least one US court treated books taken from such a source differently from lawfully acquired books. Two million pages and a set of such books is not a dataset to put into a commercial product without review.",
      },
      {
        heading: "Check three licences, plus memorisation and privacy",
        body: "Code, weights and data each have their own licence, at the exact version used. Data licences such as the Creative Commons NonCommercial, ShareAlike and NoDerivatives variants, ODbL and CDLA do not settle whether a trained model is an adaptation of its data, so that remains open. Read the base model’s licence for acceptable-use terms, size thresholds and naming rules, and any provider terms that bar training competing models on outputs. Connect the weights question to memorisation: remove duplicates, test whether the model can reproduce training text, and put any personal data through your privacy process.",
      },
      {
        heading: "A path that can ship, and handling the people side",
        body: "Keep a provenance record per dataset: source, licence or legal basis, date fetched, owner. Log opt-outs. Use licensed or openly licensed data, or use retrieval over documents you may use instead of training on them. Name an owner for the legal questions, and make it possible to answer “was this work in the training set?” for each model version. For general-purpose model providers in the EU, a copyright policy and a training-content summary are required. With the manager, frame it as risk and timeline: offer a smaller scope with clean data that can ship next month, record the decision, and if overruled escalate calmly rather than quietly going along or quietly going around.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "Pause the scrape", detail: "Do not train on it yet; keep the files, they are evidence of what you have." },
        { label: "Ask counsel", detail: "Input, model and output are three questions; counsel owns the answers." },
        { label: "Sort the sources", detail: "Crawl, shadow library, openly licensed, licensed and your own are different cases." },
        { label: "Check three licences", detail: "Data, base-model weights and code, at the exact versions." },
        { label: "Build provenance", detail: "Source, licence or basis, date, owner and opt-outs for each dataset." },
        { label: "Offer a shippable scope", detail: "Clean data or retrieval over documents you may use; record the decision." },
      ],
      caption: "The order protects the team: stop, ask, sort, check, record, then offer something that can ship.",
    },
    example: {
      title: "Example: spot-checking a large crawl",
      text: "You cannot read two million pages, but you can sample them. To estimate the share of pages carrying a notice that bars training, within a chosen margin, the sample size is 1.96 squared times 0.25 divided by the margin squared (the worst case, assuming half the pages carry the notice). The two margins below are worked with that formula.",
      rows: [
        { label: "Pages in the crawl", value: "2,000,000" },
        { label: "Sample for plus or minus 1 point", value: "1.96 x 1.96 x 0.25 / 0.01 / 0.01 = about 9,604 pages" },
        { label: "Sample for plus or minus 2 points", value: "1.96 x 1.96 x 0.25 / 0.02 / 0.02 = about 2,401 pages" },
        { label: "What a sample cannot do", value: "it estimates a share; it does not clear any single page or answer the legal question" },
        { label: "Provenance record per dataset", value: "source, licence or basis, date fetched, owner, opt-outs logged" },
      ],
    },
    followUps: [
      {
        q: "Legal clears the licensed subset. Do you still need to check the model’s own licence?",
        a: "Yes. Code, weights and data have separate licences, and the base model’s terms, its output-use rules and the provider’s terms apply on their own.",
      },
      {
        q: "A customer asks whether a particular book was in your training data. Can you answer?",
        a: "Only from provenance records kept per model version. The weights cannot reliably say, and membership inference (a test that guesses whether an item was in the training data) is weak evidence, which is why the records matter.",
      },
      {
        q: "The manager says competitors do the same. What now?",
        a: "That is not an argument about risk. Restate the exposure and the alternative, ask for a documented decision from the person who owns the risk, and escalate if needed.",
      },
    ],
    mistakes: [
      "Saying “it is on the internet, so it is fine”.",
      "Giving a confident legal opinion in either direction.",
      "Checking only the dataset licence and forgetting the weights, the code and the provider terms.",
      "Keeping no provenance record, so nobody can later say what went into which model.",
    ],
  },

  'differential-privacy-epsilon-intuition': {
    short:
      "Epsilon (written ε) is a dial for how much any one person can change the published answer: an algorithm is ε-differentially private if adding or removing one record changes the probability of any output by at most a factor of e^ε. Small ε means more noise and stronger privacy, and the budget is the total ε you are willing to spend across all answers. “We use ε = 1” does not say the data is safe until you also know what counts as one record, how many answers were released and whether the system was built correctly.",
    explain: [
      {
        heading: "What the definition means",
        body: "Take two datasets that differ by one person’s record. A randomised algorithm is ε-differentially private if, for every possible output, the probability of seeing it changes by at most a factor of e^ε between the two. So the answer barely depends on whether any one person is in the data, and that is the protection. Small ε means a strong guarantee and a lot of noise. Large ε means a weak guarantee and little noise. At ε = 1 the factor e^ε is about 2.7, and at ε = 10 it is about 22,026, so ε = 10 is not “ten times safer”, it is a vastly weaker promise.",
      },
      {
        heading: "A noisy count, worked out",
        body: "A count has sensitivity 1: adding or removing one person changes it by at most 1. The Laplace mechanism adds noise with scale 1/ε, so the expected error is 1/ε however large the dataset is. The chance the noisy answer lands within 1 of the truth is 1 minus e^(-ε): about 9.5% at ε = 0.1 (scale 10), 39% at ε = 0.5 (scale 2) and 63% at ε = 1. Now take the attacker’s view. They know everyone else’s data, see one noisy answer, and start with even odds on whether one person is included. Their best accuracy is 1 minus 0.5 times e^(-ε/2): about 52% at ε = 0.1, 61% at 0.5, 70% at 1 and 96% at 5.",
      },
      {
        heading: "The budget",
        body: "With simple composition the epsilons of separate answers add up, so ten answers at ε = 0.1 cost a total of 1. Asking the same question again spends more budget, and averaging 100 fresh answers cuts the noise tenfold but costs 100 times the ε, while a single answer at 10 times the ε gets the same tenfold reduction for 10 times the cost. A real system therefore needs accounting for the whole dataset and must refuse queries when the budget runs out. Epsilon alone is not enough to judge safety: the unit that counts as one record matters (a person with k records is protected at roughly kε), and implementation mistakes are common, which is why NIST SP 800-226 was written to help evaluate such claims.",
      },
      {
        heading: "Training, and what it is not",
        body: "DP-SGD trains a model by clipping each example’s gradient to a fixed size, adding noise, and tracking the total ε spent. It costs accuracy and compute, although reported results narrow the gap with large pre-trained models and tuned settings. Differential privacy is not redaction, and it is not unlearning: it keeps each person’s contribution small, not zero. It is not the same as federated learning either, because the updates in federated learning can leak and need secure aggregation and noise. Regulators judge anonymity case by case, so this gives no legal conclusion.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "epsilon",
      yLabel: "attacker accuracy in a one-person guessing game (percent)",
      points: [[0.1, 52.4], [0.5, 61.1], [1, 69.7], [2, 81.6], [3, 88.8], [5, 95.9]],
      marks: [{ x: 1, label: "ε = 1: about 70%" }],
      caption: "An attacker who knows everyone else starts at 50%. Accuracy is 1 minus 0.5 times e^(-ε/2). Small ε keeps the attacker near a coin flip.",
    },
    example: {
      title: "Example: a noisy count at three settings",
      text: "A count of people has sensitivity 1, so Laplace noise has scale 1/ε and expected error 1/ε. The chance of landing within 1 of the true count is 1 minus e^(-ε). Counts of 10,000 and of 20 behave differently, because the noise does not grow with the data.",
      rows: [
        { label: "ε = 0.1", value: "scale 10, within 1 of the truth 9.5% of the time" },
        { label: "ε = 0.5", value: "scale 2, within 1 about 39% of the time" },
        { label: "ε = 1", value: "scale 1, within 1 about 63% of the time; e^1 is 2.7" },
        { label: "Ten answers at ε = 0.1", value: "total budget 10 x 0.1 = 1" },
        { label: "100 fresh answers averaged at ε = 1 each", value: "noise down tenfold, budget 100" },
        { label: "Expected error as a share of a count of 20 or of 10,000", value: "about 5% at ε = 1 for 20; about 0.01% for 10,000" },
      ],
    },
    followUps: [
      {
        q: "The counts are around 10,000. Does ε = 1 noise matter?",
        a: "An expected error of about 1 on 10,000 is negligible relative to the count. Small groups suffer, though: the relative error on a small cell is large, which is also a fairness concern for small subgroups.",
      },
      {
        q: "Analysts run 500 queries a day against the dataset. What happens?",
        a: "The budget is spent very fast under composition. Options include per-analyst budgets, caching and reusing released answers, answering fewer aggregated queries, and refusing once the budget is exhausted.",
      },
      {
        q: "Is federated learning private by itself?",
        a: "No, because updates computed from private data can leak (gradients have been inverted in research). Add secure aggregation and differential privacy on the updates.",
      },
    ],
    mistakes: [
      "Saying differential privacy means the data is encrypted or anonymised.",
      "Thinking ε = 10 is ten times safer than ε = 1, when the guarantee gets far weaker.",
      "Ignoring composition and the budget, so the same question is answered again and again.",
      "Stating a legal conclusion about whether the data counts as anonymous.",
    ],
  },

  'licence-and-provenance-risk-in-generated-code': {
    short:
      "This is an engineering view and not legal advice: the law is unsettled, differs by country, and counsel decides the policy. The engineering risks are that generated code may resemble licensed code, that a licence can attach conditions such as attribution or sharing source, that ownership of purely generated output can be uncertain, and that tool terms govern what happens to your prompts. Put practical controls in now: approved tools, scans, human authorship and records of use, and take specific questions to counsel.",
    explain: [
      {
        heading: "The risks, and the ones that matter as much",
        body: "Generated code can resemble code that carries a licence. Some licences impose conditions when you distribute the result, such as attribution or sharing your own source code. Ownership and protection of output produced with little human input can be uncertain, and some assistants have terms about what they do with your prompts and code. Licence risk is only one risk of generated code. Security flaws, invented dependencies (packages that do not exist, or exist as a trap), secrets pasted into code and plain low quality matter equally, so a licence check is one control among several and not a substitute for review.",
      },
      {
        heading: "Controls a team can start now",
        body: "Use approved tools whose terms you have read. Turn on a similarity or licence scanner if the vendor or your organisation provides one, and run software-composition and licence scans on dependencies as you do for any code. Record which tools were used on which projects. Avoid pasting third-party code with unclear terms into prompts. Keep provenance: pull requests should record the tool used and what it was asked to do, and commits stay attributable to a human author who understands and stands behind the change. Code of unclear origin is rewritten or replaced, not kept.",
      },
      {
        heading: "Raise the bar where the stakes are higher",
        body: "Core algorithms, code that will be open-sourced, code customers will see and code under contract terms may need stricter rules than an internal script, such as no generated code in those areas or a second review. A tiered rule is easier to follow than a blanket ban or a blanket yes, and it gives counsel a concrete policy to review.",
      },
      {
        heading: "Questions for counsel",
        body: "What do the tool vendor’s terms promise and exclude, including any indemnity (read in the current terms, since they change)? What should the policy be for contributions to open-source projects, many of which have their own rules? What must be disclosed to customers? How is ownership treated in the markets where the product is sold? Bringing these as written questions, with the controls already in place, makes it easier for legal to give guidance quickly.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'tool', label: "Approved assistant", sub: "terms read, settings recorded" },
        { id: 'human', label: "Human author", sub: "reads, edits and understands it" },
        { id: 'scan', label: "Scans", sub: "similarity, licence, dependencies, secrets" },
        { id: 'tests', label: "Tests and review", sub: "security and quality checks" },
        { id: 'record', label: "Pull request record", sub: "tool used and intent noted" },
        { id: 'counsel', label: "Counsel’s policy", sub: "tiered rules for high-value code" },
      ],
      highlight: ['scan', 'counsel'],
      caption: "Licence checking is one gate in a path that also covers security and quality. Counsel sets the policy the path enforces.",
    },
    example: {
      title: "Example: a tiered rule a team could propose to counsel",
      text: "This is an illustrative engineering proposal, not a legal position. Counsel may accept, change or reject any line.",
      rows: [
        { label: "Internal scripts and tests", value: "approved tools allowed; normal review and dependency scan" },
        { label: "Customer-facing product code", value: "approved tools; similarity scan on; PR records the tool; human author owns it" },
        { label: "Core algorithms and code to be open-sourced", value: "no generated code unless counsel agrees; stricter review" },
        { label: "Code from a scanner flag", value: "do not ship on a guess; check, rewrite or replace with a licensed library" },
        { label: "Questions logged for counsel", value: "vendor terms and indemnity, open-source rules, customer disclosure, ownership by market" },
      ],
    },
    followUps: [
      {
        q: "A scanner flags a 20-line block as similar to a project under a copyleft licence. What do you do?",
        a: "Do not ship on a guess. Check the actual similarity and the licence terms, rewrite the block independently or replace it with a properly licensed library, and escalate to counsel if it is uncertain.",
      },
      {
        q: "You want to contribute AI-assisted code to an open-source project. What do you check?",
        a: "The project’s contribution and AI policies, licence compatibility, your employer’s rules, and that you can stand behind and explain the change.",
      },
      {
        q: "A vendor advertises indemnity for generated code. How much do you rely on it?",
        a: "Read the current terms for conditions and exclusions, such as settings that must be enabled or filters that must be on, and have counsel review them. Treat it as risk transfer and not as a reason to skip engineering controls.",
      },
    ],
    mistakes: [
      "Giving a confident legal conclusion in either direction.",
      "Ignoring licences because the code was machine generated.",
      "Relying on a vendor’s claim without reading the current terms.",
      "Treating licence risk as the only risk of generated code and skipping security and quality review.",
    ],
  },
};
