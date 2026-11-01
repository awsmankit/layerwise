import { useMemo, useState } from 'react';
import { Root } from './shared';
import { STAGES, scoreScenario, shuffled, type StageScore } from '../../lib/ml-design';
import { SCENARIOS } from '../../lib/ml-design-data';

/*
 * Design-checklist walkthrough. Pick a scenario, then for each of seven design stages tick everything
 * a strong answer would include. "Show my scorecard" lists what you missed and which common mistakes
 * you ticked, with reasons. Content and scoring are in lib/ml-design-data.ts and lib/ml-design.ts.
 */

const VERDICT: Record<StageScore['verdict'], string> = { strong: 'Strong', gaps: 'Gaps', risky: 'Risky' };

export default function DesignChecklist() {
  const [sid, setSid] = useState(0);
  const [picks, setPicks] = useState<Record<string, Record<string, Set<string>>>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});

  const scn = SCENARIOS[sid];
  const mine = picks[scn.id] ?? {};
  const card = shown[scn.id] ? scoreScenario(scn, mine) : null;

  const ordered = useMemo(
    () => scn.stages.map((q, i) => ({ ...q, options: shuffled(q.options, sid * 100 + i * 7 + 3) })),
    [scn, sid],
  );

  const toggle = (stage: string, id: string) => {
    const cur = new Set(mine[stage] ?? []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    setPicks({ ...picks, [scn.id]: { ...mine, [stage]: cur } });
    setShown({ ...shown, [scn.id]: false });
  };

  const total = Object.values(mine).reduce((a, s) => a + s.size, 0);

  return (
    <Root>
      <div className="viz mo3-design">
        <p className="viz-title">Design checklist walkthrough</p>
        <p className="mo3-note">
          Choose a scenario. For each stage, tick everything a strong answer would include. Some options are reasonable extras and some are common mistakes. Nothing is marked until you ask for the scorecard.
        </p>

        <div className="mo3-row" role="group" aria-label="Scenario">
          {SCENARIOS.map((s, i) => (
            <button key={s.id} type="button" className="btn quiet" aria-pressed={sid === i} onClick={() => setSid(i)}>
              {s.name}
            </button>
          ))}
        </div>
        <p className="mo3-brief">{scn.brief}</p>

        <ol className="mo3-stages">
          {ordered.map((q, i) => {
            const res = card?.stages[i];
            return (
              <li key={q.stage} className="mo3-stage">
                <p className="mo3-stage-h">
                  <b>
                    {i + 1}. {STAGES[i].title}
                  </b>
                  {res && <span className={`mo3-verdict mo3-v-${res.verdict}`}>{VERDICT[res.verdict]}</span>}
                </p>
                <p className="mo3-small">{q.question}</p>
                <ul className="mo3-opts">
                  {q.options.map((opt) => {
                    const on = mine[q.stage]?.has(opt.id) ?? false;
                    const showKind = !!card;
                    return (
                      <li key={opt.id}>
                        <button
                          type="button"
                          className={`mo3-opt${on ? ' is-on' : ''}${showKind ? ` mo3-k-${opt.kind}` : ''}`}
                          aria-pressed={on}
                          onClick={() => toggle(q.stage, opt.id)}
                        >
                          <span className="mo3-box" aria-hidden="true">
                            {on ? '✓' : ''}
                          </span>
                          <span>{opt.text}</span>
                        </button>
                        {showKind && (on || opt.kind === 'core') && (
                          <p className={`mo3-why mo3-w-${opt.kind}`}>
                            <b>
                              {opt.kind === 'core'
                                ? on
                                  ? 'Included in a strong answer. '
                                  : 'Missed: a strong answer includes this. '
                                : opt.kind === 'trap'
                                  ? 'Common mistake. '
                                  : 'Reasonable extra. '}
                            </b>
                            {opt.why}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>

        <div className="mo3-actions">
          <button type="button" className="btn" onClick={() => setShown({ ...shown, [scn.id]: true })} disabled={total === 0}>
            Show my scorecard
          </button>
          <button
            type="button"
            className="btn quiet"
            onClick={() => {
              setPicks({ ...picks, [scn.id]: {} });
              setShown({ ...shown, [scn.id]: false });
            }}
          >
            Start this scenario again
          </button>
        </div>

        <div className="mo3-result" role="status" aria-live="polite">
          {card ? (
            <>
              <p>
                <b>
                  Score: {card.points} of {card.max} ({card.percent} percent).
                </b>{' '}
                One point for each core option you ticked, minus one for each mistake, per stage.
              </p>
              <p>
                {card.stages
                  .map((s, i) => `${STAGES[i].title}: ${VERDICT[s.verdict]}`)
                  .join('. ')}
                .
              </p>
              <p className="mo3-small">
                {card.percent === 100
                  ? 'Every core point covered with no mistakes. In a real interview, add numbers and say which trade-off you would revisit first.'
                  : 'Read the reasons next to the options. A gap is rarely a missing technique; it is usually a missing question, such as how labels arrive or what a wrong answer costs.'}
              </p>
            </>
          ) : (
            <p className="mo3-small">{total === 0 ? 'Tick at least one option to see a scorecard.' : `${total} ticked. Press "Show my scorecard" when ready.`}</p>
          )}
        </div>
      </div>
    </Root>
  );
}
