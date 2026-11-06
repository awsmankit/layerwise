import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-chunking',
  title: 'What if we do not split documents into chunks?',
  blurb: 'Slide the chunk size from tiny to the whole handbook and see where the answer sentence gets cut in half or buried.',
  area: 'retrieval',
  level: 'intermediate',
  minutes: 4,
  why: [
    'A chunk is a piece of a document, a few sentences or paragraphs long. Retrieval finds the best chunks for a question and puts them in the model prompt. The prompt has limited room, and the model has to find the answer inside whatever it is given.',
    'Without chunking, a whole document is one unit. If it is longer than the room you have, the end is cut off, and an answer near the end is lost. If it fits, the answer is a few words in a sea of other text, and research on long prompts (Liu et al., 2023) found that models use information in the middle of a long input less reliably than at the start or end.',
    'The opposite mistake is chunks that are too small. A fact that needs a whole sentence gets cut at a boundary, the two halves each look weak to the search, and neither is retrieved. Real systems pick a middle size, let neighbouring chunks overlap, cut at natural boundaries such as paragraphs and headings, and test the result on real questions. The sizes here are a toy: one square is one word and the handbook has only 314.',
  ],
  takeaways: [
    'Chunk size is a trade-off. Too big buries the answer or overflows the prompt. Too small cuts the answer apart.',
    'Overlap and cutting at sentence or heading boundaries reduce the chance that a cut lands inside the answer.',
    'There is no best size for every document. Measure on real questions, as the success bars here do for five toy ones.',
  ],
  lessons: ['rag-agents/chunking-and-retrieval-quality', 'rag-agents/rag-from-scratch', 'llm/long-context-or-rag'],
  sources: [
    { label: 'Lost in the Middle: How Language Models Use Long Contexts (Liu et al., 2023)', url: 'https://arxiv.org/abs/2307.03172' },
    { label: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al., 2020)', url: 'https://arxiv.org/abs/2005.11401' },
  ],
  updated: '2026-11-06',
};
