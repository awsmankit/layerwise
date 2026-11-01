import { useMemo, useState } from 'react';
import { Root } from './shared';
import { GROUPS, INTERESTS, ROLES, SKILLS, matchRoles, roleById, sharedSkills, type InterestId } from '../../lib/ai-jobs';

/*
 * "Explore a job" deck for start/ai-and-careers. Tap interests to see which roles fit, tap a role for its card,
 * save the ones you like and see which skills they share. Content and sources live in lib/ai-jobs.ts.
 */

const INTEREST_IDS = Object.keys(INTERESTS) as InterestId[];

export default function AiJobDeck() {
  const [interests, setInterests] = useState<InterestId[]>([]);
  const [openId, setOpenId] = useState<string>(ROLES[0].id);
  const [saved, setSaved] = useState<string[]>([]);

  const matches = useMemo(() => matchRoles(interests), [interests]);
  const hitMap = useMemo(() => new Map(matches.map((m) => [m.role.id, m.hits])), [matches]);
  const role = roleById(openId) ?? ROLES[0];
  const isSaved = saved.includes(role.id);
  const shared = useMemo(() => sharedSkills(saved), [saved]);

  const toggleInterest = (i: InterestId) =>
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));
  const toggleSaved = (id: string) => setSaved((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <Root>
      <div className="viz w5b-deck">
        <p className="viz-title">Explore a job</p>
        <p className="w5b-note">
          {ROLES.length} short cards, written for this lesson and checked against the sources on each card on 1 November 2026. They are a way to look around, not careers advice.
        </p>

        <div className="w5b-group" role="group" aria-label="Things I like">
          <span className="w5b-label">I like</span>
          <div className="w5b-row">
            {INTEREST_IDS.map((i) => (
              <button key={i} type="button" className="btn quiet" aria-pressed={interests.includes(i)} onClick={() => toggleInterest(i)}>
                {INTERESTS[i]}
              </button>
            ))}
          </div>
          <p className="w5b-small" role="status" aria-live="polite">
            {interests.length === 0
              ? 'Pick any you like and the matching jobs light up. Pick none to see them all.'
              : `${matches.length} of ${ROLES.length} jobs match. The strongest matches come first.`}
          </p>
        </div>

        <div className="w5b-group" role="group" aria-label="Jobs">
          <span className="w5b-label">Jobs</span>
          <div className="w5b-row">
            {(interests.length ? matches.map((m) => m.role) : ROLES).map((r) => (
              <button
                key={r.id}
                type="button"
                className={`btn quiet w5b-role w5b-g-${r.group}`}
                aria-pressed={openId === r.id}
                aria-label={`${r.name}, ${GROUPS[r.group].label.toLowerCase()}${saved.includes(r.id) ? ', saved' : ''}`}
                onClick={() => setOpenId(r.id)}
              >
                <span className="w5b-role-name">{r.name}</span>
                {saved.includes(r.id) && <span className="w5b-tick" aria-hidden="true">saved</span>}
              </button>
            ))}
          </div>
        </div>

        <p className="w5b-sr" role="status" aria-live="polite">
          Showing the card for {role.name}.
        </p>
        <article className="w5b-card" aria-labelledby="w5b-card-title">
          <p className={`w5b-badge w5b-g-${role.group}`}>
            {GROUPS[role.group].label}
            <span className="w5b-badge-sub">{GROUPS[role.group].blurb}</span>
          </p>
          <h3 id="w5b-card-title" className="w5b-card-title">
            {role.name}
          </h3>
          {interests.length > 0 && (hitMap.get(role.id) ?? 0) === 0 && (
            <p className="w5b-small">This job does not match the interests you picked, but you can still read it.</p>
          )}
          <dl className="w5b-dl">
            <div>
              <dt>What they do all day</dt>
              <dd>{role.day}</dd>
            </div>
            <div>
              <dt>Skills that help</dt>
              <dd>
                <ul className="w5b-skills">
                  {role.skills.map((s) => (
                    <li key={s}>{SKILLS[s]}</li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt>How to start</dt>
              <dd>
                {role.start}
                {role.lesson && (
                  <>
                    {' '}
                    <a href={role.lesson.href}>{role.lesson.label}</a>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>What we checked</dt>
              <dd>
                {role.checked}
                <span className="w5b-src">
                  {role.sources.map((s) => (
                    <a key={s.url} href={s.url} rel="noopener noreferrer">
                      {s.label}
                    </a>
                  ))}
                </span>
              </dd>
            </div>
          </dl>
          <button type="button" className="btn" aria-pressed={isSaved} onClick={() => toggleSaved(role.id)}>
            {isSaved ? 'Remove from my list' : 'Save to my list'}
          </button>
        </article>

        <div className="w5b-mine" role="status" aria-live="polite">
          <span className="w5b-label">My list</span>
          {saved.length === 0 ? (
            <p>Save two or more jobs to see which skills they share.</p>
          ) : (
            <>
              <p>
                <b>{saved.length}</b> saved: {saved.map((id) => roleById(id)?.name).join(', ')}.
              </p>
              {shared.length > 0 ? (
                <p>
                  Skills they share: {shared.map((s) => `${SKILLS[s.skill]} (${s.count} of ${saved.length})`).join(', ')}.
                </p>
              ) : saved.length > 1 ? (
                <p>These jobs share no skills on the cards. Try saving a different mix.</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Root>
  );
}
