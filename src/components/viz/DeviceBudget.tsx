import { useMemo, useState } from 'react';
import { Root } from './shared';
import { DEVICES, MODELS, estimate, fmtBytes, fmtEnergy, fmtHours, fmtTime, modelStats, type Fit } from '../../lib/edge-budget';

const RATES = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

function FitBar({ label, fit, note }: { label: string; fit: Fit; note: string }) {
  const pct = Math.min(fit.used / fit.capacity, 1) * 100;
  return (
    <div className="ea-fit">
      <div className="ea-fit-head">
        <span>{label}</span>
        <b className={fit.ok ? 'ea-ok' : 'ea-bad'}>{fit.ok ? 'fits' : 'too big'}</b>
      </div>
      <div className="ea-track" aria-hidden="true">
        <span className={`ea-fill ${fit.ok ? 'ok' : 'bad'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="ea-fit-num num">
        {fmtBytes(fit.used)} needed, {fmtBytes(fit.capacity)} usable
      </p>
      <p className="ea-fit-note">{note}</p>
    </div>
  );
}

/**
 * Pick a device and a model and see whether the weights and the activation arena fit, how long one inference takes,
 * and what it costs in energy. Every model figure is computed from layer shapes; every device figure is from a
 * vendor document and dated. Speed is peak MACs per second times a slider for how much of the peak is reached.
 */
export default function DeviceBudget() {
  const [deviceId, setDeviceId] = useState('rp2040');
  const [modelId, setModelId] = useState('kws');
  const [float32, setFloat32] = useState(false);
  const [rateIdx, setRateIdx] = useState(3);
  const [eff, setEff] = useState(25);
  const [reserve, setReserve] = useState(25);
  const [battery, setBattery] = useState(200);
  const [typedMw, setTypedMw] = useState('');

  const device = DEVICES.find((d) => d.id === deviceId)!;
  const model = MODELS.find((m) => m.id === modelId)!;
  const stats = useMemo(() => modelStats(model), [model]);
  const bytes = float32 ? 4 : 1;
  const rate = RATES[rateIdx];

  const typed = typedMw.trim() === '' ? null : Number(typedMw) / 1000;
  const typedOk = typed !== null && isFinite(typed) && typed > 0;
  const power = device.powerW === null ? (typedOk ? typed : null) : device.powerW;

  const e = estimate(stats, device, {
    bytesPerValue: bytes,
    rate,
    efficiency: eff / 100,
    reserve: reserve / 100,
    batteryMah: battery,
    batteryVolts: 3,
    powerOverrideW: power,
  });

  const arenaCap = e.nvm ? e.ram.capacity : e.ram.capacity - e.weightBytes;
  const bars = stats.perLayerElems.map((n) => n * bytes);
  const peakBytes = e.arenaBytes;
  const scale = peakBytes * 1.18;
  const capPct = arenaCap > 0 && arenaCap < scale ? (arenaCap / scale) * 100 : null;
  const peakLayer = model.layers[stats.peakLayer];

  const verdict = e.fits
    ? `${model.name} fits on ${device.name}. One inference takes about ${fmtTime(e.seconds)}${e.keepsUp ? '' : ', which is too slow for ' + rate + ' per second'}.`
    : `${model.name} does not fit on ${device.name}: ${[e.nvm && !e.nvm.ok ? 'the weights are too big for non-volatile memory' : '', !e.ram.ok ? 'the working memory is too small' : ''].filter(Boolean).join(' and ')}.`;

  return (
    <Root>
      <div className="viz ea-db">
        <p className="viz-title">Budget balance</p>

        <p className="ea-label" id="ea-db-dev">
          Device
        </p>
        <div className="ea-chips" role="group" aria-labelledby="ea-db-dev">
          {DEVICES.map((d) => (
            <button key={d.id} type="button" className="ea-chip" aria-pressed={d.id === deviceId} onClick={() => setDeviceId(d.id)}>
              <span className="ea-chip-name">{d.name}</span>
              <span className="ea-chip-sub">{d.cls}</span>
            </button>
          ))}
        </div>

        <p className="ea-label" id="ea-db-mod">
          Model
        </p>
        <div className="ea-chips" role="group" aria-labelledby="ea-db-mod">
          {MODELS.map((m) => (
            <button key={m.id} type="button" className="ea-chip" aria-pressed={m.id === modelId} onClick={() => setModelId(m.id)}>
              <span className="ea-chip-name">{m.name}</span>
            </button>
          ))}
          <span className="ea-sep" aria-hidden="true" />
          <button type="button" className="ea-chip" aria-pressed={!float32} onClick={() => setFloat32(false)}>
            <span className="ea-chip-name">int8</span>
          </button>
          <button type="button" className="ea-chip" aria-pressed={float32} onClick={() => setFloat32(true)}>
            <span className="ea-chip-name">float32</span>
          </button>
        </div>
        <p className="ea-cap">{model.blurb}</p>

        <div className="ea-stats num" aria-label="Model figures, computed from its layer shapes">
          <div>
            <b>{fmtBytes(e.weightBytes)}</b>
            <span>weights ({(stats.params / 1e3).toFixed(stats.params >= 1e6 ? 0 : 1)}k values)</span>
          </div>
          <div>
            <b>{fmtBytes(e.arenaBytes)}</b>
            <span>peak activation arena</span>
          </div>
          <div>
            <b>{stats.macs >= 1e8 ? (stats.macs / 1e6).toFixed(0) + ' M' : (stats.macs / 1e6).toFixed(2) + ' M'}</b>
            <span>multiply-accumulates</span>
          </div>
        </div>

        <div className="viz-controls ea-sliders">
          <label className="field">
            <span>
              Inferences per second <b>{rate}</b>
            </span>
            <input type="range" min={0} max={RATES.length - 1} step={1} value={rateIdx} onChange={(ev) => setRateIdx(+ev.target.value)} />
          </label>
          <label className="field">
            <span>
              Share of peak speed reached <b>{eff}%</b>
            </span>
            <input type="range" min={2} max={100} step={1} value={eff} onChange={(ev) => setEff(+ev.target.value)} />
          </label>
          <label className="field">
            <span>
              Memory kept for other firmware <b>{reserve}%</b>
            </span>
            <input type="range" min={0} max={70} step={5} value={reserve} onChange={(ev) => setReserve(+ev.target.value)} />
          </label>
          <label className="field">
            <span>
              Battery (example) <b>{battery} mAh at 3 V</b>
            </span>
            <input type="range" min={20} max={5000} step={10} value={battery} onChange={(ev) => setBattery(+ev.target.value)} />
          </label>
        </div>

        <div className="ea-grid">
          <section className="ea-panel" aria-label="Memory">
            <h4>1. Does it fit?</h4>
            {e.nvm ? (
              <>
                <FitBar label="Weights in flash or MRAM" fit={e.nvm} note={device.nvmLabel} />
                <FitBar label="Activations in SRAM" fit={e.ram} note={device.ramLabel} />
              </>
            ) : (
              <FitBar label="Weights plus activations in RAM" fit={e.ram} note={device.ramLabel} />
            )}
          </section>

          <section className="ea-panel" aria-label="Speed">
            <h4>2. How fast?</h4>
            <p className="ea-big num">{fmtTime(e.seconds)}</p>
            <p className="ea-fit-note">per inference, at {eff}% of a peak of {formatMacs(device.peakMacsPerS)}</p>
            <p className="ea-fit-num num">
              Busy {fmtPct(e.busy * 100)} of the time at {rate} per second:{' '}
              <b className={e.keepsUp ? 'ea-ok' : 'ea-bad'}>{e.keepsUp ? 'keeps up' : 'cannot keep up'}</b>
            </p>
          </section>

          <section className="ea-panel" aria-label="Energy">
            <h4>3. What does it cost?</h4>
            {e.energyJ !== null ? (
              <>
                <p className="ea-big num">{fmtEnergy(e.energyJ)}</p>
                <p className="ea-fit-note">per inference while computing</p>
                <p className="ea-fit-num num">
                  {e.batteryHours !== null ? (
                    <>
                      This stream alone would drain the battery in <b>{fmtHours(e.batteryHours)}</b>.
                    </>
                  ) : (
                    'Mains or rack powered, so no battery figure.'
                  )}
                </p>
              </>
            ) : (
              <p className="ea-fit-note">No documented power figure for this device in this lesson.</p>
            )}
            <p className="ea-fit-note">{device.powerNote}</p>
            {device.powerW === null && (
              <label className="ea-power">
                <span>Your measured active power (mW)</span>
                <input type="number" inputMode="decimal" min={0} step="any" value={typedMw} onChange={(ev) => setTypedMw(ev.target.value)} placeholder="for example 20" />
              </label>
            )}
          </section>
        </div>

        <p className="ea-label">Where the arena comes from: input plus output of each layer</p>
        <div className="ea-chart" role="img" aria-label={`Bar chart of the activation memory each of the ${bars.length} layers needs. The peak is layer ${stats.peakLayer + 1}, ${peakLayer.name}, at ${fmtBytes(peakBytes)}.`}>
          {capPct !== null && (
            <span className="ea-capline" style={{ bottom: `${capPct}%` }}>
              <i>usable SRAM</i>
            </span>
          )}
          {bars.map((b, i) => (
            <span
              key={i}
              className={`ea-bar ${i === stats.peakLayer ? 'peak' : ''} ${b > arenaCap ? 'over' : ''}`}
              style={{ height: `${Math.max((b / scale) * 100, 2)}%` }}
            />
          ))}
        </div>
        <p className="ea-fit-note">
          Layers run left to right. The tallest bar, layer {stats.peakLayer + 1} ({peakLayer.name}), sets the arena: {fmtBytes(peakBytes)}.{' '}
          {capPct === null ? 'Usable memory is far above the chart.' : 'Bars above the dashed line do not fit.'}
        </p>

        <p className="ea-verdict" aria-live="polite">
          {verdict}
        </p>

        <details className="ea-source">
          <summary>Where this device&apos;s numbers come from</summary>
          <p>
            <b>{device.name}</b>, as of {device.asOf}. {device.peakNote}
          </p>
          <p>
            Source:{' '}
            <a href={device.sourceUrl} target="_blank" rel="noopener noreferrer">
              {device.source}
            </a>
            . Memory sizes written as MB or kB are treated as binary (1 MB = 1,048,576 bytes).
          </p>
        </details>

        <p className="viz-cap">
          Model figures are computed from layer shapes (weights and biases counted at one byte in int8, activations the larger of any layer&apos;s input plus output, which suits a simple sequential model). The share of peak speed is your guess: measure on the real chip. Peak figures are ceilings that small models rarely reach on large chips.
        </p>
      </div>
    </Root>
  );
}

function fmtPct(p: number): string {
  if (p >= 100) return Math.round(p).toLocaleString('en-GB') + '%';
  if (p >= 1) return p.toFixed(1) + '%';
  return p.toFixed(3) + '%';
}

function formatMacs(m: number): string {
  if (m >= 1e12) return (m / 1e12).toFixed(m >= 1e14 ? 0 : 1) + ' T MAC/s';
  if (m >= 1e9) return (m / 1e9).toFixed(0) + ' G MAC/s';
  return (m / 1e6).toFixed(0) + ' M MAC/s';
}
