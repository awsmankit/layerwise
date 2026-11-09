import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Root } from '../../viz/shared';
import type { DiagramSpec } from '../../../data/interview/answers/types';
import { diagramAlt } from '../../../data/interview/answers/diagram';
import Frame from './Frame';
import { useQuiet } from './use-quiet';

type Spec = Extract<DiagramSpec, { kind: 'curve' }>;

/** Round a range up to a tidy tick step (1, 2 or 5 times a power of ten) and list the ticks. */
export function niceTicks(lo: number, hi: number, target = 4): number[] {
  const span = hi - lo || 1;
  const raw = span / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? pow * 10;
  const first = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = first; v <= hi + step * 1e-9; v += step) out.push(Math.round(v / step) * step);
  return out;
}

const label = (n: number) => (Math.abs(n) >= 10000 ? n.toLocaleString('en-US') : String(Math.round(n * 100) / 100));

/** A line chart drawn on its own scale. The drawing is sized for the screen it is on, so its text stays readable. */
export default function CurveDiagram({ spec }: { spec: Spec }) {
  const quiet = useQuiet();
  const box = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(300);
  // draw at the width the screen gives, so the text is its real size instead of scaled down
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(Math.round(el.getBoundingClientRect().width)));
    ro.observe(el);
    setAvail(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  const W = Math.max(250, Math.min(620, avail));
  const narrow = W < 420;
  const H = narrow ? 230 : 270;
  const m = { l: narrow ? 46 : 56, r: 14, t: 18, b: 44 };
  const marks = spec.marks ?? [];
  const xs = spec.points.map((p) => p[0]);
  const ys = spec.points.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(0, ...ys);
  const y1 = Math.max(...ys);
  const yt = niceTicks(y0, y1);
  // extend the axis to the next tick above the data, so the top of the curve never touches the frame
  if (yt.length > 1 && yt[yt.length - 1] < y1) yt.push(yt[yt.length - 1] + (yt[1] - yt[0]));
  const yTop = Math.max(y1, yt[yt.length - 1] ?? y1);
  const xt = niceTicks(x0, x1, narrow ? 3 : 5);
  const sx = (x: number) => m.l + ((x - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
  const sy = (y: number) => H - m.b - ((y - y0) / (yTop - y0 || 1)) * (H - m.t - m.b);
  const d = spec.points.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`).join(' ');

  return (
    <Root>
      <Frame alt={diagramAlt(spec)} caption={spec.caption}>
        <div ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} className="ivd-curve" style={{ maxWidth: W }} aria-hidden="true">
          {yt.map((v) => (
            <g key={`y${v}`}>
              <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} className="ivd-grid" />
              <text x={m.l - 6} y={sy(v) + 4} textAnchor="end" className="ivd-tick">
                {label(v)}
              </text>
            </g>
          ))}
          {xt.map((v) => (
            <text key={`x${v}`} x={sx(v)} y={H - m.b + 16} textAnchor="middle" className="ivd-tick">
              {label(v)}
            </text>
          ))}
          <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} className="ivd-axis" />
          <line x1={m.l} x2={m.l} y1={m.t} y2={H - m.b} className="ivd-axis" />
          <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="ivd-axis-label">
            {spec.xLabel}
          </text>
          <text transform={`translate(12 ${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="ivd-axis-label">
            {spec.yLabel}
          </text>
          {marks.map((mk, i) => {
            const right = sx(mk.x) > W * 0.62;
            return (
              <g key={mk.label}>
                <line x1={sx(mk.x)} x2={sx(mk.x)} y1={m.t} y2={H - m.b} className="ivd-mark" />
                <text x={sx(mk.x) + (right ? -5 : 5)} y={H - m.b - 8 - (marks.length - 1 - i) * 15} textAnchor={right ? 'end' : 'start'} className="ivd-mark-label">
                  {mk.label}
                </text>
              </g>
            );
          })}
          <motion.path
            d={d}
            className="ivd-line"
            initial={{ pathLength: quiet ? 1 : 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
          {spec.points.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={sx(x)} cy={sy(y)} r={3} className="ivd-pt" />
          ))}
        </svg>
        </div>
      </Frame>
    </Root>
  );
}
