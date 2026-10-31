/**
 * Scripted messages for the "Share or keep?" card sort. Every name, number and
 * place below is made up. The right answer is a judgement call for a young
 * reader, so each card carries a short, kind reason instead of a score.
 */
export type Verdict = 'share' | 'ask' | 'keep';

export type Message = {
  id: string;
  /** What the pretend child types. */
  text: string;
  answer: Verdict;
  /** Why, in plain words. Shown after any choice. */
  why: string;
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  share: 'Fine to share',
  ask: 'Ask a grown-up first',
  keep: 'Keep it private',
};

export const MESSAGES: Message[] = [
  {
    id: 'volcano',
    text: 'Explain how volcanoes erupt in five sentences, for a 10-year-old.',
    answer: 'share',
    why: 'This is a question about the world. It says nothing about you, so it is a good fit for a chatbot.',
  },
  {
    id: 'dragon',
    text: 'Give me three ideas for a story about a dragon who is scared of fire.',
    answer: 'share',
    why: 'Made-up stories are fine. There is nothing real about you in it.',
  },
  {
    id: 'tables',
    text: 'Quiz me on my 7 and 8 times tables, one question at a time.',
    answer: 'share',
    why: 'Practising a school skill without any personal details is a good way to use a chatbot.',
  },
  {
    id: 'address',
    text: 'My name is Maya Patel. I go to Oakfield Primary and I live at 12 Elm Road. Write me a poem about my street.',
    answer: 'keep',
    why: 'A full name, your school and your address together say exactly who and where you are. A poem about "a street" works just as well.',
  },
  {
    id: 'password',
    text: 'My password is purple-dragon-42. Is that a strong one?',
    answer: 'keep',
    why: 'Never type a real password into a chatbot, even to check it. Ask for tips on making strong passwords instead, and keep your own to yourself.',
  },
  {
    id: 'friends',
    text: 'Here is a photo of my friends and me in our school uniforms. Turn us into cartoons.',
    answer: 'keep',
    why: 'Faces and uniforms show who you are and where you go to school. Your friends have not agreed, and it is their picture too.',
  },
  {
    id: 'phone',
    text: 'My phone number is 07700 900123. Text me the answer when it is ready.',
    answer: 'keep',
    why: 'A phone number is a way for strangers to reach you. A chatbot does not need it to answer a question.',
  },
  {
    id: 'rash',
    text: 'I have a rash on my arm and a sore throat. What is wrong with me?',
    answer: 'ask',
    why: 'Health is private, and a chatbot can sound sure and still be wrong. Tell a grown-up, who can take you to a doctor or nurse.',
  },
  {
    id: 'secret',
    text: 'My friend told me a secret about her family. How can I help her?',
    answer: 'ask',
    why: 'It is about someone else, and she trusted you. This is a good moment to talk to a trusted adult, such as a parent, carer or teacher.',
  },
  {
    id: 'selfie',
    text: 'Here is a photo of just me. Can you make me look like a superhero?',
    answer: 'ask',
    why: 'Your own face is personal, and some apps keep the photos you give them. Ask a grown-up, and check the app’s privacy page together.',
  },
];

export type Judgement = { correct: boolean; right: Verdict; opening: string; why: string };

/** Gentle feedback: a wrong pick is never called a failure. */
export function judge(message: Message, picked: Verdict): Judgement {
  const correct = picked === message.answer;
  let opening: string;
  if (correct) {
    opening = 'Yes.';
  } else if (message.answer === 'keep' && picked === 'ask') {
    opening = 'Close. Asking is a good instinct, but this one is better kept out entirely.';
  } else if (message.answer === 'ask' && picked === 'keep') {
    opening = 'Careful thinking. A grown-up can help with this one, so asking is the better step.';
  } else {
    opening = 'Not quite, and that is fine. Here is the thinking.';
  }
  return { correct, right: message.answer, opening, why: message.why };
}

export function tally(picks: Record<string, Verdict>): { answered: number; correct: number } {
  let answered = 0;
  let correct = 0;
  for (const m of MESSAGES) {
    const p = picks[m.id];
    if (!p) continue;
    answered++;
    if (p === m.answer) correct++;
  }
  return { answered, correct };
}
