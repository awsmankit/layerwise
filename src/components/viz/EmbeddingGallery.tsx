import { useMemo, useState } from 'react';
import { Root } from './shared';
import { GALLERY, LAYOUT_LABELS, groupRatios, layoutPoints, trueRatios, type LayoutKey } from '../../lib/embedding-gallery';

type Which = 'groups' | 'noise';

const ROWS: { label: string; keys: LayoutKey[] }[] = [
  { label: 'PCA', keys: ['pca'] },
  { label: 't-SNE perplexity', keys: ['tsne2', 'tsne5', 'tsne30', 'tsne100'] },
  { label: 'UMAP neighbours', keys: ['umap3', 'umap15', 'umap60'] },
];
const SHORT: Record<LayoutKey, string> = { pca: 'PCA', tsne2: '2', tsne5: '5', tsne30: '30', tsne100: '100', umap3: '3', umap15: '15', umap60: '60' };

const S = 400;
const M = 14;

/**
 * The same 180 points in ten dimensions, flattened to 2D by PCA, by t-SNE at four perplexities and by UMAP at three neighbour
 * counts. The layouts were computed offline; the page only draws them and measures what each one kept.
 */
export default function EmbeddingGallery() {
  const [which, setWhich] = useState<Which>('groups');
  const [key, setKey] = useState<LayoutKey>('tsne30');

  const data = GALLERY[which];
  const pts = useMemo(() => layoutPoints(data, key), [data, key]);
  const bounds = useMemo(() => {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const span = Math.max(x1 - x0, y1 - y0) || 1;
    return { x0: (x0 + x1) / 2 - span / 2, y0: (y0 + y1) / 2 - span / 2, span };
  }, [pts]);
  const sx = (v: number) => M + ((v - bounds.x0) / bounds.span) * (S - 2 * M);
  const sy = (v: number) => S - M - ((v - bounds.y0) / bounds.span) * (S - 2 * M);

  const ratios = which === 'groups' ? groupRatios(pts, data.groups) : null;
  const truth = trueRatios();
  const knn = data.layouts[key].knn;

  const status =
    which === 'groups'
      ? `${LAYOUT_LABELS[key]}. About ${Math.round(knn * 100)}% of each point's 10 nearest neighbours in the original 10 dimensions are still among its 10 nearest neighbours in this picture. Group C is ${ratios?.acOverAb.toFixed(1)} times further from group A than group B is (in the real data: ${truth.acOverAb.toFixed(1)} times). Group B looks ${ratios?.bOverA.toFixed(1)} times as wide as group A (in the real data: ${truth.bOverA.toFixed(1)} times).`
      : `${LAYOUT_LABELS[key]}. These 180 points are one random blob with no groups in it. About ${Math.round(knn * 100)}% of each point's 10 nearest neighbours are preserved. Look at the picture: any clumps and gaps you see were produced by the method and its settings, not found in the data.`;

  return (
    <Root>
      <div className="viz ap2 ap2-emb">
        <p className="viz-title">The same data, flattened eight ways</p>
        <div className="ap2-row" role="group" aria-label="Data">
          <span className="ap2-lab">Data</span>
          <button type="button" className="btn quiet" aria-pressed={which === 'groups'} onClick={() => setWhich('groups')}>
            Three groups
          </button>
          <button type="button" className="btn quiet" aria-pressed={which === 'noise'} onClick={() => setWhich('noise')}>
            One random blob
          </button>
        </div>
        {ROWS.map((r) => (
          <div key={r.label} className="ap2-row ap2-tight" role="group" aria-label={r.label}>
            <span className="ap2-lab ap2-lab-wide">{r.label}</span>
            {r.keys.map((k) => (
              <button key={k} type="button" className="btn quiet ap2-sq" aria-pressed={key === k} aria-label={LAYOUT_LABELS[k]} onClick={() => setKey(k)}>
                {SHORT[k]}
              </button>
            ))}
          </div>
        ))}

        <div className="ap2-split">
          <svg viewBox={`0 0 ${S} ${S}`} className="ap2-svg" role="img" aria-label={`${LAYOUT_LABELS[key]} layout of 180 points in 2D${which === 'groups' ? ', coloured by the three real groups A, B and C' : ''}.`}>
            <rect x={M} y={M} width={S - 2 * M} height={S - 2 * M} className="ap2-frame" />
            {pts.map((p, i) => (
              <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={4} className={`ap2-dot ${which === 'groups' ? `ap2-c${data.groups[i] === 0 ? 0 : data.groups[i] === 1 ? 1 : 2}` : 'ap2-plain'}`} />
            ))}
          </svg>
          <div className="ap2-side">
            <dl className="ap2-stats" aria-hidden="true">
              <div>
                <dt>Neighbours kept (of 10)</dt>
                <dd>{Math.round(knn * 100)}%</dd>
              </div>
              {ratios && (
                <>
                  <div>
                    <dt>C is further than B from A by</dt>
                    <dd>
                      {ratios.acOverAb.toFixed(1)}x <small>real {truth.acOverAb.toFixed(1)}x</small>
                    </dd>
                  </div>
                  <div>
                    <dt>B looks wider than A by</dt>
                    <dd>
                      {ratios.bOverA.toFixed(1)}x <small>real {truth.bOverA.toFixed(1)}x</small>
                    </dd>
                  </div>
                </>
              )}
            </dl>
            {which === 'groups' && (
              <p className="ap2-legend">
                <span><i className="ap2-sw ap2-f0" /> A: dense</span>
                <span><i className="ap2-sw ap2-f1" /> B: sparse, 8 units from A</span>
                <span><i className="ap2-sw ap2-f2" /> C: dense, 40 units from A</span>
              </p>
            )}
          </div>
        </div>

        <p className="ap2-readout" role="status" aria-live="polite">
          {status}
        </p>
        <p className="viz-cap">
          Example data made for this lesson: 10 dimensions, 180 points. Layouts computed once, offline, with scikit-learn 1.9.1 (PCA, t-SNE) and umap-learn 0.5.12 (UMAP), fixed random seeds, on 1 November 2026. Different seeds or versions give different pictures, which is part of the point.
        </p>
      </div>
    </Root>
  );
}
