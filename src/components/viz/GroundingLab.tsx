import { useState } from 'react';
import { Root } from './shared';
import { QUESTION, SETUPS, claimKey, scoreSetup, type Marks, type Mark, type SetupId } from '../../lib/grounding';

/*
 * Grounding lab. One question, four setups, each with a CANNED, INVENTED model answer. The learner
 * marks each claim as supported or not by the passage the model was given (setup A had no passage,
 * so it is checked against the shop's real policy). Then each setup gets a faithfulness score.
 */

const pct = (v: number) => (Number.isFinite(v) ? `${Math.round(v * 100)}%` : 'not scored');

export default function GroundingLab() {
  const [active, setActive] = useState<SetupId>('none');
  const [marks, setMarks] = useState<Marks>({});
  const setup = SETUPS.find((s) => s.id === active)!;
  const score = scoreSetup(setup, marks);

  const mark = (i: number, m: Mark) => {
    const key = claimKey(setup.id, i);
    setMarks((cur) => ({ ...cur, [key]: cur[key] === m ? undefined : m }));
  };

  return (
    <Root>
      <div className="viz ev-lab">
        <p className="viz-title">Grounding lab: the same question, four setups</p>
        <p className="ev-illus">Illustrative only. The model answers below are written by hand for this lesson, not produced by a real model.</p>
        <p className="ev-question"><b>Question:</b> {QUESTION}</p>

        <div className="ev-setups" role="group" aria-label="Setups">
          {SETUPS.map((s) => {
            const sc = scoreSetup(s, marks);
            const done = sc.marked === sc.total;
            return (
              <button key={s.id} type="button" className={`ev-setup${s.id === active ? ' is-on' : ''}${done ? ' is-done' : ''}`} aria-pressed={s.id === active} onClick={() => setActive(s.id)}>
                <span>{s.name}</span>
                <small>{sc.marked} of {sc.total} marked</small>
              </button>
            );
          })}
        </div>

        <p className="ev-given"><b>What the model was given:</b> {setup.given}</p>
        <div className="ev-source">
          <p className="ev-source-label">{setup.context ? 'Passage the model was given' : 'No passage was given'} {setup.checkAgainst.kind === 'policy' ? '· you check against:' : '· you check against it:'}</p>
          <p className="ev-source-text">{setup.checkAgainst.kind === 'policy' ? `${setup.checkAgainst.label}: ${setup.checkAgainst.text}` : setup.checkAgainst.text}</p>
        </div>
        <blockquote className="ev-output"><span className="ev-who">Model answer (invented)</span>{setup.output}</blockquote>

        <ol className="ev-claims">
          {setup.claims.map((c, i) => {
            const m = marks[claimKey(setup.id, i)];
            return (
              <li key={i} className="ev-claim">
                <p className="ev-claim-text">{c.text}</p>
                <div className="ev-claim-btns" role="group" aria-label={`Mark claim ${i + 1}`}>
                  <button type="button" className={`ev-mark${m === 'supported' ? ' is-on' : ''}`} aria-pressed={m === 'supported'} onClick={() => mark(i, 'supported')}>Supported</button>
                  <button type="button" className={`ev-mark ev-no${m === 'unsupported' ? ' is-on' : ''}`} aria-pressed={m === 'unsupported'} onClick={() => mark(i, 'unsupported')}>Not supported</button>
                </div>
                {m && (
                  <p className="ev-why" aria-live="polite">
                    {(m === 'supported') === c.supported ? 'Matches the reference. ' : 'The reference marks it the other way. '}
                    {c.why}
                  </p>
                )}
              </li>
            );
          })}
        </ol>

        <p className="ev-say" aria-live="polite">
          {setup.checkAgainst.kind === 'policy' ? 'Share of claims that match the real policy' : 'Faithfulness'}: <b className="num">{pct(score.faithfulness)}</b> ({score.supportedByLearner} of {score.marked} marked claims supported
          {score.marked < score.total ? `, ${score.total - score.marked} still to mark` : ''}).
          {score.marked === score.total && (
            <> The reference score is {pct(score.reference)}; you matched it on {score.agree} of {score.total} claims.</>
          )}
        </p>

        <h4 className="ev-h">All four setups</h4>
        <ul className="ev-summary">
          {SETUPS.map((s) => {
            const sc = scoreSetup(s, marks);
            const shown = sc.marked === sc.total;
            return (
              <li key={s.id}>
                <div className="ev-sum-head"><b>{s.name}</b><span className="num">{shown ? pct(sc.faithfulness) : `${sc.marked} of ${sc.total} marked`}</span></div>
                <span className="ev-bar-track" aria-hidden="true"><span className="ev-bar-fill" style={{ width: shown ? `${sc.faithfulness * 100}%` : '0%' }} /></span>
                <p className="ev-sum-text">
                  {s.answered === 'declined' ? 'Declined to answer. ' : 'Answered. '}
                  {shown ? `${sc.trueInWorld} of ${sc.total} claims are true in the real policy. ` : ''}
                  {shown ? s.outcome : ''}
                </p>
              </li>
            );
          })}
        </ul>
        <p className="viz-cap">
          Faithfulness asks whether each claim is supported by the text the model was given. Factuality asks whether it is true in the world. They differ: in setup C one claim is true but unsupported (the model got lucky), and setup A can only be checked against the world. Real systems score this with a human or a judge model; see the lesson on judges for how far to trust that.
        </p>
      </div>
    </Root>
  );
}
