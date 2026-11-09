/**
 * Release history. This file is the single source of truth: the /changelog/ page,
 * CHANGELOG.md (run `npm run changelog`) and the GitHub release notes are all made
 * from it. Newest first. Add a release by putting a new entry at the top, bumping
 * `version` in package.json to match, and running `npm run changelog`.
 *
 * Version numbers follow semantic versioning, read for a learning site:
 *   MAJOR  the curriculum or the way learners move through it changes shape
 *          (new topics, rebuilt learning paths).
 *   MINOR  new lessons, labs, tools or features.
 *   PATCH  fixes and small corrections (wording, links, layout, accessibility).
 */

export type ReleaseStats = {
  lessons: number;
  topics: number;
  labs: number;
  glossary: number;
};

export type Release = {
  /** Semantic version without the leading "v". */
  version: string;
  /** ISO date the release was tagged. */
  date: string;
  title: string;
  summary: string;
  highlights: string[];
  /** Counts in the repository at that tag. */
  stats: ReleaseStats;
};

export const repoUrl = 'https://github.com/awsmankit/layerwise';

export const releases: Release[] = [
  {
    version: '2.10.0',
    date: '2026-11-09',
    title: 'Twelve more daily home page figures, and a cleaner link check',
    summary: 'The animated figure on the home page now rotates through 23 drawings, and the weekly link check stops calling script-blocking sites broken.',
    highlights: [
      'Twelve new daily figures: how a model decides which words matter, how text is cut into pieces (a real byte-pair run), how meaning becomes numbers, how a model is adapted with a small add-on, how a model is made smaller, how a model learns what people prefer, how we test an answer, how a GPU serves many people at once, how we know a change helped, how we notice a model getting worse, how speech becomes text, and how an agent finds and uses tools. Every number is computed by tested code, and examples are labelled as examples.',
      'The weekly link check now lists sites that answer scripts with 404 (NIST, Kaggle, Google Support and a few others) as check by hand, not broken, and fixed the Guardrails AI docs link.',
    ],
    stats: { lessons: 164, topics: 17, labs: 24, glossary: 880 },
  },
  {
    version: '2.9.0',
    date: '2026-11-08',
    title: 'A different animated figure on the home page every day',
    summary: 'The animated figure at the top of the home page now changes every day, and the daily card carries real teaching points.',
    highlights: [
      'The home page figure rotates through 11 animated line drawings, one per day: how a chatbot answers, how it answers from your own documents, how an AI agent finishes a task, how a model learns, how it picks the next word, how it avoids repeating work, how a computer recognises a picture, what happens when you press send, how a hearing device cleans up sound, how email is sorted into spam, and how a safety check wraps an assistant. Every number in them is computed by tested code, and examples are labelled as examples.',
      'The Daily card now teaches more: experiment, lesson and interview cards carry three real points, interview cards show the question that is actually asked, and captions carry the same points.',
    ],
    stats: { lessons: 164, topics: 17, labs: 24, glossary: 880 },
  },
  {
    version: '2.8.0',
    date: '2026-11-08',
    title: 'Daily card and a new experiment on the home page every day',
    summary: 'A picture and caption for every day, ready to post, and a different live experiment on the landing page each day.',
    highlights: [
      'New Daily card page: one picture and caption per day for LinkedIn or Instagram, chosen by the date. The week rotates through a guess-first question, an AI term, an experiment, a takeaway and an interview question. Download the picture, copy the caption, and browse the days ahead to plan a week. Everything is made in your browser and nothing is uploaded.',
      'The landing page now shows a different live What if…? experiment every day, with a link to guess first and try it.',
    ],
    stats: { lessons: 164, topics: 17, labs: 24, glossary: 880 },
  },
  {
    version: '2.7.0',
    date: '2026-11-08',
    title: 'Guess first, 28 more experiments, and links between experiments, lessons and interviews',
    summary: 'The What if…? section grows to 87 experiments, each now asks for a guess before you flip the switch, and lessons and interview questions link to the experiments that teach the same idea.',
    highlights: [
      'Guess first: every experiment now asks what you expect to happen before you touch the switch, then shows why. Guessing first makes the result stick.',
      'Two new groups: How machines learn (start here), for readers from about 11 with everyday examples such as a computer that has only ever seen cats, and Responsible AI, with experiments on checking results group by group, data that does not look like the users, feedback loops and personal data in logs.',
      'Inside a model: seeing the words that come after, every head keeping its own keys and values, storing the whole attention table, and an answer buried in a long context. Training: unshuffled data, no learning-rate warmup, no gradient clipping, and models training on their own output.',
      'Search and agents: ignoring who the user is, retrieving far too many passages, no tracing, and a retry that repeats the action. Serving: no semantic cache, a model too big for one GPU, shipping to everyone at once, and unversioned prompts. Data and devices: shuffling time-ordered data, careless missing values, hundreds of useless features, and running the big model on silence.',
      'Lessons now have a Try breaking it row, and interview questions link to related experiments.',
      'An accessibility pass: every experiment page was scanned with an automated checker in light and dark mode, and low-contrast status text was fixed.',
    ],
    stats: { lessons: 164, topics: 17, labs: 24, glossary: 880 },
  },
  {
    version: '2.6.0',
    date: '2026-11-07',
    title: '28 more What if…? experiments',
    summary: 'The What if…? section grows from 31 to 59 experiments, with a new group for classical machine learning and data.',
    highlights: [
      'Inside a model: one attention head only, no feed-forward layer, every expert running for every token, and the big model checking every token itself (speculative decoding).',
      'Training: a base model that is not instruction-tuned, a learning rate that is too high or too low, no regularisation, and training data that is not deduplicated.',
      'Search and RAG: vectors only with no keyword matching, searching with the raw question, never checking the answer against its sources, and an index that is never refreshed.',
      'Serving and cost: every request sent to the biggest model, a fixed server count, no per-user rate limits, and a server that waits for the whole batch to finish.',
      'Agents and safety: no memory between sessions, no guardrails, agent code run with no sandbox, and tool errors left unhandled.',
      'New Classical ML and data group: unscaled features, trusting a single train/test split, wrong labels, and never comparing with a simple baseline. Plus windowing in audio, devices that cannot be updated over the air, no fallback path and uncalibrated confidence.',
    ],
    stats: { lessons: 164, topics: 17, labs: 24, glossary: 880 },
  },
  {
    version: '2.5.0',
    date: '2026-11-06',
    title: 'What if…? experiments and the Model radar',
    summary: 'Thirty-one interactive experiments that switch one part of an AI system off and show what breaks, and a dated, sourced page of facts on current models.',
    highlights: [
      'New What if…? section: 31 experiments, each with an on/off switch, an animated line diagram and numbers worked out by tested code. Examples: no KV cache, no embeddings, no attention, no batching, no approval gate, sampling too slowly, data leakage.',
      'Six groups: inside a model, search and RAG, training, serving and cost, agents and safety, and devices, audio and data. Each page links to the lesson that teaches the part and to its sources.',
      'New Model radar: release dates, context windows, list prices, input types and open weights for current models, every row linked to the vendor\'s own page and dated, plus a calculator for what one task costs. It compares facts and ranks nothing.',
      'A weekly check opens a GitHub issue when a new model name shows up in the news feeds or a radar row has not been checked for 90 days, so a person can verify it before it is added.',
    ],
    stats: { lessons: 164, topics: 17, labs: 24, glossary: 880 },
  },
  {
    version: '2.4.0',
    date: '2026-11-06',
    title: 'Interview prep for 16 roles, and how to choose an agent architecture',
    summary: 'Interview questions grouped by job role, a lesson and tool for choosing between agent loops, workflows, graphs and harnesses, and a sourced look at layoff announcements.',
    highlights: [
      'Interview prep now covers 16 roles, from AI app, agentic and ML engineers to AI test, security, responsible AI, data, edge, forward deployed, solutions architect, product, lead and research roles, with 174 new questions and a grouped role picker.',
      'New lesson, Choosing an agent architecture: a side-by-side comparison of a single call, workflow, agent loop, graph, multi-agent setup and agent harness, the same refund bot drawn in each style, and a six-question chooser.',
      'AI and work now has a section on layoff announcements and "AI-washing", using Challenger, Gray and Christmas data from 5 November 2026 and saying what such counts cannot show.',
      'Nine new glossary terms, including agent harness, durable execution and checkpoint.',
      'Select menus no longer overflow narrow phone screens; choosing a path, or arriving from a path card, now scrolls straight to that path.',
    ],
    stats: { lessons: 164, topics: 17, labs: 24, glossary: 880 },
  },
  {
    version: '2.3.0',
    date: '2026-11-01',
    title: 'Daily review, comfort, offline and interview questions',
    summary: 'Four new ways to use the site, five more lessons, and 60 new interview questions.',
    highlights: [
      'Daily review: a “Daily 5” built from the quizzes of lessons you have finished, with spaced repetition, a forgiving private streak and a “Today’s question” card on the homepage. It is saved only in your browser and travels with your progress export.',
      'What should I learn next?: a page that picks one clear next lesson from your goal and what you have finished, with two lighter or more hands-on alternatives and any prerequisites you skipped.',
      'Comfort menu: text size, line spacing, reading width and a calm mode that turns off decorative motion, plus a Listen button that reads a lesson aloud using your device’s own voice.',
      'Offline mode: install Layerwise to your home screen, and lessons you have visited keep working without a connection, demos included. Caches are versioned by release so they are cleaned up when the site updates.',
      '60 new interview questions with worked answers, covering classical ML, deep learning, audio and speech, on-device AI, building with LLMs, MLOps and ML system design, and responsible AI.',
      'Five lessons: how AI finds things in a picture (a pixel-detective game), detection and segmentation, AI and careers, AI and work, and how to read an AI paper.',
      'A wording fix in the anomaly-detection lesson, which now says which standard deviation its z-scores use.',
    ],
    stats: { lessons: 163, topics: 17, labs: 24, glossary: 871 },
  },
  {
    version: '2.2.0',
    date: '2026-11-01',
    title: 'Devices and sound, MLOps, and the long tail',
    summary: '52 new lessons, a Responsible AI path and a devices-and-sound path, and the version history you are reading.',
    highlights: [
      'On-device AI grows from 2 lessons to 8: inside a small device, from PyTorch to the chip, real-time on a budget, a wake-word detector, small language models on device, and shipping to a fleet.',
      'Audio and speech: speech recognition, noise suppression and hearing devices, measuring audio quality, text-to-speech and voice cloning, and voice agents.',
      'MLOps in System design: notebook to production, data pipelines and data quality, batch versus online inference and feature stores, testing and deploying models, monitoring and drift, and ML system-design interviews.',
      'Applied ML: recommenders and ranking, time-series forecasting, anomaly detection, and clustering with dimensionality reduction.',
      'Deep learning: RNNs and LSTMs, self-supervised and transfer learning, autoencoders, VAEs and GANs, encoders and decoders, state-space models and Mamba, and reinforcement learning from scratch.',
      'Builder lessons: structured output in depth, query understanding for RAG, long context or RAG, GraphRAG, text-to-SQL, computer-use agents, UX for AI features, human-in-the-loop design, guardrails, observability for LLM apps, and semantic caching with batch APIs.',
      'Responsible AI: explainability, governance, human oversight, where training data comes from, energy and water, medical and regulated AI, accessibility, and AI rules around the world.',
      'Beginner lessons: a short history of AI, AI around you, how feeds and search decide, and does AI understand; plus maths without fear and a first-toolkit lesson.',
      'Two new learning paths (“I build AI for devices and sound” and “I want to use and build AI responsibly”) and a path-aware set of forward links from older lessons.',
      'A tested interaction pass over every lesson on a phone caught and fixed four runtime warnings, including two on lessons that were already live.',
      'Versioning: tagged releases on GitHub, a CHANGELOG.md, and this changelog page.',
    ],
    stats: { lessons: 158, topics: 17, labs: 24, glossary: 844 },
  },
  {
    version: '2.1.0',
    date: '2026-11-01',
    title: 'Builders, evals and responsible AI',
    summary: '16 builder and expert lessons on agents, evals, responsible AI and deep learning.',
    highlights: [
      'Agents: designing tools for agents, agent memory and context engineering, multi-agent systems, and AI-assisted software development.',
      'Product thinking: when not to use an LLM, choosing and comparing models, and reading real documents (parsing, OCR, tables, multimodal RAG).',
      'Evals: building an eval dataset, and why models make things up.',
      'Responsible AI for builders: fairness, privacy engineering, and alignment with red teaming.',
      'Deep learning: build a tokenizer, a modern LLM architecture tour, scaling laws, and RL post-training (RLHF, verifiable rewards, GRPO), with three new practice labs.',
      'Every lesson has a live interactive, verified sources and videos, a quiz and glossary terms.',
    ],
    stats: { lessons: 106, topics: 17, labs: 21, glossary: 460 },
  },
  {
    version: '2.0.0',
    date: '2026-11-01',
    title: 'Five new topics and a teacher kit',
    summary: 'The curriculum grows from 12 to 17 topics, with 22 new lessons and a kit for teachers.',
    highlights: [
      'Five new topics, each with its own colour: Skills and first projects, Classical ML and data, Deep learning, Responsible AI, and Audio and speech.',
      'Beginner lessons written for school students: three ways a machine learns, computers that decide and plan, what an AI agent is, and four Responsible AI lessons on bias, telling real from fake, privacy and honest use at school.',
      'Python first steps and a spam classifier you train in the browser, with runnable pads and four practice labs.',
      'Classical ML: data preparation, regression, overfitting, trees and forests, gradient boosting, and “is the difference real?”.',
      'Deep learning: neurons with a live playground, training deep networks, backpropagation with a lab, convolutions, and diffusion models.',
      'Audio: how a computer hears, and spectrograms with a live Web Audio tone generator and spectrogram.',
      'A teacher kit: plans for ages 10–12, 13–15 and 16–18, twelve unplugged activity cards, printable worksheets with answer keys, a parents’ guide, and a map against the five AI4K12 big ideas.',
      'A new “I want to build my first model” path, and the beginner and ML-to-modern-AI paths rebuilt around the new lessons.',
    ],
    stats: { lessons: 90, topics: 17, labs: 18, glossary: 326 },
  },
  {
    version: '1.2.0',
    date: '2026-10-30',
    title: 'Teach it your drawings',
    summary: 'A hands-on drawing game, automatic video link checks, and Safari and Firefox fixes.',
    highlights: [
      'A “teach the computer your drawings” activity in the lesson on how a computer learns, using nearest neighbours in the browser.',
      'A weekly check that every linked YouTube video still exists.',
      'Safari and Firefox pass: a date format that made two pages rebuild on iPhones, a phone card layout, and blur effects on older Safari.',
      'iPhone search opens its keyboard on the first tap, and an early tap is remembered.',
      'A one-tap “New to AI? Start with lesson 1” link and compact cards on phones.',
    ],
    stats: { lessons: 68, topics: 12, labs: 13, glossary: 143 },
  },
  {
    version: '1.1.0',
    date: '2026-10-29',
    title: 'Works on phones, with certificates',
    summary: 'The whole site made phone-first, and a completion certificate for each learning path.',
    highlights: [
      'Every page fits a phone screen: wide diagrams scroll at a readable size, step-by-step diagrams stack, and wide tables scroll inside their frame.',
      'Glossary pop-ups open on the first tap; sliders, buttons and form fields are sized for touch, and iOS no longer zooms into fields.',
      'A sticky result bar in four games, and a search palette with a close button on touch screens.',
      'Path completion certificates: finish every lesson in a path, type your name (kept in your browser) and download an image or print to PDF.',
    ],
    stats: { lessons: 68, topics: 12, labs: 13, glossary: 143 },
  },
  {
    version: '1.0.0',
    date: '2026-10-29',
    title: 'Beginner-friendly, with videos',
    summary: 'A beginner path simple enough for school students, regraded learning paths, and YouTube videos on every lesson.',
    highlights: [
      'The “I’m new to AI” path rewritten in short, simple sentences with the grown-up detail folded into optional blocks, plus new lessons on how a computer learns, how computers read words, and AI that sees and hears.',
      'Learning paths regraded into a clear ladder from beginner to expert.',
      'Verified YouTube videos from well-known educators linked from every lesson, and a Learning videos page.',
      'Links to other websites open in a new tab.',
      'A simpler homepage animation in plain words, and a fix for a React warning on lesson pages.',
      'A new lesson on system design for LLM apps.',
    ],
    stats: { lessons: 68, topics: 12, labs: 13, glossary: 143 },
  },
  {
    version: '0.5.0',
    date: '2026-10-29',
    title: 'More news sources',
    summary: 'A tidier header and many more official news feeds.',
    highlights: [
      'The header trimmed to five links.',
      'News now includes GitHub and Microsoft feeds, plus 25 more official sources, and you can search the headlines.',
    ],
    stats: { lessons: 64, topics: 12, labs: 13, glossary: 143 },
  },
  {
    version: '0.4.0',
    date: '2026-10-28',
    title: 'Practice labs, libraries map and news',
    summary: 'Coding labs in the browser, an AI libraries map, a news page that refreshes itself, and a cloud fact-check.',
    highlights: [
      'A Practice hub with 13 in-browser Python coding labs that check your code, and a source link checker.',
      'An AI libraries map with status and licence for agents, RAG, vector stores and evals.',
      'A News page that refreshes by itself, and progress that you can carry between browsers.',
      'Case studies sorted by date, filterable by company, with company logos.',
      'Four new lessons (including the EU AI Act for engineers and evaluating agents), the cloud track fact-checked, newer NVIDIA GPUs and DGX and rack systems, and search over labs, libraries and case studies.',
      'Cards in every set coloured so that neighbours are plainly different.',
    ],
    stats: { lessons: 64, topics: 12, labs: 13, glossary: 143 },
  },
  {
    version: '0.3.0',
    date: '2026-10-27',
    title: 'A calmer homepage and how big companies build it',
    summary: 'The homepage redesigned around one drawing, new lessons on agent frameworks, and engineering case studies.',
    highlights: [
      'The homepage rebuilt around one drawing and calm outlined cards, with solid colours matching the start page.',
      'New lessons on LangChain and LangGraph, MCP in depth, and prompt patterns.',
      'A “How big companies build it” page of engineering write-ups on RAG, agents, serving and evals, and a Further watching page of video courses.',
    ],
    stats: { lessons: 60, topics: 12, labs: 0, glossary: 123 },
  },
  {
    version: '0.2.0',
    date: '2026-10-26',
    title: 'Diagrams, a sandbox and interview prep',
    summary: 'Hairline diagrams everywhere, a sandbox, interview prep for both sides, and teacher plans.',
    highlights: [
      'Hairline line diagrams across the lessons: CPU versus GPU, tokens, the transformer block, quantization, the request lifecycle, and charts for the learning rate and overfitting.',
      'A sandbox with a recorded tool terminal and real Python in the browser.',
      'Interview prep for candidates and interviewers, a progress page and a teachers’ page.',
      '13 new lessons, including how models learn, inside a transformer, classical ML essentials, multimodal models, fine-tuning in practice, and one question all the way through.',
      'Lessons are released under CC BY 4.0 and the code under MIT.',
    ],
    stats: { lessons: 57, topics: 12, labs: 0, glossary: 106 },
  },
  {
    version: '0.1.0',
    date: '2026-10-26',
    title: 'First launch',
    summary: 'Animated AI engineering lessons, games and tools, covering AWS, Azure and Google Cloud, GPUs and local inference.',
    highlights: [
      '44 lessons in 12 topics, from AI basics to GPUs and cloud platforms, each with interactive diagrams.',
      'Five games: Blueprint, Cost Crunch, Fit the Model, Rack and Stack, and Incident Room.',
      'Calculators for cost, model memory, GPUs, break-even and latency budgets.',
      'Learning paths, a placement check, a glossary of 79 terms, a search box and an RSS feed.',
      'Broadened from one cloud to AWS, Azure and Google Cloud side by side, plus GPU infrastructure and local inference.',
    ],
    stats: { lessons: 44, topics: 12, labs: 0, glossary: 79 },
  },
];

export const latestRelease = releases[0];
