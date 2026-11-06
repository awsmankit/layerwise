/**
 * What if we do not split documents into chunks? A small deterministic experiment.
 * One short handbook is cut into fixed-size pieces (counted in words), each piece is scored against a question by
 * how many of the question's words it contains, and the best pieces are packed into a small prompt budget.
 * Success means the whole answer sentence reaches the model. Real documents are thousands of times longer and real
 * retrievers score with embeddings; the shape of the result (too big buries, too small cuts) is what carries over.
 */

export const SENTENCES: string[] = [
  'The Helio thermostat connects to your home wifi network and to the Helio phone app.',
  'Setup takes about ten minutes and needs a screwdriver and the free app.',
  'Turn off the power at the breaker before you remove the old thermostat.',
  'Label each wire with the sticker pack so you can match the terminals later.',
  'Mount the backplate level on the wall and push the wires through the centre hole.',
  'Press the display onto the backplate until it clicks into place.',
  'The display shows the room temperature and the target temperature in large digits.',
  'Turn the outer ring to raise or lower the target temperature by half a degree.',
  'Schedules let you set a different target temperature for every hour of the week.',
  'Away mode lowers the heating when the phone app notices that everyone has left home.',
  'To reset the thermostat to factory settings, hold the ring down for twelve seconds.',
  'After a reset you must pair the thermostat with the phone app again.',
  'The battery backup keeps the clock running for up to three hours during a power cut.',
  'A flashing orange light on the display means the heating system has reported a fault.',
  'A steady green light on the display means the thermostat is connected and working.',
  'You can pair up to six room sensors with a single thermostat at the same time.',
  'Each room sensor runs on one small battery that lasts about two years.',
  'Place sensors away from windows and radiators so that they read the true room temperature.',
  'The warranty lasts two years and covers faulty parts but not damage caused by water.',
  'To make a warranty claim, send the order number and a photo of the thermostat to support.',
  'Software updates arrive over wifi at night and never change your saved schedules.',
  'Clean the display with a dry cloth and never spray liquid directly onto the ring.',
];

/** The example questions. `answer` is the index of the sentence that answers it. */
export const QUESTIONS: { id: string; text: string; answer: number }[] = [
  { id: 'setup', text: 'How long does setup take?', answer: 1 },
  { id: 'reset', text: 'How long do I hold the ring to reset the thermostat?', answer: 10 },
  { id: 'light', text: 'What does an orange light on the display mean?', answer: 13 },
  { id: 'sensors', text: 'How many room sensors can I pair with one thermostat?', answer: 15 },
  { id: 'warranty', text: 'What does the warranty cover?', answer: 18 },
];

/** How many words of retrieved text fit in the prompt. An example, scaled down with the handbook. */
export const BUDGET = 60;

/** The chunk sizes (in words) the slider steps through. */
export const SIZES = [3, 5, 8, 12, 16, 20, 25, 30, 40, 60, 80, 120] as const;

const STOP = new Set('a an the is are my your you we of in to if and can i me for with our it how do does what when on at by or that this be has have so'.split(' '));

/** Crude stemming: drop a final s, so "sensors" matches "sensor". */
export function stem(w: string): string {
  return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
}

export const WORDS: string[] = SENTENCES.flatMap((s) => s.split(/\s+/));
const NORM = WORDS.map((w) => stem(w.toLowerCase().replace(/[^a-z0-9]/g, '')));
/** Which sentence each word belongs to. */
export const SENTENCE_OF: number[] = SENTENCES.flatMap((s, i) => s.split(/\s+/).map(() => i));

/** Word range [start, end) of one sentence. */
export function sentenceRange(i: number): [number, number] {
  return [SENTENCE_OF.indexOf(i), SENTENCE_OF.lastIndexOf(i) + 1];
}

export function keywords(question: string): string[] {
  return [
    ...new Set(
      question
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w && !STOP.has(w))
        .map(stem),
    ),
  ];
}

/** Split the handbook into pieces of `size` words. A size at or above the length of the handbook gives one piece. */
export function chunkRanges(size: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < WORDS.length; i += size) out.push([i, Math.min(WORDS.length, i + size)]);
  return out;
}

/** A piece's score: how many different question words it contains, divided by the square root of its length. */
export function chunkScore(range: [number, number], kw: string[]): number {
  const set = new Set(NORM.slice(range[0], range[1]));
  return kw.filter((k) => set.has(k)).length / Math.sqrt(range[1] - range[0]);
}

export type Outcome = {
  size: number;
  chunks: [number, number][];
  /** Word ranges that were sent to the model, best piece first. */
  sent: [number, number][];
  wordsSent: number;
  /** True if the whole answer sentence is in what was sent. */
  ok: boolean;
  /** Why it failed: the answer sentence is split by a cut, the wrong piece won, or it sits where the budget runs out. */
  reason: 'ok' | 'cut' | 'missed' | 'buried';
  /** Share of the words in the pieces that hold the answer sentence that are the answer itself (the rest is padding). */
  focus: number;
  /** Indices of the chunks that were sent. */
  sentChunks: number[];
};

/** Run one question at one chunk size: score the pieces, pack the best ones into the budget, check the answer. */
export function retrieve(questionIndex: number, size: number, budget = BUDGET): Outcome {
  const q = QUESTIONS[questionIndex];
  const kw = keywords(q.text);
  const chunks = chunkRanges(size);
  const order = chunks
    .map((r, ci) => ({ r, ci, s: chunkScore(r, kw) }))
    .sort((a, b) => b.s - a.s || a.ci - b.ci);
  const sent: [number, number][] = [];
  const sentChunks: number[] = [];
  let used = 0;
  for (const c of order) {
    if (used >= budget) break;
    const len = Math.min(c.r[1] - c.r[0], budget - used);
    sent.push([c.r[0], c.r[0] + len]);
    sentChunks.push(c.ci);
    used += len;
  }
  const [a, b] = sentenceRange(q.answer);
  const covered = (i: number) => sent.some(([x, y]) => i >= x && i < y);
  let ok = true;
  for (let i = a; i < b; i++) if (!covered(i)) ok = false;
  const spansBoundary = chunks.some(([x]) => x > a && x < b);
  const reason: Outcome['reason'] = ok ? 'ok' : size >= budget ? 'buried' : spansBoundary ? 'cut' : 'missed';
  const holders = chunks.filter(([x, y]) => x < b && y > a);
  const holderWords = holders.reduce((n, [x, y]) => n + (y - x), 0);
  return { size, chunks, sent, wordsSent: used, ok, reason, focus: (b - a) / holderWords, sentChunks };
}

/** How many of the example questions get their whole answer to the model at this chunk size. */
export function successCount(size: number, budget = BUDGET): number {
  return QUESTIONS.filter((_, i) => retrieve(i, size, budget).ok).length;
}
