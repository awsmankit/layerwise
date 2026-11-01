import { useMemo, useState } from 'react';
import { Root, useNarrow } from './shared';
import {
  evaluate,
  ITEMS,
  leaveOneOut,
  makeRatings,
  makeScorer,
  METHOD_LABEL,
  N_USERS,
  randomHitRate,
  recommend,
  trainMf,
  TOP_N,
  type Method,
  type Ratings,
} from '../../lib/recommender';

const LETTERS = 'ABCDEFGHIJKLMN';
const METHODS: Method[] = ['popularity', 'itemitem', 'mf'];
const GROUP_NAME = ['action', 'cosy', 'for everyone'];

const pct = (x: number) => Math.round(x * 100) + '%';

/**
 * A tiny recommender on an invented ratings table. Pick a method and a user, see the top three, and see how often each method finds the
 * film each user liked best when that rating is hidden. Matrix factorisation also draws its learned taste map.
 */
export default function RecommenderLab() {
  const narrow = useNarrow();
  const [seed, setSeed] = useState(1);
  const [method, setMethod] = useState<Method>('mf');
  const [k, setK] = useState(2);
  const [user, setUser] = useState(0);
  const [cold, setCold] = useState(false);

  const ratings = useMemo(() => makeRatings(seed), [seed]);
  const split = useMemo(() => leaveOneOut(ratings), [ratings]);
  const evals = useMemo(
    () => ({
      popularity: evaluate(ratings, 'popularity'),
      itemitem: evaluate(ratings, 'itemitem'),
      mf: evaluate(ratings, 'mf', k),
    }),
    [ratings, k],
  );
  const floor = useMemo(() => randomHitRate(ratings), [ratings]);

  const held = split.heldOut[user];
  // For the "new user" view, the model is rebuilt with this user's row blank.
  const viewTrain: Ratings = useMemo(() => (cold ? split.train.map((row, u) => (u === user ? row.map(() => null) : row)) : split.train), [cold, split, user]);
  const recs = useMemo(() => recommend(viewTrain, makeScorer(viewTrain, method, k), user), [viewTrain, method, k, user]);
  const model = useMemo(() => (method === 'mf' && k >= 2 ? trainMf(viewTrain, k, { seed: 1 }) : null), [viewTrain, method, k]);

  const trainCount = viewTrain[user].filter((v) => v !== null).length;
  const hit = held !== null && recs.includes(held);
  const ev = evals[method];

  const status = `${METHOD_LABEL[method]} for user ${user + 1}${cold ? ' as a new user with no ratings' : ` (${trainCount} ratings visible)`}: ${recs.map((i) => ITEMS[i].name).join(', ')}.${
    held === null ? ' This user has no hidden favourite.' : ` Their hidden favourite, ${ITEMS[held].name}, ${hit ? 'is in the list.' : 'is not in the list.'}`
  } Across all ${ev.users} users, ${ev.hits} hidden favourites were found in the top ${TOP_N} (${pct(ev.rate)}). A random pick would find about ${pct(floor)}.`;

  return (
    <Root>
      <div className="viz ap1">
        <div className="ap1-top">
          <p className="viz-title">A tiny recommender</p>
          <button type="button" className="btn quiet" onClick={() => setSeed((s) => s + 1)}>
            Draw a new invented table
          </button>
        </div>
        <p className="ap1-note">
          Invented data: 12 people rated some of 14 films from 1 to 5. Blank cells are films they have not rated. Each person&apos;s favourite rating is hidden from the methods (dashed cell). A method wins a point when that hidden favourite shows up in its top {TOP_N}.
        </p>

        <div className="ap1-scroll" role="region" aria-label="Ratings table" tabIndex={0}>
          <div className="ap1-grid" role="table" aria-label="Invented ratings from 1 to 5. Rows are people, columns are films A to N. Blank means not rated. A dashed cell is the hidden favourite.">
            <div className="ap1-gr ap1-head" role="row">
              <span role="columnheader" className="ap1-corner"><span className="sr-only">Person</span></span>
              {ITEMS.map((it, i) => (
                <span key={i} role="columnheader" title={`${it.name} (${GROUP_NAME[it.group]})`} className={`ap1-ch ap1-g${it.group}`}>
                  {LETTERS[i]}
                </span>
              ))}
            </div>
            {ratings.map((row, u) => (
              <div key={u} role="row" className={`ap1-gr ${u === user ? 'is-sel' : ''}`}>
                <span role="rowheader" className="ap1-rh">U{u + 1}</span>
                {row.map((v, i) => {
                  const isHeld = split.heldOut[u] === i;
                  const isRec = u === user && recs.includes(i);
                  return (
                    <span key={i} role="cell" data-v={v ?? 0} className={`ap1-cell ${isHeld ? 'is-held' : ''} ${isRec ? 'is-rec' : ''}`}>
                      {v ?? ''}
                      {isRec && <span className="sr-only"> recommended</span>}
                      {isHeld && <span className="sr-only"> hidden favourite</span>}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <details className="ap1-legend">
          <summary>Which film is which letter</summary>
          <ul>
            {ITEMS.map((it, i) => (
              <li key={i}>
                <b>{LETTERS[i]}</b> {it.name} <span>({GROUP_NAME[it.group]})</span>
              </li>
            ))}
          </ul>
        </details>

        <div className="ap1-ctrls">
          <div className="field">
            <span>Method</span>
            <div className="ap1-btns" role="group" aria-label="Recommendation method">
              {METHODS.map((m) => (
                <button key={m} type="button" className="btn quiet" aria-pressed={method === m} onClick={() => setMethod(m)}>
                  {METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Show recommendations for</span>
            <select value={user} onChange={(e) => setUser(+e.target.value)}>
              {Array.from({ length: N_USERS }, (_, u) => (
                <option key={u} value={u}>
                  Person U{u + 1}
                </option>
              ))}
            </select>
          </label>
          {method === 'mf' && (
            <label className="field">
              <span>
                Hidden taste factors, k <b>{k}</b>
              </span>
              <input type="range" min={0} max={8} step={1} value={k} onChange={(e) => setK(+e.target.value)} />
            </label>
          )}
          <label className="ap1-check">
            <input type="checkbox" checked={cold} onChange={(e) => setCold(e.target.checked)} />
            <span>Pretend U{user + 1} is brand new (hide all their ratings)</span>
          </label>
        </div>

        <div className="ap1-result">
          <p className="ap1-h">
            Top {TOP_N} for U{user + 1}, by {METHOD_LABEL[method].toLowerCase()}
          </p>
          <ol className="ap1-recs">
            {recs.map((i) => (
              <li key={i} className={held === i ? 'is-hit' : ''}>
                <b>{LETTERS[i]}</b> {ITEMS[i].name}
                {held === i && <span className="ap1-tag"> found their hidden favourite</span>}
              </li>
            ))}
          </ol>
          <p className="ap1-small">
            {held === null
              ? 'This person has no hidden favourite, so they are not scored.'
              : `Hidden favourite: ${LETTERS[held]} ${ITEMS[held].name}. ${hit ? 'Found.' : 'Missed.'}`}
            {cold ? ' With no ratings, personal methods have nothing to go on and fall back to what is popular.' : ''}
          </p>
        </div>

        <p className="ap1-h">Hit rate at {TOP_N}: how often the hidden favourite is in the top {TOP_N}</p>
        <ul className="ap1-bars">
          {METHODS.map((m) => (
            <li key={m} className={m === method ? 'is-sel' : ''}>
              <span className="ap1-bl">{METHOD_LABEL[m]}{m === 'mf' ? `, k = ${k}` : ''}</span>
              <span className="ap1-track"><i style={{ width: `${Math.round((evals[m].rate * 100) * 10) / 10}%` }} /></span>
              <b>{evals[m].hits} of {evals[m].users}</b>
            </li>
          ))}
          <li className="ap1-floor">
            <span className="ap1-bl">Random picks (expected)</span>
            <span className="ap1-track"><i style={{ width: `${Math.round((floor * 100) * 10) / 10}%` }} /></span>
            <b>{pct(floor)}</b>
          </li>
        </ul>
        <p className="ap1-small">One person is worth 8 percentage points, so a gap of one or two people means little on a single table. Draw a few new tables and watch the order change.</p>

        {method === 'mf' && (
          <TasteMap model={model} k={k} viewTrain={viewTrain} user={user} recs={recs} narrow={narrow} />
        )}

        <p className="ap1-readout" role="status" aria-live="polite">{status}</p>
      </div>
    </Root>
  );
}

function TasteMap({ model, k, viewTrain, user, recs, narrow }: { model: ReturnType<typeof trainMf> | null; k: number; viewTrain: Ratings; user: number; recs: number[]; narrow: boolean }) {
  const W = narrow ? 280 : 460;
  const H = narrow ? 260 : 300;
  if (!model || k < 2) {
    return <p className="ap1-small">Set k to 2 or more to see the taste map the model learns. With k = {k}, each person has {k === 0 ? 'only a leaning towards liking more or less in general' : 'a single taste number'}, so there is no map to draw.</p>;
  }
  const pts = model.q.map((v) => [v[0], v[1]]);
  const lim = Math.max(0.05, ...pts.flat().map(Math.abs)) * 1.25;
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const cx = (x: number) => r1(W / 2 + (x / lim) * (W / 2 - 22));
  const cy = (y: number) => r1(H / 2 - (y / lim) * (H / 2 - 22));
  const pu = [model.p[user][0], model.p[user][1]];
  const norm = Math.hypot(pu[0], pu[1]);
  const scale = norm > 1e-9 ? (lim * 0.85) / norm : 0;
  const ux = pu[0] * scale;
  const uy = pu[1] * scale;
  const unrated = (i: number) => viewTrain[user][i] === null;
  return (
    <div>
      <p className="ap1-h">The taste map the model learned (first two of {k} factors)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="ap1-svg" role="img" aria-label={`Films plotted by the first two learned taste factors, with an arrow showing the direction of person ${user + 1}'s taste. Films the arrow points towards score higher for that person.`}>
        <rect x={0.5} y={0.5} width={W - 1} height={H - 1} className="ap1-frame" />
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="ap1-axis" />
        <line x1={W / 2} x2={W / 2} y1={0} y2={H} className="ap1-axis" />
        <line x1={W / 2} y1={H / 2} x2={cx(ux)} y2={cy(uy)} className="ap1-arrow" />
        <circle cx={cx(ux)} cy={cy(uy)} r={7} className="ap1-user" />
        {pts.map((p, i) => (
          <g key={i} className={`ap1-pt ap1-pg${ITEMS[i].group} ${recs.includes(i) ? 'is-rec' : ''} ${unrated(i) ? '' : 'is-seen'}`}>
            <circle cx={cx(p[0])} cy={cy(p[1])} r={narrow ? 11 : 10} />
            <text x={cx(p[0])} y={cy(p[1]) + 4.5} textAnchor="middle">{LETTERS[i]}</text>
          </g>
        ))}
      </svg>
      <p className="ap1-small">
        Letters are films. Colour is the film&apos;s real group (the model never saw it). A thick ring marks a recommended film, and a faded one has already been rated by this person. The large dot is U{user + 1}&apos;s taste, shown by direction only: films the arrow points towards get high scores. The two axes are learned and have no names, and a different seed would turn or flip them.
      </p>
    </div>
  );
}
