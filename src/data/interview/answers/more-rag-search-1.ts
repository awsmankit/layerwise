import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'sa-explain-rag-to-a-non-technical-buyer': {
    short:
      "Think of an open-book exam. When someone asks a question, the assistant first looks up the relevant passages in your own contracts, then writes its answer using only those passages, and shows which ones it used. Nothing is retrained, so the model does not memorise your contracts. What matters for your data is where the model that reads those passages runs and what the provider's written terms say about keeping and training on them.",
    explain: [
      {
        heading: "The open-book picture",
        body: "A student in a closed-book exam answers from memory and sometimes invents things. A student in an open-book exam finds the right page first and then answers from it. Retrieval-augmented generation, or RAG, works like the second student. Your contracts stay in your own document store. When a question arrives, a search step finds the few passages most likely to contain the answer (it matches meaning, not only exact words), and those passages are sent to the model together with the question. The model is not retrained and does not need to have learned your contracts, which is also why a changed contract only needs to be re-indexed, not taught again.",
      },
      {
        heading: "What to say about their data",
        body: "Be honest and specific. Because the passages are sent to a model at the moment of the question, the real questions are: where does that model run (inside your cloud account, with a provider, or on your own machines), does the provider keep the text, and do its terms allow it to train on it? Those answers differ by service and by contract tier, so I would not improvise them on this call. I would put them in writing for the exact service we propose, and your legal team should check them. This is not legal advice, only the list of things to confirm.",
      },
      {
        heading: "How a lawyer can trust it, and where it falls short",
        body: "Every answer should point to the passage it used, so a person can open the clause and check. If the right passage is not found, the answer will be weak, so the assistant should say “I could not find this” rather than guess. The search should also only look at documents the person asking is allowed to open, and that can be tested with accounts of different access levels. It can still be wrong, so for high-stakes questions a person reviews the answer and the cited clause before anyone relies on it.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'ask', label: "A question is asked", sub: "For example: what is the notice period in the Acme contract?" },
        { id: 'lookup', label: "Look up passages", sub: "Search your own documents, only those this person may open" },
        { id: 'write', label: "Write from the passages", sub: "The model is told to answer only from what it was given" },
        { id: 'cite', label: "Show the sources", sub: "Each answer points to the clause it used, or says it was not found" },
      ],
      highlight: ['lookup', 'cite'],
      caption: "Nothing is retrained. The documents stay in your store and only the few relevant passages travel with the question.",
    },
    example: {
      title: "Example: the next step to offer, a small demo on ten contracts",
      text: "End by offering something the customer can say yes to. The numbers below are an example plan, not a promise. You choose ten contracts and twenty real questions. We run them through the assistant and your lawyers read every answer next to its cited clause. We count how many were right, how many said not found, and how many were wrong. Then you decide with evidence, not with a slide.",
      rows: [
        { label: "Contracts you choose (example)", value: "10" },
        { label: "Questions your team writes (example)", value: "20" },
        { label: "Checked by", value: "a lawyer, answer next to cited clause" },
        { label: "We report", value: "right, not found, wrong, and where each went wrong" },
      ],
    },
    followUps: [
      {
        q: "Does it learn from our documents over time?",
        a: "Not by default. Retrieval looks documents up each time and nothing in the model changes. Learning would be a separate, deliberate step, such as fine-tuning or stored memory, and it would raise its own data and privacy questions that we would settle first.",
      },
      {
        q: "Can you guarantee it never makes things up?",
        a: "No, and I would say so plainly. Retrieval, citations, a clear “not found” answer and human review of important answers reduce the risk, and I can measure the error rate on your own questions in the demo.",
      },
      {
        q: "What if a junior associate could see a partner-only contract through the assistant?",
        a: "Permissions have to be applied during the search, based on who is asking, so a document they cannot open never reaches the model for them. We would test it with accounts of different access levels and check how quickly a change in access takes effect.",
      },
    ],
    mistakes: [
      "Opening with words such as embeddings, vector database and tokens. A non-technical listener stops following. Use the open-book picture and define any term in one line.",
      "Saying “your data is completely safe” with no specifics. Name what you will confirm in writing: where the model runs, retention, and whether it trains on the text.",
      "Promising the assistant will not be wrong. Say what reduces mistakes and offer to measure them.",
      "Saying the model “learns” your documents. It looks them up at question time, which is the whole point.",
    ],
  },

  'rag-end-to-end': {
    short:
      "Before anyone asks anything, documents are loaded, cleaned, split into chunks, turned into vectors by an embedding model and stored with metadata. At question time the question is embedded with the same model, the index returns the most similar chunks (filtered by permissions), an optional reranker keeps the best few, and the prompt is built from instructions, those passages and the question. The model answers from the passages, the app returns the answer with its sources, and the whole trace is logged. The model's weights never change, so a changed document only needs to be re-indexed.",
    explain: [
      {
        heading: "Before any user shows up: ingestion",
        body: "Ingestion is the offline work that makes documents searchable. A loader reads the files, a parser pulls out text and structure (PDFs, tables and headings need care), and the text is cleaned and split into chunks, which are pieces of a few hundred tokens that are stored and searched as one unit. An embedding model turns each chunk into a vector, a list of numbers that stands for its meaning, so chunks about similar things land close together. Each vector is stored with the chunk text and metadata: source, date, and who may read it. This work runs on a schedule or whenever a document changes.",
      },
      {
        heading: "At question time: retrieve, rerank, prompt, answer",
        body: "The question is embedded with the same embedding model that embedded the documents. Vectors from a different model live in a different space, so mixing them gives meaningless matches. The index returns the top k most similar chunks (k is the number you ask for, for example 20), with metadata and permission filters applied so a person never gets chunks they cannot open. A reranker, a slower model that reads the question and each candidate together, can re-score them and keep the best few. The application then builds a prompt: instructions, the chosen passages and the question, telling the model to answer only from the passages and to cite them. The model writes the answer, and the app returns it with its sources.",
      },
      {
        heading: "Why it works and where it breaks",
        body: "RAG adds knowledge through the prompt, not through training, so the model's weights never change. That is why updating a policy only means re-indexing that document. It also tells you where to look when something is wrong. A stale answer usually means ingestion failed or the new file was never indexed. A missing answer usually means the right passage was not retrieved. A confident wrong answer means the model said something the passages do not support. Logging the question, the retrieved chunks with scores, the prompt and the answer for every request lets you tell these apart.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "1. Load and parse", detail: "Offline: read files, extract text and structure, clean it." },
        { label: "2. Chunk", detail: "Offline: split into pieces of a few hundred tokens, keeping headings." },
        { label: "3. Embed and store", detail: "Offline: one vector per chunk, saved with text, source, date and access list." },
        { label: "4. Embed the question", detail: "Online: the same embedding model turns the question into a vector." },
        { label: "5. Retrieve and rerank", detail: "Online: top k similar chunks, permission filters applied, best few kept." },
        { label: "6. Build the prompt", detail: "Online: instructions, passages and question, told to answer only from the passages." },
        { label: "7. Answer and log", detail: "Online: model answers, app returns sources, the whole trace is logged." },
      ],
      caption: "Steps 1 to 3 run before any user arrives. Steps 4 to 7 run on every question.",
    },
    example: {
      title: "Example: one question through a small company index",
      text: "These numbers are an example. The company has 2,000 documents with about 40 chunks each, so the index holds 2,000 x 40 = 80,000 chunks. An employee asks how many days of parental leave they get. The index returns the top 20 chunks, the reranker keeps 4, and each chunk is about 400 tokens. The prompt is 200 tokens of instructions, plus 4 x 400 = 1,600 tokens of passages, plus a 30-token question, for 1,830 tokens in total. If the right paragraph is not among the 20 retrieved, no model can answer correctly from the prompt, which is why retrieval is measured on its own.",
      rows: [
        { label: "Chunks in the index (example)", value: "2,000 x 40 = 80,000" },
        { label: "Retrieved, then kept after reranking", value: "20, then 4" },
        { label: "Prompt size", value: "200 + 4 x 400 + 30 = 1,830 tokens" },
        { label: "Weights changed", value: "none" },
      ],
    },
    followUps: [
      {
        q: "What should the assistant do when nothing relevant is retrieved?",
        a: "It should say it does not know, or ask a clarifying question, instead of answering from general knowledge. A minimum similarity score can trigger this, and each such case is logged as a gap in the documents or in the retriever.",
      },
      {
        q: "A policy changed last month but the assistant still quotes the old one with a correct citation. Where do you look first?",
        a: "Ingestion and the index, not the model. Check whether the new document was indexed, whether the job failed, and whether document counts match the source, then show document dates in citations so staleness is visible.",
      },
    ],
    mistakes: [
      "Saying RAG retrains or fine-tunes the model on the documents. It puts passages into the prompt at question time.",
      "Embedding queries with a different model from the one used for documents. The vectors are not comparable and results look random.",
      "Having no plan for when retrieval finds nothing. The model will otherwise answer from general knowledge and sound sure.",
      "Describing only the online half. Many failures start in ingestion, such as bad parsing or a job that quietly stopped.",
    ],
  },

  'long-context-vs-rag-break-even': {
    short:
      "With these numbers, stuffing the whole handbook into every prompt costs $294.60 a day, caching it costs $85.08, and retrieval costs $22.20 including $6 of infrastructure. Retrieval wins on cost by a wide margin, and caching beats stuffing as long as the cache is warm often enough, which here needs a hit rate above about 22%. Cost is not the only axis: accuracy at long lengths, time to first token, permissions and how often the documents change can decide it. I would test 30 to 50 real questions on each design before choosing.",
    explain: [
      {
        heading: "The formulas",
        body: "Let C be the handbook (120,000 tokens), q the question (250), k the retrieved slice (4,000), p the input price ($3 per million tokens) and m the effective multiplier on cached input. Stuffing costs (C + q) x p per question. Caching costs (C x m + q) x p, where m = h x r + (1 - h) x w: with hit rate h = 0.85, read price r = 0.1 and write price w = 1.25, m = 0.85 x 0.1 + 0.15 x 1.25 = 0.085 + 0.1875 = 0.2725. Retrieval costs (k + q) x p plus its infrastructure. Output is the same in all three: 800 x 500 = 400,000 tokens, and 0.4 million x $15 = $6.00 a day.",
      },
      {
        heading: "The daily totals, with units checked",
        body: "Input tokens per question: stuffing 120,000 + 250 = 120,250; cached 120,000 x 0.2725 + 250 = 32,950 token-equivalents; retrieval 4,000 + 250 = 4,250. Over 800 questions that is 96.2 million, 26.36 million and 3.4 million tokens, at $3 per million: $288.60, $79.08 and $10.20. Add output ($6.00 each) and, for retrieval, $6 of infrastructure: stuffing $294.60, cached $85.08, retrieval $10.20 + $6.00 + $6.00 = $22.20. Per question that is about 36.8 cents, 10.6 cents and 2.8 cents.",
      },
      {
        heading: "When caching pays, and what else decides it",
        body: "Caching beats not caching when m is below 1, that is when h x r + (1 - h) x w < 1, which gives h > (w - 1) / (w - r) = 0.25 / 1.15, about 22%. A short-lived cache also needs steady traffic. If it lasts 5 minutes and is refreshed each time it is used (an assumption, since vendors differ), 800 questions a day spread evenly average one every 86,400 / 800 = 108 seconds, which keeps it warm, but bursty traffic with long gaps does not. Beyond cost, a window is a limit, not a promise that the model uses all of it: accuracy can fall with length, with the answer in the middle, and with distractors, so test at your length. The whole prompt must be processed before the first token, which caching shortens.",
      },
      {
        heading: "Permissions, freshness and how to decide",
        body: "One shared stuffed prefix cannot show different users different documents, while retrieval can filter per user inside the search. Documents that change often favour re-indexing only what changed, because any edit to a stuffed prefix invalidates the cache. Do not argue it: run 30 to 50 real questions through each design and compare accuracy, cost per answered question and time to first token. Hybrids are common, such as retrieving whole sections, caching a stable core and retrieving the long tail, or routing easy questions to the cheap path.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "dollars per day (example prices)",
      items: [
        { label: "Stuff everything", value: 294.6, note: "$288.60 input + $6.00 output" },
        { label: "Cache the handbook", value: 85.08, note: "$79.08 input + $6.00 output" },
        { label: "Retrieval", value: 22.2, note: "$10.20 input + $6.00 output + $6.00 infrastructure", hot: true },
      ],
      caption: "Daily cost at 800 questions a day with the stated example prices. The cached figure assumes 85% of questions find the cache warm.",
    },
    example: {
      title: "Example: the same handbook at only 100 questions a day, spread evenly",
      text: "One question every 1,440 / 100 = 14.4 minutes is longer than a 5-minute cache lifetime, so the cache is almost always cold and each question pays the write price. Stuffing costs 100 x 120,250 x $3 per million = $36.08 of input plus 100 x 500 x $15 per million = $0.75 of output, about $36.83. Retrieval costs 100 x 4,250 x $3 per million = $1.28 of input plus $0.75 output plus $6 infrastructure, about $8.03. A cache that is always cold pays 1.25 times the input price, so caching costs 100 x (120,000 x 1.25 + 250) x $3 per million = $45.08 plus $0.75 output, about $45.83, which is worse than not caching.",
      rows: [
        { label: "Stuffing, 100 a day", value: "about $36.83" },
        { label: "Caching, almost always cold", value: "about $45.83" },
        { label: "Retrieval, with $6 infrastructure", value: "about $8.03" },
      ],
    },
    followUps: [
      {
        q: "Traffic falls to 100 questions a day, spread evenly. Does your answer change?",
        a: "Yes for caching. One question every 14.4 minutes is longer than a 5-minute cache lifetime, so the cache is rarely warm and mostly pays the write premium, and caching can end up costing more than not caching. Stuffing is about $36.83 a day and retrieval about $8.03.",
      },
      {
        q: "Different users may see different documents. What changes?",
        a: "A single cached prefix cannot be filtered per user. Move to retrieval with permission filters inside the query, or keep one cache per permission group.",
      },
      {
        q: "How would you check that long context answers as well as retrieval?",
        a: "Build labelled questions with the answer in the middle of the handbook and distractors present, and run them through both designs. Compare accuracy, not only cost, and consider a routed hybrid if each wins on different questions.",
      },
    ],
    mistakes: [
      "Leaving out output cost or retrieval infrastructure. Both are in the totals above and change the gap.",
      "Assuming a bigger window means the model uses all of it well. Test at your real length and answer position.",
      "Treating one vendor's cache multipliers as fixed forever. Prices and cache lifetimes change, so keep them as inputs to your formula.",
      "Deciding on cost alone. Accuracy, first-token time, permissions and freshness can overrule a cheaper design.",
    ],
  },

  'follow-up-questions-retrieve-badly': {
    short:
      "First separate retrieval from generation by measuring recall at k on a labelled set, sliced by question type, at the same k the prompt uses. Then fix each slice with the tool that matches its gap: a standalone rewrite using the chat history for follow-ups, decomposition into parallel searches for compound questions, and hybrid search for exact names. Multi-query, HyDE and routing are options to measure, not defaults, because each adds a model call before the first search. Keep the original query, log every rewrite, and add a technique only where the data shows it helps.",
    explain: [
      {
        heading: "Diagnose before you add anything",
        body: "Take a labelled set of questions with the passage that should be found, and tag each with its type: stand-alone, follow-up, compound, short, jargon. Measure recall at k (is a correct passage among the top k chunks sent to the model) for each slice, at the same k the answer prompt uses, and compare with a baseline that searches the raw query. Then read failures and name the gap. “What about the battery?” has missing context. “Is it worth joining if I ride twenty times a month?” is a compound question that needs two facts. An unfamiliar product nickname is a vocabulary mismatch. Each gap needs a different fix, so a single global change will not help.",
      },
      {
        heading: "Matching each gap to a fix",
        body: "For follow-ups, use a standalone rewrite: a model call that sees the chat history and writes “What is the battery capacity of the e-bike?”. Keep the original query alongside it, log the rewrite, spot-check samples for dropped or invented constraints, and rewrite only when the message needs it. For compound questions use decomposition: split into sub-questions (what does membership cost, what is the price per ride) and search each in parallel. A rewrite alone cannot supply a missing second fact. If a later sub-question depends on an earlier answer, you have an agent loop of search, read, search again. Hybrid search, which adds exact keyword matching, handles names and codes that embeddings blur.",
      },
      {
        heading: "Options to measure, not to assume",
        body: "Multi-query writes several paraphrases, searches each and fuses the lists. It raises recall for vague questions but costs several searches and can drift away from what was asked. HyDE (hypothetical document embeddings) asks a model to write a fake answer and searches with that instead of the question. It can help, but when the model does not know the domain its invented details pull the search toward them and can hurt. Routing is a classification: which index, which metadata filter, or no retrieval at all, so evaluate it as a classifier with its own accuracy.",
      },
      {
        heading: "The cost of every step",
        body: "Each technique adds a model call before the first search and adds tokens to the bill. Three paraphrases means one model call and four searches (three paraphrases plus the original), all before anything streams to the user. Run the searches in parallel so they cost one search of waiting, and switch a step on only for the question types where the numbers show a gain. Judge the whole thing on retrieval recall by slice first, and only then on answer quality, so you can tell which step helped.",
      },
    ],
    diagram: {
      kind: 'experiment',
      slug: 'no-query-rewriting',
      caption: "Compare searching with the raw follow-up against a rewritten standalone question.",
    },
    example: {
      title: "Example: what a rewrite costs in waiting time",
      text: "These timings are examples, not measurements. A rewrite call takes 400 ms and one search takes 80 ms. For three paraphrases plus the original, that is 4 searches. If you run the searches one after another, the user waits 400 + 4 x 80 = 720 ms before the model even starts. If you run them in parallel, they wait 400 + 80 = 480 ms. So parallel searches save 240 ms here, and the rewrite call is the part you can only shrink by using it less often or with a smaller model.",
      rows: [
        { label: "Rewrite model call (example)", value: "400 ms" },
        { label: "Four searches one after another", value: "400 + 4 x 80 = 720 ms" },
        { label: "Four searches in parallel", value: "400 + 80 = 480 ms" },
        { label: "Time saved by running in parallel", value: "240 ms" },
      ],
    },
    followUps: [
      {
        q: "Multi-query with three paraphrases of “what about the battery?” still returns the wrong pages. Why?",
        a: "The paraphrases were written without the chat history, so each one says “battery” with no product and keeps finding the scooter and phone pages. The standalone rewrite uses the history and names the e-bike, so it finds the right page.",
      },
      {
        q: "Some questions hop between passages, such as “Which supplier makes the sensor used by the project Priya leads?” Do you build a knowledge graph?",
        a: "Not first. I climb a ladder: parent-child chunks, metadata filters, hybrid search, decomposition, then agentic retrieval where the system searches, reads and searches again. A graph helps multi-hop and whole-collection questions but costs extraction, entity matching and upkeep, and comparisons show complementary strengths rather than a clear winner, so I build one only when logs show failures the simpler steps do not fix.",
      },
      {
        q: "How would you show that HyDE helped rather than got lucky?",
        a: "Use a held-out labelled set that includes unfamiliar terms, compare per-slice recall against the raw-query baseline, and record the added latency and cost. Then read the failures where the invented answer misled the search.",
      },
    ],
    mistakes: [
      "Adding every technique at once without measuring any. You cannot tell which one helped or which one hurt.",
      "Rewriting queries and throwing away the original. Search with both, since a rewrite can drop a constraint.",
      "Blaming the generator for what is a retrieval failure. If the right passage never arrives, no model can use it.",
      "Evaluating only the final answer. Measure recall by question type so you know which step to fix.",
    ],
  },

  'rag-retrieval-or-generation': {
    short:
      "Do not switch models yet. Pull the traces for the failing questions, label the passage that holds the answer for about a hundred questions, and measure retrieval and generation separately. If the gold passage never reached the model, retrieval is at fault. If it was there and the answer was still wrong, generation is at fault, and only then is a bigger model worth considering.",
    explain: [
      {
        heading: "Look at what the model was actually given",
        body: "For each failing question, pull the trace: the rewritten query, the retrieved chunks with their scores and ranks, the final prompt, and the answer. Then build a small labelled set, a hundred questions or so to start, including the failures, where a person has marked the gold passage, the one that contains the answer. Now every failure can be sorted by one question: was the gold passage in the context the model received? If not, the model never had a chance, and a bigger model would have given the same wrong answer with more confidence.",
      },
      {
        heading: "Measure each side on its own",
        body: "Retrieval is measured with recall@k, the share of questions where a gold passage is in the top k chunks sent to the model, and MRR (mean reciprocal rank), which averages 1 / rank of the first gold passage, so rank 1 scores 1 and rank 4 scores 0.25. Generation is measured with faithfulness, also called groundedness: break the answer into claims and check that each one is supported by the passages provided. Use a judge model only after calibrating it against human labels, and check that each citation points to a passage that really supports the claim.",
      },
      {
        heading: "Fixes by side, then turn it into a regression test",
        body: "Retrieval fixes: better chunking, headings in the embedded text, hybrid search, a reranker, query rewriting, metadata filters, and re-indexing stale content. Generation fixes: fewer and better-ordered passages, clearer instructions, permission to say “I do not know”, and only after those, a stronger model. Keep the labelled set as a regression eval, so every change is checked against both metrics and a gain in one does not hide a loss in the other.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Gold passage in the context", "Answer correct", "Where to work"],
      rows: [
        { label: "Case A", cells: ["No", "No", "Retrieval: chunking, hybrid search, reranker, rewrite, stale index"] },
        { label: "Case B", cells: ["Yes", "No", "Generation: passage order and count, instructions, say I do not know, then model"] },
        { label: "Case C", cells: ["Yes", "Yes", "Working. Keep it in the regression set"] },
        { label: "Case D", cells: ["No", "Yes", "Suspicious: answered from memory or luck, check faithfulness"] },
      ],
      caption: "Sorting every labelled question into one of four cases shows which part of the system to fix.",
    },
    example: {
      title: "Example: 100 labelled questions, 15 wrong",
      text: "All numbers here are an example. Of 100 labelled questions, 15 get a wrong answer. In 12 questions the gold passage is not in the context, so recall is (100 - 12) / 100 = 0.88. Eleven of those 12 are among the wrong answers (one was answered correctly by luck). The other 15 - 11 = 4 wrong answers had the gold passage present, so they are generation failures. A bigger model could at best fix those 4, so it can lift accuracy by at most 4 points, from 85% to 89%. Fixing retrieval for the 11 could lift it by up to 11 points.",
      rows: [
        { label: "Wrong answers", value: "15 of 100" },
        { label: "Gold passage missing (retrieval)", value: "11 of the 15 (73%)" },
        { label: "Gold present but wrong (generation)", value: "4 of the 15 (27%)" },
        { label: "Recall of the gold passage", value: "88 of 100 = 0.88" },
        { label: "Most a bigger model could add", value: "4 points (85% to 89%)" },
      ],
    },
    followUps: [
      {
        q: "Recall@5 is 0.92 but answers are still wrong 12% of the time. What next?",
        a: "Look at the generation side. Inspect the cases where the gold passage was present and check for conflicting or outdated passages, too much context burying the answer, unclear instructions or the wrong answer format, then measure faithfulness. Consider a stronger model only after these.",
      },
      {
        q: "Labelling gold passages is slow. How do you scale it?",
        a: "Start small with real failures, let a model propose candidate passages for a person to confirm, sample across topics, and add every production bug to the set so it grows with use.",
      },
      {
        q: "Someone proposes telling the model “only use documents the user is allowed to see”. What do you say?",
        a: "A prompt is not access control. Permissions must be enforced in the retrieval code with filters on the user's identity, so the model never receives a passage the user cannot see.",
      },
    ],
    mistakes: [
      "Reaching for a bigger model before looking at what was retrieved. If the gold passage never arrived, the model is not the problem.",
      "Measuring only end-to-end answer accuracy. You then cannot tell which component failed.",
      "Using the prompt to enforce document permissions. Filter in the retrieval step instead.",
    ],
  },

  'code-ndcg-at-k': {
    short:
      "Precision@k is the share of the top k that is relevant, recall@k is the share of all relevant items that appear in the top k, and NDCG@k adds up the grades of the top k, discounted by 1 / log2(rank + 1), then divides by the best possible total for that query. For the list 3, 2, 3, 0, 1, 2, DCG is 6.861, the ideal order gives 7.141, so NDCG@6 is 0.961. NDCG suits a ranked list because order matters, relevance comes in grades, and a miss near the top costs more than one near the bottom.",
    explain: [
      {
        heading: "Precision and recall at k",
        body: "Say what relevant means first: here, a grade above 0 (you could also use a threshold such as 2 or more). Precision@k = relevant items in the top k divided by k. Recall@k = relevant items in the top k divided by all relevant items that exist for the query. That needs the total number of relevant items, not just the ones returned, so the function takes it as an input. For 3, 2, 3, 0, 1, 2, the top 3 are all relevant, so precision@3 = 3/3 = 1.0. If those six are all the relevant items there are for the query (an assumption), five are relevant and recall@3 = 3/5 = 0.6.",
      },
      {
        heading: "DCG and NDCG, with the numbers",
        body: "DCG@k (discounted cumulative gain) = the sum over ranks i = 1 to k of gain_i / log2(i + 1). The discount is 1.0 at rank 1, 0.631 at rank 2 and 0.5 at rank 3, so lower ranks count for less. For the grades 3, 2, 3, 0, 1, 2 the terms are 3, 1.262, 1.5, 0, 0.387 and 0.712, which sum to 6.861. The ideal order of the same grades is 3, 3, 2, 2, 1, 0, which gives 3 + 1.893 + 1 + 0.861 + 0.387 + 0 = 7.141. NDCG@6 = 6.861 / 7.141 = 0.961, and a perfect ordering scores exactly 1. The gain can be the grade itself or 2^grade - 1, which gives 0.949 for the same list. Either is fine if you use the same one for every system you compare.",
      },
      {
        heading: "Edge cases and why not accuracy",
        body: "Handle these on purpose. If the ideal DCG is zero (no relevant item for the query), return 0 or skip the query, and say which you chose. If k is larger than the list, use what is there, and an empty list scores 0. Break ties in the returned scores in a fixed, stated way. Average NDCG across queries (a macro average of per-query scores) so each query counts once. Compute the ideal from all judged items for the query where you can, not only the returned ones, and say so if you cannot. Accuracy on single items ignores position, while NDCG rewards putting highly relevant items first. Offline scores are still a proxy, and they inherit the bias of whatever system produced the logs, so confirm with an online test.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "rank in the list",
      yLabel: "discount, 1 / log2(rank + 1)",
      points: [[1, 1], [2, 0.631], [3, 0.5], [4, 0.431], [5, 0.387], [6, 0.356], [7, 0.333], [8, 0.315], [9, 0.301], [10, 0.289]],
      marks: [{ x: 1, label: "rank 1 counts in full" }, { x: 3, label: "rank 3 counts half" }],
      caption: "The weight given to an item falls quickly over the first few ranks, so a good item placed low is worth little.",
    },
    example: {
      title: "Example: working code, checked against the list 3, 2, 3, 0, 1, 2",
      text: "import math\n\ndef precision_at_k(grades, k, threshold=1):\n    return sum(g >= threshold for g in grades[:k]) / k\n\ndef recall_at_k(grades, k, total_relevant, threshold=1):\n    if total_relevant == 0:\n        return None\n    return sum(g >= threshold for g in grades[:k]) / total_relevant\n\ndef dcg_at_k(grades, k):\n    return sum(g / math.log2(i + 2) for i, g in enumerate(grades[:k]))\n\ndef ndcg_at_k(grades, k, all_grades=None):\n    ideal = sorted(all_grades if all_grades is not None else grades, reverse=True)\n    best = dcg_at_k(ideal, k)\n    return None if best == 0 else dcg_at_k(grades, k) / best\n\nThe index starts at 0, so rank i + 1 is divided by log2(i + 2), which means rank 1 divides by log2(2) = 1, never by zero. Running it on 3, 2, 3, 0, 1, 2 gives DCG 6.861 and NDCG@6 0.961. It returns None for a query with no relevant item, so the caller must decide whether to skip it or count it as 0.",
      rows: [
        { label: "DCG@6 of 3, 2, 3, 0, 1, 2", value: "6.861" },
        { label: "Ideal DCG@6 of 3, 3, 2, 2, 1, 0", value: "7.141" },
        { label: "NDCG@6", value: "6.861 / 7.141 = 0.961" },
        { label: "With gain 2^grade - 1", value: "13.848 / 14.595 = 0.949" },
        { label: "Precision@3 and recall@3 (if 5 relevant exist)", value: "1.0 and 0.6" },
      ],
    },
    followUps: [
      {
        q: "Swap the first and fourth items so the list is 0, 2, 3, 3, 1, 2. What happens to NDCG, and why is that useful?",
        a: "DCG falls to about 5.153 and NDCG to about 0.722. The metric punishes moving a top-grade item far down much more than a small shuffle low in the list, which matches what users experience.",
      },
      {
        q: "Queries have very different numbers of relevant items. How do you average fairly?",
        a: "NDCG is normalised per query, so its scores are comparable and can be averaged. Recall@k depends on how many relevant items a query has, so report it per segment, and give an interval across queries rather than one number.",
      },
      {
        q: "You evaluate on last year's logged clicks. What bias does that have?",
        a: "Only items the old system showed have labels, and unseen items count as not relevant, while higher positions get more clicks. That favours models that resemble the old one, so confirm with an online test or randomised exposure.",
      },
    ],
    mistakes: [
      "Returning DCG without normalising. Scores then cannot be compared across queries with different numbers of good items.",
      "Computing the ideal order only from the returned items without saying so. A system that misses the best items would look perfect.",
      "Dividing by log2(rank) instead of log2(rank + 1). Rank 1 then divides by zero.",
      "Giving no handling for a query with no relevant items. The ideal DCG is zero and the division fails.",
    ],
  },

  'choose-vector-store-and-distance-metric': {
    short:
      "I would start with a vector extension in the database that already holds the articles and the customer access rules, such as pgvector, because one system gives transactions and joins. I would use the distance the embedding model was trained for, normalise the vectors to unit length so a plain dot product ranks the same as cosine, and use an approximate index such as HNSW. To check quality I would measure index recall against exact search with real filters, then retrieval recall@k on labelled questions, then answer quality. A dedicated vector database is a later step if scale or features demand it.",
    explain: [
      {
        heading: "Where to store, and which distance",
        body: "Start from where the data and permissions already live. For 5 million articles, a vector extension in the existing database is often enough and gives one system, one backup and joins against the access rules. A dedicated vector database or a search engine adds scale-out or built-in hybrid search, but it is another system to run and keep in sync. For distance, use the metric the embedding model was trained for, which the model card states. If vectors have unit length, cosine similarity, dot product and L2 distance all rank results the same way, so normalise at write and query time and let the index use a plain dot product.",
      },
      {
        heading: "Approximate indexes and what they give up",
        body: "Exact search compares the query with every vector, which is slow at 5 million. Approximate nearest-neighbour (ANN) indexes skip most of them. HNSW, a layered graph, gives high recall and low latency but uses a lot of memory. IVF, which groups vectors into clusters, depends on probing enough clusters at query time. Product quantisation compresses each vector into short codes, saving memory at a cost in accuracy. All of them can miss the true best match, and that lost share is recall, so tune the settings and measure it rather than trusting defaults.",
      },
      {
        heading: "Permissions and filters are the hard part",
        body: "Each customer may only see their own articles, so the filter must be applied inside retrieval, never in the prompt afterwards. Filters interact badly with ANN indexes. Post-filtering (search first, filter after) can leave too few results or none. Filtering while walking the graph can miss neighbours. A very selective filter, such as one customer with 300 articles, is often best served by exact search over just that small set. Test with real filters, plan hybrid search (keywords plus vectors, fused for example with reciprocal rank fusion) for product names and error codes, and plan a full re-index if the embedding model changes, because vectors from different models cannot be compared.",
      },
      {
        heading: "How to know it is good enough",
        body: "Measure three separate things. Index recall: for a sample of real queries with their real filters, how many of the true top 10 from exact search does the index return. Retrieval recall@k: on labelled questions, is the right article in the top k. Answer quality: do the final answers hold up. A fault in one is invisible in the others, so keeping them apart tells you whether to tune the index, the chunks or the prompt.",
      },
    ],
    diagram: {
      kind: 'layers',
      layers: [
        { label: "Question, embedded and normalised", sub: "Same model as the articles, unit-length vector" },
        { label: "Permission and metadata filter", sub: "Customer and product version, applied inside the search" },
        { label: "Hybrid search", sub: "Keyword match for exact names and codes, fused with vector results" },
        { label: "Approximate index (for example HNSW)", sub: "Fast, with a recall you measure against exact search" },
        { label: "Vectors, text and access rules", sub: "In the existing database to start with" },
      ],
      caption: "Read from the top: the question comes in and each layer narrows the search, with the filter applied inside it.",
    },
    example: {
      title: "Example: why unit-length vectors make the metrics agree, and what memory costs",
      text: "Take two unit-length vectors in two dimensions, a = (0.6, 0.8) and b = (0.8, 0.6), each of length 1. Their dot product, which is also their cosine, is 0.6 x 0.8 + 0.8 x 0.6 = 0.96. Their squared L2 distance is (0.6 - 0.8)^2 + (0.8 - 0.6)^2 = 0.04 + 0.04 = 0.08, which equals 2 - 2 x 0.96. So a higher dot product always means a smaller distance, and the ranking is identical. For memory (the dimension is an example), 5,000,000 vectors x 768 numbers x 4 bytes = 15.36 GB before any index overhead. Compressing each vector to 96 eight-bit codes is 96 bytes instead of 3,072, which is 32 times smaller and 5,000,000 x 96 = 0.48 GB.",
      rows: [
        { label: "Dot product of a and b", value: "0.96" },
        { label: "Squared L2 distance", value: "0.08 = 2 - 2 x 0.96" },
        { label: "Raw vectors, 768 dimensions, float32 (example)", value: "15.36 GB" },
        { label: "Compressed to 96 bytes each", value: "0.48 GB, 32 times smaller, less exact" },
      ],
    },
    followUps: [
      {
        q: "After launch, recall looks fine on unfiltered tests, but customers with small collections get poor results. Why?",
        a: "Selective filters interact badly with approximate indexes, which may return neighbours that the filter then removes. Test with the real filters, and consider exact search for small filtered sets or iterative index scans where the engine offers them.",
      },
      {
        q: "You need to cut index memory by a factor of ten. What are your options, and what do they cost?",
        a: "Use product quantisation, or lower-dimension or quantised vectors, and measure the loss in recall. For example, 768 float32 numbers are 3,072 bytes while 96 eight-bit codes make 96 bytes, 32 times smaller, but distances become approximate, so you may re-rank candidates with the full vectors.",
      },
      {
        q: "When would you move to a dedicated vector database?",
        a: "When scale outgrows the current database, when you need more index and quantisation options or multi-tenancy features, and when the team is willing to run and keep another system in sync.",
      },
    ],
    mistakes: [
      "Picking a store from benchmark headlines without checking filters, permissions or what it takes to operate.",
      "Mixing embeddings from two different models in one index. Their distances mean nothing to each other.",
      "Never measuring recall against exact search, so a fast but lossy index goes unnoticed.",
      "Applying permissions after generation. The model has already seen what the user should not.",
    ],
  },

  'de-rag-ingestion-stable-ids-acls-and-deletes': {
    short:
      "Build ingestion as separate stages that can each fail and retry: connectors, parsing, cleaning, chunking, embedding and an upsert into the index. Give every chunk a stable ID made from the document ID, position and a content hash, so re-running the same document replaces records instead of duplicating them, and replace a document's whole chunk set when it is edited. Store the access list and version with each chunk, enforce permissions at retrieval, and sync permission changes on a short cycle. Keep the originals and the parsed text so you can re-run the pipeline without re-fetching.",
    explain: [
      {
        heading: "Stages, and why each can fail alone",
        body: "Connectors read the sources (PDFs, wiki pages, slide decks). A parser extracts text and structure, using OCR for scanned pages and handling tables on purpose, because a table flattened into a jumble of numbers cannot be searched. Then come cleaning, chunking, embedding and an upsert, which means insert the record or update it if it exists. Keep each stage able to retry on its own, and quarantine failures with the reason (a scanned page with no text, a corrupt file) instead of dropping them silently. Test the parsing step on a sample, since many retrieval failures start with bad extraction, not with the model.",
      },
      {
        heading: "Stable IDs, edits and deletions",
        body: "Make the chunk ID from the document ID, the chunk position and a hash of its text. Running the same document again then produces the same IDs, so the upsert changes nothing and adds no duplicates. Keep the content hash as a separate field too: if a chunk with that hash was already embedded, reuse its vector and skip the embedding call. When a document is edited, replace its whole set of chunks for the new version (delete the old ones and insert the new, or swap by a version tag), so leftovers from a longer previous version never remain in the index. Propagate deletions as tombstones, which are markers saying this document is gone, so they reach every copy of the data.",
      },
      {
        heading: "Metadata and permissions",
        body: "Store what retrieval and audits need: source and URL, document version, page or section, ingest time, parser and chunker versions, language and the access list (groups or tenant). Keep most of it out of the text sent to the model unless it helps there. Enforce permissions at retrieval using the source system's access list, never in the prompt. Revocations cannot wait for a nightly job, so sync permission changes on a short cycle or check the source of truth at query time. Test filtered search for recall, because strict filters can hide good results.",
      },
      {
        heading: "Keep the raw material and watch the pipeline",
        body: "Keep the original files and the parsed text, so a change of parser, chunker or embedding model can be re-run without fetching everything again. Monitor documents ingested, failure rate, chunks per document and freshness lag, the time between a source changing and the index reflecting it. A sudden drop in chunks per document usually means a parser broke, long before anyone complains about answers.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'read', label: "Read sources", sub: "Connectors for PDFs, wiki pages and slide decks" },
        { id: 'parse', label: "Parse and clean", sub: "OCR and tables handled on purpose, failures quarantined with a reason" },
        { id: 'chunk', label: "Chunk", sub: "Split at headings, keep position and a hash of each chunk's text" },
        { id: 'embed', label: "Embed what changed", sub: "Reuse stored vectors when the content hash is already known" },
        { id: 'upsert', label: "Upsert with stable IDs", sub: "Replace the document's whole chunk set, tombstone deletions" },
        { id: 'acl', label: "Sync access lists", sub: "Short cycle, filters applied at retrieval" },
        { id: 'watch', label: "Monitor", sub: "Failures, chunks per document, freshness lag" },
      ],
      highlight: ['chunk', 'upsert'],
      caption: "The highlighted steps are what make a re-run safe: the same input gives the same IDs, so nothing is added twice.",
    },
    example: {
      title: "Example: editing a document that has 40 chunks",
      text: "The numbers are an example. A document had 40 chunks. After an edit it has 36. Because the whole set is replaced, the index holds exactly 36 records for that document afterwards, not 40 + 36 = 76 as an append-only pipeline would leave. Of the 36 new chunks, 31 have the same text hash as before, so their stored vectors are reused, and only 5 need a new embedding call. Running the identical job a second time finds the same 36 IDs and the same hashes, so it makes 0 embedding calls and changes nothing.",
      rows: [
        { label: "Chunks before and after the edit", value: "40, then 36" },
        { label: "Records left in the index for it", value: "36 (an append-only job: 76)" },
        { label: "New embedding calls", value: "5 of 36 (31 reused by hash)" },
        { label: "Second identical run", value: "0 embedding calls, no change" },
      ],
    },
    followUps: [
      {
        q: "A user is removed from the finance group. How fast should they lose access to finance documents in the assistant, and how do you build that?",
        a: "As fast as the change happens in the source system, which in practice means a short sync interval or a query-time check against the source of truth. A prompt instruction is not access control.",
      },
      {
        q: "The same slide deck lives in five folders. What happens in your index?",
        a: "Five copies of every chunk fill the top results and may differ in who can open them. Deduplicate by content hash while keeping each location's access list, and cite one canonical source.",
      },
      {
        q: "A table in a PDF is read as a jumble of numbers. How do you find that and fix it?",
        a: "Run parsing checks on a sample of documents with tables, and use a layout-aware parser or table extraction, keeping the page image or a table-as-text version. Then measure retrieval on questions that need the table.",
      },
    ],
    mistakes: [
      "Appending chunks on every run with no stable IDs. Each re-run adds duplicates that crowd the top results.",
      "Leaving old chunks of an edited document in the index. They answer with text that no longer exists.",
      "Filtering by permission only in the prompt. Enforce it in retrieval, where the model never sees the text.",
      "Never looking at what the parser produced. Open some parsed pages and tables and read them.",
    ],
  },

  'de-reembed-index-when-the-embedding-model-changes': {
    short:
      "Vectors from two embedding models cannot be mixed, so the whole corpus must be re-embedded into a new index built beside the old one. With these numbers the job is 17.5 billion tokens, about $350 at the example price, roughly 6.9 hours at 2,000 chunks a second, and about 204.8 GB per copy, so around 410 GB while both exist. I would backfill in checkpointed batches, dual-write new changes, compare the two indexes on a labelled retrieval eval, then shift traffic gradually with a rollback window. Start early, because 90 days is not much if quota or evaluation takes longer than planned.",
    explain: [
      {
        heading: "Why everything must be re-embedded",
        body: "Each embedding model has its own space and often its own number of dimensions. A distance between a vector from the old model and one from the new model is meaningless, like comparing a temperature in Celsius with one in Fahrenheit and reading both as the same unit. So you cannot embed only new content and keep the old vectors. The whole corpus has to be embedded again with the new model, and the queries must use the new model as soon as you switch.",
      },
      {
        heading: "Cost, time and storage",
        body: "Tokens: 50,000,000 chunks x 350 tokens = 17.5 billion tokens. At an example $0.02 per million that is 17,500 x $0.02 = $350. Time: 50,000,000 / 2,000 per second = 25,000 seconds, which is about 6.9 hours of continuous work, longer once retries and rate limits are included. Storage: 50,000,000 x 1,024 x 4 bytes = 204.8 GB per copy before index overhead, so running old and new side by side needs about 2 x 204.8 = 409.6 GB. Quantised or lower-dimension vectors shrink this (one byte per number would be 51.2 GB), but only keep them if the eval shows no loss.",
      },
      {
        heading: "Cut over without an outage or a regression",
        body: "Build the new index next to the old one (blue and green). Dual-write fresh changes, including deletions, to both, and backfill history in checkpointed, idempotent batches, so a crash resumes instead of restarting. Before switching, run a retrieval eval against both indexes: recall at k, MRR, and filtered queries with real access filters, broken down by slice, because a higher benchmark score does not guarantee better results on your documents. Switch with an alias or flag, shift traffic gradually while watching quality and latency, keep the old index for an agreed window so you can roll back, then delete it.",
      },
      {
        heading: "Make the next migration easy",
        body: "Store with every vector the model name, version and dimension, the chunking parameters and a hash of the chunk text, so a future change is a query, not archaeology. Keep the parsed text, so re-embedding does not require re-parsing. Start early, request quota in advance and rehearse on a sample, because a 90-day deadline is a risk if the provider will not raise limits quickly.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "GB of raw vectors, before index overhead",
      items: [
        { label: "Old index", value: 204.8, note: "50 million x 1,024 x 4 bytes" },
        { label: "New index (same dimension)", value: 204.8, note: "built beside the old one" },
        { label: "Both during migration", value: 409.6, note: "plan for this peak", hot: true },
        { label: "New, one byte per number", value: 51.2, note: "only if the eval shows no loss" },
      ],
      caption: "Storage for the blue and green plan. Index overhead comes on top of every bar.",
    },
    example: {
      title: "Example: the job, and the same job at 20 times the size",
      text: "The price and speed are examples. Today: 17.5 billion tokens at $0.02 per million is $350, and 25,000 seconds at 2,000 chunks a second is about 6.9 hours. At 20 times the corpus, 1 billion chunks: 350 billion tokens is $7,000, 1,000,000,000 / 2,000 = 500,000 seconds, about 139 hours or 5.8 days, and raw vectors take 4,096 GB per copy. The money is small next to the engineering work, but the time and storage are not, which is why you skip duplicates and unchanged chunks, embed in large parallel batches within quota, and do the most-queried content first.",
      rows: [
        { label: "Tokens today", value: "50,000,000 x 350 = 17.5 billion" },
        { label: "Embedding cost today (example price)", value: "$350" },
        { label: "Time today at 2,000 chunks a second", value: "about 6.9 hours" },
        { label: "Raw storage per copy, both copies", value: "204.8 GB, 409.6 GB" },
        { label: "At 20 times the size", value: "$7,000, about 5.8 days, 4,096 GB per copy" },
      ],
    },
    followUps: [
      {
        q: "The new model scores better on a public benchmark but 3 points worse recall at 5 on your internal eval. What do you do?",
        a: "I trust the eval that reflects my data, but first check its size and slices, since a 3-point gap may sit inside the noise. I look at which queries lost, test tuning such as chunk size, hybrid search or a reranker, and record the decision with the data behind it.",
      },
      {
        q: "Midway through, a user asks to delete their documents. What goes wrong if you are not careful?",
        a: "The deletion reaches the old index but not the half-built new one, so the data comes back after cut-over. Send deletions to both indexes, and have the backfill check a tombstone list before inserting.",
      },
      {
        q: "How would you reduce cost and time if the corpus were 20 times larger?",
        a: "Skip duplicates and unchanged chunks, embed in large batches in parallel within quota, prioritise the most-queried content first, and consider a smaller dimension or quantised vectors if quality holds. Check every shortcut against the eval.",
      },
    ],
    mistakes: [
      "Re-embedding only new documents and keeping the old vectors. The two sets live in different spaces.",
      "Switching traffic with no evaluation on the new index. A model that looks better on a leaderboard can be worse on your documents.",
      "Not recording which model produced each vector. The next migration then starts with guesswork.",
      "Overwriting the old index in place with no rollback. Keep it until the new one has proved itself.",
    ],
  },

  'recommender-two-stage-retrieval-and-ranking': {
    short:
      "Start with a most-popular list as the baseline, because it is strong and anything fancier must beat it. Then use a funnel, because a heavy model cannot score a million titles in 150 ms: a fast candidate stage (often a two-tower model with an approximate nearest-neighbour index) cuts 1,000,000 titles to hundreds, a richer ranker scores those, and a final re-ranking step applies rules such as freshness, diversity and what was already seen. Handle cold start with popularity and content features, evaluate offline with ranking metrics and online with an A/B test, and watch for feedback loops that narrow what people see.",
    explain: [
      {
        heading: "Baseline, then a funnel",
        body: "The data is a user-by-title table that is mostly blank: most people have watched a tiny fraction of the catalogue. A most-popular list is the same for everyone and surprisingly strong, so it is the baseline to beat. To go beyond it, use stages. Candidate generation is fast and rough: a two-tower model has a user tower and an item tower, each producing a vector, and the score is their dot product. It cuts 1,000,000 titles to a few hundred. A ranker then sees user, item and context features together (time of day, device) and scores only those few hundred. A re-ranking stage applies rules: drop what was seen or rejected, keep freshness, add diversity, cap titles per provider. Example sizes: 1,000,000 to 500 to 50 to 10.",
      },
      {
        heading: "Why two towers fit the time budget",
        body: "An item vector does not depend on the user, so all item vectors are computed offline and put into an approximate nearest-neighbour index. At request time only the user vector is computed, then looked up. With example 64-dimension vectors, 1,000,000 items x 64 x 4 bytes = 256 MB, small enough to hold in memory. An exact scan would do 1,000,000 x 64 = 64 million multiply-adds per request, wasteful at scale. The cost is that a dot product of two separate vectors cannot capture fine interactions between a user and an item, which is exactly what the second-stage ranker adds. Train with plays as positives, and use titles shown but not played as negatives, which teach more than random titles because random ones are too easy.",
      },
      {
        heading: "Cold start and evaluation",
        body: "A new user gets popularity, a few onboarding questions or context such as country and device. A new title has no plays, so place it through the item tower using content features (genre, text, an image embedding), and give it deliberate exposure so it can collect data. Offline, hold out items people liked and report precision, recall and NDCG at k, remembering the logged data came from the old system and shows its choices. Confirm online with an A/B test on watch time, returns and guardrails such as complaints, sized before it starts: choose the smallest change worth detecting, work out the sample, and run whole weeks.",
      },
      {
        heading: "What goes wrong over time",
        body: "A feedback loop: shown titles collect clicks, so they get shown more, and titles that are never shown never get a chance. The catalogue narrows, people see the same thing, and smaller providers are starved. Mitigate with exploration slots (a small share of random or uncertain titles), coverage metrics, caps per provider and fairness measures for each side of the market. Watch also for drift, because tastes and the catalogue change, and retrain on a schedule with monitoring.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'catalogue', label: "1,000,000 titles", sub: "Too many for a heavy model in 150 ms" },
        { id: 'candidates', label: "Candidate generation", sub: "Two-tower dot product with an approximate index, cut to about 500" },
        { id: 'ranker', label: "Ranker", sub: "Sees user, item and context together, keeps about 50" },
        { id: 'rerank', label: "Re-ranking rules", sub: "Drop seen titles, add freshness and diversity, cap per provider" },
        { id: 'ten', label: "The ten shown", sub: "Logged, so exposure can be measured and corrected" },
      ],
      highlight: ['candidates', 'ranker'],
      caption: "Each stage is more expensive per title and sees fewer titles. The sizes shown are an example.",
    },
    example: {
      title: "Example: where 150 ms might go, and why the heavy model stays small",
      text: "These are example numbers. If the ranker scored all 1,000,000 titles instead of 500, it would do 1,000,000 / 500 = 2,000 times more work per request, so a ranker that takes 50 ms on 500 candidates would need about 100 seconds on the whole catalogue. A plausible split of the 150 ms budget is below, and the parts add up to 150 ms. At an example 1,000 requests a second, an exact scan of 64 million multiply-adds each would be 64 billion multiply-adds every second just for candidate search, which is why the approximate index is used.",
      rows: [
        { label: "Candidate search (example)", value: "20 ms" },
        { label: "Fetch user and item features", value: "30 ms" },
        { label: "Ranker on 500 candidates", value: "50 ms" },
        { label: "Re-ranking rules", value: "10 ms" },
        { label: "Network and safety margin", value: "40 ms" },
        { label: "Total", value: "150 ms" },
      ],
    },
    followUps: [
      {
        q: "NDCG@10 is up 3% offline but the A/B test is flat. Why?",
        a: "Offline labels come from what the old system showed, so they carry selection and position bias, and the metric is only a proxy for watch time or returns. Short-term clicks can differ from satisfaction, novelty fades, and the test may be underpowered.",
      },
      {
        q: "Three weeks after launch the long tail of titles gets almost no exposure. How do you diagnose it?",
        a: "That is a feedback loop: rarely shown titles cannot collect clicks, so ranking by raw clicks locks in the leaders. A small share of random exposure helps, and real systems use more careful exploration plus caps per provider.",
      },
      {
        q: "Why not one big model that scores all 1,000,000 titles?",
        a: "Latency and cost. The heavy model runs on a few hundred candidates only, and the cheap first stage keeps recall high so the ranker still has good candidates to choose from.",
      },
    ],
    mistakes: [
      "Scoring the whole catalogue with one model on every request. It cannot fit the latency budget.",
      "Skipping the popularity baseline. You will not know whether the complex system beats a list anyone could make.",
      "Evaluating only rating prediction error, or only offline. Confirm with an online test on watch time and guardrails.",
      "Having no plan for cold start or for the loop between recommendations and training data.",
    ],
  },
};
