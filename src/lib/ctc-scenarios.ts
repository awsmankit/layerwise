import { normaliseRows, type Probs } from './ctc';

/*
 * Hand-made example outputs from an imaginary speech model, for the CTC decoding toy. Every number here is
 * an invented teaching example, not the output of a real model. Symbol 0 is always the blank.
 */

export type Scenario = {
  id: string;
  label: string;
  /** Symbols, blank first. The blank is drawn as an underscore. */
  symbols: string[];
  /** What the speaker actually said (as symbols). */
  reference: string;
  probs: Probs;
  blurb: string;
};

/**
 * Describe each frame as a string such as "c:8 _:2" (relative weights). Symbols that are not mentioned share
 * a small leftover weight, so no probability is exactly zero.
 */
function build(symbols: string[], frames: string[]): Probs {
  const rows = frames.map((f) => {
    const row = symbols.map(() => 0.02);
    for (const part of f.trim().split(/\s+/)) {
      const [s, w] = part.split(':');
      row[symbols.indexOf(s)] = Number(w);
    }
    return row;
  });
  return normaliseRows(rows);
}

const CAT = ['_', 'c', 'a', 't'];
const HELLO = ['_', 'h', 'e', 'l', 'o'];
const YES = ['_', 'y', 'e', 's'];

export const SCENARIOS: Scenario[] = [
  {
    id: 'cat',
    label: 'A clear "cat"',
    symbols: CAT,
    reference: 'cat',
    blurb: 'The model is sure about every frame. Ten frames, three letters: most frames repeat a letter or are blank.',
    probs: build(CAT, ['_:9', 'c:8 _:2', 'c:9', '_:7 c:2 a:1', 'a:8 _:2', 'a:9', 'a:7 _:3', '_:6 t:3 a:1', 't:8 _:2', '_:9']),
  },
  {
    id: 'hello',
    label: '"hello" (a double letter)',
    symbols: HELLO,
    reference: 'hello',
    blurb: 'Two l letters in a row. Merging repeats would turn "ll" into "l", so the model has to put a blank between them. Tap the blank frame and change it to l to see what happens.',
    probs: build(HELLO, ['_:9', 'h:8 _:2', 'h:9', 'e:8 h:1 _:1', 'e:9', 'l:8 _:2', '_:8 l:2', 'l:8 _:2', 'l:9', 'o:8 _:2', 'o:9', '_:9']),
  },
  {
    id: 'yes',
    label: '"yes" with unsure timing',
    symbols: YES,
    reference: 'yes',
    blurb: 'The model hears the letters but cannot tell which exact frame each one belongs to, so no frame is confident. Every single frame prefers the blank.',
    probs: build(YES, ['y:4 _:6', 'y:4 _:6', 'y:4 _:6', 'e:4 _:6', 'e:4 _:6', 'e:4 _:6', 's:4 _:6', 's:4 _:6', 's:4 _:6']),
  },
  {
    id: 'flicker',
    label: 'A flickering "cat"',
    symbols: CAT,
    reference: 'cat',
    blurb: 'In the middle of the vowel the model wavers between a and blank. The best single path has a blank in the middle of the a, so it spells two letters.',
    probs: build(CAT, ['_:9', 'c:8 _:2', 'c:9', '_:3 c:1 a:5', 'a:5 _:4', '_:5 a:4', 'a:5 _:4', '_:4 t:2 a:3', 't:8 _:2', '_:9']),
  },
];
