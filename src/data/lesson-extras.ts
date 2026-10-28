/**
 * Per-lesson extras kept out of the MDX so they can be validated together:
 * summary takeaways, prerequisites, related games and tools, and a short quiz.
 * Keys are "<track>/<slug>".
 */

import { extrasCloud } from './extras/cloud';
import { extrasLocal } from './extras/local';
import { extrasInfra } from './extras/infra';
import { extrasCore } from './extras/core';
import { extrasRetrievalServing } from './extras/retrieval-serving';
import { extrasOps } from './extras/ops';
import { extrasModels } from './extras/models';
import { extrasEcosystem } from './extras/ecosystem';
import { extras_frameworks } from './extras/frameworks';
import { extras_mcp } from './extras/mcp';
import { extras_promptpatterns } from './extras/promptpatterns';
import { extras_libraries } from './extras/libraries';
import { extras_reasoning } from './extras/reasoning';
import { extras_agenteval } from './extras/agenteval';
import { extras_euai } from './extras/euai';

export type QuizItem = {
  q: string;
  options: string[];
  /** Index of the correct option in `options` as written (the UI shuffles). */
  answer: number;
  why: string;
};

export type Extra = {
  takeaways: string[];
  prereq?: string[];
  play?: { label: string; href: string }[];
  quiz: QuizItem[];
};

const FIT = { label: 'Play Fit the Model', href: '/play/fit-the-model/' };
const CRUNCH = { label: 'Play Cost Crunch', href: '/play/cost-crunch/' };
const BLUEPRINT = { label: 'Play Blueprint', href: '/play/blueprint/' };
const INCIDENT = { label: 'Play Incident Room', href: '/play/incident-room/' };

const baseExtras: Record<string, Extra> = {
  'start/what-is-ai-in-plain-english': {
    takeaways: [
      'Machine learning means the computer learns the rules from examples, instead of people writing them.',
      'The terms nest: AI, machine learning, deep learning, generative AI, large language models. Each is a special case of the one before.',
      'A model is a large formula with adjustable numbers. Training sets them; inference is using them.',
      'A chatbot model predicts the next piece of text, so it can be fluent and wrong at the same time.',
    ],
    quiz: [
      { q: 'A spam filter that learns from thousands of emails people marked as spam is an example of…', options: ['Hand-written rules', 'Machine learning', 'A database lookup', 'A large language model'], answer: 1, why: 'Nobody wrote the rules; the program found the patterns in labelled examples. That is machine learning.' },
      { q: 'Which statement is true?', options: ['Every machine learning model is a large language model', 'Every large language model is a machine learning model', 'Deep learning is a kind of rule-based system', 'Generative AI is a kind of search engine'], answer: 1, why: 'The ideas nest. Large language models sit inside generative AI, deep learning and machine learning, but not the other way round.' },
      { q: 'What does “inference” mean?', options: ['Training a model on new data', 'Using a trained model to produce an output', 'Collecting the training data', 'Fixing a model’s mistakes'], answer: 1, why: 'Training builds the model. Inference is every use of it afterwards, such as answering a chat message.' },
      { q: 'Spammers change their wording and your learned spam filter starts missing messages. What is the fix?', options: ['Rewrite its rules by hand every time', 'Wait until it forgets the old examples', 'Show it new examples of the new tactics', 'Replace it with a database lookup'], answer: 2, why: 'A learned system adapts when you show it new examples. Hand-written rules are brittle and never finished.' },
    ],
  },
  'start/how-a-chatbot-answers': {
    takeaways: [
      'A chatbot writes its answer one token at a time, by choosing from probabilities for what comes next.',
      'Choosing involves chance, so the same question can get different answers. Temperature controls how adventurous the choice is.',
      'The model produces plausible text, not checked facts. That is why it can hallucinate.',
      'It only sees the text in its context window. Anything else must be pasted back in.',
    ],
    prereq: ['start/what-is-ai-in-plain-english'],
    quiz: [
      { q: 'Why can a chatbot give different answers to the same question?', options: ['It looks up a different source each time', 'Choosing the next word involves a weighted chance', 'It forgets the question', 'The internet changes between asks'], answer: 1, why: 'Each token is chosen from a probability distribution, so repeated runs can differ.' },
      { q: 'You need precise, repeatable output. Which temperature suits best?', options: ['High', 'Low', 'It makes no difference', 'Zero makes the model refuse'], answer: 1, why: 'Low temperature sticks to the most likely token, which is what you want for precision.' },
      { q: 'A model gives you a perfect-looking citation. What is the right response?', options: ['Trust it, because it is so specific', 'Check that the source exists and says that', 'Ask the model to confirm it and trust the answer', 'Lower the temperature and trust it'], answer: 1, why: 'Invented citations are the classic hallucination. Only checking the source itself settles it.' },
      { q: 'You open a new chat and ask about something you discussed with the same chatbot last week. It has no idea. Why?', options: ['Its temperature was set too high', 'It deleted the old chat to save space', 'It cannot read dates', 'It only sees the text in front of it, and the earlier chat is outside its context window unless the product pastes it back in'], answer: 3, why: 'The model sees only the current conversation. Anything outside the context window, including an earlier chat, is simply not there.' },
    ],
  },
  'start/using-ai-without-getting-burned': {
    takeaways: [
      'Treat output as a draft from a fast, well-read intern who sometimes bluffs.',
      'Verify what matters, and give the model the facts instead of asking it to recall them.',
      'Do not paste private data into tools your organisation has not approved.',
      'Saving prompts that work, and testing them on varied examples, is the start of engineering with AI.',
    ],
    prereq: ['start/how-a-chatbot-answers'],
    quiz: [
      { q: 'Which is the safest use?', options: ['Pasting a customer’s full record into an unapproved tool', 'Asking a model to recall an exact legal case number from memory', 'Summarising a document you can skim to confirm', 'Publishing its answer without review'], answer: 2, why: 'You can check a summary against the source. The other options risk privacy or invented facts.' },
      { q: 'You ask the same factual question twice and get different facts. What does that suggest?', options: ['Both answers are fine', 'At least one is wrong, so verify', 'The model is being creative', 'Temperature is zero'], answer: 1, why: 'Facts should not vary. Disagreement is a sign that the model is guessing.' },
      { q: 'What gets the most useful first draft?', options: ['A one-word prompt', 'Describing the audience, format and length, with an example', 'Asking it to be perfect', 'Asking for the longest possible answer'], answer: 1, why: 'Specific context and an example beat vague requests every time.' },
      { q: 'Your question contains a mistaken assumption. What does the lesson say a chatbot tends to do?', options: ['Always correct you', 'Go along with the false premise, so ask neutrally or ask it to challenge your assumption', 'Refuse to answer', 'Lower its own temperature'], answer: 1, why: 'Models tend to agree with a false premise in the question. Asking neutrally, or asking it to challenge your assumption, gives you a better chance of catching the mistake.' },
    ],
  },

  'foundations/ml-to-ai-timeline': {
    takeaways: [
      'Four steps: classical machine learning, deep learning, transformers with pretraining, and the application era.',
      'Effort moved from features and training to prompts, retrieval, evals and cost control.',
      'Cost moved from one-off training runs to per-token inference, which recurs for as long as the feature runs.',
      'Classical ML skills, such as data quality, honest evaluation and shift, still matter most.',
    ],
    prereq: ['start/what-is-ai-in-plain-english'],
    quiz: [
      { q: 'What changed most about where cost lives?', options: ['From inference to training', 'From training runs to per-request token costs', 'Costs disappeared', 'From data to hardware only'], answer: 1, why: 'You mostly call a model someone else trained, so your cost is the recurring cost of inference tokens.' },
      { q: 'Which 2017 architecture made large-scale parallel training practical?', options: ['The perceptron', 'LSTM', 'The transformer', 'LeNet'], answer: 2, why: 'The transformer replaced recurrence with attention, which trains in parallel on GPUs.' },
      { q: 'In the application era, how do you relate to the model?', options: ['You own it and retrain it for each task', 'You mostly call it, and the vendor can update it', 'You never need to test it', 'It never changes'], answer: 1, why: 'You rent the model. That is why pinning versions and running evals matter.' },
      { q: 'A team with classical machine learning experience starts building with generative AI. Which of their old skills does the lesson say still matters?', options: ['Checking that data is good and testing on examples the model has not seen', 'Hand-crafting word-count features for every task', 'Training one model for each task from labelled data', 'Owning the model so a vendor cannot change it'], answer: 0, why: 'Data quality, honest testing and noticing drift are the hard parts of generative AI too. People who learned them tend to build more reliable systems.' },
    ],
  },
  'foundations/tokens-and-embeddings': {
    takeaways: [
      'Text becomes tokens, then vectors. Pricing and limits are counted in tokens.',
      'Code, numbers, rare words and many non-English languages usually take more tokens per character.',
      'Embeddings place similar meanings close together, which makes search by meaning possible.',
      'Embeddings from different models are not comparable, so changing the model means re-embedding everything.',
    ],
    prereq: ['start/how-a-chatbot-answers'],
    quiz: [
      { q: 'Why can the same text cost a different amount on different models?', options: ['Prices are random', 'Tokenizers differ, so token counts differ', 'Longer words cost more everywhere', 'Only output tokens are counted'], answer: 1, why: 'Each model family has its own tokenizer, so it splits the same text differently.' },
      { q: 'You switch to a different embedding model. What must you do?', options: ['Nothing', 'Re-embed all your documents', 'Only embed new documents', 'Rename the index'], answer: 1, why: 'Vectors from different models live in different spaces and cannot be compared.' },
      { q: 'Two passages are close in embedding space. Does that guarantee one answers the question?', options: ['Yes', 'No: similar meaning is not the same as relevant', 'Only if the distance is zero', 'Only in English'], answer: 1, why: 'Closeness measures similarity of meaning, not whether a passage answers the specific question.' },
      { q: 'A chatbot miscounts the letters in a word. What does the lesson say is behind this?', options: ['The model ran out of context window', 'Its embedding model was changed', 'The word may be only one or two tokens, so the model sees pieces rather than letters', 'Letters are billed separately from words'], answer: 2, why: 'This is a tokenization effect, not a lack of intelligence: the model works with token pieces, not individual letters.' },
    ],
  },
  'foundations/attention-intuition': {
    takeaways: [
      'Attention lets each token weigh every other token to resolve its meaning, for example what “it” refers to.',
      'Query, key and value: compare a query with keys, then blend the values using those weights.',
      'The work grows roughly with the square of context length, which is one reason long context is expensive.',
      'A causal mask means a token only sees earlier tokens, which is why generation is sequential.',
    ],
    prereq: ['foundations/tokens-and-embeddings'],
    quiz: [
      { q: 'In attention, what do the weights decide?', options: ['Which tokens to delete', 'How much each token’s value contributes to the result', 'The price per token', 'How many layers to use'], answer: 1, why: 'The result for a token is a weighted blend of values, with weights from query-key matches.' },
      { q: 'Why is text generation sequential?', options: ['GPUs cannot do parallel work', 'Each token can only attend to earlier ones, so each depends on the last', 'Tokens are chosen at random', 'The API forces it'], answer: 1, why: 'The causal mask means a new token depends on all the previous tokens, including the one just produced.' },
      { q: 'Doubling the context length roughly does what to the attention work?', options: ['Doubles it', 'Quadruples it', 'Halves it', 'Leaves it unchanged'], answer: 1, why: 'Every token attends to every earlier token, so the work grows roughly with the square of the length.' },
      { q: 'In a very long prompt, where do models tend to use information less reliably?', options: ['At the start', 'At the end', 'Only in the system prompt', 'In the middle, compared with the start or the end'], answer: 3, why: 'Models often use information in the middle of a very long prompt less reliably than at the start or end, which affects how you order context.' },
    ],
  },
  'foundations/training-pipeline': {
    takeaways: [
      'Pretraining sets what the model knows. Instruction and preference tuning mostly shape behaviour.',
      'A knowledge cutoff comes from the pretraining data.',
      'A vendor’s post-training update can change behaviour without changing facts, so pin versions and keep evals.',
      'Your own fine-tuning is post-training in miniature: good for style and format, poor for adding facts.',
    ],
    prereq: ['foundations/attention-intuition'],
    quiz: [
      { q: 'Which stage is mostly responsible for what the model knows?', options: ['Preference tuning', 'Pretraining', 'Packaging', 'Prompting'], answer: 1, why: 'Facts and skills come from learning to predict text across a huge corpus.' },
      { q: 'A vendor updates a model and your output format changes. The likeliest cause?', options: ['Facts changed in the world', 'Post-training changed its behaviour', 'Your internet is slow', 'Tokens got cheaper'], answer: 1, why: 'Post-training shapes style, format and refusals without necessarily changing knowledge.' },
      { q: 'Reasoning models usually bill their thinking as…', options: ['Nothing', 'Input tokens', 'Output tokens', 'A flat fee'], answer: 2, why: 'The intermediate reasoning is generated text, which is normally billed as output.' },
      { q: 'How does direct preference optimisation differ from reinforcement learning from human feedback?', options: ['It trains a separate reward model from human rankings first', 'It skips the reward model and trains the language model directly on pairs of preferred and rejected responses', 'It adds new facts to the model', 'It changes the tokenizer'], answer: 1, why: 'Both turn “people preferred this answer” into a training signal. Direct preference optimisation is simpler to run because it has no separate reward model.' },
    ],
  },

  'llm/prompting-and-structured-output': {
    takeaways: [
      'A prompt has parts: role and task, context, rules, examples, output format and the input. Delimit data from instructions.',
      'For structured output, prefer the platform’s schema feature, and always validate and retry.',
      'Temperature zero makes output more repeatable, not guaranteed identical.',
      'Keep prompts in version control and turn real failures into test cases.',
    ],
    prereq: ['start/how-a-chatbot-answers'],
    quiz: [
      { q: 'The model ignores your output format. The best first fix?', options: ['Write longer rules', 'Add an example of the exact output', 'Raise the temperature', 'Switch provider'], answer: 1, why: 'Showing the format beats describing it.' },
      { q: 'Temperature zero means…', options: ['Identical output is guaranteed', 'More repeatable, not guaranteed identical', 'The model refuses', 'The output is JSON'], answer: 1, why: 'Batching and hardware differences, and model updates, can still change a result.' },
      { q: 'What should always follow asking a model for JSON?', options: ['Trusting it', 'Parsing and validating, with a limited retry', 'Lowering max tokens', 'Removing the schema'], answer: 1, why: 'Never trust model output to match a schema. Validate it, and send the error back on failure.' },
      { q: 'A model follows an instruction that was written inside a customer email you pasted into the prompt. What is the usual first fix?', options: ['Delimit the email as data and tell the model it is not instructions', 'Raise the temperature', 'Add more rules at the top of the prompt', 'Switch to a bigger model'], answer: 0, why: 'Mixing data and instructions is the cause. Delimiters and a plain statement that the data is not instructions separate the two.' },
    ],
  },
  'llm/context-window-and-caching': {
    takeaways: [
      'The window counts input and output. System prompt, tools, retrieval and history all use it.',
      'Longer context costs money and latency, and can reduce quality for material in the middle.',
      'Caching matches from the start of the prompt, so put stable content first.',
      'A per-request value such as a timestamp near the top silently defeats caching.',
    ],
    prereq: ['foundations/tokens-and-embeddings'],
    play: [CRUNCH],
    quiz: [
      { q: 'Where should a per-request timestamp go if you want caching to work?', options: ['At the very top', 'After the stable prefix', 'Anywhere', 'In the first line of the system prompt'], answer: 1, why: 'The cache matches from the start. A changing value at the top makes the prefix different every time.' },
      { q: 'A chat resends its whole history each turn. What happens to cost per turn as it grows?', options: ['It stays constant', 'It rises', 'It falls', 'It is zero'], answer: 1, why: 'Every earlier turn is input again, so each message costs more than the last.' },
      { q: 'How do you confirm caching is working?', options: ['It feels faster', 'Check cache read and write counts in the usage data', 'Count the words', 'Ask the model'], answer: 1, why: 'Usage fields report cache hits. A cache that is never hit saves nothing.' },
      { q: 'A large manual changes often, and each question needs only a few paragraphs of it. Which approach fits the lesson?', options: ['Cache the whole manual at the start of every prompt', 'Summarise it into the system prompt', 'Retrieve only the few passages that matter', 'Raise the maximum output length'], answer: 2, why: 'Retrieve when material is large, changes often, or only a small part is relevant to each question. Caching suits small material reused on most requests.' },
    ],
  },
  'llm/prompting-vs-rag-vs-fine-tuning': {
    takeaways: [
      'Prompting changes instructions, retrieval changes the facts available, fine-tuning changes the weights.',
      'Fine-tuning to add facts is the most common mistake. Use retrieval for knowledge.',
      'Measure first with a small eval set, then try the cheapest approach that could work.',
      'The three combine: fine-tuned small model for format, retrieval for facts, careful prompt to tie it together.',
    ],
    prereq: ['llm/prompting-and-structured-output'],
    quiz: [
      { q: 'The model does not know your private documents. The first thing to try?', options: ['Fine-tune it', 'Retrieval (RAG)', 'Raise the temperature', 'Wait for a newer model'], answer: 1, why: 'Retrieval supplies facts per request and updates when documents change.' },
      { q: 'Fine-tuning is best suited to…', options: ['Adding large amounts of changing facts', 'Consistent style, format or a narrow skill', 'Citing sources', 'Replacing evals'], answer: 1, why: 'It shapes behaviour well. It does not reliably add recallable knowledge.' },
      { q: 'What comes before choosing any of the three?', options: ['Buying GPUs', 'Building a small eval set from real inputs', 'Fine-tuning', 'Switching vendors'], answer: 1, why: 'Without a measure you cannot tell whether a change helped.' },
      { q: 'The model knows your domain well enough but answers in the wrong style. What order does the lesson suggest?', options: ['Fine-tune first and prompt afterwards', 'Add retrieval first', 'Change vendors first', 'Look at prompting first and fine-tuning second'], answer: 3, why: 'When the model knows enough but answers the wrong way, look at prompting first. Retrieval is for missing knowledge.' },
    ],
  },

  'rag-agents/rag-from-scratch': {
    takeaways: [
      'RAG finds the passages relevant to a question and puts them in the prompt so the model answers from them.',
      'It is two pipelines: indexing (offline) and answering (per question).',
      'Tell the model to say “I don’t know” when the passages do not help, and return sources.',
      'Quality is capped by retrieval, so measure retrieval separately.',
    ],
    prereq: ['foundations/tokens-and-embeddings'],
    play: [INCIDENT],
    quiz: [
      { q: 'In RAG, which part runs offline, ahead of any question?', options: ['Answering', 'Indexing: load, chunk, embed, store', 'Generation', 'Reranking'], answer: 1, why: 'Documents are prepared once. Retrieval and generation happen on every question.' },
      { q: 'What should the prompt tell the model if the passages do not contain the answer?', options: ['Guess', 'Say it does not know', 'Use general knowledge', 'Ask the user to try again'], answer: 1, why: 'Otherwise it will often produce a confident guess.' },
      { q: 'What caps the quality of a RAG answer?', options: ['The temperature', 'Retrieval quality', 'The user interface', 'The tokenizer'], answer: 1, why: 'If the right passage is not retrieved, the model cannot answer from it.' },
      { q: 'A policy document changes today. In a RAG system, how do you update what the model can answer from?', options: ['Retrain the model on the new text', 'Re-index the changed document', 'Raise the temperature', 'Fine-tune on a few questions about it'], answer: 1, why: 'In RAG, knowledge updates by re-indexing, with no training. Fine-tuning would not reliably add the facts.' },
    ],
  },
  'rag-agents/chunking-and-retrieval-quality': {
    takeaways: [
      'Most RAG failures are retrieval failures: the right passage was never in the prompt.',
      'Split on structure, keep headings with each chunk, and test chunk sizes on your own questions.',
      'Hybrid search plus reranking beats vector search alone for most corpora.',
      'Measure recall at k on its own, and enforce permissions at retrieval.',
    ],
    prereq: ['rag-agents/rag-from-scratch'],
    play: [INCIDENT],
    quiz: [
      { q: 'Search keeps missing exact product codes. What helps?', options: ['A bigger model', 'Keyword search alongside vector search', 'A lower temperature', 'More overlap between chunks'], answer: 1, why: 'Vector search matches meaning and can miss exact strings. Keyword search catches them.' },
      { q: 'Recall at 5 is 0.7. What does that mean?', options: ['70% of answers are correct', 'For 30% of questions the right passage is not in the top five', 'Search takes 0.7 seconds', '5 of 7 chunks are used'], answer: 1, why: 'It measures whether the right passage was retrieved, before the model is involved.' },
      { q: 'Where should access permissions be enforced?', options: ['In the prompt', 'At retrieval, before ranking', 'After generation', 'Only in the interface'], answer: 1, why: 'The model must never see text the user is not allowed to read.' },
      { q: 'What does reranking do?', options: ['Takes a generous set of results and reorders them with a more accurate but slower model, keeping the best few', 'Splits documents into smaller chunks', 'Rewrites follow-up questions as standalone ones', 'Applies permission filters before ranking'], answer: 0, why: 'Retrieve a generous set first, then rerank and keep the top few. Query rewriting and metadata filters are separate techniques.' },
    ],
  },
  'rag-agents/agents-and-tool-use': {
    takeaways: [
      'An agent is a loop: the model decides, your code acts, the result is fed back.',
      'Your code runs the tools, so safety lives in what you let it run.',
      'Use a fixed workflow when the steps are known. Use an agent only when they are not.',
      'Cap steps, time and tokens, return honest errors, and require confirmation for consequential actions.',
    ],
    prereq: ['rag-agents/rag-from-scratch'],
    play: [INCIDENT],
    quiz: [
      { q: 'Who actually runs a tool the model asks for?', options: ['The model', 'Your code', 'The model vendor', 'The user'], answer: 1, why: 'The model only produces a structured request. Your application decides whether and how to run it.' },
      { q: 'A tool returns an empty string when it errors. The risk?', options: ['None', 'The agent may loop, thinking there are simply no results', 'Faster runs', 'Lower cost'], answer: 1, why: 'Swallowed errors hide the real problem from the model.' },
      { q: 'The steps are known in advance. Which design fits best?', options: ['An agent', 'A fixed workflow', 'Randomly chosen tools', 'No code at all'], answer: 1, why: 'Workflows are more predictable, cheaper and easier to test.' },
      { q: 'Why can a ten-step agent task cost far more than ten times a single call?', options: ['Every tool call carries a fixed fee', 'Agents always run on the largest model', 'Each iteration is another model call that resends the growing conversation', 'Logging is billed per step'], answer: 2, why: 'The context grows with each step and is resent every time, so cost rises faster than the number of steps. Track cost per completed task.' },
    ],
  },

  'evals/evals-101': {
    takeaways: [
      'An eval is a repeatable test: inputs, a definition of a good answer, and a way to score.',
      'Start with 30 to 50 real inputs. Grow the set, and turn every production bug into a new case.',
      'Use the cheapest scoring method that is faithful: code checks, references, rubrics, humans.',
      'Keep a hidden set, track critical cases separately, and record which model produced each result.',
    ],
    prereq: ['llm/prompting-and-structured-output'],
    play: [INCIDENT],
    quiz: [
      { q: 'How many real inputs do you need to start an eval set?', options: ['3', 'About 30 to 50', '5,000', 'None, rely on impressions'], answer: 1, why: 'A small, honest set that you actually run beats an elaborate one you never build.' },
      { q: 'The cheapest faithful check for “valid JSON with the required fields”?', options: ['A model judge', 'A programmatic check', 'Human review', 'A reference comparison'], answer: 1, why: 'If you can check it with code, use code.' },
      { q: 'Why keep a hidden test set?', options: ['To avoid overfitting to the cases you tune on', 'To save storage', 'It is legally required', 'To run faster'], answer: 0, why: 'Iterating on the same cases forever makes them look better than reality.' },
      { q: 'Your average eval score rises by a point, but one answer in the set is harmful. What does the lesson say?', options: ['The higher average is what counts', 'Remove that case from the set', 'Re-run the eval until that case passes', 'One harmful answer matters more than a point of average, so track critical cases separately'], answer: 3, why: 'An average can hide a disaster. Critical cases get their own tracking.' },
    ],
  },
  'evals/llm-as-judge-pitfalls': {
    takeaways: [
      'Model judges scale, and they have known biases: position, length and self-preference.',
      'Use a specific rubric, show the judge the evidence, randomise order, and log its reasoning.',
      'Calibrate against human grades on a sample before trusting it.',
      'Do not use a judge where code can check the answer.',
    ],
    prereq: ['evals/evals-101'],
    play: [INCIDENT],
    quiz: [
      { q: 'What is position bias?', options: ['The judge favours whichever answer comes first, regardless of quality', 'The judge prefers longer answers', 'The judge prefers its own model family', 'The judge refuses to answer'], answer: 0, why: 'Randomise or swap order to cancel it out.' },
      { q: 'Before trusting a judge you should…', options: ['Use a bigger judge', 'Compare its grades with human grades on a sample', 'Lower its temperature', 'Remove the rubric'], answer: 1, why: 'Calibration against people is how you learn whether the judge measures what you care about.' },
      { q: 'When should you use code instead of a judge?', options: ['Judging tone', 'Whenever the answer is checkable', 'Creative writing', 'Style review'], answer: 1, why: 'Code is cheaper, faster and exact.' },
      { q: 'Which rubric is better for a model judge?', options: ['“Rate the quality from 1 to 10”', 'A few yes-or-no questions, such as whether every claim is supported by the passage', '“Rate it as a teacher would”', '“Be strict but fair”'], answer: 1, why: 'Specific questions that can be answered yes or no are more reliable than vague quality scores, which are noisy.' },
    ],
  },

  'serving/life-of-a-request': {
    takeaways: [
      'Prefill reads the whole prompt in parallel and sets time to first token. Decode writes one token at a time.',
      'Decode is limited by memory bandwidth. That is why smaller weights make it faster.',
      'Continuous batching keeps hardware busy and prices low, and is why you can be throttled.',
      'Retry throttled calls with backoff and jitter, with a cap and a fallback.',
    ],
    prereq: ['start/how-a-chatbot-answers'],
    play: [FIT],
    quiz: [
      { q: 'Time to first token is mainly set by…', options: ['Decode', 'Prefill: prompt length and model size', 'Billing', 'The region name'], answer: 1, why: 'The first token cannot appear until the prompt has been processed.' },
      { q: 'Generation speed is mostly limited by…', options: ['Arithmetic alone', 'Memory bandwidth', 'Disk speed', 'The user’s network only'], answer: 1, why: 'Each step must read the weights and the cache from memory.' },
      { q: 'The right response to throttling errors?', options: ['Retry immediately in a loop', 'Backoff with jitter, capped, with a fallback', 'Ignore them', 'Increase retries to 100'], answer: 1, why: 'Immediate retries synchronise clients and make overload worse.' },
      { q: 'You turn on streaming. What does that change?', options: ['The reply feels faster and you can stop early, but generation is no faster', 'Generation itself becomes faster', 'The price per token falls', 'Prefill is skipped'], answer: 0, why: 'Streaming does not make generation faster, but it makes the experience feel faster and lets you stop early.' },
    ],
  },
  'serving/kv-cache-and-memory': {
    takeaways: [
      'The KV cache stores earlier tokens’ keys and values so they are not recomputed. It trades memory for speed.',
      'Weights are a fixed cost. The KV cache grows with context and with every concurrent user.',
      'Fewer KV heads, lower-precision cache, paged allocation and prefix sharing all shrink or stretch it.',
      'Size hardware for weights plus the cache at your real concurrency, with headroom.',
    ],
    prereq: ['serving/life-of-a-request'],
    play: [FIT, { label: 'Open the memory calculator', href: '/tools/memory/' }],
    quiz: [
      { q: 'Which part of memory use grows with users and context length?', options: ['Weights', 'The KV cache', 'The vocabulary', 'The tokenizer'], answer: 1, why: 'Every token of every sequence adds keys and values to the cache.' },
      { q: 'Why does grouped-query attention help memory?', options: ['It adds more heads', 'It uses fewer KV heads, so the cache is smaller', 'It makes the tokenizer faster', 'It makes weights cheaper'], answer: 1, why: 'Sharing keys and values across query heads cuts what must be stored per token.' },
      { q: 'Quantizing weights speeds up generation mostly because…', options: ['There are fewer arithmetic operations', 'There is less data to read from memory per step', 'The network is faster', 'Prompts get shorter'], answer: 1, why: 'Decode is memory-bandwidth-bound, so smaller weights mean less to read.' },
      { q: 'You store the KV cache in 8 bits instead of 16. What should you expect?', options: ['The cache is unchanged', 'The cache doubles', 'The cache halves, with some effect on quality that you should measure', 'The cache halves with no effect on quality'], answer: 2, why: 'Lower precision halves the cache, but it can change quality, so measure it.' },
    ],
  },
  'serving/quantization': {
    takeaways: [
      'Quantization stores weights in fewer bits: smaller, and usually faster, at some cost in precision.',
      'Weight memory is parameters times bytes. 8B parameters at INT4 is about 4 GB.',
      'Test your own eval suite on both versions, including the tails, and measure on target hardware.',
      '8-bit is usually a safe win. 4-bit is common but needs checking.',
    ],
    prereq: ['serving/kv-cache-and-memory'],
    play: [FIT],
    quiz: [
      { q: 'An 8-billion-parameter model with INT4 weights needs roughly how much memory for weights?', options: ['32 GB', '16 GB', '8 GB', '4 GB'], answer: 3, why: '8 billion parameters at half a byte each is about 4 GB.' },
      { q: 'Before shipping a quantized model you should…', options: ['Trust public benchmark numbers', 'Run your own eval on both versions', 'Skip checking edge cases', 'Use the lowest bit width available'], answer: 1, why: 'Benchmark results do not tell you how your task behaves.' },
      { q: 'Which is generally the safest large saving?', options: ['8-bit weights', '2-bit everywhere', 'Removing layers at random', 'Quantizing nothing'], answer: 0, why: '8-bit usually costs very little quality.' },
      { q: 'Your 4-bit version of a large model is not accurate enough on your own evals. Which alternative does the lesson say is worth comparing?', options: ['The same model at 2 bits', 'The same model with the eval suite removed', 'A larger model at 3 bits', 'A smaller model in 8 bits'], answer: 3, why: 'Sometimes a smaller model in 8 bits beats a larger one in 3 or 4. Compare on your own evals.' },
    ],
  },

  'cloud/what-is-bedrock': {
    takeaways: [
      'Bedrock is a managed API for foundation models from several providers, inside your AWS account.',
      'Around the API: knowledge bases, agents, guardrails, evaluation, customization and batch.',
      'Pay on-demand per token, reserve capacity, or use batch. Prices and model lists change, so check the docs.',
      'It is for consuming models. Building and hosting your own is SageMaker’s job.',
    ],
    prereq: ['start/what-is-ai-in-plain-english'],
    play: [BLUEPRINT],
    quiz: [
      { q: 'Bedrock is mainly for…', options: ['Training your own model from scratch', 'Calling foundation models through a managed API', 'Hosting relational databases', 'Writing front ends'], answer: 1, why: 'It gives managed access to models other providers trained.' },
      { q: 'Which API gives a common request shape across models?', options: ['InvokeModel', 'Converse', 'Lambda', 'S3 Select'], answer: 1, why: 'Converse normalises messages and settings across supported models.' },
      { q: 'Where do you see what a call will cost you?', options: ['The usage field in the response, plus the pricing page', 'The model’s own answer', 'Nowhere', 'The browser console'], answer: 0, why: 'Usage reports tokens used. Rates come from the provider’s pricing page.' },
      { q: 'You must summarise a large pile of documents and nobody is waiting for the result. Which Bedrock pricing mode suits it best?', options: ['Provisioned throughput, booked by time', 'Batch: asynchronous jobs at a reduced rate', 'On-demand, with no commitment', 'The Priority tier, the fastest option'], answer: 1, why: 'Batch is for bulk work that can wait. Provisioned throughput suits steady, high volume that needs predictable latency.' },
    ],
  },
  'cloud/bedrock-sagemaker-foundry-vertex': {
    takeaways: [
      'Each cloud offers a managed model API and an ML platform. The names blur, the intent does not.',
      'Pick the model first and the platform second, unless a constraint such as residency forces it.',
      'Where your data lives and what your compliance rules say usually decide it.',
      'A thin abstraction around model calls keeps you portable.',
    ],
    prereq: ['cloud/what-is-bedrock'],
    play: [BLUEPRINT],
    quiz: [
      { q: 'SageMaker is closest to which kind of service?', options: ['A managed model API', 'An ML platform for training and hosting your own models', 'A content delivery network', 'A vector database'], answer: 1, why: 'It is where you bring data and code, rather than just calling a hosted model.' },
      { q: 'What should drive the first choice?', options: ['Brand', 'Which model you need, with measured quality on your task', 'The logo', 'The name of the region'], answer: 1, why: 'Start with the model whose quality you have tested. Constraints then narrow the platform.' },
      { q: 'Why wrap model calls in your own thin layer?', options: ['It looks tidy', 'You can switch platforms by changing one file, and your evals keep working', 'Clouds require it', 'It lowers token prices'], answer: 1, why: 'Portability is cheapest when it is designed in.' },
      { q: 'Your team has to train a custom model on its own data. Which side of a cloud’s AI services do you need?', options: ['The ML platform side, whichever managed model API you also use', 'A managed model API alone', 'Prompt caching alone', 'A content delivery network'], answer: 0, why: 'If you need custom training you need the ML platform side regardless. A managed API is for calling models someone else trained.' },
    ],
  },

  'systems/rag-service-architecture': {
    takeaways: [
      'A production RAG service adds a gateway, orchestrator, cache, model gateway, guardrails and tracing around the retrieval.',
      'Enforce access at retrieval, scope caches by user, and trace everything.',
      'Start with orchestrator, one index, one model and tracing. Add the rest when traces demand it.',
      'Know how each component fails, and what the user sees when it does.',
    ],
    prereq: ['rag-agents/chunking-and-retrieval-quality'],
    play: [BLUEPRINT, INCIDENT],
    quiz: [
      { q: 'Where should per-user access be enforced?', options: ['In the prompt', 'At retrieval, before ranking', 'On the client', 'In the logs'], answer: 1, why: 'A prompt instruction is not access control.' },
      { q: 'A safe response-cache key for personalised answers?', options: ['The question text only', 'The question plus the user or permission scope', 'The time of day', 'A random number'], answer: 1, why: 'Otherwise one user can receive another’s stored answer.' },
      { q: 'Someone reports a bad answer. What should you be able to do?', options: ['Re-run it blindly', 'Open the trace and see what was retrieved and sent', 'Delete the cache', 'Guess'], answer: 1, why: 'Traces turn mysterious failures into diagnosable ones.' },
      { q: 'You are launching a first production RAG service. What does the lesson say is enough to start?', options: ['Every component in the reference design on day one', 'A multi-agent loop with many tools', 'An orchestrator, one index, one model and tracing, with the rest added when traces show you need it', 'Only a model and a prompt'], answer: 2, why: 'Start small and add the cache, reranker, fallback and guardrails when the traces demand them.' },
    ],
  },
  'systems/model-routing-and-fallbacks': {
    takeaways: [
      'Route by task, difficulty or policy. A cascade tries a small model first and escalates when a check fails.',
      'Escalated requests pay twice and wait twice, so track the escalation rate.',
      'Timeouts, backoff with jitter, circuit breakers and a tested fallback keep you up.',
      'Prompts are not portable by default: evaluate every model in the routing table.',
    ],
    prereq: ['serving/life-of-a-request'],
    play: [CRUNCH, BLUEPRINT],
    quiz: [
      { q: 'The main risk of a cascade?', options: ['It is always cheaper', 'Escalated requests pay for and wait on both models', 'There is no quality risk', 'It needs no check'], answer: 1, why: 'If too many escalate, a cascade costs and delays more than the large model alone.' },
      { q: 'Why add jitter to retry delays?', options: ['It spreads retries so clients do not retry in lockstep', 'It is faster', 'It is cheaper', 'HTTP requires it'], answer: 0, why: 'Synchronised retries arrive in waves and keep a recovering service overloaded.' },
      { q: 'What must you test on a fallback model?', options: ['Nothing', 'Your eval set, because prompts are not portable by default', 'Only latency', 'Only price'], answer: 1, why: 'A fallback that quietly performs worse is a hidden quality drop.' },
      { q: 'A fallback sends some requests to another region or provider. What should the routing policy include?', options: ['Nothing, because regions are interchangeable', 'A higher temperature for the fallback', 'Random choice of region', 'Residency and contractual limits on where data may go'], answer: 3, why: 'A fallback to another region or provider can break residency or contractual limits, so those constraints belong in the policy.' },
    ],
  },

  'cost/where-the-tokens-go': {
    takeaways: [
      'Pricing is per token, with output usually several times dearer than input.',
      'Hidden multipliers: system prompts, retrieved context, conversation history, agent loops, reasoning tokens, retries.',
      'The number to track is cost per successful task, not per request.',
      'Log token usage with a feature name from day one.',
    ],
    prereq: ['foundations/tokens-and-embeddings'],
    play: [CRUNCH, { label: 'Open the cost calculator', href: '/tools/cost/' }],
    quiz: [
      { q: 'Why is output usually pricier per token than input?', options: ['Marketing', 'Generating a token takes more compute than reading one', 'There are fewer output tokens', 'Regulation'], answer: 1, why: 'Reading the prompt is parallel. Writing is one step at a time and memory-bound.' },
      { q: '3,000 input and 400 output tokens at $3 and $15 per million costs, per request, about…', options: ['$0.015', '$0.15', '$0.0015', '$1.50'], answer: 0, why: '$0.009 for input plus $0.006 for output.' },
      { q: 'Which number matters most?', options: ['Cost per request', 'Cost per successful task', 'Cost per token', 'Cost per word'], answer: 1, why: 'A task that needs several attempts costs several times the per-request price.' },
      { q: 'In the lesson’s example the prompt is 88 per cent of the tokens. Roughly what share of the cost is it?', options: ['About 88 per cent, because cost follows tokens', 'About 60 per cent, because each output token costs five times as much', 'About 12 per cent', 'About 40 per cent'], answer: 1, why: 'At the example prices an output token costs five times an input token, so the prompt is a smaller share of the cost than of the tokens.' },
    ],
  },
  'cost/cost-levers': {
    takeaways: [
      'Measure spend per feature and build evals before cutting anything.',
      'Order of attack: fix waste, cache the stable prefix, right-size and route, batch what can wait, then distil or self-host.',
      'Self-hosting cost per token hinges on utilisation.',
      'Compare cost per completed task at equal quality.',
    ],
    prereq: ['cost/where-the-tokens-go'],
    play: [CRUNCH],
    quiz: [
      { q: 'What do you need before cutting costs?', options: ['A different model', 'A per-feature spend view and an eval suite', 'Fewer logs', 'Your own GPUs'], answer: 1, why: 'The first shows where to look, the second shows whether a saving broke anything.' },
      { q: 'Self-hosted cost per token depends most on…', options: ['The GPU colour', 'Utilisation', 'The cloud brand', 'Prompt style'], answer: 1, why: 'A GPU that is busy 20% of the time costs five times as much per token as one that is always busy.' },
      { q: 'Which savings should you take first?', options: ['Those that cost no quality, such as waste and caching', 'The smallest model everywhere', 'Distillation', 'Removing evals'], answer: 0, why: 'Free savings first, then the ones that need evals to be safe.' },
      { q: 'A cheaper model needs two attempts to give a usable result. How should you compare it with a pricier one?', options: ['By cost per completed task at equal quality, measured on your own evals', 'By cost per request alone', 'By price per million tokens alone', 'By the size of the model'], answer: 0, why: 'A cheaper model that needs two attempts or a human fix can cost more per successful task.' },
    ],
  },

  'edge/edge-vs-cloud-inference': {
    takeaways: [
      'Choose on-device for millisecond budgets, offline use and privacy. Choose cloud for large models and fast updates.',
      'Budget for the slow tail (p99), not the average.',
      'Hybrid designs use a small on-device model first and the cloud for harder cases.',
      'Power, memory and operator support are the constraints people underestimate.',
    ],
    prereq: ['serving/life-of-a-request'],
    play: [{ label: 'Open the latency budget tool', href: '/tools/latency/' }, INCIDENT],
    quiz: [
      { q: 'Which favours running on the device?', options: ['A very large model', 'Millisecond budgets and offline use', 'Frequent updates', 'Fleet-wide A/B tests'], answer: 1, why: 'A network round trip alone can exceed a tight budget, and the device works offline.' },
      { q: 'Real-time latency budgets should be set against…', options: ['The average', 'The slow tail (p99)', 'The best case', 'The median'], answer: 1, why: 'A rare slow inference is a visible glitch in a real-time path.' },
      { q: 'What does “device first, cloud fallback” mean?', options: ['Always use the cloud', 'A small on-device model handles common cases and harder ones go to the cloud when connected', 'Never use the cloud', 'The cloud trains the device live'], answer: 1, why: 'It combines low latency for the common case with capability for the hard one.' },
      { q: 'Besides speed, what does the lesson say to measure on a battery-powered device?', options: ['The number of cloud regions', 'Output token price', 'Energy per inference', 'Context window length'], answer: 2, why: 'Every inference costs battery and sustained compute causes heat, so measure energy per inference, not only speed.' },
    ],
  },
  'edge/quantization-for-edge': {
    takeaways: [
      'Compress with quantization, pruning, distillation, or a better-suited architecture, then validate hard.',
      'Calibrate and test on realistic and difficult conditions, not only clean data.',
      'Measure latency, memory and energy on the target hardware under sustained load.',
      'Unsupported operators fall back to the CPU and can ruin the latency you measured elsewhere.',
    ],
    prereq: ['serving/quantization', 'edge/edge-vs-cloud-inference'],
    play: [INCIDENT],
    quiz: [
      { q: 'Where should you measure latency?', options: ['On the development laptop', 'On the target hardware under realistic sustained load', 'In the cloud', 'In a simulator only'], answer: 1, why: 'Only the real chip shows operator fallbacks, transfers and thermal throttling.' },
      { q: 'Calibration data for quantization should…', options: ['Be clean only', 'Include realistic and difficult conditions', 'Be tiny', 'Be random noise'], answer: 1, why: 'Accuracy loss hides in the cases the calibration set never saw.' },
      { q: 'Operators unsupported on the NPU cause…', options: ['Nothing', 'CPU fallback and extra transfers that slow inference', 'Faster runs', 'Smaller models'], answer: 1, why: 'Each fallback adds transfers between processors every frame.' },
      { q: 'Which pruning approach gives a smaller dense model that any hardware runs faster?', options: ['Unstructured sparsity, removing individual weights', 'Adding more calibration data', 'Quantizing only the first layer', 'Structured pruning: removing whole channels or heads'], answer: 3, why: 'Unstructured sparsity shrinks the stored model but only speeds things up if the hardware can exploit it. Structured pruning leaves a smaller dense model.' },
    ],
  },
};

/** Core lessons plus the per-track files in ./extras. */
export const extras: Record<string, Extra> = { ...baseExtras, ...extrasCloud, ...extrasInfra, ...extrasLocal, ...extrasCore, ...extrasModels, ...extrasEcosystem, ...extras_frameworks, ...extras_mcp, ...extras_promptpatterns, ...extras_libraries, ...extras_reasoning, ...extras_agenteval, ...extras_euai, ...extrasOps, ...extrasRetrievalServing };
