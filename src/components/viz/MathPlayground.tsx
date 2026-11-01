import { useEffect, useId, useRef, useState } from 'react';
import { Root } from './shared';
import { PRESETS, agreement, angleDeg, applyM, cosine, det, dot, gridLines, norm, type M2, type V2 } from '../../lib/maths-play';

const N = 5; // the plane shows -5 to 5
const SIZE = 320;
const U = 28; // pixels per unit
const O = SIZE / 2;
const px = (x: number) => O + x * U;
const py = (y: number) => O - y * U;
const clampInt = (v: number) => Math.max(-N, Math.min(N, Math.round(v)));
const fixed = (v: number, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toString();

type Mode = 'arrows' | 'machine';
type Which = 'a' | 'b' | 'v';

function Arrow({ to, cls, label }: { to: V2; cls: string; label: string }) {
  const [x, y] = to;
  const len = Math.hypot(x, y) * U;
  const ux = len === 0 ? 0 : (x * U) / len;
  const uy = len === 0 ? 0 : (-y * U) / len;
  const tx = px(x);
  const ty = py(y);
  const head = 9;
  return (
    <g className={cls}>
      <line x1={O} y1={O} x2={tx} y2={ty} />
      {len > 0 && (
        <polygon points={`${tx},${ty} ${tx - ux * head - uy * 5},${ty - uy * head + ux * 5} ${tx - ux * head + uy * 5},${ty - uy * head - ux * 5}`} />
      )}
      <text x={tx + (x >= 0 ? 8 : -8)} y={ty + (y >= 0 ? -8 : 16)} textAnchor={x >= 0 ? 'start' : 'end'}>
        {label}
      </text>
    </g>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <label className="ws-slide" htmlFor={id}>
      <span>
        {label} = <b>{value}</b>
      </span>
      <input id={id} type="range" min={-N} max={N} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/**
 * Two playgrounds on one plane. "Two arrows": drag the tips (or use the sliders) and read the dot product and cosine.
 * "A machine": pick or edit a 2x2 matrix and watch it move the grid, the two basic arrows and an arrow of your own.
 */
export default function MathPlayground({ start = 'arrows' }: { start?: Mode }) {
  const [mode, setMode] = useState<Mode>(start);
  const [a, setA] = useState<V2>([3, 1]);
  const [b, setB] = useState<V2>([1, 3]);
  const [v, setV] = useState<V2>([2, 1]);
  const [m, setM] = useState<M2>(PRESETS[3].m);
  const [preset, setPreset] = useState<string>('turn');
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Which | null>(null);
  const clipId = 'ws-clip-' + useId().replace(/[^a-zA-Z0-9]/g, '');

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const stop = (e: TouchEvent) => {
      if (drag.current) e.preventDefault();
    };
    el.addEventListener('touchmove', stop, { passive: false });
    return () => el.removeEventListener('touchmove', stop);
  }, []);

  const setTip = (w: Which, p: V2) => (w === 'a' ? setA(p) : w === 'b' ? setB(p) : setV(p));
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const r = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * SIZE;
    const y = ((e.clientY - r.top) / r.height) * SIZE;
    setTip(drag.current, [clampInt((x - O) / U), clampInt((O - y) / U)]);
  };
  const down = (w: Which) => (e: React.PointerEvent) => {
    drag.current = w;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const up = () => {
    drag.current = null;
  };

  const handle = (w: Which, p: V2, name: string) => (
    <circle
      className="ws-handle"
      cx={px(p[0])}
      cy={py(p[1])}
      r={15}
      onPointerDown={down(w)}
      aria-hidden="true"
    >
      <title>{name}</title>
    </circle>
  );

  const c = cosine(a, b);
  const ang = angleDeg(a, b);
  const dets = det(m);
  const image = applyM(m, v);
  const setEntry = (r: 0 | 1, k: 0 | 1, val: string) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return;
    const next: M2 = [[...m[0]], [...m[1]]] as M2;
    next[r][k] = Math.max(-4, Math.min(4, n));
    setM(next);
    setPreset('custom');
  };
  const chosen = PRESETS.find((p) => p.id === preset);

  return (
    <Root>
      <div className="viz ws-play">
        <div className="ws-top">
          <p className="viz-title">Arrow playground</p>
          <div className="ws-tabs" role="group" aria-label="Choose a playground">
            <button type="button" className="ws-chip" aria-pressed={mode === 'arrows'} onClick={() => setMode('arrows')}>
              Two arrows
            </button>
            <button type="button" className="ws-chip" aria-pressed={mode === 'machine'} onClick={() => setMode('machine')}>
              A machine
            </button>
          </div>
        </div>

        <svg
          ref={svgRef}
          className="ws-svg"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={
            mode === 'arrows'
              ? `Two arrows from the middle of a grid: arrow a ends at ${a[0]}, ${a[1]} and arrow b ends at ${b[0]}, ${b[1]}.`
              : `A grid pushed through a machine. Your arrow (${v[0]}, ${v[1]}) lands at (${fixed(image[0])}, ${fixed(image[1])}).`
          }
          onPointerMove={onMove}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={SIZE} height={SIZE} />
            </clipPath>
          </defs>
          {Array.from({ length: 2 * N + 1 }, (_, i) => i - N).map((k) => (
            <g key={k} className={'ws-faint' + (k === 0 ? ' is-axis' : '')}>
              <line x1={px(k)} y1={py(-N)} x2={px(k)} y2={py(N)} />
              <line x1={px(-N)} y1={py(k)} x2={px(N)} y2={py(k)} />
            </g>
          ))}

          {mode === 'arrows' ? (
            <>
              <Arrow to={a} cls="ws-arrow ws-a" label="a" />
              <Arrow to={b} cls="ws-arrow ws-b" label="b" />
              {handle('a', a, 'Drag the tip of arrow a')}
              {handle('b', b, 'Drag the tip of arrow b')}
            </>
          ) : (
            <g clipPath={`url(#${clipId})`}>
              {gridLines(m, 12).map((l, i) => (
                <line key={i} className={'ws-warp' + (l.axis ? ' is-axis' : '')} x1={px(l.from[0])} y1={py(l.from[1])} x2={px(l.to[0])} y2={py(l.to[1])} />
              ))}
              <polygon
                className="ws-square"
                points={[[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => applyM(m, [x, y])).map(([x, y]) => `${px(x)},${py(y)}`).join(' ')}
              />
              <Arrow to={[m[0][0], m[1][0]]} cls="ws-arrow ws-i" label="i" />
              <Arrow to={[m[0][1], m[1][1]]} cls="ws-arrow ws-j" label="j" />
              <Arrow to={v} cls="ws-arrow ws-v ws-ghost" label="v" />
              <Arrow to={image} cls="ws-arrow ws-a" label="Mv" />
            </g>
          )}
          {mode === 'machine' && handle('v', v, 'Drag the tip of your arrow v')}
        </svg>

        {mode === 'arrows' ? (
          <div className="ws-panel">
            <div className="ws-sliders">
              <Stepper label="a across" value={a[0]} onChange={(x) => setA([x, a[1]])} />
              <Stepper label="a up" value={a[1]} onChange={(y) => setA([a[0], y])} />
              <Stepper label="b across" value={b[0]} onChange={(x) => setB([x, b[1]])} />
              <Stepper label="b up" value={b[1]} onChange={(y) => setB([b[0], y])} />
            </div>
            <div className="ws-btns">
              <button type="button" className="btn quiet" onClick={() => { setA([3, 1]); setB([3, 1]); }}>
                Same way
              </button>
              <button type="button" className="btn quiet" onClick={() => { setA([3, 1]); setB([-1, 3]); }}>
                Right angle
              </button>
              <button type="button" className="btn quiet" onClick={() => { setA([3, 1]); setB([-3, -1]); }}>
                Opposite
              </button>
              <button type="button" className="btn quiet" onClick={() => { setA([3, 1]); setB([1, 3]); }}>
                Reset
              </button>
            </div>
            <p className="ws-say" aria-live="polite">
              Dot product: ({a[0]} x {b[0]}) + ({a[1]} x {b[1]}) = <b>{dot(a, b)}</b>.
              {c === null ? ' ' : <> Lengths {fixed(norm(a))} and {fixed(norm(b))}. Cosine = {dot(a, b)} / ({fixed(norm(a))} x {fixed(norm(b))}) = <b>{fixed(c)}</b>, an angle of about {Math.round(ang ?? 0)} degrees. </>}
              {agreement(c)}
            </p>
          </div>
        ) : (
          <div className="ws-panel">
            <div className="ws-btns" role="group" aria-label="Pick a machine">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="ws-chip"
                  aria-pressed={preset === p.id}
                  onClick={() => {
                    setPreset(p.id);
                    setM(p.m);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="ws-matrix">
              <span className="ws-brace" aria-hidden="true">M =</span>
              <div className="ws-cells">
                {([[0, 0], [0, 1], [1, 0], [1, 1]] as [0 | 1, 0 | 1][]).map(([r, k]) => (
                  <input
                    key={`${r}${k}`}
                    type="number"
                    inputMode="decimal"
                    step={0.5}
                    min={-4}
                    max={4}
                    value={m[r][k]}
                    onChange={(e) => setEntry(r, k, e.target.value)}
                    aria-label={`Row ${r + 1}, column ${k + 1} of the machine`}
                  />
                ))}
              </div>
            </div>
            <div className="ws-sliders">
              <Stepper label="v across" value={v[0]} onChange={(x) => setV([x, v[1]])} />
              <Stepper label="v up" value={v[1]} onChange={(y) => setV([v[0], y])} />
            </div>
            <p className="ws-say" aria-live="polite">
              {chosen ? chosen.blurb + ' ' : 'Your own machine. '}
              The arrow i = ({m[0][0]}, {m[1][0]}) is where the old right-pointing step lands, and j = ({m[0][1]}, {m[1][1]}) is where the old up step lands. So v = ({v[0]}, {v[1]}) lands at {v[0]} x i + {v[1]} x j = <b>({fixed(image[0])}, {fixed(image[1])})</b>. The shaded square keeps {fixed(Math.abs(dets))} times its old area{dets < 0 ? ', and it has been flipped over' : ''}.
            </p>
          </div>
        )}
      </div>
    </Root>
  );
}
