import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  CLINICS,
  DEV_PREVALENCE,
  GROUPS,
  N,
  calibrationTable,
  confusion,
  pct,
  priorShift,
  scoreForRisk,
  type CalibrationRow,
  type Clinic,
  type Confusion,
} from '../../lib/clinical-validation';

/*
 * Validation lab. One invented screening model, two invented clinics, 10,000 patients each. Part 1
 * shows that sensitivity and specificity stay put while the predictive values move with prevalence.
 * Part 2 is a calibration table, with and without a correction for the new prevalence. Part 3 is a
 * subgroup table. The numbers are computed in lib/clinical-validation.ts (unit-tested); nothing here
 * describes a real device.
 */

const binLabel = (r: CalibrationRow) => `${Math.round(r.from * 100)} to ${Math.round(r.to * 100)}%`;
const SUB_METRICS: { label: string; get: (c: Confusion) => string }[] = [
  { label: 'Patients', get: (c) => count(c.n) },
  { label: 'Sensitivity', get: (c) => pct(c.sensitivity) },
  { label: 'Specificity', get: (c) => pct(c.specificity) },
  { label: 'PPV', get: (c) => pct(c.ppv) },
  { label: 'Missed cases', get: (c) => count(c.fn) },
];
const count = (x: number) => Math.round(x).toLocaleString('en-GB');

function ClinicCard({ clinic, c }: { clinic: Clinic; c: Confusion }) {
  const flagged = c.flagged;
  const tpShare = flagged > 0 ? (c.tp / flagged) * 100 : 0;
  return (
    <section className="wrc-card" aria-label={`${clinic.name}`}>
      <h4 className="wrc-cardh">
        Clinic {clinic.id}: {clinic.name}
      </h4>
      <p className="wrc-small">
        {Math.round(clinic.prevalence * 100)} in 100 patients have the condition{clinic.id === 'A' ? ' (the model was built here)' : ''}.
      </p>
      <dl className="wrc-counts">
        <div><dt>Caught</dt><dd>{count(c.tp)}</dd></div>
        <div><dt>Missed</dt><dd>{count(c.fn)}</dd></div>
        <div><dt>False alarms</dt><dd>{count(c.fp)}</dd></div>
        <div><dt>Cleared</dt><dd>{count(c.tn)}</dd></div>
      </dl>
      <p className="wrc-small">Per {N.toLocaleString('en-GB')} patients. Of the {count(flagged)} flagged:</p>
      <div className="wrc-flagbar" role="img" aria-label={`Of ${count(flagged)} flagged patients, ${count(c.tp)} have the condition and ${count(c.fp)} do not.`}>
        <span className="wrc-flag-true" style={{ width: `${tpShare.toFixed(1)}%` }} />
        <span className="wrc-flag-false" style={{ width: `${(100 - tpShare).toFixed(1)}%` }} />
      </div>
      <table className="wrc-metrics">
        <tbody>
          <tr>
            <th scope="row">Sensitivity</th>
            <td>{pct(c.sensitivity)}</td>
            <td className="wrc-same">same in both</td>
          </tr>
          <tr>
            <th scope="row">Specificity</th>
            <td>{pct(c.specificity)}</td>
            <td className="wrc-same">same in both</td>
          </tr>
          <tr className="wrc-moves">
            <th scope="row">PPV</th>
            <td>{pct(c.ppv)}</td>
            <td>of flagged, have it</td>
          </tr>
          <tr className="wrc-moves">
            <th scope="row">NPV</th>
            <td>{pct(c.npv, 1)}</td>
            <td>of cleared, are free of it</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function CalibrationTable({ title, rows }: { title: string; rows: CalibrationRow[] }) {
  return (
    <div className="wrc-scroll">
      <table className="wrc-table">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Model says</th>
            <th scope="col">Share of patients</th>
            <th scope="col">Avg. stated</th>
            <th scope="col">Actual</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const off = Math.abs(r.predicted - r.observed) > 0.05;
            return (
              <tr key={r.from} className={off ? 'wrc-off' : undefined}>
                <th scope="row">{binLabel(r)}</th>
                <td>{pct(r.share)}</td>
                <td>{pct(r.predicted)}</td>
                <td>
                  <b>{pct(r.observed)}</b>
                  <span className="wrc-mini" aria-hidden="true">
                    <i style={{ width: `${Math.min(100, r.observed * 100).toFixed(1)}%` }} />
                    <em style={{ left: `${Math.min(100, r.predicted * 100).toFixed(1)}%` }} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ClinicalValidationLab() {
  const [riskCut, setRiskCut] = useState(30);
  const [recal, setRecal] = useState(false);
  const [view, setView] = useState<'A' | 'B'>('B');

  const t = useMemo(() => scoreForRisk(riskCut / 100), [riskCut]);
  const results = useMemo(() => CLINICS.map((cl) => ({ cl, c: confusion(cl.prevalence, t) })), [t]);
  const shift = priorShift(DEV_PREVALENCE, CLINICS[1].prevalence);
  const calA = useMemo(() => calibrationTable(CLINICS[0].prevalence), []);
  const calB = useMemo(() => calibrationTable(CLINICS[1].prevalence, recal ? shift : 0), [recal, shift]);
  const a = results[0].c;
  const b = results[1].c;

  const viewClinic = CLINICS.find((c) => c.id === view) ?? CLINICS[1];
  const subRows = useMemo(
    () => [...GROUPS.map((g) => ({ name: g.name, short: g.name.replace('Scanner type ', 'Type '), c: confusion(viewClinic.prevalence, t, g) })), { name: 'All patients', short: 'All', c: confusion(viewClinic.prevalence, t) }],
    [viewClinic, t]
  );
  const [g1, g2] = subRows;

  return (
    <Root>
      <div className="viz wrc wrc-val">
        <p className="viz-title">Validation lab: one model, two clinics</p>
        <p className="wrc-note">
          Invented example. A screening model was built at a referral hospital (clinic A, 20 in 100 patients have the condition). It is then used, unchanged, at a community clinic (B, 2 in 100). Same model, same scanners, same kinds of patients.
        </p>

        <h4 className="wrc-h">1. Sensitivity and specificity stay put. PPV and NPV do not.</h4>
        <label className="field wrc-field">
          <span>
            Flag a patient when the model says the risk is at least <b>{riskCut}%</b>
          </span>
          <input type="range" min={5} max={90} step={1} value={riskCut} onChange={(e) => setRiskCut(+e.target.value)} aria-valuetext={`${riskCut} percent`} />
        </label>
        <div className="wrc-cards">
          {results.map(({ cl, c }) => (
            <ClinicCard key={cl.id} clinic={cl} c={c} />
          ))}
        </div>
        <p className="wrc-result" role="status" aria-live="polite">
          At this setting the model catches {pct(a.sensitivity)} of the people who have the condition at both clinics. Of 100 patients it flags, about <b>{Math.round(a.ppv * 100)}</b> have it at clinic A and about <b>{Math.round(b.ppv * 100)}</b> at clinic B. Same model, same rule: at B most alarms are false alarms, because there are far more healthy people to raise them on.
        </p>

        <h4 className="wrc-h">2. Calibration: does &ldquo;30%&rdquo; mean 30%?</h4>
        <p className="wrc-small">
          Patients are grouped by the risk the model states. A calibrated model has the last two columns close together. Rows where they differ by more than 5 points are marked.
        </p>
        <div className="wrc-pills">
          <button type="button" className="btn quiet" aria-pressed={recal} onClick={() => setRecal(!recal)}>
            {recal ? 'Recalibrated for clinic B (on)' : 'Recalibrate for clinic B (off)'}
          </button>
        </div>
        <div className="wrc-cals">
          <CalibrationTable title="Clinic A (where the model was built)" rows={calA} />
          <CalibrationTable title={recal ? 'Clinic B, after recalibration' : 'Clinic B, model unchanged'} rows={calB} />
        </div>
        <p className="wrc-result" role="status" aria-live="polite">
          {recal
            ? 'After shifting every stated risk to clinic B’s prevalence the risks match what happens there. Note what changed: the numbers the model reports, not who gets flagged. For a medical device, changing what a model reports is a change to the device, and whether it needs a new submission is a regulatory question this lab does not answer.'
            : `At clinic B the model states ${pct(calB[4].predicted)} on average for its highest bin, and ${pct(calB[4].observed)} of those patients have the condition. The ranking is still good; the probabilities are too high. The cause here is only the prevalence.`}
        </p>

        <h4 className="wrc-h">3. Subgroups: the overall number hides a gap</h4>
        <div className="wrc-pills" role="group" aria-label="Which clinic">
          {CLINICS.map((cl) => (
            <button key={cl.id} type="button" className="btn quiet" aria-pressed={view === cl.id} onClick={() => setView(cl.id)}>
              Clinic {cl.id}
            </button>
          ))}
        </div>
        <div className="wrc-scroll">
          <table className="wrc-table">
            <caption>Clinic {view}: per {N.toLocaleString('en-GB')} patients, same flag rule. Type = scanner type.</caption>
            <thead>
              <tr>
                <th scope="col">Clinic {view}</th>
                {subRows.map((r) => (
                  <th key={r.name} scope="col">{r.short}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUB_METRICS.map((m) => (
                <tr key={m.label}>
                  <th scope="row">{m.label}</th>
                  {subRows.map((r) => (
                    <td key={r.name}>{m.get(r.c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="wrc-result" role="status" aria-live="polite">
          The overall sensitivity of {pct(subRows[2].c.sensitivity)} is an average of {pct(g1.c.sensitivity)} on {GROUPS[0].name.toLowerCase()} and {pct(g2.c.sensitivity)} on {GROUPS[1].name.toLowerCase()}. In this made-up example the second group is 30% of patients but accounts for {Math.round((g2.c.fn / subRows[2].c.fn) * 100)}% of the missed cases at clinic {view}. A single headline figure would not show that.
        </p>
        <p className="viz-cap">
          How the numbers are made: patients without the condition score like a standard normal curve; patients with it score higher, by 2.4 on scanner type 1 and 1.6 on type 2. The stated risk is Bayes&rsquo; rule at clinic A&rsquo;s prevalence. Everything is invented for teaching.
        </p>
      </div>
    </Root>
  );
}
