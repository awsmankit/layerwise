import { useId, useMemo, useState, type ReactNode } from 'react';
import { Root } from './shared';
import { COLUMN_PAGE, METHODS, PAGES, STATUS_LABEL, TABLE_CELLS, SCAN_LINES, methodById, outcomes, stats, type LabPage, type MethodId, type PageId, type PathKind, type Status } from '../../lib/parsing-lab';

/*
 * "Parsing lab": three invented pages drawn in SVG (two columns with header and footer, a table with merged cells,
 * a noisy scan) and five extraction methods. Choosing a method shows the scripted text it would produce and which
 * questions a RAG system could then answer. The outputs are illustrations of kinds of failure, not measurements.
 * The logic and data are in lib/parsing-lab.ts and are unit tested.
 */

const W = 320;
const STATUS_ICON: Record<Status, string> = { right: '✓', risky: '!', missing: '?' };

/* ------------------------------- page drawings ------------------------------- */

const LINE_TOP = 62;
const LINE_PITCH = 34;
const colLineY = (i: number) => LINE_TOP + i * LINE_PITCH;
const LEFT_X = 22;
const RIGHT_X = 172;
const COL_W = 126;

function barWidth(text: string) {
  return Math.min(COL_W, 6 + text.length * 4.1);
}

function ColumnsDrawing({ path, dropFurniture, markerId }: { path: PathKind; dropFurniture: boolean; markerId: string }) {
  const { left, right, leftHeadings, rightHeadings } = COLUMN_PAGE;
  const col = (lines: string[], heads: number[], x: number) =>
    lines.map((l, i) =>
      heads.includes(i) ? (
        <text key={i} x={x} y={colLineY(i) + 8} className="dcp-head">
          {l}
        </text>
      ) : (
        <rect key={i} x={x} y={colLineY(i)} width={barWidth(l)} height={8} rx={2} className="dcp-bar" />
      ),
    );
  const mid = (i: number) => colLineY(i) + 4;
  const zig: string[] = [];
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (i < left.length) zig.push(`${LEFT_X - 6},${mid(i)}`);
    if (i < right.length) zig.push(`${RIGHT_X - 6},${mid(i)}`);
  }
  return (
    <>
      <rect x={6} y={6} width={W - 12} height={288} rx={4} className="dcp-sheet" />
      <g className={dropFurniture ? 'dcp-gone' : ''}>
        <text x={W / 2} y={30} textAnchor="middle" className="dcp-furn">
          {COLUMN_PAGE.header}
        </text>
        <text x={W / 2} y={284} textAnchor="middle" className="dcp-furn">
          {COLUMN_PAGE.footer}
        </text>
      </g>
      <line x1={14} x2={W - 14} y1={40} y2={40} className="dcp-rule" />
      <line x1={14} x2={W - 14} y1={268} y2={268} className="dcp-rule" />
      <line x1={W / 2} x2={W / 2} y1={52} y2={258} className="dcp-gutter" />
      {col(left, leftHeadings, LEFT_X)}
      {col(right, rightHeadings, RIGHT_X)}
      {path === 'across' && <polyline key="across" points={zig.join(' ')} className="dcp-path dcp-bad" markerEnd={`url(#${markerId})`} />}
      {path === 'columns' && (
        <g key="columns">
          <polyline points={`${LEFT_X - 6},${mid(0)} ${LEFT_X - 6},${mid(left.length - 1)}`} className="dcp-path dcp-good" markerEnd={`url(#${markerId})`} />
          <polyline points={`${RIGHT_X - 6},${mid(0)} ${RIGHT_X - 6},${mid(right.length - 1)}`} className="dcp-path dcp-good" markerEnd={`url(#${markerId})`} />
        </g>
      )}
    </>
  );
}

const TCOL = [14, 88, 176, 244, 306]; // cell edges
const TROW0 = 52;
const TROWH = 32;

function TableDrawing({ path, markerId }: { path: PathKind; markerId: string }) {
  const rect = (c: (typeof TABLE_CELLS)[number]) => {
    const x = TCOL[c.c];
    const w = TCOL[c.c + (c.colspan ?? 1)] - x;
    const y = TROW0 + c.r * TROWH;
    const h = (c.rowspan ?? 1) * TROWH;
    return { x, y, w, h };
  };
  const structured = path === 'cells';
  return (
    <>
      <rect x={6} y={6} width={W - 12} height={246} rx={4} className="dcp-sheet" />
      <text x={14} y={34} className="dcp-furn">
        Table 1: Storage plans
      </text>
      {TABLE_CELLS.map((c, i) => {
        const { x, y, w, h } = rect(c);
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} className={`dcp-cell${c.header ? ' dcp-cell-h' : ''}${structured ? ' dcp-cell-ok' : ''}${(c.rowspan ?? 1) > 1 ? ' dcp-cell-m' : ''}`} />
            <text x={x + w / 2} y={y + h / 2 + 4.5} textAnchor="middle" className={c.header ? 'dcp-head' : 'dcp-celltext'}>
              {c.text}
            </text>
          </g>
        );
      })}
      {path === 'colwise' && (
        <g key="colwise">
          {[0, 1, 2, 3].map((c) => {
            const x = (TCOL[c] + TCOL[c + 1]) / 2 + 24;
            return <polyline key={c} points={`${x},${TROW0 + 4} ${x},${TROW0 + 5 * TROWH - 4}`} className="dcp-path dcp-bad" markerEnd={`url(#${markerId})`} />;
          })}
        </g>
      )}
      {path === 'rowwise' && (
        <g key="rowwise">
          {[0, 1, 2, 3, 4].map((r) => (
            <polyline key={r} points={`${TCOL[1] + 4},${TROW0 + r * TROWH + 6} ${TCOL[4] - 6},${TROW0 + r * TROWH + 6}`} className="dcp-path dcp-warn" markerEnd={`url(#${markerId})`} />
          ))}
          {[1, 3].map((r) => (
            <circle key={r} cx={(TCOL[0] + TCOL[1]) / 2} cy={TROW0 + r * TROWH + TROWH} r={5} className="dcp-dot" />
          ))}
        </g>
      )}
    </>
  );
}

function ScanDrawing({ path }: { path: PathKind }) {
  // deterministic speckle so the picture is the same on every render
  const specks = useMemo(() => {
    let s = 7;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    return Array.from({ length: 90 }, () => ({ x: 12 + rnd() * 296, y: 12 + rnd() * 236, r: 0.5 + rnd() * 1.4 }));
  }, []);
  const ys = [66, 104, 150, 188];
  return (
    <>
      <rect x={6} y={6} width={W - 12} height={246} rx={4} className="dcp-sheet dcp-scan" />
      <g transform="rotate(-2 160 130)">
        {SCAN_LINES.map((t, i) => (
          <text key={i} x={28} y={ys[i]} className={i === 0 ? 'dcp-scantext dcp-scanbold' : 'dcp-scantext'}>
            {t}
          </text>
        ))}
        {path === 'lines' &&
          ys.map((y, i) => (
            <rect key={i} x={22} y={y - 17} width={i === 0 ? 190 : 200} height={24} rx={3} className={`dcp-box${i === 2 ? ' dcp-box-flag' : ''}`} />
          ))}
      </g>
      {specks.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} className="dcp-speck" />
      ))}
      <line x1={14} y1={226} x2={150} y2={218} className="dcp-scratch" />
      <line x1={230} y1={30} x2={300} y2={48} className="dcp-scratch" />
      {path === 'none' && (
        <g>
          <rect x={52} y={104} width={216} height={44} rx={6} className="dcp-stamp" />
          <text x={W / 2} y={131} textAnchor="middle" className="dcp-stamptext">
            Text layer: 0 characters
          </text>
        </g>
      )}
    </>
  );
}

/* ---------------------------------- component ---------------------------------- */

const PAGE_ALT: Record<PageId, string> = {
  columns: 'A leaflet page with a running header, a footer and two columns of text.',
  table: 'A table of storage plans with the group names Personal and Business each merged across two rows.',
  scan: 'A slightly crooked, speckled scan of an invoice with four lines of text.',
};

export default function ParsingLab() {
  const uid = useId().replace(/:/g, '');
  const [pageId, setPageId] = useState<PageId>('columns');
  const [methodId, setMethodId] = useState<MethodId>('text-raw');
  const page = PAGES.find((p) => p.id === pageId) as LabPage;
  const out = page.outputs[methodId];
  const method = methodById(methodId);
  const res = outcomes(page, methodId);
  const st = stats(page, methodId);
  const nRight = res.filter((r) => r.status === 'right').length;
  const markerId = `dcp-arrow-${uid}`;

  let drawing: ReactNode;
  if (page.id === 'columns') drawing = <ColumnsDrawing path={out.path} dropFurniture={st.boilerplateKept === false} markerId={markerId} />;
  else if (page.id === 'table') drawing = <TableDrawing path={out.path} markerId={markerId} />;
  else drawing = <ScanDrawing path={out.path} />;

  return (
    <Root>
      <div className="viz dcp-lab">
        <p className="viz-title">Parsing lab: one page, five ways to read it</p>
        <p className="viz-cap" style={{ marginTop: 0 }}>
          Pick a page, then a method. The extracted text and the answers are scripted illustrations of kinds of failure on invented pages. They are not measurements of any product,
          and on your own documents the ranking could differ.
        </p>

        <div className="dcp-tabs" role="group" aria-label="Choose a page">
          {PAGES.map((p) => (
            <button key={p.id} type="button" className="btn quiet dcp-tab" aria-pressed={p.id === pageId} onClick={() => setPageId(p.id)}>
              {p.title}
            </button>
          ))}
        </div>

        <div className="dcp-grid">
          <figure className="dcp-fig">
            <svg viewBox={`0 0 ${W} ${page.id === 'columns' ? 300 : 258}`} className="dcp-svg" role="img" aria-label={`${PAGE_ALT[page.id]} Method shown: ${method.label}.`}>
              <defs>
                <marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" className="dcp-arrowhead" />
                </marker>
              </defs>
              {drawing}
            </svg>
            <figcaption className="viz-cap" style={{ marginTop: '0.4rem' }}>
              {page.blurb}
            </figcaption>
          </figure>

          <fieldset className="dcp-methods">
            <legend>Extraction method</legend>
            {METHODS.map((m) => (
              <label key={m.id} className="dcp-opt">
                <input type="radio" name={`dcp-method-${uid}`} checked={m.id === methodId} onChange={() => setMethodId(m.id)} />
                <span>{m.label}</span>
              </label>
            ))}
          </fieldset>
        </div>

        <p className="dcp-summary" role="status" aria-live="polite">
          {method.label} on this page: {nRight} of {res.length} questions answered correctly.
        </p>

        <div className="dcp-out">
          <dl className="dcp-facts">
            <div>
              <dt>What it does</dt>
              <dd>{method.what}</dd>
            </div>
            <div>
              <dt>Good at</dt>
              <dd>{method.good}</dd>
            </div>
            <div>
              <dt>Bad at</dt>
              <dd>{method.bad}</dd>
            </div>
            <div>
              <dt>Cost and speed</dt>
              <dd>{method.cost}</dd>
            </div>
          </dl>

          <p className="dcp-label">Extracted text (scripted, illustrative)</p>
          <pre className="dcp-pre" tabIndex={0} aria-label="Extracted text">
            {out.text === '' ? '(nothing extracted)' : out.text}
          </pre>
          <p className="dcp-stats">
            Characters extracted: <b>{st.chars}</b>
            {st.boilerplateKept !== null && (
              <>
                {' '}
                &middot; Header and footer in the text: <b>{st.boilerplateKept ? 'yes, so they would repeat in every chunk' : 'no, dropped'}</b>
              </>
            )}
          </p>
          <p className="dcp-note">{out.note}</p>

          <p className="dcp-label">Questions a RAG system could then be asked</p>
          <ul className="dcp-qs">
            {res.map((r) => (
              <li key={r.question.id} className={`dcp-q dcp-${r.status}`}>
                <span className="dcp-ask">{r.question.ask}</span>
                <span className="dcp-chip">
                  <span aria-hidden="true">{STATUS_ICON[r.status]}</span> {STATUS_LABEL[r.status]}
                </span>
                <span className="dcp-line">{r.line}</span>
              </li>
            ))}
          </ul>

          <p className="dcp-label">All five methods on this page</p>
          <table className="dcp-cmp">
            <thead>
              <tr>
                <th scope="col">Method</th>
                {page.questions.map((q, i) => (
                  <th key={q.id} scope="col">
                    Question {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METHODS.map((m) => (
                <tr key={m.id} className={m.id === methodId ? 'dcp-cur' : ''}>
                  <th scope="row">{m.label}</th>
                  {outcomes(page, m.id).map((o) => (
                    <td key={o.question.id} className={`dcp-${o.status}`}>
                      <span aria-hidden="true">{STATUS_ICON[o.status]}</span> {STATUS_LABEL[o.status]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Root>
  );
}
