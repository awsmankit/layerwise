/*
 * Task-exposure sorter for responsible/ai-and-work.
 *
 * Everything here is ILLUSTRATIVE. The two jobs, their tasks, the hours and the starting ratings are invented
 * for teaching and are not data about real workers. The saving percentages are assumptions the learner can change,
 * not estimates from any study.
 *
 * The arithmetic is a simple "task-based" calculation in the spirit of the task literature: a job is a bundle of
 * tasks, so what happens to the job depends on how much time each task takes and how much of it a tool can save.
 */

export type Rating = 'automate' | 'assist' | 'human';
export const RATINGS: Rating[] = ['automate', 'assist', 'human'];
export const RATING_LABEL: Record<Rating, string> = {
  automate: 'AI does it',
  assist: 'AI assists',
  human: 'Keep human',
};

export interface Task {
  id: string;
  label: string;
  /** Hours in an example 40-hour week. */
  hours: number;
  /** Why two reasonable people might sort this differently. */
  note: string;
  /** One reasonable starting view, used by the "fill in a starting view" button. */
  start: Rating;
}

export interface Job {
  id: string;
  name: string;
  intro: string;
  tasks: Task[];
}

export const JOBS: Job[] = [
  {
    id: 'receptionist',
    name: 'Clinic receptionist',
    intro: 'A made-up week for a receptionist at a small medical clinic.',
    tasks: [
      { id: 'calls', label: 'Answer calls and book appointments', hours: 8, start: 'assist', note: 'Routine bookings are easy to script. Callers with odd requests or who are unwell are not.' },
      { id: 'greet', label: 'Greet patients and check them in', hours: 6, start: 'human', note: 'A kiosk can check people in. Many patients still want a person, and some need help.' },
      { id: 'email', label: 'Reply to routine messages (opening hours, directions)', hours: 4, start: 'automate', note: 'Answers are repetitive, but a wrong answer to a worried patient costs trust.' },
      { id: 'remind', label: 'Send appointment reminders', hours: 2, start: 'automate', note: 'Already automated in many places. Someone still has to handle the replies.' },
      { id: 'records', label: 'Update patient records with new details', hours: 5, start: 'assist', note: 'Typing can be automated. Errors in a medical record matter, so somebody has to check.' },
      { id: 'upset', label: 'Calm an upset or anxious patient', hours: 3, start: 'human', note: 'Tone and trust matter here. Some people would accept a tool, many would not.' },
      { id: 'money', label: 'Check insurance details and take payments', hours: 4, start: 'assist', note: 'Rules are clear, but exceptions and disputes need judgement and authority.' },
      { id: 'unwell', label: 'Notice that a patient looks or sounds unwell and alert a nurse', hours: 2, start: 'human', note: 'A short task with high stakes. It depends on being in the room.' },
      { id: 'supplies', label: 'Order supplies and tidy the waiting area', hours: 3, start: 'human', note: 'Ordering could be automated. Tidying a room is a physical task.' },
      { id: 'gaps', label: 'Fill gaps in the schedule after cancellations', hours: 3, start: 'automate', note: 'A matching puzzle, but patients with special needs may not fit the rules.' },
    ],
  },
  {
    id: 'accountant',
    name: 'Junior accountant',
    intro: 'A made-up week for a first-year accountant at a small firm.',
    tasks: [
      { id: 'enter', label: 'Enter invoices and receipts into the ledger', hours: 8, start: 'automate', note: 'Reading documents is something current tools do well, but errors in scans and odd formats remain.' },
      { id: 'reconcile', label: 'Match bank statements to the ledger', hours: 6, start: 'automate', note: 'Mostly rule-based, with a pile of exceptions that need a person to look.' },
      { id: 'reports', label: 'Prepare routine monthly reports', hours: 4, start: 'automate', note: 'The numbers can be produced automatically. Whether they make sense is another question.' },
      { id: 'chase', label: 'Chase late payments by email', hours: 3, start: 'assist', note: 'Drafting is easy. Deciding how firm to be with a long-standing client is not.' },
      { id: 'check', label: 'Check figures for mistakes before sign-off', hours: 4, start: 'assist', note: 'AI can flag oddities, and it can also make mistakes that look tidy.' },
      { id: 'questions', label: 'Answer clients\' questions about their accounts', hours: 4, start: 'assist', note: 'Many questions repeat. Some need knowledge of that client\'s history.' },
      { id: 'meeting', label: 'Explain the numbers in a client meeting', hours: 3, start: 'human', note: 'Clients may expect a named, accountable person to explain and answer for the numbers.' },
      { id: 'rules', label: 'Work out how an unusual tax or accounting rule applies', hours: 4, start: 'assist', note: 'AI can summarise rules, and may state them wrongly with confidence. Someone is responsible for the answer.' },
      { id: 'learn', label: 'Keep up with rule changes and training', hours: 2, start: 'human', note: 'AI can help you learn. Staying up to date is still your job.' },
      { id: 'file', label: 'File working papers for the audit trail', hours: 2, start: 'automate', note: 'Filing is easy to automate. Rules about records and who may change them still apply.' },
    ],
  },
];

export const jobById = (id: string): Job => JOBS.find((j) => j.id === id) ?? JOBS[0];

export type Ratings = Record<string, Rating | undefined>;

export interface Assumptions {
  /** Share of the time on an "AI does it" task that is saved, 0 to 1. */
  saveAutomate: number;
  /** Share of the time on an "AI assists" task that is saved, 0 to 1. */
  saveAssist: number;
  /** Share of the time saved on "AI does it" tasks that goes on checking the AI's work, 0 to 1. */
  checkShare: number;
}

/** Three sets of assumptions to compare. Made-up values that show how much the answer moves, not forecasts. */
export const PRESETS: Record<'cautious' | 'middle' | 'ambitious', { label: string; a: Assumptions }> = {
  cautious: { label: 'Cautious', a: { saveAutomate: 0.5, saveAssist: 0.1, checkShare: 0.4 } },
  middle: { label: 'In between', a: { saveAutomate: 0.8, saveAssist: 0.25, checkShare: 0.25 } },
  ambitious: { label: 'Ambitious', a: { saveAutomate: 0.95, saveAssist: 0.4, checkShare: 0.1 } },
};

export const totalHours = (job: Job): number => job.tasks.reduce((s, t) => s + t.hours, 0);

export function startingRatings(job: Job): Ratings {
  const r: Ratings = {};
  for (const t of job.tasks) r[t.id] = t.start;
  return r;
}

export interface Summary {
  total: number;
  rated: number;
  hours: Record<Rating | 'unrated', number>;
  remaining: number;
  freed: number;
  /** Freed hours as a share of the total, 0 to 1. */
  freedShare: number;
  /** Work a week could hold if the freed time were all used for the same kind of work: total / remaining. */
  capacity: number;
}

/** Unrated tasks count as unchanged (no time saved), so partial sorting never overstates the saving. */
export function summarise(job: Job, ratings: Ratings, a: Assumptions): Summary {
  const hours: Summary['hours'] = { automate: 0, assist: 0, human: 0, unrated: 0 };
  let remaining = 0;
  let rated = 0;
  for (const t of job.tasks) {
    const r = ratings[t.id];
    if (!r) {
      hours.unrated += t.hours;
      remaining += t.hours;
      continue;
    }
    rated += 1;
    hours[r] += t.hours;
    if (r === 'automate') remaining += t.hours * (1 - a.saveAutomate * (1 - a.checkShare));
    else if (r === 'assist') remaining += t.hours * (1 - a.saveAssist);
    else remaining += t.hours;
  }
  const total = totalHours(job);
  return {
    total,
    rated,
    hours,
    remaining,
    freed: total - remaining,
    freedShare: (total - remaining) / total,
    capacity: total / remaining,
  };
}

export const round1 = (x: number): number => Math.round(x * 10) / 10;
