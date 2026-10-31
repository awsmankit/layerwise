/**
 * A small spam example set, written for the "Your first model" lesson. Every message is
 * made up for teaching and none is a real person's text. Real filters learn from
 * thousands or millions of messages; 46 is just enough to see every step.
 * The lesson, the interactive and the practice lab all use these same lists.
 */
export type Label = 'spam' | 'ham';
export type Row = readonly [text: string, label: Label];

/** The 30 messages the model learns from. */
export const TRAIN: Row[] = [
  ['WIN a FREE prize now, click here', 'spam'],
  ['Congratulations, you have won a free gift card', 'spam'],
  ['Claim your free reward today', 'spam'],
  ['URGENT: your account is locked, click this link', 'spam'],
  ['Free entry to win cash, reply now', 'spam'],
  ['You are a winner, claim your prize now', 'spam'],
  ['Cheap deals, buy now and save big', 'spam'],
  ['Click here for a free phone upgrade', 'spam'],
  ['Limited offer: win cash, act now', 'spam'],
  ['Your parcel is waiting, pay the fee at this link', 'spam'],
  ['Get paid to play games, sign up free', 'spam'],
  ['Final warning: claim your cash prize today', 'spam'],
  ['Exclusive deal just for you, buy now', 'spam'],
  ['Win a brand new console, enter now', 'spam'],
  ['Are you coming to football practice today?', 'ham'],
  ['Can you send me the maths homework?', 'ham'],
  ['Dinner is ready, come down please', 'ham'],
  ['I will be home at five, see you soon', 'ham'],
  ['Happy birthday, hope you have a great day', 'ham'],
  ['Do you want to play games after school?', 'ham'],
  ['Mum says you can stay over on Saturday', 'ham'],
  ["The match starts at three, don't be late", 'ham'],
  ['Thanks for the lift, see you tomorrow', 'ham'],
  ['Can you bring your charger to school?', 'ham'],
  ['Did you finish the science project?', 'ham'],
  ['Meeting moved to Friday, same room', 'ham'],
  ['Let me know when you get there', 'ham'],
  ['Bring a coat, it might rain later', 'ham'],
  ['Great goal in the match yesterday', 'ham'],
  ['Your library book is due back on Monday', 'ham'],
];

/** The 12 messages kept back for testing. The model never learns from these. */
export const TEST: Row[] = [
  ['Win a free ticket, click now', 'spam'],
  ['You have won a cash prize, claim it today', 'spam'],
  ['Cheap phone deals just for you', 'spam'],
  ['Earn money from home, no experience needed', 'spam'],
  ['Please confirm your bank details at this link', 'spam'],
  ['Your prize is waiting, reply to claim it', 'spam'],
  ['Are you free to play games now?', 'ham'],
  ['I won a prize at the school fair', 'ham'],
  ['Football practice is moved to Monday', 'ham'],
  ['Click send when you finish the homework', 'ham'],
  ['Mum says dinner is ready', 'ham'],
  ['Thanks, see you at school tomorrow', 'ham'],
];

/** Four more messages, written after looking at the test mistakes, used in the "improve it" step. */
export const EXTRA: Row[] = [
  ['Make money from home, no experience needed', 'spam'],
  ['Earn cash fast, work from home', 'spam'],
  ['Are you free on Saturday to play football?', 'ham'],
  ['I am free after school, want to play games?', 'ham'],
];

const q = (s: string) => JSON.stringify(s);

/** Python source for a list of rows, such as `train_set = [ ... ]`. */
export function pyList(name: string, rows: Row[]): string {
  return `${name} = [\n${rows.map(([t, l]) => `    (${q(t)}, ${q(l)}),`).join('\n')}\n]\n`;
}
