import type { SearchItem } from '../lib/search';

/**
 * The fixed pages the search box can jump to. Paths are site-relative; the search endpoint
 * adds the base path. A test checks every path has a page behind it, so this list cannot
 * point at something that was renamed or removed.
 */
export const searchPages: SearchItem[] = [
  { t: 'Cost calculator', u: '/tools/cost/', k: 'Tool', s: 'Estimate monthly spend from traffic and token counts.' },
  { t: 'Model memory calculator', u: '/tools/memory/', k: 'Tool', s: 'Weights plus KV cache against device memory.' },
  { t: 'GPU explorer', u: '/tools/gpu/', k: 'Tool', s: 'Which accelerators hold a model, how many users fit and how fast each decodes.' },
  { t: 'API or your own GPUs?', u: '/tools/breakeven/', k: 'Tool', s: 'Break-even between API pricing and self-hosted GPUs.' },
  { t: 'Latency budget', u: '/tools/latency/', k: 'Tool', s: 'Cloud versus on-device inference against a time budget.' },
  { t: 'Sandbox', u: '/tools/sandbox/', k: 'Tool', s: 'Type the commands of Ollama, vLLM and Hugging Face and see recorded output, or run real Python in your browser.' },
  { t: 'The tools and the ecosystem', u: '/tools/ecosystem/', k: 'Tool', s: 'Hugging Face, Ollama, LM Studio, llama.cpp, vLLM, MCP and Agent Skills, with official links and a first command.' },
  { t: 'Practice labs', u: '/practice/', k: 'Page', s: 'Write Python in your browser and see which checks pass: embeddings, chunking, RAG ranking, attention, retries and more.' },
  { t: 'AI libraries map', u: '/libraries/', k: 'Page', s: 'Verified agent, RAG, vector, evaluation, guardrail, observability, fine-tuning and serving libraries, with licence, status and install command.' },
  { t: 'Choose a path', u: '/start/', k: 'Page', s: 'Find your starting point and get a learning path.' },
  { t: 'Glossary', u: '/glossary/', k: 'Page', s: 'Every term used on the site, in plain English.' },
  { t: 'News', u: '/pulse/', k: 'Page', s: 'The last month of headlines from cloud providers, model labs, serving projects and security groups, refreshed daily.' },
  { t: 'Notes we explain', u: '/pulse/notes/', k: 'Page', s: 'Short, checked notes on changes that matter for the systems you build, and what to do about them.' },
  { t: 'How big companies build it', u: '/cases/', k: 'Page', s: 'Engineering write-ups from companies such as Anthropic, Uber, Shopify and Dropbox on RAG, agents, serving, evals and cost. Filter by topic and company.' },
  { t: 'Further watching', u: '/watch/', k: 'Page', s: 'Video courses and playlists by other creators on transformers, embeddings, RAG, LangChain, LangGraph, evals and MCP.' },
  { t: 'Interview prep', u: '/interview/', k: 'Page', s: 'Practise AI interviews or run them with a shared rubric.' },
  { t: 'Your progress', u: '/progress/', k: 'Page', s: 'Lessons done, quiz scores, revision and a mixed review. Copy a link or download a file to move it to another device.' },
  { t: 'For teachers', u: '/teach/', k: 'Page', s: 'Course plans and classroom activities.' },
];
