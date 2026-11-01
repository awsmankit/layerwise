import { extractBlocks, type Block, type ReadNode } from './read-aloud';

/** Elements whose insides can never be prose: do not even convert them. */
const OPAQUE = new Set(['svg', 'pre', 'script', 'style', 'canvas', 'astro-island', 'math', 'template', 'noscript']);

function hiddenFor(el: Element): boolean {
  if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return true;
  // closed <details> hides everything but its summary
  const parent = el.parentElement;
  if (parent && parent.tagName === 'DETAILS' && !parent.hasAttribute('open') && el.tagName !== 'SUMMARY') return true;
  return false;
}

/** Mirror a real element as a ReadNode, keeping the element as `ref` so it can be highlighted. */
export function toReadNode(el: Element): ReadNode<Element> {
  const tag = el.tagName.toLowerCase();
  const node: ReadNode<Element> = { tag, classes: Array.from(el.classList), hidden: hiddenFor(el), ref: el };
  if (OPAQUE.has(tag)) return node;
  const children: ReadNode<Element>[] = [];
  el.childNodes.forEach((c) => {
    if (c.nodeType === 3) children.push({ tag: '#text', text: c.textContent ?? '' });
    else if (c.nodeType === 1) children.push(toReadNode(c as Element));
  });
  node.children = children;
  return node;
}

/** The blocks of a lesson's prose, with the elements to highlight. */
export function blocksOf(root: Element, essentials: boolean): Block<Element>[] {
  return extractBlocks<Element>(toReadNode(root), { essentials });
}
