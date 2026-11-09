import type { Swatch } from '../../lib/palette';
import type { ILevel, Kind, Question, Role } from './types';

/**
 * The twelve places the interview answers are filed under. A reader opens a category, sees its
 * questions with the short answer, and reads the full one. Every question belongs to exactly one
 * category (see `categoryOf`).
 */
export const categoryIds = [
  'llm-basics',
  'training',
  'rag-search',
  'agents-tools',
  'evals-testing',
  'serving-cost',
  'system-design',
  'ml-stats',
  'data-mlops',
  'security-safety',
  'edge-audio',
  'product-teams',
] as const;
export type CategoryId = (typeof categoryIds)[number];

export type Category = {
  id: CategoryId;
  title: string;
  /** One line on what you will be able to explain after reading it. */
  promise: string;
  /** A short paragraph for the top of the category page. */
  intro: string;
  swatch: Swatch;
  /** A TrackIcon name. */
  icon: string;
};

export const categories: Category[] = [
  {
    id: 'llm-basics',
    title: 'How language models work',
    promise: 'Tokens, attention, sampling, prompts and context: what happens between your question and the reply.',
    intro: 'Start here if the words token, context window or temperature still feel fuzzy. These answers explain how a language model reads and writes, and why it behaves the way it does.',
    swatch: 'pink',
    icon: 'llm',
  },
  {
    id: 'training',
    title: 'Training and building models',
    promise: 'Pre-training, fine-tuning, alignment, optimisation and the research habits that keep results honest.',
    intro: 'How a model goes from random numbers to something useful, what can go wrong during training, and how to tell a real improvement from noise.',
    swatch: 'purple',
    icon: 'deep-learning',
  },
  {
    id: 'rag-search',
    title: 'Retrieval, embeddings and search',
    promise: 'How an app finds the right passage: embeddings, chunking, vector search, ranking and RAG.',
    intro: 'Retrieval-augmented generation (RAG) means looking things up before answering. These answers cover how the looking-up works and how to find out when it is the weak link.',
    swatch: 'lime',
    icon: 'rag-agents',
  },
  {
    id: 'agents-tools',
    title: 'Agents, tools and MCP',
    promise: 'Loops, tool calls, memory, approvals and multi-agent designs, and when a plain workflow is better.',
    intro: 'An agent is a model that can decide to call tools and keep going until a task is done. These answers explain how that loop is built, how it fails, and how to keep it safe and affordable.',
    swatch: 'sky',
    icon: 'skills',
  },
  {
    id: 'evals-testing',
    title: 'Evals and testing',
    promise: 'How to measure an AI feature: test sets, LLM judges, flaky results, sample sizes and release gates.',
    intro: 'Because model output varies, ordinary tests are not enough. These answers show how to build a test set, trust a measurement and decide when something is good enough to ship.',
    swatch: 'red',
    icon: 'evals',
  },
  {
    id: 'serving-cost',
    title: 'Serving, GPUs and cost',
    promise: 'Inference, KV cache, batching, GPU choice, capacity and the arithmetic of what a request costs.',
    intro: 'Running a model for many people is a memory and money problem. These answers walk through the numbers: how much memory, how many tokens per second, and what that costs.',
    swatch: 'navy',
    icon: 'serving',
  },
  {
    id: 'system-design',
    title: 'System design and reliability',
    promise: 'Designing LLM apps and ML systems end to end: components, routing, fallbacks and failure modes.',
    intro: 'Design questions ask you to draw a whole system. These answers show a reliable order to work in: clarify, estimate, sketch, go deep on the risky part, then say how it fails.',
    swatch: 'tangerine',
    icon: 'blueprint',
  },
  {
    id: 'ml-stats',
    title: 'Classical ML and statistics',
    promise: 'Metrics, leakage, validation, A/B tests, forecasting and the statistics that stop you fooling yourself.',
    intro: 'Most AI work still rests on classical machine learning and careful statistics. These answers cover the ideas that decide whether a number can be believed.',
    swatch: 'yellow',
    icon: 'ml',
  },
  {
    id: 'data-mlops',
    title: 'Data pipelines and MLOps',
    promise: 'Data quality, features, drift, monitoring, deployment and getting a model to production and keeping it there.',
    intro: 'A model is only as good as the data feeding it and the process shipping it. These answers cover pipelines, monitoring and safe releases.',
    swatch: 'forest',
    icon: 'infra',
  },
  {
    id: 'security-safety',
    title: 'Security, privacy and responsible AI',
    promise: 'Prompt injection, data leaks, fairness, oversight, regulation and governance, in plain terms.',
    intro: 'AI systems can be attacked, can leak data and can treat people unfairly. These answers explain the main risks and the practical controls that reduce them. Rules differ by country; where law comes up, this is not legal advice.',
    swatch: 'magenta',
    icon: 'incident',
  },
  {
    id: 'edge-audio',
    title: 'On-device, audio and real-time',
    promise: 'Running models on small chips: memory, power, quantisation, speech and hearing devices.',
    intro: 'On a hearing aid or a wearable, the model must fit in a few megabytes, run in milliseconds and sip power. These answers show how to budget for that.',
    swatch: 'cocoa',
    icon: 'edge',
  },
  {
    id: 'product-teams',
    title: 'Product, customers and teams',
    promise: 'Scoping pilots, explaining limits, pricing, roadmaps, hiring and working with AI coding tools.',
    intro: 'Much of the job is people: customers, executives and teammates. These answers cover how to scope work, talk about limits honestly and run a team that ships AI safely.',
    swatch: 'periwinkle',
    icon: 'start',
  },
];

export const categoryById = (id: string): Category | undefined => categories.find((c) => c.id === id);

/* ------------------------------------------------------------------------------------------------
 * Assignment. Each question gets votes from its topics and its lessons; the category with the
 * most votes wins. Questions written for the customer and team roles go to product-teams unless
 * listed in `override`, and a small explicit map settles the ambiguous ones.
 * ---------------------------------------------------------------------------------------------- */

const TOPIC_VOTES: Record<CategoryId, string[]> = {
  'llm-basics': ['tokenization', 'transformers', 'attention', 'sampling', 'prompting', 'few-shot', 'structured output', 'constrained decoding', 'context window', 'parameters', 'hyperparameters', 'hallucination', 'multimodal', 'reasoning models', 'long context'],
  training: [
    'training', 'fine-tuning', 'lora', 'alignment', 'rlhf', 'reward hacking', 'sycophancy', 'deep learning', 'backpropagation', 'autograd', 'gradients', 'initialisation', 'normalisation', 'optimisers', 'learning rate', 'loss', 'cnn', 'computer vision', 'diffusion', 'generative models', 'vae', 'gan', 'scaling laws', 'reinforcement learning', 'grpo', 'post-training', 'ablations', 'hyperparameter search', 'compute budget', 'catastrophic forgetting', 'reading papers', 'state space models', 'optimisation', 'evaluation validity', 'contamination', 'benchmarks', 'integrity',
  ],
  'rag-search': ['rag', 'retrieval', 'vector search', 'embeddings', 'chunking', 'query rewriting', 'hyde', 'ranking', 'recommenders', 'ndcg', 'document parsing'],
  'agents-tools': ['agents', 'tool use', 'tool design', 'mcp', 'multi-agent', 'memory', 'langgraph', 'workflows', 'function calling', 'computer use', 'harness', 'durable execution', 'stop conditions', 'context engineering', 'text-to-sql'],
  'evals-testing': ['evals', 'llm-as-judge', 'testing', 'flaky tests', 'regression testing', 'coverage', 'test data', 'test planning', 'cohen kappa', 'ci', 'release gates', 'non-determinism', 'datasets', 'synthetic data'],
  'serving-cost': ['inference', 'gpu', 'kv cache', 'cost', 'capacity planning', 'latency', 'quantization', 'batching', 'semantic caching', 'caching', 'rate limiting', 'autoscaling', 'cloud', 'self-hosting', 'quotas', 'pricing', 'unit economics', 'sizing', 'energy', 'parallelism', 'rate limits', 'batch api'],
  'system-design': ['system design', 'architecture', 'reliability', 'routing', 'ux', 'libraries', 'frameworks', 'maintenance', 'llmops', 'migration', 'technical debt'],
  'ml-stats': ['classical ml', 'statistics', 'a/b testing', 'leakage', 'sample size', 'bootstrap', 'forecasting', 'time series', 'clustering', 'anomaly detection', 'bias', 'causal inference', 'sql', 'eda', 'validation', 'overfitting', 'baselines', 'imbalanced data', 'gradient boosting', 'base rate', 'thresholds', 'experiment design', 'metrics', 'simpsons paradox', 'cohorts', 'model selection', 'cross-validation', 'calibration', 'uplift', 'dimensionality reduction'],
  'data-mlops': ['data pipelines', 'data quality', 'drift', 'monitoring', 'deployment', 'canary', 'mlops', 'model registry', 'reproducibility', 'feature stores', 'training-serving skew', 'batch inference', 'online inference', 'schema drift', 'lineage', 'backfill', 'data formats', 'data versioning', 'deduplication', 'logging', 'tracing', 'observability', 'idempotency', 'data contract', 'labelling', 'point-in-time join', 'streaming', 'storage'],
  'security-safety': ['security', 'prompt injection', 'privacy', 'pii', 'fairness', 'governance', 'regulation', 'eu ai act', 'responsible ai', 'human oversight', 'human-in-the-loop', 'automation bias', 'explainability', 'interpretability', 'transparency', 'copyright', 'licensing', 'licences', 'supply chain', 'red teaming', 'guardrails', 'incident response', 'differential privacy', 'model cards', 'sandboxing', 'sandbox', 'compliance', 'audits', 'risk assessment', 'threat modelling', 'permissions', 'exfiltration', 'least privilege', 'data deletion', 'poisoning', 'secrets', 'data provenance', 'safety'],
  'edge-audio': ['edge', 'audio', 'tinyml', 'wake word', 'keyword spotting', 'hearing devices', 'npu', 'microcontrollers', 'on-device', 'on-device llm', 'ota updates', 'speech recognition', 'streaming asr', 'real-time', 'wearables', 'battery', 'fleet', 'noise suppression', 'spectrogram', 'runtimes', 'conversion', 'quantisation', 'hardware', 'edge vs cloud', 'fleet monitoring', 'sampling rate', 'aliasing', 'ctc', 'wer', 'power'],
  'product-teams': ['behavioural', 'communication', 'stakeholders', 'hiring', 'interviewing', 'product thinking', 'roi', 'roadmap', 'prioritisation', 'decision making', 'leadership', 'mentoring', 'team process', 'team culture', 'customer-facing', 'pilot scoping', 'discovery', 'pre-sales', 'poc', 'build vs buy', 'tco', 'adoption', 'change management', 'expectations', 'executive communication', 'handover', 'ai coding tools', 'ai tools', 'code review', 'team conventions', 'productivity', 'success criteria', 'scope', 'demos', 'requirements', 'trust', 'launch gating', 'launch planning', 'problem framing', 'objection handling'],
};

/** Lesson tracks and slugs that point to a category. The first lesson of a question counts double. */
const LESSON_VOTES: [RegExp, CategoryId][] = [
  [/^foundations\/(tokens-and-embeddings|inside-a-transformer|attention-intuition|multimodal-models)$/, 'llm-basics'],
  [/^llm\/(parameters-and-hyperparameters|prompting-and-structured-output|structured-output-in-depth|context-window-and-caching|reasoning-models|prompt-patterns-and-optimisation|long-context-or-rag)$/, 'llm-basics'],
  [/^foundations\/(how-models-learn|training-pipeline)$/, 'training'],
  [/^llm\/(fine-tuning-in-practice|choosing-and-comparing-models)$/, 'training'],
  [/^deep-learning\//, 'training'],
  [/^responsible\/teaching-a-model-to-behave$/, 'training'],
  [/^rag-agents\/(rag-from-scratch|chunking-and-retrieval-quality|vector-search-and-retrieval-metrics|query-understanding-for-rag|graphrag-and-knowledge-graphs|reading-real-documents)$/, 'rag-search'],
  [/^ml\/recommenders-and-ranking$/, 'rag-search'],
  [/^rag-agents\/(agents-and-tool-use|designing-tools-for-agents|mcp-in-depth|multi-agent-systems|agent-memory-and-context-engineering|langchain-and-langgraph|computer-use-and-browser-agents|text-to-sql-and-data-agents|choosing-an-agent-architecture)$/, 'agents-tools'],
  [/^evals\/(evals-101|building-an-eval-dataset|llm-as-judge-pitfalls|evaluating-agents)$/, 'evals-testing'],
  [/^serving\//, 'serving-cost'],
  [/^cost\//, 'serving-cost'],
  [/^infra\//, 'serving-cost'],
  [/^local\//, 'serving-cost'],
  [/^cloud\/quotas-capacity-and-regions$/, 'serving-cost'],
  [/^systems\/(rag-service-architecture|model-routing-and-fallbacks|llm-app-system-design|ml-system-design-interviews|ux-for-ai-features)$/, 'system-design'],
  [/^ml\//, 'ml-stats'],
  [/^foundations\/classical-ml-essentials$/, 'ml-stats'],
  [/^systems\/(data-pipelines-and-data-quality|monitoring-and-drift|batch-vs-online-inference-and-feature-stores|testing-and-deploying-ml-models|from-notebook-to-production)$/, 'data-mlops'],
  [/^evals\/(llmops-in-production|observability-for-llm-apps)$/, 'data-mlops'],
  [/^(responsible\/(?!teaching-a-model|ai-and-work|energy)|evals\/(llm-security|guardrails-in-practice|eu-ai-act-for-engineers)|cloud\/cloud-security)/, 'security-safety'],
  [/^systems\/human-in-the-loop-design$/, 'security-safety'],
  [/^(edge|audio)\//, 'edge-audio'],
  [/^(start\/|skills\/|systems\/when-not-to-use-an-llm|responsible\/ai-and-work|llm\/ai-assisted-software-development)/, 'product-teams'],
];

/** Roles whose questions are mostly about customers, products and teams. */
const PRODUCT_ROLES: Role[] = ['fde', 'solutions-architect', 'ai-pm', 'ai-lead', 'sw-ai-tools'];

/** Questions whose topics point two ways; the reason is next to each. */
const override: Record<string, CategoryId> = {
  // a design question that is really about shipping safely
  'design-llm-release-pipeline-eval-gates': 'evals-testing',
  'model-change-rolled-back': 'evals-testing',
  'provider-update-regression-communication': 'data-mlops',
  // numbers about cost or capacity, even though the asker is a customer role
  'sa-sizing-tokens-cost-and-peak-tpm': 'serving-cost',
  'sa-launch-day-quota-and-throttling': 'serving-cost',
  'sa-self-host-demand-from-security-team': 'serving-cost',
  'sa-reference-architecture-internal-assistant': 'system-design',
  'sa-multi-cloud-model-choice': 'system-design',
  'sa-explain-rag-to-a-non-technical-buyer': 'rag-search',
  'sa-do-you-train-on-our-data': 'security-safety',
  'sa-data-residency-question': 'security-safety',
  'fde-security-review-for-a-pilot': 'security-safety',
  'fde-agent-writes-to-legacy-system': 'agents-tools',
  'fde-messy-documents-sample-and-ocr-estimate': 'data-mlops',
  'fde-no-labelled-data-expert-hours': 'evals-testing',
  'fde-demo-works-production-fails': 'evals-testing',
  'fde-triage-one-wrong-answer-escalation': 'evals-testing',
  'pm-evals-as-product-requirements': 'evals-testing',
  'pm-ux-for-prefilled-fields-and-uncertain-extraction': 'system-design',
  'pm-cost-per-resolved-conversation': 'serving-cost',
  'pm-pricing-ai-seat-heavy-user-tail': 'serving-cost',
  'pm-working-with-legal-on-customer-data-in-prompts': 'security-safety',
  'lead-model-deprecation-migration-plan': 'data-mlops',
  'lead-technical-debt-in-ai-system': 'system-design',
  'lead-release-process-for-prompt-and-model-changes': 'evals-testing',
  'lead-measuring-roi-with-a-holdout': 'ml-stats',
  'lead-engineers-ship-without-evals-norm': 'evals-testing',
  // coding assistants: the risky ones are security questions
  'behavioural-pasted-company-code-into-a-public-chatbot': 'security-safety',
  'assistant-suggested-a-package-that-may-not-exist': 'security-safety',
  'licence-and-provenance-risk-in-generated-code': 'security-safety',
  'agent-edits-the-tests-to-go-green': 'evals-testing',
  'characterisation-tests-before-an-ai-refactor': 'evals-testing',
  // moved out of the security category so it stays a reasonable size
  'denial-of-wallet-cost-estimate': 'serving-cost',
  'behavioural-staged-autonomy-before-launch': 'agents-tools',
  'approval-fatigue-and-meaningful-gates': 'agents-tools',
  'background-coding-agent-sandbox-and-permissions': 'agents-tools',
  'detection-and-logging-for-an-llm-app': 'data-mlops',
  'de-pii-handling-in-training-and-rag-pipelines': 'data-mlops',
  'behavioural-severe-failure-two-days-before-launch': 'evals-testing',
  'explaining-a-decision-shapley-and-limits': 'ml-stats',
  'on-device-is-not-automatically-private': 'edge-audio',
  'agent-loop-input-tokens-grow-with-steps': 'agents-tools',
  'review-proposal-move-workflow-to-multi-agent': 'agents-tools',
  // others that sit between two homes
  'hallucination-mitigation': 'llm-basics',
  'long-context-vs-rag-break-even': 'rag-search',
  'reasoning-model-cost-vs-quality': 'serving-cost',
  'training-memory-adam-and-parallelism': 'training',
  'state-space-vs-attention-long-context-costs': 'llm-basics',
  'policy-assistant-per-role-access': 'system-design',
  'support-copilot-at-scale': 'system-design',
  'debug-morning-429-storm': 'system-design',
  'design-home-feed-ranking': 'system-design',
  'leaderboard-score-high-internal-task-poor-validity': 'evals-testing',
  'test-plan-for-a-rag-help-assistant': 'evals-testing',
};

const LEVEL_ORDER: ILevel[] = ['junior', 'mid', 'senior'];
const KIND_ORDER: Kind[] = ['concept', 'estimation', 'debugging', 'coding', 'design', 'behavioural'];

/** The primary category of a question. Every question gets exactly one. */
export function categoryOf(q: Question): CategoryId {
  return override[q.id] ?? derivedCategory(q);
}

/** What the votes say, before the override map is consulted. */
export function derivedCategory(q: Question): CategoryId {
  if (q.roles.every((r) => PRODUCT_ROLES.includes(r))) return 'product-teams';

  const votes = new Map<CategoryId, number>();
  const add = (id: CategoryId, n: number) => votes.set(id, (votes.get(id) ?? 0) + n);
  q.topics.forEach((t, i) => {
    for (const id of categoryIds) if (TOPIC_VOTES[id].includes(t)) add(id, i === 0 ? 2.5 : 1);
  });
  q.lessons.forEach((l, i) => {
    const hit = LESSON_VOTES.find(([re]) => re.test(l));
    if (hit) add(hit[1], i === 0 ? 2 : 0.75);
  });
  let best: CategoryId = 'product-teams';
  let top = -1;
  // ties go to the earlier category in the list, so the result never depends on map order
  for (const id of categoryIds) {
    const v = votes.get(id) ?? 0;
    if (v > top) {
      top = v;
      best = id;
    }
  }
  return best;
}

/** Fundamentals first: junior before mid before senior, plain concepts before designs, short before long. */
export function byDifficulty(a: Question, b: Question): number {
  return LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.minutes - b.minutes || a.id.localeCompare(b.id);
}

export type CategorySet = { category: Category; questions: Question[] };

/** The questions of every category, each list sorted from fundamentals to advanced. */
export function groupByCategory(all: Question[]): CategorySet[] {
  const byId = new Map<CategoryId, Question[]>(categoryIds.map((id) => [id, []]));
  for (const q of all) byId.get(categoryOf(q))!.push(q);
  return categories.map((category) => ({ category, questions: byId.get(category.id)!.sort(byDifficulty) }));
}
