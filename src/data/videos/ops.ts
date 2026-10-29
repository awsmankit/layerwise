import type { LessonVideos } from './types';

/**
 * Tracks: serving, infra, local, cloud, cost, edge. Keys are "<track>/<slug>".
 *
 * Every entry was checked against YouTube's oEmbed endpoint on 2026-10-29: `title`
 * and `creator` are copied from that response, and `minutes` comes from the watch
 * page's `lengthSeconds`. Independent educators and well-known conference talks are
 * preferred. Vendor channels appear only where no independent educator covers the
 * topic (cloud security, cloud capacity).
 */
export const videosOps: LessonVideos = {
  // ── serving ────────────────────────────────────────────────────────────────
  'serving/life-of-a-request': [
    {
      creator: '3Blue1Brown',
      title: 'Large Language Models explained briefly',
      url: 'https://www.youtube.com/watch?v=LPZh9BOjkQs',
      minutes: 8,
      easy: true,
    },
    {
      creator: 'PyTorch',
      title: 'Understanding the LLM Inference Workload - Mark Moyou, NVIDIA',
      url: 'https://www.youtube.com/watch?v=z2M8gKGYws4',
      minutes: 34,
    },
  ],
  'serving/kv-cache-and-memory': [
    {
      creator: 'Efficient NLP',
      title: 'The KV Cache: Memory Usage in Transformers',
      url: 'https://www.youtube.com/watch?v=80bIUggRJf4',
      minutes: 9,
    },
    {
      creator: 'Anyscale',
      title: 'Fast LLM Serving with vLLM and PagedAttention',
      url: 'https://www.youtube.com/watch?v=5ZlavKF_98U',
      minutes: 32,
    },
    {
      creator: 'Umar Jamil',
      title:
        'LLaMA explained: KV-Cache, Rotary Positional Embedding, RMS Norm, Grouped Query Attention, SwiGLU',
      url: 'https://www.youtube.com/watch?v=Mn_9W1nCFLo',
      minutes: 71,
    },
  ],
  'serving/quantization': [
    {
      creator: 'Matt Williams',
      title: 'Optimize Your AI - Quantization Explained',
      url: 'https://www.youtube.com/watch?v=K75j8MkwgJ0',
      minutes: 12,
    },
    {
      creator: 'Umar Jamil',
      title:
        'Quantization explained with PyTorch - Post-Training Quantization, Quantization-Aware Training',
      url: 'https://www.youtube.com/watch?v=0VdNflU08yA',
      minutes: 51,
    },
    {
      creator: 'Maarten Grootendorst',
      title: 'Which Quantization Method is Right for You? (GPTQ vs. GGUF vs. AWQ)',
      url: 'https://www.youtube.com/watch?v=mNE_d-C82lI',
      minutes: 16,
    },
  ],
  'serving/inference-optimisation': [
    {
      creator: 'Julien Simon',
      title: 'Deep Dive: Optimizing LLM inference',
      url: 'https://www.youtube.com/watch?v=hMs8VNRy5Ys',
      minutes: 36,
    },
    {
      creator: 'Efficient NLP',
      title: 'Speculative Decoding: When Two LLMs are Faster than One',
      url: 'https://www.youtube.com/watch?v=S-8yr_RibJ4',
      minutes: 13,
    },
    {
      creator: 'Stanford MLSys Seminars',
      title: 'FlashAttention - Tri Dao | Stanford MLSys #67',
      url: 'https://www.youtube.com/watch?v=gMOAud7hZg4',
      minutes: 59,
    },
  ],

  // ── infra ──────────────────────────────────────────────────────────────────
  'infra/gpu-basics': [
    {
      creator: 'Branch Education',
      title: 'How do Graphics Cards Work?  Exploring GPU Architecture',
      url: 'https://www.youtube.com/watch?v=h9Z4oGN89MU',
      minutes: 29,
      easy: true,
    },
    {
      creator: 'Fireship',
      title: 'Nvidia CUDA in 100 Seconds',
      url: 'https://www.youtube.com/watch?v=pPStdjuYzSI',
      minutes: 3,
    },
    {
      creator: 'CNBC',
      title: 'How Nvidia GPUs Compare To Google’s And Amazon’s AI Chips',
      url: 'https://www.youtube.com/watch?v=RBmOgQi4Fr0',
      minutes: 16,
      easy: true,
    },
  ],
  'infra/reading-a-gpu-spec-sheet': [
    {
      creator: 'Asianometry',
      title: 'The Special Memory Powering the AI Revolution',
      url: 'https://www.youtube.com/watch?v=yAw63F1W_Us',
      minutes: 13,
    },
    {
      creator: 'PyTorch',
      title: 'Understanding the LLM Inference Workload - Mark Moyou, NVIDIA',
      url: 'https://www.youtube.com/watch?v=z2M8gKGYws4',
      minutes: 34,
    },
  ],
  'infra/gpu-and-accelerator-instances': [
    {
      creator: 'CNBC',
      title: 'How Nvidia GPUs Compare To Google’s And Amazon’s AI Chips',
      url: 'https://www.youtube.com/watch?v=RBmOgQi4Fr0',
      minutes: 16,
    },
  ],
  'infra/multi-gpu-parallelism-and-interconnect': [
    {
      creator: 'MIT HAN Lab',
      title: 'EfficientML.ai Lecture 19 - Distributed Training Part 1 (MIT 6.5940, Fall 2024)',
      url: 'https://www.youtube.com/watch?v=LcOM-nZdqxw',
      minutes: 70,
    },
    {
      creator: 'Anyscale',
      title: 'The Evolution of Multi-GPU Inference in vLLM | Ray Summit 2024',
      url: 'https://www.youtube.com/watch?v=oMb_WiUwf5o',
      minutes: 31,
    },
  ],
  'infra/training-infrastructure': [
    {
      creator: 'Umar Jamil',
      title:
        'Distributed Data Parallel (DDP) with PyTorch: complete tutorial with cloud infrastructure and code',
      url: 'https://www.youtube.com/watch?v=toUSzwR0EV8',
      minutes: 73,
    },
    {
      creator: 'Yannic Kilcher',
      title: 'Turing-NLG, DeepSpeed and the ZeRO optimizer',
      url: 'https://www.youtube.com/watch?v=tC01FRB0M7w',
      minutes: 21,
    },
  ],
  'infra/kubernetes-and-autoscaling-for-inference': [
    {
      creator: 'Kubesimplify',
      title: 'vLLM on Kubernetes in Production',
      url: 'https://www.youtube.com/watch?v=t0iJGEG0IXk',
      minutes: 28,
    },
    {
      creator: 'CNCF [Cloud Native Computing Foundation]',
      title:
        'Optimizing Load Balancing and Autoscaling for Large Language Model (LLM) Inference on Kub... D. Gray',
      url: 'https://www.youtube.com/watch?v=TSEGAh1bs4A',
      minutes: 38,
    },
  ],
  'infra/gpu-observability-and-capacity-planning': [
    {
      creator: 'AI Engineer',
      title:
        'Mastering LLM Inference Optimization From Theory to Cost Effective Deployment: Mark Moyou',
      url: 'https://www.youtube.com/watch?v=9tvJ_GYJA-o',
      minutes: 34,
    },
  ],

  // ── local ──────────────────────────────────────────────────────────────────
  'local/run-models-locally': [
    {
      creator: 'NetworkChuck',
      title: 'host ALL your AI locally',
      url: 'https://www.youtube.com/watch?v=Wjrdr0NU4Sk',
      minutes: 24,
      easy: true,
    },
    {
      creator: 'Tech With Tim',
      title: 'Learn Ollama in 15 Minutes - Run LLM Models Locally for FREE',
      url: 'https://www.youtube.com/watch?v=UtSSMs6ObqY',
      minutes: 14,
      easy: true,
    },
    {
      creator: 'Matt Williams',
      title: 'The Ollama Course: Basics',
      url: 'https://www.youtube.com/playlist?list=PLvsHpqLkpw0fIT-WbjY-xBRxTftjwiTLB',
    },
  ],
  'local/memory-math-for-local-models': [
    {
      creator: 'Matt Williams',
      title: 'Optimize Your AI - Quantization Explained',
      url: 'https://www.youtube.com/watch?v=K75j8MkwgJ0',
      minutes: 12,
    },
    {
      creator: 'Matt Williams',
      title: 'AI Model Context Decoded',
      url: 'https://www.youtube.com/watch?v=-Lyk7ygQw2E',
      minutes: 8,
    },
    {
      creator: 'Alex Ziskind',
      title: 'What Computer Should You Buy for Local AI',
      url: 'https://www.youtube.com/watch?v=mevUEQcumzU',
      minutes: 11,
    },
  ],
  'local/inference-engines-compared': [
    {
      creator: 'Syntax',
      title: 'Local AI Explained | Hardware, Setup and Models',
      url: 'https://www.youtube.com/watch?v=QKdKcFjjZhE',
      minutes: 25,
    },
    {
      creator: 'Devsplainers',
      title: 'vLLM VS Ollama. Explained in 16-Bit',
      url: 'https://www.youtube.com/watch?v=oML9lTnJjX8',
      minutes: 10,
    },
  ],
  'local/private-and-air-gapped-ai': [
    {
      creator: 'NetworkChuck',
      title: 'Run your own AI (but private)',
      url: 'https://www.youtube.com/watch?v=WxYC9-hBM_g',
      minutes: 22,
    },
    {
      creator: 'NetworkChuck',
      title: 'the ONLY way to run Deepseek...',
      url: 'https://www.youtube.com/watch?v=7TR-FLWNVHY',
      minutes: 12,
    },
  ],
  'local/self-hosting-vs-api-economics': [
    {
      creator: 'AI Engineer',
      title:
        'Mastering LLM Inference Optimization From Theory to Cost Effective Deployment: Mark Moyou',
      url: 'https://www.youtube.com/watch?v=9tvJ_GYJA-o',
      minutes: 34,
    },
  ],

  // ── cloud ──────────────────────────────────────────────────────────────────
  'cloud/cloud-ai-service-map': [
    {
      creator: 'Krish Naik',
      title: 'Generative AI In AWS-AWS Bedrock Crash Course #awsbedrock #genai',
      url: 'https://www.youtube.com/watch?v=2maPaQutcWs',
      minutes: 37,
    },
    {
      creator: 'Krish Naik',
      title:
        'Building Ai agents With Microsoft Foundry- Build ,Govern AI Apps And Agents at Scale',
      url: 'https://www.youtube.com/watch?v=ZP_U8eKBy2g',
      minutes: 17,
    },
    {
      creator: 'GCP Study Hub',
      title: 'Gemini Enterprise Agent Platform is here. (RIP Vertex AI)',
      url: 'https://www.youtube.com/watch?v=5MxBkBgdCJc',
      minutes: 33,
    },
  ],
  'cloud/bedrock-sagemaker-foundry-vertex': [
    {
      creator: 'Krish Naik',
      title: 'AWS Sagemaker AI Crash Course-Customize and Deploy Any LLM',
      url: 'https://www.youtube.com/watch?v=oUl_z3SNopU',
      minutes: 65,
    },
    {
      creator: "John Savill's Technical Training",
      title: 'Azure AI Foundry Overview',
      url: 'https://www.youtube.com/watch?v=Sq8Cq7RZM2o',
      minutes: 88,
    },
    {
      creator: 'Victor Dantas',
      title: 'Google AI Studio vs Vertex AI vs Gemini... Making sense of the madness',
      url: 'https://www.youtube.com/watch?v=MRDK8gAzDI8',
      minutes: 12,
    },
  ],
  'cloud/what-is-bedrock': [
    {
      creator: 'Krish Naik',
      title: 'Generative AI In AWS-AWS Bedrock Crash Course #awsbedrock #genai',
      url: 'https://www.youtube.com/watch?v=2maPaQutcWs',
      minutes: 37,
    },
    {
      creator: 'codebasics',
      title: 'Amazon Bedrock AgentCore Tutorial | Build, Deploy, Operate AI Agents using AgentCore',
      url: 'https://www.youtube.com/watch?v=cTBGIKAckKE',
      minutes: 57,
    },
  ],
  'cloud/sagemaker-and-hyperpod': [
    {
      creator: 'Krish Naik',
      title: 'AWS Sagemaker AI Crash Course-Customize and Deploy Any LLM',
      url: 'https://www.youtube.com/watch?v=oUl_z3SNopU',
      minutes: 65,
    },
    {
      creator: 'Krish Naik',
      title: '#3-Deployment Of Huggingface OpenSource LLM Models In AWS Sagemakers With Endpoints',
      url: 'https://www.youtube.com/watch?v=U72q95dHpRo',
      minutes: 23,
    },
  ],
  'cloud/microsoft-foundry-and-azure-openai': [
    {
      creator: "John Savill's Technical Training",
      title: 'Azure AI Foundry Overview',
      url: 'https://www.youtube.com/watch?v=Sq8Cq7RZM2o',
      minutes: 88,
    },
    {
      creator: "John Savill's Technical Training",
      title: 'Azure OpenAI Deployment Types and Resiliency',
      url: 'https://www.youtube.com/watch?v=HnUNi1RMMTA',
      minutes: 50,
    },
  ],
  'cloud/google-vertex-and-gemini-platform': [
    {
      creator: 'GCP Study Hub',
      title: 'Gemini Enterprise Agent Platform is here. (RIP Vertex AI)',
      url: 'https://www.youtube.com/watch?v=5MxBkBgdCJc',
      minutes: 33,
    },
    {
      creator: 'freeCodeCamp.org',
      title: 'Google Generative AI Leader Certification Course – Pass the Exam!',
      url: 'https://www.youtube.com/watch?v=30diF8dKpAY',
      minutes: 204,
    },
    {
      creator: 'Victor Dantas',
      title: 'Google AI Studio vs Vertex AI vs Gemini... Making sense of the madness',
      url: 'https://www.youtube.com/watch?v=MRDK8gAzDI8',
      minutes: 12,
    },
  ],
  // No independent educator covers these two topics, so these are vendor talks, one per cloud.
  'cloud/cloud-security-and-networking-for-ai': [
    {
      creator: 'AWS Events',
      title:
        'AWS re:Invent 2024 - Understanding security & privacy on Amazon Bedrock, featuring Remitly (AIM360)',
      url: 'https://www.youtube.com/watch?v=3Sxw6IIYhdE',
      minutes: 55,
    },
    {
      creator: 'Microsoft Security',
      title: 'Securing AI with Azure AI Foundry | Built-in protections for Cloud & AI platforms',
      url: 'https://www.youtube.com/watch?v=w3O1ZY_9lPg',
      minutes: 10,
    },
    {
      creator: 'Google Cloud Tech',
      title: 'How to secure your cloud with VPC Service Controls',
      url: 'https://www.youtube.com/watch?v=5lcrA3sANHk',
      minutes: 8,
    },
  ],
  'cloud/quotas-capacity-and-regions': [
    {
      creator: "John Savill's Technical Training",
      title: 'Azure OpenAI Deployment Types and Resiliency',
      url: 'https://www.youtube.com/watch?v=HnUNi1RMMTA',
      minutes: 50,
    },
    {
      creator: 'AWS Events',
      title:
        'Reserving GPU instances in Amazon EC2 UltraClusters for ML workloads -AWS OnAir S5 | AWS Events',
      url: 'https://www.youtube.com/watch?v=_G--lUMAUUI',
      minutes: 27,
    },
    {
      creator: 'Google Cloud Tech',
      title: 'Dynamic Workload Scheduler for AI workloads',
      url: 'https://www.youtube.com/watch?v=uWiO00RVQP4',
      minutes: 6,
    },
  ],

  // ── cost ───────────────────────────────────────────────────────────────────
  'cost/where-the-tokens-go': [
    {
      creator: 'Computerphile',
      title: 'Why AI Tokens are so Expensive - Computerphile',
      url: 'https://www.youtube.com/watch?v=-0HRzXk8vlk',
      minutes: 25,
    },
    {
      creator: 'Andrej Karpathy',
      title: "Let's build the GPT Tokenizer",
      url: 'https://www.youtube.com/watch?v=zduSFxRajkE',
      minutes: 134,
    },
  ],
  'cost/cost-levers': [
    {
      creator: 'AI Engineer',
      title:
        'Mastering LLM Inference Optimization From Theory to Cost Effective Deployment: Mark Moyou',
      url: 'https://www.youtube.com/watch?v=9tvJ_GYJA-o',
      minutes: 34,
    },
  ],

  // ── edge ───────────────────────────────────────────────────────────────────
  'edge/edge-vs-cloud-inference': [
    {
      creator: 'Tiff In Tech',
      title: "Inside Apple's Private Cloud Compute: A Game-Changing Approach to AI Privacy",
      url: 'https://www.youtube.com/watch?v=QmNqODfZDCk',
      minutes: 25,
    },
    {
      creator: 'EDGE AI FOUNDATION',
      title: 'tinyML Talks - Pete Warden: Getting started with TinyML',
      url: 'https://www.youtube.com/watch?v=soOM1F70Boc',
      minutes: 65,
    },
    {
      creator: 'MIT HAN Lab',
      title: 'EfficientML.ai Lecture 1 - Introduction (MIT 6.5940, Fall 2024)',
      url: 'https://www.youtube.com/watch?v=U7EPZv8Kh9w',
      minutes: 66,
    },
  ],
  'edge/quantization-for-edge': [
    {
      creator: 'Efficient NLP',
      title: 'Quantization vs Pruning vs Distillation: Optimizing NNs for Inference',
      url: 'https://www.youtube.com/watch?v=UcwDgsMgTu4',
      minutes: 20,
    },
    {
      creator: 'MIT HAN Lab',
      title: 'EfficientML.ai Course | 2023 Fall | MIT 6.5940',
      url: 'https://www.youtube.com/playlist?list=PL80kAHvQbh-pT4lCkDT53zT8DKmhE0idB',
    },
    {
      creator: 'MIT HAN Lab',
      title: 'EfficientML.ai Lecture 10 - MCUNet and TinyML (MIT 6.5940, Fall 2024)',
      url: 'https://www.youtube.com/watch?v=uR1KKhIhHEk',
      minutes: 67,
    },
  ],
};
