import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 5 "lessons-a" batch. */
export const extrasW5LessonsA: Record<string, Extra> = {
  'start/how-ai-finds-things-in-a-picture': {
    takeaways: [
      'To a computer, a photo is a grid of numbers. It has to find a cat by looking at those numbers.',
      'It looks for small patterns first, such as edges, then joins them into bigger parts and whole things.',
      'A detector draws a box around what it finds and gives a confidence score, which is how sure it is. A high score is not a promise.',
      'It can be fooled by shadows, odd angles, gaps and even tiny changes people cannot see, so important results need a person to check.',
    ],
    prereq: ['start/ai-that-sees-and-hears'],
    quiz: [
      {
        q: 'What does a computer start with when it is given a photo?',
        options: ['A grid of numbers for the pixels', 'The word "cat"', 'A description written by a person', 'A drawing of the shapes inside'],
        answer: 0,
        why: 'A photo is made of pixels, and each pixel is stored as numbers. The computer has to work everything else out from them.',
      },
      {
        q: 'In what order does an AI that finds things usually build up what it sees?',
        options: ['Whole cat, then ears, then edges', 'Edges, then bigger parts, then the whole thing', 'Colours only, then a guess', 'Every pixel is checked against a photo of a cat'],
        answer: 1,
        why: 'Small patterns such as edges come first. They join into parts like ears and eyes, and the parts join into a whole thing.',
      },
      {
        q: 'A detector says "cat, 95 per cent". What does the 95 per cent mean?',
        options: ['The cat is 95 per cent of the picture', 'It is certainly right', 'It is how sure the computer is, and it can still be wrong', 'The photo is 95 per cent sharp'],
        answer: 2,
        why: 'A confidence score says how sure the computer is. It is not a promise, and confident answers can be wrong.',
      },
      {
        q: 'Which of these can make an image-finding AI get things wrong?',
        options: ['A strange angle or a shadow', 'Small stickers added to a sign', 'A half-hidden object', 'All of these'],
        answer: 3,
        why: 'Odd angles, shadows, hidden parts and even small stickers have all been shown to confuse such systems, so people should check results that matter.',
      },
    ],
  },
  'deep-learning/detection-and-segmentation': {
    takeaways: [
      'Detection gives a box, class and score per object. Segmentation labels pixels: semantic by class, instance by object, panoptic both.',
      'IoU is shared area over combined area: boxes of 24 and 30 sharing 12 give 12 / (24 + 30 − 12) = 0.29. A hit usually needs IoU of at least 0.5.',
      'NMS keeps the best box and removes boxes overlapping it by more than a threshold. Too low removes real neighbours, too high keeps duplicates. DETR-style detectors avoid it.',
      'AP is the area under the precision-recall curve of the ranked boxes. COCO averages it over ten IoU thresholds, 0.50 to 0.95, and also reports small, medium and large objects.',
    ],
    prereq: ['deep-learning/how-computers-see'],
    quiz: [
      {
        q: 'Box A has area 24 and box B has area 30. They overlap by 12. What is the IoU?',
        options: ['12 / 24 = 0.5', '12 / 30 = 0.4', '12 / 42 = 0.29', '12 / 54 = 0.22'],
        answer: 2,
        why: 'The union is 24 + 30 − 12 = 42, because the shared 12 was counted twice. IoU = 12 / 42, about 0.29.',
      },
      {
        q: 'Two people stand close together and their true boxes overlap by an IoU of about 0.28. NMS is run with a threshold of 0.2. What is likely to happen?',
        options: ['Both people keep one box each', 'The better box of the second person can be removed', 'Every duplicate is kept', 'Nothing is removed'],
        answer: 1,
        why: 'The second person\'s best box overlaps the first person\'s better box by more than 0.2, so greedy NMS removes it, even though it is a correct detection.',
      },
      {
        q: 'Which kind of segmentation separates two people standing side by side and also labels the sky and the road?',
        options: ['Semantic segmentation', 'Instance segmentation', 'Classification', 'Panoptic segmentation'],
        answer: 3,
        why: 'Panoptic segmentation gives every pixel a class and gives each countable object its own instance. Semantic merges the people, and instance labels only the objects.',
      },
      {
        q: 'Using an IoU threshold of 0.75 instead of 0.5 on the same ranked boxes usually lowers average precision. Why?',
        options: ['Loosely placed boxes stop counting as hits', 'The scores change', 'There are more real objects', 'Precision is measured differently'],
        answer: 0,
        why: 'A stricter threshold turns boxes with IoU between 0.5 and 0.75 into misses, so recall and precision both fall and the area under the curve shrinks.',
      },
    ],
  },
};
