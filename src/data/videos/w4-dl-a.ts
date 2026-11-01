import type { LessonVideos } from './types';

/**
 * Videos for the lessons in the wave 4 "dl-a" batch. Keys are "<track>/<slug>". Each was checked against
 * YouTube's oEmbed endpoint on 2026-11-01; title and creator are copied from it, minutes rounded from the
 * watch page. Views at that date: StatQuest RNN 1.07M, LSTM 1.06M, attention 479k, DeepLearning.AI transfer
 * learning 164k, Deepia SimCLR 46.7k (below the usual 100k, kept because it is the clearest animated
 * walk-through of the loss found).
 */
export const videosW4DlA: LessonVideos = {
  'deep-learning/rnns-and-lstms': [
    { creator: 'StatQuest with Josh Starmer', title: 'Recurrent Neural Networks (RNNs), Clearly Explained!!!', url: 'https://www.youtube.com/watch?v=AsNTP8Kwu80', minutes: 17 },
    { creator: 'StatQuest with Josh Starmer', title: 'Long Short-Term Memory (LSTM), Clearly Explained', url: 'https://www.youtube.com/watch?v=YCzL96nL7j0', minutes: 21 },
    { creator: 'StatQuest with Josh Starmer', title: 'Attention for Neural Networks, Clearly Explained!!!', url: 'https://www.youtube.com/watch?v=PSs6nxngL6k', minutes: 16 },
  ],
  'deep-learning/self-supervised-and-transfer-learning': [
    { creator: 'DeepLearningAI', title: 'Transfer Learning (C3W2L07)', url: 'https://www.youtube.com/watch?v=yofjFQddwHE', minutes: 11 },
    { creator: 'Deepia', title: 'Contrastive Learning with SimCLR | Deep Learning Animated', url: 'https://www.youtube.com/watch?v=UqJauYELn6c', minutes: 15 },
  ],
};
