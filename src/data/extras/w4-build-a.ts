import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "build-a" batch. */
export const extrasW4BuildA: Record<string, Extra> = {
  'llm/structured-output-in-depth': {
    takeaways: [
      'A schema guarantees shape (keys, types, allowed values), never truth. Validate in your own code and add checks the schema cannot express.',
      'Constrained decoding sets the probability of every token that cannot lead to a valid output to zero and rescales the rest. It works on characters, through tokens.',
      'Providers accept different subsets of JSON Schema (optional fields, numeric bounds, string lengths, recursion). Test the exact schema on the exact provider.',
      'Truncation at the token limit and refusals are separate failure paths: check the stop reason before parsing. Put reasoning before the answer and offer an "unknown" value.',
    ],
    prereq: ['llm/prompting-and-structured-output'],
    quiz: [
      { q: 'At one step the model puts 30%, 20% and 14% on three tokens the schema allows and 36% on tokens it blocks. After the mask and rescaling, what probability does the 20% token get?', options: ['20%', '31.3%', '36%', '55.6%'], answer: 1, why: 'The allowed mass is 30 + 20 + 14 = 64. The 20% token becomes 20 / 64, about 31.3%. The odds between allowed tokens do not change.' },
      { q: 'JSON mode is on, and the reply is {"category": "Billing", "urgency": 6}. What does JSON mode promise here?', options: ['That the reply parses as JSON, nothing more', 'That the category is one of your three values', 'That the urgency is between 1 and 5', 'That the reply is correct'], answer: 0, why: 'JSON mode only ensures valid syntax. Wrong casing, an out-of-range number or an invented key all still pass; only a schema-constrained mode rejects them.' },
      { q: 'You need an urgency from 1 to 5. Which design works across providers whose docs differ on numeric bounds?', options: ['An integer with minimum 1 and maximum 5, and trust it', 'A free string, parsed later', 'An enum of 1, 2, 3, 4, 5, plus validation in your code', 'No field at all'], answer: 2, why: 'Some providers do not support numeric bounds or may loosen them. An enum is enforced by the mask, and your own validation covers the rest.' },
      { q: 'A structured reply will not parse and the stop reason is max_tokens. What is the right first step?', options: ['Retry with the same limit', 'Switch to JSON mode', 'Parse the first half and ignore the rest', 'Treat it as truncation: raise the limit or shorten the schema, and never parse the cut-off text'], answer: 3, why: 'The mask cannot make an unfinished object valid. A cut-off reply is a budget problem, so check the stop reason before parsing.' },
    ],
  },
  'rag-agents/query-understanding-for-rag': {
    takeaways: [
      'People write questions, not search queries: vocabulary differs from the pages, follow-ups need the chat history, and compound questions need several passages.',
      'A standalone rewrite fixes missing context. Multi-query raises recall for vague questions and drifts when paraphrases stray. Splitting suits multi-fact questions. HyDE searches with an imagined answer and invents details when the model does not know your domain.',
      'Every technique adds a model call before the first search. Keep the original query, log each rewrite, and compare against the raw baseline at the same k.',
      'Routing chooses the index, filter or no retrieval at all. It is a classification problem, so evaluate it as one.',
    ],
    prereq: ['rag-agents/rag-from-scratch', 'rag-agents/chunking-and-retrieval-quality'],
    quiz: [
      { q: 'In a chat about e-bike rides the person asks "What about the battery?" and search returns scooter and phone-battery pages. What is the most direct fix?', options: ['Use a bigger embedding model only', 'Rewrite the message into a standalone question using the chat history', 'Return more passages', 'Remove the word "battery"'], answer: 1, why: 'The message is meaningless alone. Using the history to write "e-bike battery range and who swaps it" restores the missing context.' },
      { q: 'A person asks whether a membership is worth it for twenty rides a month. The answer needs the membership price and the pay-as-you-go price, which sit in two passages. Which technique targets this?', options: ['Splitting into sub-questions, one search each', 'Rewriting into a tidier sentence', 'Lowering the temperature', 'HyDE'], answer: 0, why: 'Two facts in two passages need two searches. A tidier rewrite changes the wording but still asks one question.' },
      { q: 'HyDE searches with a model-written hypothetical answer. When is it most likely to hurt?', options: ['When the question is long', 'When the corpus is large', 'When the model knows nothing about the new product, so the answer is full of invented details', 'When the index uses embeddings'], answer: 2, why: 'The hypothetical answer is described as unreal and possibly containing false details. Invented specifics pull the search towards pages that match the inventions.' },
      { q: 'Three paraphrases plus the original are searched and the four ranked lists are merged by reciprocal rank fusion. How many searches and extra model calls is that?', options: ['1 search, 1 model call', '3 searches, 3 model calls', '4 searches, 4 model calls', '4 searches, 1 model call to write the paraphrases'], answer: 3, why: 'One call writes the paraphrases, then each of the four queries is searched. Cost scales with searches, latency with the model call.' },
    ],
  },
};
