/**
 * "How big companies build it": other organisations' own engineering write-ups.
 * Every entry was opened and read on casesChecked. The one-line `learn` is taken
 * from what the page itself states; the numbers are the company's own claims,
 * measured on its own workloads. Run `npm run check-links` to see which links
 * have moved.
 */
export type CaseTopic = 'rag' | 'agents' | 'serving' | 'evals' | 'platform' | 'cost' | 'safety' | 'search';

export type Case = {
  company: string;
  title: string;
  url: string;
  topic: CaseTopic;
  /** Published date shown on the page, as YYYY-MM-DD. Left out when the page shows none. */
  date?: string;
  /** One factual sentence from the page, under 160 characters. */
  learn: string;
  /** A lesson here that teaches the background. */
  lesson?: string;
};

export const casesChecked = '2026-10-27';

export const topicLabels: Record<CaseTopic, string> = {
  rag: 'Retrieval and RAG',
  agents: 'Agents',
  serving: 'Serving models',
  evals: 'Evals',
  platform: 'Platforms and infrastructure',
  cost: 'Cost',
  safety: 'Safety and privacy',
  search: 'Search and ranking',
};

export const cases: Case[] = [
  // ---- retrieval and RAG ----
  {
    company: 'Anthropic',
    title: 'Introducing Contextual Retrieval',
    url: 'https://www.anthropic.com/research/contextual-retrieval',
    topic: 'rag',
    date: '2024-09-19',
    learn: 'Adding context to each chunk before embedding cut failed retrievals by 35%, by 49% with BM25, and by 67% with reranking.',
    lesson: 'rag-agents/chunking-and-retrieval-quality',
  },
  {
    company: 'Uber',
    title: 'Genie: Uber’s Gen AI On-Call Copilot',
    url: 'https://www.uber.com/us/en/blog/genie-ubers-gen-ai-on-call-copilot/',
    topic: 'rag',
    date: '2024-10-10',
    learn: 'An on-call helper answered 70,000+ questions in 154 Slack channels; Uber chose RAG over fine-tuning to reach users sooner.',
    lesson: 'rag-agents/rag-from-scratch',
  },
  {
    company: 'Uber',
    title: 'Enhanced Agentic-RAG: What If Chatbots Could Deliver Near-Human Precision?',
    url: 'https://www.uber.com/us/en/blog/enhanced-agentic-rag/',
    topic: 'rag',
    date: '2025-05-29',
    learn: 'Agentic RAG with an LLM judge raised acceptable answers 27% and cut incorrect advice 60% on a 100+ query golden set.',
    lesson: 'rag-agents/vector-search-and-retrieval-metrics',
  },
  {
    company: 'Dropbox',
    title: 'Building Dash: How RAG and AI agents help us meet the needs of businesses',
    url: 'https://dropbox.tech/machine-learning/building-dash-rag-multi-step-ai-agents-business-users',
    topic: 'rag',
    date: '2025-04-24',
    learn: 'Retrieval mixes lexical search, on-the-fly chunking and reranking with a larger embedding model; over 95% of queries finish in 1 to 2 seconds.',
    lesson: 'systems/rag-service-architecture',
  },
  {
    company: 'LinkedIn',
    title: 'Musings on Building a Generative AI Product',
    url: 'https://www.linkedin.com/blog/engineering/generative-ai/musings-on-building-a-generative-ai-product',
    topic: 'rag',
    date: '2024-04-25',
    learn: 'A routing, retrieval and generation pipeline with LLM-friendly “skills”; a defensive YAML parser cut parsing errors from about 10% to 0.01%.',
    lesson: 'systems/rag-service-architecture',
  },

  // ---- agents ----
  {
    company: 'Anthropic',
    title: 'Building effective agents',
    url: 'https://www.anthropic.com/research/building-effective-agents',
    topic: 'agents',
    date: '2024-12-19',
    learn: 'Five workflow patterns, when a fixed workflow beats an agent, and why to start with the simplest design and add complexity only when needed.',
    lesson: 'rag-agents/agents-and-tool-use',
  },
  {
    company: 'Anthropic',
    title: 'How we built our multi-agent research system',
    url: 'https://www.anthropic.com/research/multi-agent-research-system',
    topic: 'agents',
    date: '2025-06-13',
    learn: 'A lead agent with parallel subagents beat a single agent by 90.2% on an internal eval, using about 15 times the tokens of a chat.',
    lesson: 'rag-agents/agents-and-tool-use',
  },
  {
    company: 'Shopify',
    title: 'Building production-ready agentic systems: Lessons from Shopify Sidekick',
    url: 'https://shopify.engineering/building-production-ready-agentic-systems',
    topic: 'agents',
    date: '2025-08-26',
    learn: 'Tool lists stay easy to debug up to about 20 tools and get hard to reason about past 50; LLM judges reached a kappa of 0.61 against humans’ 0.69.',
    lesson: 'rag-agents/agents-and-tool-use',
  },
  {
    company: 'Stripe',
    title: 'Production-grade AI agents for financial compliance: Lessons from Stripe',
    url: 'https://aws.amazon.com/blogs/machine-learning/production-grade-ai-agents-for-financial-compliance-lessons-from-stripe/',
    topic: 'agents',
    date: '2026-06-26',
    learn: 'Agentic review cut median handling time 26% with over 96% helpfulness ratings, and prompt caching cut costs 60% (published on the AWS blog).',
    lesson: 'rag-agents/agents-and-tool-use',
  },
  {
    company: 'Dropbox',
    title: 'Engineering VP Josh Clemm on how we use knowledge graphs, MCP, and DSPy in Dash',
    url: 'https://dropbox.tech/machine-learning/vp-josh-clemm-knowledge-graphs-mcp-and-dspy-dash',
    topic: 'agents',
    date: '2026-01-28',
    learn: 'Dash caps context near 100,000 tokens because tool definitions fill it fast, and an MCP-based agent can take up to 45 seconds on a simple query.',
    lesson: 'rag-agents/the-tools-and-ecosystem',
  },

  // ---- serving models ----
  {
    company: 'Cloudflare',
    title: 'How we built the most efficient inference engine for Cloudflare’s network',
    url: 'https://blog.cloudflare.com/cloudflares-most-efficient-ai-inference-engine/',
    topic: 'serving',
    date: '2025-08-27',
    learn: 'Infire, a Rust engine with a paged KV cache, ran up to 7% faster than vLLM 0.10.0 at much lower CPU load in Cloudflare’s tests.',
    lesson: 'serving/kv-cache-and-memory',
  },
  {
    company: 'Cloudflare',
    title: 'Building the foundation for running extra-large language models',
    url: 'https://blog.cloudflare.com/high-performance-llms/',
    topic: 'serving',
    date: '2026-04-16',
    learn: 'Prefill-decode disaggregation cut p90 time per token from about 100 ms to 20 to 30 ms for a model with over a trillion parameters.',
    lesson: 'serving/life-of-a-request',
  },
  {
    company: 'Databricks',
    title: 'LLM Inference Performance Engineering: Best Practices',
    url: 'https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices',
    topic: 'serving',
    date: '2023-10-12',
    learn: 'Decode speed as memory-bandwidth maths, why doubling GPUs gives diminishing latency gains, and how 8-bit weights can halve the GPUs needed.',
    lesson: 'serving/inference-optimisation',
  },
  {
    company: 'Databricks',
    title: 'Accelerated DBRX Inference on Databricks Model Serving',
    url: 'https://www.databricks.com/blog/accelerated-dbrx-inference-mosaic-ai-model-serving',
    topic: 'serving',
    date: '2024-04-16',
    learn: 'Serving a 132B mixture-of-experts model that activates about 36B parameters per token, needing at least four 80 GB GPUs at 16-bit.',
    lesson: 'serving/inference-optimisation',
  },
  {
    company: 'Google Cloud',
    title: 'GKE Inference Gateway and Quickstart are GA',
    url: 'https://cloud.google.com/blog/products/ai-machine-learning/gke-inference-gateway-and-quickstart-are-ga',
    topic: 'serving',
    date: '2025-09-11',
    learn: 'Prefix-aware routing cut time to first token by up to 96% on prefix-heavy workloads; disaggregated serving can lift throughput 60%.',
    lesson: 'infra/kubernetes-and-autoscaling-for-inference',
  },
  {
    company: 'Google Cloud',
    title: 'Introducing the next generation of AI inference, powered by llm-d',
    url: 'https://cloud.google.com/blog/products/ai-machine-learning/enhancing-vllm-for-distributed-inference-with-llm-d',
    topic: 'serving',
    date: '2025-05-21',
    learn: 'A vLLM-aware scheduler sends requests to instances with prefix-cache hits, runs prefill and decode apart, and adds a multi-tier KV cache.',
    lesson: 'serving/kv-cache-and-memory',
  },
  {
    company: 'Amazon',
    title: 'How Amazon scaled Rufus by building multi-node inference using AWS Trainium chips and vLLM',
    url: 'https://aws.amazon.com/blogs/machine-learning/how-amazon-scaled-rufus-by-building-multi-node-inference-using-aws-trainium-chips-and-vllm/',
    topic: 'serving',
    date: '2025-08-13',
    learn: 'A leader and follower vLLM design splits prefill by sequence and decode by batch across nodes to serve Prime Day traffic.',
    lesson: 'infra/multi-gpu-parallelism-and-interconnect',
  },

  // ---- cost ----
  {
    company: 'Notion',
    title: 'Two years of vector search at Notion: 10x scale, 1/10th cost',
    url: 'https://www.notion.com/blog/two-years-of-vector-search-at-notion',
    topic: 'cost',
    date: '2026-02-19',
    learn: 'Serverless search cut cost 50%, a cheaper engine cut search spend 60%, and hashing pages to re-embed only changed text cut data volume 70%.',
    lesson: 'rag-agents/vector-search-and-retrieval-metrics',
  },
  {
    company: 'Spotify',
    title: 'Advancing Generative Recommendation Inference: our collaboration with NVIDIA on TensorRT LLM',
    url: 'https://engineering.atspotify.com/2026/10/advancing-generative-recommendation-inference-our-collaboration-with-nvidia-on-tensorrt-llm',
    topic: 'cost',
    date: '2026-10-16',
    learn: 'Running beam search inside the engine’s sampler cut cost by up to 54% for beam-search workloads on a 1.7B model.',
    lesson: 'serving/inference-optimisation',
  },
  {
    company: 'Amazon',
    title: 'How Rufus doubled their inference speed and handled Prime Day traffic with AWS AI chips and parallel decoding',
    url: 'https://aws.amazon.com/blogs/machine-learning/how-rufus-doubled-their-inference-speed-and-handled-prime-day-traffic-with-aws-ai-chips-and-parallel-decoding/',
    topic: 'cost',
    date: '2025-05-28',
    learn: 'Parallel decoding roughly doubled generation speed and cut inference costs 50%; the query planner had a 300 ms latency target.',
    lesson: 'serving/inference-optimisation',
  },
  {
    company: 'Discord',
    title: 'Developing Rapidly with Generative AI',
    url: 'https://discord.com/blog/developing-rapidly-with-generative-ai',
    topic: 'cost',
    date: '2024-04-12',
    learn: 'Prototype on commercial LLMs, judge outputs with a stronger model, and self-host smaller models, scaling up only when quality requires it.',
    lesson: 'local/self-hosting-vs-api-economics',
  },

  // ---- evals ----
  {
    company: 'Anthropic',
    title: 'Demystifying evals for AI agents',
    url: 'https://www.anthropic.com/research/demystifying-evals-for-ai-agents',
    topic: 'evals',
    date: '2026-01-09',
    learn: 'Start with 20 to 50 tasks drawn from real failures, grade what the agent produced rather than its steps, and use pass^k to measure consistency.',
    lesson: 'evals/evals-101',
  },
  {
    company: 'Airbnb',
    title: 'Eval-driven development: Lessons from evaluating GenAI at scale',
    url: 'https://airbnb.tech/ai-ml/eval-driven-development-lessons-from-evaluating-genai-at-scale/',
    topic: 'evals',
    learn: 'Use 3 to 5 calibrated LLM judges rather than 20 to 30 noisy ones, calibrate on 50 to 100 golden examples, and sample 5% of live traffic daily.',
    lesson: 'evals/llm-as-judge-pitfalls',
  },
  {
    company: 'Shopify',
    title: 'Teaching Sidekick to say no: automated data curation with LLM judge consensus',
    url: 'https://shopify.engineering/sidekick-curation',
    topic: 'evals',
    date: '2026-06-15',
    learn: 'Four frontier LLM judges had to agree on both the verdict and the reasoning before a training label was kept.',
    lesson: 'evals/llm-as-judge-pitfalls',
  },
  {
    company: 'GitHub',
    title: '60 million Copilot code reviews and counting',
    url: 'https://github.blog/ai-and-ml/github-copilot/60-million-copilot-code-reviews-and-counting/',
    topic: 'evals',
    date: '2026-03-05',
    learn: 'Copilot gave actionable feedback in 71% of reviews; a stronger reasoning model raised positive feedback 6% but added 16% latency.',
    lesson: 'evals/llmops-in-production',
  },
  {
    company: 'GitHub',
    title: 'Evaluating performance and efficiency of the GitHub Copilot agentic harness across models and tasks',
    url: 'https://github.blog/ai-and-ml/github-copilot/evaluating-performance-and-efficiency-of-the-github-copilot-agentic-harness-across-models-and-tasks/',
    topic: 'evals',
    date: '2026-06-25',
    learn: 'Compares its agent harness with model vendors’ own harnesses using the same model and task, with five independent runs per model.',
    lesson: 'evals/evals-101',
  },

  // ---- platforms and infrastructure ----
  {
    company: 'Meta',
    title: 'Building Meta’s GenAI Infrastructure',
    url: 'https://engineering.fb.com/2024/03/12/data-center-engineering/building-metas-genai-infrastructure/',
    topic: 'platform',
    date: '2024-03-12',
    learn: 'Two 24,576-GPU H100 clusters, one on RoCE and one on InfiniBand; tuning lifted collective-communication use from 10 to 90% back above 90%.',
    lesson: 'infra/training-infrastructure',
  },
  {
    company: 'Uber',
    title: 'Navigating the LLM Landscape: Uber’s Innovation with GenAI Gateway',
    url: 'https://www.uber.com/us/en/blog/genai-gateway/',
    topic: 'platform',
    date: '2024-07-11',
    learn: 'A gateway copies the OpenAI API so teams can reach many vendors, and replaces PII with placeholders before requests leave.',
    lesson: 'systems/model-routing-and-fallbacks',
  },
  {
    company: 'Shopify',
    title: 'Evolution of Product Classification at Shopify: From Categories to Comprehensive Product Understanding',
    url: 'https://shopify.engineering/evolution-product-classification',
    topic: 'platform',
    date: '2025-05-08',
    learn: 'The classification platform makes over 30 million predictions a day, and merchants accept 85% of the predicted product categories.',
  },
  {
    company: 'Amazon',
    title: 'The technology behind Amazon’s GenAI-powered shopping assistant, Rufus',
    url: 'https://www.amazon.science/blog/the-technology-behind-amazons-genai-powered-shopping-assistant-rufus',
    topic: 'platform',
    date: '2024-10-04',
    learn: 'A custom shopping LLM on Trainium and Inferentia with continuous batching, streamed tokens, and “hydration” that fills answers from internal systems.',
    lesson: 'serving/life-of-a-request',
  },
  {
    company: 'Microsoft',
    title: 'Deep dive into Azure Maia 300 architecture',
    url: 'https://azure.microsoft.com/en-us/blog/deep-dive-into-azure-maia-300-architecture/',
    topic: 'platform',
    date: '2026-10-12',
    learn: 'A rack holds 96 accelerators, each with 288 GB of HBM4 at 18 TB/s, and a superpod scales to 12,288 (a vendor announcement, with its own figures).',
    lesson: 'infra/reading-a-gpu-spec-sheet',
  },

  // ---- safety and privacy ----
  {
    company: 'Anthropic',
    title: 'Next-generation Constitutional Classifiers',
    url: 'https://www.anthropic.com/research/next-generation-constitutional-classifiers',
    topic: 'safety',
    date: '2026-01-09',
    learn: 'A light probe screens all traffic and passes suspect exchanges to a stronger classifier: 0.05% harmless refusals and about 1% extra compute.',
    lesson: 'evals/llm-security',
  },
  {
    company: 'Anthropic',
    title: 'Mitigating prompt injections in browser use',
    url: 'https://www.anthropic.com/research/prompt-injection-defenses',
    topic: 'safety',
    date: '2025-11-24',
    learn: 'Classifiers scan untrusted content; against an adaptive attacker with 100 tries, success fell from 8.0% to 1.4% on Opus 4.5.',
    lesson: 'evals/llm-security',
  },
  {
    company: 'Microsoft',
    title: 'How Microsoft defends against indirect prompt injection attacks',
    url: 'https://www.microsoft.com/en-us/msrc/blog/2025/07/how-microsoft-defends-against-indirect-prompt-injection-attacks',
    topic: 'safety',
    date: '2025-07-29',
    learn: 'Spotlighting marks untrusted text, Prompt Shields detects attacks, and risky actions need human approval, such as sending a drafted email.',
    lesson: 'evals/llm-security',
  },
  {
    company: 'Google',
    title: 'Mitigating prompt injection attacks with a layered defense strategy',
    url: 'https://blog.google/security/mitigating-prompt-injection-attacks/',
    topic: 'safety',
    date: '2025-06-13',
    learn: 'Layers include security reminders around untrusted content, markdown sanitisation that blocks image exfiltration, and confirmation before risky actions.',
    lesson: 'evals/llm-security',
  },
  {
    company: 'Slack',
    title: 'How We Built Slack AI To Be Secure and Private',
    url: 'https://slack.engineering/how-we-built-slack-ai-to-be-secure-and-private/',
    topic: 'safety',
    date: '2024-04-18',
    learn: 'Closed-source models run in an AWS escrow VPC, use RAG instead of training on customer data, and outputs are not stored where possible.',
    lesson: 'cloud/cloud-security-and-networking-for-ai',
  },

  // ---- search and ranking ----
  {
    company: 'Airbnb',
    title: 'Embedding-Based Retrieval for Airbnb Search',
    url: 'https://airbnb.tech/ai-ml/embedding-based-retrieval-for-airbnb-search/',
    topic: 'search',
    learn: 'A two-tower model with daily-batch listing embeddings; IVF beat HNSW on memory because prices and availability change so often.',
    lesson: 'rag-agents/vector-search-and-retrieval-metrics',
  },
  {
    company: 'Instacart',
    title: 'Building The Intent Engine: How Instacart is Revamping Query Understanding with LLMs',
    url: 'https://company.instacart.com/tech-innovation/building-the-intent-engine-how-instacart-is-revamping-query-understanding-with-llms',
    topic: 'search',
    date: '2025-11-21',
    learn: 'Caching handles most traffic, so only 2% of queries need real-time inference; merging LoRA adapters and H100s cut latency from about 700 to 300 ms.',
    lesson: 'cost/cost-levers',
  },
];
