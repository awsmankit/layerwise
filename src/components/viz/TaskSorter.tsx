import { useMemo, useState } from 'react';
import { Root } from './shared';
import {
  JOBS,
  PRESETS,
  RATINGS,
  RATING_LABEL,
  jobById,
  round1,
  startingRatings,
  summarise,
  type Assumptions,
  type Rating,
  type Ratings,
} from '../../lib/task-exposure';

/*
 * Task-exposure sorter. Break an invented job into 10 tasks, sort each as AI does it / AI assists / keep human,
 * then change the assumptions and see how the hours move. Illustrative only; see lib/task-exposure.ts.
 */

const pct = (x: number) => `${Math.round(x * 100)}%`;
const h = (x: number) => `${round1(x)}`;

export default function TaskSorter() {
  const [jobId, setJobId] = useState(JOBS[0].id);
  const [ratings, setRatings] = useState<Ratings>({});
  const [a, setA] = useState<Assumptions>(PRESETS.middle.a);

  const job = jobById(jobId);
  const s = useMemo(() => summarise(job, ratings, a), [job, ratings, a]);
  const presetKey = (Object.keys(PRESETS) as (keyof typeof PRESETS)[]).find((k) => {
    const p = PRESETS[k].a;
    return p.saveAutomate === a.saveAutomate && p.saveAssist === a.saveAssist && p.checkShare === a.checkShare;
  });

  const pick = (id: string, r: Rating) => setRatings((cur) => ({ ...cur, [id]: r }));
  const switchJob = (id: string) => {
    setJobId(id);
    setRatings({});
  };

  const barParts: { key: string; label: string; hours: number; cls: string }[] = [
    { key: 'automate', label: RATING_LABEL.automate, hours: s.hours.automate, cls: 'w5b-b-auto' },
    { key: 'assist', label: RATING_LABEL.assist, hours: s.hours.assist, cls: 'w5b-b-assist' },
    { key: 'human', label: RATING_LABEL.human, hours: s.hours.human, cls: 'w5b-b-human' },
    { key: 'unrated', label: 'Not sorted yet', hours: s.hours.unrated, cls: 'w5b-b-none' },
  ];

  return (
    <Root>
      <div className="viz w5b-sorter">
        <p className="viz-title">Break a job into tasks</p>
        <p className="w5b-note">
          Illustrative only. The jobs, tasks, hours and percentages below are invented for teaching. They are not data about real workers and not forecasts.
        </p>

        <div className="w5b-group" role="group" aria-label="Choose a job">
          <span className="w5b-label">Job</span>
          <div className="w5b-row">
            {JOBS.map((j) => (
              <button key={j.id} type="button" className="btn quiet" aria-pressed={jobId === j.id} onClick={() => switchJob(j.id)}>
                {j.name}
              </button>
            ))}
          </div>
          <p className="w5b-small">{job.intro} The 10 tasks add up to {s.total} hours.</p>
        </div>

        <ol className="w5b-tasks">
          {job.tasks.map((t) => (
            <li key={t.id} className="w5b-task">
              <fieldset className="w5b-fs">
                <legend className="w5b-legend">
                  <span className="w5b-tname">{t.label}</span> <span className="w5b-hours">{t.hours} h</span>
                </legend>
                <div className="w5b-opts">
                  {RATINGS.map((r) => (
                    <label key={r} className={`w5b-opt w5b-o-${r}${ratings[t.id] === r ? ' w5b-on' : ''}`}>
                      <input type="radio" name={`${job.id}-${t.id}`} checked={ratings[t.id] === r} onChange={() => pick(t.id, r)} />
                      <span>{RATING_LABEL[r]}</span>
                    </label>
                  ))}
                </div>
                {ratings[t.id] && <p className="w5b-why">Why people differ: {t.note}</p>}
              </fieldset>
            </li>
          ))}
        </ol>

        <div className="w5b-actions">
          <button type="button" className="btn" onClick={() => setRatings(startingRatings(job))}>
            Fill in a starting view
          </button>
          <button type="button" className="btn quiet" onClick={() => setRatings({})}>
            Clear
          </button>
        </div>
        <p className="w5b-small">The starting view is one reasonable sorting, not the right answer. Change any task you disagree with.</p>

        <h4 className="w5b-h">Where the {s.total} hours go</h4>
        <div className="w5b-bar" role="img" aria-label={barParts.map((p) => `${p.label}: ${p.hours} hours`).join('; ')}>
          {barParts
            .filter((p) => p.hours > 0)
            .map((p) => (
              <span key={p.key} className={`w5b-seg ${p.cls}`} style={{ flexGrow: p.hours }}>
                {p.hours >= 4 ? `${p.hours} h` : ''}
              </span>
            ))}
        </div>
        <ul className="w5b-legend" aria-label="Key to the bar">
          {barParts.map((p) => (
            <li key={p.key}>
              <i className={`w5b-sw ${p.cls}`} /> {p.label}: {p.hours} h
            </li>
          ))}
        </ul>

        <h4 className="w5b-h">Change the assumptions</h4>
        <div className="w5b-row" role="group" aria-label="Sets of assumptions">
          {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
            <button key={k} type="button" className="btn quiet" aria-pressed={presetKey === k} onClick={() => setA(PRESETS[k].a)}>
              {PRESETS[k].label}
            </button>
          ))}
        </div>
        <div className="viz-controls w5b-sliders">
          <label className="field">
            <span>
              Time saved on tasks AI does: <b>{pct(a.saveAutomate)}</b>
            </span>
            <input type="range" min={0} max={100} step={5} value={Math.round(a.saveAutomate * 100)} onChange={(e) => setA({ ...a, saveAutomate: +e.target.value / 100 })} aria-valuetext={`${pct(a.saveAutomate)} saved`} />
          </label>
          <label className="field">
            <span>
              Time saved on tasks AI assists: <b>{pct(a.saveAssist)}</b>
            </span>
            <input type="range" min={0} max={100} step={5} value={Math.round(a.saveAssist * 100)} onChange={(e) => setA({ ...a, saveAssist: +e.target.value / 100 })} aria-valuetext={`${pct(a.saveAssist)} saved`} />
          </label>
          <label className="field">
            <span>
              Share of that saving spent checking AI's work: <b>{pct(a.checkShare)}</b>
            </span>
            <input type="range" min={0} max={80} step={5} value={Math.round(a.checkShare * 100)} onChange={(e) => setA({ ...a, checkShare: +e.target.value / 100 })} aria-valuetext={`${pct(a.checkShare)} spent checking`} />
          </label>
        </div>

        <div className="w5b-result" role="status" aria-live="polite">
          {s.rated === 0 ? (
            <p>Sort at least one task, or press "Fill in a starting view", to see the hours change.</p>
          ) : (
            <>
              <p>
                <b>
                  {s.rated} of {job.tasks.length} tasks sorted. About {h(s.remaining)} of the {s.total} hours would remain, so about {h(s.freed)} hours ({pct(s.freedShare)}) are freed.
                </b>{' '}
                Tasks you have not sorted count as unchanged.
              </p>
              <p className="w5b-small">
                Worked out as: AI-does-it hours × (1 − saving × (1 − checking share)) + AI-assists hours × (1 − saving) + keep-human hours.
              </p>
            </>
          )}
        </div>

        {s.rated > 0 && (
          <>
            <h4 className="w5b-h">What could happen to {h(s.freed)} freed hours?</h4>
            <ul className="w5b-cards">
              <li>
                <b>Fewer hours for the same work.</b> The same output would take {h(s.remaining)} hours instead of {s.total}. Whether that means fewer people or shorter weeks is a decision, not an arithmetic result.
              </li>
              <li>
                <b>The same hours, more work.</b> If there were more work to do, a {s.total}-hour week could hold about {pct(s.capacity - 1)} more of it. That needs more demand, such as more patients or clients.
              </li>
              <li>
                <b>Time moves to other tasks.</b> The hours could go to tasks that are squeezed today, or to new tasks nobody does yet. Nothing here can put a number on that.
              </li>
            </ul>
            <p className="w5b-small">
              Which of the three happens depends on demand, prices, rules, customers and what managers choose. The sorter cannot tell you. Notice also that the job does not disappear in any row: the tasks you kept human, and the checking, are still there.
            </p>
          </>
        )}
      </div>
    </Root>
  );
}
