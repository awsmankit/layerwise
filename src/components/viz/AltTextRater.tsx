import { useState } from 'react';
import { Root } from './shared';
import { agreement, RATING_LABEL, RATINGS, SCENARIOS, type Picks, type Rating, type Scenario } from '../../lib/alt-text';

/*
 * Alt-text rater: three invented images in three situations. For each candidate alt text the learner picks
 * Good, Needs work or Poor and then sees the expected rating and the reason. Drawings are simple shapes
 * and have a text description beside them, so the lab works without seeing the picture.
 */

function Drawing({ id }: { id: Scenario['id'] }) {
  if (id === 'chart') {
    const bars = [
      { l: 'Pizza', v: 40 },
      { l: 'Pasta', v: 25 },
      { l: 'Curry', v: 20 },
      { l: 'Salad', v: 15 },
    ];
    return (
      <svg className="wrd-svg" viewBox="0 0 240 130" role="img" aria-label="Drawing of a bar chart of lunch choices: pizza 40 percent, pasta 25, curry 20, salad 15">
        <line x1="24" y1="104" x2="232" y2="104" className="wrd-axis" />
        {bars.map((b, i) => (
          <g key={b.l}>
            <rect x={36 + i * 50} y={104 - b.v * 2} width="34" height={b.v * 2} className="wrd-bar" />
            <text x={53 + i * 50} y={98 - b.v * 2} textAnchor="middle" className="wrd-svg-t">
              {b.v}%
            </text>
            <text x={53 + i * 50} y="122" textAnchor="middle" className="wrd-svg-t">
              {b.l}
            </text>
          </g>
        ))}
      </svg>
    );
  }
  if (id === 'dog') {
    return (
      <svg className="wrd-svg" viewBox="0 0 240 130" role="img" aria-label="Drawing of a small brown and white dog with a red collar sitting on a blue sofa">
        <rect x="20" y="84" width="200" height="40" rx="8" className="wrd-sofa" />
        <rect x="20" y="62" width="200" height="30" rx="8" className="wrd-sofa wrd-sofa-back" />
        <ellipse cx="120" cy="86" rx="30" ry="22" className="wrd-fur" />
        <circle cx="120" cy="52" r="22" className="wrd-fur" />
        <ellipse cx="102" cy="48" rx="7" ry="14" className="wrd-ear" />
        <ellipse cx="138" cy="42" rx="7" ry="10" className="wrd-ear wrd-ear-up" />
        <circle cx="112" cy="52" r="2.6" className="wrd-eye" />
        <circle cx="128" cy="52" r="2.6" className="wrd-eye" />
        <ellipse cx="120" cy="61" rx="5" ry="3.4" className="wrd-eye" />
        <rect x="102" y="70" width="36" height="6" rx="3" className="wrd-collar" />
      </svg>
    );
  }
  return (
    <svg className="wrd-svg" viewBox="0 0 240 130" aria-hidden="true">
      <rect x="10" y="30" width="220" height="70" rx="8" className="wrd-wave-bg" />
      {[0, 1, 2].map((r) => (
        <path key={r} d={`M10 ${52 + r * 18} q 18 -14 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0`} className="wrd-wave" fill="none" />
      ))}
    </svg>
  );
}

const show = (t: string) => (t === '' ? '(empty: alt="")' : `“${t}”`);

export default function AltTextRater() {
  const [sid, setSid] = useState<Scenario['id']>('chart');
  const [picks, setPicks] = useState<Picks>({});

  const scn = SCENARIOS.find((s) => s.id === sid) as Scenario;
  const ag = agreement(scn, picks);

  const set = (id: string, r: Rating) => setPicks((p) => ({ ...p, [id]: r }));
  const reset = () => setPicks((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !scn.candidates.some((c) => c.id === k))));

  return (
    <Root>
      <div className="viz wrd wrd-alt">
        <p className="viz-title">Alt-text rater: what should the picture say?</p>

        <div className="wrd-chips" role="group" aria-label="Choose a picture">
          {SCENARIOS.map((s) => (
            <button key={s.id} type="button" className="wrd-chip" aria-pressed={sid === s.id} onClick={() => setSid(s.id)}>
              {s.title}
            </button>
          ))}
        </div>

        <div className="wrd-scene">
          <Drawing id={scn.id} />
          <div className="wrd-scene-t">
            <p>
              <b>What you can see:</b> {scn.seen}
            </p>
            <p>
              <b>Where it is:</b> {scn.context}
            </p>
          </div>
        </div>

        <p className="wrd-q">Rate each possible alt text for this picture in this place.</p>
        <ul className="wrd-cands">
          {scn.candidates.map((c) => {
            const mine = picks[c.id];
            const right = mine === c.rating;
            return (
              <li key={c.id} className="wrd-cand">
                <p className="wrd-cand-t">{show(c.text)}</p>
                <div className="wrd-rate" role="group" aria-label={`Rate ${show(c.text)}`}>
                  {RATINGS.map((r) => (
                    <button key={r} type="button" className={`wrd-rbtn wrd-r-${r}`} aria-pressed={mine === r} onClick={() => set(c.id, r)}>
                      {RATING_LABEL[r]}
                    </button>
                  ))}
                </div>
                <div className="wrd-fb" aria-live="polite">
                  {mine ? (
                    <p className={right ? 'wrd-yes' : 'wrd-no'}>
                      <b>{right ? `Agreed: ${RATING_LABEL[c.rating]}.` : `This lesson rates it ${RATING_LABEL[c.rating]}.`}</b> {c.why}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="wrd-bottom">
          <p className="wrd-total" aria-live="polite">
            <b>{ag.matched}</b> of <b>{ag.rated}</b> rated agree with the lesson.
          </p>
          <button type="button" className="wrd-reset" onClick={reset} disabled={ag.rated === 0}>
            Clear this picture
          </button>
        </div>
        <p className="wrd-hint">
          The drawings, the alt texts and the ratings are invented for practice and follow the W3C alt decision tree. Real choices depend on the page: the same photo can need a description in one place and an empty alt in another. An AI draft is a starting point for a person who knows the page.
        </p>
      </div>
    </Root>
  );
}
