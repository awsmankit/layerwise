/*
 * Pure helpers for the "Reading real documents" lesson: text-error metrics, repeated header and footer
 * detection, table serialisation and splitting, layout-aware chunking, and the arithmetic behind the
 * page-image retrieval and cost examples. No I/O, no network: everything here is deterministic so the
 * numbers quoted in the lesson can be tested.
 */

/** Collapse runs of whitespace to single spaces and trim. */
export function normalise(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Levenshtein distance between two sequences (insertions, deletions and substitutions each cost 1). */
export function editDistance<T>(a: ArrayLike<T>, b: ArrayLike<T>): number {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[m];
}

/** Character error rate: edit distance over characters divided by the reference length. 0 is perfect. Can exceed 1. */
export function cer(reference: string, hypothesis: string): number {
  const r = Array.from(normalise(reference));
  const h = Array.from(normalise(hypothesis));
  if (r.length === 0) return h.length === 0 ? 0 : 1;
  return editDistance(r, h) / r.length;
}

/** Word error rate: the same idea over whitespace-separated words. */
export function wer(reference: string, hypothesis: string): number {
  const r = normalise(reference).split(' ').filter(Boolean);
  const h = normalise(hypothesis).split(' ').filter(Boolean);
  if (r.length === 0) return h.length === 0 ? 0 : 1;
  return editDistance(r, h) / r.length;
}

/** Reading-order score: 1 minus the normalised edit distance between the true and the produced block sequence. */
export function readingOrderScore(truth: string[], got: string[]): number {
  if (truth.length === 0) return got.length === 0 ? 1 : 0;
  const d = editDistance(truth, got);
  return Math.max(0, 1 - d / Math.max(truth.length, got.length));
}

/** Of the neighbouring pairs in the true order, the share that are still neighbours, in order, in the output. */
export function pairsKept(truth: string[], got: string[]): number {
  if (truth.length < 2) return 1;
  let kept = 0;
  for (let i = 0; i < truth.length - 1; i++) {
    const at = got.indexOf(truth[i]);
    if (at >= 0 && got[at + 1] === truth[i + 1]) kept++;
  }
  return kept / (truth.length - 1);
}

/**
 * Lines that appear on at least `minShare` of the pages (after whitespace normalisation) are very likely running
 * headers, footers or watermarks. Page numbers vary, so digits are masked before comparing.
 */
export function repeatedLines(pages: string[][], minShare = 0.5): string[] {
  const mask = (l: string) => normalise(l).replace(/\d+/g, '#');
  const seen = new Map<string, number>();
  for (const page of pages) {
    for (const key of new Set(page.map(mask))) {
      if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
    }
  }
  return [...seen.entries()].filter(([, n]) => n / pages.length >= minShare).map(([k]) => k);
}

/** Remove lines whose masked form is in the repeated set. */
export function dropRepeated(page: string[], repeated: string[]): string[] {
  const mask = (l: string) => normalise(l).replace(/\d+/g, '#');
  const set = new Set(repeated);
  return page.filter((l) => !set.has(mask(l)));
}

/** Indices of pages whose text layer is nearly empty, which usually means a scan that needs OCR. */
export function pagesNeedingOcr(charsPerPage: number[], minChars = 25): number[] {
  return charsPerPage.flatMap((n, i) => (n < minChars ? [i] : []));
}

/* ---------------------------------- tables ---------------------------------- */

export type Cell = { r: number; c: number; text: string; rowspan?: number; colspan?: number; header?: boolean };

const rs = (c: Cell) => c.rowspan ?? 1;
const cs = (c: Cell) => c.colspan ?? 1;

/** A rectangular grid in which a merged cell's text is repeated in every position it covers. */
export function tableGrid(cells: Cell[]): string[][] {
  const rows = Math.max(...cells.map((c) => c.r + rs(c)));
  const cols = Math.max(...cells.map((c) => c.c + cs(c)));
  const grid = Array.from({ length: rows }, () => Array<string>(cols).fill(''));
  for (const c of cells) {
    for (let i = 0; i < rs(c); i++) for (let j = 0; j < cs(c); j++) grid[c.r + i][c.c + j] = c.text;
  }
  return grid;
}

/** Markdown has no merged cells, so merged text is repeated in each row it spans. The first row is the header. */
export function tableToMarkdown(cells: Cell[]): string {
  const grid = tableGrid(cells);
  const line = (row: string[]) => '| ' + row.join(' | ') + ' |';
  return [line(grid[0]), line(grid[0].map(() => '---')), ...grid.slice(1).map(line)].join('\n');
}

/** HTML keeps merged cells as rowspan and colspan. Cells in a row are written without spaces between them. */
export function tableToHtml(cells: Cell[]): string {
  const rows = Math.max(...cells.map((c) => c.r + rs(c)));
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = cells.filter((c) => c.r === r).sort((a, b) => a.c - b.c);
    const tds = inRow
      .map((c) => {
        const tag = c.header ? 'th' : 'td';
        const attrs = (rs(c) > 1 ? ` rowspan="${rs(c)}"` : '') + (cs(c) > 1 ? ` colspan="${cs(c)}"` : '');
        return `<${tag}${attrs}>${c.text}</${tag}>`;
      })
      .join('');
    out.push(`<tr>${tds}</tr>`);
  }
  return `<table>\n${out.join('\n')}\n</table>`;
}

/**
 * Read cells the way a line-based extractor does: ordered by the vertical centre of each cell, then left to right.
 * A merged cell is centred on the rows it spans, so its text lands between those rows.
 */
export function flattenByRows(cells: Cell[]): string {
  const yc = (c: Cell) => c.r + rs(c) / 2;
  return [...cells]
    .sort((a, b) => yc(a) - yc(b) || a.c - b.c)
    .map((c) => c.text)
    .join(' ');
}

/** Read cells column by column, which is the drawing order of many generated PDFs. */
export function flattenByColumns(cells: Cell[]): string {
  return [...cells]
    .sort((a, b) => a.c - b.c || a.r - b.r)
    .map((c) => c.text)
    .join(' ');
}

/** Split a table into Markdown chunks of at most `maxRows` data rows, optionally repeating the header in each chunk. */
export function splitTable(header: string[], rows: string[][], maxRows: number, repeatHeader: boolean): string[] {
  const line = (row: string[]) => '| ' + row.join(' | ') + ' |';
  const head = [line(header), line(header.map(() => '---'))];
  const chunks: string[] = [];
  for (let i = 0; i < rows.length; i += maxRows) {
    const body = rows.slice(i, i + maxRows).map(line);
    chunks.push((repeatHeader || i === 0 ? [...head, ...body] : body).join('\n'));
  }
  return chunks;
}

/** A row as one self-describing sentence, so a row-level chunk still carries its column names. */
export function rowToText(header: string[], row: string[], context = ''): string {
  const pairs = header.map((h, i) => `${h}: ${row[i] ?? ''}`).join('; ');
  return context ? `${context}. ${pairs}` : pairs;
}

/* ------------------------- layout-aware chunking ------------------------- */

export type DocBlock = {
  kind: 'header' | 'footer' | 'heading' | 'paragraph' | 'list' | 'table' | 'figure' | 'caption';
  text: string;
  page: number;
  /** For headings: 1 is the top level. */
  level?: number;
};

export type Chunk = {
  kind: 'text' | 'table' | 'figure';
  section: string[];
  pages: number[];
  text: string;
};

/**
 * Turn parsed blocks into chunks. Headers and footers are dropped. A heading closes the current chunk and updates
 * the section path. Paragraphs and lists are packed up to `maxChars`. A table or figure is kept whole in its own
 * chunk (a table over `maxChars` is not split here; use splitTable). A caption starting "Table" attaches to the table
 * that follows it; any other caption attaches to the figure before it.
 */
export function chunkBlocks(blocks: DocBlock[], maxChars: number): Chunk[] {
  const chunks: Chunk[] = [];
  let path: string[] = [];
  let buf: { text: string; pages: number[] } | null = null;
  let pendingTableCaption = '';

  const flush = () => {
    if (buf) chunks.push({ kind: 'text', section: [...path], pages: buf.pages, text: buf.text });
    buf = null;
  };

  for (const b of blocks) {
    if (b.kind === 'header' || b.kind === 'footer') continue;
    if (b.kind === 'heading') {
      flush();
      const level = b.level ?? 1;
      path = [...path.slice(0, level - 1), b.text];
      continue;
    }
    if (b.kind === 'caption') {
      if (/^table\b/i.test(b.text)) {
        pendingTableCaption = b.text;
        continue;
      }
      const last = chunks[chunks.length - 1];
      if (last && last.kind === 'figure' && !buf) {
        last.text += '\n' + b.text;
        continue;
      }
    }
    if (b.kind === 'table' || b.kind === 'figure') {
      flush();
      const text = pendingTableCaption && b.kind === 'table' ? pendingTableCaption + '\n' + b.text : b.text;
      pendingTableCaption = '';
      chunks.push({ kind: b.kind === 'table' ? 'table' : 'figure', section: [...path], pages: [b.page], text });
      continue;
    }
    // paragraph, list, or an unattached caption
    if (buf && buf.text.length + 1 + b.text.length > maxChars) flush();
    if (buf) {
      buf.text += '\n' + b.text;
      if (!buf.pages.includes(b.page)) buf.pages.push(b.page);
    } else {
      buf = { text: b.text, pages: [b.page] };
    }
  }
  flush();
  return chunks;
}

/** The text that gets embedded for a chunk: the section path is prepended so the chunk makes sense alone. */
export function embedText(chunk: Chunk): string {
  return chunk.section.length ? chunk.section.join(' > ') + '\n' + chunk.text : chunk.text;
}

/* ----------------------- page-image (late interaction) ----------------------- */

/** Dot product. */
export function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Late-interaction score (ColBERT-style MaxSim): for each query vector take the highest dot product over all
 * document vectors, then sum those maxima.
 */
export function maxSim(query: number[][], doc: number[][]): number {
  return query.reduce((sum, q) => sum + Math.max(...doc.map((d) => dot(q, d))), 0);
}

/** Bytes to store one page as a set of `vectors` vectors of `dim` values. */
export function multiVectorBytes(vectors: number, dim: number, bytesPerValue: number): number {
  return vectors * dim * bytesPerValue;
}

/** Bytes per page when the page is split into text chunks with one vector each. */
export function chunkVectorBytes(chunksPerPage: number, dim: number, bytesPerValue: number): number {
  return chunksPerPage * dim * bytesPerValue;
}

/* ------------------------------ cost arithmetic ------------------------------ */

/** Cost of a per-page priced service. The price is dollars per 1,000 pages. All prices passed in are examples. */
export function pagePriceCost(pages: number, pricePer1000Pages: number): number {
  return (pages / 1000) * pricePer1000Pages;
}

/** Cost of reading pages with a model priced per million tokens. */
export function modelPageCost(pages: number, inTokensPerPage: number, outTokensPerPage: number, inPricePerM: number, outPricePerM: number): number {
  return pages * ((inTokensPerPage * inPricePerM + outTokensPerPage * outPricePerM) / 1_000_000);
}
