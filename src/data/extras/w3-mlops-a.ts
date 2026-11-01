import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 3 "mlops-a" batch. */
export const extrasW3MlopsA: Record<string, Extra> = {
  'systems/from-notebook-to-production': {
    takeaways: [
      'In a real ML system the model is a small box. Most of the risk and effort sits in data, features, serving and monitoring, which is where Sculley et al. place the hidden technical debt.',
      'The lifecycle runs data, features, training, validation, release and monitoring, and monitoring feeds back to the start. Google describes three maturity levels: manual, automated training with data and model validation, and CI/CD of the pipeline itself.',
      'ML adds data tests, model-quality tests and continuous training to ordinary software delivery. Every failure has a cheapest control: a validation gate, a lock file, a shared feature code path, a registry.',
      'Pin code commit, data hash, settings, environment and seeds for each run, and register models with a link to the run. Define "reproduced" as a measured tolerance, not bit-for-bit equality.',
    ],
    prereq: ['ml/getting-data-ready'],
    quiz: [
      { q: 'In the picture from "Hidden Technical Debt in Machine Learning Systems", which part is the small box in the middle?', options: ['The data store', 'The ML code that learns and predicts', 'The monitoring dashboards', 'The serving infrastructure'], answer: 1, why: 'The paper shows the ML code as a small fraction of a real system, surrounded by much larger data, feature, serving and configuration infrastructure.' },
      { q: 'What does Google\'s MLOps level 1 add over level 0?', options: ['Nothing, it is a name for the notebook stage', 'An automated training pipeline with data validation, model validation and triggers (continuous training)', 'Only a bigger model', 'Manual releases a couple of times a year'], answer: 1, why: 'Level 1 automates the pipeline so models are retrained on fresh data, with validation steps that stop bad data or a worse model.' },
      { q: 'Six months later you must rebuild a production model for an audit. Which record is enough to do it?', options: ['The model file and its accuracy', 'The code commit alone', 'Code commit, data snapshot hash, settings, environment versions and seeds', 'The name of the person who trained it'], answer: 2, why: 'A model is the output of code, data, settings, environment and randomness together, so all of them have to be pinned.' },
      { q: 'Training the same recipe twice gives an AUC of 0.909 and 0.914 (example numbers). How should you treat a rebuild that gives 0.911?', options: ['As a failure, because it is not identical', 'As reproduced, because it lies inside the spread you measured across seeds', 'As proof the data changed', 'As a reason to delete the seed'], answer: 1, why: 'PyTorch documents that fully identical results are not guaranteed across releases and platforms, so you define reproduction as a tolerance you measured.' },
    ],
  },
  'systems/data-pipelines-and-data-quality': {
    takeaways: [
      'Validate data before training and stop the pipeline when a check fails. Accuracy notices data faults late and only on average, so use schema, range, distribution and volume checks together.',
      'Thresholds trade missed faults against false alarms. Alerts that fire daily get ignored, and with very large batches almost any difference is statistically significant, so decide the size of shift that matters.',
      'Compute every feature as of the moment of prediction and use one code path for training and serving, or the model leaks the future or sees different inputs live.',
      'Label quality caps model quality. Measure agreement with kappa, review disagreements, and score an LLM labeller against human gold labels class by class.',
    ],
    prereq: ['systems/from-notebook-to-production'],
    quiz: [
      { q: 'A supplier starts sending amounts in pence instead of pounds. The column name and type do not change. Which check catches it?', options: ['A column-type check', 'A range or distribution check on amount', 'A null-rate check on another column', 'None, because the data is valid'], answer: 1, why: 'The type is unchanged, but the values are 100 times larger, so a range limit or a comparison of the batch mean with the reference fires.' },
      { q: 'Why does a validation rule that alerts nearly every day make a pipeline less safe?', options: ['It uses too much compute', 'People learn to ignore the alerts, so a real fault is missed', 'It deletes good data', 'It makes the model overfit'], answer: 1, why: 'Breck et al. note that on-call engineers tend to ignore spammy or non-actionable alerts, so alerts need high precision.' },
      { q: 'A customer ordered on days 1, 10 and 25. To predict on day 10 whether they order again, you use "total orders" from a later export, which says 3. What is wrong?', options: ['Nothing, more data is better', 'The feature includes the order you are trying to predict, so it leaks the answer; the value on day 10 was 2', 'The feature should be 0', 'Three is not a valid count'], answer: 1, why: 'A feature must be computed as of the prediction time. The latest export includes the day-25 order, which is the label event.' },
      { q: 'An LLM agrees with human labels on 94% of 200 items (example), but only 20 items are urgent. What should you check before trusting it?', options: ['Nothing, 94% is high', 'Its precision and recall on the urgent class, using the human gold labels', 'Whether it answers faster than humans', 'Its agreement with itself on a second run'], answer: 1, why: 'Raw agreement hides a rare class. With 20 urgent items, catching only 12 still gives 94% agreement but a recall of 60%.' },
    ],
  },
};
