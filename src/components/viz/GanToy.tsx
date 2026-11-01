import { useCallback, useEffect, useRef, useState } from 'react';
import { Root } from './shared';
import {
  D_STEPS,
  Gan,
  MODES,
  MODE_SD,
  OUTCOME_LABEL,
  PRESETS,
  RATES_D,
  RATES_G,
  RUN_LENGTH,
  classify,
  type GanSettings,
  type Outcome,
} from '../../lib/gan';

const W = 280;
const X0 = -4;
const X1 = 4;
const sx = (x: number) => ((x - X0) / (X1 - X0)) * W;
const BASE = 150;
const TOP = 14;
const BINS = 32;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const pdf = (x: number) =>
  0.5 * (Math.exp(-((x - MODES[0]) ** 2) / (2 * MODE_SD ** 2)) + Math.exp(-((x - MODES[1]) ** 2) / (2 * MODE_SD ** 2))) / (MODE_SD * Math.sqrt(2 * Math.PI));
const PDF_MAX = pdf(MODES[0]);

const ixOf = (arr: number[], v: number) => Math.max(0, arr.findIndex((a) => a >= v - 1e-12));

type View = {
  step: number;
  bars: number[];
  dCurve: number[];
  cov: { left: number; right: number; between: number };
  w1: number;
  hist: { step: number; w1: number }[];
  lossD: number;
  lossG: number;
};

function read(g: Gan): View {
  const f = g.fakes(400);
  const bars = new Array<number>(BINS).fill(0);
  for (const x of f) {
    const b = Math.floor(((x - X0) / (X1 - X0)) * BINS);
    if (b >= 0 && b < BINS) bars[b] += 1;
  }
  const last = g.history[g.history.length - 1];
  return {
    step: g.steps,
    bars,
    dCurve: Array.from({ length: 81 }, (_, i) => g.disc(X0 + (i * (X1 - X0)) / 80)),
    cov: g.coverage(),
    w1: g.w1(),
    hist: g.history.map((h) => ({ step: h.step, w1: h.w1 })),
    lossD: last ? last.lossD : NaN,
    lossG: last ? last.lossG : NaN,
  };
}

export default function GanToy() {
  const [s, setS] = useState<GanSettings>(PRESETS[0].settings);
  const [presetId, setPresetId] = useState<string | null>('even');
  const [view, setView] = useState<View | null>(null);
  const [running, setRunning] = useState(false);
  const [tally, setTally] = useState<{ seed: number; outcome: Outcome }[] | null>(null);
  const [tallyBusy, setTallyBusy] = useState(false);
  const gan = useRef<Gan | null>(null);

  const rebuild = useCallback((settings: GanSettings) => {
    gan.current = new Gan(settings);
    setView(read(gan.current));
    setRunning(false);
    setTally(null);
  }, []);

  // build after mounting so server and browser never disagree in the last digit
  // (a click made while the page was still hydrating may already have built a run; keep that one)
  useEffect(() => {
    if (!gan.current) rebuild(PRESETS[0].settings);
  }, [rebuild]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const g = gan.current;
      if (!g) return;
      g.run(20);
      setView(read(g));
      if (g.steps >= RUN_LENGTH) setRunning(false);
    }, 40);
    return () => clearInterval(id);
  }, [running]);

  const change = (patch: Partial<GanSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    setPresetId(null);
    rebuild(next);
  };

  const choose = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setS(p.settings);
    setPresetId(id);
    rebuild(p.settings);
  };

  const stepBy = (n: number) => {
    const g = gan.current;
    if (!g) return;
    setRunning(false);
    g.run(n);
    setView(read(g));
  };

  const trySeeds = () => {
    setRunning(false);
    setTallyBusy(true);
    const out: { seed: number; outcome: Outcome }[] = [];
    setTally([]);
    const go = (seed: number) => {
      if (seed > 8) {
        setTallyBusy(false);
        return;
      }
      const g = new Gan({ ...s, seed });
      g.run(RUN_LENGTH);
      out.push({ seed, outcome: classify(g.coverage()) });
      setTally([...out]);
      setTimeout(() => go(seed + 1), 0);
    };
    setTimeout(() => go(1), 0);
  };

  const preset = PRESETS.find((p) => p.id === presetId);
  const gIx = ixOf(RATES_G, s.lrG);
  const dIx = ixOf(RATES_D, s.lrD);
  const kIx = Math.max(0, D_STEPS.indexOf(s.dSteps));

  const v = view;
  const outcome = v ? classify(v.cov) : null;
  const summary = v
    ? `Round ${v.step}. Of 400 fake samples, ${pct(v.cov.left)} are on the left hump, ${pct(v.cov.right)} on the right hump and ${pct(v.cov.between)} in between. Distance to the real data ${v.w1.toFixed(2)}.`
    : 'Setting up the two networks.';

  const maxBar = Math.max(1, ...(v ? v.bars : [1]));
  const binW = W / BINS;
  const realPath = (() => {
    const pts: string[] = [];
    for (let i = 0; i <= 160; i++) {
      const x = X0 + (i * (X1 - X0)) / 160;
      pts.push(`${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${(BASE - (pdf(x) / PDF_MAX) * (BASE - TOP) * 0.9).toFixed(1)}`);
    }
    return pts.join(' ');
  })();
  const dPath = v
    ? v.dCurve.map((d, i) => `${i ? 'L' : 'M'}${sx(X0 + (i * (X1 - X0)) / 80).toFixed(1)} ${(BASE - d * (BASE - TOP)).toFixed(1)}`).join(' ')
    : '';

  const hMax = v ? Math.max(1, ...v.hist.map((h) => h.w1), 1) : 1;
  const histPath = v && v.hist.length > 1
    ? v.hist.map((h, i) => `${i ? 'L' : 'M'}${((h.step / RUN_LENGTH) * (W - 4) + 2).toFixed(1)} ${(46 - (h.w1 / hMax) * 40).toFixed(1)}`).join(' ')
    : '';

  return (
    <Root>
      <div className="viz wb wb-gan">
        <p className="viz-title">Forger against detective, on one number</p>

        <div className="wb-row" role="group" aria-label="Presets">
          <span className="wb-label">Try</span>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="wb-chip" aria-pressed={presetId === p.id} onClick={() => choose(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        {preset && <p className="wb-note">{preset.note}</p>}

        <svg viewBox={`0 0 ${W} 172`} className="wb-svg" role="img" aria-label={`Real data, fake samples and the discriminator. ${summary}`}>
          <rect x="0.5" y="0.5" width={W - 1} height="171" className="wb-frame" />
          {v &&
            v.bars.map((b, i) => {
              const h = (b / maxBar) * (BASE - TOP);
              return <rect key={i} x={(i * binW + 0.5).toFixed(1)} y={(BASE - h).toFixed(1)} width={(binW - 1).toFixed(1)} height={h.toFixed(1)} className="wb-hbar" />;
            })}
          <path d={realPath} className="wb-real" />
          {dPath && <path d={dPath} className="wb-dcurve" />}
          <line x1="0" y1={BASE} x2={W} y2={BASE} className="wb-axis" />
          {[-4, -2, 0, 2, 4].map((t) => (
            <text key={t} x={Math.min(W - 6, Math.max(6, sx(t)))} y="167" textAnchor="middle" className="wb-tl">
              {t}
            </text>
          ))}
        </svg>
        <p className="wb-key" aria-hidden="true">
          <i className="wb-k wb-k-fake" /> fake samples &nbsp; <i className="wb-k wb-k-real" /> real data (two humps) &nbsp; <i className="wb-k wb-k-d" /> detective's score (top = "real")
        </p>

        <p className="wb-read" aria-live="polite">
          <span className="sr-only">{summary}</span>
          {v && (
            <span aria-hidden="true">
              Round <b>{v.step}</b> &middot; fakes: left <b>{pct(v.cov.left)}</b>, right <b>{pct(v.cov.right)}</b>, between <b>{pct(v.cov.between)}</b> &middot; distance to real <b>{v.w1.toFixed(2)}</b>
            </span>
          )}
        </p>
        {v && outcome && v.step >= 300 && <p className="wb-hint">Right now: {OUTCOME_LABEL[outcome]}.</p>}

        <div className="wb-controls">
          <button type="button" className="btn" onClick={() => setRunning((r) => !r)} disabled={!!v && v.step >= RUN_LENGTH && !running}>
            {running ? 'Pause' : v && v.step > 0 ? 'Keep training' : 'Train'}
          </button>
          <button type="button" className="btn quiet" onClick={() => stepBy(10)}>
            10 rounds
          </button>
          <button type="button" className="btn quiet" onClick={() => rebuild(s)}>
            Start again
          </button>
        </div>

        {v && v.hist.length > 1 && (
          <figure className="wb-fig">
            <svg viewBox={`0 0 ${W} 50`} className="wb-svg wb-svg-strip" role="img" aria-label={`Distance to the real data over ${v.step} rounds, now ${v.w1.toFixed(2)}.`}>
              <line x1="0" y1="46" x2={W} y2="46" className="wb-axis" />
              <path d={histPath} className="wb-hist" />
            </svg>
            <figcaption>Distance between the fakes and the real data over the run (lower is better). A run that hops between humps shows a jagged line instead of a steady fall.</figcaption>
          </figure>
        )}

        <div className="wb-sliders">
          <label className="field">
            <span>
              Forger learning rate <b>{RATES_G[gIx]}</b>
            </span>
            <input type="range" min={0} max={RATES_G.length - 1} step={1} value={gIx} aria-label="Generator learning rate" aria-valuetext={`${RATES_G[gIx]}`} onChange={(e) => change({ lrG: RATES_G[+e.target.value] })} />
          </label>
          <label className="field">
            <span>
              Detective learning rate <b>{RATES_D[dIx]}</b>
            </span>
            <input type="range" min={0} max={RATES_D.length - 1} step={1} value={dIx} aria-label="Discriminator learning rate" aria-valuetext={`${RATES_D[dIx]}`} onChange={(e) => change({ lrD: RATES_D[+e.target.value] })} />
          </label>
          <label className="field">
            <span>
              Detective steps per forger step <b>{s.dSteps}</b>
            </span>
            <input type="range" min={0} max={D_STEPS.length - 1} step={1} value={kIx} aria-label="Discriminator updates per generator update" aria-valuetext={`${s.dSteps}`} onChange={(e) => change({ dSteps: D_STEPS[+e.target.value] })} />
          </label>
          <label className="field">
            <span>
              Seed <b>{s.seed}</b>
            </span>
            <input type="range" min={1} max={8} step={1} value={s.seed} aria-label="Random seed" onChange={(e) => change({ seed: +e.target.value })} />
          </label>
        </div>

        <div className="wb-controls">
          <button type="button" className="btn quiet" onClick={trySeeds} disabled={tallyBusy}>
            {tallyBusy ? 'Running seeds...' : `Run these settings on 8 seeds (${RUN_LENGTH} rounds each)`}
          </button>
        </div>
        {tally && tally.length > 0 && (
          <div className="wb-tally" aria-live="polite">
            <ul className="wb-tally-list">
              {tally.map((t) => (
                <li key={t.seed} className={`wb-out wb-out-${t.outcome}`}>
                  Seed {t.seed}: {OUTCOME_LABEL[t.outcome]}
                </li>
              ))}
            </ul>
            {!tallyBusy && (
              <p className="wb-hint">
                {(['both', 'one-hump', 'between', 'partial'] as Outcome[])
                  .map((o) => [o, tally.filter((t) => t.outcome === o).length] as const)
                  .filter(([, n]) => n > 0)
                  .map(([o, n]) => `${n} ${OUTCOME_LABEL[o]}`)
                  .join(', ')}
                . Same settings, different starting weights: GAN training is not repeatable the way a plain loss curve is.
              </p>
            )}
          </div>
        )}

        <p className="viz-cap">
          Real data: half the samples near -2 and half near 2. The forger is a tiny network that turns a random number into a sample. The detective is a tiny network that outputs a score from 0 to 1. Both are really trained here, in your browser, taking turns, with the loss from the original GAN paper. Outcomes depend on the settings and the seed: this is a toy, and a real GAN has far more moving parts. "Between" means a fake that is not within 1.2 of either hump centre.
        </p>
      </div>
    </Root>
  );
}
