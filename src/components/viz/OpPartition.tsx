import { useMemo, useState } from 'react';
import { Root } from './shared';
import { GRAPHS, evaluate } from '../../lib/op-partition';

const ms = (n: number) => (n >= 10 ? n.toFixed(1) : n.toFixed(2)) + ' ms';

/**
 * A small op graph. Tap an op to say whether the accelerator supports it. Consecutive supported ops form one
 * partition; every partition costs two hand-offs. All timings are examples, not measurements.
 */
export default function OpPartition() {
  const [graphId, setGraphId] = useState('tfm');
  const graph = GRAPHS.find((g) => g.id === graphId)!;
  const [support, setSupport] = useState<Record<string, boolean[]>>(() => Object.fromEntries(GRAPHS.map((g) => [g.id, [...g.supported]])));
  const [speedup, setSpeedup] = useState(10);
  const [handoff, setHandoff] = useState(0.3);
  const [focus, setFocus] = useState<number | null>(null);

  const supported = support[graphId];
  const r = useMemo(() => evaluate(graph.ops, supported, { speedup, handoffMs: handoff }), [graph, supported, speedup, handoff]);

  const toggle = (i: number) => {
    setFocus(i);
    setSupport((prev) => ({ ...prev, [graphId]: prev[graphId].map((v, k) => (k === i ? !v : v)) }));
  };
  const setAll = (v: boolean) => setSupport((prev) => ({ ...prev, [graphId]: graph.ops.map(() => v) }));
  const reset = () => setSupport((prev) => ({ ...prev, [graphId]: [...graph.supported] }));

  const placement = graph.ops.map((_, i) => supported[i]);
  const cutBefore = placement.map((p, i) => i > 0 && p !== placement[i - 1]);
  const scale = Math.max(r.cpuOnlyMs, r.totalMs) * 1.02;
  const w = (v: number) => `${(v / scale) * 100}%`;

  const faster = r.totalMs < r.cpuOnlyMs;
  const verdict =
    r.partitions === 0
      ? `Nothing is delegated, so the whole model runs on the CPU in ${ms(r.cpuOnlyMs)}.`
      : `${r.partitions} accelerator ${r.partitions === 1 ? 'partition' : 'partitions'} and ${r.handoffs} hand-offs: ${ms(r.totalMs)} in all, ${faster ? (r.cpuOnlyMs / r.totalMs).toFixed(1) + ' times faster than' : 'slower than'} the ${ms(r.cpuOnlyMs)} CPU-only run. ${
          r.breakEvenHandoffMs !== null ? `Delegation stops paying off once each hand-off costs more than about ${ms(r.breakEvenHandoffMs)}.` : ''
        }`;

  return (
    <Root>
      <div className="viz ea-op">
        <p className="viz-title">Where the model gets cut</p>
        <div className="ea-chips" role="group" aria-label="Model">
          {GRAPHS.map((g) => (
            <button key={g.id} type="button" className="ea-chip" aria-pressed={g.id === graphId} onClick={() => { setGraphId(g.id); setFocus(null); }}>
              <span className="ea-chip-name">{g.name}</span>
            </button>
          ))}
        </div>
        <p className="ea-cap">{graph.blurb} Tap an operator to switch whether the accelerator supports it.</p>

        <ol className="ea-ops" aria-label="Operators in order">
          {graph.ops.map((op, i) => (
            <li key={i} className={cutBefore[i] ? 'ea-cut' : ''}>
              {cutBefore[i] && <span className="ea-hand">hand-off</span>}
              <button
                type="button"
                className={`ea-op-btn ${supported[i] ? 'accel' : 'cpu'} ${focus === i ? 'is-focus' : ''}`}
                aria-pressed={supported[i]}
                aria-label={`${op.name}: ${supported[i] ? 'runs on the accelerator' : 'runs on the CPU'}${cutBefore[i] ? ', hand-off before it' : ''}. Tap to switch.`}
                onClick={() => toggle(i)}
              >
                <span className="ea-op-name">{op.name}</span>
                <span className="ea-op-where">{supported[i] ? 'Accelerator' : 'CPU'}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="ea-buttons">
          <button type="button" className="ea-chip" onClick={() => setAll(true)}>
            <span className="ea-chip-name">Support everything</span>
          </button>
          <button type="button" className="ea-chip" onClick={() => setAll(false)}>
            <span className="ea-chip-name">Support nothing</span>
          </button>
          <button type="button" className="ea-chip" onClick={reset}>
            <span className="ea-chip-name">Reset</span>
          </button>
        </div>

        {focus !== null && (
          <p className="ea-hint" aria-live="polite">
            <b>{graph.ops[focus].name}.</b> {graph.ops[focus].hint}
          </p>
        )}

        <div className="viz-controls ea-sliders">
          <label className="field">
            <span>
              Accelerator speed-up <b>{speedup}x</b>
            </span>
            <input type="range" min={2} max={50} step={1} value={speedup} onChange={(e) => setSpeedup(+e.target.value)} />
          </label>
          <label className="field">
            <span>
              Cost of each hand-off <b>{ms(handoff)}</b>
            </span>
            <input type="range" min={0} max={5} step={0.05} value={handoff} onChange={(e) => setHandoff(+e.target.value)} />
          </label>
        </div>

        <div className="ea-bars">
          <div className="ea-bar-row">
            <span className="ea-bar-name">CPU only</span>
            <div className="ea-stack" aria-hidden="true">
              <span className="ea-seg cpu" style={{ width: w(r.cpuOnlyMs) }} />
            </div>
            <span className="ea-bar-val num">{ms(r.cpuOnlyMs)}</span>
          </div>
          <div className="ea-bar-row">
            <span className="ea-bar-name">This split</span>
            <div className="ea-stack" aria-hidden="true">
              <span className="ea-seg accel" style={{ width: w(r.accelComputeMs) }} />
              <span className="ea-seg cpu" style={{ width: w(r.cpuComputeMs) }} />
              <span className="ea-seg hand" style={{ width: w(r.handoffTotalMs) }} />
            </div>
            <span className="ea-bar-val num">{ms(r.totalMs)}</span>
          </div>
          <div className="ea-bar-row">
            <span className="ea-bar-name">All supported</span>
            <div className="ea-stack" aria-hidden="true">
              <span className="ea-seg accel" style={{ width: w(r.cpuOnlyMs / speedup) }} />
              <span className="ea-seg hand" style={{ width: w(2 * handoff) }} />
            </div>
            <span className="ea-bar-val num">{ms(r.allSupportedMs)}</span>
          </div>
        </div>
        <ul className="ea-legend">
          <li><i className="ea-key accel" aria-hidden="true" /> time on the accelerator: {ms(r.accelComputeMs)}</li>
          <li><i className="ea-key cpu" aria-hidden="true" /> time on the CPU: {ms(r.cpuComputeMs)}</li>
          <li><i className="ea-key hand" aria-hidden="true" /> hand-offs: {ms(r.handoffTotalMs)}</li>
        </ul>

        <p className="ea-verdict" aria-live="polite">
          {verdict}
        </p>
        <p className="viz-cap">Every time in this figure is an example chosen to show the effect, not a measurement of any chip or runtime. Real hand-offs depend on whether the CPU and accelerator share memory and on how the runtime synchronises them.</p>
      </div>
    </Root>
  );
}
