import { useEffect, useMemo, useState } from 'react';

const COLORS = ['#FFC233', '#FF4F8B', '#12C2A4', '#5BC0FF', '#9B5CFF', '#B6E43A', '#FF9F1C'];

/** Deterministic-enough pseudo random so SSR and client agree on the first render (nothing is drawn until fired). */
function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/**
 * A short burst of paper confetti. Increase `burst` to fire it. It removes
 * itself after a few seconds and is hidden entirely for reduced-motion users.
 */
export default function Confetti({ burst }: { burst: number }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (burst === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setActive(burst);
    const id = window.setTimeout(() => setActive(0), 3600);
    return () => window.clearTimeout(id);
  }, [burst]);

  const pieces = useMemo(
    () =>
      active === 0
        ? []
        : Array.from({ length: 56 }).map((_, i) => {
            const round = Math.random() < 0.3;
            const w = rand(7, 13);
            return {
              i,
              x: `${rand(5, 95)}%`,
              w: `${w}px`,
              h: `${round ? w : rand(10, 18)}px`,
              c: COLORS[i % COLORS.length],
              dx: `${rand(-120, 120)}px`,
              r: `${rand(-540, 540)}deg`,
              t: `${rand(1.8, 3)}s`,
              d: `${rand(0, 0.45)}s`,
              br: round ? '50%' : '2px',
            };
          }),
    [active],
  );

  if (active === 0) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <i
          key={p.i}
          style={{ '--x': p.x, '--w': p.w, '--h': p.h, '--c': p.c, '--dx': p.dx, '--r': p.r, '--t': p.t, '--d': p.d, '--br': p.br } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
