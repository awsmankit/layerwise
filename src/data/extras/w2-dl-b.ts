import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 2 "dl-b" batch. */
export const extrasW2DlB: Record<string, Extra> = {
  'deep-learning/scaling-laws': {
    takeaways: [
      'Loss falls as a power law in parameters, data and compute. The exponents are small, so each gain costs several times more than the last.',
      'Chinchilla showed that parameters and tokens should grow together, at about 20 tokens per parameter in its setup. Treat 20 as a measured value for one data set, not a law.',
      'Training costs about 6 x N x D FLOPs. Divide by peak speed times utilisation for GPU-seconds, then multiply by a price. Expect the estimate to be within tens of per cent.',
      'Production models are trained far past compute-optimal because serving cost dominates, and every extrapolation of a scaling law is a hedge: it predicts loss, not abilities.',
    ],
    prereq: ['foundations/training-pipeline'],
    quiz: [
      {
        q: 'A scaling-law fit says loss falls as N to the power of minus 0.076, where N is the number of parameters. What does doubling N do to the loss?',
        options: ['Halves it', 'Cuts it by about 5 per cent', 'Cuts it by about 76 per cent', 'Leaves it unchanged'],
        answer: 1,
        why: '2 to the power of minus 0.076 is about 0.95, so each doubling of parameters multiplies the loss by 0.95, a drop of about 5 per cent.',
      },
      {
        q: 'Using C = 6 x N x D, roughly how many training FLOPs does a 70 billion parameter model need on 1.4 trillion tokens?',
        options: ['5.9e21', '1.2e25', '5.9e23', '9.8e22'],
        answer: 2,
        why: '6 x 70e9 x 1.4e12 = 5.88e23. The 6 is 2 for the forward pass plus about 4 for the backward pass, per parameter per token.',
      },
      {
        q: 'Llama 3 8B saw about 15 trillion tokens, far more than 20 per parameter. Why train a small model that long?',
        options: [
          'The Chinchilla paper showed that extra data hurts',
          'No more compute was available for a bigger model',
          'Compute-optimal models cannot be served',
          'A smaller model trained for longer is cheaper to serve, which can outweigh the extra training compute',
        ],
        answer: 3,
        why: 'Chinchilla minimises training compute only. If a model will serve a huge number of tokens, shifting cost into training to shrink the model can lower the total.',
      },
      {
        q: 'Which of these does a scaling law fitted to next-token loss NOT tell you?',
        options: [
          'Exactly when a particular ability, such as passing a given exam, will appear',
          'How the predicted loss changes when compute grows tenfold under that fit',
          'The compute needed for a given number of parameters and tokens',
          'The best split of a compute budget between parameters and tokens under that fit',
        ],
        answer: 0,
        why: 'The fits predict loss on a data distribution. Mapping loss to a task score needs another fit, and the data, recipe and metric can all change the result.',
      },
    ],
  },
  'deep-learning/rl-post-training': {
    takeaways: [
      'Supervised fine-tuning copies demonstrations. RL optimises a score for the finished answer, which can come from human rankings, a learned reward model, or a program that checks the answer.',
      'RLHF trains a reward model on rankings, then runs PPO against it with a KL penalty to a frozen reference. DPO folds the reward model into a loss on preference pairs. RLVR replaces it with a checker.',
      'GRPO samples a group of answers per prompt and uses (reward - group mean) / group standard deviation as the advantage, so no value model is needed. A group where every answer scores the same teaches nothing.',
      'Over-optimising a proxy reward lets the proxy score rise while true quality falls. RL on checkable outcomes tends to reinforce long chains of thought, which you then pay for as output tokens.',
    ],
    prereq: ['foundations/training-pipeline'],
    quiz: [
      {
        q: 'A GRPO group of 4 answers has rewards 1, 0, 0, 0. With the sample standard deviation, what advantage does the correct answer get?',
        options: ['+1.0', '+1.5', '+0.25', '+0.75'],
        answer: 1,
        why: 'The mean is 0.25 and the sample standard deviation is 0.5, so (1 - 0.25) / 0.5 = +1.5. Each wrong answer gets -0.5.',
      },
      {
        q: 'Compared with RLHF using a reward model and PPO, what does DPO remove?',
        options: ['The reference model', 'The preference data', 'The separate reward model and the sampling loop', 'The KL term'],
        answer: 2,
        why: 'DPO trains directly on pairs of chosen and rejected answers against a frozen reference. It still needs preference data and the reference, but no reward model or on-policy sampling.',
      },
      {
        q: 'What does reinforcement learning with verifiable rewards use in place of a learned reward model?',
        options: [
          'A program that checks the answer, such as exact match on a maths result or a unit-test run',
          'A larger language model acting as judge',
          'Votes from users of the product',
          'The loss on the pretraining data',
        ],
        answer: 0,
        why: 'A checker gives a reward only when the answer is verifiably correct. It is harder to hack than a learned model, though a weak checker can still be gamed.',
      },
      {
        q: 'During RL against a learned reward model, the reward-model score keeps rising while true quality peaks and then falls. What is this called?',
        options: ['Catastrophic forgetting', 'Distillation', 'Gradient clipping', 'Over-optimisation, or reward hacking'],
        answer: 3,
        why: 'The proxy stops tracking what you care about once it is optimised hard. Held-out evaluations the training never saw are how you catch it.',
      },
    ],
  },
};
