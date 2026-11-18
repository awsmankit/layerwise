import { useState } from 'react';
import { Root } from './shared';

/**
 * Two states, sunny and rainy. stay1 is the chance sunny stays sunny; stay2 is
 * the chance rainy stays rainy. Each day the state moves by these chances.
 */
export function step(dist: [number, number], stay1: number, stay2: number): [number, number] {
  const [s, r] = dist;
  return [s * stay1 + r * (1 - stay2), s * (1 - stay1) + r * stay2];
}

/** The long-run share of sunny days, once the chain settles. */
export const stationarySunny = (stay1: number, stay2: number) => (1 - stay2) / (1 - stay1 + 1 - stay2);

const STEPS = 20;
const W = 360;
const H = 150;
const px = (t: number) => 20 + (t / STEPS) * (W - 40);
const py = (v: number) => H - 15 - v * (H - 30);

/**
 * A Markov chain: the next state depends only on the current one. Start with
 * all sunny and watch the chance of sun settle to a steady value no matter where
 * you began. Language models rely on the same idea, one word at a time.
 */
export default function MarkovChain() {
  const [stay1, setStay1] = useState(0.9);
  const [stay2, setStay2] = useState(0.5);
  const path: [number, number][] = [[1, 0]];
  for (let i = 0; i < STEPS; i++) path.push(step(path[path.length - 1], stay1, stay2));
  const target = stationarySunny(stay1, stay2);
  const last = path[path.length - 1][0];

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Weather as a Markov chain</p>
        <div className="viz-controls">
          <label htmlFor="mk-1">Sunny stays sunny <b className="num">{Math.round(stay1 * 100)}%</b></label>
          <input id="mk-1" type="range" min={0} max={1} step={0.01} value={stay1} onChange={(e) => setStay1(Number(e.target.value))} />
          <label htmlFor="mk-2">Rainy stays rainy <b className="num">{Math.round(stay2 * 100)}%</b></label>
          <input id="mk-2" type="range" min={0} max={1} step={0.01} value={stay2} onChange={(e) => setStay2(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Chance of sun over 20 days, settling near ${(target * 100).toFixed(0)} per cent`}>
          <line x1={px(0)} y1={py(target)} x2={px(STEPS)} y2={py(target)} className="dx-link" strokeDasharray="3 3" />
          <path d={path.map(([s], t) => `${t ? 'L' : 'M'} ${px(t).toFixed(1)} ${py(s).toFixed(1)}`).join(' ')} className="dx-curve" fill="none" />
        </svg>
        <p className="viz-cap" aria-live="polite">
          Chance of sun after {STEPS} days: <b className="num">{(last * 100).toFixed(1)}%</b>. The long-run value (dashed) is <b className="num">{(target * 100).toFixed(1)}%</b>, the same whatever the starting day.
        </p>
      </div>
    </Root>
  );
}
