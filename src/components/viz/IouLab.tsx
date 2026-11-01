import { useRef, useState, type PointerEvent } from 'react';
import { Root } from './shared';
import { iouParts, type Box } from '../../lib/detection';

/*
 * Intersection over union. The truth box is fixed. The guess box can be dragged, or moved with the
 * sliders, and the sum under the picture is worked out live.
 */

const W = 320;
const H = 220;
const TRUTH: Box = { x1: 60, y1: 50, x2: 180, y2: 150 };

interface G {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PRESETS: { id: string; label: string; g: G }[] = [
  { id: 'spot', label: 'Spot on', g: { x: 62, y: 52, w: 118, h: 98 } },
  { id: 'close', label: 'A bit off', g: { x: 78, y: 62, w: 120, h: 100 } },
  { id: 'half', label: 'Half missed', g: { x: 120, y: 50, w: 120, h: 100 } },
  { id: 'big', label: 'Far too big', g: { x: 20, y: 20, w: 240, h: 190 } },
  { id: 'miss', label: 'Wrong place', g: { x: 200, y: 110, w: 100, h: 90 } },
];

const toBox = (g: G): Box => ({ x1: g.x, y1: g.y, x2: g.x + g.w, y2: g.y + g.h });
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const n1 = (v: number) => (Math.round(v * 100) / 100).toString();

export default function IouLab() {
  const [g, setG] = useState<G>(PRESETS[1].g);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);

  const guess = toBox(g);
  const p = iouParts(TRUTH, guess);
  const hit = p.iou >= 0.5;

  const set = (patch: Partial<G>) =>
    setG((cur) => {
      const n = { ...cur, ...patch };
      n.x = Math.round(n.x);
      n.y = Math.round(n.y);
      n.w = Math.round(n.w);
      n.h = Math.round(n.h);
      n.w = clamp(n.w, 20, W);
      n.h = clamp(n.h, 20, H);
      n.x = clamp(n.x, 0, W - n.w);
      n.y = clamp(n.y, 0, H - n.h);
      return n;
    });

  const point = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const down = (e: PointerEvent<SVGRectElement>) => {
    const q = point(e);
    drag.current = { dx: q.x - g.x, dy: q.y - g.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<SVGRectElement>) => {
    if (!drag.current) return;
    const q = point(e);
    set({ x: q.x - drag.current.dx, y: q.y - drag.current.dy });
  };
  const up = () => {
    drag.current = null;
  };

  const inter = p.inter > 0 ? { x: Math.max(TRUTH.x1, guess.x1), y: Math.max(TRUTH.y1, guess.y1), w: p.interW, h: p.interH } : null;

  return (
    <Root>
      <div className="viz w5a-iou">
        <p className="viz-title">Intersection over union: how well do two boxes agree?</p>
        <div className="w5a-row" role="group" aria-label="Preset guesses">
          <span className="w5a-lab">Try</span>
          {PRESETS.map((pr) => (
            <button key={pr.id} type="button" className="w5a-chip" onClick={() => setG(pr.g)}>
              {pr.label}
            </button>
          ))}
        </div>

        <svg ref={svg} className="w5a-iou-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Two boxes. The true box is solid. The guess is dashed. Shared area ${n1(p.inter)}, joint area ${n1(p.union)}, IoU ${p.iou.toFixed(2)}.`}>
          <rect x="0" y="0" width={W} height={H} className="w5a-iou-bg" />
          <rect x={TRUTH.x1} y={TRUTH.y1} width={TRUTH.x2 - TRUTH.x1} height={TRUTH.y2 - TRUTH.y1} className="w5a-truth" />
          {inter && <rect x={inter.x} y={inter.y} width={inter.w} height={inter.h} className="w5a-inter" />}
          <rect
            x={guess.x1}
            y={guess.y1}
            width={g.w}
            height={g.h}
            className="w5a-guess"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          />
          <text x={TRUTH.x1 + 4} y={TRUTH.y1 - 5} className="w5a-svg-t">truth</text>
          <text x={W - 6} y={H - 6} textAnchor="end" className="w5a-svg-t">drag the dashed box</text>
        </svg>

        <div className="w5a-sliders">
          {(
            [
              ['x', 'Left', 0, W - g.w],
              ['y', 'Top', 0, H - g.h],
              ['w', 'Width', 20, W],
              ['h', 'Height', 20, H],
            ] as const
          ).map(([k, label, lo, hi]) => (
            <label key={k} className="field">
              <span>
                {label} <b>{Math.round(g[k])}</b>
              </span>
              <input type="range" min={lo} max={hi} step={1} value={Math.round(g[k])} onChange={(e) => set({ [k]: +e.target.value })} aria-label={`Guess box ${label.toLowerCase()}`} />
            </label>
          ))}
        </div>

        <div className="w5a-sum" aria-live="polite">
          <p>
            Shared part (the overlap): {n1(p.interW)} wide × {n1(p.interH)} tall = <b>{n1(p.inter)}</b>
          </p>
          <p>
            Together (the union): {n1(p.areaA)} + {n1(p.areaB)} − {n1(p.inter)} = <b>{n1(p.union)}</b>
          </p>
          <p className="w5a-big">
            IoU = {n1(p.inter)} ÷ {n1(p.union)} = <b>{p.iou.toFixed(2)}</b>
          </p>
          <p className={hit ? 'w5a-yes' : 'w5a-no'}>
            {hit ? 'At or above 0.5, so this counts as a correct detection under the usual rule.' : 'Below 0.5, so this guess would not count as correct under the usual rule.'}
          </p>
        </div>
      </div>
    </Root>
  );
}
