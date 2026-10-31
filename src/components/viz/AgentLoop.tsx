import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { CALENDARS, FRIENDS, SLOTS, endingSteps, loopsDone, openingSteps, revealedFriends, type Choice, type Step } from '../../lib/agent-loop';

const KIND_LABEL: Record<Step['kind'], string> = { think: 'Think', act: 'Act', see: 'Look', ask: 'Ask a person' };

/**
 * A step-through of a scripted agent: find a meeting time for three busy
 * friends. The learner presses Next step to move the loop along, and at the
 * checkpoint decides whether the agent may send invites or must ask first.
 */
export default function AgentLoop() {
  const opening = useMemo(() => openingSteps(), []);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [shown, setShown] = useState(1);
  const script: Step[] = useMemo(() => (choice ? [...opening, ...endingSteps(choice)] : opening), [opening, choice]);
  const atCheckpoint = !choice && shown === opening.length;
  const finished = !!choice && shown >= script.length;
  const seen = script.slice(0, shown);
  const revealed = revealedFriends(script, shown);
  const loops = loopsDone(script, shown);
  const endRef = useRef<HTMLLIElement | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [shown]);

  const decide = (c: Choice) => {
    setChoice(c);
    setShown((n) => n + 1);
  };
  const reset = () => {
    setChoice(null);
    setShown(1);
  };

  const common = SLOTS.filter((s) => revealed.length === FRIENDS.length && FRIENDS.every((f) => CALENDARS[f].includes(s)));

  return (
    <Root>
      <div className="viz rb-agent">
        <p className="viz-title">Run the agent: find a time for three busy friends</p>
        <p className="rb-task">
          <b>Task:</b> “Find an hour this weekend when Asha, Ben and Chloe can all meet.” <b>Tools it may use:</b> a calendar reader and a messenger.
        </p>

        <div className="rb-agent-grid">
          <div>
            <p className="rb-label">What the calendar tool has shown so far</p>
            <table className="rb-cal">
              <caption className="rb-sr">Free times seen by the agent. A question mark means it has not looked yet.</caption>
              <colgroup>
                <col style={{ width: '22%' }} />
                {SLOTS.map((s) => (
                  <col key={s} style={{ width: '19.5%' }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col"><span className="rb-sr">Friend</span></th>
                  {SLOTS.map((s) => (
                    <th key={s} scope="col">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FRIENDS.map((f) => {
                  const known = revealed.includes(f);
                  return (
                    <tr key={f}>
                      <th scope="row">{f}</th>
                      {SLOTS.map((s) => {
                        const free = CALENDARS[f].includes(s);
                        return (
                          <td key={s} className={!known ? 'is-unknown' : free ? 'is-free' : 'is-busy'}>
                            {!known ? '?' : free ? 'free' : 'busy'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="rb-cal-all">
                  <th scope="row">All three</th>
                  {SLOTS.map((s) => (
                    <td key={s} className={common.includes(s) ? 'is-free' : 'is-unknown'}>
                      {revealed.length < FRIENDS.length ? '' : common.includes(s) ? 'free' : ''}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="rb-loops" aria-live="polite">
              Loops finished: <b className="num">{loops}</b>
            </p>
          </div>

          <div>
            <p className="rb-label">The agent’s log</p>
            <ol className="rb-log" aria-live="polite">
              {seen.map((s, i) => (
                <motion.li key={`${choice ?? 'x'}-${i}`} ref={i === seen.length - 1 ? endRef : undefined} className={`rb-step rb-k-${s.kind}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }}>
                  <span className="rb-pill">{KIND_LABEL[s.kind]}</span>
                  <span>{s.text}</span>
                </motion.li>
              ))}
            </ol>

            <div className="rb-actions">
              {atCheckpoint ? (
                <>
                  <button type="button" className="btn" onClick={() => decide('ask')}>
                    Ask me first
                  </button>
                  <button type="button" className="btn quiet" onClick={() => decide('send')}>
                    Let it send now
                  </button>
                </>
              ) : finished ? (
                <button type="button" className="btn quiet" onClick={reset}>
                  {choice === 'ask' ? 'Run it again and let it send' : 'Run it again and ask first'}
                </button>
              ) : (
                <button type="button" className="btn" onClick={() => setShown((n) => n + 1)}>
                  Next step
                </button>
              )}
              {shown > 1 && !finished ? (
                <button type="button" className="btn quiet" onClick={reset}>
                  Start over
                </button>
              ) : null}
            </div>
            {finished && (
              <p className="rb-after" aria-live="polite">
                {choice === 'ask'
                  ? 'Asking first cost one short question, and it caught something the calendar could not know.'
                  : 'The agent did what it was allowed to do, and the mistake still had a real effect. Try the other choice.'}
              </p>
            )}
          </div>
        </div>
        <p className="viz-cap">A pretend run: the people, calendars and times are made up and nothing is sent anywhere. Real agents are built in many ways, but they all loop like this.</p>
      </div>
    </Root>
  );
}
