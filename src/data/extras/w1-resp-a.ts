import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the "resp-a" batch. */
export const extrasW1RespA: Record<string, Extra> = {
  'responsible/when-examples-are-unfair': {
    takeaways: [
      'A computer copies the examples it is given. If they are lopsided, its answers are lopsided too, even though nobody meant it.',
      'Bias can come from missing groups, from labels that copy old unfair choices, and from measuring the wrong thing.',
      'One overall score can hide a group that does badly. Check the results for each group separately.',
      'What helps: more varied examples, testing on everyone, and people in charge of decisions about people.',
    ],
    prereq: ['start/how-computers-learn'],
    quiz: [
      {
        q: 'In the Bias Detective game, the sorter scored well overall but badly on pencil cards. Why?',
        options: ['It disliked pencil cards', 'It had hardly seen any pencil cards in its examples', 'Pencil cards are always harder for computers', 'The test was broken'],
        answer: 1,
        why: 'A computer copies its examples. With almost no pencil cards to learn from, it had no good rule for them.',
      },
      {
        q: 'A school app says it is right 95 times out of 100. What should you ask next?',
        options: ['Nothing, 95 is great', 'How many buttons it has', 'Is it right about as often for every group of students?', 'Who drew the logo'],
        answer: 2,
        why: 'An overall score can hide a smaller group that does much worse, so check each group separately.',
      },
      {
        q: 'In the game, adding more marker cards did not help the pencil cards. What does that show?',
        options: ['More examples always help everyone', 'Pencil cards cannot be learned', 'Marker cards are better', 'The right variety of examples matters, not just the number'],
        answer: 3,
        why: 'More of the same kind of example does not help a group the computer rarely sees. Missing kinds have to be added.',
      },
      {
        q: 'A hiring tool learned from ten years of applications, most from men, and marked down the word "women\'s". Where did the bias come from?',
        options: ['The old examples it learned from', 'The computer wanting to be unfair', 'A broken screen', 'The applicants'],
        answer: 0,
        why: 'The tool copied patterns in past examples. Nobody had to want the result for it to happen.',
      },
    ],
  },
  'responsible/real-or-fake': {
    takeaways: [
      'AI can make pictures, voices and headlines that look real, and clues like odd hands stop being reliable as the tools improve.',
      'Check the source, not the pixels: who posted it, what trusted places say, and how it makes you feel.',
      'Watermarks and content credentials can help, but a missing label proves nothing and a label does not prove something is true.',
      'Pause, check, ask an adult, report. For scam calls in a familiar voice, hang up and ring back on a number you know, or use a family safe word.',
    ],
    prereq: ['start/ai-that-sees-and-hears', 'start/using-ai-without-getting-burned'],
    quiz: [
      {
        q: 'A shocking picture spreads fast. Which check is the most useful?',
        options: ['Count the fingers and look at the shadows', 'See who posted it and whether trusted sites show it too', 'Check how many people liked it', 'Make it bigger on screen'],
        answer: 1,
        why: 'Looking closely can help, but good fakes pass look tests. The source and other trusted places tell you more.',
      },
      {
        q: 'A picture has no content credentials or watermark. What does that tell you?',
        options: ['It is definitely real', 'It is definitely fake', 'Nothing either way', 'It is old'],
        answer: 2,
        why: 'Labels can be removed and many tools never add them, so a missing label proves nothing.',
      },
      {
        q: 'A voice message sounds exactly like your cousin and asks for gift cards right now. What should you do?',
        options: ['Send them, because it is his voice', 'Reply with your address', 'Forward it to your class', 'Ring your cousin on a number you already know and tell an adult'],
        answer: 3,
        why: 'AI can copy voices from short recordings. Asking for gift cards in a hurry is a scam sign, so check another way.',
      },
      {
        q: 'You see a post that makes you really angry within seconds. What is a good first step?',
        options: ['Pause and check before sharing', 'Share it to warn others', 'Comment right away', 'Delete your account'],
        answer: 0,
        why: 'A fast, strong feeling is a clue that the post may be built to be shared, not to inform. Pause first.',
      },
    ],
  },
};
