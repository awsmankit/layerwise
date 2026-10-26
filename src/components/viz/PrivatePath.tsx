import { useState } from 'react';
import { motion } from 'motion/react';
import { Root } from './shared';
import { Glyph } from './glyphs';

type Mode = 'public' | 'private';

const NOTES: Record<Mode, string> = {
  public: 'By default, calls go to the provider’s public endpoint, protected by TLS and authentication.',
  private:
    'With a private endpoint, traffic stays on the cloud’s private network. Private DNS must resolve the service name to the endpoint: wrong DNS is a common cause of “it works from my laptop but not from the cluster”.',
};

/**
 * Two ways from your application to a model API: the default public endpoint,
 * or a private endpoint that keeps traffic on the cloud's own network.
 */
export default function PrivatePath() {
  const [mode, setMode] = useState<Mode>('public');
  const on = (m: Mode) => ({ opacity: mode === m ? 1 : 0.18 });

  return (
    <Root>
      <div className="viz dx">
        <div className="dx-top">
          <p className="viz-title">From your app to the model</p>
          <div className="dx-steps" role="group" aria-label="Network path">
            <button type="button" className="btn quiet" aria-pressed={mode === 'public'} onClick={() => setMode('public')}>
              Default path
            </button>
            <button type="button" className="btn quiet" aria-pressed={mode === 'private'} onClick={() => setMode('private')}>
              Private endpoint
            </button>
          </div>
        </div>

        <svg viewBox="0 0 740 240" className="dx-svg" role="img" aria-label={NOTES[mode]}>
          {/* your network */}
          <rect x="20" y="40" width="210" height="180" rx="12" className="dx-frame" />
          <text x="34" y="62" className="dx-small">your network (VPC or VNet)</text>
          <rect x="44" y="80" width="160" height="50" rx="8" className="dx-core" />
          <g className="ng-glyph">
            <Glyph name="server" size={22} x={56} y={94} />
          </g>
          <text x="88" y="110" className="dx-name">Your app</text>
          <motion.g initial={false} animate={on('private')} transition={{ duration: 0.35 }}>
            <rect x="44" y="152" width="160" height="50" rx="8" className="dx-core" />
            <text x="58" y="173" className="dx-name">Private DNS</text>
            <text x="58" y="191" className="dx-small">name to private IP</text>
            <path d="M 124 130 V 150" className="dx-link" />
          </motion.g>

          {/* the provider */}
          <rect x="510" y="40" width="210" height="180" rx="12" className="dx-frame" />
          <text x="524" y="62" className="dx-small">cloud provider</text>
          <rect x="534" y="80" width="166" height="122" rx="8" className="dx-core dx-hot" />
          <g className="dx-glyph-hot">
            <Glyph name="box" size={28} x={548} y={94} />
          </g>
          <text x="548" y="150" className="dx-name">Model service</text>
          <text x="548" y="170" className="dx-small">TLS and authentication</text>
          <text x="548" y="186" className="dx-small">on both paths</text>

          {/* default: the public endpoint */}
          <motion.g initial={false} animate={on('public')} transition={{ duration: 0.35 }}>
            <path d="M 204 98 C 280 98, 300 30, 370 30 C 440 30, 460 98, 532 98" className="dx-link" />
            <path d="M 525 94 L 532 98 L 525 102" className="dx-link" />
            <g className="ng-glyph">
              <Glyph name="cloud" size={26} x={357} y={14} />
            </g>
            <text x="370" y="62" textAnchor="middle" className="dx-small">public endpoint</text>
          </motion.g>

          {/* private: an endpoint inside the cloud's private network */}
          <motion.g initial={false} animate={on('private')} transition={{ duration: 0.35 }}>
            <path d="M 204 115 C 240 115, 250 160, 290 160" className="dx-residual" />
            <rect x="290" y="138" width="160" height="46" rx="8" className="dx-core dx-hot" />
            <g className="dx-glyph-hot">
              <Glyph name="lock" size={18} x={300} y={152} />
            </g>
            <text x="324" y="166" className="dx-name">Private endpoint</text>
            <path d="M 450 160 C 490 160, 500 150, 532 150" className="dx-residual" />
            <path d="M 525 146 L 532 150 L 525 154" className="dx-link" style={{ stroke: 'var(--signal)' }} />
            <text x="370" y="204" textAnchor="middle" className="dx-small">PrivateLink, Private Endpoints,</text>
            <text x="370" y="219" textAnchor="middle" className="dx-small">Private Service Connect</text>
          </motion.g>
        </svg>
        <p className="viz-cap">{NOTES[mode]}</p>
      </div>
    </Root>
  );
}
