import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { isCorrect, KIND_LABEL, score, THINGS, type Kind } from '../../lib/ai-or-not';

const KINDS: Kind[] = ['ai', 'rules'];

/**
 * "AI or not?": twelve everyday things. The learner picks "usually AI" or
 * "usually plain rules" and gets a kind explanation of what is inside and what
 * data goes in. Picks can be changed, and the score updates.
 */
export default function AiOrNot() {
  const [picks, setPicks] = useState<Record<string, Kind>>({});
  const { answered, correct } = score(picks);

  return (
    <Root>
      <div className="viz wsa-so">
        <p className="viz-title">AI or not? Pick one for each</p>

        <ol className="wsa-things">
          {THINGS.map((t, i) => {
            const pick = picks[t.id];
            const right = pick ? isCorrect(t, pick) : false;
            return (
              <li key={t.id} className="wsa-thing">
                <p className="wsa-name">
                  <span className="wsa-n">{i + 1}</span>
                  {t.name}
                </p>
                <div className="wsa-choices" role="group" aria-label={`Thing ${i + 1}: ${t.name}`}>
                  {KINDS.map((k) => (
                    <button key={k} type="button" className={`wsa-choice wsa-k-${k}${pick === k ? ' is-picked' : ''}`} aria-pressed={pick === k} onClick={() => setPicks((p) => ({ ...p, [t.id]: k }))}>
                      {KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
                <div className="wsa-feedback" aria-live="polite">
                  {pick && (
                    <motion.div key={pick} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: EASE }} className={right ? 'is-right' : 'is-miss'}>
                      <p>
                        <b>{right ? `Yes. ${KIND_LABEL[t.usually]}.` : `Not quite. This one is ${KIND_LABEL[t.usually].replace('Usually', 'usually')}.`}</b> {t.why}
                      </p>
                      <p className="wsa-data">
                        <b>Data it uses:</b> {t.data}
                      </p>
                    </motion.div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="wsa-bottom">
          <p className="wsa-total" aria-live="polite">
            <b className="num">{correct}</b> right out of <b className="num">{answered}</b> answered.
          </p>
          <button type="button" className="wsa-reset" onClick={() => setPicks({})} disabled={answered === 0}>
            Start again
          </button>
        </div>
        <p className="viz-cap">These answers say “usually” because the same kind of thing can be built in different ways. The only way to be sure is to find out what the maker says is inside.</p>
      </div>
    </Root>
  );
}
