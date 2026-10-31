import type { LessonVideos } from './types';

/**
 * Videos for the lessons in the "dl-a" batch. Keys are "<track>/<slug>". Each was checked against
 * YouTube's oEmbed endpoint on 2026-11-01; title and creator are copied from it, minutes rounded
 * from the watch page. Views at that date: 3Blue1Brown ch.1 25.1M, StatQuest 1.46M, DeepBean 161k,
 * Karpathy makemore 3 567k, Karpathy micrograd 4.38M, 3Blue1Brown ch.3 6.37M, ch.4 4.00M.
 */
export const videosW1DlA: LessonVideos = {
  'deep-learning/inside-a-neural-network': [
    { creator: '3Blue1Brown', title: 'But what is a neural network? | Deep learning chapter 1', url: 'https://www.youtube.com/watch?v=aircAruvnKk', minutes: 19, easy: true },
    { creator: 'StatQuest with Josh Starmer', title: 'The Essential Main Ideas of Neural Networks', url: 'https://www.youtube.com/watch?v=CqOfi41LfDw', minutes: 19 },
  ],
  'deep-learning/training-deep-networks': [
    { creator: 'DeepBean', title: 'Optimization for Deep Learning (Momentum, RMSprop, AdaGrad, Adam)', url: 'https://www.youtube.com/watch?v=NE88eqLngkg', minutes: 16 },
    { creator: 'Andrej Karpathy', title: 'Building makemore Part 3: Activations & Gradients, BatchNorm', url: 'https://www.youtube.com/watch?v=P6sfmUTpUmc', minutes: 116 },
  ],
  'deep-learning/backprop-from-scratch': [
    { creator: '3Blue1Brown', title: 'Backpropagation, intuitively | Deep Learning Chapter 3', url: 'https://www.youtube.com/watch?v=Ilg3gGewQ5U', minutes: 13, easy: true },
    { creator: '3Blue1Brown', title: 'Backpropagation calculus | Deep Learning Chapter 4', url: 'https://www.youtube.com/watch?v=tIeHLnjs5U8', minutes: 10 },
    { creator: 'Andrej Karpathy', title: 'The spelled-out intro to neural networks and backpropagation: building micrograd', url: 'https://www.youtube.com/watch?v=VMj-3S1tku0', minutes: 146 },
  ],
};
