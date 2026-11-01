import { useMemo, useState } from 'react';
import { Root } from './shared';
import { NMS_SCENE, PERSON_A, PERSON_B, iou, nms, summariseKept } from '../../lib/detection';

/*
 * Non-maximum suppression on a scripted set of eight detections of two people standing close together.
 * One slider, the IoU threshold, decides which boxes are kept.
 */

const W = 320;
const H = 210;

function Person({ x1, x2, y1, y2 }: { x1: number; x2: number; y1: number; y2: number }) {
  const cx = (x1 + x2) / 2;
  const head = 20;
  return (
    <g className="w5a-person" aria-hidden="true">
      <circle cx={cx} cy={y1 + 8 + head} r={head} />
      <rect x={x1 + 12} y={y1 + 8 + head * 2 + 4} width={x2 - x1 - 24} height={y2 - y1 - head * 2 - 20} rx="18" />
    </g>
  );
}

export default function NmsLab() {
  const [thr, setThr] = useState(0.5);
  const rows = useMemo(() => nms(NMS_SCENE, thr), [thr]);
  const sum = useMemo(() => summariseKept(rows, [PERSON_A, PERSON_B]), [rows]);
  const tNow = thr.toFixed(2);

  return (
    <Root>
      <div className="viz w5a-nms">
        <p className="viz-title">Non-maximum suppression: which overlapping boxes survive?</p>
        <p className="w5a-note">Two people stand close together. A detector has drawn eight boxes: four around the left person (A), three around the right person (B) and one wrong box (X) on empty ground.</p>

        <svg className="w5a-nms-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Eight detection boxes around two people. At a threshold of ${tNow}, ${sum.kept} are kept: ${rows.filter((r) => r.kept).map((r) => r.det.id).join(', ')}.`}>
          <rect x="0" y="0" width={W} height={H} className="w5a-iou-bg" />
          <Person {...PERSON_A} />
          <Person {...PERSON_B} />
          {rows
            .slice()
            .sort((a, b) => Number(a.kept) - Number(b.kept))
            .map((r) => {
              const b = r.det.box;
              return (
                <g key={r.det.id} className={r.kept ? 'w5a-box-kept' : 'w5a-box-gone'}>
                  <rect x={b.x1} y={b.y1} width={b.x2 - b.x1} height={b.y2 - b.y1} />
                  {r.kept && (
                    <text x={b.x1 + 3} y={b.y1 + 13} className="w5a-box-id">
                      {r.det.id}
                    </text>
                  )}
                </g>
              );
            })}
        </svg>

        <label className="field">
          <span>
            Remove a box if it overlaps a better one by more than <b>{tNow}</b>
          </span>
          <input type="range" min={0.1} max={0.95} step={0.05} value={thr} onChange={(e) => setThr(+e.target.value)} aria-label="IoU threshold" aria-valuetext={`${tNow}`} />
        </label>
        <div className="w5a-row" role="group" aria-label="Preset thresholds">
          <span className="w5a-lab">Try</span>
          <button type="button" className="w5a-chip" onClick={() => setThr(0.2)}>Too low (0.2)</button>
          <button type="button" className="w5a-chip" onClick={() => setThr(0.5)}>Usual (0.5)</button>
          <button type="button" className="w5a-chip" onClick={() => setThr(0.9)}>Too high (0.9)</button>
        </div>

        <p className="w5a-result" aria-live="polite">
          Kept <b>{sum.kept}</b> of 8. People found: <b>{sum.found} of 2</b>. Duplicates left: <b>{sum.duplicates}</b>. Wrong boxes left: <b>{sum.wrong}</b>.
          {sum.found < 2 && ' A real person was removed because their box overlapped their neighbour’s better box.'}
          {sum.duplicates > 0 && ' The same person still has more than one box.'}
        </p>

        <div className="w5a-tablewrap">
          <table className="w5a-table">
            <caption className="sr-only">The eight boxes from highest score to lowest, and what happened to each</caption>
            <thead>
              <tr>
                <th scope="col">Box</th>
                <th scope="col">Score</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.det.id} className={r.kept ? 'is-kept' : 'is-gone'}>
                  <th scope="row">{r.det.id}</th>
                  <td>{r.det.score.toFixed(2)}</td>
                  <td>
                    {r.kept ? (
                      'kept'
                    ) : (
                      <>
                        removed: IoU with {r.by!.id} is {r.iou!.toFixed(2)}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="viz-cap">
          The two real people overlap each other with an IoU of {iou(PERSON_A, PERSON_B).toFixed(2)} (example numbers for a made-up picture). NMS removes duplicates but cannot tell that box X is wrong; that takes a score cut-off.
        </p>
      </div>
    </Root>
  );
}
