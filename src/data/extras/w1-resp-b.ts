import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the "resp-b" batch. */
export const extrasW1RespB: Record<string, Extra> = {
  'responsible/ai-and-your-private-life': {
    takeaways: [
      'What you type goes to a company’s computers. It may be stored, reviewed by people, used to improve the product, or exposed by a mistake.',
      'Settings and rules differ between apps and change over time, so read the privacy page of the app you use.',
      'Keep your full name, school, address, phone number, passwords, photos of people and health worries out of chats.',
      'Test it: would I pin this on the school noticeboard? If not, do not type it. If you are unsure, ask a trusted adult.',
    ],
    prereq: ['start/how-a-chatbot-answers', 'start/using-ai-without-getting-burned'],
    quiz: [
      { q: 'You press send on a chat message. Where does it go?', options: ['It stays on your phone', 'Over the internet to computers run by a company', 'Straight to your teacher', 'Nowhere until you press save'], answer: 1, why: 'Most chat apps send your words to the company that runs the model, which then writes the answer.' },
      { q: 'Which message is the safest to type into a chatbot?', options: ['My password is purple-dragon-42. Is it strong?', 'Here is a photo of my friends in our school uniforms.', 'Explain how volcanoes erupt, for a 10-year-old.', 'My name is Maya Patel and I live at 12 Elm Road.'], answer: 2, why: 'A question about the world says nothing about you, so it passes the noticeboard test.' },
      { q: 'Your friend says a chatbot app never keeps chats. What is the best response?', options: ['Believe her, because friends know best', 'Read the app’s own privacy page, because rules differ between apps and change', 'Assume every app keeps everything forever', 'Ask the chatbot itself and trust its answer'], answer: 1, why: 'Policies vary by product and by settings, so the product’s own page is the place to check.' },
      { q: 'You typed a real password into a chatbot by mistake. What should you do?', options: ['Say nothing and hope', 'Tell a trusted adult, delete the chat, and change the password', 'Type a second password to cancel the first', 'Ask the chatbot to forget it'], answer: 1, why: 'Telling an adult and changing the password fixes the problem. Deleting a chat may not remove every copy.' },
      { q: 'A chatbot seems like a good friend to tell a worrying secret. What is better?', options: ['Tell it everything, since it never judges', 'Talk to a parent, carer, teacher or helpline', 'Tell it half the secret', 'Ask it to keep a promise first'], answer: 1, why: 'A chatbot is a program that cannot keep a promise or really care for you, so a real person is the right choice.' },
    ],
  },
  'responsible/ai-and-school': {
    takeaways: [
      'Use AI as a study buddy that explains, quizzes and checks your thinking, not as a forklift that does the lifting for you.',
      'Schools and teachers have different rules. Check yours before you use AI, and ask if nothing has been said.',
      'Write in your own words, say when you used AI, and check facts in a trusted source, because AI can make things up.',
      'Ask well: a clear task, who it is for, an example or shape, and steps rather than just answers.',
    ],
    prereq: ['start/how-a-chatbot-answers', 'start/using-ai-without-getting-burned'],
    quiz: [
      { q: 'Which is the best study-buddy request?', options: ['Write my book report', 'Quiz me on this week’s spellings, one question at a time', 'Do tonight’s maths homework', 'Write my history essay and make it sound like me'], answer: 1, why: 'Quizzing makes you remember and think, which is the point of homework.' },
      { q: 'Using AI to plan the headings for your project is okay only if...', options: ['Nobody finds out', 'It is always okay', 'Your teacher’s rule allows it', 'The chatbot says it is fine'], answer: 2, why: 'The right answer depends on your teacher’s rules, so check them or ask.' },
      { q: 'A chatbot says a fact for your project and adds "yes, that is correct". What should you do?', options: ['Trust it, since it checked', 'Look the fact up in your textbook or a trusted website', 'Ask it again until it says yes', 'Skip the fact'], answer: 1, why: 'A chatbot cannot check itself, so you check in a book or on a trusted site.' },
      { q: 'Which prompt will most likely give a useful answer?', options: ['volcanoes', 'Explain why volcanoes erupt, for an 11-year-old, in five short sentences, then ask me two questions', 'Tell me everything', 'Do my science'], answer: 1, why: 'It names the task, the reader, the shape and asks for a check, which are the four things that help.' },
      { q: 'Your school asks you to say when you use AI. What is a good note?', options: ['Nothing, nobody checks', 'I used AI to quiz me and check my spelling. I wrote the answers myself.', 'AI did it', 'I did not use any AI, mostly'], answer: 1, why: 'A short honest note says what you used it for and what you did yourself.' },
    ],
  },
  'start/what-is-an-ai-agent': {
    takeaways: [
      'A chatbot only talks. An agent can also use tools, such as a search, a calendar, a calculator or another app.',
      'An agent works in a loop: think about the next step, act with a tool, look at the result, then think again.',
      'Agents can make mistakes with real effects, and they only know what their tools show them.',
      'We give agents limits, such as few tools and a step limit, and a person says yes before important steps.',
    ],
    prereq: ['start/how-a-chatbot-answers', 'start/using-ai-without-getting-burned'],
    quiz: [
      { q: 'What is the main difference between a chatbot and an AI agent?', options: ['An agent is always smarter', 'An agent can also use tools and take actions', 'A chatbot cannot write words', 'An agent never makes mistakes'], answer: 1, why: 'A chatbot only writes words. An agent can also use tools to do things.' },
      { q: 'What are the three steps of the agent loop?', options: ['Sleep, wake, repeat', 'Think, act with a tool, look at the result', 'Ask, answer, stop', 'Read, write, delete'], answer: 1, why: 'The agent thinks, uses a tool, looks at what came back, and then thinks again.' },
      { q: 'In the meeting example, why did the agent pick a time that clashed with Ben’s football?', options: ['It was being unkind', 'The calendar tool only showed what was written in the calendar', 'It could not count', 'It picked at random'], answer: 1, why: 'An agent only knows what its tools show it, and the football was not in the calendar.' },
      { q: 'Which step should an agent ask a person about first?', options: ['Reading a calendar', 'Adding two numbers', 'Sending a message to three friends, which cannot be unsent', 'Thinking about the next step'], answer: 2, why: 'Steps that cannot be undone, or that affect other people, are the ones that need a person to say yes.' },
    ],
  },
};
