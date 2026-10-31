/**
 * A map from the AI4K12 "Five Big Ideas in AI" to Layerwise lessons and unplugged activities.
 *
 * Sources, read on 2026-11-01: https://ai4k12.org/ (the five big-idea pages) and the draft
 * progression charts linked from them. The charts are working drafts for K-2, 3-5, 6-8 and
 * 9-12. The mapping is ours: Layerwise lessons were not written against the framework, AI4K12
 * has not reviewed or endorsed it, and a lesson is listed for a band when its content fits the
 * chart's concepts for that band, not because it covers every item in them.
 *
 * A test checks that every lesson key and activity id exists.
 */
export type GradeBand = '3-5' | '6-8' | '9-12';
export const gradeBands: { id: GradeBand; label: string; ages: string }[] = [
  { id: '3-5', label: 'Grades 3-5', ages: 'about 8 to 11' },
  { id: '6-8', label: 'Grades 6-8', ages: 'about 11 to 14' },
  { id: '9-12', label: 'Grades 9-12', ages: 'about 14 to 18' },
];

export type BigIdea = {
  n: 1 | 2 | 3 | 4 | 5;
  name: string;
  /** a short paraphrase of how AI4K12 states the idea */
  idea: string;
  url: string;
  /** concept names from the draft progression chart, with their chart codes */
  concepts: string;
  bands: Record<GradeBand, { lessons: string[]; activities: string[] }>;
  /** an honest account of what is not covered */
  gaps: string;
};

export const bigIdeas: BigIdea[] = [
  {
    n: 1,
    name: 'Perception',
    idea: 'Computers perceive the world using sensors, and perception is extracting meaning from sensory signals.',
    url: 'https://ai4k12.org/big-idea-1-overview/',
    concepts: 'Sensing (1-A: living things, computer sensors, digital encoding); processing (1-B: sensing versus perception, feature extraction, abstraction pipeline, scenes); domain knowledge (1-C).',
    bands: {
      '3-5': { lessons: ['start/ai-that-sees-and-hears'], activities: ['pixels-by-numbers', 'ai-or-not'] },
      '6-8': { lessons: ['start/ai-that-sees-and-hears'], activities: ['pixels-by-numbers'] },
      '9-12': { lessons: ['deep-learning/how-computers-see', 'audio/how-a-computer-hears'], activities: [] },
    },
    gaps: 'The convolutional-network lesson is intermediate, so it is listed for grades 9-12 only. Sensors beyond cameras and microphones (radar, lidar, GPS, accelerometers), how humans and animals sense, and the abstraction pipeline for speech from waveform to sentence are only touched. Sensing versus perception is raised by the “AI or not?” card sort rather than taught in a lesson.',
  },
  {
    n: 2,
    name: 'Representation and Reasoning',
    idea: 'Agents keep representations of the world and use them for reasoning; reasoning algorithms work on data structures.',
    url: 'https://ai4k12.org/big-idea-2-overview/',
    concepts: 'Representation (2-A: abstraction, symbolic, trees and graphs, feature vectors); search (2-B); reasoning (2-C).',
    bands: {
      '3-5': { lessons: ['start/computers-that-decide-and-plan'], activities: ['twenty-questions-tree'] },
      '6-8': { lessons: ['start/computers-that-decide-and-plan', 'start/how-computers-read-words', 'start/what-is-an-ai-agent'], activities: ['twenty-questions-tree', 'tokens-by-hand'] },
      '9-12': { lessons: ['ml/decision-trees-and-random-forests', 'foundations/tokens-and-embeddings'], activities: [] },
    },
    gaps: 'The weakest area, though not empty: rules, 20-questions trees and game look-ahead search (a stick game) are in “Computers that decide and plan”, and word embeddings are in the reading-words lesson. Maps, knowledge graphs and schemas, symbolic logic and syllogisms, and route or maze search are not taught.',
  },
  {
    n: 3,
    name: 'Learning',
    idea: 'Computers can learn from data. Machine learning finds patterns in data, and needs a great deal of it, usually supplied by people.',
    url: 'https://ai4k12.org/big-idea-3-overview/',
    concepts: 'Nature of learning (3-A: supervised learning, training a classifier, decision trees, reinforcement learning); neural networks (3-B); datasets (3-C).',
    bands: {
      '3-5': { lessons: ['start/what-is-ai-in-plain-english', 'start/how-computers-learn'], activities: ['be-the-classifier', 'bias-in-the-data'] },
      '6-8': { lessons: ['start/three-ways-machines-learn', 'deep-learning/inside-a-neural-network', 'start/how-computers-learn'], activities: ['be-the-classifier', 'reward-learning', 'human-neural-network'] },
      '9-12': { lessons: ['foundations/how-models-learn', 'ml/linear-and-logistic-regression', 'ml/getting-data-ready', 'ml/overfitting-and-bias-variance', 'skills/your-first-model'], activities: ['spam-by-tally', 'human-neural-network'] },
    },
    gaps: 'The strongest area. Unsupervised learning and learning from rewards each get one section in “Three ways a machine can learn”, with no deeper beginner lesson. Labels are checked in “Getting data ready”, but who labels data, and how, is not taught as a topic.',
  },
  {
    n: 4,
    name: 'Natural Interaction',
    idea: 'Agents need many kinds of knowledge to interact naturally with people: language, expressions and emotions, culture and social convention.',
    url: 'https://ai4k12.org/big-idea-4-natural-interaction/',
    concepts: 'Natural language (4-A: understanding, ambiguity, speech, intelligent assistants); commonsense reasoning (4-B); affective computing (4-C); philosophy of mind (4-D).',
    bands: {
      '3-5': { lessons: ['start/how-a-chatbot-answers'], activities: ['guess-the-next-word', 'draw-from-the-prompt'] },
      '6-8': { lessons: ['start/how-a-chatbot-answers', 'start/how-computers-read-words'], activities: ['guess-the-next-word', 'tokens-by-hand', 'draw-from-the-prompt'] },
      '9-12': { lessons: ['foundations/tokens-and-embeddings', 'audio/how-a-computer-hears'], activities: ['tokens-by-hand'] },
    },
    gaps: 'Chatbots and speech are well covered. Ambiguity in language, commonsense reasoning, emotion recognition and its limits, and questions such as whether a machine understands are not taught directly.',
  },
  {
    n: 5,
    name: 'Societal Impact',
    idea: 'AI can affect society for good and ill, and the harms (such as bias from unrepresentative data) deserve discussion and ethical criteria.',
    url: 'https://ai4k12.org/big-idea-5-societal-impact/',
    concepts: 'Ethical AI (5-A: who is affected, fairness and transparency, model cards); AI and culture (5-B, including deepfakes); AI and the economy (5-C); AI for social good (5-D).',
    bands: {
      '3-5': { lessons: ['start/using-ai-without-getting-burned', 'responsible/when-examples-are-unfair'], activities: ['bias-in-the-data', 'spot-the-fake-source'] },
      '6-8': { lessons: ['responsible/when-examples-are-unfair', 'responsible/real-or-fake', 'responsible/ai-and-your-private-life', 'responsible/ai-and-school'], activities: ['bias-in-the-data', 'spot-the-fake-source'] },
      '9-12': { lessons: ['responsible/ai-and-school', 'responsible/real-or-fake', 'evals/eu-ai-act-for-engineers'], activities: ['bias-in-the-data', 'spot-the-fake-source'] },
    },
    gaps: 'Fairness, fakes, privacy and school use are covered. How AI changes jobs, creating a model card, and AI for social good are not taught in lessons yet. The EU AI Act lesson is written for engineers, not for school classes.',
  },
];
