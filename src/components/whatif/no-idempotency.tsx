import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { MAX_ATTEMPTS, ORDERS, dollars, idempotencyKey, run, summarise, type Net, type Order } from '../../lib/whatif/no-idempotency';

const GREEN = '#1f9d6b';
const RED = '#d6453d';
const AX = 52; // agent lifeline
const SX = 300; // server lifeline
const STEP_H = 112;

const NET_LABEL: Record<Net, string> = { ok: 'reply arrives', 'request-lost': 'request lost on the way', 'reply-lost': 'reply lost on the way' };

/** The messages for one order: each attempt is a request, what the server did, and the reply (or its loss). */
function Sequence({ order, keyed }: { order: Order; keyed: boolean }) {
  const n = order.attempts.length;
  const h = 34 + n * STEP_H + 8;
  return (
    <svg
      viewBox={`0 0 360 ${h}`}
      className="dx-svg wi-svg wa-svg"
      role="img"
      aria-label={`Order ${order.id}: ${n} ${n === 1 ? 'call' : 'calls'} to the charge tool. ${order.attempts.map((a, i) => `Call ${i + 1}: ${NET_LABEL[a.net]}, server ${a.action === 'charged' ? 'charged the card' : a.action === 'replayed' ? 'recognised the key and did not charge again' : 'did nothing'}.`).join(' ')} Total charges: ${order.charges}.`}
    >
      <defs>
        <marker id="wa-id-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
        </marker>
      </defs>
      <text x={AX} y={14} textAnchor="middle" className="wa-tb">Agent</text>
      <text x={SX} y={14} textAnchor="middle" className="wa-tb">Payment server</text>
      <line x1={AX} x2={AX} y1={22} y2={h - 4} stroke="currentColor" opacity={0.3} strokeWidth={2} />
      <line x1={SX} x2={SX} y1={22} y2={h - 4} stroke="currentColor" opacity={0.3} strokeWidth={2} />
      {order.attempts.map((a, i) => {
        const y = 34 + i * STEP_H;
        const reqEnd = a.net === 'request-lost' ? 176 : SX - 3;
        const repStart = SX - 3;
        const repEnd = a.net === 'reply-lost' ? 176 : AX + 4;
        const dup = a.action === 'charged' && order.attempts.slice(0, i).some((p) => p.action === 'charged');
        const color = a.action === 'charged' ? (dup ? RED : GREEN) : GREEN;
        return (
          <motion.g key={order.id + '-' + i + '-' + keyed} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: EASE, delay: i * 0.18 }} style={{ color: 'var(--ink)' }}>
            <text x={(AX + SX) / 2} y={y - 2} textAnchor="middle" className="wa-t">
              call {i + 1}: charge {dollars(order.cents)}
            </text>
            {keyed && (
              <text x={(AX + SX) / 2} y={y + 13} textAnchor="middle" className="wa-t2">
                key {idempotencyKey(order.id)}
              </text>
            )}
            <line x1={AX + 2} x2={reqEnd} y1={y + 24} y2={y + 24} stroke="currentColor" strokeWidth={2} markerEnd={a.net === 'request-lost' ? undefined : 'url(#wa-id-ah)'} />
            {a.net === 'request-lost' && (
              <text x={reqEnd + 8} y={y + 29} className="wa-tb" style={{ fill: RED }} fontSize={16}>✗</text>
            )}
            {a.net === 'request-lost' ? (
              <text x={SX - 4} y={y + 48} textAnchor="end" className="wa-t2">never arrived, nothing charged</text>
            ) : (
              <>
                <text x={SX - 6} y={y + 44} textAnchor="end" className="wa-tb" style={{ fill: a.action === 'charged' ? color : GREEN }}>
                  {a.action === 'charged' ? (dup ? '✗ charged AGAIN ' : '✓ charged ') + dollars(order.cents) : '✓ key seen, saved reply sent'}
                </text>
                <line x1={repStart} x2={repEnd} y1={y + 58} y2={y + 58} stroke="currentColor" strokeWidth={2} strokeDasharray="6 4" markerEnd={a.net === 'reply-lost' ? undefined : 'url(#wa-id-ah)'} />
                {a.net === 'reply-lost' && (
                  <>
                    <text x={repEnd - 8} y={y + 63} textAnchor="end" className="wa-tb" style={{ fill: RED }} fontSize={16}>✗</text>
                    <text x={SX - 4} y={y + 76} textAnchor="end" className="wa-t2">reply lost</text>
                  </>
                )}
              </>
            )}
            {a.net !== 'ok' && i < n - 1 && (
              <text x={AX + 6} y={y + 92} className="wa-t2">no reply, try again</text>
            )}
            {a.net !== 'ok' && i === n - 1 && (
              <text x={AX + 6} y={y + 92} className="wa-t2">no reply, give up</text>
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}

/**
 * 20 scripted orders. The same dropped messages are replayed with and without an idempotency key.
 * Pick an order to see its messages. A cell shows how many times that order was charged.
 */
export default function NoIdempotencyWhatIf() {
  const [keyed, setKeyed] = useState(false);
  const orders = run(keyed);
  const plain = run(false);
  const firstDup = plain.findIndex((o) => o.charges > 1) + 1;
  const [sel, setSel] = useState(firstDup || 1);
  const [done, setDone] = useState(ORDERS);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setDone((d) => {
        if (d >= ORDERS) {
          setPlaying(false);
          return d;
        }
        return d + 1;
      });
    }, 160);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing]);

  const play = () => {
    setDone(0);
    setPlaying(true);
  };
  const seen = orders.slice(0, done);
  const s = summarise(seen);
  const full = summarise(orders);
  const order = orders[sel - 1];

  const verdict = keyed ? (
    <>
      With a key the server recognised {full.replays} retries and sent back its saved reply. {full.duplicates} orders were charged twice, and the total taken is {dollars(full.totalCents)}, exactly what was owed. Order 3 was never charged because every call was lost: a key cannot fix that.
    </>
  ) : (
    <>
      Without a key, {full.duplicates} of {full.orders} orders were charged more than once: {full.extraCharges} extra charges and {dollars(full.extraCents)} taken that was never owed (out of {dollars(full.totalCents)} taken in total).
    </>
  );

  return (
    <WhatIfFrame
      title="20 orders, a network that drops some messages"
      withLabel="With an idempotency key"
      withoutLabel="Without one"
      on={keyed}
      onChange={(v) => setKeyed(v)}
      verdict={verdict}
      controls={
        <div className="wa-btns">
          <button type="button" className="btn quiet" onClick={play}>
            {playing ? 'Playing…' : 'Play it'}
          </button>
          <span className="wa-count" aria-live="polite">Orders processed: <b>{done}</b> of {ORDERS}</span>
        </div>
      }
    >
      <p className="wa-lead">
        An agent charges a customer for each order. Sometimes the network drops the server's reply after the charge already happened. The agent cannot tell, so it tries again (up to {MAX_ATTEMPTS} calls). An idempotency key is a label the agent puts on the request, the same label on every retry, so the server can say "I have already done this one".
      </p>
      <ol className="wa-orders" aria-label="The 20 orders. Pick one to see its messages.">
        {orders.map((o, i) => {
          const visible = i < done;
          const cls = o.charges > 1 ? 'is-bad' : o.charges === 0 ? 'is-hold' : 'is-good';
          return (
            <li key={o.id}>
              <button type="button" className={'wa-order ' + (visible ? cls : 'is-wait') + (sel === o.id ? ' is-sel' : '')} aria-pressed={sel === o.id} onClick={() => setSel(o.id)}
                aria-label={`Order ${o.id}, ${dollars(o.cents)}: ${visible ? (o.charges === 0 ? 'not charged' : `charged ${o.charges} ${o.charges === 1 ? 'time' : 'times'}`) : 'not processed yet'}`}>
                <span className="wa-order-n">#{o.id}</span>
                <span className="wa-order-c">{visible ? (o.charges === 0 ? 'none' : o.charges > 1 ? `✗ ×${o.charges}` : '✓ ×1') : '…'}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="wa-note">Green ✓ = charged once. Red ✗ = charged more than once. Dashed = never charged.</p>

      <p className="wa-who" style={{ marginTop: '0.8rem' }}>Order {order.id}, {dollars(order.cents)}: the messages</p>
      <Sequence order={order} keyed={keyed} />

      <ul className="wa-stats" aria-label="Counts so far">
        <li className={s.duplicates ? 'is-bad' : 'is-good'}><span>orders charged twice or more</span><b>{s.duplicates}</b></li>
        <li className={s.extraCharges ? 'is-bad' : 'is-good'}><span>extra charges</span><b>{s.extraCharges}</b></li>
        <li className={s.extraCents ? 'is-bad' : 'is-good'}><span>money taken that was not owed</span><b>{dollars(s.extraCents)}</b></li>
        <li><span>retries the server recognised</span><b>{s.replays}</b></li>
      </ul>
      <p className="wa-note">
        Scripted toy run: a seeded random generator decides which messages are lost (10% of requests, 25% of replies), and the same dropped messages are replayed in both modes. The seed was chosen so that every case appears. Amounts are example dollars. The key must be the same on every retry of one order; a new key per retry would look like a new order and charge again.
      </p>
    </WhatIfFrame>
  );
}
