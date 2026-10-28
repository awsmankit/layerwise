import type { Lab } from './types';

export const lab: Lab = {
  id: 'quantize-roundtrip',
  title: 'Quantize weights and measure what you lose',
  level: 'intermediate',
  minutes: 15,
  lesson: 'serving/quantization',
  goal: 'Quantization stores weights as small integers plus a scale. Do the round trip yourself on eight example weights, one of them an outlier, and see why one scale for everything hurts and a scale per group helps.',
  steps: [
    'quantize(values, bits): the largest absolute value maps to the top level, 2**(bits-1) - 1. The scale is that largest value divided by the top level (use 1.0 if every value is 0). Each integer is round(value / scale).',
    'dequantize(ints, scale): multiply each integer by the scale.',
    'quantize_groups(values, bits, group_size): quantize each run of group_size weights with its own scale, and return the weights after the round trip (quantized, then dequantized). The last group may be shorter.',
  ],
  starter: `weights = [-0.12, -0.09, -0.05, 0.02, 0.04, 0.08, 0.11, 0.93]    # the last one is an outlier

def quantize(values, bits):
    # TODO: return (integers, scale)
    ...

def dequantize(ints, scale):
    # TODO
    ...

def mean_abs_error(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) / len(a)

def quantize_groups(values, bits, group_size):
    # TODO: one scale per group of group_size weights; return the round-tripped weights
    ...

print(quantize(weights, 4))      # the integers and the scale
`,
  solution: `weights = [-0.12, -0.09, -0.05, 0.02, 0.04, 0.08, 0.11, 0.93]    # the last one is an outlier

def quantize(values, bits):
    top = 2 ** (bits - 1) - 1
    biggest = max(abs(v) for v in values)
    scale = biggest / top if biggest else 1.0
    return [round(v / scale) for v in values], scale

def dequantize(ints, scale):
    return [i * scale for i in ints]

def mean_abs_error(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) / len(a)

def quantize_groups(values, bits, group_size):
    out = []
    for start in range(0, len(values), group_size):
        ints, scale = quantize(values[start:start + group_size], bits)
        out.extend(dequantize(ints, scale))
    return out

print(quantize(weights, 4))      # the integers and the scale
`,
  tests: `
def _err(bits):
    ints, scale = quantize(weights, bits)
    return mean_abs_error(weights, dequantize(ints, scale))

def _q4():
    return quantize(weights, 4)

check("at 4 bits the top level is 7, so the outlier sets the scale to 0.93 / 7", lambda: abs(_q4()[1] - 0.93 / 7) < 1e-9)
check("the outlier becomes the top integer, 7", lambda: _q4()[0][-1] == 7 and max(abs(i) for i in _q4()[0]) == 7)
check("integers stay within -7 to 7 at 4 bits", lambda: all(-7 <= i <= 7 for i in _q4()[0]))
check("the integers are whole numbers", lambda: all(isinstance(i, int) for i in _q4()[0]))
check("8 bits is accurate: every weight is within half a step of the original", lambda: all(abs(a - b) <= quantize(weights, 8)[1] / 2 + 1e-12 for a, b in zip(weights, dequantize(*quantize(weights, 8)))))
check("more bits means less error: 8 bits beats 4 bits beats 3 bits", lambda: _err(8) < _err(4) < _err(3))
check("with one scale at 4 bits, 3 of the 7 small weights collapse to zero", lambda: sum(1 for i in _q4()[0][:7] if i == 0) == 3)
check("4 bits with one scale has a mean error of about 0.030", lambda: abs(_err(4) - 0.0302) < 0.0005)
check("a scale per group of 4 gives a lower error than one scale", lambda: mean_abs_error(weights, quantize_groups(weights, 4, 4)) < _err(4))
check("smaller groups are more accurate still, and groups of 1 are exact", lambda: mean_abs_error(weights, quantize_groups(weights, 4, 2)) < mean_abs_error(weights, quantize_groups(weights, 4, 4)) and mean_abs_error(weights, quantize_groups(weights, 4, 1)) < 1e-12)
check("a last group that is shorter still works, and nothing is dropped", lambda: len(quantize_groups(weights, 4, 3)) == 8)
check("all-zero weights do not crash", lambda: quantize([0.0, 0.0], 4)[0] == [0, 0])
`,
  hints: [
    'The top level for n bits is 2 ** (bits - 1) - 1: 7 for 4 bits, 127 for 8 bits.',
    'scale = max(abs(v) for v in values) / top. Then each integer is round(v / scale). Guard the case where the maximum is 0.',
    'For groups, loop with range(0, len(values), group_size), quantize each slice values[start:start + group_size], dequantize it, and extend one output list.',
  ],
};
