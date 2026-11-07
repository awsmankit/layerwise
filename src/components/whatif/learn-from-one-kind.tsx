import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  CATS,
  DOG_STEPS,
  MAX_DOGS,
  accuracy,
  bigTest,
  curve,
  perKind,
  score,
  testPics,
  trainCats,
  trainDogs,
  type Pic,
} from '../../lib/whatif/learn-from-one-kind';

const r1 = (v: number) => Math.round(v * 10) / 10;
const pc = (v: number) => `${Math.round(v * 100)}%`;
const GOOD = '#1f9d6b';
const BAD = '#d6453d';

/** A friendly face. Ears turn from floppy to pointy with the first clue; the snout grows with the second. */
function Face({ pic, label }: { pic: Pic; label?: string }) {
  const tip = r1(44 - pic.ears * 38);
  const sn = r1(6 + pic.snout * 12);
  return (
    <svg viewBox="0 0 60 60" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}>
      <polygon points={`13,30 25,21 9,${tip}`} fill="#b9885a" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points={`47,30 35,21 51,${tip}`} fill="#b9885a" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="30" cy="34" r="18" fill="#f2c48d" stroke="var(--ink)" strokeWidth="1.5" />
      <rect x="24" y="36" width="12" height={sn} rx="5" fill="#e6a96b" stroke="var(--ink)" strokeWidth="1.5" />
      <ellipse cx="30" cy={r1(36 + sn - 3)} rx="3.2" ry="2.1" fill="var(--ink)" />
      <circle cx="23" cy="30" r="2.2" fill="var(--ink)" />
      <circle cx="37" cy="30" r="2.2" fill="var(--ink)" />
    </svg>
  );
}

/* chart */
const CW = 340;
const CH = 178;
const X0 = 42;
const X1 = 326;
const Y0 = 10;
const Y1 = 128;
const cx = (d: number) => r1(X0 + (d / MAX_DOGS) * (X1 - X0));
const cy = (a: number) => r1(Y1 - ((Math.max(0.4, Math.min(1, a)) - 0.4) / 0.6) * (Y1 - Y0));

/**
 * Teach a picture-sorting helper with 10 cat pictures, then add dog pictures with the slider.
 * The helper copies the label of the most similar picture it was taught. The twelve test pictures never change.
 */
export default function LearnFromOneKind() {
  const [dogs, setDogs] = useState<number>(MAX_DOGS);
  const [lastDogs, setLastDogs] = useState<number>(MAX_DOGS);

  const tests = useMemo(() => testPics(), []);
  const big = useMemo(() => bigTest(), []);
  const cats = useMemo(() => trainCats(), []);
  const dogPics = useMemo(() => trainDogs(), []);
  const scored = useMemo(() => score(dogs, tests), [dogs, tests]);
  const kinds = useMemo(() => perKind(dogs, tests), [dogs, tests]);
  const rightN = scored.filter((s) => s.right).length;
  const acc = rightN / scored.length;
  const bigAcc = useMemo(() => accuracy(dogs, big), [dogs, big]);
  const line = useMemo(() => curve(big), [big]);

  const setN = (v: number) => {
    setDogs(v);
    if (v > 0) setLastDogs(v);
  };
  const onlyCats = dogs === 0;
  const catCalls = scored.filter((s) => s.said === 'cat').length;

  return (
    <WhatIfFrame
      title="One kind in, one answer out"
      withLabel="Cats and dogs"
      withoutLabel="Only cats"
      on={!onlyCats}
      onChange={(on) => setDogs(on ? lastDogs : 0)}
      verdict={
        onlyCats ? (
          <>
            Taught only on cats, the helper calls all {catCalls} pictures a cat. Right: {rightN} of {scored.length} ({pc(acc)}), and it got every dog wrong. On{' '}
            {big.length} fresh pictures: {pc(bigAcc)}.
          </>
        ) : (
          <>
            With {dogs} {dogs === 1 ? 'dog' : 'dogs'} in its lessons the helper gets {kinds.dogsRight} of {kinds.dogsTotal} dogs and {kinds.catsRight} of {kinds.catsTotal} cats right:{' '}
            {rightN} of {scored.length} ({pc(acc)}). On {big.length} fresh pictures: {pc(bigAcc)}.
          </>
        )
      }
      controls={
        <div className="wb-controls">
          <label className="field">
            <span>
              Dogs in its lessons <b>{dogs}</b>
            </span>
            <input
              type="range"
              min={0}
              max={MAX_DOGS}
              step={1}
              value={dogs}
              onChange={(e) => setN(+e.target.value)}
              aria-label={`How many dog pictures the helper is taught, from 0 to ${MAX_DOGS}`}
            />
          </label>
        </div>
      }
    >
      <div className="wb-fig">
        <p className="wb-h">
          What the helper was taught
          <small>It always gets the same {CATS} cat pictures. You choose how many dogs to add.</small>
        </p>
        <p className="wb-rowlabel">
          <b>Cats</b> it has seen: {CATS}
        </p>
        <ul className="wb-strip" aria-label={`${CATS} cat pictures in the lessons`}>
          {cats.map((c) => (
            <li key={c.id}>
              <Face pic={c} />
            </li>
          ))}
        </ul>
        <p className="wb-rowlabel">
          <b>Dogs</b> it has seen: {dogs}
        </p>
        <ul className="wb-strip" aria-label={`${dogs} dog pictures in the lessons`}>
          {dogPics.map((d, i) =>
            i < dogs ? (
              <motion.li
                key={d.id}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <Face pic={d} />
              </motion.li>
            ) : (
              <li key={d.id} className="wb-slot" aria-hidden="true" />
            ),
          )}
        </ul>
      </div>

      <div className="wb-fig">
        <p className="wb-h">
          Now it sorts 12 new pictures
          <small>Each tile shows the real answer, then what the helper said.</small>
        </p>
        <ul className="wb-tiles" aria-label="The twelve test pictures and the helper's answers">
          {scored.map((s) => (
            <li key={s.pic.id} className={`wb-tile ${s.right ? 'is-good' : 'is-bad'}`}>
              <Face pic={s.pic} label={`A ${s.pic.kind} picture`} />
              <span className="wb-tile-is">
                is a <b>{s.pic.kind}</b>
              </span>
              <span className="wb-tile-says">
                says {s.said}{' '}
                <span className={`wb-mark ${s.right ? 'is-good' : 'is-bad'}`} aria-label={s.right ? 'right' : 'wrong'}>
                  {s.right ? '✓' : '✗'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="wb-nums" aria-label="Score">
        <li className="is-lit">
          Right on the 12 shown
          <b>
            {rightN} of {scored.length}
          </b>
        </li>
        <li>
          Dogs it got right
          <b>
            {kinds.dogsRight} of {kinds.dogsTotal}
          </b>
        </li>
        <li>
          Cats it got right
          <b>
            {kinds.catsRight} of {kinds.catsTotal}
          </b>
        </li>
      </ul>

      <div className="wb-fig">
        <p className="wb-h">
          Score as dogs are added
          <small>Measured on {big.length} fresh pictures, half cats and half dogs. The ring is where you are.</small>
        </p>
        <svg
          viewBox={`0 0 ${CW} ${CH}`}
          className="dx-svg wi-svg wb-svg"
          role="img"
          aria-label={`Score against number of dogs in the lessons. With no dogs it is ${pc(line[0])}. With ${MAX_DOGS} dogs it is ${pc(line[MAX_DOGS])}. You are at ${dogs} dogs: ${pc(bigAcc)}.`}
        >
          {[0.5, 0.75, 1].map((a) => (
            <g key={a}>
              <line x1={X0} x2={X1} y1={cy(a)} y2={cy(a)} className="wb-grid" />
              <text x={X0 - 6} y={cy(a) + 4} textAnchor="end" className="wb-t">
                {pc(a)}
              </text>
            </g>
          ))}
          <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} className="wb-frame" />
          <path d={line.map((v, i) => `${i ? 'L' : 'M'} ${cx(i)} ${cy(v)}`).join(' ')} fill="none" stroke={GOOD} strokeWidth="3" strokeLinejoin="round" />
          {line.map((v, i) => (
            <circle key={i} cx={cx(i)} cy={cy(v)} r="3.5" fill={i === 0 ? BAD : GOOD} />
          ))}
          <motion.circle
            r="8.5"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2.4"
            initial={false}
            animate={{ cx: cx(dogs), cy: cy(line[dogs]) }}
            transition={{ duration: 0.4, ease: EASE }}
          />
          {[0, 5, 10].map((d) => (
            <text key={d} x={cx(d)} y={Y1 + 17} textAnchor={d === 0 ? 'start' : d === MAX_DOGS ? 'end' : 'middle'} className="wb-t">
              {d}
            </text>
          ))}
          <text x={X0} y={Y1 + 36} className="wb-tb">
            dogs in the lessons
          </text>
        </svg>
      </div>

      <details className="wb-more">
        <summary>Numbers, for older readers</summary>
        <p>
          <b>How the helper works.</b> Each picture has two clues: ear pointiness and snout length, each from 0 to 1. For a new picture the helper finds the single training picture with the closest clues (nearest
          neighbour) and copies its label. Taught on cats only, every answer is "cat", so its score is just the share of cats in the test: 50 percent.
        </p>
        <div className="wb-table-wrap">
          <table className="wb-table">
            <caption className="wb-rowlabel">Score on {big.length} fresh pictures</caption>
            <thead>
              <tr>
                <th scope="col">Dogs taught</th>
                {DOG_STEPS.map((d) => (
                  <th key={d} scope="col">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Score</th>
                {line.map((v, i) => (
                  <td key={i} className={i === dogs ? 'is-diag' : undefined}>
                    {Math.round(v * 100)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Toy data, made up for this demo: cats have pointier ears and shorter snouts on average, dogs the other way round, and the two groups overlap a little, so even a perfect helper would make some mistakes. The 12 pictures
          on screen are a small sample, so their score can step up and down by a picture or two. The {big.length} fresh pictures give a steadier number. Try adding the dogs one at a time and notice that the first dog helps the
          most.
        </p>
      </details>
    </WhatIfFrame>
  );
}

