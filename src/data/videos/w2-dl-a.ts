import type { LessonVideos } from './types';

/**
 * Videos for the lessons in the wave 2 "dl-a" batch. Keys are "<track>/<slug>". Each was checked against
 * YouTube's oEmbed endpoint on 2026-11-01; title and creator are copied from it, minutes rounded from the
 * watch page. Views at that date: Karpathy tokenizer 1.25M, Raschka text data 123k, Umar Jamil LLaMA 131k,
 * Welch Labs MLA 1.01M, Raschka architecture comparison 47.8k (below the usual 100k, kept because the
 * creator maintains the survey the lesson cites).
 */
export const videosW2DlA: LessonVideos = {
  'deep-learning/build-a-tokenizer': [
    { creator: 'Andrej Karpathy', title: "Let's build the GPT Tokenizer", url: 'https://www.youtube.com/watch?v=zduSFxRajkE', minutes: 134 },
    { creator: 'Sebastian Raschka', title: 'Build an LLM from Scratch 2: Working with text data', url: 'https://www.youtube.com/watch?v=341Rb8fJxY0', minutes: 88 },
  ],
  'deep-learning/modern-llm-architecture': [
    { creator: 'Umar Jamil', title: 'LLaMA explained: KV-Cache, Rotary Positional Embedding, RMS Norm, Grouped Query Attention, SwiGLU', url: 'https://www.youtube.com/watch?v=Mn_9W1nCFLo', minutes: 71 },
    { creator: 'Welch Labs', title: 'How DeepSeek Rewrote the Transformer [MLA]', url: 'https://www.youtube.com/watch?v=0VLAoVGf_74', minutes: 18 },
    { creator: 'Sebastian Raschka', title: 'The Big LLM Architecture Comparison', url: 'https://www.youtube.com/watch?v=rNlULI-zGcw', minutes: 87 },
  ],
};
