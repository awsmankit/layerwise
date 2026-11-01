import { useMemo, useState } from 'react';
import { Root, useNarrow } from './shared';
import { HIST_BINS, HIST_MAX, HIST_MIN, psiBand, sliderStats } from '../../lib/drift-watch';

/*
 * "Drift slider": a reference sample of 2,000 values against a current sample whose mean, spread and
 * size you control. Shows PSI, the KS statistic and the KS p-value side by side, so you can see that
 * PSI and KS measure how big a change is, while the p-value mostly measures how much data you have.
 * All data are invented and seeded. The maths is in lib/drift-watch.ts.
 */

const SIZES = [200, 2000, 20000] as const;

const PRESETS: { label: string; shift: number; ratio: number; n: number }[] = [
  { label: 'No change', shift: 0, ratio: 1, n: 2000 },
  { label: 'Tiny shift, big sample', shift: 0.1, ratio: 1, n: 20000 },
  { label: 'Spread doubled', shift: 0, ratio: 2, n: 2000 },
  { label: 'Everything moved', shift: 1, ratio: 1, n: 2000 },
];

function fmtP(p: number): string {
  if (p >= 0.001) return p.toFixed(3);
  if (p < 1e-15) return 'below 0.000000000000001';
  return p.toExponential(1).replace('e-', ' x 10^-');
}

const BAND_TEXT = { stable: 'Stable (under 0.1)', moderate: 'Moderate (0.1 to 0.25)', large: 'Large (0.25 or more)' } as const;

export default function DriftSlider() {
  const [shift, setShift] = useState(0);
  const [ratio, setRatio] = useState(1);
  const [n, setN] = useState<number>(2000);
  const narrow = useNarrow();

  const r = useMemo(() => sliderStats(shift, ratio, n), [shift, ratio, n]);
  const band = psiBand(r.psi);
  const flagged = r.p < 0.05;

  const W = narrow ? 340 : 620;
  const H = narrow ? 170 : 190;
  const padL = 6;
  const padR = 6;
  const padT = 8;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const top = Math.max(...r.refCounts, ...r.curCounts, 0.01);
  const bw = plotW / HIST_BINS;
  const ticks = [-4, -2, 0, 2, 4];
  const q = (v: number) => Math.round(v * 10) / 10; // rounded so server and browser agree on the last digits
  const tx = (v: number) => q(padL + ((v - HIST_MIN) / (HIST_MAX - HIST_MIN)) * plotW);

  const summary = `Reference against current: mean moved ${shift.toFixed(2)} standard deviations, spread times ${ratio.toFixed(2)}, ${n.toLocaleString('en-GB')} current values. PSI ${r.psi.toFixed(3)}, ${BAND_TEXT[band]}. KS statistic ${r.ks.toFixed(3)}. KS p-value ${fmtP(r.p)}, ${flagged ? 'flagged as drift at the 0.05 level' : 'not flagged at the 0.05 level'}.`;

  return (
    <Root>
      <div className="viz mo3-slider">
        <p className="viz-title">The drift slider</p>
        <p className="mo3-note">
          Invented data. The grey outline is the reference: 2,000 values from the data the model was trained on. The purple bars are today's values. Move them and watch three measures.
        </p>

        <div className="mo3-presets" role="group" aria-label="Presets">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="btn quiet"
              onClick={() => {
                setShift(p.shift);
                setRatio(p.ratio);
                setN(p.n);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mo3-svg"
          role="img"
          aria-label={`Histogram of the reference values as an outline and the current values as bars. ${summary}`}
        >
          {r.curCounts.map((c, i) => {
            const h = q((c / top) * plotH);
            return <rect key={`c${i}`} x={q(padL + i * bw + 0.5)} y={q(padT + plotH - h)} width={q(Math.max(bw - 1, 1))} height={h} className="mo3-cur" />;
          })}
          {r.refCounts.map((c, i) => {
            const h = q((c / top) * plotH);
            return <rect key={`r${i}`} x={q(padL + i * bw + 0.5)} y={q(padT + plotH - h)} width={q(Math.max(bw - 1, 1))} height={h} className="mo3-ref" />;
          })}
          <path d={`M${padL} ${padT + plotH} H${W - padR}`} className="mo3-axis" />
          {ticks.map((v) => (
            <text key={v} x={tx(v)} y={H - 7} textAnchor="middle" className="mo3-tick">
              {v}
            </text>
          ))}
        </svg>

        <div className="mo3-controls">
          <label className="field">
            <span>
              Mean shift, in standard deviations <b>{shift.toFixed(2)}</b>
            </span>
            <input type="range" min={-2} max={2} step={0.05} value={shift} onChange={(e) => setShift(+e.target.value)} aria-valuetext={`${shift.toFixed(2)} standard deviations`} />
          </label>
          <label className="field">
            <span>
              Spread multiplied by <b>{ratio.toFixed(2)}</b>
            </span>
            <input type="range" min={0.5} max={2} step={0.05} value={ratio} onChange={(e) => setRatio(+e.target.value)} aria-valuetext={`times ${ratio.toFixed(2)}`} />
          </label>
        </div>
        <div className="mo3-row" role="group" aria-label="How many current values">
          <span>Current sample</span>
          {SIZES.map((s) => (
            <button key={s} type="button" className="btn quiet" aria-pressed={n === s} onClick={() => setN(s)}>
              {s.toLocaleString('en-GB')} values
            </button>
          ))}
        </div>

        <div className="mo3-cards">
          <div className={`mo3-card mo3-${band}`}>
            <span className="mo3-who">PSI</span>
            <b className="mo3-big">{r.psi.toFixed(3)}</b>
            <span>{BAND_TEXT[band]}</span>
          </div>
          <div className="mo3-card">
            <span className="mo3-who">KS statistic</span>
            <b className="mo3-big">{r.ks.toFixed(3)}</b>
            <span>Biggest gap between the two cumulative curves</span>
          </div>
          <div className={`mo3-card ${flagged ? 'mo3-flag' : 'mo3-calm'}`}>
            <span className="mo3-who">KS p-value</span>
            <b className="mo3-big">{fmtP(r.p)}</b>
            <span>{flagged ? 'Flagged as drift (under 0.05)' : 'Not flagged (0.05 or more)'}</span>
          </div>
        </div>
        <p className="mo3-result" role="status" aria-live="polite">
          {flagged && band === 'stable'
            ? 'The p-value says "something changed" while PSI says the change is small. With this much data, even a harmless wobble is statistically detectable.'
            : !flagged && band !== 'stable'
              ? 'PSI says the shape moved a lot, but with so few values the test cannot rule out luck.'
              : flagged
                ? 'All three agree that the data has moved.'
                : 'All three agree that nothing important has changed.'}
        </p>
        <p className="viz-cap">
          PSI uses ten bins that each hold 10 percent of the reference, with the 0.1 and 0.25 bands that are a common rule of thumb. The p-value is the asymptotic two-sample Kolmogorov-Smirnov p-value. Seeded random numbers, so the same settings give the same picture.
        </p>
      </div>
    </Root>
  );
}
