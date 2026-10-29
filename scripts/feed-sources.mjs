/**
 * Official feeds the News page lists headlines from. Each one was fetched and checked
 * to return a working RSS or Atom feed. `hosts` is the only set of domains a link from
 * that feed may point to, so a feed cannot send readers somewhere unexpected.
 * `keep` filters a broad feed down to AI topics, `accept` limits a releases feed to the main package. `max` caps how many items one source adds.
 */
export const topics = {
  cloud: 'Cloud platforms',
  models: 'Models and labs',
  serving: 'Serving and hardware',
  frameworks: 'Frameworks and protocols',
  safety: 'Safety and security',
};

const AI = /\b(AI|GenAI|generative|LLM|agent|agentic|inference|GPU|machine learning|bedrock|sagemaker|agentcore|foundry|openai|vertex|gemini|nova|trainium|inferentia|model)\b/i;

export const sources = [
  { id: 'aws-whats-new', name: 'AWS, What’s New', topic: 'cloud', url: 'https://aws.amazon.com/about-aws/whats-new/recent/feed/', hosts: ['aws.amazon.com'], keep: AI, max: 6 },
  { id: 'aws-ml-blog', name: 'AWS Machine Learning Blog', topic: 'cloud', url: 'https://aws.amazon.com/blogs/machine-learning/feed/', hosts: ['aws.amazon.com'], max: 4 },
  { id: 'azure-updates', name: 'Azure updates', topic: 'cloud', url: 'https://www.microsoft.com/releasecommunications/api/v2/azure/rss', hosts: ['azure.microsoft.com', 'www.microsoft.com'], keep: AI, max: 6 },
  { id: 'foundry-devblog', name: 'Microsoft Foundry blog', topic: 'cloud', url: 'https://devblogs.microsoft.com/foundry/feed/', hosts: ['devblogs.microsoft.com'], max: 3 },
  { id: 'github-changelog', name: 'GitHub Changelog', topic: 'cloud', url: 'https://github.blog/changelog/feed/', hosts: ['github.blog'], keep: /\b(copilot|agent|agentic|model|models|AI|MCP)\b/i, max: 6 },
  { id: 'github-blog', name: 'The GitHub Blog', topic: 'cloud', url: 'https://github.blog/feed/', hosts: ['github.blog'], keep: AI, max: 4 },
  { id: 'microsoft-blog', name: 'The Official Microsoft Blog', topic: 'cloud', url: 'https://blogs.microsoft.com/feed/', hosts: ['blogs.microsoft.com'], keep: /\b(AI|Copilot|agent|agentic|model|models|Foundry|OpenAI)\b/i, max: 4 },
  { id: 'openai-news', name: 'OpenAI', topic: 'models', url: 'https://openai.com/news/rss.xml', hosts: ['openai.com'], max: 5 },
  { id: 'google-ai', name: 'Google AI blog', topic: 'models', url: 'https://blog.google/technology/ai/rss/', hosts: ['blog.google'], max: 4 },
  { id: 'huggingface', name: 'Hugging Face blog', topic: 'models', url: 'https://huggingface.co/blog/feed.xml', hosts: ['huggingface.co'], max: 4 },
  { id: 'nvidia-dev', name: 'NVIDIA technical blog', topic: 'serving', url: 'https://developer.nvidia.com/blog/feed', hosts: ['developer.nvidia.com'], keep: /\b(inference|LLM|TensorRT|Dynamo|NIM|agent|KV cache|speculative|quantiz)/i, max: 4 },
  { id: 'vllm', name: 'vLLM releases', topic: 'serving', url: 'https://github.com/vllm-project/vllm/releases.atom', hosts: ['github.com'], prefix: 'vLLM', release: true, max: 2 },
  { id: 'sglang', name: 'SGLang releases', topic: 'serving', url: 'https://github.com/sgl-project/sglang/releases.atom', hosts: ['github.com'], prefix: 'SGLang', release: true, max: 1 },
  { id: 'ollama', name: 'Ollama releases', topic: 'serving', url: 'https://github.com/ollama/ollama/releases.atom', hosts: ['github.com'], prefix: 'Ollama', release: true, max: 1 },
  { id: 'pytorch', name: 'PyTorch releases', topic: 'serving', url: 'https://github.com/pytorch/pytorch/releases.atom', hosts: ['github.com'], prefix: 'PyTorch', release: true, accept: /^v?\d+\.\d+(\.\d+)?$/, max: 1 },
  { id: 'langgraph', name: 'LangGraph releases', topic: 'frameworks', url: 'https://github.com/langchain-ai/langgraph/releases.atom', hosts: ['github.com'], prefix: 'LangGraph', release: true, accept: /^langgraph==\d/, max: 1 },
  { id: 'langchain', name: 'LangChain releases', topic: 'frameworks', url: 'https://github.com/langchain-ai/langchain/releases.atom', hosts: ['github.com'], prefix: 'LangChain', release: true, accept: /^langchain==\d/, max: 1 },
  { id: 'mcp', name: 'Model Context Protocol releases', topic: 'frameworks', url: 'https://github.com/modelcontextprotocol/modelcontextprotocol/releases.atom', hosts: ['github.com'], prefix: 'MCP spec', release: true, max: 2 },
  { id: 'google-cloud-ai', name: 'Google Cloud, AI and machine learning', topic: 'cloud', url: 'https://cloudblog.withgoogle.com/products/ai-machine-learning/rss/', hosts: ['cloud.google.com', 'cloudblog.withgoogle.com'], keep: AI, max: 4 },
  { id: 'aws-news-blog', name: 'AWS News Blog', topic: 'cloud', url: 'https://aws.amazon.com/blogs/aws/feed/', hosts: ['aws.amazon.com'], keep: AI, max: 3 },
  { id: 'databricks', name: 'Databricks', topic: 'cloud', url: 'https://www.databricks.com/feed', hosts: ['www.databricks.com', 'databricks.com'], keep: AI, max: 3 },
  { id: 'cloudflare-ai', name: 'Cloudflare, AI', topic: 'cloud', url: 'https://blog.cloudflare.com/tag/ai/rss/', hosts: ['blog.cloudflare.com'], max: 3 },
  { id: 'deepmind', name: 'Google DeepMind', topic: 'models', url: 'https://deepmind.google/blog/rss.xml', hosts: ['deepmind.google'], max: 3 },
  { id: 'google-research', name: 'Google Research', topic: 'models', url: 'https://research.google/blog/rss/', hosts: ['research.google'], max: 2 },
  { id: 'meta-newsroom', name: 'Meta Newsroom', topic: 'models', url: 'https://about.fb.com/news/feed/', hosts: ['about.fb.com'], keep: /\b(AI|Llama|Muse|model|models|agent|agents)\b/i, max: 3 },
  { id: 'mistral', name: 'Mistral AI', topic: 'models', url: 'https://mistral.ai/news/rss', hosts: ['mistral.ai'], max: 3 },
  { id: 'microsoft-research', name: 'Microsoft Research', topic: 'models', url: 'https://www.microsoft.com/en-us/research/feed/', hosts: ['www.microsoft.com'], keep: /\b(AI|LLM|agent|agents|agentic|language model|models?)\b/i, max: 2 },
  { id: 'apple-ml', name: 'Apple Machine Learning Research', topic: 'models', url: 'https://machinelearning.apple.com/rss.xml', hosts: ['machinelearning.apple.com'], keep: /\b(LLM|MLX|language model|inference|on-device|foundation model)/i, max: 2 },
  { id: 'nvidia-blog', name: 'NVIDIA Blog', topic: 'serving', url: 'https://blogs.nvidia.com/feed/', hosts: ['blogs.nvidia.com'], keep: /\b(inference|LLM|agentic|agents?|Nemotron|Dynamo|TensorRT|Blackwell|Rubin|AI factor)/i, max: 4 },
  { id: 'together', name: 'Together AI', topic: 'serving', url: 'https://www.together.ai/blog/rss.xml', hosts: ['www.together.ai', 'together.ai'], max: 2 },
  { id: 'tensorrt-llm', name: 'TensorRT-LLM releases', topic: 'serving', url: 'https://github.com/NVIDIA/TensorRT-LLM/releases.atom', hosts: ['github.com'], prefix: 'TensorRT-LLM', release: true, accept: /^v\d+\.\d+\.\d+$/, max: 1 },
  { id: 'dynamo', name: 'NVIDIA Dynamo releases', topic: 'serving', url: 'https://github.com/ai-dynamo/dynamo/releases.atom', hosts: ['github.com'], release: true, accept: /^Dynamo v\d+\.\d+\.\d+$/, max: 1 },
  { id: 'transformers', name: 'Transformers releases', topic: 'serving', url: 'https://github.com/huggingface/transformers/releases.atom', hosts: ['github.com'], prefix: 'Transformers', release: true, accept: /^(Release:? )?v\d+\.\d+\.0$/, max: 1 },
  { id: 'claude-code', name: 'Claude Code releases', topic: 'frameworks', url: 'https://github.com/anthropics/claude-code/releases.atom', hosts: ['github.com'], prefix: 'Claude Code', release: true, accept: /^v\d+\.\d+\.\d+$/, max: 1 },
  { id: 'anthropic-sdk', name: 'Anthropic Python SDK releases', topic: 'frameworks', url: 'https://github.com/anthropics/anthropic-sdk-python/releases.atom', hosts: ['github.com'], prefix: 'Anthropic Python SDK', release: true, accept: /^v\d+\.\d+\.\d+$/, max: 1 },
  { id: 'openai-python', name: 'OpenAI Python SDK releases', topic: 'frameworks', url: 'https://github.com/openai/openai-python/releases.atom', hosts: ['github.com'], prefix: 'OpenAI Python SDK', release: true, accept: /^v\d+\.\d+\.\d+$/, max: 1 },
  { id: 'openai-agents', name: 'OpenAI Agents SDK releases', topic: 'frameworks', url: 'https://github.com/openai/openai-agents-python/releases.atom', hosts: ['github.com'], prefix: 'OpenAI Agents SDK', release: true, accept: /^v\d+\.\d+\.\d+$/, max: 1 },
  { id: 'google-adk', name: 'Google Agent Development Kit releases', topic: 'frameworks', url: 'https://github.com/google/adk-python/releases.atom', hosts: ['github.com'], prefix: 'Google ADK', release: true, accept: /^v\d+\.\d+\.\d+$/, max: 1 },
  { id: 'agent-framework', name: 'Microsoft Agent Framework releases', topic: 'frameworks', url: 'https://github.com/microsoft/agent-framework/releases.atom', hosts: ['github.com'], prefix: 'Microsoft Agent Framework', release: true, accept: /^python-\d/, max: 1 },
  { id: 'crewai', name: 'CrewAI releases', topic: 'frameworks', url: 'https://github.com/crewAIInc/crewAI/releases.atom', hosts: ['github.com'], prefix: 'CrewAI', release: true, accept: /^\d+\.\d+\.\d+$/, max: 1 },
  { id: 'llamaindex', name: 'LlamaIndex releases', topic: 'frameworks', url: 'https://github.com/run-llama/llama_index/releases.atom', hosts: ['github.com'], prefix: 'LlamaIndex', release: true, accept: /^v\d+\.\d+\.\d+$/, max: 1 },
  { id: 'owasp-genai', name: 'OWASP GenAI Security Project', topic: 'safety', url: 'https://genai.owasp.org/feed/', hosts: ['genai.owasp.org'], max: 3 },
];
