export type Term = {
  /** Anchor on the glossary page. */
  id: string;
  term: string;
  /** Other spellings that should also match in lesson text. */
  aka?: string[];
  /** One or two plain sentences. Shown in hover cards and search. */
  short: string;
  /** Where to learn more. */
  lesson?: string;
  /** Match exactly (acronyms such as RAG), instead of ignoring case. */
  exact?: boolean;
};

export const glossary: Term[] = [
  { id: 'cold-start', term: 'Cold start', short: 'The delay when a new server has to load a multi-gigabyte model before it can answer its first request.', lesson: '/learn/infra/kubernetes-and-autoscaling-for-inference/' },
  { id: 'cuda', term: 'CUDA', exact: true, short: 'NVIDIA’s programming platform for GPUs. Most AI software is built on it, which is why changing chip vendors takes real work.', lesson: '/learn/infra/gpu-basics/' },
  { id: 'dcgm', term: 'DCGM', exact: true, short: 'NVIDIA’s tool and library for monitoring GPU health, memory and utilisation in data centres.', lesson: '/learn/infra/gpu-observability-and-capacity-planning/' },
  { id: 'data-parallelism', term: 'Data parallelism', short: 'Every GPU holds a full copy of the model and works on a different slice of the batch.', lesson: '/learn/infra/multi-gpu-parallelism-and-interconnect/' },
  { id: 'expert-parallelism', term: 'Expert parallelism', short: 'Spreading the experts of a mixture-of-experts model across GPUs, with tokens routed to the experts that need them.', lesson: '/learn/infra/multi-gpu-parallelism-and-interconnect/' },
  { id: 'fsdp', term: 'FSDP', aka: ['ZeRO', 'fully sharded data parallel'], exact: true, short: 'Fully sharded data parallel: spreading weights, gradients and optimizer state across GPUs so each one holds only a part.', lesson: '/learn/infra/training-infrastructure/' },
  { id: 'gguf', term: 'GGUF', exact: true, short: 'A single-file model format used by llama.cpp and the tools built on it. It stores quantized weights and metadata together.', lesson: '/learn/local/memory-math-for-local-models/' },
  { id: 'hbm', term: 'HBM', aka: ['high-bandwidth memory'], exact: true, short: 'High-bandwidth memory: stacked memory placed right next to the chip, with several times the bandwidth of the GDDR on cheaper cards.', lesson: '/learn/infra/gpu-basics/' },
  { id: 'infiniband', term: 'InfiniBand', short: 'A high-bandwidth, low-latency network used to link GPU servers together in training and large-scale serving clusters.', lesson: '/learn/infra/multi-gpu-parallelism-and-interconnect/' },
  { id: 'llamacpp', term: 'llama.cpp', short: 'An open-source C and C++ engine that runs quantized models on laptops and desktops, using the GGUF file format.', lesson: '/learn/local/inference-engines-compared/' },
  { id: 'moe', term: 'Mixture of experts', aka: ['MoE'], short: 'A model made of many specialist sub-networks where only a few run for each token, so it stores a lot but computes a little.', lesson: '/learn/infra/multi-gpu-parallelism-and-interconnect/' },
  { id: 'nvlink', term: 'NVLink', aka: ['NVSwitch'], short: 'NVIDIA’s very fast link between GPUs inside a server. It is what makes splitting a model across GPUs practical.', lesson: '/learn/infra/multi-gpu-parallelism-and-interconnect/' },
  { id: 'ollama', term: 'Ollama', short: 'A friendly tool for downloading and running open-weights models on your own computer.', lesson: '/learn/local/run-models-locally/' },
  { id: 'open-weights', term: 'Open weights', aka: ['open-weight', 'open-weights'], short: 'A model whose trained weights you can download and run yourself. Licences differ, so read them before you build on one.', lesson: '/learn/local/private-and-air-gapped-ai/' },
  { id: 'paged-attention', term: 'PagedAttention', short: 'Storing the KV cache in small blocks instead of one big slab, so less memory is wasted and more users fit on a GPU.', lesson: '/learn/serving/kv-cache-and-memory/' },
  { id: 'pipeline-parallelism', term: 'Pipeline parallelism', short: 'Splitting a model into groups of layers, one group per GPU, and passing batches through them in order.', lesson: '/learn/infra/multi-gpu-parallelism-and-interconnect/' },
  { id: 'provisioned-throughput', term: 'Provisioned throughput', aka: ['PTU', 'PTUs'], short: 'Reserved model capacity bought by the hour for steady load and predictable latency, instead of paying per token.', lesson: '/learn/cloud/quotas-capacity-and-regions/' },
  { id: 'safetensors', term: 'Safetensors', short: 'A model file format that stores only numbers, so loading it cannot run hidden code the way a pickled file can.', lesson: '/learn/local/private-and-air-gapped-ai/' },
  { id: 'spot', term: 'Spot instances', aka: ['spot capacity'], short: 'Spare cloud capacity sold at a discount, which the provider can take back at short notice.', lesson: '/learn/infra/gpu-and-accelerator-instances/' },
  { id: 'tensor-core', term: 'Tensor core', aka: ['tensor cores'], short: 'Hardware inside modern NVIDIA GPUs that multiplies small matrices very fast. It is a big part of why GPUs suit neural networks.', lesson: '/learn/infra/gpu-basics/' },
  { id: 'tensor-parallelism', term: 'Tensor parallelism', short: 'Cutting each layer’s matrices across GPUs so they all work on every layer. It needs very fast links between the GPUs.', lesson: '/learn/infra/multi-gpu-parallelism-and-interconnect/' },
  { id: 'tpu', term: 'TPU', exact: true, short: 'Tensor Processing Unit: Google’s own AI accelerator, available on Google Cloud.', lesson: '/learn/infra/gpu-and-accelerator-instances/' },
  { id: 'trainium', term: 'Trainium', aka: ['Inferentia'], short: 'AWS-designed AI chips (Trainium for training, Inferentia for inference), programmed with the Neuron SDK instead of CUDA.', lesson: '/learn/infra/gpu-and-accelerator-instances/' },
  { id: 'utilisation', term: 'Utilisation', aka: ['utilization'], short: 'The share of time hardware spends doing useful work. When you run your own GPUs it drives your cost per token.', lesson: '/learn/local/self-hosting-vs-api-economics/' },
  { id: 'vllm', term: 'vLLM', short: 'An open-source engine for serving language models, known for PagedAttention and continuous batching.', lesson: '/learn/local/inference-engines-compared/' },
  { id: 'vram', term: 'VRAM', aka: ['GPU memory'], exact: true, short: 'The memory on the graphics card itself. The weights and KV cache must fit in it, or be slowly moved in and out.', lesson: '/learn/infra/gpu-basics/' },
  { id: 'agent', term: 'Agent', short: 'A system where a model can choose actions, such as calling tools, and repeat in a loop until a task is done.', lesson: '/learn/rag-agents/agents-and-tool-use/' },
  { id: 'attention', term: 'Attention', short: 'The mechanism that lets each token in a transformer weigh how much every other token matters for its own meaning.', lesson: '/learn/foundations/attention-intuition/' },
  { id: 'availability', term: 'Availability', short: 'The share of time a service works. 99.9% allows about 8.8 hours of downtime a year.', lesson: '/learn/systems/model-routing-and-fallbacks/' },
  { id: 'backoff', term: 'Exponential backoff', aka: ['backoff'], short: 'Retrying a failed call after waits that grow each time, so retries do not pile onto an overloaded service.', lesson: '/learn/systems/model-routing-and-fallbacks/' },
  { id: 'batching', term: 'Continuous batching', aka: ['batching'], short: 'Serving many users on the same chips by swapping finished requests for waiting ones at every step. It keeps hardware busy and prices low.', lesson: '/learn/serving/life-of-a-request/' },
  { id: 'bedrock', term: 'Amazon Bedrock', aka: ['AWS Bedrock', 'Bedrock'], short: 'AWS’s managed service for calling foundation models from several providers through one API.', lesson: '/learn/cloud/what-is-bedrock/' },
  { id: 'chunking', term: 'Chunking', short: 'Splitting documents into passages small enough to be specific and large enough to make sense alone, before indexing them for retrieval.', lesson: '/learn/rag-agents/chunking-and-retrieval-quality/' },
  { id: 'circuit-breaker', term: 'Circuit breaker', short: 'A guard that stops calling a failing service for a short time instead of waiting on every request.', lesson: '/learn/systems/model-routing-and-fallbacks/' },
  { id: 'context-window', term: 'Context window', short: 'The most text, measured in tokens, that a model can consider at once. Input and output both count.', lesson: '/learn/llm/context-window-and-caching/' },
  { id: 'decode', term: 'Decode', aka: ['decoding'], short: 'The phase where a model writes its answer one token at a time. It is limited by memory bandwidth.', lesson: '/learn/serving/life-of-a-request/' },
  { id: 'deep-learning', term: 'Deep learning', short: 'Machine learning with large neural networks of many layers. It learns its own features from raw data.', lesson: '/learn/foundations/ml-to-ai-timeline/' },
  { id: 'distillation', term: 'Distillation', short: 'Training a small model to imitate a larger one, to get most of the quality at a fraction of the cost.', lesson: '/learn/edge/quantization-for-edge/' },
  { id: 'edge', term: 'Edge inference', aka: ['on-device AI', 'edge AI'], short: 'Running a model on the device itself, such as a phone or hearing aid, instead of calling a server.', lesson: '/learn/edge/edge-vs-cloud-inference/' },
  { id: 'embedding', term: 'Embedding', aka: ['embeddings'], short: 'A list of numbers that represents the meaning of a token, sentence or document so that similar meanings sit close together.', lesson: '/learn/foundations/tokens-and-embeddings/' },
  { id: 'eval', term: 'Eval', aka: ['evals', 'evaluation suite'], short: 'A repeatable test for model behaviour: inputs, a definition of a good answer, and a way to score outputs.', lesson: '/learn/evals/evals-101/' },
  { id: 'fine-tuning', term: 'Fine-tuning', aka: ['fine-tune', 'fine-tuned'], short: 'Further training a model on your own examples to change its style, format or narrow skills. It is a poor way to add facts.', lesson: '/learn/llm/prompting-vs-rag-vs-fine-tuning/' },
  { id: 'foundation-model', term: 'Foundation model', aka: ['foundation models'], short: 'A large model trained on broad data that can be adapted to many tasks, such as a general-purpose language model.', lesson: '/learn/cloud/what-is-bedrock/' },
  { id: 'few-shot', term: 'Few-shot', aka: ['few-shot examples'], short: 'Putting a few worked examples in the prompt so the model copies the pattern.', lesson: '/learn/llm/prompting-and-structured-output/' },
  { id: 'gpu', term: 'GPU', exact: true, short: 'A chip built for massive parallel arithmetic. Almost all model training and most serving runs on GPUs or similar accelerators.', lesson: '/learn/serving/kv-cache-and-memory/' },
  { id: 'guardrails', term: 'Guardrails', short: 'Checks on what goes into and comes out of a model: sensitive data, disallowed topics, unsupported claims.', lesson: '/learn/cloud/what-is-bedrock/' },
  { id: 'hallucination', term: 'Hallucination', aka: ['hallucinations', 'hallucinate'], short: 'A fluent, confident answer that is not true. The model produces plausible text, not checked facts.', lesson: '/learn/start/how-a-chatbot-answers/' },
  { id: 'hybrid-search', term: 'Hybrid search', short: 'Combining keyword search and vector search, then merging the results. Catches both exact terms and similar meanings.', lesson: '/learn/rag-agents/chunking-and-retrieval-quality/' },
  { id: 'inference', term: 'Inference', short: 'Using a trained model to produce an output. Training builds the model; inference is every use of it afterwards.', lesson: '/learn/serving/life-of-a-request/' },
  { id: 'kv-cache', term: 'KV cache', short: 'Stored keys and values of earlier tokens so that generating each new token does not recompute them. It grows with context length and users.', lesson: '/learn/serving/kv-cache-and-memory/', exact: true },
  { id: 'latency', term: 'Latency', short: 'How long a request takes. For model calls, usually measured as time to first token and total time.', lesson: '/learn/serving/life-of-a-request/' },
  { id: 'llm', term: 'Large language model', aka: ['LLM', 'LLMs', 'language model'], short: 'A model trained on huge amounts of text to predict the next token. Chatbots are built on them.', lesson: '/learn/start/what-is-ai-in-plain-english/' },
  { id: 'llm-judge', term: 'LLM-as-judge', aka: ['model judge', 'judge model'], short: 'Using one model to grade another model’s output against a rubric. It scales, and it has biases that need calibrating.', lesson: '/learn/evals/llm-as-judge-pitfalls/' },
  { id: 'lora', term: 'LoRA', exact: true, short: 'A cheap fine-tuning method that trains a small number of extra parameters instead of the whole model.', lesson: '/learn/llm/prompting-vs-rag-vs-fine-tuning/' },
  { id: 'machine-learning', term: 'Machine learning', short: 'Getting a computer to learn the rules from examples instead of having people write them.', lesson: '/learn/start/what-is-ai-in-plain-english/' },
  { id: 'mcp', term: 'Model Context Protocol', aka: ['MCP'], exact: true, short: 'An open standard for describing tools and data sources so that different applications can use them with a model.', lesson: '/learn/rag-agents/agents-and-tool-use/' },
  { id: 'npu', term: 'NPU', exact: true, short: 'A neural processing unit: a small, power-efficient chip designed to run model arithmetic on devices.', lesson: '/learn/edge/quantization-for-edge/' },
  { id: 'parameters', term: 'Parameters', aka: ['weights'], short: 'The adjustable numbers inside a model, set during training. A model with 8 billion parameters has 8 billion of them.', lesson: '/learn/start/what-is-ai-in-plain-english/' },
  { id: 'prefill', term: 'Prefill', short: 'The phase where the model reads the whole prompt in one parallel pass. Its length is your time to first token.', lesson: '/learn/serving/life-of-a-request/' },
  { id: 'pretraining', term: 'Pretraining', short: 'The first, most expensive training stage: learning to predict the next token across a huge body of text.', lesson: '/learn/foundations/training-pipeline/' },
  { id: 'prompt', term: 'Prompt', short: 'Everything you send to the model: instructions, context, examples and the question.', lesson: '/learn/llm/prompting-and-structured-output/' },
  { id: 'prompt-caching', term: 'Prompt caching', short: 'Reusing the processed form of a repeated prompt prefix. Cached input is cheaper and faster.', lesson: '/learn/llm/context-window-and-caching/' },
  { id: 'prompt-injection', term: 'Prompt injection', short: 'Text in a document or tool result that tries to give the model new instructions. The defence is permission limits, not a stern prompt.', lesson: '/learn/rag-agents/agents-and-tool-use/' },
  { id: 'quantization', term: 'Quantization', short: 'Storing a model’s numbers in fewer bits to make it smaller and often faster, at some cost in precision.', lesson: '/learn/serving/quantization/' },
  { id: 'rag', term: 'RAG', aka: ['retrieval-augmented generation', 'retrieval'], exact: true, short: 'Retrieval-augmented generation: find the passages relevant to a question and put them in the prompt so the model answers from them.', lesson: '/learn/rag-agents/rag-from-scratch/' },
  { id: 'recall-at-k', term: 'Recall at k', short: 'The share of questions whose correct passage appears in the top k retrieved results. A way to measure retrieval on its own.', lesson: '/learn/rag-agents/chunking-and-retrieval-quality/' },
  { id: 'reranking', term: 'Reranking', aka: ['reranker'], short: 'A second, more careful model that re-scores retrieved candidates and keeps the best few.', lesson: '/learn/rag-agents/chunking-and-retrieval-quality/' },
  { id: 'rlhf', term: 'RLHF', exact: true, short: 'Reinforcement learning from human feedback: training a model to prefer the answers people rank higher.', lesson: '/learn/foundations/training-pipeline/' },
  { id: 'routing', term: 'Model routing', aka: ['routing', 'router'], short: 'Sending each request to the model that suits it, for example a small model for easy requests and a large one for hard ones.', lesson: '/learn/systems/model-routing-and-fallbacks/' },
  { id: 'sagemaker', term: 'Amazon SageMaker', aka: ['SageMaker'], short: 'AWS’s platform for building, training and hosting your own models, as opposed to calling hosted ones.', lesson: '/learn/cloud/bedrock-sagemaker-foundry-vertex/' },
  { id: 'system-prompt', term: 'System prompt', short: 'Standing instructions that set the model’s role and rules, sent at the start of every request.', lesson: '/learn/llm/prompting-and-structured-output/' },
  { id: 'temperature', term: 'Temperature', short: 'A setting that controls how adventurous token choice is. Low is cautious and repeatable, high is varied and riskier.', lesson: '/learn/start/how-a-chatbot-answers/' },
  { id: 'throttling', term: 'Throttling', aka: ['rate limit', 'rate limiting', 'rate limits'], short: 'A service refusing or delaying requests because you exceeded your quota or it is overloaded. Usually returned as an HTTP 429 error.', lesson: '/learn/serving/life-of-a-request/' },
  { id: 'token', term: 'Token', aka: ['tokens'], short: 'The small piece of text a model reads and writes: a word or part of a word. Pricing and limits are counted in tokens.', lesson: '/learn/foundations/tokens-and-embeddings/' },
  { id: 'tokenizer', term: 'Tokenizer', short: 'The component that splits text into tokens and maps each to a number. Different model families use different ones.', lesson: '/learn/foundations/tokens-and-embeddings/' },
  { id: 'tool-use', term: 'Tool use', aka: ['tool calling', 'function calling', 'tool call', 'tool calls'], short: 'Letting a model request that your code run a function, such as a search, and then using the result.', lesson: '/learn/rag-agents/agents-and-tool-use/' },
  { id: 'transformer', term: 'Transformer', short: 'The neural network design, built on attention, behind almost all modern language models.', lesson: '/learn/foundations/attention-intuition/' },
  { id: 'ttft', term: 'Time to first token', aka: ['TTFT'], short: 'How long you wait before the first piece of the answer arrives. It depends mostly on prompt length and model size.', lesson: '/learn/serving/life-of-a-request/' },
  { id: 'vector-search', term: 'Vector search', aka: ['vector database', 'vector store', 'nearest-neighbour search'], short: 'Finding the stored embeddings closest to a query’s embedding. The retrieval half of RAG.', lesson: '/learn/rag-agents/rag-from-scratch/' },
];

export const glossaryById = Object.fromEntries(glossary.map((t) => [t.id, t]));

/** The payload the in-page tooltip script needs. Kept small on purpose. */
export function glossaryForTooltips() {
  return glossary.map((t) => ({
    id: t.id,
    match: [t.term, ...(t.aka ?? [])],
    exact: !!t.exact,
    short: t.short,
  }));
}
