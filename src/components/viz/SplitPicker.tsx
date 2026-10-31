import { useMemo, useState } from 'react';
import { Root, useNarrow } from './shared';
import {
  accuracy,
  bestSplit,
  buildForest,
  buildTree,
  evaluateSplit,
  forestImportance,
  forestVote,
  leafCount,
  makeDataset,
  treeDepth,
  treeImportance,
  treeProb,
  treeRegions,
  type Criterion,
  type Feature,
  type TreeNode,
} from '../../lib/trees';

const SEEDS = [4, 2, 6, 1, 8, 5, 12];
const FOREST_SEED = 9;
const GRID = 40;

type View = 'split' | 'tree' | 'forest';

const pct = (v: number) => Math.round(v * 100) + '%';
const f2 = (v: number) => v.toFixed(3);

function Questions({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  if (node.kind === 'leaf') {
    return (
      <li className="ma-q-leaf">
        {node.n1 > node.n0 ? 'circles' : 'squares'} ({node.n1} circles, {node.n0} squares)
      </li>
    );
  }
  return (
    <li>
      <span className="ma-q">{node.feature} is at most {node.threshold.toFixed(1)}?</span>
      <ul>
        <Questions node={node.left} depth={depth + 1} />
        <Questions node={node.right} depth={depth + 1} />
      </ul>
    </li>
  );
}

/**
 * A small 2D dataset with two classes. Pick a split by hand and see the impurity drop, grow a tree by
 * choosing the best split at every step, then switch to a forest of many noisy trees voting.
 */
export default function SplitPicker() {
  const narrow = useNarrow();
  const W = narrow ? 340 : 520;
  const H = narrow ? 330 : 440;
  const ML = 30;
  const MR = 8;
  const MT = 8;
  const MB = 26;
  const sx = (v: number) => ML + (v / 10) * (W - ML - MR);
  const sy = (v: number) => H - MB - (v / 10) * (H - MT - MB);

  const [view, setView] = useState<View>('split');
  const [seedIx, setSeedIx] = useState(0);
  const [criterion, setCriterion] = useState<Criterion>('gini');
  const [feature, setFeature] = useState<Feature>('x');
  const [cut, setCut] = useState(5);
  const [depth, setDepth] = useState(2);
  const [nTrees, setNTrees] = useState(30);
  const [fDepth, setFDepth] = useState(10);

  const seed = SEEDS[seedIx % SEEDS.length];
  const train = useMemo(() => makeDataset(seed, 50), [seed]);
  const fresh = useMemo(() => makeDataset(seed + 100, 1000), [seed]);

  const ev = useMemo(() => evaluateSplit(train, feature, cut, criterion), [train, feature, cut, criterion]);
  const best = useMemo(() => bestSplit(train, criterion), [train, criterion]);

  const tree = useMemo(() => buildTree(train, { maxDepth: depth, criterion }), [train, depth, criterion]);
  const deepTree = useMemo(() => buildTree(train, { maxDepth: 30, criterion }), [train, criterion]);
  const forest = useMemo(() => buildForest(train, { nTrees, maxDepth: fDepth, seed: FOREST_SEED, maxFeatures: 1, criterion }), [train, nTrees, fDepth, criterion]);

  const regions = useMemo(() => treeRegions(tree, { x0: 0, x1: 10, y0: 0, y1: 10 }), [tree]);
  const cells = useMemo(() => {
    if (view !== 'forest') return [];
    const out: { i: number; j: number; v: number }[] = [];
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) out.push({ i, j, v: forestVote(forest, ((i + 0.5) / GRID) * 10, ((j + 0.5) / GRID) * 10) });
    return out;
  }, [forest, view]);

  const treeTrain = accuracy((x, y) => treeProb(tree, x, y), train);
  const treeFresh = accuracy((x, y) => treeProb(tree, x, y), fresh);
  const deepFresh = useMemo(() => accuracy((x, y) => treeProb(deepTree, x, y), fresh), [deepTree, fresh]);
  const forestTrain = useMemo(() => accuracy((x, y) => forestVote(forest, x, y), train), [forest, train]);
  const forestFresh = useMemo(() => accuracy((x, y) => forestVote(forest, x, y), fresh), [forest, fresh]);
  const imp = view === 'forest' ? forestImportance(forest) : treeImportance(tree);

  const unit = (W - ML - MR) / 10;

  function pickAt(e: React.MouseEvent<SVGSVGElement>) {
    if (view !== 'split') return;
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    const vy = ((e.clientY - r.top) / r.height) * H;
    const v = feature === 'x' ? ((vx - ML) / (W - ML - MR)) * 10 : ((H - MB - vy) / (H - MT - MB)) * 10;
    setCut(Math.min(9.9, Math.max(0.1, Math.round(v * 10) / 10)));
  }

  const status =
    view === 'split'
      ? `Question: is ${feature} at most ${cut.toFixed(1)}? Left side: ${ev.left[1]} circles and ${ev.left[0]} squares, ${criterion} ${f2(ev.impLeft)}. Right side: ${ev.right[1]} circles and ${ev.right[0]} squares, ${criterion} ${f2(ev.impRight)}. Weighted ${f2(ev.weighted)}, from ${f2(ev.parent)} before the split, so the drop is ${f2(ev.drop)}.${best ? ` The best possible drop here is ${f2(best.eval.drop)} (${best.feature} at ${best.threshold.toFixed(1)}).` : ''}`
      : view === 'tree'
        ? `Depth limit ${depth}: ${leafCount(tree)} leaves, ${treeDepth(tree)} levels used. Right on ${pct(treeTrain)} of the 50 training points and ${pct(treeFresh)} of 1,000 fresh points from the same source. Feature importance: x ${pct(imp.x)}, y ${pct(imp.y)}.`
        : `${nTrees} tree${nTrees === 1 ? '' : 's'} voting, each grown to depth ${fDepth} on its own resample of the points. Forest: ${pct(forestTrain)} on training points, ${pct(forestFresh)} on 1,000 fresh points. One fully grown tree on the same points: 100% on training, ${pct(deepFresh)} on fresh. Feature importance: x ${pct(imp.x)}, y ${pct(imp.y)}.`;

  return (
    <Root>
      <div className="viz ma">
        <div className="ma-top">
          <p className="viz-title">Pick a split, grow a tree, then a forest</p>
          <div className="ma-btns" role="group" aria-label="What to do">
            <button type="button" className="btn quiet" aria-pressed={view === 'split'} onClick={() => setView('split')}>
              Pick a split
            </button>
            <button type="button" className="btn quiet" aria-pressed={view === 'tree'} onClick={() => setView('tree')}>
              Grow a tree
            </button>
            <button type="button" className="btn quiet" aria-pressed={view === 'forest'} onClick={() => setView('forest')}>
              Forest
            </button>
          </div>
        </div>
        <p className="ma-axes">
          Two kinds of point: purple circles and orange squares, spread over two measurements, x (across) and y (up). Made-up example data, with a few mislabelled points mixed in, as real data has.
          {view === 'split' ? ' Tap the chart or use the slider to place a cut.' : ''}
        </p>

        <svg viewBox={`0 0 ${W} ${H}`} className="ma-svg" role="img" aria-label="Scatter plot of purple circles and orange squares over two measurements, with the regions a model gives to each class shaded." onClick={pickAt} style={view === 'split' ? { cursor: 'crosshair' } : undefined}>
          {view === 'split' && (
            <>
              <rect x={feature === 'x' ? ML : ML} y={feature === 'x' ? MT : MT} width={feature === 'x' ? sx(cut) - ML : W - ML - MR} height={feature === 'x' ? H - MT - MB : sy(cut) - MT} className={ev.left[1] > ev.left[0] ? 'ma-reg a' : 'ma-reg b'} style={{ fillOpacity: 0.12 + 0.3 * Math.abs(ev.left[1] - ev.left[0]) / Math.max(1, ev.left[0] + ev.left[1]) }} />
              <rect x={feature === 'x' ? sx(cut) : ML} y={feature === 'x' ? MT : sy(cut)} width={feature === 'x' ? W - MR - sx(cut) : W - ML - MR} height={feature === 'x' ? H - MT - MB : H - MB - sy(cut)} className={ev.right[1] > ev.right[0] ? 'ma-reg a' : 'ma-reg b'} style={{ fillOpacity: 0.12 + 0.3 * Math.abs(ev.right[1] - ev.right[0]) / Math.max(1, ev.right[0] + ev.right[1]) }} />
              {feature === 'x' ? <line x1={sx(cut)} x2={sx(cut)} y1={MT} y2={H - MB} className="ma-cut" /> : <line x1={ML} x2={W - MR} y1={sy(cut)} y2={sy(cut)} className="ma-cut" />}
            </>
          )}
          {view === 'tree' &&
            regions.map((r, i) => (
              <rect key={i} x={sx(r.x0)} y={sy(r.y1)} width={sx(r.x1) - sx(r.x0)} height={sy(r.y0) - sy(r.y1)} className={r.p1 >= 0.5 ? 'ma-reg a' : 'ma-reg b'} style={{ fillOpacity: 0.12 + 0.34 * Math.abs(2 * r.p1 - 1) }} />
            ))}
          {view === 'tree' &&
            regions.map((r, i) => (
              <rect key={'o' + i} x={sx(r.x0)} y={sy(r.y1)} width={sx(r.x1) - sx(r.x0)} height={sy(r.y0) - sy(r.y1)} className="ma-reg-edge" />
            ))}
          {view === 'forest' &&
            cells.map((c) => (
              <rect key={c.j * GRID + c.i} x={ML + (c.i * (W - ML - MR)) / GRID - 0.3} y={sy(((c.j + 1) / GRID) * 10) - 0.3} width={(W - ML - MR) / GRID + 0.6} height={(H - MT - MB) / GRID + 0.6} style={{ fill: `color-mix(in srgb, var(${c.v >= 0.5 ? '--ma-a' : '--ma-b'}) ${Math.round(8 + 40 * Math.abs(2 * c.v - 1))}%, var(--surface))` }} />
            ))}

          {[0, 2, 4, 6, 8, 10].map((t) => (
            <g key={t}>
              <text x={sx(t)} y={H - 8} textAnchor="middle" className="ma-tick">
                {t}
              </text>
              <text x={ML - 6} y={sy(t) + 4} textAnchor="end" className="ma-tick">
                {t}
              </text>
            </g>
          ))}
          <rect x={ML} y={MT} width={W - ML - MR} height={H - MT - MB} className="ma-frame" />

          {train.map((p, i) =>
            p.c === 1 ? (
              <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={Math.max(5, unit * 0.16)} className="ma-dot a" />
            ) : (
              <rect key={i} x={sx(p.x) - Math.max(4.5, unit * 0.14)} y={sy(p.y) - Math.max(4.5, unit * 0.14)} width={Math.max(9, unit * 0.28)} height={Math.max(9, unit * 0.28)} className="ma-dot b" />
            ),
          )}
        </svg>

        {view === 'split' && (
          <>
            <div className="ma-ctrls">
              <div className="field">
                <span>Question about</span>
                <div className="ma-btns" role="group" aria-label="Which measurement to cut">
                  {(['x', 'y'] as Feature[]).map((f) => (
                    <button key={f} type="button" className="btn quiet" aria-pressed={feature === f} onClick={() => setFeature(f)}>
                      {f === 'x' ? 'x (across)' : 'y (up)'}
                    </button>
                  ))}
                </div>
              </div>
              <label className="field">
                <span>
                  Cut at <b>{cut.toFixed(1)}</b>
                </span>
                <input type="range" min={0.1} max={9.9} step={0.1} value={cut} onChange={(e) => setCut(+e.target.value)} />
              </label>
            </div>
            <table className="ma-table">
              <caption className="ma-sr">Class counts and impurity on each side of the cut</caption>
              <thead>
                <tr>
                  <th scope="col">Group</th>
                  <th scope="col">Circles</th>
                  <th scope="col">Squares</th>
                  <th scope="col">{criterion === 'gini' ? 'Gini' : 'Entropy'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Before</th>
                  <td>{ev.left[1] + ev.right[1]}</td>
                  <td>{ev.left[0] + ev.right[0]}</td>
                  <td>{f2(ev.parent)}</td>
                </tr>
                <tr>
                  <th scope="row">{feature} &le; {cut.toFixed(1)}</th>
                  <td>{ev.left[1]}</td>
                  <td>{ev.left[0]}</td>
                  <td>{f2(ev.impLeft)}</td>
                </tr>
                <tr>
                  <th scope="row">{feature} &gt; {cut.toFixed(1)}</th>
                  <td>{ev.right[1]}</td>
                  <td>{ev.right[0]}</td>
                  <td>{f2(ev.impRight)}</td>
                </tr>
                <tr className="ma-total">
                  <th scope="row">After</th>
                  <td colSpan={2}>drop {f2(ev.drop)}</td>
                  <td>{f2(ev.weighted)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {view === 'tree' && (
          <div className="ma-ctrls">
            <label className="field">
              <span>
                Most questions in a row (depth) <b>{depth}</b>
              </span>
              <input type="range" min={0} max={10} step={1} value={depth} onChange={(e) => setDepth(+e.target.value)} />
            </label>
          </div>
        )}
        {view === 'forest' && (
          <div className="ma-ctrls">
            <label className="field">
              <span>
                Number of trees <b>{nTrees}</b>
              </span>
              <input type="range" min={1} max={100} step={1} value={nTrees} onChange={(e) => setNTrees(+e.target.value)} />
            </label>
            <label className="field">
              <span>
                Depth of each tree <b>{fDepth}</b>
              </span>
              <input type="range" min={1} max={12} step={1} value={fDepth} onChange={(e) => setFDepth(+e.target.value)} />
            </label>
          </div>
        )}

        <div className="ma-btns">
          {view === 'split' && best && (
            <button
              type="button"
              className="btn quiet"
              onClick={() => {
                setFeature(best.feature);
                setCut(Math.round(best.threshold * 10) / 10);
              }}
            >
              Jump to the best split
            </button>
          )}
          <button type="button" className="btn quiet" aria-pressed={criterion === 'entropy'} onClick={() => setCriterion((c) => (c === 'gini' ? 'entropy' : 'gini'))}>
            Score with {criterion === 'gini' ? 'entropy instead' : 'Gini instead'}
          </button>
          <button type="button" className="btn quiet" onClick={() => setSeedIx((i) => i + 1)}>
            New data
          </button>
        </div>

        <p className="ma-readout" role="status" aria-live="polite">
          {status}
        </p>

        {view !== 'split' && (
          <div className="ma-imp" aria-hidden="true">
            {(['x', 'y'] as Feature[]).map((f) => (
              <div key={f} className="ma-imp-row">
                <span className="ma-imp-name">{f}</span>
                <span className="ma-imp-bar">
                  <i style={{ width: `${Math.round(imp[f] * 100)}%` }} />
                </span>
                <span className="ma-imp-val">{pct(imp[f])}</span>
              </div>
            ))}
            <span className="ma-imp-cap">feature importance</span>
          </div>
        )}

        {view === 'tree' && leafCount(tree) <= 8 && (
          <ul className="ma-questions" aria-label="The tree written as questions">
            <Questions node={tree} />
          </ul>
        )}
        <p className="viz-cap">
          {view === 'split'
            ? 'A good split leaves each side mostly one kind. Circles and squares that stay mixed keep the impurity high.'
            : view === 'tree'
              ? 'Low depth leaves big mixed rectangles. High depth carves a tiny box round every point, including the mislabelled ones, which is why accuracy on fresh points stops improving or drops.'
              : 'Each tree sees a different random resample and a random one of the two measurements at each cut, so their mistakes differ. The shading is the share of trees voting for each class, and it is smoother than any single tree.'}
        </p>
      </div>
    </Root>
  );
}
