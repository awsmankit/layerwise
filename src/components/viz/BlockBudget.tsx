import { useMemo, useState } from 'react';
import { Root } from './shared';
import { averagePowerMw, blocksPerSecond, computeTimes, deadlineReport, latencyParts, periodMs } from '../../lib/realtime-budget';

/*
 * Block budget explorer. Audio reaches a processing loop in blocks of a fixed number of samples, so every block
 * sets a deadline: the time it takes to play. This widget shows the delay that block size, window and look-ahead
 * add up to, and then runs 2,000 invented inference times (a seeded random series, not a measurement of any
 * device) against the deadline to count the blocks that would glitch.
 */

const RATES = [16000, 44100, 48000];
const BLOCKS = [16, 32, 64, 128, 160, 256, 512];
const BLOCK_COUNT = 2000;
const SHOWN = 60;
const CAP = 1.5; // bars are drawn up to one and a half times the deadline

const PRESETS = [
  { label: 'Tiny blocks: 32 samples at 16 kHz', rate: 16000, block: 32, window: 64, look: 0, other: 0, mean: 0.6 },
  { label: 'Speech frames: 160 hop, 400 window', rate: 16000, block: 160, window: 400, look: 0, other: 0, mean: 1.5 },
  { label: 'Music plug-in: 128 samples at 48 kHz', rate: 48000, block: 128, window: 128, look: 0, other: 0, mean: 0.8 },
];

const f1 = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString('en-GB') : n.toFixed(1));
const f2 = (n: number) => n.toFixed(2);

export default function BlockBudget() {
  const [rate, setRate] = useState(16000);
  const [block, setBlock] = useState(128);
  const [win, setWin] = useState(256);
  const [look, setLook] = useState(0);
  const [other, setOther] = useState(1);
  const [budget, setBudget] = useState(10);
  const [mean, setMean] = useState(1.5);
  const [spikePct, setSpikePct] = useState(1);
  const [spikeX, setSpikeX] = useState(3);
  const [energy, setEnergy] = useState(40);

  const period = periodMs(rate, block);
  const parts = latencyParts({ rate, block, window: win, lookaheadFrames: look, otherMs: other });
  const times = useMemo(() => computeTimes(BLOCK_COUNT, { meanMs: mean, jitter: 0.08, spikeChance: spikePct / 100, spikeFactor: spikeX }, 7), [mean, spikePct, spikeX]);
  const rep = useMemo(() => deadlineReport(times, period), [times, period]);
  const perSecond = blocksPerSecond(rate, block);
  const missesPerMinute = rep.missRate * perSecond * 60;
  const power = averagePowerMw(rate, block, energy, 0);

  const scale = Math.max(parts.totalMs, budget) * 1.08;
  const pct = (v: number) => `${Math.round(Math.max(0, (v / scale) * 100) * 100) / 100}%`;
  const overBudget = parts.totalMs > budget;

  const segs = [
    { key: 'fill', label: 'Waiting for the block to fill', v: parts.fillMs },
    { key: 'slot', label: 'Processing slot', v: parts.slotMs },
    { key: 'look', label: 'Look-ahead and window overhang', v: parts.lookaheadMs },
    { key: 'other', label: 'Converters and everything else', v: parts.otherMs },
  ];

  const verdictLatency = overBudget
    ? `Total delay ${f1(parts.totalMs)} ms: ${f1(parts.totalMs - budget)} ms over the ${budget} ms budget.`
    : `Total delay ${f1(parts.totalMs)} ms: within the ${budget} ms budget, with ${f1(budget - parts.totalMs)} ms spare.`;
  const verdictCompute =
    rep.mean > period
      ? `The model needs more time per block (${f2(rep.mean)} ms on average) than the block lasts (${f2(period)} ms). It cannot keep up: every block misses.`
      : rep.misses === 0
        ? `No block in ${BLOCK_COUNT.toLocaleString('en-GB')} missed its ${f2(period)} ms deadline. The model uses ${Math.round(rep.load * 100)}% of the processor, and the slowest block took ${f2(rep.max)} ms.`
        : `${rep.misses} of ${BLOCK_COUNT.toLocaleString('en-GB')} blocks missed the ${f2(period)} ms deadline (${(rep.missRate * 100).toFixed(1)}%). At ${f1(perSecond)} blocks a second that is about ${missesPerMinute < 10 ? missesPerMinute.toFixed(1) : Math.round(missesPerMinute)} audible glitches a minute, even though the typical block took only ${f2(rep.p50)} ms.`;

  const apply = (p: (typeof PRESETS)[number]) => {
    setRate(p.rate);
    setBlock(p.block);
    setWin(p.window);
    setLook(p.look);
    setOther(p.other);
    setMean(p.mean);
  };

  return (
    <Root>
      <div className="viz eb">
        <p className="viz-title">Block budget explorer</p>

        <div className="eb-chips" role="group" aria-label="Starting points">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="eb-chip" onClick={() => apply(p)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="eb-cols">
          <fieldset className="eb-set">
            <legend>The audio path</legend>
            <div className="eb-chips" role="group" aria-label="Sample rate">
              <span className="eb-chip-label">Rate</span>
              {RATES.map((r) => (
                <button key={r} type="button" className="eb-chip" aria-pressed={rate === r} onClick={() => setRate(r)}>
                  {r / 1000} kHz
                </button>
              ))}
            </div>
            <div className="eb-chips" role="group" aria-label="Block size in samples">
              <span className="eb-chip-label">Block</span>
              {BLOCKS.map((b) => (
                <button key={b} type="button" className="eb-chip" aria-pressed={block === b} onClick={() => setBlock(b)}>
                  {b}
                </button>
              ))}
            </div>
            <label className="field">
              <span>
                Analysis window <b>{win} samples</b>
              </span>
              <input type="range" min={16} max={1024} step={16} value={win} onChange={(e) => setWin(+e.target.value)} />
            </label>
            <label className="field">
              <span>
                Look-ahead frames <b>{look}</b>
              </span>
              <input type="range" min={0} max={4} step={1} value={look} onChange={(e) => setLook(+e.target.value)} />
            </label>
            <label className="field">
              <span>
                Converters and other delay <b>{other} ms</b>
              </span>
              <input type="range" min={0} max={10} step={0.5} value={other} onChange={(e) => setOther(+e.target.value)} />
            </label>
            <label className="field">
              <span>
                Your delay budget <b>{budget} ms</b>
              </span>
              <input type="range" min={2} max={40} step={1} value={budget} onChange={(e) => setBudget(+e.target.value)} />
            </label>
          </fieldset>

          <fieldset className="eb-set">
            <legend>The processor (invented numbers)</legend>
            <label className="field">
              <span>
                Typical time per inference <b>{f2(mean)} ms</b>
              </span>
              <input type="range" min={0.1} max={20} step={0.1} value={mean} onChange={(e) => setMean(+e.target.value)} />
            </label>
            <label className="field">
              <span>
                Chance a block is slow <b>{spikePct}%</b>
              </span>
              <input type="range" min={0} max={5} step={0.5} value={spikePct} onChange={(e) => setSpikePct(+e.target.value)} />
            </label>
            <label className="field">
              <span>
                A slow block takes <b>{spikeX} times</b> longer
              </span>
              <input type="range" min={2} max={10} step={1} value={spikeX} onChange={(e) => setSpikeX(+e.target.value)} />
            </label>
            <label className="field">
              <span>
                Energy per inference <b>{energy} µJ</b>
              </span>
              <input type="range" min={5} max={200} step={5} value={energy} onChange={(e) => setEnergy(+e.target.value)} />
            </label>
            <p className="eb-hint">The cost of one inference is set by the model and the chip, not by the block size. Try shrinking the block while the time per inference stays put.</p>
          </fieldset>
        </div>

        <h3 className="eb-h">Delay from sound in to sound out (worst case)</h3>
        <div
          className="eb-stack"
          role="img"
          aria-label={`${segs.map((s) => `${s.label}: ${f1(s.v)} milliseconds`).join('. ')}. ${verdictLatency}`}
        >
          {segs.map((s) => (
            <span key={s.key} className={`eb-seg eb-seg-${s.key}`} style={{ width: pct(s.v) }} />
          ))}
          <span className="eb-mark" style={{ left: pct(budget) }} />
        </div>
        <ul className="eb-legend">
          {segs.map((s) => (
            <li key={s.key}>
              <span className={`eb-sw eb-seg-${s.key}`} aria-hidden="true" />
              {s.label}: <b className="num">{f1(s.v)} ms</b>
            </li>
          ))}
          <li>
            <span className="eb-sw eb-sw-mark" aria-hidden="true" />
            Your budget: <b className="num">{budget} ms</b>
          </li>
        </ul>
        <p className={`eb-say ${overBudget ? 'eb-bad' : ''}`} aria-live="polite">
          {verdictLatency}
        </p>

        <h3 className="eb-h">Does each block finish in time?</h3>
        <div
          className="eb-bars"
          role="img"
          aria-label={`The first ${SHOWN} of ${BLOCK_COUNT} blocks, each drawn as a bar for its compute time against the ${f2(period)} millisecond deadline. ${rep.misses} blocks in ${BLOCK_COUNT} missed the deadline.`}
        >
          {Array.from(times.slice(0, SHOWN)).map((t, i) => (
            <span key={i} className={`eb-bar ${t > period ? 'eb-miss' : ''}`} style={{ height: `${Math.round(Math.min(1, t / period / CAP) * 10000) / 100}%` }} />
          ))}
          <span className="eb-deadline" style={{ bottom: `${100 / CAP}%` }}>
            <i>deadline {f2(period)} ms</i>
          </span>
        </div>
        <p className="eb-axis">The first {SHOWN} blocks. Each bar is the time one block took, clipped at one and a half times the deadline. Red bars overran.</p>

        <dl className="eb-stats">
          {[
            ['Typical (p50)', rep.p50],
            ['p99', rep.p99],
            ['p99.9', rep.p999],
            ['Slowest', rep.max],
          ].map(([name, v]) => (
            <div key={name as string} className={(v as number) > period ? 'eb-over' : ''}>
              <dt>{name}</dt>
              <dd className="num">{f2(v as number)} ms</dd>
            </div>
          ))}
        </dl>
        <p className={`eb-say ${rep.misses ? 'eb-bad' : ''}`} aria-live="polite">
          {verdictCompute}
        </p>

        <p className="eb-say" aria-live="polite">
          Power: {f1(perSecond)} inferences a second at {energy} µJ each is {f2(power)} mW from inference alone. Halving the block doubles that.
        </p>
        <p className="viz-cap">The timings are made up for teaching, drawn from a seeded random series: a typical value with a little spread, plus occasional slow blocks. A real chip has its own pattern, and only a measurement on the target shows it.</p>
      </div>
    </Root>
  );
}
