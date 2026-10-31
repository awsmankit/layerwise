import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { START_STICKS, buildTree, computerMove, countLeaves, countNodes, layout, treeDepth, type NimNode, type Who } from '../../lib/reasoning';

type Phase = 'choose' | 'you' | 'think' | 'over';

const SLOT_X = 40;
const SLOT_Y = 50;
const PAD_X = 22;
const PAD_Y = 24;

function flat(n: NimNode, out: NimNode[] = []): NimNode[] {
  out.push(n);
  n.children.forEach((c) => flat(c, out));
  return out;
}

function Sticks({ left }: { left: number }) {
  return (
    <svg viewBox={`0 0 ${START_STICKS * 30 + 10} 56`} className="ka-sticks" role="img" aria-label={`${left} of ${START_STICKS} sticks left`}>
      {Array.from({ length: START_STICKS }, (_, i) => (
        <path key={i} d={`M ${i * 30 + 18} 6 V 50`} className={i < left ? 'ka-stick' : 'ka-stick ka-gone'} />
      ))}
    </svg>
  );
}

function LookAhead({ sticks }: { sticks: number }) {
  const { root, nodes, pick, winning } = useMemo(() => {
    const r = layout(buildTree(sticks, 'computer'), SLOT_X, SLOT_Y, PAD_X, PAD_Y);
    const m = computerMove(sticks);
    return { root: r, nodes: flat(r), pick: m.take, winning: m.winning };
  }, [sticks]);
  const w = PAD_X * 2 + (countLeaves(root) - 1) * SLOT_X;
  const h = PAD_Y * 2 + treeDepth(root) * SLOT_Y;

  return (
    <div>
      <div className="ka-nim-scroll" role="group" aria-label="The computer's look-ahead tree">
        <svg viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: w }} className="ka-nim-svg" role="img" aria-label={`Look-ahead tree with ${countNodes(root)} positions. ${winning ? `The computer can win by taking ${pick}.` : 'Every move loses if you play well.'}`}>
          {nodes.map((n) =>
            n.children.map((c) => (
              <path key={c.id} d={`M ${n.x} ${n.y} L ${c.x} ${c.y}`} className={`ka-edge${n === root && c.took === pick ? ' ka-edge-pick' : ''}`} />
            )),
          )}
          {root.children.map((c) => (
            <text key={'t' + c.id} x={(root.x + c.x) / 2 + (c.took === 1 ? -6 : 6)} y={(root.y + c.y) / 2 - 2} textAnchor={c.took === 1 ? 'end' : 'start'} className="ka-t">
              take {c.took}
            </text>
          ))}
          {nodes.map((n, i) => (
            <motion.g key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.5), ease: EASE }}>
              {n.mover === 'computer' ? (
                <circle cx={n.x} cy={n.y} r="15" className={`ka-node ${n.winner === 'computer' ? 'ka-cw' : 'ka-yw'}`} />
              ) : (
                <rect x={n.x - 14} y={n.y - 14} width="28" height="28" rx="6" className={`ka-node ${n.winner === 'computer' ? 'ka-cw' : 'ka-yw'}`} />
              )}
              <text x={n.x} y={n.y + 5} textAnchor="middle" className="ka-nt">
                {n.sticks}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>
      <ul className="ka-nim-key" aria-label="How to read the tree">
        <li>
          <i className="ka-k ka-k-c" aria-hidden="true" /> Circle: the computer's turn
        </li>
        <li>
          <i className="ka-k ka-k-s" aria-hidden="true" /> Square: your turn
        </li>
        <li>
          <i className="ka-k ka-k-cw" aria-hidden="true" /> Blue: computer wins from here
        </li>
        <li>
          <i className="ka-k ka-k-yw" aria-hidden="true" /> Yellow: you win from here
        </li>
      </ul>
      <p className="ka-say" aria-live="polite">
        {winning
          ? `The computer has looked at all ${countNodes(root)} positions. Taking ${pick} leads only to blue ones: whatever you do next, it can still win. The thick line is the move it picks.`
          : `The computer has looked at all ${countNodes(root)} positions. Every one of its moves leads to a yellow position, so against good play it loses. It takes ${pick} and hopes you slip.`}
      </p>
    </div>
  );
}

/** A take-away game with a visible look-ahead tree: take 1 or 2 sticks from 5; taking the last stick wins. */
export default function NimLookAhead() {
  const [phase, setPhase] = useState<Phase>('choose');
  const [sticks, setSticks] = useState(START_STICKS);
  const [winner, setWinner] = useState<Who | null>(null);
  const [log, setLog] = useState('');

  const start = (first: Who) => {
    setSticks(START_STICKS);
    setWinner(null);
    setLog('');
    setPhase(first === 'you' ? 'you' : 'think');
  };

  const youTake = (n: 1 | 2) => {
    const left = sticks - n;
    setSticks(left);
    setLog(`You took ${n}.`);
    if (left === 0) {
      setWinner('you');
      setPhase('over');
    } else setPhase('think');
  };
  const computerTakes = () => {
    const { take } = computerMove(sticks);
    const left = sticks - take;
    setSticks(left);
    setLog(`The computer took ${take}.`);
    if (left === 0) {
      setWinner('computer');
      setPhase('over');
    } else setPhase('you');
  };

  return (
    <Root>
      <div className="viz ka-nim">
        <p className="viz-title">Take-away: beat a computer that looks ahead</p>
        <p className="ka-lead">
          {START_STICKS} sticks. On your turn take 1 or 2. Whoever takes the <b>last</b> stick wins.
        </p>
        {phase !== 'choose' && <Sticks left={sticks} />}

        {phase === 'choose' && (
          <div className="ka-row">
            <button type="button" className="btn ka-btn" onClick={() => start('you')}>
              I go first
            </button>
            <button type="button" className="btn quiet ka-btn" onClick={() => start('computer')}>
              The computer goes first
            </button>
          </div>
        )}

        {phase === 'you' && (
          <div>
            <p className="ka-say" aria-live="polite">
              {log} Your turn. {sticks} {sticks === 1 ? 'stick is' : 'sticks are'} left.
            </p>
            <div className="ka-row">
              <button type="button" className="btn ka-btn" onClick={() => youTake(1)}>
                Take 1
              </button>
              <button type="button" className="btn ka-btn" onClick={() => youTake(2)} disabled={sticks < 2}>
                Take 2
              </button>
            </div>
          </div>
        )}

        {phase === 'think' && (
          <div>
            <p className="ka-lead">
              {log} The computer is thinking. It tries every move, then every reply, and so on to the end of the game. {sticks} {sticks === 1 ? 'stick is' : 'sticks are'} left.
            </p>
            <LookAhead sticks={sticks} />
            <div className="ka-row">
              <button type="button" className="btn ka-btn" onClick={computerTakes}>
                Let the computer move
              </button>
            </div>
          </div>
        )}

        {phase === 'over' && (
          <div>
            <p className="ka-say" aria-live="polite">
              {log} {winner === 'you' ? 'You took the last stick and won.' : 'The computer took the last stick and won.'}
            </p>
            <div className="ka-row">
              <button type="button" className="btn ka-btn" onClick={() => start('you')}>
                Play again, me first
              </button>
              <button type="button" className="btn quiet ka-btn" onClick={() => start('computer')}>
                Play again, computer first
              </button>
            </div>
          </div>
        )}
        <p className="viz-cap">
          The computer is not learning here. It follows a fixed rule: look at every way the game could go, then pick a move that leads to a win. This is called search.
        </p>
      </div>
    </Root>
  );
}
