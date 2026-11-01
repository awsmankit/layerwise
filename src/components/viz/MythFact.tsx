import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { CARDS, isRight, score, type Guess } from '../../lib/myth-fact';

/**
 * "Myth or fact?": eight statements, one card at a time. The learner taps Myth
 * or Fact, then reads kind feedback and the card's source before moving on.
 */
export default function MythFact() {
  const [i, setI] = useState(0);
  const [guesses, setGuesses] = useState<Record<string, Guess>>({});
  const nextRef = useRef<HTMLButtonElement>(null);

  const done = i >= CARDS.length;
  const card = CARDS[Math.min(i, CARDS.length - 1)];
  const guess = guesses[card.id];
  const { right } = score(guesses);

  const answer = (g: Guess) => {
    if (guess) return;
    setGuesses((cur) => ({ ...cur, [card.id]: g }));
    requestAnimationFrame(() => nextRef.current?.focus());
  };
  const restart = () => {
    setGuesses({});
    setI(0);
  };

  return (
    <Root>
      <div className="viz wsb-mf">
        <p className="viz-title">Myth or fact?</p>

        {done ? (
          <div className="wsb-mf-end" aria-live="polite">
            <p className="wsb-mf-score">
              You got <b className="num">{right}</b> out of <b className="num">{CARDS.length}</b>.
            </p>
            <p className="wsb-mf-note">
              {right === CARDS.length
                ? 'Every one. Notice that some of the “facts” were about what experts do not know.'
                : 'Some of these are tricky, and some are still debated by experts. Go back over the ones you missed.'}
            </p>
            <ul className="wsb-mf-recap">
              {CARDS.map((c) => (
                <li key={c.id} className={isRight(c, guesses[c.id]) ? 'is-right' : 'is-miss'}>
                  <span className="wsb-mf-tag">{c.answer === 'myth' ? 'Myth' : 'Fact'}</span> {c.statement}
                </li>
              ))}
            </ul>
            <button type="button" className="wsb-btn" onClick={restart}>
              Play again
            </button>
          </div>
        ) : (
          <>
            <p className="wsb-mf-count">
              Card <span className="num">{i + 1}</span> of <span className="num">{CARDS.length}</span>
            </p>
            <motion.div key={card.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: EASE }} className="wsb-mf-card">
              <p className="wsb-mf-statement" id="wsb-mf-statement">{card.statement}</p>
              <div className="wsb-mf-choices" role="group" aria-labelledby="wsb-mf-statement">
                {(['myth', 'fact'] as Guess[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`wsb-mf-choice wsb-mf-${g}${guess === g ? ' is-picked' : ''}`}
                    aria-pressed={guess === g}
                    disabled={!!guess}
                    onClick={() => answer(g)}
                  >
                    {g === 'myth' ? 'Myth' : 'Fact'}
                  </button>
                ))}
              </div>
              <div className="wsb-mf-feedback" aria-live="polite">
                {guess && (
                  <>
                    <p className={isRight(card, guess) ? 'wsb-mf-verdict is-right' : 'wsb-mf-verdict is-miss'}>
                      {isRight(card, guess) ? 'Yes, that is a ' : 'Not quite. It is a '}
                      <b>{card.answer}</b>.
                    </p>
                    <p>{card.explain}</p>
                    <p className="wsb-mf-src">
                      Source:{' '}
                      <a href={card.source.url} target="_blank" rel="noopener noreferrer">
                        {card.source.label}
                      </a>
                    </p>
                  </>
                )}
              </div>
              <button type="button" ref={nextRef} className="wsb-btn wsb-mf-next" disabled={!guess} onClick={() => setI((n) => n + 1)}>
                {i === CARDS.length - 1 ? 'See my score' : 'Next card'}
              </button>
            </motion.div>
          </>
        )}
        <p className="viz-cap">Each card links to one source. Where experts disagree, the card says so.</p>
      </div>
    </Root>
  );
}
