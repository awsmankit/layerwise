import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the "audio" batch. */
export const extrasW1Audio: Record<string, Extra> = {
  'audio/how-a-computer-hears': {
    takeaways: [
      'Sound is air wobbling. A microphone and a computer measure it thousands of times a second, and each measurement is a number called a sample.',
      'Pitch is how fast the wave repeats (in hertz). Loudness is how tall the wave is. Bit depth is how finely each sample is measured.',
      'You need more than two samples per wave. Too few and the pitch is lost and a wrong, lower one appears. This is called aliasing.',
      'Speech models usually use 16,000 samples a second. That keeps pitches up to 8,000 Hz, which holds most of the detail in speech.',
    ],
    prereq: ['start/how-computers-read-words', 'start/ai-that-sees-and-hears'],
    quiz: [
      { q: 'A recording is made at 16,000 samples a second. What is the highest pitch it can keep?', options: ['4,000 Hz', '8,000 Hz', '16,000 Hz', '32,000 Hz'], answer: 1, why: 'You need more than two samples per wave, so the highest pitch is half the sampling rate: 8,000 Hz.' },
      { q: 'What does bit depth control?', options: ['How many measurements are taken each second', 'How loud the speaker can play', 'How finely the height of each sample is recorded', 'How high a pitch the recording can keep'], answer: 2, why: 'More bits give more possible heights for each sample. The sampling rate is what sets how many samples there are per second.' },
      { q: 'A 900 Hz tone is sampled 1,000 times a second. What does the computer end up with?', options: ['A wrong, lower tone (about 100 Hz), because of aliasing', 'The 900 Hz tone, stored perfectly', 'A louder tone at 900 Hz', 'Silence, with nothing recorded'], answer: 0, why: 'The limit is 500 Hz. Above it, a slower wave fits the dots just as well, and the computer keeps that one instead.' },
      { q: 'Why do many speech models use a 16,000 Hz sampling rate?', options: ['Microphones cannot record any faster', 'Higher rates make speech sound muffled', 'It is the rate used on music CDs', 'It keeps pitches up to 8,000 Hz, which holds most of the detail in speech, without extra numbers'], answer: 3, why: 'A higher rate would add numbers to process without much extra useful detail, while 8 kHz sampling sounds muffled.' },
    ],
  },
  'audio/spectrograms-and-the-mel-scale': {
    takeaways: [
      'A sound is a sum of pure tones. The Fourier transform finds which tones are present and how strong each one is.',
      'A spectrogram does this for short, overlapping windows: time runs across, frequency up, and brightness shows energy.',
      'Long windows give sharp pitch and blurred timing; short windows give sharp timing and blurred pitch. Whisper uses a 25 ms window with a 10 ms hop at 16,000 Hz.',
      'The mel scale spaces frequency bands the way hearing does, and a log scale mirrors how loudness is heard. Whisper reads an 80-band log-mel spectrogram (128 in large-v3).',
    ],
    prereq: ['audio/how-a-computer-hears'],
    quiz: [
      { q: 'In a spectrogram, what do the horizontal axis, the vertical axis and the brightness show?', options: ['Pitch, loudness and time', 'Loudness, time and pitch', 'Time, frequency and energy', 'Frequency, time and loudness of the speaker'], answer: 2, why: 'Time runs across, frequency runs up, and brighter means more energy at that frequency and moment.' },
      { q: 'You want to tell two very close pitches apart. Which analysis window helps most?', options: ['A longer window, though timing gets blurrier', 'A shorter window, though pitch gets blurrier', 'The window length makes no difference', 'No window at all'], answer: 0, why: 'Frequency detail is the sampling rate divided by the window size, so longer windows resolve pitch more finely and lose timing precision.' },
      { q: 'Whisper uses a 10 ms hop at 16,000 Hz. How many spectrogram columns does one second of audio give?', options: ['25', '40', '160', '100'], answer: 3, why: 'A new column starts every 10 ms, so there are 1,000 / 10 = 100 columns per second (3,000 for a 30-second chunk).' },
      { q: 'Why do speech models use mel bands rather than evenly spaced frequencies?', options: ['They are cheaper to compute than any other choice', 'Mel bands are narrow at low pitches and wide at high pitches, following how hearing tells pitches apart', 'Mel bands make the audio louder', 'They remove the need for a Fourier transform'], answer: 1, why: 'The mel scale comes from listening tests: the same step in hertz is a bigger change at low pitches than at high ones.' },
    ],
  },
};
