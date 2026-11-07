import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-prompt-versioning',
  title: 'What if prompts are edited live with no versions?',
  blurb: 'Follow 8 edits to a support prompt, see a total score that keeps rising while the refund questions break, and try to find the guilty edit with and without saved versions.',
  area: 'serving',
  level: 'basic',
  minutes: 4,
  why: [
    'A prompt is the instruction text that steers a model. It behaves like code: a small change in wording can fix one kind of question and quietly break another. Teams that edit the prompt in a live system, with no saved copy of each earlier text, keep only the latest text. Nothing records what it said last week.',
    'Without versions you lose three things. You cannot see what changed between a good day and a bad day. You cannot roll back, because the old text is gone, or only half remembered. And you cannot tell which edit is to blame when a complaint arrives, so every one of the edits is a suspect.',
    'With each edit saved as a version, and a fixed set of test cases run against every version, a regression shows up as a number that went down, and you can bisect: test the middle version, then half of what is left, until the first bad version is found. In the toy history on this page, the total score only ever rises, from 12 to 36 out of 40, so a glance at the total says all is well. Yet one edit, keep answers short, dropped the refund cases from 8 passes to 4. That edit also fixed 4 chat cases, which is why the total did not move.',
    'The history and the 40 cases are made-up toy data, and the scoring is a simple rule (each case needs some prompt lines and cannot live with one other line), not real model output. Anthropic\'s guidance on building evaluations says to use many automatically graded test cases that match real traffic, and OpenAI\'s guide describes the loop of defining an eval, running it on test inputs and refining the prompt. Neither page covers storing prompt versions, so that part here is plain software practice.',
  ],
  takeaways: [
    'A prompt change can fix one group of questions and break another, so one total score can hide a regression.',
    'Without saved versions you cannot see what changed, cannot roll back and cannot tell which edit broke what.',
    'Saved versions plus a fixed test set let you bisect: about 3 test runs to find the guilty edit among 8.',
    'Look at scores per group of cases, not only the total.',
  ],
  lessons: ['evals/evals-101', 'evals/building-an-eval-dataset', 'evals/llmops-in-production'],
  sources: [
    { label: 'Create strong empirical evaluations (Anthropic documentation, Claude Platform)', url: 'https://platform.claude.com/docs/en/test-and-evaluate/develop-tests' },
    { label: 'Working with evals (OpenAI API documentation)', url: 'https://developers.openai.com/api/docs/guides/evals' },
  ],
  updated: '2026-11-07',
  predict: {
    question: 'You edit a live prompt 8 times. After most edits your score on 40 test cases went up, ending at 36 of 40. Then a customer complains that refund answers got worse. With no saved versions, what can you do?',
    options: [
      'Look back through the score history, spot the edit where refunds dropped, and undo it.',
      'Not much: you cannot tell which of the 8 edits did it, and the older text is gone.',
      'Re-run the 40 test cases. The failing cases will show which edit caused them.',
    ],
    answer: 1,
    why: 'The total rose from 12 to 36 and never fell, while the refund cases fell from 8 to 4 at edit 4. With saved versions you can bisect and find edit 4 in 3 test runs. Without them, all 8 edits are suspects.',
  },
};
