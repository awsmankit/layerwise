/**
 * The model radar: a short, dated set of current frontier and popular models, with only the facts
 * a vendor states on its own pages: release date, context window, maximum output, list price,
 * input types, status and whether the weights are open.
 *
 * Rules for this file (see also /models/ on the site):
 *  - Every figure comes from an official vendor page that is listed in `sources`. No blogs, no press, no leaderboards.
 *  - A field that the vendor does not state is left out. Do not fill it from memory.
 *  - Nothing here ranks quality. There are no benchmark scores.
 *  - Prices are USD per million tokens, the standard (not batch, not priority) list price on `checkedOn`.
 *  - `releasedOn` is the date the vendor's own release note, model page or launch post gives.
 *  - The array is sorted: vendors in the order of `vendors`, then newest release first (a test checks it).
 *
 * To add or correct a model: verify it on the vendor's page, edit the entry, set `checkedOn`,
 * run `npx vitest run src/data/models.test.ts src/lib/models.test.ts`, and open a pull request.
 * `npm run check-models` lists entries that have gone stale and names in the news feed that are not here yet.
 */

export type Vendor = 'Anthropic' | 'OpenAI' | 'Google' | 'Mistral AI' | 'DeepSeek' | 'Alibaba';
export type ModelStatus = 'available' | 'preview' | 'deprecated' | 'announced';
/** What the model can take in. Every model listed here returns text. */
export type Modality = 'text' | 'image' | 'audio' | 'video' | 'pdf';

/** A price that takes effect on a stated date (the vendor announced it on its pricing page). */
export interface PriceChange {
  from: string;
  inputPerMTok: number;
  outputPerMTok: number;
  cachedInputPerMTok?: number;
}

/** A higher price that applies when one request's prompt is longer than `aboveTokens`. */
export interface LongContextPrice {
  aboveTokens: number;
  inputPerMTok: number;
  outputPerMTok: number;
  cachedInputPerMTok?: number;
}

export interface ModelSource {
  label: string;
  url: string;
}

export interface Model {
  id: string;
  vendor: Vendor;
  name: string;
  family: string;
  /** the id you pass to the vendor's API, when the vendor's page states it */
  apiId?: string;
  /** ISO date from the vendor's own page */
  releasedOn: string;
  status: ModelStatus;
  /** context window in tokens, as the vendor writes it (1M is 1,000,000 unless the page gives an exact figure) */
  contextTokens?: number;
  maxOutputTokens?: number;
  inputPerMTok?: number;
  outputPerMTok?: number;
  /** price per million tokens for input served from the vendor's cache */
  cachedInputPerMTok?: number;
  /** tiers, discounts, peaks and anything else a reader needs to read the price correctly */
  priceNote?: string;
  priceChange?: PriceChange;
  longContext?: LongContextPrice;
  /** input types */
  modalities: Modality[];
  openWeights: boolean;
  licence?: string;
  /** one short plain sentence for anything the fields above cannot say */
  note?: string;
  sources: ModelSource[];
  /** ISO date a person last checked every field against the sources */
  checkedOn: string;
}

export const vendors: Vendor[] = ['Anthropic', 'OpenAI', 'Google', 'Mistral AI', 'DeepSeek', 'Alibaba'];

const CHECKED = '2026-11-06';

const claudePricing: ModelSource = { label: 'Pricing (Anthropic documentation)', url: 'https://platform.claude.com/docs/en/about-claude/pricing' };
const openaiPricing: ModelSource = { label: 'Pricing (OpenAI API documentation)', url: 'https://developers.openai.com/api/docs/pricing' };
const openaiChangelog: ModelSource = { label: 'API changelog with release dates (OpenAI)', url: 'https://developers.openai.com/api/docs/changelog' };
const geminiPricing: ModelSource = { label: 'Pricing (Google AI Studio documentation)', url: 'https://aistudio.google.com/docs/pricing' };
const geminiChangelog: ModelSource = { label: 'Release notes with dates (Google AI Studio)', url: 'https://aistudio.google.com/docs/changelog' };
const claudePriceNote = 'Batch API requests are 50% off. Cache reads are listed in the cached column; cache writes cost more than base input.';

export const models: Model[] = [
  /* ---------- Anthropic ---------- */
  {
    id: 'claude-haiku-5-5',
    vendor: 'Anthropic',
    name: 'Claude Haiku 5.5',
    family: 'Claude 5',
    apiId: 'claude-haiku-5-5',
    releasedOn: '2026-10-07',
    status: 'available',
    contextTokens: 1_000_000,
    maxOutputTokens: 128_000,
    inputPerMTok: 0.1,
    outputPerMTok: 0.5,
    cachedInputPerMTok: 0.01,
    priceNote: 'The low price is for prompts up to 100,000 tokens; longer prompts cost $0.50 in and $2.50 out. Batch API requests are 50% off.',
    longContext: { aboveTokens: 100_000, inputPerMTok: 0.5, outputPerMTok: 2.5, cachedInputPerMTok: 0.05 },
    modalities: ['text', 'image'],
    openWeights: false,
    sources: [{ label: 'Claude Haiku 5.5 overview (Anthropic documentation)', url: 'https://platform.claude.com/docs/en/models/haiku-5-5/overview' }, claudePricing],
    checkedOn: CHECKED,
  },
  {
    id: 'claude-sonnet-5-5',
    vendor: 'Anthropic',
    name: 'Claude Sonnet 5.5',
    family: 'Claude 5',
    apiId: 'claude-sonnet-5-5',
    releasedOn: '2026-09-28',
    status: 'available',
    contextTokens: 1_000_000,
    maxOutputTokens: 128_000,
    inputPerMTok: 2,
    outputPerMTok: 10,
    cachedInputPerMTok: 0.1,
    priceNote: claudePriceNote,
    modalities: ['text', 'image'],
    openWeights: false,
    sources: [{ label: 'Claude Sonnet 5.5 overview (Anthropic documentation)', url: 'https://platform.claude.com/docs/en/models/sonnet-5-5/overview' }, claudePricing],
    checkedOn: CHECKED,
  },
  {
    id: 'claude-opus-5-5',
    vendor: 'Anthropic',
    name: 'Claude Opus 5.5',
    family: 'Claude 5',
    apiId: 'claude-opus-5-5',
    releasedOn: '2026-09-22',
    status: 'available',
    contextTokens: 1_000_000,
    maxOutputTokens: 128_000,
    inputPerMTok: 4,
    outputPerMTok: 20,
    cachedInputPerMTok: 0.2,
    priceNote: claudePriceNote,
    modalities: ['text', 'image'],
    openWeights: false,
    sources: [{ label: 'Claude Opus 5.5 overview (Anthropic documentation)', url: 'https://platform.claude.com/docs/en/models/opus-5-5/overview' }, claudePricing],
    checkedOn: CHECKED,
  },
  {
    id: 'claude-fable-5-1',
    vendor: 'Anthropic',
    name: 'Claude Fable 5.1',
    family: 'Claude 5',
    apiId: 'claude-fable-5-1',
    releasedOn: '2026-09-01',
    status: 'available',
    contextTokens: 1_000_000,
    maxOutputTokens: 128_000,
    inputPerMTok: 10,
    outputPerMTok: 50,
    cachedInputPerMTok: 0.25,
    priceNote: claudePriceNote,
    modalities: ['text', 'image'],
    openWeights: false,
    sources: [{ label: 'Claude Fable 5.1 overview (Anthropic documentation)', url: 'https://platform.claude.com/docs/en/models/fable-5-1/overview' }, claudePricing],
    checkedOn: CHECKED,
  },

  /* ---------- OpenAI ---------- */
  {
    id: 'gpt-6-1-terra',
    vendor: 'OpenAI',
    name: 'GPT-6.1 Terra',
    family: 'GPT-6',
    apiId: 'gpt-6.1-terra',
    releasedOn: '2026-10-26',
    status: 'available',
    contextTokens: 1_050_000,
    maxOutputTokens: 128_000,
    inputPerMTok: 1,
    outputPerMTok: 5,
    cachedInputPerMTok: 0.05,
    priceNote: 'Prompts over 272,000 tokens cost $2 in and $7.50 out. A batch tab lists lower rates; regional endpoints add 10%.',
    longContext: { aboveTokens: 272_000, inputPerMTok: 2, outputPerMTok: 7.5, cachedInputPerMTok: 0.1 },
    modalities: ['text', 'image'],
    openWeights: false,
    sources: [{ label: 'GPT-6.1 Terra model page (OpenAI API documentation)', url: 'https://developers.openai.com/api/docs/models/gpt-6.1-terra' }, openaiPricing, openaiChangelog],
    checkedOn: CHECKED,
  },
  {
    id: 'gpt-6-1-sol',
    vendor: 'OpenAI',
    name: 'GPT-6.1 Sol',
    family: 'GPT-6',
    apiId: 'gpt-6.1-sol',
    releasedOn: '2026-09-29',
    status: 'available',
    contextTokens: 1_050_000,
    maxOutputTokens: 128_000,
    inputPerMTok: 2,
    outputPerMTok: 10,
    cachedInputPerMTok: 0.1,
    priceNote: 'Prompts over 272,000 tokens cost $4 in and $15 out. A batch tab lists lower rates; regional endpoints add 10%.',
    longContext: { aboveTokens: 272_000, inputPerMTok: 4, outputPerMTok: 15, cachedInputPerMTok: 0.2 },
    modalities: ['text', 'image'],
    openWeights: false,
    sources: [{ label: 'GPT-6.1 Sol model page (OpenAI API documentation)', url: 'https://developers.openai.com/api/docs/models/gpt-6.1-sol' }, openaiPricing, openaiChangelog],
    checkedOn: CHECKED,
  },
  {
    id: 'gpt-6-luna',
    vendor: 'OpenAI',
    name: 'GPT-6 Luna',
    family: 'GPT-6',
    apiId: 'gpt-6-luna',
    releasedOn: '2026-09-22',
    status: 'available',
    contextTokens: 1_050_000,
    maxOutputTokens: 128_000,
    inputPerMTok: 0.1,
    outputPerMTok: 0.5,
    cachedInputPerMTok: 0.01,
    priceNote: 'Prompts over 272,000 tokens cost $0.20 in and $0.75 out. A batch tab lists lower rates; regional endpoints add 10%.',
    longContext: { aboveTokens: 272_000, inputPerMTok: 0.2, outputPerMTok: 0.75, cachedInputPerMTok: 0.02 },
    modalities: ['text', 'image'],
    openWeights: false,
    sources: [{ label: 'GPT-6 Luna model page (OpenAI API documentation)', url: 'https://developers.openai.com/api/docs/models/gpt-6-luna' }, openaiPricing, openaiChangelog],
    checkedOn: CHECKED,
  },
  {
    id: 'gpt-6-astra',
    vendor: 'OpenAI',
    name: 'GPT-6 Astra',
    family: 'GPT-6',
    apiId: 'gpt-6-astra',
    releasedOn: '2026-09-03',
    status: 'available',
    contextTokens: 1_050_000,
    maxOutputTokens: 128_000,
    inputPerMTok: 10,
    outputPerMTok: 50,
    cachedInputPerMTok: 1,
    priceNote: 'Prompts over 272,000 tokens cost $20 in and $75 out. Batch is $5 in and $25 out. Regional endpoints add 10%.',
    longContext: { aboveTokens: 272_000, inputPerMTok: 20, outputPerMTok: 75, cachedInputPerMTok: 2 },
    modalities: ['text', 'image'],
    openWeights: false,
    sources: [{ label: 'GPT-6 Astra model page (OpenAI API documentation)', url: 'https://developers.openai.com/api/docs/models/gpt-6-astra' }, openaiPricing, openaiChangelog],
    checkedOn: CHECKED,
  },

  /* ---------- Google ---------- */
  {
    id: 'gemini-4-carbon',
    vendor: 'Google',
    name: 'Gemini 4 Carbon',
    family: 'Gemini 4',
    releasedOn: '2026-10-28',
    status: 'announced',
    priceNote: 'The launch post gives an introductory $2 in and $10 out per million tokens, rising to $4 and $20. The pricing page does not list it yet.',
    modalities: [],
    openWeights: false,
    note: 'Announced on 28 October 2026 with limited access for a subset of cyber defenders. Google gives no general availability date and no context window.',
    sources: [{ label: 'Introducing Gemini 4 Carbon (Google blog)', url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/' }],
    checkedOn: CHECKED,
  },
  {
    id: 'gemini-4-argon',
    vendor: 'Google',
    name: 'Gemini 4 Argon',
    family: 'Gemini 4',
    apiId: 'gemini-4-argon',
    releasedOn: '2026-10-13',
    status: 'available',
    contextTokens: 1_048_576,
    maxOutputTokens: 65_536,
    inputPerMTok: 2,
    outputPerMTok: 10,
    cachedInputPerMTok: 0.1,
    priceNote:
      'Introductory price through 30 November 2026, then $4 in, $20 out and $0.20 cached. Output includes thinking tokens. Implicit caching only. Context is shared by input and output; up to 1,048,576 output tokens with long decode.',
    priceChange: { from: '2026-12-01', inputPerMTok: 4, outputPerMTok: 20, cachedInputPerMTok: 0.2 },
    modalities: ['text', 'image', 'video', 'audio', 'pdf'],
    openWeights: false,
    sources: [
      { label: 'Gemini 4 Argon model page (Google AI Studio documentation)', url: 'https://aistudio.google.com/docs/models/gemini-4-argon' },
      geminiPricing,
      geminiChangelog,
      { label: 'Gemini 4 Argon: Built to solve your hardest problems (Google blog)', url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon/' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'gemini-3-8-flash',
    vendor: 'Google',
    name: 'Gemini 3.8 Flash',
    family: 'Gemini 3',
    apiId: 'gemini-3.8-flash',
    releasedOn: '2026-09-02',
    status: 'available',
    contextTokens: 1_048_576,
    maxOutputTokens: 65_536,
    inputPerMTok: 0.75,
    outputPerMTok: 3.75,
    cachedInputPerMTok: 0.075,
    priceNote: 'Price through 31 December 2026, then $1.50 in, $7.50 out and $0.15 cached. Cache storage is billed per hour on top.',
    priceChange: { from: '2027-01-01', inputPerMTok: 1.5, outputPerMTok: 7.5, cachedInputPerMTok: 0.15 },
    modalities: ['text', 'image', 'video', 'audio', 'pdf'],
    openWeights: false,
    sources: [{ label: 'Gemini 3.8 Flash model page (Google AI Studio documentation)', url: 'https://aistudio.google.com/docs/models/gemini-3.8-flash' }, geminiPricing, geminiChangelog],
    checkedOn: CHECKED,
  },
  {
    id: 'gemini-3-5-flash-lite',
    vendor: 'Google',
    name: 'Gemini 3.5 Flash-Lite',
    family: 'Gemini 3',
    apiId: 'gemini-3.5-flash-lite',
    releasedOn: '2026-07-21',
    status: 'available',
    contextTokens: 1_048_576,
    maxOutputTokens: 65_536,
    inputPerMTok: 0.3,
    outputPerMTok: 2.5,
    cachedInputPerMTok: 0.03,
    priceNote: 'Text, image and video input price shown. Cache storage is billed per hour on top.',
    modalities: ['text', 'image', 'video', 'audio', 'pdf'],
    openWeights: false,
    sources: [{ label: 'Gemini 3.5 Flash-Lite model page (Google AI Studio documentation)', url: 'https://aistudio.google.com/docs/models/gemini-3.5-flash-lite' }, geminiPricing, geminiChangelog],
    checkedOn: CHECKED,
  },
  {
    id: 'gemma-4-31b',
    vendor: 'Google',
    name: 'Gemma 4 31B',
    family: 'Gemma 4',
    releasedOn: '2026-03-31',
    status: 'available',
    contextTokens: 256_000,
    modalities: ['text', 'image'],
    openWeights: true,
    licence: 'Apache 2.0',
    note: 'A dense 31 billion parameter model you run yourself, so there is no per-token list price.',
    sources: [
      { label: 'Gemma 4 model card (Google AI for Developers)', url: 'https://ai.google.dev/gemma/docs/core/model_card_4' },
      { label: 'Gemma release notes with dates (Google AI for Developers)', url: 'https://ai.google.dev/gemma/docs/releases' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'gemini-3-1-pro-preview',
    vendor: 'Google',
    name: 'Gemini 3.1 Pro (preview)',
    family: 'Gemini 3',
    apiId: 'gemini-3.1-pro-preview',
    releasedOn: '2026-02-19',
    status: 'preview',
    contextTokens: 1_048_576,
    maxOutputTokens: 65_536,
    inputPerMTok: 2,
    outputPerMTok: 12,
    cachedInputPerMTok: 0.2,
    priceNote: 'Prompts over 200,000 tokens cost $4 in, $18 out and $0.40 cached. Cache storage is billed per hour on top.',
    longContext: { aboveTokens: 200_000, inputPerMTok: 4, outputPerMTok: 18, cachedInputPerMTok: 0.4 },
    modalities: ['text', 'image', 'video', 'audio', 'pdf'],
    openWeights: false,
    sources: [{ label: 'Gemini 3.1 Pro model page (Google AI Studio documentation)', url: 'https://aistudio.google.com/docs/models/gemini-3.1-pro-preview' }, geminiPricing, geminiChangelog],
    checkedOn: CHECKED,
  },

  /* ---------- Mistral AI ---------- */
  {
    id: 'mistral-large-4',
    vendor: 'Mistral AI',
    name: 'Mistral Large 4',
    family: 'Mistral Large',
    apiId: 'mistral-large-4',
    releasedOn: '2026-10-06',
    status: 'preview',
    contextTokens: 1_000_000,
    inputPerMTok: 0.7,
    outputPerMTok: 2.1,
    cachedInputPerMTok: 0.07,
    priceNote: 'The launch post lists this price for the public preview API. Mistral’s pricing page does not list per-model prices.',
    modalities: ['text', 'image'],
    openWeights: true,
    licence: 'Mistral Ecosystem Open-Weight License (a modified MIT licence)',
    note: 'About 1 trillion parameters, 52 billion active. Weights were published on Hugging Face after the API preview; the vendor’s API status may have moved on from preview.',
    sources: [
      { label: 'Introducing Mistral Large 4 (launch post with the preview price)', url: 'https://mistral.ai/news/mistral-large-4/' },
      { label: 'Mistral Large 4 open weights announcement (Mistral AI)', url: 'https://mistral.ai/news/mistral-large-4-oss/' },
      { label: 'Mistral Large 4 model card (Mistral AI on Hugging Face), states the 1M context', url: 'https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'mistral-small-4',
    vendor: 'Mistral AI',
    name: 'Mistral Small 4',
    family: 'Mistral Small',
    apiId: 'mistral-small-2603',
    releasedOn: '2026-03-16',
    status: 'available',
    contextTokens: 256_000,
    inputPerMTok: 0.15,
    outputPerMTok: 0.6,
    priceNote: 'The launch post lists this price. Mistral’s pricing page does not list per-model prices.',
    modalities: ['text', 'image'],
    openWeights: true,
    licence: 'Apache 2.0',
    note: '119 billion parameters in total, 6 billion active per token.',
    sources: [
      { label: 'Introducing Mistral Small 4 (launch post with the price)', url: 'https://mistral.ai/news/mistral-small-4/' },
      { label: 'Models overview (Mistral AI documentation)', url: 'https://docs.mistral.ai/models/overview' },
    ],
    checkedOn: CHECKED,
  },

  /* ---------- DeepSeek ---------- */
  {
    id: 'deepseek-v4-1-flash',
    vendor: 'DeepSeek',
    name: 'DeepSeek V4.1 Flash',
    family: 'DeepSeek V4',
    apiId: 'deepseek-flash',
    releasedOn: '2026-10-17',
    status: 'available',
    contextTokens: 1_000_000,
    maxOutputTokens: 384_000,
    inputPerMTok: 0.3,
    outputPerMTok: 1.2,
    cachedInputPerMTok: 0.006,
    priceNote: 'Peak rates shown (weekdays 01:00 to 04:00 and 06:00 to 10:00 UTC). Off-peak, which is every other hour, is half: $0.15 in, $0.60 out, $0.003 cached.',
    modalities: ['text', 'image'],
    openWeights: true,
    licence: 'MIT',
    note: 'The API id deepseek-flash is served by the version DeepSeek-V4.1-Flash-1017.',
    sources: [
      { label: 'Models and pricing (DeepSeek API documentation)', url: 'https://api-docs.deepseek.com/quick_start/pricing' },
      { label: 'News and updates with release dates (DeepSeek API documentation)', url: 'https://api-docs.deepseek.com/updates' },
      { label: 'DeepSeek-V4.1-Flash-1017 (DeepSeek on Hugging Face), states the licence', url: 'https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017' },
    ],
    checkedOn: CHECKED,
  },
  {
    id: 'deepseek-v4-pro',
    vendor: 'DeepSeek',
    name: 'DeepSeek V4 Pro',
    family: 'DeepSeek V4',
    apiId: 'deepseek-v4-pro',
    releasedOn: '2026-08-13',
    status: 'available',
    contextTokens: 1_000_000,
    maxOutputTokens: 384_000,
    inputPerMTok: 1.32,
    outputPerMTok: 3.96,
    cachedInputPerMTok: 0.044,
    priceNote: 'Peak rates shown (weekdays 01:00 to 04:00 and 06:00 to 10:00 UTC). Off-peak, which is every other hour, is half: $0.66 in, $1.98 out, $0.022 cached.',
    modalities: ['text'],
    openWeights: true,
    licence: 'MIT',
    note: 'The date is the V4 Pro general release; DeepSeek V4 first became available on 24 April 2026. 1.6 trillion parameters, 49 billion active.',
    sources: [
      { label: 'Models and pricing (DeepSeek API documentation)', url: 'https://api-docs.deepseek.com/quick_start/pricing' },
      { label: 'News and updates with release dates (DeepSeek API documentation)', url: 'https://api-docs.deepseek.com/updates' },
      { label: 'DeepSeek-V4-Pro (DeepSeek on Hugging Face), states the licence', url: 'https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro' },
    ],
    checkedOn: CHECKED,
  },

  /* ---------- Alibaba ---------- */
  {
    id: 'qwen3-8-max',
    vendor: 'Alibaba',
    name: 'Qwen3.8-Max',
    family: 'Qwen 3.8',
    apiId: 'qwen3.8-max',
    releasedOn: '2026-08-03',
    status: 'available',
    contextTokens: 1_000_000,
    maxOutputTokens: 131_072,
    inputPerMTok: 2,
    outputPerMTok: 6,
    priceNote: 'International (Singapore) list price. The China, US and Europe regions list $1.65 in and $4.95 out. Excludes promotions and context-cache rates.',
    modalities: ['text', 'image', 'video'],
    openWeights: false,
    note: 'Alibaba said on 3 August 2026 that open weights would follow the next week. No official page checked here confirms they are out, so this is marked closed.',
    sources: [
      { label: 'Alibaba unveils Qwen3.8-Max (Alibaba Cloud press room)', url: 'https://www.alibabacloud.com/en/press-room/alibaba-unveils-qwen3-8-max' },
      { label: 'qwen3.8-max model info (Alibaba Cloud Model Studio documentation)', url: 'https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max' },
      { label: 'Model pricing (Alibaba Cloud Model Studio documentation)', url: 'https://www.alibabacloud.com/help/en/model-studio/model-pricing' },
    ],
    checkedOn: CHECKED,
  },
];

/** The newest `checkedOn` in this data set, shown in the page's lede. */
export const modelsChecked: string = models.reduce((latest, m) => (m.checkedOn > latest ? m.checkedOn : latest), '0000-00-00');
