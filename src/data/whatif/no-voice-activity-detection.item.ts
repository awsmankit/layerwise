import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-voice-activity-detection',
  title: 'What if the device runs the big model on silence too?',
  blurb: 'Compare an always-listening device with and without a cheap voice detector in front of its big recogniser, and see the example battery go from about a day to about eight.',
  area: 'edge',
  level: 'intermediate',
  minutes: 5,
  why: [
    'A voice assistant, hearing aid feature or smart earbud that is always listening spends most of its day hearing nothing worth recognising: a quiet room, a fan, traffic. A speech recogniser is a big model, and running it costs real power. Running it on silence wastes battery on audio that has no words.',
    'The usual design is a gate. A voice-activity detector (VAD) is a tiny model that only decides whether someone is speaking. It runs all the time at very low power and wakes the big recogniser only when it hears speech. The share of time the big model is awake is its duty cycle. With the generic example figures on this page (a 40 mW recogniser, a 0.3 mW detector, a 1.1 Wh battery) and 10 percent of the day containing speech, the duty cycle falls from 100 percent to about 12 percent, and the battery lasts about 8 days instead of about 1.1.',
    'The gate is a trade. A detector can miss real speech, so the recogniser never hears it. At a 5 percent miss rate, about 1,080 of the 21,600 words spoken in that example day are lost, and a more aggressive gate loses more while saving only a little extra energy. A detector can also open by mistake on noise, which costs power but loses no words. Real systems tune this balance, add a short buffer so the start of a word is not cut off, and measure both missed speech and false alarms. The numbers here are generic examples, not a real device.',
  ],
  takeaways: [
    'Always-listening devices spend most of their time on silence, so the cheapest saving is not to run the big model then.',
    'A voice-activity detector is a tiny model that decides if anyone is speaking; its job is to wake the big one.',
    'Battery life is battery energy divided by average power, and average power is mostly the big model times its duty cycle.',
    'The gate can miss speech. Those words are gone, so the miss rate must be measured, not just the energy saved.',
  ],
  lessons: ['edge/tinyml-wake-word-detector', 'edge/real-time-on-a-budget', 'audio/speech-recognition'],
  sources: [
    { label: 'Hello Edge: Keyword Spotting on Microcontrollers (Zhang et al., 2017)', url: 'https://arxiv.org/abs/1711.07128' },
    { label: 'py-webrtcvad: a Python interface to the WebRTC voice activity detector (README: voiced or unvoiced audio, aggressiveness modes 0 to 3, 10, 20 or 30 ms frames)', url: 'https://github.com/wiseman/py-webrtcvad' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'An always-listening device runs a big speech recogniser all day, even though only about 10 percent of the day contains speech. We put a tiny voice detector in front that wakes the big one only when it hears speech. What do you think happens to battery life?',
    options: [
      'It barely changes, because the detector has to run all day and costs about as much as it saves.',
      'It gets a little longer, perhaps 10 or 20 percent, because the big model still runs part of the time.',
      'It gets several times longer, because the big model now runs only about an eighth of the day.',
    ],
    answer: 2,
    why: 'With the generic example figures, the big model runs about 12 percent of the day instead of 100 percent, and the battery lasts about 8.1 days instead of 1.1, roughly 7 times longer.',
  },
};
