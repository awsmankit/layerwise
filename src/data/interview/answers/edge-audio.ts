import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'sampling-aliasing-and-audio-data-sizes': {
    short:
      "A 900 Hz tone sampled at 1,000 Hz is recorded as a 100 Hz tone: you need more than two samples per cycle, so the highest pitch you can keep is half the sampling rate, 500 Hz here. That error is called aliasing and cannot be repaired afterwards, so real devices filter out high pitches before sampling. Speech models use 16 kHz because it keeps pitches up to 8 kHz, where most speech detail lives. One minute of 16 kHz, 16-bit mono speech is 1.92 MB, and three minutes of CD-quality stereo is about 31.8 MB.",
    explain: [
      {
        heading: "Sampling keeps dots, not the wave",
        body: "A computer cannot keep a sound wave. It measures the air pressure many times a second and keeps those measurements, the samples. The number per second is the sampling rate. If the samples come often enough, only one smooth wave fits them, so the sound comes back. If they come too slowly, a slower wave fits them too, and that is the one the computer rebuilds. A tone of f Hz sampled at fs Hz is rebuilt as |f - k x fs|, where k is the whole number that makes the result smallest. For 900 Hz at 1,000 Hz that is |900 - 1,000| = 100 Hz. The limit, half the sampling rate, is called the Nyquist limit.",
      },
      {
        heading: "Why 16 kHz, and what to do with 48 kHz audio",
        body: "A rate of 16 kHz keeps pitches up to 8 kHz, which holds most of the detail people use to understand speech. Old phone lines at 8 kHz keep about 300 to 3,400 Hz and sound muffled. A speech model learned from 16 kHz audio, so a 48 kHz recording must be resampled to 16 kHz first, a factor of 3, with a low-pass filter (which removes high pitches) applied before dropping samples. Dropping samples without filtering causes aliasing. Going the other way, upsampling 8 kHz audio to 16 kHz gives the right shape but no new information above 4 kHz, so test on real recordings from the device.",
      },
      {
        heading: "How much storage",
        body: "Size is samples per second x bytes per sample x channels x seconds. Bit depth is the number of bits for each sample: 16 bits give 65,536 levels, and each extra bit lowers the quantisation noise (rounding error) by about 6 dB. Do not confuse bit depth with sampling rate: one sets how finely each measurement is recorded, the other how often. Codecs store the same sound in fewer numbers.",
      },
    ],
    diagram: {
      kind: 'experiment',
      slug: 'sampling-rate',
      caption: "Try it: lower the sample rate until the rebuilt pitch is wrong, and note where it happens.",
    },
    example: {
      title: "Example: aliasing and data sizes, worked out",
      text: "The sizes use decimal megabytes, where 1 MB is 1,000,000 bytes.",
      rows: [
        { label: "900 Hz tone sampled at 1,000 Hz", value: "heard as |900 - 1,000| = 100 Hz" },
        { label: "Highest pitch kept at 1,000 Hz", value: "500 Hz" },
        { label: "16 kHz, 16-bit mono, per second", value: "16,000 x 2 bytes = 32,000 bytes" },
        { label: "The same for one minute", value: "1,920,000 bytes = 1.92 MB" },
        { label: "CD stereo per second", value: "44,100 x 2 bytes x 2 channels = 176,400 bytes" },
        { label: "Three minutes of CD stereo", value: "176,400 x 180 = 31,752,000 bytes, about 31.8 MB" },
        { label: "48 kHz down to 16 kHz", value: "keep every third sample, after a low-pass filter" },
      ],
    },
    followUps: [
      {
        q: "A car wheel seems to spin backwards in a film. Is that related?",
        a: "Yes. The camera samples in time, and if the wheel turns too far between frames the eye reads it as turning backwards. That is the same aliasing, in the time dimension instead of in sound.",
      },
      {
        q: "The device microphone delivers 8 kHz audio, upsampled to 16 kHz for a model trained on 16 kHz speech. What is the risk?",
        a: "Upsampling creates the right shape but nothing above 4 kHz, so consonants like “s” lose detail, and the training data did not look like that. Test on real recordings from the device and train or fine-tune on matching audio.",
      },
      {
        q: "Why do many models read a spectrogram rather than raw samples?",
        a: "A spectrogram shows which frequencies are present over time, which is the useful content and is hard to see in raw samples. Raw samples are also fragile: a tiny time shift changes almost every number. Some models, such as wav2vec 2.0, do read the waveform directly with convolutions.",
      },
    ],
    mistakes: [
      "Confusing sampling rate with bit depth.",
      "Saying a higher sampling rate is always better for a speech model. The input must match the rate it was trained on.",
      "Downsampling by dropping samples with no low-pass filter first.",
    ],
  },
};
