import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'tokenization-effects': {
    short:
      "A tokenizer is the cutting step that turns text into tokens, which are pieces of words taken from a fixed list called the vocabulary, and then turns each piece into an integer id. The model never sees letters, only those ids, so everything it does is counted and priced in tokens rather than words. That has practical effects: cost and context limits follow token counts, some languages need many more tokens than English for the same meaning, and odd splits explain failures such as counting letters or some arithmetic slips.",
    explain: [
      {
        heading: "What a tokenizer does",
        body: "Before a model sees a sentence, a tokenizer cuts it into pieces from a vocabulary that is fixed once and never changes, often tens of thousands to a few hundred thousand entries. A common way to build it is byte-pair encoding (BPE): start from single characters or bytes, then repeatedly merge the pair of pieces that appears most often in the training text, until the vocabulary reaches the size you chose. Common words end up as one token, rarer words as a few pieces, and anything unseen falls back to smaller parts, so nothing is ever unknown. Each piece is then replaced by its integer id, and the model looks that id up as a vector in its embedding table. After this step the model works only with ids.",
      },
      {
        heading: "Why cost, context and speed are all counted in tokens",
        body: "Providers price per token, the context window (the most tokens the model can handle in one request) is a token limit, and generation time grows with the number of tokens written. For ordinary English prose the common tokenizers average roughly four characters, or about three quarters of a word, per token. That is only a rule of thumb: code, numbers and text full of rare names run higher, and it differs between tokenizers. So a 2,000-character support email is about 500 tokens by the rule of thumb, and the only way to know is to count with the tokenizer of the model you will call.",
      },
      {
        heading: "Languages, numbers and odd splits",
        body: "A vocabulary built mostly from English text has long entries for English words and short fragments for everything else. Many other languages and scripts therefore need more tokens for the same meaning, which costs more, fills the context faster and can give lower quality because the model saw less text in that form. Numbers, code, URLs and rare names also get cut into odd pieces. A long number may be split into chunks of one to three digits, and a word like “strawberry” may be two or three tokens, so the model cannot easily look inside a token to count its letters, reverse a string or line up digits for arithmetic. Small text changes matter too: “cat” and “ cat” with a leading space are different tokens, as are “Cat” and “cat”, so stray whitespace or capitalisation can change the ids and sometimes the output.",
      },
      {
        heading: "The tokenizer belongs to the model",
        body: "The embedding table was trained for one particular vocabulary, so row 1,234 means the same piece every time and nothing else. You cannot swap the tokenizer on a trained model, and token counts from one model’s tokenizer do not transfer to another’s. Always measure with the right one before you estimate cost, set max-token limits or split documents into chunks. Keep the same tokenizer files in training, evaluation and serving, or the ids will silently mean different things.",
      },
    ],
    diagram: {
      kind: 'experiment',
      slug: 'no-tokenizer',
      caption: "Try it: the same sentence cut into characters, toy subwords and words, and what each choice does to the length of the sequence.",
    },
    example: {
      title: "Example: the same emails in two languages",
      text: "Take a 2,000-character English support email and count it as 500 tokens with the four-characters-per-token rule. Suppose the same content in another language needs twice as many tokens (an example ratio; real ratios depend on the language and the tokenizer, so measure). At an example price of $2 per million input tokens, a million such emails cost double, and half as many fit in one context window.",
      rows: [
        { label: "English: tokens for 1,000,000 emails", value: "1,000,000 x 500 = 500,000,000" },
        { label: "English: input cost at $2 per million (example)", value: "500 x $2 = $1,000" },
        { label: "Other language at 2x tokens", value: "1,000,000,000 tokens, $2,000" },
        { label: "Emails that fit in a 128,000-token window", value: "128,000 / 500 = 256, against 128 at 2x" },
      ],
    },
    followUps: [
      {
        q: "What is the trade-off in choosing a larger vocabulary? What does the embedding cost come to for a 128,000-token vocabulary with hidden size 4,096?",
        a: "A larger vocabulary makes sequences shorter, so attention is cheaper and more text fits in the context, but it makes the embedding and output matrices bigger. Here that is 128,000 x 4,096 = 524,288,000, about 524 million parameters per matrix, or about 1.05 billion if the input and output matrices are not tied. Rare tokens also get few training examples and end up under-trained.",
      },
      {
        q: "You add 50 domain-specific tokens to a model’s tokenizer before fine-tuning. What must you do and what can go wrong?",
        a: "Resize the embedding and output layers, start the 50 new rows somewhere sensible (for example the mean of the pieces they replace), and train them, since they are random until trained. With LoRA you must mark those layers trainable explicitly. Then check that the serving stack loads the same tokenizer files, or the new ids will mean nothing there.",
      },
      {
        q: "Why can a trailing space at the end of a prompt change the answer?",
        a: "A space is part of a token, so the prompt now ends in a different token than the model saw in training, usually a lone space where the model expected the next word to start with one. That pushes the next-token odds somewhere unusual. Strip trailing whitespace unless you have a reason to keep it.",
      },
    ],
    mistakes: [
      "Estimating cost by counting words. Count tokens with the tokenizer of the model you will call, and keep a margin.",
      "Assuming every language costs the same per sentence. Measure a sample in each language you serve, for cost, context use and quality.",
      "Saying the model reads raw characters. It reads integer ids, which is why letter counting and digit tricks are hard for it.",
    ],
  },

  'context-window-and-prompt-cache-order': {
    short:
      "The context window is the maximum number of tokens the model can handle in one request, and the input and the output it writes both count toward it. The model keeps no memory between calls, so your application resends the system prompt, tool definitions and history every time, and the cost grows with the length of the conversation. Prompt caching reuses the work already done on a prompt prefix that matches exactly, so put the most stable parts first: system prompt and tools, then fixed documents, then history, then the new question.",
    explain: [
      {
        heading: "The window, and why the model forgets",
        body: "A model call is stateless: it reads the tokens you send and writes a reply, and nothing is kept afterwards. A chat feels continuous only because the application sends the whole conversation again on every turn. The context window is the limit on that request, so input plus output must fit inside it. The consequence is cost. If the system prompt and tool definitions take 3,000 tokens and each turn adds 400, then by turn 10 you are sending about 6,750 tokens, and the ten turns together send almost 50,000 input tokens, mostly the same text repeated.",
      },
      {
        heading: "How prompt caching works",
        body: "When the provider processes a prompt, it computes internal values for every token (the keys and values of attention, called the KV cache). Prompt caching stores those values for the start of the prompt, so a later request that begins with exactly the same tokens skips that work. The result is cheaper input for the cached part and a faster first token. The output is the same as without caching, because only the computation is reused. It is not an answer cache, and it does not return a stored reply. The key rule is that the match is made from the first token onward, so the first token that differs breaks the match for everything after it.",
      },
      {
        heading: "The order that follows from that rule",
        body: "Put the parts that never change at the top and the parts that change most at the bottom. First the system prompt and tool definitions, then any fixed examples or long shared documents. Next comes the conversation history, which only grows at the end, so every earlier turn stays a valid prefix. After that the documents retrieved for this question, and last the new user message. Keep per-request values such as the date and time, the user’s name or a request id out of the top: a single changing character there makes every request a cache miss. If you need them, add them near the end. Do not reorder or rewrite tools between requests either.",
      },
      {
        heading: "Details to check with your provider",
        body: "Providers differ on the minimum prefix length that can be cached, how long an entry lives (often minutes, and it may be refreshed by use), whether you mark cache points yourself or it happens automatically, and whether writing to the cache costs extra. Read the current documentation before you build a cost model on it, and verify the saving by reading the cached-token counts in the usage report of real responses.",
      },
    ],
    diagram: {
      kind: 'layers',
      caption: "Order of a chat prompt, from the top of the request down. The cache matches from the top, so the most stable parts go first and the most changeable last.",
      layers: [
        { label: "System prompt", sub: "same for every request" },
        { label: "Tool definitions", sub: "same for every request, never reordered" },
        { label: "Fixed examples and shared documents", sub: "same for many requests" },
        { label: "Conversation history", sub: "only grows at the end" },
        { label: "Documents retrieved for this question", sub: "changes every turn" },
        { label: "New user message, plus date or user id if needed", sub: "always different" },
      ],
    },
    example: {
      title: "Example: what a changing timestamp at the top costs",
      text: "Suppose a stable prefix of 3,000 tokens is sent on 100,000 requests a day. Use example prices: $3 per million tokens for ordinary input and $0.30 per million for cached input (a tenth), and ignore any cache-write surcharge. With the stable prefix first, nearly all of those tokens are read from the cache. With a timestamp in the first line, no request shares a prefix with any other, so the cache never hits.",
      rows: [
        { label: "Prefix cost per request, not cached", value: "3,000 x $3 / 1,000,000 = $0.009" },
        { label: "Prefix cost per request, cached", value: "3,000 x $0.30 / 1,000,000 = $0.0009" },
        { label: "Per day, 100,000 requests, not cached", value: "$900" },
        { label: "Per day, cached", value: "$90" },
        { label: "Ten chat turns, input tokens sent", value: "30,000 + 400 x 45 + 1,500 = 49,500" },
      ],
    },
    followUps: [
      {
        q: "Does prompt caching change the answer the model gives, or let one user see another user’s data?",
        a: "No. It reuses the computed prefix, so the output is the same as without caching, and it is not a stored reply. A separate application-level answer cache, which stores final replies, is a different thing and can leak data if it is not scoped per user.",
      },
      {
        q: "Conversations get long and expensive. What are your options once history approaches the context limit?",
        a: "Drop the oldest turns, summarise older history, trim large tool results, or retrieve only the past turns that matter. Summarising changes the prefix, so do it rarely and at fixed points rather than on every turn, which keeps the cache useful.",
      },
      {
        q: "A teammate sorts the tool list alphabetically on every request. Does it matter?",
        a: "Only if the order changes between requests. A different order means different tokens near the top, so everything after it misses the cache. Use one fixed order.",
      },
    ],
    mistakes: [
      "Thinking the model remembers earlier requests on its own. Your application resends the history every time, and you pay for it every time.",
      "Confusing prompt caching with caching final answers. It saves computation on the input and never returns a stored reply.",
      "Putting the current date or the user id at the top of the system prompt and still expecting cache hits. Anything that changes per request belongs at the end.",
    ],
  },

  'encoder-vs-decoder-and-positions': {
    short:
      "Encoder-only models (BERT style) read the whole input in both directions and are trained to fill in masked words, so they suit classification, tagging, embeddings and rerankers. Decoder-only models (GPT style) can only look backwards and are trained to predict the next token, which lets them generate text and cover many tasks through prompting, while encoder-decoder models (T5 style) read with an encoder and write with a decoder, which suits translation and summarisation. Attention alone ignores order, so position information is added, and RoPE does that by rotating each query and key vector by an angle that depends on its position, so their dot product depends on the relative distance.",
    explain: [
      {
        heading: "Three shapes of transformer",
        body: "In an encoder-only model such as BERT every token can attend to every other token, to the left and the right. It is trained with masked language modelling: hide about 15% of the words and predict them. It cannot write free-form text one token after another, but it gives rich vectors for each token, which suits classification, tagging, embeddings and rerankers. A decoder-only model such as GPT uses a causal mask, so each token sees only earlier tokens. It is trained to predict the next token and generates one token at a time, reusing a KV cache (stored keys and values of earlier tokens) while it does. An encoder-decoder model such as the original Transformer or T5 has an encoder that reads the input in both directions and a decoder that writes with causal self-attention plus cross-attention, where the decoder looks at the encoder’s outputs. That is a natural fit for translation and summarisation.",
      },
      {
        heading: "Why decoder-only models dominate general LLMs",
        body: "The training objective is simple and wasteful of nothing: a text of n tokens gives n - 1 next-token predictions, so every position supplies a training signal, where masked training learns from only the hidden fraction. The architecture is one stack that scales cleanly, and one model can handle translation, summaries, code and questions just by being prompted, so you do not need a separate model per task. Encoders are still the better tool when you need a vector or a label, not text, and they are small and cheap to run.",
      },
      {
        heading: "How the model knows the order of tokens",
        body: "Self-attention on its own has no sense of order: if you shuffle the input tokens, the outputs shuffle in exactly the same way, so “dog bites man” and “man bites dog” would look alike. Position information therefore has to be added. Absolute schemes add a position vector to each token’s embedding, either a fixed sinusoidal pattern or a learned one. A learned table has one row per position, so a model trained to 4,096 positions has no row for position 4,097 and cannot go beyond its trained length.",
      },
      {
        heading: "What RoPE does",
        body: "Rotary position embedding (RoPE) does not add anything to the embedding. It takes each query and key vector, pairs up its dimensions, and rotates each pair by an angle proportional to the token’s position, with a different frequency for each pair (in the original paper they follow a geometric series with base 10,000). When a query at position m meets a key at position n, the two rotations combine, and the dot product depends on the angle difference, which is (m - n) times the frequency. So attention scores see relative distance, while each token is still encoded on its own, which also suits KV caching. RoPE is applied to Q and K only, never to V. To run longer than the training length you usually scale the positions (position interpolation) and fine-tune on long sequences, so it is not free.",
      },
    ],
    diagram: {
      kind: 'compare',
      caption: "The three transformer shapes side by side.",
      columns: ["Encoder-only", "Decoder-only", "Encoder-decoder"],
      rows: [
        { label: "Attention", cells: ["Both directions", "Causal mask, sees earlier tokens only", "Encoder both ways, decoder causal plus cross-attention"] },
        { label: "Trained by", cells: ["Masked language modelling", "Next-token prediction", "Read input, then generate the target"] },
        { label: "Good for", cells: ["Classification, tagging, embeddings, rerankers", "Free-form generation and many tasks by prompting", "Translation and summarisation"] },
        { label: "Examples", cells: ["BERT", "GPT style models", "Original Transformer, T5"] },
      ],
    },
    example: {
      title: "Example: why a rotation gives relative position",
      text: "Take one pair of dimensions, start both the query and the key as the vector (1, 0), and rotate by 30 degrees per position (an example frequency; real models use many frequencies). The dot product of two unit vectors is the cosine of the angle between them, and the angle is 30 degrees times the distance. Absolute position never appears, only the gap.",
      rows: [
        { label: "Query at 5, key at 3 (gap 2)", value: "cos 60 degrees = 0.5" },
        { label: "Query at 105, key at 103 (gap 2)", value: "cos 60 degrees = 0.5" },
        { label: "Query at 5, key at 4 (gap 1)", value: "cos 30 degrees = 0.866" },
        { label: "Query at 5, key at 0 (gap 5)", value: "cos 150 degrees = -0.866" },
      ],
    },
    followUps: [
      {
        q: "You need sentence embeddings for semantic search. Would you use an encoder or a decoder model, and why?",
        a: "The traditional choice is an encoder trained contrastively: it sees the whole sentence both ways and is small and cheap per query. Decoder LLMs can also be fine-tuned into strong embedding models at higher cost. Decide by recall@k on a labelled set from your own data, with latency and cost next to it.",
      },
      {
        q: "Why does RoPE give relative position when it is applied per token, using absolute positions?",
        a: "Rotating the query at position m by m x theta and the key at position n by n x theta means their dot product sees only the difference (m - n) x theta, because rotations compose. Each token is encoded independently, yet the score depends on the distance between them.",
      },
    ],
    mistakes: [
      "Saying an encoder-only model can write long text the way a decoder does. It is built to produce a vector per token, not a next token.",
      "Believing attention knows word order by itself. Without position information, shuffled input gives shuffled but otherwise identical output.",
      "Assuming a model works at any length beyond what it was trained on. Without scaling and long-sequence fine-tuning, quality drops.",
    ],
  },

  'hallucination-mitigation': {
    short:
      "You cannot stop it entirely, but you can reduce it a lot and measure it. Ground facts that matter in retrieved sources or tool lookups instead of the model’s memory, let the model say it does not know, require citations and check them in code, and add a groundedness check that sends unsupported answers to a fallback or a person. Track an unsupported-claim rate on a labelled set and on sampled live traffic, and tell the product manager the rate can go down but never to zero, so the product must be designed to survive some errors.",
    explain: [
      {
        heading: "Name which kind of error you mean",
        body: "“Hallucination” covers four different problems with different fixes. A claim may be unsupported by the sources you gave the model. A statement may be wrong because the model filled a gap from memory. A citation may be invented, pointing at a page or quote that does not exist. Or the model may report a tool result or action that never happened. Ask for examples from real transcripts and sort them into these four groups first, because retrieval fixes the first two, code checks fix the third, and logging tool calls fixes the fourth.",
      },
      {
        heading: "What you can actually do",
        body: "Ground the facts that matter, such as prices, dates and account data, by retrieving them from a source or calling a tool, and tell the model to answer only from what it was given. Make abstaining acceptable: say in the prompt that “I don’t know” is a good answer when the sources do not cover the question, and reward it in your evals instead of penalising it. Require citations and verify them in code where you can, for example by checking that a quoted sentence really appears in the cited passage. On high-stakes paths add a groundedness check after generation, by a second model or a rule, and send unsupported or low-confidence answers to a fallback message or a human.",
      },
      {
        heading: "How to measure progress",
        body: "Build a labelled eval set of real questions, include ones the sources cannot answer, and define the metric: the unsupported-claim rate is the share of answers with at least one claim the sources do not support. Run it on every change, and also label a weekly sample of live traffic, because real users ask different things. If you use an automated judge, check it against human labels on a sample and re-check whenever the judge’s model or prompt changes. Report the size of the set too: with 200 answers, a measured 6% has a margin of about 3 points either way, so small differences are noise.",
      },
      {
        heading: "What you cannot promise",
        body: "Nobody can promise zero. The rate can be reduced, not eliminated, so design for the rest: show the sources next to the answer, make it easy to flag a bad answer, and keep a human in the loop where an error is costly. A larger model hallucinates less in some settings but still needs grounding and checks, and a single prompt line such as “do not hallucinate” is not a control. Setting temperature to zero does not fix it either.",
      },
    ],
    diagram: {
      kind: 'flow',
      caption: "Where each control sits between the question and the answer a customer sees.",
      nodes: [
        { id: 'q', label: "Question", sub: "from the customer" },
        { id: 'r', label: "Retrieve sources", sub: "or call a tool for account data" },
        { id: 'g', label: "Generate", sub: "answer only from sources, cite them" },
        { id: 'v', label: "Verify", sub: "citations exist, claims supported" },
        { id: 'o', label: "Answer or fall back", sub: "unsupported goes to a person" },
      ],
      highlight: ['v'],
    },
    example: {
      title: "Example: three versions of the assistant on 200 test questions",
      text: "These counts are made up to show the method. Each answer is labelled by a human as having an unsupported claim or not. The first version answers from memory, the second adds retrieval and permission to abstain, and the third adds a groundedness check that diverts unsupported answers. The margin is 1.96 x the square root of p x (1 - p) / n at 95% confidence, a rough guide for a rate p measured on n answers.",
      rows: [
        { label: "Memory only", value: "34 of 200 unsupported = 17%" },
        { label: "Grounded, may abstain", value: "12 of 200 = 6%, margin about 3.3 points" },
        { label: "Plus check and fallback", value: "5 of 200 reach users = 2.5%, margin about 2.2 points" },
        { label: "Cost of the check", value: "18 of 200 = 9% of answers go to the fallback" },
      ],
    },
    followUps: [
      {
        q: "Would setting temperature to zero solve it?",
        a: "No. It reduces randomness, but a model can produce the same unsupported claim confidently and repeatably. Grounding and verification matter far more.",
      },
      {
        q: "Your groundedness judge flags 8% of answers. How do you know the judge is right?",
        a: "Compare its verdicts with human labels on a sample, measure agreement, and read the disagreements to improve the instructions. Repeat that check whenever the judge’s model or prompt changes.",
      },
    ],
    mistakes: [
      "Relying on a system prompt line such as “do not hallucinate”. Use retrieval, checks and measurement instead.",
      "Promising zero hallucinations. Promise a measured rate, a target and a plan for the rest.",
      "Assuming a bigger model removes the need for grounding and checks.",
    ],
  },

  'image-into-language-model-and-clip': {
    short:
      "A vision encoder cuts the image into fixed-size patches, turns each patch into a vector, and a small projector maps those vectors into the language model’s embedding space, where they sit in the sequence as image tokens next to the text tokens. Every patch costs context, so a 224 x 224 image with 16 x 16 patches gives 196 image tokens while a 448 x 448 image with 14 x 14 patches gives 1,024. CLIP trains an image encoder and a text encoder together on image-caption pairs so that matching pairs end up close and mismatched pairs far apart, which gives zero-shot classification, image-text search and a vision encoder for multimodal models.",
    explain: [
      {
        heading: "From pixels to image tokens",
        body: "A language model only reads vectors, so the image has to become a sequence of them. A vision encoder, typically a vision transformer (ViT), cuts the image into a grid of equal square patches. Each patch is flattened into a list of numbers (a 16 x 16 patch with three colour channels is 768 numbers), projected linearly to the encoder’s width, given a position embedding so it knows where it came from, and passed through transformer layers. The output is one vector per patch. A projector, either one linear layer or a small multi-layer network, then maps those vectors into the language model’s embedding space, and they are placed in the sequence like words. Some designs compress the patches to a fixed number of tokens with a resampler, and others feed them in through cross-attention layers instead.",
      },
      {
        heading: "Why resolution costs money",
        body: "The number of patches is the image width over the patch size, squared. A 224 x 224 image with 16 x 16 patches is 14 x 14 = 196 patches. A 448 x 448 image with 14 x 14 patches is 32 x 32 = 1,024, more than five times as many tokens. Each image token counts against the context window, is billed like a text token, and adds attention work. Higher resolution helps with small text and fine detail, but you pay in tokens. So image inputs do not cost the same at every size.",
      },
      {
        heading: "How the model learns to use them",
        body: "Training usually happens in two stages. First the projector is aligned on many image-caption pairs, with the vision encoder and the language model mostly frozen, so that image vectors land where the language model can read them. Then the system is instruction-tuned on image, question and answer examples so it learns to answer questions about what it sees. The language model never reads raw pixels, and the image is not simply turned into a caption first.",
      },
      {
        heading: "How CLIP is trained and used",
        body: "CLIP has two encoders, one for images and one for text, trained together on image-caption pairs. For a batch of N pairs it embeds all N images and all N captions and computes an N x N table of cosine similarities. The N matching pairs sit on the diagonal and the other N x N - N entries are mismatches. A symmetric cross-entropy loss, scaled by a learned temperature, pushes the diagonal up and everything else down, in both directions: each image should pick its caption and each caption its image. Big batches help because every extra pair adds more negatives per step. Afterwards you can do zero-shot classification by comparing an image with text prompts such as “a photo of a {label}”, search images with text, and reuse the image encoder inside multimodal models. CLIP scores pairs and does not write captions.",
      },
    ],
    diagram: {
      kind: 'flow',
      caption: "How an image reaches a language model. The highlighted step is where the image turns into tokens the language model can read.",
      nodes: [
        { id: 'img', label: "Image", sub: "pixels" },
        { id: 'patch', label: "Cut into patches", sub: "for example 16 x 16 pixels" },
        { id: 'enc', label: "Vision encoder", sub: "one vector per patch" },
        { id: 'proj', label: "Projector", sub: "into the language model’s space" },
        { id: 'seq', label: "Image tokens + text tokens", sub: "one sequence" },
        { id: 'llm', label: "Language model", sub: "answers the question" },
      ],
      highlight: ['proj', 'seq'],
    },
    example: {
      title: "Example: patch counts, and what they cost",
      text: "Count the patches, then price them with an example rate of $2 per million input tokens and 100,000 images. These are image tokens only. The question text and the answer are extra. Real products may resize, tile or compress images, so check how your provider counts them.",
      rows: [
        { label: "224 x 224, 16 x 16 patches", value: "14 x 14 = 196 tokens" },
        { label: "448 x 448, 14 x 14 patches", value: "32 x 32 = 1,024 tokens" },
        { label: "100,000 images at 196 tokens", value: "19.6 million tokens, $39.20" },
        { label: "100,000 images at 1,024 tokens", value: "102.4 million tokens, $204.80" },
        { label: "CLIP batch of 256 pairs", value: "65,536 table entries: 256 matches, 65,280 mismatches" },
      ],
    },
    followUps: [
      {
        q: "A user uploads a dense spreadsheet screenshot and the model misreads small numbers. Why, and what can you do?",
        a: "The image was probably downscaled to the encoder’s resolution, so fine text was lost. Use tiling or a higher-resolution mode (more tokens, more cost), crop the region that matters, or take the data from the original file or with OCR instead of a screenshot.",
      },
      {
        q: "Why does CLIP zero-shot accuracy change when you rephrase the label prompts, and how do teams handle it?",
        a: "The text encoder was trained on captions, so different wording gives a different text embedding. Teams use prompt templates and average the embeddings over several of them, then evaluate on labelled data or train a small linear probe on the image embeddings.",
      },
    ],
    mistakes: [
      "Saying the language model reads raw pixels, or that every multimodal model first turns the image into a text caption. It reads vectors from a vision encoder.",
      "Assuming image inputs cost the same at any resolution. Token count rises with the square of the width.",
      "Describing CLIP as a captioning model. It scores how well images and texts match; it does not generate text.",
    ],
  },

  'improve-a-prompt-without-overfitting': {
    short:
      "Most likely the prompt overfit your 40 test emails: you edited it while looking at those same emails, so it learned their quirks, and the 95% no longer predicts real traffic. To avoid fooling yourself, keep a held-out set that you do not look at while editing and check it once at the end, change one thing at a time on the same cases, and record each version with its scores. For few-shot examples, use a few that are relevant, varied and consistently formatted (3 to 5 is common vendor guidance), and never copy test cases into the prompt.",
    explain: [
      {
        heading: "What probably happened",
        body: "This is overfitting, the same problem as a student who has seen the exam questions. Each edit fixed an email that was failing, and after a week the prompt had absorbed the habits of those 40 emails: the wording, the odd formats, the particular mistakes. With 40 emails each email is worth 2.5 points, so 70% is 28 emails right and 95% is 38 right. Ten more correct answers on a set you studied says little about emails you have never seen. The real signal is the gap between the score on the emails you tuned on and the score on fresh ones. A big gap means you tuned to the test.",
      },
      {
        heading: "A method that does not fool you",
        body: "Split your emails into a tuning set and a held-out set. Tune on the first, and do not look at the second while editing: no reading its failures, no tweaks to match it. Check it once at the end, and if you have to iterate again, collect a fresh set. Change one thing at a time, run the same cases every time, keep the change only if the score rises, and write down each prompt version with its scores so you can go back. Build the sets from real, varied emails including awkward ones (empty, forwarded, two problems in one email), and add every production failure as a new case. Then re-check against a sample of live traffic, not just the files.",
      },
      {
        heading: "Few-shot examples, done carefully",
        body: "Examples are the most powerful and the most dangerous part of a prompt. Choose ones that are relevant to the task, different from each other and formatted identically. Vendor guidance often suggests 3 to 5. If the examples look alike, the model learns the wrong rule (for example “everything is urgent”), and a wrong label in an example is copied. Never put eval cases into the prompt as examples, because the score then rewards memorising. Shuffle the order and run again: if the score moves a lot, the examples are doing more than you meant. They also cost tokens on every call. In this lesson’s support-email prompt, zero, two and five examples are 52, 129 and 233 tokens. A fixed block of examples at the top of the prompt is a good candidate for prompt caching.",
      },
      {
        heading: "Automatic prompt optimisers",
        body: "Tools such as DSPy search many candidate prompts against a metric you provide. That makes the held-out set and a good metric more important, not less, because a search over hundreds of candidates is very good at finding the one that happens to suit your tuning set. Its documentation suggests that around 30 examples can help but recommends at least 300.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "% of emails right",
      caption: "The scores in this story, plus one made-up held-out score (example). The gap, not the 95%, is what to look at.",
      items: [
        { label: "Tuning set, start", value: 70, note: "28 of 40" },
        { label: "Tuning set, after a week", value: 95, note: "38 of 40" },
        { label: "Held-out emails (example)", value: 68, note: "the number users feel", hot: true },
      ],
    },
    example: {
      title: "Example: what a few examples cost, and how to read a small set",
      text: "Use this lesson’s token counts for the support-email prompt and an example price of $2 per million input tokens at 100,000 calls a day. One email in a 40-email set moves the score 2.5 points, so a gain of a few points on a small set is within noise.",
      rows: [
        { label: "Zero examples, 52 tokens", value: "100,000 x 52 = 5.2 million tokens, $10.40 a day" },
        { label: "Two examples, 129 tokens", value: "12.9 million tokens, $25.80 a day" },
        { label: "Five examples, 233 tokens", value: "23.3 million tokens, $46.60 a day" },
        { label: "Score movement per email", value: "1 / 40 = 2.5 points" },
      ],
    },
    followUps: [
      {
        q: "You only have 30 labelled emails. How do you split them, and what do you claim?",
        a: "Keep some back, for example ten, tune on the other twenty, and report the held-out score separately and cautiously. Get more labelled data before drawing strong conclusions. DSPy’s own documentation suggests 300 or more.",
      },
      {
        q: "A new example improves 3 cases and breaks 2 others. Do you keep it?",
        a: "Look at which cases flipped and why, at the per-category scores and at the held-out result, not only the net change of one. A different example or a clearer instruction may fix the three without breaking the two.",
      },
      {
        q: "The score jumps when you reorder the examples. What does that tell you?",
        a: "The prompt is fragile and the examples are doing more than intended. Test several orders, simplify, and choose the version that is stable.",
      },
    ],
    mistakes: [
      "Reporting the score on the cases you tuned on as the result. Report the held-out score.",
      "Changing several things at once, so you cannot say which edit helped.",
      "Copying eval cases into the prompt as examples. The score then measures memory.",
      "Treating a few points on a set of 40 as proof. One email is worth 2.5 points.",
    ],
  },

  'reliable-structured-output': {
    short:
      "Use the platform’s structured-output or tool-calling mode with a JSON schema, so the syntax is guaranteed rather than hoped for, and validate every response in your own code, because valid JSON can still hold wrong or missing values. Retry a bounded number of times, feeding the error back, then fall back to a default path or a human queue. Tell your colleague that temperature zero makes the output more repeatable but not guaranteed identical, and a repeatable model can repeat the same wrong answer.",
    explain: [
      {
        heading: "Stack the defences",
        body: "First, ask the platform to enforce the format. Where the provider offers a structured-output or tool-calling mode with a JSON schema, it uses constrained decoding: at every step it blocks tokens that would break the schema, so the output parses. A prompt that says “please return valid JSON” enforces nothing. Second, validate in code on every call: required fields present, types right, enum values from the allowed list, numbers in range, text lengths capped. Third, retry a limited number of times, say two, and put the validation error into the retry prompt so the model can fix it. Fourth, when retries run out, take a planned fallback: a default value, a simpler path or a human queue. Never loop forever and never swallow the error and return an empty result.",
      },
      {
        heading: "Truncation is a common cause of broken JSON",
        body: "Every response comes with a finish reason, the reason it stopped. If it says the limit was reached (for example max_tokens), the object was cut off mid-way and no parser can rescue it. Check the finish reason before parsing, set max_tokens with headroom above the longest realistic answer, and put length limits on free-text fields so one rambling field cannot eat the budget. Test with your longest real inputs, not only short ones.",
      },
      {
        heading: "What to tell your colleague about temperature zero",
        body: "Temperature controls how randomly the next token is picked, and at zero the model takes the highest-scoring token each time. That makes output more repeatable, but not guaranteed identical: batching with other requests, the order of floating-point operations on different hardware, and silent model version changes can all alter the scores slightly. It is also the wrong tool for the job. Determinism is not correctness: a deterministic model can return the same invalid or wrong answer every time. And on a plain retry with the same prompt at temperature zero, you may get the same failure again, which is why the retry needs the error message.",
      },
      {
        heading: "Run it like a service",
        body: "Pin the model version so behaviour changes only when you decide. Keep the schema small and flat, since deep nesting and long enums are harder for the model. Log the raw output along with the parsed result, track the parse-failure rate as a metric, and alert when it rises. Keep a regression suite of real and awkward inputs that runs when you change the prompt, the schema or the model, so you find a broken contract in CI, not in production.",
      },
    ],
    diagram: {
      kind: 'flow',
      caption: "The path of one response. Each step catches something the one before it cannot.",
      nodes: [
        { id: 'schema', label: "Request with schema", sub: "structured output or tool call" },
        { id: 'finish', label: "Check finish reason", sub: "cut off at the token limit?" },
        { id: 'validate', label: "Validate in code", sub: "types, enums, ranges" },
        { id: 'retry', label: "Retry with the error", sub: "a fixed maximum" },
        { id: 'fallback', label: "Fallback", sub: "default, simple path or human" },
      ],
      highlight: ['validate'],
    },
    example: {
      title: "Example: how much a bounded retry buys",
      text: "Suppose 3% of calls fail to give a valid object with prompting alone, and a retry with the error in it fixes 80% of the failures it sees (example numbers, and we assume the failures are independent, which is generous: truncation fails again the same way). At 100,000 calls a day, the failures that remain after each retry are small, and the retries themselves add only a few percent in calls. The few left go to the fallback.",
      rows: [
        { label: "No retry", value: "3% x 100,000 = 3,000 failures" },
        { label: "After one retry", value: "3,000 x 0.2 = 600 failures" },
        { label: "After two retries", value: "600 x 0.2 = 120 failures, 0.12%" },
        { label: "Extra calls spent", value: "3,000 + 600 = 3,600, or 3.6% more" },
      ],
    },
    followUps: [
      {
        q: "You switch on schema-constrained output and parse errors drop to zero, but answer quality falls. Why might that happen?",
        a: "Constraining tokens can push the model off its preferred path. The model also writes fields in order, so an answer placed before any reasoning forces a decision early, and a strict enum with no unknown option forces a guess. Fix it with field order, an explicit unknown value, or a two-step extract then format.",
      },
      {
        q: "About 4% of responses fail and almost all have finish_reason = max_tokens, mostly on long inputs. What do you change?",
        a: "This is truncation, not formatting. Raise max_tokens with headroom, cap field lengths, possibly summarise the input first, and add a test for the longest inputs.",
      },
      {
        q: "How would you test that a prompt or model change has not broken the contract with downstream code?",
        a: "Run a regression suite of real and edge-case inputs in CI, measure the parse rate and the field-level correctness against references, and gate the release on both.",
      },
    ],
    mistakes: [
      "Believing temperature zero guarantees identical or valid output. It only makes the output more repeatable.",
      "Relying on “please return valid JSON” in the prompt with no validation in code.",
      "Retrying without a limit, or catching parse errors and silently returning an empty result.",
    ],
  },

  'constrained-decoding-guarantees': {
    short:
      "The platform turns your schema into a grammar, and at each step it sets the score of every token that cannot lead to a valid output to minus infinity, so its probability becomes zero and the remaining probabilities are rescaled to add up to one. The model then samples as usual, so the result always parses and fits the schema within the supported subset, but it is not guaranteed to be true, complete or even present, because truncation and refusals still happen. To make a dropped numeric bound not matter, use an enum of five values instead of a range, allow an unknown option, and validate in your own code.",
    explain: [
      {
        heading: "What the platform does to the next-token choice",
        body: "A model produces a score for every token in its vocabulary, and a softmax step turns the scores into probabilities. Constrained decoding adds a mask in between. A grammar derived from your schema tracks where the output is, and says which tokens can still lead to a valid result. Every other token has its score set to minus infinity, so after the softmax its probability is exactly zero, and the allowed tokens are rescaled to sum to one. The odds between the allowed tokens do not change, because all of them are divided by the same total. The model samples as usual from what is left. The mask works on characters through tokens: a token is allowed if the text can still become valid, so “bill” is fine on the way to “billing”. It asks whether the output can still become valid, not whether it is valid yet. Engines precompute the allowed set for each grammar state, so a step is a lookup, and the first request with a new schema is slower because the grammar must be compiled (one provider’s lesson note reports it is then cached for 24 hours).",
      },
      {
        heading: "Three levels of guarantee",
        body: "Prompting for JSON and parsing guarantees nothing. JSON mode guarantees syntax only: the text parses, but the keys may be wrong, the types wrong, and invented fields can appear. Schema-constrained decoding guarantees that the output parses and fits the schema, within the subset of schema keywords the provider supports. Treat these as three separate levels, and do not call JSON mode and schema-constrained output the same thing.",
      },
      {
        heading: "What it does not guarantee",
        body: "It does not guarantee truth: a valid object can carry the wrong category. It does not guarantee completeness: if generation stops at max_tokens, the object is cut off and will not parse, because a mask cannot fix a budget. It does not guarantee a reply: a refusal can take precedence over the schema. And it does not guarantee any keyword the provider leaves out of its supported subset. In the lesson’s read of 1 November 2026, providers differed on numeric bounds, string lengths, optional fields and recursion, so test the exact schema on the exact provider, in CI, not first in production.",
      },
      {
        heading: "Design so a dropped bound does not matter",
        body: "Do not let correctness depend on a keyword one vendor might stop enforcing. Replace the numeric range 1 to 5 with an enum of five values, which every provider can enforce. Give the model a way out: a nullable field or an explicit unknown option, so it is not forced to invent a value. Validate every response in your own code with the same type definition that generated the schema, add cross-field rules the schema cannot say, and check the stop reason before parsing. Evidence on whether constraints hurt reasoning is mixed, so measure with and without the schema on the same labelled inputs, and put a short reasoning field before the answer field.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "% probability",
      caption: "Next-token odds before and after the mask. Three tokens stay allowed and a blocked 36% is removed. The 3 : 2 : 1.4 ratio is unchanged.",
      items: [
        { label: "bill, before", value: 30 },
        { label: "bill, after", value: 46.9, hot: true },
        { label: "bug, before", value: 20 },
        { label: "bug, after", value: 31.3, hot: true },
        { label: "question, before", value: 14 },
        { label: "question, after", value: 21.9, hot: true },
      ],
    },
    example: {
      title: "Example: the mask and renormalise step with numbers",
      text: "Suppose the model is about to write the category, and the next-token odds are bill 30%, bug 20% and question 14%, with the other 36% on tokens that would break the schema (such as a chatty “Sure”). The mask zeroes the 36%, and the three allowed tokens are divided by their total of 64%.",
      rows: [
        { label: "Allowed total", value: "30 + 20 + 14 = 64" },
        { label: "bill", value: "30 / 64 = 46.9%" },
        { label: "bug", value: "20 / 64 = 31.3%" },
        { label: "question", value: "14 / 64 = 21.9%" },
        { label: "Ratio bill : bug before and after", value: "30 : 20 = 46.9 : 31.3 = 1.5" },
      ],
    },
    followUps: [
      {
        q: "Why does the order of fields in the schema matter?",
        a: "The model writes fields in order, so an answer placed before any reasoning forces a decision in the first tokens. A short required reasoning or explanation field first gives it room to think.",
      },
      {
        q: "The first request with a new schema is slower than later ones. Why?",
        a: "The grammar must be compiled from the schema, and is then cached. Engines also precompute which tokens are allowed in each state, so each step is a lookup rather than a scan of the whole vocabulary.",
      },
      {
        q: "Output still fails to parse even with constrained decoding. What are two causes?",
        a: "Truncation at max_tokens, because a mask cannot fix a budget, and a refusal or a schema outside the supported subset, which returns an error. Test your schemas in CI.",
      },
    ],
    mistakes: [
      "Saying constrained decoding makes the content correct. It guarantees the shape, not the truth.",
      "Thinking the mask changes the relative odds between the allowed tokens. They are only rescaled.",
      "Treating JSON mode and schema-constrained output as the same. JSON mode guarantees syntax only.",
      "Relying on a numeric bound being enforced the same way on every provider. Use an enum and validate in code.",
    ],
  },

  'code-temperature-top-k-top-p': {
    short:
      "Divide the logits by the temperature, subtract the maximum for stability, take a softmax, keep only the top-k tokens, then keep the smallest set of tokens whose probabilities add up to p (always at least the top token), renormalise and sample with a seeded random generator. Temperature 0 is a special case that returns the argmax, which avoids dividing by zero. The order matters because temperature changes the shape of the distribution, and so changes which tokens survive top-p, while it does not change which tokens are in the top k.",
    explain: [
      {
        heading: "The function, step by step",
        body: "Take a vector of logits (the raw scores, one per vocabulary token), a temperature, k, p and a random generator you pass in. If the temperature is 0, return the index of the largest logit and stop. Otherwise divide the logits by the temperature, subtract their maximum so the exponentials cannot overflow, and apply a softmax, which exponentiates and divides by the sum. A temperature below 1 sharpens the distribution and above 1 flattens it. The key lines are in the table below. The generator is a parameter so a test can seed it and get the same result every time.",
      },
      {
        heading: "Top-k, then top-p",
        body: "Top-k keeps the k most probable tokens and sets the rest to zero. Finding them with a partial partition, such as np.argpartition, takes O(V) time for a vocabulary of V tokens, while a full sort is O(V log V), which matters when V is 100,000 or more. Top-p, also called nucleus sampling, sorts the probabilities from largest to smallest, takes the running total, and keeps the smallest prefix whose total reaches p. Always keep the first token, so the set can never be empty, which is the usual bug. Then renormalise so the kept probabilities add up to one, and draw one token with the generator.",
      },
      {
        heading: "The order and why",
        body: "The common order is temperature, then top-k, then top-p. Temperature is first because it reshapes the whole distribution. Top-k then cuts to a fixed count, and top-p cuts by probability mass. Temperature changes which tokens survive top-p: a sharper distribution has fewer tokens in the nucleus, a flatter one has more. It cannot change the top-k set, because dividing every logit by the same positive number keeps the ranking. Say the order out loud in an interview, since libraries differ and the order changes results.",
      },
      {
        heading: "Edge cases to test",
        body: "Check k larger than the vocabulary (treat as no limit), k = 0 or p = 1 (no filtering), ties at the k-th probability (decide whether to keep all tied tokens or exactly k), a very peaked distribution where the top token alone already exceeds p, a temperature of 0, and very large or very negative logits that would overflow without the maximum subtraction. Test with a fixed seed, and also sample many times and check that the frequencies match the expected probabilities.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "tokens, most likely first",
      yLabel: "running total of probability",
      caption: "The running total for probabilities 0.5, 0.3, 0.15 and 0.05. With p = 0.9 you stop after the third token, because that is the first point at or above 0.9.",
      points: [[1, 0.5], [2, 0.8], [3, 0.95], [4, 1]],
      marks: [{ x: 3, label: "p = 0.9 is reached here: keep three" }],
    },
    example: {
      title: "Example: top-p at p = 0.9 on four tokens",
      text: "Probabilities 0.5, 0.3, 0.15 and 0.05. The running totals are 0.5, 0.8, 0.95 and 1.0, so the first three tokens are needed to reach 0.9. Dropping the fourth leaves a total of 0.95, so the three are divided by 0.95. A scratch run with a seeded generator over 20,000 draws gave frequencies close to these. The temperature then changes the nucleus: for example logits 2.0, 1.4, 0.6 and -1.0 keep two tokens at temperature 0.5, three at 1.0 and all four at 2.0.",
      rows: [
        { label: "Probabilities", value: "[0.5, 0.3, 0.15, 0.05]" },
        { label: "Running total", value: "[0.5, 0.8, 0.95, 1.0]" },
        { label: "Kept after top-p 0.9, renormalised", value: "[0.526, 0.316, 0.158]" },
        { label: "Core lines", value: "z = logits / T; z -= z.max(); p = exp(z) / exp(z).sum()" },
        { label: "Nucleus test", value: "keep = (cumsum(p_sorted) - p_sorted) < top_p" },
      ],
    },
    followUps: [
      {
        q: "Why use top-p rather than a fixed top-k?",
        a: "Top-p adapts to the shape of the distribution: when the model is confident it keeps very few tokens, and when it is unsure it keeps many. A fixed k is too loose for a peaked distribution and too strict for a flat one.",
      },
      {
        q: "A team sets temperature 0 for a JSON extraction task and still sees different outputs across runs. Is that possible?",
        a: "Yes. Greedy decoding can still vary because of non-deterministic GPU kernels, batching with other requests that changes the numbers slightly, ties, or provider-side changes. Use structured output and validation rather than relying on bit-exact repeatability.",
      },
    ],
    mistakes: [
      "Applying the softmax first and then dividing the probabilities by the temperature. Divide the logits, then softmax.",
      "Writing top-p so that it can return an empty set. Always keep the top token.",
      "Believing a higher temperature makes the model more knowledgeable or accurate. It only flattens the odds, so answers vary more and go wrong more often.",
    ],
  },

  'code-validate-and-retry-structured-output': {
    short:
      "Call the model, parse the reply with json.loads inside a try block, and check the result in code: exactly the keys category and urgency, the category in the allowed set, the urgency a real integer from 1 to 5. Loop at most three times, and on each failure add the specific validation error to the next prompt instead of repeating the same one. After the third failure raise a clear error that carries the last raw output, and never return an empty or default ticket silently.",
    explain: [
      {
        heading: "The design",
        body: "Split the work into two small pieces. A check function takes the raw text and returns either a clean ticket or a short error message. The outer function, get_ticket, owns the loop: it counts attempts so it cannot run forever, calls the model, runs the check, and returns on success. The error message is the important part. It says exactly what was wrong, for example “urgency was 7; urgency must be 1 to 5”, and the next prompt includes it, so the model gets new information and not the same request again. When the attempts run out, raise a specific exception that holds the last raw output, so whoever catches it can log it, show it or send it to a person. Silently returning a default ticket hides the failure and puts wrong data into the system.",
      },
      {
        heading: "What the check must be strict about",
        body: "Parse with json.loads, never with eval, and never pull the JSON out with a regular expression unless you must (if the model wraps the object in a code fence or a sentence, strip those first and only then parse). Then validate. The reply must be an object with exactly the two expected keys, so missing and extra fields both fail. The category must be one of billing, bug or question. The urgency must be an integer from 1 to 5. In Python, True is an int, so a boolean must be rejected explicitly, and a float such as 3.5 or a string such as “3” must fail too. A check of the type with type(u) is int does this, where isinstance would let True through.",
      },
      {
        heading: "Tests with a fake model",
        body: "Do not call a real model in unit tests. Pass in a fake model, a function that returns scripted replies and records how many times it was called. Test four cases: a valid reply on the first call (exactly one call is made); a failure then a success (the second prompt contains the error text); a failure every time (three calls, then the clear error with the last raw output); and an out-of-range value, a boolean and a float, each rejected. Add a test for a reply with an extra key. In production also use the platform’s native structured output where it exists, and still validate, because valid JSON can hold wrong values.",
      },
    ],
    diagram: {
      kind: 'timeline',
      caption: "One call to get_ticket when the first answer is bad. At most three attempts, then a clear failure.",
      steps: [
        { label: "Ask", detail: "Send the email and the schema. Attempt 1 of 3." },
        { label: "Parse", detail: "json.loads inside try. Text that is not JSON counts as a failed attempt." },
        { label: "Validate", detail: "Exact keys, category in the set, urgency an integer from 1 to 5, booleans rejected." },
        { label: "Retry with the error", detail: "Add the specific message to the prompt and try again, up to the limit." },
        { label: "Succeed or fail clearly", detail: "Return the ticket, or raise an error that carries the last raw output." },
      ],
    },
    example: {
      title: "Example: the key lines, and a scripted run",
      text: "A scratch run of this design against a fake model behaved as follows. The model returned plain text, then urgency 7, then a valid object, and the function returned the valid ticket on the third call with the last two prompts carrying the error messages. A model that always replied nope raised an error after exactly three calls.",
      rows: [
        { label: "Parse", value: "d = json.loads(raw)  # JSONDecodeError counts as a failure" },
        { label: "Keys", value: "set(d) == {'category', 'urgency'}" },
        { label: "Urgency", value: "type(u) is int and 1 <= u <= 5" },
        { label: "Loop", value: "for _ in range(3): ... prompt += 'Your last answer failed: ' + err" },
        { label: "After the loop", value: "raise TicketError(msg, last_raw)" },
      ],
    },
    followUps: [
      {
        q: "The failures are almost all finish reason max tokens, on long emails. What changes?",
        a: "That is truncation, not a formatting problem, so retrying the same request will fail again. Raise the token limit or shorten the input, and track the parse-failure rate as a metric.",
      },
      {
        q: "Some emails really do not fit any category. How should the function behave?",
        a: "Add an explicit “other” or null option and a human queue, rather than forcing a wrong label or retrying forever.",
      },
      {
        q: "How do you stop retries from doubling your bill during a provider outage?",
        a: "Separate retries for invalid output from retries for provider errors. Use backoff and a circuit breaker for the provider, and cap the total spend per request.",
      },
    ],
    mistakes: [
      "Retrying with no cap, or catching every exception and returning a default ticket.",
      "Sending the identical prompt on each attempt. Include the validation error so the model has something new.",
      "Trusting valid JSON without checking the values. An urgency of 7 or true parses fine.",
      "Using eval, or a regular expression, to pull the JSON out.",
    ],
  },

  'code-causal-attention-numpy': {
    short:
      "Compute the scores as Q @ K.swapaxes(-1, -2) / sqrt(head_dim), which has shape (batch, heads, seq_len, seq_len). For the causal mask, set the scores above the diagonal (position j greater than i) to minus infinity, take a softmax over the last axis after subtracting the row maximum, and multiply the weights by V to get an output of shape (batch, heads, seq_len, head_dim). Use broadcasting instead of Python loops, and remember the cost: O(seq_len squared) memory per head for the score matrix is what limits long contexts.",
    explain: [
      {
        heading: "Shapes, step by step",
        body: "Q, K and V each have shape (batch, heads, seq_len, head_dim). To compare every query with every key, multiply Q by K with its last two axes swapped: (…, seq_len, head_dim) @ (…, head_dim, seq_len) gives (…, seq_len, seq_len), one score for each query and key pair, per head and per batch item. Divide by the square root of head_dim. Softmax over the last axis turns each row into weights that add up to 1. Multiplying the weights (…, seq_len, seq_len) by V (…, seq_len, head_dim) gives the output (batch, heads, seq_len, head_dim). Return the output and the weights. NumPy’s matrix multiply broadcasts over the leading axes, so there is no loop over batch or heads.",
      },
      {
        heading: "The causal mask and a stable softmax",
        body: "In a decoder, position i may look only at positions j ≤ i, because the future does not exist yet when the model writes token i. Build the mask with np.triu(np.ones((Tq, Tk), bool), k=1), which is True above the diagonal, and replace the scores there with minus infinity before the softmax, so they come out as exactly zero weight and each row still adds up to 1. Masking after the softmax is wrong, because the rows would no longer sum to 1. For the softmax, subtract the row maximum before exponentiating so big scores cannot overflow, then divide by the row sum.",
      },
      {
        heading: "The scale factor, the cost, and decoding",
        body: "Dividing by sqrt(head_dim) keeps the scores at a sensible size: if the entries of a query and a key are roughly independent with mean 0 and variance 1, their dot product has variance head_dim, so its standard deviation is sqrt(head_dim). Without the division the softmax saturates towards one-hot and gradients vanish. The cost is O(seq_len squared x head_dim) time and O(seq_len squared) memory per head for the score matrix. When decoding with a KV cache, the number of queries Tq can be smaller than the number of keys Tk: query i then sits at absolute position Tk - Tq + i, so the mask offset must be k = Tk - Tq + 1. With one new query it sees every key.",
      },
      {
        heading: "How to test it yourself",
        body: "Check that every row of the weights sums to 1, that the upper triangle of the weights is zero, and that with the causal mask the output at position 0 equals V at position 0, because that token can only attend to itself. Compare against a slow loop version on a tiny input. In a scratch run with shapes (2, 3, 5, 4) the output had shape (2, 3, 5, 4), the weights had shape (2, 3, 5, 5), and all three checks passed. A one-query decode against the full cache gave the same last row as the full run.",
      },
    ],
    diagram: {
      kind: 'experiment',
      slug: 'causal-mask',
      caption: "Try it: switch the causal mask on and off and see which tokens can look at which.",
    },
    example: {
      title: "Example: the function in six lines, and the cost of one head",
      text: "These are the lines the explanation describes. The numbers below are counted, not measured: at 4,096 tokens one head’s score matrix has about 16.8 million entries, and doubling the length quadruples that, which is why long contexts need tricks such as FlashAttention.",
      rows: [
        { label: "Scores", value: "s = Q @ K.swapaxes(-1, -2) / np.sqrt(d)" },
        { label: "Mask", value: "s = np.where(np.triu(np.ones((Tq, Tk), bool), k=Tk-Tq+1), -np.inf, s)" },
        { label: "Softmax", value: "s -= s.max(-1, keepdims=True); w = np.exp(s); w /= w.sum(-1, keepdims=True)" },
        { label: "Output", value: "return w @ V, w" },
        { label: "Score entries per head at 4,096 tokens", value: "4,096 x 4,096 = 16,777,216" },
        { label: "At 8,192 tokens", value: "67,108,864, four times as many" },
      ],
    },
    followUps: [
      {
        q: "Where do Q, K and V come from, and how do multiple heads fit in?",
        a: "In self-attention each is a learned linear projection of the same hidden states, and in cross-attention Q comes from the decoder while K and V come from the encoder. The model width is split into heads (head_dim = d_model / heads), each head attends on its own, and the outputs are concatenated and projected again. Grouped-query attention shares K and V heads across several query heads to shrink the KV cache.",
      },
      {
        q: "Why divide by sqrt(head_dim) rather than head_dim or nothing?",
        a: "With roughly independent unit-variance entries, the dot product has standard deviation sqrt(head_dim) (a scratch run with head_dim 64 measured about 7.97 against 8), so dividing by it restores a unit scale. Without it the softmax saturates, and dividing by head_dim would over-shrink the scores and flatten the attention.",
      },
      {
        q: "Your output has NaNs for some rows when you add a padding mask as well. Why, and how would you avoid materialising the full seq_len x seq_len matrix at all?",
        a: "A row where every key is masked with minus infinity sums to 0 and gives 0 / 0 = NaN, so use a large finite negative number or handle fully masked rows explicitly. FlashAttention-style tiling processes K and V in blocks with an online softmax (a running maximum and sum), so memory grows linearly with length and the result is exact.",
      },
    ],
    mistakes: [
      "Applying the mask after the softmax without renormalising, so the rows no longer sum to 1.",
      "Masking the lower triangle, which lets each token see the future.",
      "Scaling by head_dim or d_model instead of sqrt(head_dim).",
      "Looping over batch and heads in Python. Use matrix multiply and broadcasting.",
    ],
  },

  'mixture-of-experts-tradeoffs': {
    short:
      "In a mixture-of-experts (MoE) transformer, the feed-forward block in some or all layers is replaced by several expert networks plus a small learned router that sends each token to its top-k experts. In your case each expert holds 40B / 8 = 5B parameters, so the active parameters per token are 2B + 2 x 5B = 12B, while the total is 2B + 40B = 42B. Compute per token follows the 12B active parameters, so it costs like a 12B dense model, but memory follows the 42B total, about 84 GB in BF16 before the KV cache.",
    explain: [
      {
        heading: "How it works and the arithmetic",
        body: "A dense transformer runs every parameter for every token. An MoE splits the feed-forward part into several experts and adds a router, a small layer that scores the experts for each token and picks the top-k (here 2). Only those two experts run for that token. The 40B in experts is spread across 8 experts, so one expert has 5B parameters across all layers. Per token, the shared 2B (attention and embeddings) always run, plus 2 x 5B = 10B of experts, so 12B are active. Total parameters are 2B + 40B = 42B. A forward pass costs about 2 FLOPs per active parameter per token, so about 24 GFLOPs: the compute of a 12B dense model with the capacity of something bigger.",
      },
      {
        heading: "What it changes for training",
        body: "The router can collapse: if a few experts get slightly better early on, they get more tokens and improve further, while the rest are starved. Training therefore adds a load-balancing auxiliary loss, a penalty that rewards spreading tokens evenly, and often a capacity limit per expert, where overflow tokens are dropped or rerouted. At scale the experts live on different GPUs (expert parallelism), so in every MoE layer the tokens are sent to their experts and the results sent back, an all-to-all communication step. Interconnect bandwidth then matters as much as compute.",
      },
      {
        heading: "What it changes for serving",
        body: "All 42B parameters must be in memory, because any token may be routed to any expert: 42B x 2 bytes is 84 GB in BF16, so the MoE needs the memory of a 42B model. The speed benefit depends on the batch. At batch size 1 only the two chosen experts’ weights are read for each token, so memory traffic is low and the model is fast. At larger batches the tokens in the batch collectively hit most experts, so memory traffic approaches that of the full model and the advantage over a dense model of the same total size is clearest only when compute is the bottleneck. So the claim “MoE is always faster” depends on batch size and on the interconnect.",
      },
    ],
    diagram: {
      kind: 'compare',
      caption: "The MoE from the question next to a dense 12B model, which matches its compute, and a dense 42B model, which matches its memory. Numbers are counted from parameters, in BF16.",
      columns: ["Dense 12B", "MoE: 2B shared + 8 x 5B, top-2", "Dense 42B"],
      rows: [
        { label: "Total parameters", cells: ["12B", "42B", "42B"] },
        { label: "Active per token", cells: ["12B", "12B", "42B"] },
        { label: "Forward FLOPs per token", cells: ["about 24 GFLOPs", "about 24 GFLOPs", "about 84 GFLOPs"] },
        { label: "Weights in BF16", cells: ["24 GB", "84 GB", "84 GB"] },
      ],
    },
    example: {
      title: "Example: fitting it on one 48 GB GPU",
      text: "The weights alone decide whether it fits, before the KV cache and other overhead. Four-bit quantisation stores about half a byte per parameter, and real files are a little larger because of scales, so treat these as lower bounds.",
      rows: [
        { label: "Active parameters", value: "2B + 2 x 5B = 12B" },
        { label: "Total parameters", value: "2B + 8 x 5B = 42B" },
        { label: "MoE weights in BF16", value: "42B x 2 bytes = 84 GB, does not fit in 48 GB" },
        { label: "MoE weights at 4 bits", value: "42B x 0.5 bytes = 21 GB, fits with room for cache" },
        { label: "Dense 12B in BF16", value: "12B x 2 bytes = 24 GB, fits" },
      ],
    },
    followUps: [
      {
        q: "Would you choose this MoE or a 12B dense model for an on-premise deployment on a single 48 GB GPU?",
        a: "The MoE does not fit in BF16 (about 84 GB), so it would need roughly 4-bit quantisation (about 21 GB for the weights plus overhead) or offloading, with a quality check. The 12B dense model fits in BF16 at about 24 GB with room for the KV cache. Decide on measured quality per task against memory and latency, not on parameter counts.",
      },
      {
        q: "Do experts specialise in topics like law or biology?",
        a: "Mostly not in a way a person can read. Routing studies tend to find specialisation by token type, syntax or position more than by subject area. If someone proposes pruning experts for a domain, measure quality after pruning rather than assuming.",
      },
      {
        q: "Fine-tuning the MoE becomes unstable. What is specific to MoE here?",
        a: "The router can become unstable and load imbalance can grow, so keep or tune the auxiliary loss and consider freezing the router. A small fine-tuning set activates few experts, capacity overflow can drop tokens, and the model can be sensitive to the learning rate, so watch per-expert token counts.",
      },
    ],
    mistakes: [
      "Thinking an MoE needs only its active parameters in memory. Any token can be routed to any expert, so all 42B must be loaded.",
      "Saying an MoE is always faster than a dense model with the same total parameters, whatever the batch size.",
      "Ignoring load balancing in training and the all-to-all communication cost of expert parallelism.",
    ],
  },

  'state-space-vs-attention-long-context-costs': {
    short:
      "(a) The KV cache holds 2 x 32 x 8 x 128 x 2 bytes = 131,072 bytes per token, which is exactly 16 GiB per sequence at 131,072 tokens and 32 GiB at 262,144. (b) The hybrid keeps 4 attention layers, 16,384 bytes per token, so 4 GiB at 256K, plus 28 state-space layers at 256 KiB each, 7 MiB in total at any length, about eight times less. (c) You give up exact recall, because a fixed-size state has to compress the past, and the saving barely matters for short chats, where a layer’s state only breaks even with its cache at 64 tokens.",
    explain: [
      {
        heading: "(a) The cache for full attention",
        body: "Each token stores a key and a value for every layer and every key-value head. That is 2 (keys and values) x 32 layers x 8 heads x 128 numbers x 2 bytes = 131,072 bytes, or 128 KiB, per token. Times 131,072 tokens it is 131,072 x 131,072 bytes = 2^34 bytes = exactly 16 GiB per sequence. At 262,144 tokens it is 32 GiB. Sixteen concurrent 256K sequences need 512 GiB for caches alone, before the weights. Attention work grows with the square of the length too, since each head scores n(n + 1) / 2 pairs per layer: going from 1,000 to 2,000 tokens takes 500,500 pairs to 2,001,000, about four times the work.",
      },
      {
        heading: "(b) The hybrid",
        body: "A state-space layer keeps a fixed-size state that is updated once per token, roughly h = a x previous h + b x input, so its memory and per-token work do not grow with context. Because that update is an affine map and composing two affine maps gives another of the same form, training can use a parallel scan instead of a slow step-by-step loop, finishing n steps in about log2 n rounds. Mamba-style models make the gate depend on the token, so the state can keep a fact and skip filler, but the state is still a fixed budget. With 4 attention layers the cache is 4 x 2 x 8 x 128 x 2 = 16,384 bytes per token, which is 2 GiB at 128K and 4 GiB at 256K. Each state-space layer holds 2 x 4,096 x 16 = 131,072 numbers, which is 262,144 bytes or 256 KiB, so 28 layers hold 7 MiB at any length. The total at 256K is about 4 GiB plus 7 MiB, against 32 GiB: roughly eight times less. Sixteen sequences take about 64 GiB, not 512.",
      },
      {
        heading: "(c) What you give up, and when it does not matter",
        body: "A fixed state must compress everything it has seen, so exact copying, retrieval of a specific fact and learning from examples in the prompt can get worse. Studies report weaker results on tasks such as phone-book style lookups and few-shot learning in pure state-space models, and the usual repair is to keep a few attention layers, as this hybrid does. Most of the evidence for hybrids comes from their authors, on different data and sizes, and at least one lab went back to full attention for a successor model after finding gaps in multi-hop reasoning. Judge on your own evaluations and check what your serving software supports. The saving also does not matter much when contexts are short: a layer’s 256 KiB state equals that layer’s cache at 256 KiB / 4,096 bytes = 64 tokens, so it only pays at long contexts or with many sequences at once.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "GiB of cache per sequence",
      caption: "Memory for one sequence. Full attention grows with length; the hybrid is mostly its 4 attention layers plus a fixed 7 MiB.",
      items: [
        { label: "Full attention, 128K tokens", value: 16 },
        { label: "Full attention, 256K tokens", value: 32 },
        { label: "Hybrid, 128K tokens", value: 2.007, note: "2 GiB + 7 MiB" },
        { label: "Hybrid, 256K tokens", value: 4.007, note: "4 GiB + 7 MiB", hot: true },
      ],
    },
    example: {
      title: "Example: counting the compute per generated token, and a short chat",
      text: "These are operation counts for one layer, not measurements, and they assume 32 query heads of dimension 128 (an assumption, since the question gives only the key-value heads). Attention at 131,072 tokens does 2 x n x 32 x 128 multiply-adds per generated token, but dense projections cost around 1e8 per layer (an example order of magnitude), so the length-dependent term only dominates at roughly ten thousand tokens and above. For a typical 2,048-token chat the full-attention cache is small, so grouped-query attention, a quantised cache and batching matter more than a hybrid.",
      rows: [
        { label: "KV per token, full attention", value: "2 x 32 x 8 x 128 x 2 = 131,072 bytes" },
        { label: "Full attention, 131,072 / 262,144 tokens", value: "16 GiB / 32 GiB" },
        { label: "Hybrid per token, 4 attention layers", value: "4 x 2 x 8 x 128 x 2 = 16,384 bytes" },
        { label: "State-space layers, fixed", value: "28 x 256 KiB = 7 MiB" },
        { label: "Attention per token at 128K, one layer", value: "2 x 131,072 x 32 x 128 = about 1.07e9" },
        { label: "State update per token, one layer", value: "about 3 x 131,072 = 393,216" },
        { label: "Full-attention cache at 2,048 tokens", value: "131,072 x 2,048 = 256 MiB" },
      ],
    },
    followUps: [
      {
        q: "Your product is mostly 2K-token chats. Does a hybrid help?",
        a: "Very little. At 2,048 tokens the full-attention cache is 131,072 x 2,048 = 256 MiB per sequence and the length-dependent compute is small next to the projections. Grouped-query attention, a quantised cache and batching matter more.",
      },
      {
        q: "Which tasks would you test first to find the weakness?",
        a: "Exact retrieval and copying, needle-in-a-haystack, few-shot format following and multi-document question answering, compared against a transformer on your own data.",
      },
      {
        q: "How can a recurrent layer train in parallel?",
        a: "Each step is an affine map, and composing two such maps gives another affine map of the same form. A tournament-style parallel scan therefore finishes n steps in about log2 n rounds.",
      },
    ],
    mistakes: [
      "Saying state-space models have unlimited memory. Their state is fixed in size and compresses the past.",
      "Mixing bits and bytes, or treating 128,000 as exactly 128K. Here 128K is 131,072 tokens and the arithmetic comes out exact.",
      "Claiming hybrids are better everywhere on the strength of the authors’ own benchmarks. Test on your own tasks.",
    ],
  },
};
