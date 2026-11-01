import { useMemo, useState } from 'react';
import { Root } from './shared';
import { cer, NO_NORMALISATION, scoreWithNormalisation, type NormOptions, type Op } from '../../lib/wer';

/*
 * Word error rate with the alignment shown: the learner edits a reference and a hypothesis, switches
 * normalisation steps on and off, and sees which words were substituted, deleted or inserted.
 * The maths is in src/lib/wer.ts (checked against jiwer). The example sentences are invented.
 */

type Preset = { id: string; label: string; ref: string; hyp: string; look: string };

const PRESETS: Preset[] = [
  {
    id: 'sdi',
    label: 'Count the errors',
    ref: 'she sells sea shells by the sea shore every day',
    hyp: 'she sells see shells by the shore every day today',
    look: 'One word was swapped (sea for see), one was dropped (the second sea) and one was added (today). That is 3 edits over 10 reference words: 0.30.',
  },
  {
    id: 'format',
    label: 'Format only',
    ref: "Call me at 5, it's urgent.",
    hyp: 'call me at five it is urgent',
    look: 'Every word was heard correctly, yet the raw score is bad because of capitals, punctuation, a digit and a contraction. Switch the steps on one at a time and watch the errors vanish.',
  },
  {
    id: 'fillers',
    label: 'Um and uh',
    ref: 'so um I think we should uh book the room',
    hyp: 'so I think we should book the room',
    look: 'The transcriber left out the fillers. Is that an error? For meeting notes, no. For a verbatim court record, yes. The metric cannot decide; you must.',
  },
  {
    id: 'risk',
    label: 'A risky slip',
    ref: 'give him fifteen milligrams',
    hyp: 'give him fifty milligrams',
    look: 'One substitution in four words is 0.25, the same as swapping "give" for "gave". The score treats every word alike, so a wrong dose weighs no more than a wrong "the".',
  },
  {
    id: 'silence',
    label: 'Silence',
    ref: '',
    hyp: 'thanks for watching',
    look: 'The reference is empty, so there is no N to divide by and the rate is undefined. Count the inserted words instead. This is how invented text on silent audio shows up in a test set.',
  },
];

const STEPS: { key: keyof NormOptions; label: string }[] = [
  { key: 'lowercase', label: 'Lower case' },
  { key: 'punctuation', label: 'Strip punctuation' },
  { key: 'numerals', label: 'Digits to words' },
  { key: 'contractions', label: 'Expand contractions' },
  { key: 'fillers', label: 'Drop um and uh' },
];
const ALL_ON: NormOptions = { lowercase: true, punctuation: true, numerals: true, contractions: true, fillers: true };

const TAG: Record<Op, string> = { ok: 'match', sub: 'swapped', del: 'missing', ins: 'extra' };
const SHORT: Record<Op, string> = { ok: 'OK', sub: 'S', del: 'D', ins: 'I' };

const pct = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 1000) / 10}%` : 'undefined');
const two = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : 'undefined');

export default function WerCalculator() {
  const [presetId, setPresetId] = useState('sdi');
  const [ref, setRef] = useState(PRESETS[0].ref);
  const [hyp, setHyp] = useState(PRESETS[0].hyp);
  const [opts, setOpts] = useState<NormOptions>(NO_NORMALISATION);

  const preset = PRESETS.find((p) => p.id === presetId);
  const score = useMemo(() => scoreWithNormalisation(ref.slice(0, 800), hyp.slice(0, 800), opts), [ref, hyp, opts]);
  const charRate = useMemo(() => cer(ref.slice(0, 800), hyp.slice(0, 800)), [ref, hyp]);
  const anyOn = Object.values(opts).some(Boolean);

  const choose = (p: Preset) => {
    setPresetId(p.id);
    setRef(p.ref);
    setHyp(p.hyp);
    setOpts(NO_NORMALISATION);
  };

  const sum = `${score.subs} substituted, ${score.dels} missing, ${score.ins} extra, ${score.hits} correct, out of ${score.refLen} reference words.`;
  const headline = Number.isNaN(score.wer)
    ? `Word error rate is undefined because the reference has no words. ${score.ins} extra word${score.ins === 1 ? '' : 's'} in the output.`
    : `Word error rate ${two(score.wer)} (${pct(score.wer)}). ${sum}`;

  return (
    <Root>
      <div className="viz aub aub-wer">
        <p className="viz-title">Word error rate, with the alignment shown</p>

        <div className="aub-chips" role="group" aria-label="Example sentences">
          <span className="aub-chip-label">Examples (invented)</span>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="aub-chip" aria-pressed={presetId === p.id} onClick={() => choose(p)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="aub-fields">
          <label className="aub-field">
            <span>Reference: what was really said</span>
            <textarea value={ref} rows={2} maxLength={800} spellCheck={false} onChange={(e) => (setRef(e.target.value), setPresetId('custom'))} />
          </label>
          <label className="aub-field">
            <span>Hypothesis: what the system wrote</span>
            <textarea value={hyp} rows={2} maxLength={800} spellCheck={false} onChange={(e) => (setHyp(e.target.value), setPresetId('custom'))} />
          </label>
        </div>

        <div className="aub-chips" role="group" aria-label="Text normalisation steps, applied to both sides">
          <span className="aub-chip-label">Normalise both sides</span>
          {STEPS.map((s) => (
            <button key={s.key} type="button" className="aub-chip" aria-pressed={opts[s.key]} onClick={() => setOpts({ ...opts, [s.key]: !opts[s.key] })}>
              {s.label}
            </button>
          ))}
          <button type="button" className="aub-chip aub-quiet" onClick={() => setOpts(anyOn ? NO_NORMALISATION : ALL_ON)}>
            {anyOn ? 'All off' : 'All on'}
          </button>
        </div>

        <div className="aub-result">
          <div className="aub-big" aria-hidden="true">
            <span className="aub-big-n">{Number.isNaN(score.wer) ? 'n/a' : pct(score.wer)}</span>
            <span className="aub-big-l">word error rate</span>
          </div>
          <div className="aub-sum" aria-hidden="true">
            <p className="aub-formula">
              {Number.isNaN(score.wer) ? (
                <>
                  (S + D + I) / N with N = 0: undefined
                </>
              ) : (
                <>
                  (S + D + I) / N = ({score.subs} + {score.dels} + {score.ins}) / {score.refLen} = {two(score.wer)}
                </>
              )}
            </p>
            <p className="aub-meta">
              Character error rate {pct(charRate)} (raw text, spaces counted). Match error rate {pct(score.mer)}. Word information lost {pct(score.wil)}.
            </p>
          </div>
          <p className="aub-sr" role="status" aria-live="polite">
            {headline}
          </p>
        </div>

        {score.items.length > 0 ? (
          <ol className="aub-align" aria-label="Word by word alignment: reference above, hypothesis below">
            {score.items.map((it, i) => (
              <li key={i} className={`aub-col aub-${it.op}`}>
                <span className="aub-w" aria-label={`reference: ${it.ref ?? 'nothing'}`}>
                  {it.ref ?? '–'}
                </span>
                <span className="aub-w" aria-label={`hypothesis: ${it.hyp ?? 'nothing'}`}>
                  {it.hyp ?? '–'}
                </span>
                <span className="aub-tag" aria-label={TAG[it.op]}>
                  {SHORT[it.op]}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="aub-hint">Both sides are empty after normalising: nothing to align.</p>
        )}
        <p className="aub-key">
          OK match, S swapped (substitution), D missing (deletion), I extra (insertion). Top row reference, bottom row hypothesis.
        </p>

        {preset ? <p className="aub-look">{preset.look}</p> : null}
        <p className="aub-hint">
          The normaliser here is a small teaching toy (a few contractions, whole numbers up to 999). Real evaluations must publish theirs.
        </p>
      </div>
    </Root>
  );
}
