/**
 * Places to practise for real, and projects to build. Every resource was opened on
 * `practiceChecked` and its cost is only what the source's own page says. Free tiers,
 * quotas and course catalogues change, so each card tells the reader to check the
 * provider's page before starting.
 */

export type PracticeTopic = 'models' | 'rag' | 'agents' | 'serving' | 'cloud' | 'evals' | 'general';
export type Cost = 'free' | 'free tier' | 'account needed' | 'paid';

export type Resource = {
  id: string;
  name: string;
  org: string;
  /** What you practise there, in under 110 characters. */
  what: string;
  cost: Cost;
  topic: PracticeTopic;
  url: string;
  checked: string;
};

export type Project = {
  id: string;
  title: string;
  level: 'basic' | 'intermediate' | 'advanced';
  /** A realistic range, as text. */
  hours: string;
  build: string;
  /** Checkable success criteria, each short enough to tick off. */
  criteria: string[];
  stretch: string;
  /** Lesson keys that teach what the project needs. */
  lessons: string[];
  /** Kinds of tool, not brands. */
  tools: string[];
};

export const practiceChecked = '2026-10-28';

export const topicLabels: Record<PracticeTopic, string> = {
  models: 'Models and notebooks',
  rag: 'Retrieval',
  agents: 'Agents and tools',
  serving: 'Running models',
  cloud: 'Cloud platforms',
  evals: 'Evaluation',
  general: 'General',
};

const checked = practiceChecked;

export const resources: Resource[] = [
  {
    id: 'colab',
    name: 'Google Colab',
    org: 'Google',
    what: 'Run Python notebooks in the browser with nothing to install. Free GPU access is heavily restricted.',
    cost: 'free',
    topic: 'models',
    url: 'https://colab.research.google.com/',
    checked,
  },
  {
    id: 'kaggle',
    name: 'Kaggle Notebooks',
    org: 'Kaggle',
    what: 'Notebooks in the browser with limited free weekly GPU time. Check Kaggle’s docs for the current quota.',
    cost: 'free tier',
    topic: 'models',
    url: 'https://www.kaggle.com/code',
    checked,
  },
  {
    id: 'hf-llm-course',
    name: 'Hugging Face LLM course',
    org: 'Hugging Face',
    what: 'Work through LLMs and NLP with Hugging Face tools. It asks for solid Python skills.',
    cost: 'free',
    topic: 'models',
    url: 'https://huggingface.co/learn/llm-course/chapter1/1',
    checked,
  },
  {
    id: 'hf-agents-course',
    name: 'Hugging Face AI Agents course',
    org: 'Hugging Face',
    what: 'Build agents with smolagents, LangGraph and LlamaIndex, with hands-on units and a final challenge.',
    cost: 'free',
    topic: 'agents',
    url: 'https://huggingface.co/learn/agents-course/unit0/introduction',
    checked,
  },
  {
    id: 'hf-mcp-course',
    name: 'Hugging Face MCP course',
    org: 'Hugging Face',
    what: 'Build a simple MCP application, then deploy one using the Hugging Face ecosystem.',
    cost: 'free',
    topic: 'agents',
    url: 'https://huggingface.co/learn/mcp-course/unit0/introduction',
    checked,
  },
  {
    id: 'hf-spaces',
    name: 'Hugging Face Spaces',
    org: 'Hugging Face',
    what: 'Publish a small model demo. Free accounts are limited, so read what a free account can host first.',
    cost: 'free tier',
    topic: 'general',
    url: 'https://huggingface.co/docs/hub/spaces-overview',
    checked,
  },
  {
    id: 'langchain-academy',
    name: 'LangChain Academy',
    org: 'LangChain',
    what: 'Courses on building, testing and deploying agents with LangChain and LangGraph. The exam is paid.',
    cost: 'free',
    topic: 'agents',
    url: 'https://academy.langchain.com/',
    checked,
  },
  {
    id: 'anthropic-mcp',
    name: 'Introduction to Model Context Protocol',
    org: 'Anthropic',
    what: 'Build MCP servers and clients in Python around tools, resources and prompts. Needs a Skilljar account.',
    cost: 'free',
    topic: 'agents',
    url: 'https://anthropic-partners.skilljar.com/introduction-to-model-context-protocol',
    checked,
  },
  {
    id: 'anthropic-skills',
    name: 'Introduction to agent skills',
    org: 'Anthropic',
    what: 'Write a first agent skill and learn how to share and troubleshoot skills across a team.',
    cost: 'free',
    topic: 'agents',
    url: 'https://anthropic.skilljar.com/introduction-to-agent-skills',
    checked,
  },
  {
    id: 'aws-skill-builder',
    name: 'AWS digital training and Skill Builder',
    org: 'Amazon Web Services',
    what: 'Free self-paced AWS courses and hands-on labs that mirror real AWS scenarios.',
    cost: 'free',
    topic: 'cloud',
    url: 'https://aws.amazon.com/training/digital/',
    checked,
  },
  {
    id: 'microsoft-learn',
    name: 'Microsoft Learn training',
    org: 'Microsoft',
    what: 'Interactive modules and learning paths on Azure and AI, with free Azure resources and labs for learners.',
    cost: 'free',
    topic: 'cloud',
    url: 'https://learn.microsoft.com/en-us/training/',
    checked,
  },
  {
    id: 'gemini-api',
    name: 'Gemini API free tier',
    org: 'Google',
    what: 'Call a model from your own code on a free tier with limits. Free-tier content may improve Google products.',
    cost: 'free tier',
    topic: 'cloud',
    url: 'https://ai.google.dev/gemini-api/docs/pricing',
    checked,
  },
  {
    id: 'nvidia-dli',
    name: 'NVIDIA Deep Learning Institute',
    org: 'NVIDIA',
    what: 'Self-paced and instructor-led courses on generative AI and accelerated computing, some with cloud GPUs.',
    cost: 'free tier',
    topic: 'serving',
    url: 'https://www.nvidia.com/en-us/training/',
    checked,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    org: 'Ollama',
    what: 'Download an open model and run it on your own machine, then call it through a local API.',
    cost: 'free',
    topic: 'serving',
    url: 'https://ollama.com/download',
    checked,
  },
  {
    id: 'lm-studio',
    name: 'LM Studio',
    org: 'LM Studio',
    what: 'A desktop app for running local models, free for personal use and, as its blog says, for use at work.',
    cost: 'free',
    topic: 'serving',
    url: 'https://lmstudio.ai/',
    checked,
  },
];

export const projects: Project[] = [
  {
    id: 'chat-with-notes',
    title: 'Chat with your own notes',
    level: 'intermediate',
    hours: '4 to 8',
    build: 'A small question-answering tool over a folder of your own notes. Every answer names the notes it came from.',
    criteria: [
      'Notes are split into chunks, and each chunk keeps the file it came from.',
      'A question retrieves the closest chunks and passes only those to the model.',
      'Every answer lists its sources, and a claim with no source is flagged.',
      'It says it does not know when nothing relevant is retrieved.',
      'Ten questions you wrote yourself have known answers, and you score retrieval separately from the final answer.',
    ],
    stretch: 'Add a keyword search alongside the vector search and combine the two rankings.',
    lessons: ['rag-agents/rag-from-scratch', 'rag-agents/chunking-and-retrieval-quality', 'rag-agents/vector-search-and-retrieval-metrics', 'foundations/tokens-and-embeddings'],
    tools: ['embedding model', 'vector index or a plain list', 'chat model'],
  },
  {
    id: 'email-triage',
    title: 'Support-email triage',
    level: 'basic',
    hours: '2 to 4',
    build: 'A function that reads a messy support email and returns a category, an urgency and a one-line summary as checked JSON.',
    criteria: [
      'The reply is parsed and checked against a schema before anything uses it.',
      'A reply that fails the check is retried with the error message, up to three times.',
      'After the retry cap, the email goes to a person instead of looping.',
      'Fifteen sample emails, including odd ones, run through it with a printed pass rate.',
    ],
    stretch: 'Add few-shot examples and show with your sample set whether they change the pass rate.',
    lessons: ['llm/prompting-and-structured-output', 'llm/prompt-patterns-and-optimisation', 'evals/evals-101'],
    tools: ['chat model', 'schema checker'],
  },
  {
    id: 'careful-agent',
    title: 'An agent that asks before it acts',
    level: 'advanced',
    hours: '6 to 10',
    build: 'A tool-using agent where read-only tools run freely and any tool that changes something waits for a person to approve.',
    criteria: [
      'Each tool is marked read-only or changing, and the marking is checked in code, not in the prompt.',
      'A changing action pauses, shows what it will do, and runs only after approval.',
      'The loop stops after a fixed number of steps and says why.',
      'Text returned by a tool is treated as data and cannot grant new permissions.',
      'A saved transcript shows one approved and one refused action.',
    ],
    stretch: 'Make the run resumable, so it can stop for approval and continue the next day from saved state.',
    lessons: ['rag-agents/agents-and-tool-use', 'rag-agents/langchain-and-langgraph', 'rag-agents/mcp-in-depth', 'evals/llm-security'],
    tools: ['chat model with tool calling', 'a few small tools', 'saved state'],
  },
  {
    id: 'prompt-eval-suite',
    title: 'An eval suite for one prompt',
    level: 'intermediate',
    hours: '3 to 6',
    build: 'A test set and a script that scores one prompt and tells you whether a change made it better or worse.',
    criteria: [
      'Thirty or more real-looking cases, each with an accepted answer or a rule.',
      'A separate held-out set that you do not look at while editing the prompt.',
      'One command prints the score overall and for each kind of case.',
      'It compares a new prompt with the saved best and flags any case that got worse.',
      'Every prompt version is saved next to its scores.',
    ],
    stretch: 'Add a model judge, then check it against your own labels on twenty cases and swap the answer order to test for position bias.',
    lessons: ['evals/evals-101', 'evals/llm-as-judge-pitfalls', 'llm/prompt-patterns-and-optimisation'],
    tools: ['chat model', 'a script', 'a spreadsheet or JSON file'],
  },
  {
    id: 'laptop-model',
    title: 'Run a model on your own laptop',
    level: 'basic',
    hours: '2 to 4',
    build: 'Run a small open model locally and write down how fast it is and how much memory it uses.',
    criteria: [
      'A model runs on your machine and answers a prompt with no internet needed.',
      'You measured tokens per second for a short and for a long prompt.',
      'You noted the memory used, and compared it with the memory calculator’s estimate.',
      'You tried a second, smaller or more quantized version and noted what changed.',
    ],
    stretch: 'Raise the context length and find where memory or speed falls off.',
    lessons: ['local/run-models-locally', 'local/memory-math-for-local-models', 'serving/kv-cache-and-memory', 'serving/quantization'],
    tools: ['local model runner', 'the memory calculator', 'a stopwatch or script'],
  },
  {
    id: 'cost-latency-report',
    title: 'A cost and latency report for one feature',
    level: 'intermediate',
    hours: '2 to 4',
    build: 'A one-page report on what one AI feature costs per month and how long a user waits, with the levers that would change both.',
    criteria: [
      'You counted real input and output tokens for a typical request.',
      'The monthly cost uses your own traffic figures, labelled as assumptions.',
      'You measured time to first token and total time for at least ten requests.',
      'The report names the two biggest levers and estimates what each would save.',
    ],
    stretch: 'Compare paying per token with running your own GPU, and find the volume where the answer flips.',
    lessons: ['cost/where-the-tokens-go', 'cost/cost-levers', 'serving/life-of-a-request', 'local/self-hosting-vs-api-economics'],
    tools: ['the cost and break-even calculators', 'request logs or a timer'],
  },
];
