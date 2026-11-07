import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'too-many-passages',
  title: 'What if we retrieve far too many passages?',
  blurb: 'Slide the top-k from 1 to 30 on a toy question that needs three facts. Watch recall rise, then the chance of a right answer fall while the bill grows.',
  area: 'retrieval',
  level: 'intermediate',
  minutes: 4,
  predict: {
    question: 'A search finds 30 passages, and the three facts you need are somewhere in the first 7. What do you think happens if you send all 30 to the model instead of the first 7?',
    options: [
      'The answer gets better, because the model has more to work with.',
      'The answer stays the same, only the bill is bigger.',
      'The answer gets worse and the bill is bigger, because the facts are buried in distractors.',
    ],
    answer: 2,
    why: 'In this toy model the chance of a right answer is about 38% at 7 passages and about 16% at 30, while the tokens sent grow from 1,200 to 4,650. A right answer costs about 9 times more.',
  },
  why: [
    'In retrieval-augmented generation (RAG), a search finds passages and the model reads the top k of them before it answers. A bigger k raises recall: the chance that every fact you need is somewhere in the prompt. In the toy question on this page, recall reaches 100% once k reaches 7.',
    'After that, every extra passage is a distractor. It uses tokens, which you pay for and which take time to read, and it competes for the model\'s attention. The Lost in the Middle paper reports that, for multi-document question answering, performance is often highest when the relevant information is at the beginning or end of the input, and drops when it sits in the middle. The curve here uses two simple stated rules in that spirit (middle is read worse, more passages add noise), so the numbers are for the demo and not a measurement.',
    'Real systems pick k by testing: run a set of questions at several values of k, then choose the smallest k whose answers are as good as the best. Many also add a reranker to put the facts first, or send fewer, longer chunks. The paper "Retrieval Augmented Generation or Long-Context LLMs?" compares retrieval with simply giving a long-context model everything, and its abstract says retrieval is much cheaper, which is the cost side of the same trade-off.',
  ],
  takeaways: [
    'Recall only needs k to be big enough to include the facts. After that, a bigger k adds cost and distraction, not value.',
    'Facts in the middle of a long prompt are used less well than facts at the start or end. Order and length both matter.',
    'Cost is a straight line in k, but cost per right answer rises faster, because the answers also get worse.',
    'Choose k by measuring on your own questions. The best k is a number you find, not one you guess.',
  ],
  lessons: ['rag-agents/vector-search-and-retrieval-metrics', 'rag-agents/chunking-and-retrieval-quality', 'rag-agents/agent-memory-and-context-engineering'],
  sources: [
    { label: 'Lost in the Middle: How Language Models Use Long Contexts (Liu et al., 2023)', url: 'https://arxiv.org/abs/2307.03172' },
    { label: 'Retrieval Augmented Generation or Long-Context LLMs? A Comprehensive Study and Hybrid Approach (Li et al., 2024)', url: 'https://arxiv.org/abs/2407.16833' },
  ],
  updated: '2026-11-06',
};
