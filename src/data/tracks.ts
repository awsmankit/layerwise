export const levels = {
  basic: { label: 'Basic', n: 1 },
  intermediate: { label: 'Intermediate', n: 2 },
  advanced: { label: 'Advanced', n: 3 },
} as const;

export type Level = keyof typeof levels;
export const levelIds = ['basic', 'intermediate', 'advanced'] as const;

export const tracks = [
  {
    id: 'start',
    color: '#FFC233',
    on: '#1A1440',
    hue: 'sun',
    title: 'AI basics',
    blurb: 'New to AI? Plain-English answers to what it is, how a chatbot answers you, and how to use it without getting burned.',
  },
  {
    id: 'foundations',
    color: '#3B54E0',
    on: '#FFFFFF',
    hue: 'cobalt',
    title: 'Foundations',
    blurb: 'From classical machine learning to transformers: what changed and why it matters.',
  },
  {
    id: 'llm',
    color: '#7B3FE4',
    on: '#FFFFFF',
    hue: 'violet',
    title: 'Working with LLMs',
    blurb: 'Prompts, context, structured output, and when to fine-tune instead.',
  },
  {
    id: 'rag-agents',
    color: '#12C2A4',
    on: '#0B2B27',
    hue: 'teal',
    title: 'RAG and agents',
    blurb: 'Retrieval pipelines, tool use, and the loops that turn a model into a system.',
  },
  {
    id: 'evals',
    color: '#C92A63',
    on: '#FFFFFF',
    hue: 'pink',
    title: 'Evals and quality',
    blurb: 'How to know a GenAI feature works, and keep knowing after the model changes.',
  },
  {
    id: 'serving',
    color: '#FF9F1C',
    on: '#2A1A00',
    hue: 'amber',
    title: 'Inference and serving',
    blurb: 'What happens inside a request: tokens, KV cache, batching, memory.',
  },
  {
    id: 'infra',
    color: '#00B8D9',
    on: '#00222B',
    hue: 'cyan',
    title: 'GPUs and infrastructure',
    blurb: 'What a GPU is, how to read a spec sheet, which cloud instances to pick, and how to scale inference and training.',
  },
  {
    id: 'local',
    color: '#7BD389',
    on: '#0C2B12',
    hue: 'green',
    title: 'Local and self-hosted inference',
    blurb: 'Run models on your own laptop or GPUs: the memory maths, the serving engines, and when it beats an API.',
  },
  {
    id: 'cloud',
    color: '#5BC0FF',
    on: '#08243A',
    hue: 'sky',
    title: 'Cloud AI platforms',
    blurb: 'AWS, Azure and Google Cloud side by side: model APIs, ML platforms, agents, security and capacity.',
  },
  {
    id: 'systems',
    color: '#B6E43A',
    on: '#1F2A00',
    hue: 'lime',
    title: 'System design',
    blurb: 'Reference architectures, failure modes and trade-offs for production AI.',
  },
  {
    id: 'cost',
    color: '#C93531',
    on: '#FFFFFF',
    hue: 'coral',
    title: 'Cost and FinOps',
    blurb: 'Where the money goes and the levers that reduce it.',
  },
  {
    id: 'edge',
    color: '#E879F9',
    on: '#3A0A44',
    hue: 'fuchsia',
    title: 'Edge and on-device AI',
    blurb: 'Latency, memory and power budgets when the model runs on the device.',
  },
] as const;

export type TrackId = (typeof tracks)[number]['id'];
export const trackIds = tracks.map((t) => t.id) as [TrackId, ...TrackId[]];
export const trackById = (id: string) => tracks.find((t) => t.id === id);
