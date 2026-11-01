/*
 * Data and logic for the parsing lab. Three invented pages, five extraction methods. The extracted text for
 * the first two pages is computed from the page content (so reading-order and table effects are real consequences of the
 * method, not hand-typed), and the scanned page uses scripted outputs that show KINDS of error. Nothing here
 * measures any real product. Whether a question is answered correctly is decided by checking whether the extracted
 * text still contains the evidence for the answer.
 */
import { flattenByColumns, flattenByRows, normalise, tableToHtml, tableToMarkdown, type Cell } from './doc-parse';

export type MethodId = 'text-raw' | 'text-layout' | 'ocr-lines' | 'ocr-layout' | 'vlm';
export type PageId = 'columns' | 'table' | 'scan';
export type Status = 'right' | 'risky' | 'missing';

export type Method = {
  id: MethodId;
  label: string;
  what: string;
  good: string;
  bad: string;
  cost: string;
};

export const METHODS: Method[] = [
  {
    id: 'text-raw',
    label: 'Text layer, line by line',
    what: 'Reads the characters stored inside the PDF and orders them by position on the page, line by line across the full width.',
    good: 'Instant and free. The characters are exact on born-digital pages.',
    bad: 'Nothing at all on a scan. Mixes columns, flattens tables, keeps headers and footers.',
    cost: 'Lowest: CPU only, no model.',
  },
  {
    id: 'text-layout',
    label: 'Text layer plus layout analysis',
    what: 'The same exact characters, plus a layout model that finds columns, headers, footers, tables and the reading order.',
    good: 'Right order, boilerplate removed, tables kept as structure.',
    bad: 'Still nothing on a scan. A layout model can mislabel an unusual page.',
    cost: 'Low to moderate: a layout model runs on every page.',
  },
  {
    id: 'ocr-lines',
    label: 'OCR engine, no layout analysis',
    what: 'Renders the page as an image and recognises the text line by line.',
    good: 'Works on scans and photos. Local engines are free to run.',
    bad: 'Confuses similar shapes (8 and B, 0 and O, 1 and l). No structure. Wasteful on a page that already has a text layer.',
    cost: 'Low: CPU time per page for local engines.',
  },
  {
    id: 'ocr-layout',
    label: 'OCR plus layout and table analysis',
    what: 'Recognition plus layout models and table-structure recovery. Managed document services and some open parsers work this way, often returning a confidence per word.',
    good: 'Handles scans and born-digital pages alike, with structure and confidence scores.',
    bad: 'A per-page fee or heavier compute. Still makes errors, so it has to be measured on your own pages.',
    cost: 'Moderate: a per-page price or GPU and CPU time.',
  },
  {
    id: 'vlm',
    label: 'Vision-language model reads the page image',
    what: 'A multimodal model is shown the page image and asked to transcribe it into Markdown or JSON.',
    good: 'Copes with odd layouts, charts and handwriting in one step, and can describe figures.',
    bad: 'Can change a digit or invent text and still read fluently. No per-character confidence. Slowest.',
    cost: 'Highest per page: image tokens in, text tokens out, seconds of latency.',
  },
];

export type Question = { id: string; ask: string; truth: string; evidence: string[][] };
/** Which way the reading path runs across the drawn page, so the picture can show it. */
export type PathKind = 'across' | 'columns' | 'colwise' | 'rowwise' | 'cells' | 'lines' | 'none';
export type Output = { text: string; note: string; path: PathKind; why: Record<string, string> };
export type LabPage = {
  id: PageId;
  title: string;
  blurb: string;
  questions: Question[];
  /** Strings that are boilerplate (running header and footer). Empty when the page has none. */
  boilerplate: string[];
  outputs: Record<MethodId, Output>;
};

/* ---------------- page 1: two columns with a running header and footer ---------------- */

export const COLUMN_PAGE = {
  header: 'Harbour Mutual | Home cover summary',
  footer: 'Page 4 of 12',
  left: ['Water damage', 'Escape of water from pipes or', 'tanks is covered up to £50,000', 'per claim. The excess for', 'escape of water claims is'],
  right: ['£250, or £500 if the home was', 'empty for more than 30 days.', 'Jewellery', 'Jewellery is covered up to', '£1,500 in total. No single', 'item is covered above £500.'],
  /** Indices of the heading lines in each column. */
  leftHeadings: [0],
  rightHeadings: [2],
};

/** What a line-by-line extractor produces: one line from the left, one from the right, and so on. */
export function readAcross(left: string[], right: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (i < left.length) out.push(left[i]);
    if (i < right.length) out.push(right[i]);
  }
  return out;
}

function columnsMarkdown(): string {
  const mark = (lines: string[], heads: number[]) => lines.map((l, i) => (heads.includes(i) ? `## ${l}` : l));
  return [...mark(COLUMN_PAGE.left, COLUMN_PAGE.leftHeadings), ...mark(COLUMN_PAGE.right, COLUMN_PAGE.rightHeadings)].join('\n');
}

const across = [COLUMN_PAGE.header, ...readAcross(COLUMN_PAGE.left, COLUMN_PAGE.right), COLUMN_PAGE.footer].join('\n');

const columnsPage: LabPage = {
  id: 'columns',
  title: 'Two columns, header and footer',
  blurb: 'A born-digital leaflet page. The text layer is perfect; the question is the order and the clutter.',
  boilerplate: [COLUMN_PAGE.header, COLUMN_PAGE.footer],
  questions: [
    { id: 'excess', ask: 'What is the excess for an escape of water claim?', truth: '£250 (or £500 if the home was empty for more than 30 days)', evidence: [['escape of water claims is £250']] },
    { id: 'jewel', ask: 'What is the most the policy pays for a single item of jewellery?', truth: '£500', evidence: [['No single item is covered above £500']] },
  ],
  outputs: {
    'text-raw': {
      text: across,
      note: 'Each line of the left column is followed by the line beside it in the right column. The sentence about the excess is cut in two, and the header and footer are included, so they would be repeated in every chunk.',
      path: 'across',
      why: { excess: 'The sentence "The excess for ... escape of water claims is" is separated from "£250". Nearby text mentions "Jewellery" and "£1,500", so a model may quote the wrong figure.' },
    },
    'text-layout': {
      text: [columnsMarkdown()].join('\n'),
      note: 'Columns are read in order, headings are marked, and the header and footer are removed as page furniture.',
      path: 'columns',
      why: {},
    },
    'ocr-lines': {
      text: across,
      note: 'The page is rendered to an image and read line by line across the width, so it has the same order problem as the text layer, and it threw away a text layer that was already exact. (Real OCR engines differ in how much layout analysis they do.)',
      path: 'across',
      why: { excess: 'Same interleaving as the first method: the figure is detached from the sentence it finishes.' },
    },
    'ocr-layout': {
      text: columnsMarkdown(),
      note: 'Layout analysis finds two columns and labels the header and footer, which are dropped.',
      path: 'columns',
      why: {},
    },
    vlm: {
      text: [COLUMN_PAGE.header, '', columnsMarkdown(), '', COLUMN_PAGE.footer].join('\n'),
      note: 'A vision model reads the columns in a natural order. It tends to transcribe the header and footer too unless the prompt says otherwise, so they still need removing afterwards.',
      path: 'columns',
      why: {},
    },
  },
};

/* ---------------- page 2: a table with merged cells ---------------- */

export const TABLE_CELLS: Cell[] = [
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

const tablePage: LabPage = {
  id: 'table',
  title: 'A table with merged cells',
  blurb: 'A born-digital price table where the group names span two rows each. Invented plans and prices.',
  boilerplate: [],
  questions: [
    { id: 'storage', ask: 'How much storage does the Plus plan include?', truth: '200 GB', evidence: [['Plus £8 200 GB'], ['| Plus | £8 | 200 GB |'], ['<td>Plus</td><td>£8</td><td>200 GB</td>']] },
    {
      id: 'group',
      ask: 'Which plans are in the Business group?',
      truth: 'Team and Enterprise',
      evidence: [
        ['| Business | Team |', '| Business | Enterprise |'],
        ['<td rowspan="2">Business</td><td>Team</td>', '<td>Enterprise</td>'],
        ['| Business | Team |', '| | Enterprise |'],
      ],
    },
  ],
  outputs: {
    'text-raw': {
      text: flattenByColumns(TABLE_CELLS),
      note: 'This file draws its cells column by column, so the plan names, prices and sizes come out as three separate lists.',
      path: 'colwise',
      why: {
        storage: 'The model has to match the second plan with the second size by counting. That is easy to get wrong, and a chunk boundary in the middle of a list makes it worse.',
        group: 'The group names are listed apart from the plans they cover, so the grouping is lost.',
      },
    },
    'text-layout': {
      text: tableToMarkdown(TABLE_CELLS),
      note: 'Table structure is recovered and written as Markdown. Markdown cannot merge cells, so "Personal" and "Business" are repeated on each row.',
      path: 'cells',
      why: {},
    },
    'ocr-lines': {
      text: flattenByRows(TABLE_CELLS),
      note: 'Reading row by row keeps each plan with its price and size. But a merged label is centred between its rows, so "Personal" lands between Basic and Plus, and "Business" lands next to Enterprise.',
      path: 'rowwise',
      why: { group: '"Business" sits right beside "Enterprise" in the text, so a model is likely to say Enterprise only, and miss Team.' },
    },
    'ocr-layout': {
      text: tableToHtml(TABLE_CELLS),
      note: 'HTML keeps the merged cells as rowspan, so the group still covers both of its rows.',
      path: 'cells',
      why: {},
    },
    vlm: {
      text: [
        '| Group | Plan | Monthly | Storage |',
        '| --- | --- | --- | --- |',
        '| Personal | Basic | £4 | 50 GB |',
        '|  | Plus | £8 | 200 GB |',
        '| Business | Team | £15 | 1 TB |',
        '|  | Enterprise | £30 | 5 TB |',
      ].join('\n'),
      note: 'A vision model writes a tidy Markdown table and leaves a blank for the merged continuation. That reads fine as a whole table. If you later chunk it by row, the "Plus" row has lost its "Personal" group.',
      path: 'cells',
      why: {},
    },
  },
};

/* ---------------- page 3: a noisy scan ---------------- */

export const SCAN_LINES = ['Greenfield Plumbing Ltd', 'Invoice 4471', 'Total due: £1,284.50', 'Payment due: 14 March'];

const scanPage: LabPage = {
  id: 'scan',
  title: 'A scanned page with noise',
  blurb: 'An invoice that was printed, scanned a little crooked and speckled. There is no text layer inside the file. The outputs below are scripted examples of kinds of error.',
  boilerplate: [],
  questions: [
    { id: 'total', ask: 'What is the invoice total?', truth: '£1,284.50', evidence: [['£1,284.50']] },
    { id: 'due', ask: 'When is payment due?', truth: '14 March', evidence: [['14 March']] },
  ],
  outputs: {
    'text-raw': {
      text: '',
      note: 'A scan is a picture. There is no text layer, so the extractor returns nothing, and a pipeline can index an empty chunk without raising any error. Counting characters per page catches this.',
      path: 'none',
      why: { total: 'Nothing was extracted, so the system can only say it does not know. Worse, it may answer from another document.', due: 'Nothing was extracted.' },
    },
    'text-layout': {
      text: '',
      note: 'Layout analysis needs text or an image to work from. With no OCR step it still returns nothing.',
      path: 'none',
      why: { total: 'Nothing was extracted.', due: 'Nothing was extracted.' },
    },
    'ocr-lines': {
      text: ['Greenfield Plumbing Ltd', 'lnvoice 4471', 'Total due: £1,2B4.5O', 'Payment due: 14 March'].join('\n'),
      note: 'Illustrative errors of a kind OCR makes on noisy scans: a capital B for an 8, a letter O for a zero, a lower-case l for a capital I. The line looks plausible to a person skimming.',
      path: 'lines',
      why: { total: 'The figure contains letters, so it will not match a search for 1,284.50, and a model may repeat it wrongly or round it.' },
    },
    'ocr-layout': {
      text: ['Greenfield Plumbing Ltd', 'Invoice 4471', 'Total due: £1,284.50   [word confidence 0.71: flagged for review]', 'Payment due: 14 March   [word confidence 0.93]'].join('\n'),
      note: 'In this scripted example the engine reads both fields correctly and reports a low confidence on the total, so the pipeline can send that field to a person. Confidence scores are not proof of accuracy.',
      path: 'lines',
      why: {},
    },
    vlm: {
      text: ['Greenfield Plumbing Ltd', 'Invoice 4471', 'Total due: £1,284.50', 'Payment due: 11 March'].join('\n'),
      note: 'Illustrative: the model reads the total correctly but returns a clean, confident "11" for a smudged "14". There is nothing in the text that tells you it was a guess.',
      path: 'lines',
      why: { due: 'A fluent misreading with no confidence signal. A wrong date in the index is found only by comparing with the page image.' },
    },
  },
};

export const PAGES: LabPage[] = [columnsPage, tablePage, scanPage];

/* ------------------------------- evaluation ------------------------------- */

/** Does the extracted text still contain the evidence for this question? Whitespace is ignored. */
export function hasEvidence(text: string, q: Question): boolean {
  const t = normalise(text);
  return q.evidence.some((alt) => alt.every((e) => t.includes(normalise(e))));
}

export function statusOf(text: string, q: Question): Status {
  if (hasEvidence(text, q)) return 'right';
  return normalise(text) === '' ? 'missing' : 'risky';
}

export type Outcome = { question: Question; status: Status; line: string };

export function outcomes(page: LabPage, method: MethodId): Outcome[] {
  const out = page.outputs[method];
  return page.questions.map((question) => {
    const status = statusOf(out.text, question);
    const why = out.why[question.id] ?? '';
    const line =
      status === 'right' ? `A RAG system can answer: ${question.truth}.` : status === 'missing' ? `It cannot find the answer. ${why}` : `It may answer wrongly. ${why}`;
    return { question, status, line: line.trim() };
  });
}

export const STATUS_LABEL: Record<Status, string> = { right: 'Answers correctly', risky: 'Likely wrong', missing: 'Cannot find it' };

/** How many characters were extracted and whether the running header and footer came along. */
export function stats(page: LabPage, method: MethodId): { chars: number; boilerplateKept: boolean | null } {
  const text = page.outputs[method].text;
  const t = normalise(text);
  return {
    chars: t.length,
    boilerplateKept: page.boilerplate.length === 0 ? null : page.boilerplate.some((b) => t.includes(normalise(b))),
  };
}

export function methodById(id: MethodId): Method {
  return METHODS.find((m) => m.id === id)!;
}
