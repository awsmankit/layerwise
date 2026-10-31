import { getLessons, lessonPath, slugOf } from './content';
import { withBase } from './url';

/**
 * Looks lessons up by `track/slug` key for the teacher pages. A missing key stops a production
 * build, so plans cannot go stale; in development it is shown as plain text instead, so one
 * lesson that is still being written does not hide the whole page.
 */
export async function lessonLookup() {
  const all = await getLessons();
  const byKey = Object.fromEntries(all.map((l) => [`${l.data.track}/${slugOf(l)}`, l]));
  const link = (key: string): { title: string; href?: string } => {
    const l = byKey[key];
    if (l) return { title: l.data.title, href: withBase(lessonPath(l)) };
    if (import.meta.env.DEV) return { title: `${key} (not published yet)` };
    throw new Error(`Teacher page refers to a missing lesson: ${key}`);
  };
  return { link };
}

/** The plain, unlinked cut-out text for a card: "Label: text" becomes bold label plus text. */
export function splitLabel(s: string): { label?: string; text: string } {
  const m = /^([A-Z0-9][A-Z0-9 .]{1,20}):\s+(.*)$/.exec(s);
  return m ? { label: m[1], text: m[2] } : { text: s };
}
