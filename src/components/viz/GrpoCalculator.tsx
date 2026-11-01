import { useEffect, useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import { groupStats, grpoUpdate, kl, logitsFromProbs, probCorrect, sampleGroup, softmax, train } from '../../lib/grpo';

const PROMPT = 'A pen costs 17p. What do 6 pens cost?';
const ANSWERS = ['102p', '£1.02', '112p', '96p', '108p', 'Cannot tell'];
const REF = [0.22, 0.08, 0.25, 0.2, 0.15, 0.1];
const REF_LOGITS = logitsFromProbs(REF);
const START_CORRECT = [true, true, false, false, false, false];
const LR = 0.5;
const EPS = 0.2;
const STEPS = 30;
const GROUP_SIZES = [4, 8, 16];
const INNER = [1, 2, 4];

const pct = (p: number) => `${(p * 100).toFixed(1)}%`;
const signed = (x: number, d = 2) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d);

type Pt = [number, number];

function Trace({ label, lines, yLabel }: { label: string; yLabel: string; lines: { id: string; cls: string; pts: Pt[] }[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [w, setW] = useState(420);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const h = 190;
  const pad = { l: 40, r: 10, t: 8, b: 38 };
  const yMax = Math.max(0.01, ...lines.flatMap((l) => l.pts.map((p) => p[1])));
  const top = yLabel === '%' ? 1 : Math.ceil(yMax);
  const sx = (x: number) => pad.l + (x / STEPS) * (w - pad.l - pad.r);
  const sy = (y: number) => h - pad.b - (y / top) * (h - pad.t - pad.b);
  const d = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`).join(' ');
  const yt = yLabel === '%' ? [0, 0.5, 1] : [0, top / 2, top];
  const fmt = (v: number) => (yLabel === '%' ? `${Math.round(v * 100)}%` : v.toFixed(top > 1 ? 1 : 2));
  return (
    <svg ref={ref} viewBox={`0 0 ${w} ${h}`} className="dlb-chart" role="img" aria-label={label}>
      {yt.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={sy(v)} y2={sy(v)} className="dlb-grid" />
          <text x={pad.l - 6} y={sy(v) + 4} textAnchor="end" className="dlb-ax">
            {fmt(v)}
          </text>
        </g>
      ))}
      {[0, 10, 20, 30].map((x) => (
        <text key={x} x={sx(x)} y={h - pad.b + 17} textAnchor="middle" className="dlb-ax">
          {x}
        </text>
      ))}
      <text x={(pad.l + w - pad.r) / 2} y={h - 5} textAnchor="middle" className="dlb-ax">
        updates, each on a fresh group
      </text>
      <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className="dlb-axis" />
      {lines.map((l) => (
        <path key={l.id} d={d(l.pts)} className={`dlb-line ${l.cls}`} fill="none" />
      ))}
    </svg>
  );
}

export default function GrpoCalculator() {
  const [correct, setCorrect] = useState<boolean[]>(START_CORRECT);
  const [k, setK] = useState(8);
  const [inner, setInner] = useState(1);
  const [beta, setBeta] = useState(0.5);
  const [logits, setLogits] = useState<number[]>(REF_LOGITS);
  const [group, setGroup] = useState<number[] | null>(null);
  const [draws, setDraws] = useState(0);
  const [applied, setApplied] = useState<{ before: number[]; clipped: number } | null>(null);

  const probs = useMemo(() => softmax(logits), [logits]);
  const rewards: number[] = group ? group.map((a) => (correct[a] ? 1 : 0)) : [];
  const stats = groupStats(rewards);
  const pNow = probCorrect(probs, correct);
  const driftNow = kl(probs, REF);

  const reset = (c = correct) => {
    setLogits(REF_LOGITS);
    setGroup(null);
    setApplied(null);
    setDraws(0);
    setCorrect(c);
  };

  const draw = () => {
    const n = draws + 1;
    setDraws(n);
    setGroup(sampleGroup(probs, k, n * 7919 + k));
    setApplied(null);
  };

  const apply = () => {
    if (!group) return;
    const res = grpoUpdate(logits, REF_LOGITS, group, rewards, { eps: EPS, beta, learningRate: LR, inner });
    setApplied({ before: probs, clipped: res.clipped });
    setLogits(res.logits);
    setGroup(null);
  };

  const withBeta = useMemo(() => train(REF, correct, k, STEPS, { eps: EPS, beta, learningRate: LR, inner }, 1), [correct, k, beta, inner]);
  const noBeta = useMemo(() => train(REF, correct, k, STEPS, { eps: EPS, beta: 0, learningRate: LR, inner }, 1), [correct, k, inner]);
  const startP = probCorrect(REF, correct);
  const lineWith: Pt[] = [[0, startP], ...withBeta.pCorrect.map((v, i): Pt => [i + 1, v])];
  const lineNo: Pt[] = [[0, startP], ...noBeta.pCorrect.map((v, i): Pt => [i + 1, v])];
  const klWith: Pt[] = [[0, 0], ...withBeta.kl.map((v, i): Pt => [i + 1, v])];
  const klNo: Pt[] = [[0, 0], ...noBeta.kl.map((v, i): Pt => [i + 1, v])];

  // rows of the by-answer table
  const rows = ANSWERS.map((text, a) => {
    const idx = group ? group.map((g, i) => (g === a ? i : -1)).filter((i) => i >= 0) : [];
    const adv = idx.length ? stats.advantages[idx[0]] : 0;
    return { a, text, count: idx.length, reward: correct[a] ? 1 : 0, adv, push: adv * idx.length };
  });

  const nCorrect = rewards.reduce((x, y) => x + y, 0);
  const flat = group && (nCorrect === 0 || nCorrect === group.length);

  const live = applied
    ? `Update applied. The probability of an accepted answer went from ${pct(probCorrect(applied.before, correct))} to ${pct(pNow)}. Distance from the starting policy, KL, is ${driftNow.toFixed(3)}.`
    : group
      ? `Group of ${group.length} drawn. ${nCorrect} accepted. Group mean ${stats.mean.toFixed(2)}, standard deviation ${stats.std.toFixed(2)}.`
      : 'No group drawn yet.';

  return (
    <Root>
      <div className="viz dlb dlb-grpo">
        <p className="viz-title">GRPO on a toy policy: advantages, one update, and the KL leash</p>
        <p className="dlb-prompt">
          Prompt: <b>{PROMPT}</b> The policy picks one whole answer. A checker accepts or rejects it, so the reward is 1 or 0. Tap an answer to change what the checker accepts (this restarts training).
        </p>

        <ul className="dlb-answers" aria-label="Answers, their probability under the policy, and what the checker accepts">
          {ANSWERS.map((text, a) => {
            const delta = applied ? probs[a] - applied.before[a] : 0;
            return (
              <li key={text} className="dlb-ans">
                <button
                  type="button"
                  className="dlb-tog"
                  aria-pressed={correct[a]}
                  aria-label={`${text}: the checker ${correct[a] ? 'accepts' : 'rejects'} this answer. Tap to change.`}
                  onClick={() => reset(correct.map((c, i) => (i === a ? !c : c)))}
                >
                  {correct[a] ? 'accepted' : 'rejected'}
                </button>
                <span className="dlb-atext">{text}</span>
                <span className="dlb-bar" aria-hidden="true">
                  <span className={`dlb-fill ${correct[a] ? 'ok' : ''}`} style={{ width: `${probs[a] * 100}%` }} />
                  <span className="dlb-ref" style={{ left: `${REF[a] * 100}%` }} />
                </span>
                <span className="dlb-pv num">
                  {pct(probs[a])}
                  {applied && Math.abs(delta) > 0.0005 && <small className={delta > 0 ? 'up' : 'down'}> {signed(delta * 100, 1)}</small>}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="dlb-note">
          The bar is the policy now; the tick is the starting (reference) policy. Probability of an accepted answer: <b>{pct(pNow)}</b>. Drift from the start (KL): <b>{driftNow.toFixed(3)}</b>.
        </p>

        <div className="dlb-row" role="group" aria-label="Group size">
          <span className="dlb-label">Group size k</span>
          {GROUP_SIZES.map((g) => (
            <button key={g} type="button" className="dlb-chip" aria-pressed={k === g} onClick={() => { setK(g); setGroup(null); setApplied(null); }}>
              {g}
            </button>
          ))}
          <span className="dlb-label dlb-gap">Steps per group</span>
          {INNER.map((g) => (
            <button key={g} type="button" className="dlb-chip" aria-pressed={inner === g} onClick={() => setInner(g)}>
              {g}
            </button>
          ))}
        </div>
        <div className="dlb-row">
          <button type="button" className="btn" onClick={draw}>
            1. Draw a group of {k}
          </button>
          <button type="button" className="btn" onClick={apply} disabled={!group}>
            2. Apply one update
          </button>
          <button type="button" className="dlb-chip" onClick={() => reset()}>
            Reset policy
          </button>
        </div>

        <div className="dlb-live" aria-live="polite">
          {live}
        </div>

        {group && (
          <div className="dlb-step">
            <p className="dlb-h">Step 1: score the group</p>
            <p className="dlb-samples" aria-label="The drawn answers">
              {group.map((a, i) => (
                <span key={i} className={`dlb-s ${correct[a] ? 'ok' : 'no'}`}>
                  {ANSWERS[a]}
                </span>
              ))}
            </p>
            <p className="dlb-calc">
              {nCorrect} of {group.length} accepted. Mean reward = {nCorrect}/{group.length} = <b>{stats.mean.toFixed(3)}</b>. Standard deviation (dividing by k &minus; 1) = <b>{stats.std.toFixed(3)}</b>.
            </p>
            {flat ? (
              <p className="dlb-flat">
                Every answer in this group got the same reward, so the standard deviation is 0 and every advantage is 0. Nothing in the group is better than anything else, so this group teaches nothing. Draw another.
              </p>
            ) : (
              <>
                <p className="dlb-calc">
                  Advantage = (reward &minus; mean) / std. An accepted answer: ({1} &minus; {stats.mean.toFixed(2)}) / {stats.std.toFixed(2)} = <b>{signed((1 - stats.mean) / stats.std)}</b>. A rejected one: ({0} &minus; {stats.mean.toFixed(2)}) / {stats.std.toFixed(2)} = <b>{signed((0 - stats.mean) / stats.std)}</b>.
                </p>
                <div className="dlb-tablewrap">
                  <table className="dlb-table">
                    <thead>
                      <tr>
                        <th scope="col">Answer</th>
                        <th scope="col">Drawn</th>
                        <th scope="col">Reward</th>
                        <th scope="col">Advantage each</th>
                        <th scope="col">Total push</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows
                        .filter((r) => r.count > 0)
                        .map((r) => (
                          <tr key={r.a}>
                            <th scope="row">{r.text}</th>
                            <td className="num">{r.count}</td>
                            <td className="num">{r.reward}</td>
                            <td className={`num ${r.adv > 0 ? 'up' : 'down'}`}>{signed(r.adv)}</td>
                            <td className={`num ${r.push > 0 ? 'up' : 'down'}`}>{signed(r.push)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p className="dlb-note">
                  Step 2 changes each answer&rsquo;s logit by {LR} &times; (total push &divide; {group.length}) on the first step, then the softmax turns logits back into probabilities. Advantages in a group always add up to zero, so what one answer gains the others lose.
                </p>
              </>
            )}
          </div>
        )}

        {applied && (
          <p className="dlb-calc">
            {applied.clipped > 0 ? `The clip cut the gradient of ${applied.clipped} of ${k} samples on the last step (their probability had already moved by more than ${EPS * 100}% in the direction asked for). ` : inner > 1 ? 'No sample reached the clip limit. ' : ''}
            The KL leash with beta = {beta.toFixed(2)} pulled back a little: it is zero at the start and grows with the drift.
          </p>
        )}

        <div className="dlb-leash">
          <p className="dlb-h">Thirty updates, and the KL leash</p>
          <label className="field">
            <span>
              KL weight beta (toy scale) <b>{beta.toFixed(2)}</b>
            </span>
            <input type="range" min={0} max={1.5} step={0.05} value={beta} aria-label="KL penalty weight" onChange={(e) => setBeta(+e.target.value)} />
          </label>
          <div className="dlb-charts">
            <figure className="dlb-fig">
              <figcaption className="dlb-figcap">Probability of an accepted answer</figcaption>
              <Trace
                yLabel="%"
                label={`Probability of an accepted answer over ${STEPS} updates, starting at ${pct(startP)}. With beta ${beta.toFixed(2)} it ends at ${pct(withBeta.pCorrect[STEPS - 1])}; with no KL penalty it ends at ${pct(noBeta.pCorrect[STEPS - 1])}.`}
                lines={[
                  { id: 'no', cls: 'dlb-l-ghost', pts: lineNo },
                  { id: 'with', cls: 'dlb-l-opt', pts: lineWith },
                ]}
              />
            </figure>
            <figure className="dlb-fig">
              <figcaption className="dlb-figcap">Drift from the start (KL)</figcaption>
              <Trace
                yLabel="kl"
                label={`KL from the reference policy over ${STEPS} updates. With beta ${beta.toFixed(2)} it ends at ${withBeta.kl[STEPS - 1].toFixed(2)}; with no KL penalty it ends at ${noBeta.kl[STEPS - 1].toFixed(2)}.`}
                lines={[
                  { id: 'no', cls: 'dlb-l-ghost', pts: klNo },
                  { id: 'with', cls: 'dlb-l-opt', pts: klWith },
                ]}
              />
            </figure>
          </div>
          <p className="dlb-legend">
            <span className="dlb-key dlb-k-opt" /> with beta = {beta.toFixed(2)} <span className="dlb-key dlb-k-ghost" /> with beta = 0
          </p>
          <p className="dlb-calc" aria-live="polite">
            After {STEPS} updates: accepted-answer probability <b>{pct(withBeta.pCorrect[STEPS - 1])}</b> (beta = 0: {pct(noBeta.pCorrect[STEPS - 1])}), drift <b>{withBeta.kl[STEPS - 1].toFixed(2)}</b> (beta = 0: {noBeta.kl[STEPS - 1].toFixed(2)}).
          </p>
        </div>

        <p className="viz-cap">
          A toy: six whole answers instead of thousands of tokens, one prompt instead of a dataset, and a plain softmax instead of a language model. The advantage, clip and KL terms are the ones in the DeepSeekMath and DeepSeek-R1 papers, except that the KL here is computed exactly rather than estimated from samples. Real runs use much smaller beta (0.04 in DeepSeekMath, 0.001 in DeepSeek-R1) because each answer has hundreds of tokens, and some current recipes drop the KL term altogether. Groups are drawn with a fixed random seed, so the same clicks give the same result.
        </p>
      </div>
    </Root>
  );
}
