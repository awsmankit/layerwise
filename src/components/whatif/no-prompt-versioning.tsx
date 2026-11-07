import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { bisectRefunds, cases, categories, categoryLabel, diffAt, edits, history, promptAt, VERSIONS } from '../../lib/whatif/no-prompt-versioning';

const LAST = VERSIONS - 1;
const LX = 58;
const CW = 33;
const GAP = 2;
const RH = 26;
const RG = 3;
const HEAD_Y = 40;
const colX = (v: number) => LX + v * (CW + GAP);
const rowY = (r: number) => HEAD_Y + r * (RH + RG);
const TOTAL_ROW = categories.length;
const rowEnd = rowY(TOTAL_ROW) + RH + 6;

/**
 * A grid of how many of the 8 cases in each group pass, for each saved version of the prompt. With versions you can read
 * across a row and see where it dropped. Without them only the live column exists.
 */
export default function NoPromptVersioningWhatIf() {
  const [versioned, setVersioned] = useState(true);
  const [sel, setSel] = useState(LAST);
  const [probe, setProbe] = useState(0);

  const b = useMemo(() => bisectRefunds(), []);
  const shownV = versioned ? sel : LAST;
  const sc = history[shownV];
  const prevRefund = shownV > 0 ? history[shownV - 1].by.refund : sc.by.refund;
  const live = history[LAST];
  const done = probe >= b.tested.length;
  const lines = promptAt(shownV);
  const diff = diffAt(shownV);
  const failingRefund = cases.filter((c) => c.category === 'refund' && sc.failing.includes(c.id));
  const culprit = b.culprit;

  const testedNow = b.tested.slice(0, probe);
  const mark = (v: number): 'good' | 'bad' | null => (testedNow.includes(v) ? (history[v].by.refund < 8 ? 'bad' : 'good') : null);

  const verdict = versioned ? (
    done && probe > 0 ? (
      <>
        Found it in {b.tested.length} test runs: edit {culprit}, {'“'}{edits[culprit - 1].label}{'”'}. It took refund cases from {history[culprit - 1].by.refund} to {history[culprit].by.refund} passing while the total stayed at {history[culprit].total} of 40. Saved versions let you undo it.
      </>
    ) : (
      <>
        Version {shownV}{shownV > 0 ? ` (${edits[shownV - 1].label})` : ' (the start)'}: {sc.total} of 40 cases pass, refunds {sc.by.refund} of 8.
        {shownV > 0 && history[shownV].by.refund < prevRefund ? ` Refunds just fell from ${prevRefund}.` : ''} Press the button to find which edit broke refunds.
      </>
    )
  ) : (
    <>
      Edited live, you only have today{'’'}s prompt: {live.total} of 40 pass and refunds are {live.by.refund} of 8. Which of the {edits.length} edits broke refunds, and what the text said before, is lost. All {edits.length} are suspects.
    </>
  );

  const next = () => {
    if (probe >= b.tested.length) {
      setProbe(0);
      setSel(LAST);
      return;
    }
    const p = probe + 1;
    setProbe(p);
    if (p >= b.tested.length) setSel(culprit);
  };

  return (
    <WhatIfFrame
      title="Eight edits to one prompt, 40 test cases"
      withLabel="Saved versions + tests"
      withoutLabel="Live edits only"
      on={versioned}
      onChange={(v) => {
        setVersioned(v);
        setProbe(0);
      }}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Look at version <b>{versioned ? `${sel}${sel > 0 ? ` (${edits[sel - 1].label})` : ' (start)'}` : 'not kept'}</b>
            </span>
            <input type="range" min={0} max={LAST} step={1} value={versioned ? sel : LAST} disabled={!versioned} onChange={(e) => setSel(+e.target.value)} aria-label="Which saved version of the prompt to look at" aria-valuetext={`version ${sel}`} />
          </label>
          <div className="ws-btnrow">
            <button type="button" className="btn quiet" disabled={!versioned} onClick={next}>
              {!versioned ? 'No versions to search' : probe === 0 ? 'Find the broken edit' : done ? 'Start the search again' : `Run test ${probe + 1} of ${b.tested.length}`}
            </button>
          </div>
        </>
      }
    >
      <p className="ws-idea">
        A prompt is the instruction text that steers the model. Each row below is a group of 8 test cases. Each box shows how many of the 8 pass after each edit. Watch the refund row while the total keeps climbing.
      </p>
      <svg
        viewBox={`0 0 380 ${rowEnd + 24}`}
        className="dx-svg wi-svg ws-fig"
        role="img"
        aria-label={`A grid of passing test cases per group and per prompt version. ${versioned ? `Total passing rises from ${history[0].total} to ${live.total} of 40, while refund cases fall from ${history[culprit - 1].by.refund} to ${history[culprit].by.refund} at edit ${culprit}.` : `Only the live prompt is known: ${live.total} of 40 pass, refunds ${live.by.refund} of 8.`}`}
      >
        <text x={LX} y={14} className="ws-svg-h">
          Prompt version (0 is the start)
        </text>
        {Array.from({ length: VERSIONS }, (_, v) => (
          <text key={v} x={colX(v) + CW / 2} y={HEAD_Y - 8} textAnchor="middle" className="ws-svg-b" style={{ fontSize: 13 }}>
            {v}
          </text>
        ))}
        {categories.map((cat, r) => (
          <text key={cat} x={LX - 6} y={rowY(r) + RH / 2 + 4} textAnchor="end" className="ws-svg-t" style={{ fontSize: 13 }}>
            {categoryLabel[cat]}
          </text>
        ))}
        <text x={LX - 6} y={rowY(TOTAL_ROW) + RH / 2 + 4} textAnchor="end" className="ws-svg-b" style={{ fontSize: 13 }}>
          All 40
        </text>
        <motion.g key={String(versioned)} initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: EASE }}>
          {history.map((h, v) => {
            const known = versioned || v === LAST;
            return [...categories, 'total' as const].map((cat, r) => {
              const isTotal = cat === 'total';
              const n = isTotal ? h.total : h.by[cat];
              const max = isTotal ? 40 : 8;
              const x = colX(v);
              const y = rowY(r);
              if (!known) {
                return (
                  <g key={`${v}-${cat}`}>
                    <rect x={x} y={y} width={CW} height={RH} rx={4} className="ws-unk" />
                    <text x={x + CW / 2} y={y + RH / 2 + 4.5} textAnchor="middle" className="ws-svg-t" style={{ fontSize: 13 }}>
                      ?
                    </text>
                  </g>
                );
              }
              const prev = v > 0 ? (isTotal ? history[v - 1].total : history[v - 1].by[cat]) : n;
              const drop = !isTotal && n < prev;
              const f = n / max;
              return (
                <g key={`${v}-${cat}`}>
                  <rect x={x} y={y} width={CW} height={RH} rx={4} className="ws-track" />
                  <rect x={x} y={y} width={CW} height={RH} rx={4} className={drop ? 'ws-bad' : 'ws-pv-good'} fillOpacity={drop ? 1 : Math.round((0.12 + 0.88 * f) * 100) / 100} />
                  <text x={x + CW / 2} y={y + RH / 2 + 4.5} textAnchor="middle" className={`ws-cell-t${drop || f >= 0.55 ? '' : ' on-big'}`} style={drop || f >= 0.55 ? { fontSize: 13 } : { fontSize: 12.5, fill: 'var(--ink)' }}>
                    {drop ? `▼${n}` : n}
                  </text>
                </g>
              );
            });
          })}
        </motion.g>
        {versioned && <rect x={colX(sel) - 1.5} y={HEAD_Y - 2} width={CW + 3} height={rowEnd - HEAD_Y - 2} rx={5} className="ws-selbox" />}
        {versioned &&
          done &&
          probe > 0 && (
            <motion.rect initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} x={colX(culprit) - 3} y={HEAD_Y - 4} width={CW + 6} height={rowEnd - HEAD_Y} rx={6} className="ws-culprit" />
          )}
        {versioned &&
          Array.from({ length: VERSIONS }, (_, v) => {
            const m = mark(v);
            if (!m) return null;
            return (
              <text key={v} x={colX(v) + CW / 2} y={rowEnd + 12} textAnchor="middle" className={m === 'bad' ? 'ws-bad-svgt' : 'ws-t-green'} style={{ fontSize: 13 }}>
                {m === 'bad' ? '✗' : '✓'}
              </text>
            );
          })}
        <text x={LX} y={rowEnd + 28} className="ws-svg-t" style={{ fontSize: 13 }}>
          {versioned ? (probe === 0 ? 'Search tests refund cases only (✓ ok, ✗ bad).' : `Tested versions: ${testedNow.join(', ')}${done ? `. First bad: ${culprit}.` : ''}`) : 'Without saved versions, the older boxes are unknown.'}
        </text>
      </svg>

      <div className="ws-stats is-tight" role="group" aria-label="Results for this version">
        <div>
          <b>{sc.total}/40</b>
          <span>cases pass{versioned ? '' : ' (live)'}</span>
        </div>
        <div>
          <b className={sc.by.refund < 8 ? 'ws-bad-t' : ''}>{sc.by.refund}/8</b>
          <span>refund cases</span>
        </div>
        <div>
          <b>{versioned ? (done && probe > 0 ? `${b.tested.length} runs` : '3 runs') : 'no way'}</b>
          <span>to find the broken edit</span>
        </div>
      </div>

      <div className="ws-pvbox" aria-label={versioned ? `The prompt at version ${shownV}` : 'The live prompt, the only text that exists'}>
        <p className="ws-pvbox-h">{versioned ? `The prompt at version ${shownV}` : 'The live prompt (the only text kept)'}</p>
        <ol>
          {lines.map((l) => {
            const isNew = versioned && diff && l.id === edits[shownV - 1]?.id;
            return (
              <li key={l.id} className={isNew ? 'is-new' : ''}>
                {isNew && <b className="ws-pvtag">{diff?.kind === 'reword' ? 'reworded' : 'added'} </b>}
                {l.text}
              </li>
            );
          })}
        </ol>
        {failingRefund.length > 0 && (
          <p className="ws-pvbox-f">
            <b>Refund cases failing ({failingRefund.length}):</b> {failingRefund.map((c) => c.label).join('; ')}.
          </p>
        )}
      </div>

      <p className="ws-note">
        Toy data, not real model output: a scripted history of 8 edits and 40 made-up test cases. A case passes when the prompt has the lines it needs and none it cannot live with; for example the four longer refund cases cannot be answered in two sentences. The point is the pattern, not the numbers.
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <div className="ws-tablewrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Version, edit</th>
                <th>Total</th>
                <th>Refund</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, v) => (
                <tr key={v} className={versioned && v === sel ? 'is-now' : ''}>
                  <td>
                    {v}, {v === 0 ? 'start' : edits[v - 1].label}
                  </td>
                  <td>{versioned || v === LAST ? `${h.total}/40` : '?'}</td>
                  <td>{versioned || v === LAST ? `${h.by.refund}/8` : '?'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ws-note">
          Bisect: version 0 is known good for refunds (8 of 8) and version {LAST} is known bad (4 of 8). Test the middle version, keep the half that still contains the change, repeat. With 9 versions that is at most 3 tests: version {b.tested[0]}, then {b.tested[1]}, then {b.tested[2]}. Without saved versions there is nothing to test and nothing to go back to.
        </p>
      </details>
    </WhatIfFrame>
  );
}
