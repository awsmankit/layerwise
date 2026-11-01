import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "misc" batch. */
export const extrasW4Misc: Record<string, Extra> = {
  'audio/voice-agents': {
    takeaways: [
      'People leave about 200 ms between turns (mean 208 ms across ten languages, Stivers et al., 2009). A cascade must fit endpointing, recognition, a model, synthesis and the network into that kind of window, and usually does not.',
      'Stream every stage and speak the first clause rather than the whole reply. Speculative generation hides endpointing time but throws away work when the user keeps talking.',
      'Endpointing trades cut-offs against delay: a short silence interrupts people mid-thought, a long one slows every answer. Meaning-aware turn detection helps but makes mistakes.',
      'Barge-in needs fast cancellation, history cut to what the caller heard, and echo cancellation. Phone audio is 8 kHz mu-law with its own delay, so test on it.',
    ],
    prereq: ['audio/speech-recognition', 'audio/text-to-speech-and-voice-cloning'],
    quiz: [
      { q: 'Across ten languages, roughly how long was the mean gap between one speaker finishing and the next starting (Stivers et al., 2009)?', options: ['About 20 ms', 'About 208 ms', 'About 1 second', 'About 2 seconds'], answer: 1, why: 'The mean offset was +208 ms, with language means from +7 ms to +469 ms. People start almost at once because they predict the end of the other turn.' },
      { q: 'A cascade waits 400 ms to confirm the turn, then needs 100 ms for the final transcript, 350 ms for the model, 100 ms for the first clause and 150 ms for synthesis, then 100 ms for the network. When does the caller hear the first sound?', options: ['850 ms', '1,000 ms', '1,200 ms', '1,500 ms'], answer: 2, why: '400 + 100 + 350 + 100 + 150 + 100 = 1,200 ms. Nothing overlaps unless you start work early.' },
      { q: 'The silence threshold is 500 ms and a caller pauses for 700 ms while reading out a phone number. What happens with a silence-only detector?', options: ['The agent waits for the rest of the number', 'The agent decides the turn is over and starts answering, cutting them off', 'The agent asks them to repeat after 5 seconds', 'The recogniser fixes the pause'], answer: 1, why: 'A silence-only rule sees 700 ms of quiet, which is longer than 500 ms, so it ends the turn. Meaning-aware turn detection exists to avoid this.' },
      { q: 'Phone audio arrives as 8 kHz mu-law and your recogniser expects 16 kHz. What does resampling up to 16 kHz do?', options: ['Restores the detail above 4 kHz', 'Gives the right format but adds no information above 4 kHz, so test on real phone audio', 'Halves the latency', 'Removes echo'], answer: 1, why: 'An 8 kHz signal carries pitches up to 4 kHz. Resampling changes the format, not the content, so recognition can still suffer.' },
    ],
  },
  'cost/semantic-caching-and-batch-apis': {
    takeaways: [
      'An exact or semantic cache skips the model call; a provider prompt cache only discounts repeated input. Only the first two can serve a stale or wrong answer.',
      'A semantic cache hits when similarity reaches a threshold, and similar wording is not the same meaning. No threshold separates every paraphrase from every near-duplicate, and none fixes a scope error: key the cache by tenant, permissions, language and version.',
      'Count the cost of wrong answers. A high hit rate with a few per cent wrong can cost more than it saves, so label a sample of hits on real traffic.',
      'Batch APIs from the major vendors advertise about half price for results within a day. Size limits, expiry, eligible models and cache stacking differ, so read each vendor current page. On HTTP 429, honour Retry-After and back off.',
    ],
    prereq: ['cost/where-the-tokens-go', 'llm/context-window-and-caching'],
    quiz: [
      { q: 'A semantic cache serves shop South a stored answer written for shop North. The two questions have a similarity of 1.00. What is the right fix?', options: ['Raise the threshold to 1.01', 'Partition the cache key by shop (tenant)', 'Use a bigger embedding model', 'Switch to a longer time to live only'], answer: 1, why: 'The text is identical, so no similarity threshold can tell them apart. The cache key must include whatever changes the answer, such as the tenant.' },
      { q: 'A cache answers 30,000 of 100,000 daily questions. A model call costs $0.01 and a lookup $0.0001 (examples). What is the saving before counting wrong answers?', options: ['$300', '$290', '$1,000', '$30'], answer: 1, why: '30,000 x $0.01 = $300 saved, minus 100,000 lookups x $0.0001 = $10 spent on every question, which leaves $290.' },
      { q: 'Which job suits a batch API?', options: ['A live chat reply', 'Summarising 50,000 archived documents overnight', 'A voice agent reply', 'Autocomplete in an editor'], answer: 1, why: 'Batch trades waiting time for price: results can take up to a day. Nobody is waiting on an overnight archive job, whereas the other three are interactive.' },
      { q: 'An API returns HTTP 429 with a Retry-After header of 30. What should the client do?', options: ['Retry immediately, three times', 'Wait at least 30 seconds, then retry with backoff', 'Treat it as a permanent error', 'Switch to a larger model'], answer: 1, why: '429 means too many requests. Retry-After says how long to wait; add exponential backoff with jitter and a cap on attempts.' },
    ],
  },
};
