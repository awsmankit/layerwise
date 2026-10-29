import { pair } from '../lib/palette';

export type PathId = 'newcomer' | 'student' | 'builder' | 'practitioner' | 'infra';

export type Step =
  | { kind: 'lesson'; key: string }
  | { kind: 'game'; label: string; href: string; note: string };

export type LearningPath = {
  id: PathId;
  title: string;
  who: string;
  /** Five words or fewer, for the cards on the home page. */
  short: string;
  promise: string;
  color: string;
  on: string;
  icon: string;
  steps: Step[];
  /** Path to suggest when this one is finished. */
  next?: PathId;
  /** A path whose lessons this one takes as known. */
  after?: PathId;
  /** Further lessons this path takes as known. */
  assumes?: string[];
};

export const paths: Record<PathId, LearningPath> = {
  newcomer: {
    id: 'newcomer',
    title: 'I’m new to AI',
    who: 'You have heard about AI and want to know how it works. No background needed, and simple enough for school students.',
    short: 'No background needed',
    promise: 'Short lessons in simple words, no maths or code: what AI is, how it learns, how a chatbot reads and answers, AI that sees and hears, and how to use it safely.',
    ...pair('yellow'),
    icon: 'start',
    steps: [
      { kind: 'lesson', key: 'start/what-is-ai-in-plain-english' },
      { kind: 'lesson', key: 'start/how-computers-learn' },
      { kind: 'lesson', key: 'start/how-a-chatbot-answers' },
      { kind: 'lesson', key: 'start/how-computers-read-words' },
      { kind: 'lesson', key: 'start/ai-that-sees-and-hears' },
      { kind: 'lesson', key: 'start/using-ai-without-getting-burned' },
      { kind: 'lesson', key: 'start/how-apps-use-ai' },
    ],
    next: 'student',
  },
  student: {
    id: 'student',
    title: 'From machine learning to modern AI',
    who: 'You want the whole story in order: how classical machine learning works, how it led to transformers, and how today’s large language models are trained.',
    short: 'Classic ML to today’s LLMs',
    promise: 'How models learn, the classical ML that is still asked about, tokens and embeddings, attention and transformers, training, and models that see and hear.',
    ...pair('turquoise'),
    icon: 'foundations',
    after: 'newcomer',
    steps: [
      { kind: 'lesson', key: 'foundations/ml-to-ai-timeline' },
      { kind: 'lesson', key: 'foundations/how-models-learn' },
      { kind: 'lesson', key: 'foundations/classical-ml-essentials' },
      { kind: 'lesson', key: 'foundations/tokens-and-embeddings' },
      { kind: 'lesson', key: 'foundations/attention-intuition' },
      { kind: 'lesson', key: 'foundations/inside-a-transformer' },
      { kind: 'lesson', key: 'start/one-question-all-the-way-through' },
      { kind: 'lesson', key: 'foundations/training-pipeline' },
      { kind: 'lesson', key: 'foundations/multimodal-models' },
    ],
    next: 'builder',
  },
  builder: {
    id: 'builder',
    title: 'I build with LLMs',
    who: 'You can call a model API and want to build features that work reliably, from the first prompt to a designed system.',
    short: 'Prompts, RAG, agents, design',
    promise: 'Prompts and context, retrieval, agents and MCP, images and audio, evals and security, cost, and how to design the whole system.',
    ...pair('pink'),
    icon: 'llm',
    assumes: ['foundations/tokens-and-embeddings', 'foundations/attention-intuition'],
    steps: [
      { kind: 'lesson', key: 'llm/prompting-and-structured-output' },
      { kind: 'lesson', key: 'llm/context-window-and-caching' },
      { kind: 'lesson', key: 'llm/prompting-vs-rag-vs-fine-tuning' },
      { kind: 'lesson', key: 'rag-agents/rag-from-scratch' },
      { kind: 'lesson', key: 'rag-agents/chunking-and-retrieval-quality' },
      { kind: 'lesson', key: 'rag-agents/agents-and-tool-use' },
      { kind: 'lesson', key: 'evals/evals-101' },
      { kind: 'lesson', key: 'llm/prompt-patterns-and-optimisation' },
      { kind: 'lesson', key: 'evals/llm-security' },
      { kind: 'lesson', key: 'rag-agents/the-tools-and-ecosystem' },
      { kind: 'lesson', key: 'rag-agents/mcp-in-depth' },
      { kind: 'lesson', key: 'foundations/multimodal-models' },
      { kind: 'lesson', key: 'llm/reasoning-models' },
      { kind: 'lesson', key: 'cost/where-the-tokens-go' },
      { kind: 'lesson', key: 'serving/life-of-a-request' },
      { kind: 'lesson', key: 'systems/llm-app-system-design' },
      { kind: 'lesson', key: 'systems/rag-service-architecture' },
      { kind: 'lesson', key: 'systems/model-routing-and-fallbacks' },
      { kind: 'lesson', key: 'rag-agents/langchain-and-langgraph' },
      { kind: 'lesson', key: 'rag-agents/choosing-ai-libraries' },
      { kind: 'lesson', key: 'cloud/cloud-ai-service-map' },
      { kind: 'game', label: 'Incident Room', href: '/play/incident-room/', note: 'Debug what you just learned to build.' },
    ],
    next: 'practitioner',
  },
  practitioner: {
    id: 'practitioner',
    title: 'I run AI in production',
    who: 'You own systems that serve real traffic and care about cost, latency, quality and failure modes.',
    short: 'Serving, cost, failure modes',
    promise: 'Serving internals, quantization and fine-tuning, advanced evals and LLMOps, cost, self-hosting, AWS, Azure and Google side by side, and the edge.',
    ...pair('navy'),
    icon: 'systems',
    after: 'builder',
    assumes: ['foundations/tokens-and-embeddings', 'foundations/how-models-learn', 'foundations/training-pipeline'],
    steps: [
      { kind: 'lesson', key: 'serving/kv-cache-and-memory' },
      { kind: 'lesson', key: 'serving/quantization' },
      { kind: 'lesson', key: 'serving/inference-optimisation' },
      { kind: 'game', label: 'Fit the Model, levels 3 and 4', href: '/play/fit-the-model/', note: 'Real memory arithmetic.' },
      { kind: 'lesson', key: 'llm/parameters-and-hyperparameters' },
      { kind: 'lesson', key: 'llm/fine-tuning-in-practice' },
      { kind: 'lesson', key: 'rag-agents/vector-search-and-retrieval-metrics' },
      { kind: 'lesson', key: 'evals/llm-as-judge-pitfalls' },
      { kind: 'lesson', key: 'evals/evaluating-agents' },
      { kind: 'lesson', key: 'evals/llmops-in-production' },
      { kind: 'lesson', key: 'evals/eu-ai-act-for-engineers' },
      { kind: 'game', label: 'Blueprint, level 3', href: '/play/blueprint/', note: 'Three valid designs out of 1,296.' },
      { kind: 'lesson', key: 'cost/cost-levers' },
      { kind: 'lesson', key: 'local/run-models-locally' },
      { kind: 'lesson', key: 'local/memory-math-for-local-models' },
      { kind: 'lesson', key: 'local/inference-engines-compared' },
      { kind: 'lesson', key: 'local/self-hosting-vs-api-economics' },
      { kind: 'lesson', key: 'local/private-and-air-gapped-ai' },
      { kind: 'lesson', key: 'cloud/what-is-bedrock' },
      { kind: 'lesson', key: 'cloud/microsoft-foundry-and-azure-openai' },
      { kind: 'lesson', key: 'cloud/google-vertex-and-gemini-platform' },
      { kind: 'lesson', key: 'cloud/bedrock-sagemaker-foundry-vertex' },
      { kind: 'lesson', key: 'cloud/sagemaker-and-hyperpod' },
      { kind: 'lesson', key: 'cloud/cloud-security-and-networking-for-ai' },
      { kind: 'lesson', key: 'edge/edge-vs-cloud-inference' },
      { kind: 'lesson', key: 'edge/quantization-for-edge' },
    ],
  },
  infra: {
    id: 'infra',
    title: 'I run GPUs and the platform',
    who: 'You provision, scale or pay for the hardware and cloud services behind AI workloads, on AWS, Azure or Google Cloud.',
    short: 'GPUs, clusters, cloud',
    promise: 'GPU hardware, instances, clusters, Kubernetes, capacity and the cloud services around them.',
    ...pair('forest'),
    icon: 'infra',
    assumes: ['foundations/tokens-and-embeddings', 'foundations/attention-intuition'],
    steps: [
      { kind: 'lesson', key: 'infra/gpu-basics' },
      { kind: 'lesson', key: 'serving/life-of-a-request' },
      { kind: 'lesson', key: 'serving/kv-cache-and-memory' },
      { kind: 'lesson', key: 'infra/reading-a-gpu-spec-sheet' },
      { kind: 'game', label: 'Rack & Stack', href: '/play/rack-and-stack/', note: 'Pick the GPUs for a job.' },
      { kind: 'lesson', key: 'infra/gpu-and-accelerator-instances' },
      { kind: 'lesson', key: 'cloud/cloud-ai-service-map' },
      { kind: 'lesson', key: 'cloud/quotas-capacity-and-regions' },
      { kind: 'lesson', key: 'infra/multi-gpu-parallelism-and-interconnect' },
      { kind: 'lesson', key: 'foundations/how-models-learn' },
      { kind: 'lesson', key: 'foundations/training-pipeline' },
      { kind: 'lesson', key: 'infra/training-infrastructure' },
      { kind: 'lesson', key: 'serving/quantization' },
      { kind: 'lesson', key: 'llm/parameters-and-hyperparameters' },
      { kind: 'lesson', key: 'serving/inference-optimisation' },
      { kind: 'lesson', key: 'infra/kubernetes-and-autoscaling-for-inference' },
      { kind: 'lesson', key: 'infra/gpu-observability-and-capacity-planning' },
      { kind: 'lesson', key: 'local/run-models-locally' },
      { kind: 'lesson', key: 'local/inference-engines-compared' },
      { kind: 'lesson', key: 'cost/where-the-tokens-go' },
      { kind: 'lesson', key: 'cost/cost-levers' },
      { kind: 'lesson', key: 'local/self-hosting-vs-api-economics' },
      { kind: 'lesson', key: 'cloud/cloud-security-and-networking-for-ai' },
      { kind: 'lesson', key: 'local/private-and-air-gapped-ai' },
    ],
  },
};

export const pathIds = Object.keys(paths) as PathId[];
