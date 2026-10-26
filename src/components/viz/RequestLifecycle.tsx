import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE, fmt } from './shared';

const stages = [
  {
    id: 'route',
    title: 'Authenticate and route',
    body: 'Your identity and permissions are checked, then the request is routed to a regional endpoint and on to a fleet of accelerators that serve this model.',
  },
  {
    id: 'tokenize',
    title: 'Tokenize',
    body: 'Your text becomes integer token IDs. Tokens are the unit you are billed in and the unit the context window is measured in.',
  },
  {
    id: 'prefill',
    title: 'Prefill',
    body: 'The model reads the whole prompt in one parallel pass and fills the KV cache. This is limited by compute, and its duration is your time to first token.',
  },
  {
    id: 'decode',
    title: 'Decode',
    body: 'Output tokens are produced one at a time. Each step reads the weights and the KV cache from memory, so this phase is limited by memory bandwidth.',
  },
  {
    id: 'batch',
    title: 'Batch with other users',
    body: 'The server interleaves many requests on the same chips and swaps finished ones for waiting ones at every step (continuous batching). That keeps hardware busy and per-token prices low. It is also why you can be throttled.',
  },
  {
    id: 'stream',
    title: 'Stream back',
    body: 'Tokens are sent as they are generated. Output filters such as guardrails can run on the stream, and the final usage counts are what you are billed on.',
  },
] as const;

const sample = ['Explain', ' the', ' KV', ' cache', ' in', ' one', ' paragraph', '.'];
const sampleIds = [15234, 279, 85411, 6636, 304, 832, 14646, 13];
const reply = ['The', ' KV', ' cache', ' stores', ' the', ' attention', ' keys', ' and', ' values', ' …'];

function RouteVisual() {
  const nodes = ['Your app', 'Access check', 'Regional endpoint', 'Model fleet'];
  return (
    <div className="rl-route">
      <div className="rl-route-line" />
      <motion.span
        className="rl-packet"
        initial={{ left: '4%' }}
        animate={{ left: '96%' }}
        transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
      />
      {nodes.map((n, i) => (
        <motion.div
          key={n}
          className="rl-route-node"
          style={{ left: `${4 + (i * 92) / (nodes.length - 1)}%` }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.18, duration: 0.4, ease: EASE }}
        >
          <span className="rl-dot" />
          {n}
        </motion.div>
      ))}
    </div>
  );
}

function TokenizeVisual() {
  return (
    <div className="rl-tokens">
      {sample.map((t, i) => (
        <motion.span
          key={i}
          className="rl-token"
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15 + i * 0.12, duration: 0.35, ease: EASE }}
        >
          <span className="rl-token-text">{t.replace(' ', ' ')}</span>
          <span className="rl-token-id num">{sampleIds[i]}</span>
        </motion.span>
      ))}
    </div>
  );
}

function PrefillVisual() {
  return (
    <div>
      <div className="rl-cells">
        {Array.from({ length: 32 }).map((_, i) => (
          <motion.span
            key={i}
            className="rl-cell"
            initial={{ opacity: 0.12 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + (i % 8) * 0.015, duration: 0.5 }}
          />
        ))}
      </div>
      <p className="rl-note">Every prompt token is processed at the same time.</p>
    </div>
  );
}

function DecodeVisual() {
  const total = 20;
  return (
    <div>
      <div className="rl-cells">
        {Array.from({ length: total }).map((_, i) => (
          <motion.span
            key={i}
            className="rl-cell"
            initial={{ opacity: 0.12 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.16, duration: 0.25 }}
          />
        ))}
      </div>
      <div className="rl-kv">
        <span className="rl-kv-label">KV cache</span>
        <span className="rl-kv-bar">
          <motion.span
            className="rl-kv-fill"
            initial={{ scaleX: 0.3 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.2, duration: total * 0.16, ease: 'linear' }}
          />
        </span>
      </div>
      <p className="rl-note">One new token per step. The cache grows with every token.</p>
    </div>
  );
}

// Each lane is a request; filled steps are the decode steps it takes part in.
const lanes: { name: string; ours?: boolean; spans: [number, number][] }[] = [
  { name: 'Your request', ours: true, spans: [[0, 14]] },
  { name: 'Request B', spans: [[0, 7], [8, 14]] },
  { name: 'Request C', spans: [[0, 14]] },
  { name: 'Request D', spans: [[3, 9], [10, 14]] },
];

function BatchVisual() {
  const steps = 14;
  return (
    <div>
      <div className="rl-lanes">
        {lanes.map((lane, li) => (
          <div key={lane.name} className="rl-lane">
            <span className={`rl-lane-name${lane.ours ? ' ours' : ''}`}>{lane.name}</span>
            <span className="rl-lane-track">
              {Array.from({ length: steps }).map((_, s) => {
                const active = lane.spans.some(([a, b]) => s >= a && s <= b);
                const isStart = lane.spans.some(([a]) => a === s && s > 0);
                return (
                  <motion.span
                    key={s}
                    className={`rl-step${active ? ' on' : ''}${lane.ours ? ' ours' : ''}${isStart ? ' join' : ''}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: li * 0.08 + s * 0.03 }}
                  />
                );
              })}
            </span>
          </div>
        ))}
        <div className="rl-sweep-zone" aria-hidden="true">
          <motion.span
            className="rl-sweep"
            initial={{ left: '0%' }}
            animate={{ left: '100%' }}
            transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
          />
        </div>
      </div>
      <p className="rl-note">Gaps close as finished requests leave and waiting ones join at the next step.</p>
    </div>
  );
}

function StreamVisual() {
  return (
    <div>
      <p className="rl-stream">
        {reply.map((w, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.22, duration: 0.2 }}
          >
            {w}
          </motion.span>
        ))}
        <motion.span
          className="rl-caret"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
        />
      </p>
      <p className="rl-note">Usage is reported with the response: input tokens, output tokens, and any cache hits.</p>
    </div>
  );
}

const visuals = [RouteVisual, TokenizeVisual, PrefillVisual, DecodeVisual, BatchVisual, StreamVisual];

export default function RequestLifecycle() {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [promptTokens, setPromptTokens] = useState(2000);
  const [outputTokens, setOutputTokens] = useState(300);
  const [prefillSpeed, setPrefillSpeed] = useState(8000);
  const [decodeSpeed, setDecodeSpeed] = useState(50);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStage((s) => {
        if (s >= stages.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 3200);
    return () => clearInterval(id);
  }, [playing]);

  const prefillMs = (promptTokens / prefillSpeed) * 1000;
  const decodeMs = (outputTokens / decodeSpeed) * 1000;
  const totalMs = prefillMs + decodeMs;
  const Visual = visuals[stage];

  return (
    <Root>
      <div className="viz rl">
        <div className="rl-steps" role="tablist" aria-label="Request stages">
          <span className="rl-steps-line" aria-hidden="true" />
          <motion.span
            className="rl-steps-fill"
            aria-hidden="true"
            initial={false}
            animate={{ scaleX: stage / (stages.length - 1) }}
            transition={{ duration: 0.5, ease: EASE }}
          />
          {stages.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === stage}
              className={`rl-step-btn${i === stage ? ' is-active' : ''}${i < stage ? ' is-past' : ''}`}
              onClick={() => {
                setStage(i);
                setPlaying(false);
              }}
            >
              <span className="rl-step-dot" />
              <span className="rl-step-name">{s.title}</span>
            </button>
          ))}
        </div>

        <div className="rl-stage">
          <div className="rl-stage-text">
            <AnimatePresence mode="wait">
              <motion.div
                key={stage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <h3>{stages[stage].title}</h3>
                <p>{stages[stage].body}</p>
              </motion.div>
            </AnimatePresence>
            <div className="rl-buttons">
              <button
                type="button"
                className="btn quiet"
                onClick={() => {
                  if (!playing && stage >= stages.length - 1) setStage(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? 'Pause' : stage >= stages.length - 1 ? 'Replay' : 'Play'}
              </button>
              <button
                type="button"
                className="btn quiet"
                disabled={stage === 0}
                onClick={() => {
                  setStage((s) => Math.max(0, s - 1));
                  setPlaying(false);
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="btn quiet"
                disabled={stage === stages.length - 1}
                onClick={() => {
                  setStage((s) => Math.min(stages.length - 1, s + 1));
                  setPlaying(false);
                }}
              >
                Next
              </button>
            </div>
          </div>
          <div className="rl-stage-visual" aria-live="off">
            <AnimatePresence mode="wait">
              <motion.div
                key={stage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Visual />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="rl-calc">
          <p className="viz-title">Where the time goes</p>
          <div className="viz-controls">
            <label className="field">
              <span>
                Prompt tokens <b>{fmt.int(promptTokens)}</b>
              </span>
              <input type="range" min={100} max={50000} step={100} value={promptTokens} onChange={(e) => setPromptTokens(+e.target.value)} />
            </label>
            <label className="field">
              <span>
                Output tokens <b>{fmt.int(outputTokens)}</b>
              </span>
              <input type="range" min={10} max={20000} step={10} value={outputTokens} onChange={(e) => setOutputTokens(+e.target.value)} />
            </label>
            <label className="field">
              <span>
                Prefill speed <b>{fmt.int(prefillSpeed)} tok/s</b>
              </span>
              <input type="range" min={1000} max={30000} step={500} value={prefillSpeed} onChange={(e) => setPrefillSpeed(+e.target.value)} />
            </label>
            <label className="field">
              <span>
                Decode speed <b>{decodeSpeed} tok/s</b>
              </span>
              <input type="range" min={10} max={200} step={5} value={decodeSpeed} onChange={(e) => setDecodeSpeed(+e.target.value)} />
            </label>
          </div>
          <div className="rl-timebar" role="img" aria-label={`Prefill ${fmt.ms(prefillMs)}, decode ${fmt.ms(decodeMs)}`}>
            <motion.span className="rl-time prefill" initial={false} animate={{ flexGrow: (prefillMs / totalMs) * 100 }} transition={{ duration: 0.4, ease: EASE }} />
            <motion.span className="rl-time decode" initial={false} animate={{ flexGrow: (decodeMs / totalMs) * 100 }} transition={{ duration: 0.4, ease: EASE }} />
          </div>
          <dl className="rl-readout">
            <div>
              <dt>Time to first token</dt>
              <dd className="num">{fmt.ms(prefillMs)}</dd>
            </div>
            <div>
              <dt>Generation time</dt>
              <dd className="num">{fmt.ms(decodeMs)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd className="num">{fmt.ms(totalMs)}</dd>
            </div>
            <div>
              <dt>Billed tokens</dt>
              <dd className="num">
                {fmt.int(promptTokens)} in, {fmt.int(outputTokens)} out
              </dd>
            </div>
          </dl>
          <p className="viz-cap">
            Speeds are illustrative defaults, not measurements of any particular model or service. Real numbers depend on the model, the hardware, load and prompt caching.
          </p>
        </div>
      </div>
    </Root>
  );
}
