/**
 * Page-side wiring for offline mode: registers the service worker, links the manifest, and shows
 * three small, calm things: a one-off "works offline" note, a status line while the connection is
 * down, and (rarely) an install hint. Everything is stored only in this browser (PWA_KEY).
 * The decisions live in pwa.ts, where they are tested.
 */
import { PWA_KEY, hintPage, humanisePath, installHintDue, recordVisit, savedPagePaths, shouldRegister, titleFromHtml, type PwaState } from './pwa';

export type PwaConfig = { sw: string; scope: string; manifest: string; icon: string; offline: string; base: string; dev: boolean };

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

function readState(): PwaState {
  try {
    const v = JSON.parse(localStorage.getItem(PWA_KEY) || '{}');
    return v && typeof v === 'object' ? (v as PwaState) : {};
  } catch {
    return {};
  }
}

function writeState(patch: Partial<PwaState> | ((s: PwaState) => PwaState)): PwaState {
  const next = typeof patch === 'function' ? patch(readState()) : { ...readState(), ...patch };
  try {
    localStorage.setItem(PWA_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: nothing is remembered, nothing breaks */
  }
  return next;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function icon(path: string): SVGElement {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', '0 0 20 20');
  s.setAttribute('width', '20');
  s.setAttribute('height', '20');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.7');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', path);
  s.appendChild(p);
  return s;
}
const ICON_OFFLINE = 'M3 3l14 14M7.5 7.5A9 9 0 0 0 2.5 10M17.5 10a9 9 0 0 0-3-2M6 13a6 6 0 0 1 3-1.7M14 13a6 6 0 0 0-1.3-1M10 16.5h.01';
const ICON_SAVED = 'M4 10.5l4 4 8-9';
const ICON_INSTALL = 'M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 15.5h12';

type Action = { label: string; run: () => void; quiet?: boolean };

function makeCard(stack: HTMLElement, kind: string, glyph: string, text: Node[], actions: Action[], closer?: () => void): HTMLElement {
  const card = document.createElement('div');
  card.className = `pw-card pw-card-${kind}`;
  card.appendChild(icon(glyph)).classList.add('pw-glyph');
  const body = document.createElement('p');
  body.className = 'pw-text';
  text.forEach((n) => body.appendChild(n));
  card.appendChild(body);
  if (actions.length) {
    const row = document.createElement('div');
    row.className = 'pw-actions';
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = a.quiet ? 'pw-btn pw-btn-quiet' : 'pw-btn';
      b.textContent = a.label;
      b.addEventListener('click', a.run);
      row.appendChild(b);
    }
    card.appendChild(row);
  }
  if (closer) {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'pw-close';
    x.setAttribute('aria-label', 'Close this note');
    x.appendChild(icon('M5 5l10 10M15 5L5 15'));
    x.addEventListener('click', closer);
    card.appendChild(x);
  }
  stack.appendChild(card);
  return card;
}

const t = (s: string) => document.createTextNode(s);

/** Link the manifest and the home-screen icon (the layout's head has no slot for them). */
function linkHead(cfg: PwaConfig) {
  const add = (rel: string, href: string) => {
    if (document.head.querySelector(`link[rel="${rel}"]`)) return;
    const l = document.createElement('link');
    l.rel = rel;
    l.href = href;
    document.head.appendChild(l);
  };
  add('manifest', cfg.manifest);
  add('apple-touch-icon', cfg.icon);
}

function standalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function initPwa(root: HTMLElement, cfg: PwaConfig): void {
  const stack = root.querySelector<HTMLElement>('.pw-stack');
  if (!stack) return;
  const supported = 'serviceWorker' in navigator;
  const devOptIn = (() => {
    try {
      return localStorage.getItem('layerwise:pwa-dev') === '1';
    } catch {
      return false;
    }
  })();
  const register = shouldRegister({ prod: !cfg.dev, devOptIn, secure: window.isSecureContext, supported });

  /* a status line while the connection is down: works with or without the worker */
  let banner: HTMLElement | null = null;
  const syncBanner = () => {
    // the offline page says all this itself, and is also shown in place of pages that were not saved
    const off = navigator.onLine === false && !document.getElementById('pw-offline');
    if (off && !banner) {
      const link = document.createElement('a');
      link.href = cfg.offline;
      link.textContent = 'See what is saved';
      banner = makeCard(stack, 'offline', ICON_OFFLINE, [t('You are offline. Pages you have already opened still work. '), link], []);
    } else if (!off && banner) {
      banner.remove();
      banner = null;
    }
  };
  window.addEventListener('online', syncBanner);
  window.addEventListener('offline', syncBanner);
  syncBanner();

  if (!register) {
    // in development, drop a worker left from an earlier opt-in, so edits are never held back
    if (cfg.dev && supported) navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    return;
  }

  linkHead(cfg);
  writeState((s) => recordVisit(s, Date.now()));

  const start = () => {
    navigator.serviceWorker
      .register(cfg.sw, { scope: cfg.scope, updateViaCache: 'none' })
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        if (readState().noted) return;
        writeState({ noted: true });
        const link = document.createElement('a');
        link.href = cfg.offline;
        link.textContent = 'Saved pages';
        let card: HTMLElement | null = null;
        const close = () => card?.remove();
        card = makeCard(stack, 'saved', ICON_SAVED, [t('Layerwise now works offline. Pages you open are kept on this device. '), link], [], close);
        window.setTimeout(() => {
          if (card && !card.contains(document.activeElement)) close();
        }, 14000);
      })
      .catch(() => {
        /* no worker, no offline mode: the site itself carries on as usual */
      });
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });

  /* the install hint: rare, calm, and easy to refuse */
  let deferred: InstallPrompt | null = null;
  let hint: HTMLElement | null = null;
  const dismiss = () => {
    writeState({ dismissedAt: Date.now() });
    hint?.remove();
    hint = null;
  };
  const maybeHint = () => {
    if (hint || !hintPage(location.pathname, cfg.base)) return;
    const ios = isIos();
    if (!installHintDue(readState(), Date.now(), { standalone: standalone(), canPrompt: !!deferred, ios: ios && !deferred })) return;
    writeState({ shownAt: Date.now() });
    if (deferred) {
      hint = makeCard(
        stack,
        'install',
        ICON_INSTALL,
        [t('Install Layerwise on this device. It opens like an app and keeps the pages you have visited.')],
        [
          {
            label: 'Install',
            run: async () => {
              const ev = deferred;
              deferred = null;
              if (!ev) return;
              try {
                await ev.prompt();
                const choice = await ev.userChoice;
                if (choice.outcome === 'accepted') writeState({ installed: true });
                else writeState({ dismissedAt: Date.now() });
              } catch {
                /* the browser declined to prompt */
              }
              hint?.remove();
              hint = null;
            },
          },
          { label: 'Not now', run: dismiss, quiet: true },
        ],
      );
    } else {
      hint = makeCard(stack, 'install', ICON_INSTALL, [t('To keep Layerwise on this device: tap the Share button, then Add to Home Screen.')], [{ label: 'Got it', run: dismiss }], dismiss);
    }
  };
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    window.setTimeout(maybeHint, 8000);
  });
  if (isIos()) window.setTimeout(maybeHint, 8000);
  window.addEventListener('appinstalled', () => {
    writeState({ installed: true });
    hint?.remove();
    hint = null;
  });
}

/* ---------- the offline page ---------- */

const OURS = 'layerwise-';

async function ourPageCaches(): Promise<Cache[]> {
  const names = (await caches.keys()).filter((n) => n.startsWith(OURS) && n.endsWith('-pages'));
  return Promise.all(names.map((n) => caches.open(n)));
}

/** Fill in the list of saved pages and wire the clear button. */
export function initOfflinePage(root: HTMLElement, cfg: Pick<PwaConfig, 'base'>): void {
  const list = root.querySelector<HTMLElement>('[data-pw-list]');
  const count = root.querySelector<HTMLElement>('[data-pw-count]');
  const clear = root.querySelector<HTMLButtonElement>('[data-pw-clear]');
  const status = root.querySelector<HTMLElement>('[data-pw-status]');
  const retry = root.querySelector<HTMLButtonElement>('[data-pw-retry]');
  retry?.addEventListener('click', () => location.reload());
  if (!list || !count || !('caches' in window)) {
    if (count) count.textContent = 'This browser does not keep pages for offline use.';
    clear?.setAttribute('hidden', '');
    return;
  }
  const render = async () => {
    list.textContent = '';
    const urls: string[] = [];
    const stores = await ourPageCaches();
    for (const c of stores) urls.push(...(await c.keys()).map((r) => r.url));
    const paths = savedPagePaths(urls, cfg.base);
    count.textContent = paths.length === 0 ? 'Nothing else is saved yet. Pages you open while online are kept here.' : `${paths.length} ${paths.length === 1 ? 'page' : 'pages'} saved on this device, newest first.`;
    clear?.toggleAttribute('hidden', urls.length === 0);
    for (const p of paths.slice(0, 40)) {
      let label = humanisePath(p, cfg.base);
      for (const c of stores) {
        const hit = await c.match(location.origin + p);
        if (hit) {
          label = titleFromHtml((await hit.text()).slice(0, 4000)) ?? label;
          break;
        }
      }
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = p;
      a.textContent = label;
      li.appendChild(a);
      list.appendChild(li);
    }
  };
  render().catch(() => {
    count.textContent = 'Saved pages could not be listed.';
  });
  clear?.addEventListener('click', async () => {
    if (!window.confirm('Remove the pages saved on this device? They will be saved again as you visit them.')) return;
    const names = (await caches.keys()).filter((n) => n.startsWith(OURS));
    await Promise.all(names.map((n) => caches.delete(n)));
    // the worker stores the install pages again if it can
    navigator.serviceWorker?.controller?.postMessage({ type: 'precache' });
    if (status) status.textContent = 'Saved pages removed.';
    window.setTimeout(() => render().catch(() => {}), 1500);
  });
}
