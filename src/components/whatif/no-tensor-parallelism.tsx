import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import { example, fewestGpus, gpuMemories, kvGB, links, models, precisions, split, splits, usableGB, weightsGB, type Setup } from '../../lib/whatif/no-tensor-parallelism';

const r1 = (n: number) => Math.round(n * 10) / 10;
const ms = (n: number) => (n >= 100 ? `${Math.round(n)} ms` : `${n.toFixed(1)} ms`);
const gb = (n: number) => (n >= 100 ? `${Math.round(n)} GB` : `${n.toFixed(1)} GB`);

const W = 380;
const TOP = 44;
const PH = 170;
const BASE = TOP + PH;

/**
 * One tall bar per GPU. Each bar is the memory that GPU must hold: weights (purple) and KV cache (blue). The outlined box
 * is the card; the dashed line is how much of it a server may fill. A bar over the dashed line means the model does not load.
 */
export default function NoTensorParallelismWhatIf() {
  const [on, setOn] = useState(true);
  const [nSplit, setNSplit] = useState(4);
  const [modelId, setModelId] = useState('70b');
  const [gpuGB, setGpuGB] = useState(80);
  const [prec, setPrec] = useState('b16');
  const [linkId, setLinkId] = useState('fast');
  const [batch, setBatch] = useState(8);
  const [ctxK, setCtxK] = useState(8);

  const model = models.find((m) => m.id === modelId) ?? models[2];
  const weightBytes = (precisions.find((p) => p.id === prec) ?? precisions[0]).bytes;
  const link = links.find((l) => l.id === linkId) ?? links[0];
  const setup: Setup = { model, gpuGB, weightBytes, batch, context: ctxK * 1024 };
  const n = on ? nSplit : 1;

  const now = useMemo(() => split(setup, n, link.gbPerS), [modelId, gpuGB, prec, linkId, batch, ctxK, n]);
  const all = useMemo(() => splits.map((k) => split(setup, k, link.gbPerS)), [modelId, gpuGB, prec, linkId, batch, ctxK]);
  const need = fewestGpus(setup);
  const wTot = weightsGB(setup);
  const kTot = kvGB(setup);
  const usable = usableGB(setup);

  const scaleMax = gpuGB * 1.2;
  const ppg = PH / scaleMax;
  const bw = Math.min(76, (356 - (n - 1) * 8) / n);
  const total = n * bw + (n - 1) * 8;
  const x0 = (W - total) / 2;
  const clipped = now.perGpu > scaleMax;
  const wh = Math.min(now.weightsPerGpu * ppg, PH);
  const kh = Math.min(now.kvPerGpu * ppg, PH - wh);
  const stepMax = Math.max(1, ...all.map((a) => a.stepMs ?? 0));
  const stepY = BASE + 88;
  const H = stepY + 54;

  const verdict = now.fits ? (
    <>
      {n === 1 ? 'On one' : `On ${n}`} {gpuGB} GB GPU{n === 1 ? '' : 's'} the model needs {gb(now.perGpu)} per GPU ({gb(wTot + kTot)} in all) and fits. One step takes about {ms(now.stepMs!)}
      {n === 1 ? ' with no talking between GPUs' : `: ${ms(now.readMs!)} reading memory and ${ms(now.commMs!)} passing partial results (${Math.round(now.commShare! * 100)}%)`} (example numbers).
    </>
  ) : (
    <>
      Does not fit. {n === 1 ? 'The' : `Split ${n} ways, the`} model needs {gb(now.perGpu)} per GPU but only about {gb(usable)} of a {gpuGB} GB card is usable, so it is over by {gb(now.overBy)}.{' '}
      {need ? `The fewest GPUs that work here: ${need}.` : 'Even 8 GPUs are not enough: try 8-bit weights or bigger GPUs.'}
    </>
  );

  const sel = (label: string, value: string, onChange: (v: string) => void, opts: { value: string; label: string }[]) => (
    <label className="field">
      <span>{label}</span>
      <select className="ws-pick" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <WhatIfFrame
      title="Does the model fit, and what does splitting it cost?"
      withLabel="Split across GPUs"
      withoutLabel="One GPU only"
      on={on}
      onChange={setOn}
      verdict={verdict}
      controls={
        <>
          <div className="ws-ctl-grid">
            {sel('Model (example)', modelId, setModelId, models.map((m) => ({ value: m.id, label: m.label })))}
            {sel('GPU memory (example)', String(gpuGB), (v) => setGpuGB(+v), gpuMemories.map((g) => ({ value: String(g), label: `${g} GB` })))}
            {sel('Weights stored as', prec, setPrec, precisions.map((p) => ({ value: p.id, label: p.label })))}
            {sel('Link (example)', linkId, setLinkId, links.map((l) => ({ value: l.id, label: l.label })))}
          </div>
          <label className="field">
            <span>
              Chats at once (batch) <b>{batch}</b>
            </span>
            <input type="range" min={1} max={64} step={1} value={batch} onChange={(e) => setBatch(+e.target.value)} aria-label="Number of conversations served at once" />
          </label>
          <label className="field">
            <span>
              Context per chat <b>{ctxK}K tokens</b>
            </span>
            <input type="range" min={1} max={128} step={1} value={ctxK} onChange={(e) => setCtxK(+e.target.value)} aria-label="Context length per conversation in thousands of tokens" aria-valuetext={`${ctxK} thousand tokens`} />
          </label>
          <div className="ws-seg" role="group" aria-label="How many GPUs to split across">
            {[2, 4, 8].map((k) => (
              <button key={k} type="button" className={`ws-opt${on && nSplit === k ? ' is-on' : ''}`} aria-pressed={on && nSplit === k} disabled={!on} onClick={() => setNSplit(k)}>
                {k} GPUs
              </button>
            ))}
          </div>
        </>
      }
    >
      <p className="ws-idea">
        A model is a big pile of numbers that must sit in GPU memory, with a growing notebook (the KV cache) for every chat. If the pile is bigger than one GPU, it cannot load at all. Splitting every layer across GPUs shares the pile, but the GPUs must then keep swapping partial answers.
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="dx-svg wi-svg ws-fig"
        role="img"
        aria-label={`${n} GPU${n === 1 ? '' : 's'}, each holding ${gb(now.perGpu)} of weights and KV cache. About ${gb(usable)} of each ${gpuGB} GB card is usable. ${now.fits ? 'It fits.' : `It does not fit, over by ${gb(now.overBy)}.`}`}
      >
        <text x={12} y={16} className="ws-svg-h">
          Memory each GPU must hold
        </text>
        {Array.from({ length: n }, (_, i) => {
          const x = r1(x0 + i * (bw + 8));
          const cardH = Math.min(gpuGB * ppg, PH);
          const usableH = usable * ppg;
          return (
            <g key={i}>
              <rect x={x} y={r1(BASE - cardH)} width={r1(bw)} height={r1(cardH)} rx={4} className="ws-card" />
              <motion.rect x={x} width={r1(bw)} className="ws-w" initial={false} animate={{ y: r1(BASE - wh), height: r1(wh) }} transition={{ duration: 0.5, ease: EASE }} />
              <motion.rect x={x} width={r1(bw)} className="ws-kv" initial={false} animate={{ y: r1(BASE - wh - kh), height: r1(kh) }} transition={{ duration: 0.5, ease: EASE }} />
              <line x1={x - 2} x2={r1(x + bw + 2)} y1={r1(BASE - usableH)} y2={r1(BASE - usableH)} className="ws-usable" />
              {!now.fits && <rect x={x} y={r1(BASE - Math.min(now.perGpu * ppg, PH))} width={r1(bw)} height={r1(Math.min(now.perGpu * ppg, PH))} rx={2} className="ws-over" />}
              <text x={r1(x + bw / 2)} y={BASE + 15} textAnchor="middle" className="ws-svg-b" style={{ fontSize: 12 }}>
                {gb(now.perGpu).replace(' GB', '')}
              </text>
            </g>
          );
        })}
        <line x1={8} x2={W - 8} y1={BASE} y2={BASE} className="ws-grid" />
        <text x={12} y={BASE + 30} className="ws-svg-t" style={{ fontSize: 12 }}>
          <tspan className="ws-key-w">Purple</tspan> weights {gb(now.weightsPerGpu)}, <tspan className="ws-key-kv">blue</tspan> KV cache {gb(now.kvPerGpu)} per GPU
        </text>
        <text x={12} y={BASE + 45} className="ws-svg-t" style={{ fontSize: 12 }}>
          Dashed line: usable memory ({gb(usable)}). Labels are GB.
        </text>
        {clipped && (
          <text x={12} y={BASE + 60} className="ws-svg-t" style={{ fontSize: 12 }}>
            The bar runs off the top of the chart.
          </text>
        )}
        {!now.fits && (
          <text x={W / 2} y={TOP - 8} textAnchor="middle" className="ws-bad-svgt">
            Does not fit: over by {gb(now.overBy)} per GPU
          </text>
        )}
        <g transform={`translate(0 ${stepY})`}>
          <text x={12} y={0} className="ws-svg-h">
            One generated token, by time
          </text>
          {now.fits ? (
            <>
              <rect x={12} y={10} width={356} height={16} rx={4} className="ws-track" />
              <motion.rect x={12} y={10} height={16} className="ws-w" initial={false} animate={{ width: r1((now.readMs! / stepMax) * 356) }} transition={{ duration: 0.5, ease: EASE }} />
              <motion.rect height={16} y={10} className="ws-warn" initial={false} animate={{ x: r1(12 + (now.readMs! / stepMax) * 356), width: r1((now.commMs! / stepMax) * 356) }} transition={{ duration: 0.5, ease: EASE }} />
              <text x={12} y={44} className="ws-svg-t">
                {n === 1 ? `${ms(now.readMs!)} reading memory, no GPU-to-GPU talk` : `${ms(now.readMs!)} reading memory + ${ms(now.commMs!)} talking`}
              </text>
            </>
          ) : (
            <text x={12} y={30} className="ws-bad-svgt">
              No step time: the model does not load.
            </text>
          )}
        </g>
      </svg>

      <div className="ws-stats is-tight" role="group" aria-label="Results for this setting">
        <div>
          <b>{need ?? 'more than 8'}</b>
          <span>fewest GPUs that fit</span>
        </div>
        <div>
          <b>{gb(now.perGpu)}</b>
          <span>per GPU, {n === 1 ? 'one GPU' : `${n} GPUs`}</span>
        </div>
        <div>
          <b>{now.fits && now.commShare !== null ? `${Math.round(now.commShare * 100)}%` : '-'}</b>
          <span>of a step spent talking</span>
        </div>
      </div>

      <p className="ws-note">
        Formulas, not a benchmark. Every size, memory, speed and delay is an example: {models.length} example model shapes (not a named model), usable memory {Math.round(example.usableShare * 100)}% of the card, {example.memGBps} GB/s memory speed, {example.allReduceMicros} microseconds per all-reduce, link speed as chosen. Weights are split evenly; the KV cache stays 16-bit.
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <div className="ws-tablewrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>GPUs</th>
                <th>Per GPU</th>
                <th>Fits</th>
                <th>Talk/step</th>
                <th>Step</th>
              </tr>
            </thead>
            <tbody>
              {all.map((a) => (
                <tr key={a.n} className={a.n === n ? 'is-now' : ''}>
                  <td>{a.n}</td>
                  <td>{gb(a.perGpu)}</td>
                  <td>{a.fits ? 'yes' : 'no'}</td>
                  <td>{a.n === 1 ? '0' : `${(a.commBytes / 1e6).toFixed(1)} MB`}</td>
                  <td>{a.stepMs === null ? '-' : ms(a.stepMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ws-note">
          Weights = parameters x bytes each = {gb(wTot)}. KV cache per token = 2 x layers x KV heads x head width x 2 bytes = {fmt.int(2 * model.layers * model.kvHeads * model.headDim * 2)} bytes; times {batch} chats x {fmt.int(ctxK * 1024)} tokens = {gb(kTot)}. Per GPU = (weights + KV) / N. A step reads each GPU{"'"}s share of memory once (time = GB / {example.memGBps} GB/s), then does 2 x {model.layers} = {2 * model.layers} all-reduces. A ring all-reduce sends 2(N-1)/N times the vector (batch x {fmt.int(model.hidden)} x 2 bytes) per GPU; time = {2 * model.layers} x {example.allReduceMicros} microseconds + bytes / link speed. Reading and talking are added with no overlap, which is a simplification.
        </p>
      </details>
    </WhatIfFrame>
  );
}



