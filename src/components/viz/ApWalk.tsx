import { useMemo, useState } from 'react';
import { Root } from './shared';
import { AP_DETS, AP_GTS, apAllPoint, apCocoMean, envelope, matchDetections } from '../../lib/detection';

/*
 * Average precision, step by step. Ten detections, ranked by score, are checked against six real objects.
 * Reveal them one at a time and watch precision and recall change, then add up the slices.
 */

const THRS = [0.5, 0.75, 0.9];
const CW = 320;
const CH = 200;
const PAD = { l: 38, r: 10, t: 26, b: 34 };
const X = (r: number) => PAD.l + r * (CW - PAD.l - PAD.r);
const Y = (p: number) => PAD.t + (1 - p) * (CH - PAD.t - PAD.b);

export default function ApWalk() {
  const [thr, setThr] = useState(0.5);
  const [shown, setShown] = useState(4);
  const rows = useMemo(() => matchDetections(AP_DETS, AP_GTS, thr), [thr]);
  const full = useMemo(() => apAllPoint(rows), [rows]);
  const cocoMean = useMemo(() => apCocoMean(AP_DETS, AP_GTS), []);
  const seen = rows.slice(0, shown);
  const last = seen[seen.length - 1];
  const env = useMemo(() => envelope(rows.map((r) => r.precision)), [rows]);
  const done = shown === rows.length;

  // the staircase of the envelope up to the revealed rows
  let path = `M ${X(0)} ${Y(env[0] ?? 0)}`;
  let prevR = 0;
  seen.forEach((r, i) => {
    if (r.recall > prevR) {
      path += ` H ${X(r.recall)}`;
      prevR = r.recall;
    }
    const next = seen[i + 1];
    if (next && next.recall > prevR) path += ` V ${Y(env[i + 1])}`;
  });

  return (
    <Root>
      <div className="viz w5a-ap">
        <p className="viz-title">Average precision, one detection at a time</p>
        <p className="w5a-note">
          A test set has 6 real objects. The detector made 10 boxes, shown from the most confident to the least. A box is a hit if its IoU with a real object that has not been matched yet is at least the threshold.
        </p>
        <div className="w5a-row" role="group" aria-label="IoU threshold for a hit">
          <span className="w5a-lab">Hit means IoU of at least</span>
          {THRS.map((t) => (
            <button key={t} type="button" className="w5a-chip" aria-pressed={thr === t} onClick={() => setThr(t)}>
              {t}
            </button>
          ))}
        </div>
        <label className="field">
          <span>
            Boxes revealed <b>{shown} of {rows.length}</b>
          </span>
          <input type="range" min={1} max={rows.length} step={1} value={shown} onChange={(e) => setShown(+e.target.value)} aria-label="How many ranked boxes to reveal" />
        </label>

        <div className="w5a-tablewrap">
          <table className="w5a-table w5a-ap-table">
            <caption className="sr-only">Detections ranked by score with precision and recall after each one</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Score</th>
                <th scope="col">IoU</th>
                <th scope="col">Hit?</th>
                <th scope="col">Prec.</th>
                <th scope="col">Recall</th>
              </tr>
            </thead>
            <tbody>
              {seen.map((r) => (
                <tr key={r.rank} className={r.tp ? 'is-kept' : 'is-gone'}>
                  <th scope="row">{r.rank}</th>
                  <td>{r.score.toFixed(2)}</td>
                  <td>{r.bestIou.toFixed(2)}</td>
                  <td>{r.tp ? 'yes' : r.bestIou >= thr ? 'repeat' : 'no'}</td>
                  <td>{r.precision.toFixed(2)}</td>
                  <td>{r.recall.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <svg className="w5a-ap-svg" viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={`Precision against recall for the first ${shown} boxes. ${done ? `Average precision is ${full.ap.toFixed(2)}.` : ''}`}>
          <line x1={PAD.l} y1={Y(0)} x2={CW - PAD.r} y2={Y(0)} className="w5a-axis" />
          <line x1={PAD.l} y1={Y(0)} x2={PAD.l} y2={Y(1)} className="w5a-axis" />
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <text x={PAD.l - 6} y={Y(v) + 4} textAnchor="end" className="w5a-svg-t">{v}</text>
              <text x={X(v)} y={CH - 16} textAnchor="middle" className="w5a-svg-t">{v}</text>
            </g>
          ))}
          <text x={(PAD.l + CW - PAD.r) / 2} y={CH - 2} textAnchor="middle" className="w5a-svg-t">recall</text>
          <text x="4" y="12" className="w5a-svg-t">precision</text>
          {done &&
            full.steps.map((s, i) => (
              <rect key={i} x={X(s.recallFrom)} y={Y(s.precision)} width={X(s.recallTo) - X(s.recallFrom)} height={Y(0) - Y(s.precision)} className="w5a-ap-area" />
            ))}
          <path d={path} className="w5a-ap-line" fill="none" />
          {seen.map((r) => (
            <circle key={r.rank} cx={X(r.recall)} cy={Y(r.precision)} r="4.5" className={r.tp ? 'w5a-pt-hit' : 'w5a-pt-miss'} />
          ))}
        </svg>
        <p className="w5a-note">Dots: after each box, where the detector stands. Filled dots follow a hit, open dots a miss ("repeat" means a second box on an object already found). Precision is hits so far divided by boxes so far, and recall is hits so far divided by 6. The line is the best precision available at that recall or higher.</p>

        <div className="w5a-sum" aria-live="polite">
          {done ? (
            <>
              <p>
                Add one slice for each step up in recall (each hit adds 1/6 = 0.17):
              </p>
              <ul className="w5a-steps">
                {full.steps.map((s, i) => (
                  <li key={i}>
                    {(s.recallTo - s.recallFrom).toFixed(2)} × {s.precision.toFixed(2)} = {s.area.toFixed(3)}
                  </li>
                ))}
                {full.steps.length === 0 && <li>No hits, so nothing to add.</li>}
              </ul>
              <p className="w5a-big">
                Average precision at IoU {thr}: <b>{full.ap.toFixed(3)}</b>
              </p>
              <p className="w5a-note">
                The COCO benchmark samples the curve at 101 recall levels and averages over ten IoU thresholds, 0.50, 0.55 up to 0.95. For these ten boxes that gives {cocoMean.toFixed(3)}. These are example numbers for a made-up detector.
              </p>
            </>
          ) : (
            <p>
              After {shown} {shown === 1 ? 'box' : 'boxes'}: {last.tpCount} {last.tpCount === 1 ? 'hit' : 'hits'} and {last.fpCount} {last.fpCount === 1 ? 'miss' : 'misses'}. Precision is {last.tpCount}/{last.tpCount + last.fpCount} = {last.precision.toFixed(2)} (how many boxes so far were right). Recall is {last.tpCount}/6 = {last.recall.toFixed(2)} (how many real objects so far were found). Reveal all 10 to add up the area.
            </p>
          )}
        </div>
      </div>
    </Root>
  );
}
