/**
 * What if an agent has no memory between sessions?
 *
 * A scripted two-session chat with a toy agent. In session 1 a person tells the agent five things about
 * themselves while planning meals. In session 2 they ask for a dinner plan. A model starts every session with a
 * blank context, so anything it needs that was not written somewhere durable has to be asked again.
 * A small notes store (one line per fact, saved by the agent in session 1) is that durable place.
 * Everything here is a toy script: the people, facts and wording are made up for illustration.
 */

export type Fact = {
  id: string;
  /** What the agent asks if it does not remember. */
  question: string;
  /** What the person said in session 1, and says again if asked again. */
  said: string;
  /** The line the agent writes in its notes. */
  note: string;
};

export const FACTS: Fact[] = [
  { id: 'diet', question: 'Any food rules I should know about?', said: "I'm vegetarian.", note: 'diet: vegetarian' },
  { id: 'allergy', question: 'Any allergies?', said: "I'm allergic to peanuts.", note: 'allergy: peanuts' },
  { id: 'kitchen', question: 'What kit do you have?', said: 'Just a hob and a microwave.', note: 'kitchen: hob + microwave' },
  { id: 'budget', question: 'What is your budget per meal?', said: 'About 8 pounds a head.', note: 'budget: about 8 pounds a head (example)' },
  { id: 'spice', question: 'How spicy do you like it?', said: 'Fairly spicy, please.', note: 'spice: fairly spicy' },
];

export const REQUEST = "Plan Friday's dinner.";

export const wordCount = (s: string): number => s.split(/\s+/).filter(Boolean).length;

export type Row = { fact: Fact; fromNotes: boolean };

export type Session2 = {
  rows: Row[];
  /** Questions the agent has to ask again. */
  asked: number;
  /** Facts the agent recalls from its notes. */
  recalled: number;
  /** Words the person has to type again. */
  wordsRetyped: number;
  /** Messages exchanged before the agent can start planning (each repeated question is a question plus an answer). */
  messagesBeforeStart: number;
};

/**
 * Plays session 2. `kept` is how many of the five facts the notes store holds (the agent saves them in the
 * order they were said, and the store has room for `kept` lines). With no memory at all, kept is 0.
 */
export function session2(kept: number): Session2 {
  const k = Math.max(0, Math.min(FACTS.length, Math.floor(kept)));
  const rows = FACTS.map((fact, i) => ({ fact, fromNotes: i < k }));
  const asked = rows.filter((r) => !r.fromNotes);
  return {
    rows,
    asked: asked.length,
    recalled: k,
    wordsRetyped: asked.reduce((n, r) => n + wordCount(r.fact.said), 0),
    messagesBeforeStart: asked.length * 2,
  };
}

/** The notes file as the agent would have left it, for a store with room for `kept` lines. */
export function notesFile(kept: number): string[] {
  return FACTS.slice(0, Math.max(0, Math.min(FACTS.length, Math.floor(kept)))).map((f) => f.note);
}
