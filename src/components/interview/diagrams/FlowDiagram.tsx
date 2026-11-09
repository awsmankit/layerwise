import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Root, useNarrow } from '../../viz/shared';
import type { DiagramSpec } from '../../../data/interview/answers/types';
import { diagramAlt, isChain } from '../../../data/interview/answers/diagram';
import Frame from './Frame';
import { reveal, useQuiet } from './use-quiet';

type Spec = Extract<DiagramSpec, { kind: 'flow' }>;

/**
 * Steps in order as outlined cards joined by arrows. "Next" and "Back" (or "Play") walk through them,
 * lighting one at a time. Up to four steps sit in a row; more, and every step on a phone, stack
 * top to bottom so the words stay a readable size.
 */
export default function FlowDiagram({ spec }: { spec: Spec }) {
  const narrow = useNarrow();
  const quiet = useQuiet();
  const [step, setStep] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const n = spec.nodes.length;
  const row = !narrow && n <= 4;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setStep((s) => {
        const next = s === null ? 0 : s + 1;
        if (next >= n - 1) setPlaying(false);
        return Math.min(next, n - 1);
      });
    }, 1700);
    return () => clearInterval(t);
  }, [playing, n]);

  const hot = new Set(spec.highlight ?? []);
  // arrows that are not "this card to the next one" are listed under the card so no link is lost
  const extra = (id: string, i: number) => (spec.edges ?? []).filter(([a, b]) => a === id && b !== spec.nodes[i + 1]?.id).map(([, b]) => spec.nodes.find((x) => x.id === b)?.label);
  const chain = isChain(spec);
  const go = (to: number) => {
    setPlaying(false);
    setStep(Math.max(0, Math.min(n - 1, to)));
  };
  const status = step === null ? 'Press Next to walk through the steps.' : `Step ${step + 1} of ${n}: ${spec.nodes[step].label}${spec.nodes[step].sub ? `. ${spec.nodes[step].sub}` : ''}`;

  return (
    <Root>
      <Frame
        alt={diagramAlt(spec)}
        caption={spec.caption}
        controls={
          <div className="ivd-controls">
            <button type="button" className="btn quiet" onClick={() => go((step ?? 0) - 1)} disabled={step === null || step === 0}>
              Back
            </button>
            <button type="button" className="btn quiet" onClick={() => go(step === null ? 0 : step + 1)} disabled={step === n - 1}>
              {step === null ? 'Start' : 'Next'}
            </button>
            {!quiet && (
              <button
                type="button"
                className="btn quiet"
                aria-pressed={playing}
                onClick={() => {
                  if (!playing && (step === null || step >= n - 1)) setStep(null);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? 'Pause' : 'Play'}
              </button>
            )}
            <p className="ivd-status" aria-live="polite">
              {status}
            </p>
          </div>
        }
      >
        <ol className={`ivd-flow ${row ? 'is-row' : 'is-col'}`} style={row ? { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` } : undefined}>
          {spec.nodes.map((node, i) => {
            const state = step === i ? 'is-active' : step !== null && i < step ? 'is-past' : '';
            return (
              <motion.li key={node.id} className={`ivd-node ${state} ${hot.has(node.id) ? 'is-hot' : ''}`} {...reveal(i, quiet)}>
                <span className="ivd-num">{i + 1}</span>
                <b className="ivd-label">{node.label}</b>
                {node.sub && <span className="ivd-sub">{node.sub}</span>}
                {!chain && extra(node.id, i).length > 0 && <span className="ivd-also">also feeds: {extra(node.id, i).join(', ')}</span>}
              </motion.li>
            );
          })}
        </ol>
      </Frame>
    </Root>
  );
}
