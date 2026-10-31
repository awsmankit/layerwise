import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Root, useNarrow } from './shared';
import { boundaryAt, fitLine, logLoss, predict, probability, sigmoid, sse, trainLogistic, type Labelled, type Line, type Pt } from '../../lib/regression';

/* Hours revised (0 to 10) against test mark (0 to 100), and the same hours against pass or fail. Made-up example data. */
const START: Pt[] = [
  [0.5, 20], [1.2, 32], [2, 30], [2.8, 48], [3.5, 51], [4.2, 55], [5, 47], [6, 66], [7, 74], [8, 70], [9.2, 90],
].map(([x, y]) => ({ x, y }));
const START_LABELS: Labelled[] = START.map((p) => ({ x: p.x, label: (p.y >= 50 ? 1 : 0) as 0 | 1 }));
const START_MODEL = { k: 1, x0: 5 };
const CENTRE = 5; // x is centred before gradient descent so a step of 0.5 is safe

type Mode = 'line' | 'yesno';
type Drag = { i: number } | null;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const n1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
const n0 = (v: number) => Math.round(v).toLocaleString('en-GB');

/**
 * Drag points to see the least-squares line and its squared-error squares update, then switch to yes/no
 * and move a decision boundary on a sigmoid curve. Pointer events, so touch works; the dots stop the page
 * scrolling only while a finger is on them.
 */
export default function LineFitter({ start = 'line' }: { start?: Mode }) {
  const narrow = useNarrow();
  const W = narrow ? 340 : 640;
  const H = narrow ? 300 : 380;
  const ML = 38;
  const MR = 12;
  const MT = 12;
  const MB = 28;

  const [mode, setMode] = useState<Mode>(start);
  const [pts, setPts] = useState<Pt[]>(START);
  const [lab, setLab] = useState<Labelled[]>(START_LABELS);
  const [own, setOwn] = useState(false);
  const [mine, setMine] = useState<Line>({ slope: 2, intercept: 40 });
  const [px, setPx] = useState(6);
  const [model, setModel] = useState(START_MODEL);
  const [thr, setThr] = useState(0.5);
  const [sel, setSel] = useState(0);

  const clipId = 'ma-clip-' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag>(null);

  const yMax = mode === 'line' ? 100 : 1;
  const sx = (x: number) => ML + (x / 10) * (W - ML - MR);
  const sy = (v: number) => H - MB - (v / yMax) * (H - MT - MB);

  const best = useMemo(() => fitLine(pts), [pts]);
  const active: Line = own ? mine : best;
  const bestSse = useMemo(() => sse(pts, best), [pts, best]);
  const activeSse = useMemo(() => sse(pts, active), [pts, active]);

  const logi = { w: model.k, b: -model.k * model.x0 };
  const bound = boundaryAt(logi, thr);
  const loss = logLoss(lab, logi);
  const wrong = lab.map((p) => (probability(logi, p.x) >= thr ? 1 : 0) !== p.label);

  /* Keep the page still while a finger is dragging a dot. */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const stop = (e: TouchEvent) => {
      if (drag.current) e.preventDefault();
    };
    el.addEventListener('touchmove', stop, { passive: false });
    return () => el.removeEventListener('touchmove', stop);
  }, []);

  function toData(e: React.PointerEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    const vy = ((e.clientY - r.top) / r.height) * H;
    const x = clamp(((vx - ML) / (W - ML - MR)) * 10, 0, 10);
    const frac = clamp((H - MB - vy) / (H - MT - MB), 0, 1);
    return { x, frac };
  }

  function move(i: number, x: number, frac: number) {
    if (mode === 'line') setPts((a) => a.map((p, j) => (j === i ? { x, y: frac * 100 } : p)));
    else setLab((a) => a.map((p, j) => (j === i ? { x, label: frac >= 0.5 ? 1 : 0 } : p)));
  }

  function down(e: React.PointerEvent, i: number) {
    drag.current = { i };
    setSel(i);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const d = toData(e);
    move(i, d.x, d.frac);
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const d = toData(e);
    move(drag.current.i, d.x, d.frac);
  }
  function up() {
    drag.current = null;
  }

  function key(e: React.KeyboardEvent, i: number) {
    const dx = e.key === 'ArrowRight' ? 0.2 : e.key === 'ArrowLeft' ? -0.2 : 0;
    const up = e.key === 'ArrowUp';
    const down = e.key === 'ArrowDown';
    if (!dx && !up && !down) return;
    e.preventDefault();
    if (mode === 'line') setPts((a) => a.map((p, j) => (j === i ? { x: clamp(p.x + dx, 0, 10), y: clamp(p.y + (up ? 2 : down ? -2 : 0), 0, 100) } : p)));
    else setLab((a) => a.map((p, j) => (j === i ? { x: clamp(p.x + dx, 0, 10), label: up ? 1 : down ? 0 : p.label } : p)));
  }

  function steps(n: number) {
    // gradient descent on centred hours, then convert back to a boundary and a steepness
    const centred = lab.map((p) => ({ x: p.x - CENTRE, label: p.label }));
    const start = { w: model.k, b: model.k * (CENTRE - model.x0) };
    const m = trainLogistic(centred, start, n, 0.5);
    const k = clamp(m.w, 0.1, 6);
    const x0 = clamp(CENTRE - m.b / (Math.abs(m.w) < 1e-6 ? 1e-6 : m.w), 0, 10);
    setModel({ k, x0 });
  }

  function reset() {
    if (mode === 'line') {
      setPts(START);
      setOwn(false);
    } else {
      setLab(START_LABELS);
      setModel(START_MODEL);
      setThr(0.5);
    }
  }

  const xTicks = [0, 2, 4, 6, 8, 10];
  const yTicks = mode === 'line' ? [0, 50, 100] : [0, 0.5, 1];
  const curve = useMemo(() => {
    if (mode !== 'yesno') return '';
    return Array.from({ length: 81 }, (_, i) => {
      const x = i / 8;
      return `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(sigmoid(logi.w * x + logi.b)).toFixed(1)}`;
    }).join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, model.k, model.x0, W, H]);

  const lineY = (x: number) => clamp(predict(active, x), -20, 120);
  const pred = predict(best, px);
  const prob = probability(logi, px);

  const status =
    mode === 'line'
      ? own
        ? `Your line: mark = ${n1(mine.intercept)} + ${n1(mine.slope)} x hours. Sum of squared misses ${n0(activeSse)}. The best line scores ${n0(bestSse)}${activeSse > bestSse + 0.5 ? `, so yours is ${n0(activeSse - bestSse)} higher` : ''}.`
        : `Best line: mark = ${n1(best.intercept)} + ${n1(best.slope)} x hours. Sum of squared misses ${n0(bestSse)} (average ${n0(bestSse / pts.length)} per point). Each extra hour of revision goes with about ${n1(best.slope)} more marks; at 0 hours the line says ${n1(best.intercept)}. At ${n1(px)} hours it predicts ${n1(pred)}.`
      : `At ${n1(px)} hours the curve says a ${Math.round(prob * 100)}% chance of passing. With the threshold at ${Math.round(thr * 100)}%, the model says pass from ${bound === null ? 'nowhere' : n1(bound) + ' hours'} upwards. Right on ${lab.filter((_, i) => !wrong[i]).length} of ${lab.length} points. Log loss ${loss.toFixed(2)}.`;

  const lineSegs = own ? (
    <>
      <line x1={sx(0)} y1={sy(clamp(predict(best, 0), -20, 120))} x2={sx(10)} y2={sy(clamp(predict(best, 10), -20, 120))} className="ma-best-line" />
      <line x1={sx(0)} y1={sy(lineY(0))} x2={sx(10)} y2={sy(lineY(10))} className="ma-line" />
    </>
  ) : (
    <line x1={sx(0)} y1={sy(lineY(0))} x2={sx(10)} y2={sy(lineY(10))} className="ma-line is-best" />
  );

  return (
    <Root>
      <div className="viz ma">
        <div className="ma-top">
          <p className="viz-title">Fit a line, then ask yes or no</p>
          <div className="ma-btns" role="group" aria-label="What to fit">
            <button type="button" className="btn quiet" aria-pressed={mode === 'line'} onClick={() => setMode('line')}>
              Fit a line
            </button>
            <button type="button" className="btn quiet" aria-pressed={mode === 'yesno'} onClick={() => setMode('yesno')}>
              Yes or no
            </button>
          </div>
        </div>
        <p className="ma-axes">
          {mode === 'line' ? 'Across: hours revised. Up: test mark out of 100. Made-up example data.' : 'Across: hours revised. Up: chance of passing, from 0 (fail) to 1 (pass). Same made-up students.'} Drag a dot{mode === 'yesno' ? ' sideways, or up or down to change its answer' : ''}; arrow keys work too.
        </p>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="ma-svg"
          role="img"
          aria-label={mode === 'line' ? 'Scatter plot of hours revised against test mark with a fitted straight line and squares showing each squared miss.' : 'Pass and fail points against hours revised with an S-shaped probability curve and a vertical decision boundary.'}
          onPointerMove={onMove}
          onPointerUp={up}
          onPointerCancel={up}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={ML} x2={W - MR} y1={sy(t)} y2={sy(t)} className="ma-grid" />
              <text x={ML - 6} y={sy(t) + 4} textAnchor="end" className="ma-tick">
                {t}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={sx(t)} y={H - 8} textAnchor="middle" className="ma-tick">
              {t}
            </text>
          ))}
          <clipPath id={clipId}>
            <rect x={ML} y={MT} width={W - ML - MR} height={H - MT - MB} />
          </clipPath>
          <line x1={ML} x2={ML} y1={MT} y2={H - MB} className="ma-axis" />
          <line x1={ML} x2={W - MR} y1={H - MB} y2={H - MB} className="ma-axis" />

          {mode === 'line' && (
            <>
              <g clipPath={`url(#${clipId})`}>
              {pts.map((p, i) => {
                const side = Math.abs(sy(p.y) - sy(predict(active, p.x)));
                const s = Math.min(side, 200);
                const right = sx(p.x) + s <= W - MR;
                const top = Math.min(sy(p.y), sy(predict(active, p.x)));
                return <rect key={'sq' + i} x={right ? sx(p.x) : sx(p.x) - s} y={top} width={s} height={s} className="ma-square" />;
              })}
              {lineSegs}
              {pts.map((p, i) => (
                <line key={'r' + i} x1={sx(p.x)} x2={sx(p.x)} y1={sy(p.y)} y2={sy(predict(active, p.x))} className="ma-resid" />
              ))}
              </g>
              <line x1={sx(px)} x2={sx(px)} y1={H - MB} y2={sy(clamp(pred, 0, 100))} className="ma-guide" />
              <circle cx={sx(px)} cy={sy(clamp(pred, 0, 100))} r="5" className="ma-pred" />
            </>
          )}

          {mode === 'yesno' && (
            <>
              <line x1={ML} x2={W - MR} y1={sy(thr)} y2={sy(thr)} className="ma-thr" />
              {bound !== null && bound >= 0 && bound <= 10 && <line x1={sx(bound)} x2={sx(bound)} y1={MT} y2={H - MB} className="ma-bound" />}
              <path d={curve} className="ma-curve" clipPath={`url(#${clipId})`} />
              <line x1={sx(px)} x2={sx(px)} y1={H - MB} y2={sy(prob)} className="ma-guide" />
              <circle cx={sx(px)} cy={sy(prob)} r="5" className="ma-pred" />
            </>
          )}

          {(mode === 'line' ? pts.map((p) => ({ x: p.x, v: p.y / 100, c: 1 as 0 | 1 })) : lab.map((p) => ({ x: p.x, v: p.label, c: p.label }))).map((p, i) => {
            const cx = sx(p.x);
            const cy = mode === 'line' ? sy(p.v * 100) : sy(p.v);
            const bad = mode === 'yesno' && wrong[i];
            return (
              <g
                key={i}
                className={`ma-pt${sel === i ? ' is-sel' : ''}`}
                tabIndex={0}
                role="button"
                aria-label={mode === 'line' ? `Point ${i + 1}: ${n1(p.x)} hours, mark ${Math.round(p.v * 100)}. Arrow keys move it.` : `Point ${i + 1}: ${n1(p.x)} hours, ${p.c ? 'passed' : 'failed'}${bad ? ', on the wrong side of the threshold' : ''}. Left and right move it, up and down change its answer.`}
                onPointerDown={(e) => down(e, i)}
                onKeyDown={(e) => key(e, i)}
                onFocus={() => setSel(i)}
              >
                <circle cx={cx} cy={cy} r="20" className="ma-hit" />
                {mode === 'yesno' && p.c === 0 ? <rect x={cx - 7} y={cy - 7} width="14" height="14" className="ma-dot b" /> : <circle cx={cx} cy={cy} r="7.5" className={`ma-dot${mode === 'yesno' ? ' a' : ''}`} />}
                {bad && <circle cx={cx} cy={cy} r="12" className="ma-bad" />}
              </g>
            );
          })}
        </svg>

        <div className="ma-ctrls">
          <label className="field">
            <span>
              {mode === 'line' ? 'Predict for hours' : 'Look up hours'} <b>{n1(px)}</b>
            </span>
            <input type="range" min={0} max={10} step={0.1} value={px} onChange={(e) => setPx(+e.target.value)} />
          </label>
          {mode === 'line' && own && (
            <>
              <label className="field">
                <span>
                  Your slope (marks per hour) <b>{n1(mine.slope)}</b>
                </span>
                <input type="range" min={-5} max={15} step={0.1} value={mine.slope} onChange={(e) => setMine({ ...mine, slope: +e.target.value })} />
              </label>
              <label className="field">
                <span>
                  Your intercept (mark at 0 hours) <b>{n1(mine.intercept)}</b>
                </span>
                <input type="range" min={-20} max={80} step={0.5} value={mine.intercept} onChange={(e) => setMine({ ...mine, intercept: +e.target.value })} />
              </label>
            </>
          )}
          {mode === 'yesno' && (
            <>
              <label className="field">
                <span>
                  Boundary: 50% at <b>{n1(model.x0)} hours</b>
                </span>
                <input type="range" min={0} max={10} step={0.1} value={model.x0} onChange={(e) => setModel({ ...model, x0: +e.target.value })} />
              </label>
              <label className="field">
                <span>
                  Steepness <b>{n1(model.k)}</b>
                </span>
                <input type="range" min={0.1} max={6} step={0.1} value={model.k} onChange={(e) => setModel({ ...model, k: +e.target.value })} />
              </label>
              <label className="field">
                <span>
                  Threshold for saying pass <b>{Math.round(thr * 100)}%</b>
                </span>
                <input type="range" min={0.05} max={0.95} step={0.05} value={thr} onChange={(e) => setThr(+e.target.value)} />
              </label>
            </>
          )}
        </div>

        <div className="ma-btns">
          {mode === 'line' ? (
            <>
              <button type="button" className="btn quiet" aria-pressed={own} onClick={() => setOwn((v) => !v)}>
                {own ? 'Show the best line' : 'Draw my own line'}
              </button>
              {own && (
                <button type="button" className="btn quiet" onClick={() => setMine({ slope: best.slope, intercept: best.intercept })}>
                  Snap mine to the best line
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" className="btn quiet" onClick={() => steps(10)}>
                Take 10 gradient steps
              </button>
              <button type="button" className="btn quiet" onClick={() => steps(200)}>
                Take 200
              </button>
            </>
          )}
          <button type="button" className="btn quiet" onClick={reset}>
            Reset
          </button>
        </div>

        <p className="ma-readout" role="status" aria-live="polite">
          {status}
        </p>
        <p className="viz-cap">
          {mode === 'line'
            ? 'Each square has sides as long as one miss, so its area shows that miss squared. The best line is the one with the smallest total area. Try your own line, then snap to the best.'
            : 'The curve is a sigmoid: it turns a straight-line score into a number between 0 and 1. Gradient steps nudge the boundary and steepness to lower the log loss.'}
        </p>
      </div>
    </Root>
  );
}
