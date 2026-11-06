import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-npu',
  title: 'What if the device has no neural accelerator?',
  blurb: 'Run the same example model on a CPU-class core and on an accelerator-class engine against a per-block audio deadline, and see which blocks are missed.',
  area: 'edge',
  level: 'intermediate',
  minutes: 4,
  why: [
    'Audio does not wait. It arrives in small blocks, and each block must be processed before the next one arrives, or the speaker has no samples to play and you hear a click or a gap. A block of 128 samples at 16,000 samples a second lasts 8 ms, so that is the deadline for each block. What counts is not the average time but the slowest block.',
    'A neural network is mostly multiply-adds. A small general-purpose CPU core does them one or a few at a time. A neural accelerator (an NPU) is hardware built to do many multiply-adds at once, usually at a lower energy per operation, but handing work to it has a fixed cost. In the demo the same model takes about 6.5 ms per block on the example CPU and about 0.6 ms on the example accelerator. With one block in ten running slow, the CPU misses several deadlines and the accelerator misses none.',
    'Every hardware figure on this page is a generic example chosen for the demo. It is not a measurement of, or a claim about, any chip. Real teams measure on the real device, report the slowest block and a high percentile, and then choose: a smaller or quantized model, a larger block size (which adds delay), a faster clock, or an accelerator.',
  ],
  takeaways: [
    'A block of audio sets a hard deadline. Missing it is audible.',
    'Judge the slowest block, not the average. Occasional slow blocks cause the clicks.',
    'An accelerator buys headroom for bigger models, at the price of hardware and a hand-off cost per block.',
    'Without one, you shrink the model, grow the block (more delay) or accept misses.',
  ],
  lessons: ['edge/real-time-on-a-budget', 'edge/inside-a-small-device'],
  sources: [
    { label: 'MDN: AudioWorkletProcessor.process() (audio is processed in blocks of 128 frames)', url: 'https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process' },
    { label: 'MLPerf Tiny Benchmark (Banbury et al., 2021)', url: 'https://arxiv.org/abs/2106.07597' },
  ],
  updated: '2026-11-06',
};
