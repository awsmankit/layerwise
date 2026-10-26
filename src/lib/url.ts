/**
 * Prefix an absolute site path with the configured base (needed on GitHub
 * Pages project sites, which live under /<repo>/). Works in .astro files and
 * in React islands because both see import.meta.env.BASE_URL.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!path.startsWith('/')) return path;
  return `${base}${path}`;
}
