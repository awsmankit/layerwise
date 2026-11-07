import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-grounding-check',
  title: 'What if we never check the answer against the sources?',
  blurb: 'A drafted answer has one sentence that is not in the retrieved text. See it slip through, then see a per-sentence check flag it.',
  area: 'retrieval',
  level: 'intermediate',
  minutes: 4,
  why: [
    'In retrieval-augmented generation (RAG), the model is given passages and asked to answer from them. But nothing forces it to stay inside them. It can add a plausible extra detail, change a number, or fill a gap from memory. The sentence reads just as fluently as the true ones, so a reader cannot tell it apart.',
    'A grounding check (also called a faithfulness or citation check) takes the draft apart sentence by sentence and asks whether the retrieved text supports each one. Sentences with no support are removed, rewritten, or flagged to the user, or the whole answer is sent back for another try.',
    'The checker on this page is a toy: it counts shared words and compares numbers. It catches an invented sentence and a changed number, but it wrongly flags a correct paraphrase and it misses "unpaid" slipped in for "paid". Real checkers are models: either a trained entailment model or a language model asked to judge, and they deal with paraphrase and negation far better, though they make mistakes too.',
    'Skipping the check is not a hypothetical risk. The ALCE benchmark (Gao et al., 2023), which tests whether models can write answers with citations, reports that even the best models lack complete citation support 50 percent of the time on one of its question sets.',
  ],
  takeaways: [
    'A model given sources can still say things the sources do not. A fluent wrong sentence looks exactly like a right one.',
    'A grounding check compares each answer sentence with the retrieved text and flags the ones nothing supports.',
    'A word-counting checker is fooled by paraphrase in one direction and by a single flipped word in the other. Real checkers are models, and they still need measuring.',
    'Strictness is a trade: a tighter check flags more real problems and more harmless rewording.',
  ],
  lessons: ['evals/why-models-make-things-up', 'rag-agents/rag-from-scratch', 'evals/guardrails-in-practice'],
  sources: [
    { label: 'Enabling Large Language Models to Generate Text with Citations (Gao et al., 2023)', url: 'https://arxiv.org/abs/2305.14627' },
    { label: 'Ragas: Automated Evaluation of Retrieval Augmented Generation (Es et al., 2023)', url: 'https://arxiv.org/abs/2309.15217' },
  ],
  updated: '2026-11-06',
};
