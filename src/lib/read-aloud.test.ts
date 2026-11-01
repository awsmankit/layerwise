import { describe, expect, it } from 'vitest';
import {
  buildPlan, chooseVoice, chunkAtBlock, chunkBeforeBlock, chunkText, cleanText, extractBlocks, pickVoices, splitSentences, type ReadNode,
} from './read-aloud';

const t = (text: string): ReadNode => ({ tag: '#text', text });
const el = (tag: string, kids: (ReadNode | string)[] = [], classes: string[] = [], extra: Partial<ReadNode> = {}): ReadNode => ({
  tag, classes, children: kids.map((k) => (typeof k === 'string' ? t(k) : k)), ...extra,
});
const texts = (root: ReadNode, essentials = false) => extractBlocks(root, { essentials }).map((b) => b.text);

describe('splitSentences', () => {
  it('splits on full stops, question marks and exclamation marks', () => {
    expect(splitSentences('One. Two? Three! Four.')).toEqual(['One.', 'Two?', 'Three!', 'Four.']);
  });
  it('does not split decimals, abbreviations or initials', () => {
    expect(splitSentences('It costs 3.5 dollars, e.g. a coffee. Next.')).toEqual(['It costs 3.5 dollars, e.g. a coffee.', 'Next.']);
    expect(splitSentences('Ask A. Turing about it. Done.')).toEqual(['Ask A. Turing about it.', 'Done.']);
    expect(splitSentences('Models such as GPT vs. Claude differ. Yes.')).toEqual(['Models such as GPT vs. Claude differ.', 'Yes.']);
  });
  it('keeps closing quotes with the sentence', () => {
    expect(splitSentences('He said “stop.” Then left.')).toEqual(['He said “stop.”', 'Then left.']);
  });
  it('returns text with no stop as one sentence', () => {
    expect(splitSentences('no stop here')).toEqual(['no stop here']);
    expect(splitSentences('')).toEqual([]);
  });
});

describe('chunkText', () => {
  it('keeps every chunk within the limit and loses no words', () => {
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ') + ', and more, ' + 'x'.repeat(30) + '.';
    const chunks = chunkText(long, 80);
    expect(chunks.every((c) => c.length <= 80)).toBe(true);
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(cleanText(long));
  });
  it('prefers to cut at a comma', () => {
    const chunks = chunkText('Alpha beta gamma delta, epsilon zeta eta theta iota kappa lambda mu.', 40);
    expect(chunks[0]).toBe('Alpha beta gamma delta,');
  });
  it('hard-cuts a single enormous word', () => {
    expect(chunkText('a'.repeat(250), 100).map((c) => c.length)).toEqual([100, 100, 50]);
  });
});

describe('cleanText', () => {
  it('says symbols as words and tidies whitespace', () => {
    expect(cleanText('  CPU → GPU,\n  ≈ 3×  faster ')).toBe('CPU to GPU, about 3 times faster');
  });
});

describe('extractBlocks', () => {
  it('reads headings as sentences, paragraphs and list items in order', () => {
    const root = el('div', [
      el('p', ['Intro ', el('strong', ['text']), ' here.']),
      el('h2', ['Tokens']),
      el('ul', [el('li', ['First']), el('li', ['Second'])]),
    ]);
    expect(texts(root)).toEqual(['Intro text here.', 'Tokens.', 'First', 'Second']);
    expect(extractBlocks(root, { essentials: false }).map((b) => b.kind)).toEqual(['text', 'heading', 'text', 'text']);
  });
  it('skips code, diagrams, islands, quizzes and buttons', () => {
    const root = el('div', [
      el('p', ['Before.']),
      el('pre', [el('code', ['x = 1'])]),
      el('astro-island', [el('div', [el('p', ['inside a diagram'])], ['viz'])]),
      el('div', [el('p', ['quiz question'])], ['qz']),
      el('p', ['Run ', el('button', ['Click me']), 'it.']),
    ]);
    expect(texts(root)).toEqual(['Before.', 'Run it.']);
  });
  it('reads glossary term buttons as words but skips other buttons', () => {
    const root = el('div', [el('p', ['That is the ', el('strong', [el('button', ['edit distance'], ['term'])]), ' here. ', el('button', ['Copy'])])]);
    expect(texts(root)).toEqual(['That is the edit distance here.']);
  });
  it('reads a table caption only', () => {
    const root = el('div', [el('table', [el('caption', ['Prices per million tokens']), el('tr', [el('td', ['cell'])])])]);
    expect(texts(root)).toEqual(['Prices per million tokens']);
    expect(texts(el('div', [el('table', [el('tr', [el('td', ['cell'])])])]))).toEqual([]);
  });
  it('drops Deep blocks in essentials mode only', () => {
    const root = el('div', [
      el('p', ['Main.']),
      el('div', [el('p', ['Deeper detail', ' '], ['deep-tag']), el('p', ['The deep part.'])], ['deep']),
    ]);
    expect(texts(root, true)).toEqual(['Main.']);
    expect(texts(root, false)).toEqual(['Main.', 'The deep part.']);
  });
  it('skips hidden nodes and screen-reader-only asides', () => {
    const root = el('div', [el('p', ['Shown. ', el('span', ['(opens in a new tab)'], ['sr-only'])]), el('p', ['Secret.'], [], { hidden: true })]);
    expect(texts(root)).toEqual(['Shown.']);
  });
  it('reads a callout title and body as separate blocks', () => {
    const root = el('div', [el('aside', [el('strong', ['Count with the real tokenizer']), el('p', ['Use the usage field.'])], ['callout'])]);
    expect(texts(root)).toEqual(['Count with the real tokenizer', 'Use the usage field.']);
  });
  it('reads nested list items once each', () => {
    const root = el('div', [el('ul', [el('li', ['Outer', el('ul', [el('li', ['Inner'])])])])]);
    expect(texts(root)).toEqual(['Outer', 'Inner']);
  });
  it('drops blocks with nothing speakable and keeps refs', () => {
    const ref = { id: 1 };
    const root = el('div', [el('p', ['---']), el('p', ['Real words.'], [], { ref })]);
    const blocks = extractBlocks(root, { essentials: false });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].ref).toBe(ref);
  });
});

describe('plan', () => {
  const plan = buildPlan([{ text: 'A one. A two.' }, { text: '' }, { text: 'B.' }]);
  it('maps blocks to chunks', () => {
    expect(plan.chunks.map((c) => c.text)).toEqual(['A one.', 'A two.', 'B.']);
    expect(plan.starts).toEqual([0, -1, 2]);
  });
  it('finds the next and previous paragraph starts', () => {
    expect(chunkAtBlock(plan, 1)).toBe(2);
    expect(chunkAtBlock(plan, 3)).toBe(-1);
    expect(chunkBeforeBlock(plan, 2)).toBe(0);
    expect(chunkBeforeBlock(plan, 0)).toBe(0);
  });
});

describe('voices', () => {
  const v = (name: string, lang: string, localService = true, uri = name, def = false) => ({ name, lang, voiceURI: uri, localService, default: def });
  it('offers English voices first when there are any, local before network', () => {
    const list = [v('Zed', 'de-DE'), v('Net', 'en-US', false), v('Ann', 'en-GB'), v('Bob', 'en_AU'), v('Ann', 'en-GB')];
    expect(pickVoices(list).map((x) => x.name)).toEqual(['Ann', 'Bob', 'Net']);
  });
  it('falls back to every voice when none is English', () => {
    expect(pickVoices([v('Zed', 'de-DE'), v('Eva', 'fr-FR')]).map((x) => x.name)).toEqual(['Eva', 'Zed']);
    expect(pickVoices([])).toEqual([]);
  });
  it('chooses the saved voice, then British English, then the default', () => {
    const list = [v('Us', 'en-US', true, 'us', true), v('Gb', 'en-GB', true, 'gb')];
    expect(chooseVoice(list, 'us')?.name).toBe('Us');
    expect(chooseVoice(list, 'gone')?.name).toBe('Gb');
    expect(chooseVoice([v('Us', 'en-US', true, 'us', true), v('Au', 'en-AU')], '')?.name).toBe('Us');
    expect(chooseVoice([], '')).toBeUndefined();
  });
});
