import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-windowing',
  title: 'What if we cut audio into blocks without a window function?',
  blurb: 'Cut a pure tone into a block, look at its spectrum, and watch the energy smear across the bins until a Hann window pulls it back into a sharp peak.',
  area: 'edge',
  level: 'intermediate',
  minutes: 4,
  why: [
    'Audio models rarely look at a whole recording. They cut it into short blocks, often a few tens of milliseconds, and run a Fourier transform on each block to see which frequencies are present. The transform quietly assumes that the block repeats forever, end to end.',
    'If a tone happens to fit a whole number of waves in the block, the repeat is seamless and the tone lands in exactly one bin. Real sounds almost never fit. The end of the block then does not meet the start, the repeat has a jump at the seam, and a jump contains every frequency. The tone smears across many bins. This is called spectral leakage. In the toy block on this page, a tone halfway between two bins sends about 10 percent of its energy more than two bins away, and a quiet tone 40 decibels (dB) lower is buried under the smear.',
    'A window function multiplies the block by a curve that fades to zero at both ends, so there is no jump. The Hann window is a common choice. It brings the leakage down by more than 20 dB in this example. It is not free: the peak gets wider, because the tone now spreads over about three bins instead of one. Speech and hearing-device front ends, spectrograms and mel features all apply a window, usually with blocks that overlap so that no sound sits only in the faded edges.',
  ],
  takeaways: [
    'A Fourier transform assumes the block repeats. A tone that does not fit leaves a jump at the seam.',
    'The jump spreads the tone over many bins (leakage). Quiet sounds near a loud one can be hidden by it.',
    'A window such as Hann fades the block edges to zero. Leakage drops by tens of dB.',
    'The cost is a wider peak, so windows are overlapped to keep every sound near the middle of some block.',
  ],
  lessons: ['audio/spectrograms-and-the-mel-scale', 'audio/how-a-computer-hears'],
  sources: [
    { label: 'Wikipedia: Spectral leakage', url: 'https://en.wikipedia.org/wiki/Spectral_leakage' },
    { label: 'Wikipedia: Window function', url: 'https://en.wikipedia.org/wiki/Window_function' },
  ],
  updated: '2026-11-06',
};
