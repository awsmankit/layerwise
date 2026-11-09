/**
 * A written answer to one interview question. The answer is the point of the page: a reader opens
 * a question and learns the idea, so the text explains rather than grades. Written as a patient
 * senior engineer would explain to a smart newcomer: plain words, terms defined on first use,
 * real numbers, no filler.
 */

export type FlowNode = { id: string; label: string; sub?: string };

/**
 * Diagrams are data, not React, so an answer can be written quickly and every one is checked by
 * tests. Each kind is drawn by a component in src/components/interview/diagrams/.
 */
export type DiagramSpec =
  /** Steps in order, with a step-through. `edges` defaults to each node feeding the next; `highlight` marks the nodes the answer is about. */
  | { kind: 'flow'; nodes: FlowNode[]; edges?: [string, string][]; highlight?: string[]; caption: string }
  /** A table of options against criteria. */
  | { kind: 'compare'; columns: string[]; rows: { label: string; cells: string[] }[]; caption: string }
  /** Animated bars. Values come from the answer's own worked numbers. `hot` marks the bar the answer is about. */
  | { kind: 'bars'; unit: string; items: { label: string; value: number; note?: string; hot?: boolean }[]; caption: string }
  /** A stack, listed from the top layer down. */
  | { kind: 'layers'; layers: { label: string; sub?: string }[]; caption: string }
  /** Things in the order they happen, each with a sentence. */
  | { kind: 'timeline'; steps: { label: string; detail: string }[]; caption: string }
  /** A simple line chart. Points go left to right. */
  | { kind: 'curve'; xLabel: string; yLabel: string; points: [number, number][]; marks?: { x: number; label: string }[]; caption: string }
  /** One of the What if experiments, embedded. The slug must exist. */
  | { kind: 'experiment'; slug: string; caption?: string };

export type Answer = {
  /** The direct answer in two to four plain sentences: what someone should say first. */
  short: string;
  /** Two to four short sections that teach: define terms on first use, then the why, then the trade-offs. */
  explain: { heading: string; body: string }[];
  diagram: DiagramSpec;
  /** A worked example with real numbers. Say "example" where a number is an assumption. */
  example: { title: string; text: string; rows?: { label: string; value: string }[] };
  /** Two to four follow-up questions, each answered in one to three sentences. */
  followUps: { q: string; a: string }[];
  /** Two to four common wrong answers or traps, written as advice. */
  mistakes: string[];
};
