import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Root, EASE } from './shared';
import { Glyph } from './glyphs';

/** Where the packet rests at each step: run, interrupt, store, person, resume, continue. */
const SPOTS: [number, number][] = [
  [80, 52],
  [235, 52],
  [235, 205],
  [440, 205],
  [520, 52],
  [670, 52],
];

/**
 * Human-in-the-loop as a pause that survives a restart. interrupt() stops the
 * run, the checkpointer saves state under a thread id, a person decides at
 * their own pace, and the app resumes with the same thread id.
 */
export default function InterruptFlow() {
  const reduce = useReducedMotion();
  const [approve, setApprove] = useState(true);
  const [step, setStep] = useState(0);
  const last = SPOTS.length - 1;
  const shown = reduce ? last : step;

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setStep((s) => (s >= last ? 0 : s + 1)), step >= last ? 2600 : 1500);
    return () => clearTimeout(t);
  }, [step, last, reduce]);

  const notes = [
    'The run reaches the refund step.',
    'interrupt() pauses the run and hands the question out.',
    'The checkpointer saves the state under the thread id. Nothing has to stay running.',
    'A person reads the request and decides, seconds or days later.',
    'Your app calls the graph again with the same thread id and the decision.',
    approve ? 'The run picks up where it stopped, and the refund goes ahead.' : 'The run picks up where it stopped, and the customer is told no.',
  ];

  const on = (i: number) => shown >= i;
  const [px, py] = SPOTS[shown];
  const arrow = (x: number, y: number, dir: 'r' | 'd' | 'u') =>
    dir === 'r' ? `M ${x - 6} ${y - 4} L ${x} ${y} L ${x - 6} ${y + 4}` : dir === 'd' ? `M ${x - 4} ${y - 6} L ${x} ${y} L ${x + 4} ${y - 6}` : `M ${x - 4} ${y + 6} L ${x} ${y} L ${x + 4} ${y + 6}`;
  const lit = (i: number) => ({ stroke: on(i) ? 'var(--signal)' : undefined, strokeOpacity: on(i) ? 1 : undefined });

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">Pausing for a person</p>
          <div className="dx-steps" role="group" aria-label="The person's decision">
            <button type="button" className="btn quiet" aria-pressed={approve} onClick={() => setApprove(true)}>
              Approve
            </button>
            <button type="button" className="btn quiet" aria-pressed={!approve} onClick={() => setApprove(false)}>
              Reject
            </button>
          </div>
        </div>

        <svg viewBox="0 0 740 280" className="dx-svg" role="img" aria-label="A run pauses at interrupt, the state is saved in a checkpoint store under a thread id, a person decides, and the app resumes with the same thread id.">
          {/* arrows */}
          <path d="M 140 52 H 166" className="dx-link" style={lit(1)} />
          <path d={arrow(170, 52, 'r')} className="dx-link" style={lit(1)} />
          <path d="M 300 52 H 446" className="dx-link" style={{ ...lit(4), strokeDasharray: on(4) ? undefined : '5 4' }} />
          <path d={arrow(450, 52, 'r')} className="dx-link" style={lit(4)} />
          <path d="M 590 52 H 616" className="dx-link" style={lit(5)} />
          <path d={arrow(620, 52, 'r')} className="dx-link" style={lit(5)} />

          <path d="M 235 80 V 166" className="dx-link" style={lit(2)} />
          <path d={arrow(235, 170, 'd')} className="dx-link" style={lit(2)} />
          <path d="M 285 80 V 125 H 420 V 166" className="dx-link" style={lit(3)} />
          <path d={arrow(420, 170, 'd')} className="dx-link" style={lit(3)} />
          <path d="M 480 170 V 84" className="dx-link" style={lit(4)} />
          <path d={arrow(480, 80, 'u')} className="dx-link" style={lit(4)} />
          <path d="M 235 240 V 262 H 570 V 84" className="dx-link" style={{ ...lit(4), strokeDasharray: on(4) ? undefined : '5 4' }} />
          <path d={arrow(570, 80, 'u')} className="dx-link" style={lit(4)} />

          <text x="244" y="132" className="dx-small">save</text>
          <text x="352" y="119" className="dx-small">ask</text>
          <text x="488" y="132" className="dx-small">decision</text>
          <text x="300" y="256" className="dx-small" style={{ paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 }}>
            load by thread id
          </text>
          <Glyph name="clock" size={22} x={364} y={22} className="ng-glyph" />
          <text x="375" y="76" textAnchor="middle" className="dx-small">seconds to days</text>

          {/* the run, along the top */}
          <rect x="20" y="24" width="120" height="56" rx="10" className={on(0) ? 'dx-core dx-hot' : 'dx-core'} />
          <text x="34" y="48" className="dx-name">Run</text>
          <text x="34" y="66" className="dx-small">to the refund</text>

          <rect x="170" y="24" width="130" height="56" rx="10" className={shown >= 1 && shown <= 3 ? 'dx-core dx-hot' : 'dx-core'} />
          <Glyph name="clock" size={20} x={180} y={34} className="dx-glyph-hot" />
          <text x="206" y="46" className="dx-name">interrupt()</text>
          <text x="206" y="66" className="dx-small">pauses here</text>

          <rect x="450" y="24" width="140" height="56" rx="10" className={on(4) ? 'dx-core dx-hot' : 'dx-core'} />
          <Glyph name="loop" size={20} x={460} y={34} className="dx-glyph-hot" />
          <text x="486" y="46" className="dx-name">Resume</text>
          <text x="486" y="66" className="dx-small">same thread id</text>

          <rect x="620" y="24" width="100" height="56" rx="10" className={on(5) ? 'dx-core dx-hot' : 'dx-core'} style={on(5) && !approve ? { stroke: 'var(--warn)' } : undefined} />
          <text x="634" y="48" className="dx-name">{approve ? 'Refund' : 'Say no'}</text>
          <text x="634" y="66" className="dx-small">{approve ? 'goes ahead' : 'to customer'}</text>

          {/* what holds the state while nothing is running, and the person */}
          <rect x="150" y="170" width="170" height="70" rx="10" className={shown === 2 ? 'dx-core dx-hot' : 'dx-core'} />
          <Glyph name="database" size={22} x={162} y={182} className="ng-glyph" />
          <text x="192" y="198" className="dx-name">Checkpoint store</text>
          <text x="162" y="222" className="dx-small">thread: order-1042</text>

          <rect x="360" y="170" width="160" height="70" rx="10" className={shown === 3 ? 'dx-core dx-hot' : 'dx-core'} />
          <Glyph name="user" size={22} x={372} y={182} className="ng-glyph" />
          <text x="402" y="198" className="dx-name">A person</text>
          <text x="372" y="218" className="dx-small">sees the question</text>
          <text x="372" y="232" className="dx-small" style={{ fill: on(3) ? (approve ? 'var(--ok)' : 'var(--warn)') : undefined }}>
            {on(3) ? (approve ? 'decides: approve' : 'decides: reject') : 'decides: …'}
          </text>

          <motion.circle r="5.5" className="dx-packet" initial={false} animate={{ cx: px, cy: py }} transition={{ duration: 0.6, ease: EASE }} />
        </svg>
        <p className="viz-cap">
          <b>{shown + 1} of {SPOTS.length}.</b> {notes[shown]} The saved state is what lets the app restart in between.
        </p>
      </div>
    </Root>
  );
}
