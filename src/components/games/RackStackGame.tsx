import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE, fmt } from '../viz/shared';
import { recordGame } from '../../lib/store';
import { weightPrecisions, kvPrecisions, models, type KvPrecision, type WeightPrecision } from '../../games/fitmodel';
import { COUNTS, evaluate, examplePrice, rackGpus, rackScenarios, score, solutions, type Pick } from '../../games/rackstack';
import { Check, GameDock, LessonLinks, LevelTabs, Meter, useRecords, useScrollIntoView } from './shared';

const start: Pick = { gpu: 'a10g', count: 1, weights: 'fp16', kv: 'fp16' };

export default function RackStackGame() {
  const records = useRecords();
  const [sid, setSid] = useState(rackScenarios[0].id);
  const s = rackScenarios.find((x) => x.id === sid)!;
  const [pick, setPick] = useState<Pick>(start);
  const [submitted, setSubmitted] = useState(false);
  const [reveal, setReveal] = useState(false);

  const r = useMemo(() => evaluate(s, pick), [s, pick]);
  const sols = useMemo(() => (reveal ? solutions(s) : []), [reveal, s]);
  const pts = useMemo(() => (submitted ? score(s, pick) : 0), [submitted, s, pick]);
  const resultRef = useScrollIntoView<HTMLElement>(submitted);
  const revealRef = useScrollIntoView<HTMLElement>(reveal);

  const change = (patch: Partial<Pick>) => {
    setPick((p) => ({ ...p, ...patch }));
    setSubmitted(false);
  };
  const submit = () => {
    setSubmitted(true);
    const v = score(s, pick);
    if (v > 0) recordGame(`rack:${sid}`, v);
  };
  const reset = (id: string) => {
    setSid(id);
    setPick(start);
    setSubmitted(false);
    setReveal(false);
  };

  const gpu = rackGpus.find((g) => g.id === pick.gpu)!;

  return (
    <Root>
      <div className="gm">
        <LevelTabs items={rackScenarios.map((x) => ({ id: x.id, title: x.title, level: x.level }))} value={sid} onChange={reset} records={records} prefix="rack" />

        <div className="gm-brief">
          <h2>{s.title}</h2>
          <p>{s.brief}</p>
          <ul className="gm-facts num">
            <li>{models[s.model].label}</li>
            <li>{s.users} users at once</li>
            <li>{fmt.int(s.ctx)} tokens of context each</li>
            <li>at least {s.minTokS} tokens per second each</li>
            <li>task score {s.minQuality} or more</li>
            <li>budget ${s.budget} an hour (example prices)</li>
          </ul>
        </div>

        <div className="gm-main">
          <div className="gm-play">
            <fieldset className="gm-slot">
              <legend>
                <b>Accelerator</b> <span>Memory decides whether it fits. Bandwidth decides how fast. Price is an example.</span>
              </legend>
              <div className="gm-options" role="radiogroup" aria-label="Accelerator">
                {rackGpus.map((g) => {
                  const on = pick.gpu === g.id;
                  return (
                    <button key={g.id} type="button" role="radio" aria-checked={on} className={`gm-opt${on ? ' is-on' : ''}`} onClick={() => change({ gpu: g.id })}>
                      <span className="gm-opt-dot" aria-hidden="true" />
                      <span className="gm-opt-text">
                        <b>
                          {g.name} <span className="rs-price num">${examplePrice[g.id]}/hr</span>
                        </b>
                        <small>
                          {g.memGB} GB {g.memType}, {fmt.int(g.bwGBs)} GB/s, {g.link}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="gm-slot">
              <legend>
                <b>How many</b> <span>More cards add memory and bandwidth, minus the cost of talking to each other.</span>
              </legend>
              <div className="rs-counts" role="radiogroup" aria-label="Number of GPUs">
                {COUNTS.map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={pick.count === n} className={`gm-opt${pick.count === n ? ' is-on' : ''}`} onClick={() => change({ count: n })}>
                    <span className="gm-opt-dot" aria-hidden="true" />
                    <span className="gm-opt-text">
                      <b>{n}</b>
                    </span>
                  </button>
                ))}
              </div>
              {pick.count > 1 && gpu.link === 'PCIe' && <p className="gm-warn">{gpu.name} cards only talk over PCIe, so splitting a model across them is slow.</p>}
            </fieldset>

            <fieldset className="gm-slot">
              <legend>
                <b>Weight precision</b> <span>Fewer bits, less memory, a little less quality.</span>
              </legend>
              <div className="gm-options" role="radiogroup" aria-label="Weight precision">
                {(Object.keys(weightPrecisions) as WeightPrecision[]).map((id) => (
                  <button key={id} type="button" role="radio" aria-checked={pick.weights === id} className={`gm-opt${pick.weights === id ? ' is-on' : ''}`} onClick={() => change({ weights: id })}>
                    <span className="gm-opt-dot" aria-hidden="true" />
                    <span className="gm-opt-text">
                      <b>{weightPrecisions[id].label}</b>
                      <small>{weightPrecisions[id].penalty ? `about -${weightPrecisions[id].penalty} task score` : 'no loss'}</small>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="gm-slot">
              <legend>
                <b>KV cache precision</b> <span>With many users or long chats, the cache can be bigger than the weights.</span>
              </legend>
              <div className="gm-options" role="radiogroup" aria-label="KV cache precision">
                {(Object.keys(kvPrecisions) as KvPrecision[]).map((id) => (
                  <button key={id} type="button" role="radio" aria-checked={pick.kv === id} className={`gm-opt${pick.kv === id ? ' is-on' : ''}`} onClick={() => change({ kv: id })}>
                    <span className="gm-opt-dot" aria-hidden="true" />
                    <span className="gm-opt-text">
                      <b>{kvPrecisions[id].label}</b>
                      <small>{kvPrecisions[id].penalty ? `about -${kvPrecisions[id].penalty} task score` : 'no loss'}</small>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
            <GameDock
              items={[
                { label: 'Memory', value: fmt.gb(r.memoryUsedGB), target: `≤ ${fmt.gb(r.memoryCapacityGB)}`, ok: r.memoryUsedGB <= r.memoryCapacityGB },
                { label: 'Speed', value: r.fits ? `${Math.round(r.speed)} tok/s` : 'no fit', target: `≥ ${s.minTokS}`, ok: r.speed >= s.minTokS },
                { label: 'Score', value: r.quality.toFixed(1), target: `≥ ${s.minQuality}`, ok: r.quality >= s.minQuality },
                { label: 'Cost', value: `$${r.cost.toFixed(2)}/hr`, target: `≤ $${s.budget}`, ok: r.cost <= s.budget },
              ]}
            />
          </div>

          <aside className="gm-side" aria-label="Live estimates">
            <p className="viz-title">Live estimates</p>
            <Meter label="Memory used" value={r.memoryUsedGB} limit={r.memoryCapacityGB} mode="max" display={fmt.gb(r.memoryUsedGB)} limitDisplay={fmt.gb(r.memoryCapacityGB)} />
            <Meter label="Speed per user" value={r.speed} limit={s.minTokS} mode="min" display={r.fits ? `${Math.round(r.speed)} tok/s` : 'does not fit'} limitDisplay={`${s.minTokS} tok/s`} scaleMax={Math.max(s.minTokS * 2.5, r.speed * 1.05)} />
            <Meter label="Task score" value={r.quality} limit={s.minQuality} mode="min" display={r.quality.toFixed(1)} limitDisplay={`${s.minQuality}`} scaleMax={100} />
            <Meter label="Example cost" value={r.cost} limit={s.budget} mode="max" display={`$${r.cost.toFixed(2)}/hr`} limitDisplay={`$${s.budget}/hr`} />
            <button type="button" className="btn" onClick={submit}>
              Check my choice
            </button>
          </aside>
        </div>

        <AnimatePresence>
          {submitted && (
            <motion.section ref={resultRef} className="gm-result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} aria-live="polite">
              <header className="gm-result-head">
                <div>
                  <h3>{r.ok ? 'This setup does the job' : `${r.checks.filter((c) => !c.pass).length} requirement${r.checks.filter((c) => !c.pass).length === 1 ? '' : 's'} not met`}</h3>
                  <p>{r.ok ? (pts === 100 ? 'And it is the cheapest valid choice.' : 'It works. A cheaper valid choice exists.') : 'Each unmet one is listed below.'}</p>
                </div>
                <div className="gm-score num" aria-label={`Score ${pts} out of 100`}>
                  {pts}
                  <small>/ 100</small>
                </div>
              </header>
              <ul className="gm-checks">
                {r.checks.map((c, i) => (
                  <motion.li key={c.id} className={c.pass ? 'ok' : 'bad'} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}>
                    <Check pass={c.pass} />
                    <div>
                      <b>{c.label}</b>
                      <p>{c.detail}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
              <div className="gm-result-actions">
                {!reveal && (
                  <button type="button" className="btn quiet" onClick={() => setReveal(true)}>
                    Show the cheapest valid choice
                  </button>
                )}
                <button type="button" className="btn quiet" onClick={() => reset(sid)}>
                  Start this level over
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reveal && sols[0] && (
            <motion.section ref={revealRef} className="gm-reveal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
              <h3>The cheapest valid choice</h3>
              <p>
                {sols.length} of the {rackGpus.length * COUNTS.length * 6} combinations work. The cheapest is{' '}
                <b>
                  {sols[0].pick.count} x {rackGpus.find((g) => g.id === sols[0].pick.gpu)!.name}, {weightPrecisions[sols[0].pick.weights].label} weights, {kvPrecisions[sols[0].pick.kv].label} KV cache
                </b>
                , at an example ${sols[0].result.cost.toFixed(2)} an hour and about {Math.round(sols[0].result.speed)} tokens per second per user.
              </p>
              <div className="gm-result-actions">
                <button type="button" className="btn quiet" onClick={() => { setPick(sols[0].pick); setSubmitted(false); }}>
                  Load it
                </button>
              </div>
              <LessonLinks
                links={[
                  { label: 'Reading a GPU spec sheet', href: '/learn/infra/reading-a-gpu-spec-sheet/' },
                  { label: 'GPU and accelerator instances', href: '/learn/infra/gpu-and-accelerator-instances/' },
                  { label: 'KV cache and memory', href: '/learn/serving/kv-cache-and-memory/' },
                ]}
              />
            </motion.section>
          )}
        </AnimatePresence>

        <details className="gm-math">
          <summary>How this is calculated</summary>
          <p className="num">
            Memory = weights + users x KV cache, against usable memory (90% of the total minus 1.5 GB per card). Speed per user is about effective memory bandwidth divided by the bytes read per decode step, with 90%, 80% and 70% of ideal scaling for 2, 4 and 8 cards, and a further penalty on cards that only talk over PCIe. Prices are made-up examples, not quotes. Only NVIDIA GPUs are offered because AMD cards and TPUs need different software stacks, so a fair comparison needs more than memory and a price.
          </p>
        </details>
      </div>
    </Root>
  );
}
