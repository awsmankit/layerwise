import { useState } from 'react';
import { Root } from './shared';
import { ACTIONS, INCIDENTS, POINTS, borderline, grade, recommended, scoreLines, score, type Action } from '../../lib/incident-triage';

/*
 * "Incident triage": six invented incident reports. The learner chooses a response for each, then
 * sees the example rubric's points. The rubric is written for this lesson. It is not a standard.
 */

export default function IncidentTriage() {
  const [chosen, setChosen] = useState<Partial<Record<string, Action>>>({});
  const g = grade(chosen);

  return (
    <Root>
      <div className="viz wra-inc">
        <p className="viz-title">Incident triage</p>
        <p className="wra-note">
          Six invented reports reach the AI risk owner. For each one, pick a response. Then compare it with an example scoring rubric: harm to people (none 0, minor {POINTS.harm.minor}, serious {POINTS.harm.serious}), many affected +{POINTS.many}, still happening +{POINTS.ongoing}, personal data or rights involved +{POINTS.personal}, cannot be undone +{POINTS.irreversible}. The rubric is made up for this lesson; it is not a standard, and a real decision needs people who know the context.
        </p>

        {INCIDENTS.map((inc) => {
          const pick = chosen[inc.id];
          const rec = recommended(inc.facts);
          return (
            <section key={inc.id} className="wra-incident" aria-label={inc.title}>
              <h4 className="wra-h">{inc.title}</h4>
              <p className="wra-report">{inc.report}</p>
              <div className="wra-opts" role="group" aria-label={`Response to: ${inc.title}`}>
                {ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="btn quiet"
                    aria-pressed={pick === a.id}
                    onClick={() => setChosen({ ...chosen, [inc.id]: a.id })}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              {pick && (
                <div className="wra-reveal" role="status" aria-live="polite">
                  <p>
                    <b>{pick === rec ? 'Matches the rubric.' : 'Differs from the rubric.'}</b> Score {score(inc.facts)}, which points to: {ACTIONS.find((a) => a.id === rec)!.label.toLowerCase()}.
                    {borderline(inc.facts) ? ' This one is close to a cut-off, so reasonable people could choose differently.' : ''}
                  </p>
                  <ul className="wra-lines">
                    {scoreLines(inc.facts).map((l) => (
                      <li key={l.label}>
                        <span>{l.label}</span>
                        <span>+{l.points}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}

        <div className="wra-result" role="status" aria-live="polite">
          <p>
            {g.answered === 0
              ? 'Choose a response for each report.'
              : `${g.answered} of ${g.total} answered. ${g.matched} matched the example rubric.`}
          </p>
        </div>
        <div className="wra-row wra-actions">
          <button type="button" className="btn quiet" onClick={() => setChosen({})} disabled={g.answered === 0}>
            Start again
          </button>
        </div>
      </div>
    </Root>
  );
}
