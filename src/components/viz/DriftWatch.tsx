import { useMemo, useState } from 'react';
import { Root, useNarrow } from './shared';
import {
  ACC_DROP,
  COST,
  DAYS,
  DECISIONS,
  LABEL_DELAYS,
  METHODS,
  REF_DAYS,
  SAMPLE_SIZES,
  SCENARIOS,
  THRESHOLDS,
  WINDOWS,
  accuracyAlertDay,
  accuracyBaseline,
  bestSettings,
  dailyAccuracy,
  fmtThreshold,
  harmDay,
  isAlert,
  plotThreshold,
  plotValue,
  runDetector,
  statSeries,
  visibleAccuracy,
  type Decision,
  type Method,
  type RunResult,
  type Settings,
} from '../../lib/drift-watch';

/*
 * Drift Watch. Four invented 120-day streams, one feature each, with a hidden event in three of them.
 * You set a drift detector (statistic, threshold, window, sample size) and see how fast it notices and
 * how often it cries wolf; a second chart shows why waiting for labels is slower. "Score all four"
 * runs one setting on every stream, asks what you would do after each alert, and compares you with
 * the best setting on the grid. The weights are invented. Logic in lib/drift-watch.ts.
 */

const METHOD_NAME: Record<Method, string> = { psi: 'PSI', ks: 'KS statistic', ksp: 'KS evidence (minus log10 of the p-value)' };

type Played = { settings: Settings; runs: RunResult[]; best: { settings: Settings; total: number } };

function describe(s: Settings): string {
  const m = METHODS.find((x) => x.id === s.method)?.label ?? s.method;
  return `${m}, alert ${s.method === 'ksp' ? fmtThreshold(s.method, s.threshold) : `at ${s.threshold} or more`}, ${s.window}-day window, ${s.n} values a day`;
}

export default function DriftWatch() {
  const narrow = useNarrow();
  const [sid, setSid] = useState(0);
  const [method, setMethod] = useState<Method>('psi');
  const [ti, setTi] = useState<Record<Method, number>>({ psi: 3, ks: 4, ksp: 1 });
  const [win, setWin] = useState<number>(7);
  const [n, setN] = useState<number>(200);
  const [delay, setDelay] = useState<number>(14);
  const [revealed, setRevealed] = useState(false);
  const [played, setPlayed] = useState<Played | null>(null);
  const [busy, setBusy] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, Decision | undefined>>({});

  const scn = SCENARIOS[sid];
  const threshold = THRESHOLDS[method][ti[method]];
  const settings = useMemo<Settings>(() => ({ method, threshold, window: win, n }), [method, threshold, win, n]);

  const series = useMemo(() => statSeries(scn, n, win), [scn, n, win]);
  const run = useMemo(() => runDetector(scn, settings), [scn, settings]);
  const acc = useMemo(() => dailyAccuracy(scn), [scn]);
  const vis = useMemo(() => visibleAccuracy(acc, delay), [acc, delay]);
  const accBase = useMemo(() => accuracyBaseline(acc), [acc]);
  const accAlert = useMemo(() => accuracyAlertDay(acc, delay), [acc, delay]);
  const harm = harmDay(scn);
  const alertDays = new Set(series.filter((s) => isAlert(s, settings)).map((s) => s.day));

  /* ---------- chart geometry ---------- */
  const W = narrow ? 340 : 640;
  const H1 = narrow ? 190 : 200;
  const padL = narrow ? 34 : 40;
  const padR = 8;
  const padT = 10;
  const padB = 26;
  const plotW = W - padL - padR;
  /* Coordinates are rounded: the server and the browser can differ in the last digits of a float, which would break hydration. */
  const q = (v: number) => Math.round(v * 10) / 10;
  const xOf = (d: number) => q(padL + (d / (DAYS - 1)) * plotW);

  const thrLine = plotThreshold(method, threshold);
  const vals = series.map((s) => plotValue(s, method));
  const cap = Math.max(thrLine * 2.2, 0.05);
  const yTop = Math.min(cap, Math.max(thrLine * 1.3, ...vals, 0.05));
  const plotH1 = H1 - padT - padB;
  const y1 = (v: number) => q(padT + plotH1 - (Math.min(v, yTop) / yTop) * plotH1);
  const path1 = series.map((s, i) => `${i === 0 ? 'M' : 'L'}${xOf(s.day)} ${y1(plotValue(s, method))}`).join(' ');
  const xTicks = [0, 30, 60, 90, 119];
  const fmtY = (v: number) => (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2));

  const H2 = narrow ? 170 : 180;
  const plotH2 = H2 - padT - padB;
  const aLo = 0.5;
  const aHi = 1;
  const y2 = (v: number) => q(padT + plotH2 - ((Math.min(aHi, Math.max(aLo, v)) - aLo) / (aHi - aLo)) * plotH2);
  const daily = acc.map((v, d) => `${d === 0 ? 'M' : 'L'}${xOf(d)} ${y2(v)}`).join(' ');
  const visPath = vis
    .map((v, d) => (v === null ? null : `${d === 0 || vis[d - 1] === null ? 'M' : 'L'}${xOf(d)} ${y2(v)}`))
    .filter(Boolean)
    .join(' ');

  const firstAlert = run.alertDays[0] ?? null;

  /* ---------- play ---------- */
  const scoreAll = () => {
    setBusy(true);
    setDecisions({});
    setTimeout(() => {
      const runs = SCENARIOS.map((s) => runDetector(s, settings));
      setPlayed({ settings: { ...settings }, runs, best: bestSettings(n) });
      setBusy(false);
    }, 30);
  };

  const needing = played ? played.runs.filter((r) => r.needsDecision) : [];
  const allDecided = played ? needing.every((r) => decisions[r.scenario]) : false;
  const wrong = played ? needing.filter((r) => decisions[r.scenario] && decisions[r.scenario] !== SCENARIOS.find((s) => s.id === r.scenario)?.correct).length : 0;
  const detectCost = played ? played.runs.reduce((a, r) => a + r.cost, 0) : 0;
  const total = detectCost + wrong * COST.wrongDecision;

  const summary = `Stream ${sid + 1}. ${describe(settings)}. ${run.alertDays.length} alert ${run.alertDays.length === 1 ? 'day' : 'days'}${firstAlert !== null ? `, first on day ${firstAlert}` : ''}.`;

  return (
    <Root>
      <div className="viz mo3-watch">
        <p className="viz-title">Drift Watch</p>
        <p className="mo3-note">
          Four invented streams of one sensor feature, 120 days each. The first 30 days are the reference (what the model was trained on). Some streams hide a change; one hides nothing at all. Tune a detector and find out which.
        </p>

        <h4 className="mo3-h">1. Pick a stream</h4>
        <div className="mo3-row" role="group" aria-label="Stream">
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="btn quiet"
              aria-pressed={sid === i}
              onClick={() => {
                setSid(i);
                setRevealed(false);
              }}
            >
              Stream {i + 1}
              {revealed && sid === i ? `: ${s.name}` : ''}
            </button>
          ))}
        </div>

        <h4 className="mo3-h">2. Set the detector</h4>
        <div className="mo3-row" role="group" aria-label="Statistic">
          <span>Statistic</span>
          {METHODS.map((m) => (
            <button key={m.id} type="button" className="btn quiet" aria-pressed={method === m.id} onClick={() => setMethod(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <p className="mo3-small">{METHODS.find((m) => m.id === method)?.hint}</p>
        <label className="field mo3-field">
          <span>
            Alert when {method === 'ksp' ? 'p-value is below' : 'the value reaches'} <b>{method === 'ksp' ? fmtThreshold(method, threshold).replace('p < ', '') : threshold}</b>
          </span>
          <input
            type="range"
            min={0}
            max={THRESHOLDS[method].length - 1}
            step={1}
            value={ti[method]}
            onChange={(e) => setTi({ ...ti, [method]: +e.target.value })}
            aria-valuetext={method === 'ksp' ? fmtThreshold(method, threshold) : `${threshold}`}
          />
        </label>
        <div className="mo3-row" role="group" aria-label="Window in days">
          <span>Window</span>
          {WINDOWS.map((w) => (
            <button key={w} type="button" className="btn quiet" aria-pressed={win === w} onClick={() => setWin(w)}>
              {w} {w === 1 ? 'day' : 'days'}
            </button>
          ))}
        </div>
        <div className="mo3-row" role="group" aria-label="Values per day">
          <span>Values per day</span>
          {SAMPLE_SIZES.map((s) => (
            <button key={s} type="button" className="btn quiet" aria-pressed={n === s} onClick={() => setN(s)}>
              {s}
            </button>
          ))}
        </div>

        <h4 className="mo3-h">3. Watch the statistic</h4>
        <p className="mo3-small">
          {METHOD_NAME[method]}, comparing the last {win} {win === 1 ? 'day' : 'days'} of values with the 30-day reference. Red marks are alert days.
        </p>
        <svg
          viewBox={`0 0 ${W} ${H1}`}
          className="mo3-svg"
          role="img"
          aria-label={`Line chart of the drift statistic over 120 days with the alert threshold. ${summary}`}
        >
          <rect x={xOf(0)} y={padT} width={xOf(REF_DAYS - 1) - xOf(0)} height={plotH1} className="mo3-refband" />
          <text x={xOf(0) + 4} y={padT + 13} className="mo3-tick">
            reference
          </text>
          <path d={`M${padL} ${padT + plotH1} H${W - padR}`} className="mo3-axis" />
          <path d={`M${padL} ${padT} V${padT + plotH1}`} className="mo3-axis" />
          <path d={`M${padL} ${y1(thrLine)} H${W - padR}`} className="mo3-thr" />
          <text x={xOf(REF_DAYS) + 4} y={y1(thrLine) - 4} className="mo3-tick">
            alert line
          </text>
          {revealed && scn.eventDay !== null && (
            <g>
              <path d={`M${xOf(scn.eventDay)} ${padT} V${padT + plotH1}`} className="mo3-event" />
              <text x={xOf(scn.eventDay) + 3} y={padT + plotH1 - 6} className="mo3-tick mo3-event-t">
                change starts
              </text>
            </g>
          )}
          {revealed && harm !== null && <path d={`M${xOf(harm)} ${padT} V${padT + plotH1}`} className="mo3-harm" />}
          <path d={path1} className="mo3-line" />
          {series.map((s) => (alertDays.has(s.day) ? <circle key={s.day} cx={xOf(s.day)} cy={y1(plotValue(s, method))} r={narrow ? 2.6 : 2.8} className="mo3-alert" /> : null))}
          {[0, yTop / 2, yTop].map((v, i) => (
            <text key={i} x={padL - 4} y={y1(v) + 4} textAnchor="end" className="mo3-tick">
              {fmtY(v)}
            </text>
          ))}
          {xTicks.map((d) => (
            <text key={d} x={xOf(d)} y={H1 - 8} textAnchor="middle" className="mo3-tick">
              {d}
            </text>
          ))}
        </svg>
        <p className="mo3-small">Day number along the bottom. Values above the top of the chart are drawn at the top.</p>

        <div className="mo3-actions">
          <button type="button" className="btn" aria-pressed={revealed} onClick={() => setRevealed(!revealed)}>
            {revealed ? 'Hide what really happened' : 'Reveal what really happened'}
          </button>
        </div>
        <div className="mo3-result" role="status" aria-live="polite">
          <p>
            <b>
              {run.alertDays.length} alert {run.alertDays.length === 1 ? 'day' : 'days'}
            </b>
            {firstAlert !== null ? `, the first on day ${firstAlert}.` : '. The detector never fired.'}
          </p>
          {revealed ? (
            <>
              <p>
                <b>{scn.name}.</b> {scn.story}
              </p>
              <p>
                {scn.signalDay === null
                  ? `Nothing is wrong, so all ${run.falseAlarmDays} alert ${run.falseAlarmDays === 1 ? 'day was a false alarm' : 'days were false alarms'}.`
                  : `${run.falseAlarmDays} false alarm ${run.falseAlarmDays === 1 ? 'day' : 'days'} before the change. ${
                      run.detectedOn === null
                        ? `It never noticed the change, so the model stayed harmed for ${run.harmedDays} days.`
                        : `It noticed on day ${run.detectedOn}${harm !== null ? `; the model was losing accuracy from day ${harm}, so ${run.harmedDays} harmed ${run.harmedDays === 1 ? 'day' : 'days'} went unflagged` : ''}.`
                    }`}{' '}
                Cost: {run.cost} points.
              </p>
            </>
          ) : (
            <p className="mo3-small">Not sure what the alerts mean? Reveal what really happened to see the true change, and the cost of your settings.</p>
          )}
        </div>

        <h4 className="mo3-h">4. Why not just watch accuracy?</h4>
        <p className="mo3-note">
          Accuracy needs the right answers, and those arrive late: a fraud dispute, a delivery, a repair. Choose how many days late the labels come. The thick line is all that an accuracy monitor can see; the thin line is the truth, which you only learn later.
        </p>
        <div className="mo3-row" role="group" aria-label="Label delay in days">
          <span>Labels arrive</span>
          {LABEL_DELAYS.map((d) => (
            <button key={d} type="button" className="btn quiet" aria-pressed={delay === d} onClick={() => setDelay(d)}>
              {d === 0 ? 'at once' : `${d} days late`}
            </button>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H2}`}
          className="mo3-svg"
          role="img"
          aria-label={`Line chart of model accuracy over 120 days. Labels are ${delay} days late. ${accAlert === null ? 'The accuracy monitor never fires on this stream.' : `The accuracy monitor first fires on day ${accAlert}.`}`}
        >
          <path d={`M${padL} ${padT + plotH2} H${W - padR}`} className="mo3-axis" />
          <path d={`M${padL} ${padT} V${padT + plotH2}`} className="mo3-axis" />
          <path d={`M${padL} ${y2(accBase - ACC_DROP)} H${W - padR}`} className="mo3-thr" />
          <text x={xOf(REF_DAYS) + 4} y={y2(accBase - ACC_DROP) + 14} className="mo3-tick">
            alert line
          </text>
          <path d={daily} className="mo3-thin" />
          <path d={visPath} className="mo3-line" />
          {accAlert !== null && <circle cx={xOf(accAlert)} cy={y2(vis[accAlert] ?? accBase)} r={4} className="mo3-alert" />}
          {[0.5, 0.75, 1].map((v) => (
            <text key={v} x={padL - 4} y={y2(v) + 4} textAnchor="end" className="mo3-tick">
              {v.toFixed(2)}
            </text>
          ))}
          {xTicks.map((d) => (
            <text key={d} x={xOf(d)} y={H2 - 8} textAnchor="middle" className="mo3-tick">
              {d}
            </text>
          ))}
        </svg>
        <p className="mo3-result" role="status" aria-live="polite">
          {accAlert === null
            ? 'The accuracy monitor never fires on this stream.'
            : `The accuracy monitor (a 7-day average dropping ${ACC_DROP * 100} points below normal) first fires on day ${accAlert}.`}{' '}
          {firstAlert !== null && accAlert !== null
            ? firstAlert < accAlert
              ? `Your input monitor fired ${accAlert - firstAlert} days earlier.`
              : firstAlert > accAlert
                ? `Your input monitor was ${firstAlert - accAlert} days later than it.`
                : 'Both fired on the same day.'
            : ''}
        </p>
        <p className="viz-cap">
          Invented numbers: 200 labelled outcomes a day, a model that normally gets 92 percent right, and a made-up link between how far the feature moves and how much accuracy is lost. Stream 3 never harms the model, so accuracy stays flat.
        </p>

        <h4 className="mo3-h">5. Score yourself</h4>
        <p className="mo3-note">
          One detector setting has to cope with all four streams, as it would in real life. Run it, then decide what to do after each alert. Points are invented weights: {COST.falseAlarmDay} per false alarm day, {COST.harmDay} per day the model is harmed before an alert, and {COST.wrongDecision} for the wrong response. Lower is better.
        </p>
        <div className="mo3-actions">
          <button type="button" className="btn" onClick={scoreAll} disabled={busy}>
            {busy ? 'Working it out...' : 'Score all four streams'}
          </button>
        </div>

        {played && (
          <div className="mo3-played">
            <p className="mo3-small">
              Your settings: {describe(played.settings)}.
            </p>
            <ul className="mo3-streams">
              {SCENARIOS.map((s, i) => {
                const r = played.runs[i];
                const chosen = decisions[s.id];
                return (
                  <li key={s.id} className="mo3-stream">
                    <p className="mo3-stream-h">
                      <b>
                        Stream {i + 1}: {s.name}
                      </b>
                      <span className="num">{r.cost} points</span>
                    </p>
                    <p className="mo3-small">{s.story}</p>
                    <p className="mo3-small">
                      {r.falseAlarmDays} false alarm {r.falseAlarmDays === 1 ? 'day' : 'days'}.{' '}
                      {s.signalDay === null
                        ? r.alertDays.length === 0
                          ? 'It stayed quiet, which is right.'
                          : 'It fired although nothing was wrong.'
                        : r.detectedOn === null
                          ? `It never noticed: ${r.harmedDays} harmed days.`
                          : `It noticed on day ${r.detectedOn}: ${r.harmedDays} harmed ${r.harmedDays === 1 ? 'day' : 'days'} before the alert.`}
                    </p>
                    {r.needsDecision && (
                      <div className="mo3-decide">
                        <p className="mo3-small">
                          <b>An alert fired. You look upstream and find:</b> {s.finding}
                        </p>
                        <div className="mo3-row" role="group" aria-label={`What do you do in stream ${i + 1}?`}>
                          {DECISIONS.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              className="btn quiet"
                              aria-pressed={chosen === d.id}
                              onClick={() => setDecisions({ ...decisions, [s.id]: d.id })}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                        {chosen && (
                          <p className={`mo3-small ${chosen === s.correct ? 'mo3-right' : 'mo3-wrong'}`}>
                            {chosen === s.correct ? 'Right. ' : `Not quite (${COST.wrongDecision} points). `}
                            {s.why}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mo3-result" role="status" aria-live="polite">
              {allDecided ? (
                <>
                  <p>
                    <b>Your total: {total} points</b> ({detectCost} from detection, {wrong * COST.wrongDecision} from wrong responses).
                  </p>
                  <p>
                    Best single setting on this grid at {n} values a day: <b>{played.best.total} points</b>, using {describe(played.best.settings)}. {total <= played.best.total ? 'You matched or beat the grid.' : total - played.best.total <= 6 ? 'Very close.' : 'Try again with a different window or threshold.'}
                  </p>
                </>
              ) : (
                <p>Choose a response for each alert to see your total.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Root>
  );
}
