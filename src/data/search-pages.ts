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
  { t: 'What should I learn next?', u: '/next/', k: 'Page', s: 'Pick a learning goal and see the one lesson to do next, a lighter and a more hands-on option, your progress on the path and earlier lessons worth catching up on.' },
  { t: 'Choose a path', u: '/start/', k: 'Page', s: 'Find your starting point and get a learning path.' },
  { t: 'Glossary', u: '/glossary/', k: 'Page', s: 'Every term used on the site, in plain English.' },
  { t: 'News', u: '/pulse/', k: 'Page', s: 'The last month of headlines from cloud providers, model labs, serving projects and security groups, refreshed daily.' },
  { t: 'Notes we explain', u: '/pulse/notes/', k: 'Page', s: 'Short, checked notes on changes that matter for the systems you build, and what to do about them.' },
  { t: 'How big companies build it', u: '/cases/', k: 'Page', s: 'Engineering write-ups from companies such as Anthropic, Uber, Shopify and Dropbox on RAG, agents, serving, evals and cost. Filter by topic and company.' },
  { t: 'What’s new (changelog)', u: '/changelog/', k: 'Page', s: 'Every version of Layerwise, newest first: what was added and changed, with links to the tagged releases on GitHub.' },
  { t: 'Learning videos', u: '/watch/', k: 'Page', s: 'YouTube videos and courses by well-known creators for every lesson, from AI basics to GPUs and cloud, plus longer courses on transformers, RAG, evals and MCP.' },
  { t: 'What if…? experiments', u: '/whatif/', k: 'Page', s: 'Take one part out of an AI system, such as the KV cache, embeddings or attention, and watch what breaks.' },
  { t: 'Model radar', u: '/models/', k: 'Page', s: 'Dated, sourced facts for current models from Anthropic, OpenAI, Google, Mistral, DeepSeek and Alibaba: release dates, context windows, list prices, input types and open weights, plus what one task costs. No quality rankings.' },
  { t: 'Daily card', u: '/share/', k: 'Page', s: 'A new picture and caption every day for LinkedIn or Instagram: a guess-first question, an AI term, an experiment, a takeaway or an interview question.' },
  { t: 'Interview answers', u: '/interview/', k: 'Page', s: 'Answers to AI interview questions by topic, with diagrams and worked examples: language models, training, RAG, agents, evals, serving and cost, system design, statistics, MLOps, security, on-device AI and product roles.' },
  { t: 'Daily review', u: '/review/', k: 'Page', s: 'Five short questions a day from lessons you have finished, brought back at growing gaps so they stick, with a forgiving streak you can hide. Saved only in your browser.' },
  { t: 'Your progress', u: '/progress/', k: 'Page', s: 'Lessons done, quiz scores, revision and a mixed review. Copy a link or download a file to move it to another device.' },
  { t: 'Certificates', u: '/certificate/', k: 'Page', s: 'Finish every lesson in a learning path and download or print a certificate with your name on it.' },
  { t: 'For teachers', u: '/teach/', k: 'Page', s: 'School plans for ages 10 to 18, unplugged activities, worksheets, a parents guide, an AI4K12 map and adult workshop plans.' },
  { t: 'Unplugged activity cards', u: '/teach/activities/', k: 'Page', s: 'Twelve classroom activities with no computer: be the classifier, 20 questions as a decision tree, human neural network, bias in the data, spot the fake source, tokens by hand.' },
  { t: 'Printable worksheets', u: '/teach/worksheets/', k: 'Page', s: 'An A4 worksheet and answer key for each age band: 10 to 12, 13 to 15 and 16 to 18.' },
  { t: 'Parents and carers guide', u: '/teach/parents/', k: 'Page', s: 'What children learn about AI here, how to talk about it, rules of thumb for safe use at home, and a printable family agreement.' },
];
