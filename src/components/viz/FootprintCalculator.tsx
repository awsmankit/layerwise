import { useState } from 'react';
import { Root } from './shared';
import {
  GRID,
  KINDS,
  KETTLE_WH,
  PHONE_CHARGE_WH,
  US_HOME_KWH_YEAR,
  WATER_ML_PER_WH,
  fmtNum,
  footprint,
  impliedGramsPerKwh,
  kettleBoils,
  ledHours,
  phoneCharges,
  requestsToMatch,
  shareOfUsHome,
  training,
  type Range,
} from '../../lib/ai-footprint';

/*
 * Footprint calculator: ranges, never a single number. Tab 1 turns requests per day into a range of
 * energy, carbon and water. Tab 2 does power x time for a training run, using the figures Meta
 * published on the Llama 3.1 model card. The arithmetic lives in lib/ai-footprint.ts (unit-tested).
 * Every input range is from a source named in the lesson; the calculator is an illustration.
 */

const SCALES = [
  { id: 'me', label: 'One person', n: 20 },
  { id: 'class', label: 'A class of 30', n: 600 },
  { id: 'million', label: 'A million users', n: 20_000_000 },
] as const;

const TRAIN_PRESETS = [
  { id: '405', label: 'Llama 3.1 405B', hours: 30.84, watts: 700, overhead: 1, grid: 414, note: 'Meta reports 30.84 million GPU hours, 700 W per GPU and 8,930 tonnes CO2e (location-based).' },
  { id: '8', label: 'Llama 3.1 8B', hours: 1.46, watts: 700, overhead: 1, grid: 411, note: 'Meta reports 1.46 million GPU hours, 700 W per GPU and 420 tonnes CO2e (location-based).' },
] as const;

const GRID_MARKS = [
  { g: GRID.low, text: `${GRID.low}: wind or nuclear` },
  { g: GRID.mid, text: `${GRID.mid}: world average, 2025` },
  { g: GRID.high, text: `${GRID.high}: coal power` },
];

const AXIS_MIN = -3; // 10^-3 Wh
const AXIS_MAX = 9; // 10^9 Wh
const TICKS = [
  { e: -3, text: '1 mWh' },
  { e: 0, text: '1 Wh' },
  { e: 3, text: '1 kWh' },
  { e: 6, text: '1 MWh' },
  { e: 9, text: '1 GWh' },
];
const pos = (wh: number) => {
  if (wh <= 0) return 0;
  const p = (Math.log10(wh) - AXIS_MIN) / (AXIS_MAX - AXIS_MIN);
  return Math.round(Math.min(1, Math.max(0, p)) * 1000) / 10;
};

const whText = (wh: number) => {
  if (wh >= 1e9) return `${fmtNum(wh / 1e9)} GWh`;
  if (wh >= 1e6) return `${fmtNum(wh / 1e6)} MWh`;
  if (wh >= 1e3) return `${fmtNum(wh / 1e3)} kWh`;
  return `${fmtNum(wh)} Wh`;
};
const kgText = (kg: number) => (kg >= 1000 ? `${fmtNum(kg / 1000)} tonnes` : `${fmtNum(kg)} kg`);
const litreText = (l: number) => (l >= 1e6 ? `${fmtNum(l / 1e6)} million litres` : `${fmtNum(l)} litres`);

function RangeRow({ label, r, fmt }: { label: string; r: Range; fmt: (x: number) => string }) {
  return (
    <div className="wrc-row">
      <dt>{label}</dt>
      <dd>
        <span className="wrc-range">
          {fmt(r.low)} to {fmt(r.high)}
        </span>
        <span className="wrc-mid">middle of the range: {fmt(r.mid)}</span>
      </dd>
    </div>
  );
}

function Everyday() {
  const [requests, setRequests] = useState<number>(20);
  const [kindId, setKindId] = useState<string>('text');
  const kind = KINDS.find((k) => k.id === kindId) ?? KINDS[0];
  const n = Math.max(0, requests);
  const f = footprint({ requestsPerDay: n, wh: kind.wh });
  const day = f.whPerDay;

  return (
    <div>
      <p className="wrc-note">
        Example inputs, not measurements. Pick how much AI is used and what kind. The answer is a range because the published figures disagree.
      </p>

      <h4 className="wrc-h">1. How many requests a day?</h4>
      <div className="wrc-pills" role="group" aria-label="Who is using it">
        {SCALES.map((s) => (
          <button key={s.id} type="button" className="btn quiet" aria-pressed={requests === s.n} onClick={() => setRequests(s.n)}>
            {s.label} ({s.n.toLocaleString('en-GB')})
          </button>
        ))}
      </div>
      <label className="field wrc-field">
        <span>Requests per day</span>
        <input type="number" inputMode="numeric" min={0} step={1} value={requests} onChange={(e) => setRequests(Math.max(0, Math.floor(+e.target.value || 0)))} />
      </label>

      <h4 className="wrc-h">2. What kind of request?</h4>
      <div className="wrc-pills wrc-kinds" role="group" aria-label="Kind of request">
        {KINDS.map((k) => (
          <button key={k.id} type="button" className="btn quiet" aria-pressed={kindId === k.id} onClick={() => setKindId(k.id)}>
            {k.label}
          </button>
        ))}
      </div>
      <p className="wrc-small">
        Energy per request in the sources: <b>{fmtNum(kind.wh[0])} to {fmtNum(kind.wh[1])} Wh</b>. {kind.boundary}
      </p>

      <h4 className="wrc-h">3. The estimate</h4>
      <div role="status" aria-live="polite">
        <dl className="wrc-results">
          <RangeRow label="Energy per day" r={day} fmt={whText} />
          <RangeRow label="Energy per year" r={{ low: f.kwhPerYear.low * 1000, mid: f.kwhPerYear.mid * 1000, high: f.kwhPerYear.high * 1000 }} fmt={whText} />
          <RangeRow label="Carbon per year (CO2e)" r={f.kgCo2PerYear} fmt={kgText} />
          <RangeRow label="On-site cooling water per year" r={f.litresWaterPerYear} fmt={litreText} />
        </dl>

        <div
          className="wrc-axis"
          role="img"
          aria-label={`Energy per day on a log scale: from ${whText(day.low)} to ${whText(day.high)}, with the middle of the range at ${whText(day.mid)}. Each tick is a thousand times the one before.`}
        >
          <div className="wrc-track">
            {n > 0 && (
              <>
                <span className="wrc-bar" style={{ left: `${pos(day.low)}%`, width: `${Math.max(0.8, pos(day.high) - pos(day.low))}%` }} />
                <span className="wrc-pin" style={{ left: `${pos(day.mid)}%` }} />
              </>
            )}
            {TICKS.map((t) => (
              <i key={t.e} className="wrc-tick" style={{ left: `${((t.e - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * 100}%` }} />
            ))}
          </div>
          <div className="wrc-ticklabels" aria-hidden="true">
            {TICKS.map((t) => (
              <span key={t.e} style={{ left: `${((t.e - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * 100}%` }}>
                {t.text}
              </span>
            ))}
          </div>
        </div>
        <p className="viz-cap">
          Energy per day on a log scale: each tick is 1,000 times the one before. The bar is the range; the line is the middle of the range, not a best estimate.
        </p>

        {n > 0 && (
          <p className="wrc-compare">
            For scale, per day: about {fmtNum(ledHours(day.low))} to {fmtNum(ledHours(day.high))} hours of a 10 W LED bulb, {fmtNum(phoneCharges(day.low))} to {fmtNum(phoneCharges(day.high))} phone charges ({PHONE_CHARGE_WH} Wh each), or {fmtNum(kettleBoils(day.low))} to {fmtNum(kettleBoils(day.high))} boils of a litre of water in a kettle (about {Math.round(KETTLE_WH)} Wh each). Over a year that is {fmtNum(shareOfUsHome(f.kwhPerYear.low) * 100)}% to {fmtNum(shareOfUsHome(f.kwhPerYear.high) * 100)}% of one US home&rsquo;s electricity ({US_HOME_KWH_YEAR.toLocaleString('en-GB')} kWh a year).
          </p>
        )}
      </div>

      <details className="wrc-details">
        <summary>The assumptions behind these numbers</summary>
        <ul>
          <li>
            <b>Energy per request.</b> {kind.source}
          </li>
          <li>
            <b>Carbon.</b> Energy times grid intensity, in grams of CO2e per kWh: {GRID.low} (lowest) to {GRID.high} (highest), {GRID.mid} in the middle. {GRID.sources}
          </li>
          <li>
            <b>Water.</b> About {WATER_ML_PER_WH[0]} to {WATER_ML_PER_WH[1]} mL per Wh of on-site cooling water, worked out from two company disclosures in 2025 (Google, 0.26 mL for 0.24 Wh; OpenAI, 0.000085 US gallons for 0.34 Wh). Other sites differ, and counting the water behind the electricity and the chips gives far larger figures.
          </li>
          <li>
            <b>Everything is held constant over a year</b> (365 days, same grid, same hardware). Real use is not.
          </li>
        </ul>
      </details>
    </div>
  );
}

function Training() {
  const [presetId, setPresetId] = useState<string>('405');
  const preset = TRAIN_PRESETS.find((p) => p.id === presetId);
  const [hours, setHours] = useState<number>(TRAIN_PRESETS[0].hours);
  const [watts, setWatts] = useState<number>(700);
  const [overhead, setOverhead] = useState<number>(1);
  const [grid, setGrid] = useState<number>(TRAIN_PRESETS[0].grid);
  const [kindId, setKindId] = useState<string>('text');
  const kind = KINDS.find((k) => k.id === kindId) ?? KINDS[0];

  const pick = (id: string) => {
    const p = TRAIN_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setHours(p.hours);
    setWatts(p.watts);
    setOverhead(p.overhead);
    setGrid(p.grid);
  };
  const edited = () => setPresetId('');

  const t = training({ gpuHours: hours * 1e6, wattsPerGpu: watts, overhead, gridGPerKwh: grid });
  const homes = (t.mwh * 1000) / US_HOME_KWH_YEAR;
  const reqLow = requestsToMatch(t.mwh, kind.wh[1]);
  const reqHigh = requestsToMatch(t.mwh, kind.wh[0]);

  return (
    <div>
      <p className="wrc-note">
        Power times time. A training run keeps thousands of chips busy for weeks. The defaults are the figures Meta published for two Llama 3.1 models; change anything to see what moves.
      </p>
      <div className="wrc-pills" role="group" aria-label="Training run presets">
        {TRAIN_PRESETS.map((p) => (
          <button key={p.id} type="button" className="btn quiet" aria-pressed={presetId === p.id} onClick={() => pick(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      {preset && <p className="wrc-small">{preset.note}</p>}

      <div className="viz-controls wrc-controls">
        <label className="field">
          <span>
            GPU hours <b>{fmtNum(hours)} million</b>
          </span>
          <input type="range" min={0.1} max={50} step={0.1} value={hours} onChange={(e) => { setHours(+e.target.value); edited(); }} aria-valuetext={`${hours} million GPU hours`} />
        </label>
        <label className="field">
          <span>
            Power per GPU <b>{watts} W</b>
          </span>
          <input type="range" min={100} max={1000} step={50} value={watts} onChange={(e) => { setWatts(+e.target.value); edited(); }} />
        </label>
        <label className="field">
          <span>
            Overhead factor <b>{overhead.toFixed(2)}</b>
          </span>
          <input type="range" min={1} max={1.6} step={0.01} value={overhead} onChange={(e) => { setOverhead(+e.target.value); edited(); }} aria-valuetext={`overhead factor ${overhead.toFixed(2)}`} />
        </label>
        <label className="field">
          <span>
            Grid <b>{grid} g CO2e per kWh</b>
          </span>
          <input type="range" min={10} max={850} step={1} value={grid} onChange={(e) => { setGrid(+e.target.value); edited(); }} />
        </label>
      </div>
      <p className="wrc-small">
        Reference grids: {GRID_MARKS.map((m) => m.text).join('; ')}. An overhead factor of 1 means the power figure already includes cooling and power conversion, as Meta says its figure does; Google reports a fleet average of 1.09 for 2025.
      </p>

      <div role="status" aria-live="polite">
        <dl className="wrc-results">
          <div className="wrc-row">
            <dt>Chip energy</dt>
            <dd>
              <span className="wrc-range">{fmtNum(t.itMwh)} MWh</span>
              <span className="wrc-mid">{hours.toFixed(2)} million GPU hours x {watts} W</span>
            </dd>
          </div>
          <div className="wrc-row">
            <dt>With overhead</dt>
            <dd>
              <span className="wrc-range">{fmtNum(t.mwh)} MWh</span>
              <span className="wrc-mid">about {fmtNum(homes)} US homes for a year</span>
            </dd>
          </div>
          <div className="wrc-row">
            <dt>Carbon</dt>
            <dd>
              <span className="wrc-range">{fmtNum(t.tonnes)} tonnes CO2e</span>
              <span className="wrc-mid">at {grid} g per kWh</span>
            </dd>
          </div>
        </dl>
        <p className="wrc-compare">
          Check: Meta&rsquo;s 405B figures of 8,930 tonnes over {fmtNum(21588)} MWh imply {fmtNum(impliedGramsPerKwh(8930, 21588))} g per kWh, a grid close to the 2025 world average of {GRID.mid}. Meta also reports 0 tonnes on a market-based count, because it buys renewable electricity to match its use. The two counts answer different questions.
        </p>
        <h4 className="wrc-h">Training is paid once. Use keeps going.</h4>
        <div className="wrc-pills wrc-kinds" role="group" aria-label="Kind of request for the comparison">
          {KINDS.slice(0, 3).map((k) => (
            <button key={k.id} type="button" className="btn quiet" aria-pressed={kindId === k.id} onClick={() => setKindId(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <p className="wrc-compare">
          At {fmtNum(kind.wh[0])} to {fmtNum(kind.wh[1])} Wh a request, the energy of this training run is matched after about <b>{fmtNum(reqLow)} to {fmtNum(reqHigh)} requests</b>. That is an illustration of scale: it mixes one model&rsquo;s training with another model&rsquo;s use. The IEA (April 2026) says the balance of AI-related energy use has already shifted decisively from training to inference.
        </p>
      </div>
    </div>
  );
}

export default function FootprintCalculator() {
  const [tab, setTab] = useState<'use' | 'train'>('use');
  return (
    <Root>
      <div className="viz wrc">
        <p className="viz-title">Footprint calculator: ranges, not a headline number</p>
        <div className="wrc-tabs" role="group" aria-label="Which calculator">
          <button type="button" className="btn quiet" aria-pressed={tab === 'use'} onClick={() => setTab('use')}>
            Everyday use
          </button>
          <button type="button" className="btn quiet" aria-pressed={tab === 'train'} onClick={() => setTab('train')}>
            One training run
          </button>
        </div>
        {tab === 'use' ? <Everyday /> : <Training />}
      </div>
    </Root>
  );
}
