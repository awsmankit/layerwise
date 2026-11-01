import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 3 "audio-a" batch. */
export const extrasW3AudioA: Record<string, Extra> = {
  'audio/speech-recognition': {
    takeaways: [
      'Speech recognition is an alignment problem: audio runs at 100 frames a second and text at a few letters a second, and training data has no timings.',
      'CTC outputs one symbol per frame including a blank, then merges repeats and drops blanks. A text\'s probability is the sum over all the frame-by-frame paths that collapse to it.',
      'Beam search keeps several candidate texts and adds up paths that agree, so it can beat greedy decoding. Streaming models (CTC, transducers) trade some accuracy for low delay.',
      'Whisper is an attention encoder-decoder trained on 680,000 hours. It can loop, invent text on silence and guess the wrong language, so use a voice activity check, set the language and test on real recordings.',
    ],
    prereq: ['audio/spectrograms-and-the-mel-scale'],
    quiz: [
      {
        q: 'A CTC model\'s best path over 8 frames is "c c _ a a _ t _" (underscore is the blank). What text does it give?',
        options: ['ccaat', 'cat', 'c c a a t', 'catt'],
        answer: 1,
        why: 'Merge repeats (c, _, a, _, t) and then drop the blanks, leaving c, a, t.',
      },
      {
        q: 'Why does CTC need a blank symbol?',
        options: [
          'To mark the end of every word',
          'It lets the model say "nothing new here" in a frame, and it separates genuine double letters such as the ll in hello',
          'It stores the speaker\'s identity',
          'It makes the model run faster on phones',
        ],
        answer: 1,
        why: 'Without a blank, two l frames in a row would merge into one l, so "hello" could never be written.',
      },
      {
        q: 'In CTC, the single most likely path has a probability of 14% but the text "cat" has 79%. What explains this?',
        options: [
          'The model is badly calibrated',
          'The text\'s probability is the sum of many different paths that all collapse to it',
          'Beam search was turned off',
          'Probabilities over 50% are rounded up',
        ],
        answer: 1,
        why: 'Many alignments give the same text, so their probabilities add up. The best single path can be much less likely than the best text.',
      },
      {
        q: 'You run Whisper on a recording that is mostly silence and get fluent sentences nobody said. What is the most sensible first fix?',
        options: [
          'Use a smaller model',
          'Raise the sampling rate to 48 kHz',
          'Cut silence with a voice activity detector or no-speech check, and test on silent clips',
          'Translate the output to English',
        ],
        answer: 2,
        why: 'Whisper\'s decoder is a language model and can write text when there is no speech. Detecting and skipping non-speech audio removes the cause, and silent test clips would catch it.',
      },
    ],
  },
  'audio/noise-suppression-and-hearing-devices': {
    takeaways: [
      'Noise suppression uses spatial tools (two or more microphones favouring a direction) and spectral tools (a gain for each time-frequency cell). Real devices combine both.',
      'Spectral subtraction and Wiener filtering turn down cells that look like estimated noise. Isolated surviving cells make musical noise; a floor on the gain masks it, and subtracting harder damages speech.',
      'Neural enhancement mostly learns a mask or filter from clean speech mixed with noise at chosen SNRs. The ideal ratio mask is the target a network tries to estimate.',
      'Hearing devices are bound by a delay of a few milliseconds, so a long transform window is a problem. Published manufacturer papers describe mask-based networks on dedicated on-device hardware but not full latency or power figures.',
    ],
    prereq: ['audio/speech-recognition'],
    quiz: [
      {
        q: 'A signal-to-noise ratio of 10 dB means the speech has how much more energy than the noise?',
        options: ['2 times', '5 times', '10 times', '100 times'],
        answer: 2,
        why: 'SNR in dB is 10 x log10 of the energy ratio, so 10 dB is a factor of 10. 20 dB would be 100.',
      },
      {
        q: 'What does a two-microphone directional system do to make the rear quieter?',
        options: [
          'Turns up the front microphone',
          'Delays the rear microphone signal and subtracts it from the front one, so sound from some directions cancels',
          'Uses the rear microphone as a noise reference only',
          'Records everything and removes the loudest sound',
        ],
        answer: 1,
        why: 'The delay sets the pattern. When it equals the time sound takes to cross the gap, sound from directly behind cancels and the pattern is a cardioid.',
      },
      {
        q: 'In the noise lab, light spectral subtraction leaves isolated bright dots in the pauses that sound like chirps. What are they called, and what hides them?',
        options: [
          'Echo; a longer window',
          'Clipping; a lower volume',
          'Musical noise; a floor on the gain, so some steady noise stays in',
          'Aliasing; a higher sampling rate',
        ],
        answer: 2,
        why: 'Random noise peaks that exceed the estimate survive as short tones. A gain floor leaves broadband noise that masks them.',
      },
      {
        q: 'Which is the strongest reason a 32 ms analysis window is a problem for a hearing aid?',
        options: [
          'It makes the picture too blurry',
          'The window must be collected before a frame can be processed, so delay is at least about that long, and listening tests found delays of 5 to 6 ms already just acceptable in some set-ups',
          'Hearing aids cannot compute Fourier transforms',
          'It doubles the battery drain on every device',
        ],
        answer: 1,
        why: 'The aided sound mixes with direct sound, so extra delay is heard as an echo. A long window is a floor on the delay unless the design uses tricks such as asymmetric windows.',
      },
    ],
  },
};
