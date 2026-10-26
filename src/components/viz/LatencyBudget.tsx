import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE, fmt } from './shared';

const presets = [
  { label: 'Real-time audio', budget: 10, rtt: 40, cloud: 5, device: 4 },
  { label: 'Voice assistant', budget: 800, rtt: 60, cloud: 500, device: 900 },
  { label: 'Photo enhancement', budget: 2000, rtt: 80, cloud: 300, device: 1200 },
];

export default function LatencyBudget() {
  const [budget, setBudget] = useState(10);
  const [rtt, setRtt] = useState(40);
  const [cloud, setCloud] = useState(5);
  const [device, setDevice] = useState(4);

  const cloudTotal = rtt + cloud;
  const scale = Math.max(budget, cloudTotal, device) * 1.15;
  const pct = (v: number) => `${(v / scale) * 100}%`;

  const row = (name: string, parts: { label: string; v: number; cls: string }[]) => {
    const total = parts.reduce((a, b) => a + b.v, 0);
    const ok = total <= budget;
    return (
      <div className="lb-row">
        <span className="lb-name">{name}</span>
        <div className="lb-track">
          {parts.map((p) => (
            <motion.span key={p.label} className={`lb-part ${p.cls}`} initial={false} animate={{ width: pct(p.v) }} transition={{ duration: 0.4, ease: EASE }} title={`${p.label}: ${fmt.ms(p.v)}`} />
          ))}
          <span className="lb-budget" style={{ left: pct(budget) }} aria-hidden="true" />
        </div>
        <span className={`lb-state num ${ok ? 'ok' : 'over'}`}>
          {fmt.ms(total)} {ok ? 'within budget' : 'over budget'}
        </span>
      </div>
    );
  };

  return (
    <Root>
      <div className="viz lb">
        <div className="cc-presets" role="group" aria-label="Scenarios">
          {presets.map((s) => (
            <button
              key={s.label}
              type="button"
              className="tc-tab"
              onClick={() => {
                setBudget(s.budget);
                setRtt(s.rtt);
                setCloud(s.cloud);
                setDevice(s.device);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="viz-controls">
          <label className="field">
            <span>
              Latency budget <b>{fmt.ms(budget)}</b>
            </span>
            <input type="range" min={5} max={3000} step={5} value={budget} onChange={(e) => setBudget(+e.target.value)} />
          </label>
          <label className="field">
            <span>
              Network round trip <b>{fmt.ms(rtt)}</b>
            </span>
            <input type="range" min={0} max={400} step={5} value={rtt} onChange={(e) => setRtt(+e.target.value)} />
          </label>
          <label className="field">
            <span>
              Cloud compute <b>{fmt.ms(cloud)}</b>
            </span>
            <input type="range" min={1} max={2000} step={1} value={cloud} onChange={(e) => setCloud(+e.target.value)} />
          </label>
          <label className="field">
            <span>
              On-device compute <b>{fmt.ms(device)}</b>
            </span>
            <input type="range" min={1} max={2000} step={1} value={device} onChange={(e) => setDevice(+e.target.value)} />
          </label>
        </div>
        {row('Cloud', [
          { label: 'Network round trip', v: rtt, cls: 'net' },
          { label: 'Cloud compute', v: cloud, cls: 'cmp' },
        ])}
        {row('On device', [{ label: 'On-device compute', v: device, cls: 'dev' }])}
        <p className="viz-cap">
          The vertical line is your budget. Scenario numbers are illustrative. Network time varies from request to request, so budget for the slow tail rather than the average, and remember that on-device compute also costs battery and heat.
        </p>
      </div>
    </Root>
  );
}
