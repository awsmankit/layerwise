import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 3 "edge-b" batch. */
export const extrasW3EdgeB: Record<string, Extra> = {
  'edge/real-time-on-a-budget': {
    takeaways: [
      'A block of B samples at R samples a second gives a deadline of B / R. Missing it is an audible glitch, so the slowest block matters, not the average.',
      'Worst-case delay is about two blocks plus the algorithm look-ahead plus fixed delays. Smaller blocks cut delay but raise compute load and power by the same factor.',
      'Keep real-time code bounded: no blocking, no allocation, a fixed memory arena, and state carried from block to block.',
      'Benchmark with warm-up, steady state, percentiles, recorded conditions and measured energy, and read published results by division, accuracy target and what is excluded.',
    ],
    prereq: ['edge/from-pytorch-to-the-chip'],
    quiz: [
      { q: 'A model takes 1 ms on average per block but 4 ms once in every 100 blocks. Blocks last 2 ms. What happens?', options: ['Nothing, because the average is under 2 ms', 'About one block in 100 misses its deadline and glitches', 'Every block glitches', 'The model runs faster after warming up'], answer: 1, why: 'A deadline is judged block by block, so the slow tail causes the glitches even when the average is fine.' },
      { q: 'You halve the block size but keep the same window and model. What changes?', options: ['Delay falls but inferences per second, load and power rise', 'Everything improves', 'Delay rises and power falls', 'Only the memory use changes'], answer: 0, why: 'The model still costs the same per run, but it now runs twice as often against a deadline half as long.' },
      { q: 'Which is a sound way to report a latency benchmark?', options: ['The time of the first run', 'The mean of ten runs on a cool chip', 'Median and tail (p99 or worst case) after warm-up, over a run long enough to include heating, with conditions recorded', 'The fastest run you saw'], answer: 2, why: 'Early runs, short tests and best cases all flatter the model; distributions after steady state describe what users meet.' },
      { q: 'Why can two published results for different chips in different MLPerf Tiny divisions not be compared directly?', options: ['The open division allows a different model or training, so only the closed division compares like with like', 'Open division results are always faster', 'Closed division results are not measured for energy', 'The two divisions use different units'], answer: 0, why: 'The closed division fixes the model, data and accuracy target; the open division relaxes them and documents the differences.' },
    ],
  },
  'edge/tinyml-wake-word-detector': {
    takeaways: [
      'A keyword spotter is a pipeline: frames, log-mel features, a small network, smoothing, then a threshold. Only the network is learned.',
      'The threshold trades false accepts per hour against false rejects. Hard negatives are similar-sounding speech, and background noise moves the whole curve.',
      'Rare false accepts need thousands of hours of audio to measure, so a short test ranks settings but does not predict a product rate.',
      'Always-on detectors are cascades: a tiny first stage runs continuously and a larger stage verifies, so the first stage false-accept rate sets the power bill. Motion and vibration sensors follow the same recipe.',
    ],
    prereq: ['audio/spectrograms-and-the-mel-scale', 'edge/real-time-on-a-budget'],
    quiz: [
      { q: 'What does smoothing the model outputs over a short time do in a wake-word detector?', options: ['It makes the model larger', 'It stops one odd frame from triggering, at the cost of a slightly later decision', 'It removes the need for a threshold', 'It converts the audio to 8 bits'], answer: 1, why: 'Averaging recent scores gives steadiness but needs a few frames to rise, so decisions come later.' },
      { q: 'You raise the detection threshold. What usually happens?', options: ['Both false accepts and missed keywords fall', 'False accepts rise and missed keywords fall', 'False accepts fall and missed keywords rise', 'Nothing, because the model is fixed'], answer: 2, why: 'A higher bar makes the detector fire less often, which removes false alarms and also some genuine keywords.' },
      { q: 'A detector produces 1 false accept in a 2-minute test. Why is that not good evidence of its false-accept rate?', options: ['Two minutes is the legal minimum', 'It scales to 30 an hour from one event; products need rates near one per week, which takes thousands of hours of audio to estimate', 'False accepts cannot be counted', 'The test must be run on a phone'], answer: 1, why: 'A single event in a short test is a very noisy estimate, and rare-event rates need very long recordings.' },
      { q: 'Why do always-on voice triggers use a two-stage cascade?', options: ['A tiny first stage can run continuously on little power and wake a larger, more accurate stage only when needed', 'Two stages are required by the microphone', 'The second stage records the user', 'It makes the model train faster'], answer: 0, why: 'Running the big model all the time would drain the battery; the first stage gates it.' },
    ],
  },
};
