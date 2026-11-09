/**
 * Build-time maths for lessons. Sätteri (Astro's default Markdown/MDX processor) parses `$$...$$` into
 * `math` (display) and `inlineMath` nodes; this plugin turns each one into KaTeX HTML while the site is
 * built, so a reader's browser gets finished markup and runs no maths JavaScript.
 *
 * Only the double-dollar form is enabled (see astro.config.mjs): a single $ stays a plain character, so
 * prices such as "$5 and $10" in the cost lessons are never read as a formula.
 *
 * Plain .mjs (not .ts) because astro.config.mjs imports it before any TypeScript tooling runs.
 */
import katex from 'katex';

/** Render one formula to an HTML string. A bad formula is a build error, never a silent blank. */
export function renderMath(tex, display) {
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: true,
    strict: 'error',
    output: 'htmlAndMathml', // MathML is what screen readers read; the HTML is what sighted readers see
    trust: false,
  });
}

/** The Sätteri mdast plugin. A display equation sits in its own box so a wide one scrolls inside it, not the page. */
export const katexPlugin = {
  name: 'layerwise-katex',
  math(node) {
    return { raw: `<div class="math-block" tabindex="0" role="group" aria-label="Equation">${renderMath(node.value, true)}</div>`, mdxExpressions: false };
  },
  inlineMath(node) {
    return { raw: renderMath(node.value, false), mdxExpressions: false };
  },
};
