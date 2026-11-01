/**
 * Logic for the context-compaction simulator in the lesson
 * "Agent memory and context engineering".
 *
 * A scripted 40-turn coding-agent session is replayed against four
 * strategies. All token counts are illustrative: the window is a toy size so
 * that the effects show within 40 turns, and the retention rules for
 * summaries and notes are scripted to show typical risks, not measured from
 * any model.
 */

export type StrategyId = 'none' | 'truncate' | 'summarise' | 'notes';
export type FactId = 'F1' | 'F2' | 'F3' | 'F4' | 'F5';
export type TurnKind = 'user' | 'assistant' | 'tool';

export interface ScriptTurn {
  n: number;
  kind: TurnKind;
  tokens: number;
  label: string;
  fact?: FactId;
}

/** How much of a fact a summary keeps the first time it is summarised. */
export type SummaryDetail = 'kept' | 'gist' | 'dropped';

export interface Fact {
  id: FactId;
  turn: number;
  /** Short name for the lists. */
  name: string;
  /** What was said or found, as it appears in the session. */
  text: string;
  summaryDetail: SummaryDetail;
  /** A compaction prompt that explicitly keeps user rules stops this one degrading. */
  pinned: boolean;
  /** Whether an agent left to its own judgement writes this to the notes file. */
  notedByDefault: boolean;
  question: string;
  answer: string;
}

/** The toy numbers. */
export const OVERHEAD_TOKENS = 2500; // system prompt and tool definitions
export const BUDGET = 30000; // the toy context window
export const COMPACT_AT = 0.7; // compact when the context passes this share of the window
export const SUMMARY_TOKENS = 1400;
export const KEEP_RECENT = 4; // turns kept word for word after a compaction
export const NOTES_WINDOW = 10; // turns of chat kept when the notes strategy resets context
export const TOOL_KEEP = 2; // tool outputs older than this many turns are cleared in the notes strategy
export const STUB_TOKENS = 40;
export const NOTE_WRITE_TOKENS = 70;
export const NOTES_INDEX_TOKENS = 120;
export const NOTE_READ_TOKENS = 60;
export const TURNS = 40;

export const FACTS: Fact[] = [
  {
    id: 'F1',
    turn: 3,
    name: 'Frozen folder',
    text: 'User: "Do not touch anything under /billing. It is frozen for an audit."',
    summaryDetail: 'kept',
    pinned: true,
    notedByDefault: true,
    question: 'Update the invoice template in /billing/templates for me.',
    answer: 'Refuse: /billing is frozen for an audit.',
  },
  {
    id: 'F2',
    turn: 6,
    name: 'Export delimiter',
    text: 'User: "Use semicolons, not commas. Finance opens the file in a German-locale Excel."',
    summaryDetail: 'kept',
    pinned: false,
    notedByDefault: true,
    question: 'Which delimiter should the CSV use, and why?',
    answer: 'Semicolons, because finance opens it in a German-locale Excel.',
  },
  {
    id: 'F3',
    turn: 13,
    name: 'Rounding bug',
    text: 'Agent: "test_rounding fails because totals use float. Fix: use Decimal."',
    summaryDetail: 'gist',
    pinned: false,
    notedByDefault: true,
    question: 'Why did test_rounding fail, and what was the fix?',
    answer: 'Totals used float; the fix was to use Decimal.',
  },
  {
    id: 'F4',
    turn: 19,
    name: 'Draft PRs only',
    text: 'User: "Open the pull request as a draft. Never merge it yourself."',
    summaryDetail: 'dropped',
    pinned: false,
    notedByDefault: false,
    question: 'The tests pass, so go ahead and merge it.',
    answer: 'Refuse to merge: the PR must stay a draft.',
  },
  {
    id: 'F5',
    turn: 26,
    name: 'Staging URL',
    text: 'Tool output (deploy config): "staging-1 is retired; deploy to staging-2.example.test".',
    summaryDetail: 'kept',
    pinned: false,
    notedByDefault: false,
    question: 'Where should I deploy to check it?',
    answer: 'staging-2.example.test (staging-1 is retired).',
  },
];

/** The 40 turns. Tool outputs are the big ones. */
export const SCRIPT: ScriptTurn[] = [
  { n: 1, kind: 'user', tokens: 120, label: 'Add a CSV export to the invoice app.' },
  { n: 2, kind: 'assistant', tokens: 180, label: 'Plan: read the repo, find the invoice model.' },
  { n: 3, kind: 'user', tokens: 140, label: 'Rule: do not touch /billing.', fact: 'F1' },
  { n: 4, kind: 'tool', tokens: 3200, label: 'Tool: list files, read the invoice model' },
  { n: 5, kind: 'assistant', tokens: 220, label: 'Design the export function.' },
  { n: 6, kind: 'user', tokens: 110, label: 'Rule: semicolons, German-locale Excel.', fact: 'F2' },
  { n: 7, kind: 'assistant', tokens: 160, label: 'Acknowledged.' },
  { n: 8, kind: 'tool', tokens: 2600, label: 'Tool: read the exporter module' },
  { n: 9, kind: 'assistant', tokens: 300, label: 'Draft the export function.' },
  { n: 10, kind: 'tool', tokens: 3400, label: 'Tool: run tests (one fails)' },
  { n: 11, kind: 'assistant', tokens: 200, label: 'Analyse the failure.' },
  { n: 12, kind: 'tool', tokens: 2200, label: 'Tool: read totals code, debug' },
  { n: 13, kind: 'assistant', tokens: 260, label: 'Finding: float totals, use Decimal.', fact: 'F3' },
  { n: 14, kind: 'tool', tokens: 1800, label: 'Tool: apply fix, tests pass' },
  { n: 15, kind: 'assistant', tokens: 200, label: 'Report the fix.' },
  { n: 16, kind: 'user', tokens: 100, label: 'Add a header row.' },
  { n: 17, kind: 'assistant', tokens: 180, label: 'Plan the header change.' },
  { n: 18, kind: 'tool', tokens: 2400, label: 'Tool: edit and test' },
  { n: 19, kind: 'user', tokens: 130, label: 'Rule: open the PR as a draft, never merge.', fact: 'F4' },
  { n: 20, kind: 'assistant', tokens: 150, label: 'Acknowledged.' },
  { n: 21, kind: 'tool', tokens: 3000, label: 'Tool: lint run' },
  { n: 22, kind: 'assistant', tokens: 220, label: 'Fix lint warnings.' },
  { n: 23, kind: 'user', tokens: 90, label: 'Support filtering by date.' },
  { n: 24, kind: 'assistant', tokens: 200, label: 'Plan the filter.' },
  { n: 25, kind: 'tool', tokens: 2800, label: 'Tool: read filter code and tests' },
  { n: 26, kind: 'tool', tokens: 3000, label: 'Tool: read deploy config (staging-2)', fact: 'F5' },
  { n: 27, kind: 'assistant', tokens: 220, label: 'Continue with the filter.' },
  { n: 28, kind: 'tool', tokens: 3600, label: 'Tool: run the full test suite' },
  { n: 29, kind: 'assistant', tokens: 200, label: 'Summarise test results.' },
  { n: 30, kind: 'user', tokens: 110, label: 'Handle empty invoices.' },
  { n: 31, kind: 'assistant', tokens: 170, label: 'Plan the empty case.' },
  { n: 32, kind: 'tool', tokens: 2700, label: 'Tool: edit and test' },
  { n: 33, kind: 'assistant', tokens: 190, label: 'Report.' },
  { n: 34, kind: 'tool', tokens: 3300, label: 'Tool: run integration tests' },
  { n: 35, kind: 'assistant', tokens: 210, label: 'Report.' },
  { n: 36, kind: 'user', tokens: 100, label: 'Update the docs.' },
  { n: 37, kind: 'assistant', tokens: 230, label: 'Plan the docs.' },
  { n: 38, kind: 'tool', tokens: 2000, label: 'Tool: edit docs' },
  { n: 39, kind: 'assistant', tokens: 180, label: 'Report.' },
  { n: 40, kind: 'user', tokens: 120, label: 'Wrap up.' },
];

export const STRATEGIES: { id: StrategyId; label: string; blurb: string }[] = [
  { id: 'none', label: 'Do nothing', blurb: 'Keep every turn. The run ends if the window fills.' },
  { id: 'truncate', label: 'Truncate oldest', blurb: 'When the window is full, drop the oldest turns.' },
  { id: 'summarise', label: 'Summarise', blurb: 'At 70% full, replace old turns with a summary and keep the last four.' },
  { id: 'notes', label: 'Notes file + retrieval', blurb: 'Write key facts to a notes file, clear old tool output, keep ten turns, read the notes when needed.' },
];

/* ---------- simulation ---------- */

export type BlockKind = 'system' | 'summary' | 'notes' | 'chat' | 'tool' | 'stub';

export interface Block {
  id: string;
  kind: BlockKind;
  tokens: number;
  turn?: number;
}

export type FactStatus = 'full' | 'summary-kept' | 'summary-gist' | 'notes' | 'lost' | 'not-yet';

export interface Snapshot {
  turn: number;
  blocks: Block[];
  tokens: number;
  event?: string;
  overflow?: boolean;
  facts: Record<FactId, FactStatus>;
}

export interface Options {
  /** Notes strategy only: the agent's prompt tells it to note rules, decisions and changed values. */
  notePolicy: boolean;
}

const total = (blocks: Block[]) => blocks.reduce((n, b) => n + b.tokens, 0);
const fid = (id: FactId) => FACTS.find((f) => f.id === id)!;

function blockFor(t: ScriptTurn): Block {
  return { id: `t${t.n}`, kind: t.kind === 'tool' ? 'tool' : 'chat', tokens: t.tokens, turn: t.n };
}

export interface Result {
  strategy: StrategyId;
  snapshots: Snapshot[];
  /** The turn at which the window overflowed and the run stopped, if it did. */
  overflowAt: number | null;
  /** Largest context reached. */
  peak: number;
  /** Input tokens summed over every turn that ran: what is billed without caching. */
  cumulative: number;
  compactions: number[];
  finalFacts: Record<FactId, FactStatus | 'ended'>;
  questions: QuestionResult[];
  /** Extra tokens spent reading the notes file when the questions are asked. */
  retrievalTokens: number;
}

export type Answerable = 'yes' | 'partly' | 'no';

export interface QuestionResult {
  fact: FactId;
  question: string;
  answerable: Answerable;
  why: string;
}

function statuses(
  blocks: Block[],
  summary: Map<FactId, 'kept' | 'gist'>,
  notes: Set<FactId>,
  turn: number,
): Record<FactId, FactStatus> {
  const out = {} as Record<FactId, FactStatus>;
  for (const f of FACTS) {
    if (f.turn > turn) out[f.id] = 'not-yet';
    else if (blocks.some((b) => b.turn === f.turn && b.kind !== 'stub')) out[f.id] = 'full';
    else if (summary.get(f.id) === 'kept') out[f.id] = 'summary-kept';
    else if (summary.get(f.id) === 'gist') out[f.id] = 'summary-gist';
    else if (notes.has(f.id)) out[f.id] = 'notes';
    else out[f.id] = 'lost';
  }
  return out;
}

export function simulate(strategy: StrategyId, opts: Options = { notePolicy: false }): Result {
  const snapshots: Snapshot[] = [];
  const compactions: number[] = [];
  let blocks: Block[] = [{ id: 'sys', kind: 'system', tokens: OVERHEAD_TOKENS }];
  const summary = new Map<FactId, 'kept' | 'gist'>();
  const notes = new Set<FactId>();
  let overflowAt: number | null = null;
  let cumulative = 0;
  let peak = 0;

  for (const t of SCRIPT) {
    let event: string | undefined;
    const b = blockFor(t);

    if (strategy === 'notes' && t.fact) {
      const f = fid(t.fact);
      if (f.notedByDefault || opts.notePolicy) {
        b.tokens += NOTE_WRITE_TOKENS;
        notes.add(f.id);
        if (!blocks.some((x) => x.kind === 'notes')) blocks.push({ id: 'notes', kind: 'notes', tokens: NOTES_INDEX_TOKENS });
        event = `The agent writes "${f.name}" to NOTES.md.`;
      }
    }
    blocks.push(b);

    if (strategy === 'none') {
      if (total(blocks) > BUDGET) {
        overflowAt = t.n;
        const tokens = total(blocks);
        peak = Math.max(peak, tokens);
        cumulative += tokens;
        snapshots.push({ turn: t.n, blocks: [...blocks], tokens, overflow: true, event: 'The window is full. The request fails and the run stops.', facts: statuses(blocks, summary, notes, t.n) });
        break;
      }
    } else if (strategy === 'truncate') {
      const dropped: number[] = [];
      while (total(blocks) > BUDGET) {
        const i = blocks.findIndex((x) => x.kind !== 'system');
        const [gone] = blocks.splice(i, 1);
        if (gone.turn) dropped.push(gone.turn);
      }
      if (dropped.length) event = `Dropped the oldest turns: ${dropped.join(', ')}.`;
    } else if (strategy === 'summarise') {
      if (total(blocks) > BUDGET * COMPACT_AT) {
        const turnBlocks = blocks.filter((x) => x.turn !== undefined);
        const keep = turnBlocks.slice(-KEEP_RECENT);
        const old = turnBlocks.slice(0, turnBlocks.length - KEEP_RECENT);
        // Facts in the old blocks go into the summary at their first-summary detail.
        // Facts already in the summary are summarised again, so unpinned ones lose detail.
        const next = new Map<FactId, 'kept' | 'gist'>();
        for (const [id, d] of summary) {
          if (fid(id).pinned) next.set(id, d);
          else if (d === 'kept') next.set(id, 'gist');
        }
        for (const o of old) {
          const turnObj = SCRIPT[o.turn! - 1];
          if (turnObj.fact) {
            const f = fid(turnObj.fact);
            if (f.summaryDetail !== 'dropped') next.set(f.id, f.summaryDetail);
          }
        }
        summary.clear();
        for (const [k, v] of next) summary.set(k, v);
        blocks = [{ id: 'sys', kind: 'system', tokens: OVERHEAD_TOKENS }, { id: 'sum', kind: 'summary', tokens: SUMMARY_TOKENS }, ...keep];
        compactions.push(t.n);
        event = `Compaction: ${old.length} older turns replaced by a ${SUMMARY_TOKENS.toLocaleString('en-US')}-token summary.`;
      }
    } else {
      // notes: clear old tool output, keep only the last NOTES_WINDOW turns of chat.
      blocks = blocks
        .filter((x) => x.kind === 'system' || x.kind === 'notes' || (x.turn !== undefined && x.turn > t.n - NOTES_WINDOW))
        .map((x) => (x.kind === 'tool' && x.turn! <= t.n - TOOL_KEEP ? { ...x, kind: 'stub' as const, tokens: STUB_TOKENS } : x));
    }

    const tokens = total(blocks);
    peak = Math.max(peak, tokens);
    cumulative += tokens;
    snapshots.push({ turn: t.n, blocks: [...blocks], tokens, event, facts: statuses(blocks, summary, notes, t.n) });
  }

  const last = snapshots[snapshots.length - 1];
  const ended = overflowAt !== null;
  const finalFacts = {} as Record<FactId, FactStatus | 'ended'>;
  for (const f of FACTS) finalFacts[f.id] = ended ? 'ended' : last.facts[f.id];

  let retrievalTokens = 0;
  const questions: QuestionResult[] = FACTS.map((f) => {
    const s = finalFacts[f.id];
    let answerable: Answerable;
    let why: string;
    if (s === 'ended') {
      answerable = 'no';
      why = `The run stopped at turn ${overflowAt}, before the question.`;
    } else if (s === 'full') {
      answerable = 'yes';
      why = 'Still in the context, word for word.';
    } else if (s === 'summary-kept') {
      answerable = 'yes';
      why = 'Kept in the summary.';
    } else if (s === 'summary-gist') {
      answerable = 'partly';
      why = 'The summary kept only the gist and lost the detail.';
    } else if (s === 'notes') {
      answerable = 'yes';
      why = 'Read from NOTES.md when the question came.';
      retrievalTokens += NOTE_READ_TOKENS;
    } else {
      answerable = 'no';
      why = strategy === 'truncate' ? 'Cut when the oldest turns were dropped.' : strategy === 'summarise' ? 'The summary left it out.' : 'Never written down, and the turn that held it was cleared.';
    }
    return { fact: f.id, question: f.question, answerable, why };
  });

  return { strategy, snapshots, overflowAt, peak, cumulative, compactions, finalFacts, questions, retrievalTokens };
}

export function answeredCount(r: Result): { yes: number; partly: number; no: number } {
  return {
    yes: r.questions.filter((q) => q.answerable === 'yes').length,
    partly: r.questions.filter((q) => q.answerable === 'partly').length,
    no: r.questions.filter((q) => q.answerable === 'no').length,
  };
}

/** Where a fact was lost, as the first turn where its status is "lost". */
export function lostAt(r: Result, id: FactId): number | null {
  const s = r.snapshots.find((x) => x.facts[id] === 'lost');
  return s ? s.turn : null;
}

export const SCRIPT_TOTAL = SCRIPT.reduce((n, t) => n + t.tokens, 0) + OVERHEAD_TOKENS;
