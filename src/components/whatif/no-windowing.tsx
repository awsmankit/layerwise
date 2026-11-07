import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { FLOOR_DB, LAST_BIN, N, NEAR, QUIET_BIN, applyWindow, fitsBlock, makeBlock, spectrumDb, stats, windowValues, type WindowKind } from '../../lib/whatif/no-windowing';

const W = 340;
const L = 40;
const R = W - 6;
const STEP = (R - L) / (LAST_BIN + 1);
const MID = 52;
const AMP = 26;
const Y0 = 152; // spectrum top (0 dB)
const Y1 = 276; // spectrum bottom (floor)

// rounded so server and browser (which can differ in the last digit of sin/cos/log) print identical text
const q = (v: number) => Math.round(v * 10) / 10;
const cx = (bin: number) => q(L + (bin + 0.5) * STEP);
const yDb = (db: number) => q(Y1 - ((Math.max(db, FLOOR_DB) - FLOOR_DB) / -FLOOR_DB) * (Y1 - Y0));
const db1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
const pctText = (f: number) => {
  const p = f * 100;
  if (p < 0.005) return '0%';
  return p < 0.095 ? p.toFixed(2) + '%' : p.toFixed(1) + '%';
};

/** two copies of the block end to end: this is what the DFT "sees" */
function blockPath(toneBin: number, kind: WindowKind): string {
  const wv = applyWindow(makeBlock(toneBin, false), kind);
  const pts: string[] = [];
  for (let i = 0; i < 2 * N; i++) {
    const x = q((i / (2 * N - 1)) * W);
    pts.push(`${i ? 'L' : 'M'}${x} ${q(MID - wv[i % N] * AMP)}`);
  }
  return pts.join('');
}
function envelopePath(sign: 1 | -1): string {
  const w = windowValues('hann');
  const pts: string[] = [];
  for (let i = 0; i < 2 * N; i++) pts.push(`${i ? 'L' : 'M'}${q((i / (2 * N - 1)) * W)} ${q(MID - sign * w[i % N] * AMP)}`);
  return pts.join('');
}

/**
 * A pure tone cut into a 64-sample block (a toy). Top: the block repeated end to end, which is what a Fourier transform assumes.
 * Bottom: its spectrum in decibels, with and without the Hann window. The other window is drawn as a dashed ghost.
 */
export default function NoWindowingWhatIf() {
  const [hann, setHann] = useState(true);
  const [tenths, setTenths] = useState(85);
  const [quiet, setQuiet] = useState(false);
  const [playing, setPlaying] = useState(false);

  const toneBin = tenths / 10;
  const kind: WindowKind = hann ? 'hann' : 'rect';
  const other: WindowKind = hann ? 'rect' : 'hann';
  const fits = fitsBlock(toneBin);

  const spec = useMemo(() => spectrumDb(toneBin, quiet, kind), [toneBin, quiet, kind]);
  const ghost = useMemo(() => spectrumDb(toneBin, quiet, other), [toneBin, quiet, other]);
  const st = useMemo(() => stats(toneBin, kind), [toneBin, kind]);
  const stOther = useMemo(() => stats(toneBin, other), [toneBin, other]);
  const path = useMemo(() => blockPath(toneBin, kind), [toneBin, kind]);
  const env = useMemo(() => (hann ? [envelopePath(1), envelopePath(-1)] : null), [hann]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTenths((t) => {
        if (t >= 85) {
          setPlaying(false);
          return 85;
        }
        return t + 1;
      });
    }, 220);
    return () => clearInterval(id);
  }, [playing]);

  const play = () => {
    setTenths(80);
    setPlaying(true);
  };

  const seamBad = !hann && !fits;
  const leakColor = hann ? '#1f9d6b' : '#d6453d';
  const ghostPath = ghost.map((d, k) => `${k ? 'L' : 'M'}${cx(k)} ${yDb(d)}`).join('');
  const leakY = yDb(st.leakDb);
  const sw = q(STEP * 0.72);

  const verdict = fits ? (
    <>
      This tone fits exactly {toneBin} waves in the block, so even a plain cut gives one clean line: {pctText(st.farEnergy)} of its energy lands far away. Real sounds almost never fit, so drag the tone toward {toneBin + 0.5}.
    </>
  ) : hann ? (
    <>
      With a Hann window the tone stands {Math.round(st.peakToLeakDb)} dB above its leakage, and only {pctText(st.farEnergy)} of its energy lands far from it.
      {quiet && (st.quietSeen ? <> The quiet tone at bin {QUIET_BIN} shows up.</> : <> The quiet tone is still hidden.</>)}
    </>
  ) : (
    <>
      With a plain cut the same tone stands only {Math.round(st.peakToLeakDb)} dB above its leakage, and {pctText(st.farEnergy)} of its energy is smeared far away.
      {quiet && (st.quietSeen ? <> The quiet tone at bin {QUIET_BIN} still shows.</> : <> A tone 40 dB quieter at bin {QUIET_BIN} is buried under the smear.</>)}
    </>
  );

  return (
    <WhatIfFrame
      title="One tone, one 64-sample block (toy)"
      withLabel="With a window (Hann)"
      withoutLabel="Plain cut (no window)"
      on={hann}
      onChange={setHann}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Tone pitch <b>{toneBin.toFixed(1)} waves per block</b>
            </span>
            <input
              type="range"
              min={80}
              max={90}
              step={1}
              value={tenths}
              onChange={(e) => {
                setPlaying(false);
                setTenths(+e.target.value);
              }}
              aria-label="Where the tone falls, in waves per block. A whole number fits the block exactly."
            />
          </label>
          <button type="button" className="btn quiet" aria-pressed={quiet} onClick={() => setQuiet((v) => !v)}>
            {quiet ? 'Remove the quiet tone' : 'Add a quiet second tone'}
          </button>
          <button type="button" className="btn quiet" onClick={play}>
            {playing ? 'Playing…' : 'Slide it off the grid'}
          </button>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} 336`}
        className="dx-svg wi-svg we-svg"
        role="img"
        aria-label={`A tone of ${toneBin} waves per block, ${hann ? 'cut with a Hann window' : 'cut with no window'}. It stands ${Math.round(st.peakToLeakDb)} decibels above its leakage and ${pctText(st.farEnergy)} of its energy lands far from the tone.`}
      >
        <text x={0} y={12} className="we-t-b">The block, repeated end to end</text>
        <line x1={0} x2={W} y1={MID} y2={MID} className="we-grid" />
        {env && (
          <g>
            <path d={env[0]} className="we-grid" strokeDasharray="3 3" />
            <path d={env[1]} className="we-grid" strokeDasharray="3 3" />
          </g>
        )}
        <motion.path key={kind + tenths} d={path} fill="none" stroke="var(--ink)" strokeWidth={1.8} strokeLinejoin="round" initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: EASE }} />
        <line x1={W / 2} x2={W / 2} y1={MID - AMP - 6} y2={MID + AMP + 6} stroke={seamBad ? '#d6453d' : 'var(--ink-2)'} strokeWidth={seamBad ? 2.2 : 1.2} strokeDasharray="4 3" />
        <text x={W / 2 + 6} y={MID + AMP + 17} className={seamBad ? 'we-t-bad' : 'we-t'}>
          {seamBad ? 'seam: a jump' : hann ? 'seam: no jump' : 'seam: smooth'}
        </text>
        <text x={0} y={MID + AMP + 17} className="we-t">block 1</text>
        <text x={W} y={MID + AMP + 17} textAnchor="end" className="we-t">block 2</text>

        <text x={0} y={Y0 - 30} className="we-t-b">What the transform finds</text>
        <text x={W} y={Y0 - 30} textAnchor="end" className="we-t">{hann ? 'Hann' : 'plain cut'} (dashed: {hann ? 'plain' : 'Hann'})</text>
        {[0, -50, -100].map((d) => (
          <g key={d}>
            <line x1={L} x2={R} y1={yDb(d)} y2={yDb(d)} className="we-grid" />
            <text x={L - 4} y={yDb(d) + 4} textAnchor="end" className="we-t">{d}</text>
          </g>
        ))}
        <text x={L - 4} y={Y0 - 6} textAnchor="end" className="we-t">dB</text>
        {spec.map((d, k) => {
          const near = Math.abs(k - toneBin) <= NEAR;
          const h = Math.max(0, q(Y1 - yDb(d)));
          const isQuiet = quiet && k === QUIET_BIN;
          return (
            <motion.rect
              key={k}
              x={q(cx(k) - sw / 2)}
              width={sw}
              rx={1.5}
              fill={near ? 'var(--ink)' : leakColor}
              stroke={isQuiet ? 'var(--ink)' : 'none'}
              strokeWidth={isQuiet ? 1.6 : 0}
              initial={false}
              animate={{ y: q(Y1 - h), height: h }}
              transition={{ duration: 0.4, ease: EASE }}
            />
          );
        })}
        <path d={ghostPath} fill="none" stroke="var(--ink-2)" strokeWidth={1.3} strokeDasharray="4 3" opacity={0.85} />
        {st.leakDb > FLOOR_DB && (
          <g>
            <line x1={L} x2={R} y1={leakY} y2={leakY} stroke={leakColor} strokeWidth={1.3} strokeDasharray="5 3" />
            <text x={R} y={leakY - 4} textAnchor="end" className={hann ? 'we-t-good' : 'we-t-bad'}>
              worst leakage {db1(st.leakDb)} dB
            </text>
          </g>
        )}
        <path d={`M${cx(toneBin) - 5} ${Y0 - 12} L${cx(toneBin) + 5} ${Y0 - 12} L${cx(toneBin)} ${Y0 - 3} Z`} fill="var(--ink)" />
        {quiet && (
          <g>
            <path d={`M${cx(QUIET_BIN) - 5} ${Y1 + 14} L${cx(QUIET_BIN) + 5} ${Y1 + 14} L${cx(QUIET_BIN)} ${Y1 + 5} Z`} fill="var(--ink)" />
            <text x={cx(QUIET_BIN)} y={Y1 + 30} textAnchor="middle" className="we-t-b">quiet tone: {st.quietSeen ? 'seen' : 'buried'}</text>
          </g>
        )}
        {[0, 8, 16, 24, 32].map((k) => (
          <text key={k} x={cx(k)} y={Y1 + 18} textAnchor="middle" className="we-t" opacity={quiet && Math.abs(k - QUIET_BIN) < 5 ? 0 : 1}>{k}</text>
        ))}
        <text x={W} y={Y1 + 50} textAnchor="end" className="we-t">bin = waves that fit in the block</text>
      </svg>
      <ul className="we-stats">
        <li className={st.peakDb < -3 ? 'is-bad' : ''}>
          <b>{db1(st.peakDb)} dB</b>tone reads (true height is 0 dB)
        </li>
        <li className={st.peakToLeakDb < 25 ? 'is-bad' : 'is-good'}>
          <b>{st.peakToLeakDb >= 100 ? '100+ dB' : `${Math.round(st.peakToLeakDb)} dB`}</b>tone above worst leakage (dashed {hann ? 'plain cut' : 'Hann'}: {stOther.peakToLeakDb >= 100 ? '100+' : Math.round(stOther.peakToLeakDb)} dB)
        </li>
        <li className={st.farEnergy > 0.01 ? 'is-bad' : 'is-good'}>
          <b>{pctText(st.farEnergy)}</b>of energy lands more than 2 bins away
        </li>
      </ul>
      <p className="we-note">
        A transform treats the block as if it repeated forever. A tone that does not fit a whole number of waves leaves a jump at the seam, and a jump contains every frequency, so energy leaks into bins far from the tone. The Hann window fades both ends to zero, so there is no jump. It costs a little: the peak gets wider (the tone spreads over about 3 bins instead of 1). Toy block of {N} samples; levels are computed by a direct DFT.
      </p>
    </WhatIfFrame>
  );
}
