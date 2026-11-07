import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'lost-in-the-middle',
  title: 'What if the answer sits in the middle of a long context?',
  blurb: 'Slide the relevant passage along a long prompt and see a schematic of the published U-shaped finding: models often do best at the start or end and worse in the middle.',
  area: 'llm',
  level: 'intermediate',
  minutes: 3,
  why: [
    'Models now accept very long prompts, so it is tempting to paste in many passages and let the model find the one that matters. The natural assumption is that a model reads all of it equally well, wherever the useful passage happens to be.',
    'Liu and colleagues (2023) tested that. They gave language models a question together with many documents, and moved the position of the document with the answer. They also tested retrieving a value from a long list of key-value pairs. Their abstract reports that performance is often highest when the relevant information is at the beginning or end of the input, and that it significantly degrades when the information is in the middle of a long context. Plotted against position, that is a U shape.',
    'The curve on this page is a schematic drawing of that U, not data. It is a simple parabola with no units, so it shows the shape and nothing else: no accuracy, no percentages, and no claim about how deep the dip is for any model. Real curves come from testing particular models. They can be lopsided and they differ between models. The paper tested models available in 2023, and this page says nothing about the models you use today.',
    'A common practical response, which is advice that follows from the finding rather than a result of the paper, is to send fewer passages, rank them so the best ones are chosen, and put the most important material near the start or the end of the prompt.',
  ],
  takeaways: [
    'A long context window does not mean every part of it is used equally well.',
    'The paper reports that performance is often highest when the relevant passage is at the start or end of the input, and degrades when it is in the middle.',
    'The curve here is a schematic of that finding, not measured data.',
    'Fewer, better-ranked passages near the ends of the prompt are a sensible response, but test your own model.',
  ],
  lessons: ['llm/long-context-or-rag', 'llm/context-window-and-caching', 'foundations/attention-intuition'],
  sources: [
    { label: 'Lost in the Middle: How Language Models Use Long Contexts (Liu et al., 2023)', url: 'https://arxiv.org/abs/2307.03172' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'You paste 21 passages into a long prompt and exactly one holds the answer. Where do you think a model is most likely to miss it?',
    options: [
      'At the very end, because that is furthest from where it started reading.',
      'In the middle of the prompt, around passage 11.',
      'Nowhere in particular: a model reads every passage equally well.',
    ],
    answer: 1,
    why: 'Liu et al. report that performance is often highest at the beginning or end and degrades when the relevant information is in the middle. In the schematic here, passage 11 of 21 is the lowest point of the U (a drawing of the published shape, not data).',
  },
};
