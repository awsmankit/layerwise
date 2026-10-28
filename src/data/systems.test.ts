import { describe, expect, it } from 'vitest';
import { systems } from './systems';
import { gpuById } from './gpus';

describe('NVIDIA systems', () => {
  it('has unique names and an https link to NVIDIA’s own pages', () => {
    expect(new Set(systems.map((s) => s.name)).size).toBe(systems.length);
    for (const s of systems) {
      expect(s.official.startsWith('https://'), s.name).toBe(true);
      expect(new URL(s.official).hostname, s.name).toMatch(/(^|\.)nvidia\.com$/);
    }
    expect(new Set(systems.map((s) => s.official)).size).toBe(systems.length);
  });

  it('uses only known kinds, positive memory and a real date', () => {
    for (const s of systems) {
      expect(['desktop', 'server', 'rack'], s.name).toContain(s.kind);
      if (s.totalMemoryGB !== undefined) expect(s.totalMemoryGB, s.name).toBeGreaterThan(0);
      expect(s.checked, s.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(s.checked)), s.name).toBe(false);
    }
  });

  it('says which memory a figure is whenever it gives one', () => {
    for (const s of systems) if (s.totalMemoryGB !== undefined) expect(s.memoryNote?.length ?? 0, s.name).toBeGreaterThan(20);
  });

  it('covers desktops, servers and racks', () => {
    for (const kind of ['desktop', 'server', 'rack']) expect(systems.some((s) => s.kind === kind), kind).toBe(true);
  });

  it('keeps the totals NVIDIA states, and they agree with the per-GPU data', () => {
    const by = (name: string) => systems.find((s) => s.name === name)!;
    expect(by('DGX B200').totalMemoryGB).toBe(1440);
    expect(by('DGX B200').totalMemoryGB! / 8).toBe(gpuById('b200').memGB);
    expect(by('DGX H100 and DGX H200').totalMemoryGB! / 8).toBe(gpuById('h100').memGB);
    expect(by('GB200 NVL72').totalMemoryGB! / 72).toBeCloseTo(gpuById('gb200').memGB, 0);
    expect(by('DGX GB200').totalMemoryGB).toBe(by('GB200 NVL72').totalMemoryGB);
  });
});
