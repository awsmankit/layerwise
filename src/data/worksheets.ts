import type { Band } from './unplugged';

/**
 * One printable worksheet and answer key per age band. They are pages, not downloads: a
 * teacher prints them, and nothing about a student is stored or sent anywhere. Example numbers
 * are for practice and are labelled as invented where they could be mistaken for real data.
 */
export type Item = { q: string; lines?: number; answer: string };
export type Section = {
  title: string;
  intro?: string;
  /** a drawn diagram that sits above the questions */
  diagram?: 'pipeline' | 'tree' | 'network' | 'confusion';
  wordBank?: string[];
  items: Item[];
};
export type Worksheet = {
  band: Band;
  title: string;
  strap: string;
  minutes: number;
  /** lesson keys the sheet follows */
  lessons: string[];
  /** unplugged activity ids it pairs with */
  unplugged: string[];
  /** match each word to its meaning: the meanings are shown in a different order */
  vocab: { term: string; meaning: string }[];
  /** order in which the meanings are printed, as indexes into vocab */
  meaningOrder: number[];
  sections: Section[];
  extension: Item;
};

export const worksheets: Worksheet[] = [
  {
    band: '10-12',
    title: 'AI detectives',
    strap: 'Ages 10 to 12. Follows “What AI actually is”, “How a computer learns from examples” and “Using AI without getting burned”.',
    minutes: 40,
    lessons: ['start/what-is-ai-in-plain-english', 'start/how-computers-learn', 'start/using-ai-without-getting-burned'],
    unplugged: ['be-the-classifier', 'bias-in-the-data'],
    vocab: [
      { term: 'Example', meaning: 'One item with the right answer attached, such as a photo labelled “banana”.' },
      { term: 'Training', meaning: 'Guessing, counting the mistakes, nudging the dials, and doing it again and again.' },
      { term: 'Testing', meaning: 'Trying the finished rule on new examples it has never seen.' },
      { term: 'Model', meaning: 'The part of an AI system that has learned something, with its dials set.' },
      { term: 'Unfair examples', meaning: 'Examples that leave some kinds out, so the computer does worse on them.' },
    ],
    meaningOrder: [3, 0, 4, 1, 2],
    sections: [
      {
        title: 'Label the picture',
        intro: 'This is how a computer learns to sort fruit. Use the word bank to fill in the three empty boxes.',
        diagram: 'pipeline',
        wordBank: ['answer', 'model', 'training'],
        items: [
          { q: 'Box A: what is happening to the examples?', lines: 1, answer: 'Training (the computer guesses, checks and nudges its dials).' },
          { q: 'Box B: what do we call the finished rule?', lines: 1, answer: 'The model.' },
          { q: 'Box C: what does the model give back for a new picture?', lines: 1, answer: 'An answer (its guess, such as “banana”).' },
        ],
      },
      {
        title: 'Think it through',
        items: [
          { q: 'A computer learns to spot cats from 100 photos. Every cat is lying on a sofa. What might go wrong when it sees a cat in a garden? Why?', lines: 3, answer: 'It might not say “cat”, because all its examples had a sofa. It learns from the examples it is given, so missing kinds get more mistakes. Accept any answer that links the mistake to missing examples.' },
          { q: 'A chatbot tells you that a famous footballer was born in 1994. Write two things you could do before you believe it.', lines: 3, answer: 'Any two sensible checks, such as: look it up on a trusted website or in a book; ask a trusted adult; ask where it got the fact and then check that source; compare with a second source.' },
          { q: 'Tick the ones that are safe to type into a chatbot: your favourite colour, your home address, a question about volcanoes, your full name and school.', lines: 2, answer: 'Safe: favourite colour, a question about volcanoes. Not safe: home address, full name and school. Personal details stay private. A tick for the colour is fine; accept the reasoning rather than the exact ticks.' },
          { q: 'Why does a computer need to be tested on pictures it has not seen before?', lines: 3, answer: 'A rule that is right on the pictures it learned from might still be wrong on new ones. New pictures show whether it has really learned the pattern.' },
        ],
      },
    ],
    extension: { q: 'Extension: design an AI helper for your school, such as one that suggests library books. What examples would it need to learn from? Who might those examples leave out?', lines: 5, answer: 'Open answer. Look for: a clear job, a sensible kind of example (for instance past loans and ratings), and a thoughtful guess about who or what might be missing (for example, pupils who borrow rarely, or books that are new).' },
  },
  {
    band: '13-15',
    title: 'Train it, test it, question it',
    strap: 'Ages 13 to 15. Follows the learning, trees, neural network and fakes lessons, and the “Be the classifier”, “20 questions” and “Human neural network” cards.',
    minutes: 50,
    lessons: ['start/three-ways-machines-learn', 'start/computers-that-decide-and-plan', 'deep-learning/inside-a-neural-network', 'responsible/real-or-fake'],
    unplugged: ['be-the-classifier', 'twenty-questions-tree', 'human-neural-network'],
    vocab: [
      { term: 'Label', meaning: 'The right answer attached to an example in the training data.' },
      { term: 'Feature', meaning: 'A measurable fact about an example, such as the number of spots.' },
      { term: 'Accuracy', meaning: 'The share of answers that were right.' },
      { term: 'Overfitting', meaning: 'Doing well on the training examples but badly on new ones.' },
      { term: 'Weight', meaning: 'A number in a network that says how much one input counts.' },
    ],
    meaningOrder: [2, 4, 0, 3, 1],
    sections: [
      {
        title: 'Complete the decision tree',
        intro: 'This tree sorts the Zorps and Blips from the “Be the classifier” activity. Fill in the empty boxes.',
        diagram: 'tree',
        items: [
          { q: 'Box 1: the number in the second question, “Does it have at least __ spots?”', lines: 1, answer: '2.' },
          { q: 'Box 2: the label at the end of the branch “tail, at least that many spots”.', lines: 1, answer: 'Zorp.' },
          { q: 'Box 3: the label at the end of the branch “no tail”.', lines: 1, answer: 'Blip.' },
          { q: 'A card has 3 antennae, 4 spots and no tail. Follow the tree. What is it?', lines: 1, answer: 'Blip (no tail, so the left-hand branch). The antennae never mattered.' },
        ],
      },
      {
        title: 'Run the network',
        intro: 'Each unit adds up weight × input, then says 1 if the total reaches its number, and 0 if not. Inputs are 1 for yes and 0 for no.',
        diagram: 'network',
        items: [
          { q: 'Sunny 0, Friend free 1, Homework done 1. What do H1, H2 and the output say?', lines: 2, answer: 'H1: 0 + 1 = 1, which reaches 1, so it says 1. H2: 1 reaches 1, so it says 1. Output: 1 + 1 = 2, which reaches 2, so GO.' },
          { q: 'Sunny 1, Friend free 1, Homework done 0. What does the output say?', lines: 2, answer: 'H1: 1 + 1 = 2, which reaches 1, so it says 1. H2: 0, so it says 0. Output: 1 + 0 = 1, which does not reach 2, so STAY IN.' },
          { q: 'Change H1 so that it needs at least 2. Now rerun Sunny 0, Friend free 1, Homework done 1. What happens, and why?', lines: 3, answer: 'H1 gets only 1 from Friend free, which does not reach 2, so it says 0. Output: 0 + 1 = 1, which does not reach 2, so STAY IN. Changing one number changed the behaviour: this is what training does, many times over.' },
        ],
      },
      {
        title: 'Train and test',
        items: [
          { q: 'A classifier got all 10 training cards right, and 3 of the 6 test cards right. Work out its accuracy on the test cards, as a percentage.', lines: 2, answer: '3 out of 6 is 50 per cent.' },
          { q: 'What does the gap between the two scores suggest? What should you try?', lines: 3, answer: 'It suggests the rule fits the training cards without capturing the real pattern (overfitting, or too few and too similar examples). Try more and more varied training cards, or a simpler rule.' },
          { q: 'You get a voice message from a friend asking you to buy gift cards and send the codes. It sounds exactly like them. Write three checks.', lines: 3, answer: 'Any three: stop and do not send anything; ring or message the friend on a number you already know; ask something only they would know; ask a trusted adult; notice the urgency and the unusual request; report it. A voice that sounds right is not proof.' },
        ],
      },
    ],
    extension: { q: 'Extension: a decision tree and a neural network can both sort Zorps from Blips. Write two differences in how you could explain each one’s answer to a friend.', lines: 4, answer: 'Open answer. A tree can be read as a chain of questions, so each answer can be explained step by step. A network’s answer comes from many numbers working together, which is harder to put into words. Accept any well-argued difference.' },
  },
  {
    band: '16-18',
    title: 'Evidence, errors and trade-offs',
    strap: 'Ages 16 to 18. Follows the data, overfitting and fairness lessons, and pairs with “Spam filter by tally” and “Bias in the data”. All numbers are invented for practice.',
    minutes: 60,
    lessons: ['ml/getting-data-ready', 'ml/overfitting-and-bias-variance', 'responsible/when-examples-are-unfair', 'llm/prompting-and-structured-output'],
    unplugged: ['spam-by-tally', 'bias-in-the-data'],
    vocab: [
      { term: 'Precision', meaning: 'Of everything the model flagged, the share that was right.' },
      { term: 'Recall', meaning: 'Of everything that really was a case, the share the model found.' },
      { term: 'Test set', meaning: 'Examples kept back and never used for training, to judge the model fairly.' },
      { term: 'Sampling bias', meaning: 'A training set that does not match the people or cases the model will meet.' },
      { term: 'Token', meaning: 'A piece of text, often part of a word, that a language model reads and counts.' },
    ],
    meaningOrder: [3, 0, 4, 2, 1],
    sections: [
      {
        title: 'Errors on a spam filter',
        intro: 'A filter checked 100 messages (an invented example). 20 really were spam. It flagged 20 messages: 15 were spam and 5 were not.',
        diagram: 'confusion',
        items: [
          { q: 'Fill in the table: spam caught, real messages wrongly flagged, spam missed, real messages passed.', lines: 1, answer: 'Spam caught 15. Real wrongly flagged 5. Spam missed 5 (20 spam minus 15 caught). Real passed 75 (80 real minus 5 flagged).' },
          { q: 'Work out accuracy, precision and recall, as percentages.', lines: 3, answer: 'Accuracy = (15 + 75) / 100 = 90%. Precision = 15 / 20 = 75%. Recall = 15 / 20 = 75%.' },
          { q: 'A lazy filter says “not spam” for every message. What are its accuracy and recall? Why is accuracy alone misleading here?', lines: 3, answer: 'Accuracy = 80 / 100 = 80%, recall = 0 / 20 = 0%. It looks respectable on accuracy while catching no spam, because most messages are real.' },
        ],
      },
      {
        title: 'Overfitting and fairness',
        items: [
          { q: 'A model scores 99% on its training data and 71% on a test set. Explain what has probably happened and give two things to try.', lines: 4, answer: 'It has probably overfitted: it memorised the training data and has not learned patterns that carry over. Try: more varied training data, a simpler model, stopping training earlier, or regularisation. Also check the test set was never used in training.' },
          { q: 'A face-detection model (invented numbers) was trained on photos that were 85% group A and 15% group B. It is 97% accurate on group A and 82% on group B. If the test set has the same mix, what is the overall accuracy? What does that number hide?', lines: 4, answer: '0.85 × 97 + 0.15 × 82 = 82.45 + 12.3 = 94.75, so about 94.8%. It hides a 15-point gap between the groups: the overall figure is dominated by the larger group. Report accuracy for each group separately.' },
          { q: 'Name one way the training photos could have ended up so uneven, and one step that could have prevented it.', lines: 3, answer: 'Open answer. For instance: the photos came from a source that over-represented group A. Steps: audit the data’s make-up before training, collect more of the missing group, and test on each group separately.' },
        ],
      },
      {
        title: 'Tokens and cost',
        items: [
          { q: 'A request uses 400 input tokens and 250 output tokens. An invented price is 1 dollar per million input tokens and 4 dollars per million output tokens. What does one request cost? What do 10,000 requests cost?', lines: 4, answer: 'Input: 400 × 1/1,000,000 = 0.0004 dollars. Output: 250 × 4/1,000,000 = 0.001 dollars. One request: 0.0014 dollars. 10,000 requests: 14 dollars. The prices are made up; real prices differ and change.' },
          { q: 'Write one change that would reduce the cost of each request without changing what it is asked to do.', lines: 2, answer: 'Any sensible one: shorten the prompt, ask for a shorter answer, trim unneeded context, or use a smaller model for easy requests.' },
        ],
      },
    ],
    extension: { q: 'Extension: your school wants a model to flag pupils who may need extra help. Write a short note that says who should decide how errors are weighed, and who is accountable when it is wrong.', lines: 6, answer: 'Open answer. Look for: a named, human decision-maker; a stated cost for each kind of error (missing a pupil who needs help against flagging one who does not); a way for people to challenge a flag; and a plan to test for different results across groups of pupils.' },
  },
];

export const worksheetByBand = Object.fromEntries(worksheets.map((w) => [w.band, w]));
