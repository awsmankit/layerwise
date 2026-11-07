import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  CLUES,
  FRUITS,
  accuracy,
  allCombos,
  bigSet,
  confusion,
  orderClues,
  pairMix,
  scoreAll,
  shownSet,
  type Clue,
  type Fruit,
} from '../../lib/whatif/colour-only';

const pc = (v: number) => `${Math.round(v * 100)}%`;
const ALL = orderClues(CLUES);
const COLOUR_ONLY: Clue[] = ['colour'];
const NAME: Record<Clue, string> = { colour: 'Colour', shape: 'Shape', size: 'Size' };
const NOTE: Record<Clue, string> = { colour: 'red to yellow', shape: 'round to long', size: 'small to big' };
const PLURAL: Record<Fruit, string> = { apple: 'Apples', tomato: 'Tomatoes', banana: 'Bananas', lemon: 'Lemons' };

function Icon({ kind }: { kind: Fruit }) {
  const sk = { stroke: 'var(--ink)', strokeWidth: 1.6, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      {kind === 'apple' && (
        <>
          <circle cx="20" cy="24" r="12.5" fill="#d6453d" {...sk} />
          <path d="M20 12 Q20 7 24 5" fill="none" {...sk} />
          <ellipse cx="25" cy="9" rx="4" ry="2.2" fill="#3f9d4a" transform="rotate(-25 25 9)" {...sk} strokeWidth={1.2} />
        </>
      )}
      {kind === 'tomato' && (
        <>
          <ellipse cx="20" cy="25" rx="14" ry="11" fill="#ec6a3a" {...sk} />
          <polygon points="20,14 23,18.5 28.5,16.5 25.5,21 29.5,24 21,22 12,24 15,21 11.5,16.5 17,18.5" fill="#3f9d4a" {...sk} strokeWidth={1.2} />
        </>
      )}
      {kind === 'banana' && (
        <path d="M7 9 C6 27 19 37 35 30 C37.5 28.6 35.5 25.6 32.5 26.6 C22.5 29.5 16 22 14.5 8 Z" fill="#f4cf2c" {...sk} />
      )}
      {kind === 'lemon' && (
        <g transform="rotate(-22 20 20)">
          <ellipse cx="20" cy="20" rx="14" ry="10" fill="#f7e14c" {...sk} />
          <circle cx="5.5" cy="20" r="2.6" fill="#f7e14c" {...sk} />
          <circle cx="34.5" cy="20" r="2.6" fill="#f7e14c" {...sk} />
        </g>
      )}
    </svg>
  );
}

const same = (a: Clue[], b: Clue[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Sort made-up fruit into four bins with only the clues you allow. A fruit goes in the bin of the kind that most of its
 * 5 most similar training fruits belong to. Red outline and a cross mean the fruit is in the wrong bin.
 */
export default function ColourOnly() {
  const [clues, setClues] = useState<Clue[]>(ALL);
  const [lastMore, setLastMore] = useState<Clue[]>(ALL);

  const shown = useMemo(() => shownSet(), []);
  const big = useMemo(() => bigSet(), []);
  const scored = useMemo(() => scoreAll(clues, shown), [clues, shown]);
  const bigAcc = useMemo(() => accuracy(clues, big), [clues, big]);
  const red = useMemo(() => pairMix(clues, big, 'red'), [clues, big]);
  const yellow = useMemo(() => pairMix(clues, big, 'yellow'), [clues, big]);
  const conf = useMemo(() => confusion(clues, big), [clues, big]);
  const combos = useMemo(() => allCombos(big), [big]);

  const colourOnly = same(clues, COLOUR_ONLY);
  const rightN = scored.filter((s) => s.right).length;

  const toggle = (c: Clue) => {
    const has = clues.includes(c);
    if (has && clues.length === 1) return; // keep at least one clue
    const next = orderClues(has ? clues.filter((x) => x !== c) : [...clues, c]);
    setClues(next);
    if (!same(next, COLOUR_ONLY)) setLastMore(next);
  };
  const clueText = clues.map((c) => c).join(', ').replace(/, ([^,]*)$/, ' and $1');

  return (
    <WhatIfFrame
      title="Sorting fruit into bins"
      withLabel="Colour + more clues"
      withoutLabel="Colour only"
      on={!colourOnly}
      onChange={(on) => setClues(on ? (same(lastMore, COLOUR_ONLY) ? ALL : lastMore) : COLOUR_ONLY)}
      verdict={
        colourOnly ? (
          <>
            Using colour only, the helper puts {rightN} of {scored.length} fruits in the right bin. It never mixes red with yellow, but apples and tomatoes get mixed up {pc(red)} of the time, and bananas and lemons{' '}
            {pc(yellow)}. On {big.length} fresh fruits: {pc(bigAcc)} right.
          </>
        ) : (
          <>
            Using {clueText}, the helper puts {rightN} of {scored.length} fruits in the right bin. Apples and tomatoes mixed up: {pc(red)}. Bananas and lemons mixed up: {pc(yellow)}. On {big.length} fresh fruits:{' '}
            {pc(bigAcc)} right.
          </>
        )
      }
      controls={
        <div className="wb-controls">
          <div className="wb-picks" role="group" aria-label="Which clues the helper may look at">
            <span className="wb-picks-label">Clues the helper may look at</span>
            {CLUES.map((c) => (
              <button key={c} type="button" className={`wb-pick${clues.includes(c) ? ' is-on' : ''}`} aria-pressed={clues.includes(c)} onClick={() => toggle(c)}>
                {NAME[c]} <small>({NOTE[c]})</small>
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="wb-fig">
        <p className="wb-h">
          The helper's four bins
          <small>It sorted 24 new fruits. Each fruit goes in the bin the helper chose. A red outline and a cross mean it is in the wrong bin.</small>
        </p>
        <div className="wb-bins">
          {FRUITS.map((bin) => {
            const inBin = scored.filter((s) => s.said === bin);
            const wrong = inBin.filter((s) => !s.right).length;
            return (
              <section key={bin} className="wb-bin" aria-label={`${PLURAL[bin]} bin: ${inBin.length} fruits, ${wrong} in the wrong bin`}>
                <h4>
                  {PLURAL[bin]} bin <small>{inBin.length} in</small>
                </h4>
                <ul>
                  {inBin.map((s) => (
                    <motion.li
                      key={s.item.id}
                      className={s.right ? undefined : 'is-bad'}
                      aria-label={s.right ? `${s.item.fruit}, right` : `${s.item.fruit}, put in the wrong bin`}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, ease: EASE }}
                    >
                      <Icon kind={s.item.fruit} />
                      {!s.right && (
                        <span className="wb-x" aria-hidden="true">
                          ×
                        </span>
                      )}
                    </motion.li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <ul className="wb-legend" aria-label="Key">
          {FRUITS.map((f) => (
            <li key={f}>
              <span style={{ display: 'inline-block', width: 22, height: 22 }}>
                <Icon kind={f} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="wb-meters" aria-label="How often same-coloured fruit were mixed up, and how many fruits were right, out of 400 fresh fruits. Red fruit means apples and tomatoes, yellow fruit means bananas and lemons.">
        <div className={`wb-meter${red > 0.2 ? ' is-top' : ''}`}>
          <span>Red fruit mixed up</span>
          <div className="wb-track">
            <motion.div className={`wb-fill ${red > 0.2 ? 'is-bad' : ''}`} initial={false} animate={{ width: `${Math.max(red * 100, 1)}%` }} transition={{ duration: 0.5, ease: EASE }} />
          </div>
          <b>{pc(red)}</b>
        </div>
        <div className={`wb-meter${yellow > 0.2 ? ' is-top' : ''}`}>
          <span>Yellow fruit mixed up</span>
          <div className="wb-track">
            <motion.div className={`wb-fill ${yellow > 0.2 ? 'is-bad' : ''}`} initial={false} animate={{ width: `${Math.max(yellow * 100, 1)}%` }} transition={{ duration: 0.5, ease: EASE }} />
          </div>
          <b>{pc(yellow)}</b>
        </div>
        <div className="wb-meter">
          <span>All fruits right</span>
          <div className="wb-track">
            <motion.div className="wb-fill" initial={false} animate={{ width: `${bigAcc * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
          </div>
          <b>{pc(bigAcc)}</b>
        </div>
      </div>
      <p className="wb-foot">Red fruit means apples and tomatoes, yellow fruit means bananas and lemons. Bars use {big.length} fresh fruits (100 of each kind), so they are steadier than the 24 shown above.</p>

      <details className="wb-more">
        <summary>Numbers, for older readers</summary>
        <p>
          <b>How the helper works.</b> Each fruit has three clues on a 0 to 1 scale: colour (red to yellow), shape (round to long) and size (small to big). The helper has 25 training fruits of each kind. For a new fruit it
          looks at only the allowed clues, finds the 5 most similar training fruits, and picks the kind that most of them belong to.
        </p>
        <div className="wb-table-wrap">
          <table className="wb-table">
            <caption className="wb-rowlabel">What the helper said (columns) for each real fruit (rows), {big.length} fresh fruits, with the clues you chose</caption>
            <thead>
              <tr>
                <th scope="col">real \ said</th>
                {FRUITS.map((f) => (
                  <th key={f} scope="col">
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FRUITS.map((f, i) => (
                <tr key={f}>
                  <th scope="row">{f}</th>
                  {conf[i].map((n, j) => (
                    <td key={j} className={i === j ? 'is-diag' : n > 0 ? 'is-off' : undefined}>
                      {n}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="wb-table-wrap">
          <table className="wb-table">
            <caption className="wb-rowlabel">Every choice of clues, best first (right out of 100)</caption>
            <tbody>
              {combos.map((c) => (
                <tr key={c.clues.join('+')}>
                  <th scope="row" style={{ textAlign: 'left', fontWeight: same(c.clues, clues) ? 800 : 500 }}>
                    {c.clues.join(' + ')}
                    {same(c.clues, clues) ? ' (your choice)' : ''}
                  </th>
                  <td className={same(c.clues, clues) ? 'is-diag' : undefined}>{Math.round(c.accuracy * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Toy data, made up for this demo: apples and tomatoes are both red, bananas and lemons both yellow. Size differs between apples and tomatoes, shape between bananas and lemons. Notice that a single clue can fool the
          helper in a new way: size alone mixes up apples and bananas, which are both on the big side.
        </p>
      </details>
    </WhatIfFrame>
  );
}
