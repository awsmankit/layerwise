/**
 * The events on the "short history of AI" timeline. Every date and claim was
 * checked against the sources listed in the lesson (Turing 1950, the 1955
 * Dartmouth proposal, Weizenbaum 1966, IBM's Deep Blue page, the AlexNet paper,
 * the AlphaGo paper, the transformer paper and OpenAI's launch post).
 */
export type Era = 'rules' | 'winter' | 'learning' | 'chat';

export type HistoryEvent = {
  id: string;
  /** Year used for ordering. */
  year: number;
  /** What the learner sees, for example "1973 to about 1980". */
  when: string;
  title: string;
  era: Era;
  /** Exactly two sentences. */
  card: string;
  /** One sentence: what changed because of it. */
  changed: string;
};

export const ERA_LABEL: Record<Era, string> = {
  rules: 'People write the rules',
  winter: 'AI winter',
  learning: 'Computers learn from data',
  chat: 'Chatbots for everyone',
};

export const HISTORY: HistoryEvent[] = [
  {
    id: 'turing',
    year: 1950,
    when: '1950',
    title: 'Turing asks: can machines think?',
    era: 'rules',
    card: 'The British mathematician Alan Turing asked, “Can machines think?” Instead of arguing about the word “think”, he suggested a game: if you chat by typed messages and cannot tell the machine from a person, the machine is doing well.',
    changed: 'A huge question became something people could test.',
  },
  {
    id: 'dartmouth',
    year: 1956,
    when: '1955 and 1956',
    title: 'The Dartmouth summer',
    era: 'rules',
    card: 'In 1955 four scientists wrote a plan for a summer project at Dartmouth College in the USA. Their plan used the words “artificial intelligence”, and a group of researchers met there in 1956.',
    changed: 'AI got a name, and became a field of research with its own goals.',
  },
  {
    id: 'eliza',
    year: 1966,
    when: '1966',
    title: 'ELIZA, the keyword chatbot',
    era: 'rules',
    card: 'Joseph Weizenbaum at MIT built ELIZA, a program that chatted by spotting keywords and answering with rules. It understood nothing, yet it could give people the feeling that someone was listening.',
    changed: 'It showed that sounding clever and being clever are two different things.',
  },
  {
    id: 'lighthill',
    year: 1973,
    when: '1973 to about 1980',
    title: 'Doubts, and the first AI winter',
    era: 'winter',
    card: 'A report for the British government said AI research had not delivered on its big promises. Money for AI then fell in Britain and the USA, and these quiet years are called an “AI winter”.',
    changed: 'Big promises are risky: when results come later than hoped, money and trust leave.',
  },
  {
    id: 'expert',
    year: 1980,
    when: 'The 1980s',
    title: 'Expert systems make money',
    era: 'rules',
    card: 'Companies built “expert systems”, which are long lists of if-then rules written down by human experts. One of them, XCON, helped a computer company pick the parts for customers’ orders, and it was reported to have saved the company tens of millions of dollars.',
    changed: 'AI left the lab and earned money, but every rule had to be written and updated by hand.',
  },
  {
    id: 'winter2',
    year: 1987,
    when: 'Late 1980s into the 1990s',
    title: 'The second AI winter',
    era: 'winter',
    card: 'Expert systems turned out to be costly to keep up to date, and they could make odd mistakes on unusual questions. The market for special AI computers collapsed in 1987, and funding fell again.',
    changed: 'Many researchers turned more to methods that learn from data instead of hand-written rules.',
  },
  {
    id: 'deepblue',
    year: 1997,
    when: '1997',
    title: 'Deep Blue beats the chess champion',
    era: 'learning',
    card: 'IBM’s Deep Blue beat the world chess champion Garry Kasparov, 3½ to 2½, in a six-game match. Its main trick was speed: it looked at about 200 million chess positions every second.',
    changed: 'A computer beat the best human at a famous game, by looking ahead very fast.',
  },
  {
    id: 'imagenet',
    year: 2009,
    when: '2009',
    title: 'ImageNet: a giant pile of labelled photos',
    era: 'learning',
    card: 'A research team shared ImageNet, a collection of photos with labels saying what is in them. It later grew to more than 14 million images, and contests on it became a race to see which program could name objects best.',
    changed: 'Learning needs lots of examples, and now very big sets of examples existed.',
  },
  {
    id: 'alexnet',
    year: 2012,
    when: '2012',
    title: 'AlexNet wins the ImageNet contest',
    era: 'learning',
    card: 'A neural network called AlexNet, trained on graphics chips, won the ImageNet contest. When each program was allowed five guesses per photo, AlexNet missed the right answer 15.3 times in 100, and the runner-up missed 26.2 times in 100.',
    changed: 'Deep learning beat older methods by a wide margin, and many researchers switched to it.',
  },
  {
    id: 'alphago',
    year: 2016,
    when: '2016',
    title: 'AlphaGo beats a Go champion',
    era: 'learning',
    card: 'AlphaGo, from a company called DeepMind, beat Lee Sedol, one of the best Go players in the world, by four games to one. Go has far too many positions to check them all, so AlphaGo used neural networks to pick promising moves.',
    changed: 'Learning, together with search, cracked a game that fast checking alone could not.',
  },
  {
    id: 'transformer',
    year: 2017,
    when: '2017',
    title: 'The transformer',
    era: 'chat',
    card: 'A team of researchers, mostly at Google, published a paper called “Attention Is All You Need”. It described the transformer, a neural network that looks at all the words of a text together and works out which ones matter to each other.',
    changed: 'Transformers were quicker to train on huge amounts of text, and later chatbots were built on them.',
  },
  {
    id: 'chatgpt',
    year: 2022,
    when: '30 November 2022',
    title: 'ChatGPT arrives',
    era: 'chat',
    card: 'On 30 November 2022 the company OpenAI released ChatGPT, a chatbot you could talk to in everyday words. It started as a free “research preview”, so lots of people could try it.',
    changed: 'AI moved from labs and specialist apps to something ordinary people could try by typing.',
  },
];

/** Splits a card into sentences. Quotes such as “Can machines think?” are kept whole. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.?!][”"]?)\s+(?=[A-Z“"])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isInOrder(events: HistoryEvent[]): boolean {
  return events.every((e, i) => i === 0 || events[i - 1].year <= e.year);
}
