import { useMemo, useState } from 'react';
import { Root, fmt } from './shared';
import {
  EXAMPLE,
  breakEvenCorpus,
  breakEvenHitRate,
  breakEvenQueries,
  caveats,
  dailyCost,
  fits,
  promptTokens,
  warmQueriesPerDay,
  type Churn,
  type LcInput,
  type Strategy,
  type TaskKind,
} from '../../lib/long-context-cost';

const CORPUS_STOPS = [5_000, 10_000, 20_000, 40_000, 80_000, 150_000, 300_000, 800_000, 1_500_000, 5_000_000];
const QUERY_STOPS = [10, 30, 100, 300, 1000, 2000, 5000, 10_000, 30_000, 100_000];

const PRESETS: { label: string; corpus: number; queries: number }[] = [
  { label: 'Policy handbook', corpus: 40_000, queries: 300 },
  { label: 'Product docs', corpus: 150_000, queries: 2000 },
  { label: 'Large wiki', corpus: 800_000, queries: 1000 },
  { label: 'Code monorepo', corpus: 5_000_000, queries: 300 },
];

const TASKS: { id: TaskKind; label: string }[] = [
  { id: 'lookup', label: 'Look up one fact' },
  { id: 'multi', label: 'Combine several facts' },
  { id: 'whole', label: 'Question about the whole set' },
];
const CHURN: { id: Churn; label: string }[] = [
  { id: 'rarely', label: 'Rarely' },
  { id: 'daily', label: 'Daily' },
  { id: 'constantly', label: 'Constantly' },
];

const ROWS: { id: Strategy; name: string; sub: string }[] = [
  { id: 'long', name: 'Long context', sub: 'whole set in every prompt' },
  { id: 'cached', name: 'Long context, cached', sub: 'whole set in a cached prefix' },
  { id: 'rag', name: 'Retrieval (RAG)', sub: 'a few passages per question' },
];

const tok = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : `${n}`);
const nearest = (stops: number[], v: number) => stops.reduce((best, s, i) => (Math.abs(s - v) < Math.abs(stops[best] - v) ? i : best), 0);

/** Decimal inputs that tolerate an empty field while typing. */
function Num({ label, value, onChange, step = 1, min = 0 }: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number }) {
  return (
    <label className="wlb-num">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? Math.max(min, n) : 0);
        }}
      />
    </label>
  );
}

export default function LongContextCalc() {
  const [ci, setCi] = useState(nearest(CORPUS_STOPS, EXAMPLE.corpus));
  const [qi, setQi] = useState(nearest(QUERY_STOPS, EXAMPLE.queries));
  const [hit, setHit] = useState(Math.round(EXAMPLE.hit * 100));
  const [pIn, setPIn] = useState(EXAMPLE.pIn);
  const [pOut, setPOut] = useState(EXAMPLE.pOut);
  const [readMult, setReadMult] = useState(EXAMPLE.readMult);
  const [writeMult, setWriteMult] = useState(EXAMPLE.writeMult);
  const [ragTokens, setRagTokens] = useState(EXAMPLE.ragTokens);
  const [infra, setInfra] = useState(EXAMPLE.infra);
  const [win, setWin] = useState(EXAMPLE.window);
  const [task, setTask] = useState<TaskKind>('multi');
  const [churn, setChurn] = useState<Churn>('rarely');
  const [access, setAccess] = useState(false);

  const input: LcInput = useMemo(
    () => ({ ...EXAMPLE, corpus: CORPUS_STOPS[ci], queries: QUERY_STOPS[qi], hit: hit / 100, pIn, pOut, readMult, writeMult, ragTokens, infra, window: win }),
    [ci, qi, hit, pIn, pOut, readMult, writeMult, ragTokens, infra, win],
  );

  const costs = ROWS.map((r) => ({ ...r, day: dailyCost(input, r.id), prompt: promptTokens(input, r.id) }));
  const max = Math.max(...costs.map((c) => c.day), 1e-9);
  const cheapest = costs.reduce((a, b) => (b.day < a.day ? b : a));
  const notes = caveats(input, task, churn, access);
  const canFit = fits(input);

  const beHit = breakEvenHitRate(readMult, writeMult);
  const beCorpusLong = breakEvenCorpus(input, 'long');
  const beCorpusCached = breakEvenCorpus(input, 'cached');
  const beQLong = breakEvenQueries(input, 'long');
  const beQCached = breakEvenQueries(input, 'cached');
  const warm = warmQueriesPerDay(300);

  const summary = `At ${input.queries.toLocaleString('en-US')} questions a day over ${tok(input.corpus)} tokens: ${costs.map((c) => `${c.name} ${fmt.usd(c.day)} a day`).join(', ')}. Cheapest: ${cheapest.name}.${canFit ? '' : ' The collection does not fit in the window.'}`;

  return (
    <Root>
      <div className="viz wlb wlb-lc">
        <p className="viz-title">Stuff it, cache it, or retrieve it?</p>
        <p className="wlb-note">
          Every price, multiplier and size here is an example you can change. Nothing is a quote: take real numbers from your vendor&apos;s pricing page.
        </p>

        <div className="wlb-row" role="group" aria-label="Example collections">
          <span className="wlb-label">Start from</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="wlb-chip"
              aria-pressed={CORPUS_STOPS[ci] === p.corpus && QUERY_STOPS[qi] === p.queries}
              onClick={() => {
                setCi(nearest(CORPUS_STOPS, p.corpus));
                setQi(nearest(QUERY_STOPS, p.queries));
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="wlb-sliders">
          <label className="wlb-slide">
            <span>
              Collection size: <b>{tok(CORPUS_STOPS[ci])}</b> tokens
            </span>
            <input type="range" min={0} max={CORPUS_STOPS.length - 1} step={1} value={ci} onChange={(e) => setCi(+e.target.value)} aria-valuetext={`${CORPUS_STOPS[ci].toLocaleString('en-US')} tokens`} />
          </label>
          <label className="wlb-slide">
            <span>
              Questions per day: <b>{QUERY_STOPS[qi].toLocaleString('en-US')}</b>
            </span>
            <input type="range" min={0} max={QUERY_STOPS.length - 1} step={1} value={qi} onChange={(e) => setQi(+e.target.value)} aria-valuetext={`${QUERY_STOPS[qi].toLocaleString('en-US')} questions a day`} />
          </label>
          <label className="wlb-slide">
            <span>
              Cache hit rate: <b>{hit}%</b> of questions find the cache warm
            </span>
            <input type="range" min={0} max={100} step={5} value={hit} onChange={(e) => setHit(+e.target.value)} aria-valuetext={`${hit} per cent`} />
          </label>
        </div>

        <details className="wlb-adv">
          <summary>Prices and assumptions (all examples)</summary>
          <div className="wlb-grid">
            <Num label="Input $ per million tokens" value={pIn} onChange={setPIn} step={0.1} />
            <Num label="Output $ per million tokens" value={pOut} onChange={setPOut} step={0.5} />
            <Num label="Cache read, times input price" value={readMult} onChange={setReadMult} step={0.05} />
            <Num label="Cache write, times input price" value={writeMult} onChange={setWriteMult} step={0.05} />
            <Num label="Tokens retrieved per question" value={ragTokens} onChange={setRagTokens} step={500} />
            <Num label="Retrieval infrastructure, $ per day" value={infra} onChange={setInfra} step={1} />
            <Num label="Context window, tokens" value={win} onChange={setWin} step={100000} min={1} />
          </div>
          <p className="wlb-fine">
            Each question is {EXAMPLE.question} tokens and each answer {EXAMPLE.answer}. The question is never cached.
          </p>
        </details>

        <ul className="wlb-bars" aria-label="Cost per day for each design">
          {costs.map((c) => (
            <li key={c.id} className={'wlb-bar' + (c.id === cheapest.id ? ' is-best' : '')}>
              <div className="wlb-barhead">
                <span className="wlb-barname">
                  {c.name} <small>{c.sub}</small>
                </span>
                <span className="wlb-barval num">{fmt.usd(c.day)} / day</span>
              </div>
              <div className="wlb-track" aria-hidden="true">
                <div className="wlb-fill" style={{ width: `${Math.max(1.5, (c.day / max) * 100)}%` }} />
              </div>
              <p className="wlb-barmeta num">
                {fmt.usd(c.day / Math.max(1, input.queries))} per question, about {tok(c.prompt)} tokens read each time
                {c.id === cheapest.id ? ' · cheapest' : ''}
                {c.id !== 'rag' && !canFit ? ' · does not fit the window' : ''}
              </p>
            </li>
          ))}
        </ul>
        <p className="sr-only" aria-live="polite">
          {summary}
        </p>

        <div className="wlb-calc">
          <p className="wlb-h">Where the lines cross</p>
          <p>
            Caching beats not caching only above a hit rate of <b>{(beHit * 100).toFixed(0)}%</b> with these multipliers (a write costs {writeMult}x, a read {readMult}x). You set {hit}%.
          </p>
          <p>
            At {input.queries.toLocaleString('en-US')} questions a day, uncached stuffing is cheaper than retrieval only for collections under{' '}
            <b>{beCorpusLong === null ? 'n/a' : tok(Math.round(beCorpusLong))}</b> tokens; cached, under <b>{beCorpusCached === null ? 'n/a' : tok(Math.round(beCorpusCached))}</b>.
          </p>
          <p>
            For this collection, retrieval&apos;s fixed {fmt.usd(infra)} a day is worth paying above about{' '}
            <b>{beQLong === null ? 'any' : Math.ceil(beQLong).toLocaleString('en-US')}</b> questions a day against uncached stuffing, and above{' '}
            <b>{beQCached === null ? 'any' : Math.ceil(beQCached).toLocaleString('en-US')}</b> against cached.
          </p>
          <p className="wlb-fine">
            A cache with an example 5-minute lifetime stays warm on its own only if a question arrives at least every 5 minutes, about {Math.round(warm)} a day spread evenly. Lifetimes differ by vendor and setting.
          </p>
        </div>

        <div className="wlb-caveat">
          <p className="wlb-h">The cost is not the whole answer</p>
          <div className="wlb-row" role="group" aria-label="What the questions ask">
            <span className="wlb-label">Questions</span>
            {TASKS.map((t) => (
              <button key={t.id} type="button" className="wlb-chip" aria-pressed={task === t.id} onClick={() => setTask(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="wlb-row" role="group" aria-label="How often the documents change">
            <span className="wlb-label">Changes</span>
            {CHURN.map((t) => (
              <button key={t.id} type="button" className="wlb-chip" aria-pressed={churn === t.id} onClick={() => setChurn(t.id)}>
                {t.label}
              </button>
            ))}
            <button type="button" className="wlb-chip wlb-chip-quiet" aria-pressed={access} onClick={() => setAccess((a) => !a)}>
              Per-user permissions
            </button>
          </div>
          <ul className="wlb-notes" aria-live="polite">
            {notes.map((n, i) => (
              <li key={i} className={`wlb-n wlb-n-${n.tone}`}>
                {n.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Root>
  );
}
