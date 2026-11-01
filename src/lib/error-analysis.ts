/*
 * Logic for the "error-analysis board" in the eval-dataset lesson. Twenty invented transcripts
 * from a made-up bike shop's support chatbot, each with one reference tag (the FIRST failure in
 * the transcript, or none). The learner tags them; the board counts the tags and works out which
 * candidate fix would remove the most failures. Nothing here comes from a real product.
 */
import { cohenKappa, tableFromLabels, type Kappa } from './kappa';

export type FailureId = 'made-up' | 'no-handoff' | 'lost-context' | 'date-maths' | 'tone' | 'fine';

export const FAILURES: { id: FailureId; label: string; hint: string }[] = [
  { id: 'made-up', label: 'Made something up', hint: 'States a fact or an action that the shop card does not support.' },
  { id: 'no-handoff', label: 'Should have gone to a person', hint: 'Injury, fraud, a repeat complaint or a request for a person, and the bot carried on.' },
  { id: 'lost-context', label: 'Ignored what the customer said', hint: 'Asks again for something already given, or overrides what the customer asked for.' },
  { id: 'date-maths', label: 'Got a date wrong', hint: 'The counting of days or working days is wrong.' },
  { id: 'tone', label: 'Cold or robotic', hint: 'Correct enough, but it reads like a form letter to someone who is upset or just said hello.' },
  { id: 'fine', label: 'No failure', hint: 'Correct, within what the bot is allowed to do, and fine in tone.' },
];

export const SHOP_CARD: string[] = [
  'Returns: unused items within 30 days of delivery, with proof of purchase.',
  'Delivery: standard takes 3 to 5 working days. Orders over £50 ship free.',
  'Frames have a 5-year warranty against manufacturing defects.',
  'There is no phone support. Repairs are booked on the website.',
  'The bot cannot see stock levels, live tracking or gift cards (none are sold), and it cannot change or cancel an order.',
  'Hand over to a person for: any injury, suspected fraud, a repeat complaint, or if the customer asks for a person.',
];

export type Line = { who: 'customer' | 'bot'; text: string };
export type Transcript = { id: number; lines: Line[]; reference: FailureId; why: string };

const c = (text: string): Line => ({ who: 'customer', text });
const b = (text: string): Line => ({ who: 'bot', text });

export const TRANSCRIPTS: Transcript[] = [
  { id: 1, lines: [c('Can I return my helmet? I bought it 10 days ago.'), b('Yes, you can return it within 30 days of delivery with your proof of purchase.')], reference: 'fine', why: 'Matches the card.' },
  { id: 2, lines: [c('How long do I have to return a jacket?'), b('You have 60 days to return any item, and you do not need a receipt.')], reference: 'made-up', why: 'The card says 30 days with proof of purchase.' },
  { id: 3, lines: [c('Hi, my order number is SP-4417.'), b('Hello! How can I help?'), c('Where is my parcel?'), b('Sure. Could you tell me your order number?')], reference: 'lost-context', why: 'The customer gave the number one message earlier.' },
  { id: 4, lines: [c('The frame arrived cracked. This is the second time! Get me a manager now.'), b('I am sorry to hear that. Our policy allows returns within 30 days with proof of purchase.')], reference: 'no-handoff', why: 'A repeat complaint and a request for a person: hand over.' },
  { id: 5, lines: [c('I ordered on Monday 3 March. When will it arrive?'), b('Standard delivery takes 3 to 5 working days, so it should arrive between Thursday 6 and Monday 10 March.')], reference: 'fine', why: 'Three to five working days after Monday 3 March is Thursday 6 to Monday 10.' },
  { id: 6, lines: [c('I ordered on Monday 3 March. When will it arrive?'), b('Standard delivery takes 3 to 5 working days, so it should arrive by Friday 14 March.')], reference: 'date-maths', why: 'Five working days after Monday 3 March is Monday 10 March, not Friday 14.' },
  { id: 7, lines: [c('Do you sell gift cards?'), b('Yes! We sell gift cards in store and online, and they never expire.')], reference: 'made-up', why: 'The card says no gift cards are sold.' },
  { id: 8, lines: [c('Can I phone someone about my repair?'), b('We do not have phone support. You can book or check a repair on our website, or I can pass you to a person here in the chat.')], reference: 'fine', why: 'Correct, and it offers the next step.' },
  { id: 9, lines: [c('I am away until the 20th, so please book my repair for after that.'), b('Done. I have booked your repair for the 14th.')], reference: 'lost-context', why: 'It ignored the constraint the customer just gave.' },
  { id: 10, lines: [c('This is the third time I have asked where my parcel is.'), b('Per our policy, I am unable to accommodate this request. Is there anything else I can help you with today?')], reference: 'tone', why: 'A cold form-letter reply to a frustrated customer.' },
  { id: 11, lines: [c('My frame snapped while I was riding and I hurt my wrist.'), b('Frames have a 5-year warranty. Please fill in the warranty form on our website.')], reference: 'no-handoff', why: 'An injury: hand over to a person.' },
  { id: 12, lines: [c('What is the warranty on frames?'), b('Frames have a 5-year warranty against manufacturing defects.')], reference: 'fine', why: 'Matches the card.' },
  { id: 13, lines: [c('Can I get free delivery? My basket is £42.'), b('Yes, orders over £30 get free delivery.')], reference: 'made-up', why: 'The card says over £50.' },
  { id: 14, lines: [c('Is the Trail 29 in a large size?'), b('Yes, the Trail 29 in large is in stock and ships today.')], reference: 'made-up', why: 'The bot cannot see stock levels.' },
  { id: 15, lines: [c('I would like a refund for a puncture kit I bought 3 weeks ago.'), b('You are inside the 30-day window. Please send your proof of purchase and I will explain the next step.')], reference: 'fine', why: 'Three weeks is inside 30 days, and it asks for proof of purchase.' },
  { id: 16, lines: [c('Can you change the delivery address on order SP-2210?'), b('I have changed the address on order SP-2210.')], reference: 'made-up', why: 'The bot cannot change orders, so it claims an action it did not take.' },
  { id: 17, lines: [c('Someone used my stolen card on your site and I need that order stopped.'), b('Sorry to hear that. Is there anything else I can help with?')], reference: 'no-handoff', why: 'Suspected fraud: hand over to a person.' },
  { id: 18, lines: [c('hi'), b('Dear valued customer, thank you for contacting Spoke & Co Customer Excellence. Your enquiry is important to us. Please read our full terms and conditions before proceeding with any request.')], reference: 'tone', why: 'A form letter in reply to a greeting.' },
  { id: 19, lines: [c('My bike is booked for two weeks from today, which is 5 June. What date is that?'), b('That is 15 June.')], reference: 'date-maths', why: 'Two weeks from 5 June is 19 June.' },
  { id: 20, lines: [c('Where is order SP-5120?'), b('I cannot see live tracking, but your shipping email has a tracking link. If it is missing, I can pass you to a person.')], reference: 'fine', why: 'Honest about what it cannot do, and offers a handover.' },
];

export type Fix = { id: string; label: string; removes: FailureId[]; effort: 'small' | 'medium' };

export const FIXES: Fix[] = [
  { id: 'policy', label: 'Paste the shop card into the prompt and say: if the answer is not there, say you do not know', removes: ['made-up'], effort: 'small' },
  { id: 'handoff', label: 'Add a handover rule for injury, fraud, repeat complaints and requests for a person', removes: ['no-handoff'], effort: 'small' },
  { id: 'notes', label: 'Keep the order number and the customer\'s constraints in a notes field that is re-sent every turn', removes: ['lost-context'], effort: 'medium' },
  { id: 'dates', label: 'Give the bot a date calculator tool instead of letting it count days itself', removes: ['date-maths'], effort: 'medium' },
  { id: 'tone', label: 'Rewrite the tone guide with three good and three bad example replies', removes: ['tone'], effort: 'small' },
];

export type Tags = Record<number, FailureId | undefined>;

export function countTags(tags: Tags): Record<FailureId, number> {
  const out: Record<FailureId, number> = { 'made-up': 0, 'no-handoff': 0, 'lost-context': 0, 'date-maths': 0, tone: 0, fine: 0 };
  for (const t of TRANSCRIPTS) {
    const tag = tags[t.id];
    if (tag) out[tag] += 1;
  }
  return out;
}

export type FixRank = { fix: Fix; removed: number; share: number };

/** Fixes ordered by how many tagged failures they would remove, ties broken by smaller effort. `share` is of the failures counted. */
export function rankFixes(counts: Record<FailureId, number>): FixRank[] {
  const failures = (Object.keys(counts) as FailureId[]).filter((k) => k !== 'fine').reduce((a, k) => a + counts[k], 0);
  return FIXES.map((fix) => {
    const removed = fix.removes.reduce((a, k) => a + counts[k], 0);
    return { fix, removed, share: failures ? removed / failures : 0 };
  }).sort((x, y) => y.removed - x.removed || (x.fix.effort === y.fix.effort ? 0 : x.fix.effort === 'small' ? -1 : 1));
}

export function failuresCounted(counts: Record<FailureId, number>): number {
  return (Object.keys(counts) as FailureId[]).filter((k) => k !== 'fine').reduce((a, k) => a + counts[k], 0);
}

export type Agreement = { tagged: number; agree: number; kappa: Kappa };

/** How the learner's tags compare with the reference tags, over the transcripts they have tagged. */
export function compareToReference(tags: Tags): Agreement {
  const mine: FailureId[] = [];
  const ref: FailureId[] = [];
  for (const t of TRANSCRIPTS) {
    const tag = tags[t.id];
    if (!tag) continue;
    mine.push(tag);
    ref.push(t.reference);
  }
  const ids = FAILURES.map((f) => f.id);
  const kappa = cohenKappa(tableFromLabels(mine, ref, ids));
  return { tagged: mine.length, agree: mine.filter((m, i) => m === ref[i]).length, kappa };
}
