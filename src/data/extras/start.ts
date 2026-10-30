import type { Extra } from '../lesson-extras';

/** Extras for the simple "Start here" lessons written for school-age beginners. */
export const extrasStart: Record<string, Extra> = {
  'start/how-computers-learn': {
    takeaways: [
      'A computer can learn a rule from examples with the right answers, instead of being told the rule.',
      'Training means: guess, count the mistakes, nudge the dials, and repeat.',
      'Testing means trying it on new examples it never saw while learning.',
      'It is only as good as its examples. Missing or unfair examples lead to wrong or unfair answers.',
    ],
    prereq: ['start/what-is-ai-in-plain-english'],
    quiz: [
      { q: 'How did the computer in the fruit game learn where to put its dial?', options: ['Someone typed in the right number', 'It guessed, counted its mistakes and nudged the dial, again and again', 'It looked the answer up on the internet', 'It picked a number at random and kept it'], answer: 1, why: 'That loop of guess, check and nudge is what training means.' },
      { q: 'Why do we test a computer on examples it has never seen?', options: ['To make it learn faster', 'Because the old examples are used up', 'To check that its rule works on new things, not just the examples', 'To give it more dials'], answer: 2, why: 'Getting the examples right is not enough; a good rule must also work on new things.' },
      { q: 'The computer called a small 10 cm banana an apple. What fixed it?', options: ['Adding a small banana to its examples and letting it learn again', 'Giving it fewer examples', 'Telling it to try harder', 'Turning it off and on again'], answer: 0, why: 'It had never seen a banana that short, so adding one helped it learn a better rule.' },
      { q: 'In the drawing game, how does the computer guess what your new drawing is?', options: ['It reads the name you typed', 'It asks another computer', 'It finds the saved drawings that look most like it', 'It always picks the first thing'], answer: 2, why: 'It compares your new drawing with your examples and picks what the closest ones are.' },
      { q: 'A face-unlock app was trained mostly on photos of adults. What is likely to happen?', options: ['It works equally well for everyone', 'It refuses to work for adults', 'It works best for children', 'It may work worse for children'], answer: 3, why: 'A computer is only as good as its examples, so groups it saw less often get more mistakes.' },
    ],
  },
  'start/how-computers-read-words': {
    takeaways: [
      'Computers only work with numbers, so text has to be turned into numbers first.',
      'Text is cut into pieces called tokens. Common words are one piece; rare words and names are split.',
      'Each piece gets a number, and also an address on a map where similar meanings sit close together.',
      'This is why chatbots count in tokens, find letter puzzles hard, and can search by meaning.',
    ],
    prereq: ['start/how-a-chatbot-answers'],
    quiz: [
      { q: 'What is a token?', options: ['A coin you pay the chatbot with', 'A small piece of text, often a word or part of a word', 'A password for an AI app', 'A single letter'], answer: 1, why: 'Chatbots cut text into small pieces called tokens before they read it.' },
      { q: 'Which word is most likely to be split into more than one piece?', options: ['the', 'dog', 'Biscuit', 'football'], answer: 2, why: 'Common words get one piece each, while rarer words and names are often split.' },
      { q: 'Why can counting the r’s in “strawberry” be hard for a chatbot?', options: ['It sees pieces like st, raw and berry, not single letters', 'It cannot count at all', 'It has never seen a strawberry', 'The word is too long to read'], answer: 0, why: 'The chatbot reads pieces, not letters, so it never looks at each letter one by one.' },
      { q: 'On the map of word meanings, which word would sit closest to “cat”?', options: ['bus', 'banana', 'car', 'dog'], answer: 3, why: 'Words with similar meanings get addresses close together, so cat sits near dog.' },
    ],
  },
  'start/ai-that-sees-and-hears': {
    takeaways: [
      'Pictures and sounds are turned into numbers, just like words.',
      'A picture is cut into small squares called patches, much as text is cut into tokens.',
      'The same kind of model can answer questions about a photo, turn speech into text and back, and draw pictures from a description.',
      'It can misread pictures, fakes can look and sound real, and you should ask before uploading photos of other people.',
    ],
    prereq: ['start/how-computers-read-words'],
    quiz: [
      { q: 'What does an AI that sees do with a photo first?', options: ['Cuts it into small squares and turns them into numbers', 'Prints it out and looks at it', 'Asks a person what is in it', 'Turns it into one long sentence'], answer: 0, why: 'Computers only work with numbers, so the photo is cut into patches and each becomes a list of numbers.' },
      { q: 'How does an image generator make a new picture?', options: ['It copies a photo from the internet', 'It draws one line at a time with a pen', 'It starts with random speckles and cleans them up step by step', 'It glues together pieces of old photos'], answer: 2, why: 'It starts from noise, and your description guides each cleaning step until a picture appears.' },
      { q: 'You get a voice message that sounds like your cousin asking for money. What should you do?', options: ['Send the money straight away', 'Stop and check with your cousin or a trusted adult another way', 'Share it with your friends', 'Reply with your bank details'], answer: 1, why: 'AI can copy voices, so a message that sounds real could be a deepfake.' },
      { q: 'You want an AI to make a funny picture from a photo of your friend. What should you do first?', options: ['Upload it, because it is only a joke', 'Upload it, but delete it afterwards', 'Ask a stranger online', 'Ask your friend if that is OK'], answer: 3, why: 'It is their photo, so always ask before you upload a picture of someone else.' },
    ],
  },
};
