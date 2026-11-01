import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 3 "edge-c" batch. */
export const extrasW3EdgeC: Record<string, Extra> = {
  'edge/small-language-models-on-device': {
    takeaways: [
      'Weights take parameters x bits / 8. The KV cache takes 2 x layers x KV heads x head dimension x bytes per token, so grouped-query attention and an 8-bit cache matter on a phone.',
      'Only part of a phone or tablet\'s RAM is yours, and the system can end a process that holds a lot of memory. Plan for the usable share, not the spec sheet.',
      'Decode speed is bounded by memory bandwidth divided by the bytes read per token (weights plus cache). Prefill is limited more by compute.',
      'Small models suit narrow, fine-tuned tasks. Plan a fallback to the cloud for missing models, hard requests and long inputs, and say what leaves the device.',
    ],
    prereq: ['edge/quantization-for-edge'],
    play: [
      { label: 'Play Fit the Model', href: '/play/fit-the-model/' },
      { label: 'Open the memory tool', href: '/tools/memory/' },
    ],
    quiz: [
      { q: 'A 3B-parameter model is stored at 4 bits per weight. About how much memory do the weights need?', options: ['0.75 GB', '1.5 GB', '3 GB', '6 GB'], answer: 1, why: '3 billion x 4 bits / 8 = 1.5 billion bytes, about 1.5 GB, before the KV cache and runtime.' },
      { q: 'Why can Phi-3-mini (32 key-value heads) need far more KV cache per token than Qwen2.5-3B (2 key-value heads)?', options: ['It uses more layers than any other model', 'It stores weights twice', 'Phi-3-mini ignores the context length', 'The cache grows with the number of KV heads, and grouped-query attention uses few'], answer: 3, why: 'KV bytes per token = 2 x layers x KV heads x head dimension x bytes, so fewer KV heads means a much smaller cache.' },
      { q: 'A phone has 100 GB/s of memory bandwidth and a model needs 2 GB read per token. What is the decode ceiling?', options: ['About 50 tokens per second', 'About 5 tokens per second', 'About 200 tokens per second', 'It depends only on the NPU speed in TOPS'], answer: 0, why: '100 GB/s divided by 2 GB per token is 50 tokens per second, an upper bound that real runs fall below.' },
      { q: 'Which request is the best candidate to send to the cloud instead of the on-device model?', options: ['Rewrite this text message in a politer tone', 'Pick which of three app functions to call', 'Answer a detailed factual question that needs wide world knowledge', 'Summarise a short note'], answer: 2, why: 'Small models store little factual knowledge, so open-ended knowledge questions are where fallback or retrieval helps most.' },
    ],
  },
  'edge/shipping-to-a-fleet': {
    takeaways: [
      'Ship the model as a separate, signed, versioned artefact with a manifest, so a model change is not a full firmware release.',
      'Update clients refuse to go backwards, so a rollback is published as a new, higher version that points at the older weights.',
      'Stage the rollout, fill the canary across device classes, and size it from k / (s x p): zero failures in n devices only bounds the rate near 3 / n.',
      'Monitor with counters and histograms labelled by model version and device class. Federated learning keeps raw data on the device but its updates can still leak.',
    ],
    prereq: ['edge/small-language-models-on-device'],
    quiz: [
      { q: 'Why is a rollback best published as a new, higher version?', options: ['Version numbers must always be even', 'Secure update clients refuse to install an older version, to block rollback attacks', 'Old versions are deleted automatically', 'Devices cannot store two models'], answer: 1, why: 'Anti-rollback protection also blocks your own undo, so you publish the old weights again under a higher version number.' },
      { q: 'A bug fails 2% of the devices in a class that is 5% of the fleet. About how many devices must be updated before you expect ten failures from it?', options: ['About 1,000', 'About 500', 'About 100,000', 'About 10,000'], answer: 3, why: 'k / (s x p) = 10 / (0.05 x 0.02) = 10,000 devices, and background noise makes even that borderline.' },
      { q: 'After 1,000 updated devices you see zero failures. What can you say?', options: ['The update is safe', 'The failure rate is exactly zero', 'The failure rate is probably below about 0.3%', 'You need no further stages'], answer: 2, why: 'The rule of three bounds the rate near 3 / n with about 95% confidence, so a small canary only rules out large problems.' },
      { q: 'What does federated learning do and not do?', options: ['It keeps raw data on devices, but updates computed from it can still leak information', 'It makes the model perfectly private', 'It removes the need for a test set', 'It sends all raw data to the server in compressed form'], answer: 0, why: 'Raw data stays local, but gradients have been used to reconstruct training data, so extra protections such as secure aggregation or differential privacy are used.' },
      { q: 'Which monitoring design best respects on-device privacy?', options: ['Upload every input for later review', 'Report counters and histograms labelled with model version and device class', 'Upload only the inputs that failed', 'Do not monitor at all'], answer: 1, why: 'Aggregates answer "is it failing, and where" without collecting raw audio, images or text.' },
    ],
  },
};
