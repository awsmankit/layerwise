import { useState } from 'react';
import { Root } from './shared';

export type Tool = {
  name: string;
  layer: string;
  what: string;
  /** A first command, copied to the clipboard. Empty when the tool is used from a web UI. */
  first: string;
  href: string;
};

/** Official sites and first commands. Check each project's own docs before relying on a flag. */
export const tools: Tool[] = [
  {
    name: 'Hugging Face Hub',
    layer: 'Where models come from',
    what: 'Hosts model weights, datasets and demos. Each model has a model card with its licence, intended use and limits.',
    first: 'huggingface-cli download your-org/your-model --local-dir ./model',
    href: 'https://huggingface.co',
  },
  {
    name: 'Ollama',
    layer: 'Run on your machine',
    what: 'Downloads and runs open models with one command, and serves a local HTTP API.',
    first: 'ollama run llama3.2 "Say hello"',
    href: 'https://ollama.com',
  },
  {
    name: 'LM Studio',
    layer: 'Run on your machine',
    what: 'A desktop app for downloading and chatting with local models, with a local server you can call from code.',
    first: '',
    href: 'https://lmstudio.ai',
  },
  {
    name: 'llama.cpp',
    layer: 'Run on your machine',
    what: 'The C/C++ engine behind many local tools. Reads GGUF files and runs on CPUs, Apple silicon and many GPUs.',
    first: 'llama-server -m ./model.gguf --port 8080',
    href: 'https://github.com/ggml-org/llama.cpp',
  },
  {
    name: 'vLLM',
    layer: 'Serve many users',
    what: 'A serving engine for GPU servers, with an OpenAI-compatible API, continuous batching and PagedAttention.',
    first: 'vllm serve your-model --port 8000',
    href: 'https://docs.vllm.ai',
  },
  {
    name: 'Model Context Protocol (MCP)',
    layer: 'Agents and tools',
    what: 'An open protocol for connecting a model app to tools and data through MCP servers. The latest spec revision is dated 2026-07-28.',
    first: '',
    href: 'https://modelcontextprotocol.io',
  },
  {
    name: 'Agent Skills',
    layer: 'Agents and tools',
    what: 'A folder with a SKILL.md file of instructions, plus optional scripts. Agents load a skill only when a task needs it. Review skills before you install them: they can run code.',
    first: '',
    href: 'https://agentskills.io',
  },
];

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn quiet"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked: the command is still on screen to copy by hand */
        }
      }}
    >
      {done ? 'Copied' : 'Copy command'}
    </button>
  );
}

/**
 * One card per tool: what it is, where it sits in the stack, a first command you
 * can copy and run on your own machine, and a link to the official site.
 */
export default function EcosystemCards() {
  return (
    <Root>
      <div className="eco-grid">
        {tools.map((t) => (
          <article key={t.name} className="eco-card viz">
            <p className="eco-layer">{t.layer}</p>
            <h2 className="eco-name">{t.name}</h2>
            <p>{t.what}</p>
            {t.first && (
              <>
                <pre className="cs-result eco-cmd">{t.first}</pre>
                <Copy text={t.first} />
              </>
            )}
            <p>
              <a href={t.href} target="_blank" rel="noopener noreferrer">
                Official site
              </a>
            </p>
          </article>
        ))}
      </div>
    </Root>
  );
}
