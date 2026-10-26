import { useState } from 'react';
import { motion } from 'motion/react';
import { Root } from './shared';

const CX = 240;
/** Height of the packet's journey down the main path, in SVG units. */
const PATH = [30, 87, 150, 215, 265, 330, 395, 445];

/**
 * One block of a transformer, read top to bottom. The token's vector travels
 * down the main path; the two thin lines on the right are the residual
 * connections, which carry the original vector past each sub-layer and add it
 * back in. Press Run to send a token through.
 */
export default function TransformerFlow() {
  const [on, setOn] = useState(false);

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">One block, top to bottom</p>
          <button type="button" className="btn quiet" aria-pressed={on} onClick={() => setOn((v) => !v)}>
            {on ? 'Stop' : 'Run'}
          </button>
        </div>

        <svg viewBox="0 0 520 480" className="dx-svg dx-tall" role="img" aria-label="Flow through one transformer block: norm, attention, add, norm, MLP, add, with residual lines bypassing each sub-layer">
          {/* repeat bracket */}
          <path d="M 150 60 H 128 V 452 H 150" className="dx-link" />
          <text x="112" y="256" textAnchor="middle" transform="rotate(-90 112 256)" className="dx-small">repeat for every layer</text>

          {/* main path */}
          <path d={`M ${CX} 46 V 70 M ${CX} 104 V 120 M ${CX} 180 V 203 M ${CX} 227 V 250 M ${CX} 284 V 300 M ${CX} 360 V 383 M ${CX} 407 V 430`} className="dx-link" />

          {/* residual connections */}
          <motion.path
            d={`M ${CX + 60} 46 H 400 V 215 H ${CX + 12}`}
            className="dx-residual"
            animate={{ strokeOpacity: on ? 1 : 0.5 }}
            transition={{ duration: 0.4 }}
          />
          <motion.path
            d={`M ${CX + 60} 227 H 420 V 395 H ${CX + 12}`}
            className="dx-residual"
            animate={{ strokeOpacity: on ? 1 : 0.5 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          />
          <text x="410" y="132" className="dx-small">residual</text>
          <text x="430" y="312" className="dx-small">residual</text>

          {/* blocks */}
          <rect x="180" y="14" width="120" height="32" rx="16" className="dx-core" />
          <text x={CX} y="35" textAnchor="middle" className="dx-name">token vector</text>

          <rect x="180" y="70" width="120" height="34" className="dx-core" />
          <text x={CX} y="92" textAnchor="middle" className="dx-name">norm</text>

          <rect x="150" y="120" width="180" height="60" className="dx-core dx-hot" />
          <text x={CX} y="146" textAnchor="middle" className="dx-name">attention</text>
          <text x={CX} y="164" textAnchor="middle" className="dx-small">sees every token</text>

          <circle cx={CX} cy="215" r="12" className="dx-core" />
          <text x={CX} y="219" textAnchor="middle" className="dx-name">+</text>

          <rect x="180" y="250" width="120" height="34" className="dx-core" />
          <text x={CX} y="272" textAnchor="middle" className="dx-name">norm</text>

          <rect x="160" y="300" width="160" height="60" className="dx-core dx-hot" />
          <text x={CX} y="326" textAnchor="middle" className="dx-name">MLP</text>
          <text x={CX} y="344" textAnchor="middle" className="dx-small">each token on its own</text>

          <circle cx={CX} cy="395" r="12" className="dx-core" />
          <text x={CX} y="399" textAnchor="middle" className="dx-name">+</text>

          <rect x="180" y="430" width="120" height="32" rx="16" className="dx-core" />
          <text x={CX} y="451" textAnchor="middle" className="dx-name">next block</text>

          {/* the token */}
          <motion.circle
            cx={CX}
            r="6"
            className="dx-packet"
            animate={on ? { cy: PATH, opacity: 1 } : { cy: PATH[0], opacity: 0 }}
            transition={on ? { duration: 6, ease: 'linear', repeat: Infinity } : { duration: 0.3 }}
          />
        </svg>
      </div>
    </Root>
  );
}
