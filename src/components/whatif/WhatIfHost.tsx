import { lazy, Suspense, useMemo, type ComponentType } from 'react';

/**
 * Loads one experiment's demo by slug. The demos are discovered from this folder, and each is a separate
 * chunk, so a page only downloads the demo it shows. (Astro cannot hydrate a component chosen by name at
 * build time, so this one island does the choosing.)
 */
const loaders = import.meta.glob<{ default: ComponentType }>('./*.tsx');

function demoFor(slug: string): ComponentType | null {
  const key = `./${slug}.tsx`;
  if (!loaders[key] || slug === 'WhatIfFrame' || slug === 'WhatIfHost') return null;
  return lazy(loaders[key]);
}

export default function WhatIfHost({ slug }: { slug: string }) {
  // not cached at module level: in development a cached component would keep serving an old version after an edit
  const Demo = useMemo(() => demoFor(slug), [slug]);
  if (!Demo) return <p>This experiment is not available.</p>;
  return (
    <Suspense fallback={<div className="viz wi" style={{ minHeight: 280 }}>Loading the experiment…</div>}>
      <Demo />
    </Suspense>
  );
}
