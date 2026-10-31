import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import {
  QUESTIONS,
  askedAbove,
  autoFill,
  bestPossible,
  depths,
  newTree,
  questionText,
  setQuestion,
  splits,
  treeStats,
  type Path,
  type QKey,
  type Tree,
} from '../../lib/reasoning';

const SHORT: Record<QKey, string> = {
  water: 'Lives in water?',
  fur: 'Has fur?',
  fly: 'Can fly?',
  big: 'Bigger than a grown-up?',
  bark: 'Barks?',
};

const BEST = bestPossible();
const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

type Props = { node: Tree; path: Path; root: Tree; depth: number; onAsk: (path: Path, q: QKey) => void };

function Node({ node, path, root, depth, onAsk }: Props) {
  if (node.animals.length === 1) {
    return (
      <p className="ka-leaf">
        <span className="ka-leaf-name">{node.animals[0]}</span>
        <span className="ka-leaf-n">
          {depth} {depth === 1 ? 'question' : 'questions'}
        </span>
      </p>
    );
  }
  if (!node.q || !node.yes || !node.no) {
    const used = askedAbove(root, path);
    return (
      <div className="ka-open">
        <p className="ka-chips" aria-label={`Still mixed up: ${node.animals.join(', ')}`}>
          {node.animals.map((a) => (
            <span key={a} className="ka-chip">
              {a}
            </span>
          ))}
        </p>
        <p className="ka-pick-label">Ask which question?</p>
        <div className="ka-qs">
          {QUESTIONS.map(({ key }) => (
            <button key={key} type="button" className="btn quiet ka-btn ka-qbtn" disabled={used.includes(key)} onClick={() => onAsk(path, key)}>
              {SHORT[key]}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <motion.div className="ka-asked" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
      <p className="ka-q-text">{questionText(node.q)}</p>
      <div className="ka-branch">
        <span className="ka-tag ka-yes">Yes</span>
        <Node node={node.yes} path={[...path, 'y']} root={root} depth={depth + 1} onAsk={onAsk} />
      </div>
      <div className="ka-branch">
        <span className="ka-tag ka-no">No</span>
        <Node node={node.no} path={[...path, 'n']} root={root} depth={depth + 1} onAsk={onAsk} />
      </div>
    </motion.div>
  );
}

/** Build a question tree for seven animals, then play 20 questions with it. */
export default function AnimalTree() {
  const [tree, setTree] = useState<Tree>(newTree);
  const [msg, setMsg] = useState('');
  const [play, setPlay] = useState<Path | null>(null);

  const stats = treeStats(tree);

  const ask = (path: Path, q: QKey) => {
    let node: Tree | undefined = tree;
    for (const s of path) node = node ? (s === 'y' ? node.yes : node.no) : undefined;
    if (!node) return;
    if (!splits(node.animals, q)) {
      const all = node.animals.length === 1 ? 'it' : 'all of them';
      setMsg(`“${questionText(q)}” does not help here: the answer is the same for ${all}. Pick a question that splits the group.`);
      return;
    }
    setMsg('');
    setTree(setQuestion(tree, path, q));
  };
  const reset = () => {
    setTree(newTree());
    setMsg('');
    setPlay(null);
  };

  let say = msg;
  if (!say) {
    if (stats.complete) {
      const mark = stats.longest <= BEST.longest && stats.average <= BEST.average + 1e-9 ? ' That is the best this set of questions can do.' : ` The best possible tree here has an average of ${one(BEST.average)}. Can you match it?`;
      say = `Every animal is pinned down. The longest chain is ${stats.longest} questions and the average is ${one(stats.average)}.${mark}`;
    } else if (stats.found === 0 && !tree.q) {
      say = 'Seven animals, all mixed up. Pick a first question. Aim for a question that splits the group into two fairly equal halves.';
    } else {
      say = `${stats.found} of ${stats.total} animals pinned down so far. Keep asking questions in the groups that are still mixed up.`;
    }
  }

  // for play mode: walk the finished tree
  const cur: Tree | undefined = play ? play.reduce<Tree | undefined>((n, s) => (n ? (s === 'y' ? n.yes : n.no) : undefined), tree) : undefined;

  return (
    <Root>
      <div className="viz ka-at">
        <p className="viz-title">Build a 20-questions guesser</p>
        <p className="ka-lead">Each group of animals needs a question that splits it. A good tree finds any animal in as few questions as possible.</p>

        {!play && (
          <div className="ka-tree">
            <Node node={tree} path={[]} root={tree} depth={0} onAsk={ask} />
          </div>
        )}

        {play && cur && (
          <div className="ka-play" aria-live="polite">
            <p className="ka-lead">Think of one of the seven animals and answer honestly.</p>
            {cur.animals.length === 1 ? (
              <p className="ka-guess">
                I guess: <b>{cur.animals[0]}</b>.
              </p>
            ) : (
              <>
                <p className="ka-q-text ka-big">{cur.q ? questionText(cur.q) : ''}</p>
                <div className="ka-row">
                  <button type="button" className="btn ka-btn" onClick={() => setPlay([...play, 'y'])}>
                    Yes
                  </button>
                  <button type="button" className="btn ka-btn" onClick={() => setPlay([...play, 'n'])}>
                    No
                  </button>
                </div>
              </>
            )}
            <div className="ka-row">
              <button type="button" className="btn quiet ka-btn" onClick={() => setPlay([])}>
                Play again
              </button>
              <button type="button" className="btn quiet ka-btn" onClick={() => setPlay(null)}>
                Back to the tree
              </button>
            </div>
            <p className="ka-lead">Questions asked so far: {play.length}.</p>
          </div>
        )}

        <p className="ka-say" aria-live="polite">
          {say}
        </p>

        <div className="ka-row">
          {!play && (
            <button type="button" className="btn ka-btn" onClick={() => setTree(autoFill(tree))} disabled={stats.complete}>
              Let the computer finish it
            </button>
          )}
          {!play && stats.complete && (
            <button type="button" className="btn ka-btn" onClick={() => setPlay([])}>
              Play 20 questions with it
            </button>
          )}
          <button type="button" className="btn quiet ka-btn" onClick={reset} disabled={!tree.q && !play}>
            Start over
          </button>
        </div>
        <p className="viz-cap">
          “Let the computer finish it” uses one rule: pick the question that splits the group most evenly. The animal answers are simplified examples. Counts: {Object.keys(depths(tree)).length} of {stats.total} animals found.
        </p>
      </div>
    </Root>
  );
}
