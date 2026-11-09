import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'kv-cache-memory-70b-16-users': {
    short:
      "The weights take 70 billion x 2 bytes = 140 GB in 16-bit. The KV cache, which stores the keys and values of every token in every conversation, takes 320 KiB per token, so 16 users x 8,192 tokens = 131,072 tokens needs about 43 GB. With roughly 10% overhead that is about 200 GB, far more than one 80 GB card, so plan on 4 x 80 GB. With 8-bit weights the total is about 125 GB and fits on 2 x 80 GB, if quality holds on your evals.",
    explain: [
      {
        heading: "What lives in GPU memory",
        body: "Three things share the memory. The weights are fixed: the same size however many people use the model. The KV cache grows: while writing a reply, the model needs a key and a value vector from every earlier token at every layer, and keeping them avoids recomputing them each step. The third is working space: activations, runtime buffers and allocator slack, which I budget at about 10% as an example allowance.",
      },
      {
        heading: "Memory per token and in total",
        body: "KV bytes per token = 2 (keys and values) x 80 layers x 8 KV heads x 128 head dimension x 2 bytes = 327,680 bytes, which is 320 KiB. Tokens in flight are users x context = 16 x 8,192 = 131,072. The cache is 131,072 x 327,680 = 42,949,672,960 bytes: about 43 GB, or exactly 40 GiB. Watch the units: GB is 10^9 bytes and GiB is 2^30 bytes, and mixing them gives an error of about 7%.",
      },
      {
        heading: "Why grouped-query attention matters",
        body: "In grouped-query attention many query heads share a smaller number of KV heads. This model has 8 KV heads shared by its query heads, so its cache is small. With a separate KV head for each of 64 heads it would be 8 times larger: 2.5 MiB per token and about 344 GB for this load, which would not be servable.",
      },
      {
        heading: "From bytes to hardware",
        body: "Weights plus cache is about 183 GB, or about 201 GB with the overhead. Three 80 GB cards (240 GB) would hold that by memory alone. But a model is usually split across cards by tensor parallelism, which divides the attention heads, and the number of cards normally has to divide the head counts, so in practice it is a power of two: 4 x 80 GB. With 8-bit weights, 70 + 43 = 113 GB, about 124 GB with overhead, which fits on 2 x 80 GB. The same arithmetic also tells you how many users a given set of cards can hold.",
      },
    ],
    diagram: {
      kind: 'layers',
      layers: [
        { label: "Headroom: activations, runtime, allocator slack", sub: "about 10% of the total, roughly 18 GB (an example allowance)" },
        { label: "KV cache: 16 users x 8,192 tokens", sub: "131,072 tokens x 320 KiB = about 43 GB, and it grows with every token" },
        { label: "Weights: 70 billion x 2 bytes (16-bit)", sub: "140 GB, the same however many users there are" },
      ],
      caption: "The memory stack across the GPUs, top layer first: about 201 GB in all, so it needs several 80 GB cards.",
    },
    example: {
      title: "Example: how many 8k users fit on 4 x 80 GB?",
      text: "Take 4 cards of 80 GB with 16-bit weights, keep 10% for overhead, and see what is left for the cache. Each user with 8,192 tokens needs 8,192 x 327,680 bytes.",
      rows: [
        { label: "Memory on 4 x 80 GB", value: "320 GB" },
        { label: "Less 10% headroom", value: "288 GB left" },
        { label: "Less the weights", value: "148 GB left for the cache" },
        { label: "KV cache for one 8k user", value: "2.68 GB" },
        { label: "Users that fit", value: "about 55" },
      ],
    },
    followUps: [
      {
        q: "Instead of 16 users at 8k, one user wants 128k context (131,072 tokens). How much KV cache is that?",
        a: "The same 131,072 tokens, so the same 43 GB. The cache depends on the total tokens held, not on how they are split between users.",
      },
      {
        q: "What would you change to double the number of users, and what does each option cost you?",
        a: "An 8-bit KV cache roughly halves the cache, 8-bit weights free about 70 GB, prefix caching shares a common system prompt, and more GPUs add room. Each trades accuracy, engine support or money, so check quality on your evals.",
      },
      {
        q: "Why not just run it on three cards, since memory allows it?",
        a: "Tensor parallelism splits the attention heads across cards, and 8 KV heads do not divide evenly into 3 parts. So the usual choices are 2, 4 or 8 cards. Three would leave memory unused or need a different split.",
      },
    ],
    mistakes: [
      "Forgetting the factor of 2 for keys and values, or using the 64 query heads instead of the 8 KV heads.",
      "Mixing GB and GiB without noticing, or dropping a factor of 1,000 in the multiplication.",
      "Assuming the weights fill the card exactly and leaving no room for the cache or runtime overhead.",
    ],
  },
};
