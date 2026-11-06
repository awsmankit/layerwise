import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'sampling-rate',
  title: 'What if we sample sound too slowly?',
  blurb: 'Draw a tone and the dots a microphone keeps of it, then lower the sample rate until the computer rebuilds a pitch that was never there.',
  area: 'edge',
  level: 'basic',
  minutes: 3,
  why: [
    'A computer cannot keep a whole sound wave. It measures the air pressure many times a second and keeps only those measurements, the dots. The number of measurements per second is the sampling rate. Everything the computer later knows about the sound comes from the dots.',
    'If the dots are close enough together, only one smooth wave fits them all, so the original comes back. If they are too far apart, a slower wave also fits every dot, and the computer rebuilds that one. This is called aliasing. A tone of f hertz sampled at fs hertz is rebuilt as |f - k x fs|, where k is the whole number that gets the answer closest to zero. The dots must come more than twice per wave, so the highest tone you can keep is half the sampling rate, called the Nyquist limit.',
    'Once the dots are taken the damage cannot be undone, because the wrong tone and the right one gave the same numbers. So real devices put an analogue filter in front of the converter that removes tones above the limit before sampling. Speech models usually sample at 16,000 per second, which keeps everything up to 8,000 Hz, where most of the speech energy people use to understand words lives. Hearing devices and voice assistants choose their rate from this rule.',
  ],
  takeaways: [
    'Sampling keeps dots, not the wave. The dots are all the computer has.',
    'You need more than two dots per wave. Half the sampling rate is the highest tone you can keep.',
    'Too slow a rate does not just blur the sound: it invents a lower pitch that was never played.',
    'Filter out the high tones before you sample. After sampling it is too late.',
  ],
  lessons: ['audio/how-a-computer-hears', 'audio/noise-suppression-and-hearing-devices'],
  sources: [
    { label: 'Wikipedia: Aliasing', url: 'https://en.wikipedia.org/wiki/Aliasing' },
    { label: 'Hugging Face Audio Course, Unit 1: Working with audio data', url: 'https://huggingface.co/learn/audio-course/chapter1/audio_data' },
  ],
  updated: '2026-11-06',
};
