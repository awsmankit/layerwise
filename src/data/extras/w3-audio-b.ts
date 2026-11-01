import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 3 "audio-b" batch. */
export const extrasW3AudioB: Record<string, Extra> = {
  'audio/measuring-audio-quality': {
    takeaways: [
      'Word error rate is (substitutions + deletions + insertions) divided by the reference word count, from a minimum edit alignment. It can exceed 1 and is undefined for an empty reference.',
      'Two WERs are comparable only with the same text normaliser, word policy and data. Pool errors across utterances and break results down by speaker group and noise.',
      'A mean opinion score comes from a listening test and is comparable only within that test. Report its confidence interval: a gap of a few tenths of a star needs dozens of listeners.',
      'Objective metrics (STOI, DNSMOS, SI-SDR and others) are proxies built for one job. Check them against human ratings on your own audio, and report several scores.',
    ],
    prereq: ['audio/speech-recognition'],
    quiz: [
      { q: 'A 10-word reference is transcribed with 1 wrong word, 1 missing word and 1 extra word. What is the WER?', options: ['0.10', '0.20', '0.30', '0.33'], answer: 2, why: 'WER = (S + D + I) / N = (1 + 1 + 1) / 10 = 0.30.' },
      { q: 'Why can the same recogniser show a much lower WER after a different text normaliser is applied?', options: ['The audio changed', 'Harmless differences such as capitals, punctuation, digits and contractions stop counting as errors', 'The model was retrained', 'WER ignores insertions'], answer: 1, why: 'Edit distance treats "5," and "five" as different strings, so the scoring rules change the number. State and share the normaliser.' },
      { q: 'Two utterances: 2 words with 1 error, and 98 words with 2 errors. What is the pooled WER?', options: ['3%', 'About 26%', '1.5%', '50%'], answer: 0, why: 'Pooled WER is total errors over total reference words: 3 / 100. Averaging the two separate rates gives about 26%, which lets the tiny utterance dominate.' },
      { q: 'You raise a listening test from 10 to 40 listeners. What happens to the 95% interval on a MOS, roughly?', options: ['It stays the same', 'It shrinks to a quarter', 'It doubles', 'It halves, because the width shrinks with the square root of the number of listeners'], answer: 3, why: 'Four times the listeners halves the interval. That is why small gaps need many listeners.' },
    ],
  },
  'audio/text-to-speech-and-voice-cloning': {
    takeaways: [
      'A classic text-to-speech system normalises text, turns words into sounds, plans prosody, predicts a mel spectrogram and runs a vocoder. Neural codec models instead predict discrete audio codes with a language model.',
      'A few seconds of recording can be enough for a model to imitate a voice, so cloning needs recorded consent, marking and abuse controls. A voice is not a password.',
      'Streaming trades first-audio latency against prosody and audible seams. Measure time to first audio and real-time factor.',
      'The same technology gives people with degenerating speech their own voice back, through voice banking. Judge a voice by listening test, round-trip word error rate and hard cases.',
    ],
    prereq: ['audio/spectrograms-and-the-mel-scale'],
    quiz: [
      { q: 'Which stage of a classic TTS pipeline decides how long each sound lasts and how the pitch moves?', options: ['Text normalisation', 'Prosody', 'The vocoder', 'Voice activity detection'], answer: 1, why: 'Prosody covers duration, pitch and loudness. The vocoder only turns the predicted spectrogram into a waveform.' },
      { q: 'In the VALL-E design with 8 quantizers at 75 frames a second, how many codes are 10 seconds of speech?', options: ['750', '75,000', '480', '6,000'], answer: 3, why: '10 s x 75 frames x 8 codes = 6,000 codes.' },
      { q: 'What does a real-time factor above 1 mean?', options: ['Generation is faster than the audio plays', 'The voice is cloned', 'Generation takes longer than the audio lasts, so it cannot keep up', 'The audio has two channels'], answer: 2, why: 'RTF is generation time divided by audio duration. Above 1, the listener must wait.' },
      { q: 'Which control best checks that the person giving a voice for cloning is actually present and agrees?', options: ['Accepting any uploaded clip', 'Having them read a random phrase live, with recorded consent and stated uses', 'Checking the clip is long enough', 'Adding a watermark'], answer: 1, why: 'A live random phrase is hard to fake with an old recording. A watermark helps later detection but is not consent.' },
    ],
  },
};
