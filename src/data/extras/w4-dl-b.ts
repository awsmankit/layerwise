import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "dl-b" batch. */
export const extrasW4DlB: Record<string, Extra> = {
  'deep-learning/autoencoders-vaes-and-gans': {
    takeaways: [
      'An autoencoder squeezes an input through a small code and rebuilds it. That is useful for compression, features and anomaly scores, but random codes often decode to rubbish.',
      'A VAE makes the code a small cloud and adds a KL term that pulls all codes towards one standard bell curve, so drawing a code and decoding it works. A heavy KL weight blurs the rebuild.',
      'A GAN trains a forger against a detective and samples in one pass. Training is a two-player game: it can be unstable, can drop modes (mode collapse), and one loss curve does not show sample quality.',
      'Dhariwal and Nichol showed diffusion beating a leading GAN on ImageNet image quality and coverage, at the cost of slower sampling. GAN and VAE parts live on inside larger systems.',
    ],
    prereq: ['deep-learning/inside-a-neural-network'],
    quiz: [
      {
        q: 'Why does an autoencoder need a bottleneck?',
        options: ['It makes training faster', 'Without it the network can copy the input across and learn nothing useful', 'It lets the network add noise to the output', 'It removes the need for a decoder'],
        answer: 1,
        why: 'A code as large as the input allows copying; a small code forces the network to keep only what matters.',
      },
      {
        q: 'In a VAE, what does the KL term charge for?',
        options: ['Encoder clouds that sit far from a standard bell curve centred on zero or are very narrow', 'Using more than one hidden layer', 'Reconstructions that are too sharp', 'Slow sampling'],
        answer: 0,
        why: 'The KL term pulls every input’s cloud towards the shared bell curve, which is what makes drawing a random code and decoding it work.',
      },
      {
        q: 'In the toy GAN, a forger that learns far faster than the detective often ends up covering only one of the two humps. What is this called?',
        options: ['Overfitting', 'Posterior collapse', 'Mode collapse', 'Vanishing gradients'],
        answer: 2,
        why: 'Mode collapse is when the generator covers only some modes of the data, because it piles samples where the current detective is easiest to fool.',
      },
      {
        q: 'What did Dhariwal and Nichol report about diffusion and GANs?',
        options: ['GANs were always faster and also better', 'A diffusion model beat BigGAN-deep on ImageNet FID with better coverage, though sampling was slower', 'Diffusion and GANs are the same method', 'GANs cannot be used inside diffusion systems'],
        answer: 1,
        why: 'They reported better FID and coverage than BigGAN-deep at 128, 256 and 512 pixels, and named slower sampling as the cost.',
      },
    ],
  },
  'deep-learning/encoders-decoders-and-objectives': {
    takeaways: [
      'BERT, GPT and T5 use the same transformer parts. The attention mask (bidirectional, causal, prefix) and the training task are what differ.',
      'Encoder-only models fill in hidden tokens and give a vector per token, suiting embeddings, classification and reranking. Decoder-only models predict the next token at every position and suit generation. Encoder-decoder models read all the input, then write.',
      'Cross-entropy is minus the log probability of the true token. Perplexity is 2 to the mean bits per token (or e to the mean nats): the effective number of equally likely choices.',
      'Compare across tokenisers with bits per byte, not perplexity. KL divergence is the extra bits paid for using the wrong distribution, and it appears in distillation and the RL-from-feedback penalty.',
    ],
    prereq: ['foundations/inside-a-transformer', 'foundations/tokens-and-embeddings'],
    quiz: [
      {
        q: 'A decoder-only model reads 8 tokens in one pass with a causal mask. How many next-token predictions does it learn from?',
        options: ['1', '7', '8, plus a mask token', 'About 1, since only about 15% of positions count'],
        answer: 1,
        why: 'Every position predicts the token after it, so 8 tokens give 7 training examples at once.',
      },
      {
        q: 'In BERT’s masked language modelling, 15% of positions are chosen. What is done at those positions?',
        options: ['All are replaced with [MASK]', 'None are changed, but they are predicted twice', '80% become [MASK], 10% a random token and 10% stay unchanged', 'They are deleted and the sentence is shortened'],
        answer: 2,
        why: 'The random and unchanged cases reduce the mismatch caused by [MASK] never appearing when the model is used.',
      },
      {
        q: 'A model gives the true tokens of a text the probabilities 1/2, 1/4 and 1/8. What is the perplexity?',
        options: ['2', '3', '4', '8'],
        answer: 2,
        why: 'The bits are 1, 2 and 3, mean 2, and perplexity is 2 to the power 2, which is 4.',
      },
      {
        q: 'Why prefer bits per byte to perplexity when comparing two models with different tokenisers?',
        options: ['Bits per byte is always lower', 'It does not depend on how the text is cut into tokens', 'Perplexity cannot be calculated for GPT-style models', 'It measures helpfulness'],
        answer: 1,
        why: 'Perplexity is per token, so a tokeniser with more, smaller tokens changes it. Total bits divided by bytes of text uses the same yardstick for any tokeniser.',
      },
    ],
  },
};
