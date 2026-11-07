import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-instruction-tuning',
  title: 'What if a base model is not instruction-tuned?',
  blurb: 'Ask the same question to a toy base model and a toy tuned one: the base one carries on the text with more questions, the tuned one answers and stops.',
  area: 'training',
  level: 'basic',
  minutes: 3,
  why: [
    'A language model is first trained to do one thing: predict the next word of text taken from the internet. A model that has only had this training is called a base model. Given "What is the capital of France?" it does not hear a request. It sees the start of a document and writes what most likely comes next. On a quiz page, that is the next quiz question.',
    'Instruction tuning changes what "next" means. The InstructGPT paper (OpenAI, 2022) starts from GPT-3, fine-tunes it on demonstrations written by human labelers (a prompt and a good answer), and then improves it further with reinforcement learning from human feedback, using labelers\' rankings of outputs. The paper reports that labelers preferred the outputs of the 1.3 billion parameter InstructGPT model to those of the 175 billion parameter GPT-3, and that the tuned models were more truthful and produced less toxic output. Its first line says that making models bigger does not by itself make them better at following what the user wants.',
    'The two models on this page are toys: tables of word counts, not neural networks. Both are trained on the same ordinary text; the tuned one also sees three demonstrations of question, answer, stop, which the toy counts several times. That imitates only the first of the paper\'s steps, and it only knows these three questions. Real base models can still be pushed to answer by writing the prompt as the start of a document, but a tuned model does it without the trick.',
  ],
  takeaways: [
    'A base model continues text. It does not know that your prompt is a request.',
    'Instruction tuning trains on examples of good answers, so the likeliest next words become an answer instead of more of the same text.',
    'In the InstructGPT paper, labelers preferred a much smaller tuned model to the large untuned one.',
    'The toy shows only the idea (demonstrations shift the odds). Real tuning also uses human rankings and reinforcement learning.',
  ],
  lessons: ['foundations/training-pipeline', 'llm/fine-tuning-in-practice', 'deep-learning/rl-post-training'],
  sources: [
    { label: 'Training language models to follow instructions with human feedback (Ouyang et al., 2022)', url: 'https://arxiv.org/abs/2203.02155' },
  ],
  updated: '2026-11-06',
};
