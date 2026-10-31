import { useState } from 'react';
import { Root } from './shared';
import { convParams, denseParams } from '../../lib/convolution';

const SIZES = [
  { id: 's', side: 28, channels: 1, label: '28 × 28, grey', note: 'a handwritten digit' },
  { id: 'm', side: 224, channels: 3, label: '224 × 224, colour', note: 'a common size for photo models' },
  { id: 'l', side: 1024, channels: 3, label: '1024 × 1024, colour', note: 'a modest phone photo' },
] as const;

const OUT = 1000;
const FILTERS = 64;
const fmt = (n: number) => n.toLocaleString('en-GB');

export default function ParamSavings() {
  const [i, setI] = useState(1);
  const s = SIZES[i];
  const inputs = s.side * s.side * s.channels;
  const dense = denseParams(inputs, OUT);
  const conv = convParams(3, s.channels, FILTERS);
  const ratio = Math.round(dense / conv);
  const maps = s.side * s.side * FILTERS;
  const bar = (n: number) => `${Math.max(1.5, (Math.log10(n) / 10) * 100)}%`;

  return (
    <Root>
      <div className="viz db">
        <p className="viz-title">Counting the weights</p>
        <div className="db-row" role="group" aria-label="Picture size">
          <span className="db-label">Picture</span>
          {SIZES.map((x, k) => (
            <button key={x.id} type="button" className="db-chip" aria-pressed={i === k} onClick={() => setI(k)}>
              {x.label}
            </button>
          ))}
        </div>
        <p className="db-blurb">
          {s.note[0].toUpperCase() + s.note.slice(1)}: <b>{fmt(inputs)}</b> numbers go in.
        </p>

        <div className="db-count" aria-live="polite">
          <div className="db-count-row">
            <p className="db-count-t">Plain layer, {fmt(OUT)} units, each wired to every input</p>
            <p className="db-count-n">{fmt(dense)} weights</p>
            <div className="db-bar" aria-hidden="true"><span style={{ width: bar(dense) }} /></div>
          </div>
          <div className="db-count-row">
            <p className="db-count-t">Convolution layer, {FILTERS} filters of 3 × 3 × {s.channels}</p>
            <p className="db-count-n">{fmt(conv)} weights</p>
            <div className="db-bar db-bar-ok" aria-hidden="true"><span style={{ width: bar(conv) }} /></div>
          </div>
          <p className="db-count-sum">
            About <b>{fmt(ratio)} times fewer</b> weights. The filters are reused at every position, so the picture&rsquo;s size does not change the count. The convolution layer also hands on {FILTERS} feature maps of {s.side} × {s.side} ({fmt(maps)} numbers); the plain layer hands on {fmt(OUT)}.
          </p>
        </div>

        <p className="viz-cap">
          Weights include one bias per unit or filter. The two layers are not doing the same job, so read this as a measure of cost for a first layer, not a contest. Bars use a log scale, so they understate the gap.
        </p>
      </div>
    </Root>
  );
}
