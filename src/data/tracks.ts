import { pair } from '../lib/palette';

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
    ...pair('yellow'),
    hue: 'yellow',
    title: 'AI basics',
    blurb: 'Short lessons in simple words for anyone new to AI, including school students: what AI is, how a chatbot answers you, and how to use it safely.',
  },
  {
    id: 'foundations',
    ...pair('turquoise'),
    hue: 'turquoise',
    title: 'Foundations',
    blurb: 'From classical machine learning to transformers: what changed and why it matters.',
  },
  {
    id: 'llm',
    ...pair('pink'),
    hue: 'pink',
    title: 'Working with LLMs',
    blurb: 'Prompts, context, structured output, and when to fine-tune instead.',
  },
  {
    id: 'rag-agents',
    ...pair('lime'),
    hue: 'lime',
    title: 'RAG and agents',
    blurb: 'Retrieval pipelines, tool use, and the loops that turn a model into a system.',
  },
  {
    id: 'evals',
    ...pair('red'),
    hue: 'red',
    title: 'Evals and quality',
    blurb: 'How to know a GenAI feature works, and keep knowing after the model changes.',
  },
  {
    id: 'serving',
    ...pair('navy'),
    hue: 'navy',
    title: 'Inference and serving',
    blurb: 'What happens inside a request: tokens, KV cache, batching, memory.',
  },
  {
    id: 'infra',
    ...pair('forest'),
    hue: 'forest',
    title: 'GPUs and infrastructure',
    blurb: 'What a GPU is, how to read a spec sheet, which cloud instances to pick, and how to scale inference and training.',
  },
  {
    id: 'local',
    ...pair('purple'),
    hue: 'purple',
    title: 'Local and self-hosted inference',
    blurb: 'Run models on your own laptop or GPUs: the memory maths, the serving engines, and when it beats an API.',
  },
  {
    id: 'cloud',
    ...pair('sky'),
    hue: 'sky',
    title: 'Cloud AI platforms',
    blurb: 'AWS, Azure and Google Cloud side by side: model APIs, ML platforms, agents, security and capacity.',
  },
  {
    id: 'systems',
    ...pair('tangerine'),
    hue: 'tangerine',
    title: 'System design',
    blurb: 'Reference architectures, failure modes and trade-offs for production AI.',
  },
  {
    id: 'cost',
    ...pair('magenta'),
    hue: 'magenta',
    title: 'Cost and FinOps',
    blurb: 'Where the money goes and the levers that reduce it.',
  },
  {
    id: 'edge',
    ...pair('cocoa'),
    hue: 'cocoa',
    title: 'Edge and on-device AI',
    blurb: 'Latency, memory and power budgets when the model runs on the device.',
  },
] as const;

export type TrackId = (typeof tracks)[number]['id'];
export const trackIds = tracks.map((t) => t.id) as [TrackId, ...TrackId[]];
export const trackById = (id: string) => tracks.find((t) => t.id === id);
