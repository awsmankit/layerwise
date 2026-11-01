import { Root } from './shared';

const W = 290;
const H = 262;
const BELT = 44;

const COLS: { x: number; title: string; lines: string[] }[] = [
  { x: 0, title: 'forget gate', lines: ['keep how', 'much of', 'the old?'] },
  { x: 100, title: 'input gate', lines: ['write how', 'much of', 'the new?'] },
  { x: 200, title: 'output gate', lines: ['show how', 'much of', 'the memory?'] },
];

/**
 * One LSTM cell in a single picture: a conveyor belt (the cell state) with three gates that each
 * answer one question with a number from 0 to 1. A static diagram, with text alternatives.
 */
export default function LstmDiagram() {
  return (
    <Root>
      <figure className="viz wa-lstm">
        <figcaption className="viz-title">One LSTM cell: a belt and three gates</figcaption>
        <svg
          className="wa-svg wa-fig"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="An LSTM cell. A horizontal conveyor belt carries the memory, called the cell state, from left to right. The forget gate multiplies the old memory by a number between 0 and 1. The input gate decides how much of a new candidate value to add. The output gate decides how much of the memory to show as the output."
        >
          <defs>
            <marker id="wa-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L8 4 L0 8 z" className="wa-arrowhead" />
            </marker>
          </defs>
          <text x={2} y={16} className="wa-t wa-t-strong">
            cell state c (the belt)
          </text>
          <path d={`M2 ${BELT} H${W - 14}`} className="wa-belt" markerEnd="url(#wa-arrow)" />
          <text x={W - 2} y={BELT - 8} textAnchor="end" className="wa-t">
            new c
          </text>

          <circle cx={45} cy={BELT} r={11} className="wa-op" />
          <text x={45} y={BELT + 5} textAnchor="middle" className="wa-t wa-t-strong">
            ×
          </text>
          <circle cx={145} cy={BELT} r={11} className="wa-op" />
          <text x={145} y={BELT + 5} textAnchor="middle" className="wa-t wa-t-strong">
            +
          </text>

          {COLS.map((c, i) => (
            <g key={c.title}>
              <rect x={c.x} y={118} width={90} height={92} rx={8} className="wa-box" />
              <text x={c.x + 45} y={140} textAnchor="middle" className="wa-t wa-t-strong">
                {c.title}
              </text>
              {c.lines.map((l, k) => (
                <text key={l} x={c.x + 45} y={162 + k * 16} textAnchor="middle" className="wa-t">
                  {l}
                </text>
              ))}
              {i === 0 && <path d={`M45 118 V${BELT + 12}`} className="wa-flow" markerEnd="url(#wa-arrow)" />}
              {i === 1 && <path d={`M145 118 V${BELT + 12}`} className="wa-flow" markerEnd="url(#wa-arrow)" />}
              {i === 2 && (
                <>
                  <path d={`M245 ${BELT} V118`} className="wa-flow wa-dash" markerEnd="url(#wa-arrow)" />
                </>
              )}
            </g>
          ))}
          <text x={53} y={90} className="wa-t">
            × a number
          </text>
          <text x={53} y={106} className="wa-t">
            from 0 to 1
          </text>
          <text x={153} y={90} className="wa-t">
            + new value
          </text>
          <text x={153} y={106} className="wa-t">
            (candidate)
          </text>
          <text x={253} y={84} className="wa-t">
            tanh
          </text>
          <path d="M245 210 V232" className="wa-flow" markerEnd="url(#wa-arrow)" />
          <text x={245} y={254} textAnchor="middle" className="wa-t wa-t-strong">
            output h
          </text>
        </svg>
        <p className="viz-cap">
          Each gate is a small neural layer that reads the new input and the previous output and squashes its answer to between 0 (nothing gets through) and 1 (everything does). The belt is changed only by multiplying and adding, which is why it carries information
          over many steps.
        </p>
      </figure>
    </Root>
  );
}
