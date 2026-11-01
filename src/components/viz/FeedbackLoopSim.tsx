import { useEffect, useMemo, useRef, useState } from 'react';
import { Root, useNarrow } from './shared';
import { LOOP_APPEAL, LOOP_ITEMS, simulateLoop, type LoopRank } from '../../lib/recommender';

const ROUNDS = 100;
const EXPLORE = [0, 0.05, 0.1, 0.2];

/** A popularity-style recommender that learns only from what it shows. Watch which films get shown, and whether the best one is ever found. */
export default function FeedbackLoopSim() {
  const narrow = useNarrow();
  const [seed, setSeed] = useState(1);
  const [eps, setEps] = useState(0);
  const [rank, setRank] = useState<LoopRank>('rate');
  const [round, setRound] = useState(ROUNDS);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const run = useMemo(() => simulateLoop(seed, eps, ROUNDS, 20, rank), [seed, eps, rank]);
  const imp = run.impressions[round];
  const total = imp.reduce((a, b) => a + b, 0);
  const maxImp = Math.max(1, ...imp);
  const order = [...imp.keys()].sort((a, b) => imp[b] - imp[a]);
  const bestShare = total ? imp[LOOP_ITEMS - 1] / total : 0;
  const bestRank = order.indexOf(LOOP_ITEMS - 1) + 1;

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setRound((r) => {
        if (r >= ROUNDS) {
          setPlaying(false);
          return r;
        }
        return r + 1;
      });
    }, 70);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing]);

  const restart = (nextSeed: number) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setSeed(nextSeed);
    setRound(reduce ? ROUNDS : 0);
    setPlaying(!reduce);
  };

  const W = narrow ? 280 : 560;
  const H = 190;
  const ML = 8;
  const bw = (W - ML * 2) / LOOP_ITEMS;
  const y = (v: number) => H - 34 - (v / maxImp) * (H - 54);

  const status = `After ${round} round${round === 1 ? '' : 's'}: the best film (number ${LOOP_ITEMS}, click chance ${Math.round(LOOP_APPEAL[LOOP_ITEMS - 1] * 100)}%) has had ${(bestShare * 100).toFixed(0)}% of all showings and ranks ${bestRank} of ${LOOP_ITEMS} by showings. Most shown: film ${order[0] + 1}, ${Math.round((imp[order[0]] / Math.max(1, total)) * 100)}% of showings.`;

  return (
    <Root>
      <div className="viz ap1">
        <p className="viz-title">The feedback loop: it only learns about what it shows</p>
        <p className="ap1-note">
          Invented simulation. Ten films have a real click chance from 30% (film 1) to 48% (film 10). Each round, 20 people are each shown the system&apos;s top 3 films and may click. The system then re-ranks using only those clicks.
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} className="ap1-svg" role="img" aria-label={`Bars show how many times each of ten films has been shown after ${round} rounds. ${status}`}>
          <rect x={0.5} y={0.5} width={W - 1} height={H - 1} className="ap1-frame" />
          {imp.map((v, i) => {
            const x = ML + i * bw;
            return (
              <g key={i}>
                <rect x={x + 3} y={y(v)} width={bw - 6} height={Math.max(0, H - 34 - y(v))} className={i === LOOP_ITEMS - 1 ? 'ap1-bar best' : 'ap1-bar'} />
                <text x={x + bw / 2} y={H - 18} textAnchor="middle" className="ap1-tick">{i + 1}</text>
                <text x={x + bw / 2} y={H - 5} textAnchor="middle" className="ap1-tick dim">{Math.round(LOOP_APPEAL[i] * 100)}%</text>
              </g>
            );
          })}
          <text x={ML + 2} y={14} className="ap1-tick">times shown (cumulative)</text>
        </svg>
        <p className="ap1-small">Numbers under the bars: film number, then its true click chance. The orange bar is the genuinely best film.</p>

        <div className="ap1-ctrls">
          <label className="field">
            <span>Round <b>{round}</b> of {ROUNDS}</span>
            <input type="range" min={0} max={ROUNDS} step={1} value={round} onChange={(e) => { setPlaying(false); setRound(+e.target.value); }} />
          </label>
          <div className="field">
            <span>Share of slots filled with a random film</span>
            <div className="ap1-btns" role="group" aria-label="Exploration share">
              {EXPLORE.map((e) => (
                <button key={e} type="button" className="btn quiet" aria-pressed={eps === e} onClick={() => { setEps(e); }}>
                  {Math.round(e * 100)}%
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>The system ranks films by</span>
            <div className="ap1-btns" role="group" aria-label="Ranking rule">
              <button type="button" className="btn quiet" aria-pressed={rank === 'rate'} onClick={() => setRank('rate')}>clicks per showing</button>
              <button type="button" className="btn quiet" aria-pressed={rank === 'clicks'} onClick={() => setRank('clicks')}>total clicks</button>
            </div>
          </div>
        </div>
        <div className="ap1-btns">
          <button type="button" className="btn quiet" onClick={() => { if (round >= ROUNDS) setRound(0); setPlaying((p) => !p); }}>
            {playing ? 'Pause' : round >= ROUNDS ? 'Replay' : 'Play'}
          </button>
          <button type="button" className="btn quiet" onClick={() => restart(seed + 1)}>Run again with a new random seed</button>
        </div>
        <p className="ap1-readout" role="status" aria-live="polite">{status}</p>
        <p className="viz-cap">Try 0% random with each ranking rule, then 20%. Ranking by total clicks lets the early leaders win for good, because a film that is rarely shown cannot collect clicks. Ranking by clicks per showing lets a little random exposure find the best film.</p>
      </div>
    </Root>
  );
}
