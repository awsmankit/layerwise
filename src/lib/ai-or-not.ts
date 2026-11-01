/**
 * "AI or not?": twelve everyday things sorted into "usually AI" (a model that
 * learned from examples) and "usually plain rules" (fixed steps that a person
 * wrote). Real products differ, so every answer says "usually" and the
 * feedback names what would change it.
 */
export type Kind = 'ai' | 'rules';

export type Thing = {
  id: string;
  /** What the learner sees. */
  name: string;
  usually: Kind;
  /** What is going on inside, in one or two short sentences. */
  why: string;
  /** What data goes in. */
  data: string;
};

export const KIND_LABEL: Record<Kind, string> = {
  ai: 'Usually AI',
  rules: 'Usually plain rules',
};

export const THINGS: Thing[] = [
  {
    id: 'face',
    name: 'Unlocking a phone with your face',
    usually: 'ai',
    why: 'A neural network turns what the camera sees into numbers and compares them with the numbers it saved when you set up your face. It can adapt to changes such as growing a beard.',
    data: 'A depth map and an infrared picture of your face.',
  },
  {
    id: 'maps',
    name: 'A maps app guessing how long a trip will take',
    usually: 'ai',
    why: 'It learns patterns from past traffic to predict what the roads will be like later, not only right now.',
    data: 'Live traffic on each road, and what traffic was like before.',
  },
  {
    id: 'spam',
    name: 'An email app hiding spam',
    usually: 'ai',
    why: 'A model learned from huge numbers of emails that people marked as spam or not spam. When you press “report spam”, you help it learn.',
    data: 'The text and details of emails, and which ones people marked as spam.',
  },
  {
    id: 'voice',
    name: 'A phone that wakes up when you say its wake phrase, such as “Hey Siri”',
    usually: 'ai',
    why: 'A small neural network listens all the time for the sounds of one phrase. It was trained on recordings to tell those sounds from everything else.',
    data: 'The sound of your voice, turned into numbers by the microphone.',
  },
  {
    id: 'photos',
    name: 'Searching your photos for “dog”',
    usually: 'ai',
    why: 'A model that learned from lots of labelled pictures guesses what is in each photo, so you do not have to tag them yourself.',
    data: 'The photos themselves.',
  },
  {
    id: 'subtitles',
    name: 'Automatic subtitles on a video',
    usually: 'ai',
    why: 'A speech-recognition model turns sound into words. It can get names, accents and noisy rooms wrong, so the subtitles need checking.',
    data: 'The sound of the video.',
  },
  {
    id: 'shop',
    name: '“You might also like” suggestions in a shop or video app',
    usually: 'ai',
    why: 'A model looks for patterns in what people click on, buy or watch, and guesses what you will like next.',
    data: 'What you and many other people clicked, bought or watched.',
  },
  {
    id: 'chatbot',
    name: 'A chatbot that answers your questions',
    usually: 'ai',
    why: 'A large language model learned from a huge amount of writing and now guesses a good reply, one small piece at a time.',
    data: 'Your message, plus the writing it learned from during training.',
  },
  {
    id: 'thermostat',
    name: 'A home thermostat that keeps a room at 20 degrees',
    usually: 'rules',
    why: 'One fixed rule: if the room is colder than the setting, switch the heating on. It never learns anything, which is called plain automation. Some newer “smart” thermostats do learn your habits, so it depends on the product.',
    data: 'One number from a temperature sensor.',
  },
  {
    id: 'washer',
    name: 'The “cotton 40 degrees” programme on a washing machine',
    usually: 'rules',
    why: 'A programme is a fixed list of steps: fill, heat, spin, rinse. Some machines use sensors to adjust a step, but that is still rules a person wrote. Some makers sell machines with “AI” in the name, so check what it really learns.',
    data: 'Which programme you chose, and readings from simple sensors.',
  },
  {
    id: 'arm',
    name: 'A robot arm welding cars in a factory',
    usually: 'rules',
    why: 'It is a robot, because it moves in the real world. But it usually repeats moves that a person programmed, so it is automation, not AI. A robot is a body, and AI is a way of deciding.',
    data: 'Its programmed path, and sometimes a sensor to check the car is in place.',
  },
  {
    id: 'game',
    name: 'The computer player in a game of noughts and crosses',
    usually: 'rules',
    why: 'It can try every move and every reply, then pick one that cannot lose. That is search with rules, with no learning. Some modern game characters and champion Go programs do learn, so it depends on the game.',
    data: 'The squares on the board.',
  },
];

export function thingById(id: string): Thing {
  const t = THINGS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown thing: ${id}`);
  return t;
}

export function isCorrect(t: Thing, pick: Kind): boolean {
  return t.usually === pick;
}

export function score(picks: Record<string, Kind>): { answered: number; correct: number } {
  let answered = 0;
  let correct = 0;
  for (const t of THINGS) {
    const p = picks[t.id];
    if (!p) continue;
    answered += 1;
    if (isCorrect(t, p)) correct += 1;
  }
  return { answered, correct };
}
