---
title: OWASP publishes its 2026 Top 10 for LLM applications
date: 2026-10-26
tags: [security, evals]
source:
  label: OWASP GenAI Security Project, LLM Top 10 2026
  url: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/
---

**What changed.** OWASP's GenAI Security Project published the 2026 edition of its Top 10 for LLM applications, dated 3 August 2026. Prompt injection stays first. Entries were renamed and reordered: for example, system prompt leakage is now covered as hidden context exposure, and improper output handling moved to tenth. Agent-specific risks now sit in OWASP's separate Top 10 for agentic applications.

**Why it matters.** Many security reviews and questionnaires cite these IDs. You will see both the 2025 and the 2026 numbering for a while, so say which edition you mean.

**What to do.** Map your threat model to the 2026 names, and re-run your prompt-injection tests. The [LLM security lesson](../../learn/evals/llm-security/) walks through each risk.
