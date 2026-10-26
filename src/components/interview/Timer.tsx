import { useEffect, useRef, useState } from 'react';

const mmss = (s: number) => `${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, '0')}`;

/** A countdown for a question's time box. It keeps counting past zero, so you can see how far over you went. */
export default function Timer({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => setLeft(minutes * 60), [minutes]);

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [running]);

  const over = left < 0;
  const pct = Math.max(0, Math.min(1, left / (minutes * 60)));

  return (
    <div className={`iv-timer${over ? ' over' : ''}`}>
      <span className="iv-timer-ring" style={{ '--p': pct } as React.CSSProperties} aria-hidden="true" />
      <span className="iv-timer-read num" role="timer" aria-live="off">
        {over ? `+${mmss(left)} over` : `${mmss(left)} left`}
      </span>
      <button type="button" className="btn quiet" onClick={() => setRunning((r) => !r)}>
        {running ? 'Pause' : left === minutes * 60 ? 'Start the clock' : 'Resume'}
      </button>
      <button type="button" className="btn quiet" onClick={() => { setRunning(false); setLeft(minutes * 60); }} disabled={left === minutes * 60}>
        Reset
      </button>
    </div>
  );
}
