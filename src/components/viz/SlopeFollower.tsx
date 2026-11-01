import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import { CURVES, descentStep, nudgeSlope, slopeWords } from '../../lib/maths-play';

const W = 360;
const H = 230;
const ML = 14;
const MR = 14;
const MT = 14;
const MB = 18;
const STEP_SIZES = [
  { label: 'Small', value: 1, note: 'A small step size creeps down safely.' },
  { label: 'Medium', value: 2, note: 'A medium step size gets there in a few steps.' },
  { label: 'Too big', value: 4.4, note: 'A step size that is too big overshoots, and each jump lands higher up than the last.' },
];
const r2 = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

/**
 * Stand on a curve, read the slope under your feet, and step downhill. This is gradient descent in one dimension,
 * with a choice of step size and of a curve with one valley or two.
 */
export default function SlopeFollower() {
  const [ci, setCi] = useState(0);
  const curve = CURVES[ci];
  const [x, setX] = useState(curve.start);
  const [size, setSize] = useState(1);
  const [trail, setTrail] = useState<number[]>([curve.start]);
  const [edge, setEdge] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const sliderId = useId();

  const [lo, hi] = curve.domain;
  const ys = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= 120; i++) pts.push(curve.f(lo + ((hi - lo) * i) / 120));
    return pts;
  }, [curve, lo, hi]);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const sx = (v: number) => ML + ((v - lo) / (hi - lo)) * (W - ML - MR);
  const sy = (v: number) => H - MB - ((v - yMin) / (yMax - yMin)) * (H - MT - MB);

  const slope = nudgeSlope(curve.f, x);
  const path = ys.map((y, i) => `${i === 0 ? 'M' : 'L'}${sx(lo + ((hi - lo) * i) / 120).toFixed(1)},${sy(y).toFixed(1)}`).join(' ');

  // tangent line, drawn across a fixed width and clipped to the picture
  const half = (hi - lo) * 0.12;
  const t0 = { x: x - half, y: curve.f(x) - slope * half };
  const t1 = { x: x + half, y: curve.f(x) + slope * half };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const stop = (e: TouchEvent) => {
      if (dragging.current) e.preventDefault();
    };
    el.addEventListener('touchmove', stop, { passive: false });
    return () => el.removeEventListener('touchmove', stop);
  }, []);

  const place = (v: number) => {
    const c = Math.max(lo, Math.min(hi, v));
    setX(c);
    setTrail([c]);
    setEdge(false);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const r = svgRef.current!.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    place(lo + ((vx - ML) / (W - ML - MR)) * (hi - lo));
  };
  const step = () => {
    const r = descentStep(curve, x, size);
    setX(r.x);
    setTrail((t) => [...t, r.x].slice(-14));
    setEdge(r.offEdge);
  };
  const pickCurve = (i: number) => {
    setCi(i);
    const s = CURVES[i].start;
    setX(s);
    setTrail([s]);
    setEdge(false);
  };

  const note = STEP_SIZES.find((s) => s.value === size)?.note ?? '';
  const atBottom = Math.abs(slope) < 0.03;

  return (
    <Root>
      <div className="viz ws-slope">
        <div className="ws-top">
          <p className="viz-title">Slope follower</p>
          <div className="ws-tabs" role="group" aria-label="Choose a curve">
            {CURVES.map((c, i) => (
              <button key={c.id} type="button" className="ws-chip" aria-pressed={ci === i} onClick={() => pickCurve(i)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <svg
          ref={svgRef}
          className="ws-svg ws-wide"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`A curve with the height ${r2(curve.f(x))} at position ${r2(x)}. The slope there is ${r2(slope)}.`}
          onPointerMove={onMove}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <defs>
            <clipPath id={`ws-slope-clip-${sliderId.replace(/[^a-zA-Z0-9]/g, '')}`}>
              <rect x={ML} y={MT - 4} width={W - ML - MR} height={H - MT - MB + 8} />
            </clipPath>
          </defs>
          <line className="ws-faint is-axis" x1={ML} y1={H - MB} x2={W - MR} y2={H - MB} />
          <path className="ws-curve" d={path} />
          {trail.slice(0, -1).map((t, i) => (
            <circle key={i} className="ws-trail" cx={sx(t)} cy={sy(curve.f(t))} r={4} />
          ))}
          <g clipPath={`url(#ws-slope-clip-${sliderId.replace(/[^a-zA-Z0-9]/g, '')})`}>
            <line className="ws-tangent" x1={sx(t0.x)} y1={sy(t0.y)} x2={sx(t1.x)} y2={sy(t1.y)} />
          </g>
          <circle className="ws-ball" cx={sx(x)} cy={sy(curve.f(x))} r={7} />
          <circle className="ws-handle" cx={sx(x)} cy={sy(curve.f(x))} r={18} onPointerDown={(e) => { dragging.current = true; (e.currentTarget as Element).setPointerCapture(e.pointerId); }} aria-hidden="true" />
        </svg>

        <div className="ws-panel">
          <label className="ws-slide" htmlFor={sliderId}>
            <span>
              Position <b>{r2(x)}</b> (or drag the ball)
            </span>
            <input id={sliderId} type="range" min={lo} max={hi} step={0.05} value={x} onChange={(e) => place(Number(e.target.value))} />
          </label>

          <p className="ws-say" aria-live="polite">
            Height here: <b>{r2(curve.f(x))}</b>. Slope: <b>{r2(slope)}</b>, which is {slopeWords(slope)}.
            {' '}
            {edge ? 'That step was so big that the ball flew off the end of the picture. ' : ''}
            {atBottom ? 'The slope is almost zero, so stepping stops here. ' : ''}
          </p>

          <div className="ws-btns" role="group" aria-label="Step size">
            <span className="ws-lab">Step size:</span>
            {STEP_SIZES.map((s) => (
              <button key={s.value} type="button" className="ws-chip" aria-pressed={size === s.value} onClick={() => setSize(s.value)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="ws-btns">
            <button type="button" className="btn" onClick={step}>
              Step downhill
            </button>
            <button type="button" className="btn quiet" onClick={() => place(curve.start)}>
              Reset
            </button>
          </div>
          <p className="ws-note">
            {note} {curve.note} Each step moves the ball by (step size x slope), against the slope.
          </p>
        </div>
      </div>
    </Root>
  );
}
