/*
 * Logic for the reading-order demo: a made-up two-column leaflet page, the order a naive extractor would
 * produce, the order a layout-aware one produces, and what a learner's own order does to the text.
 */
import { normalise, pairsKept, readingOrderScore } from './doc-parse';

export type PageBlock = {
  id: string;
  /** full: spans the page width; L and R: left and right column. */
  zone: 'full' | 'L' | 'R';
  /** Top of the block, in arbitrary page units. Blocks in the same row share a value. */
  y: number;
  text: string;
};

/** Invented example text: a bike-shop warranty leaflet. The frame sentence breaks across the column gap. */
export const LEAFLET: PageBlock[] = [
  { id: 'L1', zone: 'L', y: 1, text: 'Fennel Cycles frames are covered against manufacturing faults for the original owner.' },
  { id: 'L2', zone: 'L', y: 2, text: 'Wear parts such as tyres, brake pads and chains are not covered.' },
  { id: 'L3', zone: 'L', y: 3, text: 'The frame warranty lasts for' },
  { id: 'R1', zone: 'R', y: 1, text: 'five years from the purchase date. The fork warranty lasts for two years.' },
  { id: 'R2', zone: 'R', y: 2, text: 'To claim, take the bike and your receipt to any Fennel dealer.' },
  { id: 'R3', zone: 'R', y: 3, text: 'Claims made without a receipt cannot be accepted.' },
];

export const HEADER_TEXT = 'Fennel Cycles | Warranty leaflet | Edition 4';
export const FOOTER_TEXT = 'Page 3 of 8';

/** The order a person reads the body: down the left column, then down the right. */
export const TRUE_ORDER = ['L1', 'L2', 'L3', 'R1', 'R2', 'R3'];

export const QUESTION = 'How long is the frame warranty?';
export const KEY_SENTENCE = 'The frame warranty lasts for five years';

/** What an extractor that sorts text by vertical position, then left to right, produces. */
export function naiveOrder(blocks: PageBlock[]): string[] {
  return [...blocks].sort((a, b) => a.y - b.y || (a.zone === 'R' ? 1 : 0) - (b.zone === 'R' ? 1 : 0)).map((b) => b.id);
}

/**
 * A simple layout-aware order (an XY-cut in miniature): full-width blocks split the page into bands; inside a band
 * the left column is read top to bottom and then the right column.
 */
export function columnOrder(blocks: PageBlock[]): string[] {
  const sorted = [...blocks].sort((a, b) => a.y - b.y);
  const out: string[] = [];
  let band: PageBlock[] = [];
  const flush = () => {
    const left = band.filter((b) => b.zone === 'L').sort((a, b) => a.y - b.y);
    const right = band.filter((b) => b.zone === 'R').sort((a, b) => a.y - b.y);
    out.push(...left.map((b) => b.id), ...right.map((b) => b.id));
    band = [];
  };
  for (const b of sorted) {
    if (b.zone === 'full') {
      flush();
      out.push(b.id);
    } else band.push(b);
  }
  flush();
  return out;
}

/** The text produced when blocks are emitted in the given order. */
export function assemble(blocks: PageBlock[], order: string[]): string {
  const byId = new Map(blocks.map((b) => [b.id, b.text]));
  return order.map((id) => byId.get(id) ?? '').join(' ');
}

export type OrderVerdict = {
  complete: boolean;
  text: string;
  /** 0 to 1: how close the block sequence is to the true one. */
  score: number;
  /** Share of true neighbouring block pairs still neighbouring, in order. */
  pairs: number;
  sentenceIntact: boolean;
  forkFigureVisible: boolean;
  message: string;
};

/** Judge a learner's (possibly partial) order. */
export function judge(blocks: PageBlock[], order: string[]): OrderVerdict {
  const text = assemble(blocks, order);
  const complete = order.length === blocks.length;
  const norm = normalise(text);
  const sentenceIntact = norm.includes(KEY_SENTENCE);
  const forkFigureVisible = norm.includes('fork warranty lasts for two years');
  const score = readingOrderScore(TRUE_ORDER, order);
  const pairs = pairsKept(TRUE_ORDER, order);
  let message: string;
  if (!complete) message = `Tap all ${blocks.length} blocks to see the whole text. So far: ${order.length}.`;
  else if (sentenceIntact && pairs === 1) message = 'This is the order a person reads. The frame sentence is whole, so the answer "five years" is in one place.';
  else if (sentenceIntact) message = 'The frame sentence survives, but some other neighbouring blocks have been separated.';
  else
    message =
      'The frame sentence is broken: "lasts for" is stranded away from "five years". A model reading this may guess, may pick the fork figure (two years), or may say it is not stated.';
  return { complete, text, score, pairs, sentenceIntact, forkFigureVisible, message };
}
