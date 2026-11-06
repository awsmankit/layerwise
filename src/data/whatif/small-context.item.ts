import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'small-context',
  title: 'What if the context window is too small?',
  blurb: 'Watch a chat slide through a small window, drop its oldest messages, and see which questions the model can no longer answer.',
  area: 'llm',
  level: 'basic',
  minutes: 3,
  why: [
    'A language model can only use what is inside its context window: the prompt, the earlier messages and its own reply so far, all counted in tokens. It has no other memory of the chat. Each time you send a message, the whole conversation is sent again, and anything that does not fit has to be left out.',
    'With a small window the oldest messages are cut first. A name, an allergy or a rule given at the start simply stops existing for the model, and it will not tell you. It either guesses or says it does not know. The demo shows this with an invented chat: slide the window size down and the answers that lived in the early messages turn from answerable to lost, while questions about recent messages stay fine.',
    'Real systems handle this in different ways: a larger window, summarising old turns into a short note, keeping a few key facts pinned, or fetching old material back on demand with retrieval. A big window is not a full cure either. The Lost in the Middle study reports that models do best when the relevant information is at the beginning or end of a long input and worse when it is in the middle.',
  ],
  takeaways: [
    'The model only knows what is inside its window right now.',
    'When the chat is longer than the window, the oldest messages go first.',
    'Anything said only in a dropped message cannot be recalled, and the model may not warn you.',
    'Fixes: bigger windows, summaries, pinned facts, retrieval. Each has costs.',
  ],
  lessons: ['llm/context-window-and-caching', 'llm/long-context-or-rag'],
  sources: [
    { label: 'Lost in the Middle: How Language Models Use Long Contexts (Liu et al., 2023)', url: 'https://arxiv.org/abs/2307.03172' },
  ],
  updated: '2026-11-06',
};
