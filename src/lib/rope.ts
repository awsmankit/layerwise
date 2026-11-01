/**
 * Rotary position embedding (RoPE; Su et al., 2021, RoFormer) on a toy scale.
 *
 * A query or key vector of even length d is cut into d/2 pairs. Pair i is a point in the plane and is
 * rotated by the angle  position x theta_i,  with  theta_i = base^(-2i/d)  (the paper uses base 10000).
 * The dot product of a rotated query and a rotated key then depends only on the difference of the two
 * positions, not on either one.
 */

export type Vec = number[];

/** theta_i for the d/2 pairs of a d-dimensional head. */
export function frequencies(dim: number, base = 10000): number[] {
  const out: number[] = [];
  for (let i = 0; i < dim / 2; i++) out.push(Math.pow(base, (-2 * i) / dim));
  return out;
}

/** Rotate every consecutive pair of v by position x theta_i x stretch. `stretch` below 1 squeezes positions (interpolation). */
export function rotate(v: Vec, position: number, base = 10000, stretch = 1): Vec {
  const th = frequencies(v.length, base);
  const out: Vec = [];
  for (let i = 0; i < v.length / 2; i++) {
    const a = position * stretch * th[i];
    const c = Math.cos(a);
    const s = Math.sin(a);
    out.push(v[2 * i] * c - v[2 * i + 1] * s, v[2 * i] * s + v[2 * i + 1] * c);
  }
  return out;
}

export const dot = (a: Vec, b: Vec) => a.reduce((s, x, i) => s + x * b[i], 0);

/** The attention score q . k after rotating q for position m and k for position n. */
export function ropeScore(q: Vec, k: Vec, m: number, n: number, base = 10000, stretch = 1): number {
  return dot(rotate(q, m, base, stretch), rotate(k, n, base, stretch));
}

/** Per-pair angle of a hand at a position: its starting angle plus position x theta_i x stretch (radians). */
export function pairAngles(v: Vec, position: number, base = 10000, stretch = 1): number[] {
  const th = frequencies(v.length, base);
  const out: number[] = [];
  for (let i = 0; i < v.length / 2; i++) out.push(Math.atan2(v[2 * i + 1], v[2 * i]) + position * stretch * th[i]);
  return out;
}

/** Score as a function of the distance m - n (the key sits `distance` tokens before the query). */
export function scoreByDistance(q: Vec, k: Vec, maxDistance: number, base = 10000, stretch = 1): number[] {
  const out: number[] = [];
  for (let d = 0; d <= maxDistance; d++) out.push(ropeScore(q, k, d, 0, base, stretch));
  return out;
}

/** The toy query and key used by the figure: four pairs, so four clock faces. */
export const TOY_Q: Vec = [1, 0, 1, 0, 1, 0, 1, 0];
export const TOY_K: Vec = [0.9, 0.3, 0.9, 0.3, 0.9, 0.3, 0.9, 0.3];
