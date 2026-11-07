import { useEffect, useState } from 'react';
import '../../styles/w6-hero.css';
import HeroFlow from './HeroFlow';
import HeroScenes from './HeroScenes';
import { dayIndexOf } from '../../lib/daily-card';
import { HERO_SCENES, isStaged, pickScene } from '../../lib/hero-scenes';

/**
 * The home page's top figure, a different one each day. The first render uses the day the page was built, so the server
 * and the browser print the same thing; then the visitor's own calendar day takes over. While developing, `?scene=<id>`
 * shows any scene (production ignores it).
 */
export default function HeroDaily({ buildDay }: { buildDay: number }) {
  const [day, setDay] = useState(buildDay);
  const [forced, setForced] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    setDay(dayIndexOf(now.getFullYear(), now.getMonth() + 1, now.getDate()));
    if (import.meta.env.DEV) {
      const id = new URLSearchParams(window.location.search).get('scene');
      if (id && HERO_SCENES.some((s) => s.id === id)) setForced(id);
    }
  }, []);

  const scene = (forced && HERO_SCENES.find((s) => s.id === forced)) || pickScene(day, HERO_SCENES);

  return (
    <div className="hs-daily">
      <span className="hs-tag" title="The figure changes every day">
        New figure every day
      </span>
      {isStaged(scene) ? <HeroScenes key={scene.id} scene={scene} /> : <HeroFlow key={scene.id} />}
    </div>
  );
}
