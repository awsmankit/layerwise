import { useState } from 'react';
import { Root } from './shared';
import { DELAY_MARKERS, DELAY_PRESETS, totalDelayMs, windowMs } from '../../lib/hearing';

/*
 * A delay adder. The learner sets the analysis window, look-ahead and everything else, and a bar shows the total
 * against delay figures quoted from the literature. "Everything else" is the learner's own guess: converters and
 * other processing depend on the hardware, and no figure for them is claimed here.
 */

const MAX_MS = 50;

export default function DelayBudget() {
  const [samples, setSamples] = useState(512);
  const [rate, setRate] = useState(16000);
  const [look, setLook] = useState(0);
  const [other, setOther] = useState(1);
  const [pick, setPick] = useState('stft32');

  const win = windowMs(samples, rate);
  const total = totalDelayMs(win, look, other);
  const pct = (ms: number) => `${Math.min(100, (ms / MAX_MS) * 100)}%`;
  const preset = DELAY_PRESETS.find((p) => p.id === pick);

  const choose = (id: string) => {
    const p = DELAY_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPick(id);
    setRate(16000);
    setSamples(Math.round((p.windowMs / 1000) * 16000));
    setLook(p.lookaheadMs);
  };

  const beyond = DELAY_MARKERS.filter((m) => total > m.ms);
  const verdict =
    beyond.length === 0
      ? `${total.toFixed(1)} ms is under every figure listed.`
      : `${total.toFixed(1)} ms is past ${beyond.length === 1 ? 'one' : beyond.length === 2 ? 'two' : beyond.length === 3 ? 'three' : 'all four'} of the figures below. The first it crosses: ${beyond[0].label}.`;

  return (
    <Root>
      <div className="viz aua aua-delay">
        <p className="viz-title">Delay budget: how long before the sound comes back out?</p>
        <div className="aua-chips" role="group" aria-label="Example designs">
          {DELAY_PRESETS.map((p) => (
            <button key={p.id} type="button" className={`btn quiet aua-pick ${pick === p.id ? 'on' : ''}`} aria-pressed={pick === p.id} onClick={() => choose(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        {preset && <p className="aua-hint">{preset.source}.</p>}

        <div className="aua-controls">
          <label className="field">
            <span>
              Analysis window <b>{samples} samples = {win.toFixed(1)} ms</b>
            </span>
            <input type="range" min={16} max={1024} step={16} value={samples} onChange={(e) => { setSamples(+e.target.value); setPick(''); }} aria-label="Analysis window in samples" aria-valuetext={`${samples} samples, ${win.toFixed(1)} milliseconds`} />
          </label>
          <label className="field">
            <span>
              Sampling rate <b>{rate.toLocaleString('en-GB')} Hz</b>
            </span>
            <input type="range" min={8000} max={48000} step={8000} value={rate} onChange={(e) => { setRate(+e.target.value); setPick(''); }} aria-label="Sampling rate in hertz" aria-valuetext={`${rate} hertz`} />
          </label>
          <label className="field">
            <span>
              Look-ahead <b>{look} ms</b>
            </span>
            <input type="range" min={0} max={20} step={1} value={look} onChange={(e) => { setLook(+e.target.value); setPick(''); }} aria-label="Look-ahead in milliseconds" aria-valuetext={`${look} milliseconds`} />
          </label>
          <label className="field">
            <span>
              Everything else (your guess) <b>{other} ms</b>
            </span>
            <input type="range" min={0} max={10} step={0.5} value={other} onChange={(e) => setOther(+e.target.value)} aria-label="Other delay in milliseconds" aria-valuetext={`${other} milliseconds`} />
          </label>
        </div>

        <div className="aua-bar" role="img" aria-label={`Total delay ${total.toFixed(1)} milliseconds: window ${win.toFixed(1)}, look-ahead ${look}, other ${other}.`}>
          <div className="aua-seg aua-seg-win" style={{ width: pct(win) }} />
          <div className="aua-seg aua-seg-look" style={{ width: pct(look) }} />
          <div className="aua-seg aua-seg-other" style={{ width: pct(other) }} />
          {DELAY_MARKERS.map((m) => (
            <span key={m.ms} className="aua-mark" style={{ left: pct(m.ms) }} aria-hidden="true" />
          ))}
        </div>
        <div className="aua-bar-scale" aria-hidden="true">
          <span>0</span>
          <span>10</span>
          <span>20</span>
          <span>30</span>
          <span>40</span>
          <span>50 ms</span>
        </div>
        <p className="aua-axis-cap">Bar: window, then look-ahead, then everything else. Ticks mark the figures below.</p>
        <p className="aua-say" aria-live="polite">
          {verdict}
        </p>
        <ul className="aua-marklist">
          {DELAY_MARKERS.map((m) => (
            <li key={m.ms} className={total > m.ms ? 'aua-over' : ''}>
              <b>{m.label}.</b> {m.note}.
            </li>
          ))}
        </ul>
        <p className="aua-axis-cap">
          The rule used here: a transform-based processor cannot finish a frame until the whole window has arrived, so the window length is roughly a floor on the delay (a longer window means more delay, as in the Clarity entry's note that reconstruction latency equals window size unless asymmetric windows are used). The delay figures come from listening tests with particular set-ups, such as a person hearing their own voice through the device, and are not limits for every product.
        </p>
      </div>
    </Root>
  );
}
