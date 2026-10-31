/**
 * "Prompt makeover": a vague prompt gains building blocks, and a pre-written
 * example answer changes to match. Nothing here calls a model. The answers are
 * written by hand so the demo is safe, free and works offline.
 */
export type Block = 'what' | 'who' | 'shape' | 'example' | 'steps';

export const BLOCKS: { id: Block; label: string; hint: string; add: string }[] = [
  { id: 'what', label: 'Say the task', hint: 'What exactly do you want?', add: 'Explain why volcanoes erupt.' },
  { id: 'who', label: 'Say who it is for', hint: 'Your age, or what you already know.', add: 'I am 11 and I have not learned this yet.' },
  { id: 'shape', label: 'Ask for a shape and length', hint: 'How long, and in what form?', add: 'Use five short sentences.' },
  { id: 'example', label: 'Ask for an everyday example', hint: 'Something from home or school.', add: 'Compare it to something from home.' },
  { id: 'steps', label: 'Ask it to check you', hint: 'Questions, one at a time.', add: 'Then ask me two questions, one at a time, to see if I understood.' },
];

export const VAGUE = 'volcanoes';

export function buildPrompt(on: Block[]): string {
  const has = (b: Block) => on.includes(b);
  const parts: string[] = [has('what') ? BLOCKS[0].add : VAGUE];
  for (const b of BLOCKS.slice(1)) if (has(b.id)) parts.push(b.add);
  return parts.join(' ');
}

/** How many of the five building blocks are in the prompt. */
export function strength(on: Block[]): number {
  return BLOCKS.filter((b) => on.includes(b.id)).length;
}

/* ---------- canned answers (all written by hand) ---------- */

const BROAD_PLAIN = [
  'Volcanoes are openings in the Earth’s crust where molten rock, ash and gases escape.',
  'There are several types, including shield volcanoes, stratovolcanoes and calderas.',
  'Most form where tectonic plates meet or pull apart, and some form over hotspots.',
  'Scientists describe eruption size with the Volcanic Explosivity Index.',
  'Famous eruptions include Vesuvius in 79 AD and Krakatoa in 1883.',
  'Volcanoes can bring hazards such as ash clouds, lava flows and pyroclastic flows.',
];
const BROAD_SIMPLE = [
  'A volcano is a place where hot, melted rock comes up out of the ground.',
  'Some are tall cone-shaped mountains and some are wide and flat.',
  'Many sit where the huge slabs that make up the Earth’s surface push together or pull apart.',
  'When one erupts, it can throw out ash, gas and lava.',
  'Vesuvius, in Italy, erupted long ago and buried the town of Pompeii.',
  'Scientists watch volcanoes closely to warn people if one might erupt.',
];
const WHY_PLAIN = [
  'Volcanoes erupt because magma, which is molten rock underground, is lighter than the rock around it, so it rises.',
  'Magma contains dissolved gases, which stay squashed inside while the pressure is high.',
  'As the magma rises, the pressure drops and the gas forms bubbles.',
  'If the bubbles can escape easily, the lava flows out fairly gently.',
  'If they cannot, pressure builds until the magma bursts out as ash, gas and rock.',
  'The thicker and stickier the magma is, the harder it is for gas to escape, so those eruptions can be more explosive.',
  'After an eruption the pressure is released and the volcano can go quiet again, sometimes for a very long time.',
];
const WHY_SIMPLE = [
  'A volcano erupts because hot melted rock under the ground is lighter than the rock around it, so it floats upwards.',
  'That melted rock is called magma, and it has gas squashed inside it.',
  'As the magma rises, the squashing stops and the gas turns into bubbles.',
  'If the gas can get out easily, the lava just flows out.',
  'If the gas is stuck, it pushes harder and harder until the volcano blows its top.',
  'Thick, sticky magma traps gas best, so it makes the biggest bangs.',
  'When the pressure is gone, the volcano goes quiet again.',
];
const ANALOGY =
  'Think of a fizzy drink: the bubbles stay hidden while the bottle is shut, but shake it and open it, and the gas rushes out and pushes the drink with it.';
const QUESTIONS = ['Question 1: Why do bubbles form only when the magma has risen near the surface?', '(Reply when you are ready, and I will ask the second question.)'];

export type Answer = { sentences: string[]; length: 'long' | 'short' };

/** Pick the pre-written answer that matches the blocks the learner has ticked. */
export function cannedAnswer(on: Block[]): Answer {
  const has = (b: Block) => on.includes(b);
  const simple = has('who');
  const pool = has('what') ? (simple ? WHY_SIMPLE : WHY_PLAIN) : simple ? BROAD_SIMPLE : BROAD_PLAIN;
  // a length request keeps it to five sentences; otherwise the answer rambles on
  let sentences = has('shape') ? pool.slice(0, 5) : pool.slice();
  if (has('example')) {
    // the fizzy-drink picture only makes sense for the "why" answer; with a vague prompt it still helps, so tack it on
    sentences = has('shape') ? [...sentences.slice(0, 4), ANALOGY] : [...sentences.slice(0, 3), ANALOGY, ...sentences.slice(3)];
  }
  if (has('steps')) sentences = [...sentences, ...QUESTIONS];
  return { sentences, length: has('shape') ? 'short' : 'long' };
}

export function wordCount(a: Answer): number {
  return a.sentences.join(' ').split(/\s+/).filter(Boolean).length;
}

/** One plain sentence on what the last block added, for the learner. */
export function whatChanged(b: Block): string {
  switch (b) {
    case 'what':
      return 'It now answers the question you meant, not a general tour of volcanoes.';
    case 'who':
      return 'The words are simpler, because it knows who is reading.';
    case 'shape':
      return 'It stops at five short sentences instead of going on.';
    case 'example':
      return 'It adds a picture from everyday life, which helps ideas stick.';
    case 'steps':
      return 'It asks you questions, so you do some thinking too. That is how you learn.';
  }
}
