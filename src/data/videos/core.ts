import type { LessonVideos } from './types';

/**
 * Tracks: start, foundations, llm, rag-agents, evals, systems. Keys are "<track>/<slug>".
 * Every entry was checked against YouTube's oEmbed endpoint; title and creator are copied
 * from that response, minutes from the watch page. Picked from independent educators where
 * one covers the topic; a company channel is used only when none did.
 */
export const videosCore: LessonVideos = {
  /* ---------- start ---------- */
  'start/what-is-ai-in-plain-english': [
    { creator: 'CodeAI', title: 'How AI Works', url: 'https://www.youtube.com/watch?v=Ok-xpKjKp2g', minutes: 2, easy: true },
    { creator: 'CrashCourse', title: 'What Is Artificial Intelligence? Crash Course AI #1', url: 'https://www.youtube.com/watch?v=a0_lo_GDcFw', minutes: 12, easy: true },
  ],
  'start/how-a-chatbot-answers': [
    { creator: 'CodeAI', title: 'How Chatbots and Large Language Models Work', url: 'https://www.youtube.com/watch?v=X-AWdfSFCHQ', minutes: 7, easy: true },
    { creator: '3Blue1Brown', title: 'Large Language Models explained briefly', url: 'https://www.youtube.com/watch?v=LPZh9BOjkQs', minutes: 8, easy: true },
  ],
  'start/how-apps-use-ai': [
    { creator: 'Simply Explained', title: 'What Are APIs? - Simply Explained', url: 'https://www.youtube.com/watch?v=OVvTv9Hy91Q', minutes: 7, easy: true },
  ],
  'start/one-question-all-the-way-through': [
    { creator: '3Blue1Brown', title: 'Large Language Models explained briefly', url: 'https://www.youtube.com/watch?v=LPZh9BOjkQs', minutes: 8, easy: true },
    { creator: 'CodeAI', title: 'How Chatbots and Large Language Models Work', url: 'https://www.youtube.com/watch?v=X-AWdfSFCHQ', minutes: 7, easy: true },
  ],
  'start/using-ai-without-getting-burned': [
    { creator: 'Claude', title: 'Why do AI models hallucinate?', url: 'https://www.youtube.com/watch?v=005JLRt3gXI', minutes: 5, easy: true },
    { creator: 'CodeAI', title: 'AI: Training Data & Bias', url: 'https://www.youtube.com/watch?v=x2mRoFNm22g', minutes: 3, easy: true },
  ],
  'start/how-computers-learn': [
    { creator: 'CodeAI', title: 'What is Machine Learning?', url: 'https://www.youtube.com/watch?v=KHbwOetbmbs', minutes: 3, easy: true },
    { creator: 'CodeAI', title: 'How Neural Networks Work', url: 'https://www.youtube.com/watch?v=JrXazCEACVo', minutes: 5, easy: true },
    { creator: 'CrashCourse', title: 'Supervised Learning: Crash Course AI #2', url: 'https://www.youtube.com/watch?v=4qVRBYAdLAo', minutes: 15, easy: true },
  ],
  'start/how-computers-read-words': [
    { creator: 'CrashCourse', title: 'Natural Language Processing: Crash Course AI #7', url: 'https://www.youtube.com/watch?v=oi0JXuL19TA', minutes: 13, easy: true },
    { creator: '3Blue1Brown', title: 'Large Language Models explained briefly', url: 'https://www.youtube.com/watch?v=LPZh9BOjkQs', minutes: 8, easy: true },
  ],
  'start/ai-that-sees-and-hears': [
    { creator: 'CodeAI', title: 'How Computer Vision Works', url: 'https://www.youtube.com/watch?v=2hXG8v8p0KM', minutes: 6, easy: true },
  ],

  /* ---------- foundations ---------- */
  'foundations/attention-intuition': [
    { creator: '3Blue1Brown', title: 'Attention in transformers, step-by-step | Deep Learning Chapter 6', url: 'https://www.youtube.com/watch?v=eMlx5fFNoYc', minutes: 26 },
    { creator: 'StatQuest with Josh Starmer', title: 'Attention for Neural Networks, Clearly Explained!!!', url: 'https://www.youtube.com/watch?v=PSs6nxngL6k', minutes: 16 },
  ],
  'foundations/classical-ml-essentials': [
    { creator: 'StatQuest with Josh Starmer', title: 'Machine Learning Fundamentals: Bias and Variance', url: 'https://www.youtube.com/watch?v=EuBBz3bI-aA', minutes: 7 },
    { creator: 'StatQuest with Josh Starmer', title: 'Machine Learning Fundamentals: Cross Validation', url: 'https://www.youtube.com/watch?v=fSytzGwwBVw', minutes: 6 },
    { creator: 'StatQuest with Josh Starmer', title: 'ROC and AUC, Clearly Explained!', url: 'https://www.youtube.com/watch?v=4jRBRDbJemM', minutes: 16 },
  ],
  'foundations/how-models-learn': [
    { creator: '3Blue1Brown', title: 'Gradient descent, how neural networks learn | Deep Learning Chapter 2', url: 'https://www.youtube.com/watch?v=IHZwWFHWa-w', minutes: 21 },
    { creator: 'StatQuest with Josh Starmer', title: 'Gradient Descent, Step-by-Step', url: 'https://www.youtube.com/watch?v=sDv4f4s2SB8', minutes: 24 },
    { creator: 'Andrej Karpathy', title: 'The spelled-out intro to neural networks and backpropagation: building micrograd', url: 'https://www.youtube.com/watch?v=VMj-3S1tku0', minutes: 146 },
  ],
  'foundations/inside-a-transformer': [
    { creator: '3Blue1Brown', title: 'Transformers, the tech behind LLMs | Deep Learning Chapter 5', url: 'https://www.youtube.com/watch?v=wjZofJX0v4M', minutes: 27 },
    { creator: 'StatQuest with Josh Starmer', title: 'Decoder-Only Transformers, ChatGPTs specific Transformer, Clearly Explained!!!', url: 'https://www.youtube.com/watch?v=bQ5BoolX9Ag', minutes: 37 },
    { creator: 'Andrej Karpathy', title: "Let's build GPT: from scratch, in code, spelled out.", url: 'https://www.youtube.com/watch?v=kCc8FmEb1nY', minutes: 116 },
  ],
  'foundations/ml-to-ai-timeline': [
    { creator: 'Welch Labs', title: 'The moment we stopped understanding AI [AlexNet]', url: 'https://www.youtube.com/watch?v=UZDiGooFs54', minutes: 18 },
  ],
  'foundations/multimodal-models': [
    { creator: 'Computerphile', title: "How AI 'Understands' Images (CLIP) - Computerphile", url: 'https://www.youtube.com/watch?v=KcSXcpluDe4', minutes: 18 },
    { creator: 'Yannic Kilcher', title: 'OpenAI CLIP: ConnectingText and Images (Paper Explained)', url: 'https://www.youtube.com/watch?v=T9XSU0pKX2E', minutes: 48 },
  ],
  'foundations/tokens-and-embeddings': [
    { creator: 'Andrej Karpathy', title: "Let's build the GPT Tokenizer", url: 'https://www.youtube.com/watch?v=zduSFxRajkE', minutes: 134 },
    { creator: 'StatQuest with Josh Starmer', title: 'Word Embedding and Word2Vec, Clearly Explained!!!', url: 'https://www.youtube.com/watch?v=viZrOnJclY0', minutes: 16 },
    { creator: 'Computerphile', title: 'Vectoring Words (Word Embeddings) - Computerphile', url: 'https://www.youtube.com/watch?v=gQddtTdmG_8', minutes: 17 },
  ],
  'foundations/training-pipeline': [
    { creator: 'Andrej Karpathy', title: '[1hr Talk] Intro to Large Language Models', url: 'https://www.youtube.com/watch?v=zjkBMFhNj_g', minutes: 60 },
    { creator: 'StatQuest with Josh Starmer', title: 'Reinforcement Learning with Human Feedback (RLHF), Clearly Explained!!!', url: 'https://www.youtube.com/watch?v=qPN_XZcJf_s', minutes: 18 },
    { creator: 'Andrej Karpathy', title: 'Deep Dive into LLMs like ChatGPT', url: 'https://www.youtube.com/watch?v=7xTGNNLPyMI', minutes: 211 },
  ],

  /* ---------- llm ---------- */
  'llm/context-window-and-caching': [
    { creator: 'NetworkChuck', title: 'Why LLMs get dumb (Context Windows Explained)', url: 'https://www.youtube.com/watch?v=TeQDr4DkLYo', minutes: 15 },
    { creator: 'Matt Pocock', title: 'Most devs don’t understand how context windows work', url: 'https://www.youtube.com/watch?v=-uW5-TaVXu4', minutes: 10 },
    { creator: 'Gaurav Sen', title: 'AI Interview Questions #3 - Prompt Caching with LLMs', url: 'https://www.youtube.com/watch?v=tGqvoEuoU5M', minutes: 6 },
  ],
  'llm/fine-tuning-in-practice': [
    { creator: 'Mark Hennings', title: 'LoRA & QLoRA Fine-tuning Explained In-Depth', url: 'https://www.youtube.com/watch?v=t1caDsMzWBk', minutes: 15 },
    { creator: 'Umar Jamil', title: 'LoRA: Low-Rank Adaptation of Large Language Models - Explained visually + PyTorch code from scratch', url: 'https://www.youtube.com/watch?v=PXWYUTMt-AU', minutes: 27 },
    { creator: 'DeepLearningAI', title: 'Aligning LLMs with Direct Preference Optimization', url: 'https://www.youtube.com/watch?v=QXVCqtAZAn4', minutes: 58 },
  ],
  'llm/parameters-and-hyperparameters': [
    { creator: '3Blue1Brown', title: 'But what is a neural network? | Deep learning chapter 1', url: 'https://www.youtube.com/watch?v=aircAruvnKk', minutes: 19 },
    { creator: 'DeepLearningAI', title: 'Hyperparameter Tuning in Practice (C2W3L03)', url: 'https://www.youtube.com/watch?v=wKkcBPp3F1Y', minutes: 7 },
  ],
  'llm/prompt-patterns-and-optimisation': [
    { creator: 'AI Engineer', title: 'How We Build Effective Agents: Barry Zhang, Anthropic', url: 'https://www.youtube.com/watch?v=D7_ipDqhtwk', minutes: 15 },
    { creator: 'Sequoia Capital', title: "What's next for AI agentic workflows ft. Andrew Ng of AI Fund", url: 'https://www.youtube.com/watch?v=sal78ACtGTc', minutes: 14 },
  ],
  'llm/prompting-and-structured-output': [
    { creator: 'freeCodeCamp.org', title: 'Prompt Engineering Tutorial – Master ChatGPT and LLM Responses', url: 'https://www.youtube.com/watch?v=_ZvnD73m40o', minutes: 42 },
    { creator: 'AI Engineer', title: 'Pydantic is all you need: Jason Liu', url: 'https://www.youtube.com/watch?v=yj-wSRJwrrc', minutes: 18 },
  ],
  'llm/prompting-vs-rag-vs-fine-tuning': [
    { creator: 'Shaw Talebi', title: '3 Ways to Make a Custom AI Assistant | RAG, Tools, & Fine-tuning', url: 'https://www.youtube.com/watch?v=4RAvJt3fWoI', minutes: 48 },
  ],
  'llm/reasoning-models': [
    { creator: 'Sam Witteveen', title: "Explaining OpenAI's o1 Reasoning Models", url: 'https://www.youtube.com/watch?v=jrA47yocyV0', minutes: 27 },
    { creator: 'Krish Naik', title: 'Illustrated DeepSeek-R1 And Live Q&A With Jay Alammar', url: 'https://www.youtube.com/watch?v=D-MtK5Ec_nw', minutes: 62 },
  ],

  /* ---------- rag-agents ---------- */
  'rag-agents/agents-and-tool-use': [
    { creator: 'AI Engineer', title: 'How We Build Effective Agents: Barry Zhang, Anthropic', url: 'https://www.youtube.com/watch?v=D7_ipDqhtwk', minutes: 15 },
    { creator: 'freeCodeCamp.org', title: 'Guide to Agentic AI – Build a Python Coding Agent with Gemini', url: 'https://www.youtube.com/watch?v=YtHdaXuOAks', minutes: 134 },
  ],
  'rag-agents/choosing-ai-libraries': [
    { creator: 'codebasics', title: 'Best Agentic AI Framework', url: 'https://www.youtube.com/watch?v=Wr0AsdR-I3k', minutes: 8 },
  ],
  'rag-agents/chunking-and-retrieval-quality': [
    { creator: 'Greg Kamradt', title: 'The 5 Levels Of Text Splitting For Retrieval', url: 'https://www.youtube.com/watch?v=8OJC21T2SL4', minutes: 69 },
  ],
  'rag-agents/langchain-and-langgraph': [
    { creator: 'freeCodeCamp.org', title: 'LangGraph Complete Course for Beginners – Complex AI Agents with Python', url: 'https://www.youtube.com/watch?v=jGg_1h0qzaM', minutes: 190 },
    { creator: 'CampusX', title: 'Generative AI using LangChain', url: 'https://www.youtube.com/playlist?list=PLKnIA16_RmvaTbihpo4MtzVm4XOQa0ER0' },
    { creator: 'CampusX', title: 'Agentic AI using LangGraph', url: 'https://www.youtube.com/playlist?list=PLKnIA16_RmvYsvB8qkUQuJmJNuiCUJFPL' },
  ],
  'rag-agents/mcp-in-depth': [
    { creator: 'codebasics', title: 'Model Context Protocol Clearly Explained | MCP Beyond the Hype', url: 'https://www.youtube.com/watch?v=tzrwxLNHtRY', minutes: 15 },
    { creator: 'Shaw Talebi', title: 'Model Context Protocol (MCP) Explained in 20 Minutes', url: 'https://www.youtube.com/watch?v=N3vHJcHBS-w', minutes: 20 },
    { creator: 'Krish Naik', title: 'All You Need To Know About Model Context Protocol(MCP)', url: 'https://www.youtube.com/watch?v=-UQ6OZywZ2I', minutes: 25 },
  ],
  'rag-agents/rag-from-scratch': [
    { creator: 'freeCodeCamp.org', title: 'Learn RAG From Scratch – Python AI Tutorial from a LangChain Engineer', url: 'https://www.youtube.com/watch?v=sVcwVQRHIc8', minutes: 153 },
    { creator: 'CampusX', title: 'Retrieval Augmented Generation | What is RAG | How does RAG Work | RAG Explained | CampusX', url: 'https://www.youtube.com/watch?v=X0btK9X0Xnk', minutes: 59 },
  ],
  'rag-agents/the-tools-and-ecosystem': [
    { creator: 'Andrej Karpathy', title: 'How I use LLMs', url: 'https://www.youtube.com/watch?v=EWvNQjAaOHw', minutes: 131 },
    { creator: 'Tech With Tim', title: 'Learn Ollama in 15 Minutes - Run LLM Models Locally for FREE', url: 'https://www.youtube.com/watch?v=UtSSMs6ObqY', minutes: 14 },
  ],
  'rag-agents/vector-search-and-retrieval-metrics': [
    { creator: 'Fireship', title: 'Vector databases are so hot right now. WTF are they?', url: 'https://www.youtube.com/watch?v=klTvEwg3oJ4', minutes: 3 },
    { creator: 'James Briggs', title: 'HNSW for Vector Search Explained and Implemented with Faiss (Python)', url: 'https://www.youtube.com/watch?v=QvKMwLjdK-s', minutes: 35 },
    { creator: 'James Briggs', title: 'RAG But Better: Rerankers with Cohere AI', url: 'https://www.youtube.com/watch?v=Uh9bYiVrW_s', minutes: 24 },
  ],

  /* ---------- evals ---------- */
  'evals/eu-ai-act-for-engineers': [
    { creator: 'EU Made Simple', title: "The EU's AI Act Explained", url: 'https://www.youtube.com/watch?v=s_rxOnCt3HQ', minutes: 5 },
  ],
  'evals/evals-101': [
    { creator: "Lenny's Podcast", title: 'Why AI evals are the hottest new skill for product builders | Hamel Husain & Shreya Shankar', url: 'https://www.youtube.com/watch?v=BsWxPI9UM4c', minutes: 107 },
    { creator: 'Hamel Husain', title: 'LLM Evals: Common Mistakes', url: 'https://www.youtube.com/watch?v=GL0XhAj5LPE', minutes: 28 },
  ],
  'evals/evaluating-agents': [
    { creator: 'Aishwarya Srinivasan', title: 'AI Evals Explained | How to evaluate AI Agents?', url: 'https://www.youtube.com/watch?v=_Er8Hao_gmQ', minutes: 23 },
  ],
  'evals/llm-as-judge-pitfalls': [
    { creator: 'Dave Ebbelaar', title: 'How to Systematically Setup LLM Evals (Metrics, Unit Tests, LLM-as-a-Judge)', url: 'https://www.youtube.com/watch?v=a3SMraZWNNs', minutes: 55 },
  ],
  'evals/llm-security': [
    { creator: 'Computerphile', title: 'ChatGPT Jailbreak - Computerphile', url: 'https://www.youtube.com/watch?v=zn2ukSnDqSg', minutes: 12 },
    { creator: 'Simon Willison', title: 'Prompt Injection, explained', url: 'https://www.youtube.com/watch?v=FgxwCaL6UTA', minutes: 12 },
  ],
  'evals/llmops-in-production': [
    { creator: 'The Full Stack', title: 'LLMOps (LLM Bootcamp)', url: 'https://www.youtube.com/watch?v=Fquj2u7ay40', minutes: 49 },
  ],

  /* ---------- systems ---------- */
  'systems/llm-app-system-design': [
    { creator: 'codebasics', title: 'AI System Design Tutorial', url: 'https://www.youtube.com/watch?v=S6jy0T85DFs', minutes: 43 },
  ],
  'systems/model-routing-and-fallbacks': [
    { creator: 'Sam Witteveen', title: 'What is an LLM Router?', url: 'https://www.youtube.com/watch?v=V_K6PCmdtRg', minutes: 9 },
    { creator: 'Krish Naik', title: 'What Are LLM Gateways With Detailed Implementation', url: 'https://www.youtube.com/watch?v=RN3baOpNA6w', minutes: 43 },
  ],
  'systems/rag-service-architecture': [
    { creator: 'AI Engineer', title: 'Building Production-Ready RAG Applications: Jerry Liu', url: 'https://www.youtube.com/watch?v=TRjq7t2Ms5I', minutes: 19 },
  ],
};
