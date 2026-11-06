import { useId, useMemo, useState } from 'react';
import WhatIfFrame from './WhatIfFrame';
import { curve, MAX_DEGREE, NOISE_FLOOR, N_CHECK, N_TRAIN, run, truth, winners } from '../../lib/whatif/no-validation-set';

const PX = 40;
const PW = 302;
const FY0 = 16;
const FH = 170;
const YR = 2.2; // the fit plot shows y from -2.2 to 2.2
const r1 = (n: number) => Math.round(n * 10) / 10; // rounded so the server and the browser print the same text
const fx = (x: number) => r1(PX + x * PW);
const fy = (y: number) => r1(FY0 + ((YR - Math.max(-YR - 1, Math.min(YR + 1, y))) / (2 * YR)) * FH);

const EY0 = 14;
const EH = 170;
const LOG_TOP = 6;
const LOG_BOT = -2;
const ey = (v: number) => r1(EY0 + ((LOG_TOP - Math.max(LOG_BOT, Math.min(LOG_TOP, Math.log10(Math.max(v, 1e-12))))) / (LOG_TOP - LOG_BOT)) * EH);
const ex = (d: number) => r1(PX + ((d - 1) / (MAX_DEGREE - 1)) * PW);

const num = (v: number) => (v >= 100 ? Math.round(v).toLocaleString('en-US') : v >= 1 ? v.toFixed(1) : v.toFixed(2));
const path = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

/**
 * Pick the size of a polynomial that fits 12 noisy points. Training error always prefers the biggest;
 * the error on held-out points shows the middle one is best. The switch decides which one does the choosing.
 */
export default function NoValidationSet() {
  const clip = useId().replace(/[^a-zA-Z0-9]/g, '');
  const exp = useMemo(() => run(), []);
  const win = useMemo(() => winners(exp), [exp]);
  const truthCurve = useMemo(() => Array.from({ length: 81 }, (_, i) => ({ x: i / 80, y: truth(i / 80) })), []);

  const [check, setCheck] = useState(true);
  const [degree, setDegree] = useState(win.withCheck);

  const pick = check ? win.withCheck : win.withoutCheck;
  const fitCurve = useMemo(() => curve(exp.coefs[degree], 120), [exp, degree]);
  const better = exp.testErr[win.withoutCheck] / exp.testErr[win.withCheck];

  const choose = (v: boolean) => {
    setCheck(v);
    setDegree(v ? win.withCheck : win.withoutCheck);
  };

  const seenLine = check ? exp.checkErr : exp.testErr;

  return (
    <WhatIfFrame
      title="Which model size wins?"
      withLabel="With a held-out check"
      withoutLabel="Without one"
      on={check}
      onChange={choose}
      verdict={
        check ? (
          <>
            With a held-out check, size {pick} has the lowest error on points it never trained on, so it wins. On brand-new points its error is {num(exp.testErr[pick])}, close to the noise floor of {NOISE_FLOOR.toFixed(2)}, the least any model can reach.
          </>
        ) : (
          <>
            Without a check, the lowest training error wins, and that is the biggest model (size {pick}). Its training error is {exp.trainErr[pick].toFixed(3)}, yet on brand-new points it is {num(exp.testErr[pick])}, about {Math.round(better).toLocaleString('en-US')} times worse than the checked choice.
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Model size (polynomial degree) <b>{degree}</b>
            </span>
            <input type="range" min={1} max={MAX_DEGREE} value={degree} onChange={(e) => setDegree(+e.target.value)} aria-label="Model size, as the degree of the polynomial" />
          </label>
          <button type="button" className="btn quiet" onClick={() => setDegree(pick)}>
            Jump to the winner
          </button>
        </>
      }
    >
      <div className="wt-fig-wide">
        <svg viewBox="0 0 350 214" className="dx-svg wi-svg" role="img" aria-label={`A curve of size ${degree} fitted to ${N_TRAIN} noisy points. The dashed line is the true pattern.`}>
          <defs>
            <clipPath id={clip}>
              <rect x={PX} y={FY0} width={PW} height={FH} />
            </clipPath>
          </defs>
          <rect x={PX} y={FY0} width={PW} height={FH} fill="none" stroke="currentColor" strokeOpacity={0.5} />
          <path d={path(truthCurve.map((p) => ({ x: fx(p.x), y: fy(p.y) })))} fill="none" stroke="currentColor" strokeOpacity={0.45} strokeDasharray="4 4" strokeWidth={1.5} clipPath={`url(#${clip})`} />
          <path d={path(fitCurve.map((p) => ({ x: fx(p.x), y: fy(p.y) })))} fill="none" stroke={degree === pick ? '#1f9d6b' : '#d6453d'} strokeWidth={2.4} clipPath={`url(#${clip})`} />
          {exp.train.map((p, i) => (
            <circle key={i} cx={fx(p.x)} cy={fy(p.y)} r={4.5} fill="var(--ink)" stroke="var(--surface)" strokeWidth={1} />
          ))}
          <text x={PX} y={FY0 + FH + 16} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            dots = the {N_TRAIN} training points; dashed = truth
          </text>
          <text x={PX} y={FY0 + FH + 32} style={{ fill: degree === pick ? '#1f9d6b' : '#d6453d', fontSize: 12, fontWeight: 700 }}>
            Size {degree}: {degree === pick ? 'the winner here' : 'not the winner here'}, training error {exp.trainErr[degree].toFixed(3)}
          </text>
        </svg>

        <svg viewBox="0 0 350 244" className="dx-svg wi-svg" role="img" aria-label="Error against model size on a ten-fold scale. Training error keeps falling. Error on held-out points falls and then rises steeply.">
          {[6, 4, 2, 0, -2].map((d) => (
            <g key={d}>
              <line x1={PX} x2={PX + PW} y1={ey(10 ** d)} y2={ey(10 ** d)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
              <text x={PX - 4} y={ey(10 ** d) + 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
                {(10 ** d).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </text>
            </g>
          ))}
          <line x1={ex(pick)} x2={ex(pick)} y1={EY0} y2={EY0 + EH} stroke="#1f9d6b" strokeWidth={2} strokeOpacity={0.55} />
          <text x={ex(pick) + (pick > 8 ? -5 : 5)} y={EY0 + 12} textAnchor={pick > 8 ? 'end' : 'start'} style={{ fill: '#1f9d6b', fontSize: 12, fontWeight: 700 }}>
            winner: size {pick}
          </text>
          <path d={path(exp.trainErr.slice(1).map((v, i) => ({ x: ex(i + 1), y: ey(v) })))} fill="none" stroke="#3d6fd6" strokeWidth={2.2} />
          <path d={path(seenLine.slice(1).map((v, i) => ({ x: ex(i + 1), y: ey(v) })))} fill="none" stroke={check ? '#e08a1e' : '#8a8a8a'} strokeWidth={2.2} strokeDasharray={check ? undefined : '5 4'} />
          {exp.trainErr.slice(1).map((v, i) => (
            <circle key={i} cx={ex(i + 1)} cy={ey(v)} r={i + 1 === degree ? 5.5 : 3} fill="#3d6fd6" stroke={i + 1 === degree ? 'var(--ink)' : 'none'} strokeWidth={1.5} />
          ))}
          {seenLine.slice(1).map((v, i) => (
            <rect key={i} x={ex(i + 1) - (i + 1 === degree ? 5 : 3)} y={ey(v) - (i + 1 === degree ? 5 : 3)} width={i + 1 === degree ? 10 : 6} height={i + 1 === degree ? 10 : 6} fill={check ? '#e08a1e' : '#8a8a8a'} stroke={i + 1 === degree ? 'var(--ink)' : 'none'} strokeWidth={1.5} />
          ))}
          <text x={PX} y={EY0 + EH + 18} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            model size: 1 (simple)
          </text>
          <text x={PX + PW} y={EY0 + EH + 18} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            {MAX_DEGREE} (can hit every dot)
          </text>
          <text x={PX} y={EY0 + EH + 36} style={{ fill: '#3d6fd6', fontSize: 12, fontWeight: 700 }}>
            ● blue = training error (always falls)
          </text>
          <text x={PX} y={EY0 + EH + 54} style={{ fill: check ? '#b86f0d' : 'var(--ink-2)', fontSize: 12, fontWeight: 700 }}>
            {check ? `■ orange = held-out check (${N_CHECK} points)` : '■ dashed = new data later (hidden from you)'}
          </text>
        </svg>
      </div>
      <p className="wt-note">
        Numbers: {N_TRAIN} points from a sine curve plus noise (spread 0.3, so even a perfect model has squared error about {NOISE_FLOOR.toFixed(2)}). Each model is a least-squares polynomial. Errors are mean squared error on a ten-fold scale. {check ? `The ${N_CHECK} held-out points choose the size; a separate 400 points, never used for choosing, give the final error.` : 'The final error uses 400 fresh points that nothing was chosen on.'}
      </p>
    </WhatIfFrame>
  );
}
