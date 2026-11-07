import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-idempotency',
  title: 'What if a retry repeats the action?',
  blurb: 'An agent charges 20 orders over a network that drops some replies. Without an idempotency key each retry charges again; with one, the server recognises it.',
  area: 'agents',
  level: 'intermediate',
  minutes: 4,
  predict: {
    question: 'An agent calls a "charge the customer" tool. The server charges the card, but the reply is lost on the way back. The agent sees no answer and tries again. What do you think happens?',
    options: [
      'The server notices it is the same order and ignores the second call.',
      'The customer is charged twice, because the server cannot tell a retry from a new order.',
      'The second call fails with an error, so the customer is charged once.',
    ],
    answer: 1,
    why: 'Without a key, a retry looks like a brand-new request. In this scripted run, 4 of 20 orders are charged more than once: 6 extra charges, $137.50 taken that was never owed.',
  },
  why: [
    'Networks lose messages. When an agent calls a tool and gets no reply, it cannot tell whether the request never arrived or the work was done and only the reply was lost. A careful agent retries, because giving up would leave some orders unpaid. But for an action with side effects, such as charging a card or sending an email, a retry after a lost reply does the action a second time.',
    'An idempotency key fixes this. The agent makes a unique label for each action, for example one per order, and sends the same label on every retry. The server remembers the label and the result of the first call. When the same label comes again, it sends back the saved result and does not repeat the work. Stripe\'s API documentation describes this: a client generates a unique key, and a retry with the same key returns the saved response instead of performing the operation twice. It also says to use enough randomness (it suggests V4 UUIDs) and that keys can be removed after at least 24 hours for its API version 1.',
    'Three details matter. The key must stay the same across retries of one action, or the server sees a new action. A key does not help when the request itself never arrives: order 3 in this run was never charged either way, and the agent has to report that honestly. And some tools do not support keys at all, so agents should ask a person before a risky action, or look up the state first, instead of retrying blindly. This run is a scripted toy with invented orders and loss rates.',
  ],
  takeaways: [
    'A lost reply and a lost request look the same to the agent: no answer. Only one of them did the work.',
    'Retrying an action with side effects can repeat it. Charges, emails and bookings need protection.',
    'An idempotency key, the same on every retry of one action, lets the server return its saved result instead of repeating the work.',
    'A key stops duplicates; it does not make a lost request arrive. Report failures instead of hiding them.',
  ],
  lessons: ['rag-agents/designing-tools-for-agents', 'rag-agents/agents-and-tool-use', 'systems/human-in-the-loop-design'],
  sources: [
    { label: 'Stripe API docs: Idempotent requests', url: 'https://docs.stripe.com/api/idempotent_requests' },
  ],
  updated: '2026-11-06',
};
