import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { FAILURES, STAGES, judge, stageLabel, tally, type StageId, type Verdict } from '../../lib/lifecycle-map';

/*
 * "Where does it start?": seven ML-system failures, one at a time. The learner taps the lifecycle stage
 * where the failure comes from, then sees the cheapest control and where it would show up without one.
 * Static content; nothing is sent anywhere.
 */

const VERDICT_TEXT: Record<Verdict, string> = {
  correct: 'Right stage.',
  close: 'Defensible, but there is a better home for it.',
  wrong: 'Not quite.',
};

export default function LifecycleMap() {
  const [index, setIndex] = useState(0);
  const [placements, setPlacements] = useState<Record<string, StageId>>({});
  const f = FAILURES[index];
  const placed = placements[f.id];
  const verdict = placed ? judge(f.id, placed) : null;
  const t = tally(placements);
  const finished = t.placed === FAILURES.length;

  const choose = (stage: StageId) => {
    if (placed) return;
    setPlacements((p) => ({ ...p, [f.id]: stage }));
  };

  const go = (i: number) => setIndex(Math.max(0, Math.min(FAILURES.length - 1, i)));
  const reset = () => {
    setPlacements({});
    setIndex(0);
  };

  return (
    <Root>
      <div className="viz mo1-map">
        <p className="viz-title">Where does the failure start? Seven cases, one lifecycle</p>

        <ol className="mo1-dots" aria-label="Cases">
          {FAILURES.map((x, i) => {
            const v = placements[x.id] ? judge(x.id, placements[x.id]) : null;
            return (
              <li key={x.id}>
                <button
                  type="button"
                  className={`mo1-dot${v ? ' is-' + v : ''}`}
                  aria-current={i === index ? 'step' : undefined}
                  aria-label={`Case ${i + 1}: ${x.title}${v ? ', answered' : ''}`}
                  onClick={() => go(i)}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mo1-case">
          <h4 className="mo1-case-title">
            {index + 1}. {f.title}
          </h4>
          <p className="mo1-story">{f.story}</p>
          <p className="mo1-ask" id="mo1-ask">
            Which stage does this come from?
          </p>
        </div>

        <ol className="mo1-stages" aria-labelledby="mo1-ask">
          {STAGES.map((s, i) => {
            const isPick = placed === s.id;
            const isHome = !!placed && s.id === f.stage;
            const cls = ['mo1-stage'];
            if (isPick) cls.push('is-picked', 'is-' + (verdict ?? 'wrong'));
            if (isHome) cls.push('is-home');
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={cls.join(' ')}
                  onClick={() => choose(s.id)}
                  aria-pressed={isPick}
                  disabled={!!placed && !isPick && !isHome}
                >
                  <span className="mo1-stage-n" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="mo1-stage-label">{s.label}</span>
                  {isHome && (
                    <motion.span
                      className="mo1-pin"
                      initial={{ scale: 0.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: EASE }}
                    >
                      starts here
                    </motion.span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mo1-result" role="region" aria-live="polite" aria-label="Answer">
          {!placed && <p className="mo1-hint">Tap a stage. Each stage is explained when you answer.</p>}
          {placed && verdict && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              <p className={`mo1-verdict is-${verdict}`}>
                <b>{VERDICT_TEXT[verdict]}</b> {verdict === 'correct' ? '' : `You chose ${stageLabel(placed)}; the home stage is ${stageLabel(f.stage)}.`}
              </p>
              <p>
                <b>Why.</b> {f.why}
              </p>
              <p>
                <b>Cheapest control.</b> {f.control}
              </p>
              <p>
                <b>Without it, you find out at</b> <span className="mo1-tag">{stageLabel(f.noticedAt)}</span>. {f.noticedHow}
              </p>
            </motion.div>
          )}
        </div>

        <div className="mo1-nav">
          <button type="button" className="btn quiet" onClick={() => go(index - 1)} disabled={index === 0}>
            Previous
          </button>
          <button type="button" className="btn" onClick={() => go(index + 1)} disabled={index === FAILURES.length - 1}>
            Next case
          </button>
          <span className="mo1-score" aria-live="polite">
            {t.placed} of {FAILURES.length} answered: {t.correct} right, {t.close} close, {t.wrong} not quite
          </span>
        </div>

        {finished && (
          <div className="mo1-summary">
            <p className="viz-title">All seven</p>
            <table className="mo1-table mo1-sum">
              <thead>
                <tr>
                  <th>Failure</th>
                  <th>Starts at</th>
                  <th>Cheapest control</th>
                </tr>
              </thead>
              <tbody>
                {FAILURES.map((x) => (
                  <tr key={x.id}>
                    <td>{x.title}</td>
                    <td>{stageLabel(x.stage)}</td>
                    <td>{x.control}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn quiet" onClick={reset}>
              Start again
            </button>
          </div>
        )}
        <p className="viz-cap">All scenarios are made up for this lesson. They are typical patterns, not reports of real incidents.</p>
      </div>
    </Root>
  );
}
