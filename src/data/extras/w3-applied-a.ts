import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 3 "applied-a" batch. */
export const extrasW3AppliedA: Record<string, Extra> = {
  'ml/recommenders-and-ranking': {
    takeaways: [
      'Recommending is ranking: pick a short list and order it. Beat a most-popular baseline before adding anything clever.',
      'Matrix factorisation gives every person and item k hidden numbers and predicts from their dot product. Cold start is the weak spot of collaborative methods.',
      'Production systems retrieve candidates fast (often a two-tower model plus nearest-neighbour search), rank them with a richer model, then re-rank for freshness, variety and fairness.',
      'Score lists with precision at k, recall at k and NDCG, then confirm with an A/B test. A recommender changes its own training data, so plan for exploration.',
    ],
    prereq: ['foundations/classical-ml-essentials', 'foundations/tokens-and-embeddings'],
    quiz: [
      { q: 'Why does a two-stage design (retrieve, then rank) exist?', options: ['Two models always beat one', 'A heavy model cannot be run on millions of items, so a fast stage first cuts the list to a few hundred', 'Ranking needs no data', 'It removes the need for evaluation'], answer: 1, why: 'The first stage must be fast over the whole catalogue. The slower, richer ranker only sees the few hundred survivors.' },
      { q: 'A brand-new film has no ratings. What happens to a pure collaborative-filtering method?', options: ['It recommends it to everyone', 'It cannot place the film, because it has no behaviour to compare', 'It guesses from the title', 'It works better than before'], answer: 1, why: 'Collaborative filtering uses only behaviour. With none, there is nothing to compare, so item features or deliberate exposure are needed.' },
      { q: 'A list returns relevance grades 3, 2, 3, 0, 1, 2 and the best possible ordering scores a DCG of 7.141. The list scores 6.861. What is NDCG?', options: ['0.961', '1.041', '6.861', '0.500'], answer: 0, why: 'NDCG is DCG divided by the best possible DCG: 6.861 / 7.141 is about 0.961.' },
      { q: 'A system ranks films by total clicks and only ever shows its top three. What is the likely result?', options: ['It finds the best film quickly', 'Films that are rarely shown cannot collect clicks, so the early leaders stay on top', 'Every film is shown equally', 'Clicks stop mattering'], answer: 1, why: 'Showing only the leaders feeds the leaders more clicks. Without exposure for others, the loop locks in.' },
    ],
  },
  'ml/time-series-forecasting': {
    takeaways: [
      'Beat the naive and seasonal-naive baselines first. If you cannot, nothing more complicated is worth shipping.',
      'Compare methods with MASE or a ratio to seasonal naive. MAPE breaks near zero and treats over- and under-forecasts unequally.',
      'Trees cannot go beyond the range they were trained on, so remove the trend (predict the change from last year) before using boosted trees on lag features.',
      'Evaluate with a rolling-origin backtest that trains only on the past. Shuffled splits hide leaks such as an unshifted rolling average.',
    ],
    prereq: ['foundations/classical-ml-essentials', 'ml/gradient-boosting'],
    quiz: [
      { q: 'A forecast of 50 is made for an actual of 100, and another of 100 for an actual of 50. What does MAPE give?', options: ['50% for both', '50% for the first and 100% for the second', '100% for the first and 50% for the second', '0% for both'], answer: 1, why: 'MAPE divides by the actual value, so the same miss of 50 is 50% of 100 but 100% of 50.' },
      { q: 'Seasonal naive makes an average error of 7.22 on the training months. Your model has an error of 3.10 on the test months. What is the MASE?', options: ['0.43', '2.33', '4.12', '10.32'], answer: 0, why: 'MASE divides the error by the training seasonal-naive error: 3.10 / 7.22 is about 0.43, so it beats the baseline.' },
      { q: 'Why shouldn\'t you split a time series into random train and test rows?', options: ['Random splits are slower', 'It trains on the future to predict the past and lets leaks through', 'Time series have no rows', 'The test set becomes too large'], answer: 1, why: 'A forecast only ever has the past available, so evaluation must train on earlier data and test on later data.' },
      { q: 'A boosted-tree model trained on raw sales levels flattens out while sales keep rising. What is the usual fix?', options: ['Add more trees', 'Predict the change from the same period last year and add it back', 'Shuffle the rows', 'Use a smaller test set'], answer: 1, why: 'Trees average values they have seen, so they cannot extrapolate. Removing the trend first lets them model what is left.' },
    ],
  },
};
