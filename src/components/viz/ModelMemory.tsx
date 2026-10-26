import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE, fmt } from './shared';

// Llama-style shapes, approximate. Layers x KV heads x head dimension decide KV cache size.
const models = {
  '1B': { label: '1B class', params: 1.2, layers: 16, kvHeads: 8, headDim: 64 },
  '8B': { label: '8B class', params: 8, layers: 32, kvHeads: 8, headDim: 128 },
  '70B': { label: '70B class', params: 70, layers: 80, kvHeads: 8, headDim: 128 },
  '400B': { label: '400B class', params: 405, layers: 126, kvHeads: 8, headDim: 128 },
} as const;

const precisions = {
  fp32: { label: 'FP32', bytes: 4 },
  bf16: { label: 'BF16 / FP16', bytes: 2 },
  int8: { label: 'INT8', bytes: 1 },
  int4: { label: 'INT4', bytes: 0.5 },
} as const;

const kvPrecisions = {
  fp16: { label: 'FP16', bytes: 2 },
  fp8: { label: 'FP8 / INT8', bytes: 1 },
} as const;

const devices = [
  { name: 'Phone, 8 GB', gb: 8 },
  { name: 'Consumer GPU, 24 GB', gb: 24 },
  { name: 'Data-centre GPU, 80 GB', gb: 80 },
  { name: 'Eight-GPU node, 640 GB', gb: 640 },
];

export default function ModelMemory({ initialModel = '8B' }: { initialModel?: keyof typeof models }) {
  const [model, setModel] = useState<keyof typeof models>(initialModel);
  const [prec, setPrec] = useState<keyof typeof precisions>('bf16');
  const [kvPrec, setKvPrec] = useState<keyof typeof kvPrecisions>('fp16');
  const [ctx, setCtx] = useState(8192);
  const [users, setUsers] = useState(8);

  const m = models[model];
  const weights = (m.params * precisions[prec].bytes); // billions of params x bytes = GB
  const kvPerToken = 2 * m.layers * m.kvHeads * m.headDim * kvPrecisions[kvPrec].bytes; // bytes
  const kv = (kvPerToken * ctx * users) / 1e9;
  const total = weights + kv;

  return (
    <Root>
      <div className="viz mm">
        <div className="viz-controls">
          <label className="field">
            <span>Model size</span>
            <select value={model} onChange={(e) => setModel(e.target.value as keyof typeof models)}>
              {Object.entries(models).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Weight precision</span>
            <select value={prec} onChange={(e) => setPrec(e.target.value as keyof typeof precisions)}>
              {Object.entries(precisions).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>KV cache precision</span>
            <select value={kvPrec} onChange={(e) => setKvPrec(e.target.value as keyof typeof kvPrecisions)}>
              {Object.entries(kvPrecisions).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
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
            <input type="range" min={1} max={64} step={1} value={users} onChange={(e) => setUsers(+e.target.value)} />
          </label>
        </div>

        <div className="mm-stack" role="img" aria-label={`Weights ${fmt.gb(weights)}, KV cache ${fmt.gb(kv)}`}>
          <motion.span className="mm-seg weights" initial={false} animate={{ flexGrow: (weights / total) * 100 }} transition={{ duration: 0.4, ease: EASE }} />
          <motion.span className="mm-seg kv" initial={false} animate={{ flexGrow: (kv / total) * 100 }} transition={{ duration: 0.4, ease: EASE }} />
        </div>
        <dl className="rl-readout">
          <div>
            <dt>Weights</dt>
            <dd className="num">{fmt.gb(weights)}</dd>
          </div>
          <div>
            <dt>KV cache</dt>
            <dd className="num">{fmt.gb(kv)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd className="num">{fmt.gb(total)}</dd>
          </div>
          <div>
            <dt>KV per token</dt>
            <dd className="num">{(kvPerToken / 1024).toFixed(0)} KB</dd>
          </div>
        </dl>

        <ul className="mm-devices">
          {devices.map((d) => {
            const ratio = total / d.gb;
            const fits = ratio <= 1;
            return (
              <li key={d.name} className={fits ? 'fits' : 'no'}>
                <span className="mm-dev-name">{d.name}</span>
                <span className="mm-dev-bar">
                  <motion.span initial={false} animate={{ scaleX: Math.min(ratio, 1) }} transition={{ duration: 0.45, ease: EASE }} />
                </span>
                <span className="mm-dev-state">{fits ? `fits, ${Math.round(ratio * 100)}% used` : `needs ${ratio.toFixed(1)}x`}</span>
              </li>
            );
          })}
        </ul>
        <p className="viz-cap">
          Weights are parameters times bytes each. KV cache is 2 x layers x KV heads x head dimension x bytes, per token, per user. Model shapes are approximate Llama-style examples. Real deployments also need memory for activations, the runtime and fragmentation, so leave headroom.
        </p>
      </div>
    </Root>
  );
}
