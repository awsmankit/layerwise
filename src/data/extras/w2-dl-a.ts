import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 2 "dl-a" batch. */
export const extrasW2DlA: Record<string, Extra> = {
  'deep-learning/build-a-tokenizer': {
    takeaways: [
      'Byte-pair encoding starts from single bytes and repeatedly merges the most frequent adjacent pair; the number of merges sets the vocabulary size.',
      'A base of 256 bytes means nothing is ever unknown, and a pre-tokenisation pattern keeps merges inside words. Both are part of the tokenizer.',
      'A bigger vocabulary shortens sequences but adds embedding parameters and rare, under-trained tokens: Llama 3 at 128,256 tokens spends about 1.05B of its 8.03B parameters on embeddings.',
      'Digits, indentation, non-English text, leading and trailing spaces and glitch tokens are tokenizer effects that change cost, context use and accuracy. Count tokens with the real tokenizer.',
    ],
    prereq: ['foundations/tokens-and-embeddings'],
    quiz: [
      {
        q: 'At each step of BPE training, what gets merged into a new token?',
        options: ['The longest word in the corpus', 'The most frequent adjacent pair of tokens', 'A random pair of neighbouring tokens', 'The rarest pair, to keep the vocabulary varied'],
        answer: 1,
        why: 'BPE counts every adjacent pair, weighted by word frequency, and merges the most frequent one.',
      },
      {
        q: 'Why does GPT-2 run BPE on UTF-8 bytes instead of Unicode characters?',
        options: ['Bytes compress text better than characters do', 'It makes the merges faster to compute', 'Bytes remove the need for merges altogether', 'The base vocabulary is just 256 symbols, yet any string can be encoded'],
        answer: 3,
        why: 'Covering all code points would need over 130,000 base symbols; bytes need 256 and leave nothing unknown.',
      },
      {
        q: 'Llama 3 has a vocabulary of 128,256 tokens and a model width of 4,096. About how many parameters is one embedding matrix?',
        options: ['5 million', '52 million', '525 million', '5 billion'],
        answer: 2,
        why: '128,256 x 4,096 is about 525 million, and doubles if the input and output matrices are separate.',
      },
      {
        q: 'A prompt ending in a trailing space gives odd completions. What is the most likely reason?',
        options: ['The model has learned to dislike spaces', 'Spaces normally attach to the next word, so a lone space at the end is a boundary the model rarely saw', 'The context window is already full', 'Temperature is automatically raised when a prompt ends in whitespace'],
        answer: 1,
        why: 'In byte-level BPE the leading space belongs to the following word, so a final lone space token is unusual input.',
      },
    ],
  },
  'deep-learning/modern-llm-architecture': {
    takeaways: [
      'Most changes since 2017 serve training stability (pre-norm, RMSNorm, QK-norm), long context (RoPE and its extensions) or serving cost (GQA, MLA, windows, mixture of experts).',
      'RoPE rotates each query and key pair by position times a speed, so attention scores depend on the distance between tokens; longer context comes from a higher base, position interpolation or YaRN, plus staged training.',
      'KV cache per token is 2 x layers x KV heads x head size x bytes: Llama 3 8B needs 131,072 bytes (128 KiB), four times less than plain multi-head attention.',
      'In a mixture of experts, memory follows total parameters and compute follows active parameters: DeepSeek-V3 is 671B total and about 37B active.',
    ],
    prereq: ['foundations/inside-a-transformer'],
    quiz: [
      {
        q: 'Llama 3 8B has 32 layers and 8 KV heads of size 128, and stores its cache in 16 bits. How many bytes of KV cache does each token need?',
        options: ['32,768', '131,072', '524,288', '1,048,576'],
        answer: 1,
        why: '2 (key and value) x 32 layers x 8 heads x 128 dimensions x 2 bytes is 131,072 bytes, or 128 KiB.',
      },
      {
        q: 'Mixtral 8x7B has 8 experts per layer and uses 2 per token. Which statement is correct?',
        options: ['Only the 2 active experts need to be held in memory', 'Compute per token follows the total parameter count', 'It has fewer parameters than a dense 7B model', 'All experts must be in memory, but only about 13B of its 47B parameters run per token'],
        answer: 3,
        why: 'The router picks experts per token, so any could be needed and all are loaded; compute follows the active ones.',
      },
      {
        q: 'What lets RoPE give attention scores that depend on relative position?',
        options: ['Queries and keys are rotated by angles proportional to position, so their dot product depends on the difference of positions', 'A learned vector for each position is added to the embedding', 'The vocabulary is enlarged to include position tokens', 'The causal mask hides distant tokens'],
        answer: 0,
        why: 'Rotating both by position times a speed makes the angle between them depend only on how far apart they are.',
      },
      {
        q: 'Why do most current models use pre-norm instead of the original post-norm?',
        options: ['It uses less memory for activations', 'It removes the need for residual connections', 'With the norm inside the residual branch, gradients are well-behaved at initialisation, so deep stacks train with less warm-up', 'It improves tokenization of rare words'],
        answer: 2,
        why: 'Xiong et al. showed post-norm gives large gradients near the output at start, which is why warm-up was essential.',
      },
    ],
  },
};
