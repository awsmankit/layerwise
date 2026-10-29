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
  { id: 'owasp-genai', name: 'OWASP GenAI Security Project', topic: 'safety', url: 'https://genai.owasp.org/feed/', hosts: ['genai.owasp.org'], max: 3 },
];
