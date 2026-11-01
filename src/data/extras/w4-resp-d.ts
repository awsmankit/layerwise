import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "resp-d" batch. */
export const extrasW4RespD: Record<string, Extra> = {
  'responsible/ai-for-accessibility': {
    takeaways: [
      'AI captions, image descriptions and synthetic voices help most when no human option exists, and do not replace one where accuracy matters.',
      'One accuracy number hides which words are wrong. A dropped "not" or a wrong number can matter more than ten small slips.',
      'Accuracy differs by accent, speech pattern and kind of photo, so test with the people who will use the product and report results by group.',
      'Nothing about us without us: pay disabled people to help design and test, and offer a human option.',
    ],
    prereq: ['start/ai-that-sees-and-hears'],
    quiz: [
      {
        q: 'Two automatic captions of the same clip have the same word error rate. What can still differ between them?',
        options: ['Which words are wrong, and so how much meaning is lost', 'Nothing, because the rate is the same', 'Only the speed of the captions', 'Only the font'],
        answer: 0,
        why: 'The rate counts errors but not which words they hit; a missing "not" can reverse the message.',
      },
      {
        q: 'On a web page, an image is purely decoration. What alt text does the W3C decision tree recommend?',
        options: ['The file name', 'The words "decorative image"', 'A long description of the picture', 'An empty alt attribute'],
        answer: 3,
        why: 'An empty alt attribute tells a screen reader to skip the image, which is right when it adds nothing.',
      },
      {
        q: 'Why does the W3C say automatic captions are not sufficient on their own?',
        options: ['They are always illegal', 'They often contain errors that change the meaning, so they need checking', 'They cannot show punctuation', 'They only work in English'],
        answer: 1,
        why: 'The W3C says they do not meet user needs unless confirmed accurate, and gives an example where one word flips a safety instruction.',
      },
      {
        q: 'What did the World Federation of the Deaf and WASLI say in 2018 about signing avatars?',
        options: ['They are better than interpreters', 'They should replace interpreters for live news', 'They should not replace human signers, especially for live, complex or important information', 'Sign languages cannot be written down'],
        answer: 2,
        why: 'Their statement cautions against avatars as a replacement for human signers and asks for deaf people to be involved.',
      },
    ],
  },
  'responsible/ai-rules-around-the-world': {
    takeaways: [
      'For any AI rule ask five questions: who is covered, what is restricted, what must be disclosed, who enforces it, and from when it applies.',
      'Approaches differ: risk-based, use-specific, developer transparency, content labelling, and principles or promotion. Most laws mix them.',
      'Dates and amendments matter as much as the text: several of these rules changed in the past year, so note when you read a rule.',
      'Read primary sources, not summaries. If you cannot read the instrument, do not repeat the claim.',
    ],
    prereq: [],
    quiz: [
      {
        q: 'Under Article 99 of the EU AI Act, how is the ceiling on a fine for most operator obligations set for a large company?',
        options: ['Always EUR 15 million', 'The lower of EUR 15 million and 3% of turnover', 'The higher of EUR 15 million and 3% of worldwide annual turnover', 'A share of profit only'],
        answer: 2,
        why: 'The Act says up to EUR 15 million or 3% of turnover, whichever is higher; SMEs get the lower figure.',
      },
      {
        q: 'Which of these is best described as principles applied by existing regulators rather than a new statute?',
        options: ['The EU AI Act', 'The UK 2023 white paper approach', 'The Texas Responsible AI Governance Act', 'South Korea\'s Article 43 fines'],
        answer: 1,
        why: 'The 2023 white paper issued five principles on a non-statutory basis for existing regulators to apply.',
      },
      {
        q: 'You cannot open the legislature\'s own page for a law, only a news summary. What does this lesson do?',
        options: ['Use the summary and cite it', 'Leave the claim out or say what could not be read', 'Guess the missing details', 'Copy a law firm\'s table'],
        answer: 1,
        why: 'The lesson only keeps claims it could check against a primary source and says plainly where it could not.',
      },
      {
        q: 'Why are the approach tags in the table "this site\'s own simplification"?',
        options: ['Laws never mix approaches', 'Real laws mix approaches, and the tags are not legal categories', 'The tags come from a regulator', 'Tags are decided by courts'],
        answer: 1,
        why: 'Most laws combine risk-based, use-specific and labelling elements, so any single tag is a rough guide only.',
      },
    ],
  },
};
