import { useStore, KEYS } from '../../lib/store';
import { withBase } from '../../lib/url';

export type LastLesson = { href: string; title: string };

/** "Pick up where you left off", from the last lesson this browser opened. */
export default function ContinueCard() {
  const [last] = useStore<LastLesson | null>(KEYS.last, null);
  // An empty fragment, not null: the server render always has no saved lesson, and
  // Astro only recognises a React island by the element it returns. With null it
  // falls back to calling this as a plain function, and useStore logs "Invalid hook call".
  if (!last) return <></>;
  return (
    <a className="continue" href={withBase(last.href)}>
      <span className="continue-dot" aria-hidden="true" />
      <span>
        <small>Continue where you left off</small>
        <b>{last.title}</b>
      </span>
    </a>
  );
}
