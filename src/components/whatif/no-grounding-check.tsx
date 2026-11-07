import { useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { DEFAULT_THRESHOLD, DRAFTS, QUESTION, SOURCES, TRUTH, checkDraft, checkerCorrect, flaggedCount, pct } from '../../lib/whatif/no-grounding-check';

/**
 * Three retrieved sentences and a drafted answer. With the check on, every answer sentence is compared with its
 * best-matching source and marked backed or not backed. With it off, the draft goes out as one smooth paragraph.
 */
export default function NoGroundingCheckWhatIf() {
  const [on, setOn] = useState(true);
  const [di, setDi] = useState(0);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const draft = DRAFTS[di];
  const checks = checkDraft(draft, threshold);
  const truth = TRUTH[draft.id];
  const flagged = flaggedCount(checks);
  const trulyBad = truth.filter((t) => !t).length;
  const right = checkerCorrect(draft, threshold);
  const firstBad = checks.find((c) => !c.supported);

  const verdict = on ? (
    flagged > 0 ? (
      <>
        The check flags {flagged} of {checks.length} {checks.length === 1 ? 'sentence' : 'sentences'}: "{firstBad!.sentence}" ({firstBad!.reason}). By hand, {trulyBad} {trulyBad === 1 ? 'is' : 'are'} really not in the sources, so the toy is right on {right} of {checks.length}.
      </>
    ) : (
      <>
        The check passes all {checks.length} {checks.length === 1 ? 'sentence' : 'sentences'}. By hand, {trulyBad === 0 ? 'every one does follow the sources' : `${trulyBad} ${trulyBad === 1 ? 'is' : 'are'} really not in the sources, so this toy missed ${trulyBad === 1 ? 'it' : 'them'}`}.
      </>
    )
  ) : trulyBad > 0 ? (
    <>
      Nothing is checked, so all {checks.length} {checks.length === 1 ? 'sentence goes' : 'sentences go'} out looking equally sure. Checking by hand, {trulyBad} {trulyBad === 1 ? 'is' : 'are'} not backed by the sources, and the reader cannot tell which.
    </>
  ) : (
    <>
      Nothing is checked. This draft happens to follow the sources, but nobody would know if it did not: the reader sees the same smooth text either way.
    </>
  );

  return (
    <WhatIfFrame
      title={`Question: "${QUESTION}"`}
      withLabel="With a grounding check"
      withoutLabel="Without one"
      on={on}
      onChange={setOn}
      verdict={verdict}
      controls={
        <>
          <div className="wr-chips" role="group" aria-label="Pick a drafted answer">
            {DRAFTS.map((d, i) => (
              <button key={d.id} type="button" className={'wr-chip' + (i === di ? ' is-on' : '')} aria-pressed={i === di} onClick={() => setDi(i)}>
                {d.label}
              </button>
            ))}
          </div>
          {on && (
            <label className="field">
              <span>
                Strictness: a sentence needs <b>{pct(threshold)}</b> of its words in one source
              </span>
              <input type="range" min={30} max={100} step={5} value={Math.round(threshold * 100)} onChange={(e) => setThreshold(+e.target.value / 100)} aria-label="How much of a sentence must appear in a source" />
            </label>
          )}
        </>
      }
    >
      <p className="wr-lead">
        {on
          ? 'A grounding check takes each sentence of the draft and asks: do the sources actually say this? Sentences that nothing supports get flagged before anyone reads them.'
          : 'Without a check the draft goes straight to the reader. A made-up sentence looks just like a true one.'}
      </p>
      <div className="wr-card">
        <p className="wr-card-h">Retrieved sources</p>
        <ol className="wr-src">
          {SOURCES.map((s, i) => (
            <li key={s}>
              <span className="wr-src-n">S{i + 1}</span> {s}
            </li>
          ))}
        </ol>
      </div>
      <p className="wr-card-h" style={{ margin: '0.9rem 0 0.35rem' }}>
        Drafted answer
      </p>
      <p className="wr-meta" style={{ margin: '0 0 0.4rem' }}>{on ? draft.note : 'This is exactly what the reader sees: one smooth paragraph.'}</p>
      {on ? (
        <ol className="wr-list" aria-label="Each sentence of the draft with its check result">
          {checks.map((c, i) => (
            <motion.li
              key={`${draft.id}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: i * 0.15 }}
              className={'wr-row ' + (c.supported ? 'is-good' : 'is-bad')}
            >
              <span className="wr-rank" aria-hidden="true">{c.supported ? '✓' : '✗'}</span>
              <div className="wr-body">
                <span className="wr-text">{c.sentence}</span>
                <span className="wr-bar" aria-hidden="true"><i style={{ width: `${Math.round(c.overlap * 100)}%` }} /></span>
                <span className="wr-meta">
                  <b className="wr-tag">{c.supported ? `Backed by S${c.source + 1}` : 'Not backed by the sources'}</b> · {c.reason}
                </span>
                {c.supported !== truth[i] && (
                  <span className="wr-meta">
                    <b className="wr-tag">Toy mistake.</b> Checked by hand, this sentence is actually {truth[i] ? 'supported by the sources.' : 'not supported by the sources.'}
                  </span>
                )}
              </div>
            </motion.li>
          ))}
        </ol>
      ) : (
        <p className="wr-reply wr-plain">{checks.map((c) => c.sentence).join(' ')}</p>
      )}
      <p className="wr-note">
        This checker is a toy. It counts how many of a sentence's content words appear in the closest source, and compares numbers. It cannot understand paraphrase or negation, which is why two of the examples fool it. Real checkers are models: an entailment model, or a language model asked to judge whether a source supports a claim. The hand labels used in the verdict are written by the author for this example.
      </p>
    </WhatIfFrame>
  );
}
