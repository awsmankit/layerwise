import { motion } from 'motion/react';
import { EASE } from './shared';

/**
 * Hairline glyphs for diagram nodes. Each one is a few strokes on a 24 by 24
 * grid, drawn in the current colour, so a stage or a box can show what it is
 * at a glance instead of relying on its label alone.
 */
const G = {
  doc: ['M6 3h8l4 4v14H6z', 'M14 3v4h4', 'M9 11h6', 'M9 14h6', 'M9 17h4'],
  filter: ['M4 5h16l-6 7v6l-4 2v-8z'],
  scissors: ['M6 6a2.5 2.5 0 1 0 0 .01', 'M6 18a2.5 2.5 0 1 0 0 .01', 'M8 7.5 20 17', 'M8 16.5 20 7'],
  vector: ['M4 20 20 4', 'M14 4h6v6', 'M4 14l2 0', 'M9 18l0 2', 'M5 9l1 1'],
  database: ['M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z', 'M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6', 'M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3'],
  question: ['M4 5h16v11H11l-4 4v-4H4z', 'M10 8.5a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.4', 'M12 13.6v.01'],
  search: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 1 0 0-13z', 'M15.5 15.5 20 20'],
  rank: ['M5 20V9', 'M10 20V5', 'M15 20v-8', 'M20 20v-4', 'M3 20h19'],
  layers: ['M12 3 3 8l9 5 9-5z', 'M3 12.5l9 5 9-5', 'M3 17l9 5 9-5'],
  pen: ['M4 20l1-4L16 5l3 3L8 19z', 'M14 7l3 3', 'M4 20h7'],
  chip: ['M7 7h10v10H7z', 'M10 10h4v4h-4z', 'M9 3v4', 'M15 3v4', 'M9 17v4', 'M15 17v4', 'M3 9h4', 'M3 15h4', 'M17 9h4', 'M17 15h4'],
  memory: ['M3 7h18v10H3z', 'M6 10h2v4H6z', 'M11 10h2v4h-2z', 'M16 10h2v4h-2z', 'M6 17v3', 'M12 17v3', 'M18 17v3'],
  network: ['M12 4a2 2 0 1 0 0 .01', 'M5 18a2 2 0 1 0 0 .01', 'M19 18a2 2 0 1 0 0 .01', 'M11 6 6 16.5', 'M13 6l5 10.5', 'M7 18h10'],
  user: ['M12 4a4 4 0 1 0 0 8 4 4 0 1 0 0-8z', 'M4 21c1-4 4-6 8-6s7 2 8 6'],
  shield: ['M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6z', 'M9 12l2 2 4-4'],
  gateway: ['M4 21V9l8-5 8 5v12', 'M9 21v-7h6v7', 'M4 21h16'],
  wrench: ['M15 4a4 4 0 0 0-4.6 5.4L4 15.8 6.2 18l6.4-6.4A4 4 0 0 0 18 7l-2.5 2.5-2-.5-.5-2z'],
  check: ['M5 4h14v17H5z', 'M8 9l1.5 1.5L12 8', 'M8 15l1.5 1.5L12 14', 'M14 9.5h2', 'M14 15.5h2'],
  chart: ['M4 4v16h16', 'M7 15l4-5 3 3 5-7'],
  queue: ['M4 5h16v4H4z', 'M4 11h16v4H4z', 'M4 17h16v3H4z'],
  cloud: ['M7 18a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6-1.5A4 4 0 0 1 17 18z'],
  coin: ['M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z', 'M14.5 9c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5', 'M12 6v1.5', 'M12 16.5V18'],
  clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z', 'M12 7v5l3 2'],
  loop: ['M20 12a8 8 0 1 1-2.3-5.7', 'M20 4v4h-4'],
  server: ['M4 4h16v6H4z', 'M4 14h16v6H4z', 'M7 7h.01', 'M7 17h.01', 'M11 7h6', 'M11 17h6'],
  table: ['M3 5h18v14H3z', 'M3 10h18', 'M3 15h18', 'M9 5v14', 'M15 5v14'],
  tag: ['M3 12V4h8l10 10-8 8z', 'M7.5 8a.5.5 0 1 0 0 .01'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z'],
  bell: ['M3 19h18', 'M4 19c3 0 4-13 8-13s5 13 8 13'],
  bolt: ['M13 3 5 14h6l-1 7 8-11h-6z'],
  route: ['M6 4a2 2 0 1 0 0 .01', 'M18 20a2 2 0 1 0 0 .01', 'M6 6v5a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v1'],
  lock: ['M6 11h12v10H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
  box: ['M12 3 4 7v10l8 4 8-4V7z', 'M4 7l8 4 8-4', 'M12 11v10'],
  thumb: ['M7 11v9H4v-9z', 'M7 11l4-7c1.5 0 2.5 1 2 3l-1 3h6a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7'],
  screen: ['M3 4h18v12H3z', 'M8 20h8', 'M12 16v4', 'M6 8h8', 'M6 11h5'],
  flag: ['M5 21V4', 'M5 4h12l-2 4 2 4H5'],
  image: ['M3 5h18v14H3z', 'M3 16l5-5 4 4 3-3 6 6', 'M15.5 8.5a1 1 0 1 0 0 .01'],
  compress: ['M4 9h16', 'M4 15h16', 'M12 3v4', 'M9 5l3 3 3-3', 'M12 21v-4', 'M9 19l3-3 3 3'],
  target: ['M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z', 'M12 7a5 5 0 1 0 0 10 5 5 0 1 0 0-10z', 'M12 11a1 1 0 1 0 0 2 1 1 0 1 0 0-2z'],
  arrow: ['M3 12h16', 'M14 6l6 6-6 6'],
} as const;

export type GlyphName = keyof typeof G;

/** Keyword rules, checked in order. The first rule whose pattern matches the label wins. */
const RULES: [RegExp, GlyphName][] = [
  [/checkpoint|snapshot|save/i, 'database'],
  [/you type|\byou\b/i, 'user'],
  [/verify|validate|scan|review|check|eval|gate|test|grade|judge/i, 'check'],
  [/vision|image|patch|resize|pixel|camera/i, 'image'],
  [/prefer|accept|approve|reward|bonus|feedback from/i, 'thumb'],
  [/app shows|display|screen|\bui\b|interface/i, 'screen'],
  [/canary|shadow|rollout|release|ship|launch/i, 'flag'],
  [/compress|quantiz|prune|distil/i, 'compress'],
  [/goal|define|objective|target|spec\b/i, 'target'],
  [/transfer|upload|download|copy|move|export/i, 'arrow'],
  [/profile|benchmark|measure|baseline/i, 'chart'],
  [/decide|choose|plan|branch/i, 'route'],
  [/resume|recover|restart|fail/i, 'loop'],
  [/sync|all-reduce|allreduce/i, 'network'],
  [/forward|backward|backprop|tuning|pretrain/i, 'bolt'],
  [/propose|format|draft/i, 'pen'],
  [/\bact\b|change|apply/i, 'wrench'],
  [/sign|packag/i, 'box'],
  [/question|ask|user message|prompt in|input|request arrives|client|user\b|caller/i, 'question'],
  [/retriev|search|lookup|look up|find|nearest|hybrid/i, 'search'],
  [/rerank|rank|score|sort/i, 'rank'],
  [/chunk|split|shard|slice|cut/i, 'scissors'],
  [/embed|vector|projection|q, k|qkv/i, 'vector'],
  [/store|index|database|db\b|vector store|registry|bucket|storage|s3|blob/i, 'database'],
  [/load|source|document|read|\bfile|ingest|docs|corpus/i, 'doc'],
  [/clean|filter|dedup|preprocess|strip|normal/i, 'filter'],
  [/augment|context|assemble|build the prompt|template|stack|layer/i, 'layers'],
  [/generat|answer|reply|decode|write|draft|output|respond/i, 'pen'],
  [/attention|attend|look/i, 'eye'],
  [/norm/i, 'bell'],
  [/guard|safety|moderat|polic|secur|auth|permission|iam|validate|check the call/i, 'shield'],
  [/gateway|api|endpoint|front door|load balancer|ingress/i, 'gateway'],
  [/tool|function|action|execute|run\b|call/i, 'wrench'],
  [/eval|judge|test|grade|review|verify|check/i, 'check'],
  [/log|monitor|metric|observ|trace|alert|dashboard|telemetry/i, 'chart'],
  [/queue|batch|schedul|buffer/i, 'queue'],
  [/cache|kv|hbm|memory|vram|ram|sram|l2/i, 'memory'],
  [/gpu|tensor core|streaming multiprocessor|\bsm\b|accelerat|chip|npu|tpu|core|mlp|feed-forward/i, 'chip'],
  [/nvlink|pcie|interconnect|network|fabric|infiniband|link/i, 'network'],
  [/cloud|region|bedrock|vertex|foundry|azure|aws|google/i, 'cloud'],
  [/cost|price|budget|spend|bill/i, 'coin'],
  [/latency|timeout|time|deadline|wait/i, 'clock'],
  [/retry|loop|repeat|fallback|again|iterate|feedback/i, 'loop'],
  [/route|router|routing|dispatch/i, 'route'],
  [/serve|server|deploy|node|pod|replica|instance|cluster|host/i, 'server'],
  [/data|dataset|label|table|feature/i, 'table'],
  [/token/i, 'tag'],
  [/train|fine-tun|learn|gradient|optimi|update|step/i, 'bolt'],
  [/encrypt|key|secret|private|vpc/i, 'lock'],
  [/model|llm|weights|checkpoint/i, 'box'],
];

function match(text: string): GlyphName | null {
  for (const [re, name] of RULES) if (re.test(text)) return name;
  return null;
}

/** Pick a glyph from the label; only if the label says nothing recognisable, try the longer description. */
export function glyphFor(label: string, detail = ''): GlyphName {
  return match(label) ?? match(detail) ?? 'box';
}

/**
 * A glyph that draws its strokes in on mount when `draw` is set. To replay the
 * drawing, the parent changes the glyph's React key.
 */
export function Glyph({
  name,
  draw = false,
  size = 24,
  x,
  y,
  className,
}: {
  name: GlyphName;
  draw?: boolean;
  size?: number;
  x?: number;
  y?: number;
  className?: string;
}) {
  const paths = G[name];
  const inner = paths.map((d, i) =>
    draw ? (
      <motion.path key={i} d={d} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, delay: i * 0.06, ease: EASE }} />
    ) : (
      <path key={i} d={d} />
    ),
  );
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {inner}
    </svg>
  );
}
