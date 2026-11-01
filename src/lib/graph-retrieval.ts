/**
 * A tiny, invented knowledge base used to compare vector-only retrieval with graph-based retrieval.
 *
 * Everything here is made up for teaching: the company, the passages, the entities and relations
 * (which stand in for what an LLM would extract), the community summaries, and the toy "embedding"
 * (a concept-merged TF-IDF cosine, a stand-in for a real embedding model). The point is the shape of
 * the failure, not a measurement of any real system.
 */

export type Chunk = {
  id: string;
  text: string;
  /** Entities mentioned in the passage. */
  entities: string[];
  /** What the passage is about, used to score coverage of a whole-collection question. */
  theme: Theme;
};

export type Theme = 'People' | 'Parts and suppliers' | 'Supply delays' | 'Safety' | 'Hiring' | 'Performance' | 'Policy';

export type Entity = { id: string; label: string; aliases: string[] };
export type Edge = { from: string; to: string; label: string; chunk: string };

export const ENTITIES: Entity[] = [
  { id: 'priya', label: 'Priya Nair', aliases: ['priya', 'priya nair'] },
  { id: 'kestrel', label: 'Kestrel', aliases: ['kestrel'] },
  { id: 'lisbon', label: 'Lisbon lab', aliases: ['lisbon'] },
  { id: 'lidar', label: 'LidarLite S2', aliases: ['lidarlite'] },
  { id: 'norvane', label: 'Norvane Optics', aliases: ['norvane'] },
  { id: 'ines', label: 'Ines Okafor', aliases: ['ines'] },
  { id: 'percep', label: 'Perception team', aliases: ['perception'] },
  { id: 'tomas', label: 'Tomas Reyes', aliases: ['tomas'] },
  { id: 'osprey', label: 'Osprey', aliases: ['osprey'] },
  { id: 'leeds', label: 'Leeds lab', aliases: ['leeds'] },
  { id: 'cobalt', label: 'Cobalt-4', aliases: ['cobalt'] },
  { id: 'calder', label: 'Calder Cells', aliases: ['calder'] },
];

export const CHUNKS: Chunk[] = [
  { id: 'c1', text: 'Priya Nair leads Project Kestrel, the warehouse inspection drone, from the Lisbon lab.', entities: ['priya', 'kestrel', 'lisbon'], theme: 'People' },
  { id: 'c2', text: "Project Kestrel's navigation unit relies on the LidarLite S2 sensor to detect obstacles.", entities: ['kestrel', 'lidar'], theme: 'Parts and suppliers' },
  { id: 'c3', text: 'The LidarLite S2 sensor is manufactured by Norvane Optics under a three-year supply contract.', entities: ['lidar', 'norvane'], theme: 'Parts and suppliers' },
  { id: 'c4', text: 'Tomas Reyes leads Project Osprey, a crane inspection robot, from the Leeds lab.', entities: ['tomas', 'osprey', 'leeds'], theme: 'People' },
  { id: 'c5', text: 'Project Osprey runs on the Cobalt-4 battery pack, which Calder Cells supplies.', entities: ['osprey', 'cobalt', 'calder'], theme: 'Parts and suppliers' },
  { id: 'c6', text: 'Kestrel flies for 38 minutes on one charge.', entities: ['kestrel'], theme: 'Performance' },
  { id: 'c7', text: 'Supplier policy: every sensor supplier must pass a security review before a contract is signed.', entities: [], theme: 'Policy' },
  { id: 'c8', text: 'Norvane Optics has been a company supplier since 2021 and is based in Aarhus.', entities: ['norvane'], theme: 'Parts and suppliers' },
  { id: 'c9', text: 'Norvane Optics has warned of a six-week delay on LidarLite S2 deliveries.', entities: ['norvane', 'lidar'], theme: 'Supply delays' },
  { id: 'c10', text: 'Two near-miss incidents in the Leeds lab were logged in March, and a safety audit is due in June.', entities: ['leeds'], theme: 'Safety' },
  { id: 'c11', text: 'Ines Okafor manages the Perception team, which supports Kestrel and Osprey.', entities: ['ines', 'percep', 'kestrel', 'osprey'], theme: 'People' },
  { id: 'c12', text: 'The Perception team has three open roles that have been unfilled since January.', entities: ['percep'], theme: 'Hiring' },
  { id: 'c13', text: 'Calder Cells ships Cobalt-4 packs by sea, so orders take about nine weeks.', entities: ['calder', 'cobalt'], theme: 'Supply delays' },
];

/** Relations an extraction step might produce, each pointing back to the passage that supports it. */
export const EDGES: Edge[] = [
  { from: 'priya', to: 'kestrel', label: 'leads', chunk: 'c1' },
  { from: 'kestrel', to: 'lisbon', label: 'based in', chunk: 'c1' },
  { from: 'kestrel', to: 'lidar', label: 'uses', chunk: 'c2' },
  { from: 'lidar', to: 'norvane', label: 'made by', chunk: 'c3' },
  { from: 'tomas', to: 'osprey', label: 'leads', chunk: 'c4' },
  { from: 'osprey', to: 'leeds', label: 'based in', chunk: 'c4' },
  { from: 'osprey', to: 'cobalt', label: 'uses', chunk: 'c5' },
  { from: 'cobalt', to: 'calder', label: 'supplied by', chunk: 'c5' },
  { from: 'ines', to: 'percep', label: 'manages', chunk: 'c11' },
  { from: 'percep', to: 'kestrel', label: 'supports', chunk: 'c11' },
  { from: 'percep', to: 'osprey', label: 'supports', chunk: 'c11' },
];

export type Question = {
  id: string;
  kind: 'multi-hop' | 'single fact' | 'whole collection';
  text: string;
  /** Passages that must reach the model for the question to be answerable. */
  needed: string[];
  /** For whole-collection questions: the themes a good answer covers. */
  themes?: Theme[];
};

export const QUESTIONS: Question[] = [
  { id: 'hop', kind: 'multi-hop', text: 'Which supplier makes the sensor used by the project Priya leads?', needed: ['c1', 'c2', 'c3'] },
  { id: 'fact', kind: 'single fact', text: 'How long does Kestrel fly on one charge?', needed: ['c6'] },
  {
    id: 'all',
    kind: 'whole collection',
    text: 'What is going on across the company’s drone projects?',
    needed: [],
    themes: ['People', 'Parts and suppliers', 'Supply delays', 'Safety', 'Hiring'],
  },
];

/* ---------- a toy embedding: merge synonyms into concepts, then TF-IDF cosine ---------- */

const STOP = new Set(
  'a an the of on in to by for is are was be been has have had which what who how does do and or with from that this its it as at not across going about one'.split(' '),
);

const CONCEPTS: Record<string, string> = {
  supplier: 'supplier',
  suppliers: 'supplier',
  supplies: 'supplier',
  supplied: 'supplier',
  supply: 'supplier',
  manufactured: 'supplier',
  makes: 'supplier',
  made: 'supplier',
  provides: 'supplier',
  uses: 'use',
  used: 'use',
  relies: 'use',
  runs: 'use',
  leads: 'lead',
  lead: 'lead',
  manages: 'lead',
  project: 'project',
  projects: 'project',
  drone: 'drone',
  drones: 'drone',
  flies: 'fly',
  fly: 'fly',
  charge: 'charge',
  sensor: 'sensor',
};

export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((w) => !STOP.has(w))
    .map((w) => CONCEPTS[w] ?? w);
}

function tf(ws: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const w of ws) m.set(w, (m.get(w) ?? 0) + 1);
  return m;
}

const DOCS = CHUNKS.map((c) => tokens(c.text));
const DF = new Map<string, number>();
for (const d of DOCS) for (const w of new Set(d)) DF.set(w, (DF.get(w) ?? 0) + 1);
const idf = (w: string) => Math.log((1 + CHUNKS.length) / (1 + (DF.get(w) ?? 0))) + 1;

function vec(ws: string[]): Map<string, number> {
  const v = new Map<string, number>();
  for (const [w, n] of tf(ws)) v.set(w, n * idf(w));
  return v;
}
const norm = (v: Map<string, number>) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));
const CHUNK_VECS = DOCS.map(vec);

export type Scored = { id: string; score: number };

/** All passages ranked by toy similarity to the question, best first. Ties keep passage order. */
export function rank(question: string): Scored[] {
  const q = vec(tokens(question));
  const qn = norm(q);
  const out = CHUNKS.map((c, i) => {
    const v = CHUNK_VECS[i];
    let dot = 0;
    for (const [w, x] of q) dot += x * (v.get(w) ?? 0);
    const d = qn * norm(v);
    return { id: c.id, score: d === 0 ? 0 : dot / d };
  });
  return out
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.score - a.s.score || a.i - b.i)
    .map((x) => x.s);
}

/** The k most similar passages. Passages with no overlap at all (score 0) are never returned, as with a minimum-similarity cutoff. */
export function vectorTopK(question: string, k: number): string[] {
  return rank(question)
    .filter((s) => s.score > 0)
    .slice(0, k)
    .map((s) => s.id);
}

/* ---------- graph retrieval ---------- */

/** Entities whose name or alias appears in the question. This is the "entity linking" step. */
export function linkEntities(question: string): string[] {
  const ws = new Set(question.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  return ENTITIES.filter((e) => e.aliases.some((a) => a.split(' ').every((p) => ws.has(p)))).map((e) => e.id);
}

export type GraphResult = {
  seeds: string[];
  /** Entities reached, with the hop at which each was first reached (seeds are hop 0). */
  reached: Map<string, number>;
  /** Edges traversed, in the order found. */
  edges: Edge[];
  /** Passages gathered: those that support a traversed edge or mention a seed. */
  chunks: string[];
};

/** Breadth-first walk of the entity graph from the entities named in the question, up to `hops` edges away. */
export function graphRetrieve(question: string, hops: number): GraphResult {
  const seeds = linkEntities(question);
  const reached = new Map<string, number>(seeds.map((s) => [s, 0]));
  const edges: Edge[] = [];
  let frontier = [...seeds];
  for (let h = 1; h <= hops; h++) {
    const next: string[] = [];
    for (const e of EDGES) {
      const fromIn = frontier.includes(e.from);
      const toIn = frontier.includes(e.to);
      if (!fromIn && !toIn) continue;
      if (!edges.includes(e)) edges.push(e);
      for (const n of [e.from, e.to]) {
        if (!reached.has(n)) {
          reached.set(n, h);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  const ids = new Set<string>();
  for (const e of edges) ids.add(e.chunk);
  for (const c of CHUNKS) if (c.entities.some((x) => seeds.includes(x))) ids.add(c.id);
  const order = CHUNKS.map((c) => c.id).filter((id) => ids.has(id));
  return { seeds, reached, edges, chunks: order };
}

/* ---------- communities and global answers ---------- */

/**
 * Greedy modularity communities (a simple stand-in for the Leiden algorithm that GraphRAG uses).
 * Start with every entity alone and repeatedly merge the pair of communities that raises modularity most.
 * Edge weight is the number of passages that support the relation. Deterministic.
 */
export function communities(
  nodes: string[] = ENTITIES.map((e) => e.id),
  edges: { from: string; to: string; w?: number }[] = collapseEdges(),
): string[][] {
  const m = edges.reduce((s, e) => s + (e.w ?? 1), 0);
  if (m === 0) return nodes.map((n) => [n]);
  const deg = new Map<string, number>(nodes.map((n) => [n, 0]));
  for (const e of edges) {
    deg.set(e.from, (deg.get(e.from) ?? 0) + (e.w ?? 1));
    deg.set(e.to, (deg.get(e.to) ?? 0) + (e.w ?? 1));
  }
  let groups: string[][] = nodes.map((n) => [n]);
  const gain = (a: string[], b: string[]) => {
    let between = 0;
    for (const e of edges) {
      const w = e.w ?? 1;
      if ((a.includes(e.from) && b.includes(e.to)) || (a.includes(e.to) && b.includes(e.from))) between += w;
    }
    const da = a.reduce((s, n) => s + (deg.get(n) ?? 0), 0);
    const db = b.reduce((s, n) => s + (deg.get(n) ?? 0), 0);
    return between / m - (da * db) / (2 * m * m);
  };
  for (;;) {
    let best = 1e-12;
    let pair: [number, number] | null = null;
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const g = gain(groups[i], groups[j]);
        if (g > best + 1e-15) {
          best = g;
          pair = [i, j];
        }
      }
    }
    if (!pair) break;
    const [i, j] = pair;
    groups = groups.filter((_, k) => k !== i && k !== j).concat([[...groups[i], ...groups[j]]]);
  }
  const order = (g: string[]) => Math.min(...g.map((n) => nodes.indexOf(n)));
  return groups.map((g) => [...g].sort((a, b) => nodes.indexOf(a) - nodes.indexOf(b))).sort((a, b) => order(a) - order(b));
}

/** Merge parallel edges into one weighted edge, so two passages saying the same thing count double. */
export function collapseEdges(): { from: string; to: string; w: number }[] {
  const m = new Map<string, { from: string; to: string; w: number }>();
  for (const e of EDGES) {
    const key = [e.from, e.to].sort().join('|');
    const cur = m.get(key);
    if (cur) cur.w += 1;
    else m.set(key, { from: e.from, to: e.to, w: 1 });
  }
  return [...m.values()];
}

/** Invented community reports, keyed by the first member of each community (see the test that pins the partition). */
export const COMMUNITY_REPORTS: Record<string, { title: string; text: string }> = {
  priya: {
    title: 'Kestrel group',
    text: 'Kestrel, led by Priya Nair from the Lisbon lab, depends on the LidarLite S2 sensor from Norvane Optics, which has warned of a six-week delivery delay. It flies 38 minutes on one charge.',
  },
  ines: {
    title: 'Perception group',
    text: 'The Perception team, managed by Ines Okafor, supports both projects and has three roles unfilled since January.',
  },
  tomas: {
    title: 'Osprey group',
    text: 'Osprey, led by Tomas Reyes from the Leeds lab, runs on Cobalt-4 batteries from Calder Cells, shipped by sea with about nine weeks lead time. Two near-miss incidents were logged in March and a safety audit is due in June.',
  },
};

/** The community a passage belongs to: that of its first entity, or null if it names none. */
export function chunkCommunity(chunk: Chunk, groups: string[][]): number | null {
  const first = chunk.entities[0];
  if (!first) return null;
  const g = groups.findIndex((grp) => grp.includes(first));
  return g < 0 ? null : g;
}

/** Rough token count: words times 1.3, rounded. Good enough to compare sizes in a toy. */
export const approxTokens = (text: string) => Math.round(text.trim().split(/\s+/).length * 1.3);

export const chunkTokens = (id: string) => approxTokens(CHUNKS.find((c) => c.id === id)!.text);

/** Themes present in a set of passages. */
export function themesOf(ids: string[]): Theme[] {
  const set = new Set(ids.map((id) => CHUNKS.find((c) => c.id === id)!.theme));
  return [...set];
}

/** Does this set of passages contain everything the question needs? */
export function answerable(q: Question, ids: string[]): boolean {
  return q.needed.every((n) => ids.includes(n));
}
