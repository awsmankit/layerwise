import type { LessonVideos } from './types';

/**
 * Videos for the lessons in the wave 4 "dl-b" batch. Keys are "<track>/<slug>". Each was checked against
 * YouTube's oEmbed endpoint on 2026-11-01; title and creator are copied from it, minutes rounded from the
 * watch page. Views at that date: Computerphile GANs 682k, Arxiv Insights VAE 599k, Serrano GANs 301k,
 * Geron entropy and KL 401k, StatQuest encoder-only 123k, StatQuest decoder-only 247k.
 */
export const videosW4DlB: LessonVideos = {
  'deep-learning/autoencoders-vaes-and-gans': [
    { creator: 'Arxiv Insights', title: 'Variational Autoencoders', url: 'https://www.youtube.com/watch?v=9zKuYvjFFS8', minutes: 15 },
    { creator: 'Computerphile', title: 'Generative Adversarial Networks (GANs) - Computerphile', url: 'https://www.youtube.com/watch?v=Sw9r8CL98N0', minutes: 21 },
    { creator: 'Luis Serrano Academy', title: 'A Friendly Introduction to Generative Adversarial Networks (GANs)', url: 'https://www.youtube.com/watch?v=8L11aMN5KY8', minutes: 21 },
  ],
  'deep-learning/encoders-decoders-and-objectives': [
    { creator: 'StatQuest with Josh Starmer', title: 'Encoder-Only Transformers (like BERT) for RAG, Clearly Explained!!!', url: 'https://www.youtube.com/watch?v=GDN649X_acE', minutes: 19 },
    { creator: 'StatQuest with Josh Starmer', title: 'Decoder-Only Transformers, ChatGPTs specific Transformer, Clearly Explained!!!', url: 'https://www.youtube.com/watch?v=bQ5BoolX9Ag', minutes: 37 },
    { creator: 'Aurélien Géron', title: 'A Short Introduction to Entropy, Cross-Entropy and KL-Divergence', url: 'https://www.youtube.com/watch?v=ErfnhcEV1O8', minutes: 11 },
  ],
};
