import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "dl-c" batch. */
export const extrasW4DlC: Record<string, Extra> = {
  'deep-learning/state-space-models-and-mamba': {
    takeaways: [
      'Attention compute grows with the square of the length and its KV cache with the length; a state-space layer does constant work per token and keeps a fixed-size state.',
      'The linear recurrence can be regrouped and scanned in parallel, so training need not be sequential the way an LSTM is.',
      'Mamba makes the gate depend on the current token, so the state can keep a fact and skip filler, but the state is still a fixed budget.',
      'Pure state-space models are weaker at exact copying and in-context learning in several studies; hybrids add a few attention layers, and the evidence for them is promising but mostly from their authors.',
    ],
    prereq: ['deep-learning/modern-llm-architecture'],
    quiz: [
      { q: 'A model has 32 attention layers, each with 8 key-value heads of size 128, stored in 2-byte numbers. How many bytes of KV cache does each token add?', options: ['8,192', '32,768', '131,072', '524,288'], answer: 2, why: 'Per layer a token stores keys and values: 2 x 8 x 128 x 2 bytes = 4,096 bytes. Over 32 layers that is 131,072 bytes.' },
      { q: 'What does Mamba change about an ordinary linear state-space layer so that it can keep an important token and ignore filler?', options: ['Its step size and read and write vectors are computed from the current token', 'It stores every token in a cache', 'It uses a larger fixed gate for every token', 'It replaces the recurrence with attention'], answer: 0, why: 'Selection means the coefficients depend on the input. A fixed gate treats every token alike, so it forgets a key fact at the same rate as filler.' },
      { q: 'In the Jamba shape used in the lesson, 28 state-space layers hold 7 MiB of state at any length, and attention would cache 114,688 bytes per token in those same layers. About how many tokens before the state becomes the smaller of the two?', options: ['6 tokens', '640 tokens', '6,400 tokens', '64 tokens'], answer: 3, why: '7 MiB is 7,340,032 bytes, and 7,340,032 / 114,688 = 64. Below that the fixed state is larger than the cache it replaces.' },
      { q: 'Which task did several studies find pure Mamba-style models weaker at than attention?', options: ['Generating text in linear time', 'Copying or retrieving an exact detail from earlier in the context', 'Being trained in parallel across the sequence', 'Carrying state from one audio chunk to the next'], answer: 1, why: 'A fixed-size state must compress the past, so exact recall suffers. Copying and phone-book lookups showed it, which is why hybrids keep some attention layers.' },
    ],
  },
  'deep-learning/reinforcement-learning-from-scratch': {
    takeaways: [
      'RL learns from a score, not from answers: the return is the discounted sum of future rewards, a policy picks actions, and Q(s, a) is the expected return of an action.',
      'Q-learning moves each table entry a fraction alpha toward reward plus gamma times the best value in the next state. It bootstraps from its own estimates and it is off-policy.',
      'Exploration is required, because values only improve for what the agent tries, and it has a cost while learning: the cliff-walking agent falls off the edge it has learned to use.',
      'The agent maximises the reward you wrote, not the one you meant, and function approximation plus bootstrapping plus off-policy training can diverge, which is why deep RL needs replay, target networks or clipping.',
    ],
    prereq: ['start/three-ways-machines-learn'],
    quiz: [
      { q: 'A Q-table entry is 2, the agent gets a reward of 1, and the best value in the next state is 4. With alpha 0.5 and gamma 0.5, what is the entry after the update?', options: ['1.5', '2.5', '3', '4'], answer: 1, why: 'The target is 1 + 0.5 x 4 = 3. The entry moves half of the way from 2 to 3, which is 2.5.' },
      { q: 'With a discount of 0.9, about how much is a reward of 10 worth now if it arrives on the tenth step, so that nine further steps pass first?', options: ['10', '9', '3.9', '0.9'], answer: 2, why: 'Each step of delay multiplies by 0.9, and 0.9 to the power 9 is about 0.39, so the reward counts for about 3.9.' },
      { q: 'In the cliff-walking grid, the agent has learned the route along the edge but still falls in sometimes while training. Why?', options: ['Epsilon is above zero, so it still takes random moves, and next to the cliff one can be a fall', 'Q-learning cannot find the shortest route', 'The learning rate is too high for any learning to happen', 'The discount makes the cliff look like the goal'], answer: 0, why: 'Epsilon-greedy exploration takes a random move with probability epsilon. The route is optimal, but exploring beside a cliff is costly.' },
      { q: 'Which three ingredients together make reinforcement learning prone to instability and divergence, according to Sutton and Barto?', options: ['Rewards, policies and values', 'Neural networks, large batches and GPUs', 'Exploration, discounting and replay', 'Function approximation, bootstrapping and off-policy training'], answer: 3, why: 'This is the deadly triad. With only two of the three, instability can be avoided, which is part of why on-policy methods such as PPO are used.' },
    ],
  },
};
