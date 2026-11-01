import { useMemo, useState } from 'react';
import { Root, useNarrow } from './shared';
import {
  CHUNKS,
  COMMUNITY_REPORTS,
  ENTITIES,
  QUESTIONS,
  answerable,
  approxTokens,
  chunkTokens,
  communities,
  graphRetrieve,
  themesOf,
  vectorTopK,
  type Question,
} from '../../lib/graph-retrieval';

const W = 520;
const H = 310;
const POS: Record<string, [number, number]> = {
  priya: [80, 28],
  kestrel: [80, 106],
  lisbon: [205, 56],
  lidar: [80, 190],
  norvane: [80, 272],
  ines: [260, 252],
  percep: [260, 160],
  tomas: [440, 28],
  osprey: [440, 106],
  leeds: [320, 56],
  cobalt: [440, 190],
  calder: [440, 272],
};
const EDGE_PAIRS: [string, string][] = [
  ['priya', 'kestrel'],
  ['kestrel', 'lisbon'],
  ['kestrel', 'lidar'],
  ['lidar', 'norvane'],
  ['tomas', 'osprey'],
  ['osprey', 'leeds'],
  ['osprey', 'cobalt'],
  ['cobalt', 'calder'],
  ['ines', 'percep'],
  ['percep', 'kestrel'],
  ['percep', 'osprey'],
];
const label = (id: string) => ENTITIES.find((e) => e.id === id)!.label;
const boxW = (id: string) => Math.round(label(id).length * 7.6 + 20);
const CELL = ['wlb-c0', 'wlb-c1', 'wlb-c2'];

const NAMES = Object.fromEntries(CHUNKS.map((c) => [c.id, c.text]));

function PassageList({ ids, needed }: { ids: string[]; needed: string[] }) {
  if (ids.length === 0) return <p className="wlb-empty">Nothing retrieved.</p>;
  return (
    <ul className="wlb-chunks">
      {ids.map((id) => (
        <li key={id} className={needed.includes(id) ? 'is-needed' : ''}>
          <span className="wlb-cid">{id}</span> {NAMES[id]}
          {needed.includes(id) ? <em className="wlb-tag"> needed</em> : null}
        </li>
      ))}
    </ul>
  );
}

export default function GraphRagLab() {
  const narrow = useNarrow('(max-width: 720px)');
  const [qid, setQid] = useState('hop');
  const [k, setK] = useState(2);
  const [hops, setHops] = useState(1);
  const q: Question = QUESTIONS.find((x) => x.id === qid)!;
  const groups = useMemo(() => communities(), []);
  const isGlobal = q.kind === 'whole collection';

  const vec = vectorTopK(q.text, k);
  const vecTokens = vec.reduce((s, id) => s + chunkTokens(id), 0);
  const graph = graphRetrieve(q.text, hops);
  const graphTokens = graph.chunks.reduce((s, id) => s + chunkTokens(id), 0);
  const reports = groups.map((g) => ({ g, r: COMMUNITY_REPORTS[g[0]] }));
  const reportTokens = reports.reduce((s, x) => s + approxTokens(x.r.text), 0);
  const allTokens = CHUNKS.reduce((s, c) => s + chunkTokens(c.id), 0);

  const vecOk = isGlobal ? false : answerable(q, vec);
  const graphOk = isGlobal ? true : answerable(q, graph.chunks);
  const vecThemes = themesOf(vec).filter((t) => q.themes?.includes(t));
  const allThemes = q.themes ?? [];
  const missingVec = (q.needed ?? []).filter((n) => !vec.includes(n));
  const missingGraph = (q.needed ?? []).filter((n) => !graph.chunks.includes(n));

  const stateOf = (id: string): string => {
    if (isGlobal) return CELL[groups.findIndex((g) => g.includes(id))] ?? '';
    if (graph.seeds.includes(id)) return 'wlb-seed';
    const h = graph.reached.get(id);
    return h === undefined ? '' : `wlb-hop wlb-h${Math.min(h, 3)}`;
  };
  const edgeOn = (a: string, b: string) => !isGlobal && graph.edges.some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));

  const summary = isGlobal
    ? `Question: ${q.text} Vector search with k ${k} covers ${vecThemes.length} of ${allThemes.length} themes. Community reports cover ${allThemes.length} of ${allThemes.length}.`
    : `Question: ${q.text} Vector search with k ${k} ${vecOk ? 'has' : 'is missing'} the passages needed${vecOk ? '' : ': ' + missingVec.join(', ')}. Graph search with ${hops} hops ${graphOk ? 'has' : 'is missing'} them${graphOk ? '' : ': ' + missingGraph.join(', ')}.`;

  return (
    <Root>
      <div className="viz wlb wlb-g">
        <p className="viz-title">Vector search or graph walk?</p>
        <p className="wlb-note">
          An invented company with 13 short passages. The entities and links stand in for what a language model would extract, and the matching is a toy stand-in for an embedding model. It shows the shape of each failure, not how often it happens.
        </p>

        <div className="wlb-row" role="group" aria-label="Choose a question">
          {QUESTIONS.map((x) => (
            <button key={x.id} type="button" className="wlb-chip" aria-pressed={qid === x.id} onClick={() => setQid(x.id)}>
              {x.kind}
            </button>
          ))}
        </div>
        <p className="wlb-q">&ldquo;{q.text}&rdquo;</p>

        <div className="wlb-sliders">
          <label className="wlb-slide">
            <span>
              Vector search returns the top <b>{k}</b> passage{k === 1 ? '' : 's'}
            </span>
            <input type="range" min={1} max={8} step={1} value={k} onChange={(e) => setK(+e.target.value)} />
          </label>
          <label className="wlb-slide">
            <span>
              {isGlobal ? 'Graph hops (not used: this question names no entity)' : (
                <>
                  Graph walk goes <b>{hops}</b> hop{hops === 1 ? '' : 's'} from the named entity
                </>
              )}
            </span>
            <input type="range" min={1} max={3} step={1} value={hops} disabled={isGlobal} onChange={(e) => setHops(+e.target.value)} />
          </label>
        </div>

        {narrow ? (
          <div className="wlb-pills" role="img" aria-label="The entity graph, grouped by community">
            {groups.map((g) => (
              <div key={g[0]} className="wlb-pillgroup">
                <span className="wlb-pillhead">{COMMUNITY_REPORTS[g[0]].title}</span>
                <span className="wlb-pillrow">
                  {g.map((id) => (
                    <span key={id} className={`wlb-pill ${stateOf(id)}`}>
                      {label(id)}
                      {!isGlobal && graph.reached.has(id) ? <small> hop {graph.reached.get(id)}</small> : null}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <svg className="wlb-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The entity graph. Highlighted nodes are the ones the graph search reached.">
            {EDGE_PAIRS.map(([a, b]) => (
              <line key={a + b} className={'wlb-edge' + (edgeOn(a, b) ? ' is-on' : '')} x1={POS[a][0]} y1={POS[a][1]} x2={POS[b][0]} y2={POS[b][1]} />
            ))}
            {ENTITIES.map((e) => {
              const [x, y] = POS[e.id];
              const w = boxW(e.id);
              return (
                <g key={e.id} className={`wlb-node ${stateOf(e.id)}`}>
                  <rect x={x - w / 2} y={y - 16} width={w} height={32} rx={9} />
                  <text x={x} y={y + 5} textAnchor="middle">
                    {e.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        <p className="wlb-key">
          {isGlobal ? 'Colours show the three communities a graph index would find.' : 'Dark outline: the entity found in the question. Tinted: reached by the walk.'}
        </p>

        <div className="wlb-cols">
          <section className="wlb-card" aria-label="Vector search result">
            <h4>Vector search</h4>
            <PassageList ids={vec} needed={q.needed} />
            <p className="wlb-verdict">
              ~{vecTokens} tokens sent.{' '}
              {isGlobal ? (
                <b className="is-bad">
                  Themes covered: {vecThemes.length} of {allThemes.length}
                  {vecThemes.length ? ` (${vecThemes.join(', ')})` : ''}.
                </b>
              ) : vecOk ? (
                <b className="is-good">Has every passage the answer needs.</b>
              ) : (
                <b className="is-bad">Missing {missingVec.join(', ')}.</b>
              )}
            </p>
          </section>

          <section className="wlb-card" aria-label="Graph search result">
            <h4>{isGlobal ? 'Graph: community reports' : 'Graph walk'}</h4>
            {isGlobal ? (
              <>
                <p className="wlb-small">No entity is named, so a local walk has nowhere to start. Global search reads the pre-written community reports instead.</p>
                <ul className="wlb-chunks">
                  {reports.map((x, i) => (
                    <li key={x.g[0]}>
                      <span className={`wlb-cid ${CELL[i]}`}>{x.r.title}</span> {x.r.text}
                    </li>
                  ))}
                </ul>
                <p className="wlb-verdict">
                  ~{reportTokens} tokens of reports, against ~{allTokens} for every passage.{' '}
                  <b className="is-good">
                    Themes covered: {allThemes.length} of {allThemes.length}.
                  </b>{' '}
                  The reports had to be written in advance by a model that read everything.
                </p>
              </>
            ) : (
              <>
                <p className="wlb-small">
                  Found in the question: <b>{graph.seeds.map(label).join(', ') || 'nothing'}</b>.
                </p>
                {graph.edges.length > 0 ? (
                  <ul className="wlb-edges">
                    {graph.edges.map((e) => (
                      <li key={e.from + e.to}>
                        {label(e.from)} <em>{e.label}</em> {label(e.to)}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <PassageList ids={graph.chunks} needed={q.needed} />
                <p className="wlb-verdict">
                  ~{graphTokens} tokens sent.{' '}
                  {graphOk ? <b className="is-good">Has every passage the answer needs.</b> : <b className="is-bad">Missing {missingGraph.join(', ')}.</b>}
                </p>
              </>
            )}
          </section>
        </div>
        <p className="sr-only" aria-live="polite">
          {summary}
        </p>
        <p className="viz-cap">
          {q.id === 'hop'
            ? 'Vector search ranks passages by how much they resemble the question, so it finds the end of the chain (who makes the sensor) but not the link back to Priya. The graph follows the links; each extra hop costs more passages, some of them irrelevant.'
            : q.id === 'fact'
              ? 'One passage holds the answer, and similarity finds it. The graph gets there too but sends neighbours along, so it costs more and adds nothing.'
              : 'A question about everything has no passage that answers it. Top-k returns the passages that resemble the words of the question; community reports summarise the whole collection.'}
        </p>
      </div>
    </Root>
  );
}
