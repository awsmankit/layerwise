import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-streaming',
  title: 'What if the answer is not streamed?',
  blurb: 'Press send and compare a blank screen that waits for the whole answer with text that appears as it is written, using example speeds you can change.',
  area: 'serving',
  level: 'basic',
  minutes: 3,
  why: [
    'A language model writes its reply one token at a time. A token is a small piece of text, often a short word or part of one. A long reply takes many seconds, because each token needs its own step. The total time is the time to read your prompt, plus the number of reply tokens divided by the speed.',
    'Streaming does not make that total shorter. It changes what you see while you wait. The server sends each token as soon as it is made, so text starts to appear after the time to first token, which is only the delay plus reading the prompt. Without streaming, the server holds everything back and the screen stays blank until the last token is done.',
    'So the wait with nothing to read goes from the whole time down to the time to first token. A long reply makes the gap bigger, because only the blank part changes. Streaming also lets a person stop early if the answer is going the wrong way. Many chat apps stream for this reason. Providers commonly send the tokens as server-sent events, a way for a web server to keep pushing small messages down one open connection.',
    'The speeds and prompt size on this page are examples chosen to show the shape, not measurements of any real service.',
  ],
  takeaways: [
    'Total time is the same with or without streaming. What changes is how long the screen is blank.',
    'With streaming the blank wait is the time to first token. Without it, the blank wait is the whole reply time.',
    'The longer the reply, the more streaming helps how fast it feels.',
    'Streamed text can be read while it is written, and stopped early if it is wrong.',
  ],
  lessons: ['serving/life-of-a-request', 'serving/inference-optimisation', 'llm/context-window-and-caching'],
  sources: [
    { label: 'Streaming messages (Anthropic documentation)', url: 'https://platform.claude.com/docs/en/build-with-claude/streaming' },
  ],
  updated: '2026-11-06',
};
