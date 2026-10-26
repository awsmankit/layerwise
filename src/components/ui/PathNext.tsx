import { useStore, KEYS } from '../../lib/store';
import { withBase } from '../../lib/url';
import { paths, type PathId } from '../../data/paths';

export type LessonIndex = Record<string, { title: string; href: string }>;

/**
 * Keeps a learner on the path they chose. Shown on lesson pages when the
 * saved path includes this lesson: "step n of m", and the next step, which
 * may be a game. Shows nothing if no path is saved or the lesson is not on it.
 */
export default function PathNext({ current, lessons }: { current: string; lessons: LessonIndex }) {
  const [saved] = useStore<PathId | null>(KEYS.path, null);
  if (!saved || !paths[saved]) return null;
  const path = paths[saved];
  const i = path.steps.findIndex((s) => s.kind === 'lesson' && s.key === current);
  if (i < 0) return null;

  const next = path.steps[i + 1];
  const following = path.next ? paths[path.next] : null;

  let nextTitle: string;
  let nextHref: string;
  let nextNote = '';
  if (next) {
    if (next.kind === 'lesson') {
      nextTitle = lessons[next.key]?.title ?? next.key;
      nextHref = lessons[next.key]?.href ?? '/learn/';
    } else {
      nextTitle = next.label;
      nextHref = next.href;
      nextNote = next.note;
    }
  } else if (following) {
    nextTitle = `Continue with “${following.title}”`;
    nextHref = `/start/#${following.id}`;
    nextNote = 'You have finished this path.';
  } else {
    nextTitle = 'Choose your next path';
    nextHref = '/start/';
    nextNote = 'You have finished this path.';
  }

  return (
    <aside className="path-next" style={{ '--c': path.color, '--on': path.on } as React.CSSProperties} aria-label="Your learning path">
      <p className="path-next-where">
        <a href={withBase(`/start/#${path.id}`)}>{path.title}</a>
        <span className="num">
          {' '}
          · step {i + 1} of {path.steps.length}
        </span>
      </p>
      <span className="path-next-bar" aria-hidden="true">
        {path.steps.map((_, k) => (
          <i key={k} className={k < i ? 'past' : k === i ? 'now' : ''} />
        ))}
      </span>
      <a className="path-next-go" href={withBase(nextHref)}>
        <small>{next ? 'Next in your path' : nextNote}</small>
        <b>{nextTitle}</b>
        {nextNote && next ? <small>{nextNote}</small> : null}
      </a>
    </aside>
  );
}
