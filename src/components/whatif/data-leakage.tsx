import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { LABEL_NOISE, SHOWN_SEED, SPEAKERS, TEST_SPEAKERS, averageScores, makeClips, neighbour, score, splitByRow, splitBySpeaker } from '../../lib/whatif/data-leakage';

const W = 340;
const H = 300;
const LIM = 1.05;
// rounded so server and browser print identical numbers
const q = (v: number) => Math.round(v * 10) / 10;
const sx = (v: number) => q(((v + LIM) / (2 * LIM)) * W);
const sy = (v: number) => q(H - ((v + LIM) / (2 * LIM)) * H);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const C0 = '#3b6fd8';
const C1 = '#e08a1e';

function Meter({ label, value, bad, drawn }: { label: string; value: number; bad?: boolean; drawn: boolean }) {
  return (
    <div className={`we-bar${drawn ? ' is-top' : ''}`}>
      <span>{label}</span>
      <div className="we-track">
        <motion.div className={`we-fill${bad ? ' is-bad' : ''}`} initial={false} animate={{ width: `${value * 100}%` }} transition={{ duration: 0.45, ease: EASE }} />
      </div>
      <b>{pct(value)}</b>
    </div>
  );
}

/**
 * Speakers record several clips each. A memorising model scores almost perfectly when test clips have siblings in
 * the training set, and much worse on speakers it has never heard. Lines go from each test clip to the training
 * clip the model copied its answer from.
 */
export default function DataLeakageWhatIf() {
  const [bySpeaker, setBySpeaker] = useState(true);
  const [k, setK] = useState(8);

  const clips = useMemo(() => makeClips(k), [k]);
  const rowSplit = useMemo(() => splitByRow(clips, SHOWN_SEED), [clips]);
  const spkSplit = useMemo(() => splitBySpeaker(clips, SHOWN_SEED), [clips]);
  const rowScore = useMemo(() => score(clips, rowSplit), [clips, rowSplit]);
  const spkScore = useMemo(() => score(clips, spkSplit), [clips, spkSplit]);
  const avg = useMemo(() => averageScores(k, 100), [k]);

  const split = bySpeaker ? spkSplit : rowSplit;
  const shown = bySpeaker ? spkScore : rowScore;
  const links = useMemo(
    () => clips.filter((c) => split.test.has(c.id)).map((c) => ({ c, n: neighbour(clips, split, c) })),
    [clips, split],
  );

  return (
    <WhatIfFrame
      title="Speakers, clips and a model that memorises"
      withLabel="Split by speaker"
      withoutLabel="Split by row"
      on={bySpeaker}
      onChange={setBySpeaker}
      verdict={
        bySpeaker ? (
          <>
            Whole speakers are held out, so no test clip has a sibling in training ({spkScore.withSibling} of {spkScore.testCount}). The honest score on new speakers is {pct(spkScore.accuracy)}; a coin flip is 50%.
          </>
        ) : (
          <>
            Split by row, {rowScore.withSibling} of {rowScore.testCount} test clips have a clip from the same speaker in training, so the model just copies it: {pct(rowScore.accuracy)} in the lab. On new speakers the same model scores {pct(spkScore.accuracy)}.
          </>
        )
      }
      controls={
        <label className="field">
          <span>
            Clips per speaker <b>{k}</b>
          </span>
          <input type="range" min={1} max={12} step={1} value={k} onChange={(e) => setK(+e.target.value)} aria-label="How many clips each speaker recorded" />
        </label>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg wi-svg we-svg" role="img" aria-label={`${SPEAKERS} speakers with ${k} clips each, drawn as clusters. ${shown.testCount} test clips are ringed. ${shown.withSibling} of them have a same-speaker clip in training. The model gets ${pct(shown.accuracy)} of the test clips right.`}>
        <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={10} fill="none" className="we-grid" />
        {links.map(({ c, n }) => {
          const ok = shown.correct.get(c.id);
          return <line key={c.id} x1={sx(c.x)} y1={sy(c.y)} x2={sx(n.x)} y2={sy(n.y)} stroke={ok ? '#1f9d6b' : '#d6453d'} strokeWidth={1.3} opacity={0.7} />;
        })}
        {clips.map((c) => {
          const test = split.test.has(c.id);
          const ok = shown.correct.get(c.id);
          const cx = sx(c.x);
          const cy = sy(c.y);
          const fill = c.label === 1 ? C1 : C0;
          const r = test ? 4.4 : 3.2;
          return (
            <g key={c.id} className="we-pt" opacity={test ? 1 : 0.4}>
              {c.label === 1 ? (
                <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill={fill} stroke={test ? (ok ? '#1f9d6b' : '#d6453d') : 'none'} strokeWidth={2.2} />
              ) : (
                <circle cx={cx} cy={cy} r={r} fill={fill} stroke={test ? (ok ? '#1f9d6b' : '#d6453d') : 'none'} strokeWidth={2.2} />
              )}
            </g>
          );
        })}
      </svg>
      <ul className="we-legend" aria-label="Key">
        <li><span className="we-sw is-round" style={{ background: C0 }} /> label A</li>
        <li><span className="we-sw" style={{ background: C1 }} /> label B</li>
        <li><span className="we-sw is-ring" style={{ color: '#1f9d6b' }} /> test clip, right</li>
        <li><span className="we-sw is-ring" style={{ color: '#d6453d' }} /> test clip, wrong</li>
        <li>faded = training clips</li>
      </ul>
      <div className="we-metric">
        <h4>
          Score on the held-back clips <small>{shown.testCount} test clips, 1-nearest-neighbour model</small>
        </h4>
        <Meter label="Lab: split by row" value={rowScore.accuracy} drawn={!bySpeaker} />
        <Meter label="New speakers" value={spkScore.accuracy} bad={spkScore.accuracy < 0.7} drawn={bySpeaker} />
      </div>
      <p className="we-note">
        Example data, made up for this demo: {SPEAKERS} speakers, each with {k} clip{k === 1 ? '' : 's'}; clips from one speaker sit together and share a label. The label follows a simple rule about where the speaker sits, but {pct(LABEL_NOISE)} of speakers break it, so honest accuracy is limited. {TEST_SPEAKERS} speakers' worth of clips are held back. Averaged over 100 different shuffles: <b>{pct(avg.row)}</b> by row, <b>{pct(avg.speaker)}</b> by speaker.
        {k === 1 ? ' With one clip per speaker there are no siblings, so there is nothing to leak: both ways agree.' : ''}
      </p>
    </WhatIfFrame>
  );
}
