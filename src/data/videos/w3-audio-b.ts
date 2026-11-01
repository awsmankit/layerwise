import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 3 "audio-b" batch. Keys are "<track>/<slug>". */
export const videosW3AudioB: LessonVideos = {
  'audio/measuring-audio-quality': [
    { creator: 'Tushar Roy - Coding Made Simple', title: 'Minimum Edit Distance Dynamic Programming', url: 'https://www.youtube.com/watch?v=We3YDTzNXEk', minutes: 10 },
  ],
  'audio/text-to-speech-and-voice-cloning': [
    { creator: 'The 8-Bit Guy', title: 'How Speech Synthesizers Work', url: 'https://www.youtube.com/watch?v=XsMRxNSDccc', minutes: 18, easy: true },
    { creator: "What's AI by Louis-François Bouchard", title: 'This AI can clone your voice! VALL-E (explained) (and WAICF tickets giveaway!)', url: 'https://www.youtube.com/watch?v=cZaZ-MQ3IBY', minutes: 7 },
    { creator: 'Jeff Geerling', title: 'The dark side of AI voice cloning', url: 'https://www.youtube.com/watch?v=vHuPWQz9AlI', minutes: 13 },
  ],
};
