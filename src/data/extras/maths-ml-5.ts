import type { Extra } from '../lesson-extras';

export const extrasMathsMl5: Record<string, Extra> = {
  'maths/integration-from-the-start': {
    takeaways: [
      'Integration adds up a quantity that changes continuously; for a speed it gives the distance travelled.',
      'The area under a rate graph is the total the rate builds up over time.',
      'You estimate the area by cutting it into slices and adding them; more slices give a closer answer.',
      'The shortcut is to reverse the derivative: the integral of 2t is t², so the car covers T² metres in T seconds.',
    ],
    quiz: [
      { q: 'A car holds a steady speed of 10 metres per second for 3 seconds. How far does it go?', options: ['30 metres', '10 metres', '3 metres', '13 metres'], answer: 0, why: 'Distance is speed times time: 10 × 3 = 30 metres, which is also the area of the rectangle under the speed line.' },
      { q: 'What does the area under a speed-time graph represent?', options: ['Acceleration', 'Distance travelled', 'Time taken', 'The final speed'], answer: 1, why: 'Each thin slice is speed times a short time, a small distance. Adding the slices gives the total distance.' },
    ],
  },
};
