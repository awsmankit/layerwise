import { useEffect } from 'react';
import { motion, MotionConfig, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';

/**
 * Hairline shapes behind the hero. They draw themselves in on load, then
 * float, and drift against the pointer at roughly 20-30% of its speed
 * (depth layers move by different amounts, which reads as parallax).
 */

type Shape = { d: string; color: string; layer: 0 | 1 | 2; float?: number };

const shapes: Shape[] = [
  { d: 'M 78 130 a 62 62 0 1 0 124 0 a 62 62 0 1 0 -124 0', color: '#E69A00', layer: 0, float: 9 },
  { d: 'M 1040 96 v 46 M 1017 119 h 46', color: '#E0306B', layer: 1, float: 7 },
  { d: 'M 50 650 q 25 -42 50 0 t 50 0 t 50 0 t 50 0', color: '#1E8FD6', layer: 2, float: 8 },
  { d: 'M 960 640 l 48 -84 l 48 84 z', color: '#6E9E00', layer: 1, float: 10 },
  { d: 'M 560 60 m -24 0 a 24 24 0 1 0 48 0 a 24 24 0 1 0 -48 0', color: '#0A9F85', layer: 2, float: 6 },
  { d: 'M 330 700 v 36 M 312 718 h 36', color: '#E69A00', layer: 2, float: 7 },
  { d: 'M 840 60 v 30 M 825 75 h 30', color: '#1E8FD6', layer: 0, float: 8 },
  { d: 'M 690 705 q 62 -96 160 -42', color: '#E0306B', layer: 0, float: 9 },
  { d: 'M 470 690 l 20 -24 l 20 24 l 20 -24 l 20 24', color: '#0A9F85', layer: 1, float: 7 },
  { d: 'M 214 330 l 9 22 l 22 9 l -22 9 l -9 22 l -9 -22 l -22 -9 l 22 -9 z', color: '#C23ED6', layer: 2, float: 10 },
];

const FACTORS = [-12, -22, -34]; // px of counter-motion per layer at the screen edge

export default function HeroArt() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 18 });
  const sy = useSpring(my, { stiffness: 50, damping: 18 });

  const l0x = useTransform(sx, (v) => v * FACTORS[0]);
  const l0y = useTransform(sy, (v) => v * FACTORS[0]);
  const l1x = useTransform(sx, (v) => v * FACTORS[1]);
  const l1y = useTransform(sy, (v) => v * FACTORS[1]);
  const l2x = useTransform(sx, (v) => v * FACTORS[2]);
  const l2y = useTransform(sy, (v) => v * FACTORS[2]);
  const layers = [
    { x: l0x, y: l0y },
    { x: l1x, y: l1y },
    { x: l2x, y: l2y },
  ];

  useEffect(() => {
    if (reduce) return;
    const move = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [reduce, mx, my]);

  return (
    <MotionConfig reducedMotion="user">
      <svg className="hero-art" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        {[0, 1, 2].map((layer) => (
          <motion.g key={layer} style={{ x: layers[layer].x, y: layers[layer].y }}>
            {shapes
              .map((s, i) => ({ s, i }))
              .filter(({ s }) => s.layer === layer)
              .map(({ s, i }) => (
                <motion.g key={i} animate={reduce ? undefined : { y: [0, -(s.float ?? 8), 0], rotate: [0, 2.5, 0] }} transition={{ duration: 7 + (i % 4) * 1.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}>
                  <motion.path
                    d={s.d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.8 }}
                    transition={{ duration: 1, delay: 0.25 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  />
                </motion.g>
              ))}
          </motion.g>
        ))}
        <circle cx="1100" cy="420" r="58" fill="none" stroke="#15123D" strokeOpacity="0.28" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
        <circle cx="150" cy="470" r="34" fill="none" stroke="#15123D" strokeOpacity="0.22" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
      </svg>
    </MotionConfig>
  );
}
