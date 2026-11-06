import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'greedy-decoding',
  title: 'What if the model always picks the most likely token?',
  blurb: 'A toy model writes text by always taking the top word, then by sampling, and you can see the loop and the dull word choice.',
  area: 'llm',
  level: 'basic',
  minutes: 4,
  why: [
    'A language model does not output a sentence. At each step it outputs a probability for every possible next token, and a separate rule, the decoding rule, chooses one. The simplest rule is greedy decoding: always take the single most likely token.',
    'That sounds safe, but it removes all variety. If "the cat sat on the" is the top path once, it is the top path again, and the text falls into a loop. Words that were a close second, such as "dog" at 28% against "cat" at 30%, are never used. The demo is a toy with invented probabilities, so the numbers show the mechanism, not how any real model behaves. The Holtzman et al. paper reports that using likelihood as the decoding objective gives text that is bland and strangely repetitive, even though models trained on likelihood are strong.',
    'Real systems sample instead. Temperature reshapes the odds: low is cautious, high is adventurous. Top-p, also called nucleus sampling, keeps only the smallest group of likely tokens that add up to p and drops the unreliable tail, so variety stays without the odd words. Greedy still has a place, for example when you want the same answer every time, but loops are the price.',
  ],
  takeaways: [
    'The model gives odds for the next token; a separate decoding rule picks one.',
    'Always taking the top token is repeatable but can lock into loops and never uses close runners-up.',
    'Temperature changes how flat or sharp the odds are. Top-p cuts the unlikely tail.',
    'Too much freedom gives odd text, too little gives repetition. Settings sit between the two.',
  ],
  lessons: ['llm/parameters-and-hyperparameters', 'foundations/inside-a-transformer'],
  sources: [
    { label: 'The Curious Case of Neural Text Degeneration (Holtzman et al., 2019)', url: 'https://arxiv.org/abs/1904.09751' },
  ],
  updated: '2026-11-06',
};
