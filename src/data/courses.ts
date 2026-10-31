/**
 * Ready-made course plans for teachers and trainers. Each session lists
 * lessons (keys), an activity and a check. The teach page refuses to build if
 * a lesson key does not exist, so plans cannot silently go stale.
 */
export type Session = {
  title: string;
  minutes: number;
  lessons: string[];
  activity: string;
  check: string;
  /** ids of unplugged activity cards (src/data/unplugged.ts) used in this session */
  unplugged?: string[];
};
/** `band` marks a school plan for that age range; plans without it are for adults. */
export type Course = { id: string; title: string; audience: string; length: string; sessions: Session[]; band?: '10-12' | '13-15' | '16-18' };

export const courses: Course[] = [
  {
    id: 'half-day',
    title: 'Half-day workshop: AI for the whole team',
    audience: 'Mixed teams: product, design, engineering and managers. No coding.',
    length: 'About 3.5 hours with breaks',
    sessions: [
      { title: 'What AI is and how a chatbot answers', minutes: 60, lessons: ['start/what-is-ai-in-plain-english', 'start/how-a-chatbot-answers', 'start/one-question-all-the-way-through'], activity: 'Project the next-token demo. Ask the room to predict the next word, then raise the temperature together. Then step through “One question, all the way through” and ask for a guess at the token count before each reveal.', check: 'Lesson quizzes, answered by show of hands.' },
      { title: 'Using AI safely, and the rules', minutes: 60, lessons: ['start/using-ai-without-getting-burned', 'evals/eu-ai-act-for-engineers'], activity: 'In pairs, find an invented answer: ask a chatbot for a citation on a niche topic and verify it. Then read the four risk tiers in the EU AI Act lesson and sort three products the team uses or builds into them, noting what would have to be shown to users or logged. This is a conversation starter, not legal advice.', check: 'Each pair names one habit they will adopt and one product whose tier they would ask a lawyer about.' },
      { title: 'How products use AI', minutes: 50, lessons: ['start/how-apps-use-ai', 'rag-agents/rag-from-scratch'], activity: 'Sketch, on paper, how a support bot would find answers in the company handbook.', check: 'Groups explain their sketch in two minutes.' },
      { title: 'What it costs and what goes wrong', minutes: 50, lessons: ['cost/where-the-tokens-go'], activity: 'Play Incident Room level 1 in small groups and compare which evidence each group opened.', check: 'Groups state the root cause and the fix.' },
    ],
  },
  {
    id: 'six-week',
    title: 'Six-week course: building with LLMs',
    audience: 'Developers and technical students who can read Python.',
    length: 'Six weekly sessions of about 2 to 2.5 hours, plus 2 to 3 hours of reading',
    sessions: [
      { title: 'Week 1. How models work', minutes: 120, lessons: ['start/one-question-all-the-way-through', 'foundations/how-models-learn', 'foundations/tokens-and-embeddings', 'foundations/attention-intuition'], activity: 'Count tokens for the same paragraph in English, code and another language; discuss the cost difference. Then follow one question through the walkthrough and name where the memory (the KV cache) grows. Lab: Find the nearest vector (at /practice/cosine-search/).', check: 'Quizzes for the four lessons.' },
      { title: 'Week 2. Prompting and structured output', minutes: 140, lessons: ['llm/prompting-and-structured-output', 'llm/parameters-and-hyperparameters', 'llm/context-window-and-caching', 'llm/reasoning-models'], activity: 'Write a prompt that extracts fields into JSON, then a validator and retry loop. Run it at two temperatures and say which settings are parameters, hyperparameters and sampling settings. Then take five hard multi-step questions and five simple lookups, answer them with and without thinking, and compare the output tokens and the wait. Labs: Get a valid ticket, or fail clearly (at /practice/structured-output-retry/) and Temperature and top-p, from scratch (at /practice/sampling-temperature/).', check: 'Run the class’s prompts on ten shared examples and compare failure rates, and say which of the ten needed thinking.' },
      { title: 'Week 3. Retrieval', minutes: 120, lessons: ['rag-agents/rag-from-scratch', 'rag-agents/chunking-and-retrieval-quality'], activity: 'Build the 40-line RAG example over a small document set; measure recall at 5 on 20 questions. Lab: Split text into overlapping chunks (at /practice/chunk-overlap/).', check: 'Each student reports recall at 5 and one failure they fixed.' },
      { title: 'Week 4. Evals, prompt patterns and security', minutes: 120, lessons: ['evals/evals-101', 'llm/prompt-patterns-and-optimisation', 'evals/llm-as-judge-pitfalls', 'evals/llm-security'], activity: 'Write a 30-case eval set for last week’s RAG system, including five prompt-injection attempts. Hold ten cases back. Change one thing in the prompt at a time and keep the change only if the score rises on the other twenty and does not fall on the held-out ten. Lab: Build a tiny eval harness (at /practice/eval-harness/).', check: 'Eval pass rate before and after one change, on both the tuning cases and the held-out cases.' },
      { title: 'Week 5. Agents, tools and system design', minutes: 150, lessons: ['rag-agents/agents-and-tool-use', 'rag-agents/the-tools-and-ecosystem', 'rag-agents/langchain-and-langgraph', 'rag-agents/mcp-in-depth', 'rag-agents/choosing-ai-libraries', 'evals/evaluating-agents', 'systems/rag-service-architecture'], activity: 'On paper, draw the support bot from the LangGraph lesson as a graph: the nodes, the edges, one conditional edge, and the point where a person approves a refund. Then play Blueprint level 2 in pairs and defend the design to another pair. Then, as a class, choose a library for the project from the libraries map using the four questions in “Choosing AI libraries”, and write three refund-agent tasks with their outcome checks, including one where it must refuse. Lab: Build a safe agent loop (at /practice/tool-loop/).', check: 'The graph with the approval step marked, the Blueprint score with the written trade-offs, and the three tasks with what each one checks in the database.' },
      { title: 'Week 6. Serving, cost and shipping', minutes: 140, lessons: ['serving/life-of-a-request', 'cost/cost-levers', 'evals/llmops-in-production', 'evals/eu-ai-act-for-engineers'], activity: 'Cost Crunch levels 1 and 2; then present a cost and release plan for the class project, including which EU AI Act tier it falls under and what you would log. Lab: Estimate a monthly model bill (at /practice/cost-estimator/).', check: 'Mock interview: two questions each from the interview bank, scored with the shared rubric.' },
    ],
  },
  {
    id: 'infra-day',
    title: 'One-day workshop: GPUs and serving for platform teams',
    audience: 'Platform, infrastructure and SRE engineers.',
    length: 'One day, about 6 hours',
    sessions: [
      { title: 'GPUs and the memory maths', minutes: 100, lessons: ['infra/gpu-basics', 'infra/reading-a-gpu-spec-sheet', 'llm/parameters-and-hyperparameters', 'serving/kv-cache-and-memory'], activity: 'By hand, work out the weight memory of an 8B model at 16, 8 and 4 bits. Then use the GPU explorer to size an 8B and a 70B model for 16 users. Labs: How much memory does the KV cache need? (at /practice/kv-cache-size/) and Temperature and top-p, from scratch (at /practice/sampling-temperature/).', check: 'Fit the Model levels 2 and 3.' },
      { title: 'Serving at scale', minutes: 90, lessons: ['serving/life-of-a-request', 'serving/inference-optimisation', 'infra/multi-gpu-parallelism-and-interconnect'], activity: 'Rack & Stack levels 1 to 3 in pairs.', check: 'Pairs explain why their cheapest valid choice wins.' },
      { title: 'Running it', minutes: 90, lessons: ['infra/kubernetes-and-autoscaling-for-inference', 'infra/gpu-observability-and-capacity-planning', 'cloud/quotas-capacity-and-regions'], activity: 'Incident Room: the retry storm and the GPU-utilisation incidents.', check: 'Write the alert you would have wanted.' },
      { title: 'Build, rent or buy', minutes: 90, lessons: ['local/self-hosting-vs-api-economics', 'cloud/cloud-ai-service-map'], activity: 'Use the break-even calculator with the team’s real traffic and prices.', check: 'A one-page recommendation with the assumptions stated.' },
    ],
  },
  {
    id: 'ages-10-12',
    band: '10-12',
    title: 'Ages 10 to 12: what AI is, how it learns and how to use it well',
    audience: 'Primary and lower secondary classes, or a club. No computer science background and no coding. One computer to project is enough; the activities need paper only.',
    length: 'Six sessions of 45 minutes',
    sessions: [
      { title: 'Session 1. What counts as AI?', minutes: 45, lessons: ['start/what-is-ai-in-plain-english'], unplugged: ['ai-or-not'], activity: 'Read the lesson in pairs for ten minutes, then run the “AI or not?” card sort. End by agreeing, as a class, a one-sentence test for AI and putting it on the wall.', check: 'Exit ticket: write one thing AI is good at and one thing it is not good at, in your own words.' },
      { title: 'Session 2. Learning from examples', minutes: 45, lessons: ['start/how-computers-learn', 'start/three-ways-machines-learn'], unplugged: ['be-the-classifier'], activity: 'Run “Be the classifier”, then use the fruit-sorting demo in the first lesson on the projector, with the class guessing before each reveal. Name the three ways machines learn from the second lesson and match each to something students have used.', check: 'Pairs explain, in two sentences, why the computer is tested on cards it has not seen.' },
      { title: 'Session 3. When examples are unfair', minutes: 45, lessons: ['responsible/when-examples-are-unfair'], unplugged: ['bias-in-the-data'], activity: 'Run “Bias in the data” with the bird cards, then read the lesson together. Each group lists five cards that would make the bird detector fairer.', check: 'Each student finishes the sentence: “A computer can be unfair because…”.' },
      { title: 'Session 4. AI that sees and hears', minutes: 45, lessons: ['start/ai-that-sees-and-hears'], unplugged: ['pixels-by-numbers'], activity: 'Colour the number grid, then try the photo demo in the lesson. Ask students to find two cases where a computer might misread a picture.', check: 'Pairs explain why a picture is “just numbers” to a computer, using the grid.' },
      { title: 'Session 5. How chatbots read and answer', minutes: 45, lessons: ['start/how-computers-read-words', 'start/how-a-chatbot-answers'], unplugged: ['guess-the-next-word', 'tokens-by-hand'], activity: 'Run “Be the next-word machine” as a whole class. If time allows, cut one sentence into pieces with “Tokens by hand”. Then use the lesson’s chatbot demo to change the temperature and compare.', check: 'Students explain why a chatbot can give two different answers to the same question.' },
      { title: 'Session 6. Using AI without getting burned', minutes: 45, lessons: ['start/using-ai-without-getting-burned', 'responsible/real-or-fake'], unplugged: ['spot-the-fake-source'], activity: 'Run “Spot the fake source”, then read the habits in the first lesson. Each student drafts three rules for using AI for homework and compares them with the school’s own rules. Send the family guide home.', check: 'A personal agreement of three rules, kept by the student. Nothing needs to be collected.' },
    ],
  },
  {
    id: 'ages-13-15',
    band: '13-15',
    title: 'Ages 13 to 15: training, testing, trees, networks and fakes',
    audience: 'Lower and middle secondary. Students who can follow simple logic and arithmetic. Sessions 1 to 6 need no computers; the optional session 7 needs one per pair.',
    length: 'Six sessions of 50 minutes, plus an optional seventh with computers',
    sessions: [
      { title: 'Session 1. Training and testing', minutes: 50, lessons: ['start/how-computers-learn', 'start/three-ways-machines-learn'], unplugged: ['be-the-classifier', 'reward-learning'], activity: 'Run “Be the classifier” and record training and test scores for each group. Then run the bead game for ten rounds and compare how supervised learning and learning from rewards differ.', check: 'Each student explains why a test score tells you more than a training score.' },
      { title: 'Session 2. Decisions as trees', minutes: 50, lessons: ['start/computers-that-decide-and-plan'], unplugged: ['twenty-questions-tree'], activity: 'Play 20 questions, then draw the tree of questions. Swap trees with another pair and test them. Ask which first question splits the list best.', check: 'A tree that finds every animal on the list in at most 4 questions, or a written reason why it cannot.' },
      { title: 'Session 3. Inside a neural network', minutes: 50, lessons: ['deep-learning/inside-a-neural-network'], unplugged: ['human-neural-network'], activity: 'Run “Human neural network” with six students while the rest record the table. Change one number and compare the tables. Then read the lesson for the picture of a real network.', check: 'Students predict what happens to the table when one stated number changes, before running it.' },
      { title: 'Session 4. Words, tokens and prompts', minutes: 50, lessons: ['start/how-computers-read-words', 'start/how-a-chatbot-answers'], unplugged: ['tokens-by-hand', 'draw-from-the-prompt'], activity: 'Run “Tokens by hand”, then “Draw from the prompt”. Use the chatbot demo to show temperature.', check: 'Students rewrite one vague prompt so that the drawing partner would get it right the first time.' },
      { title: 'Session 5. Fairness and fakes', minutes: 50, lessons: ['responsible/when-examples-are-unfair', 'responsible/real-or-fake'], unplugged: ['bias-in-the-data', 'spot-the-fake-source'], activity: 'Run “Bias in the data”, then “Spot the fake source”. Compare how the two activities ask for different checks: one asks who chose the examples, the other where the content came from.', check: 'Each student writes three checks they would use before sharing something surprising.' },
      { title: 'Session 6. AI in your life and your school', minutes: 50, lessons: ['responsible/ai-and-your-private-life', 'responsible/ai-and-school', 'start/using-ai-without-getting-burned'], activity: 'In groups, draft a one-page guide for the school: what AI help is fine for homework, what is not, and why. Compare the drafts, then compare with the school’s actual policy if there is one.', check: 'A group guide with at least one rule about personal information and one about checking facts.' },
      { title: 'Session 7 (optional, with computers). Make a tiny model', minutes: 60, lessons: ['skills/python-first-steps', 'skills/your-first-model'], activity: 'Pairs follow the Python first-steps lesson in the browser, then train the small model in the second lesson. They test it on examples it has not seen and report the score.', check: 'Each pair reports one example the model got wrong and one idea to fix it.' },
    ],
  },
  {
    id: 'ages-16-18',
    band: '16-18',
    title: 'Ages 16 to 18: data, models, ethics and your first model',
    audience: 'Upper secondary or sixth form. Comfortable with percentages and simple graphs; some Python helps for sessions 3 to 5, but is not required for the rest.',
    length: 'Six sessions of 60 minutes, plus an optional seventh',
    sessions: [
      { title: 'Session 1. From rules to learning', minutes: 60, lessons: ['foundations/ml-to-ai-timeline', 'start/three-ways-machines-learn'], unplugged: ['be-the-classifier', 'reward-learning'], activity: 'Run “Be the classifier”, but add the rule-breaker card from the teacher notes and ask what a model should do about one mislabelled example. Then run the bead game and discuss the three kinds of learning.', check: 'Each student names which kind of learning (examples with labels, finding groups, or rewards) fits three given problems, and says why.' },
      { title: 'Session 2. Data comes first', minutes: 60, lessons: ['ml/getting-data-ready', 'ml/overfitting-and-bias-variance'], unplugged: ['spam-by-tally'], activity: 'Run “Spam filter by tally” and count the mistakes on the test messages. Then discuss why twelve training messages and five test messages cannot tell you how good the filter is.', check: 'Students calculate accuracy, and the share of real messages wrongly caught, on the five test messages, and say which number they would report.' },
      { title: 'Session 3. A first model in code', minutes: 60, lessons: ['skills/python-first-steps', 'skills/your-first-model'], activity: 'With computers, follow the two lessons and train a first model. Hold back a test set before training and report the score on it.', check: 'A short note with the training score, the test score, and one reason the two differ.' },
      { title: 'Session 4. Regression, neural networks and vision', minutes: 60, lessons: ['ml/linear-and-logistic-regression', 'deep-learning/inside-a-neural-network', 'deep-learning/how-computers-see'], unplugged: ['human-neural-network', 'pixels-by-numbers'], activity: 'Run “Human neural network” and change two numbers rather than one, then ask which change has more effect. Then run “Pixels by numbers” and link edge-finding to the first stages of a vision network.', check: 'Students explain, with the human network as the example, what training changes in a model.' },
      { title: 'Session 5. Language models and agents', minutes: 60, lessons: ['foundations/tokens-and-embeddings', 'start/what-is-an-ai-agent', 'llm/prompting-and-structured-output'], unplugged: ['tokens-by-hand', 'draw-from-the-prompt'], activity: 'Run “Tokens by hand” and “Draw from the prompt”. Then read how an agent differs from a chatbot, and write a prompt that asks for output in a fixed format.', check: 'A prompt that asks for a fixed format, with two example inputs and the output a correct answer would give.' },
      { title: 'Session 6. Fairness, deepfakes and school policy', minutes: 60, lessons: ['responsible/when-examples-are-unfair', 'responsible/real-or-fake', 'responsible/ai-and-school'], unplugged: ['bias-in-the-data', 'spot-the-fake-source'], activity: 'Hold a structured debate: “Our school should use AI to flag students who may be struggling.” Assign for and against positions at random, and have each side use the bias-in-the-data activity as evidence. Careers are not covered by a Layerwise lesson yet; invite a speaker or use the school’s careers service.', check: 'Each student writes a one-paragraph position that names a benefit, a harm, and who is accountable if the system is wrong.' },
      { title: 'Session 7 (optional). Audio and the sensors around you', minutes: 60, lessons: ['audio/how-a-computer-hears'], activity: 'Read the lesson in groups and record a short sound on a phone to talk through what a computer is given. Compare with the number grid from “Pixels by numbers” and write down what is similar.', check: 'A paragraph that explains how a sound becomes numbers, using the pixel grid as the comparison.' },
    ],
  },
];
