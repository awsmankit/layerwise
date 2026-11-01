import { useMemo, useState } from 'react';
import { Root } from './shared';
import { LABEL_COUNTS, pretrain, transferCurve, type Domain } from '../../lib/selfsup';

const W = 290;
const H = 220;
const L = 44;
const R = 10;
const T0 = 12;
const B0 = 40;
const LO = 0.3;
const px = (i: number) => Math.round((L + (i / (LABEL_COUNTS.length - 1)) * (W - L - R)) * 10) / 10;
const py = (a: number) => Math.round((T0 + (1 - (a - LO) / (1 - LO)) * (H - T0 - B0)) * 10) / 10;
const pct = (a: number) => `${Math.round(a * 100)}%`;

/**
 * A frozen feature map from contrastive pretraining against training from scratch, on small labelled sets.
 * Both sides use the same simple classifier; only its input differs. Averaged over 16 random draws of the
 * labelled examples, scored on 300 fresh items.
 */
export default function TransferLab() {
  const [aug, setAug] = useState<1 | 0>(1);
  const [domain, setDomain] = useState<Domain>('source');
  const [idx, setIdx] = useState(0);

  const weights = useMemo(() => pretrain(aug), [aug]);
  const curve = useMemo(() => transferCurve(weights, domain), [weights, domain]);
  const cur = curve[idx];
  const frozenPts = curve.map((c, i) => `${px(i).toFixed(1)},${py(c.frozen).toFixed(1)}`).join(' ');
  const scratchPts = curve.map((c, i) => `${px(i).toFixed(1)},${py(c.scratch).toFixed(1)}`).join(' ');
  const diff = cur.frozen - cur.scratch;

  const story =
    domain === 'shifted'
      ? 'The new task keeps its class signal in the two numbers that pretraining learned to ignore. The frozen features throw that signal away, so more labels do not help them. Training from scratch finds it.'
      : aug === 0
        ? 'This feature map was pretrained without augmentation, so it leaned on the background shortcut. It helps a little with few labels, but it is a weak starting point.'
        : diff > 0.05
          ? 'With only a few labels the frozen, pretrained features win clearly. Training from scratch has to find the useful numbers from very few examples, and the random background numbers mislead it.'
          : 'With this many labels the two are close. Labels have taught the from-scratch model what the pretraining already knew.';

  return (
    <Root>
      <div className="viz wa-xfer">
        <p className="viz-title">Reuse a feature map, or learn from scratch?</p>

        <div className="wa-row" role="group" aria-label="How the feature map was pretrained">
          <span className="wa-lab-t">Pretraining</span>
          <button type="button" className="wa-chip" aria-pressed={aug === 1} onClick={() => setAug(1)}>
            Strong augmentation
          </button>
          <button type="button" className="wa-chip" aria-pressed={aug === 0} onClick={() => setAug(0)}>
            No augmentation
          </button>
        </div>
        <div className="wa-row" role="group" aria-label="The new task">
          <span className="wa-lab-t">New task</span>
          <button type="button" className="wa-chip" aria-pressed={domain === 'source'} onClick={() => setDomain('source')}>
            Like the pretraining data
          </button>
          <button type="button" className="wa-chip" aria-pressed={domain === 'shifted'} onClick={() => setDomain('shifted')}>
            Different kind of data
          </button>
        </div>

        <label className="wa-slide">
          <span>
            Labelled examples <b>{cur.n}</b> ({cur.n / 3} per class)
          </span>
          <input type="range" min={0} max={LABEL_COUNTS.length - 1} step={1} value={idx} onChange={(e) => setIdx(Number(e.target.value))} aria-label="Number of labelled examples" aria-valuetext={`${cur.n} labelled examples`} />
        </label>

        <ul className="wa-legend" aria-hidden="true">
          <li>
            <i className="wa-sw wa-sw-lstm" /> Frozen features + new classifier
          </li>
          <li>
            <i className="wa-sw wa-sw-rnn" /> From scratch on the raw numbers
          </li>
        </ul>
        <svg className="wa-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Accuracy against number of labelled examples. With ${cur.n} labels, frozen features reach ${pct(cur.frozen)} and training from scratch reaches ${pct(cur.scratch)}.`}>
          {[0.4, 0.6, 0.8, 1].map((a) => (
            <g key={a}>
              <path d={`M${L} ${py(a)} H${W - R}`} className="wa-grid" />
              <text x={L - 6} y={py(a) + 4} textAnchor="end" className="wa-t">
                {pct(a)}
              </text>
            </g>
          ))}
          <path d={`M${L} ${py(1 / 3)} H${W - R}`} className="wa-chance" />
          <text x={W - R} y={py(1 / 3) - 5} textAnchor="end" className="wa-t">
            chance 33%
          </text>
          <path d={`M${px(idx)} ${T0} V${H - B0}`} className="wa-cursor" />
          <polyline points={scratchPts} className="wa-line wa-line-rnn" />
          <polyline points={frozenPts} className="wa-line wa-line-lstm" />
          {curve.map((c, i) => (
            <g key={c.n}>
              <circle cx={px(i)} cy={py(c.scratch)} r={i === idx ? 5 : 3} className="wa-dot wa-dot-rnn" />
              <circle cx={px(i)} cy={py(c.frozen)} r={i === idx ? 5 : 3} className="wa-dot wa-dot-lstm" />
              <text x={px(i)} y={H - 22} textAnchor="middle" className="wa-t">
                {c.n}
              </text>
            </g>
          ))}
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" className="wa-t">
            labelled examples
          </text>
        </svg>

        <p className="wa-status" aria-live="polite">
          With <b>{cur.n}</b> labels: frozen features <b>{pct(cur.frozen)}</b>, from scratch <b>{pct(cur.scratch)}</b>. {story}
        </p>
        <details className="wa-details">
          <summary>All the numbers</summary>
          <table className="wa-table">
            <thead>
              <tr>
                <th scope="col">Labels</th>
                <th scope="col">Frozen features</th>
                <th scope="col">From scratch</th>
              </tr>
            </thead>
            <tbody>
              {curve.map((c) => (
                <tr key={c.n}>
                  <th scope="row">{c.n}</th>
                  <td>{pct(c.frozen)}</td>
                  <td>{pct(c.scratch)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <p className="viz-cap">
          Made-up toy data, three classes, four numbers per item (the same kind as the contrastive demo above). The feature map is the contrastive encoder from that demo, trained for 150 steps on 36 unlabelled items and then frozen. Both sides use the same simple
          classifier (softmax regression); only the input differs. Each point is an average over 16 random draws of the labelled examples, scored on 300 fresh items. The numbers come from this toy only and say nothing about real data.
        </p>
      </div>
    </Root>
  );
}
