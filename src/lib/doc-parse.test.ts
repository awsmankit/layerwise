import { describe, expect, it } from 'vitest';
import {
  cer,
  chunkBlocks,
  chunkVectorBytes,
  dropRepeated,
  editDistance,
  embedText,
  flattenByColumns,
  flattenByRows,
  maxSim,
  modelPageCost,
  multiVectorBytes,
  normalise,
  pagePriceCost,
  pagesNeedingOcr,
  pairsKept,
  readingOrderScore,
  repeatedLines,
  rowToText,
  splitTable,
  tableGrid,
  tableToHtml,
  tableToMarkdown,
  wer,
  type Cell,
  type DocBlock,
} from './doc-parse';

const PLANS: Cell[] = [
  { r: 0, c: 0, text: 'Group', header: true },
  { r: 0, c: 1, text: 'Plan', header: true },
  { r: 0, c: 2, text: 'Monthly', header: true },
  { r: 0, c: 3, text: 'Storage', header: true },
  { r: 1, c: 0, text: 'Personal', rowspan: 2 },
  { r: 1, c: 1, text: 'Basic' },
  { r: 1, c: 2, text: '£4' },
  { r: 1, c: 3, text: '50 GB' },
  { r: 2, c: 1, text: 'Plus' },
  { r: 2, c: 2, text: '£8' },
  { r: 2, c: 3, text: '200 GB' },
  { r: 3, c: 0, text: 'Business', rowspan: 2 },
  { r: 3, c: 1, text: 'Team' },
  { r: 3, c: 2, text: '£15' },
  { r: 3, c: 3, text: '1 TB' },
  { r: 4, c: 1, text: 'Enterprise' },
  { r: 4, c: 2, text: '£30' },
  { r: 4, c: 3, text: '5 TB' },
];

describe('text error metrics', () => {
  it('computes edit distance', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('', 'abc')).toBe(3);
    expect(editDistance([1, 2, 3], [1, 3])).toBe(1);
  });
  it('gives the worked example in the lesson: two wrong characters in 19', () => {
    const ref = 'Total due £1,284.50';
    const got = 'Total due £1,2B4.5O';
    expect(Array.from(ref).length).toBe(19);
    expect(editDistance(Array.from(ref), Array.from(got))).toBe(2);
    expect(cer(ref, got)).toBeCloseTo(2 / 19, 6);
    expect(cer(ref, got)).toBeLessThan(0.11);
  });
  it('word error rate counts whole words, so one wrong digit costs a whole word', () => {
    expect(wer('Total due £1,284.50', 'Total due £1,2B4.5O')).toBeCloseTo(1 / 3, 6);
    expect(wer('a b c d', 'a b c d')).toBe(0);
  });
  it('handles empty references', () => {
    expect(cer('', '')).toBe(0);
    expect(cer('', 'x')).toBe(1);
    expect(cer('abc', '')).toBe(1);
  });
});

describe('reading-order metrics', () => {
  const truth = ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'];
  it('scores a perfect order as 1', () => {
    expect(readingOrderScore(truth, truth)).toBe(1);
    expect(pairsKept(truth, truth)).toBe(1);
  });
  it('scores row-by-row column interleaving poorly', () => {
    const naive = ['L1', 'R1', 'L2', 'R2', 'L3', 'R3'];
    expect(readingOrderScore(truth, naive)).toBeLessThan(0.7);
    // only the pair (L3,R1) is broken in neither sense: no neighbouring pair of the truth survives except none
    expect(pairsKept(truth, naive)).toBe(0);
  });
});

describe('repeated lines', () => {
  const pages = [
    ['Harbour Mutual | Home cover summary', 'Body one', 'Page 1 of 3'],
    ['Harbour Mutual | Home cover summary', 'Body two', 'Page 2 of 3'],
    ['Harbour Mutual | Home cover summary', 'Body three', 'Page 3 of 3'],
  ];
  it('finds headers and footers even when the page number changes', () => {
    const rep = repeatedLines(pages);
    expect(rep).toContain('Harbour Mutual | Home cover summary');
    expect(rep).toContain('Page # of #');
    expect(rep).toHaveLength(2);
  });
  it('drops them and leaves the body', () => {
    expect(dropRepeated(pages[1], repeatedLines(pages))).toEqual(['Body two']);
  });
  it('does not drop a line that appears on one page of many', () => {
    expect(repeatedLines([['a'], ['b'], ['c'], ['d']])).toEqual([]);
  });
});

describe('pagesNeedingOcr', () => {
  it('flags pages with almost no text', () => {
    expect(pagesNeedingOcr([1800, 0, 2100, 12, 900])).toEqual([1, 3]);
  });
});

describe('tables', () => {
  it('expands merged cells into a grid', () => {
    const g = tableGrid(PLANS);
    expect(g[1]).toEqual(['Personal', 'Basic', '£4', '50 GB']);
    expect(g[2]).toEqual(['Personal', 'Plus', '£8', '200 GB']);
    expect(g[4]).toEqual(['Business', 'Enterprise', '£30', '5 TB']);
  });
  it('writes Markdown with the merged text repeated', () => {
    const md = tableToMarkdown(PLANS);
    expect(md.split('\n')).toHaveLength(6);
    expect(md).toContain('| Personal | Plus | £8 | 200 GB |');
    expect(md).toContain('| Business | Enterprise | £30 | 5 TB |');
  });
  it('writes HTML that keeps rowspan', () => {
    const html = tableToHtml(PLANS);
    expect(html).toContain('<td rowspan="2">Business</td><td>Team</td>');
    expect(html).toContain('<tr><td>Plus</td><td>£8</td><td>200 GB</td></tr>');
  });
  it('flattening by rows puts a merged label between the rows it spans', () => {
    const flat = flattenByRows(PLANS);
    expect(flat).toBe('Group Plan Monthly Storage Basic £4 50 GB Personal Plus £8 200 GB Team £15 1 TB Business Enterprise £30 5 TB');
  });
  it('flattening by columns separates plan names from their sizes', () => {
    const flat = flattenByColumns(PLANS);
    expect(flat).toBe('Group Personal Business Plan Basic Plus Team Enterprise Monthly £4 £8 £15 £30 Storage 50 GB 200 GB 1 TB 5 TB');
    expect(flat).not.toContain('Plus £8');
  });
});

describe('splitting a long table', () => {
  const header = ['Item', 'Qty'];
  const rows = Array.from({ length: 400 }, (_, i) => [`Part ${i + 1}`, String(i % 7)]);
  it('400 rows at 60 per chunk make 7 chunks, and only the first has the header unless it is repeated', () => {
    const plain = splitTable(header, rows, 60, false);
    expect(plain).toHaveLength(7);
    expect(plain.filter((c) => c.includes('| Item | Qty |'))).toHaveLength(1);
    expect((plain.length - 1) / plain.length).toBeCloseTo(6 / 7, 6);
  });
  it('repeats the header in every chunk when asked', () => {
    const rep = splitTable(header, rows, 60, true);
    expect(rep).toHaveLength(7);
    expect(rep.every((c) => c.startsWith('| Item | Qty |'))).toBe(true);
    expect(rep[6].split('\n')).toHaveLength(2 + 40);
  });
  it('writes a row as a self-describing sentence', () => {
    expect(rowToText(['Plan', 'Monthly', 'Storage'], ['Plus', '£8', '200 GB'], 'Personal group')).toBe('Personal group. Plan: Plus; Monthly: £8; Storage: 200 GB');
  });
});

describe('layout-aware chunking', () => {
  const blocks: DocBlock[] = [
    { kind: 'header', text: 'Harbour Mutual | Home cover summary', page: 1 },
    { kind: 'heading', text: 'Claims', level: 1, page: 1 },
    { kind: 'heading', text: 'Escape of water', level: 2, page: 1 },
    { kind: 'paragraph', text: 'Escape of water is covered up to £50,000 per claim.', page: 1 },
    { kind: 'paragraph', text: 'The excess is £250.', page: 1 },
    { kind: 'footer', text: 'Page 1 of 2', page: 1 },
    { kind: 'header', text: 'Harbour Mutual | Home cover summary', page: 2 },
    { kind: 'caption', text: 'Table 2: Excess by claim type', page: 2 },
    { kind: 'table', text: '| Type | Excess |\n| --- | --- |\n| Water | £250 |', page: 2 },
    { kind: 'figure', text: '[chart: claims per month]', page: 2 },
    { kind: 'caption', text: 'Figure 1: Claims per month in 2025', page: 2 },
    { kind: 'heading', text: 'Jewellery', level: 2, page: 2 },
    { kind: 'paragraph', text: 'No single item is covered above £500.', page: 2 },
    { kind: 'footer', text: 'Page 2 of 2', page: 2 },
  ];
  const chunks = chunkBlocks(blocks, 400);
  it('drops headers and footers', () => {
    expect(chunks.some((c) => /Harbour Mutual|Page \d/.test(c.text))).toBe(false);
  });
  it('produces four chunks for this example', () => {
    expect(chunks.map((c) => c.kind)).toEqual(['text', 'table', 'figure', 'text']);
  });
  it('carries the section path', () => {
    expect(chunks[0].section).toEqual(['Claims', 'Escape of water']);
    expect(chunks[3].section).toEqual(['Claims', 'Jewellery']);
  });
  it('keeps a table caption with its table and a figure caption with its figure', () => {
    expect(chunks[1].text.startsWith('Table 2: Excess by claim type\n| Type | Excess |')).toBe(true);
    expect(chunks[2].text).toBe('[chart: claims per month]\nFigure 1: Claims per month in 2025');
  });
  it('packs paragraphs together up to the limit', () => {
    expect(chunks[0].text).toBe('Escape of water is covered up to £50,000 per claim.\nThe excess is £250.');
    const small = chunkBlocks(blocks, 55);
    expect(small[0].text).toBe('Escape of water is covered up to £50,000 per claim.');
    expect(small[1].text).toBe('The excess is £250.');
  });
  it('prepends the section path to the text that is embedded', () => {
    expect(embedText(chunks[3])).toBe('Claims > Jewellery\nNo single item is covered above £500.');
  });
  it('records pages', () => {
    expect(chunks[0].pages).toEqual([1]);
    expect(chunks[1].pages).toEqual([2]);
  });
});

describe('page-image retrieval arithmetic', () => {
  it('MaxSim on the worked example is 1.7', () => {
    const q = [
      [1, 0],
      [0, 1],
    ];
    const page = [
      [0.9, 0.1],
      [0.2, 0.8],
      [0.5, 0.5],
    ];
    expect(maxSim(q, page)).toBeCloseTo(1.7, 10);
  });
  it('a page that matches only one query token scores lower', () => {
    const q = [
      [1, 0],
      [0, 1],
    ];
    expect(maxSim(q, [[0.9, 0.1]])).toBeCloseTo(1.0, 10);
  });
  it('1,030 vectors of 128 values in 16 bits is 263,680 bytes per page', () => {
    expect(multiVectorBytes(1030, 128, 2)).toBe(263_680);
    expect(263_680 / 1024).toBe(257.5);
  });
  it('2.1 chunks of a 1,024-dimension float32 vector is about 8,600 bytes, so the page-image index is about 31 times larger', () => {
    const chunkBytes = chunkVectorBytes(2.1, 1024, 4);
    expect(chunkBytes).toBeCloseTo(8601.6, 6);
    expect(multiVectorBytes(1030, 128, 2) / chunkBytes).toBeCloseTo(30.66, 1);
  });
  it('100,000 pages at 263,680 bytes is 26.368 GB (decimal)', () => {
    expect(multiVectorBytes(1030, 128, 2) * 100_000).toBe(26_368_000_000);
  });
});

describe('cost arithmetic (example prices only)', () => {
  it('a per-page service', () => {
    expect(pagePriceCost(200_000, 1.5)).toBeCloseTo(300, 6);
  });
  it('a model reading pages', () => {
    // 200,000 pages, 1,500 input tokens and 1,000 output tokens per page, $1 and $5 per million tokens
    expect(modelPageCost(200_000, 1500, 1000, 1, 5)).toBeCloseTo(1300, 6);
  });
  it('normalise collapses whitespace', () => {
    expect(normalise('  a \n b\t c ')).toBe('a b c');
  });
});
