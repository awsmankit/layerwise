/**
 * What if a base model is not instruction-tuned?  (A TOY, not a neural network.)
 * Both "models" are word-level next-word predictors built from counts: to pick the next word they look at the
 * longest run of recent words (up to 8) that appears in their training text and take the word that followed it most
 * often. Greedy and deterministic, so the page and the tests always agree.
 *
 *  - The BASE model is trained only on ordinary text: quiz lists, short facts. Its job is "continue the text".
 *  - The TUNED model has the same text plus a few demonstrations of the form "question, then a direct answer, then stop",
 *    counted several times. That mimics only the first step of InstructGPT (training on labeler-written demonstrations);
 *    the paper then also uses human rankings and reinforcement learning, which this toy does not do.
 */

export const START = '<s>';
export const END = '<end>';
export const MAX_CONTEXT = 8;
export const MAX_NEW = 26;
/** How many times each demonstration is counted, compared with once or twice for ordinary text. */
export const DEMO_WEIGHT = 5;

export type Prompt = { id: string; text: string; answerWord: string; answer: string };

export const PROMPTS: Prompt[] = [
  { id: 'capital', text: 'what is the capital of france ?', answerWord: 'paris', answer: 'the capital of france is paris .' },
  { id: 'legs', text: 'how many legs does a spider have ?', answerWord: 'eight', answer: 'a spider has eight legs .' },
  { id: 'sky', text: 'what colour is the sky ?', answerWord: 'blue', answer: 'the sky is blue .' },
];

/** Ordinary text, as found on quiz pages and in fact lists. No document answers a question that was just asked. */
const WEB_DOCS: string[] = [
  'what is the capital of france ? what is the capital of italy ? what is the capital of spain ? what is the capital of germany ?',
  'what is the capital of france ? what is the capital of italy ? what is the capital of spain ? what is the capital of germany ?',
  'how many legs does a spider have ? how many legs does an insect have ? how many legs does a dog have ? how many legs does a bird have ?',
  'how many legs does a spider have ? how many legs does an insect have ? how many legs does a dog have ? how many legs does a bird have ?',
  'what colour is the sky ? what colour is grass ? what colour is a banana ? what colour is snow ?',
  'what colour is the sky ? what colour is grass ? what colour is a banana ? what colour is snow ?',
  'paris is a city in europe . rome is a city in europe . madrid is a city in europe .',
  'a dog is an animal . a spider is an animal . a bird is an animal .',
  'grass grows in the garden . the sea is wide . snow falls in winter .',
];

export type Counts = Map<string, Map<string, number>>;

function addDoc(counts: Counts, doc: string[], weight: number) {
  const seq = [START, ...doc, END];
  for (let i = 1; i < seq.length; i++) {
    for (let n = 1; n <= MAX_CONTEXT && n <= i; n++) {
      const key = seq.slice(i - n, i).join(' ');
      let m = counts.get(key);
      if (!m) counts.set(key, (m = new Map()));
      m.set(seq[i], (m.get(seq[i]) ?? 0) + weight);
    }
  }
}

const words = (s: string) => s.split(' ').filter(Boolean);

export function buildBase(): Counts {
  const c: Counts = new Map();
  for (const d of WEB_DOCS) addDoc(c, words(d), 1);
  return c;
}

export function buildTuned(): Counts {
  const c = buildBase();
  for (const p of PROMPTS) addDoc(c, [...words(p.text), ...words(p.answer)], DEMO_WEIGHT);
  return c;
}

export type Candidate = { token: string; p: number };
export type Step = { token: string; candidates: Candidate[]; contextLength: number };

/** Candidates for the next word, most likely first (ties broken alphabetically), from the longest context that was seen. */
export function nextWord(counts: Counts, history: string[]): { candidates: Candidate[]; contextLength: number } {
  for (let n = Math.min(MAX_CONTEXT, history.length); n >= 1; n--) {
    const m = counts.get(history.slice(history.length - n).join(' '));
    if (m) {
      const total = [...m.values()].reduce((a, b) => a + b, 0);
      const candidates = [...m.entries()]
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
        .map(([token, c]) => ({ token, p: c / total }));
      return { candidates, contextLength: n };
    }
  }
  return { candidates: [{ token: END, p: 1 }], contextLength: 0 };
}

/** Continue the prompt greedily until the model emits its end marker or `max` words are written. */
export function generate(counts: Counts, prompt: string, max = MAX_NEW): Step[] {
  const history = [START, ...words(prompt)];
  const steps: Step[] = [];
  for (let i = 0; i < max; i++) {
    const { candidates, contextLength } = nextWord(counts, history);
    const token = candidates[0].token;
    steps.push({ token, candidates: candidates.slice(0, 3), contextLength });
    if (token === END) break;
    history.push(token);
  }
  return steps;
}

export type Outcome = {
  steps: Step[];
  /** the words written, without the end marker */
  text: string;
  /** did the first sentence of the reply contain the answer word? */
  answered: boolean;
  /** how many new questions the reply asked */
  newQuestions: number;
  /** did it stop by itself (wrote the end marker) rather than being cut off at the length limit? */
  stopped: boolean;
};

export function outcome(counts: Counts, prompt: Prompt): Outcome {
  const steps = generate(counts, prompt.text);
  const toks = steps.map((s) => s.token).filter((t) => t !== END);
  const firstSentence: string[] = [];
  for (const t of toks) {
    firstSentence.push(t);
    if (t === '.' || t === '?') break;
  }
  return {
    steps,
    text: toks.join(' '),
    answered: firstSentence.includes(prompt.answerWord),
    newQuestions: toks.filter((t) => t === '?').length,
    stopped: steps[steps.length - 1].token === END,
  };
}

/** Number of distinct words (plus markers) either model has seen. */
export function vocabularySize(counts: Counts): number {
  const v = new Set<string>();
  for (const [k, m] of counts) {
    if (!k.includes(' ')) v.add(k);
    for (const t of m.keys()) v.add(t);
  }
  return v.size;
}
