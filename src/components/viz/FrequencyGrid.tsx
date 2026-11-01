import { useId, useState } from 'react';
import { Root } from './shared';
import { naturalFrequencies } from '../../lib/maths-play';

const RATES = [0.01, 0.02, 0.05, 0.1, 0.2];
const HITS = [0.8, 0.9, 0.99];
const FALSES = [0.01, 0.05, 0.09, 0.2];
const COLS = 40;
const CELL = 8;
const pct = (v: number) => Math.round(v * 100) + '%';

/**
 * Bayes' rule by counting 1,000 imaginary players. Four boxes: cheats caught, cheats missed, honest players flagged
 * by mistake, honest players left alone. The chance that a flagged player really cheats is one box divided by two.
 */
export default function FrequencyGrid() {
  const [rate, setRate] = useState(0.01);
  const [hit, setHit] = useState(0.9);
  const [fa, setFa] = useState(0.09);
  const id = useId();
  const c = naturalFrequencies(1000, rate, hit, fa);

  // dots in order: caught, missed, false alarms, clear
  const kinds: ('caught' | 'missed' | 'false' | 'clear')[] = [
    ...Array<'caught'>(c.caught).fill('caught'),
    ...Array<'missed'>(c.missed).fill('missed'),
    ...Array<'false'>(c.falseAlarms).fill('false'),
    ...Array<'clear'>(c.clear).fill('clear'),
  ];
  const rows = Math.ceil(1000 / COLS);

  const group = (label: string, values: number[], cur: number, set: (v: number) => void) => (
    <div className="ws-btns" role="group" aria-label={label}>
      <span className="ws-lab">{label}</span>
      {values.map((v) => (
        <button key={v} type="button" className="ws-chip" aria-pressed={cur === v} onClick={() => set(v)}>
          {pct(v)}
        </button>
      ))}
    </div>
  );

  return (
    <Root>
      <div className="viz ws-freq">
        <p className="viz-title">1,000 players, one cheat-detector</p>
        <p className="ws-note" id={id}>
          Invented numbers for a game. Each dot is one player. Change the three settings and watch the boxes.
        </p>
        {group('Players who cheat:', RATES, rate, setRate)}
        {group('Cheats it catches:', HITS, hit, setHit)}
        {group('Honest players it flags by mistake:', FALSES, fa, setFa)}

        <svg className="ws-svg ws-wide" viewBox={`0 0 ${COLS * CELL} ${rows * CELL}`} role="img" aria-label={`1,000 dots: ${c.caught} cheats caught, ${c.missed} cheats missed, ${c.falseAlarms} honest players flagged by mistake and ${c.clear} honest players left alone.`} aria-describedby={id}>
          {kinds.map((k, i) => (
            <rect key={i} className={'ws-dot is-' + k} x={(i % COLS) * CELL + 1} y={Math.floor(i / COLS) * CELL + 1} width={CELL - 2} height={CELL - 2} rx={1.5} />
          ))}
        </svg>

        <ul className="ws-key">
          <li><span className="ws-sw is-caught" aria-hidden="true" /> Cheats caught: <b>{c.caught}</b></li>
          <li><span className="ws-sw is-missed" aria-hidden="true" /> Cheats missed: <b>{c.missed}</b></li>
          <li><span className="ws-sw is-false" aria-hidden="true" /> Honest, flagged by mistake: <b>{c.falseAlarms}</b></li>
          <li><span className="ws-sw is-clear" aria-hidden="true" /> Honest, left alone: <b>{c.clear}</b></li>
        </ul>

        <p className="ws-say" aria-live="polite">
          {c.chance === null
            ? 'Nobody was flagged, so there is no chance to work out.'
            : <>The detector flags {c.caught} + {c.falseAlarms} = <b>{c.flagged}</b> players, but only {c.caught} of them cheat. So a flagged player is a cheat about <b>{c.caught} out of {c.flagged}</b>, which is about <b>{pct(c.chance)}</b> of the time.</>}
          {' '}Counts are rounded to whole players.
        </p>
      </div>
    </Root>
  );
}
