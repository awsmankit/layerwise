/**
 * Data for the "where did this failure come from?" exercise in the lesson From notebook to production.
 * Seven realistic ML-system failures, the lifecycle stage each one starts at, the cheapest control for it,
 * and where you would otherwise find out. All scenarios are illustrative; none reports a real incident.
 */

export type StageId = 'data' | 'features' | 'training' | 'validation' | 'release' | 'monitoring';

export interface Stage {
  id: StageId;
  label: string;
  /** What happens at this stage, one line. */
  does: string;
}

export const STAGES: Stage[] = [
  { id: 'data', label: 'Data', does: 'Collect, extract and store the raw data the model learns from.' },
  { id: 'features', label: 'Features', does: 'Turn raw data into the inputs the model sees, in training and at serving time.' },
  { id: 'training', label: 'Training', does: 'Run the code, with its libraries and settings, that produces a model.' },
  { id: 'validation', label: 'Validation', does: 'Test the new model and decide whether it may replace the current one.' },
  { id: 'release', label: 'Release', does: 'Register, deploy and roll back model versions.' },
  { id: 'monitoring', label: 'Monitoring', does: 'Watch the live system and decide when to retrain.' },
];

export interface Failure {
  id: string;
  title: string;
  story: string;
  stage: StageId;
  /** Stages that are a defensible second answer: the learner sees "close" rather than "wrong". */
  alsoDefensible?: StageId[];
  /** Why it belongs at `stage`. */
  why: string;
  control: string;
  /** Where the failure would surface if the control were missing. */
  noticedAt: StageId;
  noticedHow: string;
}

export const FAILURES: Failure[] = [
  {
    id: 'upstream-change',
    title: 'A quiet change upstream',
    story:
      'The orders table now has a new status value, "PARTIAL", and a weight column that switched from kilograms to grams. The column names and types are unchanged, so nothing throws an error and the nightly job runs as usual.',
    stage: 'data',
    why: 'The change was made where the data is produced, before any of your code ran. Your code only inherited it.',
    control:
      'Validate every incoming batch before training: allowed categories, value ranges, and a comparison of its distribution with a reference. Stop the pipeline when a check fails. The next lesson builds these checks.',
    noticedAt: 'monitoring',
    noticedHow: 'Weeks later, as a slow fall in live accuracy that nobody can explain.',
  },
  {
    id: 'unpinned-library',
    title: 'An unpinned library',
    story:
      'The training script says "pip install scikit-learn" with no version. A rebuild a month later pulls a newer release with a changed default, and the same code and data give a different model.',
    stage: 'training',
    why: 'The environment is part of what produces the model, and it is set where the training job runs.',
    control:
      'Pin versions in a lock file, build a container image from it, and record the image digest and library versions in every training run.',
    noticedAt: 'validation',
    noticedHow: 'As an unexplained change in the score on the next retrain, or an error when the old version is rebuilt.',
  },
  {
    id: 'skew',
    title: 'Two versions of one feature',
    story:
      'A data scientist computed "days since last order" in pandas for training. The engineers re-implemented it in the serving code, with a different time zone rule. Offline scores look fine; live predictions are off for evening orders.',
    stage: 'features',
    alsoDefensible: ['release'],
    why: 'Two code paths compute the same feature. The mismatch is built in when the feature is defined, even though it only shows when the model is served.',
    control:
      'Share one implementation between training and serving (a shared library or a feature store), and log the features the model actually received so you can compare them with training data.',
    noticedAt: 'monitoring',
    noticedHow: 'Only through live outcomes or a comparison of served and training feature values. Offline tests cannot see it.',
  },
  {
    id: 'average-hides',
    title: 'A better average, a worse slice',
    story:
      'The new model beats the current one by 1.2 points overall, so it is promoted. Two weeks later support finds it is much worse for new customers, who were 8% of the test set.',
    stage: 'validation',
    why: 'A decision was made, with the information on hand, to let this model through.',
    control:
      'A validation gate that compares each candidate with the model in production on the same data, overall and on named slices, with a written minimum for each.',
    noticedAt: 'monitoring',
    noticedHow: 'From complaints or a sliced live metric, after real customers were affected.',
  },
  {
    id: 'no-record',
    title: 'The best model nobody can rebuild',
    story:
      'The model in production came from a notebook run by someone who has since left. The cells were run out of order, the seed was never saved, and the training table has been overwritten twice.',
    stage: 'training',
    alsoDefensible: ['data'],
    why: 'Training happened without a record of its inputs. The fix is to record the code, data version, settings and seed of every run.',
    control:
      'Track every run (code commit, data snapshot, parameters, seed, environment, metrics) and register models with a link back to the run that made them.',
    noticedAt: 'release',
    noticedHow: 'The day you need to retrain, audit or explain the model, and cannot.',
  },
  {
    id: 'no-rollback',
    title: 'A release that cannot be undone',
    story:
      'A new model version is deployed by copying a file over the old one. Errors rise within the hour, and the previous file is gone. Rebuilding it takes two days.',
    stage: 'release',
    why: 'The failure is in how models are stored and swapped, not in how they were trained.',
    control:
      'A model registry with immutable numbered versions and an alias such as "production" that you can move back in one step; deploy to a small share of traffic first.',
    noticedAt: 'release',
    noticedHow: 'Immediately, in the worst way: during the incident.',
  },
  {
    id: 'silent-drift',
    title: 'The world changes, labels arrive late',
    story:
      'A forecasting model was accurate at launch. Customer behaviour shifts after a price change. The true outcomes only arrive six weeks later, so the accuracy dashboard stays green while predictions get worse.',
    stage: 'monitoring',
    why: 'Nothing in the build was wrong. The world moved after release, and the system had no way to see it.',
    control:
      'Monitor inputs and predictions, which are available at once, alongside delayed outcome metrics; set alerts and a retraining trigger for each.',
    noticedAt: 'monitoring',
    noticedHow: 'Only after the labels arrive, unless inputs and predictions are watched too.',
  },
];

export type Verdict = 'correct' | 'close' | 'wrong';

export function stageLabel(id: StageId): string {
  return STAGES.find((s) => s.id === id)?.label ?? id;
}

export function failureById(id: string): Failure | undefined {
  return FAILURES.find((f) => f.id === id);
}

/** Judge one placement. */
export function judge(failureId: string, stage: StageId): Verdict {
  const f = failureById(failureId);
  if (!f) return 'wrong';
  if (f.stage === stage) return 'correct';
  if (f.alsoDefensible?.includes(stage)) return 'close';
  return 'wrong';
}

export interface Tally {
  placed: number;
  correct: number;
  close: number;
  wrong: number;
}

/** Summarise a set of placements keyed by failure id. */
export function tally(placements: Record<string, StageId>): Tally {
  const t: Tally = { placed: 0, correct: 0, close: 0, wrong: 0 };
  for (const [id, stage] of Object.entries(placements)) {
    t.placed += 1;
    t[judge(id, stage)] += 1;
  }
  return t;
}
