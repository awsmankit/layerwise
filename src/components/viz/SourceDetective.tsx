import { useEffect, useRef, useState } from 'react';
import { Root } from './shared';
import { CLUE_IDS, SCENES, choiceOf, summarise, type Answers, type Art, type ClueId, type Rating, type Scene } from '../../lib/source-check';

/*
 * "Check it like a detective": six invented scenes. In each one the learner opens a source card
 * (who posted it, can I find it elsewhere, how does it make me feel, any label), then decides what
 * to do and gets kind feedback. There is nothing to upload and nothing is judged from pixels: the
 * point is that the source tells you more than the picture does. Nothing is stored or sent.
 */

const RATING_LEAD: Record<Rating, string> = {
  best: 'Good call.',
  okay: 'A fair idea, with a catch.',
  risky: 'Not quite. Here is why.',
};

function Picture({ art, alt }: { art: Art; alt: string }) {
  if (art === 'none') return null;
  return (
    <svg viewBox="0 0 240 150" className="ra-art" role="img" aria-label={alt}>
      {art === 'creature' && (
        <g>
          <rect width="240" height="150" className="ra-sky" />
          <rect y="96" width="240" height="54" className="ra-grass" />
          <path d="M20 128 H220 M40 138 H200" className="ra-stroke" />
          <path d="M40 112 C46 70 92 62 126 76 C150 60 188 70 198 104 C206 118 190 126 170 124 C140 130 80 132 56 126 C44 124 38 120 40 112 Z" className="ra-body" />
          <path d="M198 104 C214 96 226 100 230 108 C220 108 214 112 206 116" className="ra-body" />
          <circle cx="76" cy="92" r="6" className="ra-eye" />
          <circle cx="77" cy="92" r="2.4" className="ra-pupil" />
          <path d="M104 80 L112 70 L120 80 M134 76 L142 66 L150 76" className="ra-stroke" />
          <path d="M52 108 Q62 116 74 110" className="ra-stroke" />
        </g>
      )}
      {art === 'cat' && (
        <g>
          <rect width="240" height="150" className="ra-space" />
          <circle cx="30" cy="30" r="2" className="ra-star-dot" />
          <circle cx="206" cy="22" r="2.4" className="ra-star-dot" />
          <circle cx="190" cy="120" r="2" className="ra-star-dot" />
          <circle cx="44" cy="116" r="2.2" className="ra-star-dot" />
          <path d="M82 70 L88 34 L112 58 H128 L152 34 L158 70" className="ra-body" />
          <ellipse cx="120" cy="92" rx="32" ry="28" className="ra-body ra-cat" />
          <circle cx="108" cy="86" r="4" className="ra-pupil" />
          <circle cx="132" cy="86" r="4" className="ra-pupil" />
          <path d="M116 98 L120 102 L124 98 Z" className="ra-pupil" />
          <path d="M100 100 H84 M100 104 L86 110 M140 100 H156 M140 104 L154 110" className="ra-stroke" />
          <circle cx="120" cy="88" r="44" className="ra-glass" />
          <path d="M92 130 C108 140 132 140 148 130" className="ra-stroke" />
        </g>
      )}
      {art === 'school' && (
        <g>
          <rect width="240" height="150" className="ra-sky" />
          <rect y="70" width="240" height="80" className="ra-grass" />
          <path d="M0 96 H240 M0 114 H240 M0 132 H240" className="ra-stroke" />
          <path d="M170 24 V96 M60 24 V96" className="ra-stroke" />
          <path d="M60 28 H170 V52 H60 Z" className="ra-banner" />
          <path d="M70 40 H160" className="ra-stroke" />
          <circle cx="40" cy="108" r="6" className="ra-eye" />
          <path d="M40 114 V128 M40 120 L32 126 M40 120 L48 118 M40 128 L34 138 M40 128 L46 138" className="ra-stroke" />
          <circle cx="104" cy="124" r="6" className="ra-eye" />
          <path d="M104 130 V144 M104 136 L96 142 M104 136 L112 134" className="ra-stroke" />
        </g>
      )}
    </svg>
  );
}

function Item({ scene }: { scene: Scene }) {
  return (
    <div className={`ra-item ra-item-${scene.kind}`}>
      <p className="ra-setting">{scene.setting}</p>
      <Picture art={scene.art} alt={scene.alt} />
      <p className="ra-textlabel">{scene.textLabel}</p>
      <blockquote className="ra-quote">{scene.text}</blockquote>
    </div>
  );
}

export default function SourceDetective() {
  const [index, setIndex] = useState(0);
  const [looked, setLooked] = useState<ClueId[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState<Partial<Record<ClueId, boolean>>>({});
  const headRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  const scene = SCENES[index];
  const picked = chosen ? choiceOf(scene, chosen) : undefined;
  const best = scene.choices.find((c) => c.rating === 'best')!;

  /* move focus to the new scene's heading so screen-reader and keyboard users land on it */
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headRef.current?.focus();
  }, [index, done]);

  const toggle = (id: ClueId) => {
    setLooked((l) => (l.includes(id) ? l : [...l, id]));
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  };

  const choose = (id: string) => {
    if (chosen) return;
    setChosen(id);
    setAnswers((a) => ({ ...a, [scene.id]: { choice: id, looked } }));
  };

  const next = () => {
    if (index + 1 >= SCENES.length) {
      setDone(true);
      return;
    }
    setIndex(index + 1);
    setLooked([]);
    setOpen({});
    setChosen(null);
  };

  const again = () => {
    setIndex(0);
    setLooked([]);
    setOpen({});
    setChosen(null);
    setAnswers({});
    setDone(false);
  };

  if (done) {
    const sum = summarise(answers);
    return (
      <Root>
        <div className="viz ra-sd">
          <p className="viz-title">Check it like a detective</p>
          <h4 className="ra-h" ref={headRef} tabIndex={-1}>Case closed</h4>
          <p className="ra-say">
            You made the strongest move in <b className="num">{sum.best}</b> of <b className="num">{sum.answered}</b> scenes, and you opened at least two clues before deciding in <b className="num">{sum.lookedFirst}</b>.{' '}
            {SCENES.filter((s) => s.fine).length} of the {SCENES.length} scenes were fine. Good detectives do not distrust everything. They check, and then they decide.
          </p>
          <ol className="ra-routine">
            <li><b>Pause.</b> Do not share while you feel the rush.</li>
            <li><b>Check.</b> Who made it, and what do other trusted places say?</li>
            <li><b>Ask.</b> Tell a trusted adult if it is about money, danger or someone you know.</li>
            <li><b>Report.</b> Use the report button, or tell an adult, if it is a scam or hurts someone.</li>
          </ol>
          <div className="rl-buttons ra-actions">
            <button type="button" className="btn quiet" onClick={again}>Play again</button>
          </div>
        </div>
      </Root>
    );
  }

  return (
    <Root>
      <div className="viz ra-sd">
        <p className="viz-title">Check it like a detective</p>
        <p className="ra-progress">
          <span>Scene {index + 1} of {SCENES.length}</span>
          <span className="ra-tag">Invented example</span>
        </p>
        <h4 className="ra-h" ref={headRef} tabIndex={-1}>{scene.setting}</h4>

        <Item scene={scene} />

        <div className="ra-source">
          <p className="ra-source-head">Source card. Tap a question to check it.</p>
          <ul className="ra-clues">
            {CLUE_IDS.map((id) => {
              const clue = scene.clues.find((c) => c.id === id)!;
              const isOpen = !!open[id];
              return (
                <li key={id}>
                  <button type="button" className="ra-clue" aria-expanded={isOpen} aria-controls={`ra-${scene.id}-${id}`} onClick={() => toggle(id)}>
                    <span className="ra-clue-mark" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                    {clue.ask}
                  </button>
                  <div id={`ra-${scene.id}-${id}`} className="ra-found" hidden={!isOpen}>
                    {clue.found}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="ra-count">You have checked {looked.length} of {CLUE_IDS.length}.</p>
        </div>

        <h5 className="ra-q">{scene.question}</h5>
        <ul className="ra-choices">
          {scene.choices.map((c) => {
            const isPicked = chosen === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`ra-choice${isPicked ? ' is-picked' : ''}`}
                  aria-pressed={isPicked}
                  disabled={!!chosen && !isPicked}
                  onClick={() => choose(c.id)}
                >
                  {c.text}
                </button>
              </li>
            );
          })}
        </ul>

        <div aria-live="polite" className="ra-live">
          {picked && (
            <div className={`ra-feedback ra-fb-${picked.rating}`}>
              <p>
                <b>{RATING_LEAD[picked.rating]}</b> {picked.feedback}
              </p>
              {picked.rating !== 'best' && (
                <p>
                  <b>The strongest move:</b> {best.text}
                </p>
              )}
              <p className="ra-lesson">{scene.lesson}</p>
              {looked.length < 2 && <p className="ra-hint">You opened {looked.length === 0 ? 'no clues' : 'one clue'} first. Next time, try opening two or three. They are what the decision is built on.</p>}
              <div className="rl-buttons ra-actions">
                <button type="button" className="btn" onClick={next}>
                  {index + 1 >= SCENES.length ? 'See how you did' : 'Next scene'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="viz-cap">Every scene is made up. No real person, school, shop, website or news story is used.</p>
      </div>
    </Root>
  );
}
