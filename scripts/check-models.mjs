// Checks the model radar (src/data/models.ts) and says what a person should look at. It informs; it never fails CI.
//   1. STALE: an entry whose checkedOn date is more than 90 days old.
//   2. CANDIDATE: a headline in src/data/headlines.json (the official news feeds, refreshed by fetch-headlines.mjs)
//      that names a model not yet in models.ts. Only Google, DeepMind, Microsoft, Meta, Mistral, Hugging Face and similar
//      feeds are there: the feed list has no Anthropic feed, and OpenAI's is one of many, so absence from this report
//      does not mean nothing new came out. Check the vendors' own model pages now and then.
// A person must open the vendor's own page, confirm each fact and edit models.ts. Never copy a number from a blog.
// Usage: npm run check-models   (node scripts/check-models.mjs [--today=2026-11-06])
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const STALE_AFTER_DAYS = 90;

const arg = process.argv.find((a) => a.startsWith('--today='));
const today = arg ? arg.slice('--today='.length) : new Date().toISOString().slice(0, 10);
const DAY = 864e5;
const days = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

try {
  const source = readFileSync(join(root, 'src/data/models.ts'), 'utf8');
  const constants = Object.fromEntries([...source.matchAll(/const (\w+) = '(\d{4}-\d{2}-\d{2})';/g)].map((m) => [m[1], m[2]]));

  // one object per entry, in the same way check-libraries.mjs splits its data
  const entries = source
    .split(/\n  \{\n    id: /)
    .slice(1)
    .map((block) => {
      const checked = block.match(/checkedOn:\s*'(\d{4}-\d{2}-\d{2})'/)?.[1] ?? constants[block.match(/checkedOn:\s*(\w+)/)?.[1] ?? ''];
      return {
        name: block.match(/name:\s*'([^']+)'/)?.[1] ?? block.match(/name:\s*"([^"]+)"/)?.[1],
        apiId: block.match(/apiId:\s*'([^']+)'/)?.[1],
        checked,
      };
    })
    .filter((e) => e.name);

  console.log(`Model radar check for ${today}: ${entries.length} entries.`);

  // 1. stale rows
  let stale = 0;
  for (const e of entries) {
    if (!e.checked) {
      console.log(`STALE ${e.name}: no checkedOn date`);
      stale++;
      continue;
    }
    const age = days(e.checked, today);
    if (age > STALE_AFTER_DAYS) {
      console.log(`STALE ${e.name}: last checked ${e.checked} (${age} days ago, limit ${STALE_AFTER_DAYS})`);
      stale++;
    }
  }
  if (!stale) console.log(`No entry is older than ${STALE_AFTER_DAYS} days.`);

  // 2. names in the news feeds that the list does not have
  const known = norm(source);
  const headlines = JSON.parse(readFileSync(join(root, 'src/data/headlines.json'), 'utf8'));
  // a family word, an optional separator and a word, then up to three more capitalised or numeric words ("Gemini 4 Argon", "Claude Haiku 5.5")
  const pattern = /\b(?:Gemini|GPT|Claude|Llama|Mistral|Mixtral|DeepSeek|Qwen|Gemma|Grok)[ -]?[\w.]+(?: [A-Z0-9][\w.-]*){0,3}/g;
  // tools and products that carry a model family's name but are not models
  const ignore = /\b(Claude Code|Claude Desktop|Claude for|Gemini CLI|Gemini Code Assist|Gemini Enterprise|Gemini app|GPT Store)\b/i;
  const seen = new Set();
  let candidates = 0;
  for (const item of headlines.items ?? []) {
    if (ignore.test(item.title)) continue;
    for (const match of item.title.match(pattern) ?? []) {
      if (!/\d/.test(match)) continue; // a model name carries a version
      const key = norm(match);
      if (known.includes(key) || seen.has(key)) continue;
      seen.add(key);
      console.log(`CANDIDATE ${item.title} ${item.url}`);
      candidates++;
      break; // one line per headline
    }
  }
  if (!candidates) console.log('No headline names a model that is missing from the list.');
  console.log(`Feed snapshot: ${headlines.generatedAt ?? 'unknown date'}, ${headlines.items?.length ?? 0} headlines.`);
} catch (error) {
  // never fail the workflow: say what went wrong and carry on
  console.log(`NOTE the model check could not run: ${error.message}`);
}
process.exit(0);
