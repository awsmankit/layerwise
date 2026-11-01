import { useState } from 'react';
import { Root } from './shared';

/*
 * "Where could this leak?": the stages of a typical LLM application as buttons. Pick one to see what
 * can leak there, an example of how, and the mitigation. Static content: nothing is sent anywhere.
 */

interface Point {
  id: string;
  n: number;
  label: string;
  group: 'path' | 'behind';
  leak: string;
  how: string;
  fix: string[];
}

const POINTS: Point[] = [
  {
    id: 'input',
    n: 1,
    label: 'User input',
    group: 'path',
    leak: 'People type or paste things the task never needed: names, account numbers, health details, other people\'s data.',
    how: 'A support agent pastes a whole customer email thread, including a home address, to ask for a summary.',
    fix: ['Ask for less: design the form around the task, not a free-for-all.', 'Detect and redact obvious identifiers (patterns, a named-entity detector) before the text goes anywhere else.', 'Tell users what is kept and for how long.'],
  },
  {
    id: 'logs',
    n: 2,
    label: 'App server, logs and traces',
    group: 'path',
    leak: 'Prompts and answers are copied into application logs, tracing tools, error trackers and analytics, which usually have wider access and longer retention than the app itself.',
    how: 'A trace viewer shows the full prompt of every request, and fifty engineers can open it.',
    fix: ['Redact before logging, or log metadata (sizes, latency, ids) instead of content.', 'Set a retention limit on every store and enforce deletion.', 'Give log access the same care as the database.'],
  },
  {
    id: 'retrieval',
    n: 3,
    label: 'Retrieval index',
    group: 'path',
    leak: 'The retriever returns a document the user is not allowed to see, and the model quotes it.',
    how: 'One index holds every customer\'s contracts. Search ranks by meaning, and a competitor\'s pricing page comes back as the best match.',
    fix: ['Filter by the caller\'s permissions in the query itself, before ranking.', 'Keep a separate index per tenant where the risk is high.', 'Test with planted "canary" documents that a given user must never receive.'],
  },
  {
    id: 'context',
    n: 4,
    label: 'Prompt and context',
    group: 'path',
    leak: 'Secrets and other users\' data sit in the context window, so anything the model can read, a clever prompt can try to make it repeat.',
    how: 'An API key in the system prompt, or a shared conversation memory that mixes two users\' sessions.',
    fix: ['Keep keys and credentials out of prompts entirely.', 'Scope memory and history to one user or tenant.', 'Put only the fields the task needs into context.'],
  },
  {
    id: 'provider',
    n: 5,
    label: 'Model provider or host',
    group: 'path',
    leak: 'The text leaves your boundary for a third party, which may keep it, review it or use it under its own terms.',
    how: 'A team assumes a hosted model does not keep what it is sent. Nobody read the terms of the plan, and they say requests are kept for a period.',
    fix: ['Read the provider\'s current data terms for your plan, and record what you found.', 'Use the retention and residency options your contract offers.', 'For data that must not leave, run the model yourself (see Private and air-gapped AI).'],
  },
  {
    id: 'output',
    n: 6,
    label: 'Model output and rendering',
    group: 'path',
    leak: 'The answer repeats private context, or carries it out through a link or an auto-loaded image.',
    how: 'An injected instruction makes the answer include a markdown image whose address contains a summary of the chat.',
    fix: ['Scan outputs for identifiers before showing or storing them.', 'Do not auto-load images or links from arbitrary domains.', 'Give the model only the tools and data the task needs.'],
  },
  {
    id: 'cache',
    n: 7,
    label: 'Caches',
    group: 'behind',
    leak: 'A cached answer or cached prompt is served to a different person.',
    how: 'A response cache is keyed on the question text only, so one user\'s personalised answer is returned to the next person who asks the same thing.',
    fix: ['Include the permission scope in every cache key.', 'Do not cache responses that contain personal data, or give them a short lifetime.'],
  },
  {
    id: 'training',
    n: 8,
    label: 'Fine-tuning data and the weights',
    group: 'behind',
    leak: 'A model trained on private records can memorise some and repeat them to someone who asks the right way. Deleting a record from the data later does not delete it from weights already trained.',
    how: 'A model fine-tuned on support tickets reproduces a customer\'s phone number when prompted with the start of the ticket.',
    fix: ['Remove or mask personal data before training, and remove duplicates (repeated text is memorised more).', 'Keep facts that people can ask you to delete in a retrieval store, not in weights.', 'Test the tuned model for extraction before release; consider differentially private training for sensitive data.'],
  },
];

export default function LeakMap() {
  const [active, setActive] = useState<string>('retrieval');
  const p = POINTS.find((x) => x.id === active) as Point;

  const group = (g: 'path' | 'behind', title: string) => (
    <div className="rs-lk-group">
      <p className="rs-lk-gtitle">{title}</p>
      <ol className="rs-lk-flow" aria-label={title}>
        {POINTS.filter((x) => x.group === g).map((x) => (
          <li key={x.id}>
            <button type="button" className="rs-lk-node" aria-pressed={active === x.id} onClick={() => setActive(x.id)}>
              <span className="rs-lk-n" aria-hidden="true">{x.n}</span>
              {x.label}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <Root>
      <div className="viz rs-lk">
        <p className="viz-title">Where could this leak? An LLM app, stage by stage</p>
        {group('path', 'The path of one request')}
        {group('behind', 'Behind the scenes')}
        <div className="rs-lk-panel" role="region" aria-live="polite" aria-label={`Details for ${p.label}`}>
          <h4 className="rs-h">{p.n}. {p.label}</h4>
          <p><b>What can leak.</b> {p.leak}</p>
          <p><b>An example.</b> {p.how} <i className="rs-small">(Illustrative, not a report of a real incident.)</i></p>
          <p><b>What to do.</b></p>
          <ul>
            {p.fix.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </Root>
  );
}
