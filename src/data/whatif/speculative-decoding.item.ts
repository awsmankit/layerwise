import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'speculative-decoding',
  title: 'What if the big model checks every token itself?',
  blurb: 'Compare a big model that writes one token per pass with a small draft model whose guesses the big model verifies in bulk.',
  area: 'llm',
  level: 'advanced',
  minutes: 5,
  why: [
    'A language model writes one token at a time, and each token needs a full pass through the big model. That is slow because each pass has to wait for the one before it. Speculative decoding adds a small, cheap draft model. It guesses the next few tokens, then the big model checks all the guesses in a single pass. It keeps the guesses it agrees with up to the first one it rejects and adds one token of its own, so every pass writes at least one token.',
    'The paper by Leviathan, Kalman and Matias shows that the accept and reject rule leaves the output distribution unchanged: the text is what the big model alone would have written. The saving depends on the acceptance rate, the chance that the big model accepts a draft token. If that chance is alpha and the drafts are independent, one big-model pass writes on average (1 − alpha^(gamma+1)) / (1 − alpha) tokens, where gamma is the number of drafted tokens. At 70% and 4 drafts that is about 2.77 tokens per pass instead of 1.',
    'Drafting is not free. The draft model must run gamma times in a row, so the wall-time gain is that expected number divided by (gamma × c + 1), where c is the cost of one draft run compared with a big run. With a poor draft model, drafting can even slow things down. The paper reports a 2X to 3X speed-up for T5-XXL. The cost and acceptance values on this page are examples you can move, and the strip is drawn from a seeded simulation, not from real models.',
  ],
  takeaways: [
    'A big model alone writes one token per pass. A verified draft can give several tokens for one pass.',
    'The output text is unchanged: speculative decoding only changes how fast it is produced.',
    'The gain depends on the acceptance rate: at 0% every pass still writes 1 token, at 100% it writes gamma + 1.',
    'The draft model has a cost too, so a poor or slow draft can make things slower.',
  ],
  lessons: ['serving/inference-optimisation', 'serving/life-of-a-request', 'serving/kv-cache-and-memory'],
  sources: [
    { label: 'Fast Inference from Transformers via Speculative Decoding (Leviathan, Kalman and Matias, 2023)', url: 'https://arxiv.org/abs/2211.17192' },
  ],
  updated: '2026-11-06',
};
