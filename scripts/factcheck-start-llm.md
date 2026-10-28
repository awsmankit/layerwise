# Fact-check: start, foundations, llm, rag-agents, evals

Checked on 2026-10-28. Scope: every lesson in these five tracks except the ones added in the last two days (the-tools-and-ecosystem, langchain-and-langgraph, mcp-in-depth, choosing-ai-libraries, parameters-and-hyperparameters, prompt-patterns-and-optimisation, one-question-all-the-way-through, reasoning-models, evaluating-agents, eu-ai-act-for-engineers). That is 21 lessons.

Method: `node scripts/check-source-links.mjs start foundations llm rag-agents evals` (132 source links, none broken), then every specific claim (numbers, dates, citations, formulas, product names) checked against a primary source, and every number in a worked example recomputed with Python where it could be.

## Corrections

| Lesson | Claim | Problem | Fix | Source |
|---|---|---|---|---|
| foundations/tokens-and-embeddings | "typically tens of thousands of pieces" in a tokenizer's vocabulary | Out of date. Recent tokenizers are much larger (the o200k_base tokenizer used elsewhere on this site has about 200,000 entries). | "from tens of thousands of pieces in older models to a few hundred thousand in some recent ones" | https://github.com/openai/tiktoken (o200k_base, measured on this machine) |
| evals/llm-security | OWASP 2026 list "released in August 2026" | OWASP's page shows the date 3 August 2026 under the title but does not call it a release date; the preface gives no date. | "dated August 2026 on OWASP's site" | https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/ |
| rag-agents/vector-search-and-retrieval-metrics | "answer relevance" metric (Ragas) | Current Ragas docs call it Response Relevancy (the page slug is still answer_relevance). The method described was correct. | Added the current name in the table row | https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/answer_relevance/ |

## Links replaced (all five still resolved through a redirect; moved to the current address)

| Lesson | Old | New |
|---|---|---|
| evals/llmops-in-production | https://platform.claude.com/docs/en/about-claude/models/overview | https://platform.claude.com/docs/en/models/overview |
| llm/prompting-and-structured-output | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview |
| llm/prompting-and-structured-output | https://docs.pydantic.dev | https://pydantic.dev/docs/ |
| rag-agents/agents-and-tool-use | https://www.anthropic.com/engineering/building-effective-agents | https://www.anthropic.com/research/building-effective-agents |
| start/using-ai-without-getting-burned | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview |

Lessons changed carry `updated: 2026-10-28`.

## Verified, no change needed

| Lesson | Claims checked | How |
|---|---|---|
| foundations/how-models-learn | Every number in the worked example and the learning-rate section (loss 29, 12.96, 5.82, 0.10, 0.02, 0.00; w and b after each step; 157 and 849 at lr 0.1; 27.1 and 25.3 at lr 0.001) | Ran the lesson's own code |
| foundations/ml-to-ai-timeline (and its Timeline component) | Dates and attributions for Turing 1950, perceptron 1958, backpropagation 1986, LSTM 1997, LeNet 1998, AlexNet 2012, word2vec 2013, Bahdanau attention 2014, Transformer 2017, BERT and GPT 2018, scaling laws and GPT-3 2020, InstructGPT, Chinchilla and ChatGPT 2022, Bedrock general availability 2023, MCP introduced 2024 | Known primary papers and announcements |
| foundations/training-pipeline | RLHF versus DPO description; Chinchilla "too little data for their size" | Papers (Ouyang 2022, Rafailov 2023, Hoffmann 2022) |
| foundations/attention-intuition, inside-a-transformer | softmax(QKᵀ/√d)V and the reason for √d; GQA cache ratio G/H; "32 query heads, 8 KV heads keeps a quarter"; FFN four times wider in the original paper; post-norm in the original paper; Mixtral 8x7B has about 47B total and 13B active parameters, two of eight experts; the top-p worked example (0.56, 0.33, 0.11); block parameter count 4d² + 8d² | Vaswani 2017, Ainslie 2023, Jiang 2024; arithmetic recomputed |
| foundations/classical-ml-essentials | Accuracy 0.97, precision 0.667, recall 0.80, F1 0.727 = 80/110; costs 1,020 and 480; threshold 1/101; FPR 20/950; tree models versus deep learning on tabular data (2022 study) | Arithmetic recomputed; Grinsztajn et al. 2022 |
| foundations/multimodal-models | CLIP 400 million pairs; Whisper about 680,000 hours; LLaVA recipe; ViT "16x16 words"; WER worked example | Papers' abstracts; arithmetic |
| llm/fine-tuning-in-practice | QLoRA fine-tunes a 65B model on a single 48 GB GPU; LoRA adapts the attention query and value projections; ZeRO 16 bytes per parameter (2+2+12), so 112 GB for 7B; LoRA parameter count 131,072 versus 16,777,216 (0.78%); 14 GB and 3.5 GB frozen weights | Dettmers 2023, Hu 2021, Rajbhandari 2019; arithmetic |
| llm/context-window-and-caching, prompting-vs-rag-vs-fine-tuning, start/* | "Lost in the middle", RAG paper citation, temperature formula p^(1/T), generic cost statements | Papers; claims are hedged by provider |
| rag-agents/vector-search-and-retrieval-metrics | RRF k = 60 and all four RRF scores (0.03252, 0.03227, 0.01613, 0.01587); PQ 3,072 bytes to 96 bytes (32x); squared L2 = 2 − 2cos for unit vectors; precision, recall, MRR and nDCG worked example (0.40, 0.67, 0.33, 0.42); pgvector 0.8.0 added iterative index scans; pgvector README example that a filter matching 10% of rows leaves about 4 of 40 | Recomputed; fetched the pgvector README |
| evals/llm-security | The ten 2026 entries, their IDs and order; "formerly System Prompt Leakage" for Hidden Context Exposure; "no clean equivalent to parameterised queries"; human confirmation for high-risk actions; the markdown-image exfiltration scenario; jailbreaking as a subset of injection; Agentic Applications list published 9 December 2025 | Fetched OWASP's page, the GitHub 2026/final folder, the preface and entries LLM01 and LLM08 |
| evals/llmops-in-production | The Claude models page lists a "Not sooner than" retirement date per model; the OpenTelemetry GenAI semantic-conventions repository exists and covers spans, metrics and events; canary arithmetic (5% of traffic at 20% errors adds about 1 point) | Fetched both pages; arithmetic |
| evals/llm-as-judge-pitfalls, evals-101 | MT-Bench biases (position, verbosity, self-enhancement); kappa 0.6 to 0.8 read as substantial | Zheng et al. 2023; Landis and Koch convention |
| start/using-ai-without-getting-burned (TrustCheck caption) | Mata v. Avianca: in June 2023 a federal court fined two lawyers and their firm $5,000 for a brief citing cases ChatGPT made up | Court decision (S.D.N.Y., 22 June 2023) and coverage |

## Could not verify, left as written because it is hedged

- "Models often use information in the middle of a long prompt less reliably" (attention-intuition, context-window): supported by Liu et al. 2023, and worded as a tendency.
- "Prompt caching is typically billed at a discount" (context-window): provider details differ and the lesson tells readers to check their provider's page. For Anthropic's current page the cache-read price is 10% of base input (and lower for some models) as of October 2026, which fits.
- Provider-specific claims inside components (ContextWindow, PromptCache) are labelled illustrative in their captions.

## Not mine, noted for the owners

- llm/prompt-patterns-and-optimisation: two Anthropic links moved from /engineering/ to /research/ (still resolve).
- rag-agents/mcp-in-depth: the build-server link now lives under /docs/2026-07-28/ (still resolves).
- rag-agents/agents-and-tool-use: the root modelcontextprotocol.io source redirects to the current docs intro (kept as is, it resolves).
- start/what-is-ai-in-plain-english: the checker reports the Google Machine Learning Crash Course as "moved" only because Google appends a locale (?hl=); the original URL resolves, so it was kept.
