import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-attention',
  title: 'What if attention is removed?',
  blurb: 'Take attention away and watch the word "it" lose track of whether it means the animal or the street.',
  area: 'llm',
  level: 'basic',
  minutes: 3,
  why: [
    'In "the animal didn\'t cross the street because it was too tired", the word "it" means the animal. In the same sentence ending "too wide", it means the street. A reader decides by looking back over the sentence. Attention is how a transformer does that look back: every word scores every other word and then takes a weighted mix of what it finds.',
    'Remove it and a word is left with two bad choices. It can see only itself, so it learns nothing from the sentence. Or it can take a plain average of the other words, so every word counts the same and the animal and the street get an equal share. The average also cannot change with the last word, so "tired" and "wide" give the same blur.',
    'The demo is a toy: each word has four hand-set numbers and "it" asks a hand-set question. Real models learn these numbers and run many attention heads in many layers, so one layer can find the noun and a later one can use it. Models that mix words without attention exist, such as recurrent and state-space models, but they squeeze the past into a fixed-size memory instead of letting each word look back at all of it.',
  ],
  takeaways: [
    'Attention lets each word choose which other words matter, and how much.',
    'A plain average treats every word alike, so it cannot pick the animal over the street.',
    'Seeing only yourself means no context at all.',
    'The choice depends on the sentence: the same "it" points to different words when the last word changes.',
  ],
  lessons: ['foundations/attention-intuition', 'foundations/inside-a-transformer'],
  sources: [
    { label: 'Attention Is All You Need (Vaswani et al., 2017)', url: 'https://arxiv.org/abs/1706.03762' },
  ],
  updated: '2026-11-06',
};
