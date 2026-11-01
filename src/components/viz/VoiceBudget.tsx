import { useMemo, useState } from 'react';
import { Root, fmt } from './shared';
import { HUMAN_GAP, PRESETS, biggestStage, timeline, timesHumanMean, verdict, type BudgetConfig } from '../../lib/voice-budget';

type NumKey = 'endpointMs' | 'asrMs' | 'llmTtftMs' | 'clauseTokens' | 'tokensPerSecond' | 'ttsMs' | 'modelFirstAudioMs' | 'networkMs' | 'phoneMs';

const SLIDERS: { key: NumKey; label: string; min: number; max: number; step: number; unit: string; only?: 'cascade' | 'speech-to-speech' }[] = [
  { key: 'endpointMs', label: 'Wait to confirm the turn', min: 0, max: 1500, step: 25, unit: 'ms' },
  { key: 'asrMs', label: 'Final transcript after the last word', min: 0, max: 800, step: 10, unit: 'ms', only: 'cascade' },
  { key: 'llmTtftMs', label: 'Language model: first token', min: 50, max: 2000, step: 10, unit: 'ms', only: 'cascade' },
  { key: 'clauseTokens', label: 'Tokens before the first speakable clause', min: 1, max: 40, step: 1, unit: 'tokens', only: 'cascade' },
  { key: 'tokensPerSecond', label: 'Language model speed', min: 10, max: 200, step: 5, unit: 'tokens/s', only: 'cascade' },
  { key: 'ttsMs', label: 'Speech synthesis: first audio', min: 20, max: 800, step: 10, unit: 'ms', only: 'cascade' },
  { key: 'modelFirstAudioMs', label: 'Speech model: first audio', min: 50, max: 1500, step: 10, unit: 'ms', only: 'speech-to-speech' },
  { key: 'networkMs', label: 'Network and playback buffer', min: 0, max: 500, step: 10, unit: 'ms' },
  { key: 'phoneMs', label: 'Phone line (carrier, transcoding)', min: 0, max: 400, step: 10, unit: 'ms' },
];

const unitText = (v: number, unit: string) => (unit === 'ms' ? fmt.ms(v) : `${v} ${unit}`);

const VERDICT_TEXT = {
  'inside-range': 'At or under the slowest average gap between turns that Stivers and colleagues measured in ten languages (469 ms).',
  'slower-than-all-means': 'Slower than the average gap in every language they measured, but under twice the slowest one.',
  'far-slower': 'More than twice the slowest average gap they measured, so far outside what the study found between people.',
} as const;

/**
 * A latency waterfall for one voice-agent reply. All stage times are invented example numbers set by the
 * presets and sliders; the only measured figures on screen are the human turn gaps from Stivers et al. (2009).
 */
export default function VoiceBudget() {
  const [presetId, setPresetId] = useState('naive');
  const [cfg, setCfg] = useState<BudgetConfig>(PRESETS[0].cfg);

  const t = useMemo(() => timeline(cfg), [cfg]);
  const scale = Math.max(1000, Math.ceil((t.heardAt * 1.04) / 250) * 250);
  const pct = (v: number) => `${(v / scale) * 100}%`;
  const big = biggestStage(t.rows);
  const v = verdict(t.heardAt);
  const preset = PRESETS.find((p) => p.id === presetId);

  const pick = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setCfg(p.cfg);
  };
  const set = (patch: Partial<BudgetConfig>) => {
    setPresetId('');
    setCfg((c) => ({ ...c, ...patch }));
  };
  const setMode = (mode: BudgetConfig['mode']) => {
    const base = mode === 'cascade' ? PRESETS[1].cfg : PRESETS[3].cfg;
    setPresetId('');
    setCfg((c) => ({ ...base, networkMs: c.networkMs, phoneMs: c.phoneMs, endpointMs: c.endpointMs }));
  };

  return (
    <Root>
      <div className="viz wm wm-vb">
        <p className="viz-title">Where the milliseconds go in one reply</p>

        <div className="wm-chips" role="group" aria-label="Example setups">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="wm-chip" aria-pressed={presetId === p.id} onClick={() => pick(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="wm-note">{preset ? preset.note : 'Custom settings.'} All stage times are invented example numbers.</p>

        <div className="wm-chips" role="group" aria-label="Architecture">
          <button type="button" className="wm-chip" aria-pressed={cfg.mode === 'cascade'} onClick={() => setMode('cascade')}>
            Cascade: speech to text, model, speech
          </button>
          <button type="button" className="wm-chip" aria-pressed={cfg.mode === 'speech-to-speech'} onClick={() => setMode('speech-to-speech')}>
            One speech-to-speech model
          </button>
          <button type="button" className="wm-chip" aria-pressed={cfg.speculative} onClick={() => set({ speculative: !cfg.speculative })}>
            Start before the turn is confirmed
          </button>
        </div>

        <div className="viz-controls wm-controls">
          {SLIDERS.filter((s) => !s.only || s.only === cfg.mode).map((s) => (
            <label className="field" key={s.key}>
              <span>
                {s.label} <b>{unitText(cfg[s.key], s.unit)}</b>
              </span>
              <input type="range" min={s.min} max={s.max} step={s.step} value={cfg[s.key]} onChange={(e) => set({ [s.key]: +e.target.value } as Partial<BudgetConfig>)} />
            </label>
          ))}
          {cfg.speculative && (
            <label className="field">
              <span>
                Silence before the early start <b>{fmt.ms(cfg.speculativeAfterMs)}</b>
              </span>
              <input type="range" min={50} max={500} step={10} value={cfg.speculativeAfterMs} onChange={(e) => set({ speculativeAfterMs: +e.target.value })} />
            </label>
          )}
        </div>

        <div className="wm-wf" role="img" aria-label={`Waterfall: the first sound arrives ${Math.round(t.heardAt)} milliseconds after the user stops speaking. ${t.rows.map((r) => `${r.label} ${Math.round(r.dur)} milliseconds`).join('; ')}.`}>
          {t.rows.map((r) => (
            <div className="wm-wf-row" key={r.id}>
              <span className="wm-wf-label">{r.label}</span>
              <div className="wm-wf-track">
                <i className="wm-tick wm-tick-mean" style={{ left: pct(HUMAN_GAP.mean) }} aria-hidden="true" />
                <i className="wm-tick wm-tick-slow" style={{ left: pct(HUMAN_GAP.slowestLanguageMean) }} aria-hidden="true" />
                <span className={`wm-bar wm-bar-${r.kind}`} style={{ left: pct(r.start), width: `max(${pct(r.dur)}, ${r.dur > 0 ? 3 : 0}px)` }} />
                <i className="wm-tick wm-tick-heard" style={{ left: pct(t.heardAt) }} aria-hidden="true" />
              </div>
              <span className="wm-wf-ms num">{fmt.ms(r.dur)}</span>
            </div>
          ))}
          <div className="wm-axis" aria-hidden="true">
            <span className="wm-axis-label" />
            <div className="wm-axis-track">
              <span className="wm-axis-tag wm-axis-mean" style={{ left: pct(HUMAN_GAP.mean) }}>
                208
              </span>
              <span className="wm-axis-tag wm-axis-slow" style={{ left: pct(HUMAN_GAP.slowestLanguageMean) }}>
                469
              </span>
              <span className="wm-axis-tag wm-axis-heard" style={{ left: pct(t.heardAt) }}>
                {Math.round(t.heardAt)}
              </span>
            </div>
            <span />
          </div>
        </div>
        <ul className="wm-key" aria-label="Key">
          <li>
            <i className="wm-swatch wm-bar-work" /> work
          </li>
          <li>
            <i className="wm-swatch wm-bar-wait" /> waiting
          </li>
          <li>
            <i className="wm-swatch wm-bar-net" /> network
          </li>
          <li>
            <i className="wm-tick-inline wm-tick-mean" /> 208 ms: mean gap between people
          </li>
          <li>
            <i className="wm-tick-inline wm-tick-slow" /> 469 ms: slowest language mean
          </li>
          <li>
            <i className="wm-tick-inline wm-tick-heard" /> first sound heard
          </li>
        </ul>

        <div className="wm-status" aria-live="polite">
          <b className="num">{fmt.ms(t.heardAt)}</b> after the user stops speaking, the first sound plays: {timesHumanMean(t.heardAt)} times the 208 ms mean gap between people. {VERDICT_TEXT[v]}
          {big && (
            <>
              {' '}
              The largest single block is <b>{big.label.toLowerCase()}</b> at {fmt.ms(big.dur)}.
            </>
          )}
          {cfg.speculative && t.speculativeLeadMs > 0 && (
            <> The early start runs {fmt.ms(t.speculativeLeadMs)} before the turn is confirmed; if the user carries on speaking, that work is thrown away.</>
          )}
        </div>
        <p className="viz-cap">
          People and the timings: Stivers et al. (2009) timed gaps between turns in ten languages. The slowest language mean was Danish, +469 ms; the cross-language mean was +208 ms. They timed gaps in conversation between people, so treat the lines as a reference for what ears expect, not a pass mark.
        </p>
      </div>
    </Root>
  );
}
