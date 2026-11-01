import { useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import { anglesForPlane, makeCloud, pca, planeVarianceShare, projectTo, viewAxes, type CloudKind } from '../../lib/clustering';

const KINDS: { id: CloudKind; label: string; blurb: string }[] = [
  { id: 'pancake', label: 'Flat pancake', blurb: 'wide and long, but thin' },
  { id: 'cigar', label: 'Long cigar', blurb: 'almost a line' },
  { id: 'ball', label: 'Round ball', blurb: 'the same spread in every direction' },
];

const W = 400;
const H = 330;
const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;
const pct = (v: number) => Math.round(v * 100) + '%';
const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * A cloud of 3D points seen from a direction you choose. Turn the cloud (drag, or use the sliders) and watch how much of its
 * spread survives flattening to the screen. PCA's own best view is one button away.
 */
export default function PcaRotator() {
  const [kind, setKind] = useState<CloudKind>('pancake');
  const [yaw, setYaw] = useState(rad(10));
  const [pitch, setPitch] = useState(rad(15));
  const [roll, setRoll] = useState(0);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const cloud = useMemo(() => makeCloud(kind, 4, 140), [kind]);
  const fit = useMemo(() => pca(cloud), [cloud]);
  const { right, up } = viewAxes(yaw, pitch, roll);
  const share = planeVarianceShare(fit.cov, right, up);
  const best = fit.ratios[0] + fit.ratios[1];
  const proj = useMemo(() => projectTo(cloud, fit.mean, right, up), [cloud, fit.mean, right, up]);

  const scale = 40; // pixels per unit
  const cx = W / 2;
  const cy = H / 2;
  const depths = proj.map((p) => p[2]);
  const dmin = Math.min(...depths);
  const dmax = Math.max(...depths);

  function snap() {
    const a = anglesForPlane(fit.components[0], fit.components[1]);
    setYaw(a.yaw);
    setPitch(a.pitch);
    setRoll(a.roll);
  }
  function wrap(v: number) {
    const t = Math.PI;
    return ((((v + t) % (2 * t)) + 2 * t) % (2 * t)) - t;
  }
  const axisLen = 3.4;
  const axes = ([
    ['x', [1, 0, 0]],
    ['y', [0, 1, 0]],
    ['z', [0, 0, 1]],
  ] as const).map(([name, v]) => {
    const px = (v[0] * right[0] + v[1] * right[1] + v[2] * right[2]) * axisLen;
    const py = (v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) * axisLen;
    return { name, x2: r2(cx + px * scale), y2: r2(cy - py * scale) };
  });

  const lost = 1 - share;
  const status = `${KINDS.find((k) => k.id === kind)?.label}: this view keeps ${pct(share)} of the total spread and flattens away ${pct(lost)}. The best flat view (the first two principal components) keeps ${pct(best)}. Spread along the principal components: ${pct(fit.ratios[0])}, ${pct(fit.ratios[1])}, ${pct(fit.ratios[2])}.${share >= best - 0.005 ? ' You are looking at the best view.' : ''}`;

  return (
    <Root>
      <div className="viz ap2 ap2-pca">
        <p className="viz-title">Find the best flat view of a 3D cloud</p>
        <div className="ap2-row" role="group" aria-label="Which cloud">
          <span className="ap2-lab">Cloud</span>
          {KINDS.map((k) => (
            <button key={k.id} type="button" className="btn quiet" aria-pressed={kind === k.id} onClick={() => setKind(k.id)} title={k.blurb}>
              {k.label}
            </button>
          ))}
        </div>
        <p className="ap2-note">{KINDS.find((k) => k.id === kind)?.blurb}. 140 made-up points. Drag the picture with a mouse, or use the sliders (touch screens: sliders).</p>

        <div className="ap2-split">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="ap2-svg ap2-pca-svg"
            role="img"
            aria-label={`The 3D cloud seen from the current direction, flattened to 2D. This view keeps ${pct(share)} of the spread.`}
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') return;
              drag.current = { x: e.clientX, y: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const dx = e.clientX - drag.current.x;
              const dy = e.clientY - drag.current.y;
              drag.current = { x: e.clientX, y: e.clientY };
              setYaw((v) => wrap(v + dx * 0.012));
              setPitch((v) => Math.max(-Math.PI / 2, Math.min(Math.PI / 2, v - dy * 0.012)));
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            <rect x={1} y={1} width={W - 2} height={H - 2} className="ap2-frame" />
            {axes.map((a) => (
              <g key={a.name}>
                <line x1={cx} y1={cy} x2={a.x2} y2={a.y2} className="ap2-axis3" />
                <text x={a.x2 + (a.x2 >= cx ? 5 : -5)} y={a.y2 + 4} textAnchor={a.x2 >= cx ? 'start' : 'end'} className="ap2-t">
                  {a.name}
                </text>
              </g>
            ))}
            {proj
              .map((p, i) => ({ p, i }))
              .sort((a, b) => a.p[2] - b.p[2])
              .map(({ p, i }) => (
                <circle key={i} cx={r2(cx + p[0] * scale)} cy={r2(cy - p[1] * scale)} r={4.2} className="ap2-dot ap2-c0" style={{ fillOpacity: r2(0.35 + 0.6 * ((p[2] - dmin) / (dmax - dmin || 1))) }} />
              ))}
          </svg>

          <div className="ap2-side">
            <div className="ap2-bars" aria-hidden="true">
              <p className="ap2-mini-title">Where the spread lives (principal components)</p>
              {fit.ratios.map((r, i) => (
                <div key={i} className="ap2-barrow">
                  <span>PC{i + 1}</span>
                  <span className="ap2-track">
                    <i style={{ width: `${Math.round(r * 100)}%` }} />
                  </span>
                  <b>{pct(r)}</b>
                </div>
              ))}
              <p className="ap2-mini-title ap2-gap">Kept by this view</p>
              <div className="ap2-barrow">
                <span>You</span>
                <span className="ap2-track">
                  <i className={share >= best - 0.005 ? 'ap2-full' : 'ap2-you'} style={{ width: `${Math.round(share * 100)}%` }} />
                  <em style={{ left: `${Math.round(best * 100)}%` }} />
                </span>
                <b>{pct(share)}</b>
              </div>
              <p className="ap2-note">The tick marks the most any flat view can keep, {pct(best)}: the first two components together.</p>
            </div>
          </div>
        </div>

        <div className="ap2-ctrls">
          <label className="field">
            <span>
              Turn left and right <b>{Math.round(deg(yaw))}&deg;</b>
            </span>
            <input type="range" min={-180} max={180} step={1} value={Math.round(deg(yaw))} onChange={(e) => setYaw(rad(+e.target.value))} />
          </label>
          <label className="field">
            <span>
              Tip forward and back <b>{Math.round(deg(pitch))}&deg;</b>
            </span>
            <input type="range" min={-90} max={90} step={1} value={Math.round(deg(pitch))} onChange={(e) => setPitch(rad(+e.target.value))} />
          </label>
          <label className="field">
            <span>
              Spin the picture <b>{Math.round(deg(roll))}&deg;</b>
            </span>
            <input type="range" min={-180} max={180} step={1} value={Math.round(deg(roll))} onChange={(e) => setRoll(rad(+e.target.value))} />
          </label>
        </div>
        <div className="ap2-row ap2-tight">
          <button type="button" className="btn" onClick={snap}>
            Snap to the best view (PCA)
          </button>
          <button
            type="button"
            className="btn quiet"
            onClick={() => {
              setYaw(0);
              setPitch(Math.PI / 2);
              setRoll(0);
            }}
          >
            Look straight down the z axis
          </button>
        </div>

        <p className="ap2-readout" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </Root>
  );
}
