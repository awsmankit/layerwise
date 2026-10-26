import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

const WORDS = ['The', 'cat', 'sat', 'on', 'the', 'mat'];
const X0 = 30;
const STEP = 118;
const W = 96;

/**
 * Generation one token at a time. Each new token computes its own key and
 * value once and adds them to the cache; its query then reads every key and
 * value already stored. Nothing earlier is recomputed.
 */
export default function KvGrowth() {
  const [t, setT] = useState(1);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (!play) return;
    const id = setInterval(() => setT((v) => (v >= WORDS.length ? 1 : v + 1)), 1400);
    return () => clearInterval(id);
  }, [play]);

  const now = t - 1;
  const x = (i: number) => X0 + i * STEP;

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">The cache, one token at a time</p>
          <div className="dx-steps">
            <button type="button" className="btn quiet" onClick={() => { setPlay(false); setT((v) => (v >= WORDS.length ? 1 : v + 1)); }}>
              Next token
            </button>
            <button type="button" className="btn quiet" aria-pressed={play} onClick={() => setPlay((p) => !p)}>
              {play ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>

        <svg viewBox="0 0 740 250" className="dx-svg" role="img" aria-label={`${t} tokens generated. The newest token reads ${now} cached keys and values.`}>
          {/* the newest query reading every cached key and value */}
          {Array.from({ length: now }, (_, i) => (
            <motion.path
              key={`q${t}-${i}`}
              d={`M ${x(now) + W / 2} 74 C ${x(now) + W / 2} 92, ${x(i) + W / 2} 84, ${x(i) + W / 2} 100`}
              className="dx-residual"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.05, ease: EASE }}
            />
          ))}

          {WORDS.map((w, i) => {
            const shown = i < t;
            const isNew = i === now;
            return (
              <motion.g key={w + i} initial={false} animate={{ opacity: shown ? 1 : 0.18 }} transition={{ duration: 0.35 }}>
                <rect x={x(i)} y="36" width={W} height="36" rx="8" className={isNew ? 'dx-core dx-hot' : 'dx-core'} />
                <text x={x(i) + W / 2} y="59" textAnchor="middle" className="dx-name">{w}</text>

                <rect x={x(i)} y="104" width={W / 2 - 3} height="30" rx="5" className={isNew ? 'kv-new' : shown ? 'kv-cached' : 'dx-core'} />
                <text x={x(i) + W / 4 - 1.5} y="123" textAnchor="middle" className={isNew ? 'dx-small kv-on' : 'dx-small'}>K</text>
                <rect x={x(i) + W / 2 + 3} y="104" width={W / 2 - 3} height="30" rx="5" className={isNew ? 'kv-new' : shown ? 'kv-cached' : 'dx-core'} />
                <text x={x(i) + (3 * W) / 4 + 1.5} y="123" textAnchor="middle" className={isNew ? 'dx-small kv-on' : 'dx-small'}>V</text>
              </motion.g>
            );
          })}

          {/* cache bracket under the stored entries */}
          <motion.path
            initial={false}
            animate={{ d: `M ${X0} 150 V 158 H ${x(now) + W} V 150` }}
            transition={{ duration: 0.5, ease: EASE }}
            className="dx-link"
          />
          <motion.text initial={false} animate={{ x: X0 + (x(now) + W - X0) / 2 }} transition={{ duration: 0.5, ease: EASE }} y="178" textAnchor="middle" className="dx-small">
            {`KV cache: ${t} token${t === 1 ? '' : 's'}, kept in GPU memory`}
          </motion.text>

          <g transform="translate(30 206)">
            <rect width="16" height="12" rx="3" className="kv-new" />
            <text x="24" y="10" className="dx-small">computed this step</text>
            <rect x="170" width="16" height="12" rx="3" className="kv-cached" />
            <text x="194" y="10" className="dx-small">computed once, read every step</text>
            <path d="M 420 6 H 452" className="dx-residual" />
            <text x="460" y="10" className="dx-small">the new token reads all of them</text>
          </g>
        </svg>
        <p className="viz-cap">
          Without the cache, every step would recompute the keys and values of the whole text so far. With it, each step adds one key and one value per layer, and the cache grows with every token.
        </p>
      </div>
    </Root>
  );
}
