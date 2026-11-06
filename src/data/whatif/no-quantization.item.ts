import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-quantization',
  title: 'What if the model is not quantised?',
  blurb: 'Pick a model and a device, then compare the memory the weights need at 16, 8 and 4 bits: does it fit, how many people can it serve, and how fast.',
  area: 'serving',
  level: 'basic',
  minutes: 4,
  why: [
    'A model is mostly a very long list of numbers called weights. Trained models usually keep each weight in 16 bits, which is 2 bytes. The memory needed is simply the number of weights times the bytes per weight. An 8-billion-weight model needs 16 GB at 16 bits, 8 GB at 8 bits and 4 GB at 4 bits.',
    'Quantisation stores each weight in fewer bits and converts it back to a useful value when it is used. Without it, the weights stay at full size. On this page that decides whether a model fits in a device at all. Whatever memory is left after the weights holds each person\'s KV cache (the stored keys and values of their conversation), so smaller weights also mean more people served at once.',
    'Speed follows memory too. Writing each token means reading every weight once, so a model that is four times smaller can be read about four times faster. The price is a loss of precision, so quality can drop. 8-bit usually costs very little, and 4-bit is widely used but should be tested on your own task. Methods such as GPTQ were designed to reach 3 or 4 bits with small accuracy loss.',
    'Devices and model sizes on this page are examples. The arithmetic ignores small extras such as the scale values quantisation stores alongside the weights.',
  ],
  takeaways: [
    'Weights memory is parameters times bits divided by 8. Halving the bits halves the memory.',
    'Without quantisation a model may not fit a device at all. With it, the same model fits and has room left for more users.',
    'Generation speed is limited by reading the weights, so fewer bits usually means faster tokens too.',
    'The cost is some precision. Test quality on your own task before choosing 4-bit.',
  ],
  lessons: ['serving/quantization', 'serving/kv-cache-and-memory', 'infra/reading-a-gpu-spec-sheet'],
  sources: [
    { label: 'GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers (Frantar et al., 2022)', url: 'https://arxiv.org/abs/2210.17323' },
  ],
  updated: '2026-11-06',
};
