import { useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import { analyse, bitOptions, CONTEXT_TOKENS, devices, models, type Bits } from '../../lib/whatif/no-quantization';

const X = 6;
const W = 368;
const PITCH = 78;
const TOP = 44;

const names: Record<Bits, string> = { 16: '16-bit, not quantised', 8: '8-bit', 4: '4-bit' };

/**
 * One device memory scale with three bars: the weights at 16, 8 and 4 bits. A dashed line marks the
 * usable memory. A bar that crosses it does not fit. The row for the chosen setting is outlined.
 */
export default function NoQuantizationWhatIf() {
  const [quant, setQuant] = useState(true);
  const [mi, setMi] = useState(0);
  const [di, setDi] = useState(1);
  const model = models[mi];
  const device = devices[di];
  const active: Bits = quant ? 4 : 16;
  const res = bitOptions.map((b) => analyse(model, device, b));
  const now = res.find((r) => r.bits === active)!;
  const usable = now.usableGB;
  const maxW = Math.max(...res.map((r) => r.weightsGB));
  const xmax = Math.min(Math.max(maxW, usable), usable * 3);
  const limitX = X + (usable / xmax) * W;
  const H = TOP + 3 * PITCH + 8;

  return (
    <WhatIfFrame
      title="Does the model fit, and for how many people?"
      withLabel="With 4-bit weights"
      withoutLabel="Full 16-bit"
      on={quant}
      onChange={setQuant}
      verdict={
        now.fits ? (
          <>
            {model.label} in {active}-bit needs {fmt.gb(now.weightsGB)} and fits the example {device.short}: {now.users} {now.users === 1 ? 'person' : 'people'} at once, {now.tokS.toFixed(now.tokS < 10 ? 1 : 0)} tokens per second each.
          </>
        ) : (
          <>
            {model.label} in {active}-bit needs {fmt.gb(now.weightsGB)}, but the example {device.short} has only {fmt.gb(usable)} usable. It does not fit: short by {fmt.gb(now.shortByGB)}.
          </>
        )
      }
      controls={
        <>
          <label className="field">
            <span>Model (example sizes)</span>
            <select className="ws-pick" value={mi} onChange={(e) => setMi(+e.target.value)} aria-label="Model size">
              {models.map((m, i) => (
                <option key={m.id} value={i}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Device (example hardware)</span>
            <select className="ws-pick" value={di} onChange={(e) => setDi(+e.target.value)} aria-label="Device">
              {devices.map((d, i) => (
                <option key={d.id} value={i}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </>
      }
    >
      <p className="ws-idea">
        Each weight is a number. Storing it in fewer bits makes the model smaller, so it can fit in a smaller device and leave room for more people.
      </p>
      <svg viewBox={`0 0 380 ${H}`} className="dx-svg wi-svg ws-svg" role="img" aria-label={`Weights memory at 16, 8 and 4 bits for the ${model.label} against ${fmt.gb(usable)} of usable memory on the ${device.label}.`}>
        <text x={limitX > 250 ? limitX : limitX} y={16} textAnchor={limitX > 230 ? 'end' : 'start'} className="ws-svg-b">
          usable memory {fmt.gb(usable)}
        </text>
        <line x1={limitX} x2={limitX} y1={22} y2={H - 6} stroke="var(--ink)" strokeWidth={2} strokeDasharray="4 3" />
        {res.map((r, k) => {
          const y = TOP + k * PITCH;
          const isActive = r.bits === active;
          const clipped = r.weightsGB > xmax;
          const frac = Math.max(0.012, Math.min(1, r.weightsGB / xmax));
          const roomX = X + frac * W;
          return (
            <g key={r.bits} style={{ opacity: isActive ? 1 : 0.72 }}>
              <rect x={0} y={y - 20} width={380} height={PITCH - 4} rx={8} fill="none" stroke={isActive ? 'var(--ink)' : 'none'} strokeWidth={1.6} />
              <text x={X + 4} y={y} className="ws-svg-b">
                {names[r.bits]}: {fmt.gb(r.weightsGB)}
              </text>
              <rect x={X} y={y + 7} width={W} height={20} rx={5} className="ws-track" />
              {r.fits && <rect x={roomX} y={y + 7} width={Math.max(0, limitX - roomX)} height={20} className="ws-good" opacity={0.28} />}
              <motion.rect
                x={X}
                y={y + 7}
                width={W}
                height={20}
                rx={3}
                className={r.fits ? 'ws-good' : 'ws-bad'}
                initial={false}
                animate={{ scaleX: frac }}
                style={{ originX: 0, transformBox: 'fill-box' }}
                transition={{ duration: 0.55, ease: EASE }}
              />
              {clipped && (
                <text x={X + W - 16} y={y + 23} fill="#fff" fontSize={16} fontWeight={700}>
                  »
                </text>
              )}
              <text x={X + 4} y={y + 46} className="ws-svg-t" style={{ fill: isActive ? 'var(--ink)' : undefined }}>
                {r.fits ? `fits: ${r.users} ${r.users === 1 ? 'person' : 'people'} at once, ${r.tokS.toFixed(r.tokS < 10 ? 1 : 0)} tokens/s each` : `does not fit: short by ${fmt.gb(r.shortByGB)}`}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="ws-note">
        Example numbers, not a product spec. Usable memory = memory x 0.9 minus 0.5 GB. Each person has a {CONTEXT_TOKENS.toLocaleString('en-US')}-token conversation whose cache is {fmt.gb(now.kvPerUserGB)} (16-bit cache). A bar that runs off the right edge is cut short and marked with ».
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <p className="ws-note" style={{ marginTop: 0 }}>
          Weights = parameters x bits / 8. People = floor((usable - weights) / cache per person). Speed for one person = {device.bandwidthGBs} GB/s x 0.65 / (weights + one cache).
        </p>
        <div className="ws-tablewrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Bits</th>
                <th>Weights</th>
                <th>Fits</th>
                <th>People</th>
                <th>Tok/s</th>
              </tr>
            </thead>
            <tbody>
              {res.map((r) => (
                <tr key={r.bits} className={r.bits === active ? 'is-now' : ''}>
                  <td>{r.bits}</td>
                  <td>{fmt.gb(r.weightsGB)}</td>
                  <td>{r.fits ? 'yes' : 'no'}</td>
                  <td>{r.users}</td>
                  <td>{r.fits ? r.tokS.toFixed(1) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </WhatIfFrame>
  );
}
