/**
 * Rack & Stack: choose an accelerator, how many, and the precision, to serve a
 * model to a number of users at a target speed within a budget.
 *
 * Only NVIDIA GPUs are offered. AMD cards and TPUs need different software
 * stacks, so comparing them on memory and a made-up price alone would be
 * misleading.
 *
 * Memory and bandwidth come from src/lib/gpu.ts (the real memory-bound
 * arithmetic). The hourly prices are made-up EXAMPLES chosen so that cheaper
 * cards really are cheaper and bigger ones really are dearer; they are not
 * quotes from any cloud. Replace them with your own when you plan for real.
 */
import { gpus, gpuById, type Gpu } from '../data/gpus';
import { estimate } from '../lib/gpu';
import { models, weightPrecisions, kvPrecisions, type ModelId, type WeightPrecision, type KvPrecision } from './fitmodel';

export const examplePrice: Record<string, number> = {
  t4: 0.6,
  l4: 1,
  a10g: 1.2,
  l40s: 2,
  'a100-40': 3,
  'a100-80': 4,
  h100: 8,
  h200: 11,
  b200: 16,
};

/** Cards that only talk over PCIe lose a lot when a model is split across them. */
export const PCIE_SPLIT_PENALTY = 0.55;

export type RackScenario = {
  id: string;
  level: 1 | 2 | 3 | 4;
  title: string;
  brief: string;
  model: ModelId;
  users: number;
  ctx: number;
  /** Tokens per second each user must see. */
  minTokS: number;
  minQuality: number;
  /** Example dollars per hour. */
  budget: number;
};

export const rackScenarios: RackScenario[] = [
  {
    id: 'helpdesk',
    level: 1,
    title: 'A small help-desk bot',
    brief: 'An 8B-class model answers staff questions. Four people use it at a time with short conversations. Replies should stream at a comfortable reading speed, and the budget is small.',
    model: '8B',
    users: 4,
    ctx: 4096,
    minTokS: 25,
    minQuality: 70,
    budget: 2,
  },
  {
    id: 'many-users',
    level: 2,
    title: 'Sixty-four users, long chats',
    brief: 'The same 8B-class model, but sixty-four people at once and 16,000 tokens of history each. The weights are small; the KV cache is not. Think about what actually fills the memory.',
    model: '8B',
    users: 64,
    ctx: 16384,
    minTokS: 15,
    minQuality: 70,
    budget: 12,
  },
  {
    id: 'quality-first',
    level: 3,
    title: 'A 70B-class model for sixteen users',
    brief: 'A larger model for work where quality matters, with sixteen concurrent users and 8,000 tokens of context. One card is unlikely to be enough, and not every card splits well.',
    model: '70B',
    users: 16,
    ctx: 8192,
    minTokS: 20,
    minQuality: 84,
    budget: 40,
  },
  {
    id: 'frontier',
    level: 4,
    title: 'A frontier-class model on a node',
    brief: 'A 400B-class model for eight users with 8,000 tokens of context, and the highest quality bar. This is a whole-node problem, and precision choices matter as much as the hardware.',
    model: '400B',
    users: 8,
    ctx: 8192,
    minTokS: 15,
    minQuality: 92,
    budget: 150,
  },
];

export type Pick = { gpu: string; count: number; weights: WeightPrecision; kv: KvPrecision };
export const COUNTS = [1, 2, 4, 8] as const;

export type Result = {
  fits: boolean;
  memoryUsedGB: number;
  memoryCapacityGB: number;
  speed: number;
  quality: number;
  cost: number;
  checks: { id: 'fit' | 'speed' | 'quality' | 'budget'; label: string; pass: boolean; detail: string }[];
  ok: boolean;
};

export function evaluate(s: RackScenario, p: Pick): Result {
  const gpu: Gpu = gpuById(p.gpu);
  const e = estimate(gpu, p.count, s.model, p.weights, p.kv, s.ctx, s.users);
  const splitPenalty = p.count > 1 && gpu.link === 'PCIe' ? PCIE_SPLIT_PENALTY : 1;
  const speed = e.perUserTokS * splitPenalty;
  const quality = models[s.model].quality - weightPrecisions[p.weights].penalty - kvPrecisions[p.kv].penalty;
  const cost = (examplePrice[p.gpu] ?? 0) * p.count;

  const checks: Result['checks'] = [
    {
      id: 'fit',
      label: 'It fits in memory',
      pass: e.fits,
      detail: e.fits
        ? `${e.usedGB.toFixed(1)} GB of ${e.capacityGB.toFixed(1)} GB usable.`
        : `Needs ${e.usedGB.toFixed(1)} GB but only ${e.capacityGB.toFixed(1)} GB is usable.`,
    },
    {
      id: 'speed',
      label: `Each user gets at least ${s.minTokS} tokens per second`,
      pass: e.fits && speed >= s.minTokS,
      detail: !e.fits
        ? 'Nothing runs if it does not fit.'
        : `About ${Math.round(speed)} tokens per second per user${splitPenalty < 1 ? ', after a penalty for splitting across PCIe-only cards' : ''}.`,
    },
    {
      id: 'quality',
      label: `Task score of at least ${s.minQuality}`,
      pass: quality >= s.minQuality,
      detail: `Score ${quality.toFixed(1)} with these precisions.`,
    },
    {
      id: 'budget',
      label: `Example cost within $${s.budget} an hour`,
      pass: cost <= s.budget,
      detail: `$${cost.toFixed(2)} an hour at the example prices.`,
    },
  ];

  return {
    fits: e.fits,
    memoryUsedGB: e.usedGB,
    memoryCapacityGB: e.capacityGB,
    speed: e.fits ? speed : 0,
    quality,
    cost,
    checks,
    ok: checks.every((c) => c.pass),
  };
}

/** The accelerators this game offers. */
export const rackGpus: Gpu[] = gpus.filter((g) => g.vendor === 'NVIDIA' && g.game !== false);

export function allPicks(): Pick[] {
  const out: Pick[] = [];
  for (const g of rackGpus)
    for (const count of COUNTS)
      for (const weights of Object.keys(weightPrecisions) as WeightPrecision[])
        for (const kv of Object.keys(kvPrecisions) as KvPrecision[]) out.push({ gpu: g.id, count, weights, kv });
  return out;
}

export function solutions(s: RackScenario) {
  return allPicks()
    .map((pick) => ({ pick, result: evaluate(s, pick) }))
    .filter((x) => x.result.ok)
    .sort((a, b) => a.result.cost - b.result.cost || b.result.speed - a.result.speed);
}

/** 0 if it fails any check; otherwise 70 plus up to 30 for being close to the cheapest valid choice. */
export function score(s: RackScenario, p: Pick): number {
  const r = evaluate(s, p);
  if (!r.ok) return 0;
  const best = solutions(s)[0].result.cost;
  return Math.round(70 + 30 * Math.min(1, best / r.cost));
}
