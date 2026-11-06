import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { BUDGET, QUESTIONS, SIZES, WORDS, retrieve, sentenceRange, successCount } from '../../lib/whatif/no-chunking';

const COLS = 20;
const CW = 18;
const CH = 15;
const WHOLE = WORDS.length;

const REASON: Record<string, string> = {
  cut: 'a cut falls inside the answer sentence, so only half of it was retrieved',
  missed: 'other pieces scored higher, so the piece with the answer was left out',
  buried: 'the piece is longer than the prompt has room for, so the answer is cut off the end',
};

/**
 * The handbook is drawn as one square per word. Blue squares are what the model is given (a small prompt budget),
 * the green outline is the sentence that answers the question. Chunk cuts show as ticks.
 */
export default function NoChunkingWhatIf() {
  const [chunked, setChunked] = useState(true);
  const [qi, setQi] = useState(1);
  const [si, setSi] = useState(4);
  const size = chunked ? SIZES[si] : WHOLE;
  const out = useMemo(() => retrieve(qi, size), [qi, size]);
  const q = QUESTIONS[qi];
  const [a, b] = sentenceRange(q.answer);
  const sentSet = useMemo(() => {
    const s = new Set<number>();
    out.sent.forEach(([x, y]) => {
      for (let i = x; i < y; i++) s.add(i);
    });
    return s;
  }, [out]);
  const rows = Math.ceil(WORDS.length / COLS);
  const sizes = [...SIZES, WHOLE];
  const counts = useMemo(() => sizes.map((s) => successCount(s)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const total = chunked ? successCount(size) : successCount(WHOLE);

  const verdict = chunked ? (
    out.ok ? (
      <>
        Pieces of {size} words: the whole answer sentence ({b - a} words) reaches the model for this question, and {total} of {QUESTIONS.length} example questions get through at this size.
      </>
    ) : (
      <>
        Pieces of {size} words: the answer is lost because {REASON[out.reason]}. Only {total} of {QUESTIONS.length} example questions get through at this size.
      </>
    )
  ) : out.ok ? (
    <>
      No chunks: the whole {WHOLE}-word handbook is one piece and the prompt only has room for its first {BUDGET} words. This answer happens to sit at the start, so it survives. {total} of {QUESTIONS.length} questions do.
    </>
  ) : (
    <>
      No chunks: the whole {WHOLE}-word handbook is one piece, the prompt has room for its first {BUDGET} words, and this answer sits at words {a + 1} to {b}. Lost. Only {total} of {QUESTIONS.length} example questions get through.
    </>
  );

  // chart of success by size
  const BW = 24;
  const bars = sizes.map((s, i) => ({ s, n: counts[i], x: 4 + i * (BW + 4) }));

  return (
    <WhatIfFrame
      title="One handbook, cut into pieces, and a small prompt"
      withLabel="With chunking"
      withoutLabel="Whole document"
      on={chunked}
      onChange={setChunked}
      verdict={verdict}
      controls={
        <>
          <div className="wr-chips" role="group" aria-label="Pick a question">
            {QUESTIONS.map((x, i) => (
              <button key={x.id} type="button" className={'wr-chip' + (i === qi ? ' is-on' : '')} aria-pressed={i === qi} onClick={() => setQi(i)}>
                {x.text}
              </button>
            ))}
          </div>
          <label className="field">
            <span>
              Piece size <b>{chunked ? `${size} words` : `whole (${WHOLE} words)`}</b>
            </span>
            <input type="range" min={0} max={SIZES.length - 1} value={si} disabled={!chunked} onChange={(e) => setSi(+e.target.value)} aria-label="Chunk size in words" />
          </label>
        </>
      }
    >
      <p className="wr-lead">
        A chunk is a piece of a document, cut small enough to find and to fit in the prompt. Each square is one word. The model only gets {BUDGET} words (an example, scaled down), taken from the best-scoring pieces.
      </p>
      <svg viewBox={`0 0 ${COLS * CW} ${rows * CH + 2}`} className="dx-svg wi-svg wr-chart" role="img" aria-label={`The handbook as ${WORDS.length} squares, one per word. Blue squares are sent to the model. The answer sentence is words ${a + 1} to ${b}: ${out.ok ? 'all sent' : 'not all sent'}.`}>
        {WORDS.map((_, i) => {
          const sent = sentSet.has(i);
          const isAns = i >= a && i < b;
          const x = (i % COLS) * CW;
          const y = Math.floor(i / COLS) * CH + 1;
          const fill = isAns ? (sent ? '#1f9d6b' : '#d6453d') : sent ? '#3b82f6' : 'transparent';
          return (
            <g key={i}>
              <motion.rect
                x={x + 1}
                y={y}
                width={CW - 2}
                height={CH - 2}
                rx={3}
                initial={false}
                animate={{ fill, fillOpacity: isAns ? 0.9 : sent ? 0.6 : 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                stroke="currentColor"
                strokeOpacity={isAns ? 1 : 0.25}
                strokeWidth={isAns ? 1.6 : 1}
              />
              {isAns && !sent && (
                <path d={`M${x + 5} ${y + 3} L${x + CW - 5} ${y + CH - 5} M${x + CW - 5} ${y + 3} L${x + 5} ${y + CH - 5}`} stroke="#fff" strokeWidth={1.4} strokeLinecap="round" />
              )}
            </g>
          );
        })}
        {chunked &&
          out.chunks.slice(1).map(([x0], k) => {
            const cut = x0 > a && x0 < b;
            const x = (x0 % COLS) * CW;
            const y = Math.floor(x0 / COLS) * CH;
            return <line key={k} x1={x} x2={x} y1={y} y2={y + CH + 1} stroke={cut ? '#d6453d' : 'currentColor'} strokeWidth={cut ? 3 : 1.6} strokeOpacity={cut ? 1 : 0.7} />;
          })}
      </svg>
      <ul className="wr-legend" aria-label="Key">
        <li><i className="wr-sw" style={{ background: '#3b82f6' }} />sent to the model</li>
        <li><i className="wr-sw" style={{ background: '#1f9d6b' }} />answer, sent ✓</li>
        <li><i className="wr-sw" style={{ background: '#d6453d' }} />answer, lost ✗</li>
        <li><i className="wr-tick" />cut between pieces</li>
      </ul>
      <p className="wr-note">
        The model reads {out.wordsSent} words. The answer sentence has {b - a}; it makes up {Math.round(out.focus * 100)}% of the pieces that hold it{chunked ? '' : ', so almost all of what a whole document hands over is padding'}.
      </p>
      <figure className="wr-fig">
        <figcaption>Questions answered out of {QUESTIONS.length}, by piece size (words)</figcaption>
        <svg viewBox={`0 0 ${bars.length * (BW + 4) + 4} 112`} className="dx-svg wi-svg wr-chart" role="img" aria-label={`Questions answered at each piece size: ${bars.map((x) => `${x.s === WHOLE ? 'whole' : x.s} words, ${x.n}`).join('; ')}`}>
          {bars.map((x) => {
            const h = (x.n / QUESTIONS.length) * 60;
            const active = x.s === size;
            return (
              <g key={x.s}>
                <rect x={x.x} y={78 - h} width={BW} height={Math.max(2, h)} rx={4} fill={x.n === QUESTIONS.length ? '#1f9d6b' : x.n <= 1 ? '#d6453d' : '#c9922e'} fillOpacity={active ? 1 : 0.45} stroke="currentColor" strokeWidth={active ? 2 : 0} />
                <text x={x.x + BW / 2} y={72 - h} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 13 }}>{x.n}</text>
                <text x={x.x + BW / 2} y={94} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>{x.s === WHOLE ? 'all' : x.s}</text>
              </g>
            );
          })}
        </svg>
      </figure>
      <p className="wr-note">
        Toy setup: {WORDS.length} words, a prompt budget of {BUDGET} words, pieces cut every N words with no overlap, scored by how many of the question's words they contain divided by the square root of their length. Real systems use embeddings, overlap and thousands of tokens.
      </p>
    </WhatIfFrame>
  );
}
