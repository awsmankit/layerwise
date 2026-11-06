import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  POPULATION,
  accuracy,
  alwaysNo,
  cells,
  crossoverEvents,
  detector,
  exampleDetector,
  precision,
  recall,
  type Cell,
  type Confusion,
} from '../../lib/whatif/accuracy-trap';

const W = 340;
const COLS = 50;
const ROWS = POPULATION / COLS;
const CELL = W / COLS;
const BLOCK_H = 18 + ROWS * CELL + 10;

const pct = (v: number | null, digits = 0) => (v === null ? 'n/a' : `${(v * 100).toFixed(digits)}%`);

function Waffle({ y, title, right, states }: { y: number; title: string; right: string; states: Cell[] }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <text x={0} y={12} className="we-t-b">{title}</text>
      <text x={W} y={12} textAnchor="end" className="we-t">{right}</text>
      <g transform="translate(0 18)">
        {states.map((s, i) => {
          const cx = (i % COLS) * CELL + CELL / 2;
          const cy = Math.floor(i / COLS) * CELL + CELL / 2;
          if (s === 'tn') return <circle key={i} cx={cx} cy={cy} r={1.2} fill="var(--ink)" opacity={0.22} />;
          if (s === 'fp') return <circle key={i} cx={cx} cy={cy} r={2.9} fill="#e0a21e" stroke="var(--ink)" strokeWidth={0.6} />;
          if (s === 'tp') return <rect key={i} x={cx - 3} y={cy - 3} width={6} height={6} fill="#1f9d6b" stroke="var(--ink)" strokeWidth={0.9} />;
          return <rect key={i} x={cx - 3} y={cy - 3} width={6} height={6} fill="#d6453d" />;
        })}
      </g>
    </g>
  );
}

function Matrix({ title, c }: { title: string; c: Confusion }) {
  return (
    <table className="we-matrix">
      <caption>{title}</caption>
      <thead>
        <tr>
          <th />
          <th scope="col">Alarm</th>
          <th scope="col">No alarm</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Event there</th>
          <td className="is-tp"><b>{c.tp}</b><small>found (TP)</small></td>
          <td className="is-fn"><b>{c.fn}</b><small>missed (FN)</small></td>
        </tr>
        <tr>
          <th scope="row">No event</th>
          <td className="is-fp"><b>{c.fp}</b><small>false alarm (FP)</small></td>
          <td className="is-tn"><b>{c.tn}</b><small>correct (TN)</small></td>
        </tr>
      </tbody>
    </table>
  );
}

function Bar({ label, value, shown, bad, top }: { label: string; value: number | null; shown: string; bad?: boolean; top?: boolean }) {
  return (
    <div className={`we-bar${top ? ' is-top' : ''}`}>
      <span>{label}</span>
      <div className="we-track">
        <motion.div className={`we-fill${bad ? ' is-bad' : ''}`} initial={false} animate={{ width: `${(value ?? 0) * 100}%` }} transition={{ duration: 0.45, ease: EASE }} />
      </div>
      <b>{shown}</b>
    </div>
  );
}

/**
 * 1,000 clips, a few with a rare event. A do-nothing model and an example detector, side by side.
 * Accuracy alone ranks the do-nothing model first. Recall and precision show what it really does.
 */
export default function AccuracyTrapWhatIf() {
  const [full, setFull] = useState(true);
  const [events, setEvents] = useState(10);

  const none = useMemo(() => alwaysNo(events), [events]);
  const det = useMemo(() => detector(events), [events]);
  const noneCells = useMemo(() => cells(none), [none]);
  const detCells = useMemo(() => cells(det), [det]);

  const accNone = accuracy(none);
  const accDet = accuracy(det);
  const baselineWins = accNone > accDet;
  const cross = crossoverEvents();

  return (
    <WhatIfFrame
      title={`1,000 clips, ${events} of them hold a rare event`}
      withLabel="Accuracy and recall"
      withoutLabel="Accuracy alone"
      on={full}
      onChange={setFull}
      verdict={
        full ? (
          <>
            The detector finds {det.tp} of {events} events (recall {pct(recall(det))}), but only {pct(precision(det))} of its alarms are real (precision). The do-nothing model has recall {pct(recall(none))}: it finds none.
          </>
        ) : baselineWins ? (
          <>
            By accuracy alone, "always say no" scores {pct(accNone, 1)} and the real detector {pct(accDet, 1)}. The do-nothing model looks best while it finds {none.tp} of {events} events.
          </>
        ) : (
          <>
            With {events} events in 1,000 clips, accuracy now favours the detector: {pct(accDet, 1)} against {pct(accNone, 1)}. Slide the events down to {cross} or fewer to see the trap.
          </>
        )
      }
      controls={
        <label className="field">
          <span>
            Events in 1,000 clips <b>{events}</b>
          </span>
          <input type="range" min={1} max={200} step={1} value={events} onChange={(e) => setEvents(+e.target.value)} aria-label="How many of the 1,000 clips hold the rare event" />
        </label>
      }
    >
      <svg viewBox={`0 0 ${W} ${BLOCK_H * 2 + 6}`} className="dx-svg wi-svg we-svg" role="img" aria-label={`Two grids of 1,000 clips. Always say no finds ${none.tp} of ${events} events. The example detector finds ${det.tp} of ${events} with ${det.fp} false alarms.`}>
        <Waffle y={0} title="Always say no" right={`finds ${none.tp} of ${events}`} states={noneCells} />
        <Waffle y={BLOCK_H + 6} title="Example detector" right={`finds ${det.tp} of ${events}, ${det.fp} false alarms`} states={detCells} />
      </svg>
      <ul className="we-legend" aria-label="Key">
        <li><span className="we-sw" style={{ background: '#1f9d6b', border: '1px solid var(--ink)' }} /> event found</li>
        <li><span className="we-sw" style={{ background: '#d6453d' }} /> event missed</li>
        <li><span className="we-sw is-round" style={{ background: '#e0a21e', border: '1px solid var(--ink)' }} /> false alarm</li>
        <li><span className="we-sw is-round" style={{ background: 'var(--ink)', opacity: 0.25, width: '0.4rem', height: '0.4rem' }} /> normal clip</li>
      </ul>

      <div className="we-metric">
        <h4>
          Accuracy <small>share of all clips judged right</small>
        </h4>
        <Bar label="Always say no" value={accNone} shown={pct(accNone, 1)} top={baselineWins} />
        <Bar label="Example detector" value={accDet} shown={pct(accDet, 1)} top={!baselineWins} />
        {baselineWins && <p className="we-note" style={{ margin: '0.2rem 0 0' }}>Higher is better, so accuracy picks "always say no".</p>}
      </div>

      {full ? (
        <>
          <div className="we-metric">
            <h4>
              Recall <small>share of real events found</small>
            </h4>
            <Bar label="Always say no" value={recall(none)} shown={pct(recall(none))} bad />
            <Bar label="Example detector" value={recall(det)} shown={pct(recall(det))} />
          </div>
          <div className="we-metric">
            <h4>
              Precision <small>share of alarms that were real</small>
            </h4>
            <Bar label="Always say no" value={0} shown="n/a" bad />
            <Bar label="Example detector" value={precision(det)} shown={pct(precision(det))} bad={(precision(det) ?? 0) < 0.5} />
          </div>
          <div className="we-matrices">
            <Matrix title="Always say no" c={none} />
            <Matrix title="Example detector" c={det} />
          </div>
        </>
      ) : (
        <p className="we-note">Recall, precision and the counts are hidden. Switch to "Accuracy and recall" to see what each model really does.</p>
      )}
      <p className="we-example">
        <b>Example detector, not a real product:</b> it finds {Math.round(exampleDetector.recall * 100)}% of events and raises a false alarm on {Math.round(exampleDetector.falseAlarmRate * 100)}% of clips with no event. With these settings the do-nothing model wins on accuracy until the events reach about {cross + 1} in 1,000.
      </p>
    </WhatIfFrame>
  );
}
