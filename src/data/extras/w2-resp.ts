import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 2 "resp" batch. */
export const extrasW2Resp: Record<string, Extra> = {
  'responsible/fairness-for-builders': {
    takeaways: [
      'Compute every metric per group from a confusion table. One overall score hides gaps, and small or intersecting slices need an interval.',
      'Demographic parity, equal opportunity, equalised odds, predictive parity and calibration answer different questions. With different base rates they cannot all hold unless the predictor is perfect.',
      'Choose the metric from the decision and who bears the harm, then write the choice and the trade-off down in a model card.',
      'Reduce gaps in the data first. Training constraints and per-group thresholds work, each with a cost, and using a group attribute at decision time can be restricted by law.',
    ],
    prereq: ['responsible/when-examples-are-unfair', 'ml/is-the-difference-real'],
    quiz: [
      {
        q: 'With one common threshold, group A is approved 65% of the time and group B 27.5%, yet precision is about 77% in both. What follows?',
        options: [
          'The scores must be miscalibrated',
          'Predictive parity roughly holds, while demographic parity and equal opportunity do not',
          'Every fairness criterion holds, because precision is equal',
          'The data must contain an error',
        ],
        answer: 1,
        why: 'Equal precision is only one criterion. The groups have different base rates, so approval rates and true positive rates differ even though nothing is broken.',
      },
      {
        q: 'Why can you not equalise precision, true positive rate and false positive rate across groups when their base rates differ?',
        options: [
          'Because thresholds can only take a few values',
          'Because small groups are too noisy to measure',
          'Because false positive rate is tied to base rate, precision and true positive rate, so equal precision and true positive rate force unequal false positive rates',
          'Because the law forbids it',
        ],
        answer: 2,
        why: 'FPR = base/(1-base) x (1-PPV)/PPV x TPR. Hold PPV and TPR equal while the base rates differ and the FPRs must differ, unless the predictor is perfect.',
      },
      {
        q: 'The main harm of a lending model is that people who would have repaid are refused. Which group metric should you look at first?',
        options: [
          'The true positive rate per group (equal opportunity)',
          'Overall accuracy only',
          'The number of input features',
          'The size of the training set',
        ],
        answer: 0,
        why: 'Equal opportunity asks that people who would succeed have the same chance of approval in every group, which is exactly the harm described.',
      },
      {
        q: 'In a test of 2,000 cases, one slice has 20 cases and 70% accuracy. What is the right way to report it?',
        options: [
          'As a precise 70%',
          'Leave it out of the report without saying so',
          'As proof that the model is unfair to that slice',
          'With an interval (roughly 50% to 90%), noting that it is too small to conclude much',
        ],
        answer: 3,
        why: 'With 20 cases the standard error is about 10 points, so the plausible range is wide. Say so, and collect more data for that slice.',
      },
    ],
  },

  'responsible/privacy-engineering-for-ai': {
    takeaways: [
      'Models can memorise rare, repeated training text, and apps leak just as often through logs, caches, prompts and retrieval that ignores permissions.',
      'Handle personal data as a lifecycle: collect less, detect and redact, limit retention, check access at retrieval, and know every place to delete from.',
      'Differential privacy adds calibrated noise (Laplace scale 1/epsilon for a count) so one person barely changes the answer. Small epsilon means more privacy and more noise, and every answer spends budget.',
      'Federated learning keeps raw data on devices, but updates can leak. Deleting from a store is easy and making a trained model forget is not, so keep deletable facts out of the weights.',
    ],
    prereq: ['responsible/ai-and-your-private-life'],
    quiz: [
      {
        q: 'Which factor most increases the chance that a language model reproduces a training sequence word for word?',
        options: [
          'The sequence appearing many times in the training data',
          'Setting a lower temperature at inference time',
          'Writing the system prompt in capitals',
          'Using a shorter context window',
        ],
        answer: 0,
        why: 'Memorisation grows with duplication, model size and the length of the prompt. Deduplicating the training data reduces regurgitation.',
      },
      {
        q: 'You answer counting queries with the Laplace mechanism at epsilon 0.5 each and have a total budget of 2. How many answers can you give, and how large is the typical error?',
        options: [
          '2 answers, error about 0.5',
          '4 answers, error about 0.5',
          '4 answers, error about 2',
          '10 answers, error about 2',
        ],
        answer: 2,
        why: 'The noise scale is 1/epsilon = 2, which is also the expected error. Epsilons add up, so a budget of 2 pays for 2 / 0.5 = 4 answers.',
      },
      {
        q: 'What is the right statement about federated learning?',
        options: [
          'It guarantees that no private information can be recovered',
          'It keeps raw data on devices, but updates can leak unless combined with secure aggregation or noise',
          'It sends all raw data to the server to be averaged',
          'It makes the model immune to memorisation',
        ],
        answer: 1,
        why: 'Gradients and updates are computed from private data, and researchers have recovered images and text from shared gradients.',
      },
      {
        q: 'A customer may ask you to delete their data. Where is it best to keep facts about them that you may need to delete?',
        options: [
          'Fine-tuned into the model weights',
          'In the chat log only',
          'In the system prompt',
          'In a retrieval store, where deleting takes effect at once',
        ],
        answer: 3,
        why: 'Making a trained model forget is hard and usually means retraining. A retrieval store lets you delete the record and have the app stop using it immediately.',
      },
    ],
  },

  'responsible/teaching-a-model-to-behave': {
    takeaways: [
      'Alignment aims at helpful, honest and harmless behaviour, and the three goals trade off. Demonstrations, preference feedback (RLHF, DPO) and written principles shape it, with no guarantee.',
      'Optimising a stand-in for what we want finds loopholes: specification gaming, reward over-optimisation, sycophancy and goal misgeneralisation are documented. Each fix to a reward can open another loophole.',
      'Red teaming finds failures before users do. Run a small one for your app, keep the cases as regression tests, and follow coordinated disclosure.',
      'Do not treat model behaviour as a security boundary. Use permissions in code, checks you control, human confirmation and monitoring in layers.',
    ],
    prereq: ['foundations/training-pipeline'],
    quiz: [
      {
        q: 'A cleaning robot is rewarded for every step in which the camera sees no mess. It covers the camera. What is this called?',
        options: [
          'Distribution shift',
          'Specification gaming (reward hacking)',
          'Over-refusal',
          'Membership inference',
        ],
        answer: 1,
        why: 'It satisfies the literal reward without achieving the intended outcome of a clean room. That is the definition of specification gaming.',
      },
      {
        q: 'In the CoinRun experiments the coin always sat at the end of the level in training. When it was moved, the agent still ran to the end. This is:',
        options: [
          'Sycophancy',
          'Prompt injection',
          'Data poisoning',
          'Goal misgeneralisation',
        ],
        answer: 3,
        why: 'The agent competently pursued a goal ("go right") that matched the intended one in training but not in the new situation.',
      },
      {
        q: 'What do dangerous-capability evaluations in the public safety frameworks mainly give you?',
        options: [
          'A floor: failing a test with today\'s prompting and tools does not rule out higher capability with better elicitation',
          'A guarantee that the model cannot be misused',
          'A measure of everyday chat quality',
          'Proof that the model refuses every harmful request',
        ],
        answer: 0,
        why: 'OpenAI\'s framework, for example, treats any one-time elicitation as a lower bound on capability, not a ceiling.',
      },
      {
        q: 'Which measure best limits the damage if a model is talked into a harmful action by someone using your app?',
        options: [
          'A longer system prompt asking it to refuse',
          'Setting the temperature to 0',
          'Permissions enforced in code, least-privilege tools, and confirmation of consequential actions',
          'Relying on the vendor\'s safety training alone',
        ],
        answer: 2,
        why: 'Safety training is probabilistic and has been shown to fail under pressure. Controls in your own code hold even when the model is fooled.',
      },
    ],
  },
};
