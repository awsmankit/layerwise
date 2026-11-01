import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "start-a" batch. */
export const extrasW4StartA: Record<string, Extra> = {
  'start/a-short-history-of-ai': {
    takeaways: [
      'People have worked on AI for more than 70 years, from Turing’s 1950 question to the 1956 Dartmouth summer that named the field.',
      'Early AI mostly used rules that people wrote by hand. Later AI mostly learns its rules from examples.',
      'Twice, hopes ran ahead of results and money dried up. Those quiet times are called AI winters.',
      'Lots of data, fast graphics chips and better methods made deep learning work around 2012. Transformers (2017) and chatbots (2022) came after.',
    ],
    prereq: ['start/what-is-ai-in-plain-english'],
    quiz: [
      { q: 'What did Alan Turing suggest in 1950?', options: ['A new kind of chess board', 'A game where you chat by typed messages and try to tell a machine from a person', 'A rule for building robot arms', 'The first chatbot app'], answer: 1, why: 'He replaced “can machines think?” with a game you can actually play and test.' },
      { q: 'What is an “AI winter”?', options: ['A cold room where AI computers are kept', 'A yearly contest for AI programs', 'A time when money and interest in AI fell because promises were not met', 'A season when chatbots stop working'], answer: 2, why: 'The name is about funding and trust, which dropped after hopes ran ahead of results.' },
      { q: 'Why were the expert systems of the 1980s hard to keep going?', options: ['Every rule was written and updated by hand, which was costly', 'They learned too quickly', 'They had no rules at all', 'They needed no computer'], answer: 0, why: 'Hand-written rules were costly to keep up to date, and the systems made odd mistakes on unusual questions.' },
      { q: 'Which three things came together around 2010 to help deep learning take off?', options: ['Free phones, smaller keyboards and cheaper paper', 'Fewer examples, slower chips and shorter programs', 'A ban on rules, new laws and bigger screens', 'Lots of data, fast graphics chips and better methods'], answer: 3, why: 'Big sets of examples such as ImageNet, GPUs and deep neural networks together made learning work at scale.' },
    ],
  },
  'start/ai-around-you': {
    takeaways: [
      'Automation follows fixed steps a person wrote. AI uses a model that learned from examples. A robot is a machine that moves.',
      'A robot may or may not have AI inside, and an AI may have no robot body at all.',
      'Sensing is not thinking: a door sensor only passes on a signal, while AI is used when something must be recognised.',
      'Many everyday AI tools use data about you. When you are not sure what is inside something, ask what it learned from and what data it uses.',
    ],
    prereq: ['start/what-is-ai-in-plain-english'],
    quiz: [
      { q: 'A shop door opens when you walk up to it. What is most likely inside?', options: ['A model that recognises your face', 'A sensor and one fixed rule: if something moves, open', 'A chatbot', 'A neural network trained on shop doors'], answer: 1, why: 'The sensor only notices movement. The door does not know who you are or learn anything.' },
      { q: 'A factory robot arm repeats the same programmed welding moves all day. Which sentence fits best?', options: ['It is AI but not a robot', 'It is neither a robot nor AI', 'It is both a robot and AI', 'It is a robot, but usually not AI'], answer: 3, why: 'It moves in the real world, so it is a robot. Programmed moves are automation, not learning.' },
      { q: 'What did a spam filter usually learn from?', options: ['The weather report', 'A timer', 'Emails that people marked as spam or not spam', 'Nothing at all'], answer: 2, why: 'It looked for patterns in many emails that people had already sorted.' },
      { q: 'Why does this lesson say “usually AI” and “usually plain rules”?', options: ['The same kind of thing can be built in different ways, so check what is inside', 'Because AI is never certain about anything', 'Because teachers are not sure of the answers', 'Because rules are hardly ever used'], answer: 0, why: 'A thermostat or washing machine can be a simple rule in one product and a learning system in another.' },
    ],
  },
};
