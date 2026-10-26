export type PathId = 'newcomer' | 'builder' | 'practitioner';

export type Step =
  | { kind: 'lesson'; key: string }
  | { kind: 'game'; label: string; href: string; note: string };

export type LearningPath = {
  id: PathId;
  title: string;
  who: string;
  promise: string;
  color: string;
  on: string;
  icon: string;
  steps: Step[];
};

export const paths: Record<PathId, LearningPath> = {
  newcomer: {
    id: 'newcomer',
    title: 'I’m new to AI',
    who: 'You have heard the terms and want them to make sense. No technical background needed.',
    promise: 'Plain English first, then the first real concepts.',
    color: '#FFC233',
    on: '#1A1440',
    icon: 'start',
    steps: [
      { kind: 'lesson', key: 'start/what-is-ai-in-plain-english' },
      { kind: 'lesson', key: 'start/how-a-chatbot-answers' },
      { kind: 'lesson', key: 'start/using-ai-without-getting-burned' },
      { kind: 'lesson', key: 'foundations/ml-to-ai-timeline' },
      { kind: 'lesson', key: 'foundations/tokens-and-embeddings' },
      { kind: 'game', label: 'Cost Crunch, level 1', href: '/play/cost-crunch/', note: 'Put tokens and prices to work.' },
      { kind: 'lesson', key: 'llm/prompting-and-structured-output' },
    ],
  },
  builder: {
    id: 'builder',
    title: 'I build with LLMs',
    who: 'You can call a model API and want to build features that work reliably.',
    promise: 'Prompts, retrieval, agents and how to measure them.',
    color: '#9B5CFF',
    on: '#FFFFFF',
    icon: 'llm',
    steps: [
      { kind: 'lesson', key: 'foundations/tokens-and-embeddings' },
      { kind: 'lesson', key: 'foundations/attention-intuition' },
      { kind: 'lesson', key: 'llm/prompting-and-structured-output' },
      { kind: 'lesson', key: 'llm/context-window-and-caching' },
      { kind: 'lesson', key: 'llm/prompting-vs-rag-vs-fine-tuning' },
      { kind: 'lesson', key: 'rag-agents/rag-from-scratch' },
      { kind: 'lesson', key: 'rag-agents/chunking-and-retrieval-quality' },
      { kind: 'lesson', key: 'rag-agents/agents-and-tool-use' },
      { kind: 'lesson', key: 'evals/evals-101' },
      { kind: 'lesson', key: 'cloud/what-is-bedrock' },
      { kind: 'game', label: 'Incident Room', href: '/play/incident-room/', note: 'Debug what you just learned to build.' },
    ],
  },
  practitioner: {
    id: 'practitioner',
    title: 'I run AI in production',
    who: 'You own systems that serve real traffic and care about cost, latency and failure modes.',
    promise: 'Serving internals, architecture, cost levers and the hard games.',
    color: '#F25F5C',
    on: '#FFFFFF',
    icon: 'systems',
    steps: [
      { kind: 'lesson', key: 'serving/life-of-a-request' },
      { kind: 'lesson', key: 'serving/kv-cache-and-memory' },
      { kind: 'lesson', key: 'serving/quantization' },
      { kind: 'game', label: 'Fit the Model, levels 3 and 4', href: '/play/fit-the-model/', note: 'Real memory arithmetic.' },
      { kind: 'lesson', key: 'systems/rag-service-architecture' },
      { kind: 'lesson', key: 'systems/model-routing-and-fallbacks' },
      { kind: 'game', label: 'Blueprint, level 3', href: '/play/blueprint/', note: 'Three valid designs out of 1,296.' },
      { kind: 'lesson', key: 'cost/cost-levers' },
      { kind: 'lesson', key: 'evals/llm-as-judge-pitfalls' },
      { kind: 'lesson', key: 'cloud/bedrock-sagemaker-foundry-vertex' },
      { kind: 'lesson', key: 'edge/edge-vs-cloud-inference' },
      { kind: 'lesson', key: 'edge/quantization-for-edge' },
    ],
  },
};

export const pathIds = Object.keys(paths) as PathId[];
