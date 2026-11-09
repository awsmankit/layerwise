import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'pretraining-sft-preference-rlhf-dpo': {
    short:
      "A base model is made by pretraining: predicting the next token on a huge, broad pile of text, which is where almost all its knowledge comes from. Instruction tuning (supervised fine-tuning, or SFT) then teaches it to follow instructions from example prompts and ideal replies, and preference tuning pushes it toward the replies people like better. RLHF trains a separate reward model and optimises against it with reinforcement learning, while DPO skips the reward model and learns straight from the preference pairs, which is simpler and steadier. For an open model in a product I would start with prompting or retrieval, then SFT with LoRA, and add DPO only when I have clear preference data.",
    explain: [
      {
        heading: "The three stages in plain words",
        body: "Pretraining gives the model knowledge and general skill, but a base model only continues text: ask it a question and it may write more questions. Instruction tuning (SFT) trains it on prompt and ideal-response pairs, usually counting the loss only on the response tokens. This teaches format, tone and following instructions, and adds little new knowledge. Preference tuning uses pairs of replies to the same prompt, one marked chosen and one rejected. Pairs are cheaper to collect than perfect demonstrations, because judging is easier than writing.",
      },
      {
        heading: "RLHF with PPO against DPO",
        body: "RLHF first trains a reward model, a network that scores a reply the way people would. Then reinforcement learning, commonly an algorithm called PPO, adjusts the model to raise that score, with a KL penalty (a measure of how far the model has drifted) that keeps it close to the SFT model it started from. PPO keeps several models in play at once: the policy being trained, a frozen reference, the reward model and a value model. DPO removes the reward model and the sampling. It trains directly on the pairs with a loss that rewards raising the chosen reply relative to a frozen reference model. A setting called beta plays the role of the KL strength.",
      },
      {
        heading: "The trade-offs",
        body: "DPO is simpler and more stable, but it learns offline from fixed pairs and cannot explore. On-policy reinforcement learning can explore, and works well with verifiable rewards such as unit tests for code or a checker for maths, but it can hack a learned reward model: the policy finds replies that score high without being better, such as longer or more flattering ones. Either way, tuning can have side effects, so you must test general ability, safety and over-refusal (refusing harmless requests), not only the target task.",
      },
      {
        heading: "What I would do for a product",
        body: "Order the work by cost. Try prompting and retrieval first. If that stalls, do SFT on good demonstrations, often with LoRA, which trains a small adapter instead of every weight. Add DPO only when you have clear preference signals, such as accepted and edited replies. Judge each step on your own task metrics plus a regression set for general capability and safety.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "1. Pretraining", detail: "Predict the next token on a very large, broad corpus. Gives knowledge and skill. The result continues text but does not follow instructions." },
        { label: "2. Instruction tuning (SFT)", detail: "Train on prompt and ideal-response pairs, with loss on the response. Teaches format, tone and following instructions." },
        { label: "3. Collect preferences", detail: "For one prompt, mark one reply as chosen and another as rejected, by people or by a rubric." },
        { label: "4a. RLHF with PPO", detail: "Train a reward model on the pairs, then raise its score with reinforcement learning while a KL penalty keeps the model near the SFT model." },
        { label: "4b. or DPO", detail: "Train directly on the pairs against a frozen reference model. No reward model, no sampling while training." },
        { label: "5. Evaluate side effects", detail: "Check the task, general ability, safety and over-refusal before shipping." },
      ],
      caption: "Each stage starts from the model the previous stage produced. Step 4 is a choice between two ways to use the same preference pairs.",
    },
    example: {
      title: "Example: one DPO training pair, and why DPO needs fewer models",
      text: "DPO scores a reply by how much more likely the model has made it than the frozen reference model did. Example numbers: after some training, the log-probability of the chosen reply rose by 2.0 against the reference, and that of the rejected reply fell by 1.0. With beta = 0.1, the margin is 0.1 x (2.0 - (-1.0)) = 0.3 and the loss is -ln(sigmoid(0.3)) = 0.554. The loss falls as the margin grows. For memory, assume every model is 7 billion parameters at 16 bits (14 GB each) and ignore optimiser state and activations; some setups use smaller reward and value models.",
      rows: [
        { label: "Margin 0 (nothing learned yet)", value: "loss 0.693" },
        { label: "Margin 0.3 (the example pair)", value: "loss 0.554" },
        { label: "Margin 1.0", value: "loss 0.313" },
        { label: "RLHF with PPO: policy, reference, reward, value", value: "4 x 14 GB = 56 GB of weights" },
        { label: "DPO: policy and reference", value: "2 x 14 GB = 28 GB of weights" },
      ],
    },
    followUps: [
      {
        q: "What is reward hacking, and how would you notice it?",
        a: "The model finds replies that score high on the reward model without being better, for example longer ones or flattering ones. You notice reward rising while human or held-out ratings stay flat or fall, replies drifting longer, and problems in manual review. You limit it with the KL penalty, refreshing the reward model and length-controlled evaluation.",
      },
      {
        q: "Your DPO run improves win rate but the model now refuses more harmless requests. Why?",
        a: "If safe refusals were often the chosen reply in the pairs, the model learns to over-refuse. DPO can also overshoot when beta is small or training runs too long. Rebalance the pairs, add borderline but acceptable requests as chosen, tune beta and steps, and track over-refusal with its own eval set.",
      },
      {
        q: "Why not skip SFT and go straight to preference tuning?",
        a: "Preference tuning nudges between replies the model can already produce, and DPO’s reference model must already give sensible answers. SFT first puts a base model into that shape, so preference tuning starts from a model that follows instructions.",
      },
    ],
    mistakes: [
      "Saying instruction tuning or RLHF adds most of the model’s knowledge. It comes from pretraining; later stages mostly change behaviour.",
      "Describing DPO as needing a reward model, or RLHF as having no reference model or KL term. It is the other way round.",
      "Planning preference tuning with no check on side effects. Test general ability, safety and over-refusal as well as the target task.",
    ],
  },
};
