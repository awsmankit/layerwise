import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { FREE_GIB, contextChoices, exampleShape, groupOf, groupSize, kibPerToken, kind, sharedChoices, usersThatFit } from '../../lib/whatif/grouped-query-attention';

const Q = exampleShape.queryHeads;
const PITCH = 11.5;
const X0 = 6;
const W = 368;
const GOOD = '#1f9d6b';
const BAD = '#d6453d';
const COLOURS = ['#2b7fd6', '#c28a00', '#1f9d6b', '#8a4fd6', '#d6453d', '#0e8aa0', '#b5539a', '#6b7a1a'];
const MAX_SEG = 64;

const r4 = (x: number) => Math.round(x * 10000) / 10000;
const n = (x: number) => x.toLocaleString('en-US');
const kib = (x: number) => (x >= 1024 ? `${x / 1024} MiB` : `${x} KiB`);
const kindName = { 'multi-head': 'multi-head (every head its own)', 'grouped-query': 'grouped-query', 'multi-query': 'multi-query (one shared)' } as const;

/**
 * 32 query heads read from a smaller set of key-value heads. Fewer KV heads means a smaller cache per token,
 * so more conversations fit in the same memory. Only memory is computed here, not answer quality.
 */
export default function GroupedQueryAttentionWhatIf() {
  const [shared, setShared] = useState(true);
  const [pick, setPick] = useState(3); // index into sharedChoices: 8 KV heads
  const [ctxIdx, setCtxIdx] = useState(1);

  const ctx = contextChoices[ctxIdx];
  const g = shared ? sharedChoices[pick] : Q;
  const perToken = kibPerToken(g);
  const full = kibPerToken(Q);
  const users = usersThatFit(g, ctx);
  const usersFull = usersThatFit(Q, ctx);
  const perUserGiB = (perToken * ctx) / (1024 * 1024);
  const segW = (W * perUserGiB) / FREE_GIB;
  const gw = W / g;
  const showText = g <= 8;

  const segs = useMemo(() => Array.from({ length: MAX_SEG }, (_, i) => i), []);

  const verdict = shared ? (
    <>
      {g} key-value {g === 1 ? 'head' : 'heads'} ({kind(g)}) {g === 1 ? 'stores' : 'store'} {kib(perToken)} per token, {full / perToken} times smaller than the {kib(full)} when every head keeps its own. In {FREE_GIB} GiB (example) that fits {n(users)} conversations of {n(ctx)} tokens, against {n(usersFull)}.
    </>
  ) : (
    <>
      Every head keeps its own keys and values: {kib(perToken)} of cache for each token. A {n(ctx)}-token conversation holds {perUserGiB} GiB, so only {n(users)} fit in the {FREE_GIB} GiB (example). Sharing in groups of 4 would fit {n(usersThatFit(8, ctx))}.
    </>
  );

  return (
    <WhatIfFrame
      title="Who gets their own keys and values?"
      withLabel="Heads share (grouped)"
      withoutLabel="One set per head"
      on={shared}
      onChange={setShared}
      verdict={verdict}
      controls={
        <>
          <label className="field wl-field">
            <span>
              Key-value heads <b>{g}</b> ({kind(g)})
            </span>
            <input type="range" min={0} max={sharedChoices.length - 1} step={1} value={pick} disabled={!shared} onChange={(e) => setPick(+e.target.value)} aria-label="Number of key-value heads when heads share" aria-valuetext={`${sharedChoices[pick]} key-value heads`} />
          </label>
          <label className="field wl-field">
            <span>Tokens per conversation</span>
            <select className="wl-select" value={ctxIdx} onChange={(e) => setCtxIdx(+e.target.value)} aria-label="Tokens per conversation">
              {contextChoices.map((c, i) => (
                <option key={c} value={i}>
                  {n(c)} tokens
                </option>
              ))}
            </select>
          </label>
        </>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: each attention head asks its own question (a query) of the earlier words. The answers it reads, called keys and values, have to be kept for every earlier word. Normally every head keeps its own copy. Sharing means several heads read the same copy, so there is less to store. Example model shape: {exampleShape.layers} layers, {Q} heads, 128 numbers per head, 16-bit numbers.
      </p>
      <svg viewBox="0 0 380 292" className="dx-svg wi-svg wl-cap" role="img" aria-label={`${Q} query heads read from ${g} key-value heads. The cache is ${kib(perToken)} per token. In ${FREE_GIB} GiB of example memory, ${users} conversations of ${ctx} tokens fit.`}>
        <text x={0} y={13} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          {Q} query heads (each asks its own question)
        </text>
        {Array.from({ length: Q }, (_, i) => {
          const gi = groupOf(i, g);
          const qx = X0 + i * PITCH + 4.5;
          const kx = X0 + gi * gw + gw / 2;
          return (
            <g key={i}>
              <line x1={r4(qx)} y1={36} x2={r4(kx)} y2={82} stroke={COLOURS[gi % COLOURS.length]} strokeWidth={1.4} opacity={0.75} />
              <rect x={X0 + i * PITCH} y={22} width={9} height={14} rx={2.5} fill={COLOURS[gi % COLOURS.length]} />
            </g>
          );
        })}
        {Array.from({ length: g }, (_, gi) => (
          <motion.g key={`${g}-${gi}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: EASE }}>
            <rect x={r4(X0 + gi * gw + 1)} y={82} width={r4(Math.max(gw - 2, 1))} height={24} rx={5} fill={COLOURS[gi % COLOURS.length]} fillOpacity={0.9} stroke="currentColor" strokeWidth={1} strokeOpacity={0.5} />
            {showText && (
              <text x={r4(X0 + gi * gw + gw / 2)} y={99} textAnchor="middle" style={{ fill: '#fff', fontSize: 13, fontWeight: 700 }}>
                K V
              </text>
            )}
          </motion.g>
        ))}
        <text x={0} y={126} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
          {g} key-value {g === 1 ? 'head' : 'heads'} stored{g < Q ? `, ${groupSize(g)} query heads each` : ''}
        </text>

        <text x={0} y={158} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          cache for one token (full bar = one set per head)
        </text>
        <rect x={0} y={166} width={W + 12} height={16} rx={5} fill="currentColor" opacity={0.08} />
        <motion.rect x={0} y={166} height={16} rx={5} fill={g === Q ? BAD : GOOD} initial={false} animate={{ width: r4(Math.max(((W + 12) * perToken) / full, 3)) }} transition={{ duration: 0.5, ease: EASE }} />
        <text x={0} y={202} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
          {kib(perToken)} per token
        </text>
        <text x={380} y={202} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          {kindName[kind(g)]}
        </text>

        <text x={0} y={234} style={{ fill: 'var(--ink-2)', fontSize: 13 }}>
          {FREE_GIB} GiB (example) of memory: one block per conversation
        </text>
        <rect x={0} y={242} width={W + 12} height={22} rx={5} fill="currentColor" opacity={0.08} />
        {segs.map((i) => (
          <motion.rect key={i} y={242} height={22} rx={2} fill={g === Q ? BAD : GOOD} stroke="var(--surface)" strokeWidth={1.2} initial={false} animate={{ x: r4(i * segW), width: r4(Math.max(segW, 0.1)), opacity: i < users && users <= MAX_SEG ? 0.85 : 0 }} transition={{ duration: 0.45, ease: EASE }} />
        ))}
        {users > MAX_SEG && <rect x={0} y={242} width={W + 12} height={22} rx={5} fill={GOOD} opacity={0.5} />}
        <text x={0} y={284} style={{ fill: 'var(--ink)', fontSize: 13, fontWeight: 700 }}>
          {n(users)} {users === 1 ? 'conversation fits' : 'conversations fit'}
          {users > MAX_SEG ? ' (blocks too thin to draw)' : ''}
        </text>
      </svg>
      <details className="wl-note">
        <summary>The numbers behind the bars (example shape)</summary>
        <p>
          Cache per token = 2 (keys and values) x {exampleShape.layers} layers x key-value heads x 128 numbers x 2 bytes. With {Q} heads that is 524,288 bytes, which is 512 KiB. With 8 heads it is 128 KiB and with 1 head 16 KiB. A conversation of {n(ctx)} tokens holds {n(ctx)} times that, and the number of conversations is the free memory divided by it, rounded down. The {FREE_GIB} GiB is an assumed amount left after the weights, not a measured one. This page computes memory only. Whether answers stay as good is a separate question, which the two papers linked below study.
        </p>
      </details>
    </WhatIfFrame>
  );
}
