/*
 * Scenes for "Check it like a detective" in the lesson "Real or fake?".
 *
 * Every scene is invented. No real person, school, shop, website or news story is used, and
 * the component labels each one "Invented example". Nothing here asks the learner to upload
 * or judge a real picture: each scene gives written clues about the SOURCE, because that is
 * what the lesson teaches.
 */

export type ClueId = 'who' | 'elsewhere' | 'feel' | 'label';
export type Rating = 'best' | 'okay' | 'risky';
export type Art = 'creature' | 'cat' | 'school' | 'none';
export type Kind = 'picture' | 'voice' | 'headline' | 'chatbot';

export type Clue = { id: ClueId; ask: string; found: string };
export type Choice = { id: string; text: string; rating: Rating; feedback: string };

export type Scene = {
  id: string;
  kind: Kind;
  /** Where the learner met the item, e.g. "A picture in a group chat". */
  setting: string;
  art: Art;
  /** Alternative text for the picture, or a short description of the item. */
  alt: string;
  /** The words that come with the item: a caption, a transcript, a headline or an answer. */
  text: string;
  /** Who or what the text is, shown above it, e.g. "Caption" or "Voice message (written out)". */
  textLabel: string;
  /** The source card: four things the learner can check. */
  clues: Clue[];
  question: string;
  choices: Choice[];
  /** One line to take away. */
  lesson: string;
  /** True when the item turns out to be fine, so doubting everything is not the point. */
  fine: boolean;
};

export const CLUE_IDS: ClueId[] = ['who', 'elsewhere', 'feel', 'label'];

export const SCENES: Scene[] = [
  {
    id: 'creature',
    kind: 'picture',
    setting: 'A picture in a group chat',
    art: 'creature',
    alt: 'A cartoon drawing of a large green sea creature lying on a school football field.',
    textLabel: 'Caption',
    text: 'HUGE SEA MONSTER found on Greenfield school field this morning. SHARE BEFORE THEY DELETE IT.',
    clues: [
      { id: 'who', ask: 'Who posted it?', found: 'An account called AmazingPics4U, made five days ago. Every post is a shocking picture with no names, places or dates.' },
      { id: 'elsewhere', ask: 'Can I find it somewhere else?', found: 'You search for it. No news site, no school page and nobody you know mentions it. A grown-up helps you try a reverse image search, which starts from a picture instead of words. It finds no older copy and no report.' },
      { id: 'feel', ask: 'How does it make me feel?', found: 'Your heart jumps. It is so exciting that you want to send it to everyone now. That quick feeling is a clue, because posts that thrill or anger us are the ones we pass on without checking.' },
      { id: 'label', ask: 'Is there a label or credential?', found: 'There is no label about how the picture was made. A missing label proves nothing: the picture could be real or fake. It tells you nothing either way.' },
    ],
    question: 'What do you do?',
    choices: [
      { id: 'share', text: 'Share it with my friends now. It is too good to miss.', rating: 'risky', feedback: 'It is a thrilling picture, which is exactly why pictures like this spread. If it is fake, sharing helps it travel. Waiting a minute costs nothing.' },
      { id: 'check', text: 'Wait. Look for a trusted second source, and ask an adult if I am unsure.', rating: 'best', feedback: 'Yes. A brand-new account, no second source and a rush to share all say: not proven. You do not have to decide it is fake. You just do not pass it on yet.' },
      { id: 'zoom', text: 'Zoom in and check the details. If it looks right, it is real.', rating: 'okay', feedback: 'Looking closely is fun and can sometimes help. But AI pictures keep getting better, so one can pass every look test and still be fake. The source tells you more than the pixels.' },
    ],
    lesson: 'Check the source, not just the pixels.',
    fine: false,
  },
  {
    id: 'voice',
    kind: 'voice',
    setting: 'A voice message from an unknown number',
    art: 'none',
    alt: 'A voice message shown as written words.',
    textLabel: 'Voice message, written out. It sounds exactly like your dad.',
    text: '"Hi, it is Dad. My phone broke, so I am using a friend’s. I need you to buy two gift cards right now and read me the numbers. Do not tell Mum, it is a surprise. Quick, please!"',
    clues: [
      { id: 'who', ask: 'Who is it from?', found: 'A number you do not know. The message says Dad has a new number and a friend’s phone, so you cannot match it to anyone.' },
      { id: 'elsewhere', ask: 'Can I check another way?', found: 'Yes. You can ignore the message and ring Dad on the number you already have saved, or ask another family member. The message tells you not to tell Mum, which is a way of stopping you from checking.' },
      { id: 'feel', ask: 'How does it make me feel?', found: 'Rushed and a bit scared. Words like “right now” and “quick” are pressure. People who trick others want you to act before you think.' },
      { id: 'label', ask: 'What about a family safe word?', found: 'If your family has agreed a secret word, you can ask for it. The real Dad would know it. Someone using a copied voice would not.' },
    ],
    question: 'What do you do?',
    choices: [
      { id: 'safe', text: 'Reply and ask for our family safe word before I do anything.', rating: 'okay', feedback: 'A safe word is a good check, and it is what a family code is for. Even better is to stop chatting with the unknown number and ring Dad on the number you know. Tell an adult either way.' },
      { id: 'buy', text: 'Buy the cards. It sounds just like Dad.', rating: 'risky', feedback: 'Voices can be copied by AI from a short recording, so “it sounds like him” is not enough. Asking for gift cards, secrecy and a rush are classic signs of a scam.' },
      { id: 'call', text: 'Send nothing. Ring Dad on the number I already know, and tell another adult.', rating: 'best', feedback: 'Exactly. A number you already trust is a better check than a voice that could be copied. You can also report the message to a grown-up who knows where to report scams.' },
    ],
    lesson: 'A voice can be copied. Check using a number you already know.',
    fine: false,
  },
  {
    id: 'headline',
    kind: 'headline',
    setting: 'A headline someone sent you',
    art: 'none',
    alt: 'A news headline shown as text.',
    textLabel: 'Headline from TownTruthNow.example',
    text: 'SHOCK: Town council to CANCEL all school sports from next week, say sources',
    clues: [
      { id: 'who', ask: 'Who published it?', found: 'The site has no About page, no named writer and no address. Its other headlines are all in capital letters and all shocking.' },
      { id: 'elsewhere', ask: 'Can I find it somewhere else?', found: 'The council’s own website, which you know is real, lists a new football pitch opening next month. No other news site says anything about cancelling. “Say sources” does not tell you which sources.' },
      { id: 'feel', ask: 'How does it make me feel?', found: 'Angry. Headlines written to make us furious are often written to get clicks and shares, not to inform.' },
      { id: 'label', ask: 'Does it show its evidence?', found: 'No document, no quote and no name from the council. A real report usually shows where its facts came from.' },
    ],
    question: 'What do you do?',
    choices: [
      { id: 'check', text: 'Check the council’s own site and one trusted news site first.', rating: 'best', feedback: 'Yes. Leaving the page to see what other trusted places say is called lateral reading. It is what professional fact-checkers do, and it takes a minute or two.' },
      { id: 'share', text: 'Share it and tell everyone to complain.', rating: 'risky', feedback: 'Anger is the push this headline was built to give. If it turns out to be wrong, lots of people will have been upset for nothing.' },
      { id: 'bot', text: 'Ask a chatbot whether it is true.', rating: 'okay', feedback: 'A chatbot may not know today’s local news and can sound sure while wrong. It can help you think of what to check, but it should not be the judge.' },
    ],
    lesson: 'Open a new tab and see what others say.',
    fine: false,
  },
  {
    id: 'chatbot',
    kind: 'chatbot',
    setting: 'A chatbot answer for your school project',
    art: 'none',
    alt: 'A chatbot answer shown as text.',
    textLabel: 'You asked: “Who won the Oakfield School quiz league in 1998?”',
    text: 'The 1998 Oakfield School quiz league was won by the Year 9 team, led by captain Sam Rowe. You can read about it in “A History of Oakfield School” by J. Marsh, page 47.',
    clues: [
      { id: 'who', ask: 'What is giving the answer?', found: 'A chatbot. It writes what sounds likely, one piece at a time. Unless it has a search tool, it cannot look anything up, and it cannot see your school’s records.' },
      { id: 'elsewhere', ask: 'Can I check the source it gave?', found: 'You search for the book. No library, shop or website lists it. Chatbots can make up sources that look real, with names and page numbers.' },
      { id: 'feel', ask: 'How does it make me feel?', found: 'Pleased and relieved. All the detail, a name, a page number, makes it feel trustworthy. But a chatbot sounds just as sure when it is wrong.' },
      { id: 'label', ask: 'What if I ask again?', found: 'You ask the same question in a new chat. This time it names a different team and a different book. Answers that change are a warning sign.' },
    ],
    question: 'What do you do?',
    choices: [
      { id: 'copy', text: 'Copy it into my project. It even has a page number.', rating: 'risky', feedback: 'A page number is not proof. This is how made-up facts end up in homework. The book does not seem to exist.' },
      { id: 'sure', text: 'Ask the chatbot “Are you sure?” and trust it if it says yes.', rating: 'okay', feedback: 'It might just agree to be polite, or change its answer. Its second answer is not a check. Look for the answer outside the chatbot.' },
      { id: 'office', text: 'Look for the book, and ask a teacher or the school office.', rating: 'best', feedback: 'Yes. The school keeps the real records. The chatbot was still useful: it gave you something to check.' },
    ],
    lesson: 'A confident answer is not a checked answer.',
    fine: false,
  },
  {
    id: 'cat',
    kind: 'picture',
    setting: 'A picture on a pet account you follow',
    art: 'cat',
    alt: 'A cartoon drawing of a cat wearing a round astronaut helmet.',
    textLabel: 'Caption',
    text: 'My cat Pixel as an astronaut! Made with an AI picture tool, just for fun.',
    clues: [
      { id: 'who', ask: 'Who posted it?', found: 'A pet account run by a family you know. Its posts are jokes and photos of their pets, and have been for years.' },
      { id: 'elsewhere', ask: 'Can I find it somewhere else?', found: 'There is nothing to find. It is a joke about a pet, and nobody claims it really happened.' },
      { id: 'feel', ask: 'How does it make me feel?', found: 'It makes you smile. Nothing rushes you and nothing makes you angry.' },
      { id: 'label', ask: 'Is there a label or credential?', found: 'The caption says it was made with an AI tool. A small “Made with AI” content credential, the kind of label that can travel with a picture, says the same.' },
    ],
    question: 'What do you do?',
    choices: [
      { id: 'report', text: 'Report it. Anything made with AI is dangerous.', rating: 'okay', feedback: 'Being careful is kind, but this one is honest: a joke, clearly labelled. AI pictures are not bad in themselves. The trouble starts when they are passed off as real.' },
      { id: 'enjoy', text: 'Enjoy it, and keep the label if I share it.', rating: 'best', feedback: 'Yes. Good checking sometimes ends with “this is fine”. Keeping the label when you share means nobody mistakes the joke for a real photo.' },
      { id: 'real', text: 'Share it without the caption, so it looks like a real photo.', rating: 'risky', feedback: 'Taking the label off is how a harmless joke turns into a fake. If you share something made with AI, keep saying so.' },
    ],
    lesson: 'A clear label helps. Keep it when you share.',
    fine: true,
  },
  {
    id: 'school',
    kind: 'picture',
    setting: 'A photo on your school’s own page',
    art: 'school',
    alt: 'A cartoon drawing of a sports field with a running track and a finish banner.',
    textLabel: 'Caption',
    text: 'Sports day at Greenfield Primary. Posted this afternoon by the school office.',
    clues: [
      { id: 'who', ask: 'Who posted it?', found: 'The school’s own page, the one linked from the school website. It has posted for years.' },
      { id: 'elsewhere', ask: 'Can I find it somewhere else?', found: 'Three classmates posted photos from the same sports day, and a parent says it matches. You were there too.' },
      { id: 'feel', ask: 'How does it make me feel?', found: 'Pleased. It is an ordinary post, and nothing is rushing you.' },
      { id: 'label', ask: 'Is there a label or credential?', found: 'A content credential says: taken with a camera, then cropped. That is useful, but it cannot prove the picture is true. The trusted source and your own memory are what settle it.' },
    ],
    question: 'What do you do?',
    choices: [
      { id: 'share', text: 'Share it with my family. The checks all fit.', rating: 'best', feedback: 'Yes. A known source, other people who were there and no rush: everything agrees. Checking does not mean doubting everything.' },
      { id: 'never', text: 'Do not trust it. Nothing online is ever true.', rating: 'okay', feedback: 'Checking is good, but doubting everything is tiring and does not help anyone. Here the source, your classmates and your own memory all agree.' },
      { id: 'caption', text: 'Share it with a funny caption saying our school won everything, even though we did not.', rating: 'risky', feedback: 'Changing what a picture says can turn a true picture into a misleading one. Keep captions honest.' },
    ],
    lesson: 'Good checking can end with “this is fine”.',
    fine: true,
  },
];

export type Answer = { choice: string; looked: ClueId[] };
export type Answers = Record<string, Answer>;

export function choiceOf(scene: Scene, choiceId: string): Choice | undefined {
  return scene.choices.find((c) => c.id === choiceId);
}

export type Summary = {
  answered: number;
  best: number;
  /** Average number of clues opened before deciding, to one decimal place. */
  cluesPerScene: number;
  /** How many scenes were decided after opening at least two clues. */
  lookedFirst: number;
};

export function summarise(answers: Answers, scenes: Scene[] = SCENES): Summary {
  let answered = 0;
  let best = 0;
  let clues = 0;
  let lookedFirst = 0;
  for (const scene of scenes) {
    const a = answers[scene.id];
    if (!a) continue;
    answered++;
    if (choiceOf(scene, a.choice)?.rating === 'best') best++;
    clues += a.looked.length;
    if (a.looked.length >= 2) lookedFirst++;
  }
  return { answered, best, cluesPerScene: answered ? Math.round((clues / answered) * 10) / 10 : 0, lookedFirst };
}
