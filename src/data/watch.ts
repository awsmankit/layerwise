/**
 * Video courses and playlists, resolved from the shortened links in the user's
 * own roadmap. Titles and channels come from YouTube's public oEmbed endpoint,
 * and the Anthropic course page, on the date in `watchChecked`. Third-party
 * content: it can move or change, so each entry says who made it.
 */
export type Watch = {
  creator: string;
  title: string;
  url: string;
  kind: 'video' | 'playlist' | 'course';
  topic: string;
  /** Only set when the title or page says so. */
  lang?: string;
  /** The label the roadmap gave it, where that adds something to the title. */
  note?: string;
};

export const watchChecked = '2026-10-30';

export const topicLabels: Record<string, string> = {
  transformers: 'Transformers',
  embeddings: 'Embeddings and vector search',
  prompting: 'Prompt engineering',
  rag: 'RAG',
  langchain: 'LangChain',
  langgraph: 'LangGraph',
  cloud: 'Azure AI Foundry and AWS Bedrock',
  evals: 'Evaluation',
  security: 'Security and guardrails',
  mcp: 'MCP',
};

export const watch: Watch[] = [
  {
    creator: 'codebasics',
    title: 'Transformers Explained | Simple Explanation of Transformers',
    url: 'https://www.youtube.com/watch?v=ZhAz268Hdpw',
    kind: 'video',
    topic: 'transformers',
  },

  {
    creator: 'Rohit Negi',
    title: 'What are Vectors | Vector Embedding and Vector Database | | GenAI Full Course #6',
    url: 'https://www.youtube.com/watch?v=JsGwjwnl4hY',
    kind: 'video',
    topic: 'embeddings',
    note: 'Vector Embeddings',
  },
  {
    creator: 'Rohit Negi',
    title: 'What is Vector Database | Internal Implementation of Vector DataBase | | GenAI Full Course #7',
    url: 'https://www.youtube.com/watch?v=lvH_zPj2o04',
    kind: 'video',
    topic: 'embeddings',
    note: 'Algorithm of Vector Database',
  },
  {
    creator: 'Satyajit Pattnaik',
    title: 'The Complete Guide to Vector Databases: From Basics to Implementation',
    url: 'https://www.youtube.com/watch?v=5kCE0l11ZHk',
    kind: 'video',
    topic: 'embeddings',
    note: 'Implementation',
  },

  {
    creator: 'Rohit Negi',
    title: 'What is Retrieval Augmented Generation (RAG) | What is LangChain  | GenAI Full Course #8',
    url: 'https://www.youtube.com/watch?v=4Ax77tnW0e8',
    kind: 'video',
    topic: 'rag',
  },
  {
    creator: 'CampusX',
    title: 'Retrieval Augmented Generation | What is RAG | How does RAG Work | RAG Explained | CampusX',
    url: 'https://www.youtube.com/watch?v=X0btK9X0Xnk',
    kind: 'video',
    topic: 'rag',
  },

  {
    creator: 'CampusX',
    title: 'Generative AI using LangChain',
    url: 'https://www.youtube.com/playlist?list=PLKnIA16_RmvaTbihpo4MtzVm4XOQa0ER0',
    kind: 'playlist',
    topic: 'langchain',
  },
  {
    creator: 'CampusX',
    title: 'Agentic AI using LangGraph',
    url: 'https://www.youtube.com/playlist?list=PLKnIA16_RmvYsvB8qkUQuJmJNuiCUJFPL',
    kind: 'playlist',
    topic: 'langgraph',
  },

  {
    creator: 'Krish Naik',
    title: 'Building Ai agents With Microsoft Foundry- Build ,Govern AI Apps And Agents at Scale',
    url: 'https://www.youtube.com/watch?v=ZP_U8eKBy2g',
    kind: 'video',
    topic: 'cloud',
  },
  {
    creator: 'Solved Systems',
    title: '🌐 Azure AI Foundry Playlist | Learn AI on Microsoft Azure',
    url: 'https://www.youtube.com/playlist?list=PLKN5-zCKJG7w-3gXIVptJV7sSi7fbQoBE',
    kind: 'playlist',
    topic: 'cloud',
    note: 'Azure AI Foundry',
  },
  {
    creator: 'codebasics',
    title: 'Amazon Bedrock AgentCore Tutorial | Build, Deploy, Operate AI Agents using AgentCore',
    url: 'https://www.youtube.com/watch?v=cTBGIKAckKE',
    kind: 'video',
    topic: 'cloud',
    note: 'AWS Bedrock',
  },

  {
    creator: 'Satyajit Pattnaik',
    title: 'Want to Master Gen AI Models? Watch This RAGAs Evaluation Now | RAGAs Framework | Satyajit Pattnaik',
    url: 'https://www.youtube.com/watch?v=J3M95E0LQl8',
    kind: 'video',
    topic: 'evals',
    note: 'RAGAS',
  },
  {
    creator: 'Siddhardhan',
    title: 'LLM as a Judge Explained | Hands-On GenAI Evaluation with Real Code',
    url: 'https://www.youtube.com/watch?v=3FcYdRQPMCo',
    kind: 'video',
    topic: 'evals',
    note: 'LLM-as-a-Judge',
  },
  {
    creator: 'CampusX',
    title: 'LLM Evaluation',
    url: 'https://www.youtube.com/playlist?list=PLEneLIDJFpcA',
    kind: 'playlist',
    topic: 'evals',
    note: 'LLM Evals',
  },

  {
    creator: 'Defronix Academy',
    title: 'Day-54 LLM Attacks & Prompt Injection Part 1 - Bug Bounty Free Course [ Hindi ]',
    url: 'https://www.youtube.com/watch?v=DANRXYsT4Bs',
    kind: 'video',
    topic: 'security',
    lang: 'Hindi',
    note: 'Prompt Injection',
  },
  {
    creator: 'Sunny Savita',
    title: 'Guardrails for LLM Applications | Complete Tutorial for AI Developers WIth Guardrails AI',
    url: 'https://www.youtube.com/watch?v=7V1w5gnZ-kw',
    kind: 'video',
    topic: 'security',
    note: 'Guardrails',
  },

  {
    creator: 'Anthropic',
    title: 'Introduction to Model Context Protocol',
    url: 'https://anthropic-partners.skilljar.com/introduction-to-model-context-protocol',
    kind: 'course',
    topic: 'mcp',
    note: 'Intro to MCP. Free; needs an account.',
  },
  {
    creator: 'Gate Smashers',
    title: 'What is MCP | Complete Details with example',
    url: 'https://www.youtube.com/watch?v=GxHOSWxp7c0',
    kind: 'video',
    topic: 'mcp',
  },
  {
    creator: 'Chai aur Code',
    title: 'What are MCP servers | Explained in Hindi',
    url: 'https://www.youtube.com/watch?v=dZyQNy3-HjU',
    kind: 'video',
    topic: 'mcp',
    lang: 'Hindi',
  },
  {
    creator: 'Krish Naik',
    title: 'All You Need To Know About Model Context Protocol(MCP)',
    url: 'https://www.youtube.com/watch?v=-UQ6OZywZ2I',
    kind: 'video',
    topic: 'mcp',
  },
];
