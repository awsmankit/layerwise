import type { Question } from './types';

/** Model and ML fundamentals: classical ML, transformers, training and adaptation, multimodal. */
export const questionsFoundations: Question[] = [
  // ---------------------------------------------------------------- classical ML
  {
    id: 'fraud-model-accuracy-trap',
    prompt:
      "A colleague trained a fraud classifier on card transactions where 0.5% are fraudulent. They report 99.5% accuracy on the test set and want to ship it. What do you ask, and how would you evaluate this model properly?",
    roles: ['ml-eng', 'ai-eng'],
    level: 'junior',
    kind: 'concept',
    topics: ['classical ml', 'evals', 'imbalanced data'],
    minutes: 10,
    strong: [
      "Notices that predicting 'not fraud' for every transaction already scores 99.5% accuracy, so the reported number may mean the model catches nothing; always compare against the majority-class baseline.",
      "Asks for the confusion matrix and reports precision (of flagged transactions, how many are fraud) and recall (of all fraud, how much is caught) for the positive class.",
      "Prefers threshold-free metrics that respect imbalance, such as PR-AUC (average precision), and knows a random model's PR-AUC is about the positive rate (0.005), whereas a random model's ROC-AUC is 0.5, so ROC-AUC can look flattering when negatives dominate.",
      "Treats the decision threshold as a business choice: picks it from the costs of a missed fraud versus a false alarm, or from a review-capacity limit (for example 'the team can review 2,000 alerts a day'), not the default 0.5.",
      "Checks the split: fraud patterns drift, so test on a later time period than training, and keep the same card or customer from appearing on both sides.",
      "Looks for leakage, such as features that are only known after a chargeback or investigation (for example a 'disputed' flag).",
      "Mentions that if the scores are used as probabilities (for cost-based thresholds or downstream rules), calibration has to be checked, especially after resampling or class weighting.",
    ],
    followUps: [
      {
        q: "A missed fraud costs on average 500 and a false alarm costs 5 in analyst time. With calibrated probabilities, what threshold minimises expected cost?",
        lookFor:
          "Flag when p x 500 > (1 - p) x 5, so threshold p* = 5 / (5 + 500) = 5/505, about 0.0099 (roughly 1%). Notes this only works if the scores are calibrated, and that review capacity may force a higher threshold.",
      },
      {
        q: "They undersampled the negatives 1:1 during training. What happens to the predicted probabilities and how do you fix it?",
        lookFor:
          "Undersampling raises the prior the model sees, so predicted probabilities are inflated relative to the true 0.5% rate. Fix by recalibrating on a held-out set with the real class balance (Platt scaling or isotonic regression) or applying the prior-correction formula; check with a reliability diagram or Brier score.",
      },
      {
        q: "Precision at your chosen threshold was 40% last quarter and is 25% this quarter, with no model change. What could be going on?",
        lookFor:
          "Precision depends on prevalence, so a drop in the fraud rate alone lowers precision at fixed recall; also feature or concept drift (new fraud patterns), label delay (chargebacks not yet arrived), upstream data changes. Compare recall on labelled data, monitor score distributions, and segment by channel or region.",
      },
    ],
    redFlags: [
      "Accepts 99.5% accuracy as evidence the model works.",
      "Fixes the threshold at 0.5 without reference to costs or review capacity.",
      "Uses a random row-level split on time-ordered transactions.",
      "Recommends oversampling or SMOTE as the answer without mentioning that it changes nothing about how the model should be evaluated.",
    ],
    lessons: ['foundations/classical-ml-essentials', 'evals/evals-101'],
  },
  {
    id: 'code-precision-recall-f1',
    prompt:
      "Write a function in Python, without scikit-learn, that takes true labels and predicted scores for a binary classifier plus a threshold, and returns precision, recall and F1. Then explain how you would extend it to find the threshold that maximises F1.",
    roles: ['ml-eng', 'ai-eng'],
    level: 'junior',
    kind: 'coding',
    topics: ['classical ml', 'evals', 'coding'],
    minutes: 20,
    strong: [
      "Converts scores to predictions with a clearly stated rule (score >= threshold is positive) and counts TP, FP and FN in a single O(n) pass.",
      "Uses precision = TP / (TP + FP), recall = TP / (TP + FN), F1 = 2PR / (P + R), the harmonic mean of the two.",
      "Handles zero divisions explicitly: no predicted positives makes precision undefined, no actual positives makes recall undefined; returns 0 or NaN and documents the choice.",
      "Validates inputs: equal lengths, labels that are 0/1 or booleans, empty input.",
      "Checks the answer on a hand-worked case, for example TP = 40, FP = 10, FN = 60 gives precision 0.8, recall 0.4 and F1 = 0.64 / 1.2, about 0.533.",
      "For the best-F1 threshold, sorts by score once (O(n log n)) and sweeps thresholds while updating TP and FP cumulatively, rather than recomputing from scratch for every candidate (O(n^2)); handles tied scores by moving them together.",
      "Notes that the best-F1 threshold should be chosen on a validation set, not the test set.",
    ],
    followUps: [
      {
        q: "How do macro and micro averaged F1 differ for a multi-class problem with one rare class?",
        lookFor:
          "Micro pools TP, FP and FN over all classes, so it is dominated by frequent classes (and equals accuracy for single-label multi-class). Macro averages per-class F1 equally, so a rare class that is poorly handled pulls it down. Choose by whether every class matters equally.",
      },
      {
        q: "When would you use F-beta instead of F1, and what does beta mean?",
        lookFor:
          "F-beta weights recall beta times as important as precision: F2 favours recall (screening, safety), F0.5 favours precision (costly false alarms). Better still, choose the threshold from actual costs when they are known.",
      },
    ],
    redFlags: [
      "Divides by zero or silently returns a misleading 1.0 when there are no predicted positives.",
      "Computes F1 as the arithmetic mean of precision and recall.",
      "Tunes the threshold on the test set.",
    ],
    lessons: ['foundations/classical-ml-essentials', 'evals/evals-101'],
  },
  {
    id: 'bias-variance-and-regularisation',
    prompt:
      "Your model has 2% error on the training set and 15% on the validation set. A second model has 14% on training and 15% on validation. What is going on in each case, and what would you try next?",
    roles: ['ml-eng'],
    level: 'junior',
    kind: 'concept',
    topics: ['classical ml', 'training'],
    minutes: 10,
    strong: [
      "First model: large gap between training and validation error means high variance (overfitting); it has memorised the training set.",
      "Second model: training error is already high and close to validation error, so it is high bias (underfitting); more regularisation would make it worse.",
      "For overfitting: more or more varied data, data augmentation, L2 regularisation (weight decay), L1 for sparsity, dropout, early stopping on validation loss, a smaller model or fewer features.",
      "For underfitting: a more expressive model, better features, less regularisation, training longer or with a better learning rate.",
      "Compares against a reference such as human error or a simple baseline: if the best achievable error is 13%, the second model is closer to fine than it looks.",
      "Uses learning curves (error against training-set size) to tell whether more data would help.",
      "Tunes the regularisation strength on the validation set and keeps the test set untouched until the end.",
    ],
    followUps: [
      {
        q: "Explain how L2 and L1 regularisation change the weights, in a sentence each.",
        lookFor:
          "L2 adds lambda times the sum of squared weights to the loss, shrinking all weights smoothly towards zero; L1 adds lambda times the sum of absolute weights, which drives some weights exactly to zero, giving feature selection.",
      },
      {
        q: "Large neural networks often have near-zero training error yet generalise well. Does that contradict the bias-variance picture?",
        lookFor:
          "Mentions that very over-parameterised models can show double descent, and that implicit regularisation (SGD, early stopping, weight decay, data scale) matters; the practical rule still holds: judge by validation error and the train-validation gap, not by parameter count.",
      },
    ],
    redFlags: [
      "Calls the second model overfit, or proposes more regularisation for it.",
      "Tunes hyperparameters against the test set.",
      "Believes more data always fixes both problems.",
    ],
    lessons: ['foundations/classical-ml-essentials', 'foundations/how-models-learn'],
  },
  {
    id: 'leakage-offline-great-production-poor',
    prompt:
      "A model that detects a user's listening environment from short audio clips scored 97% accuracy offline, but in a field trial it is closer to 75%. The data was split randomly at the clip level. Walk me through how you would find out why.",
    roles: ['ml-eng'],
    level: 'mid',
    kind: 'debugging',
    topics: ['classical ml', 'evals', 'data'],
    minutes: 20,
    strong: [
      "Suspects group leakage first: clips cut from the same recording, speaker, device or session land in both train and test, so the model learns the recording rather than the environment. Re-splits by recording or speaker (group k-fold) and re-measures.",
      "Checks for near-duplicates across splits (overlapping windows, augmented copies of the same clip created before the split).",
      "Checks preprocessing fitted on all data before splitting (normalisation statistics, feature selection, target encoding) and moves it inside the training fold or pipeline.",
      "Looks for features or metadata that encode the label (file path, recording date, gain setting that differs per collection campaign) using feature importance or by removing them and watching the score fall.",
      "Compares the offline and field input distributions: microphones, firmware, sample rate, noise levels, class mix in the field differing from the lab dataset.",
      "Checks train-serve skew: the on-device feature extraction may differ from the offline code (windowing, resampling, fixed-point arithmetic). Feeds the same raw clip through both paths and compares features.",
      "Builds a test set that mirrors deployment (new speakers, new devices, later dates) and reports per-slice metrics, so the gap is caught before the next trial.",
    ],
    followUps: [
      {
        q: "After a group split the offline score drops to 82%. Field is still 75%. What next?",
        lookFor:
          "The remaining gap is distribution shift or skew, not leakage: slice by environment class and device, label a sample of field clips, check class priors, compare feature statistics, consider collecting or augmenting field-like data and re-checking calibration of confidence thresholds.",
      },
      {
        q: "How do you prevent this class of problem in the team's process, not just this model?",
        lookFor:
          "Split rules written down per dataset (group and time keys), dedup checks in the data pipeline, preprocessing inside the pipeline object, a frozen deployment-like test set, a shared feature implementation for training and serving, and an eval that runs in CI.",
      },
    ],
    redFlags: [
      "Jumps to a bigger model or more training before checking the split.",
      "Treats the field result as noise without looking at data.",
      "Fits scalers or feature selection on the full dataset 'because it is only preprocessing'.",
    ],
    lessons: ['foundations/classical-ml-essentials', 'evals/evals-101'],
  },
  // ---------------------------------------------------------------- deep learning and transformers
  {
    id: 'how-a-neural-network-trains',
    prompt:
      "Explain how a neural network learns, from a batch of data to updated weights. Use a language model predicting the next token as your example.",
    roles: ['ml-eng', 'ai-eng'],
    level: 'junior',
    kind: 'concept',
    topics: ['training', 'deep learning'],
    minutes: 10,
    strong: [
      "Forward pass: a batch of token sequences goes through the network, which outputs a probability distribution over the vocabulary at every position.",
      "Loss: cross-entropy, the negative log of the probability the model gave to the actual next token, averaged over positions; a single number that says how wrong the model is.",
      "Backpropagation applies the chain rule backwards through the layers to get the gradient of the loss with respect to every weight.",
      "Gradient descent update: w <- w - learning_rate x gradient; in practice an optimiser like Adam or AdamW keeps running averages of gradients and squared gradients per weight.",
      "Mini-batches: gradients are estimated on a batch, not the whole dataset; many steps make an epoch; for LLMs pretraining is often less than one pass over the data.",
      "Learning rate matters: too high diverges or produces NaNs, too low is slow; schedules with warm-up and decay are standard.",
      "Monitors training and validation loss to see whether it is learning and whether it generalises.",
    ],
    followUps: [
      {
        q: "Roughly how much more compute is a training step than a forward pass, and why?",
        lookFor:
          "About three times: the backward pass costs roughly twice the forward pass (gradients with respect to both activations and weights). This gives the common estimate of about 6 x parameters x tokens FLOPs for training versus about 2 x parameters per token for inference.",
      },
      {
        q: "The loss suddenly becomes NaN after 10,000 steps. What do you check?",
        lookFor:
          "Learning rate too high or warm-up missing, exploding gradients (check gradient norm, add clipping), fp16 overflow (loss scaling or switch to bf16), bad data such as empty or extreme examples, log of zero or division by zero in a custom loss; resume from the last good checkpoint with lower LR.",
      },
    ],
    redFlags: [
      "Describes backprop as the model 'searching' or 'storing' examples.",
      "Confuses the loss with the accuracy metric, or thinks the model is updated during normal inference.",
      "Cannot say which direction the update moves the weights.",
    ],
    lessons: ['foundations/how-models-learn', 'foundations/training-pipeline'],
  },
  {
    id: 'code-causal-attention-numpy',
    prompt:
      "In NumPy, implement scaled dot-product self-attention with an optional causal mask. Inputs Q, K and V have shape (batch, heads, seq_len, head_dim). Return the output and the attention weights. Explain the shapes as you go.",
    roles: ['ml-eng', 'ai-eng'],
    level: 'mid',
    kind: 'coding',
    topics: ['transformers', 'attention', 'coding'],
    minutes: 25,
    strong: [
      "Scores = Q @ K transposed on the last two axes (swapaxes(-1, -2)), giving shape (batch, heads, seq_len, seq_len), divided by sqrt(head_dim).",
      "Causal mask: position i may attend only to positions j <= i; builds an upper-triangular boolean mask (j > i) with np.triu(..., k=1) and sets those scores to -inf or a large negative number before the softmax.",
      "Numerically stable softmax over the last axis: subtract the row maximum before exponentiating, then divide by the row sum.",
      "Output = weights @ V, shape (batch, heads, seq_len, head_dim); relies on broadcasting rather than Python loops over batch and heads.",
      "Tests itself: every row of weights sums to 1, with the causal mask the first position's output equals V at position 0, and the upper triangle of the weights is zero.",
      "States the cost: O(seq_len^2 x head_dim) time and O(seq_len^2) memory per head for the score matrix, which is what limits long contexts.",
      "Handles query and key lengths that differ (for example decoding with a KV cache): query i sits at absolute position (Tk - Tq + i), so the mask offset must account for that.",
    ],
    followUps: [
      {
        q: "Where do Q, K and V come from, and how do multiple heads fit in?",
        lookFor:
          "Each is a learned linear projection of the same input hidden states (x W_q, x W_k, x W_v) in self-attention; in cross-attention Q comes from the decoder and K, V from the encoder. d_model is split into heads (head_dim = d_model / heads), each head attends separately, outputs are concatenated and projected by W_o. Grouped-query attention shares K and V heads across several query heads to shrink the KV cache.",
      },
      {
        q: "Why divide by sqrt(head_dim) rather than head_dim or nothing?",
        lookFor:
          "If the components of q and k are roughly independent with mean 0 and variance 1, their dot product has variance head_dim, so its standard deviation is sqrt(head_dim). Dividing by sqrt(head_dim) brings the logits back to unit scale; without it the softmax saturates towards one-hot and gradients vanish. Dividing by head_dim would over-shrink and flatten the attention.",
      },
      {
        q: "Your output has NaNs for some rows when you add a padding mask as well. Why, and how would you avoid materialising the full seq_len x seq_len matrix at all?",
        lookFor:
          "A row where every key is masked with -inf gives exp(-inf) sums of 0 and 0/0 = NaN; use a large finite negative value or handle fully masked rows explicitly. Tiled attention (FlashAttention-style) processes K and V in blocks with an online softmax (running max and running sum), so memory is linear in sequence length and the result is exact.",
      },
    ],
    redFlags: [
      "Applies the mask after the softmax without renormalising, so rows no longer sum to 1.",
      "Masks the lower triangle, letting tokens see the future.",
      "Scales by head_dim or by d_model instead of sqrt(head_dim).",
      "Loops over batch and heads in Python and cannot vectorise it.",
    ],
    lessons: ['foundations/inside-a-transformer', 'foundations/attention-intuition'],
  },
  {
    id: 'encoder-vs-decoder-and-positions',
    prompt:
      "Compare encoder-only, decoder-only and encoder-decoder transformers: how they are trained and what each is good for. Then explain how a transformer knows the order of tokens, including what RoPE does at a conceptual level.",
    roles: ['ml-eng', 'ai-eng'],
    level: 'mid',
    kind: 'concept',
    topics: ['transformers', 'attention'],
    minutes: 12,
    strong: [
      "Encoder-only (BERT-style): bidirectional attention, every token sees the whole input; trained with masked language modelling; used for classification, tagging, embeddings and rerankers, not free-form generation.",
      "Decoder-only (GPT-style): causal mask, trained on next-token prediction; generates text token by token and uses a KV cache at inference; with prompting one model covers many tasks.",
      "Encoder-decoder (original Transformer, T5-style): encoder reads the input bidirectionally, decoder generates with causal self-attention plus cross-attention to the encoder outputs; natural for translation and summarisation.",
      "Why decoder-only dominates general LLMs: the objective gives a training signal at every position, scales simply, and a single model handles many tasks through prompting.",
      "Self-attention on its own ignores order (permuting the input permutes the output the same way), so position information must be added.",
      "Absolute schemes add a sinusoidal or learned position vector to the token embedding; learned absolute positions cannot go beyond the trained maximum length.",
      "RoPE rotates pairs of dimensions in each query and key vector by an angle proportional to the token's position, with a different frequency per pair; the q.k dot product then depends on the relative offset between the two positions. It is applied to Q and K, not to V.",
      "Extending context beyond the training length usually needs RoPE scaling (such as position interpolation) plus some fine-tuning on long sequences; it is not free.",
    ],
    followUps: [
      {
        q: "You need sentence embeddings for semantic search. Would you use an encoder or a decoder model, and why?",
        lookFor:
          "Encoder models trained contrastively are the traditional choice: bidirectional context, small and cheap per query. Decoder LLMs can also be fine-tuned into strong embedding models, at higher cost. The deciding factor is retrieval quality on your own data, latency and cost, measured with recall@k on a labelled set.",
      },
      {
        q: "Why does RoPE give relative position when it is applied per token, using absolute positions?",
        lookFor:
          "Rotating q at position m by angle m x theta and k at position n by n x theta means their dot product sees only the angle difference (m - n) x theta, because the rotations compose. So attention scores depend on relative distance while each token is encoded independently, which also suits KV caching.",
      },
    ],
    redFlags: [
      "Thinks encoder-only models can generate long text the same way as decoder models.",
      "Believes attention inherently knows word order.",
      "Assumes a model can be used at any context length beyond what it was trained on with no quality loss.",
    ],
    lessons: ['foundations/inside-a-transformer', 'foundations/attention-intuition'],
  },
  {
    id: 'code-temperature-top-k-top-p',
    prompt:
      "Implement a function that takes a vector of next-token logits and returns a sampled token id, supporting temperature, top-k and top-p (nucleus) sampling. Explain the order you apply them in and the edge cases.",
    roles: ['ai-eng', 'ml-eng'],
    level: 'mid',
    kind: 'coding',
    topics: ['inference', 'sampling', 'coding'],
    minutes: 20,
    strong: [
      "Temperature divides the logits before the softmax: below 1 sharpens the distribution, above 1 flattens it; temperature 0 is treated as a special case meaning argmax (greedy), avoiding division by zero.",
      "Softmax with the maximum logit subtracted first for numerical stability.",
      "Top-k keeps the k highest-probability tokens (np.argpartition is O(V); a full sort is O(V log V)) and sets the rest to zero probability.",
      "Top-p sorts probabilities in descending order, takes the cumulative sum, and keeps the smallest prefix whose cumulative probability reaches p, always keeping at least the top token, then renormalises.",
      "Worked check: probabilities [0.5, 0.3, 0.15, 0.05] with p = 0.9 keep the first three (cumulative 0.5, 0.8, 0.95), renormalised to about [0.526, 0.316, 0.158].",
      "States an explicit order (commonly temperature, then top-k, then top-p) and knows temperature changes which tokens survive top-p, while it does not change which tokens are in the top-k.",
      "Samples with a seeded random generator passed in, so tests are deterministic; checks k larger than the vocabulary, p = 1 (no filtering) and ties.",
    ],
    followUps: [
      {
        q: "Why use top-p rather than a fixed top-k?",
        lookFor:
          "Top-p adapts to the shape of the distribution: when the model is confident it keeps very few tokens, when it is uncertain it keeps many. A fixed k is too permissive for peaked distributions and too strict for flat ones.",
      },
      {
        q: "A team sets temperature 0 for a JSON extraction task and still sees different outputs across runs. Is that possible?",
        lookFor:
          "Yes: greedy decoding can still vary because of non-deterministic GPU kernels, batching with other requests changing numerical results, ties, or provider-side changes. Use structured output or constrained decoding and validation rather than relying on bit-exact determinism.",
      },
    ],
    redFlags: [
      "Applies softmax and then divides probabilities by the temperature.",
      "Implements top-p so that it can return an empty set.",
      "Believes higher temperature makes the model more knowledgeable or more accurate.",
    ],
    lessons: ['foundations/inside-a-transformer', 'llm/prompting-and-structured-output'],
  },
  {
    id: 'mixture-of-experts-tradeoffs',
    prompt:
      "Explain how a mixture-of-experts transformer works and what it changes for training and serving compared with a dense model. As a concrete case: a model has 2B shared parameters (attention, embeddings) and 8 experts per MoE layer that together hold 40B parameters, with top-2 routing.",
    roles: ['ml-eng', 'ml-platform', 'ai-eng'],
    level: 'senior',
    kind: 'concept',
    topics: ['transformers', 'moe', 'inference'],
    minutes: 15,
    strong: [
      "The feed-forward block in some or all layers is replaced by several expert FFNs plus a small learned router that scores experts per token and sends each token to its top-k (here 2).",
      "Arithmetic: each expert holds 40B / 8 = 5B parameters across layers, so active parameters per token = 2B + 2 x 5B = 12B, while total parameters = 42B.",
      "Compute per token follows the active parameters (about 2 x 12B = 24 GFLOPs forward), so it costs roughly like a 12B dense model, while capacity is that of a larger model.",
      "Memory follows the total: all 42B parameters must be loaded, about 84 GB in BF16 before KV cache, so it needs the memory of a 42B model.",
      "Training needs a load-balancing auxiliary loss (or equivalent) so the router does not collapse onto a few experts; capacity limits per expert may drop or reroute overflow tokens.",
      "At scale experts are spread across GPUs (expert parallelism), which adds all-to-all communication of tokens in every MoE layer; interconnect bandwidth matters.",
      "Serving: at batch size 1 only the chosen experts' weights are read, but at larger batches tokens hit most experts, so memory traffic approaches the full model; the speed advantage over a dense model of equal total size is clearest when compute-bound.",
    ],
    followUps: [
      {
        q: "Would you choose this MoE or a 12B dense model for an on-premise deployment on a single 48 GB GPU?",
        lookFor:
          "The MoE does not fit in BF16 (about 84 GB); it would need about 4-bit quantisation (around 21 GB for weights plus overhead) or offloading, with a quality check. The 12B dense model fits in BF16 (about 24 GB) with room for KV cache. Decide on measured quality per task versus memory and latency, not parameter counts.",
      },
      {
        q: "Do experts specialise in topics like 'law' or 'biology'?",
        lookFor:
          "Mostly not in a human-readable way; routing studies tend to find specialisation by token type, syntax or position more than by domain. This matters if someone proposes pruning experts for a domain: measure quality after pruning instead of assuming.",
      },
      {
        q: "Fine-tuning the MoE becomes unstable. What is specific to MoE here?",
        lookFor:
          "Router instability and load imbalance (keep or tune the auxiliary loss, consider freezing the router), small fine-tuning datasets activating few experts, capacity overflow dropping tokens, and higher sensitivity to learning rate; monitor per-expert token counts.",
      },
    ],
    redFlags: [
      "Thinks an MoE needs only the active parameters in memory.",
      "Says MoE is always faster than a dense model with the same total parameters regardless of batch size.",
      "Ignores load balancing or the communication cost of expert parallelism.",
    ],
    lessons: ['foundations/inside-a-transformer', 'infra/multi-gpu-parallelism-and-interconnect', 'serving/inference-optimisation'],
    game: { label: 'Fit the model', href: '/play/fit-the-model/' },
  },
  // ---------------------------------------------------------------- training and adaptation
  {
    id: 'tokenization-effects',
    prompt:
      "What is a tokenizer, and what practical effects does tokenization have on cost, quality and behaviour of an LLM-based product? Give concrete examples.",
    roles: ['ai-eng', 'ml-eng'],
    level: 'junior',
    kind: 'concept',
    topics: ['tokenization', 'cost'],
    minutes: 8,
    strong: [
      "A tokenizer splits text into sub-word pieces from a fixed vocabulary (for example built with byte-pair encoding) and maps each to an integer id; the model only ever sees those ids.",
      "Prices, context limits and latency are counted in tokens, not words or characters; English prose averages roughly four characters per token for common tokenizers, but this is only a rule of thumb.",
      "Many non-English languages and scripts need more tokens for the same meaning, so they cost more, fill the context faster and can get lower quality.",
      "Numbers, code, URLs and rare names may be split into odd pieces, which helps explain weak character-level tasks (counting letters, reversing strings) and some arithmetic errors.",
      "Small text changes (leading spaces, capitalisation, unusual whitespace) change the token ids and can change outputs.",
      "The tokenizer is tied to the model: you cannot swap it, and token counts from one model's tokenizer do not transfer to another; measure with the right tokenizer.",
    ],
    followUps: [
      {
        q: "What is the trade-off in choosing a larger vocabulary? Put a number on the embedding cost for a 128,000-token vocabulary with hidden size 4,096.",
        lookFor:
          "Larger vocabulary means shorter sequences (cheaper attention, more text per context) but larger embedding and output matrices: 128,000 x 4,096 = 524,288,000, about 524M parameters per matrix (doubled if input and output embeddings are not tied), and more rare tokens that are under-trained.",
      },
      {
        q: "You add 50 domain-specific tokens to a model's tokenizer before fine-tuning. What must you do and what can go wrong?",
        lookFor:
          "Resize the embedding and output layers, initialise new rows sensibly (for example the mean of existing embeddings or of the sub-tokens they replace), train them (they are untrained otherwise, and with LoRA must be explicitly made trainable), and check the serving stack uses the same tokenizer files.",
      },
    ],
    redFlags: [
      "Equates tokens with words when estimating cost.",
      "Assumes all languages cost the same per sentence.",
      "Believes a model reads raw characters.",
    ],
    lessons: ['foundations/tokens-and-embeddings', 'cost/where-the-tokens-go'],
  },
  {
    id: 'lora-trainable-params-and-memory',
    prompt:
      "A decoder model has about 6.7B parameters, 32 layers and hidden size 4,096; each layer's attention projections q, k, v and o are 4,096 x 4,096. You apply LoRA with rank 16 to all four projections in every layer. How many trainable parameters is that, and roughly how much GPU memory do you need compared with full fine-tuning using Adam in mixed precision? Then explain QLoRA. State your assumptions.",
    roles: ['ml-eng', 'ai-eng', 'ml-platform'],
    level: 'mid',
    kind: 'estimation',
    topics: ['fine-tuning', 'lora', 'gpu'],
    minutes: 15,
    strong: [
      "LoRA keeps W frozen and learns W + BA with B of shape (d_out x r) and A of shape (r x d_in), so one adapted matrix adds r x (d_in + d_out) = 16 x (4,096 + 4,096) = 131,072 parameters.",
      "Per layer: 4 x 131,072 = 524,288; across 32 layers: 524,288 x 32 = 16,777,216, about 16.8M trainable parameters, roughly 0.25% of 6.7B.",
      "Full fine-tuning with Adam in mixed precision, assuming 16 bytes per parameter (2 BF16 weights + 2 BF16 gradients + 4 FP32 master weights + 4 + 4 for Adam's two moments): 6.7B x 16 = about 107 GB before activations, so multiple GPUs or sharding (ZeRO/FSDP).",
      "LoRA: frozen base in BF16 is 6.7B x 2 bytes = about 13.4 GB; the adapter at 16 bytes per parameter is 16,777,216 x 16 = about 268 MB; no gradients or optimiser state for the base.",
      "QLoRA: base stored in 4-bit (NF4) at about 0.5 bytes per parameter, so about 3.4 GB plus a small overhead for per-block scales; it is dequantised on the fly for the forward and backward pass while the adapters train in BF16.",
      "Activations are extra in all cases and grow with batch size and sequence length; backpropagation still passes through the frozen base, so gradient checkpointing is often needed.",
      "After training the adapter can be merged into W (no inference overhead) or kept separate and swapped per task or customer.",
    ],
    followUps: [
      {
        q: "The model actually uses grouped-query attention with 8 KV heads of dimension 128, so k and v project 4,096 to 1,024. Recompute.",
        lookFor:
          "q and o: 16 x (4,096 + 4,096) = 131,072 each; k and v: 16 x (4,096 + 1,024) = 81,920 each. Per layer 2 x 131,072 + 2 x 81,920 = 425,984; times 32 = 13,631,488, about 13.6M.",
      },
      {
        q: "Should you also apply LoRA to the MLP layers, and how do you pick the rank?",
        lookFor:
          "Adapting all linear layers (attention and MLP) often gives better quality for the same rank, at more parameters; rank and alpha are hyperparameters chosen by validation, with higher ranks only helping when the task needs it. Learning rate usually matters more than rank.",
      },
      {
        q: "After fine-tuning on support tickets the model got worse at general instructions. What happened and what do you do?",
        lookFor:
          "Catastrophic forgetting or narrowing: mix in general instruction data, lower learning rate or fewer epochs, lower rank or fewer target modules, keep a general-capability regression eval alongside the task eval, and compare against the base with RAG or prompting before committing.",
      },
    ],
    redFlags: [
      "Thinks LoRA reduces inference memory or makes the model smaller.",
      "Counts only the weights (2 bytes per parameter) for full fine-tuning and forgets gradients and optimiser state.",
      "Believes QLoRA trains the model in 4-bit, or that the 4-bit base has no effect on quality.",
    ],
    lessons: ['llm/fine-tuning-in-practice', 'llm/prompting-vs-rag-vs-fine-tuning', 'local/memory-math-for-local-models'],
    game: { label: 'Fit the model', href: '/play/fit-the-model/' },
  },
  {
    id: 'pretraining-sft-preference-rlhf-dpo',
    prompt:
      "Walk me through how a base model becomes a helpful assistant: pretraining, instruction tuning and preference tuning. Then compare RLHF with PPO against DPO, and tell me which you would use to adapt an open model for our product.",
    roles: ['ml-eng', 'ai-eng'],
    level: 'senior',
    kind: 'concept',
    topics: ['fine-tuning', 'alignment', 'training'],
    minutes: 15,
    strong: [
      "Pretraining: next-token prediction on a very large, broad corpus; gives knowledge and general capability but the model continues text rather than following instructions.",
      "Instruction tuning (SFT): supervised training on prompt-response demonstrations, usually with loss only on the response tokens; teaches format, tone and following instructions.",
      "Preference tuning: uses pairs of responses to the same prompt labelled chosen and rejected, to push the model toward what people (or a rubric) prefer, which is easier to collect than perfect demonstrations.",
      "RLHF: train a reward model on the preference pairs, then optimise the policy with RL (commonly PPO) to maximise reward minus a KL penalty that keeps it close to the SFT reference model; PPO keeps policy, reference, reward and value models in play, so it is costly and finicky.",
      "DPO: optimises the policy directly on preference pairs with a classification-style loss on log-probability ratios against a frozen reference model; no separate reward model and no sampling during training; beta plays the role of the KL strength.",
      "Trade-offs: DPO is simpler and more stable but learns offline from fixed pairs; on-policy RL can explore and exploit a reward model or verifiable rewards (tests for code, checkers for maths) but risks reward hacking.",
      "For a product: start with prompting or RAG, then SFT (often with LoRA) on good demonstrations; add DPO only when there are clear preference signals; evaluate on task metrics and a general-capability and safety regression set.",
    ],
    followUps: [
      {
        q: "What is reward hacking, and how would you notice it?",
        lookFor:
          "The policy finds outputs that score high on the reward model without being better (longer answers, flattering tone, exploiting a judge's bias). Detected by rising reward with flat or falling human or held-out ratings, length drift and manual review; mitigated by KL control, reward model refresh and length-controlled evaluation.",
      },
      {
        q: "Your DPO run improves win rate but the model now refuses more harmless requests. Why might that be?",
        lookFor:
          "Preference data where safe refusals were often chosen teaches over-refusal; DPO can also overshoot when beta is small or training runs too long. Rebalance pairs, add borderline-but-acceptable examples as chosen, tune beta and steps, and track over-refusal with a dedicated eval set.",
      },
    ],
    redFlags: [
      "Thinks instruction tuning or RLHF adds most of the model's knowledge.",
      "Describes DPO as needing a reward model, or RLHF as needing no reference or KL term.",
      "Plans preference tuning without any evaluation of side effects on general capability or safety.",
    ],
    lessons: ['foundations/training-pipeline', 'llm/fine-tuning-in-practice'],
  },
  // ---------------------------------------------------------------- multimodal
  {
    id: 'image-into-language-model-and-clip',
    prompt:
      "How does an image become input to a language model so it can answer questions about it? And how is a CLIP-style image-text model trained, and what can you do with it?",
    roles: ['ml-eng', 'ai-eng'],
    level: 'mid',
    kind: 'concept',
    topics: ['multimodal', 'transformers', 'embeddings'],
    minutes: 12,
    strong: [
      "A vision encoder (typically a ViT) cuts the image into fixed-size patches, flattens and linearly projects each, adds position embeddings and runs transformer layers to produce one vector per patch.",
      "Patch count drives cost: a 224 x 224 image with 16 x 16 patches gives 14 x 14 = 196 patches; 448 x 448 with 14 x 14 patches gives 32 x 32 = 1,024, so higher resolution means many more image tokens in the context.",
      "A projector (linear layer or small MLP) maps patch vectors into the language model's embedding space; they are inserted into the sequence as image tokens next to the text tokens. Some designs instead compress them to a fixed number of tokens with a resampler or use cross-attention layers.",
      "Typical training: first align the projector on image-caption pairs with the encoder and LLM mostly frozen, then instruction-tune on image-question-answer data.",
      "CLIP trains an image encoder and a text encoder together on image-caption pairs: for a batch of N pairs it computes the N x N cosine similarity matrix, and a symmetric cross-entropy loss with a learned temperature pushes the N matching pairs (the diagonal) up and the N^2 - N mismatched pairs down.",
      "Uses of CLIP: zero-shot classification by comparing an image with text prompts like 'a photo of a {label}', image-text retrieval, and as the vision encoder for multimodal LLMs.",
      "Large batches help contrastive training because they provide more negatives per step.",
    ],
    followUps: [
      {
        q: "A user uploads a dense spreadsheet screenshot and the model misreads small numbers. Why, and what can you do?",
        lookFor:
          "The image was downscaled to the encoder's resolution so fine text was lost; use tiling or a higher-resolution mode (more tokens, more cost), crop the relevant region, or extract the data with OCR or the original file instead of a screenshot.",
      },
      {
        q: "Why does CLIP zero-shot accuracy change when you rephrase the label prompts, and how do teams handle it?",
        lookFor:
          "The text encoder was trained on captions, so the wording shifts the text embedding; prompt templates and averaging embeddings across several templates (prompt ensembling) help; for production, evaluate on labelled data or train a small linear probe on the image embeddings.",
      },
    ],
    redFlags: [
      "Thinks the LLM reads raw pixels or that images are converted to text captions first in all multimodal models.",
      "Assumes image inputs cost the same regardless of resolution.",
      "Describes CLIP as a captioning model that generates text.",
    ],
    lessons: ['foundations/multimodal-models', 'foundations/tokens-and-embeddings'],
  },
  // ---------------------------------------------------------------- behavioural
  {
    id: 'behavioural-flawed-eval-or-dataset',
    prompt:
      "Tell me about a time you discovered that an evaluation, benchmark or dataset your team relied on was flawed. What did you notice, what did you do, and what changed afterwards?",
    roles: ['ml-eng', 'ai-eng', 'ml-platform'],
    level: 'senior',
    kind: 'behavioural',
    topics: ['behavioural', 'evals', 'data'],
    minutes: 12,
    strong: [
      "Sets out a specific situation with real stakes: which model or decision depended on the evaluation (a launch, a model choice, a reported result).",
      "Explains the signal that raised suspicion: a result that was too good, a mismatch with production or user feedback, a slice that behaved oddly, or reading raw examples.",
      "Shows how they confirmed it with evidence rather than intuition: re-split by group or time, deduplicated, re-labelled a sample, ran an ablation, and quantified the effect (for example the score before and after the fix).",
      "Describes the flaw precisely, such as train-test overlap, leakage, label errors, a judge prompt biased toward longer answers, or a test set that did not match real users.",
      "Communicated it early to the people making decisions, including when the news was unwelcome or the mistake was their own or a colleague's, and was clear about uncertainty.",
      "Fixed the root cause and the process, not just the number: new split rules, a frozen held-out set, data checks or the eval in CI, documentation.",
      "Reflects on what they would do differently and what the episode taught the team.",
    ],
    followUps: [
      {
        q: "How did the people who had already reported the original number react, and how did you handle it?",
        lookFor:
          "Handled it without blame, shared the evidence privately first where appropriate, focused on the decision rather than the person, and agreed together how to correct any external or management reporting.",
      },
      {
        q: "If you had not found it, what would have happened, and how would the team have found out?",
        lookFor:
          "Can state the concrete consequence (a weaker model shipped, wasted training budget, a user-facing failure) and names the monitoring or later check that would eventually have caught it, showing they think about detection, not just luck.",
      },
    ],
    redFlags: [
      "No concrete numbers or details; a generic story that could apply to any job.",
      "Quietly fixed the problem without telling those who had made decisions on the flawed results.",
      "Blames colleagues or the data team without describing their own actions.",
      "Cannot explain why the flaw changed the conclusion.",
    ],
    lessons: ['evals/evals-101', 'foundations/classical-ml-essentials'],
  },
];
