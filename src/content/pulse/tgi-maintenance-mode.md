---
title: "December 2025: Hugging Face puts TGI into maintenance mode"
date: 2026-10-26
tags: [serving, open source]
source:
  label: huggingface/text-generation-inference on GitHub
  url: https://github.com/huggingface/text-generation-inference
---

**What changed.** Hugging Face's Text Generation Inference (TGI) server entered maintenance mode on 11 December 2025, accepting only small fixes. The repository was archived in March 2026. Hugging Face now recommends vLLM and SGLang for serving, and llama.cpp or MLX for running models locally.

**Why it matters.** Existing TGI deployments keep working, but new model architectures and hardware support will not arrive there.

**What to do.** If you run TGI, plan a move and re-run your evals and load tests on the new engine before switching. Compare the options in [Inference engines compared](../../learn/local/inference-engines-compared/).
