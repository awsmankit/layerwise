/**
 * Short dates for React islands. toLocaleDateString is not used here because browsers
 * disagree on short month names (Safari writes "Sep", Chrome, Firefox and Node "Sept"),
 * and a server-rendered date that differs from the browser's breaks hydration.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2025-09-14" or a full ISO timestamp, read in UTC. */
function parts(iso: string): { y: number; m: number; d: number } {
  const t = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
}

/** "Sep 2025" */
export function monthYear(iso: string): string {
  const { y, m } = parts(iso);
  return `${MONTHS[m]} ${y}`;
}

/** "14 Sep 2025" */
export function shortDay(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${d} ${MONTHS[m]} ${y}`;
}
