import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 5 "lessons-b" batch. */
export const extrasW5LessonsB: Record<string, Extra> = {
  'start/ai-and-careers': {
    takeaways: [
      'AI work comes in four kinds: building AI, checking it, teaching it with labelled examples, and using it in an ordinary job.',
      'A job is a bundle of tasks. AI is better at some tasks than others, so it often changes a job before it replaces it.',
      'Skills that show up across the job cards are curiosity, clear writing and thinking, knowing a field, and patience and care.',
      'Nobody knows which jobs will exist in 2040. Projections are careful guesses, and the statisticians who make them say the uncertainty about AI is very high.',
    ],
    prereq: ['start/what-is-ai-in-plain-english'],
    quiz: [
      { q: 'A nurse reads a computer warning in a patient record, then decides what to do. Which kind of AI work is this?', options: ['Building AI', 'Using AI as one tool in an ordinary job', 'Teaching AI with labelled examples', 'Checking AI for mistakes'], answer: 1, why: 'The nurse is not building the AI. It is one more tool, and the nurse still decides.' },
      { q: 'Why do researchers study tasks and not whole jobs?', options: ['Because jobs are too hard to count', 'Because a job is made of many small tasks, and AI fits some better than others', 'Because tasks are always done by machines', 'Because every job has the same tasks'], answer: 1, why: 'A job is a bundle of tasks, so what AI can do to a job depends on which tasks it can help with.' },
      { q: 'A report says a job is "exposed" to AI. What does that mean?', options: ['The job will disappear soon', 'The job is safe', 'AI could do or help with some of its tasks, which is not the same as job loss', 'Nobody does that job any more'], answer: 2, why: 'Exposure only says a tool could touch some tasks. The US statisticians say it does not imply job loss.' },
      { q: 'Which is the most honest thing to say about jobs in 2040?', options: ['Robots will do everything', 'Nothing will change', 'AI will create more jobs than it removes', 'Nobody knows for sure, and careful projections say the uncertainty is very high'], answer: 3, why: 'Projections are careful guesses under stated assumptions, not promises.' },
    ],
  },
  'responsible/ai-and-work': {
    takeaways: [
      'Jobs are bundles of tasks. Exposure of a task to AI is not job loss, and the Bureau of Labor Statistics says so itself.',
      'Field studies measure productivity on tasks, not jobs lost, and results differ with task, people, tool and date: 55.8% faster in one, 19% slower in another, and the slowdown result was later called out of date by its own authors.',
      'Official projections and payroll data show no broad employment collapse so far, along with early signs of weaker hiring for young workers in exposed jobs. Both are descriptive and uncertain.',
      'Plan by measuring your own tasks, keeping checking skills sharp, and deciding in advance what happens to freed time. Give no forecast.',
    ],
    prereq: ['start/ai-and-careers', 'ml/is-the-difference-real'],
    quiz: [
      { q: 'Eloundou and colleagues found about 80% of US workers could have at least 10% of their tasks affected by language models. What does that show?', options: ['That 80% of jobs will disappear', 'That exposure is widespread, but not that jobs will be lost or when', 'That 80% of workers use AI every day', 'That AI is already as good as people at those tasks'], answer: 1, why: 'It is an exposure rating. The authors make no prediction about timing, and exposure is not job loss.' },
      { q: 'In the sorter, even when every task is given to AI at 80% time saved and a quarter of that saving spent checking, 16 of 40 hours remain. Why?', options: ['The AI is slow', 'Checking the AI\'s work takes time, so the saving is less than 80%', 'Some hours cannot be sorted', 'The assumptions are wrong'], answer: 1, why: '40 x (1 - 0.8 x 0.75) = 16: a quarter of the saving goes on checking, so the job does not vanish.' },
      { q: 'One study found experienced developers took 19% longer with AI, and another found developers 55.8% faster. What is the best reading?', options: ['One of them must be a mistake', 'They measured different tasks, people, tools and dates, so they do not contradict each other', 'Faster always wins', 'AI works only for beginners'], answer: 1, why: 'Studies answer narrow questions. METR also says its 2025 result is out of date, so check the date and scope.' },
      { q: 'The Stanford payroll study found employment of 22 to 25 year olds in the most exposed jobs about 19% below its counterfactual. What do the authors say about it?', options: ['It proves AI caused job losses', 'It shows widespread displacement across the economy', 'These are descriptive patterns, not causal estimates, and no economy-wide displacement is seen', 'It only applies to older workers'], answer: 2, why: 'The authors say the results are descriptive and that gaps shrink when education is accounted for.' },
    ],
  },
  'skills/reading-an-ai-paper': {
    takeaways: [
      'Read a paper in passes: a quick look at title, abstract, headings and conclusion, then the figures and tables, and re-create the work only if you must.',
      'An abstract is a list of claims and headline numbers. The evidence and the doubts live in the tables, the ablations and the conclusion.',
      'In a results table, check the baseline, whether the comparison is fair, the spread over runs, which data was tested, any ablations, and the cost.',
      'Look for the code and check it: a README, a licence, a recent update, and a script that reproduces the main table. Keep five-line notes with a link and a date.',
    ],
    prereq: ['start/how-computers-learn'],
    quiz: [
      { q: 'You have ten minutes and a new paper. What should you read first?', options: ['Every word from the start', 'The title, abstract, headings and conclusions, then decide whether to go on', 'Only the references', 'Only the proofs'], answer: 1, why: 'Keshav\'s first pass is a five-to-ten-minute look at the title, abstract, headings and conclusions.' },
      { q: 'A table shows a new model at 92.0 ± 0.9 and a baseline at 91.2 ± 0.3. What is the safest conclusion?', options: ['The new model is clearly better', 'The baseline is broken', 'The gap of 0.8 is smaller than the spread, so it could be luck', 'The new model is smaller'], answer: 2, why: 'A gap smaller than the run-to-run spread may be luck. Look for more runs or a proper test.' },
      { q: 'What does an ablation tell you?', options: ['Which part of the method actually matters, found by removing parts and measuring what drops', 'How long the paper is', 'Who funded the work', 'Whether the code is archived'], answer: 0, why: 'An ablation removes one piece at a time. The size of the drop shows how much that piece matters.' },
      { q: 'The abstract of a paper says 41.8 but the results text says 41.0 for the same test. What do you do?', options: ['Trust the abstract, it is the summary', 'Average them', 'Reject the whole paper', 'Check the table, note the mismatch, and treat it as a reason to read more carefully'], answer: 3, why: 'Numbers sometimes disagree inside real papers. The table is the better source, and a note is enough.' },
    ],
  },
};
