import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-fallback-path',
  title: 'What if there is no fallback when the model fails?',
  blurb: 'Run 50 voice commands through a small on-device model that is sometimes slow or unsure, with and without a simple rule as a safety net.',
  area: 'edge',
  level: 'basic',
  minutes: 3,
  why: [
    'A model is not a guarantee. On a device it can be slow, because the chip is busy or hot. It can be unsure, because the sound was noisy. It can also be confidently wrong. A feature built on the model alone has to do something in each of those cases, and if nobody decided what, the answer is silence or a guess.',
    'The scripted example on this page has 50 voice commands. In the default setting about two in five arrive too late or too unsure (a deliberately rough device). With no fallback, the late ones get silence, and the unsure ones are acted on anyway, so some do the wrong thing. With a fallback, the device checks the time and the confidence. If either fails, a tiny keyword rule answers instead. If the rule does not know the phrase either, the device asks the user to repeat, which is slower but never wrong.',
    'A fallback does not fix everything. A confident mistake is neither slow nor unsure, so it passes straight through. And a higher confidence bar buys fewer wrong actions with more requests to repeat. Good fallbacks are much simpler than the main path, so that they rarely fail, and they are tested on purpose. Cloud architecture guidance says the same: the degraded path should be significantly simpler than the primary one, and each failure should have a planned, tested outcome.',
  ],
  takeaways: [
    'Decide in advance what the feature does when the model is slow, unsure or down.',
    'Check the time limit and the confidence; send failures to a simpler path, not to a guess.',
    '"Please say that again" is a better failure than silence or a wrong action.',
    'A fallback cannot catch confident mistakes. Pair it with a confirmation for risky actions.',
  ],
  lessons: ['systems/model-routing-and-fallbacks', 'edge/real-time-on-a-budget', 'systems/ux-for-ai-features'],
  sources: [
    { label: 'AWS Well-Architected, REL05-BP01: Implement graceful degradation', url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_graceful_degradation.html' },
  ],
  updated: '2026-11-06',
};
