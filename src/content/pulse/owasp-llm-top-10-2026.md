---
title: OWASP publishes its 2026 Top 10 for LLM applications
date: 2026-10-26
tags: [security, evals]
source:
  label: OWASP GenAI Security Project, LLM Top 10 2026
  url: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/
---

**What changed.** OWASP's GenAI Security Project published the 2026 edition of its Top 10 for LLM applications, dated 3 August 2026. The list is still ten entries, and Prompt Injection is still first. OWASP's own rank chart shows Excessive Agency moving from sixth to third, Unbounded Consumption from tenth to sixth and Misinformation from ninth to seventh, Improper Output Handling falling from fifth to tenth, and System Prompt Leakage (seventh in 2025) renamed and re-scoped as Hidden Context Exposure, now eighth. The preface says the ranking weighs the community vote at three quarters and public incident data at one quarter.

**Why it matters.** Many security reviews and questionnaires cite these IDs. The IDs moved between editions (for example LLM06:2025 Excessive Agency is now LLM03:2026), so say which edition you mean when you cite one.

**What to do.** Map your threat model to the 2026 names, review what your agents can do (Excessive Agency is now third), and re-run your prompt-injection tests. The [LLM security lesson](../../learn/evals/llm-security/) walks through each risk.
