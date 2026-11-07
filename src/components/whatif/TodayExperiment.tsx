import { useEffect, useMemo, useState } from 'react';
import WhatIfHost from './WhatIfHost';
import { dayIndexOf, shuffled } from '../../lib/daily-card';
import { withBase } from '../../lib/url';

type Item = { slug: string; title: string; blurb: string };

/**
 * The landing page's "new every day" figure: one of the What if…? experiments, chosen by the date, running live.
 * The server draws the experiment for the build day; the visitor's own date takes over once the page is open.
 */
export default function TodayExperiment({ items, buildDay }: { items: Item[]; buildDay: number }) {
  const [day, setDay] = useState(buildDay);
  useEffect(() => {
    const n = new Date();
    setDay(dayIndexOf(n.getFullYear(), n.getMonth() + 1, n.getDate()));
  }, []);
  const order = useMemo(() => shuffled(items, (i) => i.slug), [items]);
  const item = order[((day % order.length) + order.length) % order.length];
  if (!item) return null;
  return (
    <div className="lp-today">
      <div className="lp-today-head">
        <p className="lp-today-tag">New every day</p>
        <h2 id="today-h">Today: {item.title}</h2>
        <p>{item.blurb}</p>
      </div>
      <WhatIfHost key={item.slug} slug={item.slug} />
      <p className="lp-today-links">
        <a className="btn" href={withBase(`/whatif/${item.slug}/`)}>Guess first, then try it</a>
        <a className="btn quiet" href={withBase('/whatif/')}>All experiments</a>
        <a className="btn quiet" href={withBase('/share/')}>Share today’s card</a>
      </p>
    </div>
  );
}
