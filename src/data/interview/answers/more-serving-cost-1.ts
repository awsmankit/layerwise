import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  "prefill-vs-decode-memory-bound": {
    short:
      "Prefill reads the whole prompt in one parallel pass, fills the KV cache (the stored keys and values of every earlier token) and produces the first output token, so it sets time to first token (TTFT). Decode then writes one token per step, so it sets the time between tokens and the total reply time. Decode is limited by memory bandwidth because every step must read all the model weights from GPU memory to do only about one multiply-add per weight, while an H100-class GPU can do roughly 300 operations for every byte it reads.",
    explain: [
      {
        heading: "Two phases, two latency numbers",
        body: "A language model does not write a reply in one go. In prefill it processes the whole prompt at once: all prompt tokens go through every layer together, the model stores a key and a value for each token in each layer (the KV cache), and it produces the first output token. The wait for that first token is time to first token (TTFT), and it grows with prompt length. In decode the model then writes the reply one token per step. Each step feeds in the newest token, reads the cache, appends one more entry and produces the next token. The gap between tokens is the inter-token latency, and it multiplies by the reply length to give the total generation time.",
      },
      {
        heading: "Why decode waits on memory",
        body: "Every decode step must read every weight from GPU memory, plus the KV cache of the sequence. With one sequence, each weight is read once and used for about one multiply-add. In 16-bit numbers a weight is 2 bytes and a multiply-add is 2 operations, so that is about 1 operation per byte read. An H100-class card can do about 990 trillion operations a second but read only about 3.35 trillion bytes a second, which is 990 / 3.35, about 300 operations per byte. Decode uses about 1 of those 300, so the arithmetic units sit idle waiting for data. Prefill is the opposite: a 2,000-token prompt uses each weight it reads 2,000 times, about 2,000 operations per byte, so prefill is limited by compute. The speed limit for one stream is therefore bandwidth divided by weight bytes: an 8B model in BF16 is 16 GB, and 3.35 TB/s / 16 GB is about 209, so at most about 200 tokens per second.",
      },
      {
        heading: "Batching is the fix, and where it stops",
        body: "Because the weights are read anyway, one read can serve many sequences at once: the step does one token for each of them. The step gets only a little slower, because each extra sequence adds only its own KV reads (about 262 MB for a 2,000-token sequence on this model), so total throughput rises almost in step with the batch. In the example below, 64 sequences give about 32 times the throughput of one while each user still sees about half the speed. The rise stops when compute becomes the limit (roughly a few hundred sequences for this card, ignoring KV reads) or when the KV cache fills memory. Note that batching makes the total faster, not each individual user.",
      },
      {
        heading: "What follows in practice",
        body: "Quantising weights to 8 or 4 bits makes decode faster because fewer bytes are read per step. Long prompts hurt TTFT because prefill grows with prompt length, and they hurt decode too, because the cache read grows. Output tokens are the expensive ones because each needs a full pass over the weights while input tokens are processed in bulk, which is why API prices for output are usually several times the price for input.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "tokens per second, all users together",
      items: [
        { label: "1 sequence", value: 206, note: "206 per user" },
        { label: "16 sequences", value: 2654, note: "166 per user" },
        { label: "64 sequences", value: 6541, note: "102 per user", hot: true },
        { label: "128 sequences", value: 8653, note: "68 per user" },
      ],
      caption: "An 8B model in BF16 on a 3.35 TB/s card, each sequence holding 2,000 tokens of cache. Step time is (16 GB + cache) divided by bandwidth, at peak bandwidth, so real numbers are lower.",
    },
    example: {
      title: "Example: one decode step for an 8B model",
      text: "Assumptions: 16 GB of weights, 2,000 tokens of KV cache per sequence at 128 KiB per token (about 262 MB), 3.35 TB/s of bandwidth at its peak, and 990 TFLOPS of compute. Real kernels reach perhaps 70 to 90 percent of peak bandwidth.",
      rows: [
        { label: "Operations per byte the GPU can do", value: "990 / 3.35, about 300" },
        { label: "Operations per byte in decode, one sequence", value: "about 1" },
        { label: "Single-sequence ceiling", value: "3.35 TB/s / 16 GB, about 209 tokens per second" },
        { label: "Step time at 1 sequence", value: "16 GB / 3.35 TB/s = 4.8 ms" },
        { label: "Step time at 64 sequences", value: "(16 + 64 x 0.262) GB / 3.35 TB/s = 9.8 ms" },
        { label: "Total throughput at 64", value: "64 / 9.8 ms, about 6,500 tokens per second" },
      ],
    },
    followUps: [
      {
        q: "A user sends a 100,000-token document and asks for a short answer. Which phase dominates and what does the user notice?",
        a: "Prefill dominates, so the user waits a long time for the first word: about 1.6e15 operations at roughly half of 990 TFLOPS is over 3 seconds on this card, before queueing. Decode is also a little slower per token because each step reads a cache of about 13 GB, and prefix caching helps if the same document is used again.",
      },
      {
        q: "Why does per-user speed fall only slowly when you raise the batch from 1 to 16, while total throughput rises a lot?",
        a: "The weight read is shared by the whole batch, so the step time grows only by the extra KV reads, from 4.8 to 6.0 ms in the example. Each step now yields 16 tokens instead of 1, so the total rises about 13 times.",
      },
      {
        q: "At what point does a large decode batch stop being memory-bound?",
        a: "When the operations per step approach what the card can do per byte it moves, which for an H100-class card is a batch of a few hundred sequences. It happens earlier when the KV cache reads dominate the bytes moved.",
      },
    ],
    mistakes: [
      "Saying decode is slow because the GPU lacks compute, and proposing a card with more TFLOPS but the same bandwidth.",
      "Thinking the whole answer is written in one forward pass instead of one token per step.",
      "Believing batching makes each individual user faster: it raises the total, and each user usually gets slightly slower.",
    ],
  },

  "energy-estimate-for-an-ai-feature": {
    short:
      "Multiply power by time by facility overhead: 16 GPUs x 550 W x 24 h x 1.2 PUE is about 253 kWh a day, which over 3 million requests is about 0.085 Wh per request. On the example grid of 400 g CO2e per kWh that is about 101 kg of CO2e a day, or about 0.034 g per request. The figure leaves out hardware manufacture, other servers, spare capacity and training, so give it as a dated range with its assumptions and measure to improve it.",
    explain: [
      {
        heading: "Energy is power times time times overhead",
        body: "Watts measure power, a rate. Watt-hours (Wh) and kilowatt-hours (kWh) measure energy, an amount: a 1,000 W heater running for one hour uses 1 kWh. The 16 GPUs draw 16 x 550 W = 8,800 W, which is 8.8 kW. Running around the clock for 24 hours that is 8.8 x 24 = 211.2 kWh. A data centre also spends energy on cooling and power conversion, and power usage effectiveness (PUE) is the ratio of the facility's total energy to the energy that reaches the computers. A PUE of 1.2 means 20 percent extra, so 211.2 x 1.2 = 253.4 kWh a day, about 92.5 MWh a year. Dividing by 3 million requests gives 0.0845 Wh, about 85 milliwatt-hours per request. For a 400-token reply (an example) that is about 0.21 mWh per token.",
      },
      {
        heading: "Carbon depends on where and when",
        body: "Carbon is energy times the grid's carbon intensity, the grams of CO2 equivalent (CO2e) emitted per kWh. At the example 400 g per kWh, 253.4 kWh gives 253.4 x 0.4 = 101 kg a day, or 0.034 g per request. The same service on a 12 g per kWh grid would be about 3 kg a day, and on an 820 g per kWh grid about 208 kg. That spread is 820 / 12, about 68 times, which is why choosing the region, and sometimes the time of day, matters as much as any tuning of the model.",
      },
      {
        heading: "What the number leaves out",
        body: "The 550 W is the GPU. The host computers, network and storage add to it unless they are included. Spare or idle capacity still draws power, so a service that is half busy has a worse figure than the arithmetic suggests per useful request. The number also leaves out making the hardware, training the model, the user's own device and water used for cooling and electricity. The boundary chosen (chip only, whole server, whole facility, whole life cycle) can change a published figure by two times or more, and published per-query numbers are mostly company self-reports with different boundaries and dates, so they cannot be lined up like a league table.",
      },
      {
        heading: "Three levers, and how to present the result",
        body: "First, use the smallest model that passes your tests and send easy requests to it. Second, use fewer tokens: shorter outputs, caps on reasoning, caching of repeated work. Third, keep the GPUs busy with batching, because idle machines still draw power: if batching lets the same 16 GPUs serve 6 million requests, the energy per request roughly halves to about 0.042 Wh, though power draw rises somewhat under load. Further options are quantising the model, running small models on the device, and choosing a cleaner region. Present the result as a range with the date and the assumptions, and recommend measuring real power with an open measurement tool instead of guessing.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "power", label: "GPU power", sub: "16 x 550 W = 8.8 kW" },
        { id: "time", label: "Around the clock", sub: "x 24 h = 211.2 kWh" },
        { id: "pue", label: "Facility overhead", sub: "x 1.2 PUE = 253.4 kWh a day" },
        { id: "req", label: "Per request", sub: "/ 3 million = 0.085 Wh" },
        { id: "co2", label: "Carbon", sub: "x 0.4 kg per kWh = 101 kg a day" },
      ],
      highlight: ["pue", "req"],
      caption: "Each step multiplies or divides the one before it. The 400 g per kWh grid figure is an example.",
    },
    example: {
      title: "Example: the full estimate with a range of grids",
      text: "Using the question's numbers: 16 GPUs at 550 W, 24 hours, PUE 1.2, 3 million requests a day. The grid intensities of 12, 400 and 820 g CO2e per kWh are example figures for a very clean, a middling and a dirty grid.",
      rows: [
        { label: "Energy a day", value: "16 x 0.55 kW x 24 h x 1.2 = 253.4 kWh" },
        { label: "Energy per request", value: "253.4 kWh / 3 million = 0.085 Wh" },
        { label: "Per token (400-token reply)", value: "about 0.21 mWh" },
        { label: "Carbon on the 400 g grid", value: "253.4 x 0.4 = 101 kg a day, 0.034 g per request" },
        { label: "Carbon on a 12 g grid", value: "about 3 kg a day" },
        { label: "Carbon on an 820 g grid", value: "about 208 kg a day" },
        { label: "Per year", value: "about 92.5 MWh" },
      ],
    },
    followUps: [
      {
        q: "Batching lets the same 16 GPUs serve 6 million requests a day. What happens to energy per request?",
        a: "It roughly halves, to about 253.4 kWh / 6 million = 0.042 Wh, if power draw stays similar. In practice a busier GPU draws somewhat more power, so measure it instead of assuming exactly half.",
      },
      {
        q: "Marketing wants one claim: \"an AI query uses X\". How do you respond?",
        a: "Ask for the boundary (chip, server or facility), the date, the source, whether it is a median or a mean, and which model and prompt it describes. Without those the number cannot be compared, and false precision from rough inputs invites a challenge.",
      },
      {
        q: "What about water?",
        a: "Figures that count only on-site cooling water and figures that also include the water behind electricity generation and chip manufacture can differ by more than 100 times. Define the boundary first, then quote it.",
      },
    ],
    mistakes: [
      "Forgetting the facility overhead (PUE) and reporting the GPU energy alone as the whole.",
      "Mixing up W, kW, Wh and kWh: power is a rate and energy is an amount, so always carry the units through the arithmetic.",
      "Quoting a competitor's per-query number as directly comparable when the boundary and date are unknown.",
      "Stating the result to three significant figures when the inputs are rough.",
    ],
  },

  "continuous-batching-pagedattention-flashattention": {
    short:
      "Continuous batching fixes idle GPU slots by letting the scheduler add and remove sequences at every step, so short replies free their slot at once. PagedAttention fixes wasted KV-cache memory by storing the cache in small fixed-size blocks allocated on demand, like pages in virtual memory, so many more sequences fit. FlashAttention computes exact attention in small tiles kept in fast on-chip memory so the huge score matrix is never written out. The first two mostly raise decode throughput and concurrency, while FlashAttention mostly speeds prefill and long sequences.",
    explain: [
      {
        heading: "Continuous batching: do not wait for the slowest reply",
        body: "A batch is a group of sequences the GPU advances together, one token per step. In static batching the server starts a group and waits until the longest reply in it finishes before it starts the next. Take 8 replies of 20, 30, 40, 60, 80, 100, 300 and 500 tokens: the batch runs 500 steps, so 8 x 500 = 4,000 slot-steps are available but only 1,130 are used, about 28 percent, and every user whose reply is short waits for the 500-token one. Continuous batching (also called iteration-level or in-flight batching) lets the scheduler change the batch at every step: a finished sequence leaves immediately and a waiting request takes its slot. Chunked prefill goes with it: a long prompt is split into pieces so that processing it does not stall the sequences that are already decoding.",
      },
      {
        heading: "PagedAttention: stop wasting cache memory",
        body: "The KV cache grows as a reply grows, and the final length is not known in advance. Older engines reserved one contiguous block for the maximum length of every request. On an 8B model at 128 KiB per token, reserving 4,096 tokens is 512 MiB, while a request that ends at 600 tokens uses 75 MiB, so about 85 percent of the reservation is wasted, and holes between reservations waste more. PagedAttention instead stores the cache in fixed-size blocks, for example 16 tokens (2 MiB here), handed out on demand and tracked by a block table per sequence, exactly like the pages of an operating system. Waste is limited to the last partly filled block, under 2 MiB per sequence. Sharing also becomes cheap: sequences with the same system prompt or parallel samples of one prompt can point at the same blocks (copy-on-write if one diverges), which is the basis of prefix caching. If memory runs out the engine can preempt a sequence by swapping its blocks out or recomputing them later.",
      },
      {
        heading: "FlashAttention: do not write the big matrix out",
        body: "Attention compares every token with every earlier token. Written naively it builds an N x N score matrix: for N = 8,192 that is 67 million scores, about 134 MB per head per layer at 2 bytes each, written to and read back from the GPU's main memory (HBM), which is slow compared with the arithmetic. FlashAttention is not an approximation. It gives the same exact result by working on tiles of the queries, keys and values that fit in the fast on-chip memory (SRAM) and keeping a running softmax (an online update of the maximum and the sum), so the full matrix is never stored. Memory for attention then grows linearly with sequence length, and traffic to HBM drops, which is what makes it faster. For decode, where there is one query, specialised versions split the cache across thread blocks so that the whole GPU is still used.",
      },
      {
        heading: "Which phase each one helps",
        body: "Continuous batching and paging mainly help decode, the one-token-at-a-time phase, because they keep many sequences in the batch and fit their caches in memory, and decode throughput scales with the number of sequences. FlashAttention mainly helps prefill and training, where long sequences make the N x N matrix large. The three work together in one engine: a high-throughput server needs a scheduler that keeps the batch full, a memory manager that fits it, and a fast attention kernel.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["Continuous batching", "PagedAttention", "FlashAttention"],
      rows: [
        { label: "Problem", cells: ["Slots sit idle until the longest reply ends", "Cache memory reserved for the maximum length is mostly wasted", "The N x N score matrix is slow to move in and out of memory"] },
        { label: "How it works", cells: ["Add and remove sequences at every step; chunk long prompts", "Fixed-size blocks on demand, block table per sequence, shared prefixes", "Exact attention in on-chip tiles with a running softmax"] },
        { label: "Mainly helps", cells: ["Decode throughput and waiting time", "Decode concurrency (how many sequences fit)", "Prefill, training and long sequences"] },
        { label: "Changes the answer?", cells: ["No", "No", "No, it is exact"] },
      ],
      caption: "Three separate fixes that serving engines such as vLLM combine.",
    },
    example: {
      title: "Example: the numbers behind each fix",
      text: "An 8B model with 32 layers, 8 KV heads and head size 128 uses 2 x 32 x 8 x 128 x 2 bytes = 131,072 bytes (128 KiB) of cache per token. The batch of 8 reply lengths is an example.",
      rows: [
        { label: "Static batch of 8 replies (20 to 500 tokens)", value: "1,130 of 4,000 slot-steps used, about 28 percent" },
        { label: "Reserved for 4,096 tokens", value: "4,096 x 128 KiB = 512 MiB per request" },
        { label: "Actually used by a 600-token request", value: "75 MiB, so about 85 percent wasted" },
        { label: "One 16-token block", value: "16 x 128 KiB = 2 MiB" },
        { label: "Score matrix at N = 8,192", value: "67 million scores, about 134 MB per head per layer" },
      ],
    },
    followUps: [
      {
        q: "Chunked prefill improves inter-token latency for running requests. What does it cost?",
        a: "A long prompt now takes several steps to prefill, so its own time to first token can rise slightly. Chunk size trades that against smooth decoding for everyone else, and some systems instead put prefill and decode on separate GPUs.",
      },
      {
        q: "Your RAG service sends a 2,000-token system prompt with every request. How do these features interact with that?",
        a: "Paged blocks let prefix caching reuse the stored cache for the shared prompt, so prefill only processes the new tokens. Put the fixed text first in the prompt, and route requests with the same prefix to the same replica so the cache is hit.",
      },
      {
        q: "FlashAttention's backward pass recomputes attention instead of storing it. Why is that a good trade?",
        a: "Recomputing from the queries, keys, values and a few saved softmax statistics costs extra arithmetic but avoids storing and re-reading an N x N matrix. Memory traffic is the bottleneck on modern GPUs, so it is faster overall and uses far less memory.",
      },
    ],
    mistakes: [
      "Describing FlashAttention as an approximate or sparse attention method: it is exact, only reorganised.",
      "Thinking PagedAttention's main job is moving the cache to CPU memory: swapping is an extra, the main idea is small on-demand blocks.",
      "Being unable to say why idle slots appear under static batching: the batch waits for its longest reply.",
    ],
  },

  "quantization-tradeoffs-for-serving": {
    short:
      "Quantizing stores numbers in fewer bits, but the options speed up different things: weight-only 8 or 4-bit shrinks the model and speeds memory-bound decode, FP8 or INT8 for weights and activations also speeds compute-bound work on supported hardware, and a quantized KV cache raises how many sequences fit. It is safe to ship only after your own task evals, at your real request mix, match the full-precision baseline closely enough, and after a benchmark shows a real gain on your kernels. Judge it by cost per successful task at the latency target, not by bits per weight.",
    explain: [
      {
        heading: "Three different things you can quantize",
        body: "Weight-only quantization (8-bit or 4-bit, GPTQ- or AWQ-style methods) shrinks the 70B model's weights from about 140 GB in BF16 to about 70 GB or about 35 GB, so it fits on fewer GPUs and each decode step reads fewer bytes. The matrix multiplication itself is usually still done in 16-bit after converting the weights back, so compute-bound prefill and very large batches gain little. Weight-plus-activation formats (FP8, or INT8 W8A8 such as SmoothQuant) also use the low-precision tensor cores, so they speed up compute too, but need hardware support: FP8 needs Ada, Hopper or newer GPUs. KV-cache quantization to FP8 or INT8 halves the cache, so more sequences or longer contexts fit. It is separate from weight quantization and has its own accuracy risk at long contexts.",
      },
      {
        heading: "Why it is not free, and why speedups are less than the bit count",
        body: "Activations contain a few very large outliers that are hard to squeeze into 8 bits, so methods use per-channel or per-group scales, outlier handling and calibration data, which should look like your production traffic. Scales and zero points add some bytes, KV reads do not shrink with weight quantization, dequantizing costs compute, and kernels rarely reach peak bandwidth. So 4-bit weights, a quarter of the bytes of BF16, do not give four times the speed. And a format with no fast kernel in your engine and on your GPU can be slower than BF16. Run a benchmark with your own request mix.",
      },
      {
        heading: "Deciding whether it is safe to ship",
        body: "Eight-bit is usually close to the original, while 4-bit can degrade, often first on maths, code, long-context inputs and languages other than English. Perplexity alone does not show this. Run your own task evals, with slices that matter (key customers, languages, safety), and compare with the BF16 baseline, using enough cases that a one-point difference means something. Then compare cost per successful task at the latency target, for example fewer GPUs per replica or more replicas per node. Roll it out as a canary with online metrics and keep the BF16 route as a fallback.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["Weight-only (8 or 4 bit)", "Weights and activations (FP8, INT8)", "KV cache (FP8, INT8)"],
      rows: [
        { label: "What shrinks", cells: ["Weights: 140 GB to 70 or 35 GB for 70B", "Weights, and the arithmetic itself", "Cache: about half"] },
        { label: "What speeds up", cells: ["Memory-bound decode, fewer GPUs per replica", "Decode and compute-bound prefill, large batches", "Concurrency and long contexts"] },
        { label: "Needs", cells: ["A fast kernel in your engine", "Hardware support, for FP8 Ada, Hopper or newer", "Engine support for a quantized cache"] },
        { label: "Main risk", cells: ["4-bit quality on maths, code, long context", "Activation outliers; calibration data", "Long-context accuracy"] },
      ],
      caption: "Pick by which resource is the bottleneck: weight bytes, compute or cache memory.",
    },
    example: {
      title: "Example: what 4-bit weights could do for a 70B model",
      text: "Assumptions: 80 GB GPUs with 3.35 TB/s each, and an example price of $4 an hour per GPU. The second half shows how a small quality loss enters the comparison; the success rates and throughput are invented for the illustration.",
      rows: [
        { label: "BF16 weights", value: "70e9 x 2 bytes = 140 GB: at least 2 GPUs" },
        { label: "4-bit weights", value: "70e9 x 0.5 byte = 35 GB (a little more with scales): 1 GPU with room for cache" },
        { label: "Single-stream ceiling, BF16 on 2 GPUs", value: "6.7 TB/s / 140 GB, about 48 tokens per second, 24 per GPU" },
        { label: "Single-stream ceiling, 4-bit on 1 GPU", value: "3.35 TB/s / 35 GB, about 96 tokens per second, 4 times per GPU (ideal)" },
        { label: "Cost per success, BF16 (example)", value: "$8 an hour / (10,000 tasks x 90%) = $0.00089" },
        { label: "Cost per success, 4-bit (example)", value: "$4 an hour / (10,000 tasks x 86%) = $0.00047" },
      ],
    },
    followUps: [
      {
        q: "4-bit weights are a quarter of the bytes of BF16. Why is decode not 4 times faster?",
        a: "Scales and zero points add bytes, the KV cache reads are not reduced, dequantizing costs compute, and kernels rarely reach peak bandwidth. At larger batches the step is also less dominated by weight reads.",
      },
      {
        q: "The quantized model scores 1 point lower on your benchmark. Ship or not?",
        a: "Check the confidence interval and the sample size first, then look at which slices regressed (safety, key customers, languages). Weigh it against the cost saving and consider a canary with online metrics.",
      },
      {
        q: "When would you quantize the KV cache but keep BF16 weights?",
        a: "When memory is dominated by the cache (long contexts or many concurrent users) and the weights already fit. It raises concurrency without touching the weights.",
      },
    ],
    mistakes: [
      "Assuming any quantization speeds up every phase equally: weight-only helps decode most, and prefill barely.",
      "Shipping a 4-bit model after checking only perplexity or a public leaderboard instead of your own tasks.",
      "Ignoring that low-precision formats need hardware and kernel support to be fast.",
    ],
  },

  "reasoning-model-cost-vs-quality": {
    short:
      "Thinking tokens are billed as output tokens, so 600 of them take a request from about $0.0023 to about $0.0083, 3.6 times as much. Per solved task it is $0.0046 without thinking and $0.0104 with it, about twice as much, for 3 more of 10 cases solved. Whether that is worth it depends on what a wrong answer costs, so do not turn it on everywhere: route by difficulty or effort setting, and decide with an eval that runs each case more than once.",
    explain: [
      {
        heading: "What thinking costs",
        body: "A reasoning model writes a stretch of working before the visible answer. Providers bill all of it as output tokens, the full thinking and not the short summary you may be shown, and it also takes space in the context window. It adds waiting time too, because thinking comes before the answer, and the output limit must leave room for the thinking plus the answer or the response can stop before any visible answer appears. At $2 per million input tokens and $10 per million output tokens: without thinking, 400 x $2 / 1,000,000 = $0.0008 plus 150 x $10 / 1,000,000 = $0.0015, so $0.0023. With 600 thinking tokens the output is 750 tokens, so $0.0008 + $0.0075 = $0.0083, which is 3.6 times as much.",
      },
      {
        heading: "Compare cost per solved task, not per request",
        body: "A cheaper request that fails is not cheap. Over the 10 test cases without thinking the cost is 10 x $0.0023 = $0.023 for 5 solved, which is $0.0046 per solved task. With thinking it is 10 x $0.0083 = $0.083 for 8 solved, $0.0104 per solved task, about 2.3 times more. The extra $0.06 buys 3 more solved cases, so each extra solved case costs about $0.02. Thinking pays off whenever an unsolved case costs more than that, for example a human handoff at several dollars, and not when it is a cheap lookup where the plain answer is already right.",
      },
      {
        heading: "Do not use it for every request",
        body: "A one-fact lookup or a classification rarely needs thinking, while multi-step problems, coding and planning might. Route by difficulty (a cheap first pass or a rule) or use the provider's effort or thinking-budget setting per request; the names differ by provider, so check the current documentation. Keep one effort setting per conversation, because changing it can break prompt caching on some providers. Prompt for the goal, the constraints and the output format rather than dictating every step, and treat effort as a tuning knob rather than the main way to recover quality.",
      },
      {
        heading: "Decide with an eval, on real traffic numbers",
        body: "Run the same cases at two or more effort levels, more than once each because the amount of thinking varies, and compare pass rate, output tokens and time. Treat 5 against 8 on 10 cases as a hint: the difference of 30 points is only about 1.5 standard errors with 10 cases, which is not convincing. Add cases from real failures, check by category, and then read the thinking-token usage the provider reports on real traffic instead of trusting an estimate.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "thousandths of a dollar",
      items: [
        { label: "Per request, no thinking", value: 2.3, note: "$0.0023" },
        { label: "Per request, thinking", value: 8.3, note: "$0.0083" },
        { label: "Per solved task, no thinking", value: 4.6, note: "$0.0046, 5 of 10 solved" },
        { label: "Per solved task, thinking", value: 10.4, note: "$0.0104, 8 of 10 solved", hot: true },
      ],
      caption: "The same support-bot call with and without 600 thinking tokens, at the example prices and the example 10-case test.",
    },
    example: {
      title: "Example: the support bot, both settings",
      text: "Prices are the question's: $2 per million input tokens and $10 per million output tokens. The 10 test cases are example numbers, so the pass rates are a hint and not a measurement.",
      rows: [
        { label: "No thinking, per request", value: "$0.0008 input + $0.0015 output = $0.0023" },
        { label: "Thinking, per request", value: "$0.0008 + 750 x $10 / 1,000,000 = $0.0083" },
        { label: "No thinking, per solved task", value: "$0.023 / 5 = $0.0046" },
        { label: "Thinking, per solved task", value: "$0.083 / 8 = $0.0104" },
        { label: "Cost of each extra solved case", value: "($0.083 - $0.023) / 3 = $0.02" },
      ],
    },
    followUps: [
      {
        q: "Ten cases is small. What do you do before changing production?",
        a: "Add cases drawn from real failures, run each case several times, and look at results by category and on a held-out set. Report the difference cautiously, with its uncertainty.",
      },
      {
        q: "The answer must start within two seconds. How does that change your choice?",
        a: "The time to the first visible token includes the thinking, so use low or no thinking for simple requests and send only the hard ones to a higher effort. Do not cap the output so tightly that thinking is cut off before the answer.",
      },
      {
        q: "Finance says the output-token bill tripled, but the dashboard shows only a short thinking summary. How do you explain and track it?",
        a: "Providers bill for the full thinking, not for the summary shown. Track the reported thinking tokens and the cost per solved task for each release version, and alert on both.",
      },
    ],
    mistakes: [
      "Treating thinking tokens as free, or as input tokens: they are billed at the output rate.",
      "Assuming higher effort is always better instead of measuring it per kind of request.",
      "Comparing only cost per request and ignoring how many tasks were solved.",
      "Setting a small output limit with thinking turned on and then being surprised by empty answers.",
    ],
  },

  "why-long-contexts-cost-more": {
    short:
      "While it writes, the model keeps a key and a value for every earlier token in every layer, called the KV cache, so it does not recompute them at each step. For an 8B-class model that is 128 KiB per token, so an 8,000-token chat holds about 1 GiB and 32 such chats at once hold about 31 GiB, nearly twice the 16 GB of the weights. A long chat costs more because that memory limits how many users fit on one GPU and because every new token must read the whole cache again.",
    explain: [
      {
        heading: "What the model keeps in memory",
        body: "To choose the next token, the model compares the newest token with every earlier one. For each earlier token and each layer it needs two vectors, a key and a value. They never change once computed, so the model stores them instead of recomputing them: that store is the KV cache. The size per token is 2 (key and value) x layers x KV heads x head dimension x bytes per value. For an 8B-class model with 32 layers, 8 KV heads, head size 128 and 2 bytes per value (16-bit) that is 2 x 32 x 8 x 128 x 2 = 131,072 bytes, which is 128 KiB for every token in the conversation. The weights are a separate, fixed 8 billion x 2 bytes = 16 GB, shared by every user.",
      },
      {
        heading: "The arithmetic for one chat and for 32",
        body: "A short exchange of 14 tokens needs 14 x 128 KiB = 1.75 MiB, almost nothing. The long chat of 8,000 tokens needs 8,000 x 128 KiB, about 1 GiB (0.98 GiB). The cache grows with every token and is never smaller than the conversation so far. Now 32 users at 8,000 tokens each are 256,000 tokens, which is about 31 GiB (about 33.5 GB). That is about twice the size of the model itself, and it would not fit on a 24 GB card at all. Each user costs the GPU a gigabyte of memory that cannot be used for anyone else, which is what limits how many people one GPU can serve.",
      },
      {
        heading: "Why it also slows things down",
        body: "Decode, the one-token-at-a-time phase, is limited by how fast memory can be read. Each new token reads all the weights and the whole cache of every sequence in the step. For one short chat a step reads about 16 GB, and on a 3.35 TB/s card that is 4.8 ms. With 32 chats of 8,000 tokens it reads 16 + 33.5 = 49.5 GB, which is 14.8 ms, so each user gets about 68 tokens per second instead of about 209 (peak-bandwidth figures, real ones are lower). So long contexts mean fewer users per GPU and a slower stream for each, and each token carries a larger share of the hardware, which is why some providers charge more above a context threshold.",
      },
      {
        heading: "Levers to shrink it",
        body: "Fewer KV heads helps most: this model's grouped-query attention (8 KV heads shared by 32 query heads) already makes the cache 4 times smaller than full multi-head attention, which would be 512 KiB per token. A lower-precision cache (FP8) halves it again. Paged allocation avoids reserving memory that is never used, prefix sharing stores a common system prompt once, shorter prompts and fewer retrieved passages cut the tokens, and summarising old history keeps long chats short. Measure quality after each change.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "tokens in the conversation",
      yLabel: "KV cache in GiB for one chat",
      points: [[1000, 0.122], [2000, 0.244], [4000, 0.488], [8000, 0.977], [16000, 1.953], [32000, 3.906]],
      marks: [{ x: 8000, label: "8,000 tokens, about 1 GiB" }],
      caption: "128 KiB per token for an 8B-class model with 8 KV heads: the cache grows in a straight line with the conversation, and 32 users multiply it by 32.",
    },
    example: {
      title: "Example: one short chat, one long chat, 32 long chats",
      text: "The model has 32 layers, 8 KV heads, head size 128 and 16-bit values. Speed uses a card with 3.35 TB/s of memory bandwidth at its peak, so real speeds are lower.",
      rows: [
        { label: "Cache per token", value: "2 x 32 x 8 x 128 x 2 = 131,072 bytes (128 KiB)" },
        { label: "14-token exchange", value: "14 x 128 KiB = 1.75 MiB" },
        { label: "One 8,000-token chat", value: "about 1 GiB" },
        { label: "32 chats of 8,000 tokens", value: "256,000 tokens, about 31 GiB (33.5 GB)" },
        { label: "Weights for comparison", value: "16 GB" },
        { label: "Step time, 1 short chat", value: "16 GB / 3.35 TB/s = 4.8 ms, about 209 tokens per second" },
        { label: "Step time, 32 long chats", value: "49.5 GB / 3.35 TB/s = 14.8 ms, about 68 tokens per second each" },
      ],
    },
    followUps: [
      {
        q: "Your provider charges more per token above a long-context threshold. Using this model, why might that be?",
        a: "Fewer requests fit on each GPU because the cache takes memory, and decoding is slower per token because each step reads more. Each token therefore uses a larger share of the hardware.",
      },
      {
        q: "You cannot add GPUs. What do you change first to serve more users?",
        a: "Cap the context or summarise history, turn on prefix caching for the shared prompt, use a lower-precision cache or a model with fewer KV heads, and use paged cache management. Measure quality after each change.",
      },
      {
        q: "Why is prefill faster per token than decoding?",
        a: "Prefill processes all prompt tokens in parallel, so each weight read is reused many times and it is limited by compute. Decoding makes one token per pass and reads the whole cache each time, so it is limited by memory bandwidth.",
      },
    ],
    mistakes: [
      "Saying the cost is only the number of billed tokens, with no mention of memory and the cache.",
      "Confusing the KV cache with the model weights: the weights are fixed and shared, the cache is per conversation.",
      "Being unable to do the per-token arithmetic from layers, heads, head size and bytes.",
      "Thinking the cache stays the same size as the conversation grows.",
    ],
  },

  "api-vs-self-hosting-break-even": {
    short:
      "At 30 percent utilisation the self-hosted server costs about 2.22 units per million tokens, slightly more than the API's 2, and the break-even is about 33 percent utilisation, so on cost alone these numbers do not justify self-hosting. The calculation is the hourly GPU cost divided by the tokens actually served per hour, and it moves further against self-hosting once you add a second server for redundancy and engineering time. I would stay on the API, cut that bill with caching and routing, and revisit if measured utilisation can reliably exceed the break-even.",
    explain: [
      {
        heading: "The formula: pay for the hour, divide by what you served",
        body: "A GPU server costs the same per hour whether it is busy or idle, so the cost per token depends on how many tokens it actually serves. Cost per million tokens = cost per hour / (tokens per second x utilisation x 3,600) x 1,000,000. Here the server sustains 2,500 tokens a second at full load and is busy 30 percent of the time, so it serves 2,500 x 0.30 x 3,600 = 2,700,000 tokens an hour. Then 6 / 2,700,000 x 1,000,000 = 2.22 units per million tokens. The API's blended price is 2. So self-hosting is about 11 percent more expensive, before any extra cost.",
      },
      {
        heading: "The break-even",
        body: "Self-hosting wins when the cost per million tokens falls below 2, which needs utilisation above 6 x 1,000,000 / (2,500 x 3,600 x 2) = 6,000,000 / 18,000,000, about 33 percent. The same thing monthly: 6 x 730 hours = 4,380 units of fixed cost, which buys the same as 4,380 / 2 = 2,190 million, 2.19 billion API tokens. The server's full capacity is 2,500 x 3,600 x 730, about 6.57 billion tokens a month, and 2.19 / 6.57 is the same 33 percent. Below about 2.19 billion tokens a month, the API is cheaper.",
      },
      {
        heading: "What moves the line",
        body: "A second server for redundancy doubles the fixed cost to 8,760 units a month, so the break-even volume doubles to about 4.38 billion tokens, and at the same traffic the cost per million doubles to about 4.44 because each server is only about 15 percent busy. Add engineer and on-call time, evals, upgrades, storage and networking. Interactive traffic is also quiet at night and at weekends, so the average utilisation is usually below the busy-hour figure. All of the inputs must be measured, not assumed: the throughput on your own input and output mix at your own latency target, and an API blended price from your own input-to-output ratio, including any caching discounts.",
      },
      {
        heading: "Recommendation",
        body: "Compare cost per successful task, after showing that the open model reaches the same quality as the API model on your own evals. Weigh the non-cost reasons (data control, latency, customisation) separately and openly. On these numbers I would recommend against self-hosting for cost alone, reduce the API bill first (caching, trimmed context, routing easy requests to a smaller model, batch pricing for offline work), and re-run the calculation when real traffic shows utilisation above the break-even.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "server utilisation in percent",
      yLabel: "self-hosted units per million tokens",
      points: [[10, 6.67], [20, 3.33], [30, 2.22], [40, 1.67], [50, 1.33], [60, 1.11], [80, 0.83], [100, 0.67]],
      marks: [{ x: 33, label: "break-even at 2 units, about 33%" }],
      caption: "Cost per million tokens is 0.667 divided by utilisation (as a fraction). The API price of 2 units is crossed at about 33 percent.",
    },
    example: {
      title: "Example: self-hosted against API, all example units",
      text: "A server at 6 units an hour that sustains 2,500 tokens a second, an API at 2 units per million tokens, 730 hours a month. None of these are real prices.",
      rows: [
        { label: "Tokens served an hour at 30%", value: "2,500 x 0.30 x 3,600 = 2,700,000" },
        { label: "Self-hosted cost at 30%", value: "6 / 2.7 million x 1 million = 2.22 per million" },
        { label: "Break-even utilisation", value: "6,000,000 / 18,000,000, about 33%" },
        { label: "Fixed cost a month", value: "6 x 730 = 4,380 (8,760 with a second server)" },
        { label: "Break-even volume", value: "2.19 billion tokens a month (4.38 billion with two servers)" },
        { label: "Full capacity a month", value: "about 6.57 billion tokens" },
      ],
    },
    followUps: [
      {
        q: "Model A costs 0.01 per attempt and succeeds 90 percent of the time; model B costs 0.004 and succeeds 30 percent of the time. Which is cheaper?",
        a: "Per successful task A costs 0.01 / 0.9, about 0.0111, and B costs 0.004 / 0.3, about 0.0133, so A is cheaper per success. That is before counting the cost of handling B's failures.",
      },
      {
        q: "Without self-hosting, which levers would you pull first to cut the API bill?",
        a: "Prompt caching, trimming context and retrieved passages, a sensible output length, routing easy requests to a smaller model, a batch API for offline work, caching of responses and fewer agent steps. Measure each one per feature.",
      },
      {
        q: "How could you push the self-hosted utilisation above break-even?",
        a: "Fill the idle hours with schedulable batch work, put several workloads on shared GPUs, raise batch size and throughput with a better serving engine, and size the fleet with autoscaling.",
      },
    ],
    mistakes: [
      "Using the GPU's peak throughput at 100 percent utilisation and concluding that self-hosting is obviously cheaper.",
      "Ignoring redundancy, staff time or a quality gap between the models.",
      "Comparing cost per token without asking whether both options solve the task equally well.",
    ],
  },

  "denial-of-wallet-cost-estimate": {
    short:
      "One maximum-size request costs $0.12 (20,000 input tokens is $0.06 and 4,000 output tokens is $0.06), so a script sending 5 a second costs you $2,160 an hour and $51,840 a day. A limit of 30 requests a minute per account barely helps, because 100 free accounts bring the exposure to $21,600 an hour. Limit tokens and money instead of request counts: cap request size, set per-user and per-tenant token budgets, and add a hard spending limit with alerts.",
    explain: [
      {
        heading: "Price the worst request, then multiply",
        body: "Input first: 20,000 tokens x $3 / 1,000,000 = $0.06. Output: 4,000 x $15 / 1,000,000 = $0.06. One maximum-size request costs $0.12. Five requests a second is 5 x 3,600 = 18,000 an hour, so 18,000 x $0.12 = $2,160 an hour and $51,840 over 24 hours. This is called denial of wallet, and OWASP lists it as unbounded consumption: the attacker pays almost nothing, because the script is free and the answer is not even needed, and you pay the model provider. It is defensive thinking to compute this before an attacker does.",
      },
      {
        heading: "Why a request limit is not enough",
        body: "Thirty requests a minute is 1,800 an hour per account. If each is maximum size that is 1,800 x $0.12 = $216 an hour for one account, and 100 free accounts make it $21,600 an hour, or $518,400 a day. A request count ignores how big each request is, and free accounts multiply any per-account limit. Counting requests protects a server's capacity. It does not protect your budget.",
      },
      {
        heading: "Limit tokens and money, in layers",
        body: "Cap the input size and the output tokens per request. With example caps of 8,000 input and 1,000 output, a request costs at most 8,000 x $3 / 1,000,000 + 1,000 x $15 / 1,000,000 = $0.024 + $0.015 = $0.039. Add a daily token budget per account: with an example 500,000 tokens a day and about 9,000 tokens a request, that is about 55 requests, about $2.15 an account a day, so 100 accounts cost about $215 a day instead of $21,600 an hour. Also cap the steps an agent can take, in code. Around that: authentication on every endpoint, friction or verification when new accounts are created, a hard spending limit with alerts at the provider and in your own app, anomaly alerts on spend per hour, and a kill switch. Repeated systematic querying to copy a model's behaviour falls under the same risk. All prices here are example figures, so check current rates.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "dollars a day, worst case",
      items: [
        { label: "One script, 5 requests a second, no limits", value: 51840, note: "$2,160 an hour" },
        { label: "100 accounts at 30 requests a minute", value: 518400, note: "$21,600 an hour" },
        { label: "100 accounts with token caps and daily budgets", value: 215, note: "about $2.15 each", hot: true },
      ],
      caption: "Maximum-size requests at example prices of $3 and $15 per million tokens. Counting requests leaves the exposure large, while token budgets bound it.",
    },
    example: {
      title: "Example: from one request to a bounded budget",
      text: "Example prices of $3 per million input tokens and $15 per million output tokens. The limit values are examples to be set from real usage data.",
      rows: [
        { label: "One maximum request", value: "$0.06 input + $0.06 output = $0.12" },
        { label: "5 a second for an hour", value: "18,000 x $0.12 = $2,160" },
        { label: "5 a second for a day", value: "$51,840" },
        { label: "One account at 30 a minute", value: "1,800 an hour x $0.12 = $216 an hour" },
        { label: "100 accounts", value: "$21,600 an hour" },
        { label: "Capped request (8,000 in, 1,000 out)", value: "$0.039" },
        { label: "Daily budget of 500,000 tokens", value: "about 55 requests, $2.15 an account, $215 for 100" },
      ],
    },
    followUps: [
      {
        q: "The agent can loop, calling a tool up to 25 times and resending a 20,000-token context each step. What is the worst case for one task?",
        a: "Input alone could be 25 x 20,000 = 500,000 tokens, which is $1.50 at the example price, before any output. A cap on steps and on tokens per run, enforced in code, bounds it; asking the model to be economical does not.",
      },
      {
        q: "Legitimate power users hit your daily token budget. How do you avoid punishing them?",
        a: "Give tiered budgets tied to verified identity or plan, show a clear message with a way to ask for more, and alert before the limit. Measure how many real users reach it so that the number is set from data.",
      },
      {
        q: "At 3 a.m. spend is climbing at $800 an hour. What do you do?",
        a: "Stop the spend first, with the kill switch or tighter limits, then identify the account or address pattern in the logs, block it and check that the provider's hard limit is set. Write up the gap afterwards.",
      },
    ],
    mistakes: [
      "Limiting requests per minute and considering the problem solved, when request size and free accounts defeat it.",
      "Being unable to do the cost arithmetic from token counts and per-million prices.",
      "Having no hard spending cap or alert, so the first sign of an attack is the invoice.",
      "Relying on the model to decide how many tool calls are reasonable instead of a limit in code.",
    ],
  },

  "pm-cost-per-resolved-conversation": {
    short:
      "The model costs $0.0375 a conversation ($0.027 input plus $0.0105 output), which is $3,750 a month, but the whole funnel costs $0.0375 + 0.45 x $5 = $2.29 per conversation against $5 for all-human, a saving of about $271,000 a month before fixed costs. The model bill is only about 1.6 percent of the blended cost, so the economics are set by the resolution rate and by what a wrongly \"resolved\" conversation costs, not by token prices. The least certain number is the 55 percent resolution rate, which is a forecast until a pilot measures it.",
    explain: [
      {
        heading: "The model cost from tokens",
        body: "Input: 9,000 tokens x $3 / 1,000,000 = $0.027. Output: 700 tokens x $15 / 1,000,000 = $0.0105. Together $0.0375 a conversation, and for 100,000 conversations $3,750 a month. The 9,000 input tokens are large because the whole history is resent on every turn, which is why long conversations get expensive faster than the number of turns suggests.",
      },
      {
        heading: "Price the whole funnel, not only the model",
        body: "Every conversation pays for the model, and the 45 percent that are not resolved also need a human at $5. So the blended cost is $0.0375 + 0.45 x $5 = $0.0375 + $2.25 = $2.29, against $5 if a person handled everything. The saving is about $2.71 a conversation, $271,250 a month before fixed costs such as evaluation, monitoring, prompt upkeep and a review sample. The model bill, $0.0375 of $2.29, is about 1.6 percent of the blended cost. That is why halving the token price changes little here.",
      },
      {
        heading: "The right unit and the hidden costs",
        body: "The honest unit is cost per correctly resolved conversation, not per call: a customer who is deflected but not helped is a cost, not a saving. If 8 percent of the \"resolved\" conversations come back as a repeat contact at $5, that adds 0.08 x 0.55 x $5 = $0.22, the blended cost rises to about $2.51 and the saving falls to about $249,000 a month. Also count the harm that is harder to price, such as lower satisfaction among customers who used the assistant.",
      },
      {
        heading: "The weakest assumption, and the levers",
        body: "The 55 percent resolution rate is the least certain number, because it comes from a forecast. At 35 percent the blended cost is $0.0375 + 0.65 x $5 = $3.29, and the saving drops to about $171,000 a month. Show that sensitivity and plan a staged pilot to measure the real rate. If cost does matter, the levers are trimmed history, caching a stable prompt prefix, a smaller model for easy turns, and limits on steps and tokens, each checked against the eval set so that quality, and therefore resolution, does not fall.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "dollars a month",
      items: [
        { label: "Model bill", value: 3750, note: "$0.0375 a conversation" },
        { label: "Saving if only 35% resolved", value: 171250, note: "blended $3.29" },
        { label: "Saving at 55% with 8% repeat contacts", value: 249250, note: "blended $2.51" },
        { label: "Saving at 55% resolved", value: 271250, note: "blended $2.29", hot: true },
      ],
      caption: "100,000 conversations a month against an all-human cost of $5 each, before fixed costs. The model bill is tiny next to the resolution-rate effects.",
    },
    example: {
      title: "Example: the unit economics, step by step",
      text: "Example prices of $3 and $15 per million tokens, 9,000 input and 700 output tokens, 100,000 conversations a month, a human at $5 a conversation. Fixed costs are not included; subtract your own.",
      rows: [
        { label: "Model cost per conversation", value: "$0.027 + $0.0105 = $0.0375" },
        { label: "Model cost a month", value: "$3,750" },
        { label: "Blended cost at 55% resolved", value: "$0.0375 + 0.45 x $5 = $2.29" },
        { label: "Saving a month", value: "($5 - $2.29) x 100,000 = $271,250" },
        { label: "With 8% repeat contacts", value: "blended $2.51, saving about $249,000" },
        { label: "At 35% resolved", value: "blended $3.29, saving about $171,000" },
      ],
    },
    followUps: [
      {
        q: "Finance asks for a single \"cost per conversation\" for the board. What do you give them, and what do you warn them about?",
        a: "Give a range with its assumptions: the blended cost with the resolution rate, the repeat-contact rate and the fixed costs shown. Warn that before launch any figure is a forecast, and quote scenarios rather than one number.",
      },
      {
        q: "Customer satisfaction drops two points among customers who talked to the assistant. How does that enter the economics?",
        a: "Treat it as a cost: find out who is affected, check repeat contacts and churn against a holdout group, and decide whether the saving covers the loss. Do not report savings without that guardrail metric.",
      },
      {
        q: "The provider cuts its price per token by half. Does the business case change much?",
        a: "Only a little here, because the model cost falls from $0.0375 to about $0.019 against a $5 human cost. The dominant terms are resolution and the cost of errors, though a newer model also changes quality, so re-evaluate.",
      },
    ],
    mistakes: [
      "Reporting only the token cost and calling it the cost of the feature.",
      "Counting every automated conversation as a saving, even when the customer was not helped.",
      "Giving one confident figure with no sensitivity to the resolution rate.",
      "Forgetting the fixed costs: evals, monitoring and review.",
    ],
  },

  "sa-launch-day-quota-and-throttling": {
    short:
      "It will not hold: 3,000 people each asking 3 questions in 15 minutes is 600 requests a minute against a limit of 300 and about 2.04 million tokens a minute against 200,000, roughly ten times over. Throttled requests (HTTP 429) queue up, a backlog of about 153 minutes forms, and retries make it worse. Ask for more quota early, stage the roll-out in waves sized from the arithmetic, mix reserved and on-demand capacity, and build queueing, backoff and a clear message into the client.",
    explain: [
      {
        heading: "Do the load arithmetic",
        body: "Calls: 3,000 people x 3 questions = 9,000 calls in 15 minutes, which is 9,000 / 15 = 600 requests a minute, twice the limit of 300. Tokens: 9,000 x 3,400 = 30.6 million tokens, so 30.6 million / 15 = 2.04 million tokens a minute, about ten times the 200,000 limit. The tokens are the tighter limit. At 200,000 a minute, 30.6 million tokens take 30.6 million / 200,000 = 153 minutes to clear, so late users wait for hours, give up, retry and add to the load. A 429 response (too many requests) is the normal behaviour of a limit, not a bug.",
      },
      {
        heading: "Quota is permission, capacity is hardware",
        body: "A quota is a limit on what the account may use; capacity is the real hardware in the region at that moment, and a higher quota does not guarantee it. So file the quota increase early, because approvals can take days, and check that capacity really exists by creating the deployment in a test. Do not make the launch date depend on an answer nobody on your side controls.",
      },
      {
        heading: "Stage the roll-out from the numbers",
        body: "Release to departments in small waves. A wave of 250 users in 15 minutes is 250 x 3 x 3,400 / 15 = 170,000 tokens a minute, under the example limit, and 250 x 3 / 15 = 50 requests a minute, well under 300. Note the cost of that safety: 30,000 users in waves of 250 is 120 waves, 30 hours of 15-minute slots, a few working days, so a bigger quota lets the waves grow. Wave size must come from the arithmetic, not from the organisation chart, because a department of 3,000 would still send 2.04 million tokens a minute.",
      },
      {
        heading: "Capacity mix and the client side",
        body: "Use reserved or provisioned throughput for the steady baseline and on-demand for spikes, with a router or a fallback model, and cross-region routing only where the data-residency rules allow it. In the client, queue requests, retry with exponential backoff and jitter (random delay), apply per-user rate limits, show a clear message instead of a silent spinner, and cache answers to common first questions. Load-test with a realistic mix before launch and watch the throttle rate and latency on the day.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "thousand tokens a minute",
      items: [
        { label: "Launch morning: 3,000 users in 15 minutes", value: 2040, note: "600 requests a minute" },
        { label: "Example quota", value: 200, note: "300 requests a minute" },
        { label: "One wave of 250 users", value: 170, note: "50 requests a minute", hot: true },
      ],
      caption: "Token demand against the example quota. A wave of 250 users stays under the limit; the whole group at once is about ten times over.",
    },
    example: {
      title: "Example: the launch arithmetic",
      text: "The customer's numbers: quota of 200,000 tokens and 300 requests a minute (example), 3,000 users in the first 15 minutes, 3 questions each, 3,400 tokens a call.",
      rows: [
        { label: "Calls in 15 minutes", value: "3,000 x 3 = 9,000, which is 600 a minute" },
        { label: "Tokens in 15 minutes", value: "9,000 x 3,400 = 30.6 million" },
        { label: "Tokens a minute", value: "2.04 million, 10.2 times the quota" },
        { label: "Time to clear the backlog", value: "30.6 million / 200,000 = 153 minutes" },
        { label: "Wave of 250 users", value: "250 x 3 x 3,400 / 15 = 170,000 tokens a minute" },
        { label: "Waves for 30,000 users", value: "120 waves, about 30 hours at one wave per 15 minutes" },
      ],
    },
    followUps: [
      {
        q: "The customer asks you to \"just ask the provider to raise the quota to 3 million per minute\". What do you tell them?",
        a: "It may or may not be granted, and approval is not the same as capacity. Ask early, have a plan B (smaller waves, another region or model, provisioned capacity), and do not let the launch date depend on it.",
      },
      {
        q: "You buy reserved capacity sized for the launch-morning peak. What is the risk?",
        a: "Reserved capacity costs the same when idle, so sizing for a one-off peak wastes money for months. Size it for the steady baseline, let on-demand and staging absorb the peak, and measure utilisation after launch.",
      },
      {
        q: "Why is a staged roll-out by department not enough by itself?",
        a: "If a wave is large, its 15-minute spike can still exceed the quota: 3,000 users in one wave is still 2.04 million tokens a minute. Wave size has to be set from the arithmetic, not from the organisation chart.",
      },
    ],
    mistakes: [
      "Planning from daily averages and ignoring the first-day spike.",
      "Treating quota and capacity as the same thing.",
      "Having no queue, backoff or user-facing message for a 429.",
      "Promising the launch date before the quota is confirmed.",
    ],
  },

  "sa-sizing-tokens-cost-and-peak-tpm": {
    short:
      "Each call costs $0.015 (3,000 input tokens at $3 per million is $0.009, 400 output tokens at $15 per million is $0.006), and 2,000 users x 6 questions is 12,000 calls a day, so $180 a day and $3,960 over 22 working days, at example prices. The busiest hour carries 20 percent of the day, 2,400 calls or 40 a minute, which is 136,000 tokens a minute, so ask for quota of about 272,000 once you add headroom for bursts and retries. Show it as a low, expected and high case, and validate the 3,000-token figure in a pilot.",
    explain: [
      {
        heading: "Cost of one call, then the month",
        body: "Input: 3,000 x $3 / 1,000,000 = $0.009. Output: 400 x $15 / 1,000,000 = $0.006. One call costs $0.015. Notice that output is only 400 of the 3,400 tokens, about 12 percent, but $0.006 of $0.015, 40 percent of the cost, because output tokens are priced higher. Calls: 2,000 users x 6 = 12,000 a day, so 12,000 x $0.015 = $180 a day, and 22 working days give $3,960 a month. These prices are placeholders: replace them with the customer's real rate card.",
      },
      {
        heading: "Peak tokens per minute, the number quotas are set on",
        body: "A quota limits tokens per minute, so the monthly total is not the number that matters. If 20 percent of a day's traffic lands in the busiest hour, that is 0.20 x 12,000 = 2,400 calls, which is 2,400 / 60 = 40 calls a minute, and 40 x 3,400 = 136,000 tokens a minute. The busiest single minute can be well above the hourly average, and retries add load, so apply headroom. A factor of 2 (a planning choice, not a rule) gives about 272,000 tokens a minute to ask for.",
      },
      {
        heading: "What would change the numbers",
        body: "Growth in users, longer conversations (the history is resent on each turn), deeper retrieval, extra steps if an agent is used, and costs outside the model: search, hosting, ingestion and evaluation. Prompt growth and adoption multiply, they do not add. Levers to reduce the bill are caching a stable prompt prefix, trimming retrieved passages and history, using a smaller model for easy questions, and capping output length. A good estimate is a range, so give a low, an expected and a high case, with the assumptions of each shown. Then check the 3,000-token figure by running a few hundred real queries in a pilot and reading the usage counts.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "call", label: "One call", sub: "3,000 in + 400 out = $0.015" },
        { id: "day", label: "One day", sub: "12,000 calls = $180" },
        { id: "month", label: "One month", sub: "x 22 days = $3,960" },
        { id: "peak", label: "Busiest hour", sub: "20% = 2,400 calls, 40 a minute" },
        { id: "tpm", label: "Quota to request", sub: "136,000 tokens a minute, about 272,000 with headroom" },
      ],
      highlight: ["tpm"],
      caption: "Bill and quota come from the same call size, but the quota is set by the peak minute, not by the monthly total. Prices are examples.",
    },
    example: {
      title: "Example: low, expected and high cases",
      text: "The expected case is the question's. The low and high cases are invented for the illustration: low is 4 questions a day with 2,000 input and 300 output tokens, and high is 8 questions a day with 5,000 input and 500 output tokens. Prices are $3 and $15 per million tokens.",
      rows: [
        { label: "Low: cost per call", value: "$0.006 + $0.0045 = $0.0105" },
        { label: "Low: month", value: "8,000 calls x $0.0105 x 22 = $1,848" },
        { label: "Expected: cost per call", value: "$0.015" },
        { label: "Expected: month", value: "12,000 x $0.015 x 22 = $3,960" },
        { label: "High: cost per call", value: "$0.015 + $0.0075 = $0.0225" },
        { label: "High: month", value: "16,000 x $0.0225 x 22 = $7,920" },
        { label: "Expected peak", value: "40 calls a minute x 3,400 = 136,000 tokens a minute" },
      ],
    },
    followUps: [
      {
        q: "Adoption triples in six months and prompts grow to 5,000 input tokens. What is the new monthly bill?",
        a: "Cost per call is 5,000 x $3 / 1,000,000 + $0.006 = $0.021. Calls are 36,000 a day, so $756 a day and 22 x $756 = $16,632 a month, about 4.2 times the original, because the two growths multiply.",
      },
      {
        q: "The customer wants a fixed price for the model usage. What do you offer?",
        a: "Do not promise a flat price for a usage-based cost. Offer a budget with alerts and caps, a range with its assumptions, and a review point after a pilot has produced measured usage.",
      },
      {
        q: "How would you check the 3,000-token estimate before committing?",
        a: "Run a few hundred realistic queries through the proposed design and record the input and output tokens from the usage fields. Look at the spread, since the tail matters and not only the mean, and include conversations of several turns.",
      },
    ],
    mistakes: [
      "Pricing only input tokens, or pricing both at one rate, when output costs more per token.",
      "Quoting the average rate and ignoring the peak that quotas are set on.",
      "Presenting example prices as current list prices.",
      "Giving a single figure with no range or assumptions.",
    ],
  },

  "choose-l4-or-h100-for-8b-model": {
    short:
      "Pick two H100-class cards (one carries the load, one gives redundancy) unless the cost comparison and an 8-bit quality test favour about five L4s. The 8B model in BF16 needs 16 GB of weights plus about 13 GB of KV cache for 40 streams, which fits an H100 with a step of about 9 ms (over 100 tokens per second per user) but fails on an L4, whose bandwidth caps a single stream at about 19 tokens per second, below the 20 target. With 8-bit weights an L4 can work, at about 12 streams a card, so 4 cards plus a spare, at the price of quality risk and more replicas to run.",
    explain: [
      {
        heading: "Memory: weights plus cache",
        body: "Weights are 8 billion x 2 bytes = 16 GB in BF16. The cache per token is 2 x 32 layers x 8 KV heads x 128 x 2 bytes = 131,072 bytes (128 KiB). One stream has 2,000 + 500 = 2,500 tokens, so about 328 MB, and 40 streams at full length need about 13.1 GB. The total is about 29 GB. That fits easily on an 80 GB H100-class card. On a 24 GB L4 the 16 GB of weights leave about 8 GB, less overhead, which is not enough for 13 GB of cache on one card.",
      },
      {
        heading: "Speed: decode is a bandwidth problem",
        body: "I assume a decode step takes about the bytes it reads (weights plus the cache of all streams in the batch) divided by memory bandwidth, and that real kernels reach 70 to 90 percent of peak. On an L4 in BF16 the ceiling for even one stream is 300 GB/s / 16 GB, about 19 tokens per second, already under the 20 target, so L4 in BF16 is out before any batching. With 8-bit weights (8 GB, if quality holds on evals) 20 tokens per second needs a step of at most 50 ms, so at most 0.05 x 300 = 15 GB read per step, which leaves 7 GB for cache, about 21 streams per card at peak bandwidth, or about 12 at 80 percent of it. For 40 streams that is 4 cards plus a spare. On the H100 in BF16 a step reads about 29 GB / 3.35 TB/s = 8.7 ms, about 115 tokens per second per stream at peak bandwidth, so one card covers the peak with large headroom and a second gives redundancy.",
      },
      {
        heading: "Time to first token and the decision",
        body: "Prefill for a 2,000-token prompt is about 2 x 8e9 x 2,000 = 3.2e13 operations: about 0.5 s on an L4 at half of its 120 TFLOPS peak, against well under 0.1 s on an H100. That matters if there is a first-token target. The decision is then economic and not only technical: compare the hourly cost of about 5 quantised L4s with 2 H100s for the same served load (cost per stream or per million tokens), and add the quality risk of 8-bit weights, more replicas to operate and which card you can actually get. As an example, if an H100 costs 4 units an hour then 5 L4s cost less when each L4 is below 1.6 units. Verify all of it with a load test before buying.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["L4, BF16", "L4, 8-bit weights", "H100, BF16"],
      rows: [
        { label: "Weights", cells: ["16 GB of 24 GB", "8 GB of 24 GB", "16 GB of 80 GB"] },
        { label: "Room for 13.1 GB of cache?", cells: ["No, about 8 GB left", "Yes, split over 4 cards", "Yes, one card"] },
        { label: "Single-stream ceiling", cells: ["about 19 tokens per second, below the 20 target", "about 37 tokens per second", "about 209 tokens per second"] },
        { label: "Speed with the 40-stream load", cells: ["Fails the target", "about 12 streams a card at 20 tokens per second", "about 115 tokens per second each"] },
        { label: "Prefill, 2,000 tokens", cells: ["about 0.5 s", "about 0.5 s", "under 0.1 s"] },
        { label: "Cards for 40 streams", cells: ["Not viable", "4, plus 1 spare", "1, plus 1 spare"] },
      ],
      caption: "Peak-bandwidth figures; real kernels reach 70 to 90 percent. The L4 8-bit option depends on quality passing your evals.",
    },
    example: {
      title: "Example: the numbers behind the choice",
      text: "Cards as in the question: L4 about 300 GB/s and 120 TFLOPS, H100 about 3.35 TB/s and 990 TFLOPS. The hourly prices are example figures, not quotes.",
      rows: [
        { label: "Weights, BF16", value: "8e9 x 2 = 16 GB" },
        { label: "Cache per token", value: "2 x 32 x 8 x 128 x 2 = 131,072 bytes" },
        { label: "40 streams x 2,500 tokens", value: "about 13.1 GB" },
        { label: "L4, BF16, one stream", value: "300 / 16 = 18.75 tokens per second" },
        { label: "L4, 8-bit, 20 tokens per second", value: "50 ms step, 15 GB read, 7 GB cache, about 21 streams (12 at 80% bandwidth)" },
        { label: "H100, BF16, 40 streams", value: "29 GB / 3.35 TB/s = 8.7 ms, about 115 tokens per second" },
        { label: "Price break-even (example)", value: "5 L4s cost the same as 2 H100s when an L4 costs 2/5 of an H100" },
      ],
    },
    followUps: [
      {
        q: "Product now wants the same tool on a 70B model. What changes?",
        a: "A 70B model does not fit on an L4 even at 4 bits (about 35 GB of weights). It needs 80 GB-class cards, likely several with tensor parallelism over a fast link such as NVLink, so the L4 option disappears.",
      },
      {
        q: "Why is the H100 roughly 11 times faster here rather than 8 times (the compute ratio)?",
        a: "Decode is memory-bound, so it follows the bandwidth ratio, 3.35 TB/s / 300 GB/s, about 11, and not the compute ratio of 990 / 120, about 8.",
      },
      {
        q: "How would you check these paper numbers before buying?",
        a: "Load test both options with the real prompt and output length distribution. Measure tokens per second per stream and p95 time to first token against concurrency, and find the knee where latency breaks.",
      },
    ],
    mistakes: [
      "Picking by TFLOPS or by price per hour alone, when decode is limited by bandwidth and memory.",
      "Checking only that the weights fit and ignoring the KV cache and the per-user speed.",
      "Quoting the per-card speed at batch 1 as if it held at 40 concurrent streams.",
    ],
  },

  "speculative-decoding-how-and-when": {
    short:
      "A cheap drafter guesses the next k tokens, and the big target model checks all of them in one forward pass, keeping the guesses it agrees with and sampling a replacement at the first miss, using a rule that makes the output exactly the target's distribution. It speeds things up because decoding is limited by reading the weights from memory, so checking k + 1 positions costs about the same as writing one token. With 80 percent acceptance and k = 4 you get about 3.4 tokens per target pass, but the gain shrinks at large batch sizes, when the GPU is busy with arithmetic, so I would not turn it on for high-throughput, heavily batched serving.",
    explain: [
      {
        heading: "Draft, verify, accept",
        body: "The drafter can be a small model, extra prediction heads on the big model, or a lookup of repeated text in the prompt. It proposes k tokens. The target model then scores all k positions, plus one more, in a single forward pass. For each drafted token x, with p the target's probability and q the drafter's, accept it with probability min(1, p(x) / q(x)). At the first rejection, sample a replacement from the leftover distribution, the normalised max(0, p - q), and throw away the remaining drafts. If all k are accepted, the target's pass also gives one extra bonus token. With greedy decoding this simply means keeping draft tokens while they match the target's top choice.",
      },
      {
        heading: "Why the output is unchanged, and why it is faster",
        body: "The acceptance rule is a form of rejection sampling, and it is built so that the chance of emitting any token x is exactly p(x), the target model's own probability. So quality is the same as running the target alone; only the speed changes. The speed-up comes from the fact that decode is bound by memory bandwidth: one pass reads all the weights, so scoring k + 1 positions at once costs about as much as scoring one. Every accepted draft token is nearly free. Assuming each draft token is accepted independently with probability a, the expected tokens per target pass are (1 - a^(k+1)) / (1 - a). For a = 0.8 and k = 4 that is (1 - 0.32768) / 0.2 = 3.36, before subtracting the drafter's own cost.",
      },
      {
        heading: "When it helps and when it does not",
        body: "The gain depends on the acceptance rate and on how cheap the drafter is. Acceptance is higher for code, templated text and copy-heavy output such as RAG answers that quote their sources, and lower at high temperature or in creative writing. It also shrinks at large batch size: the GPU becomes compute-bound, so the extra verification arithmetic is no longer free, and the drafter takes memory and cache. It is best for latency-sensitive serving at low to moderate batch size. Decide with an A/B test on real traffic, measuring inter-token latency (p50 and p95) and total throughput at several load levels, track the acceptance rate for each route, and shorten k or turn it off automatically when the batch is large.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "acceptance rate per draft token, percent",
      yLabel: "expected tokens per target pass (k = 4)",
      points: [[10, 1.11], [20, 1.25], [30, 1.43], [40, 1.65], [50, 1.94], [60, 2.31], [70, 2.77], [80, 3.36], [90, 4.1]],
      marks: [{ x: 80, label: "80%: about 3.4 tokens per pass" }],
      caption: "Expected tokens per pass is (1 - a^5) / (1 - a), assuming independent acceptance. The drafter's own cost is not yet subtracted.",
    },
    example: {
      title: "Example: net speedup with a cheap drafter",
      text: "Assume independent acceptance, k = 4 draft tokens, and a drafter pass that costs 5 percent of a target pass, so one round costs 1 + 4 x 0.05 = 1.2 target passes. Real systems add scheduling overhead.",
      rows: [
        { label: "a = 0.8: tokens per pass", value: "(1 - 0.8^5) / 0.2 = 3.36" },
        { label: "a = 0.8: net speedup", value: "3.36 / 1.2, about 2.8 times" },
        { label: "a = 0.6: tokens per pass", value: "(1 - 0.6^5) / 0.4 = 2.31" },
        { label: "a = 0.6: net speedup", value: "2.31 / 1.2, about 1.9 times" },
        { label: "a = 0.5: tokens per pass", value: "1.94, net about 1.6 times" },
      ],
    },
    followUps: [
      {
        q: "Why does the acceptance rule preserve the target distribution, in a short sketch?",
        a: "A token x is emitted either by being drafted and accepted, with probability min(p(x), q(x)), or after a rejection from the normalised leftover, which contributes exactly p(x) minus min(p(x), q(x)). The two parts add up to p(x), so this is rejection sampling that corrects the drafter's bias.",
      },
      {
        q: "With a = 0.6 and k = 4, and a drafter whose pass costs 5 percent of the target's, what speedup do you expect?",
        a: "Tokens per pass are (1 - 0.6^5) / 0.4 = 0.92224 / 0.4, about 2.31. A round costs about 1 + 4 x 0.05 = 1.2 target passes, so the speedup is about 2.31 / 1.2, roughly 1.9 times, before overheads.",
      },
      {
        q: "How would you decide to enable it in production, and how would you keep it from hurting at peak load?",
        a: "Run an A/B test on real traffic measuring inter-token latency and total throughput at several load levels, and track acceptance rate for each route. Shorten k or disable it automatically when the batch size is high.",
      },
    ],
    mistakes: [
      "Thinking speculative decoding trades quality for speed by accepting the draft's tokens unchecked: the verification step makes the distribution exact.",
      "Expecting a large speedup at any batch size, when it fades as the GPU becomes compute-bound.",
      "Being unable to explain why verifying several tokens costs about the same as generating one: both read the weights once.",
    ],
  },

  "pm-pricing-ai-seat-heavy-user-tail": {
    short:
      "Average usage is 0.95 x 20 + 0.05 x 800 = 59 tasks a user, so model cost is 59 x $0.15 = $8.85 and gross margin is $11.15 on $20, about 56 percent, before support, hosting and evals. But the average hides the tail: a light user costs $3 and leaves $17, while a heavy user costs $120 and loses $100, and the 5 percent heavy users make up 68 percent of the usage while paying the same. I would add a fair-use limit or credits and a higher tier for heavy use, then re-check quality and the numbers with measured data.",
    explain: [
      {
        heading: "The average, and what it hides",
        body: "A user's mix is 95 percent light (20 tasks) and 5 percent heavy (800 tasks), so the mean is 0.95 x 20 + 0.05 x 800 = 19 + 40 = 59 tasks. Model cost is 59 x $0.15 = $8.85 a user, which leaves $20 - $8.85 = $11.15, or 55.8 percent gross margin. That looks healthy. But the 40 of 59 tasks that come from the top 5 percent mean that 68 percent of usage comes from 5 percent of the users, who pay exactly what everyone else pays. A cheap model price or a good average can mask a margin problem concentrated in a few accounts.",
      },
      {
        heading: "Who pays for whom",
        body: "A light user costs 20 x $0.15 = $3 and leaves $17 of margin. A heavy user costs 800 x $0.15 = $120 and loses $100. For 10,000 users, 9,500 light users bring 9,500 x $17 = $161,500 and 500 heavy users lose 500 x $100 = $50,000, a net $111,500 on $200,000 of revenue. So the light users are paying for the heavy ones. These heavy users are probably the most engaged and the most likely to recommend the product, so the answer is not just to push them away.",
      },
      {
        heading: "Levers, and their side effects",
        body: "A fair-use cap or credits: capping at 300 tasks lowers the mean usage to 0.95 x 20 + 0.05 x 300 = 34 tasks, cost $5.10 and margin 74.5 percent, but a heavy user at the cap still costs 300 x $0.15 = $45 and loses $25, and the best users are frustrated; a cap that breaks even is $20 / $0.15, about 133 tasks. A higher tier or a usage-based add-on priced above the cost of the heavy use. Routing easy tasks to a cheaper model, caching and shorter outputs lower the cost per task, but any cheaper route must be tested on the eval set because savings that lower quality lose users. Behaviour changes when the price or cap changes, so test rather than assume.",
      },
      {
        heading: "Treat the margin as a moving figure",
        body: "Prices per token change and models are retired, so the margin is not fixed. Recompute with measured usage once real data exists, and model a range for the cost per task rather than one number. Also weigh what the product is worth to the buyer, what heavy users get and what competitors charge, and whether outcome- or usage-based pricing fits this buyer better than a flat seat price.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "dollars of model cost per user per month",
      items: [
        { label: "Light user (20 tasks)", value: 3, note: "leaves $17 of the $20" },
        { label: "Average user (59 tasks)", value: 8.85, note: "margin 55.8%" },
        { label: "Seat price", value: 20, note: "what each user pays" },
        { label: "Heavy user (800 tasks)", value: 120, note: "loses $100", hot: true },
      ],
      caption: "Model cost per user at $0.15 a task (an example figure). The average sits comfortably under the price while the heavy tail is six times over it.",
    },
    example: {
      title: "Example: 10,000 users at $20 a month",
      text: "Per task $0.15 (example), 95 percent of users run 20 tasks and 5 percent run 800. Figures are model cost only; support, hosting and evals come on top.",
      rows: [
        { label: "Mean tasks a user", value: "0.95 x 20 + 0.05 x 800 = 59" },
        { label: "Mean model cost and margin", value: "$8.85, margin $11.15 (55.8%)" },
        { label: "Light users: 9,500 x $17", value: "+ $161,500" },
        { label: "Heavy users: 500 x -$100", value: "- $50,000" },
        { label: "Net on $200,000", value: "$111,500" },
        { label: "With a cap at 300 tasks", value: "mean 34 tasks, cost $5.10, margin 74.5%; each heavy user still loses $25" },
        { label: "Cap that breaks even per heavy user", value: "$20 / $0.15, about 133 tasks" },
      ],
    },
    followUps: [
      {
        q: "The model price per task falls by half. Do you cut prices or keep the margin?",
        a: "That depends on competition, value and how price-sensitive buyers are, not on cost alone. At $0.075 a task a heavy user costs $60, losing $40 instead of $100, so the tail still needs handling: re-run the numbers and test a price change instead of assuming.",
      },
      {
        q: "Usage data shows the heavy users are your best advocates. Does that change your plan?",
        a: "It changes the form: weigh the cost of capping them against the loss of advocacy, and prefer a tier priced for them or a soft limit with an upgrade path over a hard cap that upsets them. Check retention and referral data before deciding.",
      },
      {
        q: "How would you measure the real cost per task in production, not from a spreadsheet?",
        a: "Log token usage for each request and feature from the usage field, include retries, agent steps and cached against uncached tokens, and join the cost to the user and task type. Look at the distribution and the tail, not only the mean.",
      },
    ],
    mistakes: [
      "Pricing from the average user and never looking at the distribution.",
      "Assuming usage will not change after the price or the cap changes.",
      "Ignoring fixed costs such as evals, support and monitoring.",
      "Cutting cost with a cheaper model and never re-checking quality.",
    ],
  },

  "semantic-cache-and-batch-savings": {
    short:
      "Do not ship the semantic cache as piloted: it saves $675 a day gross (87,500 hits x $0.008 minus $25 of lookups) but the 6 percent of wrong answers cost 5,250 x $0.30 = $1,575, a net loss of about $900 a day. It only pays if fewer than about 2.6 percent of hits are wrong, which means a stricter, scoped cache for narrow, low-stakes, repeated questions. The nightly job of 375 million input and 50 million output tokens costs $1,875 at standard prices and about $937.50 with an example 50 percent batch discount, and less if a shared prefix is cached and the vendor allows the discounts to combine.",
    explain: [
      {
        heading: "The cache arithmetic",
        body: "A hit rate of 35 percent on 250,000 questions is 87,500 hits a day. Each avoids a $0.008 model call, so 87,500 x $0.008 = $700. Every question pays for a lookup, 250,000 x $0.0001 = $25, so the gross saving is $675. Now the damage: 6 percent of 87,500 is 5,250 wrong answers a day, and at $0.30 each that is $1,575. Net: $675 - $1,575 = about minus $900 a day. The break-even wrong share is $675 / (87,500 x $0.30), about 2.6 percent, or roughly 2,250 wrong answers a day. The $0.30 is an assumption to replace with real data: a wrong refund policy costs far more than a wrong opening time, so a semantic cache suits narrow, repetitive, low-stakes traffic.",
      },
      {
        heading: "Why wrong hits happen, and why a threshold is not enough",
        body: "Similar wording is not the same meaning. \"Are you open on Sunday?\" and \"Are you open on Monday?\" are nearly identical to an embedding model, and negations, dates and amounts have the same problem. No similarity cut-off separates every paraphrase from every near-duplicate: raising it removes right hits as well, and the right value is not portable across embedding models, so calibrate it on labelled pairs. A threshold also cannot fix scope. A cross-tenant hit is a leak, not a near miss, so the cache key must include the tenant, permissions, language, and the model and prompt version, with an expiry, no personal data stored in it, and an exact-match cache in front for repeats.",
      },
      {
        heading: "Three kinds of cache, and how to measure",
        body: "An exact-match cache and a semantic cache skip the model entirely and can serve stale or wrong answers. A provider's prompt cache is different: it only discounts the repeated input tokens, and the output is still freshly written, so it carries no such risk. In production, sample the hits and label them, track the wrong share over time, and start in shadow mode, where the cache proposes an answer but the model still answers, so you can measure before anything is served.",
      },
      {
        heading: "The nightly batch job",
        body: "Input is 250,000 x 1,500 = 375 million tokens, so 375 x $3 = $1,125. Output is 250,000 x 200 = 50 million tokens, so 50 x $15 = $750. The total is $1,875 at standard prices. With an example batch discount of 50 percent, that is $937.50. If 70 percent of the input is a shared prefix that can be read from a cache at one tenth of the price, and the vendor lets the discounts stack, the input is 375 x (0.3 + 0.7 x 0.1) = 138.75 million token-equivalents, $416.25, so the job is $416.25 + $750 = $1,166.25 and the batch price about $583. Check the vendor's current terms to see whether discounts really stack. Plan for per-request failures and a results window of up to a day.",
      },
    ],
    diagram: {
      kind: "experiment",
      slug: "no-semantic-cache",
      caption: "Try the near-duplicate questions at different thresholds, and watch how the hits, the saving and the wrong answers move together.",
    },
    example: {
      title: "Example: cache economics and the batch job",
      text: "The pilot numbers are the question's: 250,000 questions a day, $0.008 a call, a $0.0001 lookup, a 35 percent hit rate, 6 percent wrong hits, $0.30 per wrong answer (an assumption). The batch discount and the cached prefix price are examples; check current vendor terms.",
      rows: [
        { label: "Hits a day", value: "250,000 x 0.35 = 87,500" },
        { label: "Gross saving", value: "87,500 x $0.008 - $25 of lookups = $675" },
        { label: "Wrong answers", value: "87,500 x 0.06 = 5,250, costing $1,575" },
        { label: "Net a day", value: "about minus $900" },
        { label: "Break-even wrong share", value: "$675 / (87,500 x $0.30), about 2.6 percent" },
        { label: "Nightly job, standard", value: "$1,125 input + $750 output = $1,875" },
        { label: "Nightly job, 50% batch discount", value: "$937.50" },
        { label: "With a cached prefix and stacking", value: "$1,166.25, then about $583 in batch" },
      ],
    },
    followUps: [
      {
        q: "What would have to change for the cache to be worth shipping?",
        a: "A lower wrong share through a stricter threshold, scoped keys and a restriction to a vetted FAQ class, a cheaper cost of a wrong answer, or a higher hit rate. Recompute the break-even each time.",
      },
      {
        q: "The nightly batch competes with interactive traffic for rate limits. What do you do?",
        a: "Use separate queues and priorities, or a separate batch pool if the provider offers one, honour the Retry-After header on a 429, back off with jitter and a retry cap, and ramp up instead of bursting.",
      },
      {
        q: "How would you choose the similarity threshold?",
        a: "Build a labelled set of question pairs that should and should not share an answer, measure precision at each threshold, and weigh it against the cost of a wrong hit. Different question classes may need different thresholds.",
      },
    ],
    mistakes: [
      "Quoting the hit rate as the benefit with no cost for wrong answers.",
      "Running one global cache across tenants, so one customer's answer can reach another.",
      "Treating prompt caching and semantic caching as the same thing.",
      "Assuming batch and cache discounts always stack.",
    ],
  },

  "sa-self-host-demand-from-security-team": {
    short:
      "At 20 million tokens a day the average load is only about 231 tokens a second against 3,000 for two GPUs, about 7.7 percent utilisation, so self-hosting costs 2 x $4 x 730 = $5,840 a month, about $9.73 per million tokens, roughly 9.7 times the $1 API price of about $600 a month. These are example figures and leave out engineers, on-call, upgrades and lead time. I would not argue with the requirement: I would find out what \"no API\" protects, show the cost and risk table to security and finance together, and offer options such as a private endpoint in the bank's own cloud account if that meets the real concern.",
    explain: [
      {
        heading: "The unit cost, with utilisation",
        body: "Demand is 20,000,000 tokens / 86,400 seconds, about 231 tokens a second on average. Two GPUs at 1,500 tokens a second give 3,000, so average utilisation is 231 / 3,000, about 7.7 percent. Peaks are higher than the average (an example peak of 5 times is about 1,157 tokens a second), so capacity must cover the peak, but the GPUs are idle most of the day. Cost: 2 GPUs x $4 x 730 hours = $5,840 a month. Tokens a month: 20 million x 30 = 600 million. So $5,840 / 600 = about $9.73 per million tokens, roughly 9.7 times the API at $1, which would cost about $600 a month for the same volume.",
      },
      {
        heading: "What the GPU price leaves out, and how to improve it",
        body: "Add engineers, on-call, security work, upgrades, evaluating each new model, and the lead time to get hardware into a data centre. These figures are examples, so replace them with real quotes and a measured throughput test. If compliance is a hard requirement it can outweigh cost, and the economics can be improved: put more workloads on the same GPUs, schedule batch work in the quiet hours, right-size the model, and quantise it after measuring quality. An open-weights model must also pass the customer's own evaluation and licence review, since it may be weaker than the API model for this task, and the model-weight supply chain has its own security checks.",
      },
      {
        heading: "How to handle the conversation",
        body: "Do not simply say no, and do not argue with the requirement. Find out what \"no API, ever\" protects: data leaving the building, third-party processing, a regulator's expectation or an internal policy. A private endpoint in the bank's own cloud tenancy, or a dedicated deployment, might meet the real concern, or might not: the customer's security and legal teams decide, not you. Then present the options as a cost and risk table with stated assumptions, to security and finance together, so the trade is made openly.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["Self-hosted, bank data centre", "Public API", "Private endpoint in bank's cloud"],
      rows: [
        { label: "Cost per million tokens (example)", cells: ["$9.73", "$1.00", "Needs a quote"] },
        { label: "Cost a month for 600M tokens", cells: ["$5,840 plus staff", "about $600", "Needs a quote"] },
        { label: "Utilisation", cells: ["about 7.7%", "Provider's concern", "Provider's concern"] },
        { label: "Data leaves the building?", cells: ["No", "Yes", "Stays in the bank's own cloud account (confirm in writing)"] },
        { label: "Operations", cells: ["Bank team: on-call, upgrades", "Provider", "Shared, depends on the service"] },
      ],
      caption: "Example figures from the question. The third column is not priced here: it needs a real quote and a written check of retention terms.",
    },
    example: {
      title: "Example: the self-hosting arithmetic",
      text: "Example figures: $4 an hour per GPU, 1,500 tokens a second per busy GPU, an API at $1 per million tokens, two GPUs for redundancy, 20 million tokens a day, 730 hours a month.",
      rows: [
        { label: "Average demand", value: "20,000,000 / 86,400, about 231 tokens a second" },
        { label: "Utilisation of two GPUs", value: "231 / 3,000, about 7.7%" },
        { label: "Cost a month", value: "2 x $4 x 730 = $5,840" },
        { label: "Tokens a month", value: "20 million x 30 = 600 million" },
        { label: "Cost per million", value: "$5,840 / 600 = $9.73, about 9.7 times the API" },
        { label: "API for the same volume", value: "600 x $1 = $600 a month" },
        { label: "Break-even utilisation", value: "5,840 million / 7,884 million, about 74%" },
      ],
    },
    followUps: [
      {
        q: "What utilisation would make self-hosting cost the same as the $1 API?",
        a: "The break-even is 5,840 million tokens a month. Two GPUs at full load produce 3,000 x 3,600 x 730, about 7.88 billion tokens a month, so break-even is about 74 percent utilisation, far above the 7.7 percent in this case.",
      },
      {
        q: "Security would accept a managed service as long as it runs in their own cloud account and no data leaves their tenancy. What now?",
        a: "That is usually much cheaper to run and faster to start, so check that the chosen model and features are available there, that private connectivity and keys are in place, and that the retention terms satisfy the bank's policy, in writing.",
      },
      {
        q: "How do you answer the customer who asks whether the self-hosted model will be as good?",
        a: "Not necessarily. Offer to run the customer's own evaluation questions on candidate open models before any purchase and report the gap, with the cost of closing it (a larger model, more GPUs, fine-tuning).",
      },
    ],
    mistakes: [
      "Comparing a GPU's hourly price with an API's per-token price without taking utilisation into account.",
      "Saying self-hosting is always cheaper, or always more expensive, instead of calculating.",
      "Arguing with the security requirement instead of asking what it protects.",
      "Presenting example figures as quotes.",
    ],
  },

  "debug-high-gpu-util-low-throughput": {
    short:
      "The utilisation figure only says that some kernel (a small program on the GPU) was running during the sample, not how much of the chip was busy, so near 100 percent can mean a nearly idle GPU running tiny kernels. I would look at finer metrics (tensor core activity, memory bandwidth use, and the engine's running requests, batch size and KV cache usage), check that the benchmark and production workloads match, then look for a small effective batch, CPU-side gaps and hardware problems. I would reproduce it with a fixed load generator, profile a few steps and change one thing at a time.",
    explain: [
      {
        heading: "Why 100 percent can mean almost nothing",
        body: "The headline GPU utilisation counter reports the share of the sample period during which at least one kernel was running. A GPU running one tiny kernel all the time, using a small fraction of its cores, reports 100 percent. So utilisation says the GPU is not asleep and says nothing about how well it is used. The fix is to read finer counters: profiling metrics such as streaming multiprocessor (SM) activity, tensor core activity and memory bandwidth use (for example from NVIDIA's DCGM tool), plus the serving engine's own metrics: running against waiting requests, the achieved batch size, KV cache usage and preemptions.",
      },
      {
        heading: "Likely causes, from cheapest to check",
        body: "First compare like with like: was the benchmark run with the same prompt and output lengths, concurrency and sampling settings as production? Long production prompts mean more prefill and fewer output tokens a second. Second, a small effective batch: a low maximum-sequences setting, too little memory reserved for the KV cache, a router spreading load too thinly over replicas, or the cache thrashing with preemptions and recompute. Third, CPU-side or launch-bound work: tokenising and detokenising, scheduling or sampling in slow code, constrained (structured) output, or CUDA graphs turned off, which leave gaps between small kernels. Fourth, hardware: tensor parallelism over PCIe instead of NVLink (check the topology), cards throttling on power or temperature (look at clocks and throttle reasons), or a quantisation format that has no fast kernel and falls back to a slow one.",
      },
      {
        heading: "A method that finds it",
        body: "Reproduce with a fixed load generator that uses the production length mix. Profile a few steps, for example with Nsight Systems, to see where the time goes between kernels. Change one thing at a time and measure tokens per second and latency by phase. As an example of the pattern, take the 8B model on a 3.35 TB/s card: 64 running sequences give about 6,541 tokens a second, while about 13 give about 2,180, a third as much, and both show a busy GPU. So production averaging 13 running requests where the benchmark ran 64 would produce exactly this symptom, and the cause would be load or settings, not a lack of GPUs.",
      },
    ],
    diagram: {
      kind: "layers",
      layers: [
        { label: "1. Is the workload the same as the benchmark?", sub: "prompt and output lengths, concurrency, sampling" },
        { label: "2. What does the engine say?", sub: "running against waiting requests, batch size, KV cache use, preemptions" },
        { label: "3. What is the GPU actually doing?", sub: "SM activity, tensor core activity, memory bandwidth, not the headline percentage" },
        { label: "4. What is the CPU side doing?", sub: "tokeniser, scheduler, sampler, structured output, CUDA graphs" },
        { label: "5. Is the hardware healthy?", sub: "NVLink or PCIe, clocks, power and temperature throttling, kernel fallbacks" },
      ],
      caption: "Work from the outside in, cheapest check first, and change one thing at a time.",
    },
    example: {
      title: "Example: a busy GPU that does a third of the work",
      text: "Illustrative model of an 8B network in BF16 on a 3.35 TB/s card, each sequence holding 2,000 tokens of KV cache (262 MB), at peak bandwidth. It shows how a smaller batch gives a lower throughput while the GPU still looks fully busy.",
      rows: [
        { label: "Step time at 64 running sequences", value: "(16 + 64 x 0.262) GB / 3.35 TB/s = 9.8 ms" },
        { label: "Throughput at 64", value: "64 / 9.8 ms, about 6,541 tokens a second" },
        { label: "Step time at 13 running sequences", value: "(16 + 13 x 0.262) GB / 3.35 TB/s = 5.9 ms" },
        { label: "Throughput at 13", value: "13 / 5.9 ms, about 2,200 tokens a second, a third of the benchmark" },
        { label: "Reported GPU utilisation", value: "about 100% in both cases" },
      ],
    },
    followUps: [
      {
        q: "Tensor core activity is about 5 percent and memory bandwidth use about 20 percent while running requests average 3. What is your leading hypothesis?",
        a: "The batch is far too small, so the GPU is launch- or scheduler-bound. Check the maximum concurrency settings, the KV cache allocation, the client concurrency and whether the router spreads load too thinly over replicas.",
      },
      {
        q: "Which metrics would you put on the dashboard so this is caught before launch next time?",
        a: "Tokens per second for each GPU, achieved batch size, queue depth, KV cache usage and preemptions, TTFT and inter-token latency percentiles, tensor and bandwidth activity, and clocks with throttle reasons.",
      },
      {
        q: "How do you tell utilisation from saturation for capacity planning?",
        a: "Saturation shows up as growing queues, a full KV cache, rising time to first token and falling speed per user. Plan capacity on those signals against latency targets, not on the utilisation percentage.",
      },
    ],
    mistakes: [
      "Concluding that the GPUs are maxed out and ordering more of them.",
      "Trusting the vendor or benchmark number without checking that the workload matches.",
      "Changing several settings at once, then not knowing which one mattered.",
    ],
  },

  "design-serving-70b-for-2000-users": {
    short:
      "About 200 requests are in flight at peak, which is about 10 new requests a second, 30,000 prompt tokens a second and 4,000 output tokens a second. One 8-GPU node holds the weights (140 GB) and all the cache (up to 223 GB) and decodes at about 100 tokens a second per user, but prefill needs about 4.2 petaflops, more than one node sustains, so plan 2 nodes for peak plus 1 for redundancy, 3 in all. Autoscale on engine signals such as queue depth and KV cache use, and keep warm replicas, because loading a 70B model takes minutes.",
    explain: [
      {
        heading: "Turn 2,000 employees into load",
        body: "Two thousand active employees do not mean 2,000 simultaneous streams. About 10 percent have a request in flight, so 200 sequences. Each spends about 400 / 20 = 20 seconds decoding at the 20 tokens a second target. By Little's law (requests in the system = arrival rate x time in the system) the arrival rate is 200 / 20 = 10 requests a second. That means 10 x 3,000 = 30,000 prompt tokens a second to process and 10 x 400 = 4,000 output tokens a second at least.",
      },
      {
        heading: "Does it fit, and is each user fast enough",
        body: "The cache per token is 2 x 80 layers x 8 KV heads x 128 x 2 bytes = 327,680 bytes. A full 3,400-token sequence is about 1.11 GB, so 200 sequences need up to about 223 GB. BF16 weights are 140 GB, so 363 GB in all, which fits in one 8-GPU node (640 GB) with tensor parallelism of 8 over NVLink, with room to spare. For speed, take two nodes with 100 sequences each: a step reads about 140 GB of weights plus 111 GB of cache = 251 GB over 8 x 3.35 = 26.8 TB/s, about 9.4 ms, so about 100 tokens a second per user at peak bandwidth. That is far above 20, even at half the efficiency.",
      },
      {
        heading: "Prefill decides how many nodes, and time to first token",
        body: "Prefill costs about 2 x 70e9 = 1.4e11 operations per token, so 30,000 tokens a second needs 4.2 petaflops. One node peaks at about 8 x 990 = 7.9 petaflops and realistically sustains 40 to 50 percent, 3.2 to 4 petaflops, so prefill alone needs about 1.2 nodes. Prefix caching of the shared system prompt, or FP8, could cut that. So plan at least 2 nodes for peak and a third for N+1 redundancy, then confirm with a load test using the real prompt and output length mix, finding the concurrency where p95 time to first token breaks and running below that knee. One 3,000-token prefill is about 4.2e14 operations, about 0.1 s on a node, so p95 TTFT under 2 seconds is a queueing question: use chunked prefill so that prefill does not stall decode, admission control, per-team rate limits and headroom instead of running hot.",
      },
      {
        heading: "Scaling, and what happens on a cold start",
        body: "Autoscale on engine signals (waiting requests or queue depth, KV cache usage and p95 TTFT), not CPU or GPU utilisation, and route with awareness of load and prefix affinity so shared prompts hit the same cache. A new replica is slow: provisioning a node, pulling a multi-gigabyte image, loading 140 GB of weights (over 2 minutes even at 1 GB a second from object storage) and warming up, so minutes in total. So keep a minimum number of warm replicas, scale ahead of the 09:00 ramp on a schedule, cache the weights on local NVMe disks, and hold reserved capacity because on-demand GPUs may not be available. Scale-to-zero does not suit an interactive service with a TTFT target.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "load", label: "Load", sub: "200 in flight, 10 requests a second" },
        { id: "mem", label: "Memory", sub: "140 GB weights + up to 223 GB cache = 363 GB" },
        { id: "dec", label: "Decode speed", sub: "9.4 ms a step, about 100 tokens a second per user" },
        { id: "pre", label: "Prefill compute", sub: "4.2 PFLOP/s needed, about 1.2 nodes" },
        { id: "plan", label: "Nodes", sub: "2 for peak + 1 spare = 3 nodes, 24 GPUs" },
        { id: "scale", label: "Scaling", sub: "queue depth and KV use, warm minimum, scheduled ramp" },
      ],
      highlight: ["pre", "plan"],
      caption: "Memory and decode speed fit in one node. Prefill compute, redundancy and cold-start time decide the size.",
    },
    example: {
      title: "Example: sizing the 70B service",
      text: "80 layers, 8 KV heads, head size 128, 16-bit weights and cache, 8-GPU nodes of 80 GB cards with 3.35 TB/s and about 990 TFLOPS each. The 45 percent sustained compute and the 1 GB a second loading rate are assumptions.",
      rows: [
        { label: "In flight", value: "0.10 x 2,000 = 200 sequences" },
        { label: "Arrival rate (Little's law)", value: "200 / 20 s = 10 requests a second" },
        { label: "Cache per token", value: "2 x 80 x 8 x 128 x 2 = 327,680 bytes" },
        { label: "Cache for 200 full sequences", value: "200 x 1.11 GB = about 223 GB" },
        { label: "Decode step, 100 sequences a node", value: "251 GB / 26.8 TB/s = 9.4 ms" },
        { label: "Prefill compute needed", value: "1.4e11 x 30,000 = 4.2 PFLOP/s" },
        { label: "One node sustained at 45%", value: "7.9 x 0.45, about 3.6 PFLOP/s" },
        { label: "Weight load time at 1 GB a second", value: "140 s, plus provisioning and warm-up" },
      ],
    },
    followUps: [
      {
        q: "Would you run FP8 weights with tensor parallelism of 4 instead? What changes?",
        a: "The weights are about 70 GB over 4 x 80 GB cards, so each node holds two replicas, and prefill runs faster on FP8 tensor cores. There is less cache room per replica, and the quality must pass your evals.",
      },
      {
        q: "One node fails at 10:00 on a Monday: what do users see and what does the system do?",
        a: "Streams in flight on that node fail and the client must retry, and the router stops sending traffic after health checks fail. The remaining nodes cover peak only if the spare was provisioned; otherwise queueing raises TTFT, so shed low-priority traffic and degrade gracefully.",
      },
      {
        q: "When would you split prefill and decode onto separate GPU pools?",
        a: "When long prompts make prefill interfere with decode latency. Each pool can then be sized and tuned separately, at the cost of moving the KV cache between GPUs over a fast interconnect.",
      },
    ],
    mistakes: [
      "Treating 2,000 employees as 2,000 simultaneous decode streams without asking how many are actually in flight.",
      "Sizing on memory only and never checking prefill compute or per-user decode speed.",
      "Scaling on CPU or GPU utilisation, or planning scale-to-zero for an interactive service with a TTFT target.",
      "Having no redundancy: a single replica sized exactly for peak.",
    ],
  },

  "behavioural-capacity-decision-under-uncertainty": {
    short:
      "Tell one true story with numbers: the traffic you expected, the latency target, the budget, how long capacity took to get, and what was at stake. Show how you made the uncertainty explicit with scenarios, picked a staged or reversible option, grounded the numbers in a load test and then wrote the trade-off down for the people who owned the budget. Finish with the result, including what went wrong, and what changed afterwards.",
    explain: [
      {
        heading: "Start with the situation, in numbers",
        body: "A listener cannot judge a decision without its size. Say what traffic you expected and how sure you were, the latency target, the budget, how long it took to obtain capacity (days for on-demand, weeks or longer for reserved or new hardware) and what was at stake: a launch date, a customer, an outage. Then say what the uncertainty was: demand forecast far from certain, unknown throughput on your real prompts, or a vendor's capacity you did not control. Use your own real story. The example below is an invented illustration of the shape, with invented numbers.",
      },
      {
        heading: "Make the uncertainty explicit, then choose a reversible step",
        body: "Give a range, not a guess, and say what would change the decision. Name the cost of being wrong in each direction: idle spend if you buy too much, an outage or a lost launch if you buy too little. Where you can, choose the option that you can undo: commit to the floor of the forecast and cover the rest with on-demand capacity, an API fallback or a smaller model. Ground the numbers in a load test with a realistic prompt and output mix, and agree in advance on the trigger metrics (queue depth, p95 latency, utilisation) that would make you revisit it.",
      },
      {
        heading: "Communicate, then close the loop",
        body: "Write the trade-offs down for the people who own the budget and the product, and get an explicit decision rather than an assumed one. Then report how it turned out with numbers, including what went wrong and your own part in it, and what changed afterwards: a blameless review, a runbook, alerts or a new capacity process. Avoid a hero story of fixing everything alone overnight; a good answer shows a system that now needs fewer heroes. If someone senior disagreed, say how you turned it into a question about data and risk and proposed a test or a staged commitment.",
      },
    ],
    diagram: {
      kind: "timeline",
      steps: [
        { label: "Situation", detail: "Expected traffic, latency target, budget, how long capacity takes, what was at stake." },
        { label: "Uncertainty", detail: "A range of scenarios, what would change the decision, and the cost of being wrong each way." },
        { label: "Options", detail: "Prefer staged or reversible: commit to the floor, cover the rest with on-demand, an API fallback or a smaller model." },
        { label: "Evidence", detail: "A load test with a realistic prompt and output mix, and trigger metrics agreed in advance." },
        { label: "Decision", detail: "Trade-offs written down for the budget and product owners, with an explicit decision." },
        { label: "Result", detail: "What happened in numbers, what went wrong, and what changed in practice afterwards." },
      ],
      caption: "The shape of a good story. Every step should contain a number or a concrete action.",
    },
    example: {
      title: "Example: an invented illustration of the shape, with made-up numbers",
      text: "Suppose a team must launch an assistant. Demand forecast is 3, 6 or 12 requests a second, one node serves 4 a second, a reserved node costs 30 units an hour and an on-demand node 50 (all invented for this illustration), 730 hours a month.",
      rows: [
        { label: "Nodes needed in the three scenarios", value: "1, 2 and 3" },
        { label: "Option A: reserve 3 nodes", value: "3 x 30 x 730 = 65,700 a month, whatever the demand" },
        { label: "Waste if demand is the low case", value: "65,700 - 21,900 = 43,800 a month" },
        { label: "Option B: reserve 1, rest on demand", value: "21,900 a month, plus extra nodes only when needed" },
        { label: "Option B in the high case, extra nodes busy 25% of hours", value: "21,900 + 2 x 50 x 730 x 0.25 = 40,150" },
        { label: "Risk of option B and its cover", value: "on-demand GPUs may be unavailable at peak: an API fallback and a queue cap" },
      ],
    },
    followUps: [
      {
        q: "Looking back, what would you do differently, and what did it cost to learn that?",
        a: "Name one specific mistake that was yours, say what it cost in money, time or user impact, and describe the concrete change you made in practice. General lessons such as \"communicate more\" are weaker than a new alert or a new review step.",
      },
      {
        q: "Someone senior disagreed with your call. How did you handle it?",
        a: "Listen first, then turn the disagreement into a question about data and risk, and propose a test or a staged commitment that settles it. If it still cannot be settled, escalate cleanly to whoever owns the decision.",
      },
    ],
    mistakes: [
      "Telling a story with no numbers, or one whose answer was simply to buy the biggest GPUs available.",
      "Blaming the vendor, the cloud or another team and describing no change you made yourself.",
      "A hero narrative of fixing it alone overnight, with no follow-up to prevent a repeat.",
    ],
  },
};
