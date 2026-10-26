import { describe, expect, it } from 'vitest';
import { allPicks, evaluate, examplePrice, rackGpus, rackScenarios, score, solutions, PCIE_SPLIT_PENALTY, type Pick } from './rackstack';
import { estimate } from '../lib/gpu';
import { gpuById } from '../data/gpus';

const sc = (id: string) => rackScenarios.find((s) => s.id === id)!;
const pick = (gpu: string, count: number, weights: Pick['weights'] = 'int8', kv: Pick['kv'] = 'fp8'): Pick => ({ gpu, count, weights, kv });

describe('rack and stack setup', () => {
  it('offers only NVIDIA GPUs, each with an example price', () => {
    expect(rackGpus.length).toBeGreaterThanOrEqual(8);
    for (const g of rackGpus) {
      expect(g.vendor).toBe('NVIDIA');
      expect(examplePrice[g.id], g.id).toBeGreaterThan(0);
    }
  });

  it('example prices rise with capability within the NVIDIA line', () => {
    expect(examplePrice.t4).toBeLessThan(examplePrice.l4 + 1);
    expect(examplePrice['a100-80']).toBeLessThan(examplePrice.h100);
    expect(examplePrice.h100).toBeLessThan(examplePrice.h200);
    expect(examplePrice.h200).toBeLessThan(examplePrice.b200);
  });

  it('every scenario is solvable, and winning is rare', () => {
    for (const s of rackScenarios) {
      const n = solutions(s).length;
      expect(n, s.id).toBeGreaterThan(0);
      expect(n / allPicks().length, s.id).toBeLessThan(0.25);
    }
  });
});

describe('rack and stack lessons built into the levels', () => {
  it('bandwidth, not just memory: an L4 holds the help-desk model but is too slow', () => {
    const r = evaluate(sc('helpdesk'), pick('l4', 1));
    expect(r.fits).toBe(true);
    expect(r.checks.find((c) => c.id === 'speed')?.pass).toBe(false);
    expect(evaluate(sc('helpdesk'), pick('a10g', 1)).ok).toBe(true);
  });

  it('the KV cache can dominate: one H100 cannot hold sixty-four long chats', () => {
    const r = evaluate(sc('many-users'), pick('h100', 1));
    expect(r.fits).toBe(false);
    expect(r.checks.find((c) => c.id === 'fit')?.pass).toBe(false);
  });

  it('two linked A100s beat one H200 on cost for the long-chat level', () => {
    const duo = evaluate(sc('many-users'), pick('a100-80', 2));
    const h200 = evaluate(sc('many-users'), pick('h200', 1));
    expect(duo.ok).toBe(true);
    expect(h200.ok).toBe(true);
    expect(duo.cost).toBeLessThan(h200.cost);
  });

  it('splitting across PCIe-only cards is penalised', () => {
    const s = sc('many-users');
    const p = pick('a10g', 8);
    const raw = estimate(gpuById('a10g'), 8, s.model, p.weights, p.kv, s.ctx, s.users).perUserTokS;
    const r = evaluate(s, p);
    expect(r.speed).toBeCloseTo(raw * PCIE_SPLIT_PENALTY, 6);
    // NVLink cards are not penalised
    const nv = estimate(gpuById('a100-80'), 2, s.model, 'int8', 'fp8', s.ctx, s.users).perUserTokS;
    expect(evaluate(s, pick('a100-80', 2)).speed).toBeCloseTo(nv, 6);
  });

  it('precision trades quality for memory: 4-bit weights cannot meet the frontier quality bar', () => {
    const r = evaluate(sc('frontier'), pick('b200', 8, 'int4', 'fp8'));
    expect(r.checks.find((c) => c.id === 'quality')?.pass).toBe(false);
  });
});

describe('rack and stack scoring', () => {
  it('a failing choice scores zero, any valid one at least 70, and the cheapest valid scores 100', () => {
    for (const s of rackScenarios) {
      const sols = solutions(s);
      expect(score(s, sols[0].pick)).toBe(100);
      for (const x of sols) expect(score(s, x.pick)).toBeGreaterThanOrEqual(70);
      expect(score(s, pick('t4', 1, 'fp16', 'fp16'))).toBe(0);
    }
  });

  it('a pricier valid choice scores lower than the cheapest', () => {
    const s = sc('helpdesk');
    const sols = solutions(s);
    const dearest = sols[sols.length - 1];
    if (dearest.result.cost > sols[0].result.cost) expect(score(s, dearest.pick)).toBeLessThan(100);
  });

  it('every check explains itself', () => {
    const r = evaluate(sc('quality-first'), pick('l4', 1));
    for (const c of r.checks) expect(c.detail.length).toBeGreaterThan(8);
  });
});
