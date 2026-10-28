import type { Extra } from '../lesson-extras';

export const extrasInfra: Record<string, Extra> = {
  'infra/gpu-basics': {
    takeaways: [
      'A GPU has thousands of simple arithmetic units working at once, which suits the big matrix multiplications inside neural networks.',
      'Tensor cores do the fast low-precision arithmetic, and high-bandwidth memory (HBM) feeds them.',
      'Compute-bound means waiting for arithmetic. Memory-bound means waiting for data to arrive from memory.',
      'Reading a prompt is compute-bound, but generating a reply is memory-bound, because every token needs a full read of the weights.',
    ],
    prereq: ['start/how-a-chatbot-answers'],
    play: [
      { label: 'Play Fit the Model', href: '/play/fit-the-model/' },
      { label: 'Open the GPU tool', href: '/tools/gpu/' },
    ],
    quiz: [
      {
        q: 'Why is a GPU a good fit for running a neural network?',
        options: [
          'It has a few very clever cores that handle branching code',
          'Matrix multiplication splits into many independent sums that thousands of simple units can compute at once',
          'It stores the model on a hard disk that is faster than memory',
          'It runs at a much higher clock speed than a CPU',
        ],
        answer: 1,
        why: 'Each cell of a matrix product is its own sum, so the work spreads across thousands of units. The few-clever-cores description fits a CPU instead.',
      },
      {
        q: 'In the kitchen analogy, a memory-bound workload is like...',
        options: [
          'Cooks who are all busy chopping, so more cooks would help',
          'A recipe with too many ingredients',
          'Cooks waiting because the pantry is far away and only one person can carry ingredients',
          'A kitchen with no cooks',
        ],
        answer: 2,
        why: 'Memory-bound means the arithmetic units sit idle waiting for data. Adding more cooks (compute) does not help, but a wider corridor (bandwidth) does.',
      },
      {
        q: 'Why is generating a long reply usually limited by memory bandwidth?',
        options: [
          'Each new token needs the model weights read from memory, with only a little arithmetic per byte read',
          'The tensor cores cannot do arithmetic on text',
          'The prompt has to be processed again for every token',
          'Reply text is stored on the CPU, not the GPU',
        ],
        answer: 0,
        why: 'Decode makes one token at a time and re-reads all the weights for each, so memory speed sets the pace and arithmetic units mostly wait.',
      },
      {
        q: 'A server is generating text for a single user, and the arithmetic units sit mostly idle. Which change uses the chip better?',
        options: [
          'Add more tensor cores to the GPU',
          'Raise the clock speed so the arithmetic finishes sooner',
          'Move the weights to a CPU so they are read more cleverly',
          'Serve many users in the same step, so one read of the weights serves many requests',
        ],
        answer: 3,
        why: 'Decode is memory-bound: the cost is reading the weights, and one read can serve many requests at once. More arithmetic speed would not help, because the units are already waiting for data.',
      },
    ],
  },

  'infra/reading-a-gpu-spec-sheet': {
    takeaways: [
      'Five numbers matter most for LLMs: memory capacity, memory bandwidth, compute at your precision, GPU-to-GPU link speed and power.',
      'Per-user decode speed is roughly memory bandwidth divided by the weight bytes plus KV cache bytes read per step.',
      'HBM gives datacenter GPUs several times the bandwidth of the GDDR on cheaper cards (from about 2.4x to over 10x), so they generate text much faster.',
      'Quantizing weights cuts the bytes read per token, so it speeds up decode as well as saving memory.',
    ],
    prereq: ['infra/gpu-basics', 'serving/kv-cache-and-memory'],
    play: [
      { label: 'Play Fit the Model', href: '/play/fit-the-model/' },
      { label: 'Open the GPU tool', href: '/tools/gpu/' },
      { label: 'Open the memory tool', href: '/tools/memory/' },
    ],
    quiz: [
      {
        q: 'An H200 has the same arithmetic speed as an H100 but 4.8 TB/s instead of 3.35 TB/s of memory bandwidth. What does that change most?',
        options: [
          'Prefill gets about 40 percent faster',
          'Memory-bound decode can run faster, and larger models or KV caches fit',
          'The GPU can use FP4',
          'Nothing, because the compute figure is the same',
        ],
        answer: 1,
        why: 'Decode is limited by bandwidth, and capacity is higher too (141 GB versus 80 GB). Compute-bound work such as prefill does not change.',
      },
      {
        q: 'An 8B model in FP16 has 16 GB of weights, and a 4,000-token KV cache adds about 0.5 GB. On a GPU with 300 GB/s of bandwidth, what is the rough decode ceiling for one user?',
        options: [
          'About 600 tokens per second',
          'About 180 tokens per second',
          'About 18 tokens per second',
          'About 2 tokens per second',
        ],
        answer: 2,
        why: 'About 300 GB/s divided by 16.5 GB per step is roughly 18 tokens per second. Real systems usually reach only a fraction of this ceiling.',
      },
      {
        q: 'Why does 4-bit quantization of the weights usually speed up single-user decode?',
        options: [
          'Fewer bytes of weights have to be read from memory for each token',
          'It doubles the number of tensor cores',
          'It removes the need for a KV cache',
          'It increases the memory bandwidth of the GPU',
        ],
        answer: 0,
        why: 'Speed is set by bytes read per step. Weights at 4 bits take roughly a quarter of the bytes of FP16, so the ceiling rises close to four times, less overheads.',
      },
      {
        q: 'A datasheet prints one compute figure marked "with sparsity" and a smaller one without. Your model\'s weights are not structured for sparsity. Which figure should you use to compare GPUs?',
        options: [
          'The larger sparse figure, because it is the peak',
          'The dense figure, because most models do not use sparsity',
          'The average of the two',
          'Neither: compare power draw instead',
        ],
        answer: 1,
        why: 'The sparsity figure only applies if the weights are structured for it, and most models are not. The dense figure is the one that reflects what you will actually get.',
      },
    ],
  },

  'infra/gpu-and-accelerator-instances': {
    takeaways: [
      'Each cloud has families for large-scale training (AWS P, Azure ND, Google A3 and A4) and for inference and fine-tuning (AWS G, Azure NC, Google G2).',
      'AWS Trainium and Inferentia and Google TPUs use their own software stacks, not CUDA, so they can cost less but need porting work.',
      'Access is often harder than choice: Azure starts GPU quota at zero, Google A3 Ultra and A4 cannot be created on demand (they need Spot, Flex-start or a future reservation), and AWS uses Capacity Blocks.',
      'Reserve for steady or guaranteed work, use Spot only for interruptible work with checkpoints, and re-check instance lists because they change often.',
    ],
    prereq: ['infra/reading-a-gpu-spec-sheet'],
    play: [
      { label: 'Play Fit the Model', href: '/play/fit-the-model/' },
      { label: 'Open the GPU tool', href: '/tools/gpu/' },
      { label: 'Open the break-even tool', href: '/tools/breakeven/' },
    ],
    quiz: [
      {
        q: 'Your team has a new Azure subscription and wants an ND H100 v5 VM today. What is the likely blocker?',
        options: [
          'ND H100 v5 can only be created with a single GPU',
          'Azure does not sell NVIDIA GPUs',
          'GPU VM series start with zero vCPU quota per region, so you must request an increase first',
          'ND VMs can only be used for visualization',
        ],
        answer: 2,
        why: 'Every Azure subscription starts with zero quota for GPU series in each region. Even with quota, capacity in the region is not guaranteed.',
      },
      {
        q: 'You want to serve an 8B model, quantized, with the lowest cost and no need for multi-GPU. Which is the most sensible starting point?',
        options: [
          'An 8-GPU Blackwell node',
          'A single 24 GB class GPU instance such as AWS G6 (L4) or Google G2',
          'A multi-node ND cluster with InfiniBand',
          'A TPU superpod',
        ],
        answer: 1,
        why: 'A quantized 8B model fits comfortably in 24 GB, so an inference-class single GPU is enough. Big training nodes would waste money.',
      },
      {
        q: 'Which workload is the best fit for Spot or preemptible GPUs?',
        options: [
          'A latency-sensitive chat endpoint with no fallback',
          'A fine-tuning job that checkpoints often and can resume',
          'A reserved cluster for a deadline-bound pretraining run with no checkpoints',
          'A payment-processing service',
        ],
        answer: 1,
        why: 'Spot capacity can be taken back at short notice. A job that saves checkpoints loses little when interrupted. Latency-critical services need a fallback.',
      },
      {
        q: 'Your team needs a block of large GPUs on AWS for a two-week fine-tuning run that starts on a date you choose. Which route does the lesson point to?',
        options: [
          'Spot instances, which cannot be taken back once they start',
          'On-demand instances, because large GPU instances are always available',
          'EC2 Capacity Blocks for ML, which reserve GPUs for a fixed period starting at a chosen date',
          'An Azure NV series VM, the large-scale training family',
        ],
        answer: 2,
        why: 'Large GPU instances are often obtained through Capacity Blocks, which fix the period and start date. Spot capacity can be taken back, availability is a separate question from price, and NV VMs are for visualization.',
      },
    ],
  },

  'infra/multi-gpu-parallelism-and-interconnect': {
    takeaways: [
      'Data parallelism copies the model, tensor parallelism cuts each layer across GPUs, pipeline parallelism splits layers into stages, and expert parallelism spreads mixture-of-experts experts.',
      'Tensor parallelism all-reduces in every layer, so it needs NVLink-class bandwidth and stays inside one node.',
      'Pipeline parallelism sends small messages between stages, so it tolerates the slower InfiniBand or EFA links between nodes, at the cost of a pipeline bubble.',
      'Do not split a model unless you must. Fit it on one GPU if you can and replicate for throughput.',
    ],
    prereq: ['infra/reading-a-gpu-spec-sheet'],
    play: [
      { label: 'Play Fit the Model', href: '/play/fit-the-model/' },
      { label: 'Open the memory tool', href: '/tools/memory/' },
    ],
    quiz: [
      {
        q: 'A 70B model in FP16 needs about 140 GB for weights. You have 80 GB GPUs in one NVLink-connected 8-GPU server. What is the usual approach?',
        options: [
          'Use tensor parallelism across several GPUs in the server, leaving space for the KV cache',
          'Use pipeline parallelism across two data centres',
          'Run it on one GPU and let it spill to disk',
          'Use data parallelism, which splits the weights',
        ],
        answer: 0,
        why: 'The model must be split, and tensor parallelism works well on fast NVLink inside a node. Data parallelism copies the whole model, so it would not fit.',
      },
      {
        q: 'Why is tensor parallelism usually kept inside one node?',
        options: [
          'It needs the most GPU memory',
          'It all-reduces activations in every layer, which is too slow over inter-node links',
          'It cannot run on InfiniBand at all, by design of the CUDA toolkit',
          'It only works on GPUs with the same serial number',
        ],
        answer: 1,
        why: 'Tensor parallelism communicates twice per layer per step, so it depends on NVLink-level bandwidth and low latency. Inter-node links are around an order of magnitude slower.',
      },
      {
        q: 'What is the pipeline bubble?',
        options: [
          'Extra memory used by the KV cache',
          'Gradient noise that appears in pipeline training',
          'A network error between two nodes',
          'Idle time on GPUs while the pipeline fills and drains, reduced by using more micro-batches',
        ],
        answer: 3,
        why: 'Early stages wait at the start and late stages wait at the end. More micro-batches per stage shrinks the idle fraction, as described in the GPipe paper.',
      },
      {
        q: 'A 405B model needs about 810 GB of weights in FP16, and an 8x H100 node has 640 GB of memory. Which option fits the lesson\'s advice?',
        options: [
          'Add data-parallel replicas, so each GPU needs less memory',
          'Run it as it is, because eight GPUs share their memory',
          'Use FP8 weights (about 405 GB) on the one node, or a node with more memory such as 8x H200',
          'Use tensor parallelism across two nodes joined by InfiniBand, which is preferred for latency',
        ],
        answer: 2,
        why: 'In FP8 the weights are about 405 GB and fit in the node; an 8x H200 node has about 1.1 TB. Data parallelism copies the whole model to every GPU, and tensor parallelism is kept inside a node because inter-node links are an order of magnitude slower.',
      },
    ],
  },

  'infra/training-infrastructure': {
    takeaways: [
      'A training cluster is nodes with GPUs, a fast network fabric, shared storage and a scheduler such as Slurm or Kubernetes.',
      'Mixed-precision training with Adam needs about 16 bytes per parameter before activations, which is why even a 7B model does not fit on one 80 GB GPU.',
      'FSDP and ZeRO shard optimizer state, gradients and parameters across GPUs, trading extra communication for much less memory per GPU.',
      'At scale, failures are routine (Llama 3 saw 419 unexpected interruptions in 54 days), so frequent checkpoints and automatic recovery are required.',
    ],
    prereq: ['infra/multi-gpu-parallelism-and-interconnect', 'foundations/training-pipeline'],
    play: [
      { label: 'Open the memory tool', href: '/tools/memory/' },
      { label: 'Open the break-even tool', href: '/tools/breakeven/' },
    ],
    quiz: [
      {
        q: 'Which statement about training memory is correct?',
        options: [
          'Training needs only the weights, the same as inference',
          'Training needs weights, gradients, optimizer state and activations, so it needs several times the memory of inference',
          'The optimizer state is small and can be ignored',
          'Activations are the same size regardless of batch size',
        ],
        answer: 1,
        why: 'With Adam and mixed precision it is about 16 bytes per parameter before activations, and activations grow with batch size and sequence length.',
      },
      {
        q: 'What does ZeRO stage 3 (or FSDP full sharding) do?',
        options: [
          'Copies the full model to every GPU',
          'Compresses the training data',
          'Splits each layer across GPUs without any communication',
          'Shards optimizer state, gradients and parameters across GPUs and gathers parameters just in time',
        ],
        answer: 3,
        why: 'Sharding everything cuts per-GPU memory roughly in proportion to the number of GPUs. The cost is gathering parameters before use and scattering gradients afterwards.',
      },
      {
        q: 'A run on thousands of GPUs checkpoints every 6 hours and a node fails on average every 3 hours. What is the main problem?',
        options: [
          'Checkpoints use too much network',
          'Each failure loses about 3 hours of work on average, so checkpoints need to be far more frequent',
          'Checkpointing makes the model less accurate',
          'Spot capacity cannot be used',
        ],
        answer: 1,
        why: 'On average a failure loses half a checkpoint interval. Frequent, fast, asynchronous checkpoints keep the lost work small.',
      },
      {
        q: 'A 70B model has about 1.1 TB of training state at 16 bytes per parameter. With full sharding (FSDP or ZeRO stage 3) across 64 GPUs, roughly how much state does each GPU hold?',
        options: [
          'About 1.1 TB, the same as without sharding',
          'About 70 GB',
          'About 280 GB',
          'About 17.5 GB',
        ],
        answer: 3,
        why: '16 bytes divided by 64 GPUs is a quarter of a byte per parameter, so 70 billion parameters come to about 17.5 GB, leaving room for activations. Without sharding every GPU would need the full 1.1 TB.',
      },
    ],
  },

  'infra/kubernetes-and-autoscaling-for-inference': {
    takeaways: [
      'Kubernetes sees GPUs only through a device plugin. Request whole GPUs in the pod limits and taint the GPU node pool.',
      'LLM replicas cold-start slowly (node, image pull, weight load, warm-up), so keep images small, cache weights and keep a warm minimum.',
      'Scale on queue depth, requests or tokens in flight and KV cache use, because CPU and basic GPU utilisation do not show saturation.',
      'Make readiness mean the model is loaded and generating, roll out one replica at a time, and drain streams before termination.',
    ],
    prereq: ['serving/life-of-a-request', 'infra/multi-gpu-parallelism-and-interconnect'],
    play: [
      { label: 'Play Incident Room', href: '/play/incident-room/' },
      { label: 'Open the break-even tool', href: '/tools/breakeven/' },
    ],
    quiz: [
      {
        q: 'Why is CPU use a poor autoscaling signal for an LLM server?',
        options: [
          'CPUs cannot be monitored in Kubernetes',
          'The CPU often stays low while the GPU is saturated, so it does not reflect load',
          'LLM servers do not use CPUs at all',
          'CPU use is always at 100 percent',
        ],
        answer: 1,
        why: 'The heavy work happens on the GPU, so a saturated server can show a quiet CPU. Queue depth and KV cache use track the real limit.',
      },
      {
        q: 'Which is the best primary autoscaling signal for a vLLM-style serving replica?',
        options: [
          'Node disk usage',
          'Pod restart count',
          'Number of requests waiting in the queue, together with KV cache utilisation',
          'The container image size',
        ],
        answer: 2,
        why: 'Waiting requests show that demand exceeds capacity right now, and a nearly full KV cache shows the replica cannot take more. Both come from the engine.',
      },
      {
        q: 'What is the main cost of scale-to-zero for an interactive chat product?',
        options: [
          'The first request after idle waits for a full cold start, possibly minutes',
          'It makes the GPU hardware wear out',
          'Kubernetes forbids it for GPU pods',
          'It deletes the model weights from storage',
        ],
        answer: 0,
        why: 'Starting a replica means a node, an image pull and weight loading. For interactive use keep at least one warm replica.',
      },
      {
        q: 'New replicas take several minutes to become ready, and the container image includes 100 GB of model weights. What does the lesson recommend?',
        options: [
          'Bake the weights into the image so there is only one thing to download',
          'Keep the image small, keep the weights separate, and cache both on the node',
          'Use a short liveness timeout so a slow pod is replaced quickly',
          'Scale to zero so replicas are rarely cold',
        ],
        answer: 1,
        why: 'The lesson\'s fix for slow starts is a small image with the weights kept separate and cached on the node. A short liveness timeout would kill a pod that is simply still loading, and baking in 100 GB of weights is what it says not to do.',
      },
    ],
  },

  'infra/gpu-observability-and-capacity-planning': {
    takeaways: [
      'Watch saturation signals (queue depth, KV cache use, time to first token), because reported GPU utilisation only says a kernel was running.',
      'Use DCGM-style metrics for memory, temperature, power, throttling and error codes, and combine them with the engine metrics.',
      'Load test with real prompt and output lengths and a fixed arrival rate, and take capacity as the throughput at which your SLOs still hold.',
      'Fleet size is peak tokens per second divided by tested tokens per second per GPU, plus headroom and one spare replica.',
    ],
    prereq: ['infra/kubernetes-and-autoscaling-for-inference', 'infra/reading-a-gpu-spec-sheet'],
    play: [
      { label: 'Play Cost Crunch', href: '/play/cost-crunch/' },
      { label: 'Open the break-even tool', href: '/tools/breakeven/' },
      { label: 'Open the GPU tool', href: '/tools/gpu/' },
    ],
    quiz: [
      {
        q: 'A GPU shows 95 percent utilisation but p95 time to first token is fine and the queue is empty. What does that suggest?',
        options: [
          'The GPU is overloaded and needs replacing',
          'The GPU is busy but not saturated, because utilisation only says kernels were running',
          'The KV cache is full',
          'DCGM is broken',
        ],
        answer: 1,
        why: 'Utilisation is the share of time any kernel ran. With an empty queue and healthy latency there is spare capacity, so it is not saturation.',
      },
      {
        q: 'Peak traffic is 4,000 output tokens per second. One GPU sustains 1,000 at your SLO. You want to run at most 80 percent of that and keep one spare. How many GPUs?',
        options: [
          '4',
          '5',
          '6',
          '8',
        ],
        answer: 2,
        why: '4,000 / (1,000 x 0.8) = 5, plus one spare gives 6.',
      },
      {
        q: 'Why should a load test use realistic prompt and output lengths?',
        options: [
          'Because shorter prompts make the GPU run hotter',
          'It is needed only to test the network',
          'It makes tests finish sooner',
          'Capacity depends strongly on lengths, since long prompts add prefill work and KV cache use',
        ],
        answer: 3,
        why: 'Prefill cost and KV cache memory scale with length, so a test with short prompts overstates the capacity you will really get.',
      },
      {
        q: 'One replica gets slower with no errors in the logs, and its GPU is running hot. What does the lesson say is likely happening, and what should you watch?',
        options: [
          'Thermal throttling: the GPU lowers its clocks, so watch temperature, clocks and throttle reasons',
          'Memory fragmentation, which would show up as allocation failures in the logs',
          'A noisy neighbour, which you would see directly in your own request metrics',
          'A traffic spike, which you can only see by raising the replica count',
        ],
        answer: 0,
        why: 'An overheating or power-capped GPU lowers its clocks, so throughput drops with no error. Fragmentation causes out-of-memory errors, and a noisy neighbour shows up as erratic latency while your own metrics look normal.',
      },
    ],
  },
};
