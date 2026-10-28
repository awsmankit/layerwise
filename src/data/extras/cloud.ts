import type { Extra } from '../lesson-extras';

export const extrasCloud: Record<string, Extra> = {
  'cloud/cloud-ai-service-map': {
    takeaways: [
      'The same jobs exist on every cloud: model API, ML platform, agents, retrieval, guardrails, GPUs, and more.',
      'Translate by job first, then look up the product name on each cloud.',
      'Azure AI Foundry became Microsoft Foundry (announced November 2025), and Vertex AI is being succeeded by the Gemini Enterprise Agent Platform (announced April 2026).',
      'Choose from the model you measured, where your data lives, compliance needs and capacity, not from brand.',
    ],
    prereq: ['start/how-a-chatbot-answers'],
    quiz: [
      { q: 'You read a tutorial that uses "Azure AI Foundry". What should you assume today?', options: ['The product was shut down', 'It is now called Microsoft Foundry, so search for both names', 'It is a different product from Microsoft Foundry', 'It only exists on AWS'], answer: 1, why: 'Microsoft renamed Azure AI Foundry to Microsoft Foundry in 2026. Older material still uses the old name for the same platform.' },
      { q: 'Which pairing matches the same job on three clouds?', options: ['Bedrock, Azure Machine Learning, Model Garden', 'SageMaker AI, Foundry Models, Cloud KMS', 'Bedrock, Azure Key Vault, TPU', 'Bedrock, Foundry Models, Gemini models on Vertex AI'], answer: 3, why: 'All three are managed model APIs. The others mix jobs such as ML platform, model API, key management and accelerators.' },
      { q: 'Google says Vertex AI is being succeeded by the Gemini Enterprise Agent Platform. What does that mean for an existing project?', options: ['Read Google\'s name-changes page and each service\'s notice, and expect both names in docs', 'Assume nothing changes and never read the notices', 'Assume everything must migrate before the end of the year', 'Assume only agents keep working'], answer: 0, why: 'Google\'s name-changes page lists which services were renamed and the release notes flag breaking changes such as the Python SDK 2.0.1, so check each service you use. Both names will appear in docs for a while.' },
      { q: 'A comparison table shows three products for one job on one cloud and a single product for the same job on another. What should you conclude?', options: ['The cloud with one product lacks the feature', 'The cloud with three products is better', 'Each cloud grew from a different starting point, so the split differs; a missing row is not a missing feature', 'The table must be out of date'], answer: 2, why: 'AWS, Microsoft and Google each built their AI services from different starting points, which is why one cloud can have one product and another three. A missing row does not mean a missing feature.' },
    ],
  },
  'cloud/microsoft-foundry-and-azure-openai': {
    takeaways: [
      'Pick the deployment type (Standard, Provisioned, Batch) and the scope (Global, Data Zone, Regional) separately.',
      'Quota is a permission limit. Capacity is real hardware, and holding PTU quota does not guarantee it.',
      'Provisioned deployments bill hourly whether or not you send traffic, so use them for steady, latency-sensitive load.',
      'Spillover can send overflow from a provisioned deployment to a standard one when it returns a 429.',
    ],
    prereq: ['cloud/cloud-ai-service-map'],
    play: [{ label: 'Play Cost Crunch', href: '/play/cost-crunch/' }],
    quiz: [
      { q: 'You have 100 PTUs of quota in a region, but creating a provisioned deployment fails. Most likely reason?', options: ['The model is deprecated', 'Quota does not guarantee that capacity is available in the region right now', 'PTUs only work on weekdays', 'Quota expires after one hour'], answer: 1, why: 'Microsoft states that having PTU quota does not guarantee capacity. If the region cannot supply the PTUs, the deployment fails.' },
      { q: 'Which workload suits a provisioned deployment best?', options: ['A chat feature with steady, high traffic and strict latency needs', 'A prototype used a few times a week', 'A one-off job summarising an archive overnight', 'Testing a fine-tuned model for a day'], answer: 0, why: 'Provisioned fits predictable, high-volume, latency-sensitive load. The overnight job suits Batch, and the others suit Standard or Developer.' },
      { q: 'What does spillover do?', options: ['Moves data to another cloud', 'Increases your PTU quota automatically', 'Routes overflow from a full provisioned deployment to a matching standard deployment', 'Stores extra tokens for later'], answer: 2, why: 'When a provisioned deployment returns a 429 because it is fully used, spillover redirects requests to a standard deployment in the same resource.' },
      { q: 'Your provisioned deployment receives many repeated prompts. How does good prompt caching help?', options: ['It raises your PTU quota', 'It moves the traffic to Batch', 'It removes the need to choose a deployment scope', 'A cache hit does not use PTU capacity, so you need fewer PTUs'], answer: 3, why: 'Microsoft says a cache hit does not consume PTU capacity, so caching reduces how many PTUs you need. It does not change quota, which is only a policy limit.' },
    ],
  },
  'cloud/google-vertex-and-gemini-platform': {
    takeaways: [
      'Vertex AI is being succeeded by the Gemini Enterprise Agent Platform, and the name-changes page on Google Cloud lists what was renamed, so check the notice for each service you use.',
      'The platform holds Model Garden, the Gemini API, Vector Search, RAG Engine, Agent Runtime and the open-source ADK.',
      'Vector Search nodes and Provisioned Throughput keep billing when idle, so delete experiments.',
      'A3 Ultra and A4 GPUs need a reservation, Spot or Flex-start, and TPUs need framework support checked first.',
    ],
    prereq: ['cloud/cloud-ai-service-map'],
    quiz: [
      { q: 'A team finds old Vertex AI tutorials after the rebrand. What is the sound response?', options: ['Rewrite everything before the old name disappears', 'Expect both names, and keep working code that already works', 'Switch clouds', 'Assume the tutorials describe a different product'], answer: 1, why: 'Both names will appear in docs and invoices. Keep working code, and read Google\'s notice for each service you use before changing anything.' },
      { q: 'Which choice makes a Vector Search index cost money with no traffic?', options: ['It bills for index-hosting nodes by the hour', 'It bills per query only', 'It is always free', 'It bills only for embeddings'], answer: 0, why: 'Vector Search bills for the nodes hosting the index, whether or not requests arrive.' },
      { q: 'You want A4 (B200) GPU VMs on Google Cloud. How can you get them?', options: ['Ordinary on-demand VM creation', 'Only through Model Garden', 'You cannot use them with Kubernetes', 'A capacity reservation, Spot or Flex-start'], answer: 3, why: 'A3 Ultra and A4 cannot be provisioned as ordinary on-demand VMs and need a reservation, Spot or Flex-start.' },
      { q: 'Your team has custom CUDA kernels and must serve a model soon. What does the lesson suggest?', options: ['Use GPUs, because CUDA code does not run on a TPU', 'Use TPUs, because vendor price figures transfer to your workload', 'Use TPUs and port the kernels later, because a custom chip is always cheaper', 'Use whichever has the newer name'], answer: 0, why: 'Teams that depend on CUDA libraries or custom kernels should use GPUs. A TPU port is real work, and vendor figures do not transfer, so measure both before switching.' },
    ],
  },
  'cloud/sagemaker-and-hyperpod': {
    takeaways: [
      'SageMaker AI is for control over training, containers, instances and the cost-latency-throughput trade-off, while Bedrock is for convenience.',
      'Choose the endpoint type from your traffic: real-time, asynchronous, serverless or batch transform.',
      'A real-time endpoint bills every hour it exists, and inference components let models share one endpoint.',
      'HyperPod gives dedicated clusters for training and Kubernetes-native inference, and needs operations skill.',
    ],
    prereq: ['cloud/what-is-bedrock'],
    play: [{ label: 'Play Blueprint', href: '/play/blueprint/' }],
    quiz: [
      { q: 'Which need is a good reason to move from Bedrock to SageMaker AI?', options: ['You want per-token billing', 'You need to control the serving container and GPU instances at large scale', 'You want fewer settings to manage', 'You only need prompt engineering'], answer: 1, why: 'AWS says to consider SageMaker AI when you need container or orchestration control to manage cost, throughput and latency trade-offs.' },
      { q: 'A model gets a few requests per hour, and each request can take minutes to process with a large payload. Which endpoint type fits best?', options: ['A real-time endpoint on large GPUs', 'HyperPod training cluster', 'An asynchronous endpoint', 'Nothing, it cannot be hosted'], answer: 2, why: 'Asynchronous endpoints queue requests and suit large payloads and long processing, without keeping latency-critical capacity warm for rare calls.' },
      { q: 'What is HyperPod Inference?', options: ['A Bedrock pricing tier', 'A tool for labelling data', 'A serverless endpoint type', 'Kubernetes-native serving on dedicated GPU clusters, with features such as KV-aware routing'], answer: 3, why: 'HyperPod Inference runs on dedicated clusters with Kubernetes control, and supports a two-tier KV cache and prefix-aware routing.' },
      { q: 'Nobody on your team has run a GPU Kubernetes cluster, and you want to serve a model on AWS. What is the sensible starting point?', options: ['HyperPod Inference, because more control is always better', 'Managed endpoints, because they hide the cluster', 'A serverless endpoint, because it runs on GPUs and scales to zero', 'A HyperPod training cluster'], answer: 1, why: 'Managed endpoints hide the cluster, while HyperPod Inference hands you the Kubernetes layer and the operational skill it needs. Serverless endpoints do not support GPUs, so they are not an option here.' },
    ],
  },
  'cloud/cloud-security-and-networking-for-ai': {
    takeaways: [
      'The controls match across clouds: IAM, Entra ID with Azure RBAC and Cloud IAM; PrivateLink, Private Endpoints and Private Service Connect; KMS, Key Vault and Cloud KMS.',
      'Residency has two parts, where data is stored and where it is processed, and wider scopes give more capacity.',
      'Prompt and response logs can hold personal data and secrets, so decide retention and access before launch.',
      'Confirm each provider\'s training-on-your-data terms in the current documents and your contract.',
    ],
    prereq: ['start/using-ai-without-getting-burned', 'cloud/cloud-ai-service-map'],
    quiz: [
      { q: 'Which is the Google Cloud equivalent of AWS PrivateLink?', options: ['Cloud KMS', 'Private Service Connect', 'Cloud Audit Logs', 'Entra ID'], answer: 1, why: 'Private Service Connect lets traffic reach a service over private addresses, like PrivateLink on AWS and Private Endpoints on Azure.' },
      { q: 'You turn on prompt and response logging to debug quality. What is the main new risk?', options: ['Logs now hold whatever users typed, including personal data and secrets', 'Models get slower to train', 'Audit trails stop working', 'Keys expire'], answer: 0, why: 'Content logs store sensitive text. Decide whether to log, for how long, who can read it and whether to redact it.' },
      { q: 'A provider page says your data is not used to train its models. What should you still do?', options: ['Nothing, the matter is settled', 'Disable all encryption', 'Confirm against the current terms and contract, and check features such as caching, previews and abuse monitoring', 'Assume it applies to every model and feature'], answer: 2, why: 'Terms change, and caveats exist for features, previews and third-party models. Verify for the exact services you use.' },
      { q: 'A teammate gives an agent a broad role so it can call any tool, to be safe. Why is that a problem?', options: ['Broad roles make every request slower', 'Roles cannot be attached to agents', 'An over-broad role turns a prompt injection into a data breach, so scope each tool narrowly', 'Provider-managed keys stop working'], answer: 2, why: 'If an injected instruction reaches a tool, the agent can do whatever its role allows. Give each application its own identity and the narrowest permission that works.' },
    ],
  },
  'cloud/quotas-capacity-and-regions': {
    takeaways: [
      'Quota is a permission limit and capacity is real hardware, so you can hold quota and still fail to get GPUs or throughput.',
      'Three capacity models exist: on-demand shared, provisioned or reserved, and reservations, blocks, Flex-start and Spot.',
      'Azure starts with zero GPU quota, Google needs reservations for A3 Ultra and A4, and AWS offers EC2 Capacity Blocks for ML.',
      'Wider region scope gives more capacity but weaker residency, so plan retries, queues and a tested fallback.',
    ],
    prereq: ['cloud/cloud-ai-service-map'],
    play: [{ label: 'Play Incident Room', href: '/play/incident-room/' }],
    quiz: [
      { q: 'A new Azure subscription cannot create an ND H100 v5 VM. What is the likely first fix?', options: ['Switch to Spot instances', 'Request a GPU vCPU quota increase in the region', 'Wait for the weekly reset', 'Use a smaller VM from the same series'], answer: 1, why: 'Subscriptions start with zero vCPU quota for GPU series per region. You must request an increase first, and ND H100 v5 has no single-GPU size.' },
      { q: 'You need Google A3 Ultra GPUs. Which is not an available route?', options: ['A capacity reservation', 'Spot', 'Ordinary on-demand VM creation', 'Flex-start'], answer: 2, why: 'A3 Ultra and A4 cannot be provisioned as ordinary on-demand VMs. They need a reservation, Spot or Flex-start.' },
      { q: 'Why not buy provisioned capacity for your peak traffic?', options: ['It gets slower at peak', 'Provisioned cannot be used with batch', 'Peak traffic is illegal', 'You pay for held capacity whether used or not, so size it for the steady baseline and let on-demand handle spikes'], answer: 3, why: 'Reserved capacity costs the same idle or busy. Sizing for the baseline and spilling or falling back for spikes avoids paying for unused peak capacity.' },
      { q: 'Your legal team requires prompts to stay in one region, and you keep being throttled. What does the lesson say?', options: ['The residency requirement decides the scope, and capacity planning follows from it', 'Switch to cross-region inference, because it lowers throttling', 'Ignore the requirement until launch and fix it later', 'Buy provisioned capacity for the peak and keep the broader scope'], answer: 0, why: 'Cross-region inference lowers throttling but may process prompts outside your region, which is the cost. A legal residency requirement decides the scope; without one, prefer the broader scope.' },
    ],
  },
};
