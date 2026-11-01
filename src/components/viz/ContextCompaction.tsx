import { useMemo, useState } from 'react';
import { Root, fmt, useNarrow } from './shared';
import {
  BUDGET,
  COMPACT_AT,
  FACTS,
  SCRIPT,
  STRATEGIES,
  TURNS,
  answeredCount,
  simulate,
  type Answerable,
  type BlockKind,
  type FactStatus,
  type StrategyId,
} from '../../lib/context-compaction';

const STATUS_LABEL: Record<FactStatus, string> = {
  full: 'In the context, word for word',
  'summary-kept': 'In the summary',
  'summary-gist': 'In the summary, detail lost',
  notes: 'In the notes file',
  lost: 'Lost',
  'not-yet': 'Not said yet',
};
const STATUS_GOOD: Record<FactStatus, boolean> = { full: true, 'summary-kept': true, 'summary-gist': false, notes: true, lost: false, 'not-yet': true };

const KIND_LABEL: Record<BlockKind, string> = {
  system: 'System prompt and tools',
  summary: 'Summary',
  notes: 'Notes index',
  chat: 'Chat turns',
  tool: 'Tool output',
  stub: 'Cleared tool output',
};
const KIND_ORDER: BlockKind[] = ['system', 'summary', 'notes', 'chat', 'tool', 'stub'];

const ANS_LABEL: Record<Answerable, string> = { yes: 'Can answer', partly: 'Partly', no: 'Cannot answer' };

/**
 * A scripted 40-turn agent session replayed against four context strategies.
 * Token counts are illustrative and the window is a toy size.
 */
export default function ContextCompaction() {
  const narrow = useNarrow();
  const [strategy, setStrategy] = useState<StrategyId>('none');
  const [policy, setPolicy] = useState(false);
  const [turn, setTurn] = useState(TURNS);

  const res = useMemo(() => simulate(strategy, { notePolicy: policy }), [strategy, policy]);
  const stopped = res.overflowAt !== null && turn > res.overflowAt;
  const snap = res.snapshots[Math.min(turn, res.snapshots.length) - 1];
  const score = answeredCount(res);

  // chart geometry
  const W = narrow ? 280 : 640;
  const H = narrow ? 270 : 260;
  const m = { l: 40, r: 8, t: 18, b: narrow ? 64 : 46 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const yMax = BUDGET * 1.1;
  const x = (n: number) => m.l + ((n - 1) / (TURNS - 1)) * pw;
  const y = (v: number) => m.t + ph - (v / yMax) * ph;
  const path = res.snapshots.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(s.turn).toFixed(1)},${y(s.tokens).toFixed(1)}`).join(' ');

  const desc =
    `Line chart of context tokens over 40 turns against a window of ${fmt.int(BUDGET)} tokens. ` +
    `Strategy: ${STRATEGIES.find((s) => s.id === strategy)!.label}. Peak ${fmt.int(res.peak)} tokens. ` +
    (res.overflowAt ? `The window overflowed at turn ${res.overflowAt}. ` : '') +
    (res.compactions.length ? `Compactions at turns ${res.compactions.join(' and ')}. ` : '');

  const kindTotals = KIND_ORDER.map((k) => ({ k, n: snap.blocks.filter((b) => b.kind === k).reduce((a, b) => a + b.tokens, 0) })).filter((r) => r.n > 0);

  return (
    <Root>
      <div className="viz aa-sim">
        <p className="viz-title">Context-compaction simulator: a 40-turn coding session</p>
        <p className="aa-banner">
          <b>An illustrative simulation.</b> The session is scripted: an agent adds a CSV export to an invoice app, and five facts are planted along the way. Token counts are illustrative, and the window is a toy {fmt.int(BUDGET)} tokens so the effects show within 40 turns. How much a summary or a notes file keeps is scripted to show typical risks, not measured from a model.
        </p>

        <div className="aa-strats" role="group" aria-label="Choose a strategy">
          {STRATEGIES.map((s) => (
            <button key={s.id} type="button" className="aa-strat" aria-pressed={strategy === s.id} onClick={() => setStrategy(s.id)}>
              <span className="aa-strat-t">{s.label}</span>
              <span className="aa-strat-b">{s.blurb}</span>
            </button>
          ))}
        </div>
        {strategy === 'notes' && (
          <label className="aa-check">
            <input type="checkbox" checked={policy} onChange={(e) => setPolicy(e.target.checked)} />
            <span>The agent's prompt says: always note rules, decisions and changed values</span>
          </label>
        )}

        <svg className="aa-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={desc}>
          {[0, 10000, 20000, 30000].map((v) => (
            <g key={v}>
              <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="aa-grid" />
              <text x={m.l - 6} y={y(v) + 4} textAnchor="end" className="aa-axis">
                {v / 1000}k
              </text>
            </g>
          ))}
          <line x1={m.l} x2={W - m.r} y1={y(BUDGET)} y2={y(BUDGET)} className="aa-budget" />
          <text x={W - m.r} y={y(BUDGET) - 5} textAnchor="end" className="aa-budget-t">
            window {fmt.int(BUDGET)}
          </text>
          {strategy === 'summarise' && <line x1={m.l} x2={W - m.r} y1={y(BUDGET * COMPACT_AT)} y2={y(BUDGET * COMPACT_AT)} className="aa-thresh" />}
          {[1, 10, 20, 30, 40].map((n) => (
            <text key={n} x={x(n)} y={m.t + ph + (narrow ? 58 : 40)} textAnchor="middle" className="aa-axis">
              {n}
            </text>
          ))}
          {res.compactions.map((c) => (
            <line key={c} x1={x(c)} x2={x(c)} y1={m.t} y2={m.t + ph} className="aa-cmark" />
          ))}
          <path d={path} className="aa-line" fill="none" />
          {FACTS.map((f, i) => (
            <g key={f.id}>
              <circle cx={x(f.turn)} cy={m.t + ph + 8} r={3.5} className="aa-fact-dot" />
              <text x={x(f.turn)} y={m.t + ph + 23 + (narrow && i % 2 ? 15 : 0)} textAnchor="middle" className="aa-fact-t">
                {f.id}
              </text>
            </g>
          ))}
          {res.overflowAt && (
            <g>
              <circle cx={x(res.overflowAt)} cy={y(snap.turn >= res.overflowAt ? res.snapshots[res.snapshots.length - 1].tokens : BUDGET)} r={5} className="aa-over" />
              <text x={x(res.overflowAt) - 8} y={y(BUDGET) + 18} textAnchor="end" className="aa-over-t">
                full, run stops
              </text>
            </g>
          )}
          <line x1={x(turn)} x2={x(turn)} y1={m.t} y2={m.t + ph} className="aa-cursor" />
        </svg>
        <p className="aa-legend">
          <span className="aa-key aa-key-line" /> tokens in the context <span className="aa-key aa-key-budget" /> window limit {strategy === 'summarise' && <><span className="aa-key aa-key-thresh" /> compact at {Math.round(COMPACT_AT * 100)}% </>}<span className="aa-key aa-key-fact" /> F1 to F5: when each fact appears. Horizontal axis: turn number.
        </p>

        <div className="aa-scrub">
          <label htmlFor="aa-turn">
            Turn <b className="num">{turn}</b> of {TURNS}
          </label>
          <input id="aa-turn" type="range" min={1} max={TURNS} value={turn} onChange={(e) => setTurn(Number(e.target.value))} aria-valuetext={`Turn ${turn} of ${TURNS}`} />
        </div>

        <div aria-live="polite" className="aa-state">
          {stopped ? (
            <p className="aa-stopped">
              <b>Run stopped at turn {res.overflowAt}.</b> The context went over the window, so the request failed and the session could not continue.
            </p>
          ) : (
            <>
              <p className="aa-turnline">
                <b>Turn {snap.turn}</b> ({SCRIPT[snap.turn - 1].kind}): {SCRIPT[snap.turn - 1].label} ({fmt.int(SCRIPT[snap.turn - 1].tokens)} tokens)
              </p>
              {snap.event && <p className="aa-event">{snap.event}</p>}
              <p className="aa-meter-t">
                Context now: <b className="num">{fmt.int(snap.tokens)}</b> of {fmt.int(BUDGET)} tokens ({Math.round((snap.tokens / BUDGET) * 100)}% of the window)
              </p>
              <div className="aa-meter" role="img" aria-label={`Context breakdown: ${kindTotals.map((r) => `${KIND_LABEL[r.k]} ${fmt.int(r.n)}`).join(', ')}`}>
                {kindTotals.map((r) => (
                  <span key={r.k} className={`aa-seg aa-seg-${r.k}`} style={{ width: `${Math.min(100, (r.n / BUDGET) * 100)}%` }} />
                ))}
              </div>
              <ul className="aa-kinds">
                {kindTotals.map((r) => (
                  <li key={r.k}>
                    <span className={`aa-swatch aa-seg-${r.k}`} /> {KIND_LABEL[r.k]}: {fmt.int(r.n)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <h4 className="aa-h">Where each fact is at turn {Math.min(turn, res.snapshots.length)}</h4>
        <ul className="aa-facts">
          {FACTS.map((f) => {
            const s: FactStatus = snap.facts[f.id];
            return (
              <li key={f.id}>
                <span className="aa-fid">{f.id}</span>
                <span className="aa-fname">
                  {f.name} <span className="aa-fturn">(turn {f.turn})</span>
                </span>
                <span className={`aa-chip ${STATUS_GOOD[s] ? 'is-good' : 'is-bad'}`}>{STATUS_LABEL[s]}</span>
              </li>
            );
          })}
        </ul>

        <h4 className="aa-h">After turn 40, the user asks five questions</h4>
        <ul className="aa-qs">
          {res.questions.map((q) => (
            <li key={q.fact} className={`aa-q is-${q.answerable}`}>
              <p className="aa-q-t">
                <span className="aa-fid">{q.fact}</span> "{q.question}"
              </p>
              <p className="aa-q-a">
                <b>{ANS_LABEL[q.answerable]}.</b> {q.why}
              </p>
            </li>
          ))}
        </ul>
        <p className="aa-score-line" aria-live="polite">
          <b>
            {score.yes} of 5 answered{score.partly ? `, ${score.partly} partly` : ''}.
          </b>{' '}
          Peak context {fmt.int(res.peak)} tokens. Input tokens summed over {res.snapshots.length} turns: {fmt.int(res.cumulative)}
          {res.compactions.length ? `. Compactions at turns ${res.compactions.join(' and ')}` : ''}
          {res.retrievalTokens ? `. Reading the notes added ${fmt.int(res.retrievalTokens)} tokens` : ''}.
        </p>
        <p className="viz-cap">Try each strategy, then drag the turn slider to see when a fact is lost. No strategy keeps everything for free.</p>
      </div>
    </Root>
  );
}
