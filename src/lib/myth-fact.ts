/** Cards for the "myth or fact?" game in start/does-ai-understand. Each card has one source. */

export type Guess = 'myth' | 'fact';

export type Card = {
  id: string;
  statement: string;
  answer: Guess;
  /** Kind feedback shown after the learner answers. */
  explain: string;
  source: { label: string; url: string };
};

export const CARDS: Card[] = [
  {
    id: 'truth',
    statement: 'A chatbot always tells the truth.',
    answer: 'myth',
    explain:
      'A chatbot writes what sounds right, and sometimes that is a made-up fact. This is called a hallucination. One research paper argues that models guess when they are unsure, because the way they are trained and tested rewards guessing.',
    source: { label: 'Why Language Models Hallucinate (arXiv, 2025)', url: 'https://arxiv.org/abs/2509.04664' },
  },
  {
    id: 'turing',
    statement: 'In a 2025 study, people chatted for five minutes and picked a chatbot as the human more often than the real human.',
    answer: 'fact',
    explain:
      'It happened in one study, with one chatbot (GPT-4.5) that had been told to act like a young person. Without that instruction, it was picked less often than the real human. The chats were short, and fooling people in a quick chat does not show that the chatbot understands anything.',
    source: { label: 'Large Language Models Pass the Turing Test (Jones and Bergen, arXiv, 2025)', url: 'https://arxiv.org/abs/2503.23674' },
  },
  {
    id: 'senses',
    statement: 'A chatbot learned about the world by seeing, touching and tasting it, like you did.',
    answer: 'myth',
    explain:
      'Most of what a chatbot knows came from reading text. Some chatbots now learn from pictures and sound too, but none has grown up with a body in the world. Some researchers argue that text alone cannot give real meaning. Others disagree, so this is still debated.',
    source: { label: 'Climbing towards NLU (Bender and Koller, 2020)', url: 'https://aclanthology.org/2020.acl-main.463/' },
  },
  {
    id: 'jagged',
    statement: 'An AI can do something very hard and still get something that looks easy wrong.',
    answer: 'fact',
    explain:
      'Experts call this “jagged” ability. An international report by more than 100 experts says leading systems can do well on hard tasks yet struggle with some simpler ones, such as counting objects in a picture.',
    source: { label: 'International AI Safety Report 2026: Executive Summary', url: 'https://internationalaisafetyreport.org/publication/2026-report-executive-summary' },
  },
  {
    id: 'eliza',
    statement: 'Back in 1966, a simple program made people feel it understood them.',
    answer: 'fact',
    explain:
      'The program was called ELIZA. It spotted keywords in what you typed and filled in ready-made replies. Some people still felt it understood them, even though its maker, Joseph Weizenbaum, said it did not.',
    source: { label: 'ELIZA (Wikipedia)', url: 'https://en.wikipedia.org/wiki/ELIZA' },
  },
  {
    id: 'learns',
    statement: 'A chatbot learns new things from you while you chat.',
    answer: 'myth',
    explain:
      'Inside one chat, its dials stay the same. It only reads the text in the chat. Some companies may use chats to help train a later version, depending on your settings. Ask a grown-up to check the settings before you chat.',
    source: { label: 'Is my data used for model training? (Anthropic Privacy Center, March 2026)', url: 'https://privacy.claude.com/en/articles/10023580-is-my-data-used-for-model-training' },
  },
  {
    id: 'feelings',
    statement: 'If a chatbot says “I feel happy”, that proves it has feelings.',
    answer: 'myth',
    explain:
      'A chatbot can write “I feel happy” because people write sentences like that. The words alone do not show what, if anything, is going on inside. Scientists and philosophers disagree about the deeper question, so we will not say yes or no here.',
    source: { label: 'The Chinese Room Argument (Stanford Encyclopedia of Philosophy)', url: 'https://plato.stanford.edu/entries/chinese-room/' },
  },
  {
    id: 'future',
    statement: 'Experts disagree about how fast AI will improve over the next few years.',
    answer: 'fact',
    explain:
      'The international expert report says progress could slow down, carry on at the current rate, or speed up, and that this is hard to predict. Be careful with anyone who sounds completely sure.',
    source: { label: 'International AI Safety Report 2026: Executive Summary', url: 'https://internationalaisafetyreport.org/publication/2026-report-executive-summary' },
  },
];

export function isRight(card: Card, guess: Guess): boolean {
  return card.answer === guess;
}

export function score(guesses: Record<string, Guess>): { answered: number; right: number } {
  let right = 0;
  let answered = 0;
  for (const c of CARDS) {
    const g = guesses[c.id];
    if (!g) continue;
    answered += 1;
    if (isRight(c, g)) right += 1;
  }
  return { answered, right };
}
