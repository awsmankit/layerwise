import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Root, fmt } from './shared';
import PatternSvg from './PatternSvg';
import { buildRun, DEFAULT_LOOKUPS, EXAMPLE, LOOKUP_CHOICES, PATTERNS, PATTERN_BY_ID, snapshot, type PatternId, type Step } from '../../lib/agent-patterns';

const SHORT: Record<PatternId, string> = {
  single: 'One agent',
  pipeline: 'Pipeline',
  routing: 'Routing',
  parallel: 'Parallel',
  orchestrator: 'Orchestrator',
  evaluator: 'Evaluator',
  handoff: 'Hand-off',
};

const secs = (ms: number) => (ms / 1000).toFixed(1) + ' s';
const ratio = (a: number, b: number) => (b ? (a / b).toFixed(2) + 'x' : '-');

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduced;
}

/**
 * Pick a way to organise the model calls for one scripted task and watch the messages flow, with a live
 * tally of tokens, cost and time beside the same task done by one agent. An illustrative simulation:
 * every number comes from the example assumptions in lib/agent-patterns.ts.
 */
export default function PatternExplorer() {
  const [pattern, setPattern] = useState<PatternId>('orchestrator');
  const [lookups, setLookups] = useState<number>(DEFAULT_LOOKUPS);
  const [batch, setBatch] = useState(false);
  const [fail, setFail] = useState(false);
  const [checker, setChecker] = useState(false);
  const [frac, setFrac] = useState(1);
  const [playing, setPlaying] = useState(false);
  const reduced = usePrefersReducedMotion();

  const run = useMemo(() => buildRun(pattern, { lookups, batch, fail, checker }), [pattern, lookups, batch, fail, checker]);
  const base = useMemo(() => buildRun('single', { lookups, batch, fail: false, checker: false }), [lookups, batch]);
  const T = run.totals.ms;
  const t = frac * T;
  const snap = snapshot(run, t);
  const finished = frac >= 1;
  const info = PATTERN_BY_ID[pattern];

  // Any change of setting jumps to the finished picture; Play replays it.
  useEffect(() => {
    setPlaying(false);
    setFrac(1);
  }, [pattern, lookups, batch, fail, checker]);

  const fracRef = useRef(frac);
  fracRef.current = frac;
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const speed = Math.max(4, T / 8000);
    const tick = (now: number) => {
      const next = Math.min(1, fracRef.current + ((now - last) * speed) / T);
      last = now;
      fracRef.current = next;
      setFrac(next);
      if (next >= 1) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, T]);

  const play = useCallback(() => {
    if (reduced) {
      setPlaying(false);
      setFrac(1);
      return;
    }
    if (playing) {
      setPlaying(false);
      return;
    }
    if (fracRef.current >= 1) {
      fracRef.current = 0;
      setFrac(0);
    }
    setPlaying(true);
  }, [playing, reduced]);

  const lanes = run.lanes.map((l) => ({ ...l, steps: run.steps.filter((s) => s.actor === l.id) }));
  const batchApplies = pattern === 'single' || pattern === 'routing' || pattern === 'handoff';
  const checkerApplies = pattern !== 'evaluator';

  return (
    <Root>
      <div className="viz ab-pe">
        <p className="viz-title">Pattern explorer: one task, seven ways to organise it</p>
        <p className="ab-flagline">Illustrative simulation. The tokens, prices and timings are example numbers, not measurements of any model.</p>
        <p className="ab-task">
          <b>The task.</b> A customer writes that three orders arrived damaged. For each order the system makes {lookups} {lookups === 1 ? 'lookup' : 'lookups'} (one after another), then checks the refund policy and writes one correct reply.
        </p>

        <div className="ab-ctl" role="group" aria-label="Pattern">
          {PATTERNS.map((p) => (
            <button key={p.id} type="button" className="ab-chip" aria-pressed={pattern === p.id} onClick={() => setPattern(p.id)}>
              {SHORT[p.id]}
            </button>
          ))}
        </div>

        <div className="ab-opts">
          <div className="ab-optgroup" role="group" aria-label="Lookups per order">
            <span className="ab-optlabel">Lookups per order</span>
            <span className="ab-segs">
              {LOOKUP_CHOICES.map((k) => (
                <button key={k} type="button" className="ab-segbtn" aria-pressed={lookups === k} onClick={() => setLookups(k)}>
                  {k}
                </button>
              ))}
            </span>
          </div>
          <label className="ab-check">
            <input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} />
            <span>A step returns a wrong fact about order 2</span>
          </label>
          <label className={'ab-check' + (checkerApplies ? '' : ' is-off')}>
            <input type="checkbox" checked={checker && checkerApplies} disabled={!checkerApplies} onChange={(e) => setChecker(e.target.checked)} />
            <span>Add an independent checker at the end{checkerApplies ? '' : ' (this pattern has one built in)'}</span>
          </label>
          <label className={'ab-check' + (batchApplies ? '' : ' is-off')}>
            <input type="checkbox" checked={batch && batchApplies} disabled={!batchApplies} onChange={(e) => setBatch(e.target.checked)} />
            <span>Agents batch independent tool calls in one turn{batchApplies ? '' : ' (applies to agent loops only)'}</span>
          </label>
        </div>

        <div className="ab-about">
          <p><b>{info.name}.</b> {info.summary}</p>
          <p><b>Worth it when:</b> {info.fits}</p>
          <p><b>What it costs:</b> {info.cost}</p>
        </div>

        <PatternSvg run={run} t={t} />

        <div className="ab-transport">
          <button type="button" className="btn" onClick={play}>
            {reduced ? 'Show the run' : playing ? 'Pause' : finished ? 'Replay the run' : 'Play'}
          </button>
          <label className="ab-scrub">
            <span className="ab-sr">Time in the run</span>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(frac * 1000)}
              onChange={(e) => {
                setPlaying(false);
                setFrac(Number(e.target.value) / 1000);
              }}
              aria-valuetext={`${secs(t)} of ${secs(T)}`}
            />
          </label>
          <span className="ab-clock" aria-hidden="true">{secs(t)} / {secs(T)}</span>
        </div>

        <div className="ab-gantt" role="group" aria-label="Timeline: when each step runs, one row per agent">
          {lanes.map((l) => (
            <div key={l.id} className="ab-lane">
              <span className="ab-lanelabel">{l.label}</span>
              <span className="ab-track" aria-hidden="true">
                {l.steps.map((s) => (
                  <Bar key={s.id} s={s} T={T} t={t} />
                ))}
                <i className="ab-now" style={{ left: `${frac * 100}%` }} />
              </span>
            </div>
          ))}
          <ul className="ab-legend" aria-label="Legend">
            <li><i className="ab-key is-llm" /> model call</li>
            <li><i className="ab-key is-tool" /> tool or code wait</li>
            <li><i className="ab-key is-check" /> checker</li>
            <li><i className="ab-key is-redo" /> repeated work</li>
            <li><i className="ab-key is-wrong" /> wrong fact</li>
          </ul>
        </div>

        <div className="ab-tallies">
          <section className="ab-tally" aria-label="This run">
            <p className="ab-who">This run{finished ? '' : ', so far'}</p>
            <dl>
              <div><dt>Model calls</dt><dd>{snap.calls}</dd></div>
              <div><dt>Tokens in</dt><dd>{fmt.int(snap.inTok)}</dd></div>
              <div><dt>Tokens out</dt><dd>{fmt.int(snap.outTok)}</dd></div>
              <div><dt>Cost</dt><dd>{fmt.usd(snap.usd)}</dd></div>
              <div><dt>Time</dt><dd>{secs(snap.ms)}</dd></div>
            </dl>
          </section>
          <section className="ab-tally is-base" aria-label="One agent, whole run">
            <p className="ab-who">One agent, whole run</p>
            <dl>
              <div><dt>Model calls</dt><dd>{base.totals.calls}</dd></div>
              <div><dt>Tokens in</dt><dd>{fmt.int(base.totals.inTok)}</dd></div>
              <div><dt>Tokens out</dt><dd>{fmt.int(base.totals.outTok)}</dd></div>
              <div><dt>Cost</dt><dd>{fmt.usd(base.totals.usd)}</dd></div>
              <div><dt>Time</dt><dd>{secs(base.totals.ms)}</dd></div>
            </dl>
          </section>
        </div>
        {pattern !== 'single' && (
          <p className="ab-ratio">
            Whole run against one agent: tokens <b>{ratio(run.totals.tokens, base.totals.tokens)}</b>, cost <b>{ratio(run.totals.usd, base.totals.usd)}</b>, time <b>{ratio(run.totals.ms, base.totals.ms)}</b>.
          </p>
        )}

        <p className={'ab-out ' + (finished ? (run.outcome.correct ? 'is-ok' : 'is-bad') : '')} role="status">
          {finished ? (
            <>
              <b>{run.outcome.correct ? 'Reply correct. ' : 'Reply wrong. '}</b>
              {run.outcome.detail}
            </>
          ) : (
            'Play to the end, or drag the slider, to see the result.'
          )}
        </p>

        <details className="ab-details">
          <summary>Every step as a table</summary>
          <div className="ab-tablewrap">
            <table className="ab-table">
              <thead>
                <tr><th>Lane</th><th>What</th><th>Starts</th><th>Ends</th><th>In</th><th>Out</th></tr>
              </thead>
              <tbody>
                {run.steps.map((s) => (
                  <tr key={s.id} className={s.wrong ? 'is-wrong' : s.redo ? 'is-redo' : ''}>
                    <td>{run.lanes.find((l) => l.id === s.actor)?.label}</td>
                    <td>{s.kind === 'tool' ? 'tool or code' : s.kind === 'check' ? 'check' : 'model call'}{s.wrong ? ', wrong fact' : ''}{s.redo ? ', repeated' : ''}</td>
                    <td>{secs(s.start)}</td>
                    <td>{secs(s.end)}</td>
                    <td>{s.inTok ? fmt.int(s.inTok) : ''}</td>
                    <td>{s.outTok ? fmt.int(s.outTok) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <details className="ab-details">
          <summary>The example assumptions behind every number</summary>
          <ul className="ab-assume">
            <li>Prompt sizes in tokens: one agent that holds every tool definition {EXAMPLE.sysAll}; a specialist or worker {EXAMPLE.sysSpec}; an orchestrator {EXAMPLE.sysOrch}; the email {EXAMPLE.email}.</li>
            <li>Each lookup returns {EXAMPLE.record} tokens; the policy {EXAMPLE.policy}; a tool request {EXAMPLE.toolCall} per call; a worker summary {EXAMPLE.summary}; the reply {100 + 50 * EXAMPLE.orders}.</li>
            <li>Time: {EXAMPLE.ttftMs} ms before the first token, then {EXAMPLE.msPerToken} ms per output token; every tool or code lookup {EXAMPLE.toolMs} ms.</li>
            <li>Price: ${EXAMPLE.priceInPerM} per million input tokens and ${EXAMPLE.priceOutPerM} per million output tokens. These are round example prices, not any vendor's.</li>
            <li>The context is resent in full on every call. Prompt caching would make resent tokens cheaper and narrow the gaps. Lookups within an order depend on each other, so they cannot be batched.</li>
            <li>Workflow patterns (pipeline, parallelisation, evaluator-optimiser) look cheap because this task is one where code knows every lookup in advance. Patterns where a model decides what to do pay for that freedom.</li>
            <li>The wrong fact is injected on purpose, not sampled. Where it appears and what is repeated to fix it follow from each pattern's structure.</li>
          </ul>
        </details>
      </div>
    </Root>
  );
}

function Bar({ s, T, t }: { s: Step; T: number; t: number }) {
  const left = (s.start / T) * 100;
  const width = Math.max(0.5, ((s.end - s.start) / T) * 100);
  const state = t >= s.end ? 'is-done' : t >= s.start ? 'is-run' : 'is-later';
  const cls = `ab-bar is-${s.kind} ${state}` + (s.wrong ? ' is-wrong' : '') + (s.redo ? ' is-redo' : '');
  return <i className={cls} style={{ left: `${left}%`, width: `${width}%` }} />;
}
