import type { Extra } from '../lesson-extras';

export const extrasModels: Record<string, Extra> = {
  'foundations/classical-ml-essentials': {
    takeaways: [
      'Split data before doing anything else, by time or by group when rows are not independent, and touch the test set once.',
      'Data leakage, such as a feature that encodes the label or preprocessing fitted on all the data, makes a model test well and fail in production.',
      'Accuracy hides failure on imbalanced data; report precision and recall, and pick the threshold from the cost of each kind of error.',
      'Calibrate before trusting probabilities, and recalibrate after resampling or class weights.',
      'Gradient-boosted trees are the tabular baseline, and the same habits carry over to LLM evals: frozen eval sets, contamination checks, per-class errors.',
    ],
    prereq: ['foundations/ml-to-ai-timeline'],
    quiz: [
      {
        q: 'Out of 1,000 cases, 50 are positive. A model flags 60 cases, 40 of them correctly. What are its precision and recall?',
        options: [
          'Precision 0.80, recall 0.67',
          'Precision 0.67, recall 0.80',
          'Precision 0.97, recall 0.80',
          'Precision 0.67, recall 0.97',
        ],
        answer: 1,
        why: 'Precision = 40 / 60 = 0.67 (flagged cases that were right). Recall = 40 / 50 = 0.80 (positives that were caught). 0.97 is the accuracy.',
      },
      {
        q: 'Positives are 1% of the data and false alarms cost analysts real time. Which summary of ranking quality is most likely to look better than the system really is?',
        options: [
          'Precision at the chosen threshold',
          'PR-AUC compared against the 1% baseline',
          'The expected cost at the chosen threshold',
          'ROC-AUC',
        ],
        answer: 3,
        why: 'ROC uses the false positive rate, which divides by the huge number of negatives, so many false alarms still look like a tiny rate. PR and cost expose them.',
      },
      {
        q: 'You oversample the rare class, then split into train and test. What goes wrong?',
        options: [
          'Copies of the same example land in both train and test, so the test score is inflated',
          'Nothing, as long as the classes end up balanced',
          'The model becomes underfitted',
          'Training becomes too slow to finish',
        ],
        answer: 0,
        why: 'Resampling before splitting is leakage: the model is tested on duplicates of what it trained on. Resample the training set only.',
      },
      {
        q: 'A missed fraud costs 100 units and a false alarm costs 1. Threshold A gives 10 misses and 20 false alarms; threshold B gives 4 misses and 80 false alarms. Which is cheaper?',
        options: [
          'A, because it has higher precision',
          'A, because it has fewer total errors',
          'B, at 480 units against 1,020 for A',
          'They cost the same',
        ],
        answer: 2,
        why: 'A costs 100 x 10 + 20 = 1,020. B costs 100 x 4 + 80 = 480. Fewer errors or higher precision does not mean lower cost when errors cost different amounts.',
      },
    ],
  },

  'foundations/multimodal-models': {
    takeaways: [
      'An image is cut into patches, a vision encoder turns them into vectors, and a projection maps those into the language model’s embedding space.',
      'CLIP-style contrastive training puts images and text in one space, enabling zero-shot classification and text-to-image search.',
      'Voice products are either a pipeline (speech recognition, text model, text-to-speech) or a native audio model that reads and writes audio tokens.',
      'Images and audio use many tokens; resolution and duration drive the count, and each provider counts differently.',
      'Test on realistic media and report errors by condition: OCR mistakes, hallucinated objects, accents and noise.',
    ],
    prereq: ['foundations/tokens-and-embeddings', 'foundations/attention-intuition'],
    quiz: [
      {
        q: 'In a typical vision-language model, what does the projection layer do?',
        options: [
          'Cuts the image into patches',
          'Maps vision-encoder outputs into the language model’s embedding space',
          'Converts the image to text with OCR before the model sees it',
          'Compresses the image file so it uploads faster',
        ],
        answer: 1,
        why: 'The vision encoder produces vectors in its own space. The projection is a small learned layer that maps them to where the language model expects token embeddings.',
      },
      {
        q: 'How does a CLIP-style model classify an image into labels it was never explicitly trained on?',
        options: [
          'It fine-tunes itself on the new labels at request time',
          'It generates a caption and searches it for the label word',
          'It looks the image up in its training set',
          'It embeds a sentence for each label and picks the one closest to the image embedding',
        ],
        answer: 3,
        why: 'Contrastive training puts matching images and text near each other, so the nearest label sentence is the prediction. No new training is needed.',
      },
      {
        q: 'You send the same screenshot at double the width and double the height. Assuming the model keeps a fixed patch size, roughly what happens to the number of image patches?',
        options: [
          'It stays the same',
          'It doubles',
          'It roughly quadruples',
          'It halves',
        ],
        answer: 2,
        why: 'Patches tile the area, and doubling both sides gives four times the area. Many providers resize or cap images, so check how yours counts.',
      },
      {
        q: 'Your speech recognition scores well on a public benchmark but users in cars complain. What is the best next step?',
        options: [
          'Collect in-car recordings and report word error rate by noise condition and accent',
          'Switch to a larger language model after the transcription step',
          'Raise the sampling temperature of the decoder',
          'Trust the benchmark, since it was measured carefully',
        ],
        answer: 0,
        why: 'Benchmarks with clean audio say little about noisy cars. Measuring on production-like audio, broken down by condition, finds where it fails.',
      },
    ],
  },

  'llm/fine-tuning-in-practice': {
    takeaways: [
      'Fine-tune for behaviour, format and narrow skills, and only after a measured good prompt falls short.',
      'Real inputs, consistent targets, deduplication, a held-out split and the exact chat template decide most outcomes.',
      'LoRA freezes W and learns a low-rank update B·A, so a d x d matrix needs 2·d·r trainable parameters instead of d²; QLoRA adds a 4-bit frozen base.',
      'Evaluate against the base model with a good prompt, and run a general regression suite to catch forgetting.',
      'Preference tuning (RLHF, DPO, verifiable rewards) invites reward hacking, and every adapter must be versioned with its base model, data and evals.',
    ],
    prereq: ['llm/prompting-vs-rag-vs-fine-tuning', 'foundations/training-pipeline'],
    play: [{ label: 'Open the memory tool', href: '/tools/memory/' }],
    quiz: [
      {
        q: 'A 4,096 x 4,096 projection is adapted with LoRA rank 8. How many trainable parameters does the adapter add for that matrix?',
        options: ['32,768', '65,536', '131,072', '16,777,216'],
        answer: 1,
        why: 'LoRA adds A (8 x 4,096) and B (4,096 x 8): 2 x 4,096 x 8 = 65,536. 16,777,216 is the full matrix; 131,072 would be rank 16.',
      },
      {
        q: 'After fine-tuning, the model keeps writing past the end of its answer and sometimes continues the user’s message. What is the most likely cause?',
        options: [
          'The LoRA rank was too low',
          'The learning rate was too low',
          'Catastrophic forgetting of general knowledge',
          'The training data used a different chat template or omitted the end-of-turn token',
        ],
        answer: 3,
        why: 'The chat template’s control tokens tell the model whose turn it is and when to stop. Training and serving with mismatched templates breaks exactly that.',
      },
      {
        q: 'What does DPO remove compared with classic RLHF?',
        options: [
          'The separate reward model and the reinforcement learning sampling loop',
          'The need for preference pairs',
          'The reference model',
          'Supervised fine-tuning data of any kind',
        ],
        answer: 0,
        why: 'DPO trains directly on chosen and rejected pairs with a loss that uses a frozen reference model. It still needs preference pairs, but no reward model or PPO loop.',
      },
      {
        q: 'Your fine-tune scores 12 points above the base model with a one-line prompt. What should you check before shipping?',
        options: [
          'Nothing: 12 points is a large gain',
          'Whether the base model with a good few-shot prompt closes the gap, and whether general abilities regressed',
          'Whether a higher LoRA rank adds more points',
          'Whether the training loss reached zero',
        ],
        answer: 1,
        why: 'A weak baseline flatters the fine-tune. Compare against the best prompt on the same held-out set, and run a general suite to detect forgetting.',
      },
    ],
  },
};
