# Fact-check of the cloud track, 2026-10-28

Corrections, one row each. "Checked and fine" lists follow per lesson.

| File | Claim | What was wrong | Fix | Source |
| --- | --- | --- | --- | --- |
| cloud/cloud-ai-service-map | Bedrock AgentCore GA "20 October 2025" | AWS's own post is dated 13 October 2025 | Changed to 13 October 2025; source added | https://aws.amazon.com/about-aws/whats-new/2025/10/amazon-bedrock-agentcore-available/ |
| cloud/cloud-ai-service-map | Google "says the services did not change, existing customers do not need to migrate, and the aiplatform.googleapis.com API name is unchanged" | Google's name-changes page, launch blog and release notes say none of this (it came from third-party write-ups). The official docs do rename the "Vertex AI API" to "Gemini Enterprise Agent Platform API" and note a breaking Python SDK 2.0.1 change | Replaced with what Google states: renames listed, services delivered through the new platform, endpoint still named in release notes as of October 2026, SDK breaking change | https://docs.cloud.google.com/gemini-enterprise-agent-platform/vertex-ai-name-changes ; https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise-agent-platform ; https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes |
| cloud/cloud-ai-service-map | Azure agent runtime "check the docs for the current service name" | The documented name is Foundry Agent Service (with an Agent Runtime component) | Table now says "Foundry Agent Service in Microsoft Foundry" | https://learn.microsoft.com/en-us/azure/foundry/agents/overview |

## cloud/cloud-ai-service-map: checked and fine
- Gemini Enterprise Agent Platform introduced 22 April 2026 at Google Cloud Next (Google Cloud blog).
- Agent Engine renamed Agent Runtime (Google name-changes page).
- Azure AI Foundry renamed Microsoft Foundry (announced at Ignite, 18 November 2025).

| cloud/what-is-bedrock | "AWS states that prompts and outputs are not used to train the underlying base models or shared with model providers" | Incomplete: AWS now also documents a data-retention setting and abuse-detection retention (flagged traffic kept for a limited time) | Wording updated; Data protection and Data retention pages added as sources | https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html ; https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html |

## cloud/what-is-bedrock: checked and fine
(Edits made earlier by a previous helper were re-verified against AWS docs on 2026-10-28.)
- Bedrock Agents is now "Agents Classic", no longer open to new customers; AWS points to AgentCore (docs agents.html).
- Service tiers Reserved / Priority / Standard / Flex; Reserved arranged through the account team, 1 or 3 month terms (docs service-tiers-inference.html).
- Batch inference 50% lower than on-demand for select models (pricing page).
- Two kinds of knowledge base, managed one recommended; connectors S3, SharePoint, Confluence; citations (docs knowledge-base.html).
- Customization: supervised fine-tuning, reinforcement fine-tuning, distillation (docs custom-models.html); Custom Model Import exists (docs model-customization-import-model.html).
- On-demand custom model deployment: a few Nova models in US East (N. Virginia), Llama 3.3 70B Instruct in US West (Oregon) (docs deploy-custom-model-on-demand.html).
- Guardrails policy types and the ApplyGuardrail API (docs guardrails.html).

| cloud/sagemaker-and-hyperpod (EndpointShapes diagram) | Serverless endpoints "not for big GPU models" | True but vague: the docs say Serverless Inference does not support GPUs and has a 6 GB memory ceiling | Diagram label and lesson sentence now say "no GPUs, 6 GB RAM max"; source added | https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html |

## cloud/sagemaker-and-hyperpod: checked and fine
- SageMaker AI is the new name for Amazon SageMaker (decision guide, "formerly Amazon SageMaker").
- Decision guide last updated 23 July 2026; JumpStart "nearly 1,000 models"; Claude not on JumpStart.
- 2026 launches: Inference Recommendations (April), Capacity-Aware Instance Pools (May, up to five instance types), OpenAI-compatible APIs (May); two-tier KV cache (CPU memory L1, Redis L2) and prefix-aware routing (AWS ML blog 2026 year-to-date review).
- HyperPod orchestration: EKS for training and inference, Slurm for training (decision guide).
- Serverless customization techniques: SFT, DPO, RLVR, RLAIF (lesson says "such as SFT and preference optimisation": fine).
- Async inference payloads up to 1 GB, processing up to one hour (docs deploy-model.html).

| cloud/microsoft-foundry-and-azure-openai (DeploymentGrid diagram) | The 3x3 grid let readers pick "Batch + Regional" as a valid combination | Microsoft's deployment-types table lists Global Batch and Data Zone Batch only; there is no regional batch SKU | That cell is now marked "not offered", the caption and lesson say batch is Global or Data Zone only | https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/deployment-types |
| cloud/microsoft-foundry-and-azure-openai | (omission) Request-level Flex and Priority processing | Docs say Global Standard supports Flex and Priority processing and Data Zone Standard supports Priority | One sentence added, hedged "where a model supports them" | same page |

## cloud/microsoft-foundry-and-azure-openai: checked and fine
- Rename at Ignite November 2025 (Azure AI Foundry to Microsoft Foundry).
- Developer tier: fine-tuned model evaluation only, 24-hour lifetime, no SLA (deployment-types page).
- Quota is a free policy limit per subscription, region and deployment type; capacity is separate and the deployment fails if capacity is short; deleting or scaling down releases capacity with no guarantee of getting it back; reservations are a discount, not a capacity guarantee (provisioned-throughput page, updated 2026-07-15).
- PTUs are model-independent; throughput per PTU varies by model; cached tokens do not consume PTU capacity; sizing inputs are request shape, output-to-input ratio and cache rate.
- Spillover to a standard deployment in the same resource; Azure OpenAI models support it, Azure DeepSeek and Meta Llama models do not (provisioned-throughput page).

| cloud/google-vertex-and-gemini-platform | "Google's stated position: the services did not change; existing customers do not need to migrate; the aiplatform.googleapis.com API name is unchanged" | Not stated on Google's name-changes page, launch blog or release notes (third-party claim). The docs do say Vertex AI becomes part of the new platform, list renames, and flag a breaking Python SDK 2.0.1 change | Rewritten as what Google does state; added advice to read each service's notice | https://docs.cloud.google.com/gemini-enterprise-agent-platform/vertex-ai-name-changes ; https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes |
| cloud/google-vertex-and-gemini-platform | Ironwood TPU "generally available from late 2025" | Google's TPU release notes: preview 24 Nov 2025, general availability 31 March 2026 | Corrected; v6e (Trillium) GA December 2024 added | https://docs.cloud.google.com/tpu/docs/release-notes |
| cloud/google-vertex-and-gemini-platform | GPU families list | Missing A4X Max (GB300) and G4's GPU (RTX PRO 6000); A4X and A4X Max need reserved capacity and do not support Spot or Flex-start | Added, with the consumption-option note | https://docs.cloud.google.com/compute/docs/accelerator-optimized-machines |
| cloud/google-vertex-and-gemini-platform, cloud/cloud-security-and-networking-for-ai | Data-governance source link | Page moved (now "Gemini Enterprise Agent Platform and zero data retention") | Link replaced; wording updated with caching default and abuse-monitoring detail | https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention |

## cloud/google-vertex-and-gemini-platform: checked and fine
- 22 April 2026 introduction at Cloud Next (Google Cloud blog); Agent Engine to Agent Runtime; Memory Bank and Sessions renamed.
- Google will not use customer data to train or fine-tune models without prior permission or instruction (zero-data-retention page).
- A3 Ultra and A4 not on-demand; reservation, Spot or Flex-start (Compute Engine accelerator-optimized machines).

| cloud/google-vertex-and-gemini-platform (VertexMap diagram) | Provisioned Throughput "reserved Gemini slice, SLAs, predictable per-token pricing" | Google describes a fixed-cost, fixed-term subscription sized in GSUs (not per-token pricing) with an SLA | Label and lesson sentence corrected | https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/provisioned-throughput |
| cloud/google-vertex-and-gemini-platform (VertexMap diagram) | ADK languages "Python, Go, Java, TypeScript" | adk.dev lists Python, TypeScript, Go, Java and Kotlin | Kotlin added | https://adk.dev/ |

| cloud/bedrock-sagemaker-foundry-vertex | "the new name appears in Microsoft's product terms from January 2026" and "Google says the services did not change" | The product-terms date rests on a third-party licensing advisory, not a Microsoft page I could read; Google's pages do not say the services did not change | Both claims removed; Google's name-changes page added as a source | https://docs.cloud.google.com/gemini-enterprise-agent-platform/vertex-ai-name-changes |

## cloud/bedrock-sagemaker-foundry-vertex: checked and fine
- Announced at Ignite in November 2025 (18 November 2025); Google 22 April 2026.
- The two families (managed model API versus ML platform) match the AWS decision guide and Microsoft/Google docs read for the other lessons.

| cloud/quotas-capacity-and-regions | "every subscription starts with zero vCPU quota for GPU VM series" (too broad) | Azure ML quota page: specialised families like NCasT4_v3, NC_A100_v4 and NDv2 start at zero cores; quota is per family and region; "a credit limit, not a capacity guarantee" | Reworded to match; hedged with "as of October 2026" | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-quotas?view=azureml-api-2 |
| cloud/quotas-capacity-and-regions | NC A100 v4 net-new capacity goes only to NCads H100 v5 | Confirmed verbatim on the NC_A100_v4 page note ("only deploying net new capacity for the Current NC series, the NCads_H100_v5-series") | Kept, now cited and dated | https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nca100v4-series |

## cloud/quotas-capacity-and-regions: checked and fine
- P6-B200 launched 15 May 2025, purchasable as EC2 Capacity Blocks for ML in US West (Oregon) at launch (AWS blog).
- Google A3 Ultra and A4 are not on-demand (accelerator-optimized machines page).
- Foundry quota versus capacity statements (provisioned-throughput page).

## cloud/cloud-security-and-networking-for-ai: no corrections; all claims checked
Date stamp ("read on") moved to 28 October 2026 after re-reading the three pages. Verified against:
- Google zero-data-retention page: CMEK not supported for durable caching; global endpoint "requests and their cached data can be served from any region"; regional/multi-regional endpoints stay in the selected location; request-response logging "disabled by default"; no training or fine-tuning without prior permission or instruction; prompts may be logged for abuse detection.
- Azure data-privacy page (updated 2026-06): prompts/completions not available to other customers or to model providers, not used to train foundation models without permission; Global/DataZone process anywhere in the geography set / zone but stored data and the abuse-monitoring store stay in the customer-designated geography; AES-256 at rest by default with optional customer-managed key (some previews do not support it); managed customers may apply to modify abuse monitoring.
- AWS Bedrock data-protection page: model providers have no access to Model Deployment Accounts, so they see no Bedrock logs, prompts or completions; abuse-detection page linked; CloudTrail recommended.
- Diagram labels (ResidencyScopes, PrivatePath, LoggingGates, ThrottleFlow) match the lesson text; no label changes needed. Not independently checked: Bedrock invocation logging default (lesson wording is "something you choose to configure", which is hedged).

## News notes (src/content/pulse)
| Note | Claim | What the source says | Fix | Source |
|---|---|---|---|---|
| azure-ai-foundry-renamed | "product terms use the new name from January 2026" | Only third-party write-ups; no Microsoft page read | Removed | n/a |
| azure-ai-foundry-renamed | "some built-in roles were renamed" (vague) | Microsoft Learn RBAC page: Foundry User, Owner, Account Owner and Project Manager were Azure AI User, Owner, Account Owner and Project Manager; role IDs and permissions unchanged; use IDs in scripts during rollout | Made specific, with advice to use role IDs | https://learn.microsoft.com/en-us/azure/foundry/concepts/rbac-foundry |
| vertex-ai-becomes-gemini-enterprise-agent-platform | "services did not change, no migration, API name stayed the same" | Not stated by Google (third-party claim); docs list renames and a breaking Python SDK 2.0.1 change | Rewritten; "nothing in your code" advice replaced with "read each notice, check pinned SDK versions" | https://docs.cloud.google.com/gemini-enterprise-agent-platform/vertex-ai-name-changes |
| owasp-llm-top-10-2026 | "Prompt injection stays first", "system prompt leakage now hidden context exposure", "improper output handling moved to tenth", agentic risks moved | OWASP's 2026 page confirms only the date (3 Aug 2026) and "updated rankings, expanded threat coverage"; the Top 10 list I could read is the 2025 one | Unverified specifics removed; 2025 order stated as 2025 | https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/ |
| bedrock-agentcore-ga | "October 2025", preview in July, seven components | AWS GA post dated 13 Oct 2025; preview 16 Jul 2025; components match | Exact date added | https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-agentcore-is-now-generally-available/ |

Checked and fine: sagemaker-inference-2026 (Inference Recommendations April, Capacity-Aware Instance Pools up to five instance types May, /openai/v1 endpoints May, HyperPod two-tier KV cache and KV-aware routing; AWS review post). how-pulse-works has no vendor claims. tgi-maintenance-mode is a serving note, left to the serving fact-check.

## src/data/extras/cloud.ts
Three quiz items repeated the unsupported "Google says services did not change / nobody must migrate" claim (Google lesson quiz question, its takeaway line, and the rebrand tutorials question). Rewritten to what Google's pages support. No AgentCore date, Ironwood, or batch-by-region items found.

## Links
`node scripts/check-source-links.mjs cloud`: 49 checked, 0 broken. One "moved" is a `?hl=ko` locale redirect from the fetch environment, not a real move. Pulse links all return 200.
