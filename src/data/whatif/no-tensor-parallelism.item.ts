import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-tensor-parallelism',
  title: 'What if the model must fit on one GPU?',
  blurb: 'Add up the memory a model and its KV cache need, see when one GPU is not enough, and watch what splitting across 2, 4 or 8 GPUs does to memory and to the time spent talking.',
  area: 'serving',
  level: 'advanced',
  minutes: 6,
  why: [
    'To serve a model, a GPU must hold the weights (the numbers the model learned) and, for every conversation it is working on, a KV cache (the stored keys and values of the tokens so far). Weights take the number of parameters times the bytes per parameter: 70 billion parameters at 2 bytes is 140 GB. The cache grows with batch size and context length. A server also keeps some memory free for working buffers, so a GPU cannot be filled to the brim.',
    'If the total is bigger than one GPU, the model simply does not load. Tensor parallelism cuts each layer into pieces and gives one piece to each GPU, so every GPU holds about one Nth of the weights and one Nth of the cache. Memory per GPU falls roughly in proportion to N. The Megatron-LM paper describes this intra-layer approach and notes it needs only a few communication operations.',
    'The price is talking. The GPUs hold partial results, so after the attention part and again after the feed-forward part of every layer they must add their pieces together (an all-reduce). That is two all-reduces per layer, on every generated token. On a fast link between GPUs this is a small slice of each step. On a slow link, or with a big batch, it can eat a large share, which is why tensor parallelism is usually kept inside one machine whose GPUs are joined by a fast link.',
    'Every size, memory, speed and delay on this page is an example, and the layer counts are example shapes, not a named model. The page uses formulas only. Real systems also compress weights to 8 or 4 bits, which you can try with the switch for 8-bit weights, so a model fits on fewer GPUs.',
  ],
  takeaways: [
    'A model needs weights plus a KV cache that grows with batch and context, and a GPU cannot be filled completely.',
    'If that total is bigger than one GPU, the model does not load at all. Splitting is not optional then.',
    'Splitting across N GPUs gives each about 1/N of the memory, but adds two all-reduces per layer on every token.',
    'A slow link between GPUs turns the saving into a slowdown, so keep tensor parallelism on fast links.',
  ],
  lessons: ['infra/multi-gpu-parallelism-and-interconnect', 'serving/kv-cache-and-memory', 'infra/reading-a-gpu-spec-sheet'],
  sources: [
    { label: 'Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism (Shoeybi et al., arXiv 1909.08053)', url: 'https://arxiv.org/abs/1909.08053' },
    { label: 'Parallelism methods (Hugging Face Transformers documentation)', url: 'https://huggingface.co/docs/transformers/main/en/perf_train_gpu_many' },
  ],
  updated: '2026-11-07',
  predict: {
    question: 'A 70B-parameter model with 16-bit weights, plus the KV cache for 8 chats of 8,000 tokens each, needs about 161 GB. Your GPUs have 80 GB each. What happens when we split the model across more of them?',
    options: [
      'Two GPUs are enough: two times 80 GB is 160 GB, close to what it needs.',
      'Two are not quite enough. It takes four, and each then holds about 40 GB.',
      'It never fits: splitting a model does not reduce how much memory each GPU needs.',
    ],
    answer: 1,
    why: 'A server only fills about 90% of a GPU, so 72 GB is usable. Two GPUs would each need 80.7 GB, which is too much. Four need 40.4 GB each, at the cost of about 1.7 ms per step passing partial results around (example fast link).',
  },
};
