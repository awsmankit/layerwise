import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { DOCS, QUESTION, TOP_K, USERS, countsFor, matches, pool, search, type Kind } from '../../lib/whatif/no-metadata-filters';

const TAG: Record<Kind, (v: number) => string> = {
  leak: () => '✗ another customer\'s document',
  version: (v) => `! wrong version, you run v${v}`,
  safe: () => '✓ yours, right version',
};
const CLS: Record<Kind, string> = { leak: 'is-bad', version: 'is-warn', safe: 'is-good' };

/**
 * A toy shared document store with three made-up customers. The search ranks by word overlap. Without a filter it ranks
 * everything, so another customer's document or an old version can come out on top. With the filter, only the user's
 * own tenant and version are searched at all.
 */
export default function NoMetadataFiltersWhatIf() {
  const [filtered, setFiltered] = useState(false);
  const [who, setWho] = useState(0);
  const user = USERS[who];
  const hits = search(user, filtered);
  const c = countsFor(user, filtered);
  const inPool = new Set(pool(user, filtered).map((d) => d.id));
  const hitKind = new Map(hits.map((h) => [h.doc.id, h.kind]));
  const top = hits[0];

  const verdict = filtered ? (
    <>
      The filter keeps {c.searched} of {DOCS.length} documents before ranking. Of the {c.shown} {c.shown === 1 ? 'result' : 'results'}, {c.leaks} {c.leaks === 1 ? 'is' : 'are'} another customer's and {c.wrongVersion} {c.wrongVersion === 1 ? 'is' : 'are'} for another version.
    </>
  ) : (
    <>
      The search looked at all {c.searched} documents. Of the top {c.shown}, {c.leaks} {c.leaks === 1 ? 'is' : 'are'} another customer's and {c.wrongVersion} {c.wrongVersion === 1 ? 'is' : 'are'} for another version. Only {c.safe} of {c.shown} {c.safe === 1 ? 'is' : 'are'} safe to use.
    </>
  );

  return (
    <WhatIfFrame
      title={`${user.tenant} (version ${user.version}) asks: "${QUESTION}"`}
      withLabel="With metadata filters"
      withoutLabel="Without filters"
      on={filtered}
      onChange={setFiltered}
      verdict={verdict}
      controls={
        <div className="wr-who" role="group" aria-label="Who is asking?">
          <span className="wr-who-h">Who is asking?</span>
          <div className="wr-chips">
            {USERS.map((u, i) => (
              <button key={u.id} type="button" className={'wr-chip' + (i === who ? ' is-on' : '')} aria-pressed={i === who} onClick={() => setWho(i)}>
                {u.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <p className="wr-lead">
        One search index holds the help pages of three companies and three product versions (a toy example). Every page carries labels called metadata: whose it is, which version, and when it was written. A filter uses those labels to throw out pages the asker should never get.
      </p>
      <p className="wr-card-h">Pages searched: {c.searched} of {DOCS.length}</p>
      <ul className="wr-mf-grid" aria-label={`${c.searched} of ${DOCS.length} pages are searched`}>
        {DOCS.map((d) => {
          const k = hitKind.get(d.id);
          const out = !inPool.has(d.id);
          return (
            <li
              key={d.id}
              className={'wr-mf-cell' + (out ? ' is-out' : '') + (k ? ' is-hit ' + CLS[k] : '') + (matches(d, user) ? ' is-mine' : '')}
              title={`${d.tenant}, version ${d.version}${out ? ' (not searched)' : ''}`}
            >
              <b>{d.tenant[0]}</b>v{d.version}
            </li>
          );
        })}
      </ul>
      <p className="wr-meta wr-mf-key">Letter = customer (A, B, C). v = version. Outlined cells are in the top {TOP_K}. Faded cells were thrown out by the filter before ranking. Cells with a dot are really yours.</p>

      <p className="wr-card-h">Top {TOP_K} results</p>
      <ol className="wr-list" aria-label="Search results, best first">
        <AnimatePresence mode="popLayout" initial={false}>
          {hits.map((h, i) => (
            <motion.li
              key={h.doc.id}
              layout
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14 }}
              transition={{ duration: 0.45, ease: EASE }}
              className={'wr-row wr-compact ' + CLS[h.kind]}
            >
              <span className="wr-rank" aria-hidden="true">{i + 1}</span>
              <div className="wr-body">
                <span className="wr-text"><b>{h.doc.title}</b></span>
                <span className="wr-text">{h.doc.text}</span>
                <span className="wr-meta">
                  {h.doc.tenant} · v{h.doc.version} · {h.doc.date} · score {h.score.toFixed(2)}
                </span>
                <span className={'wr-badge-line ' + CLS[h.kind]}>{TAG[h.kind](user.version)}</span>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {top && (
        <p className={'wr-reply ' + (top.kind === 'safe' ? 'is-good' : 'is-bad')}>
          <b>{top.kind === 'safe' ? '✓ ' : '✗ '}The assistant answers from rank 1:</b> {top.doc.title}.{' '}
          {top.kind === 'leak' ? `That is ${top.doc.tenant}'s page, shown to ${user.tenant}.` : top.kind === 'version' ? `That page is for version ${top.doc.version}, not ${user.version}.` : 'Right customer, right version.'}
        </p>
      )}
      <details className="wr-details">
        <summary>The numbers for all three askers</summary>
        <div className="wr-scroll">
          <table className="wr-table">
            <caption>Top {TOP_K} for the same question. Leak = another customer's page. Wrong version = a page for a different version.</caption>
            <thead>
              <tr><th scope="col">Asker</th><th scope="col">Filter</th><th scope="col">Searched</th><th scope="col">Leaks</th><th scope="col">Wrong version</th><th scope="col">Safe</th></tr>
            </thead>
            <tbody>
              {USERS.flatMap((u) =>
                [false, true].map((f) => {
                  const k = countsFor(u, f);
                  return (
                    <tr key={u.id + f}>
                      <th scope="row">{u.label}</th>
                      <td>{f ? 'on' : 'off'}</td>
                      <td>{k.searched}</td>
                      <td>{k.leaks}</td>
                      <td>{k.wrongVersion}</td>
                      <td>{k.safe}</td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </details>
      <p className="wr-note">
        Toy data: 18 invented pages. Score = cosine similarity of word counts between the question and the page. The filter is "tenant equals the asker's tenant AND version equals the asker's version", applied before ranking. Real systems often also filter on date or a "current" flag.
      </p>
    </WhatIfFrame>
  );
}

