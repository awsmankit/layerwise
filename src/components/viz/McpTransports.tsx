import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Root } from './shared';
import { Glyph } from './glyphs';

type Mode = 'stdio' | 'http';

const NOTES: Record<Mode, string> = {
  stdio:
    'The client starts the server as a subprocess and talks over its standard streams. Nothing crosses the network, so there is no sign-in step: credentials come from the environment.',
  http: 'Every message is an HTTP POST to one endpoint, so one server can serve many clients. This is where OAuth tokens, Origin checks and gateways come in.',
};

/**
 * The two standard ways to carry MCP messages: a local subprocess pipe, or a
 * network endpoint. Same messages, different delivery.
 */
export default function McpTransports() {
  const [mode, setMode] = useState<Mode>('stdio');
  const reduce = useReducedMotion();
  const show = (m: Mode) => ({ opacity: mode === m ? 1 : 0 });

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">Two ways to carry the same messages</p>
          <div className="dx-steps" role="group" aria-label="Transport">
            <button type="button" className="btn quiet" aria-pressed={mode === 'stdio'} onClick={() => setMode('stdio')}>
              stdio
            </button>
            <button type="button" className="btn quiet" aria-pressed={mode === 'http'} onClick={() => setMode('http')}>
              Streamable HTTP
            </button>
          </div>
        </div>

        <svg viewBox="0 0 740 240" className="dx-svg" role="img" aria-label={NOTES[mode]}>
          {/* stdio: both ends on one machine */}
          <motion.g initial={false} animate={show('stdio')} transition={{ duration: 0.3 }}>
            <rect x="12" y="32" width="716" height="196" rx="14" className="dx-frame" />
            <text x="26" y="52" className="dx-small">one machine</text>
            <path d="M 210 108 H 524 M 517 103 L 524 108 L 517 113" className="dx-link" />
            <text x="367" y="100" textAnchor="middle" className="dx-small">stdin: requests, one per line</text>
            <path d="M 530 150 H 216 M 223 145 L 216 150 L 223 155" className="dx-residual" />
            <text x="367" y="170" textAnchor="middle" className="dx-small">stdout: replies, one per line</text>
            <text x="367" y="204" textAnchor="middle" className="dx-small">stderr is for logs only; anything else on stdout breaks the messages</text>
          </motion.g>

          {/* HTTP: across a network, with a token */}
          <motion.g initial={false} animate={show('http')} transition={{ duration: 0.3 }}>
            <Glyph name="cloud" size={30} x={352} y={26} className="ng-glyph" />
            <text x="367" y="76" textAnchor="middle" className="dx-small">the network</text>
            <path d="M 210 108 H 524 M 517 103 L 524 108 L 517 113" className="dx-link" />
            <text x="367" y="100" textAnchor="middle" className="dx-small">POST to one URL, with a token</text>
            <path d="M 530 150 H 216 M 223 145 L 216 150 L 223 155" className="dx-residual" />
            <text x="367" y="170" textAnchor="middle" className="dx-small">reply: JSON or an event stream</text>
            <Glyph name="lock" size={16} x={30} y={194} className="ng-glyph" />
            <text x="52" y="207" className="dx-small">token in the Authorization header</text>
            <text x="710" y="207" textAnchor="end" className="dx-small">server checks Origin and token</text>
          </motion.g>

          {/* the two ends, the same in both modes */}
          <rect x="30" y="70" width="180" height="110" rx="12" className="dx-core" />
          <Glyph name="network" size={24} x={44} y={84} className="ng-glyph" />
          <text x="44" y="128" className="dx-name">Client</text>
          <text x="44" y="146" className="dx-small">inside the host app</text>

          <rect x="530" y="70" width="180" height="110" rx="12" className="dx-core dx-hot" />
          <Glyph name="server" size={24} x={544} y={84} className="dx-glyph-hot" />
          <text x="544" y="128" className="dx-name">Server</text>
          <text x="544" y="146" className="dx-small">{mode === 'stdio' ? 'started by the client' : 'one URL, many clients'}</text>

          {!reduce && (
            <motion.circle
              key={mode}
              cy="108"
              r="4"
              className="dx-packet"
              initial={{ cx: 216, opacity: 0 }}
              animate={{ cx: [216, 524], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.6 }}
            />
          )}
        </svg>
        <p className="viz-cap">{NOTES[mode]}</p>
      </div>
    </Root>
  );
}
