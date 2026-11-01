import { useState } from 'react';
import { Root } from './shared';
import { dcg, idealDcg, ndcg, precisionAtK, recallAtK, type Gain } from '../../lib/ranking-metrics';

const LETTERS = 'ABCDEFGH';
const START = [3, 2, 3, 0, 1, 2, 0, 0];

type Row = { id: number; rel: number };

const f3 = (x: number) => x.toFixed(3);

/** Reorder a ranked list and set each result's relevance grade; watch precision@k, recall@k, DCG and NDCG@k respond. */
export default function NdcgCalculator() {
  const [rows, setRows] = useState<Row[]>(START.map((rel, id) => ({ id, rel })));
  const [k, setK] = useState(6);
  const [gain, setGain] = useState<Gain>('linear');
  const [missing, setMissing] = useState(0);

  const rels = rows.map((r) => r.rel);
  const d = dcg(rels, k, gain);
  const ideal = idealDcg(rels, k, gain);
  const n = ndcg(rels, k, gain);
  const inList = rels.filter((r) => r > 0).length;
  const prec = precisionAtK(rels, k);
  const rec = recallAtK(rels, k, inList + missing);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = rows.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  };
  const bump = (i: number) => setRows(rows.map((r, x) => (x === i ? { ...r, rel: (r.rel + 1) % 4 } : r)));

  const status = `Top ${k}: precision ${f3(prec)}, recall ${f3(rec)}. DCG ${f3(d)}, best possible DCG for these grades ${f3(ideal)}, so NDCG at ${k} is ${f3(n)}.${n >= 0.999 ? ' This ordering is the best possible.' : ''}`;

  return (
    <Root>
      <div className="viz ap1">
        <p className="viz-title">Rank-aware scoring: NDCG calculator</p>
        <p className="ap1-note">
          A search or recommender returned these 8 results, best guess first. Tap a grade to cycle it from 0 (useless) to 3 (excellent). Use the arrows to move a result up or down. Rows below the cutoff k are greyed and ignored.
        </p>
        <ol className="ap1-rank">
          {rows.map((r, i) => {
            const counted = i < k;
            const disc = 1 / Math.log2(i + 2);
            const g = gain === 'exponential' ? 2 ** r.rel - 1 : r.rel;
            return (
              <li key={r.id} className={counted ? '' : 'is-off'}>
                <span className="ap1-rk">#{i + 1}</span>
                <span className="ap1-item">Item {LETTERS[r.id]}</span>
                <button type="button" className="btn quiet ap1-grade" data-rel={r.rel} onClick={() => bump(i)} aria-label={`Item ${LETTERS[r.id]}, rank ${i + 1}, relevance ${r.rel} of 3. Tap to change.`}>
                  grade {r.rel}
                </button>
                <span className="ap1-calc" aria-hidden="true">
                  {counted ? `${g} x ${disc.toFixed(3)} = ${(g * disc).toFixed(3)}` : 'not counted'}
                </span>
                <span className="ap1-move">
                  <button type="button" className="btn quiet" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move item ${LETTERS[r.id]} up`}>Up</button>
                  <button type="button" className="btn quiet" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move item ${LETTERS[r.id]} down`}>Down</button>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="ap1-small">Each counted row shows gain x discount, where the discount is 1 / log2(rank + 1): 1.000 at rank 1, 0.631 at rank 2, 0.500 at rank 3.</p>

        <div className="ap1-ctrls">
          <label className="field">
            <span>Cutoff k <b>{k}</b></span>
            <input type="range" min={1} max={8} step={1} value={k} onChange={(e) => setK(+e.target.value)} />
          </label>
          <label className="field">
            <span>Relevant items the system never returned <b>{missing}</b></span>
            <input type="range" min={0} max={5} step={1} value={missing} onChange={(e) => setMissing(+e.target.value)} />
          </label>
          <div className="field">
            <span>Gain</span>
            <div className="ap1-btns" role="group" aria-label="Gain formula">
              <button type="button" className="btn quiet" aria-pressed={gain === 'linear'} onClick={() => setGain('linear')}>grade</button>
              <button type="button" className="btn quiet" aria-pressed={gain === 'exponential'} onClick={() => setGain('exponential')}>2^grade - 1</button>
            </div>
          </div>
        </div>

        <div className="ap1-btns">
          <button type="button" className="btn quiet" onClick={() => setRows([...rows].sort((a, b) => b.rel - a.rel))}>Put the best first</button>
          <button type="button" className="btn quiet" onClick={() => setRows([...rows].sort((a, b) => a.rel - b.rel))}>Worst first</button>
          <button type="button" className="btn quiet" onClick={() => { setRows(START.map((rel, id) => ({ id, rel }))); setK(6); setGain('linear'); setMissing(0); }}>Reset</button>
        </div>

        <dl className="ap1-stats">
          <div><dt>Precision@{k}</dt><dd>{f3(prec)}</dd></div>
          <div><dt>Recall@{k}</dt><dd>{f3(rec)}</dd></div>
          <div><dt>DCG@{k}</dt><dd>{f3(d)}</dd></div>
          <div><dt>Best possible DCG@{k}</dt><dd>{f3(ideal)}</dd></div>
          <div className="is-main"><dt>NDCG@{k}</dt><dd>{f3(n)}</dd></div>
        </dl>
        <p className="ap1-small">Precision and recall treat any grade above 0 as a hit and ignore the order inside the top k. NDCG uses the grades and the order. Here the best possible ordering is the same grades sorted from highest to lowest.</p>
        <p className="ap1-readout" role="status" aria-live="polite">{status}</p>
      </div>
    </Root>
  );
}
