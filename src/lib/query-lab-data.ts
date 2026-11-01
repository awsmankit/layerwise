/**
 * An invented help centre for "Brightway", a made-up bike-share, and five scripted questions. The query
 * rewrites, paraphrases, sub-questions and hypothetical answers are written by hand to stand in for what a
 * language model might produce. Nothing here comes from a real product or a real model.
 */

export type Passage = { id: string; title: string; text: string };

export const CORPUS: Passage[] = [
  { id: 'unlock', title: 'Unlock a bike', text: 'Scan the QR code on the handlebar with the Brightway app. The bike unlocks within a few seconds and your trip starts.' },
  { id: 'dock-release', title: 'Bike will not release from the dock', text: 'If the dock does not release the bike, press the green reset button on the dock, wait ten seconds, then scan again. If it still fails, take another bike at the same dock and report the faulty one in the app.' },
  { id: 'end-trip', title: 'Ending a trip', text: 'Push the bike into any dock until the light turns green. The trip is not over until the dock light is green, and the per-minute fee keeps running until then.' },
  { id: 'pay-go', title: 'Pay as you go', text: 'A normal bike costs 1 euro to unlock plus 0.20 euro for every minute you ride.' },
  { id: 'member-price', title: 'Monthly membership', text: 'Membership costs 15 euros a month. Rides of up to 30 minutes are free, and longer rides cost 0.10 euro per minute after that.' },
  { id: 'member-perks', title: 'Why join as a member', text: 'Members can hold a bike for ten minutes, get a free guest pass each month, and take 10 per cent off e-bike rides.' },
  { id: 'ebike-price', title: 'E-bike rides', text: 'An e-bike costs 2 euros to unlock plus 0.30 euro a minute. Pedal assist works up to 25 kilometres an hour.' },
  { id: 'ebike-range', title: 'E-bike range and charge', text: 'A full charge gives about 60 kilometres of assisted riding. The charge level shows on the handlebar display. Staff swap the packs, so riders never do.' },
  { id: 'scooter-battery', title: 'Scooter battery', text: 'If a scooter battery is low, the app warns you before you unlock. Low scooters can be left at any charging zone.' },
  { id: 'phone-battery', title: 'Saving phone battery', text: 'The Brightway app uses little phone battery. Turn off live map updates in Settings to save more.' },
  { id: 'carry', title: 'Carrying things and pets', text: 'You may carry a bag, or a small pet in a closed carrier, in the front basket, up to 10 kilograms. Passengers, including children, may not ride on the bike.' },
  { id: 'night-pass', title: 'Night Pass', text: 'Night Pass gives unlimited rides of up to 30 minutes between 8 pm and 6 am for 4 euros a month. It starts in March.' },
  { id: 'night-safety', title: 'Riding at night', text: 'Bike lights switch on at dusk. Check the lights before you ride.' },
  { id: 'student', title: 'Student discount', text: 'Students get 20 per cent off the monthly membership with a valid student email address.' },
  { id: 'refunds', title: 'Refunds', text: 'A membership payment can be refunded within 14 days of the first payment if you have taken fewer than five rides.' },
  { id: 'fault', title: 'Report a fault', text: 'Tap Report in the app, choose the part (brakes, chain, tyre, lights or charge level) and add a photo. Reported bikes are locked until they are inspected.' },
  { id: 'area', title: 'Where you can ride', text: 'The service area is green on the app map. Ending a trip outside it adds a 5 euro fee.' },
  { id: 'card', title: 'Change your payment card', text: 'Open Account, then Payment, then Add card. Your old card is removed when you add a new one.' },
];

export type Strategy = 'raw' | 'rewrite' | 'multi' | 'split' | 'hyde';
export const STRATEGIES: { id: Strategy; label: string; short: string }[] = [
  { id: 'raw', label: 'As typed', short: 'Raw' },
  { id: 'rewrite', label: 'Rewrite', short: 'Rewrite' },
  { id: 'multi', label: 'Multi-query', short: 'Multi' },
  { id: 'split', label: 'Split into sub-questions', short: 'Split' },
  { id: 'hyde', label: 'HyDE', short: 'HyDE' },
];

export type Scripted = {
  id: string;
  label: string;
  /** Earlier turns of the chat, if any. */
  history?: { who: 'user' | 'assistant'; text: string }[];
  /** The question exactly as the person typed it. */
  question: string;
  /** Passages that actually answer it. */
  gold: string[];
  /** What a model might write for each strategy (scripted). */
  rewrite: string;
  multi: string[];
  split: string[];
  hyde: string;
  note: string;
};

export const QUESTIONS: Scripted[] = [
  {
    id: 'stuck',
    label: 'Stuck bike',
    question: "my bike is stuck and won't let go",
    gold: ['dock-release'],
    rewrite: 'bike does not release from the dock',
    multi: ['bike will not release from the dock', 'dock does not unlock the bike', 'how to free a bike jammed in a docking station'],
    split: ["my bike is stuck and won't let go"],
    hyde: 'If a bike is stuck in the docking station, press the reset button on the dock, wait a few seconds and try to pull the bike out again. If it is still stuck, contact support.',
    note: 'The person says "stuck" and "let go"; the help page says "does not release". A short rewrite in the page\'s own words is enough. Splitting finds nothing to split and returns the question unchanged.',
  },
  {
    id: 'battery',
    label: 'Follow-up: battery',
    history: [
      { who: 'user', text: 'Tell me about the e-bike rides.' },
      { who: 'assistant', text: 'An e-bike costs 2 euros to unlock plus 0.30 euro a minute, with pedal assist up to 25 kilometres an hour.' },
    ],
    question: 'What about the battery?',
    gold: ['ebike-range'],
    rewrite: 'How far does an e-bike go on a full charge, and who swaps the battery?',
    multi: ['e-bike battery range on one charge', 'how long does an e-bike battery last', 'who changes the battery on an e-bike'],
    split: ['How far does an e-bike go on one charge?', 'Who swaps the e-bike battery?'],
    hyde: 'An e-bike battery usually lasts between 50 and 80 kilometres on a full charge, depending on the rider and the hills. Batteries are charged at a depot and swapped by staff.',
    note: '"What about the battery?" means nothing without the chat history. The rewrite uses it. Note that the real answer never says "battery": it says "charge" and "packs".',
  },
  {
    id: 'worth',
    label: 'Worth joining?',
    question: 'Is it worth joining if I ride about twenty times a month?',
    gold: ['pay-go', 'member-price'],
    rewrite: 'Is a monthly membership worth it for a rider who makes twenty trips a month?',
    multi: ['is a monthly membership worth it for regular riders', 'cost of twenty rides pay as you go', 'membership benefits for frequent riders'],
    split: ['What does a monthly membership cost?', 'What does a pay as you go ride cost?'],
    hyde: 'A membership is usually worth it for people who ride often. If you ride twenty times a month, the monthly fee is typically lower than paying for each ride separately, and members also get perks.',
    note: 'The answer needs two facts that sit in two different passages. One search for the whole question tends to find the one about perks; two sub-questions find both prices.',
  },
  {
    id: 'dog',
    label: 'Can I take my dog?',
    question: 'Can I take my dog along?',
    gold: ['carry'],
    rewrite: 'rules for carrying a pet on a bike',
    multi: ['are pets allowed on the bikes', 'carrying a dog in the basket', 'can animals ride along with me'],
    split: ['Can I take my dog along?'],
    hyde: 'Small pets can usually travel in a closed carrier in the front basket of the bike. Passengers and larger animals are not allowed to ride on the bike.',
    note: 'The page says "pet", the person says "dog". Keyword search misses; an embedding-style scorer already knows they are related. A hypothetical answer shares the page\'s vocabulary.',
  },
  {
    id: 'night',
    label: 'New Night Pass price',
    question: 'How much is the new Night Pass?',
    gold: ['night-pass'],
    rewrite: 'Night Pass subscription price per month',
    multi: ['Night Pass price', 'cost of the evening and overnight pass', 'late-night subscription fee'],
    split: ['How much is the new Night Pass?'],
    hyde: 'The new Night Pass is a subscription for evening and overnight riders. It costs about 12 euros a month, students get a discount, and it can be refunded within a few days of buying.',
    note: 'A product the model has never heard of. The hypothetical answer invents details (a price, a student discount, a refund) that pull the search towards other pages. The question as typed was already good.',
  },
];
