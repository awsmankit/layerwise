import { useState } from 'react';
import { Root } from './shared';

const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/';

/** Runnable examples. Each one does real arithmetic in the browser with Python. */
const SNIPPETS: { title: string; code: string }[] = [
  {
    title: 'Parameters from the architecture',
    code: `# Rough parameter count for a decoder-only transformer.
# Per layer: attention (4 * d^2) and a feed-forward block (8 * d^2 for a 4x MLP).
# Embeddings add vocab * d. This ignores biases and norms, so it is an estimate.
def params(layers, d, vocab):
    per_layer = 12 * d * d
    return layers * per_layer + vocab * d

for name, L, d, v in [("small", 12, 768, 50_000), ("6-7B class", 32, 4096, 32_000)]:
    print(f"{name:12s} ~{params(L, d, v) / 1e9:.2f} billion parameters")
`,
  },
  {
    title: 'Memory for the KV cache',
    code: `# Bytes for keys and values: 2 (K and V) * layers * kv_heads * head_dim * tokens * bytes per value.
def kv_cache_gb(layers, kv_heads, head_dim, tokens, bytes_per_value=2):
    return 2 * layers * kv_heads * head_dim * tokens * bytes_per_value / 1e9

for tokens in [2_048, 8_192, 32_768]:
    print(f"{tokens:6d} tokens, one request: {kv_cache_gb(32, 8, 128, tokens):.2f} GB")
`,
  },
  {
    title: 'Tokens from words (a toy split)',
    code: `# A toy tokenizer: split into words, then split long words into fixed pieces.
# Real tokenizers learn their pieces from data (byte-pair encoding), so counts differ.
text = "unhappiness is rarely a single token"
pieces = []
for word in text.split():
    pieces += [word[i:i + 4] for i in range(0, len(word), 4)]
print(pieces)
print(f"{len(pieces)} pieces for {len(text)} characters")
`,
  },
];

type Py = { runPythonAsync: (code: string) => Promise<unknown>; setStdout: (o: { batched: (s: string) => void }) => void };

/**
 * Real Python, running in the page through Pyodide. The first run downloads the
 * Python runtime (about 10 MB), so nothing loads until the learner asks for it.
 */
export default function PyPad() {
  const [index, setIndex] = useState(0);
  const [code, setCode] = useState(SNIPPETS[0].code);
  const [out, setOut] = useState('');
  const [py, setPy] = useState<Py | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (): Promise<Py> => {
    if (py) return py;
    const mod = (await import(/* @vite-ignore */ `${PYODIDE}pyodide.mjs`)) as { loadPyodide: (o: { indexURL: string }) => Promise<Py> };
    const runtime = await mod.loadPyodide({ indexURL: PYODIDE });
    setPy(runtime);
    return runtime;
  };

  const run = async () => {
    setBusy(true);
    try {
      const runtime = await load();
      const lines: string[] = [];
      runtime.setStdout({ batched: (s: string) => lines.push(s) });
      await runtime.runPythonAsync(code);
      setOut(lines.join('\n') || '(no output)');
    } catch (e) {
      setOut(String(e));
    } finally {
      setBusy(false);
    }
  };

  const pick = (i: number) => {
    setIndex(i);
    setCode(SNIPPETS[i].code);
    setOut('');
  };

  return (
    <Root>
      <div className="viz dx cs">
        <p className="viz-title">Python, running in your browser</p>
        <div className="cs-suggest">
          {SNIPPETS.map((s, i) => (
            <button key={s.title} type="button" className="btn quiet" aria-pressed={index === i} onClick={() => pick(i)}>
              {s.title}
            </button>
          ))}
        </div>
        <label className="cs-code">
          <span className="sr-only">Python code</span>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={9} spellCheck={false} />
        </label>
        <div className="cs-form">
          <button type="button" className="btn" onClick={run} disabled={busy}>
            {busy ? (py ? 'Running' : 'Loading Python') : 'Run'}
          </button>
        </div>
        <pre className="cs-result" aria-live="polite">{out || 'Press Run. The first run loads Python (about 10 MB).'}</pre>
      </div>
    </Root>
  );
}
