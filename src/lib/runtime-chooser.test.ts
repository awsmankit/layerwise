import { describe, expect, it } from 'vitest';
import { COMPILER_ROUTE, SOURCES, TARGETS, recommend } from './runtime-chooser';

describe('runtime chooser', () => {
  it('has at least one route for every target from PyTorch and from ONNX', () => {
    for (const t of TARGETS) {
      expect(recommend('pytorch', t.id).length, `pytorch -> ${t.id}`).toBeGreaterThan(0);
      expect(recommend('onnx', t.id).length, `onnx -> ${t.id}`).toBeGreaterThan(0);
    }
  });

  it('says nothing, rather than guessing, where no documented route was found (TensorFlow or JAX to an NVIDIA GPU)', () => {
    expect(recommend('tensorflow', 'nvidia')).toEqual([]);
    expect(recommend('jax', 'nvidia')).toEqual([]);
  });

  it('gives every route a link, a reason and something to check', () => {
    for (const s of SOURCES)
      for (const t of TARGETS)
        for (const r of recommend(s.id, t.id)) {
          expect(r.url.startsWith('https://')).toBe(true);
          expect(r.why.length).toBeGreaterThan(20);
          expect(r.check.length).toBeGreaterThan(10);
        }
  });

  it('puts the NPU compile route for PyTorch on an Ethos-U microcontroller', () => {
    expect(recommend('pytorch', 'mcu-npu')[0].runtime).toContain('Ethos-U');
  });

  it('never offers ExecuTorch for a model that did not come from PyTorch', () => {
    for (const s of SOURCES.filter((x) => x.id !== 'pytorch'))
      for (const t of TARGETS) expect(recommend(s.id, t.id).some((r) => r.runtime.startsWith('ExecuTorch'))).toBe(false);
  });

  it('offers the compiler route only for PyTorch and ONNX sources', () => {
    expect(recommend('pytorch', 'android').some((r) => r.runtime.startsWith('Apache TVM'))).toBe(true);
    expect(recommend('onnx', 'browser').some((r) => r.runtime.startsWith('Apache TVM'))).toBe(true);
    expect(recommend('tensorflow', 'android').some((r) => r.runtime.startsWith('Apache TVM'))).toBe(false);
    expect(COMPILER_ROUTE.from).toEqual(['pytorch', 'onnx']);
  });
});
