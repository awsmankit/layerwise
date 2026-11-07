import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { FALSE_ALARM_SECONDS, TURNS, falseAlarmSeconds, run, type Cell, type Strictness } from '../../lib/whatif/no-guardrails';

const GREEN = '#1f9d6b';
const RED = '#d6453d';
const AMBER = '#c77d0a';
const GREY = 'rgba(127,127,127,0.5)';
const N = TURNS.length;

const COLOR: Record<Cell, string> = { clear: 'rgba(127,127,127,0.08)', caught: 'rgba(31,157,107,0.28)', missed: 'rgba(214,69,61,0.3)', false: 'rgba(199,125,10,0.3)' };
const EDGE: Record<Cell, string> = { clear: GREY, caught: GREEN, missed: RED, false: AMBER };
const MARK: Record<Cell, string> = { clear: '', caught: '✓', missed: '!', false: '?' };
const WORD: Record<Cell, string> = { clear: 'clean', caught: 'caught', missed: 'passed', false: 'false alarm' };

const X0 = 34;
const CW = 24;
const CG = 2;

/**
 * A toy assistant handles 13 scripted exchanges. Two simple rule-based checks sit on either side of the model.
 * Pick an exchange to see what each check did; the table counts the whole script.
 */
export default function NoGuardrailsWhatIf() {
  const [guard, setGuard] = useState(true);
  const [strict, setStrict] = useState<Strictness>('loose');
  const [sel, setSel] = useState(2);
  const [playing, setPlaying] = useState(false);

  const r = useMemo(() => run(guard, strict), [guard, strict]);
  const t = TURNS[sel];
  const secs = falseAlarmSeconds(r);
  const missedAll = r.input.missed + r.output.missed;
  const problems = r.input.problems + r.output.problems;
  const caughtAll = r.input.caught + r.output.caught;

  useEffect(() => {
    if (!playing) return;
    if (sel >= N - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setSel((s) => s + 1), 450);
    return () => clearTimeout(id);
  }, [playing, sel]);

  const play = () => {
    setSel(0);
    setPlaying(true);
  };

  const verdict = guard ? (
    <>
      With simple input and output checks, {caughtAll} of {problems} problems are caught and {missedAll} still get through. They also raise {r.input.falseAlarms + r.output.falseAlarms} false alarms, about {secs} s of wasted customer time (example: {FALSE_ALARM_SECONDS} s each). Checks lower the risk; they do not remove it.
    </>
  ) : (
    <>
      With no checks, all {r.input.missed} messages containing personal data reach the model and the logs, and all {r.output.missed} policy-breaking replies reach customers. Nothing is blocked, so there are no false alarms either (toy script, {N} exchanges).
    </>
  );

  const inCell = r.input.cells[sel];
  const outCell = r.output.cells[sel];
  const cx = (i: number) => X0 + i * (CW + CG);
  const dim = (i: number) => (playing && i > sel ? 0.2 : 1);
  const nodeX = (i: number) => 2 + i * 70;

  const check = (x: number, label: string, cell: Cell) => (
    <g>
      <rect x={x} y={8} width={56} height={52} rx={10} fill={guard ? 'rgba(31,157,107,0.12)' : 'none'} stroke={guard ? GREEN : 'currentColor'} strokeWidth={guard ? 2 : 1.3} strokeDasharray={guard ? undefined : '4 4'} opacity={guard ? 1 : 0.6} />
      <text x={x + 28} y={29} textAnchor="middle" className="wa-tb">{label}</text>
      <text x={x + 28} y={46} textAnchor="middle" className="wa-t2">{guard ? 'check' : 'none'}</text>
      <text x={x + 28} y={80} textAnchor="middle" className="wa-tb" style={{ fill: cell === 'clear' ? 'var(--ink-2)' : EDGE[cell] }}>
        {(MARK[cell] ? MARK[cell] + ' ' : '') + WORD[cell]}
      </text>
    </g>
  );

  return (
    <WhatIfFrame
      title="Where the checks sit, and what they do to 13 exchanges"
      withLabel="Input and output checks"
      withoutLabel="No guardrails"
      on={guard}
      onChange={setGuard}
      verdict={verdict}
      controls={
        <>
          <div className="wa-picker" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }} role="group" aria-label="How tight the check rules are">
            {(['loose', 'tight'] as const).map((s) => (
              <button key={s} type="button" className={`wa-pick${strict === s ? ' is-on' : ''}`} aria-pressed={strict === s} disabled={!guard} onClick={() => setStrict(s)}>
                <span>{s === 'loose' ? 'Loose rules' : 'Tight rules'}</span>
                <small>{s === 'loose' ? 'few patterns' : 'more patterns'}</small>
              </button>
            ))}
          </div>
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span>
              Look at exchange <b>{sel + 1} of {N}</b>
            </span>
            <input
              type="range"
              min={0}
              max={N - 1}
              value={sel}
              onChange={(e) => {
                setPlaying(false);
                setSel(+e.target.value);
              }}
              aria-label="Which exchange to look at"
            />
          </label>
          <div className="wa-btns" style={{ marginTop: 0, gridColumn: '1 / -1' }}>
            <button type="button" className="btn quiet" onClick={play}>
              {playing ? 'Playing…' : 'Play it'}
            </button>
          </div>
        </>
      }
    >
      <p className="wa-tag">Scripted toy assistant for a made-up shop. All names, numbers and addresses are invented. The checks are simple rules so you can see what rules do and do not catch.</p>
      <svg
        viewBox="0 0 340 92"
        className="dx-svg wi-svg wa-svg"
        role="img"
        aria-label={`The path of a message: customer, input check, model, output check, reply. ${guard ? 'Both checks are in place.' : 'There are no checks, so everything goes straight through.'}`}
      >
        <defs>
          <marker id="wa-g-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
          </marker>
        </defs>
        {[0, 2, 4].map((i) => (
          <g key={i}>
            <rect x={nodeX(i)} y={8} width={56} height={52} rx={10} fill="var(--surface)" stroke="currentColor" strokeWidth={1.5} />
            <text x={nodeX(i) + 28} y={29} textAnchor="middle" className="wa-tb">{i === 0 ? 'User' : i === 2 ? 'Model' : 'Reply'}</text>
            <text x={nodeX(i) + 28} y={46} textAnchor="middle" className="wa-t2">{i === 0 ? 'sends' : i === 2 ? 'writes' : 'shown'}</text>
          </g>
        ))}
        {check(nodeX(1), 'Input', inCell)}
        {check(nodeX(3), 'Output', outCell)}
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={nodeX(i) + 57} y1={34} x2={nodeX(i + 1) - 1} y2={34} stroke="currentColor" strokeWidth={1.8} markerEnd="url(#wa-g-arrow)" />
        ))}
      </svg>
      <div className="wa-turn" aria-live="polite">
        <p className="wa-turn-h">Exchange {t.n}: {t.note}</p>
        <p className="wa-bubble wa-you">
          <span className="wa-who">Customer wrote</span>
          <span>{t.input}</span>
        </p>
        <p className="wa-bubble wa-model">
          <span className="wa-who">Model replied</span>
          <span>{t.output}</span>
        </p>
      </div>
      <svg
        viewBox="0 0 372 104"
        className="dx-svg wi-svg wa-svg"
        role="img"
        aria-label={`Result of each check on each of the 13 exchanges. Input check: ${r.input.caught} caught, ${r.input.missed} missed, ${r.input.falseAlarms} false alarms. Output check: ${r.output.caught} caught, ${r.output.missed} missed, ${r.output.falseAlarms} false alarms.`}
      >
        {[
          { label: 'In', cells: r.input.cells, y: 6 },
          { label: 'Out', cells: r.output.cells, y: 40 },
        ].map((lane) => (
          <g key={lane.label}>
            <text x={0} y={lane.y + 18} className="wa-tb">{lane.label}</text>
            {lane.cells.map((c, i) => (
              <g key={i} opacity={dim(i)}>
                <motion.rect
                  x={cx(i)} y={lane.y} width={CW} height={26} rx={6}
                  stroke={EDGE[c]} strokeWidth={i === sel ? 3 : 1.4}
                  strokeDasharray={c === 'clear' ? '3 3' : undefined}
                  initial={false}
                  animate={{ fill: COLOR[c] }}
                  transition={{ duration: 0.4, ease: EASE }}
                />
                <text x={cx(i) + CW / 2} y={lane.y + 19} textAnchor="middle" className="wa-tb" style={{ fill: c === 'clear' ? 'var(--ink-2)' : EDGE[c] }}>{MARK[c]}</text>
              </g>
            ))}
          </g>
        ))}
        {TURNS.map((x, i) => (
          <text key={x.n} x={cx(i) + CW / 2} y={86} textAnchor="middle" className="wa-t2" style={{ fontWeight: i === sel ? 800 : 400, fill: i === sel ? 'var(--ink)' : undefined }}>
            {x.n}
          </text>
        ))}
        <text x={0} y={102} className="wa-t2" style={{ fontSize: 12 }}>exchange number</text>
      </svg>
      <ul className="wa-legend" aria-label="What the marks mean">
        <li><span className="wa-chip" style={{ borderColor: GREEN }}>✓</span> caught: the problem was stopped or masked</li>
        <li><span className="wa-chip" style={{ borderColor: RED }}>!</span> missed: the problem passed straight through</li>
        <li><span className="wa-chip" style={{ borderColor: AMBER }}>?</span> false alarm: a fine message was blocked or masked</li>
      </ul>
      <table className="wa-table wa-table-fixed">
        <caption>Whole script, {N} exchanges {guard ? `(${strict} rules)` : '(no checks)'}</caption>
        <thead>
          <tr>
            <th scope="col">Check</th>
            <th scope="col">Real</th>
            <th scope="col">Caught</th>
            <th scope="col">Missed</th>
            <th scope="col">False alarm</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Input: personal data</th>
            <td>{r.input.problems}</td>
            <td>{r.input.caught}</td>
            <td className={r.input.missed ? 'wa-bad' : ''}>{r.input.missed}</td>
            <td>{r.input.falseAlarms}</td>
          </tr>
          <tr>
            <th scope="row">Output: policy</th>
            <td>{r.output.problems}</td>
            <td>{r.output.caught}</td>
            <td className={r.output.missed ? 'wa-bad' : ''}>{r.output.missed}</td>
            <td>{r.output.falseAlarms}</td>
          </tr>
        </tbody>
      </table>
      <p className="wa-note">
        A false alarm costs a real person a retry: about {FALSE_ALARM_SECONDS} s each in this example, {secs} s in total here. A miss can cost far more, so teams tune the rules for the harm each mistake could cause, and add other defences behind the checks.
      </p>
      <details className="wa-numbers">
        <summary>Open the numbers</summary>
        <p className="wa-note" style={{ marginTop: 0 }}>
          The input check masks text that matches email, phone or long-number patterns before it goes to the model and into logs. The output check blocks replies that match an address pattern or the word "guarantee" (loose), and also "refund", "doctor" and "definitely" (tight). Tight rules catch the medical verdict and the email written out in words, and in return flag the correct reply that mentions a refund. Every count in the table is computed by running those patterns on the {N} scripted exchanges. Real systems add trained classifiers, allow-lists and human review; none of them is perfect either.
        </p>
      </details>
    </WhatIfFrame>
  );
}
