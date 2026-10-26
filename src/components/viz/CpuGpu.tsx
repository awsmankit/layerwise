import { useState } from 'react';
import { motion } from 'motion/react';
import { Root } from './shared';

const COLS = 16;
const ROWS = 8;
const cells = Array.from({ length: COLS * ROWS }, (_, i) => ({ x: i % COLS, y: Math.floor(i / COLS) }));

/**
 * The same job on two chips, drawn to the same scale. A CPU has a few large
 * cores, each with its own control logic. A GPU has hundreds or thousands of
 * small ones that all run the same instruction on different data. Press Run
 * to start the work; a core that finishes its share goes quiet.
 */
export default function CpuGpu() {
  const [on, setOn] = useState(false);

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">Same work, two chips</p>
          <button type="button" className="btn quiet" aria-pressed={on} onClick={() => setOn((v) => !v)}>
            {on ? 'Reset' : 'Run'}
          </button>
        </div>

        <svg viewBox="0 0 760 250" className="dx-svg" role="img" aria-label="A CPU with four large cores beside a GPU with a grid of small cores">
          <g>
            <rect x="20" y="20" width="330" height="210" className="dx-frame" />
            <text x="36" y="46" className="dx-name">CPU</text>
            {[0, 1, 2, 3].map((i) => {
              const x = 46 + (i % 2) * 150;
              const y = 62 + Math.floor(i / 2) * 84;
              return (
                <g key={i}>
                  <rect x={x} y={y} width="130" height="72" className="dx-core" />
                  <motion.rect
                    x={x + 10}
                    y={y + 54}
                    height="8"
                    className="dx-bar"
                    initial={{ width: 0 }}
                    animate={{ width: on ? 110 : 0 }}
                    transition={{ duration: 4, ease: 'linear' }}
                  />
                  <text x={x + 10} y={y + 26} className="dx-small">big core</text>
                </g>
              );
            })}
          </g>

          <g>
            <rect x="410" y="20" width="330" height="210" className="dx-frame" />
            <text x="426" y="46" className="dx-name">GPU</text>
            {cells.map((c) => (
              <motion.rect
                key={`${c.x}-${c.y}`}
                x={436 + c.x * 18}
                y={62 + c.y * 18}
                width="13"
                height="13"
                className="dx-cell"
                initial={{ fillOpacity: 0.12 }}
                animate={{ fillOpacity: on ? [0.12, 1, 0.12] : 0.12 }}
                transition={{ duration: 1.4, delay: (c.x + c.y) * 0.06, repeat: on ? Infinity : 0, ease: 'easeInOut' }}
              />
            ))}
          </g>
        </svg>
      </div>
    </Root>
  );
}
