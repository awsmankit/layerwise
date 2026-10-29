import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from '../viz/shared';
import { recordGame } from '../../lib/store';
import { allOutcomes, baselineOutcome, crunchScenarios, evaluate, levers, marginal, type LeverId } from '../../games/costcrunch';
import { GameDock, LessonLinks, LevelTabs, Meter, Stars, useRecords, useScrollIntoView } from './shared';

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export default function CostCrunchGame() {
  const records = useRecords();
  const [sid, setSid] = useState(crunchScenarios[0].id);
  const scenario = crunchScenarios.find((s) => s.id === sid)!;
  const [applied, setApplied] = useState<LeverId[]>([]);
  const [shown, setShown] = useState(false);

  const base = useMemo(() => baselineOutcome(scenario), [scenario]);
  const out = useMemo(() => evaluate(scenario, applied), [scenario, applied]);
  const best = useMemo(() => {
    if (!shown) return null;
    const threeStar = allOutcomes(scenario)
      .filter((a) => a.outcome.stars === 3)
      .sort((a, b) => a.applied.length - b.applied.length || a.outcome.monthly - b.outcome.monthly);
    return threeStar[0] ?? null;
  }, [shown, scenario]);

  const revealRef = useScrollIntoView<HTMLElement>(shown);
  const movesLeft = scenario.moves - applied.length;
  const savedPct = Math.round((1 - out.monthly / base.monthly) * 100);
  const targetPct = Math.round((1 - scenario.target / base.monthly) * 100);

  const toggle = (id: LeverId) => {
    const next = applied.includes(id)
      ? applied.filter((x) => x !== id)
      : applied.length < scenario.moves
        ? [...applied, id]
        : applied;
    setApplied(next);
    const o = evaluate(scenario, next);
    if (o.win) recordGame(`crunch:${sid}`, Math.round((o.stars * 100) / 3), o.stars);
  };

  const reset = (id: string) => {
    setSid(id);
    setApplied([]);
    setShown(false);
  };

  return (
    <Root>
      <div className="gm">
        <LevelTabs
          items={crunchScenarios.map((s) => ({ id: s.id, title: s.title, level: s.level }))}
          value={sid}
          onChange={reset}
          records={records}
          prefix="crunch"
        />

        <div className="gm-brief">
          <h2>{scenario.title}</h2>
          <p>{scenario.brief}</p>
          <ul className="gm-facts num">
            <li>{scenario.reqPerDay.toLocaleString('en-US')} requests a day on a {scenario.model.name} model</li>
            <li>starts at {usd(base.monthly)} a month</li>
            <li>target {usd(scenario.target)} (about {targetPct}% off)</li>
            <li>quality must stay at {scenario.qualityFloor} or above</li>
          </ul>
        </div>

        <div className="gm-main">
          <div className="gm-play">
            <p className="viz-title">
              Moves <span className="gm-pips" aria-label={`${movesLeft} of ${scenario.moves} moves left`}>
                {Array.from({ length: scenario.moves }).map((_, i) => (
                  <i key={i} className={i < applied.length ? 'used' : ''} />
                ))}
              </span>
            </p>
            <ul className="gm-levers">
              {levers.map((l) => {
                const on = applied.includes(l.id);
                const disabled = !on && movesLeft === 0;
                const m = on ? marginal(scenario, applied, l.id) : null;
                const warn = on ? out.warnings[l.id] : undefined;
                return (
                  <li key={l.id}>
                    <button type="button" className={`gm-lever${on ? ' is-on' : ''}`} aria-pressed={on} disabled={disabled} onClick={() => toggle(l.id)}>
                      <span className="gm-opt-dot" aria-hidden="true" />
                      <span className="gm-opt-text">
                        <b>{l.label}</b>
                        <small>{l.blurb}</small>
                      </span>
                      {on && m && (
                        <span className={`gm-delta num${warn ? ' none' : ''}`}>
                          {warn ? 'no effect' : (
                            <>
                              {m.saved > 0 ? `-${usd(m.saved)}` : m.saved < 0 ? `+${usd(-m.saved)}` : '$0'}
                              {m.quality !== 0 && <em>{m.quality > 0 ? '+' : ''}{m.quality.toFixed(1)} quality</em>}
                            </>
                          )}
                        </span>
                      )}
                    </button>
                    {warn && <p className="gm-warn">{warn}</p>}
                  </li>
                );
              })}
            </ul>
            <GameDock
              items={[
                { label: 'Cost', value: usd(out.monthly), target: `≤ ${usd(scenario.target)}`, ok: out.monthly <= scenario.target },
                { label: 'Quality', value: out.quality.toFixed(1), target: `≥ ${scenario.qualityFloor}`, ok: out.quality >= scenario.qualityFloor },
              ]}
            />
          </div>

          <aside className="gm-side" aria-label="Live results">
            <p className="viz-title">Your system now</p>
            <Meter label="Monthly cost" value={out.monthly} limit={scenario.target} mode="max" display={usd(out.monthly)} limitDisplay={usd(scenario.target)} scaleMax={base.monthly * 1.05} />
            <Meter label="Answer quality" value={out.quality} limit={scenario.qualityFloor} mode="min" display={out.quality.toFixed(1)} limitDisplay={`${scenario.qualityFloor}`} scaleMax={100} />
            <p className="gm-note num">
              {applied.length === 0 ? 'Nothing applied yet.' : `Saved ${savedPct}% so far.`} Aim for {targetPct}% without dropping below {scenario.qualityFloor}.
            </p>
            <AnimatePresence mode="wait">
              {out.win ? (
                <motion.div key="win" className="gm-win" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                  <Stars n={out.stars} />
                  <b>Target met</b>
                  <p>
                    {out.stars === 3
                      ? 'Three stars: within par and 10% under target.'
                      : out.stars === 2
                        ? `Two stars. For a third, finish at least 10% under target (${usd(scenario.target * 0.9)}).`
                        : `One star. For two, win in ${scenario.par} moves or fewer.`}
                  </p>
                </motion.div>
              ) : (
                <motion.p key="not" className="gm-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {out.monthly > scenario.target && out.quality < scenario.qualityFloor
                    ? 'Over budget and under the quality floor.'
                    : out.monthly > scenario.target
                      ? 'Quality is safe, but the bill is still above target.'
                      : 'The bill is under target, but quality is below the floor.'}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="gm-result-actions">
              <button type="button" className="btn quiet" onClick={() => setApplied([])} disabled={applied.length === 0}>
                Undo everything
              </button>
              <button type="button" className="btn quiet" onClick={() => setShown(true)}>
                Show a three-star plan
              </button>
            </div>
          </aside>
        </div>

        <AnimatePresence>
          {shown && (
            <motion.section ref={revealRef} className="gm-reveal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
              <h3>A three-star plan</h3>
              {best ? (
                <>
                  <p>
                    {best.applied.length} moves: it reaches {usd(best.outcome.monthly)} a month at quality {best.outcome.quality.toFixed(1)}.
                  </p>
                  <ol className="gm-plan">
                    {best.applied.map((id) => (
                      <li key={id}>{levers.find((l) => l.id === id)!.label}</li>
                    ))}
                  </ol>
                  <p className="gm-note">There are usually several routes. Notice the order of reasoning: measure first, take the savings that cost no quality, and only then the ones that do.</p>
                  <LessonLinks links={best.applied.map((id) => levers.find((l) => l.id === id)!.lesson)} />
                </>
              ) : (
                <p>No three-star plan exists for this level with these rules.</p>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </Root>
  );
}
