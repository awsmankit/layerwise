/**
 * Pure logic for the "From PyTorch to the chip" lesson: when a runtime hands the parts of a model that an
 * accelerator supports to that accelerator and runs the rest on the CPU, the model is cut into partitions.
 * Each accelerator partition costs two hand-offs (CPU to accelerator, accelerator back to CPU).
 *
 * All op timings below are EXAMPLE numbers chosen to show the shape of the effect. They are not measurements
 * of any chip or runtime.
 */

export interface Op {
  name: string;
  /** Example time on the CPU, in milliseconds. */
  cpuMs: number;
  /** What people commonly do when the accelerator does not support this kind of op. */
  hint: string;
}

export interface Graph {
  id: string;
  name: string;
  blurb: string;
  ops: Op[];
  /** The example support table the graph starts with. */
  supported: boolean[];
}

export const GRAPHS: Graph[] = [
  {
    id: 'cnn',
    name: 'Small audio CNN (int8)',
    blurb: 'A depthwise-separable CNN of the kind used for keyword spotting. The example accelerator runs convolutions and pooling but not softmax.',
    ops: [
      { name: 'Conv', cpuMs: 3.0, hint: 'Convolutions are what most accelerators are built for.' },
      { name: 'Depthwise conv', cpuMs: 0.8, hint: 'Some accelerators handle depthwise convolutions less well than ordinary ones; check the operator list.' },
      { name: 'Pointwise conv', cpuMs: 2.2, hint: 'A 1 x 1 convolution is a matrix multiply, commonly supported.' },
      { name: 'Depthwise conv', cpuMs: 0.8, hint: 'Some accelerators handle depthwise convolutions less well than ordinary ones; check the operator list.' },
      { name: 'Pointwise conv', cpuMs: 2.2, hint: 'A 1 x 1 convolution is a matrix multiply, commonly supported.' },
      { name: 'Average pool', cpuMs: 0.1, hint: 'Pooling is usually supported.' },
      { name: 'Fully connected', cpuMs: 0.2, hint: 'A fully connected layer is a matrix multiply, commonly supported.' },
      { name: 'Softmax', cpuMs: 0.05, hint: 'Cheap on the CPU. Leaving the last op on the CPU, or dropping softmax and taking the largest score, avoids a partition.' },
    ],
    supported: [true, true, true, true, true, true, true, false],
  },
  {
    id: 'tfm',
    name: 'Small transformer block',
    blurb: 'One attention block and feed-forward layer. The example accelerator runs matrix multiplies, adds and reshapes but not layer norm, softmax or GELU.',
    ops: [
      { name: 'Layer norm', cpuMs: 0.4, hint: 'Rewrite with supported ops if the runtime allows, swap for a normalisation the accelerator has (and retrain), or accept the CPU.' },
      { name: 'MatMul (QKV)', cpuMs: 6.0, hint: 'Matrix multiplies are the core workload of an accelerator.' },
      { name: 'Reshape', cpuMs: 0.5, hint: 'Data-layout ops are often supported so that they do not split partitions.' },
      { name: 'MatMul (scores)', cpuMs: 2.0, hint: 'Matrix multiplies are the core workload of an accelerator.' },
      { name: 'Softmax', cpuMs: 0.6, hint: 'Often kept on the CPU. A fused attention op, where the runtime offers one, removes the split.' },
      { name: 'MatMul (context)', cpuMs: 2.0, hint: 'Matrix multiplies are the core workload of an accelerator.' },
      { name: 'Add (residual)', cpuMs: 0.2, hint: 'Element-wise adds are usually supported.' },
      { name: 'Layer norm', cpuMs: 0.4, hint: 'Rewrite with supported ops if the runtime allows, swap for a normalisation the accelerator has (and retrain), or accept the CPU.' },
      { name: 'MatMul (FFN up)', cpuMs: 8.0, hint: 'Matrix multiplies are the core workload of an accelerator.' },
      { name: 'GELU', cpuMs: 0.8, hint: 'Replace with an activation the accelerator supports (and retrain), or approximate it with supported ops.' },
      { name: 'MatMul (FFN down)', cpuMs: 8.0, hint: 'Matrix multiplies are the core workload of an accelerator.' },
      { name: 'Add (residual)', cpuMs: 0.2, hint: 'Element-wise adds are usually supported.' },
    ],
    supported: [false, true, true, true, false, true, true, false, true, false, true, true],
  },
];

export interface Segment {
  start: number;
  /** Inclusive. */
  end: number;
  accel: boolean;
}

/** Splits the op sequence into runs of consecutive ops that share a placement. */
export function segmentsOf(supported: boolean[]): Segment[] {
  const out: Segment[] = [];
  supported.forEach((s, i) => {
    const last = out[out.length - 1];
    if (last && last.accel === s) last.end = i;
    else out.push({ start: i, end: i, accel: s });
  });
  return out;
}

export interface Params {
  /** How many times faster an op runs on the accelerator than on the CPU. */
  speedup: number;
  /** Cost of each hand-off, in milliseconds. */
  handoffMs: number;
}

export interface Result {
  segments: Segment[];
  /** Runs of ops delegated to the accelerator. */
  partitions: number;
  /** Two per partition: in and back out. */
  handoffs: number;
  cpuComputeMs: number;
  accelComputeMs: number;
  handoffTotalMs: number;
  totalMs: number;
  cpuOnlyMs: number;
  /** Total if every op were supported: one partition. */
  allSupportedMs: number;
  /** Hand-off cost at which this partitioning is exactly as slow as CPU only; null with no partitions. */
  breakEvenHandoffMs: number | null;
}

export function evaluate(ops: Op[], supported: boolean[], p: Params): Result {
  const segments = segmentsOf(supported);
  let cpuCompute = 0;
  let accelCompute = 0;
  let partitions = 0;
  for (const s of segments) {
    for (let i = s.start; i <= s.end; i++) {
      if (s.accel) accelCompute += ops[i].cpuMs / p.speedup;
      else cpuCompute += ops[i].cpuMs;
    }
    if (s.accel) partitions += 1;
  }
  const handoffs = partitions * 2;
  const handoffTotal = handoffs * p.handoffMs;
  const cpuOnly = ops.reduce((a, o) => a + o.cpuMs, 0);
  return {
    segments,
    partitions,
    handoffs,
    cpuComputeMs: cpuCompute,
    accelComputeMs: accelCompute,
    handoffTotalMs: handoffTotal,
    totalMs: cpuCompute + accelCompute + handoffTotal,
    cpuOnlyMs: cpuOnly,
    allSupportedMs: cpuOnly / p.speedup + 2 * p.handoffMs,
    breakEvenHandoffMs: handoffs > 0 ? (cpuOnly - cpuCompute - accelCompute) / handoffs : null,
  };
}
