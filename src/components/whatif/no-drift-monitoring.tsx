import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { ALERT_SHIFT, COMPLAINT_ACCURACY, DAYS, GAP, PER_DAY, WINDOW, simulate, warningDays } from '../../lib/whatif/no-drift-monitoring';

const W = 340;
const L = 34; // room for the y axis labels
const R = W - 6;
const AY0 = 46; // accuracy plot top
const AY1 = 150; // accuracy plot bottom
const BY0 = 200; // monitor plot top
const BY1 = 268;
const ACC_MIN = 0.45;
const SHIFT_MAX = 1;

// coordinates are rounded so server and browser (which may differ in the last digit of exp/log/cos) print identical text
const q = (v: number) => Math.round(v * 10) / 10;
const xOf = (d: number) => q(L + (d / (DAYS - 1)) * (R - L));
const yAcc = (a: number) => q(AY1 - ((a - ACC_MIN) / (1 - ACC_MIN)) * (AY1 - AY0));
const yShift = (s: number) => q(BY1 - (Math.min(s, SHIFT_MAX) / SHIFT_MAX) * (BY1 - BY0));

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * A SIMULATION of a classifier on inputs that slowly shift. Top chart: the accuracy nobody can see in real life
 * (the simulation knows the true labels). Bottom chart: what a label-free monitor sees. The monitor fires well
 * before accuracy reaches the level where users complain.
 */
export default function NoDriftMonitoringWhatIf() {
  const [monitor, setMonitor] = useState(true);
  const [rate, setRate] = useState(0.03);
  const [day, setDay] = useState(DAYS - 1);
  const [playing, setPlaying] = useState(false);

  const sim = useMemo(() => simulate(rate), [rate]);
  const warn = warningDays(sim);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setDay((d) => {
        if (d >= DAYS - 1) {
          setPlaying(false);
          return DAYS - 1;
        }
        return Math.min(DAYS - 1, d + 2);
      });
    }, 45);
    return () => clearInterval(id);
  }, [playing]);

  const play = () => {
    setDay(0);
    setPlaying(true);
  };

  const accPath = sim.acc
    .slice(0, day + 1)
    .map((a, d) => `${d ? 'L' : 'M'}${xOf(d)} ${yAcc(a)}`)
    .join('');
  const shiftPath = sim.shift
    .slice(0, day + 1)
    .map((s, d) => `${d ? 'L' : 'M'}${xOf(d)} ${yShift(s)}`)
    .join('');

  const alertSeen = sim.alertDay !== null && day >= sim.alertDay;
  const complaintSeen = sim.complaintDay !== null && day >= sim.complaintDay;
  const anchorFor = (x: number) => (x > W - 120 ? 'end' : 'start');
  const gapShown = sim.alertDay !== null && sim.complaintDay !== null && day >= sim.alertDay;
  const gapEnd = sim.complaintDay !== null ? Math.min(day, sim.complaintDay) : day;

  const accAtAlert = sim.alertDay !== null ? sim.acc[sim.alertDay] : null;
  const accAtComplaint = sim.complaintDay !== null ? sim.acc[sim.complaintDay] : null;
  const launchAcc = sim.acc[WINDOW - 1];

  return (
    <WhatIfFrame
      title="A model on drifting data (simulation)"
      withLabel="With a monitor"
      withoutLabel="Nobody watching"
      on={monitor}
      onChange={setMonitor}
      verdict={
        monitor ? (
          sim.alertDay !== null && accAtAlert !== null ? (
            <>
              The monitor alerts on day {sim.alertDay + 1}, when accuracy is still {pct(accAtAlert)}.
              {warn !== null ? <> Users would not complain until day {sim.complaintDay! + 1}: {warn} days of warning to retrain or fix.</> : <> Accuracy stays above {pct(COMPLAINT_ACCURACY)} for the whole run.</>}
            </>
          ) : (
            <>No alert in {DAYS} days at this drift speed, and accuracy never falls under {pct(COMPLAINT_ACCURACY)}.</>
          )
        ) : sim.complaintDay !== null && accAtComplaint !== null ? (
          <>
            With nobody watching, the first sign is a complaint on day {sim.complaintDay + 1}. By then accuracy has quietly fallen from {pct(launchAcc)} to {pct(accAtComplaint)}.
          </>
        ) : (
          <>Accuracy never falls under {pct(COMPLAINT_ACCURACY)} in {DAYS} days at this drift speed, so nothing breaks loudly here. Raise the drift.</>
        )
      }
      controls={
        <>
          <label className="field">
            <span>
              Drift per day <b>{rate.toFixed(3)}</b>
            </span>
            <input type="range" min={0.02} max={0.08} step={0.005} value={rate} onChange={(e) => setRate(+e.target.value)} aria-label="How far the inputs drift each day" />
          </label>
          <label className="field">
            <span>
              Day <b>{day + 1} of {DAYS}</b>
            </span>
            <input type="range" min={0} max={DAYS - 1} value={day} onChange={(e) => { setPlaying(false); setDay(+e.target.value); }} aria-label="Which day to look at" />
          </label>
          <button type="button" className="btn quiet" onClick={play}>
            {playing ? 'Playing…' : 'Play it'}
          </button>
        </>
      }
    >
      <svg viewBox={`0 0 ${W} 312`} className="dx-svg wi-svg we-svg" role="img" aria-label={`Accuracy over ${DAYS} days of drifting data. It falls from ${pct(launchAcc)} to ${pct(sim.acc[DAYS - 1])}. ${sim.alertDay !== null ? `A monitor would alert on day ${sim.alertDay + 1}. ` : ''}${sim.complaintDay !== null ? `Users complain on day ${sim.complaintDay + 1}.` : ''}`}>
        <text x={0} y={12} className="we-t-b">Accuracy (simulation only)</text>
        <text x={W} y={12} textAnchor="end" className="we-t-b">day {day + 1}: {pct(sim.acc[day])}</text>
        {[0.5, 0.75, 1].map((a) => (
          <g key={a}>
            <line x1={L} x2={R} y1={yAcc(a)} y2={yAcc(a)} className="we-grid" />
            <text x={L - 4} y={yAcc(a) + 4} textAnchor="end" className="we-t">{Math.round(a * 100)}%</text>
          </g>
        ))}
        <line x1={L} x2={R} y1={yAcc(COMPLAINT_ACCURACY)} y2={yAcc(COMPLAINT_ACCURACY)} stroke="#d6453d" strokeWidth={1.3} strokeDasharray="5 4" />
        <text x={R} y={yAcc(COMPLAINT_ACCURACY) - 4} textAnchor="end" className="we-t-bad">users complain below {pct(COMPLAINT_ACCURACY)}</text>

        {gapShown && sim.alertDay !== null && (
          <motion.rect
            x={xOf(sim.alertDay)}
            y={AY0}
            height={AY1 - AY0}
            fill={monitor ? '#1f9d6b' : '#d6453d'}
            initial={false}
            animate={{ width: Math.max(0, xOf(gapEnd) - xOf(sim.alertDay)), opacity: 0.16 }}
            transition={{ duration: 0.35, ease: EASE }}
          />
        )}
        {/* the line: accuracy, 7-day average */}
        <path d={accPath} fill="none" stroke="var(--ink)" strokeWidth={2.4} strokeLinejoin="round" />
        <circle cx={xOf(day)} cy={yAcc(sim.acc[day])} r={4.5} fill="var(--ink)" stroke="var(--surface)" strokeWidth={1.5} />

        {monitor && sim.alertDay !== null && alertSeen && (
          <g>
            <line x1={xOf(sim.alertDay)} x2={xOf(sim.alertDay)} y1={AY0 - 6} y2={BY1} stroke="#1f9d6b" strokeWidth={2} />
            <text x={xOf(sim.alertDay) + (anchorFor(xOf(sim.alertDay)) === 'end' ? -4 : 4)} y={AY0 - 10} textAnchor={anchorFor(xOf(sim.alertDay))} className="we-t-good">alert: day {sim.alertDay + 1}</text>
          </g>
        )}
        {sim.complaintDay !== null && complaintSeen && (
          <g>
            <line x1={xOf(sim.complaintDay)} x2={xOf(sim.complaintDay)} y1={AY0 - 6} y2={AY1} stroke="#d6453d" strokeWidth={2} />
            <text x={xOf(sim.complaintDay) + (anchorFor(xOf(sim.complaintDay)) === 'end' ? -4 : 4)} y={AY1 + 17} textAnchor={anchorFor(xOf(sim.complaintDay))} className="we-t-bad">complaints: day {sim.complaintDay + 1}</text>
          </g>
        )}
        {/* the monitor's view */}
        <text x={0} y={BY0 - 12} className="we-t-b">{monitor ? 'What the monitor sees (no labels needed)' : 'No monitor: nothing is watching the inputs'}</text>
        {monitor ? (
          <g>
            <rect x={L} y={BY0} width={R - L} height={BY1 - BY0} fill="none" className="we-grid" />
            <line x1={L} x2={R} y1={yShift(ALERT_SHIFT)} y2={yShift(ALERT_SHIFT)} stroke="#1f9d6b" strokeWidth={1.3} strokeDasharray="5 4" />
            <text x={L - 4} y={yShift(ALERT_SHIFT) + 4} textAnchor="end" className="we-t">0.2</text>
            <text x={L - 4} y={BY1 + 4} textAnchor="end" className="we-t">0</text>
            <text x={R} y={yShift(ALERT_SHIFT) - 4} textAnchor="end" className="we-t-good">alert above 0.2</text>
            <path d={shiftPath} fill="none" stroke="#1f9d6b" strokeWidth={2.4} strokeLinejoin="round" />
            <circle cx={xOf(day)} cy={yShift(sim.shift[day])} r={4} fill="#1f9d6b" stroke="var(--surface)" strokeWidth={1.5} />
          </g>
        ) : (
          <g>
            <rect x={L} y={BY0} width={R - L} height={BY1 - BY0} rx={8} fill="none" stroke="var(--ink-2)" strokeWidth={1.3} strokeDasharray="5 4" />
            <text x={(L + R) / 2} y={(BY0 + BY1) / 2 + 4} textAnchor="middle" className="we-t">the inputs are moving, and no one is checking</text>
          </g>
        )}
        {[0, 30, 60, 90, 119].map((d) => (
          <g key={d}>
            <line x1={xOf(d)} x2={xOf(d)} y1={BY1} y2={BY1 + 4} className="we-axis" />
            <text x={xOf(d)} y={BY1 + 18} textAnchor={d === 119 ? 'end' : d === 0 ? 'start' : 'middle'} className="we-t">{d === 119 ? 'day 120' : d === 0 ? 'day 1' : d + 1}</text>
          </g>
        ))}
      </svg>
      <p className="we-note">
        {gapShown && sim.alertDay !== null && sim.complaintDay !== null ? (
          <>
            The shaded band is the gap between the first alert and the first complaint:{' '}
            <b>{monitor ? `${warn} days you can use` : `${warn} days the problem was there and nobody saw it`}</b>.{' '}
          </>
        ) : null}
        Simulation, not real data: {PER_DAY} labelled examples a day, one input feature, two classes {GAP.toFixed(1)} apart, a rule fixed on launch day. Accuracy and the monitor line are 7-day averages. The monitor alerts when the average input has moved {ALERT_SHIFT} launch-day standard deviations. The complaint line of {pct(COMPLAINT_ACCURACY)} is an assumption.
      </p>
    </WhatIfFrame>
  );
}
