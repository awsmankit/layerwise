/*
 * Links to other websites open in a new tab; links within this site stay in
 * the same tab. Rather than adding target="_blank" to each external <a> (in .astro pages, MDX, React islands and anything rendered
 * later), one delegated click listener on the document decides at click time.
 */

/** The parts of a mouse event that say whether it was a plain left click. */
export interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** A left click with no modifier key held. Anything else is left to the browser. */
export function isPlainClick(e: ClickLike): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/**
 * Should a link with this raw `href` attribute, on the page at `pageUrl`, open
 * in a new tab? Only when it goes to an http(s) page on another website. Links
 * within this site, `javascript:`, `mailto:`, `tel:` and other non-web
 * schemes, and an empty href all stay in the same tab.
 */
export function opensInNewTab(href: string | null | undefined, pageUrl: string): boolean {
  const raw = (href ?? '').trim();
  if (!raw || raw.startsWith('#')) return false;
  try {
    const from = new URL(pageUrl);
    const to = new URL(raw, from);
    return (to.protocol === 'http:' || to.protocol === 'https:') && to.origin !== from.origin;
  } catch {
    return false;
  }
}

/**
 * Install the listener once per document. It runs in the capture phase, before
 * React's own handlers, and only marks the link: the browser's normal
 * navigation then opens the tab, so a handler that cancels the click still
 * wins and popup blockers treat it as the user's own click.
 *
 * Left alone: modifier or non-left clicks, links that already set `target`,
 * `download` links, and anything marked `data-same-tab`.
 */
export function installNewTabLinks(doc: Document = document): void {
  doc.addEventListener(
    'click',
    (e) => {
      if (e.defaultPrevented || !isPlainClick(e)) return;
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!a || a.hasAttribute('target') || a.hasAttribute('download') || a.closest('[data-same-tab]')) return;
      if (!opensInNewTab(a.getAttribute('href'), doc.location.href)) return;
      a.setAttribute('target', '_blank');
      const rel = new Set((a.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      a.setAttribute('rel', [...rel].join(' '));
    },
    true,
  );
}
