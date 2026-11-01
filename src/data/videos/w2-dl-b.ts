import type { LessonVideos } from './types';

/**
 * Videos for the lessons in the wave 2 "dl-b" batch. Keys are "<track>/<slug>". Titles, creators and lengths checked 2026-11-01.
 * The Stanford CS336 lecture has embedding disabled, so YouTube's oEmbed endpoint refuses it (HTTP 401); its title and channel
 * are copied from the watch page instead.
 */
export const videosW2DlB: LessonVideos = {
  'deep-learning/scaling-laws': [
    {
      creator: 'Welch Labs',
      title: "AI can't cross this line and we don't know why.",
      url: 'https://www.youtube.com/watch?v=5eqRuVp65eY',
      minutes: 24,
    },
    {
      creator: 'Stanford Online',
      title: 'Stanford CS336 Language Modeling from Scratch | Spring 2025 | Lecture 9: Scaling laws 1',
      url: 'https://www.youtube.com/watch?v=6Q-ESEmDf4Q',
      minutes: 65,
    },
    {
      creator: 'Yannic Kilcher',
      title: 'Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters (Paper)',
      url: 'https://www.youtube.com/watch?v=AfAmwIP2ntY',
      minutes: 53,
    },
  ],
  'deep-learning/rl-post-training': [
    {
      creator: 'Andrej Karpathy',
      title: 'Deep Dive into LLMs like ChatGPT',
      url: 'https://www.youtube.com/watch?v=7xTGNNLPyMI',
      minutes: 211,
    },
    {
      creator: 'Umar Jamil',
      title: 'Reinforcement Learning from Human Feedback explained with math derivations and the PyTorch code.',
      url: 'https://www.youtube.com/watch?v=qGyFrqc34yc',
      minutes: 135,
    },
    {
      creator: 'Yannic Kilcher',
      title: '[GRPO Explained] DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models',
      url: 'https://www.youtube.com/watch?v=bAWV_yrqx4w',
      minutes: 69,
    },
  ],
};
