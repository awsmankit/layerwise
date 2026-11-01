import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "dl-a" batch. */
export const extrasW4DlA: Record<string, Extra> = {
  'deep-learning/rnns-and-lstms': {
    takeaways: [
      'An RNN reads a sequence one step at a time and carries a fixed-size hidden state, using the same weights at every step.',
      'Backpropagation through time multiplies the learning signal once per step, so over long gaps it vanishes (0.9 to the power 49 is about 0.006) or explodes. Clipping fixes explosions; vanishing is the real limit.',
      'An LSTM edits a cell state only by multiplying (forget gate) and adding (input gate), so a forget gate near 1 gives a long steady path (0.98 to the power 48 is about 0.42). Gates also let it ignore words that should not be stored.',
      'Attention replaced recurrence for direct access, parallel training and no single-vector bottleneck, at the price of work that grows with n squared and a cache that grows with length. Recurrence lives on in streaming models, RWKV and state-space models.',
    ],
    prereq: ['deep-learning/training-deep-networks', 'foundations/attention-intuition'],
    quiz: [
      {
        q: 'A plain RNN multiplies the learning signal by about 0.9 at each of 49 steps going back in time. Roughly how much of it reaches the first step?',
        options: ['About 90%', 'About 50%', 'Under 1%', 'Exactly zero'],
        answer: 2,
        why: '0.9 to the power 49 is about 0.006, so under 1% arrives. That is a vanishing gradient, small but not exactly zero.',
      },
      {
        q: 'What does an LSTM do that lets it carry a memory across many steps?',
        options: [
          'It stores every earlier word in a growing table',
          'It edits a separate cell state by multiplying with a forget gate and adding through an input gate',
          'It removes the hidden state completely',
          'It trains all the steps at the same time',
        ],
        answer: 1,
        why: 'With a forget gate near 1 and the input gate near 0, the old cell value passes through almost unchanged, giving the signal a steady path.',
      },
      {
        q: 'In the lab, the distractor noun "cabinet" flips the plain RNN to the wrong answer but not the LSTM. Why?',
        options: [
          'The LSTM has more weights',
          'The LSTM reads the sentence backwards',
          'The LSTM input gate stays nearly shut on that word, so it barely touches the cell',
          'The RNN forgets everything at every step',
        ],
        answer: 2,
        why: 'The RNN has no way to refuse a word. The gate lets the LSTM choose what to write, not only what to keep.',
      },
      {
        q: 'Which is a reason transformers trained faster than RNNs on the same text?',
        options: [
          'Attention needs fewer comparisons than recurrence',
          'All positions of a sequence can be computed together, instead of waiting for the previous step',
          'Transformers have no weights to train',
          'Transformers never need a GPU',
        ],
        answer: 1,
        why: 'An RNN step needs the previous state, so one sequence runs in order. Attention is matrix multiplication across all positions at once.',
      },
    ],
  },
  'deep-learning/self-supervised-and-transfer-learning': {
    takeaways: [
      'Self-supervised learning makes labels from the data itself: predict the next token, fill in masked parts, or match two views of the same item. The product you keep is the representation.',
      'Contrastive learning pulls two augmented views together and pushes other items away (InfoNCE). The augmentations define what the model learns to ignore, and weak ones allow a shortcut.',
      'Transfer learning reuses a pretrained model: freeze it and train a head when labels are few or the data is similar, or fine-tune with a smaller learning rate when you have more data.',
      'Pretraining helps most when labels are scarce, but it fails when your task depends on what the pretext task discarded. Always compare with a simple baseline on your own held-out data.',
    ],
    prereq: ['start/three-ways-machines-learn', 'deep-learning/inside-a-neural-network'],
    quiz: [
      {
        q: 'BERT hides 15% of the tokens in a sequence and predicts them. Where do the labels come from?',
        options: ['People write them by hand', 'From the text itself, since the hidden tokens are known', 'From a second, larger model', 'There are no labels, so nothing is learned'],
        answer: 1,
        why: 'The answer is already in the data, which is why this is called self-supervised: no human labelling is needed.',
      },
      {
        q: 'In the contrastive toy, augmentation is set to 0, so both views of an item share the same background. What happens?',
        options: [
          'The encoder ignores the background and separates the classes well',
          'The background becomes a shortcut, and the classes stay mixed up',
          'Training stops working altogether',
          'The loss cannot be calculated',
        ],
        answer: 1,
        why: 'Matching the pair is easy using the background, so the encoder never needs the class-related content.',
      },
      {
        q: 'You have 30 labelled examples that look much like the pretraining data. What is the usual sensible first step?',
        options: [
          'Fine-tune every layer with a large learning rate',
          'Train a large network from scratch',
          'Freeze the pretrained model and train a new head on its features',
          'Collect a million more labels before starting',
        ],
        answer: 2,
        why: 'With few labels and similar data, a linear head on frozen features is cheap and hard to overfit (the CS231n rule of thumb).',
      },
      {
        q: 'In the transfer demo, "Different kind of data" leaves frozen features near chance however many labels you add. Why?',
        options: [
          'The classifier is too simple',
          'Pretraining learned to ignore the very numbers that carry the new task\'s class signal',
          'There are too few test items',
          'Frozen features always fail',
        ],
        answer: 1,
        why: 'A representation keeps what helps the pretext task and drops the rest. If the new task needs what was dropped, freezing cannot recover it.',
      },
    ],
  },
};
