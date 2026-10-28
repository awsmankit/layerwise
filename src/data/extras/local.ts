import type { Extra } from '../lesson-extras';

export const extrasLocal: Record<string, Extra> = {
  'local/run-models-locally': {
    takeaways: [
      'Local models give privacy, offline use and control, but they are smaller, usually slower and less capable than frontier APIs.',
      'Memory decides what you can run, and memory bandwidth decides how fast it generates.',
      'GGUF files and quantization let a model with billions of parameters fit on an ordinary computer.',
      'Start with a small model in Ollama or LM Studio, try a real task of yours, and judge the result honestly.',
    ],
    prereq: ['start/how-a-chatbot-answers'],
    play: [{ label: 'Play Fit the Model', href: '/play/fit-the-model/' }],
    quiz: [
      {
        q: 'You have a 16 GB laptop and want your first local model. Which is the most sensible choice?',
        options: ['A 70 billion parameter model, because bigger is better', 'A 7 to 14 billion parameter model, quantized to about 4 bits', 'Any size, because the computer will swap to disk', 'Only a model under 1 billion parameters'],
        answer: 1,
        why: 'A quantized 7 to 14 billion parameter model fits in 16 GB with room for context and the operating system. A 70B model would not fit.',
      },
      {
        q: 'A local model feels very slow even though it technically loads. What is the most likely cause?',
        options: ['The model is too big to sit entirely in fast memory', 'The model has too few parameters', 'Safetensors files are always slow', 'The internet connection is poor'],
        answer: 0,
        why: 'When a model overflows fast memory, parts run through a slower path, and every token passes through every layer. A smaller or more quantized model usually fixes it.',
      },
      {
        q: 'Which statement about local models is the most honest?',
        options: ['They match the best cloud models if you quantize them', 'They are useless for real work', 'They can do many everyday tasks well, but are usually weaker at hard reasoning and rare facts', 'They are always faster than an API'],
        answer: 2,
        why: 'Small local models handle summarising, rewriting and simple extraction well, but fall behind frontier models on harder tasks, so test your own use case.',
      },
      {
        q: 'A downloaded model file has Q4_K_M in its name. What does that part of the name describe?',
        options: [
          'The number of layers that run on the CPU',
          'The context length the model supports',
          'Which graphics card the file needs',
          'How the weights were quantized: numbers stored with fewer bits, so the file is smaller',
        ],
        answer: 3,
        why: 'Names like Q4_K_M describe the quantization of a GGUF file, which stores the numbers with fewer bits. It says nothing about context length, layer placement or a required graphics card.',
      },
    ],
  },
  'local/memory-math-for-local-models': {
    takeaways: [
      'Weight memory is the number of parameters times the bytes per parameter, so quantization shrinks it directly.',
      'The KV cache grows with context length, so a model that fits at a short context can fail at a long one.',
      'A model that fits entirely in fast memory beats one that spills layers to the CPU.',
      'Tokens per second is capped at about memory bandwidth divided by the bytes read per token.',
    ],
    prereq: ['local/run-models-locally', 'serving/kv-cache-and-memory'],
    play: [
      { label: 'Play Fit the Model', href: '/play/fit-the-model/' },
      { label: 'Open the memory tool', href: '/tools/memory/' },
    ],
    quiz: [
      {
        q: 'Roughly how much memory do the weights of an 8 billion parameter model need at 4 bits per weight?',
        options: ['About 1 GB', 'About 2 GB', 'About 4 to 5 GB', 'About 16 GB'],
        answer: 2,
        why: '8 billion parameters at half a byte each is about 4 GB, and real Q4 files run slightly higher because of scaling data, so 4 to 5 GB.',
      },
      {
        q: 'A model fits on your GPU at a 4,000 token context but runs out of memory at 32,000. What explains this?',
        options: ['The weights grow with context', 'The KV cache grows with the number of tokens in context', 'Quantization is switched off at long context', 'The GPU clock slows down'],
        answer: 1,
        why: 'The weights are fixed. The KV cache stores keys and values for every token, so it grows in proportion to context length.',
      },
      {
        q: 'You double the memory bandwidth of your machine and keep the same model file. What happens to the speed ceiling for generation?',
        options: ['It roughly doubles', 'It stays the same', 'It halves', 'It doubles only for prompt processing'],
        answer: 0,
        why: 'Each token needs the weights read from memory, so the ceiling is about bandwidth divided by bytes read, which scales with bandwidth.',
      },
      {
        q: 'On a 24 GB GPU (about 20 GB usable), a 32B model at Q4 has about 19 GB of weights. What is the realistic outcome?',
        options: [
          'It fits with plenty of room for long conversations',
          'It runs faster than a 14B model, because bigger models read fewer bytes per token',
          'It fits only with a short context, because the KV cache needs memory too',
          'It needs layers offloaded to the CPU from the start',
        ],
        answer: 2,
        why: '19 GB of weights leaves about 1 GB, which holds only a short context of cache. A bigger model reads more bytes for every token, so it is slower, not faster.',
      },
    ],
  },
  'local/inference-engines-compared': {
    takeaways: [
      'Laptop runners such as Ollama and llama.cpp serve one user well; servers such as vLLM and SGLang serve many users on GPUs.',
      'Continuous batching, PagedAttention and prefix caching are what make a server efficient under concurrent load.',
      'An OpenAI-compatible HTTP API lets you swap engines without rewriting your application.',
      'Engines and supported formats change fast, so check each project docs and benchmark on your own workload.',
    ],
    prereq: ['serving/kv-cache-and-memory', 'local/run-models-locally'],
    play: [{ label: 'Open the GPU explorer', href: '/tools/gpu/' }],
    quiz: [
      {
        q: 'Ten users send requests to one GPU at the same moment. Which feature most helps the server keep the GPU busy?',
        options: ['Prefix caching only', 'Continuous batching', 'A bigger tokenizer', 'Running on the CPU'],
        answer: 1,
        why: 'Continuous batching adds and removes requests at every step, so one read of the weights serves many users and the GPU stays busy.',
      },
      {
        q: 'Why is an OpenAI-compatible API useful when choosing an engine?',
        options: ['It makes every model equally accurate', 'It guarantees identical speed on every engine', 'Your application only changes a base URL and model name to switch engines', 'It removes the need for a GPU'],
        answer: 2,
        why: 'A common API shape is the integration point. You should still test features like tool calling, which vary between engines.',
      },
      {
        q: 'You are on a Mac and just want to try models yourself. Which is the most sensible starting point?',
        options: ['TensorRT-LLM, for maximum speed', 'A multi-GPU vLLM cluster', 'Ollama or LM Studio, with llama.cpp or MLX for more control', 'Training your own model from scratch'],
        answer: 2,
        why: 'TensorRT-LLM targets NVIDIA GPUs, and server engines are built for multi-user GPU serving. Ollama, LM Studio, llama.cpp and MLX suit one person on a Mac.',
      },
      {
        q: 'A team still runs Hugging Face TGI in production and is planning new work. What does the lesson advise?',
        options: [
          'Plan a migration: TGI is in maintenance mode and archived, and Hugging Face recommends vLLM or SGLang for new work',
          'Keep building on it, because it is Hugging Face\'s recommended engine',
          'Move to Ollama, which is designed for dozens of users',
          'Move to TensorRT-LLM, because it works on any GPU vendor',
        ],
        answer: 0,
        why: 'TGI was put into maintenance mode in December 2025 and archived in March 2026. Ollama is built for one machine and personal use, and TensorRT-LLM runs on NVIDIA GPUs only.',
      },
    ],
  },
  'local/self-hosting-vs-api-economics': {
    takeaways: [
      'Self-hosted cost per million tokens equals GPU cost per hour divided by tokens per second, utilisation and 3600, times one million.',
      'Utilisation dominates: the same GPU can cost ten times more per token when it is mostly idle.',
      'A reserved GPU is a fixed monthly cost, an API is a variable one, and the break-even depends on your volume and batching.',
      'Include engineers, on-call, redundancy, idle capacity and evals for each new model, not just the GPU price.',
    ],
    prereq: ['cost/cost-levers', 'local/inference-engines-compared'],
    play: [
      { label: 'Open the break-even tool', href: '/tools/breakeven/' },
      { label: 'Play Cost Crunch', href: '/play/cost-crunch/' },
    ],
    quiz: [
      {
        q: 'A GPU has the same hourly cost, but its utilisation drops from 50 percent to 10 percent. What happens to the cost per million tokens?',
        options: ['It stays the same', 'It falls by a fifth', 'It rises about five times', 'It rises by 10 percent'],
        answer: 2,
        why: 'You pay for every hour but produce one fifth of the tokens, so cost per token is five times higher.',
      },
      {
        q: 'Which change would move the break-even point in favour of self-hosting?',
        options: ['Lower and spikier traffic', 'Better batching that raises aggregate tokens per second', 'Adding a second idle GPU for redundancy', 'Switching to a model that needs more evaluation work'],
        answer: 1,
        why: 'Higher aggregate throughput lowers the cost per token on the same hourly bill. Idle redundancy and extra work raise the self-hosted cost.',
      },
      {
        q: 'Your traffic is small and unpredictable, and an open model passes your evaluation. What is usually the best first step?',
        options: ['Buy a reserved GPU for the peak', 'Use an API, measure real volume, then reconsider', 'Build a multi-region cluster', 'Skip evaluation to save time'],
        answer: 1,
        why: 'At low or uncertain volume the GPU would sit idle. An API turns that into a variable cost and gives you the volume data to decide later.',
      },
      {
        q: 'In the lesson\'s example the GPU costs about 2,920 a month and the API about 1 per million tokens, so break-even is about 2.9 billion tokens a month. Your service uses 1 billion. What follows?',
        options: [
          'Self-hosting is cheaper, because a GPU is only billed while it is busy',
          'Self-hosting is cheaper, because owning hardware is always cheaper at scale',
          'They cost the same at that volume',
          'The API is cheaper, because 1 billion tokens is below the break-even',
        ],
        answer: 3,
        why: 'Below the break-even volume the API line is lower. A GPU costs the same per hour whether it is busy or idle, and the lesson says these numbers are examples, not real prices.',
      },
    ],
  },
  'local/private-and-air-gapped-ai': {
    takeaways: [
      'Self-hosting keeps data inside your boundary, but logs, shared caches, prompt injection and open ports can still leak it.',
      'Open-weights licences differ, so read the licence of each exact model and fine-tune you use.',
      'Prefer safetensors, verify sources and checksums, pin versions and serve models from an internal mirror.',
      'Air-gapped updates travel by verified, signed transfer, and each new model needs re-evaluation inside.',
    ],
    prereq: ['local/self-hosting-vs-api-economics'],
    quiz: [
      {
        q: 'Which risk remains even when a model runs entirely on your own hardware?',
        options: ['Your prompts being retained by a model vendor', 'Prompt injection from untrusted documents the model reads', 'Having to pay per token', 'The vendor changing the model without notice'],
        answer: 1,
        why: 'Local hosting removes the outside provider, but a model that reads untrusted text can still be steered by hidden instructions, especially if it can use tools.',
      },
      {
        q: 'Why is safetensors preferred over pickle-based model files from unknown sources?',
        options: ['Safetensors files are always more accurate', 'Pickle files cannot be quantized', 'Loading a pickle file can execute arbitrary code, but loading safetensors does not', 'Pickle files are encrypted'],
        answer: 2,
        why: 'Pickle can describe code to run when loaded, so a malicious file can attack on load. Safetensors stores only tensor data and metadata.',
      },
      {
        q: 'You find a popular open model on a leaderboard and want to ship it in a product. What should you do about its licence?',
        options: ['Assume it is free for any use because the weights are public', 'Read the licence for that exact model and version, and have the right person review it', 'Assume it matches the licence of the model family name', 'Check only that the download works'],
        answer: 1,
        why: 'Open-weights licences vary from permissive to restricted, and can change between versions and fine-tunes, so the licence file for your exact model is the source of truth.',
      },
      {
        q: 'A model repository\'s instructions say to load it with trust_remote_code turned on. What does the lesson advise?',
        options: [
          'Enable it, since it only affects speed',
          'Enable it if the repository has many downloads',
          'Leave it off unless you have read the code that ships with the repository',
          'Enable it for GGUF files only, because they cannot run code',
        ],
        answer: 2,
        why: 'Some loaders run custom Python that ships with a model repository, so enabling the setting runs someone else\'s code. Popularity does not make code safe, and the file format does not change what this setting does.',
      },
    ],
  },
};
