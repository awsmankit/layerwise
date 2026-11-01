import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "start-b" batch. */
export const extrasW4StartB: Record<string, Extra> = {
  'start/how-feeds-and-search-decide': {
    takeaways: [
      'Search first matches pages to your words, then ranks them so the most useful come first.',
      'A feed guesses what you will enjoy, gives every post a score, and sorts by that score. Different people get different feeds.',
      'Signals such as likes, watch time and who you follow feed the score. Companies keep their exact recipes private.',
      'A feed can narrow into a filter bubble. You can steer it with “Not interested”, clearing history, asking why, searching on purpose and looking outside the app.',
    ],
    prereq: ['start/how-computers-learn'],
    quiz: [
      { q: 'What are the two jobs a search engine does with your words?', options: ['Match pages to your words, then rank them', 'Delete old pages, then print new ones', 'Ask a friend, then guess', 'Copy your words, then send them back'], answer: 0, why: 'Matching finds pages that fit; ranking puts the most useful ones first.' },
      { q: 'In the feed builder you liked another football post and switched on “What you liked before”. What happened?', options: ['Football posts dropped to the bottom', 'The top of the feed filled up with football and gaming posts', 'The ad disappeared', 'Nothing changed'], answer: 1, why: 'Posts like the ones you liked get a higher score, so they crowd the top of the feed.' },
      { q: 'What is a filter bubble?', options: ['A setting that blocks every ad', 'A special bubble-shaped video', 'A feed that mostly shows things like what you already liked', 'A fast way to search'], answer: 2, why: 'When a feed keeps showing similar things, other ideas and topics become hard to find.' },
      { q: 'Which of these helps you take back control of a video feed?', options: ['Watching the same thing again and again', 'Never looking at the settings', 'Liking every post you see', 'Using “Not interested” and clearing your watch history'], answer: 3, why: 'Telling the app what you do not want, and clearing history, changes the signals it uses.' },
      { q: 'How can you tell a post is an ad?', options: ['It has a label such as “Ad” or “Sponsored”', 'It is always the newest post', 'It is always from a friend', 'It has the most likes'], answer: 0, why: 'Apps are meant to label ads, because a company paid to show them and you did not ask for them.' },
    ],
  },
  'start/does-ai-understand': {
    takeaways: [
      'People mean different things by “understand” and “intelligent”, so “does AI understand?” has no single answer. Ask what it can do and where it fails.',
      'The Turing test is a chat game: can people tell a machine from a human? Sounding human is not proof of understanding.',
      'A chatbot learned mostly from text, can sound sure while wrong, and can fail at things that look easy.',
      'Whether a chatbot feels anything is argued about by scientists. If someone asks “is it alive?”, the calm answer is no: it is a computer program.',
    ],
    prereq: ['start/how-a-chatbot-answers'],
    quiz: [
      { q: 'What did Alan Turing do with the question “can a machine think?”', options: ['He answered yes', 'He swapped it for a chatting game you can actually play', 'He built a chatbot', 'He said it must never be asked'], answer: 1, why: 'He thought the question was too vague, so he suggested the imitation game instead.' },
      { q: 'ELIZA, from 1966, made some people feel it understood them. How did it work?', options: ['It read millions of books', 'It looked at their faces', 'It spotted keywords and filled in ready-made replies', 'It was a person typing in secret'], answer: 2, why: 'ELIZA used simple keyword rules, yet people still felt understood. Sounding clever is not proof.' },
      { q: 'A chatbot says “I feel happy”. What does that prove?', options: ['It has feelings', 'It is alive', 'It was built last year', 'Only that it wrote words like the ones people write'], answer: 3, why: 'The words alone do not show what, if anything, is inside. Scientists still argue about that deeper question.' },
      { q: 'Does a chatbot learn new things from you during one chat?', options: ['No, its dials stay the same and it only reads the chat text', 'Yes, it changes itself with every message', 'Yes, but only on Fridays', 'It forgets everything within a second'], answer: 0, why: 'Inside one chat, its dials do not change. Some companies may use chats to train later versions, so check the settings.' },
    ],
  },
};
