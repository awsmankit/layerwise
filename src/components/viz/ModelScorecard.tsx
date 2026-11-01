import { useState } from 'react';
import { Root } from './shared';
import { EXAMPLE_MODELS, PRESETS, flips, scoreAll, pick, type Criterion, type Weights } from '../../lib/model-scorecard';

const LABEL: Record<Criterion, string> = { quality: 'quality', cost: 'cost', latency: 'latency' };

/** Weigh quality, cost and latency for three invented example models and watch the pick change. */
export default function ModelScorecard() {
  const [w, setW] = useState<Weights>(PRESETS[1].w);
  const [floor, setFloor] = useState(0);
  const scored = scoreAll(EXAMPLE_MODELS, w, floor);
  const best = pick(EXAMPLE_MODELS, w, floor);
  const nameOf = (id: string) => EXAMPLE_MODELS.find((m) => m.id === id)!.name.split(' (')[0];
  const set = (k: Criterion, v: number) => setW({ ...w, [k]: v });

  const fragile = (['quality', 'cost', 'latency'] as Criterion[])
    .map((k) => ({ k, f: flips(EXAMPLE_MODELS, w, k, floor)[0] }))
    .filter((x) => x.f);

  return (
    <Root>
      <div className="viz pr-sc">
        <p className="viz-title">A scorecard for my task (three invented models)</p>
        <div className="pr-presets" role="group" aria-label="Example weightings">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="btn quiet" onClick={() => setW(p.w)} aria-pressed={w.quality === p.w.quality && w.cost === p.w.cost && w.latency === p.w.latency}>{p.label}</button>
          ))}
        </div>
        <div className="viz-controls">
          {(['quality', 'cost', 'latency'] as Criterion[]).map((k) => (
            <label className="field" key={k}>
              <span>Weight on {LABEL[k]} <b>{w[k]}</b></span>
              <input type="range" min={0} max={100} step={5} value={w[k]} onChange={(e) => set(k, +e.target.value)} aria-valuetext={`${w[k]} out of 100`} />
            </label>
          ))}
          <label className="field">
            <span>Hard floor: minimum quality <b>{floor === 0 ? 'none' : floor}</b></span>
            <input type="range" min={0} max={95} step={1} value={floor} onChange={(e) => setFloor(+e.target.value)} aria-valuetext={floor === 0 ? 'no minimum' : `${floor} out of 100`} />
          </label>
        </div>
        <div className="pr-cards" role="status" aria-live="polite">
          {scored.map((s, i) => {
            const m = EXAMPLE_MODELS[i];
            const isPick = best?.id === s.id;
            return (
              <div key={s.id} className={'pr-card' + (isPick ? ' pr-win' : '') + (s.excluded ? ' pr-out' : '')}>
                <p className="pr-card-head">
                  <span className="pr-card-name">{m.name}</span>
                  {isPick && <span className="pr-tag">pick</span>}
                  {s.excluded && <span className="pr-tag pr-tag-out">below floor</span>}
                </p>
                <p className="pr-total">{s.excluded ? 'out' : s.score.toFixed(0)}<small>{s.excluded ? '' : ' out of 100'}</small></p>
                <div className="pr-meter" aria-hidden="true"><i className="pr-ok" style={{ width: `${s.excluded ? 0 : s.score}%` }} /></div>
                <dl className="pr-facts">
                  <div><dt>Quality on my task</dt><dd>{m.quality}</dd></div>
                  <div><dt>Cost per 1,000 requests</dt><dd>${m.costPer1k.toFixed(2)}</dd></div>
                  <div><dt>Time to answer</dt><dd>{m.latencyS.toFixed(1)} s</dd></div>
                </dl>
              </div>
            );
          })}
        </div>
        <div className="pr-result" aria-live="polite">
          {best ? (
            <p className="pr-small" style={{ marginTop: 0 }}>
              Pick with these weights: <b>{nameOf(best.id)}</b>.{' '}
              {fragile.length > 0
                ? fragile.map((x) => `Raise the ${LABEL[x.k]} weight to ${x.f.at} and the pick moves from ${nameOf(x.f.from)} to ${nameOf(x.f.to)}.`).join(' ')
                : 'No single weight, moved on its own from 0 to 100, changes this pick.'}
            </p>
          ) : (
            <p className="pr-small" style={{ marginTop: 0 }}>No model clears the floor. Lower it or test more models.</p>
          )}
        </div>
        <p className="viz-cap">Every model, score and price here is invented. Each criterion is scaled from 0 (worst of the three) to 1 (best of the three), so a small real difference can look large when the models are close. The hard floor is applied before the weights, because a model that fails your quality bar is not a trade-off.</p>
      </div>
    </Root>
  );
}
