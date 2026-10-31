import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the "dl-b" batch. */
export const extrasW1DlB: Record<string, Extra> = {
  'deep-learning/how-computers-see': {
    takeaways: [
      'A picture is a grid of numbers. A plain layer wastes weights on it and does not know which numbers are neighbours.',
      'A convolution slides a small shared filter over the picture, multiplying and adding at each position, to make a feature map.',
      'Stacked layers let early cells find edges and later cells find parts and objects. Training learns the filters.',
      'A residual connection adds a block’s input to its output, which keeps very deep networks trainable.',
    ],
    prereq: ['foundations/how-models-learn', 'deep-learning/inside-a-neural-network', 'deep-learning/training-deep-networks'],
    quiz: [
      { q: 'Why does a convolution layer need far fewer weights than a plain layer on the same picture?', options: ['It ignores most of the picture', 'It reuses the same small filter at every position', 'It only works on black and white pictures', 'It stores the weights in a smaller number format'], answer: 1, why: 'Weight sharing means one small filter is applied everywhere, so the count does not grow with picture size.' },
      { q: 'A 3 by 3 filter is put on a patch of flat sky where every pixel is 8, using weights that add up to zero. What is the output?', options: ['8', '72', '0', '9'], answer: 2, why: 'Weights that add to zero cancel on a flat area, so edge filters stay silent where nothing changes.' },
      { q: 'A 12 by 12 picture goes through a 3 by 3 filter with stride 1 and no padding. How big is the feature map?', options: ['12 by 12', '10 by 10', '9 by 9', '6 by 6'], answer: 1, why: 'The filter cannot be centred on the border, so each side loses 2: (12 + 0 - 3) / 1 + 1 = 10.' },
      { q: 'What does a residual connection do?', options: ['It adds a block’s input to its output', 'It removes the last layer', 'It halves the picture size', 'It trains the network twice'], answer: 0, why: 'The block only learns a correction on top of its input, and the shortcut gives the learning signal a straight path back.' },
    ],
  },
  'deep-learning/diffusion-models': {
    takeaways: [
      'Diffusion adds noise to a picture step by step, trains a network to predict the noise, then starts from pure noise and removes it step by step.',
      'Fewer steps are faster but blurrier. A sampler is the rule for the jumps, and a seed fixes the starting noise.',
      'Classifier-free guidance pushes the result towards the prompt. A higher scale follows the prompt harder but varies less.',
      'Latent diffusion does the work on a compressed picture, which is why it is affordable. Hands, text, bias and memorised images are known limits.',
    ],
    prereq: ['foundations/how-models-learn', 'foundations/multimodal-models', 'start/ai-that-sees-and-hears', 'deep-learning/how-computers-see'],
    quiz: [
      { q: 'What is the network trained to do in a diffusion model?', options: ['Predict the noise that was added to a picture', 'Draw a picture one line at a time', 'Compress pictures into text', 'Choose the best of many finished pictures'], answer: 0, why: 'Knowing the noise lets you subtract it and recover the cleaner picture.' },
      { q: 'In the toy demo, one denoising step turns a ring of points into a clump in the middle. Why?', options: ['The code is broken', 'One big jump can only guess the average of everything that could be there', 'The ring was too noisy to see', 'The prompt was set to zero'], answer: 1, why: 'The best single guess for any point on a ring is its centre, which is the blurry average.' },
      { q: 'What does raising the guidance scale do?', options: ['Makes the picture bigger', 'Removes the seed', 'Follows the prompt harder, usually with less variety', 'Uses fewer steps'], answer: 2, why: 'Guidance pushes the noise guess further from the unprompted guess towards the prompted one.' },
      { q: 'A 512 by 512 colour picture is 786,432 numbers. In Stable Diffusion the latent is 4 by 64 by 64. How many times fewer numbers is that?', options: ['8', '16', '64', '48'], answer: 3, why: '4 × 64 × 64 = 16,384, and 786,432 / 16,384 = 48.' },
    ],
  },
};
