import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE, fmt } from './shared';
import { gpus } from '../../data/gpus';
import { estimate, DEFAULT_EFFICIENCY } from '../../lib/gpu';
import { models, modelIds, weightPrecisions, kvPrecisions, type ModelId, type WeightPrecision, type KvPrecision } from '../../games/fitmodel';

/**
 * Pick a model, see which accelerators can hold it and how fast each can
 * decode. The arithmetic is the real memory-bound estimate; the efficiency
 * factor is an assumption you can change.
 */
export default function GpuExplorer() {
  const [model, setModel] = useState<ModelId>('8B');
  const [wp, setWp] = useState<WeightPrecision>('fp16');
  const [kp, setKp] = useState<KvPrecision>('fp16');
  const [ctx, setCtx] = useState(8192);
  const [users, setUsers] = useState(4);
  const [count, setCount] = useState(1);
  const [eff, setEff] = useState(DEFAULT_EFFICIENCY);

  const rows = useMemo(() => gpus.map((g) => ({ g, e: estimate(g, count, model, wp, kp, ctx, users, eff) })), [model, wp, kp, ctx, users, count, eff]);
  const maxUser = Math.max(1, ...rows.map((r) => r.e.perUserTokS));
  const fastest = rows.filter((r) => r.e.fits).sort((a, b) => b.e.perUserTokS - a.e.perUserTokS)[0];
  const w = rows[0].e.weightsGB;

  return (
    <Root>
      <div className="viz gx">
        <div className="viz-controls">
          <label className="field">
            <span>Model size</span>
            <select value={model} onChange={(e) => setModel(e.target.value as ModelId)}>
              {modelIds.map((id) => (
                <option key={id} value={id}>
                  {models[id].label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Weight precision</span>
            <select value={wp} onChange={(e) => setWp(e.target.value as WeightPrecision)}>
              {(Object.keys(weightPrecisions) as WeightPrecision[]).map((id) => (
                <option key={id} value={id}>
                  {weightPrecisions[id].label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>KV cache precision</span>
            <select value={kp} onChange={(e) => setKp(e.target.value as KvPrecision)}>
              {(Object.keys(kvPrecisions) as KvPrecision[]).map((id) => (
                <option key={id} value={id}>
                  {kvPrecisions[id].label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Devices used together</span>
            <select value={count} onChange={(e) => setCount(+e.target.value)}>
              {[1, 2, 4, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              Context per user <b>{fmt.int(ctx)} tokens</b>
            </span>
            <input type="range" min={1024} max={131072} step={1024} value={ctx} onChange={(e) => setCtx(+e.target.value)} />
          </label>
          <label className="field">
            <span>
              Concurrent users <b>{users}</b>
            </span>
            <input type="range" min={1} max={128} step={1} value={users} onChange={(e) => setUsers(+e.target.value)} />
          </label>
        </div>

        <p className="gx-lede">
          Weights take <b className="num">{fmt.gb(w)}</b>. Each user’s cache takes <b className="num">{fmt.gb(rows[0].e.kvPerUserGB)}</b> at this context length.
          {fastest && (
            <>
              {' '}
              Fastest here: <b>{fastest.g.name}</b> at about <b className="num">{Math.round(fastest.e.perUserTokS)}</b> tokens per second per user.
            </>
          )}
        </p>

        <div className="gx-table" role="table" aria-label="Accelerators compared for this model">
          <div className="gx-head" role="row">
            <span role="columnheader">Accelerator</span>
            <span role="columnheader">Memory</span>
            <span role="columnheader">Bandwidth</span>
            <span role="columnheader">Fits?</span>
            <span role="columnheader">Users that fit</span>
            <span role="columnheader">Speed per user</span>
          </div>
          {rows.map(({ g, e }) => (
            <div key={g.id} className={`gx-row${e.fits ? '' : ' no'}${fastest?.g.id === g.id ? ' best' : ''}`} role="row">
              <span className="gx-name" role="cell">
                <b>
                  {g.name}
                  {g.approx ? <i title="Approximate: check the vendor datasheet"> ~</i> : null}
                </b>
                <small>
                  {g.memType}, {g.link}
                </small>
              </span>
              <span className="num" role="cell" data-h="Memory">
                {g.memGB * count} GB
              </span>
              <span className="num" role="cell" data-h="Bandwidth">
                {fmt.int(g.bwGBs * count)} GB/s
              </span>
              <span role="cell" className={`gx-fit ${e.fits ? 'ok' : 'bad'}`} data-h="Fits?">
                {e.fits ? `Yes, ${fmt.gb(e.usedGB)} of ${fmt.gb(e.capacityGB)}` : e.devicesNeeded === Infinity || e.devicesNeeded > 64 ? 'No, far too big' : `No, needs ${e.devicesNeeded} or more`}
              </span>
              <span className="num" role="cell" data-h="Max users">
                {e.maxUsers > 0 ? e.maxUsers : '0'}
              </span>
              <span className="gx-speed" role="cell" data-h="Speed per user">
                <span className="gx-bar">
                  <motion.span initial={false} animate={{ scaleX: e.perUserTokS / maxUser }} transition={{ duration: 0.45, ease: EASE }} />
                </span>
                <b className="num">{e.fits ? `${Math.round(e.perUserTokS)} tok/s` : '-'}</b>
              </span>
            </div>
          ))}
        </div>

        <details className="gm-math">
          <summary>Assumptions and how the speed is estimated</summary>
          <label className="field" style={{ maxWidth: 360, marginTop: '0.8rem' }}>
            <span>
              Share of ideal bandwidth you actually get <b>{Math.round(eff * 100)}%</b>
            </span>
            <input type="range" min={0.3} max={0.9} step={0.05} value={eff} onChange={(e) => setEff(+e.target.value)} />
          </label>
          <p>
            Each decode step reads all the weights plus every active user’s cache from memory, so speed per user is about effective bandwidth divided by that many bytes. Several devices add bandwidth and memory but lose some to communication (90% for 2, 80% for 4, 70% for 8 here). It is an upper bound set by memory, not a benchmark. Memory reserves 10% plus 1.5 GB per device. Model shapes are approximate Llama-style examples. Specs are rounded; a tilde marks ones that were not re-verified. Always check the current datasheet.
          </p>
        </details>
      </div>
    </Root>
  );
}
