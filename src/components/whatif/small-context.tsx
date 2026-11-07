import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { conversation, kept, questions, sizes, status, tokensInWindow, totalTokens } from '../../lib/whatif/small-context';

const ALL = totalTokens();

/**
 * A conversation arrives one message at a time. The context window keeps the newest messages that fit. Faded, dashed rows
 * have slid out of the window and are forgotten; the questions underneath show which answers went with them.
 */
export default function SmallContextWhatIf() {
  const [big, setBig] = useState(false);
  const [win, setWin] = useState(55);
  const [arrived, setArrived] = useState(conversation.length);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setArrived((a) => {
        if (a >= conversation.length) {
          setPlaying(false);
          return a;
        }
        return a + 1;
      });
    }, 900);
    return () => clearInterval(id);
  }, [playing]);

  const size = big ? ALL : win;
  const flags = useMemo(() => kept(arrived, size), [arrived, size]);
  const used = tokensInWindow(arrived, size);
  const keptCount = flags.filter(Boolean).length;
  const stats = questions.map((q) => status(q.needs, arrived, size));
  const asked = stats.filter((s) => s !== 'later').length;
  const lost = stats.filter((s) => s === 'lost').length;
  const firstLost = questions.find((_, i) => stats[i] === 'lost');
  const dropped = arrived - keptCount;

  const verdict = lost === 0 ? (
    <>
      The window of {size} tokens holds {keptCount === arrived ? `all ${arrived}` : `the last ${keptCount}`} messages ({used} tokens used), so every question the user has already given facts for can still be answered.
    </>
  ) : (
    <>
      A window of {size} tokens keeps only the last {keptCount} of {arrived} messages ({used} tokens). {dropped} older {dropped === 1 ? 'message has' : 'messages have'} slid out, so {lost} of {asked} questions can no longer be answered{firstLost ? `, for example “${firstLost.q}”` : ''}.
    </>
  );

  return (
    <WhatIfFrame
      title="A conversation slides through the window"
      withLabel="Big window"
      withoutLabel="Small window"
      on={big}
      onChange={setBig}
      verdict={verdict}
      controls={
        <>
          <label className="field wl-field">
            <span>
              Window size <b>{size} tokens{big ? ' (all fits)' : ''}</b>
            </span>
            <input type="range" min={10} max={ALL} step={1} value={size} disabled={big} onChange={(e) => setWin(+e.target.value)} aria-label="Context window size in tokens" />
          </label>
          <label className="field wl-field">
            <span>
              Messages sent <b>{arrived} of {conversation.length}</b>
            </span>
            <input
              type="range"
              min={1}
              max={conversation.length}
              step={1}
              value={arrived}
              onChange={(e) => {
                setPlaying(false);
                setArrived(+e.target.value);
              }}
              aria-label="How many messages have been sent so far"
            />
          </label>
          <button
            type="button"
            className="btn quiet wl-btn"
            onClick={() => {
              setArrived(1);
              setPlaying(true);
            }}
          >
            {playing ? 'Playing…' : 'Play it'}
          </button>
        </>
      }
    >
      <p className="wl-note wl-lead">
        Plain words: the model can only read what is inside its context window, counted in tokens. When the chat gets longer than the window, the oldest messages are cut. Anything only said there is gone, as if it never happened. The chat and the token counts are an example.
      </p>
      <div className="wl-window" role="img" aria-label={`Window of ${size} tokens, ${used} used by ${keptCount} messages`}>
        {sizes.slice(0, arrived).map((s, i) =>
          flags[i] ? (
            <motion.span key={i} className="wl-seg" initial={false} animate={{ flexGrow: s }} transition={{ duration: 0.5, ease: EASE }}>
              {i + 1}
            </motion.span>
          ) : null,
        )}
        {size - used > 0 && <span className="wl-seg wl-seg-free" style={{ flexGrow: size - used }}>free</span>}
      </div>
      <p className="wl-legend">
        The bar is the window ({size} tokens). Each block is a message still inside it. {dropped > 1 ? `Messages 1 to ${dropped} are outside.` : dropped === 1 ? 'Message 1 is outside.' : 'Nothing is outside yet.'}
      </p>
      <ol className="wl-msgs">
        {conversation.slice(0, arrived).map((m, i) => (
          <motion.li
            key={i}
            className={`wl-msg ${flags[i] ? 'is-in' : 'is-out'}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: flags[i] ? 1 : 0.85, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <span className="wl-msg-n">{i + 1}</span>
            <span className="wl-msg-body">
              <b>{m.role}:</b> {m.text}
            </span>
            <span className="wl-msg-meta">{flags[i] ? `${sizes[i]} tokens` : 'forgotten'}</span>
          </motion.li>
        ))}
      </ol>
      <p className="wl-legend">Faded with a dashed edge = slid out of the window, forgotten.</p>
      <ul className="wl-qs" aria-label="Questions the model might be asked now">
        {questions.map((q, i) => {
          const s = stats[i];
          return (
            <li key={q.q} className={`wl-q is-${s}`}>
              <span className="wl-q-icon" aria-hidden="true">{s === 'ok' ? '✓' : s === 'lost' ? '✗' : '·'}</span>
              <span>
                {q.q}{' '}
                <em>
                  {s === 'ok' && 'can answer'}
                  {s === 'lost' && `cannot: the answer was in message ${q.needs.filter((n) => !flags[n]).map((n) => n + 1).join(' and ')}, now forgotten`}
                  {s === 'later' && 'not told yet'}
                </em>
              </span>
            </li>
          );
        })}
      </ul>
      <details className="wl-note">
        <summary>The numbers behind the figure</summary>
        <p>
          Tokens are counted as words plus punctuation marks, so the sizes are only close to what a real tokenizer would give. The whole chat is {ALL} tokens. The window keeps the newest messages, going back until the next one would not fit, and drops everything older. Ways to cope include cutting the oldest messages, summarising the old part, or fetching old material back on demand. Research on long contexts also finds that models can use information at the start or end of the input better than information in the middle, so a bigger window is not a guarantee of recall.
        </p>
      </details>
    </WhatIfFrame>
  );
}
