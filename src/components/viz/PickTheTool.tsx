import { useEffect, useRef, useState } from 'react';
import { Root } from './shared';
import { RUNGS, SCENARIOS, judge, rungInfo, tally, type Rung } from '../../lib/tool-choice';

const STAKES = { low: 'Low stakes', medium: 'Medium stakes', high: 'High stakes' } as const;
const VERDICT = {
  best: 'Right: the simplest thing that works',
  ok: 'Also works',
  'too-simple': 'Too simple: it will fail',
  'too-much': 'Too much: it costs more than it earns',
} as const;

/** A short game: ten scenarios, pick the simplest approach that does the job, read why. */
export default function PickTheTool() {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Rung>>({});
  const next = useRef<HTMLButtonElement>(null);
  const done = idx >= SCENARIOS.length;
  const s = SCENARIOS[Math.min(idx, SCENARIOS.length - 1)];
  const chosen = answers[s.id];
  const j = chosen ? judge(s, chosen) : null;

  useEffect(() => {
    if (chosen) next.current?.focus({ preventScroll: true });
  }, [chosen]);

  const pick = (r: Rung) => {
    if (!chosen) setAnswers({ ...answers, [s.id]: r });
  };
  const restart = () => {
    setAnswers({});
    setIdx(0);
  };

  if (done) {
    const t = tally(answers);
    return (
      <Root>
        <div className="viz pr-game">
          <p className="viz-title">Pick the Tool: your result</p>
          <div className="pr-score" role="status">
            <p className="pr-big"><b>{t.right}</b> of {SCENARIOS.length} met the bar</p>
            <p className="pr-small">Complexity points you chose: <b>{t.chosenPoints}</b>. The simplest set that works: <b>{t.bestPoints}</b>. {t.chosenPoints > t.bestPoints ? `You spent ${t.chosenPoints - t.bestPoints} points more than you needed to.` : t.chosenPoints === t.bestPoints ? 'Your choices matched the simplest set.' : 'You chose simpler than the best set, which means some picks would not hold up.'}</p>
          </div>
          <ul className="pr-review">
            {SCENARIOS.map((sc) => {
              const c = answers[sc.id];
              const jj = judge(sc, c);
              return (
                <li key={sc.id} className={jj.right ? 'pr-r-ok' : 'pr-r-bad'}>
                  <span className="pr-r-mark" aria-hidden="true">{jj.right ? '+' : 'x'}</span>
                  <span><b>{sc.title}.</b> You chose {rungInfo(c).label.toLowerCase()}; {jj.right ? (jj.verdict === 'best' ? 'that is the best fit.' : 'that also works.') : `the best fit is ${rungInfo(sc.best).label.toLowerCase()}.`}</span>
                </li>
              );
            })}
          </ul>
          <div className="pr-actions">
            <button type="button" className="btn" onClick={restart}>Play again</button>
          </div>
          <p className="viz-cap">Complexity points are an example scale from 0 (a person) to 8 (an agent). All scenarios and numbers are invented for teaching.</p>
        </div>
      </Root>
    );
  }

  return (
    <Root>
      <div className="viz pr-game">
        <p className="viz-title">Pick the Tool: the simplest thing that works</p>
        <p className="pr-progress" aria-hidden="true">Scenario {idx + 1} of {SCENARIOS.length}</p>
        <div className="pr-scn">
          <h3 className="pr-scn-title">{s.title}</h3>
          <p>{s.job}</p>
          <p className="pr-small">{s.facts}</p>
          <p className="pr-small"><span className={`pr-stakes pr-stakes-${s.stakes}`}>{STAKES[s.stakes]}</span> {s.ifWrong}</p>
        </div>
        <div className="pr-opts" role="group" aria-label={`Choose an approach for: ${s.title}`}>
          {RUNGS.map((r, i) => {
            const picked = chosen === r.id;
            const isBest = !!chosen && r.id === s.best;
            return (
              <button
                key={r.id}
                type="button"
                className={'pr-opt' + (picked ? ' pr-picked' : '') + (isBest ? ' pr-best' : '')}
                aria-pressed={picked}
                disabled={!!chosen && !picked && !isBest}
                onClick={() => pick(r.id)}
              >
                <span className="pr-rung-n" aria-hidden="true">{i + 1}</span>
                <span className="pr-rung-main">
                  <span className="pr-rung-name">{r.label}</span>
                  <span className="pr-rung-gist">{r.gist}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="pr-fb" aria-live="polite" role="status">
          {j && chosen && (
            <>
              <p className={`pr-verdict pr-v-${j.verdict}`}>{VERDICT[j.verdict]}</p>
              <p>{j.message}</p>
              <p className="pr-small"><b>Safeguard.</b> {s.safeguard}</p>
              <div className="pr-actions">
                <button type="button" className="btn" ref={next} onClick={() => setIdx(idx + 1)}>
                  {idx + 1 < SCENARIOS.length ? 'Next scenario' : 'See my result'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Root>
  );
}
