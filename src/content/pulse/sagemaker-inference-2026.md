---
title: "Spring 2026: SageMaker AI adds capacity-aware pools and OpenAI-compatible endpoints"
date: 2026-10-26
tags: [cloud, aws, serving]
source:
  label: AWS Machine Learning Blog, SageMaker inference 2026 launches in review
  url: https://aws.amazon.com/blogs/machine-learning/amazon-sagemaker-inference-2026-year-to-date-launches-in-review/
---

**What changed.** AWS's review of 2026 SageMaker AI inference launches lists Inference Recommendations (April), Capacity-Aware Instance Pools that fall back across up to five instance types (May), and OpenAI-compatible APIs on endpoints (May). HyperPod Inference added a two-tier KV cache shared across nodes, with prefix-aware and KV-aware routing.

**Why it matters.** GPU capacity shortages are the most common reason a deployment fails to scale. Mixing instance types with automatic fallback is now a managed option rather than something you build.

**What to do.** If you host models on SageMaker, look at instance pools before your next capacity crunch. Background in [Quotas, capacity and regions](../../learn/cloud/quotas-capacity-and-regions/).
