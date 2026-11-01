import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE, fmt } from './shared';
import { BITS, DEVICES, KV_BYTES, MODELS, RUNTIME_OVERHEAD_GB, budget, type Verdict } from '../../lib/ondevice-budget';

/*
 * On-device budget calculator. Pick a device, a model, a weight precision and a context length, and
 * see whether the model fits in the memory an app can really use and what the memory-bandwidth
 * ceiling on decode speed is. The sums are in lib/ondevice-budget.ts, with tests. Device figures are
 * vendor numbers read on 1 November 2026, except the phone, which is an invented example.
 */

const VERDICT_TEXT: Record<Verdict, string> = {
  fits: 'Fits, with room to spare',
  tight: 'Fits, but tight: little room for the OS to move',
  no: 'Does not fit',
};

const tps = (n: number) => (n >= 10 ? n.toFixed(0) : n.toFixed(1));

export default function OnDeviceBudget() {
  const [deviceId, setDeviceId] = useState('phone');
  const [modelId, setModelId] = useState('qwen25-3b');
  const [bitsId, setBitsId] = useState('q4k');
  const [kvId, setKvId] = useState('kv16');
  const [ctx, setCtx] = useState(4096);
  const [reserved, setReserved] = useState(50);
  const [eff, setEff] = useState(60);

  const device = DEVICES.find((d) => d.id === deviceId)!;
  const model = MODELS.find((m) => m.id === modelId)!;
  const bits = BITS.find((b) => b.id === bitsId)!;
  const kv = KV_BYTES.find((k) => k.id === kvId)!;

  const pickDevice = (id: string) => {
    setDeviceId(id);
    setReserved(Math.round(DEVICES.find((d) => d.id === id)!.reservedShare * 100));
  };

  const run = (bitsPerWeight: number) =>
    budget({ model, device, reservedShare: reserved / 100, bitsPerWeight, kvBytes: kv.bytes, contextTokens: ctx, efficiency: eff / 100 });
  const r = run(bits.bits);

  const scale = Math.max(r.total, r.usable, 0.001);
  const pct = (gb: number) => `${Math.max(0, (gb / scale) * 100)}%`;
  const overContext = ctx > model.maxContext;

  const summary = `${fmt.gb(r.total)} needed, ${fmt.gb(r.usable)} usable. Speed ceiling about ${tps(r.ceilingTps)} tokens per second, estimate about ${tps(r.estimateTps)}.`;

  return (
    <Root>
      <div className="viz ec-bud">
        <p className="viz-title">On-device budget</p>
        <div className="viz-controls">
          <label className="field">
            <span>Device</span>
            <select value={deviceId} onChange={(e) => pickDevice(e.target.value)}>
              {DEVICES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Model</span>
            <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Weight precision</span>
            <select value={bitsId} onChange={(e) => setBitsId(e.target.value)}>
              {BITS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>KV cache precision</span>
            <select value={kvId} onChange={(e) => setKvId(e.target.value)}>
              {KV_BYTES.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              Context <b>{fmt.int(ctx)} tokens</b>
            </span>
            <input type="range" min={512} max={32768} step={512} value={ctx} onChange={(e) => setCtx(+e.target.value)} aria-valuetext={`${ctx} tokens`} />
          </label>
          <label className="field">
            <span>
              OS and other apps keep <b>{reserved}%</b>
            </span>
            <input type="range" min={0} max={80} step={5} value={reserved} onChange={(e) => setReserved(+e.target.value)} aria-valuetext={`${reserved} percent of memory kept by the system`} />
          </label>
          <label className="field">
            <span>
              Share of peak bandwidth reached <b>{eff}%</b>
            </span>
            <input type="range" min={20} max={100} step={5} value={eff} onChange={(e) => setEff(+e.target.value)} aria-valuetext={`${eff} percent`} />
          </label>
        </div>

        <p className="ec-src">
          <span className={`ec-badge ${device.basis}`}>{device.basis === 'datasheet' ? 'Vendor figure' : 'Invented example'}</span>
          {device.ramGB} GB memory, {device.bandwidthGBs} GB/s. {device.source.replace(/\.$/, '')}.
        </p>

        <div className="ec-bar" role="img" aria-label={`Weights ${fmt.gb(r.weights)}, KV cache ${fmt.gb(r.kv)}, runtime ${fmt.gb(r.overhead)}, against ${fmt.gb(r.usable)} usable`}>
          <motion.span className="ec-seg w" initial={false} animate={{ width: pct(r.weights) }} transition={{ duration: 0.35, ease: EASE }} />
          <motion.span className="ec-seg k" initial={false} animate={{ width: pct(r.kv) }} transition={{ duration: 0.35, ease: EASE }} />
          <motion.span className="ec-seg o" initial={false} animate={{ width: pct(r.overhead) }} transition={{ duration: 0.35, ease: EASE }} />
          <span className="ec-limit" style={{ left: pct(r.usable) }} />
        </div>
        <p className="ec-legend">
          <span><i className="ec-sw w" /> Weights</span>
          <span><i className="ec-sw k" /> KV cache</span>
          <span><i className="ec-sw o" /> Runtime ({RUNTIME_OVERHEAD_GB} GB, assumed)</span>
          <span><i className="ec-sw l" /> Usable memory</span>
        </p>

        <p className={`ec-verdict ${r.verdict}`} role="status" aria-live="polite">
          <b>{VERDICT_TEXT[r.verdict]}.</b> <span className="ec-sr">{summary}</span>
        </p>

        <dl className="rl-readout">
          <div>
            <dt>Weights</dt>
            <dd className="num">{fmt.gb(r.weights)}</dd>
          </div>
          <div>
            <dt>KV cache at {fmt.int(ctx)} tokens</dt>
            <dd className="num">{fmt.gb(r.kv)}</dd>
          </div>
          <div>
            <dt>Needed / usable</dt>
            <dd className="num">
              {fmt.gb(r.total)} / {fmt.gb(r.usable)}
            </dd>
          </div>
          <div>
            <dt>KV per token</dt>
            <dd className="num">{(r.kvPerToken / 1024).toFixed(0)} KiB</dd>
          </div>
          <div>
            <dt>Longest context that fits</dt>
            <dd className="num">{r.maxContextThatFits > 0 ? `${fmt.int(r.maxContextThatFits)} tokens` : 'none'}</dd>
          </div>
          <div>
            <dt>Decode speed ceiling</dt>
            <dd className="num">{tps(r.ceilingTps)} tok/s</dd>
          </div>
          <div>
            <dt>Estimate at {eff}% of peak</dt>
            <dd className="num">{tps(r.estimateTps)} tok/s</dd>
          </div>
        </dl>
        {overContext && (
          <p className="ec-warn">
            {model.label} states a context length of {fmt.int(model.maxContext)} tokens, so the context above that is outside what the model was built for.
          </p>
        )}

        <p className="ec-cap">Same model and context at every weight precision. Sizes in GB, speed ceiling in tokens per second.</p>
        <div className="ec-tablewrap">
        <table className="ec-table">
          <thead>
            <tr>
              <th scope="col">Bits</th>
              <th scope="col">Weights</th>
              <th scope="col">Needed</th>
              <th scope="col">Result</th>
              <th scope="col">Tok/s</th>
            </tr>
          </thead>
          <tbody>
            {BITS.map((b) => {
              const x = run(b.bits);
              return (
                <tr key={b.id} className={b.id === bitsId ? 'on' : ''}>
                  <th scope="row">{b.bits}</th>
                  <td className="num">{x.weights.toFixed(2)}</td>
                  <td className="num">{x.total.toFixed(2)}</td>
                  <td className={`ec-res ${x.verdict}`}>{x.verdict === 'fits' ? 'fits' : x.verdict === 'tight' ? 'tight' : 'no'}</td>
                  <td className="num">{tps(x.ceilingTps)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        <p className="viz-cap">
          Weights = parameters x bits / 8. KV cache per token = 2 x layers x KV heads x head dimension x bytes. Ceiling = bandwidth / (weights + KV cache), because decoding reads all of both for every token. The ceiling ignores that a tied embedding table is read one row at a time, so it is conservative for the weights, and it ignores compute, so real speed is lower: the efficiency slider is an assumption, so measure your own runtime. The usable share and the 0.3 GB runtime allowance are assumptions too. Model shapes come from each model card and config file; device figures are vendor numbers read on 1 November 2026, except the phone, which is invented.
        </p>
      </div>
    </Root>
  );
}
