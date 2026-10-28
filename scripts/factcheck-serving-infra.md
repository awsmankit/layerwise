# Fact-check: serving, infra, local, edge, cost, systems

Checked on 2026-10-28 against primary sources (vendor spec pages and documentation, the Llama 3 paper, project READMEs and release feeds). 22 lessons read in full; every numeric, dated, versioned or named claim was checked, and every worked example was recomputed. Lessons that needed no change were left alone (`updated` was not touched on them).

## Corrections made

| Lesson | Claim | What was wrong or unverifiable | Fix | Source |
|---|---|---|---|---|
| infra/gpu-and-accelerator-instances | Azure "own silicon": "none for NVIDIA-style training" | Microsoft has its own Maia accelerators (Maia 200 announced January 2026, Maia 300 October 2026), used inside Microsoft services and not rentable as VMs. "None" was misleading. | Cell now says Maia chips run Microsoft's own services and are not rentable as VMs; AMD option kept | blogs.microsoft.com (Oct 12 2026 and Jan 26 2026 posts) |
| infra/gpu-and-accelerator-instances | "Microsoft says net new NC A100 v4 capacity is not planned" | The NC A100 v4 page says Microsoft is "only deploying net new capacity" for NCads H100 v5. It does not say A100 capacity is withdrawn, and gives no retirement date. | Reworded to match the notice, with "plan for A100 capacity not growing" | learn.microsoft.com NC_A100_v4 page |
| infra/gpu-and-accelerator-instances | "Google A3 Mega gives up to 1,800 Gbps GPU-to-GPU" | 1,800 Gbps is the maximum network bandwidth of an A3 Mega VM with GPUDirect-TCPXO, not GPU-to-GPU inside the VM (that is NVLink, 900 GB/s). Google's family table lists A3 as "up to 1,000 Gbps" for the group. | Now "up to 1,800 Gbps of network bandwidth between VMs when GPUDirect-TCPXO is set up"; added the NVLink figures (900 GB/s H100/H200, 1,800 GB/s B200); "over RDMA" dropped for A3 Ultra and A4, whose table gives 3,600 Gbps without that wording | docs.cloud.google.com GPUDirect page and accelerator-optimized machines |
| infra/gpu-and-accelerator-instances | "Ironwood reached general availability in late 2025"; "TPU 8t and 8i were announced for later in 2026" | Google's November 2025 post says Ironwood "will be generally available in the coming weeks"; no primary source confirms the GA date. TPU 8t and 8i were announced at Cloud Next in April 2026 with GA promised "later this year". | Rewritten to say exactly that, plus 192 GiB HBM per chip and 9,216-chip pods (from Google's TPU7x page); tells readers to check the TPU docs for what can be ordered | cloud.google.com Ironwood post (7 Nov 2025), docs.cloud.google.com/tpu/docs/tpu7x, blog.google eighth-generation TPU post |
| infra/gpu-and-accelerator-instances | "A3 Ultra and A4 cannot be created as ordinary on-demand VMs. You need a capacity reservation, Spot, or Flex-start." | Mostly right but imprecise. Google's consumption table allows Spot, Flex-start and *future* reservations (calendar mode or capacity block) for A3 Ultra and A4. A4X and A4X Max are capacity blocks only. A3 Mega, G4 and G2 can be created on demand. | Reworded with the table's actual options | docs.cloud.google.com/compute/docs/accelerator-optimized-machines (consumption table) |
| infra/gpu-and-accelerator-instances | Sources list | No source for Ironwood | Added the TPU7x docs page | |
| infra/multi-gpu-parallelism-and-interconnect | "the largest single GPUs hold 80 to roughly 190 GB" | Stale: AMD's MI355X has 288 GB and NVIDIA's B300 is listed at 288 GB by secondary sources (NVIDIA lists 2.1 TB for a DGX B300). | "single GPUs hold from 80 GB up to more than 250 GB (AMD's MI355X has 288 GB)" | amd.com MI355X page and datasheet |
| infra/multi-gpu-parallelism-and-interconnect | "Google quotes up to 3,600 Gbps over RDMA for A3 Ultra and A4" | Google's table gives "3,600 Gbps" as max network bandwidth, with no RDMA wording in the part read | "up to 3,600 Gbps of network bandwidth" | docs.cloud.google.com accelerator-optimized machines |
| infra/kubernetes-and-autoscaling-for-inference | "see the failure modes lesson for the noisy-neighbour risk" | There is no failure-modes lesson; the point is in the GPU observability lesson | Now links to the observability lesson | internal |
| infra/gpu-observability-and-capacity-planning | DCGM field `DCGM_FI_DEV_CLOCK_THROTTLE_REASONS` | Deprecated alias; the current field is `DCGM_FI_DEV_CLOCKS_EVENT_REASONS` | Table row shows the current name and the older one | github.com/NVIDIA/DCGM `dcgm_fields.h` |
| serving/inference-optimisation | "vLLM, SGLang, TensorRT-LLM and Hugging Face TGI implement most of these techniques" | TGI is in maintenance mode, and its repository is archived (last push 21 March 2026). Its README recommends vLLM, SGLang, llama.cpp and MLX. | TGI mention now says so and advises against new deployments | github.com/huggingface/text-generation-inference (README, GitHub API) |
| infra extras (quiz takeaway) | Google A3 Ultra and A4 "need a reservation, Spot or Flex-start" | Same imprecision as above | Now "cannot be created on demand (they need Spot, Flex-start or a future reservation)" | as above |

## Links replaced

| Lesson | Old | New |
|---|---|---|
| cost/where-the-tokens-go | https://www.anthropic.com/pricing | https://claude.com/pricing |
| edge/edge-vs-cloud-inference | https://ai.google.dev/edge/litert | https://developers.google.com/edge/litert |
| edge/edge-vs-cloud-inference | https://pytorch.org/executorch/ | https://docs.pytorch.org/executorch/ |
| infra/training-infrastructure | https://pytorch.org/docs/stable/fsdp.html | https://docs.pytorch.org/docs/stable/fsdp.html |
| systems/rag-service-architecture | https://www.anthropic.com/engineering/building-effective-agents | https://www.anthropic.com/research/building-effective-agents |
| several | https://docs.vllm.ai, https://huggingface.co/docs/safetensors | the canonical `/en/latest/` and `/index` forms (these redirected) |

No source link in these six tracks was broken (91 checked). The checker also reports `?hl=...` redirects for two Google Cloud docs pages; those are locale redirects caused by the checker's request, not moves, so the original URLs were kept.

## Verified correct, no change needed

- **GPU spec table (reading-a-gpu-spec-sheet):** T4, L4, L40S, A100, H100, H200 and B200 memory, bandwidth, NVLink and power match NVIDIA's pages. NVIDIA prints sparse FP16/BF16 figures (1,979 TFLOPS for H100 and H200, 624 for A100, 242 for L4, 733 for L40S); the lesson's dense figures are exactly half. A10G 24 GB GDDR6 at 600 GB/s confirmed. B200 per-GPU 180 GB, 8 TB/s and 1.8 TB/s NVLink follow from DGX B200's 1,440 GB, 64 TB/s and 14.4 TB/s for eight GPUs. The HBM-versus-GDDR ratios (2.4 times, over 10 times) and the decode worked example (about 18, 60, 200, 670 tokens per second) recompute exactly.
- **Instance families:** AWS P5 (8 H100, 3,200 Gbps EFA, 900 GB/s NVSwitch), P5e and P5en (H200), P6-B200 (8 GPUs, 1,440 GB, sold as Capacity Blocks, launched 15 May 2025), P6-B300, P6e-GB200, P4d and P4de (A100), G5, G6, G6e, G7 and G7e; Azure ND H100 v5 (8 H100 80 GB, 400 Gbps Quantum-2 InfiniBand per GPU), ND A100 v4 (8 A100 40 GB), ND MI300X v5, ND H200 v5, ND GB200 v6 (4 GPUs per VM, 18 VMs form a 72-GPU, 13.5 TB rack), NCads H100 v5 (up to 2 H100 NVL 94 GB), NCasT4_v3; Google A4X Max (GB300, bare metal), A4X, A4, A3 Ultra, A3 Mega, High and Edge, A2, G4, G2.
- **SageMaker:** Capacity-Aware Instance Pools announced May 2026, up to five instance types; HyperPod with Slurm or EKS, job auto-resume for Kubeflow PyTorch jobs, two-tier KV cache and prefix-aware and KV-aware routing.
- **Training infrastructure:** the Llama 3 reliability figures match the paper's text exactly (54-day period, 466 interruptions, 47 planned and 419 unexpected, about 78 percent hardware, GPUs 58.7 percent, over 90 percent effective training time, manual intervention three times, MFU 38 to 43 percent, up to 16K H100). ZeRO's 16 bytes per parameter, 112 GB for 7B and 17.5 GB per GPU for 70B on 64 GPUs recompute.
- **Memory and economics arithmetic:** every row of the "what fits" table, the KV sizes (131,072 bytes per token, about 1 GB at 8,000 tokens, 2.5 times for a 70B shape), the bandwidth ceilings, the cost per million tokens (0.74, 1.48, 7.41), the 2,920 per month and 2.9 billion token break-even (74 percent of capacity), the fleet-sizing example (3 replicas plus 1 spare, about 5 GB KV per replica), the speculative-decoding expectation table (3.36, 2.31, 4.33; limit 5) and the support-assistant cost example ($0.015, $300, about $9,000 per month; 88 percent of tokens, 60 percent of cost).
- **Engines:** TGI maintenance-mode wording and its recommendation of vLLM and SGLang are in its own README. Latest releases seen: vLLM v0.32.0, SGLang v0.5.22, Ollama v0.40.12 (the lessons name no versions).
- Papers cited (Megatron-LM, GPipe, ZeRO, Switch Transformers, Mixtral, PagedAttention, FlashAttention, Medusa, speculative decoding, SARATHI, DistServe, GQA, MQA, GPTQ, AWQ, Hinton distillation, Han pruning, FrugalGPT, Orca) match their titles and years.

## Could not verify (left as written, flagged)

- NVIDIA's own B300 per-GPU memory (secondary sources and AMD say 288 GB for the MI355X; the lesson now cites only the AMD figure).
- The exact Ironwood general-availability date (no primary source; the lesson no longer states one).
- Whether DCGM exporter ships `DCGM_FI_DEV_CLOCKS_EVENT_REASONS` in its default counters (it does not appear in `default-counters.csv`; the lesson already says "check your version").
