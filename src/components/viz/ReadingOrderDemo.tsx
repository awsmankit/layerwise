import { useState } from 'react';
import { Root } from './shared';
import { FOOTER_TEXT, HEADER_TEXT, KEY_SENTENCE, LEAFLET, QUESTION, TRUE_ORDER, columnOrder, judge, naiveOrder, type PageBlock } from '../../lib/reading-order';

/*
 * "Reading order": the learner taps the blocks of a two-column page in the order a parser should emit them and sees
 * the text that results, and whether the sentence that crosses the column gap survives. Taps only, no dragging.
 * The page and the logic live in lib/reading-order.ts and are unit tested. Invented example text.
 */

export default function ReadingOrderDemo() {
  const [order, setOrder] = useState<string[]>([]);
  const verdict = judge(LEAFLET, order);

  const toggle = (id: string) => setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const column = (zone: 'L' | 'R') => LEAFLET.filter((b) => b.zone === zone);

  const blockButton = (b: PageBlock) => {
    const pos = order.indexOf(b.id);
    return (
      <button
        key={b.id}
        type="button"
        className={`dcp-blk${pos >= 0 ? ' dcp-on' : ''}`}
        aria-pressed={pos >= 0}
        aria-label={`${pos >= 0 ? `Position ${pos + 1}. ` : 'Not yet placed. '}Block ${b.id}: ${b.text}`}
        onClick={() => toggle(b.id)}
      >
        <span className="dcp-tag">{b.id}</span>
        <span className="dcp-blktext">{b.text}</span>
        {pos >= 0 && (
          <span className="dcp-badge" aria-hidden="true">
            {pos + 1}
          </span>
        )}
      </button>
    );
  };

  return (
    <Root>
      <div className="viz dcp-ro">
        <p className="viz-title">Tap the blocks in reading order</p>
        <p className="viz-cap" style={{ marginTop: 0 }}>
          Invented example: a bike-shop warranty leaflet. Tap each block in the order a person reads it. Tap a placed block again to take it out. Question to answer afterwards: &ldquo;{QUESTION}&rdquo;
        </p>

        <div className="dcp-page">
          <p className="dcp-furn-line">{HEADER_TEXT}</p>
          <div className="dcp-cols">
            <div className="dcp-col">{column('L').map(blockButton)}</div>
            <div className="dcp-col">{column('R').map(blockButton)}</div>
          </div>
          <p className="dcp-furn-line">{FOOTER_TEXT}</p>
        </div>
        <p className="viz-cap" style={{ marginTop: '0.4rem' }}>
          The header and footer are page furniture: a good parser drops them (the next demo shows what happens when it does not).
        </p>

        <div className="dcp-actions">
          <button type="button" className="btn quiet" onClick={() => setOrder((o) => o.slice(0, -1))} disabled={order.length === 0}>
            Undo last
          </button>
          <button type="button" className="btn quiet" onClick={() => setOrder([])} disabled={order.length === 0}>
            Start again
          </button>
          <button type="button" className="btn quiet" onClick={() => setOrder(naiveOrder(LEAFLET))}>
            Show the naive order
          </button>
          <button type="button" className="btn quiet" onClick={() => setOrder(columnOrder(LEAFLET))}>
            Show the layout-aware order
          </button>
        </div>

        <div className="dcp-result" role="status" aria-live="polite">
          <p className="dcp-label">Your order</p>
          <p className="dcp-seq">{order.length === 0 ? 'Nothing placed yet.' : order.join(' → ')}</p>
          <p className="dcp-label">Text the parser would emit</p>
          <blockquote className="dcp-quote">{order.length === 0 ? '(empty)' : verdict.text}</blockquote>
          <p className={`dcp-verdict${verdict.complete ? (verdict.sentenceIntact ? ' dcp-goodtxt' : ' dcp-badtxt') : ''}`}>{verdict.message}</p>
          {verdict.complete && (
            <p className="dcp-small">
              Sentence needed for the question: &ldquo;{KEY_SENTENCE}&rdquo; &middot; {verdict.sentenceIntact ? 'intact' : 'broken'} &middot; Order score {Math.round(verdict.score * 100)}% &middot; Neighbouring
              blocks kept together {Math.round(verdict.pairs * 100)}%
            </p>
          )}
          {verdict.complete && order.join() === TRUE_ORDER.join() && <p className="dcp-small">Same as the layout-aware order.</p>}
        </div>
      </div>
    </Root>
  );
}
