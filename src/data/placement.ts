import type { PathId } from './paths';

export type PlacementQuestion = {
  q: string;
  options: string[];
  /** Index of the correct option. The last option is always “I don’t know”. */
  answer: number;
  why: string;
};

const IDK = 'I don’t know yet';

export const placement: PlacementQuestion[] = [
  {
    q: 'In AI, what is a token?',
    options: ['A security credential for an API', 'A small piece of text, such as a word or part of a word', 'A unit of money paid to the model vendor', IDK],
    answer: 1,
    why: 'Models read and write tokens, and pricing and limits are counted in them.',
  },
  {
    q: 'You raise the temperature setting. What happens?',
    options: ['Answers become more varied and less predictable', 'The model runs faster', 'The model becomes more accurate', IDK],
    answer: 0,
    why: 'Temperature controls how adventurous the choice of next token is.',
  },
  {
    q: 'What does retrieval-augmented generation (RAG) do?',
    options: ['Trains the model on your documents', 'Compresses the model so it runs on a phone', 'Finds relevant passages and puts them in the prompt so the model answers from them', IDK],
    answer: 2,
    why: 'RAG supplies facts per request instead of changing the model.',
  },
  {
    q: 'What is an eval?',
    options: ['A repeatable test of model behaviour on a set of inputs', 'A setting that makes the model answer faster', 'A kind of fine-tuning', IDK],
    answer: 0,
    why: 'Evals are how you know whether a change helped or hurt.',
  },
  {
    q: 'When serving a model, what grows with both the number of concurrent users and the context length?',
    options: ['The size of the weights', 'The vocabulary size', 'The KV cache', IDK],
    answer: 2,
    why: 'Every token of every sequence adds keys and values to the cache.',
  },
  {
    q: 'In a RAG system where users may only see some documents, where should access be enforced?',
    options: ['In the prompt, by telling the model what not to reveal', 'At retrieval, before passages reach the model', 'In the response cache only', IDK],
    answer: 1,
    why: 'A prompt instruction is not access control. The model should never see text the user may not read.',
  },
];

/** 0-2 correct starts from the beginning, 3-4 builds, 5-6 runs production systems. */
export function recommend(correct: number): PathId {
  if (correct <= 2) return 'newcomer';
  if (correct <= 4) return 'builder';
  return 'practitioner';
}

export function score(answers: (number | null)[]): number {
  return answers.reduce<number>((n, a, i) => n + (a === placement[i]?.answer ? 1 : 0), 0);
}
