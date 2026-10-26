import type { Extra } from '../lesson-extras';

export const extrasRetrievalServing: Record<string, Extra> = {
  'rag-agents/vector-search-and-retrieval-metrics': {
    takeaways: [
      'Approximate indexes trade recall for speed and memory. Measure that recall against exact search, on your own data and with your real filters.',
      'HNSW is fast but memory-hungry (tune M and ef), IVF depends on how many lists you probe, and PQ compresses vectors at a cost in accuracy.',
      'Filtering after the vector search can leave too few results; filtering inside a graph search can hurt recall.',
      'Bi-encoders retrieve because document vectors are precomputed; cross-encoders rerank because they are slower and more accurate. Reciprocal rank fusion merges BM25 and vector results by rank.',
      'Keep retrieval metrics (recall@k, MRR, nDCG) separate from answer metrics (faithfulness, context precision and recall, answer relevance), and calibrate any judge model.',
    ],
    prereq: ['rag-agents/chunking-and-retrieval-quality', 'foundations/tokens-and-embeddings', 'evals/evals-101'],
    play: [{ label: 'Play Blueprint', href: '/play/blueprint/' }],
    quiz: [
      {
        q: 'A query has 4 relevant documents. The top 5 results contain 2 of them, at ranks 2 and 4. What are recall@5 and the reciprocal rank?',
        options: [
          'Recall 0.4, reciprocal rank 0.5',
          'Recall 0.5, reciprocal rank 0.5',
          'Recall 0.5, reciprocal rank 0.25',
          'Recall 0.4, reciprocal rank 0.25',
        ],
        answer: 1,
        why: 'Recall@5 is 2 found out of 4 relevant, so 0.5. The reciprocal rank uses the first relevant result, at rank 2, so 1/2. The 0.4 is precision@5 (2 out of 5).',
      },
      {
        q: 'Using reciprocal rank fusion with k = 60, document P is ranked 1st by BM25 and absent from the vector results. Document Q is ranked 2nd in both lists. Which comes first after fusion?',
        options: [
          'P, because a first place always beats a second place',
          'They tie, because RRF only looks at the best rank',
          'It depends on the raw BM25 and cosine scores',
          'Q, because it collects a contribution from both lists',
        ],
        answer: 3,
        why: 'RRF sums 1/(k + rank) over all lists. Q gets 2/62, roughly 0.0323; P gets only 1/61, roughly 0.0164. Raw scores are ignored, which is the point of rank fusion.',
      },
      {
        q: 'Why are cross-encoders used to rerank a short list instead of searching the whole collection?',
        options: [
          'They need a model pass for every query and document pair, so nothing can be precomputed and the cost grows with each candidate',
          'They are less accurate than bi-encoders, so they only make small adjustments',
          'They cannot handle documents longer than one sentence',
          'Their vectors are too large to store in an index',
        ],
        answer: 0,
        why: 'A cross-encoder reads the query and a document together, which makes it more accurate but means it has no stored vectors. Running it over millions of documents per query is far too slow.',
      },
      {
        q: 'An answer makes 4 claims. Three are supported by the retrieved context; the fourth is true but comes from the model’s general knowledge. What is its faithfulness score?',
        options: [
          '1.0, because all four claims are true',
          '0.25',
          '0.75',
          'Undefined without a reference answer',
        ],
        answer: 2,
        why: 'Faithfulness measures support by the retrieved context, not truth: 3 supported claims out of 4 gives 0.75. It needs no reference answer; context recall does.',
      },
    ],
  },
  'serving/inference-optimisation': {
    takeaways: [
      'Identify the bottleneck first: compute-bound prefill, memory-bound decode, memory capacity, or scheduling. Each technique fixes one of them.',
      'FlashAttention gives exact attention with far less memory traffic, and prefix caching skips prefill for repeated prompt prefixes.',
      'Speculative decoding keeps the target model’s output distribution exactly. Its gain depends on the acceptance rate and shrinks at large batch sizes.',
      'PagedAttention and KV-cache quantization let more requests fit; chunked prefill and prefill/decode disaggregation stop long prompts from stalling other users.',
      'Measure time to first token, inter-token latency, throughput and goodput as percentiles, at realistic concurrency and prompt lengths.',
    ],
    prereq: ['serving/life-of-a-request', 'serving/kv-cache-and-memory', 'serving/quantization'],
    play: [
      { label: 'Open the latency tool', href: '/tools/latency/' },
      { label: 'Open the GPU tool', href: '/tools/gpu/' },
    ],
    quiz: [
      {
        q: 'Assume each draft token is accepted independently with probability 0.5 and the draft length is k = 3. How many tokens does one target pass produce on average?',
        options: ['4.0', '2.0', '1.875', '1.5'],
        answer: 2,
        why: 'The expectation is (1 - a^(k+1)) / (1 - a) = (1 - 0.0625) / 0.5 = 1.875, that is 1 + 0.5 + 0.25 + 0.125. 4.0 would need every guess accepted; 2.0 is the limit for very long drafts.',
      },
      {
        q: 'What does FlashAttention change?',
        options: [
          'It approximates attention by only attending to nearby tokens',
          'It computes the same attention result while avoiding writing the full score matrix to GPU main memory',
          'It stores the KV cache in 8 bits',
          'It skips attention for prompt prefixes that were seen before',
        ],
        answer: 1,
        why: 'FlashAttention is exact. It tiles the computation in fast on-chip memory, so it is faster and its memory grows linearly with sequence length. The other options describe sparse attention, KV-cache quantization and prefix caching.',
      },
      {
        q: 'Speculative decoding sped up a single-user test a lot but gave little gain in production at high concurrency. What is the most likely reason?',
        options: [
          'It changed the output distribution, so more retries were needed',
          'It only works with greedy decoding',
          'The KV cache is turned off during verification',
          'At high batch the GPU’s compute is already busy, so verifying guesses, and wasting the rejected ones, costs real throughput',
        ],
        answer: 3,
        why: 'At batch 1 decode is memory-bound and verification is almost free. Under heavy load the spare compute is gone, so the benefit shrinks. The output distribution is unchanged by design.',
      },
      {
        q: 'Users say streaming freezes briefly whenever someone submits a very long document. Which technique targets this?',
        options: ['Chunked prefill', 'KV-cache quantization', 'Speculative decoding', 'Constrained decoding'],
        answer: 0,
        why: 'A long prefill monopolises the GPU and pauses everyone else’s decode steps. Chunked prefill splits it into pieces that run alongside decode, smoothing inter-token latency.',
      },
    ],
  },
};
