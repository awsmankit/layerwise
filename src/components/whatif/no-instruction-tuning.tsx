import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { buildBase, buildTuned, DEMO_WEIGHT, END, MAX_CONTEXT, outcome, PROMPTS } from '../../lib/whatif/no-instruction-tuning';

const BASE = buildBase();
const TUNED = buildTuned();
const pct = (p: number) => Math.round(p * 100);
const show = (t: string) => (t === END ? '[stop]' : t);

/** The reply, split into sentences that end at "?" or "."; each is a new question or an answer. */
function sentences(tokens: string[]) {
  const out: { words: { t: string; i: number }[]; kind: 'question' | 'statement' | 'open' }[] = [];
  let cur: { t: string; i: number }[] = [];
  tokens.forEach((t, i) => {
    cur.push({ t, i });
    if (t === '?' || t === '.') {
      out.push({ words: cur, kind: t === '?' ? 'question' : 'statement' });
      cur = [];
    }
  });
  if (cur.length) out.push({ words: cur, kind: 'open' });
  return out;
}

export default function NoInstructionTuning() {
  const [tuned, setTuned] = useState(false);
  const [pi, setPi] = useState(0);
  const [shown, setShown] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const [anim, setAnim] = useState(false);

  const prompt = PROMPTS[pi];
  const base = useMemo(() => outcome(BASE, prompt), [prompt]);
  const tun = useMemo(() => outcome(TUNED, prompt), [prompt]);
  const o = tuned ? tun : base;
  const tokens = o.steps.map((s) => s.token).filter((t) => t !== END);
  const n = tokens.length;
  const k = Math.min(shown, n);
  const done = k >= n;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setShown((s) => {
        if (s >= n) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 380);
    return () => window.clearInterval(id);
  }, [playing, n]);

  const reset = () => {
    setAnim(true);
    setPlaying(false);
    setShown(1000);
  };
  const play = () => {
    setAnim(true);
    setShown(0);
    setPlaying(true);
  };
  const next = () => {
    setAnim(true);
    setPlaying(false);
    setShown(done ? 1 : k + 1);
  };

  const touched = shown < 1000;
  const idx = touched ? Math.min(k, o.steps.length - 1) : 0;
  const step = o.steps[idx];
  const sents = sentences(tokens);
  const first = o.steps[0].candidates[0];
  const baseFirst = base.steps[0].candidates[0];
  const tunedFirst = tun.steps[0].candidates[0];

  const verdict = tuned ? (
    <>
      Instruction-tuned (toy): it answered in {n} words ({'"'}
      {tun.text}
      {'"'}) and stopped. For the first word it gave {'"'}
      {tunedFirst.token}
      {'"'} {pct(tunedFirst.p)}% of its weight; the base model gave {'"'}
      {baseFirst.token}
      {'"'} {pct(baseFirst.p)}%.
    </>
  ) : (
    <>
      Base model (toy): you asked a question and it wrote {base.newQuestions} more questions in the same style, like the next lines of a quiz page. It never says {'"'}
      {prompt.answerWord}
      {'"'}. Its first word {'"'}
      {first.token}
      {'"'} had {pct(first.p)}% of its weight.
    </>
  );

  return (
    <WhatIfFrame
      title="The same question, to a base model and to a tuned one"
      withLabel="Instruction-tuned"
      withoutLabel="Base model only"
      on={tuned}
      onChange={(v) => {
        setAnim(true);
        setPlaying(false);
        setShown(1000);
        setTuned(v);
      }}
      verdict={verdict}
      controls={
        <>
          <div className="wt-btnrow" role="group" aria-label="Choose a prompt">
            {PROMPTS.map((p, i) => (
              <button key={p.id} type="button" className={'btn quiet wt-chip' + (i === pi ? ' is-on' : '')} aria-pressed={i === pi} onClick={() => { setPi(i); reset(); }}>
                {p.text.replace(' ?', '?')}
              </button>
            ))}
          </div>
          <div className="wt-btnrow">
            <button type="button" className="btn" onClick={play}>
              Play it
            </button>
            <button type="button" className="btn quiet" onClick={next}>
              Next word
            </button>
          </div>
        </>
      }
    >
      <div className="wt-fig-wide wt-chat">
        <div className="wt-bubble wt-user">
          <span className="wt-who">You wrote</span>
          <span>{prompt.text}</span>
        </div>
        <div className={'wt-bubble wt-model ' + (tuned ? 'is-tuned' : 'is-base')} aria-live="off">
          <span className="wt-who">{tuned ? 'Tuned model wrote' : 'Base model wrote'}</span>
          {sents.map((s, si) => {
            const visible = s.words.filter((w) => w.i < k);
            if (!visible.length) return null;
            const answer = s.kind === 'statement' && tuned;
            return (
              <div key={si} className="wt-sent">
                <span className={'wt-tag ' + (s.kind === 'question' ? 'is-bad' : s.kind === 'statement' && o.answered ? 'is-good' : '')}>
                  {s.kind === 'question' ? '? another question' : answer || o.answered ? 'answer' : 'statement'}
                </span>
                <span className="wt-words">
                  {visible.map((w) => (
                    <motion.span
                      key={w.i + '-' + tuned + '-' + pi}
                      className="wt-word"
                      initial={anim ? { opacity: 0, y: 4 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: EASE, delay: playing ? 0 : Math.min(w.i, 12) * 0.03 }}
                    >
                      {w.t}
                    </motion.span>
                  ))}
                </span>
              </div>
            );
          })}
          {done && <span className="wt-stop">{o.stopped ? 'the model chose to stop here' : 'cut off at the length limit'}</span>}
        </div>
        <div className="wt-cands" aria-label="The words the model weighed for its next word">
          <p className="wt-cands-title">
            {touched && done ? 'Last choice: why it stopped' : `Choosing word ${idx + 1}${touched ? '' : ' (press Next word to step through)'}`}. It looked at the last {Math.min(step.contextLength, MAX_CONTEXT)} words and picked the likeliest:
          </p>
          {step.candidates.map((c, i) => (
            <div key={c.token} className={'wt-cand' + (i === 0 ? ' is-top' : '')}>
              <span className="wt-cand-word">{show(c.token)}</span>
              <span className="wt-cand-track">
                <motion.i initial={false} animate={{ width: `${pct(c.p)}%` }} transition={{ duration: 0.4, ease: EASE }} />
              </span>
              <span className="wt-cand-pct">{pct(c.p)}%</span>
            </div>
          ))}
        </div>
      </div>
      <p className="wt-note">
        A toy: this is a table of word counts, not a neural network, and it only knows these three questions. The base model learned from ordinary text (quiz lists, short facts), where one question is followed by the next question. The tuned model has the same text plus one demonstration for each question (question, direct answer, stop), counted {DEMO_WEIGHT} times. That copies only the first step of InstructGPT, training on written demonstrations; the paper then adds human rankings and reinforcement learning. Words are chosen greedily: always the likeliest one.
      </p>
    </WhatIfFrame>
  );
}
