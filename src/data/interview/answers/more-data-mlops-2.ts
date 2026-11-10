import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'de-code-dedupe-exact-and-near-duplicates': {
    short:
      "Normalise each text (lower-case it, collapse spaces, strip footers), hash it with a stable hash such as SHA-256, and keep the first copy of each hash to remove exact duplicates. For near-duplicates, cut each text into overlapping three-word shingles and call two texts duplicates when their Jaccard similarity, the shared shingles divided by all distinct shingles, is above a threshold. Comparing every pair is impossible at 10 million documents, about 5 × 10^13 pairs, so use MinHash signatures with locality-sensitive hashing to find only likely pairs and then check those exactly. Choose the threshold by labelling a sample of candidate pairs and picking the point that balances the two kinds of mistake.",
    explain: [
      {
        heading: "The function, step by step",
        body: "dedupe(docs, threshold) works in stages, cheapest first. Normalise each text so that “Hello  World” and “hello world” match, and strip boilerplate such as footers and signatures, which would otherwise make unrelated documents look alike. Hash the normalised text with SHA-256 and keep one document per hash; choose which copy to keep by a fixed rule (the first, the newest, or the best quality, with ties broken by ID) so the result is the same on every run. Use hashlib, not Python's built-in hash(), because the built-in string hash is randomised in each process and a stored fingerprint would stop matching tomorrow. Then run the near-duplicate stage on what is left, and group the matches into clusters with union-find (a structure that merges items into groups). Keep one canonical document per cluster and record the cluster ID and the removed IDs, so you can explain why a document vanished and honour a deletion request later.",
      },
      {
        heading: "Shingles, Jaccard similarity and why length matters",
        body: "A shingle is a run of consecutive words, here three. “the cat sat on the mat” has four shingles: the cat sat, cat sat on, sat on the, on the mat. Jaccard similarity is the number of shingles two texts share divided by the number of distinct shingles in both. Add the word “today” and the second text has five shingles, four of them shared, so the similarity is 4 ÷ 5 = 0.8. The same one-word edit hurts less in a long text: on a 14-word text there are 12 shingles, the edit makes 13, and 12 ÷ 13 is about 0.92. So a single threshold means different things for short and long documents. A text with fewer than three words has no shingles at all, so fall back to exact matching for those.",
      },
      {
        heading: "Scaling to 10 million documents",
        body: "Checking every pair means 10,000,000 × 9,999,999 ÷ 2, about 5 × 10^13 comparisons. At an example speed of a million comparisons a second that is about 579 days. MinHash avoids it. For each document you compute a signature of 100 numbers, and the share of positions where two signatures match estimates their Jaccard similarity. At 4 bytes per number that is 400 bytes per document, about 4 GB in total, which fits on one machine or is easy to spread over many. Locality-sensitive hashing (LSH) then splits each signature into bands, say 20 bands of 5 numbers, and treats two documents as a candidate pair only if they match completely in at least one band. A pair with similarity s becomes a candidate with probability 1 - (1 - s^5)^20. Finally compute the exact Jaccard score for each candidate, so false candidates are dropped.",
      },
      {
        heading: "Choosing the threshold, and proving it works",
        body: "Duplicates matter because they skew training towards the repeated text, raise the chance the model memorises it, fill the top of search results with copies, and, when copies sit on both sides of a train and test split, inflate the test score. To choose the threshold, label a sample of candidate pairs as “same” or “different”, compute precision (of the pairs you removed, how many were real duplicates) and recall (of the real duplicates, how many you removed) at each threshold, and pick for the cost of each mistake. Check again per document type, because lengths and boilerplate differ. To test the function, plant known duplicates and near-duplicates in a sample, confirm they are found at the chosen threshold, and confirm that shuffling the input gives the same set of survivors.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "Jaccard similarity of the pair",
      yLabel: "Chance the pair becomes a candidate (%)",
      points: [
        [0.1, 0.02],
        [0.2, 0.64],
        [0.3, 4.75],
        [0.4, 18.6],
        [0.5, 47.0],
        [0.6, 80.2],
        [0.7, 97.5],
        [0.8, 99.96],
      ],
      marks: [
        { x: 0.2, label: "0.2: 0.6%" },
        { x: 0.5, label: "0.5: 47%" },
        { x: 0.8, label: "0.8: 99.96%" },
      ],
      caption: "With 20 bands of 5 numbers, the chance climbs steeply around a similarity of 0.55. Weak pairs are almost never compared and strong pairs almost always are.",
    },
    example: {
      title: "Example: the numbers behind the design",
      text: "These come straight from the arithmetic above. The banding curve is 1 - (1 - s^5)^20, and its steep part sits near (1 ÷ 20)^(1 ÷ 5), about 0.55, which is why a threshold near 0.8 is caught almost surely.",
      rows: [
        { label: "Shingles in the cat sat text", value: "4, and 5 with “today” added" },
        { label: "Jaccard similarity of those two", value: "4 ÷ 5 = 0.8" },
        { label: "14-word text plus one word", value: "12 ÷ 13, about 0.92" },
        { label: "All pairs for 10 million documents", value: "about 5 × 10^13" },
        { label: "Signature storage", value: "100 × 4 bytes × 10 million = 4 GB" },
        { label: "Candidate chance at 0.2, 0.5, 0.8", value: "0.6%, 47%, 99.96%" },
      ],
    },
    followUps: [
      {
        q: "Two price lists differ in one number, 100 became 1,000, and score 0.92. Should they be merged?",
        a: "Not automatically, because high similarity is not the same as equivalence: a few tokens can change the meaning. Keep the newest by version metadata or compare the key fields, and decide by use case rather than by the threshold alone.",
      },
      {
        q: "How do you choose the threshold?",
        a: "Label a sample of candidate pairs as same or different, plot precision and recall for each threshold, and pick the point that fits the cost of each mistake. Repeat per document type, since lengths and boilerplate differ.",
      },
      {
        q: "You dedupe the training set after splitting. What can still go wrong?",
        a: "Near-duplicates across the split leak test content into training and inflate the score. Deduplicate before splitting, or remove from the training side anything similar to a test document.",
      },
    ],
    mistakes: [
      "Comparing every pair of documents. It does not scale, and MinHash with banding exists for exactly this.",
      "Removing only exact matches and calling it deduplication, when copies with a changed date or footer pass straight through.",
      "Using Python's built-in hash() for stored fingerprints. It is randomised per process, so use SHA-256 or another stable hash.",
      "Picking the threshold by feel and never measuring precision and recall on labelled pairs.",
    ],
  },

  'de-batch-or-streaming-for-rag-freshness': {
    short:
      "Choose by how stale an answer can be before it does harm, not by what is technically possible: micro-batches every 15 minutes or so for the policy wiki, an hourly batch for tickets, and a nightly batch for contracts. At 200,000 tickets a day the load is only about 2.3 a second, so volume alone does not call for a streaming platform. Detect change so unchanged documents are never embedded again, write with stable IDs so retries are safe, and treat permission changes and deletions on a faster path than content edits. Promise a number, then measure the age of the newest indexed item per source and alert when it breaks the promise.",
    explain: [
      {
        heading: "Start from the cost of a stale answer",
        body: "Ask what happens when the assistant is wrong because the index is old. A policy changed this morning and the assistant quotes yesterday's rule: that is costly, so promise minutes. A ticket from an hour ago missing from search is a mild annoyance, so an hour is fine. A contract changes rarely and slowly, so nightly is fine. Then work out the worst-case staleness honestly. It is the interval plus the processing time. A 15-minute micro-batch (a small batch run on a short schedule) that takes up to 5 minutes to parse, embed and index can serve data up to 20 minutes old, so the promise is “within 20 minutes”, not “within 15”.",
      },
      {
        heading: "Size the load before picking the tool",
        body: "There are 86,400 seconds in a day, so 200,000 tickets a day is 200,000 ÷ 86,400, about 2.3 a second. Even at 10 times that in a busy hour, about 23 a second, a small scheduled job handles it. The wiki's few hundred edits a day are less than one every few minutes. Streaming (processing each event as it arrives) costs more to build, run and debug than batch, so it has to earn its place with a freshness need that a micro-batch cannot meet. Here none of the three sources needs it.",
      },
      {
        heading: "Do less work, and do it safely",
        body: "Detect change instead of re-reading everything: use a modified timestamp, an ETag (a version tag from the source), or a change data capture feed (a stream of the source database's changes), plus a content hash so a document that was only re-saved is skipped. That saves parsing time and embedding cost. Give every chunk a stable ID made of the document ID, the chunk position and the content hash, so a retry or a replay upserts (updates or inserts) rather than duplicating. Coalesce a document edited 50 times in 10 minutes into one update. Put work on a queue so you respect the embedding rate limit, retry with backoff, and send repeated failures to a dead-letter store with the reason. Permissions are different from content: a revoked access must take effect in minutes, so sync access lists on a short interval or check them at query time.",
      },
      {
        heading: "Measure freshness like any other service level",
        body: "Make freshness a metric: for each source, the age of the newest indexed item compared with the source of truth, graphed and alerted against the promise. Inject a canary document with a known edit and check that the answer changes end to end. Show “last updated” or the document version in answers where it matters. Then keep the design as simple as it can be while meeting each promise, and say so: simple jobs are easier to run at 3 a.m.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Policy wiki", "Tickets", "Contracts"],
      rows: [
        { label: "How it changes", cells: ["a few hundred edits a day", "about 200,000 new a day, about 2.3 a second", "rarely"] },
        { label: "Pattern", cells: ["micro-batch every 15 minutes", "hourly batch", "nightly batch"] },
        { label: "Worst-case staleness", cells: ["15 + up to 5 = 20 minutes", "60 + up to 15 = 75 minutes", "about a day plus the run"] },
        { label: "Why this is enough", cells: ["a stale policy answer is costly", "tickets are only mildly time-sensitive", "content hardly moves"] },
        { label: "Access changes", cells: ["synced every few minutes", "synced every few minutes", "synced every few minutes"] },
      ],
      caption: "Each source gets the simplest pattern that keeps its promise. Access changes are on a faster path for all three.",
    },
    example: {
      title: "Example: why change detection saves money",
      text: "All prices here are round illustrative numbers. Assume a ticket is about 400 tokens and embedding costs $0.10 per million tokens (example). New tickets cost $8 a day. Re-embedding a whole archive of 20 million tickets each night would cost $800 a night, 100 times as much, to rediscover that nearly everything is unchanged.",
      rows: [
        { label: "New tickets a day, in tokens", value: "200,000 × 400 = 80 million" },
        { label: "Embedding cost of new tickets (example)", value: "80 × $0.10 = $8 a day" },
        { label: "Whole archive of 20 million tickets", value: "8 billion tokens, $800 a run" },
        { label: "Average ticket rate", value: "200,000 ÷ 86,400, about 2.3 a second" },
        { label: "At 10 times that", value: "about 23 a second" },
      ],
    },
    followUps: [
      {
        q: "The embedding API starts rejecting requests for 40 minutes. What happens to your pipeline and your freshness promise?",
        a: "Items queue and retry with backoff, the freshness metric rises and alerts, and the index keeps serving older data rather than failing. When the API returns, the queue is replayed, and a second provider is only worth adding if the promise needs it.",
      },
      {
        q: "A user is removed from a group at 10:00 and should lose access to documents indexed from that group's folder. How quickly does your design reflect that?",
        a: "Permissions are kept separate from content, either read from the source of truth at query time or synced on a short interval, so access is removed within minutes. A nightly batch is not good enough for a revocation.",
      },
      {
        q: "How would you prove to the business that the answers reflect last week's policy change?",
        a: "Inject a canary document with a known edit and check it end to end, graph the freshness lag per source, and show the document version or date in answers. The test runs continuously, not once.",
      },
    ],
    mistakes: [
      "Picking streaming for everything because it sounds modern, then paying for complexity no source needs.",
      "Being unable to say how stale the index can be, or how you would know.",
      "Re-embedding the whole corpus on every run instead of detecting change.",
      "Treating a permission change like a content change and waiting for the next batch.",
    ],
  },

  'de-labelling-pipeline-throughput-and-quality': {
    short:
      "Estimate first: 24,000 messages at 2.5 minutes each is 1,000 hours, double-labelling 15% adds 150 hours and adjudicating disagreements adds about 45, so roughly 1,200 hours, or about four weeks for ten labellers (example figures). Write versioned guidelines with examples before starting, and store every label with who made it, when, and under which guideline version. Check quality with planted gold items, overlap items scored with Cohen's kappa, and a senior person who settles disagreements, then fix the guideline and relabel. A model can pre-label to save time, but people anchor on its suggestions, so score any model labeller against a human gold sample for each class and never evaluate a model on labels it wrote.",
    explain: [
      {
        heading: "The effort estimate",
        body: "Start with the plain multiplication: 24,000 × 2.5 minutes is 60,000 minutes, which is 1,000 hours. Two people label 15% of the items, which is 3,600 messages, and the second pass costs 3,600 × 2.5 minutes, another 150 hours. Suppose 15% of those overlap items get different labels, which is 540, and a senior person needs 5 minutes for each: 540 × 5 minutes is 45 hours. The total is 1,195 hours. If ten labellers each give 30 hours a week, that is 300 hours a week, so about 4 weeks (1,195 ÷ 300 is about 3.98). All of these inputs are examples, so measure the real time per label on a pilot of a few hundred items, and add time for training people and for the guideline to settle.",
      },
      {
        heading: "Guidelines and the parts of the pipeline",
        body: "Write the guideline before labelling starts, with examples, including the borderline cases that cause arguments. Version it and store the guideline version beside every label. The pipeline needs an item queue that assigns work, a labelling tool, a label store that keeps who, when and which guideline, and a channel for questions that turns answers into guideline updates. Without that last part, ten labellers quietly invent ten rules.",
      },
      {
        heading: "Measuring quality and choosing what to label",
        body: "Use three checks. Gold items are messages with known answers planted in each person's queue, which show who is drifting. Overlap items are labelled by two people, and agreement is measured with Cohen's kappa, which is the agreement beyond what chance alone would give: (observed agreement minus chance agreement) divided by (1 minus chance agreement). Adjudication means a senior person decides each disagreement. Read the disagreements, improve the guideline, then relabel the affected items. Choose what to label on purpose. A random sample gives an unbiased evaluation set. For training, picking the items the model is most unsure about (active selection) finds more value per label, but never evaluate on actively selected items, because they are not typical.",
      },
      {
        heading: "Where a model helps, where it hurts, and protecting people",
        body: "A model can pre-label items so people only correct them, which speeds up easy cases. The risks are anchoring (people accept the suggestion without thinking) and circularity (a model graded on labels it wrote measures agreement with itself). Label a human gold sample, score the model on each class separately because overall agreement hides rare classes, keep humans on items where the model is unsure, and re-check whenever the model version changes. Redact personal data before items reach labellers, limit who can see what, and rotate hard or distressing content among people with support available.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "hours",
      items: [
        { label: "First pass: 24,000 × 2.5 min", value: 1000 },
        { label: "Second label on 15% overlap", value: 150, note: "3,600 items" },
        { label: "Adjudicating 540 disagreements", value: 45, note: "5 minutes each", hot: true },
      ],
      caption: "Example effort: about 1,195 hours in total. Quality checks add roughly 20% on top of the basic labelling.",
    },
    example: {
      title: "Example: how 1,195 hours adds up and what it means",
      text: "All inputs are examples. The overlap costs 195 hours, which is about 20% of the first pass (195 ÷ 1,000 = 19.5%). That is the price of knowing whether the labels can be trusted, and it is cheap compared with training on labels nobody checked.",
      rows: [
        { label: "First pass", value: "24,000 × 2.5 min = 1,000 hours" },
        { label: "Overlap items (15%)", value: "3,600 items, 150 hours" },
        { label: "Disagreements (15% of 3,600)", value: "540 items, 45 hours" },
        { label: "Total", value: "1,195 hours" },
        { label: "Ten people at 30 hours a week", value: "300 hours a week, about 4 weeks" },
      ],
    },
    followUps: [
      {
        q: "Two labellers agree on 80% of items. Is that good enough?",
        a: "Not by itself, because chance agreement depends on class balance. If each marks 30% of messages as urgent, chance alone gives 0.3 × 0.3 + 0.7 × 0.7 = 58% agreement, so kappa is (0.80 - 0.58) ÷ 0.42, about 0.52. Look at disagreement per class and at the guideline before relabelling.",
      },
      {
        q: "Halfway through, the product team changes the definition of “urgent”. What happens to the labels you have?",
        a: "Version the guideline, decide which items need relabelling, and keep the old labels with their version. Do not mix two definitions silently in one training set.",
      },
      {
        q: "An LLM could pre-label everything for a tenth of the cost. How do you decide whether to use it?",
        a: "Label a gold sample by hand (200 or more items), score the model per class, and keep humans on uncertain items and on disagreements. Check terms and privacy before sending text to an outside API, and treat a published result for one model and task as a reason to test, not a guarantee.",
      },
    ],
    mistakes: [
      "Tracking only how many labels are done and having no measure of label quality.",
      "Evaluating a model on labels that the same model produced.",
      "Changing the labelling rules midway with no versioning, so nobody knows which labels follow which rule.",
      "Sending raw personal data to labellers or to an outside model without checking.",
    ],
  },

  'de-pii-handling-in-training-and-rag-pipelines': {
    short:
      "Treat personal data as a lifecycle: ask whether you need it at all, then detect it, redact it before it reaches logs, indexes, training sets and outside APIs, limit who sees what remains, keep it only as long as needed, and be able to delete it. Detection uses patterns for emails, phone numbers and card numbers plus a named-entity model for names and places, and it will miss some, so you measure its recall on a hand-labelled sample. With 2% of a million records that is 20,000 records a day, and 95% recall lets about 1,000 of them slip through while 99% lets about 200 through. Because some misses are certain, add layers of defence and keys that let you find and delete one person's data later; this is engineering guidance, not legal advice.",
    explain: [
      {
        heading: "Collect less, then detect",
        body: "The cheapest personal data to protect is data you never ingest, so first ask whether the use case needs the personal fields. A support classifier rarely needs a customer's email address. For what remains, combine detectors. Patterns (regular expressions) catch emails, phone numbers and card numbers well. A named-entity model, which is a classifier that tags names, places and organisations in text, handles names. A detector is a model, so it makes mistakes: recall is the share of real personal data it finds, and precision is the share of its flags that are right. Measure both on a hand-labelled sample. Low precision matters too, because redacting ordinary words damages the text that your model and your search depend on.",
      },
      {
        heading: "The arithmetic of misses",
        body: "2% of 1,000,000 records is 20,000 records a day with personal data. At 95% recall the detector misses 5% of them, which is 1,000 records a day. At 99% it misses 200 a day, and at 99.9% it misses 20. Over a year, 1,000 a day is 365,000 leaked records. Whether any of these rates is acceptable depends on how sensitive the data is and where it ends up: a miss in a private, access-controlled store is a different matter from a miss in a training set shared with a vendor.",
      },
      {
        heading: "Redact early and layer the defences",
        body: "Redact before the data reaches logs, vector indexes, training sets and any third-party API, replacing each item with a typed placeholder such as [PERSON_1], so the text still reads sensibly. If you need to restore the original, keep that mapping in a separate store with its own access control. Because misses are certain, add layers: sensitivity tiers, limited access, short retention on raw data, regular audits where people read a sample of the “clean” output, and tests with planted fake identifiers that must never appear downstream.",
      },
      {
        heading: "Deletion, pseudonyms and the legal side",
        body: "Design for deletion from the start. Give records and people stable keys, and keep lineage (a record of where data came from and went to) from raw records to derived tables, embeddings, caches, evaluation sets and training snapshots, with a process that reaches each one. Removing one person's data from a trained model is hard, so keep data that may need deletion out of the weights where you can. Pseudonymised data, where names are swapped for codes, can still count as personal data if it can be linked back to someone. Rules and permitted purposes differ by region and contract, so bring in privacy and legal staff and treat this answer as engineering input rather than legal advice.",
      },
    ],
    diagram: {
      kind: 'layers',
      layers: [
        { label: "1. Collect less", sub: "Drop fields the use case does not need" },
        { label: "2. Detect", sub: "Patterns plus a named-entity model, with recall measured on a labelled sample" },
        { label: "3. Redact early", sub: "Typed placeholders before logs, indexes, training sets and outside APIs" },
        { label: "4. Limit and expire", sub: "Access tiers, short retention for raw data, restore mapping kept apart" },
        { label: "5. Audit the misses", sub: "Read samples of clean output, plant fake identifiers" },
        { label: "6. Delete on request", sub: "Stable keys and lineage to every copy" },
      ],
      caption: "Each layer assumes the one above it will sometimes fail. The detector is not the only protection.",
    },
    example: {
      title: "Example: what recall means in records a day",
      text: "The 2% rate and the recall levels are example figures, so measure your own. The point is that a small-sounding miss rate is a large number of people at this volume.",
      rows: [
        { label: "Records with personal data", value: "2% of 1,000,000 = 20,000 a day" },
        { label: "Missed at 95% recall", value: "1,000 a day, 365,000 a year" },
        { label: "Missed at 98% recall", value: "400 a day" },
        { label: "Missed at 99% recall", value: "200 a day" },
        { label: "Missed at 99.9% recall", value: "20 a day" },
      ],
    },
    followUps: [
      {
        q: "A user asks for deletion. Where may their data still exist?",
        a: "The raw store, staged and derived tables, feature tables, the vector index and its metadata, caches, logs and traces, evaluation sets, training snapshots, backups, and any model trained on it. State which are deleted at once and which on a schedule.",
      },
      {
        q: "The detector misses names written in lower case in chat messages. How do you find and fix that?",
        a: "Sample the outputs and audit them by hand, add that slice to the labelled set, improve or add rules, and re-measure recall. Keep the audit running, because detector quality is ongoing evaluation, not a one-off.",
      },
      {
        q: "Should the fine-tuning data keep real names to help the model with customer-name tasks?",
        a: "Generally no: use placeholders or synthetic names, because real names raise memorisation and deletion risk without being needed for the task. If they are truly needed, justify it, restrict access, and test for extraction.",
      },
    ],
    mistakes: [
      "Assuming the detector is perfect, or never measuring its recall.",
      "Redacting only the model prompt while logs and indexes keep the raw text.",
      "Having no way to find where one person's data lives, so a deletion request becomes a scramble.",
      "Putting personal data into training data without asking whether it is needed.",
    ],
  },

  'de-reproducible-datasets-and-stable-splits': {
    short:
      "Freeze every training set as an immutable snapshot with a manifest that records its source tables and versions, the code commit, the time range, row counts and checksums. Assign each row to train or test with a deterministic function of a stable key, for example SHA-256 of the customer ID mod 100 below 80 for train, so a customer stays on the same side as the data grows, and split by the entity that can leak, never by row. Keep the test set frozen between model versions, and record dataset version, split rule and code commit in the model registry entry. Then diagnose 0.91 against 0.88 by diffing the two dataset versions and scoring both models on the same frozen test set.",
    explain: [
      {
        heading: "Snapshots and a manifest",
        body: "A table that grows every night is a moving target, so training should read a frozen copy: an immutable snapshot, or a table-format version that supports time travel (reading the table as it was at an earlier moment). Beside it keep a manifest, a small record of what went in: the source tables and their versions, the query or code commit, the time range, the row counts and checksums, and the feature definitions used. With that, “which data trained last month's model” is a lookup, not an investigation.",
      },
      {
        heading: "Stable splits that do not leak",
        body: "A random split in each run moves rows between train and test, so scores from different runs are not comparable. Instead, pick a stable key such as the customer ID and compute hash(key) mod 100. A value below 80 goes to train and the rest to test. The same customer always gets the same answer as the table grows. Use a stable hash such as SHA-256: Python's built-in string hash is randomised per process, so a split built on it changes between runs. Split by the entity that can leak. If a customer has 40 rows and you split by row, the chance that all 40 land on one side is 0.8^40 + 0.2^40, about 0.013%, so about 99.987% of such customers appear on both sides and the model is tested on people it trained on. For forecasting or anything involving time, hold out the most recent period instead.",
      },
      {
        heading: "A frozen test set and a registry entry",
        body: "Keep the test set frozen between model versions so that scores can be compared. Refresh it deliberately, on a schedule, and give the new set a new name, so nobody compares a score on one set with a score on another. Remove near-duplicates across the split too, since a copy of a test row in the training data leaks the answer. In the model registry entry for each run record the dataset version, the split rule, the code commit and the settings, so “reproduce last month's model” is a lookup plus a re-run.",
      },
      {
        heading: "Finding out why 0.91 became 0.88",
        body: "First check that the two scores were measured on the same test set, because if each month used a new random split the numbers were never comparable. Then separate the causes. Diff the two dataset versions: schema, row counts, label rate and feature distributions. Score both models on the same frozen test set. If the old model still gets 0.91 there and the new one gets 0.88, the model or its training data changed. If both score about the same, the earlier gap came from the test data. One tension to plan for is that an immutable snapshot may hold data that must be deleted on request, so agree retention and rebuild rules with privacy staff.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'raw', label: "Growing tables", sub: "change every night" },
        { id: 'snap', label: "Frozen snapshot", sub: "with a manifest and checksums" },
        { id: 'split', label: "Split by hash of customer ID", sub: "mod 100 below 80 is train" },
        { id: 'sets', label: "Train set and frozen test set", sub: "no customer on both sides" },
        { id: 'reg', label: "Registry entry", sub: "dataset version, split rule, code commit" },
      ],
      highlight: ['split'],
      caption: "Each step is deterministic and recorded, so a run can be repeated and two runs can be compared.",
    },
    example: {
      title: "Example: a hash split in practice",
      text: "Take the customer IDs cust-1001 to cust-1012. Their SHA-256 hash mod 100 gives 9, 65, 63, 57, 12, 36, 56, 89, 74, 44, 48 and 83. Only cust-1008 (89) and cust-1012 (83) are 80 or above, so they are the test customers, and they stay there every night. With a split by customer, none of the 40 rows of any customer can sit on both sides.",
      rows: [
        { label: "Rule", value: "SHA-256(customer ID) mod 100 below 80 is train" },
        { label: "cust-1001", value: "9, train" },
        { label: "cust-1008", value: "89, test" },
        { label: "cust-1012", value: "83, test" },
        { label: "40-row customer split by row, on both sides", value: "1 - 0.8^40 - 0.2^40, about 99.987%" },
      ],
    },
    followUps: [
      {
        q: "A customer appears in 40 rows. You split by row. What is wrong?",
        a: "Rows of the same customer land in both train and test, so the model can recognise the customer and the score is inflated. Split by customer, and check that no key appears on both sides.",
      },
      {
        q: "The test set has been frozen for a year and the product has changed. What do you do?",
        a: "A frozen set protects comparability but it ages. Add a fresh set sampled from recent data, keep the old one for the trend, and report both, rather than quietly swapping the test set and comparing with old numbers.",
      },
      {
        q: "How would you prove that two runs used identical data?",
        a: "Compare the snapshot IDs and checksums in the manifest, the row counts, and a hash of the sorted keys in each split, and record them with the run. Equal scores do not prove equal data.",
      },
    ],
    mistakes: [
      "Re-splitting at random every run and then comparing the scores.",
      "Building the split on a hash function that changes between processes.",
      "Being unable to say which data a past model was trained on.",
      "Letting the same customer, patient or document group appear on both sides of the split.",
    ],
  },

  'detection-and-logging-for-an-llm-app': {
    short:
      "Log metadata for every request (who, when, which model and prompt version, token counts, each tool call and its outcome, guardrail decisions) and keep the text of prompts and outputs off or redacted by default, with full traces kept only for the runs that matter. Alert on signals tied to harm, such as a tool call to a new outside host or one user hitting guardrails again and again, and on combinations rather than single flags. The base rate makes single flags useless: a rule that wrongly flags 0.1% of about 2 million requests raises about 2,000 false alarms a day while catching 36 of the 40 attacks, so only about 1.8% of alerts are real. Resolve the tension with privacy by minimising and redacting before storage, setting short retention, controlling access, and writing down the purpose of the log store.",
    explain: [
      {
        heading: "What to log, and what to keep out",
        body: "For every request, record the timestamp, tenant and user ID, model and prompt version, token counts, latency, each tool call with the shape of its arguments (which fields, not their values) and its outcome, and every guardrail decision and refusal. That is enough to reconstruct what the system did without storing what customers said. Treat the content of prompts, completions and tool results as sensitive: off or redacted by default, with a retention period, restricted access and a record of who opened it. Also record what is not kept, so that a gap in the data is not mistaken for proof that nothing happened.",
      },
      {
        heading: "Keep full traces for the runs that matter, and watch the right signals",
        body: "Sampling decides which traces you keep. Head sampling chooses at the start of a request, so it can throw away every failed run. Tail sampling decides after the run ends, so you always keep traces with errors, guardrail blocks, negative feedback or unusual tool calls, and sample the rest. For alerts choose signals tied to harm: a tool call to a new external recipient or host, many guardrail hits from one user, retrieval that returns a document belonging to another tenant, spikes in output length or spend, near-duplicate systematic queries that look like someone copying the model (model extraction), and sudden changes in the refusal rate.",
      },
      {
        heading: "The base-rate sum",
        body: "Assume 40 real attacks among 2,000,000 requests, which leaves 1,999,960 normal ones. A rule that wrongly flags 0.1% of normal requests raises 1,999,960 × 0.001, about 2,000 false alarms a day. The same rule catches 90% of the attacks, which is 36. So the alerts hold 36 real ones among about 2,036, and only 36 ÷ 2,036, about 1.8%, are real. A person cannot review 2,000 alerts a day, and after a week of nothing real they will stop looking. A precise-sounding rule can still be a bad alert.",
      },
      {
        heading: "Make alerts usable, and settle it with privacy",
        body: "Aggregate by user and session, and alert on a pattern, such as several guardrail hits followed by an outbound tool call, rather than on each flag. Rank alerts by consequence, give every alert a playbook (what it means and what to do), and measure precision and time to triage. With privacy and legal staff, agree data minimisation, redaction before storage, short retention with a longer period only for flagged traces, access control with an audit trail, and a written purpose for the log store. A log is a data store, so it carries the same duties as any other.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "alerts a day",
      items: [
        { label: "False alarms (normal requests flagged)", value: 2000, hot: true },
        { label: "Real attacks caught", value: 36 },
        { label: "Real attacks missed", value: 4 },
      ],
      caption: "Example: 2 million requests a day, 40 real attacks, a rule that catches 90% and wrongly flags 0.1%. The real attacks are lost among the false alarms.",
    },
    example: {
      title: "Example: the same rule on a quieter day",
      text: "The numbers are assumptions for illustration. The rule does not change, but the experience of using it does, because the number of real attacks changes while the false alarms do not.",
      rows: [
        { label: "40 attacks: caught", value: "90% of 40 = 36" },
        { label: "40 attacks: false alarms", value: "0.1% of 1,999,960, about 2,000" },
        { label: "40 attacks: share of alerts that are real", value: "36 ÷ 2,036, about 1.8%" },
        { label: "20 attacks: caught", value: "90% of 20 = 18" },
        { label: "20 attacks: share of alerts that are real", value: "18 ÷ 2,018, about 0.9%" },
      ],
    },
    followUps: [
      {
        q: "A customer asks you to delete their data. What happens to the traces?",
        a: "Traces are a store in the deletion path, so you need to find a person's traces by ID, delete or redact them, and keep only the minimum record needed. Short retention makes this much easier.",
      },
      {
        q: "How do you test that detection works?",
        a: "Replay the adversarial evaluation set and planted red-team cases through the live pipeline and check that alerts fire, track recall on known cases and the false-positive rate on sampled normal traffic, and rerun after every rule change.",
      },
      {
        q: "Attack attempts fall from 40 to 20 a day. What happens to alert quality?",
        a: "At 90% recall you catch 18 attacks against the same 2,000 or so false alarms, so precision falls to about 0.9% (18 ÷ 2,018). It is the same rule with a worse experience, because the base rate decides, which is why you alert on combinations rather than single flags.",
      },
    ],
    mistakes: [
      "Logging every prompt and response in full, forever, to be safe. It creates a large store of sensitive data.",
      "Logging nothing about content or behaviour, so there is nothing to investigate when something goes wrong.",
      "Alerting on every classifier hit with no aggregation, which buries the real attacks.",
      "Having no playbook, so nobody knows what an alert means or what to do.",
    ],
  },

  'canary-sample-size-for-bad-rate': {
    short:
      "For a two-sided 5% test with 80% power, the cases needed per group are about 2 × p × (1 - p) × (1.96 + 0.84)² divided by the squared difference in rates, where p is the average of the two rates. A rise from 4% to 5% needs about 6,700 per group, 4% to 6% about 1,860, and 4% to 8% about 550. A 5% canary of 3,000 requests an hour sees only 150 an hour, so the one-point rise takes about 45 hours and the four-point rise under 4 hours. A canary therefore catches big regressions within hours but not small ones, so compare it with a concurrent control group, fix the plan before you start, and do not peek.",
    explain: [
      {
        heading: "The formula and what it says",
        body: "Two settings define the test. A 5% false-alarm level means that if nothing changed you would still raise an alarm 5% of the time. 80% power means that if the rate really rose, you would detect it 80% of the time. For a two-sided test these give the numbers 1.96 and 0.84, and the cases per group are about 2 × p × (1 - p) × (1.96 + 0.84)² ÷ (difference)², with p the average of the two rates. For 4% to 5%, p is 0.045, so 2 × 0.045 × 0.955 = 0.08595, times 7.84 is 0.674, divided by 0.01² gives about 6,738. For 4% to 8%, p is 0.06, so 2 × 0.06 × 0.94 × 7.84 ÷ 0.04² is about 553. The rise is four times smaller in the first case, but it needs about 12 times more cases. The difference is squared in the formula, so halving the effect you want to see needs about four times the data.",
      },
      {
        heading: "Turning cases into hours",
        body: "The canary gets 5% of 3,000 requests an hour, which is 150 an hour, assuming each request is one case. That arm is the bottleneck, because the control arm gets 2,850 an hour and is much bigger. 6,738 ÷ 150 is about 45 hours for the one-point rise. 1,862 ÷ 150 is about 12.4 hours for two points. 553 ÷ 150 is about 3.7 hours for four points. At a 10% canary, which is 300 requests an hour, those become about 22 hours, 6.2 hours and 1.8 hours.",
      },
      {
        heading: "What this means for the rollout",
        body: "A big regression shows up in hours and a one-point one needs days, so a canary protects against large mistakes while a planned A/B test, sized beforehand, measures small effects. Run it for at least a full weekly cycle, because day-of-week and novelty effects (early excitement or confusion that fades) can mislead. Compare the canary with a concurrent control group, not with the global average: a 5% canary running 4 points worse moves the overall rate by only 0.05 × 4 = 0.2 points, which disappears in normal noise.",
      },
      {
        heading: "Peeking, late labels and rollback",
        body: "If you check every hour and stop at the first p below 0.05, you give the noise many chances to look like a signal. In a quick simulation of this very setup (no real difference, 48 hourly looks) about a third of runs were flagged, instead of 5%. So pre-set a stricter threshold for each look or a sequential rule, decide the run length and metrics beforehand, add guardrail metrics such as latency and errors, ramp in steps, and run an A/A test (two identical groups) to check that the experiment system itself does not produce false alarms. When labels arrive late, use fast proxies in the canary, such as flag rate, latency and output validity, and treat the slow outcome as a later check. Keep rollback to a one-line alias change and practise it.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "True bad-outcome rate in the canary (%), against 4% in control",
      yLabel: "Cases needed per group",
      points: [
        [5, 6738],
        [6, 1862],
        [7, 906],
        [8, 553],
        [9, 381],
        [10, 284],
      ],
      marks: [
        { x: 5, label: "5%: about 6,700" },
        { x: 8, label: "8%: about 550" },
      ],
      caption: "Small differences are expensive to detect. Going from an 8% rate to a 5% rate multiplies the cases needed by about 12.",
    },
    example: {
      title: "Example: how long the canary has to run",
      text: "Assumptions: each request is one case, the canary arm is the bottleneck, and the rates are the ones in the question. Hours are the cases needed divided by the requests the canary sees per hour.",
      rows: [
        { label: "4% to 5%, cases per group", value: "about 6,738" },
        { label: "4% to 5%, at 150 an hour (5%)", value: "about 45 hours; at 300 an hour (10%) about 22 hours" },
        { label: "4% to 6%, cases per group", value: "about 1,862, about 12.4 hours at 5%" },
        { label: "4% to 8%, cases per group", value: "about 553, about 3.7 hours at 5%, 1.8 hours at 10%" },
        { label: "Effect on the overall rate of a 5% canary 4 points worse", value: "0.05 × 4 = 0.2 points" },
      ],
    },
    followUps: [
      {
        q: "You check hourly and stop at the first p below 0.05. What is wrong with that?",
        a: "Repeated looks inflate the false-positive rate well above 5%. Use a stricter threshold for each look or a sequential method, or act only on large effects, and fix the plan before starting.",
      },
      {
        q: "Outcome labels arrive after 30 days. How do you gate a rollout?",
        a: "Use a shadow comparison against known outcomes, fast proxy metrics, a delay between training data and test data, a staged ramp with caps and rollback criteria, and a later check on mature labels.",
      },
      {
        q: "Which release strategy for which fear?",
        a: "Shadow mode when you fear crashes or latency, since nobody is exposed but you cannot see user reaction. Canary when you fear harm users would feel, and an A/B test when you need the business effect, sized beforehand and after a canary has shown it is safe.",
      },
    ],
    mistakes: [
      "Comparing the canary with the global average instead of a concurrent control group.",
      "Thinking a few hundred requests settle a one-point change, when it takes thousands per group.",
      "Stopping at the first significant look, which inflates false alarms.",
      "Having no rollback path or no guardrail metrics such as latency and errors.",
    ],
  },

  'de-lineage-walk-after-a-corrupted-partner-feed': {
    short:
      "Treat lineage as a graph of datasets, jobs and runs. Start at the three corrupted daily partitions and walk downstream through every run that read them, so the scope is those three days and what depends on them, not everything. Then measure how much of each training set came from the bad days and how far off the values were, quarantine the bad raw data, rebuild what is affected with an idempotent backfill, and compare a retrained candidate with the production model on a frozen test set before deciding. Finally add checks on arrival, a data contract with the partner and a named owner, so the next bad feed is caught on the day.",
    explain: [
      {
        heading: "Walk the graph from the bad partitions",
        body: "Lineage records which job runs read which datasets and wrote which others. Work at the level of runs and partitions (one day's slice of a table), not whole tables, otherwise everything looks affected. Start at the three corrupted partitions and follow every edge downstream. List what you find: derived tables and partitions, feature values, training sets built after those days, the models trained on those sets, and the model versions and predictions served during the window. The result is a precise scope, which tells you how big the repair needs to be.",
      },
      {
        heading: "Measure before you act",
        body: "Work out what share of each training set came from the bad days, in which slices (for example by product or region), and how far the values were off. Three bad days in a 120-day training window is 2.5% of the data. That might not matter if the errors were small, or might matter a great deal if the bad rows are concentrated in one important slice. Measuring first keeps the response in proportion to the problem.",
      },
      {
        heading: "Contain, repair and decide about the model",
        body: "Quarantine the corrupted raw partitions with a note of the reason, rather than deleting them, so you can study them and reprocess later. Get a corrected feed from the partner or exclude those days. Rebuild the affected derived partitions through an idempotent backfill, one that can be re-run safely without duplicating data, which is only possible because the raw data stayed immutable. For the model, decide with evidence: retrain a candidate on the corrected data, compare it with the production model on a frozen test set, then promote it or keep the current one, with a rollback ready. Record the dataset versions used by each model in the registry.",
      },
      {
        heading: "Online effects and making it not happen silently again",
        body: "The model was live in the window, so use the logged feature values to find the decisions made with bad inputs (for example the prices shown to customers) and give the owners that list so they can choose follow-up. To prevent a repeat, add checks when data arrives (schema, value range, distribution, volume and freshness), agree a data contract with the partner that states what a valid feed looks like, send alerts to a named owner, and write an incident note that includes whatever lineage gap made the search slow.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'feed', label: "Partner feed", sub: "3 corrupted days" },
        { id: 'raw', label: "Raw partitions", sub: "quarantine, keep immutable" },
        { id: 'derived', label: "Derived tables", sub: "rebuild affected partitions" },
        { id: 'feat', label: "Feature store", sub: "logged values show decisions" },
        { id: 'train', label: "Training sets", sub: "measure share from bad days" },
        { id: 'model', label: "Model in production", sub: "compare a retrained candidate" },
      ],
      highlight: ['feed'],
      caption: "Walk downstream from the bad partitions. At each stop, ask what read this, what it produced, and how much of it was bad.",
    },
    example: {
      title: "Example: sizing the problem",
      text: "These volumes are invented to show the method. Real row counts will differ, but the steps are the same: count the bad rows, divide by the training set, and count the decisions made with live bad inputs.",
      rows: [
        { label: "Bad rows", value: "3 days × 2,000,000 rows = 6,000,000" },
        { label: "Training set", value: "120 days × 2,000,000 = 240,000,000 rows" },
        { label: "Share from the bad days", value: "6 million ÷ 240 million = 2.5%" },
        { label: "Prices shown during the window", value: "3 days × 40,000 = 120,000 decisions to review" },
      ],
    },
    followUps: [
      {
        q: "You have no lineage tool. How do you reconstruct the picture?",
        a: "Read the job definitions and schedules, query logs and table histories, and search the code for the source table, then build the graph by hand for this incident. Record the result and adopt a standard such as OpenLineage so that the next search is a query.",
      },
      {
        q: "Only 4% of the training rows came from the corrupted days. Do you retrain?",
        a: "Not automatically; measure. A small share can still matter if it falls in an important slice or the errors are large, so compare candidate models on a frozen test set, check the slices, and keep the decision and its evidence.",
      },
      {
        q: "The partner insists nothing changed on their side. How do you proceed?",
        a: "Present the evidence, which is the affected rows and values with timestamps and checks, and ask for their release and job logs. Focus on a contract and a validation step regardless of who is to blame.",
      },
    ],
    mistakes: [
      "Retraining and redeploying immediately with no measurement of how much the bad data mattered.",
      "Being unable to say which models and datasets read the bad partitions.",
      "Deleting the corrupted raw data instead of quarantining it, which destroys the evidence and the ability to reprocess.",
      "Fixing this feed and adding no checks, so the next corruption is also found by accident.",
    ],
  },

  'agent-dashboard-and-alerts-in-production': {
    short:
      "Put on the dashboard how runs end (success, step limit, budget, timeout, escalated, error), steps and cost per task at the median and 99th percentile, cost per solved task, tool error and latency rates, approval rates, and quality signals tied to the trace ID, all split by release, prompt, model and tool-set version. Alert on rates and on change against a baseline, such as the step-limit share doubling against last week, rather than fixed numbers that fire every day. Page someone at night for things that lose money or cause harm quickly, such as runaway cost or a spike in failed actions, and send slow drift to a ticket. Keep every error, slow, blocked or badly rated trace, sample the rest, redact personal data, and feed failing traces back into the evaluation set.",
    explain: [
      {
        heading: "How runs end, and the long tail",
        body: "Label every run with its end reason: success, step limit, budget, timeout, escalated to a person, or error. A change in the mix of reasons is your first alert, because it moves before anyone complains. Track steps per task and tokens and cost per task at the median and at the 99th percentile (the value that 1% of runs exceed), plus cost per solved task, which is total spend divided by successes. Averages hide the long tail of runaway runs, and an agent loop can cost many times a normal run.",
      },
      {
        heading: "Tools and quality signals",
        body: "Watch each tool separately: error rate, latency, the share of calls returning nothing, detections of the same call repeated, and, for actions that need approval, the approval rate and the time each takes. For quality, tie every signal to the trace ID: user feedback, edits and retries, a sampled judge (a model that grades outputs, checked against human grades), and an outcome check or reconciliation against the system of record. “Completed” is not the same as “correct”, so a run that finishes can still have done the wrong thing.",
      },
      {
        heading: "Versions, baselines and who gets woken up",
        body: "Split every chart by release, prompt, model and tool-set version, so that a regression points at a change. Use the OpenTelemetry GenAI conventions (a shared naming scheme for LLM telemetry) where they fit, and pin the version, because they were still marked Development when this lesson was written. Alert on rates and on change against a baseline, for example the step-limit share doubling against the previous week, since fixed numbers either fire daily or never. Separate pages, which wake someone for a runaway cost or a spike in failed actions, from tickets, which handle slow drift in the morning.",
      },
      {
        heading: "Traces, privacy and the feedback loop",
        body: "Compute the metrics on all traffic, but store full traces selectively with tail sampling: keep every trace with an error, a slow run, a guardrail block or negative feedback, and sample the rest. Redact personal data and set a retention period. Feed failing traces, with consent and redaction, into the evaluation set, and re-run the evaluations whenever the model, prompt or tools change. That closes the loop: production teaches the tests what to check.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Watch", "Alert when", "Goes to"],
      rows: [
        { label: "How runs end", cells: ["share by end reason", "step-limit share doubles against last week", "page if budget or error share jumps"] },
        { label: "Cost and steps", cells: ["median and 99th percentile per task", "99th percentile cost far above baseline", "page for runaway cost, ticket for slow rise"] },
        { label: "Tools", cells: ["error and empty rate, latency, repeated calls", "a tool's error rate steps up", "page if failed actions spike, else ticket"] },
        { label: "Quality", cells: ["feedback, edits, sampled judge, outcome check", "outcome mismatches or retries rise", "ticket, page if harm is possible"] },
        { label: "Approvals", cells: ["approval rate and time", "queue time grows or approvals collapse", "ticket"] },
      ],
      caption: "Every row is split by release, prompt, model and tool-set version. Pages are for fast loss or harm, tickets for slow drift.",
    },
    example: {
      title: "Example: an average that hides the tail",
      text: "These figures are invented. Of 10,000 runs a day, 9,900 cost $0.03 each and 100 runaway runs cost $1.53 each. The average looks harmless, but one percent of runs is a third of the bill.",
      rows: [
        { label: "Normal runs", value: "9,900 × $0.03 = $297" },
        { label: "Runaway runs", value: "100 × $1.53 = $153" },
        { label: "Total and average per run", value: "$450, so $0.045 a run; the median is $0.03" },
        { label: "Share of spend from 1% of runs", value: "153 ÷ 450 = 34%" },
        { label: "Cost per solved task, 7,800 solved", value: "$450 ÷ 7,800, about $0.058" },
      ],
    },
    followUps: [
      {
        q: "The median cost per task is flat but the 99th percentile tripled. What do you look for?",
        a: "A tail of loops or retries. Open the most expensive traces and check for repeated calls, tool errors followed by retries, context ballooning from large tool results, and a recent prompt or tool change.",
      },
      {
        q: "Success rate shows 96% completed but complaints are rising. What is the dashboard missing?",
        a: "Completion is not correctness. Add outcome verification, reconciliation with records, sampled human review and feedback linked to traces, and slice by task type.",
      },
      {
        q: "How do you avoid alert fatigue on this dashboard?",
        a: "Alert on change from a baseline with grouping, tier alerts by impact, review noisy alerts weekly and retire or retune them, and give every page a runbook.",
      },
    ],
    mistakes: [
      "Showing only request count, average latency and a thumbs-up rate.",
      "Reporting average cost per task and nothing about the tail.",
      "Being unable to tell which release caused a change, because nothing is split by version.",
      "Storing full prompts and outputs with no redaction or retention plan.",
    ],
  },

  'de-idempotent-backfill-540-days': {
    short:
      "The work is 540 days × 25 minutes = 13,500 minutes, or 225 worker hours, so 12 workers need about 18.75 hours of wall-clock time at best, and roughly a day once you add margin for retries and throttling (an example 30% margin gives about 24 hours). Make each daily partition task idempotent: it computes a given date from the same inputs and replaces that partition atomically, so a re-run gives the same result and never appends. Write to a new versioned table, validate it against the old one, and switch readers only after the checks pass so nobody sees a mix. Check whether days depend on each other, checkpoint progress, throttle so production jobs are not starved, and then find the models trained on the bad values and retrain where it matters.",
    explain: [
      {
        heading: "The estimate, and testing it",
        body: "540 partitions at 25 minutes each is 13,500 minutes, which is 225 worker hours. Spread over 12 workers, each handles 45 partitions, which is 45 × 25 = 1,125 minutes, or 18.75 hours. That is the best case. Retries, throttling by the source system, and slow days will stretch it, so add margin (30% gives about 24 hours) and test the estimate by running one real week first. The daily pipeline keeps running at the same time, so the backfill has to share capacity with it.",
      },
      {
        heading: "Idempotent partition tasks",
        body: "A task is idempotent when running it twice has the same effect as running it once. Make each task compute one date from fixed inputs, write the result to a temporary location, and replace the target partition with an atomic swap (one step that cannot be seen half-done). Never append, because a retry would then double the rows. Record a run ID per partition for lineage, and checkpoint progress in a manifest of partitions with status, row counts and checksums, so a failure on day 311 resumes at day 311. Throttle the job so it does not starve production work or break source quotas, and keep the daily job from writing to the same partitions at the same time.",
      },
      {
        heading: "Dependencies between days",
        body: "Before you parallelise, check that the days are independent. If the feature is a running total or uses yesterday's value, then day 200 cannot be computed before day 199, so either run in order, or re-express the feature as a computation over a window of raw events so each day reads its own inputs. A 90-day rolling sum is a typical case. Each partition then reads 90 days of raw data, so the total reads are 540 × 90 = 48,600 partition-reads instead of 540, and the first 90 days need raw data from before the start of the range. It is more reading, but the days become independent again and can run in parallel.",
      },
      {
        heading: "Switching safely and following through",
        body: "Write the new values to a new versioned table and keep consumers on the old one until you have validated. Compare row counts and checksums per partition, diff old against new on a sample, and measure how much the values changed, since that tells you which models and reports are affected. First confirm that the source still holds 540 days of raw data, and decide whether to recompute from what was known at the time or from later corrected data. Then switch readers in one step, so a model or dashboard sees the old data or the new, never a mix. Finally use lineage to list the training sets and models built on the wrong values, retrain where the change is material, and tell consumers what changed and when.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "1. Time one real week", detail: "Run 7 partitions, measure minutes each, and check source limits." },
        { label: "2. Run partitions in parallel", detail: "12 workers, each task writes to a temporary place and swaps one partition atomically into a new versioned table." },
        { label: "3. Checkpoint and throttle", detail: "A manifest records status per partition, so a failure resumes there, and the job stays below production limits." },
        { label: "4. Validate", detail: "Compare row counts and checksums per partition and diff old against new on a sample." },
        { label: "5. Switch readers once", detail: "Consumers move from the old table to the new one in a single step." },
        { label: "6. Follow downstream", detail: "List and retrain the models and training sets that used the wrong values, and tell their owners." },
      ],
      caption: "The work is the same at every step: do it safely, check it, then switch, so nobody ever sees a half-finished table.",
    },
    example: {
      title: "Example: the time and read estimate",
      text: "All figures are the example figures from the question, plus an assumed 30% margin. The margin is a guess to be replaced by what the one-week test shows.",
      rows: [
        { label: "Total work", value: "540 × 25 min = 13,500 min = 225 worker hours" },
        { label: "With 12 workers, best case", value: "225 ÷ 12 = 18.75 hours" },
        { label: "With a 30% margin (example)", value: "18.75 × 1.3, about 24 hours" },
        { label: "Partitions per worker", value: "540 ÷ 12 = 45" },
        { label: "If a 90-day window is re-read per day", value: "540 × 90 = 48,600 partition-reads" },
      ],
    },
    followUps: [
      {
        q: "Partition 311 fails and the rest succeed. How do you make sure the final table is complete and correct?",
        a: "Keep a manifest of partitions with status, row counts and checksums, re-run only the failed partition, and run a completeness check before the swap. Never declare success from the job exit code alone.",
      },
      {
        q: "The feature depends on a 90-day rolling sum. What does that do to the plan?",
        a: "Each partition needs the previous 90 days of inputs, so reads grow and the first 90 days need earlier raw data. Express it as a windowed computation over raw events, which can still run in parallel because each day reads its own window.",
      },
      {
        q: "A production model was trained on the wrong values. How do you decide whether to retrain?",
        a: "Measure: retrain a candidate on the corrected data and compare it on a frozen test set, and look at the size of the value change on the training rows. Retrain if the effect is material or the corrected data is cheap to use, and record the decision.",
      },
    ],
    mistakes: [
      "Appending the new values on top of the old partitions, which doubles rows on every retry.",
      "Running the backfill straight into the table that consumers read, so they see a mix of old and new.",
      "Estimating the time without allowing for retries, throttling or source limits.",
      "Never checking which models were trained on the bad values.",
    ],
  },

  'provider-update-regression-communication': {
    short:
      "Tell it as a short story with numbers: the symptom, how you proved what changed, what you did first to contain it, what you told people and when, and what you changed so it cannot happen silently again. Proof comes from comparing the version record (model ID or snapshot, prompt, retrieval settings, index, tools) between the good and bad periods and re-running the evaluation set on both configurations, while ruling out other causes. Contain by rolling back the release manifest or re-pinning the old snapshot, not by editing the live prompt, and say early what you know, what you do not, and when the next update comes. End with a blameless review, the specific gap in your own process, and evidence that the fix was adopted.",
    explain: [
      {
        heading: "Situation and proof",
        body: "Open with the feature, the symptom and the numbers, who noticed first, and how long it ran before anyone caught it. For example (an invented story to show the shape): a drafting assistant's suggestion acceptance fell from 62% to 51% after a provider moved a model alias to a newer snapshot, and support noticed after four days. Then prove the cause rather than asserting it. Compare the version record for the good and bad periods, which is only possible if you log model ID, prompt, retrieval settings, index version and tools with each request. Re-run your evaluation set on the old and new configurations, and rule out the alternatives, such as input drift or a stale index, with evidence for each.",
      },
      {
        heading: "Containment and communication",
        body: "Contain first, and do it by a reversible, recorded step: roll back the release manifest, re-pin the previous snapshot, or flip a kill switch. Editing the live prompt as a first reaction piles a second change on the first and leaves nothing to compare. Rolling back only works if the old version is still deployable, which is a point worth making. While you are still investigating, tell stakeholders early what is known and what is not, roughly how many users are affected, and when you will update them next. Check the provider's status and deprecation pages and contact them if needed. Describe what happened without blaming a person.",
      },
      {
        heading: "Impact and prevention",
        body: "Quantify the damage: how many requests ran on the bad configuration and how far the metric fell and then recovered. In the example, four days at 30,000 requests a day is 120,000 requests, and acceptance came back to about 62% after the rollback. Then say what you put in place: exact model IDs pinned instead of aliases, model, prompt and index versioned together, scheduled evaluations against the live model, a shadow or canary stage compared with a control group, alerts on quality and cost per version, and a named owner for each.",
      },
      {
        heading: "Reflection, and how to tell it",
        body: "Close with a blameless review, meaning one that looks at how the process allowed the problem rather than who caused it. Name the gap in your own process, such as “we trusted an alias and had no scheduled evaluation”, and show that the change was adopted, not just proposed. Avoid the weak ending that the lesson was to be more careful, because it commits you to nothing. Be honest about what is still undetected, and give numbers everywhere you can, even if they are rough.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "Day 0: change lands", detail: "Example: a provider moves a model alias to a new snapshot, and nobody on the team is told." },
        { label: "Day 4: symptom noticed", detail: "Support reports poorer drafts, and acceptance has fallen from 62% to 51%." },
        { label: "Day 4: prove it", detail: "Compare version records and re-run the evaluation set on old and new snapshots. Rule out drift and a stale index." },
        { label: "Day 4: contain and say so", detail: "Re-pin the old snapshot through the release manifest, and tell stakeholders what is known, what is not, and when the next update is." },
        { label: "Week after: prevent", detail: "Pin exact model IDs, run scheduled evaluations against the live model, add a canary and per-version alerts." },
        { label: "Review: learn", detail: "Blameless review, a named owner, and evidence the changes shipped." },
      ],
      caption: "An invented example of the shape of a good answer. Replace each detail with your own facts and numbers.",
    },
    example: {
      title: "Example: sizing the impact in the story",
      text: "These numbers belong to the invented story, not to any real product. Use your own, even if they are rough, because a vague “quite a few users” sounds like a story nobody measured.",
      rows: [
        { label: "Acceptance before and during", value: "62% then 51%, a drop of 11 points" },
        { label: "Time to detect", value: "4 days" },
        { label: "Requests on the bad configuration", value: "4 days × 30,000 = 120,000" },
        { label: "Time to roll back", value: "about 20 minutes, via the release manifest" },
        { label: "Recovery", value: "acceptance back to about 62%" },
      ],
    },
    followUps: [
      {
        q: "How long was it between the change and the detection, and what would have shortened it?",
        a: "Give an honest number, and a specific fix tied to the failure in your story, such as scheduled evaluations on the live model, quality broken down by version, a canary with automatic comparison, or alerts.",
      },
      {
        q: "The provider will not roll back, and the old model is being retired. Now what?",
        a: "Pin the old model until its retirement date, run the evaluation set on the new one, and fix the prompt against a held-out set. Consider routing or a fallback model, and tell stakeholders the deadline.",
      },
      {
        q: "A stakeholder asks whether this can happen again. What do you say?",
        a: "Be honest about what is now detected and what is not, and about the remaining risk, instead of promising that it will not happen.",
      },
    ],
    mistakes: [
      "Blaming the provider or a teammate and describing no change to your own process.",
      "Editing the live prompt as the first response, with no versions to compare or roll back to.",
      "Being unable to say what changed or how you know, and giving no numbers for impact.",
      "Ending with “the lesson was to be more careful”, which commits you to nothing.",
    ],
  },
};
