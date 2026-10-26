import {
  Branches,
  Cabinet,
  Dish,
  Exploded,
  Hub,
  Keyboard,
  Laptop,
  Loupe,
  Padlock,
  Patch,
  Phone,
  Plot,
  Plug,
  Query,
  Router,
  Sieve,
  Slow,
  Stack,
  Terminal,
  Terrain,
} from '@lucasmarkes/hairline/react';

/**
 * Isometric line figures from @lucasmarkes/hairline (MIT). Each one answers
 * the pointer. Only the figures used on the site are imported, so the rest
 * are tree-shaken out of the bundle.
 *
 * The library draws filled plates, so --hairline-plate must match whatever
 * the figure sits on. The `tone` prop sets all six theme variables for the
 * two backgrounds this site uses (see .hf in playful.css).
 */
const figures = {
  branches: Branches,
  cabinet: Cabinet,
  dish: Dish,
  exploded: Exploded,
  hub: Hub,
  keyboard: Keyboard,
  laptop: Laptop,
  loupe: Loupe,
  padlock: Padlock,
  patch: Patch,
  phone: Phone,
  plot: Plot,
  plug: Plug,
  query: Query,
  router: Router,
  sieve: Sieve,
  slow: Slow,
  stack: Stack,
  terminal: Terminal,
  terrain: Terrain,
} as const;

export type FigureName = keyof typeof figures;

export default function HairFigure({
  name,
  tone = 'paper',
  intensity = 0.6,
  play = false,
  label,
}: {
  name: FigureName;
  /** "paper" for surfaces, "track" for the coloured lesson header. */
  tone?: 'paper' | 'track';
  intensity?: number;
  play?: boolean;
  label?: string;
}) {
  const Figure = figures[name] ?? Hub;
  return (
    <div className={`hf on-${tone}`}>
      <Figure intensity={intensity} play={play} label={label} />
    </div>
  );
}
