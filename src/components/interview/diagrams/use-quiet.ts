import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { COMFORT_EVENT, isCalm } from '../../../lib/comfort';

/** True when the reader asked for less motion, through the device or the site's calm mode. */
export function useQuiet(): boolean {
  const device = useReducedMotion();
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const sync = () => setCalm(isCalm());
    sync();
    window.addEventListener(COMFORT_EVENT, sync);
    return () => window.removeEventListener(COMFORT_EVENT, sync);
  }, []);
  return Boolean(device) || calm;
}

/** The standard "fade up as it scrolls into view" props, staggered by index. */
export const reveal = (i: number, quiet = false) => ({
  initial: { opacity: 0, y: quiet ? 0 : 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.4, delay: quiet ? 0 : Math.min(i, 8) * 0.07, ease: [0.22, 1, 0.36, 1] as const },
});
