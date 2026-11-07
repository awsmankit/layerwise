import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  STRENGTHS,
  TRAIN_N,
  bigPhotos,
  accuracy,
  curve,
  learn,
  scoreTests,
  shownPhotos,
  type Bg,
} from '../../lib/whatif/shortcut-learning';

const r1 = (v: number) => Math.round(v * 10) / 10;
const pc = (v: number) => `${Math.round(v * 100)}%`;

const SNOW_DOTS: [number, number][] = [[10, 8], [26, 20], [44, 6], [60, 24], [72, 10], [18, 36], [52, 40], [68, 44], [34, 50], [8, 52]];
const TUFTS = [8, 24, 40, 56, 70];

/** One photo: a background (snow or grass) with an animal in front. Pointier ears mean a more wolf-like look. */
function Photo({ bg, look, label }: { bg: Bg; look: number; label: string }) {
  const tip = r1(44 - look * 36);
  return (
    <svg viewBox="0 0 80 64" role="img" aria-label={label}>
      {bg === 'snow' ? (
        <>
          <rect width="80" height="64" fill="#dce9f8" />
          <rect y="46" width="80" height="18" fill="#f7fbff" />
          {SNOW_DOTS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.8" fill="#ffffff" />
          ))}
        </>
      ) : (
        <>
          <rect width="80" height="64" fill="#bfe4f2" />
          <rect y="38" width="80" height="26" fill="#58b34a" />
          {TUFTS.map((x) => (
            <path key={x} d={`M${x} 56 L${x + 2} 48 L${x + 4} 56 M${x + 4} 56 L${x + 7} 47 L${x + 9} 56`} stroke="#2f7d32" strokeWidth="1.5" fill="none" />
          ))}
        </>
      )}
      <polygon points={`28,32 38,24 24,${tip}`} fill="#7d838b" stroke="#1d1d28" strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points={`52,32 42,24 56,${tip}`} fill="#7d838b" stroke="#1d1d28" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="40" cy="38" r="14" fill="#b9bec5" stroke="#1d1d28" strokeWidth="1.4" />
      <circle cx="34.5" cy="35" r="1.8" fill="#1d1d28" />
      <circle cx="45.5" cy="35" r="1.8" fill="#1d1d28" />
      <ellipse cx="40" cy="43" rx="3.4" ry="2.4" fill="#1d1d28" />
    </svg>
  );
}

/**
 * A toy helper learns to tell wolves from huskies. In the lab photos wolves are mostly in snow and huskies mostly on grass.
 * The helper keeps whichever single clue (background or the animal's look) gets the most training photos right.
 * Then it is tested on photos with the same backgrounds, or with every background swapped.
 */
export default function ShortcutLearning() {
  const [idx, setIdx] = useState(4); // 90 percent
  const [swapped, setSwapped] = useState(false);
  const strength = STRENGTHS[idx];

  const shown = useMemo(() => shownPhotos(), []);
  const big = useMemo(() => bigPhotos(), []);
  const learned = useMemo(() => learn(strength), [strength]);
  const tiles = useMemo(() => scoreTests(strength, swapped, shown), [strength, swapped, shown]);
  const lab = useMemo(() => accuracy(strength, false, big), [strength, big]);
  const real = useMemo(() => accuracy(strength, true, big), [strength, big]);
  const rows = useMemo(() => curve(big), [big]);

  const shortcut = learned.picked === 'background';
  const now = swapped ? real : lab;
  const tone = (v: number) => (v >= 0.75 ? '' : v >= 0.5 ? 'is-mid' : 'is-bad');

  return (
    <WhatIfFrame
      title="Snow means wolf?"
      withLabel="Same backgrounds as before"
      withoutLabel="Backgrounds swapped"
      on={!swapped}
      onChange={(on) => setSwapped(!on)}
      verdict={
        <>
          {shortcut ? 'The helper learned to look at the background.' : 'The helper learned to look at the animal.'}{' '}
          {swapped
            ? `With every background swapped it gets ${pc(real)} of 400 photos right (it scored ${pc(lab)} before the swap).`
            : `On photos like the lab ones it gets ${pc(lab)} of 400 right. Swap the backgrounds and it falls to ${pc(real)}.`}
        </>
      }
      controls={
        <div className="wb-controls">
          <label className="field">
            <span>
              Wolves in snow and huskies on grass, in the lab photos <b>{strength}%</b>
            </span>
            <input
              type="range"
              min={0}
              max={STRENGTHS.length - 1}
              step={1}
              value={idx}
              onChange={(e) => setIdx(+e.target.value)}
              aria-label="How often the background matches the animal in the lab photos, from 50 percent (no link) to 100 percent"
              aria-valuetext={`${strength} percent`}
            />
          </label>
        </div>
      }
    >
      <div className="wb-fig">
        <p className="wb-h">
          What the helper checked
          <small>It tried each clue alone on {TRAIN_N} lab photos and kept the one with more right answers.</small>
        </p>
        <div className="wb-meters">
          <div className={`wb-meter${shortcut ? ' is-top' : ''}`}>
            <span>Background alone {shortcut ? '(picked)' : ''}</span>
            <div className="wb-track">
              <motion.div className="wb-fill is-mid" initial={false} animate={{ width: `${(learned.trainRight.background / TRAIN_N) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
            </div>
            <b>
              {learned.trainRight.background}/{TRAIN_N}
            </b>
          </div>
          <div className={`wb-meter${!shortcut ? ' is-top' : ''}`}>
            <span>Animal alone {!shortcut ? '(picked)' : ''}</span>
            <div className="wb-track">
              <motion.div className="wb-fill is-grey" initial={false} animate={{ width: `${(learned.trainRight.look / TRAIN_N) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
            </div>
            <b>
              {learned.trainRight.look}/{TRAIN_N}
            </b>
          </div>
        </div>
      </div>

      <div className="wb-fig">
        <p className="wb-h">
          {swapped ? 'Test photos, backgrounds swapped' : 'Test photos, same backgrounds as the lab'}
          <small>12 of the 400 test photos. Pointier ears look more like a wolf.</small>
        </p>
        <ul className="wb-tiles" aria-label="Twelve test photos and the helper's answers">
          {tiles.map((t) => (
            <li key={t.photo.id} className={`wb-tile ${t.right ? 'is-good' : 'is-bad'}`}>
              <Photo bg={t.bg} look={t.photo.look} label={`A ${t.photo.animal} on ${t.bg}`} />
              <span className="wb-tile-is">
                <b>{t.photo.animal}</b> on {t.bg}
              </span>
              <span className="wb-tile-says">
                says {t.said}{' '}
                <span className={`wb-mark ${t.right ? 'is-good' : 'is-bad'}`} aria-label={t.right ? 'right' : 'wrong'}>
                  {t.right ? '✓' : '✗'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="wb-meters" aria-label="Score on 400 test photos">
        <div className={`wb-meter${!swapped ? ' is-top' : ''}`}>
          <span>Lab test, same backgrounds</span>
          <div className="wb-track">
            <motion.div className={`wb-fill ${tone(lab)}`} initial={false} animate={{ width: `${Math.max(lab * 100, 1)}%` }} transition={{ duration: 0.5, ease: EASE }} />
          </div>
          <b>{pc(lab)}</b>
        </div>
        <div className={`wb-meter${swapped ? ' is-top' : ''}`}>
          <span>Real world, swapped</span>
          <div className="wb-track">
            <motion.div className={`wb-fill ${tone(real)}`} initial={false} animate={{ width: `${Math.max(real * 100, 1)}%` }} transition={{ duration: 0.5, ease: EASE }} />
          </div>
          <b>{pc(real)}</b>
        </div>
      </div>
      <p className="wb-foot">
        {swapped ? 'Showing the swapped photos.' : 'Showing the lab photos.'} Score now: <b>{pc(now)}</b>. Try the slider at 50%, where snow tells you nothing about the animal: the helper has to look at the animal, and the swap changes
        nothing.
      </p>

      <details className="wb-more">
        <summary>Numbers, for older readers</summary>
        <p>
          <b>How the helper works.</b> Each photo has two clues: the animal's look (0 to 1, higher is more wolf-like, with the two kinds overlapping) and the background (snow or grass). For each clue the helper finds the best
          single cut-off on the {TRAIN_N} training photos, counts the right answers, and keeps the clue with more. A tie goes to the animal's look. The lab test uses 400 photos with the same link between animal and background;
          the swapped test flips every background.
        </p>
        <div className="wb-table-wrap">
          <table className="wb-table">
            <caption className="wb-rowlabel">Every link strength</caption>
            <thead>
              <tr>
                <th scope="col">Link</th>
                <th scope="col">Uses</th>
                <th scope="col">Lab</th>
                <th scope="col">Swapped</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.strength}>
                  <th scope="row">{r.strength}%</th>
                  <td className={r.strength === strength ? 'is-diag' : undefined}>{r.picked === 'background' ? 'background' : 'animal'}</td>
                  <td>{pc(r.lab)}</td>
                  <td className={r.swapped < 0.5 ? 'is-off' : undefined}>{pc(r.swapped)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Toy data, made up for this demo, not a model of any real system. The idea comes from real findings: in the paper "Why Should I Trust You?" (Ribeiro, Singh and Guestrin, 2016, section 6.4), a classifier was deliberately
          trained on 20 hand-picked images where all wolves had snow in the background, and it predicted "wolf" if there was snow. The shortcut learning review by Geirhos and colleagues (2020) describes shortcuts as decision
          rules that perform well on standard benchmarks but fail to transfer to harder conditions.
        </p>
      </details>
    </WhatIfFrame>
  );
}
