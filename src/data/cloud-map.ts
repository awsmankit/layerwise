/**
 * The same jobs, named differently on each cloud. Product names change
 * often (checked October 2026): treat this as a translation guide, and check
 * each provider's current documentation before you design around a name.
 */
export type Provider = 'aws' | 'azure' | 'google';

export const providers: { id: Provider; name: string; color: string }[] = [
  { id: 'aws', name: 'AWS', color: '#FF9F1C' },
  { id: 'azure', name: 'Microsoft Azure', color: '#5BC0FF' },
  { id: 'google', name: 'Google Cloud', color: '#B6E43A' },
];

export type MapRow = {
  id: string;
  job: string;
  means: string;
  names: Record<Provider, string>;
  tip: string;
};

export const cloudMap: MapRow[] = [
  {
    id: 'models',
    job: 'Managed model API',
    means: 'Call a model someone else trained and hosts, billed per token or by reserved capacity.',
    names: {
      aws: 'Amazon Bedrock',
      azure: 'Microsoft Foundry Models, including Azure OpenAI (formerly Azure AI Foundry)',
      google: 'Gemini API and Model Garden, in Vertex AI (being succeeded by the Gemini Enterprise Agent Platform)',
    },
    tip: 'Start here unless you must train or host your own model. Model catalogs differ by cloud and region, so begin with the model you have measured.',
  },
  {
    id: 'mlplatform',
    job: 'Build, train and host your own models',
    means: 'Notebooks, training jobs, endpoints and pipelines for models you control.',
    names: { aws: 'Amazon SageMaker AI', azure: 'Azure Machine Learning', google: 'Vertex AI training and prediction' },
    tip: 'All three also host open-weights models on GPUs you pay for by the hour, which is the self-managed alternative to a per-token API.',
  },
  {
    id: 'agents',
    job: 'Agent runtime',
    means: 'Managed infrastructure for running agents with tools, memory and identity.',
    names: {
      aws: 'Amazon Bedrock AgentCore (Runtime, Memory, Gateway, Identity, Observability)',
      azure: 'Foundry Agent Service',
      google: 'Agent Runtime (formerly Agent Engine) with the open-source Agent Development Kit',
    },
    tip: 'This is the fastest-moving area: names and features changed repeatedly in 2025 and 2026. Check the current docs.',
  },
  {
    id: 'retrieval',
    job: 'Retrieval and vector search',
    means: 'Store embeddings and find the nearest ones, usually as the retrieval step of RAG.',
    names: {
      aws: 'Bedrock Knowledge Bases, OpenSearch Service, Aurora PostgreSQL with pgvector',
      azure: 'Azure AI Search, with PostgreSQL pgvector and Cosmos DB as alternatives',
      google: 'Vector Search, RAG Engine, AlloyDB or Cloud SQL with pgvector',
    },
    tip: 'A managed vector index usually bills for hosting whether or not anyone queries it. A Postgres extension can be enough at small scale.',
  },
  {
    id: 'safety',
    job: 'Guardrails and content safety',
    means: 'Filters and checks on what goes into and comes out of a model.',
    names: { aws: 'Amazon Bedrock Guardrails', azure: 'Azure AI Content Safety', google: 'Model Armor and built-in safety filters' },
    tip: 'These are one layer. Permissions, logging and evals still have to be yours.',
  },
  {
    id: 'gpus',
    job: 'GPU virtual machines',
    means: 'Rent servers with GPUs by the hour to train or to serve models yourself.',
    names: {
      aws: 'EC2 accelerated computing: P series (P5, P6) and G series (G6, G6e)',
      azure: 'ND series for large-scale training, NC series for inference (ND H100 v5, ND GB200 v6, NCads H100 v5)',
      google: 'Accelerator-optimized machines: A3, A4, A4X and G2',
    },
    tip: 'New accounts often start with zero GPU quota. Request quota and capacity early.',
  },
  {
    id: 'silicon',
    job: 'Cloud-designed accelerators',
    means: 'Chips the cloud built itself, often cheaper per token, with their own software stack.',
    names: {
      aws: 'Trainium and Inferentia, programmed with the Neuron SDK',
      azure: 'Maia, Microsoft’s own accelerator (check availability for your account)',
      google: 'TPUs: v5e, v5p, Trillium (v6e) and Ironwood',
    },
    tip: 'They need models and engines that support them instead of CUDA. Test your exact model before you commit.',
  },
  {
    id: 'k8s',
    job: 'Managed Kubernetes for GPU workloads',
    means: 'A cluster service where you schedule GPU pods and run your own serving engine.',
    names: { aws: 'Amazon EKS (and SageMaker HyperPod)', azure: 'Azure Kubernetes Service (AKS)', google: 'Google Kubernetes Engine (GKE)' },
    tip: 'Worth it when you run many models or need control. Overkill for one endpoint.',
  },
  {
    id: 'reserved',
    job: 'Reserved or dedicated capacity',
    means: 'Pay for guaranteed capacity instead of sharing a pool, for steady load and predictable latency.',
    names: {
      aws: 'Bedrock Provisioned Throughput; EC2 Capacity Blocks for ML',
      azure: 'Provisioned throughput (PTUs); capacity reservations',
      google: 'Gemini Provisioned Throughput; reservations, Spot and Flex-start for GPUs',
    },
    tip: 'Quota is not capacity. On Azure a PTU quota does not guarantee the capacity exists, and some top-end Google GPU machines can only be had by reservation.',
  },
  {
    id: 'batch',
    job: 'Discounted batch processing',
    means: 'Submit many requests and collect results later at a lower price.',
    names: {
      aws: 'Bedrock batch inference',
      azure: 'Global Batch and Data Zone Batch (24-hour target, about half the price of Global Standard)',
      google: 'Batch prediction in Vertex AI',
    },
    tip: 'The easiest saving for work nobody is waiting on. Check the current discount on each pricing page.',
  },
  {
    id: 'identity',
    job: 'Identity and private access',
    means: 'Who may call what, and keeping traffic off the public internet.',
    names: {
      aws: 'IAM with VPC endpoints (PrivateLink)',
      azure: 'Microsoft Entra ID with Azure RBAC and Private Endpoints',
      google: 'Cloud IAM with Private Service Connect',
    },
    tip: 'The model call is just another service call: apply the same least-privilege and network rules you use for databases.',
  },
  {
    id: 'observability',
    job: 'Monitoring and audit',
    means: 'Metrics, logs and an audit trail of who called which model.',
    names: {
      aws: 'CloudWatch, CloudTrail and Bedrock model invocation logging',
      azure: 'Azure Monitor and Application Insights, with Foundry tracing',
      google: 'Cloud Monitoring, Cloud Logging and Cloud Trace',
    },
    tip: 'Logging prompts and answers stores whatever users typed. Decide who can read it and for how long before you turn it on.',
  },
];
