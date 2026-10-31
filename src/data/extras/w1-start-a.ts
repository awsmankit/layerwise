import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the "start-a" batch. */
export const extrasW1StartA: Record<string, Extra> = {
  'start/three-ways-machines-learn': {
    takeaways: [
      'With labels (supervised learning), the computer learns from examples that come with the right answers.',
      'Without labels (unsupervised learning), it finds groups of similar things by itself, but people still have to name the groups.',
      'With rewards (reinforcement learning), it tries things, gets or loses points, and slowly learns which moves pay off.',
      'Chatbots use all three: they learn from text first, then from people rating their answers as rewards.',
    ],
    prereq: ['start/how-computers-learn'],
    quiz: [
      { q: 'A music app groups songs that sound alike, and nobody has named the groups. Which way of learning is this?', options: ['Without labels', 'With labels', 'With rewards', 'It is not learning'], answer: 0, why: 'Finding groups with no right answers given is learning without labels.' },
      { q: 'A robot tries a maze many times and gets a point for reaching the cheese. What is it doing?', options: ['Learning from labels', 'Learning from rewards by trial and error', 'Grouping similar mazes', 'Copying a person'], answer: 1, why: 'Trying things and learning from points won or lost is learning from rewards.' },
      { q: 'In the groups tab you chose 4 groups instead of 3. What happened?', options: ['The computer refused to run', 'It found the real names', 'One kind of fruit was split into two groups', 'Nothing changed'], answer: 2, why: 'You choose how many groups to look for, and the computer splits things to fit that number.' },
      { q: 'How do people help a chatbot learn after it has read lots of text?', options: ['They retype the internet', 'They turn it off and on', 'They give it a new name', 'They rate its answers, and good ratings act as rewards'], answer: 3, why: 'Ratings from people work as rewards, which nudge the chatbot towards answers people prefer.' },
    ],
  },
  'start/computers-that-decide-and-plan': {
    takeaways: [
      'A computer can decide using rules that a person wrote, like "if it is rainy, take an umbrella". It fails on cases nobody thought of.',
      'A decision tree is a game of 20 questions. A good first question splits the possibilities into two halves that are about equal.',
      'Search means looking ahead: the computer tries every move, every reply, and so on, and picks a move that leads to a win.',
      'None of these needs learning from examples. This is a different kind of AI, and real systems often combine it with learning.',
    ],
    prereq: ['start/what-is-ai-in-plain-english', 'start/how-computers-learn'],
    quiz: [
      { q: 'A rule-based helper has rules for sunny, rainy and cold days. It meets a snowy, warm day. What is likely to happen?', options: ['It works out a new rule itself', 'No rule matches, so it has nothing to say', 'It picks a rule at random', 'It learns from the snow'], answer: 1, why: 'A rule-based helper only knows the rules people wrote, so a case nobody thought of finds no rule.' },
      { q: 'You build a guesser for 7 animals. Which first question is best?', options: ['One that splits the animals into two groups of about equal size', 'One that every animal answers yes to', 'One that only one animal answers yes to', 'Any question, the order never matters'], answer: 0, why: 'An even split removes about half of the animals each time, so fewer questions are needed.' },
      { q: 'The computer in the take-away game is not learning. How does it choose?', options: ['It remembers games you played before', 'It copies your moves', 'It follows a fixed method: check every way the game could go and pick a winning move', 'It asks another computer'], answer: 2, why: 'It uses the same fixed method every time, and no examples or training are involved.' },
      { q: 'Why can a computer not look ahead to the end of a chess game the way it does in the take-away game?', options: ['Chess has no rules', 'Chess is not a game', 'Computers cannot play chess', 'There are far too many possible games, so it can only look a few moves ahead'], answer: 3, why: 'The number of possible chess games is astronomically large, so programs look only a few moves ahead and score the positions.' },
    ],
  },
};
