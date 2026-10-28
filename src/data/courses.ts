/**
 * Ready-made course plans for teachers and trainers. Each session lists
 * lessons (keys), an activity and a check. The teach page refuses to build if
 * a lesson key does not exist, so plans cannot silently go stale.
 */
export type Session = { title: string; minutes: number; lessons: string[]; activity: string; check: string };
export type Course = { id: string; title: string; audience: string; length: string; sessions: Session[] };

export const courses: Course[] = [
  {
    id: 'half-day',
    title: 'Half-day workshop: AI for the whole team',
    audience: 'Mixed teams: product, design, engineering and managers. No coding.',
    length: 'About 3.5 hours with breaks',
    sessions: [
      { title: 'What AI is and how a chatbot answers', minutes: 60, lessons: ['start/what-is-ai-in-plain-english', 'start/how-a-chatbot-answers', 'start/one-question-all-the-way-through'], activity: 'Project the next-token demo. Ask the room to predict the next word, then raise the temperature together. Then step through “One question, all the way through” and ask for a guess at the token count before each reveal.', check: 'Lesson quizzes, answered by show of hands.' },
      { title: 'Using AI safely', minutes: 40, lessons: ['start/using-ai-without-getting-burned'], activity: 'In pairs, find an invented answer: ask a chatbot for a citation on a niche topic and verify it.', check: 'Each pair names one habit they will adopt.' },
      { title: 'How products use AI', minutes: 50, lessons: ['start/how-apps-use-ai', 'rag-agents/rag-from-scratch'], activity: 'Sketch, on paper, how a support bot would find answers in the company handbook.', check: 'Groups explain their sketch in two minutes.' },
      { title: 'What it costs and what goes wrong', minutes: 50, lessons: ['cost/where-the-tokens-go'], activity: 'Play Incident Room level 1 in small groups and compare which evidence each group opened.', check: 'Groups state the root cause and the fix.' },
    ],
  },
  {
    id: 'six-week',
    title: 'Six-week course: building with LLMs',
    audience: 'Developers and technical students who can read Python.',
    length: 'Six weekly sessions of about 2 hours, plus 2 to 3 hours of reading',
    sessions: [
      { title: 'Week 1. How models work', minutes: 120, lessons: ['start/one-question-all-the-way-through', 'foundations/how-models-learn', 'foundations/tokens-and-embeddings', 'foundations/attention-intuition'], activity: 'Count tokens for the same paragraph in English, code and another language; discuss the cost difference. Then follow one question through the walkthrough and name where the memory (the KV cache) grows.', check: 'Quizzes for the four lessons.' },
      { title: 'Week 2. Prompting and structured output', minutes: 120, lessons: ['llm/prompting-and-structured-output', 'llm/parameters-and-hyperparameters', 'llm/context-window-and-caching'], activity: 'Write a prompt that extracts fields into JSON, then a validator and retry loop. Run it at two temperatures and say which settings are parameters, hyperparameters and sampling settings.', check: 'Run the class’s prompts on ten shared examples and compare failure rates.' },
      { title: 'Week 3. Retrieval', minutes: 120, lessons: ['rag-agents/rag-from-scratch', 'rag-agents/chunking-and-retrieval-quality'], activity: 'Build the 40-line RAG example over a small document set; measure recall at 5 on 20 questions.', check: 'Each student reports recall at 5 and one failure they fixed.' },
      { title: 'Week 4. Evals, prompt patterns and security', minutes: 120, lessons: ['evals/evals-101', 'llm/prompt-patterns-and-optimisation', 'evals/llm-as-judge-pitfalls', 'evals/llm-security'], activity: 'Write a 30-case eval set for last week’s RAG system, including five prompt-injection attempts. Hold ten cases back. Change one thing in the prompt at a time and keep the change only if the score rises on the other twenty and does not fall on the held-out ten.', check: 'Eval pass rate before and after one change, on both the tuning cases and the held-out cases.' },
      { title: 'Week 5. Agents, tools and system design', minutes: 120, lessons: ['rag-agents/agents-and-tool-use', 'rag-agents/the-tools-and-ecosystem', 'rag-agents/langchain-and-langgraph', 'rag-agents/mcp-in-depth', 'systems/rag-service-architecture'], activity: 'On paper, draw the support bot from the LangGraph lesson as a graph: the nodes, the edges, one conditional edge, and the point where a person approves a refund. Then play Blueprint level 2 in pairs and defend the design to another pair.', check: 'The graph with the approval step marked, and the Blueprint score with the written trade-offs.' },
      { title: 'Week 6. Serving, cost and shipping', minutes: 120, lessons: ['serving/life-of-a-request', 'cost/cost-levers', 'evals/llmops-in-production'], activity: 'Cost Crunch levels 1 and 2; then present a cost and release plan for the class project.', check: 'Mock interview: two questions each from the interview bank, scored with the shared rubric.' },
    ],
  },
  {
    id: 'infra-day',
    title: 'One-day workshop: GPUs and serving for platform teams',
    audience: 'Platform, infrastructure and SRE engineers.',
    length: 'One day, about 6 hours',
    sessions: [
      { title: 'GPUs and the memory maths', minutes: 100, lessons: ['infra/gpu-basics', 'infra/reading-a-gpu-spec-sheet', 'llm/parameters-and-hyperparameters', 'serving/kv-cache-and-memory'], activity: 'By hand, work out the weight memory of an 8B model at 16, 8 and 4 bits. Then use the GPU explorer to size an 8B and a 70B model for 16 users.', check: 'Fit the Model levels 2 and 3.' },
      { title: 'Serving at scale', minutes: 90, lessons: ['serving/life-of-a-request', 'serving/inference-optimisation', 'infra/multi-gpu-parallelism-and-interconnect'], activity: 'Rack & Stack levels 1 to 3 in pairs.', check: 'Pairs explain why their cheapest valid choice wins.' },
      { title: 'Running it', minutes: 90, lessons: ['infra/kubernetes-and-autoscaling-for-inference', 'infra/gpu-observability-and-capacity-planning', 'cloud/quotas-capacity-and-regions'], activity: 'Incident Room: the retry storm and the GPU-utilisation incidents.', check: 'Write the alert you would have wanted.' },
      { title: 'Build, rent or buy', minutes: 90, lessons: ['local/self-hosting-vs-api-economics', 'cloud/cloud-ai-service-map'], activity: 'Use the break-even calculator with the team’s real traffic and prices.', check: 'A one-page recommendation with the assumptions stated.' },
    ],
  },
];
