import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 2 "resp" batch. Keys are "<track>/<slug>". */
export const videosW2Resp: LessonVideos = {
  'responsible/fairness-for-builders': [
    { creator: 'Arvind Narayanan', title: 'Tutorial: 21 fairness definitions and their politics', url: 'https://www.youtube.com/watch?v=jIXIuYdnyyk', minutes: 55 },
    { creator: 'StatQuest with Josh Starmer', title: 'Machine Learning Fundamentals: Sensitivity and Specificity', url: 'https://www.youtube.com/watch?v=vP06aMoz4v8', minutes: 12 },
  ],
  'responsible/privacy-engineering-for-ai': [
    { creator: 'Simply Explained', title: 'Differential Privacy - Simply Explained', url: 'https://www.youtube.com/watch?v=gI0wk1CXlsQ', minutes: 7 },
    { creator: 'USENIX', title: "USENIX Security '21 - Extracting Training Data from Large Language Models", url: 'https://www.youtube.com/watch?v=A_P_9mmTuGA', minutes: 11 },
    { creator: 'National Institute of Standards and Technology', title: 'What is Differential Privacy?', url: 'https://www.youtube.com/watch?v=-JRURYTfBXQ', minutes: 3 },
  ],
  'responsible/teaching-a-model-to-behave': [
    { creator: 'Robert Miles AI Safety', title: 'Reward Hacking: Concrete Problems in AI Safety Part 3', url: 'https://www.youtube.com/watch?v=92qDfT8pENs', minutes: 7 },
    { creator: 'Robert Miles AI Safety', title: 'What Can We Do About Reward Hacking?: Concrete Problems in AI Safety Part 4', url: 'https://www.youtube.com/watch?v=13tZ9Yia71c', minutes: 10 },
    { creator: 'Andrej Karpathy', title: 'Deep Dive into LLMs like ChatGPT', url: 'https://www.youtube.com/watch?v=7xTGNNLPyMI', minutes: 211 },
  ],
};
