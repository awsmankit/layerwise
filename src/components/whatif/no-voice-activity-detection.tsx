import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import {
  BATTERY_WH,
  CELLS,
  FALSE_ALARM,
  P_BASE_MW,
  P_BIG_MW,
  P_VAD_MW,
  WORDS_PER_SEC,
  averagePowerMw,
  batteryHours,
  dutyCycle,
  energyPerDayMWh,
  makeMinute,
  minuteCounts,
  missedWordsPerDay,
  wordsPerDay,
} from '../../lib/whatif/no-voice-activity-detection';

const W = 340;
const CW = W / CELLS;
const BLUE = '#3b6fd8';
const AMBER = '#e0a21e';
const PURPLE = '#7a4fd6';
const RED = '#d6453d';
const ROWS = { sound: 42, gate: 94, big: 146 };
const CH = 20;

const q = (v: number) => Math.round(v * 100) / 100;
const pct1 = (v: number) => `${(Math.round(v * 1000) / 10).toFixed(1)}%`;
const days = (h: number) => (Math.round((h / 24) * 10) / 10).toFixed(1);

/**
 * One example minute on three rows (sound, the cheap detector's gate, the big recogniser) and the day's energy and battery life.
 * Hardware figures are generic examples. The detector misses some speech (words lost) and opens by mistake on a little quiet time.
 */
export default function NoVoiceActivityDetectionWhatIf() {
  const [gated, setGated] = useState(true);
  const [speechPct, setSpeechPct] = useState(10);
  const [missPct, setMissPct] = useState(5);
  const speech = speechPct / 100;
  const miss = missPct / 100;

  const cells = useMemo(() => makeMinute(speech, miss, gated), [speech, miss, gated]);
  const counts = minuteCounts(cells);
  const duty = dutyCycle(speech, miss, gated);
  const power = averagePowerMw(duty, gated);
  const energy = energyPerDayMWh(speech, miss, gated);
  const hours = batteryHours(speech, miss, gated);
  const gateHours = batteryHours(speech, miss, true);
  const alwaysHours = batteryHours(speech, miss, false);
  const gateEnergy = energyPerDayMWh(speech, miss, true);
  const alwaysEnergy = energyPerDayMWh(speech, miss, false);
  const words = wordsPerDay(speech);
  const missedWords = missedWordsPerDay(speech, miss, gated);
  const bestHours = Math.max(gateHours, alwaysHours);
  const spoken = cells.filter((c) => c.word !== null);

  return (
    <WhatIfFrame
      title="An always-listening device, one example minute and one example day"
      withLabel="Cheap gate in front"
      withoutLabel="Big model always on"
      on={gated}
      onChange={setGated}
      verdict={
        gated ? (
          <>
            With the gate, the big model runs only <b>{pct1(duty)}</b> of the day, so the example battery lasts <b>{days(gateHours)} days</b> instead of {days(alwaysHours)}. The price: the detector misses {missPct}% of speech, about {fmt.int(missedWords)} of {fmt.int(words)} words a day.
          </>
        ) : (
          <>
            Without a gate the big model runs all day, including {Math.round((1 - speech) * 100)}% silence, so the example battery lasts only <b>{Math.round(alwaysHours)} hours ({days(alwaysHours)} days)</b>. With a gate it would last {days(gateHours)} days.
          </>
        )
      }
      controls={
        <div className="we-controls">
          <label className="field">
            <span>
              Share of the day with speech <b>{speechPct}%</b>
            </span>
            <input type="range" min={2} max={50} step={2} value={speechPct} onChange={(e) => setSpeechPct(+e.target.value)} aria-label="Share of the day that contains speech" />
          </label>
          <label className="field">
            <span>
              Detector miss rate <b>{missPct}%</b>
            </span>
            <input type="range" min={0} max={40} step={5} value={missPct} onChange={(e) => setMissPct(+e.target.value)} aria-label="Share of speech the detector fails to notice, so the big model never hears it" />
          </label>
        </div>
      }
    >
      <div className="we-fig">
        <svg
          viewBox={`0 0 ${W} 190`}
          className="dx-svg wi-svg we-svg"
          role="img"
          aria-label={`One example minute, one block per second. ${counts.spoken} seconds contain speech. ${gated ? `The detector's gate opens for ${counts.running} seconds and misses ${counts.missed} seconds of speech.` : 'There is no gate, so the big model runs all 60 seconds.'} The big model runs ${counts.running} of 60 seconds, ${counts.onSilence} of them on silence.`}
        >
          <text x={0} y={14} className="we-t-b">One example minute, one block per second</text>
          <text x={0} y={ROWS.sound - 6} className="we-t">Sound: someone speaking</text>
          <text x={0} y={ROWS.gate - 6} className="we-t">{gated ? 'Cheap detector: gate open' : 'No gate: nothing decides'}</text>
          <text x={0} y={ROWS.big - 6} className="we-t">Big recogniser: running</text>
          {cells.map((c, i) => (
            <g key={i}>
              <rect x={q(i * CW)} y={ROWS.sound} width={q(CW - 0.8)} height={CH} fill={c.speech ? BLUE : 'var(--ink)'} opacity={c.speech ? 1 : 0.1} stroke={c.missed ? RED : 'none'} strokeWidth={2} className="we-cell" />
              <rect x={q(i * CW)} y={ROWS.gate} width={q(CW - 0.8)} height={CH} fill={!gated ? 'var(--ink)' : c.missed ? RED : AMBER} opacity={!gated ? 0.06 : c.missed || c.open ? 1 : 0.1} className="we-cell" />
              <rect x={q(i * CW)} y={ROWS.big} width={q(CW - 0.8)} height={CH} fill={PURPLE} opacity={c.open ? (c.speech ? 1 : 0.4) : 0.08} className="we-cell" />
            </g>
          ))}
          <text x={0} y={ROWS.big + CH + 18} className="we-t">0 s</text>
          <text x={W} y={ROWS.big + CH + 18} textAnchor="end" className="we-t">60 s</text>
        </svg>
      </div>
      <ul className="we-legend" aria-label="Key">
        <li><span className="we-sw" style={{ background: BLUE }} /> speech</li>
        <li><span className="we-sw" style={{ background: AMBER }} /> gate open</li>
        <li><span className="we-sw" style={{ background: RED }} /> speech the gate missed</li>
        <li><span className="we-sw" style={{ background: PURPLE }} /> big model running</li>
        <li><span className="we-sw" style={{ background: PURPLE, opacity: 0.4 }} /> running on silence (wasted)</li>
      </ul>
      <p className="we-words" aria-label="Words spoken in this example minute, with missed words struck through">
        {spoken.length === 0 && <span className="we-note">No speech in this minute.</span>}
        {spoken.map((c, i) => (
          <span key={i}>
            <span className={`we-word${c.missed ? ' is-missed' : ''}`}>
              {c.word}
              {c.missed && <span className="we-sr"> (missed)</span>}
            </span>{' '}
          </span>
        ))}
      </p>
      <p className="we-note">
        This minute: {counts.spoken} words spoken, {counts.heard} reach the recogniser{gated ? `, ${counts.missed} lost` : ''}. The big model runs {counts.running} of {CELLS} seconds{counts.onSilence > 0 ? `, ${counts.onSilence} of them on silence` : ''}.
      </p>
      <div className="we-metric">
        <h4>
          Energy for one example day <small>milliwatt-hours, lower is better</small>
        </h4>
        <div className={`we-bar${!gated ? ' is-top' : ''}`}>
          <span>Big model always on</span>
          <div className="we-track"><motion.div className="we-fill is-bad" initial={false} animate={{ width: '100%' }} transition={{ duration: 0.45, ease: EASE }} /></div>
          <b>{fmt.int(alwaysEnergy)}</b>
        </div>
        <div className={`we-bar${gated ? ' is-top' : ''}`}>
          <span>With the gate</span>
          <div className="we-track"><motion.div className="we-fill" initial={false} animate={{ width: `${(gateEnergy / alwaysEnergy) * 100}%` }} transition={{ duration: 0.45, ease: EASE }} /></div>
          <b>{fmt.int(gateEnergy)}</b>
        </div>
      </div>
      <div className="we-metric">
        <h4>
          Battery life <small>days, higher is better</small>
        </h4>
        <div className={`we-bar${!gated ? ' is-top' : ''}`}>
          <span>Big model always on</span>
          <div className="we-track"><motion.div className="we-fill is-bad" initial={false} animate={{ width: `${(alwaysHours / bestHours) * 100}%` }} transition={{ duration: 0.45, ease: EASE }} /></div>
          <b>{days(alwaysHours)}</b>
        </div>
        <div className={`we-bar${gated ? ' is-top' : ''}`}>
          <span>With the gate</span>
          <div className="we-track"><motion.div className="we-fill" initial={false} animate={{ width: `${(gateHours / bestHours) * 100}%` }} transition={{ duration: 0.45, ease: EASE }} /></div>
          <b>{days(gateHours)}</b>
        </div>
      </div>
      <ul className="we-stats">
        <li className={gated ? 'is-good' : 'is-bad'}>
          <b>{pct1(duty)}</b>
          duty cycle: share of the day the big model runs
        </li>
        <li>
          <b>{(Math.round(power * 10) / 10).toFixed(1)} mW</b>
          average power
        </li>
        <li className={gated && missedWords > 0 ? 'is-bad' : ''}>
          <b>{gated ? fmt.int(missedWords) : '0'}</b>
          words lost per day, of {fmt.int(words)} spoken
        </li>
      </ul>
      <p className="we-example">
        <b>Generic example figures, not a real device:</b> the big recogniser draws {P_BIG_MW} mW while running, the detector {P_VAD_MW} mW all the time, the microphone and everything else {P_BASE_MW} mW, and the battery holds {BATTERY_WH} Wh. The detector also opens the gate by mistake on {Math.round(FALSE_ALARM * 100)}% of quiet time. Speech is taken as {WORDS_PER_SEC} words per second. Battery life is the battery energy divided by the average power.
      </p>
    </WhatIfFrame>
  );
}

