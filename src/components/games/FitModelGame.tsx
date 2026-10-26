import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE, fmt } from '../viz/shared';
import { recordGame } from '../../lib/store';
import {
  fit,
  fitScenarios,
  kvPrecisions,
  modelIds,
  models,
  score,
  solutions,
  weightPrecisions,
  RESERVE_FRACTION,
  RUNTIME_GB,
  type Config,
  type KvPrecision,
  type ModelId,
  type WeightPrecision,
} from '../../games/fitmodel';
import { LessonLinks, LevelTabs, Meter, useRecords, useScrollIntoView } from './shared';

export default function FitModelGame() {
  const records = useRecords();
  const [sid, setSid] = useState(fitScenarios[0].id);
  const scenario = fitScenarios.find((s) => s.id === sid)!;
  const [config, setConfig] = useState<Config>({ model: '8B', weights: 'fp16', kv: 'fp16' });
  const [locked, setLocked] = useState<number | null>(null);
  const [shown, setShown] = useState(false);

  const revealRef = useScrollIntoView<HTMLElement>(shown);
  const r = useMemo(() => fit(scenario, config), [scenario, config]);
  const sols = useMemo(() => solutions(scenario), [scenario]);
  const total = scenario.deviceGB * scenario.devices;
  const scale = Math.max(total, r.usedGB + r.reserveGB);
  const pct = (gb: number) => `${(gb / scale) * 100}%`;
  const over = Math.max(0, r.usedGB - r.capacityGB);

  const update = (patch: Partial<Config>) => {
    setConfig((c) => ({ ...c, ...patch }));
    setLocked(null);
  };

  const lock = () => {
    const s = score(scenario, config);
    setLocked(s);
    if (s > 0) recordGame(`fit:${sid}`, s);
  };

  const reset = (id: string) => {
    setSid(id);
    setLocked(null);
    setShown(false);
  };

  const opt = <T extends string>(id: T, label: string, detail: string, on: boolean, click: () => void) => (
    <button key={id} type="button" role="radio" aria-checked={on} className={`gm-opt${on ? ' is-on' : ''}`} onClick={click}>
      <span className="gm-opt-dot" aria-hidden="true" />
      <span className="gm-opt-text">
        <b>{label}</b>
        <small>{detail}</small>
      </span>
    </button>
  );

  return (
    <Root>
      <div className="gm">
        <LevelTabs
          items={fitScenarios.map((s) => ({ id: s.id, title: s.title, level: s.level }))}
          value={sid}
          onChange={reset}
          records={records}
          prefix="fit"
        />

        <div className="gm-brief">
          <h2>{scenario.title}</h2>
          <p>{scenario.brief}</p>
          <ul className="gm-facts num">
            <li>
              {scenario.devices > 1 ? `${scenario.devices} x ` : ''}
              {scenario.deviceGB} GB {scenario.deviceName}
              {scenario.devices > 1 ? ` (${total} GB in all)` : ''}
            </li>
            <li>{scenario.users} {scenario.users === 1 ? 'user' : 'users'} at once</li>
            <li>{scenario.ctx.toLocaleString('en-US')} tokens of context each</li>
            <li>task score of at least {scenario.minQuality}</li>
          </ul>
        </div>

        <div className="gm-main">
          <div className="gm-play">
            <fieldset className="gm-slot">
              <legend>
                <b>Model size</b> <span>Bigger models score better and need more memory.</span>
              </legend>
              <div className="gm-options" role="radiogroup" aria-label="Model size">
                {modelIds.map((id) =>
                  opt(id, models[id].label, `${models[id].paramsB}B parameters, ${models[id].layers} layers, task score ${models[id].quality}`, config.model === id, () => update({ model: id as ModelId })),
                )}
              </div>
            </fieldset>
            <fieldset className="gm-slot">
              <legend>
                <b>Weight precision</b> <span>Fewer bits per weight, smaller model, a little less accurate.</span>
              </legend>
              <div className="gm-options" role="radiogroup" aria-label="Weight precision">
                {(Object.keys(weightPrecisions) as WeightPrecision[]).map((id) =>
                  opt(id, weightPrecisions[id].label, `${weightPrecisions[id].bytes} bytes per weight${weightPrecisions[id].penalty ? `, about -${weightPrecisions[id].penalty} task score` : ', no loss'}`, config.weights === id, () => update({ weights: id })),
                )}
              </div>
            </fieldset>
            <fieldset className="gm-slot">
              <legend>
                <b>KV cache precision</b> <span>The cache grows with every user and every token of context.</span>
              </legend>
              <div className="gm-options" role="radiogroup" aria-label="KV cache precision">
                {(Object.keys(kvPrecisions) as KvPrecision[]).map((id) =>
                  opt(id, kvPrecisions[id].label, `${kvPrecisions[id].bytes} bytes per value${kvPrecisions[id].penalty ? `, about -${kvPrecisions[id].penalty} task score` : ', no loss'}`, config.kv === id, () => update({ kv: id })),
                )}
              </div>
            </fieldset>
          </div>

          <aside className="gm-side" aria-label="Memory">
            <p className="viz-title">Memory</p>
            <div className="gm-mem" role="img" aria-label={`Weights ${fmt.gb(r.weightsGB)}, KV cache ${fmt.gb(r.kvGB)}, reserved ${fmt.gb(r.reserveGB)} of ${fmt.gb(total)}`}>
              <motion.span className="gm-mem-w" initial={false} animate={{ width: pct(r.weightsGB) }} transition={{ duration: 0.4, ease: EASE }} />
              <motion.span className="gm-mem-k" initial={false} animate={{ width: pct(r.kvGB) }} transition={{ duration: 0.4, ease: EASE }} />
              <motion.span className="gm-mem-r" initial={false} animate={{ width: pct(r.reserveGB) }} transition={{ duration: 0.4, ease: EASE }} />
              <span className="gm-mem-cap" style={{ left: pct(total) }} aria-hidden="true">
                <i>{fmt.gb(total)}</i>
              </span>
            </div>
            <dl className="gm-mem-legend num">
              <div><dt><i className="w" />Weights</dt><dd>{fmt.gb(r.weightsGB)}</dd></div>
              <div><dt><i className="k" />KV cache</dt><dd>{fmt.gb(r.kvGB)}</dd></div>
              <div><dt><i className="r" />Reserved</dt><dd>{fmt.gb(r.reserveGB)}</dd></div>
            </dl>
            <p className={`gm-status ${r.fits ? 'ok' : 'bad'}`}>
              {r.fits ? `Fits, with ${fmt.gb(r.capacityGB - r.usedGB)} to spare.` : `Does not fit: over by ${fmt.gb(over)}.`}
            </p>
            <Meter label="Task score" value={r.quality} limit={scenario.minQuality} mode="min" display={r.quality.toFixed(1)} limitDisplay={`${scenario.minQuality}`} scaleMax={100} />
            <button type="button" className="btn" onClick={lock} disabled={!r.ok}>
              {r.ok ? 'Lock in this answer' : r.fits ? 'Raise the task score to continue' : 'Make it fit to continue'}
            </button>
            <AnimatePresence>
              {locked !== null && (
                <motion.p className="gm-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  Score {locked} out of 100. {locked === 100 ? 'That is the best quality possible here.' : 'It works, but a better-quality answer exists.'}
                </motion.p>
              )}
            </AnimatePresence>
            <button type="button" className="btn quiet" onClick={() => setShown(true)}>
              Show the best answer
            </button>
          </aside>
        </div>

        <details className="gm-math">
          <summary>Show the arithmetic</summary>
          <p className="num">
            Weights = {models[config.model].paramsB}B parameters x {weightPrecisions[config.weights].bytes} bytes = {fmt.gb(r.weightsGB)}. KV cache = 2 x {models[config.model].layers} layers x {models[config.model].kvHeads} KV heads x {models[config.model].headDim} head dimension x {kvPrecisions[config.kv].bytes} bytes = {(r.kvBytesPerToken / 1024).toFixed(0)} KB per token, times {scenario.ctx.toLocaleString('en-US')} tokens times {scenario.users} users = {fmt.gb(r.kvGB)}. Reserved = {Math.round(RESERVE_FRACTION * 100)}% of total memory plus {RUNTIME_GB} GB per device. Model shapes are approximate Llama-style examples and task scores are illustrative.
          </p>
        </details>

        <AnimatePresence>
          {shown && sols[0] && (
            <motion.section ref={revealRef} className="gm-reveal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
              <h3>The best answer</h3>
              <p>
                {sols.length === 1 ? 'Exactly one combination works:' : `${sols.length} combinations work. The best is:`}{' '}
                <b>
                  {models[sols[0].config.model].label}, {weightPrecisions[sols[0].config.weights].label} weights, {kvPrecisions[sols[0].config.kv].label} KV cache
                </b>
                , with a task score of {sols[0].result.quality.toFixed(1)}.
              </p>
              <div className="gm-result-actions">
                <button type="button" className="btn quiet" onClick={() => update(sols[0].config)}>
                  Load it
                </button>
              </div>
              <LessonLinks
                links={[
                  { label: 'KV cache and memory', href: '/learn/serving/kv-cache-and-memory/' },
                  { label: 'Quantization', href: '/learn/serving/quantization/' },
                ]}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </Root>
  );
}
