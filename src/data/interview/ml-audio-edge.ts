import type { Question } from './types';

/**
 * Classical ML, deep learning, audio and speech, and edge / on-device questions
 * (wave 5, batch interview-a). Every number in an estimation answer was recomputed
 * in a scratch script (/tmp/gaps/scratch/interview_a_check*.py) and matches the
 * lesson it comes from. Hardware, model and price figures are labelled examples or
 * assumptions stated in the prompt, not quotes.
 */
export const questionsMlAudioEdge: Question[] = [
  // ---------------------------------------------------------------- classical ML
  {
    id: 'forecast-backtest-and-leakage',
    prompt:
      "A retailer's weekly demand forecaster, a gradient-boosted model on lag features, scored a 6% MAPE on a random 80/20 split of weeks. In its first month live, the error is more than double. One feature is a 4-week rolling average of sales, and nobody compared it with a seasonal-naive forecast. What do you suspect, how would you re-evaluate it, and what would you report?",
    roles: ['ml-eng'],
    level: 'mid',
    kind: 'debugging',
    topics: ['time series', 'forecasting', 'leakage', 'evals'],
    minutes: 15,
    strong: [
      "A random split of ordered rows trains on the future to predict the past. The safe default is a rolling-origin backtest: pick an origin, train only on what came before, forecast the next stretch, score it, move the origin forward, repeat and average, and look at the spread across origins (one split is a thin basis for a choice).",
      "Suspects the rolling average: if the window includes the week being predicted (not shifted by one), the target leaks into the input and the shuffled-split error can fall towards zero. Every feature must be computable at forecast time; also check scaling, imputation or tuning fitted on the whole series, data that was corrected later, and 'actual weather' used where only a forecast exists (calendar features such as holidays are fine because they are known in advance).",
      "Baselines first: mean, naive (last value), seasonal naive (same week last year) and drift. Seasonal naive is hard to beat on a strongly seasonal series, so report the model against it, for example as MASE (the model's MAE divided by the in-sample seasonal-naive MAE; an example of 3.10 / 7.22 is 0.43, and below 1 means better than that baseline).",
      "Chooses the error measure on purpose: MAPE is undefined when an actual is zero, explodes near zero and is lopsided (forecasting 50 for an actual of 100 scores 50%, forecasting 100 for an actual of 50 scores 100%, for the same miss of 50). MAE is in the series' units, RMSE punishes big misses, MASE compares across series.",
      "Notes that trees predict by averaging training values, so they cannot go beyond the range they saw: on a rising series, remove the trend first (for example predict the change from the same week last year and add it back) or combine with a model that extrapolates.",
      "Evaluates at the horizon the planners use (multi-step forecasts need recursive or per-horizon models) and checks prediction intervals in the backtest by counting how often the actual value lands inside the stated range.",
    ],
    followUps: [
      {
        q: "After you shift the rolling mean by one week, the backtest error rises from 6% to 11%. Has the model got worse?",
        lookFor:
          "No: the 6% was inflated by leakage and 11% is the honest figure. The comparison that matters is against seasonal naive on the same origins; the model is only useful if it beats it clearly.",
      },
      {
        q: "The series keeps climbing and the boosted model's forecasts flatten at the top of its training range. Why, and what do you do?",
        lookFor:
          "A tree repeats the nearest leaf, an average of training values, so it cannot extrapolate. Detrend (predict the difference from a year ago or the residual of an exponential-smoothing fit) and add the trend back, or use a method with a trend term.",
      },
      {
        q: "Is a random K-fold split ever acceptable for time series?",
        lookFor:
          "Published work shows K-fold can be valid for purely autoregressive models with uncorrelated errors, but it says little about multi-step forecasts, can struggle when the level shifts, and hides leaks; a rolling origin is the safe default.",
      },
    ],
    redFlags: [
      "Shuffles time-ordered rows or reports a single train/test split.",
      "Includes the current period in a rolling feature, or fits scalers and imputers on the whole series.",
      "Never compares with a naive or seasonal-naive baseline.",
      "Uses MAPE on intermittent demand with zeros.",
    ],
    lessons: ['ml/time-series-forecasting', 'ml/getting-data-ready', 'foundations/classical-ml-essentials'],
  },
  {
    id: 'code-gradient-boosting-two-rounds',
    prompt:
      "Write gradient boosting for squared error with depth-1 trees (stumps) and a learning rate, without a library. Then run it by hand on x = 1, 2, 3, 4, 5 and y = 3, 5, 4, 9, 11 with a learning rate of 0.5, and give the training error after each of two rounds. Finally, tell me how you would choose the number of rounds on real data and how boosting differs from a random forest.",
    roles: ['ml-eng'],
    level: 'mid',
    kind: 'coding',
    topics: ['classical ml', 'gradient boosting', 'trees', 'coding'],
    minutes: 25,
    strong: [
      "Starts from a constant, the mean of y (6.4). Each round computes residuals (actual minus current prediction, which for squared error is the negative gradient of the loss), fits a stump to the residuals by trying each midpoint between sorted x values and keeping the cut with the smallest squared error, sets each leaf to the mean residual on its side, and adds learning_rate times the leaf value to the predictions. Predict = base + learning_rate x the sum of all stumps.",
      "Round 0: predictions all 6.4, residuals -3.4, -1.4, -2.4, 2.6, 4.6, total squared error 47.2.",
      "Round 1: the best cut is between x = 3 and x = 4, leaf values -2.4 and +3.6; at half strength the predictions are 5.2, 5.2, 5.2, 8.2, 8.2 and the error falls to 14.8.",
      "Round 2: the stump again cuts between 3 and 4, leaf values -1.2 and +1.8; predictions 4.6, 4.6, 4.6, 9.1, 9.1 and the error falls to 6.7.",
      "Implementation hygiene: candidate cuts only between distinct sorted values, an O(n) scan with running sums per feature rather than recomputing each cut, a guard for an empty side, and stumps stored so prediction replays them.",
      "Explains the name: for squared error the residual is the negative gradient, so each tree is a gradient step in prediction space; for log loss or other losses each tree is fitted to that loss's negative gradient, which is no longer the plain residual.",
      "Chooses the number of rounds by early stopping: train to a generous maximum, score a held-back validation set after every round, stop after a patience window without improvement and keep the best round. Training error always falls; validation error falls then rises. A smaller learning rate needs more rounds. The validation set is now part of the model, so keep a separate test set.",
      "Contrasts with a random forest: a forest grows deep trees independently on bootstrap samples and averages them (lowers variance); boosting grows small trees in sequence, each aimed at what is still wrong, and is more sensitive to rounds, learning rate, depth, subsampling and regularisation.",
    ],
    followUps: [
      {
        q: "Set the learning rate to 1.0 and rerun round 1. What is the error, and why do practitioners still use small rates?",
        lookFor:
          "Predictions 4, 4, 4, 10, 10 and a squared error of 4.0, much lower than 14.8 after one round. That aggressiveness is exactly the risk: each tree chases the current residuals including noise. Many small steps with more rounds are more cautious and usually generalise better, at the price of training time.",
      },
      {
        q: "Validation loss starts rising after 150 trees while training loss keeps falling. What do you do?",
        lookFor:
          "Early stopping at the best round; then lower the learning rate, use shallower trees, row and column subsampling, a minimum number of rows per leaf or penalties; check that validation data resembles training data and that nothing leaks.",
      },
      {
        q: "When would you choose a random forest over boosting, or neither?",
        lookFor:
          "A forest works reasonably out of the box and gives an out-of-bag estimate; boosting often wins on tables with tuning. Benchmarks on medium-sized tabular data have favoured tree ensembles over neural networks, but the gap depends on datasets and tuning, and a logistic regression baseline should be run first.",
      },
    ],
    redFlags: [
      "Fits each tree to y instead of the residuals, or adds the full correction without a learning rate.",
      "Chooses the number of rounds from training error.",
      "Uses the validation score as the final reported performance.",
      "Claims boosting always beats neural networks on tabular data.",
    ],
    lessons: ['ml/gradient-boosting', 'ml/decision-trees-and-random-forests'],
  },
  {
    id: 'ab-test-sample-size-and-peeking',
    prompt:
      "We changed a ranking model and want to A/B test it. Baseline conversion is 4.0% and we care about an absolute lift of 0.2 percentage points (4.0% to 4.2%). Two-sided 5% significance, 80% power, equal split, normal approximation. Roughly how many users per arm do we need, how long does that take at 20,000 users per arm per day, and how do we avoid fooling ourselves with the result?",
    roles: ['ml-eng', 'ai-eng'],
    level: 'mid',
    kind: 'estimation',
    topics: ['a/b testing', 'statistics', 'evals', 'sample size'],
    minutes: 15,
    strong: [
      "Uses n per arm = 2 x p-bar x (1 - p-bar) x (z_alpha + z_beta)^2 / delta^2 with z = 1.96 and 0.84 (sum 2.80, squared about 7.85), p-bar = 0.041 and delta = 0.002: about 154,000 users per arm.",
      "Turns it into time: 154,000 / 20,000 is about 7.7 days, so run whole weeks (14 days) to cover weekly cycles. Notes the scaling: halving the detectable gap needs about four times the users (this gap is a 5% relative lift).",
      "Fixes the minimum effect worth detecting, the metric, the randomisation unit (user, not request) and the stopping rule before starting; checks that the split ratio came out as designed.",
      "Explains the p-value correctly: how surprising a gap at least this big would be if there were no real difference. It is not the chance the new model is better and it says nothing about size, so report the effect size with an interval.",
      "Does not peek: checking daily and stopping the first time p < 0.05 inflates false positives. Use a fixed horizon, or a sequential method designed for repeated looks.",
      "Treats many variants or metrics as a multiple-comparison problem: 20 comparisons at 5% give 1 - 0.95^20 = 64% chance of at least one false alarm. Use a stricter threshold (Bonferroni 0.05 / 20 = 0.0025) or confirm the winner on fresh traffic.",
      "Notes that with enormous samples a trivial gap becomes significant, so decide beforehand whether the gap is worth the cost of shipping.",
    ],
    followUps: [
      {
        q: "On day 4 the dashboard shows p = 0.03 for the new model and the product manager wants to ship. What do you say?",
        lookFor:
          "The planned sample is not reached and repeated looks inflate false positives; keep to the pre-agreed horizon or a pre-registered sequential rule, check the split ratio and guardrail metrics, and beware novelty effects.",
      },
      {
        q: "We also compare two model versions offline on the same 100 test cases: A passes 80, B passes 83. Ship B?",
        lookFor:
          "The standard error of 80% on 100 cases is 4 points. Compare on the same cases (paired): if the disagreements are 8 cases B wins and 5 A wins, a sign test gives p of about 0.58, and a bootstrap interval for the gap includes zero. Gaps like this need many more cases; pairing needs fewer (about 469 cases for a 5-point gap when the models disagree on 15% of cases, versus about 1,252 per model unpaired from a 70% rate).",
      },
      {
        q: "Many sessions come from the same heavy users. What changes?",
        lookFor:
          "Randomise and analyse at the user level; sessions are not independent, so intervals computed as if they were are too narrow; the effective sample size is smaller than the session count.",
      },
    ],
    redFlags: [
      "Declares a win from 4.0% versus 4.2% on a few thousand users.",
      "Stops the test as soon as it turns significant.",
      "Reads the p-value as the probability that the new model is better.",
      "Picks the sample size without choosing a minimum effect.",
    ],
    lessons: ['ml/is-the-difference-real', 'evals/evals-101'],
  },
  {
    id: 'anomaly-detector-alert-budget',
    prompt:
      "A detector will watch 100,000 events a day; about 1 in 10,000 is a genuine anomaly (10 a day). In testing it catches 90% of real anomalies and wrongly flags 0.1% of ordinary events. The on-call team can review about 20 alerts a day. Is this detector usable? What false-alarm rate would you need, and what would you do about it?",
    roles: ['ml-eng', 'ml-platform'],
    level: 'senior',
    kind: 'estimation',
    topics: ['anomaly detection', 'base rate', 'thresholds', 'monitoring'],
    minutes: 20,
    strong: [
      "Counts rather than quoting rates: 10 real anomalies, 9 caught; 99,990 ordinary events x 0.1% is about 100 false alerts; about 109 alerts a day, of which about 8% (9 / 109) are real. That is five times the review budget and mostly noise.",
      "Explains why: when anomalies are rare, even a small false-alarm rate on the huge ordinary population swamps the true positives. Accuracy is useless here (predicting 'normal' for everything is 99.99% accurate).",
      "Works out the target: at 0.01% false alarms there are about 10 false plus 9 real alerts, 19 a day, about 47% real, which fits the budget. At 1% it would be about 1,000 false alerts and under 1% real.",
      "Options: raise the threshold and accept lower recall; set the threshold from an alert budget (about 20 a day) and measure the precision you get; tier the response (a cheap automatic action for a mild score, a page only for a high one); add a second-stage check; log reviewer verdicts and use them as labels for a supervised model on top of the unsupervised score.",
      "Chooses the threshold from costs: count a missed anomaly as costing m false alarms and minimise m x misses + false alarms. Notes alarm fatigue (clinical monitoring reviews report most alarms being false, and ignored as a result).",
      "Shows the reason for each alert (which column, which seasonal hour, nearest normal examples) and watches for drift: if normal moves, scores shift and alert volume jumps.",
    ],
    followUps: [
      {
        q: "Take ten readings: 20.1, 19.8, 20.3, 20.0, 19.9, 20.2, 20.1, 19.7, 45.0 and 52.0. A |z| > 3 rule flags neither fault. Why, and what do you use?",
        lookFor:
          "Masking: the two faults inflate the mean (25.7) and the sample standard deviation (12.1), so their z-scores are about 1.6 and 2.2; with n = 10 the largest possible z is (n - 1) / sqrt(n) = 2.85, so a threshold of 3 can never fire. Use robust statistics: median 20.1 and MAD 0.2 give modified z-scores (0.6745 x (x - median) / MAD) of about 84 and 108, against a rule-of-thumb threshold of 3.5; or IQR fences.",
      },
      {
        q: "Traffic is about 30 requests at 03:00 and 170 at 15:00. A reading of 100 at 03:00 scores under 1 on a plain z-score. Fix it.",
        lookFor:
          "Remove what is expected first: subtract the median for the same hour on other days, then apply a robust score to the remainder; in general forecast, then flag what the forecast could not explain.",
      },
      {
        q: "Half your anomalies sit in the empty gap between two normal groups, where each coordinate looks ordinary.",
        lookFor:
          "Per-column rules miss combinations. An isolation forest (anomalies need few random cuts to isolate) catches more but is not a cure for gap points; consider density or distance methods, or reconstruction error from an autoencoder trained on normal data, each with its own threshold to set.",
      },
    ],
    redFlags: [
      "Celebrates '90% recall and only 0.1% false alarms' without computing the alert count.",
      "Uses accuracy to judge a detector for rare events.",
      "Applies |z| > 3 to a handful of values.",
      "Ships with no way to record reviewer verdicts.",
    ],
    lessons: ['ml/anomaly-detection', 'ml/is-the-difference-real', 'systems/monitoring-and-drift'],
  },
  {
    id: 'clustering-tsne-segments-claim',
    prompt:
      "An analyst took 10-dimensional customer features (age, income in pounds, visits per month and so on), ran t-SNE to get a 2D picture with three clear islands, then ran k-means with k = 3 on the 2D coordinates. The slide says: 'three customer segments, and island C is far from the others so it is a very different group'. What is wrong with this, and how would you do the analysis properly?",
    roles: ['ml-eng'],
    level: 'mid',
    kind: 'debugging',
    topics: ['clustering', 'dimensionality reduction', 't-sne', 'k-means'],
    minutes: 15,
    strong: [
      "Features were not put on a common scale: distance is dominated by the largest-unit column. Two customers aged 25 and 55 with incomes of 50,000 and 51,000 are sqrt(30^2 + 1000^2) = about 1000.45 apart, so age is almost invisible. Standardise first, inside a pipeline.",
      "t-SNE and UMAP draw neighbourhoods, not scale drawings: cluster sizes, the gaps and distances between clusters, and even the number of islands depend on perplexity or neighbour count and the seed, and random noise can look like clumps. Look at several settings and never read distances or sizes from one picture.",
      "Cluster in the original scaled space (or after PCA), then colour the picture, instead of clustering the picture. Checks how well the layout preserves each point's neighbours.",
      "k-means needs k, finds only a local best that depends on its start (use k-means++ and several starts, keep the lowest inertia), and assumes round, similar-sized clusters. Inertia always falls as k grows, so the elbow and the silhouette score are aids, not proof; the silhouette favours compact blobs and can prefer a wrong answer on moons or rings.",
      "Considers alternatives when the shape is not round: DBSCAN (crowded regions, a noise label, one global radius eps that struggles with mixed densities) or hierarchical clustering (a dendrogram you cut afterwards, with linkage as a choice).",
      "Judges segments by the decision they feed: do they respond differently to an offer, do ten examples from each read as coherent, are they stable across resamples. PCA's explained-variance shares are a cheap first look, after scaling.",
    ],
    followUps: [
      {
        q: "By hand: points 1, 2, 3, 10, 11, 12, k = 2, starting centres 1 and 2. What does k-means do and what is the final inertia?",
        lookFor:
          "Round 1: 1 joins the first centre and 2, 3, 10, 11, 12 the second, so centres move to 1 and 7.6. Round 2: {1, 2, 3} and {10, 11, 12}, centres 2 and 11. Nothing changes after that. Inertia (1 + 0 + 1) + (1 + 0 + 1) = 4. The silhouette of the point 2 is (9 - 1) / 9 = 8/9 and the average over all six is about 0.85.",
      },
      {
        q: "The silhouette on the t-SNE output is 0.6. Does that confirm the segments?",
        lookFor:
          "No. It measures compactness in a picture t-SNE itself made, and the score favours compact blobs. Evaluate in the original space and against the business use.",
      },
      {
        q: "The real structure is two concentric rings. What do you use?",
        lookFor:
          "k-means cuts straight across rings. DBSCAN (choose eps from a k-distance plot) or single-linkage hierarchical clustering follows the shape; check the silhouette does not mislead.",
      },
    ],
    redFlags: [
      "Reads distances or cluster sizes off a t-SNE plot.",
      "Does not scale the features.",
      "Picks k by looking at the plot, or runs k-means once.",
      "Treats a good silhouette as proof the segments are real.",
    ],
    lessons: ['ml/clustering-and-dimensionality-reduction', 'ml/getting-data-ready'],
  },
  {
    id: 'recommender-two-stage-retrieval-and-ranking',
    prompt:
      "Design the 'recommended for you' strip for a streaming app with 1,000,000 titles, 20 million users and a 150 ms budget for the whole recommendation call. Cover the models, how you get from a million titles to the ten shown, cold start, how you evaluate offline and online, and what can go wrong over time.",
    roles: ['ml-eng', 'ai-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['recommenders', 'ranking', 'retrieval', 'system design'],
    minutes: 40,
    strong: [
      "Starts from the dullest baseline, a most-popular list, which is strong and the same for everyone; any fancier method must beat it. The user-item matrix is mostly blank.",
      "A funnel, because a heavy model cannot score a million titles in the budget: candidate generation (fast, often a two-tower model where a user tower and an item tower produce vectors and the score is their dot product) cuts to hundreds; a richer ranker that sees user, item and context features together scores those; a re-ranking stage applies rules (drop what was seen or rejected, freshness, diversity, caps per provider). Example sizes: 1,000,000 to 500 to 50 to 10.",
      "Item vectors do not depend on the user, so compute them offline and search an approximate nearest-neighbour index. Checks the arithmetic: 1,000,000 items x 64 dimensions x 4 bytes is 256 MB, small enough for memory; an exact scan is 64 million multiply-adds per request, which is wasteful at scale.",
      "Training details that matter: positives from plays; negatives that are shown-but-not-played teach more than random negatives, which are too easy; a dot product is a strong default for combining embeddings. Notes what the first stage gives up: it cannot model fine user-item interactions, which is why a second-stage ranker adds accuracy.",
      "Cold start: new users get popularity, a few onboarding questions or context; new titles are placed from content features (genre, text, an image embedding) through the item tower, plus deliberate exposure.",
      "Evaluation: hold out liked items offline and report precision, recall and NDCG at k, remembering the logged data came from the old system; confirm with an online A/B test on watch time, returns and guardrails, sized properly.",
      "Failure modes: a feedback loop (shown items collect clicks, so get shown more), narrowing and homogeneity, starved providers; mitigate with exploration slots, coverage metrics, caps and multisided fairness measures.",
    ],
    followUps: [
      {
        q: "NDCG@10 is up 3% offline but the A/B test is flat. Why?",
        lookFor:
          "Offline labels come from what the old system showed (selection and position bias), the metric is a proxy for watch time or returns, short-term clicks can differ from satisfaction, novelty fades, and the test may be underpowered.",
      },
      {
        q: "Three weeks after launch the long tail of titles gets almost no exposure. Diagnose.",
        lookFor:
          "A feedback loop: rarely shown items cannot collect clicks, so ranking by raw clicks locks in the leaders. A small share of random exposure helped in the lesson's toy simulation; real systems use more careful exploration, plus provider caps.",
      },
      {
        q: "Why not one big model that scores all 1,000,000 titles?",
        lookFor:
          "Latency and cost: the heavy model runs on a few hundred candidates only; the cheap first stage keeps recall high so the ranker has good candidates.",
      },
    ],
    redFlags: [
      "One model scored over the whole catalogue per request.",
      "No popularity baseline.",
      "Evaluates only rating prediction error, or only offline.",
      "No plan for cold start or for the loop between recommendations and training data.",
    ],
    lessons: ['ml/recommenders-and-ranking', 'rag-agents/vector-search-and-retrieval-metrics', 'ml/is-the-difference-real'],
  },
  {
    id: 'code-ndcg-at-k',
    prompt:
      "Write precision@k, recall@k and NDCG@k for one ranked list in Python, without libraries. Check your NDCG on this list of relevance grades, in the order the system returned them: 3, 2, 3, 0, 1, 2. Then tell me how you handle edge cases, and why NDCG is a better yardstick than accuracy for a ranked list.",
    roles: ['ml-eng', 'ai-eng'],
    level: 'mid',
    kind: 'coding',
    topics: ['ranking', 'ndcg', 'metrics', 'coding'],
    minutes: 20,
    strong: [
      "Precision@k = relevant items in the top k / k. Recall@k = relevant items in the top k / all relevant items for the query, which needs the total number of relevant items, not just those returned. Defines 'relevant' explicitly (grade above 0, or above a threshold).",
      "DCG@k = sum over ranks i = 1..k of gain_i / log2(i + 1), so rank 1 is discounted by 1.0, rank 2 by 0.631, rank 3 by 0.5. NDCG@k divides by the DCG of the ideal ordering of the same query's relevance grades.",
      "Worked check: terms 3, 1.262, 1.5, 0, 0.387, 0.712 give a DCG of 6.861; the ideal order 3, 3, 2, 2, 1, 0 gives 7.141; NDCG@6 = 6.861 / 7.141 = 0.961. A perfect ordering scores 1.",
      "Edge cases handled on purpose: ideal DCG of zero (no relevant item, so return 0 or skip the query and say which), k larger than the list, an empty list, ties in the returned scores, and averaging over queries (macro average of per-query scores).",
      "States the gain convention: the linear grade above, or 2^grade - 1, which gives 0.949 for the same list. Either is fine if used consistently across the systems being compared.",
      "Explains why a ranking metric: order matters, relevance is graded, and a miss near the top costs more than one near the bottom; accuracy on single items ignores position. Offline scores are still a proxy and inherit the logging system's bias, so confirm with an online test.",
    ],
    followUps: [
      {
        q: "Swap the first and fourth items so the list is 0, 2, 3, 3, 1, 2. What happens to NDCG, and why is that useful?",
        lookFor:
          "DCG falls to about 5.153 and NDCG to about 0.722: the metric punishes moving a top-grade item down far more than a small shuffle low in the list, which matches what users see.",
      },
      {
        q: "Queries have very different numbers of relevant items. How do you average fairly?",
        lookFor:
          "NDCG normalises per query so averages are comparable; recall@k depends on the number of relevant items; report per segment and an interval across queries.",
      },
      {
        q: "You evaluate on last year's logged clicks. What bias does that have?",
        lookFor:
          "Only items the old system showed have labels (unseen items count as non-relevant), and higher positions get more clicks. It favours models that resemble the old one; an online test or randomised exposure is needed.",
      },
    ],
    redFlags: [
      "Returns DCG without normalising, so scores cannot be compared across queries.",
      "Computes the ideal ordering only from the returned items without saying so.",
      "Divides by log2(rank) so rank 1 divides by zero.",
      "No handling for a query with no relevant items.",
    ],
    lessons: ['ml/recommenders-and-ranking', 'rag-agents/vector-search-and-retrieval-metrics'],
  },
  {
    id: 'behavioural-simple-baseline-beat-complex-model',
    prompt:
      "Tell me about a time you compared a simple baseline with a more complicated model. What did you try first, what did the comparison show, and what did you ship?",
    roles: ['ml-eng', 'ai-eng'],
    level: 'junior',
    kind: 'behavioural',
    topics: ['behavioural', 'baselines', 'classical ml', 'evals'],
    minutes: 10,
    strong: [
      "Picks a concrete case with a named baseline (a mean or last-value forecast, seasonal naive, a most-popular list, a logistic regression, a rules engine) and says it was built before the complex model, not afterwards to look good.",
      "Describes a fair comparison: same split (time-ordered if the data was), same metric, and a similar tuning budget for both, with some sense of uncertainty on the difference rather than a single number.",
      "States the decision criterion beyond accuracy: latency, cost, maintenance, explainability, how much the extra points were worth to the business.",
      "Is honest about the outcome, including a case where the complex model won or where it was close and the simple one shipped; names what they measured after launch.",
      "Reflects on what they would do differently, for example checking for leakage sooner or sizing the test set for the gap that mattered.",
    ],
    followUps: [
      {
        q: "How did you know the gap between the two was not noise?",
        lookFor:
          "Looked at an interval, a paired comparison on the same cases, or repeated backtest origins; knows a small test set cannot separate close scores.",
      },
      {
        q: "Did anyone push back on shipping the simpler model? How did you handle it?",
        lookFor:
          "Brought evidence and costs rather than opinion; invited a stronger challenger and agreed in advance what margin would justify the complexity.",
      },
    ],
    redFlags: [
      "No baseline was built, or it was an untuned strawman against a carefully tuned complex model.",
      "Reports only the winning result with no uncertainty.",
      "Cannot say what was measured or what shipped.",
    ],
    lessons: ['ml/gradient-boosting', 'ml/time-series-forecasting', 'ml/linear-and-logistic-regression'],
  },

  // ---------------------------------------------------------------- deep learning
  {
    id: 'vanishing-gradients-init-and-normalisation',
    prompt:
      "A 40-layer ReLU network trains fine in a toy test, but on your real model the loss does not move. Explain why depth makes training fragile, what initialisation and normalisation are for, and what you would check first.",
    roles: ['ml-eng'],
    level: 'junior',
    kind: 'concept',
    topics: ['deep learning', 'initialisation', 'normalisation', 'training'],
    minutes: 15,
    strong: [
      "Depth compounds: a factor slightly off 1 per layer is repeated at every layer. A 10% shrink per layer leaves 0.9^20, about 12%, after 20 layers and 0.9^100, about 0.00003, after 100; a 10% growth gives 1.1^20, about 6.7, and 1.1^100, about 13,800. Gradients travel back through the same layers and compound the same way.",
      "Vanishing gradients leave early layers barely learning; exploding gradients make one step throw the weights somewhere useless. A classic cause: sigmoid's slope is at most 0.25, so ten sigmoid layers can multiply a gradient by about 0.25^10, roughly one millionth.",
      "Initialisation sets the starting scale so the signal keeps its size. Xavier (Glorot) suits tanh-like activations; He is larger by a factor of sqrt(2) (standard deviation sqrt(2 / fan_in)) because ReLU zeroes about half its inputs and would otherwise halve the variance at every layer. Frameworks apply defaults, but a custom layer or a copied block can silently break them.",
      "Normalisation keeps numbers well-behaved throughout training by subtracting a mean and dividing by a spread, then applying a learned scale and shift: for 2, 4, 6, 8 (mean 5, standard deviation about 2.24) the result is about -1.34, -0.45, 0.45, 1.34. Batch norm normalises each feature across the batch (depends on batch size, uses saved averages at inference); layer norm normalises across one example's features (suits transformers); RMSNorm only rescales by the root mean square. The exact reason batch norm helps is still discussed.",
      "Residual connections give gradients a straight path, which is why very deep networks (up to 152 layers in ResNet) stay trainable.",
      "First checks: can the model overfit a tiny batch of a few examples (if not, something is broken, not mistuned), the size of activations and gradients per layer, the learning rate, and a data or label bug.",
    ],
    followUps: [
      {
        q: "With tanh, a very large initial scale does not explode the signal. So why does it still train badly?",
        lookFor:
          "tanh squashes to between -1 and 1, but units get stuck at the flat ends of the curve where the slope, and so the gradient, is close to zero.",
      },
      {
        q: "You fine-tune a transformer with a batch size of 2. Batch norm or layer norm?",
        lookFor:
          "Batch statistics from two examples are very noisy; layer norm does not depend on batch size, which is why transformers use it (and RMSNorm in many recent language models).",
      },
      {
        q: "What does a residual connection do for the backward pass?",
        lookFor:
          "The block's input is added to its output, so the block learns a correction; the shortcut gives the gradient a direct route to earlier layers so it does not have to pass through every local slope.",
      },
    ],
    redFlags: [
      "Says 'lower the learning rate' without diagnosing anything.",
      "Treats normalisation as only data preprocessing.",
      "Cannot say why He initialisation differs from Xavier.",
      "Proposes more sigmoid layers to fix a vanishing gradient.",
    ],
    lessons: ['deep-learning/training-deep-networks', 'deep-learning/backprop-from-scratch'],
  },
  {
    id: 'training-run-nan-and-loss-spikes',
    prompt:
      "A transformer pretraining run shows loss spikes every few hundred steps from step 12,000, and at step 31,000 the loss becomes NaN. The run uses AdamW and mixed-precision numbers, peak learning rate 3e-4, no warm-up (it was turned off to save time), and the batch size was doubled last week. Walk me through your triage and what you would change, including what a learning-rate schedule looks like with example values.",
    roles: ['ml-eng', 'ml-platform'],
    level: 'mid',
    kind: 'debugging',
    topics: ['training', 'optimisers', 'learning rate', 'debugging'],
    minutes: 20,
    strong: [
      "Reads the symptoms from the training-doctor table: NaN or infinity points to a learning rate that is too high, a bad value in the data, or overflow in low-precision numbers; occasional spikes point to a rate that is too high for the batch size, no warm-up, or an odd batch.",
      "Triage in order: restore the last good checkpoint (with optimiser state saved), log gradient norm and loss per step, inspect the batch at the failing step for missing, infinite or extreme values, and skip or fix it.",
      "Adds a warm-up (raise the rate from zero to the peak over about a thousand steps) because early on the weights are random, gradients noisy and Adam's running averages have not settled; clips the global gradient norm (1.0 is a common limit) so one bad batch cannot throw the weights far; lowers the peak rate if it persists.",
      "Connects the batch-size change: a reported linear scaling rule (batch times k, learning rate times k, with warm-up) came from image-classification work, so treat it as a starting point and re-tune. Changing batch size and rate together is the likely trigger.",
      "Gives a concrete schedule as an example: 1,000-step linear warm-up to 3e-4, then cosine decay to 10% of the peak by step 100,000: 1.5e-4 at step 500, 3e-4 at step 1,000, about 1.65e-4 at step 50,500 (the cosine midpoint) and 3e-5 at the end.",
      "Knows what AdamW adds: Adam keeps two running averages per weight, so a 7-billion-parameter model carries 14 billion extra numbers, about 56 GB at 4 bytes each, which is why optimiser state must be in checkpoints; AdamW applies weight decay directly to the weights, not through the gradient.",
      "Before long runs: confirm the model can overfit a tiny batch, then scale up.",
    ],
    followUps: [
      {
        q: "You restart from the step-30,000 checkpoint with the same data order and it hits NaN at the same place. What does that suggest?",
        lookFor:
          "A deterministic cause, most likely a particular batch or a numerical overflow on specific data, rather than random instability. Inspect that batch, log per-layer activations, skip it, and check the precision settings.",
      },
      {
        q: "A different new architecture has a loss that never moves from its starting value.",
        lookFor:
          "Rate far too small, dead ReLU units, or a bug such as mismatched labels; first check it can overfit a handful of examples.",
      },
      {
        q: "Why AdamW rather than Adam with an L2 penalty?",
        lookFor:
          "For plain SGD L2 and weight decay are the same, but for Adam they are not: the penalty gets rescaled by the second-moment term. Decoupling the decay from the Adam step improved results in the AdamW paper.",
      },
    ],
    redFlags: [
      "Reruns with another seed and hopes.",
      "Raises the learning rate to speed up a spiking run.",
      "Does not log gradient norms or look at the batch where it failed.",
      "Blames the hardware without checking the data and the rate.",
    ],
    lessons: ['deep-learning/training-deep-networks', 'infra/training-infrastructure'],
  },
  {
    id: 'code-backprop-tiny-graph-gradient-check',
    prompt:
      "Write a tiny scalar autograd engine in Python (a Value class with add, multiply and tanh, plus a backward method) and use it to compute the gradients of r = tanh(a * b + a) at a = 0.5, b = -1.5. Explain why gradients are accumulated, and how you would test the implementation without doing calculus.",
    roles: ['ml-eng'],
    level: 'junior',
    kind: 'coding',
    topics: ['backpropagation', 'autograd', 'coding', 'gradients'],
    minutes: 25,
    strong: [
      "Each Value stores its number, a gradient initialised to 0, the values it was made from, and a small backward function that passes gradient to those inputs. The forward pass builds the graph as operations run.",
      "Local rules: add hands the incoming gradient unchanged to both inputs; multiply gives each input the other input's value times the incoming gradient; tanh multiplies by 1 - t^2 where t is its output.",
      "backward() sets the output's gradient to 1 and visits nodes in reverse topological order (build the order with a depth-first walk) so each node has all its contributions before it passes gradient on.",
      "Worked numbers: p = a x b = -0.75; q = p + a = -0.25; r = tanh(-0.25) = about -0.245; slope 1 - r^2 = 0.940. Then b's gradient is a x 0.940 = 0.470, and a's gradient is b x 0.940 = -1.410 through the product plus 0.940 through the direct addition, total -0.470.",
      "Gradients accumulate with += (not =) because a value used more than once receives a contribution from every use; here a feeds both the multiplication and the addition, and assigning would give -1.410 or 0.940 instead of -0.470.",
      "Tests by numerical gradient: nudge an input by a small h (around 1e-5), compute (f(x + h) - f(x - h)) / 2h, and compare with a relative tolerance; this is the standard check for any backward implementation, and gives -0.4700 and 0.4700 here.",
      "Explains why backpropagation scales: one forward and one backward pass give every gradient, whereas nudging each weight costs one pass per weight; the backward pass for matrix multiplies costs about twice the forward, and it needs stored forward values, which is why training uses much more memory than inference.",
    ],
    followUps: [
      {
        q: "Why must nodes be processed in reverse topological order?",
        lookFor:
          "A node's gradient is complete only after every node that uses it has contributed; processing it earlier would pass on an incomplete gradient.",
      },
      {
        q: "A model has a billion weights. Compare finite differences with backpropagation.",
        lookFor:
          "Finite differences need about a billion forward passes for one step; backpropagation needs one forward and one backward pass, roughly three times the cost of running the model.",
      },
      {
        q: "Why do very deep stacks of tanh layers make gradients vanish, and what helps?",
        lookFor:
          "The gradient is a product of local slopes along the path; tanh's slope is at most 1 and near 0 when saturated. Residual connections, normalisation and good initialisation keep the product from collapsing.",
      },
    ],
    redFlags: [
      "Assigns gradients instead of accumulating them.",
      "Processes nodes in the wrong order or ignores graph structure.",
      "Has no gradient check.",
      "Describes backpropagation as an approximation.",
    ],
    lessons: ['deep-learning/backprop-from-scratch', 'foundations/how-models-learn'],
  },
  {
    id: 'cnn-parameters-and-receptive-field',
    prompt:
      "For a 224 x 224 RGB image: (1) how many weights does one fully connected layer with 64 units need, versus one 3 x 3 convolution layer with 64 filters? (2) What region of the input can one output cell see after three stacked 3 x 3 convolutions, and after a 3 x 3 convolution, a 2 x 2 max pool and another 3 x 3 convolution? (3) What is the output size of a 3 x 3 convolution on a 12 x 12 input with padding 1 and stride 2? Then explain how a depthwise-separable convolution reduces the cost.",
    roles: ['ml-eng'],
    level: 'junior',
    kind: 'estimation',
    topics: ['cnn', 'computer vision', 'parameters', 'receptive field'],
    minutes: 15,
    strong: [
      "Fully connected: the image flattens to 224 x 224 x 3 = 150,528 inputs, times 64 units is 9,633,792 weights (plus 64 biases). It also has no idea which numbers are neighbours, so an ear in one corner and the same ear elsewhere are separate patterns.",
      "Convolution: 3 x 3 x 3 x 64 = 1,728 weights plus 64 biases, 1,792 in all, about 5,500 times fewer, because it is local (each output sees a small patch) and its weights are shared across every position. A pattern means the same thing wherever it appears.",
      "Weights are not compute: at stride 1 with padding 1 the layer does 224 x 224 x 1,728 = about 86.7 million multiply-accumulates, because each weight is reused at every position.",
      "Receptive field: three stacked 3 x 3 layers see 3, 5, then 7 pixels across. Conv, 2 x 2 pool, conv gives 8 (the pool's stride makes the second layer's steps count double), so pooling grows the field faster. Deeper cells see more and recognise larger things.",
      "Output size = floor((n + 2 x padding - kernel) / stride) + 1 = floor((12 + 2 - 3) / 2) + 1 = 6.",
      "Depthwise-separable: a 3 x 3 convolution from 64 to 128 channels has 3 x 3 x 64 x 128 = 73,728 weights; splitting it into a 3 x 3 filter per channel (576) and a 1 x 1 mix (64 x 128 = 8,192) gives 8,768, about 8.4 times fewer. That is why mobile and tiny networks (MobileNet, keyword-spotting DS-CNNs) use it.",
    ],
    followUps: [
      {
        q: "In a MobileNet-style network, where does activation memory peak and why does it matter on a microcontroller?",
        lookFor:
          "In an early, high-resolution layer, not the deep weight-heavy ones: for a 224 x 224 input the first pointwise layer takes a 112 x 112 x 32 tensor in and writes 112 x 112 x 64, 1,204,224 values, about 1.15 MiB in int8. That is the arena that must fit in SRAM, so reducing input resolution helps.",
      },
      {
        q: "Why did very deep plain CNNs get worse, not just stop improving, and what fixed it?",
        lookFor:
          "Training error rose too, so it was not overfitting but an optimisation problem. Residual connections (add the block's input to its output) let blocks learn a correction and keep the gradient path short.",
      },
      {
        q: "When would you choose a vision transformer over a CNN?",
        lookFor:
          "A CNN builds in locality and weight sharing, which helps with limited data; ViT has less built in, and its authors found it matched or beat ResNets with 14 to 300 million training images. It is a data-scale trade-off, and small CNNs remain the norm for phones and tiny devices.",
      },
    ],
    redFlags: [
      "Confuses weights with multiply-accumulates.",
      "Cannot compute an output size from kernel, padding and stride.",
      "Says a convolution is 'just a smaller dense layer' without mentioning weight sharing.",
    ],
    lessons: ['deep-learning/how-computers-see', 'edge/inside-a-small-device'],
  },
  {
    id: 'diffusion-sampling-cost-and-guidance',
    prompt:
      "Your product generates an image from a text prompt. One forward pass of the denoising network at your resolution takes about 50 ms on your GPU (an assumed figure). With 30 sampler steps and classifier-free guidance, estimate the generation time. Product wants under one second: what are your levers and what does each cost in quality? Also explain what guidance does and why generators work in a latent space.",
    roles: ['ai-eng', 'ml-eng'],
    level: 'mid',
    kind: 'estimation',
    topics: ['diffusion', 'image generation', 'latency', 'guidance'],
    minutes: 20,
    strong: [
      "Cost is roughly steps x passes per step x time per pass. Guidance needs a prompted and an unprompted prediction, two passes per step: 30 x 2 x 50 ms = 3.0 s, or 1.5 s if the two run together in one batch at little extra cost, or without guidance.",
      "Levers: fewer steps with a better sampler (DDIM reported samples 10 to 50 times faster; a Hugging Face guide found 15 steps kept the structure but with problems in the details), a distilled student that takes a handful of steps (8 steps x 50 ms = 0.4 s with batched guidance), a lower resolution (doubling the side of a pixel-space image quadruples the numbers each pass handles), a smaller or quantised denoiser, and faster hardware.",
      "Guidance: noise guess = unprompted + w x (prompted - unprompted). w = 0 ignores the prompt, w = 1 is the plain prompted guess, higher follows the prompt harder with less variety and, if too high, artefacts. A negative prompt takes the place of the empty prompt, steering away from it. Scales are not comparable across models.",
      "Training in one sentence: add noise to a real image at a random step, show the network the noisy image and the step, ask it to predict the noise, and nudge to reduce the error; generation starts from pure noise and repeats 'guess the noise, remove part of it'. The seed fixes the starting noise, so the same model, prompt, settings and seed reproduce an image.",
      "Latent diffusion: an autoencoder compresses a 3 x 512 x 512 image (786,432 numbers) to a 4 x 64 x 64 latent (16,384 numbers), 48 times fewer; noise, denoising and guidance happen there, and the decoder runs once at the end. The text encoder also runs once.",
      "Explains why a single step gives a blur: one jump has to predict the best single answer, which is the average of everything consistent with the noise.",
    ],
    followUps: [
      {
        q: "Same prompt and settings, different seed. What changes?",
        lookFor: "The starting noise, hence a different image; the same seed with the same settings reproduces the result.",
      },
      {
        q: "Guidance scale 12 gives harsh, similar-looking images. Why?",
        lookFor:
          "A large w pushes hard along the prompt direction, cutting variety and causing artefacts; scale is model-specific, so tune on your own model.",
      },
      {
        q: "What would make you hesitate to ship an image generator?",
        lookFor:
          "Training-image memorisation (researchers extracted over a thousand training images from diffusion models), bias in who is depicted, copyright and consent questions that are unsettled and vary by place (no legal advice from an engineer), and fakes that need provenance and labelling.",
      },
    ],
    redFlags: [
      "Ignores the two passes per step that guidance needs.",
      "Says time does not depend on steps or resolution.",
      "Promises sharp results from one step.",
      "Does not mention the latent space or why it exists.",
    ],
    lessons: ['deep-learning/diffusion-models', 'foundations/multimodal-models'],
  },
  {
    id: 'compute-optimal-training-budget-6nd',
    prompt:
      "You have 2,048 H100-class GPUs for 30 days. Assume a dense BF16 peak of 989 TFLOPS per GPU and 40% model FLOPs utilisation. Estimate the compute budget, then the compute-optimal model size and token count using the rule of thumb of about 20 tokens per parameter. Then tell me why a team might train a smaller model on far more tokens, and how wrong your estimate could be.",
    roles: ['ml-platform', 'ml-eng'],
    level: 'senior',
    kind: 'estimation',
    topics: ['scaling laws', 'compute', 'training', 'capacity planning'],
    minutes: 25,
    strong: [
      "Compute: 2,048 x 30 x 86,400 = 5.31e9 GPU-seconds (1.47 million GPU-hours). Useful rate per GPU is 0.40 x 989e12 = 3.96e14 FLOP/s, so C = about 2.1e24 FLOPs. Checks units throughout (TFLOPS is 1e12 FLOP/s).",
      "Training costs about 6 FLOPs per parameter per token (2 forward, about 4 backward), C = 6ND; serving costs about 2N per token.",
      "With D = 20N: C = 120 N^2, so N = sqrt(2.1e24 / 120) = about 1.3e11, around 130 billion parameters, and D = about 2.6 trillion tokens.",
      "Says what 20 means: Hoffmann et al. measured about 20 tokens per parameter in their data and setup (for example 1.4 trillion tokens for a 70-billion model). It is not a law of nature: a fit using the paper's printed constants gives a different ratio than a re-fit, and better data moves more of an extra budget into model size. Parameters and tokens should grow together, which corrected the earlier Kaplan recipe favouring bigger models.",
      "Notes the loss bowl is shallow near the optimum (halving or doubling the model size at fixed compute costs little predicted loss), which is what makes trade-offs possible.",
      "Explains over-training: serving usually dominates lifetime cost, so a smaller model trained longer can be cheaper overall. A 70B model on the same budget sees D = C / 6N = about 5.0e12 tokens (71 tokens per parameter) and costs about 1.4e11 FLOPs per served token versus 2.6e11 for the 130B model; the break-even depends on how many tokens will be served.",
      "Quantifies the error: the same method gives about 26.6 million GPU-hours for a 405B model on 15.6 trillion tokens against about 30.8 million reported by its developers (about 14% low), and is about three times low for an 8B model; expect tens of per cent, more for small models. At an example $2 per GPU-hour, 1.47 million hours is about $2.9 million (a placeholder price).",
    ],
    followUps: [
      {
        q: "How many days would a 70B model on 15 trillion tokens take on the same cluster?",
        lookFor:
          "C = 6 x 70e9 x 15e12 = 6.3e24. The cluster delivers 2,048 x 86,400 x 3.96e14 = 7.0e22 FLOPs per day, so about 90 days.",
      },
      {
        q: "Your measured MFU is 25%, not 40%. Where do you look?",
        lookFor:
          "Communication and interconnect, memory-bound operations, input pipeline stalls, pipeline bubbles, checkpointing overhead and imbalance across GPUs.",
      },
      {
        q: "The loss curve is smooth and on-trend. Does it tell you the model will pass a given benchmark?",
        lookFor:
          "No: scaling laws predict loss on a distribution, not specific abilities; claims about sudden emergence are contested and partly depend on the metric; teams fit a second relation from loss to a benchmark and still extrapolate with care.",
      },
    ],
    redFlags: [
      "Uses 2ND for training or forgets utilisation altogether.",
      "Mixes up FLOPs and FLOP/s or TFLOPS units.",
      "Treats 20 tokens per parameter as universal.",
      "Ignores inference cost when choosing the size.",
    ],
    lessons: ['deep-learning/scaling-laws', 'infra/training-infrastructure', 'infra/reading-a-gpu-spec-sheet'],
  },
  {
    id: 'verifiable-rewards-grpo-and-reward-hacking',
    prompt:
      "We want to improve a model's maths and coding by reinforcement learning rather than collecting more written answers. Explain how a verifiable-reward setup with GRPO works, compute the advantages for a group of eight sampled answers of which two are correct, and tell me how you would detect and limit reward hacking.",
    roles: ['ml-eng', 'ai-eng'],
    level: 'senior',
    kind: 'concept',
    topics: ['reinforcement learning', 'grpo', 'reward hacking', 'post-training'],
    minutes: 25,
    strong: [
      "Why RL: supervised fine-tuning copies human demonstrations and caps quality at the demonstrator; judging an answer is easier than writing one, and for maths or code a program can check it. Reinforcement learning with verifiable rewards uses a checker (exact match, unit tests, a format script) in place of a learned reward model, usually with a KL penalty keeping the policy near a reference model.",
      "GRPO samples a group of G answers per prompt, scores them, and uses the group as the baseline: advantage_i = (reward_i - mean) / std. It needs no value network, whereas PPO-style RLHF holds four models (policy, frozen reference, reward model, value model). The update is the clipped PPO objective, with a KL term in some recipes.",
      "Worked case: eight answers, two correct. Mean 0.25, sample standard deviation 0.463. Each correct answer gets (1 - 0.25) / 0.463 = +1.62, each wrong one -0.54; the advantages sum to zero, so winners gain what losers lose.",
      "A group where every answer scores the same has zero standard deviation and zero advantage, so it teaches nothing; prompts that are too easy or too hard waste samples. RL can only reinforce what the model already sometimes does: if no sample is ever correct, there is no signal.",
      "Reward hacking is Goodhart's law: when the measure becomes the target, it stops being a good measure. With a learned proxy, the proxy score keeps rising while the true (gold) score rises, peaks and falls. Verifiable rewards are harder to hack but not immune: examples reported include editing the unit tests rather than fixing the code, or a checker that parses only the last number.",
      "Defences: a held-out evaluation the training never sees, a hidden second checker, reading the highest-reward samples, watching response length and format versus substance, a KL leash or early stopping, and several seeds. The KL weight differs between recipes and library defaults change, so check the current documentation.",
      "Costs and consequences: sampling dominates the compute; long chains of thought are output tokens that users wait for and pay for.",
    ],
    followUps: [
      {
        q: "All eight answers to one prompt are correct. What is the advantage and what do you do about it?",
        lookFor:
          "Zero (the standard deviation is zero, and implementations add a small constant to avoid dividing by zero): no learning signal. Track the share of such groups and shift the prompt mix towards problems of intermediate difficulty.",
      },
      {
        q: "A Q-learning table entry is 0, the move earned -1, the best value in the next state is 2, learning rate 0.5 and discount 0.9. What is the new entry?",
        lookFor:
          "Target = -1 + 0.9 x 2 = 0.8; new value = 0 + 0.5 x 0.8 = 0.4. It bootstraps on its own estimate and is off-policy; mentions that function approximation, bootstrapping and off-policy training together can diverge (the deadly triad).",
      },
      {
        q: "Is a unit-test reward safe against hacking?",
        lookFor:
          "Safer than a learned model but not safe: tests can be edited, incomplete tests pass wrong code, and the model can pass the visible tests by special-casing. Use hidden tests, sandboxing and read samples.",
      },
    ],
    redFlags: [
      "Says GRPO needs a value network, or that the group mean is the whole advantage.",
      "Treats a rising training reward as proof the model improved.",
      "Has no held-out evaluation that training cannot touch.",
      "Fixes a reward loophole by changing the optimiser rather than the specification.",
    ],
    lessons: ['deep-learning/rl-post-training', 'deep-learning/reinforcement-learning-from-scratch'],
  },
  {
    id: 'vae-gan-diffusion-trade-offs',
    prompt:
      "A teammate proposes a GAN for generating synthetic images because 'sampling is one forward pass'. Compare autoencoders, VAEs, GANs and diffusion models for generating new samples: how each trains, how each samples, and the characteristic failure of each. Which would you pick for our product and why?",
    roles: ['ml-eng'],
    level: 'mid',
    kind: 'concept',
    topics: ['generative models', 'vae', 'gan', 'diffusion'],
    minutes: 20,
    strong: [
      "Autoencoder: encoder to a small code, decoder back, trained to reproduce the input. Good for compression, features and anomaly scores (rebuild error on normal data), but not a generator: a random code often decodes to rubbish because training only visited the codes of real examples.",
      "VAE: the encoder outputs a mean and a spread, a code is drawn with the reparameterisation trick (mean + spread x noise), and the loss adds a KL term to the rebuild error that pulls codes towards a standard bell curve; sampling draws a code from that curve and decodes it once. A heavier KL weight gives a tidier code and blurrier output (a cloud with mean 1 and spread 0.5 costs about 0.82; a standard cloud costs 0). Too heavy can make the decoder ignore the code.",
      "GAN: a generator and a discriminator play a two-player game; the generator never sees real data, only the discriminator's verdict. One forward pass samples. Failures: mode collapse (covers only some modes of the data), instability from two moving targets, no single falling loss that tracks sample quality, no likelihood.",
      "Diffusion: add noise step by step, train a network to predict the noise, generate by many cleaning steps from noise. Stable training and good diversity; the cost is many steps per sample, reduced by better samplers, few-step distillation and working in a latent space.",
      "Evidence: on ImageNet at 128, 256 and 512 pixels, a diffusion model reported lower FID than a leading GAN (2.97, 4.59, 7.72 versus 6.02, 6.95, 8.43; lower is better), with better coverage, at the cost of slower sampling. GAN ideas live on inside other systems (adversarial losses in latent-diffusion autoencoders, adversarial distillation for one-to-four-step sampling, fast GAN-trained vocoders for audio).",
      "Recommendation with reasons: as of 1 November 2026, diffusion and flow models are the usual starting point for images; choose a GAN only if one-step latency is a hard requirement and you can afford the tuning; ask how any model was evaluated and whether the metric sees diversity as well as sharpness.",
    ],
    followUps: [
      {
        q: "In a GAN run the discriminator reaches near-perfect accuracy and the samples stop improving. Why?",
        lookFor:
          "The detective is ahead of the forger, so the forger gets little useful feedback. Balance the two (learning rates, update ratio), use the non-saturating generator loss, or a more stable objective such as Wasserstein, each reported by its authors to help but not to make GANs effortless.",
      },
      {
        q: "How would you detect mode collapse?",
        lookFor:
          "Compare the diversity and coverage of samples against the data's modes and across seeds; do not rely on the loss curve; use metrics that measure both quality and coverage.",
      },
      {
        q: "An autoencoder cannot generate. Why does it still work as an anomaly detector?",
        lookFor:
          "It is trained on normal data only, so normal inputs rebuild well and strange ones badly; the rebuild error is the score, and you still need to choose a threshold.",
      },
    ],
    redFlags: [
      "Says a falling GAN loss means good samples.",
      "Describes a VAE as 'an autoencoder with noise' and omits the KL term.",
      "Claims diffusion is best for every use.",
    ],
    lessons: ['deep-learning/autoencoders-vaes-and-gans', 'deep-learning/diffusion-models', 'ml/anomaly-detection'],
  },
  {
    id: 'state-space-vs-attention-long-context-costs',
    prompt:
      "A decoder has 32 layers, 8 key-value heads of dimension 128, and stores values in 2 bytes. (a) How big is the KV cache for one sequence at 128K tokens (131,072) and 256K tokens? (b) A hybrid replaces 28 of the 32 layers with state-space layers whose fixed state is 2 x 4,096 x 16 numbers per layer, also at 2 bytes, and keeps 4 attention layers. What are the memory figures now? (c) What do you give up, and when does the saving not matter?",
    roles: ['ml-platform', 'ml-eng'],
    level: 'senior',
    kind: 'estimation',
    topics: ['state space models', 'attention', 'kv cache', 'long context'],
    minutes: 25,
    strong: [
      "KV per token = 2 (keys and values) x 32 layers x 8 heads x 128 x 2 bytes = 131,072 bytes. At 131,072 tokens that is exactly 16 GiB per sequence; at 262,144 tokens, 32 GiB. Sixteen concurrent 256K sequences would need 512 GiB for caches alone.",
      "Attention compute also grows with the square of the length: n(n + 1) / 2 scored pairs per head per layer, so doubling a prompt from 1,000 to 2,000 tokens costs about four times the work (500,500 to 2,001,000 pairs).",
      "A state-space layer carries a fixed-size state updated once per token (h = a x previous h + b x input), so work per token and memory do not grow with context. The update is affine and composes associatively, so training can use a parallel scan rather than a sequential loop. Mamba's selection makes the gate depend on the token so the state can keep a fact and skip filler, but the state is still a fixed budget.",
      "Hybrid arithmetic: 4 attention layers cache 4 x 2 x 8 x 128 x 2 = 16,384 bytes per token, 4 GiB at 256K. Each state-space layer holds 2 x 4,096 x 16 = 131,072 numbers, 256 KiB, so 28 layers hold 7 MiB at any length. Total about 4 GiB plus 7 MiB versus 32 GiB, about eight times less; 16 sequences take about 64 GiB, not 512.",
      "Notes the break-even: one layer's state (256 KiB) equals that layer's cache at 64 tokens (4,096 bytes per token), so the saving appears only at long contexts or many concurrent sequences.",
      "Compute per generated token per layer at 128K tokens: attention about 2 x n x 32 x 128 = 1.07e9 multiply-adds, against about 3 x 131,072 = 393,216 for the state update; but dense projections cost around 1e8 per token per layer, so the length-dependent term dominates only at tens of thousands of tokens. Counts, not measurements.",
      "What is lost: a fixed state must compress. Studies report weaker exact copying, retrieval and in-context learning in pure state-space models (for example a larger gap on phone-book style lookups and few-shot tasks), mostly repaired by keeping a few attention layers. The evidence for hybrids comes largely from their authors, on different data and sizes, and at least one lab reverted to full attention for a successor model after finding deficits on multi-hop reasoning. Judge on your own evaluations, and check serving support.",
    ],
    followUps: [
      {
        q: "Your product is mostly 2K-token chats. Does a hybrid help?",
        lookFor:
          "Little: at 2,048 tokens the full-attention cache is 131,072 x 2,048 = 256 MiB per sequence and the length-dependent compute is small next to the projections; grouped-query attention, a quantised cache and batching matter more.",
      },
      {
        q: "Which tasks would you test first to find the weakness?",
        lookFor:
          "Exact retrieval and copying, needle-in-a-haystack, few-shot format following, multi-document question answering, compared against a transformer on your own data.",
      },
      {
        q: "How can a recurrent layer train in parallel?",
        lookFor:
          "Because each step is an affine map and composing two such maps is another affine map of the same form, a tournament-style parallel scan finishes n steps in about log2 n rounds.",
      },
    ],
    redFlags: [
      "Says state-space models have unlimited memory.",
      "Forgets that the state is fixed and compresses.",
      "Mixes bits and bytes, or treats 128,000 as exactly 128K.",
      "Claims hybrids are better everywhere from the authors' own benchmarks.",
    ],
    lessons: ['deep-learning/state-space-models-and-mamba', 'serving/kv-cache-and-memory'],
  },

  // ---------------------------------------------------------------- audio and speech
  {
    id: 'sampling-aliasing-and-audio-data-sizes',
    prompt:
      "A 900 Hz tone is recorded with a sampling rate of 1,000 Hz. What does the recording contain? Why do speech models usually take 16 kHz audio, what happens if you feed one a 48 kHz recording, and how much storage is one minute of 16 kHz, 16-bit mono speech, and three minutes of CD-quality stereo (44,100 Hz, 16-bit)?",
    roles: ['ml-eng'],
    level: 'junior',
    kind: 'estimation',
    topics: ['audio', 'sampling', 'aliasing', 'data sizes'],
    minutes: 12,
    strong: [
      "You need more than two samples per cycle: the highest pitch you can keep is half the sampling rate (the Nyquist limit, 500 Hz here). A 900 Hz tone sampled at 1,000 Hz gives exactly the same samples as a 100 Hz tone (900 - 1,000 = -100), so the recording contains a wrong pitch. This is aliasing, and it cannot be repaired after sampling.",
      "The cure is an analogue low-pass (anti-aliasing) filter before the converter, so frequencies above half the rate are removed instead of folding back. The same applies when downsampling digitally: filter first.",
      "16 kHz keeps pitches up to 8 kHz, which holds most of the useful detail in speech; 8 kHz (traditional phone lines, keeping about 300 to 3,400 Hz) sounds muffled. Whisper converts audio to 16 kHz first.",
      "A 48 kHz recording must be resampled to the model's rate (a factor of 3, with a low-pass filter), otherwise the pitches and speeds the model sees do not match what it learned.",
      "Sizes: 16,000 samples x 2 bytes = 32,000 bytes a second, 1.92 MB a minute. CD stereo: 44,100 x 2 bytes x 2 channels = 176,400 bytes a second, 180 s gives 31,752,000 bytes, about 31.8 MB. A phone line at 8,000 samples of 8 bits is 64 kbit/s. Codecs store the same sound in fewer numbers.",
      "Bit depth: 16 bits gives 65,536 levels (24 bits 16,777,216); each extra bit lowers quantisation noise by about 6 dB. A 30-second Whisper chunk at 16 kHz is 480,000 samples.",
    ],
    followUps: [
      {
        q: "A car wheel seems to spin backwards in a film. Is that related?",
        lookFor: "Yes: the camera samples in time, and the wheel turns too far between frames, the same aliasing in the time dimension.",
      },
      {
        q: "The device microphone delivers 8 kHz audio, upsampled to 16 kHz for a model trained on 16 kHz speech. What is the risk?",
        lookFor:
          "Upsampling creates the right shape but no information above 4 kHz (consonants like 's' lose detail), and the training data did not look like that. Test on real recordings from the device and train or fine-tune on matching audio.",
      },
      {
        q: "Why do many models read a spectrogram rather than raw samples?",
        lookFor:
          "Samples are fragile (a tiny time shift changes almost every number) and the useful content, which frequencies are present, is hard to see in them; some models such as wav2vec 2.0 do read the waveform with convolutions.",
      },
    ],
    redFlags: [
      "Confuses sampling rate with bit depth.",
      "Says a higher sampling rate is always better for a speech model.",
      "Downsamples by dropping samples without a low-pass filter.",
    ],
    lessons: ['audio/how-a-computer-hears', 'audio/spectrograms-and-the-mel-scale'],
  },
  {
    id: 'spectrogram-window-hop-and-mel-choices',
    prompt:
      "You are building a speech model front end at 16 kHz. Choose a window length, hop and number of mel bands, explain the trade-offs, and give the input shape for 30 seconds of audio. What changes if the product is a hearing device with a few-millisecond delay budget?",
    roles: ['ml-eng'],
    level: 'mid',
    kind: 'concept',
    topics: ['audio', 'spectrogram', 'mel scale', 'features'],
    minutes: 15,
    strong: [
      "A spectrogram is a Fourier transform of short, overlapping, tapered windows (Hann): time across, frequency up, energy as brightness. A window of N samples at rate R gives frequency detail R / N: 100 samples (6.25 ms) gives 160 Hz, 400 samples (25 ms) 40 Hz, 1,600 samples (100 ms) 10 Hz. Long windows sharpen pitch and blur timing; short windows do the reverse.",
      "A common speech compromise: 25 ms window (400 samples) and 10 ms hop (160 samples), 100 frames a second and 201 frequency bins. A 120 Hz voice has harmonics 120 Hz apart, which 160 Hz resolution cannot separate and 40 Hz can.",
      "Mel bands: hearing is not evenly spaced; with mel = 2595 x log10(1 + f / 700), the 100 to 200 Hz step is about 133 mel and 5,000 to 5,100 Hz about 20 mel, around seven times less. Triangular bands evenly spaced in mel squeeze 201 bins to 80 (many narrow bands low, a few wide ones high); then take logs, because loudness is not linear either.",
      "Shape for 30 s: 480,000 samples become 3,000 frames x 80 bands = 240,000 numbers, half the raw count; Whisper's recipe uses 80 mel bands (128 in its large-v3 model) over 0 to 8 kHz, then convolutions halve the 3,000 columns to 1,500 positions of 20 ms.",
      "The spectrogram keeps strength but not phase, so it cannot be turned back into sound exactly; models that produce speech need a vocoder. MFCCs (a cosine transform of log-mel, keeping a few coefficients) are a compact classical cousin.",
      "Cost and latency: frames per second set the compute (halving the hop doubles the inferences), and a 25 ms window means waiting 25 ms of audio before the first column, longer than the 5 to 6 ms delay one study rated just acceptable for simulated open-canal hearing aids. A hearing device needs much shorter frames or low-latency designs; wake-word systems often use 40 ms frames at a 20 ms hop.",
    ],
    followUps: [
      {
        q: "What does halving the hop do to compute and power, and why is it not free?",
        lookFor: "Frames per second double, so inferences and energy per second roughly double; it buys timing resolution and lower delay at a direct cost.",
      },
      {
        q: "Can you turn a magnitude spectrogram back into audio?",
        lookFor: "Not exactly, because phase is discarded; use a vocoder or a phase-reconstruction method.",
      },
      {
        q: "A fixed 30-second window is used for a three-second voice command. What is the problem?",
        lookFor:
          "Padding wastes compute and adds latency; a fixed-window batch design is not a streaming one, so a command interface needs frame-level streaming models or short windows.",
      },
    ],
    redFlags: [
      "Says a longer window is always better.",
      "Confuses window length with hop.",
      "Cannot say why mel and log scaling are used.",
    ],
    lessons: ['audio/spectrograms-and-the-mel-scale', 'audio/how-a-computer-hears'],
  },
  {
    id: 'code-ctc-collapse-and-greedy-vs-beam',
    prompt:
      "Write the CTC collapse function (merge repeats, then drop blanks) and greedy decoding over a frames-by-symbols probability matrix. Then show, on a three-frame example where each frame has P(blank) = 0.6 and P(a) = 0.4, that greedy decoding can return a text that is not the most probable text. Why does CTC need no alignment labels?",
    roles: ['ml-eng'],
    level: 'mid',
    kind: 'coding',
    topics: ['speech recognition', 'ctc', 'decoding', 'coding'],
    minutes: 25,
    strong: [
      "Collapse: walk the frames, and emit a symbol only if it is not blank and differs from the previous frame's symbol (blanks included in the comparison, so 'l _ l' keeps two l's while 'l l' merges to one). Merge first, then drop blanks: dropping blanks first would wrongly merge the two l's in 'hello'.",
      "Greedy decoding: take the arg-max symbol in each frame, then collapse; O(T x V). It picks the best path, not the best text.",
      "The example: of the eight three-frame paths, blank-blank-blank gives '' with probability 0.6^3 = 0.216. The text 'a' arises from a__, _a_, __a, aa_, _aa and aaa: 3 x (0.4 x 0.36) + 2 x (0.16 x 0.6) + 0.064 = 0.688. The text 'aa' only from a_a: 0.096. They sum to 1. Greedy takes blank in every frame and returns '' (0.216) though 'a' has probability 0.688.",
      "A text's probability is the sum over all paths that collapse to it, and training maximises that sum with dynamic programming, so no alignment labels are needed. For the word 'cat' over 10 frames with the symbols {blank, c, a, t} there are 1,716 such paths (an example that can be confirmed by enumeration).",
      "Prefix beam search keeps candidate texts, not paths; for each text it stores two totals, paths ending in a blank and paths ending in a non-blank letter, because a repeated letter can only start a new character after a blank. A wider beam costs more and approaches the true best text; a language model is usually added to the score.",
      "Testing: compare the beam search against brute-force enumeration on small random matrices, and check that the text probabilities add up to 1.",
      "Places CTC among the families: it streams easily (frame-wise outputs), but frames are decided independently so it leans on an external language model; attention encoder-decoders such as Whisper read a window at a time; transducers add a text-side network and also stream.",
    ],
    followUps: [
      {
        q: "Why does 'l _ l' decode differently from 'l l'?",
        lookFor: "The blank separates two letters so both survive; adjacent identical symbols merge into one.",
      },
      {
        q: "How would you add a language model to the beam search?",
        lookFor:
          "Add a weighted language-model log probability when a prefix is extended by a completed word or character, with a length bonus, and tune the weights on a development set; it matters more for CTC than for other families.",
      },
      {
        q: "What does a beam of 8 cost compared with greedy, and when is greedy fine?",
        lookFor:
          "Roughly the beam width times the work per frame, plus bookkeeping; greedy is often good enough when the model is confident, and the beam matters when frames are ambiguous.",
      },
    ],
    redFlags: [
      "Drops blanks before merging repeats.",
      "Claims greedy decoding returns the most probable text.",
      "Adds path probabilities incorrectly or compares texts by single-path probability.",
    ],
    lessons: ['audio/speech-recognition'],
  },
  {
    id: 'streaming-asr-live-captions-design',
    prompt:
      "Design speech recognition for live captions in video calls: words should appear within roughly half a second of being spoken, in noisy rooms, for people with strong accents and long pauses. Which model family would you use and why, how do you handle silence, how do you evaluate it, and what do you do about wrong-but-fluent text?",
    roles: ['ai-eng', 'ml-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['speech recognition', 'streaming', 'latency', 'system design'],
    minutes: 35,
    strong: [
      "States the alignment problem: 100 spectrogram frames a second against a few letters a second, with no labelled timings, and that CTC, attention encoder-decoders and transducers each answer it differently.",
      "Streaming requirement: CTC and transducer models decide frame by frame and stream; an attention encoder-decoder such as Whisper reads fixed 30-second windows (a batch design, so live use needs extra machinery). Latency is a design choice that trades against accuracy: one streaming-transformer paper reports word error rates of 3.01% and 7.09% at about 80 ms average latency versus 2.50% and 5.62% at 960 ms (clean and harder test sets of one English benchmark). Choose the latency from the product need, and verify on your own audio.",
      "Pipeline: a cheap voice activity detector first (neural VADs can be about 2 MB and process 30 ms chunks in under a millisecond, as one open-source project reports) to skip silence and mark utterances; then a streaming recogniser; partial results that stabilise, with revisions handled in the interface. Noise suppression in front is worth testing for both VAD and recognition.",
      "Silence and fluent errors: Whisper-style decoders can invent phrases on silence or non-speech, loop, or choose the wrong language. A study found whole invented phrases in about 1% of transcriptions, more often for speakers with long pauses, and some included explicit harms. Mitigate with VAD, a fixed language when known (language identification was 64.5% on a 102-language benchmark), fallbacks such as retrying at a higher temperature when average log probability is low or compressibility is suspicious, low-confidence display, and human review for high-stakes use.",
      "Evaluation: word error rate with a published normaliser applied to both sides, pooled over utterances, on audio that sounds like real calls, broken down by accent, noise level, device and speaker group, with intervals; plus key-term accuracy, behaviour on silent clips, and latency percentiles (p50 and p95 from last word spoken to caption shown) and caption stability.",
      "Notes limits honestly: overlapping speakers are not solved by plain recognition (reported word error is about 2% for audiobooks and 25.5% for dinner parties with distant microphones); recordings are personal data, so say why, keep little and delete on a schedule (no legal advice).",
    ],
    followUps: [
      {
        q: "Marketing wants Whisper because it is accurate. How do you respond?",
        lookFor:
          "It is a batch design with 30-second windows, known failure modes on silence and language choice, and no guarantee on your latency; benchmark a streaming model and a chunked Whisper on your own calls, with latency and hallucination counted.",
      },
      {
        q: "You cut latency from 960 ms to 80 ms. What do you expect, and how do you check?",
        lookFor:
          "Accuracy usually falls because the model has less context (in the cited paper about a fifth higher relative error on the clean set); measure on your data and pick the point on the curve the product needs.",
      },
      {
        q: "Two people talk over each other. What happens, and what would you try?",
        lookFor:
          "Accuracy degrades sharply; consider separation or diarisation, per-speaker microphones, and set expectations in the interface.",
      },
    ],
    redFlags: [
      "Picks a batch model for live use without addressing latency.",
      "No VAD or silence test.",
      "Reports one WER number with no normaliser, groups or latency percentiles.",
    ],
    lessons: ['audio/speech-recognition', 'audio/voice-agents', 'audio/measuring-audio-quality'],
  },
  {
    id: 'wer-looks-fine-users-complain',
    prompt:
      "Vendor A reports 8% word error rate on your internal test set and vendor B 9%, so the team wants A. In a pilot, support staff say B's transcripts are more usable, and a clinic complains that A writes 'fifteen milligrams' as 'fifty milligrams'. How do you work out what is going on, and what do you measure instead?",
    roles: ['ai-eng', 'ml-eng'],
    level: 'mid',
    kind: 'debugging',
    topics: ['speech recognition', 'wer', 'evals', 'metrics'],
    minutes: 20,
    strong: [
      "WER = (substitutions + deletions + insertions) / reference words, from a minimum edit alignment. It can exceed 100%, is undefined with an empty reference, and weighs every word equally, so 'fifty' for 'fifteen' costs one error exactly like 'a' for 'the'. The metric cannot see the clinical harm.",
      "Normalisation changes scores: lower-casing, punctuation, numbers ('5' versus 'five') and contractions. 'take 5 milligrams' scored against 'take five milligrams' is one error in three words (33%) if unnormalised. Apply the same published normaliser to the reference and every hypothesis, and never only to one side.",
      "Pooled versus averaged: a 2-word utterance with 1 error and a 98-word utterance with 2 errors average to (50% + 2.04%) / 2, about 26%, but pooled it is 3 / 100 = 3%; pooled is usually what is intended and stops tiny utterances dominating.",
      "Asks whether 8% versus 9% is a real difference: a paired comparison on the same utterances with a bootstrap interval, a test set that resembles production (accents, noise, devices, silence), and a size chosen for the smallest gap that matters. Words within an utterance are correlated, so simple formulas understate the uncertainty.",
      "Breaks results down: by speaker group, accent, noise and device (one 2020 study of five commercial systems found markedly higher average error for Black speakers than white speakers), and scores terms that matter (drug names, doses, numbers, commands) separately.",
      "Counts invented text on silent clips directly (inserted words), because WER is undefined there; checks the metric against human ratings on a few dozen examples; reports several measures: normalised WER, CER, key-term accuracy, by-group results, latency and behaviour on silence.",
    ],
    followUps: [
      {
        q: "Reference 'she sells sea shells by the sea shore every day', hypothesis 'she sells see shells by the shore every day today'. What is the WER?",
        lookFor:
          "One substitution (sea to see), one deletion (a 'sea') and one insertion (today): 3 / 10 = 0.30. When alignments tie, the split between S, D and I can differ while the total stays the same.",
      },
      {
        q: "How big a test set do you need to separate 8% from 9%?",
        lookFor:
          "On 10,000 independent words the standard error of an 8% rate is about 0.27 points, but words cluster by utterance and speaker, so the real error is wider; paired comparison helps; decide the smallest gap that would change the decision first.",
      },
      {
        q: "Why is an empty reference a problem for WER?",
        lookFor: "Division by zero; count insertions on silent audio directly, or treat empty-versus-empty as zero error and report invented text separately.",
      },
    ],
    redFlags: [
      "Chooses a vendor on a one-point WER gap with no interval.",
      "Compares scores produced with different normalisers.",
      "Averages per-utterance rates and calls it WER.",
      "Ignores errors on the words the product depends on.",
    ],
    lessons: ['audio/measuring-audio-quality', 'audio/speech-recognition', 'ml/is-the-difference-real'],
  },
  {
    id: 'hearing-aid-noise-suppression-latency-design',
    prompt:
      "Design the noise-suppression stage for a hearing aid or earbud: speech in a noisy restaurant, a model that runs on a small battery, and a wearer who also hears the real sound directly. What approaches combine, what is the latency budget and how does it constrain the model, and how do you decide it is good enough?",
    roles: ['ml-eng'],
    level: 'senior',
    kind: 'design',
    topics: ['noise suppression', 'hearing devices', 'latency', 'audio'],
    minutes: 35,
    strong: [
      "Frames the problem with SNR in decibels (10 x log10 of speech energy over noise energy; 0 dB equal, 5 dB about 3.2 times) and says products combine spatial processing (several microphones favouring a direction) with spectral processing (one signal, a gain for each time-frequency cell).",
      "Directional microphones: two omni microphones a few millimetres apart (5 to 12 mm is common), delay and subtract the rear to make a cardioid. Costs: a bass loss of about 6 dB per octave that must be compensated (adding microphone noise), and the assumption that the talker is in front.",
      "Spectral methods: a voice activity detector, a noise estimator and a gain per cell. Spectral subtraction uses gain = max(floor, 1 - alpha x noise / signal); a Wiener filter uses SNR / (1 + SNR). Their weakness is musical noise, isolated surviving cells heard as chirps; a gain floor masks it, subtracting harder trades it for speech damage, and babble breaks the noise estimate.",
      "Neural suppression usually learns a mask (an ideal ratio mask is the soft target) from clean speech mixed with noise at chosen SNRs; a small open example (RNNoise) reports 87,503 weights and about 40 Mflops, around 14% of a 1.2 GHz Cortex-A53 core. Capping the maximum attenuation can improve intelligibility while keeping environmental sounds audible.",
      "Latency is the binding constraint: a transform cannot finish a frame until its window has arrived. In a simple double-buffered model, 160-sample blocks with a 400-sample window at 16 kHz give 10 + 10 + 15 = 35 ms; 32-sample blocks with a 64-sample window give 2 + 2 + 2 = 6 ms. In one study of simulated open-canal fittings, delays of about 5 to 6 ms were rated just acceptable and longer ones disturbing; other fittings and listeners tolerate more, and it is one study. So use causal models, short or asymmetric windows (one challenge entry kept a 16 ms analysis window with 4 ms algorithmic latency) or learned short filters.",
      "Real-time compute: the deadline is the block period; a 1.5 ms model uses 15% of a 10 ms block and 75% of a 2 ms one, so the slowest block (p99, worst case) matters, and smaller blocks raise power in proportion.",
      "Evaluation: SNR improvement alone rewards over-cutting, so pair it with a damage measure (scale-invariant SDR, speech kept), hearing-specific intelligibility and quality measures (HASPI, HASQI), and listening tests with three ratings (speech, noise, overall) including listeners with hearing loss. Does not compare one manufacturer's decibel figures with another's, and keeps clinical and regulatory claims out of an engineering answer.",
    ],
    followUps: [
      {
        q: "Raising alpha in spectral subtraction removes more hiss, but the output chirps. Why?",
        lookFor:
          "Noise level in each cell fluctuates around the estimate, so over-subtraction leaves isolated surviving cells that change every frame (musical noise); a floor leaves enough broadband noise to mask them.",
      },
      {
        q: "Your model improves SNR by 12 dB but listeners dislike it. Why?",
        lookFor:
          "SNR improvement rewards cutting speech along with noise; measure speech kept and naturalness; intelligibility can rise at the cost of quality, which is why quality metrics were added to the Clarity challenges.",
      },
      {
        q: "You halve the block to 16 samples at 16 kHz. What changes?",
        lookFor:
          "The deadline falls to 1 ms and inferences double to 1,000 a second, so load and power double for the same model; delay falls, but tail latency now matters more.",
      },
    ],
    redFlags: [
      "Ignores latency, or quotes mean latency only.",
      "Treats one SNR number as sufficient.",
      "Proposes cloud inference for the main path.",
      "Makes clinical or regulatory claims.",
    ],
    lessons: ['audio/noise-suppression-and-hearing-devices', 'audio/measuring-audio-quality', 'edge/real-time-on-a-budget'],
  },
  {
    id: 'wake-word-false-accepts-and-power-cascade',
    prompt:
      "A wake-word detector for earbuds should false-accept at most about once a week per user and miss no more than 5% of real attempts. Explain the trade-off, how many hours of negative audio you need to show the false-accept target, and what a two-stage design does to the power budget. Example numbers: stage one draws 1 mW; stage two draws 300 mW, runs 0.3 s each time it is woken, and is woken 6 times an hour.",
    roles: ['ml-eng', 'ml-platform'],
    level: 'mid',
    kind: 'estimation',
    topics: ['wake word', 'keyword spotting', 'false accepts', 'power'],
    minutes: 20,
    strong: [
      "Separates the two errors and their units: false-accept rate (false activations per hour) and false-reject rate (share of real attempts that fail). They have different units, so there is no equal error rate to quote. The threshold moves you along a curve; smoothing the outputs over a short time lowers false accepts but delays decisions and can miss words.",
      "Measurement arithmetic: once a week is 1 per 168 hours, so expecting 10 events needs about 1,680 hours of negatives. If you see zero events in n hours the rate is probably below about 3 / n per hour (95%): showing less than once a week needs about 504 clean hours. A false accept in a two-minute test would extrapolate to 30 an hour, which is meaningless; short tests rank settings, they do not predict the rate users meet.",
      "Hard negatives are similar-sounding speech and near-misses, not plain noise; noise moves the whole trade-off curve the wrong way, so train with background sound and time shifts and test by condition. Most real input is silence or unrelated speech, so negatives dominate the data.",
      "Pipeline: frames, log-mel or MFCC features, a tiny network (a depthwise-separable CNN of tens of kilobytes quantised to int8), smoothing over the outputs, a threshold and a rule that stops repeat firing; a detection counts if it lands within a time tolerance of the true word.",
      "Cascade power: a tiny always-on first stage and a larger verifying second stage. Average power = 1 + 300 x (6 x 0.3 / 3,600) = 1.15 mW, versus 300 mW if the big stage ran all the time. The first stage's false-accept rate is therefore also a power figure.",
      "Frames the budget: one published design argues the whole system should draw under 1 mA, using under 1% of a 2,400 mAh battery per day (1 mA x 24 h = 24 mAh = 1%).",
    ],
    followUps: [
      {
        q: "In your two-minute test the detector fires falsely once at threshold 0.50 and zero times at 0.70, missing 3 of 12 keywords. What do you conclude?",
        lookFor:
          "Not enough data for either rate: 12 attempts give a very wide interval around 25% misses and two minutes cannot estimate a weekly false-accept rate. Collect thousands of hours of negatives and many real attempts across noise conditions, then choose the threshold from the curve and costs.",
      },
      {
        q: "Stage one starts firing 60 times an hour instead of 6. What happens to power?",
        lookFor: "1 + 300 x (60 x 0.3 / 3,600) = 2.5 mW, more than double, with nothing wrong in the second stage.",
      },
      {
        q: "Users complain in cars. What do you look at?",
        lookFor:
          "Road noise shifts the curve; evaluate and train per noise condition, add recorded negatives from cars, and re-check both error rates there.",
      },
    ],
    redFlags: [
      "Quotes a single accuracy number.",
      "Treats false accepts and false rejects as the same kind of rate.",
      "Believes a few minutes of negative audio is enough.",
      "Ignores that the first stage's false accepts cost power.",
    ],
    lessons: ['edge/tinyml-wake-word-detector', 'edge/real-time-on-a-budget'],
  },

  // ---------------------------------------------------------------- edge and on-device
  {
    id: 'microcontroller-memory-budget-keyword-spotter',
    prompt:
      "Will this keyword-spotting network fit? It has 22,604 weights and biases, and the largest pair of consecutive activation tensors is 8,000 + 8,000 values. The target is a Cortex-M4-class microcontroller with 1 MB of flash and 256 KB of SRAM. Work out the memory in int8 and float32, say which memory each number lands in, and tell me what changes for a 224 x 224 image classifier like MobileNetV1.",
    roles: ['ml-eng', 'ml-platform'],
    level: 'junior',
    kind: 'estimation',
    topics: ['microcontrollers', 'memory', 'tinyml', 'edge'],
    minutes: 15,
    strong: [
      "Two separate budgets: the weights are constants, held in flash (or MRAM) and read in place; the activations change as the model runs and need SRAM, in a fixed block (the tensor arena) reserved at start-up. A model can fail on either.",
      "int8: weights 22,604 bytes (flash, about 2% of 1 MB); activations: the peak is the larger input-plus-output pair of one layer, 16,000 bytes (SRAM, about 6% of 256 KiB); together 38,604 bytes, matching the 38.6 KB reported for this network.",
      "float32: weights 22,604 x 4 = 90,416 bytes (about 88 KiB of flash) and activations 64,000 bytes. It still fits here, but moves four times the bytes through memory, and energy is dominated by data movement; many small chips and NPUs are fast or only able to run integer maths, so int8 is often a requirement, not just a saving.",
      "The arena size depends on the model and is found by experimentation; add runtime overhead and keep headroom for the other firmware (the lesson's widget reserved 25%).",
      "MobileNetV1 at full width: about 4.2 million weights is about 4.2 MB in int8, over 1 MB of flash. Its activation peak is in the first pointwise layer, not the weight-heavy late layers: 112 x 112 x 32 in and 112 x 112 x 64 out is 1,204,224 values, about 1.15 MiB in int8, far over 256 KB of SRAM. Early layers have big images and few weights, late layers the reverse.",
      "Fixes: lower the input resolution (halving each side divides the peak by 4, to 301,056 values, about 294 KiB, still over 256 KiB), narrow the network with a width multiplier, choose a smaller architecture, or a bigger chip. Resolution, not only weight count, matters.",
    ],
    followUps: [
      {
        q: "The model fits both budgets on paper but fails at run time. What do you check?",
        lookFor:
          "Arena size needs overhead and alignment, other code uses SRAM too, the runtime lacks an operator, stack and heap use; leave headroom and measure on the device.",
      },
      {
        q: "A datasheet advertises 67 TOPS for a board. What do you ask before using that number?",
        lookFor:
          "Sparse or dense (a dense model gets about half), which precision, which power mode and clock, and that peak is only a ceiling: memory traffic and small layers keep real speed well below it.",
      },
      {
        q: "How would you estimate battery life for 10 inferences a second?",
        lookFor:
          "Energy per inference x rate, plus idle and sleep current, microphone and radio; measure energy at the supply over a long window, and note a duty-cycled chip computes briefly and sleeps.",
      },
    ],
    redFlags: [
      "Adds weights and activations and compares the sum with one memory.",
      "Forgets activations altogether.",
      "Treats a TOPS figure as achievable speed.",
    ],
    lessons: ['edge/inside-a-small-device', 'edge/quantization-for-edge', 'edge/tinyml-wake-word-detector'],
  },
  {
    id: 'int8-accuracy-drop-in-noise',
    prompt:
      "After post-training int8 quantisation, a wake-word model lost 0.4 accuracy points on the test set, which the team accepts. In field tests, though, false rejects doubled in noisy rooms, and results differ slightly between two board revisions. What is going on, and what do you do?",
    roles: ['ml-eng'],
    level: 'mid',
    kind: 'debugging',
    topics: ['quantisation', 'tinyml', 'validation', 'edge'],
    minutes: 20,
    strong: [
      "An average hides the tails. The calibration set (real inputs used to measure each activation's range) probably lacked noisy and rare conditions, so ranges were set on easy data and clipped the values that matter in hard cases. Rebuild calibration and test sets from real, difficult inputs, including noise at several SNRs, and judge by the task metric (false rejects and false accepts per hour), not average accuracy.",
      "Post-training quantisation versus quantisation-aware training: PTQ converts a trained float model using calibration data; QAT inserts fake quantisation in training so the model learns to tolerate rounding. Per-channel 8-bit weights with per-tensor activations stayed within about 2% of float on image CNNs in one whitepaper, QAT narrowed it to about 1%, and 4-bit weights needed QAT (image tasks, so check yours). Small efficient networks and depthwise convolutions are the hard case: weight ranges that differ by more than 100 times between output channels, or outliers, hurt a single scale, so use per-channel scales first, then QAT if a gap remains.",
      "Knows the arithmetic on the chip: real = (q - zero point) x scale; weights int8 with zero point 0 and a scale per output channel; activations int8 with a zero point; bias int32 with scale S_w x S_x; an int32 accumulator rescaled by S_w x S_x / S_y using a fixed-point multiplier and shift. Example: weights 0.42, -0.77, 0.15, 0.91 give a scale of 0.91 / 127 = 0.00717 and int8 values 59, -107, 21, 127; inputs in the range -0.5 to 2.0 give scale 2.5 / 255 = 0.0098 and zero point -77; the integer accumulator is 1,022, about 0.072 against a float result of 0.061, within one output step of 0.0118.",
      "Differences between board revisions come from different kernels and fixed-point rounding, so test across units, set defensible tolerances, and pin the versions of framework, converter and runtime.",
      "Diagnose layer by layer: compare activations with the float model on fixed hard inputs to find where error jumps; keep sensitive layers (often the first, the last and those with large activation ranges) in higher precision; validate on the target hardware at realistic temperature and load.",
    ],
    followUps: [
      {
        q: "How would you build a better calibration set?",
        lookFor:
          "Representative and deliberately difficult: noise at several SNRs, rare conditions and range extremes, drawn from real field data with consent; check the measured ranges are not set by a few outliers.",
      },
      {
        q: "The quantised model is smaller but not faster. Why?",
        lookFor:
          "The hardware may not accelerate that format or operator, kernels may fall back, or memory traffic and the rest of the pipeline dominate; profile on the device.",
      },
      {
        q: "PTQ or QAT first?",
        lookFor:
          "PTQ first with per-channel scales and a good calibration set because it is cheap; QAT when a gap remains or when going below 8 bits.",
      },
    ],
    redFlags: [
      "Accepts the average accuracy and ships.",
      "Calibrates on clean data only.",
      "Assumes quantised results are identical on every device.",
      "Measures speed on a laptop rather than the target.",
    ],
    lessons: ['edge/quantization-for-edge', 'edge/tinyml-wake-word-detector'],
  },
  {
    id: 'npu-speedup-lower-than-promised-operator-fallback',
    prompt:
      "We moved a small transformer-block model from the CPU to a chip with an NPU that is about 10 times faster than the CPU on the operators it supports. The model takes 30 ms on the CPU and 9.7 ms on the NPU build, not 3 ms. Example numbers: 90% of the CPU time is in NPU-supported operators; layer norm, softmax and GELU are unsupported and run on the CPU; the model splits into 4 NPU partitions; each partition costs one transfer in and one out at 0.5 ms each. Where do you look, and what can you change?",
    roles: ['ml-eng', 'ml-platform'],
    level: 'mid',
    kind: 'debugging',
    topics: ['edge', 'npu', 'operators', 'runtimes'],
    minutes: 20,
    strong: [
      "Explains the layers: framework, model file, runtime and accelerator back end (called a delegate, execution provider, compute unit or accelerator depending on the runtime). The runtime partitions the graph: the back end takes the subgraphs it supports and the rest falls back to the CPU, which keeps the model working but may cost performance.",
      "Reproduces the number: CPU-only 30 ms; unsupported operators take 10% = 3.0 ms on the CPU; supported ones take 27 ms / 10 = 2.7 ms on the NPU; 4 partitions x 2 transfers x 0.5 ms = 4.0 ms; total 9.7 ms, a 3.1 times speed-up, not 10.",
      "Gives the ceiling: even with free transfers the 10% that stays on the CPU caps the gain at 30 / 5.7 = 5.3 times (Amdahl); the transfers are the extra loss, caused by unsupported operators sitting in the middle of the graph and splitting it.",
      "Remedies in rough order of cost: move the boundary so unsupported operators sit at the start or end (one partition: 3.0 + 2.7 + 1.0 = 6.7 ms, about 4.5 times); swap the operator for a supported one and re-check accuracy; fuse or rewrite it with supported operators; write a custom kernel (and own it); change runtime or chip.",
      "Looks at partitions with the runtime's profiler instead of guessing; checks quantisation, because some accelerators run only quantised models, so a float operator in a quantised graph may be a fallback rather than merely slow.",
      "Process lessons: check an architecture's operators against the converter's list before committing, pin versions of converter and runtime, verify parity of outputs and the task metric after conversion, and measure on the device.",
    ],
    followUps: [
      {
        q: "On this board each transfer is really 1.5 ms. What happens?",
        lookFor:
          "Total = 5.7 + 8 x 1.5 = 17.7 ms, only about 1.7 times faster; with 4 partitions the break-even is about 3.04 ms per transfer, above which delegating loses to the CPU alone. Rewrite the graph or delegate fewer parts.",
      },
      {
        q: "Compile ahead of time or on the device?",
        lookFor:
          "Ahead-of-time suits large models on a known chip (lower start-up cost and memory); on-device compilation suits small models and broad distribution at a higher first-run cost; either way you get one artefact per chip family and a test matrix to match.",
      },
      {
        q: "How do you know the converted model is still correct?",
        lookFor:
          "Run fixed representative inputs through source and converted models; for a quantised model compare the task metric with a defensible tolerance; count partitions; re-run after any version change.",
      },
    ],
    redFlags: [
      "Blames the hardware without profiling the partitions.",
      "Trusts the vendor's speed-up rating for the whole model.",
      "Ignores transfer costs between partitions.",
      "Compares only the final output on one input.",
    ],
    lessons: ['edge/from-pytorch-to-the-chip', 'edge/inside-a-small-device'],
  },
  {
    id: 'real-time-audio-block-deadline-delay-power',
    prompt:
      "An audio effect runs a neural model on a 16 kHz stream. (a) With blocks of 160 samples and a 400-sample analysis window, what is the deadline per block and the worst-case delay in a simple double-buffered model? (b) The model takes 1.5 ms per inference: what fraction of the processor does it use at 160-sample and at 32-sample blocks? (c) Each inference costs 50 microjoules: what is the average power and the battery life on a 100 mWh battery at 100 and at 500 inferences a second? (d) Why is the average inference time the wrong number to look at?",
    roles: ['ml-eng'],
    level: 'mid',
    kind: 'estimation',
    topics: ['real-time', 'latency', 'audio', 'edge'],
    minutes: 20,
    strong: [
      "Deadline = block size / sample rate: 160 / 16,000 = 10 ms; 32 / 16,000 = 2 ms. The output for a block must be ready before it finishes playing; miss it once and you get a click or dropout.",
      "Delay in the simple model = fill (one block) + slot (one block) + look-ahead (window minus block): 10 + 10 + 15 = 35 ms for 160 / 400. With 32-sample blocks and the same 400-sample window it is 2 + 2 + 23 = 27 ms (the window still overhangs); with a 64-sample window it is 6 ms. A non-causal model waiting for k future frames adds k hops. Says this is a simplified model and real systems buffer differently.",
      "Load = time per inference / block period: 1.5 / 10 = 15% at 160-sample blocks, 1.5 / 2 = 75% at 32-sample blocks. The model's time did not change, but it runs five times as often (100 versus 500 a second).",
      "Power = inference rate x energy: 100 x 50 microjoules = 5 mW, so a 100 mWh battery lasts 20 hours; 500 x 50 microjoules = 25 mW, 4 hours (model alone, ignoring idle, microphone and radio). Shrinking the block buys lower delay at a direct cost in load and energy.",
      "The average hides the slow tail: interrupts, cache misses fetching weights, clock or voltage changes, other tasks and thermal throttling make some blocks slow. At 100 blocks a second, 0.1% of blocks missing is a glitch every 10 seconds; at 500 blocks a second, every 2 seconds. Look at p99, p99.9 and the worst case.",
      "Keeps real-time code bounded: no blocking calls, memory allocation, file or network access in the audio path; reserve the memory arena at start-up; carry state between blocks so each block computes only new samples; test under load at the worst supported temperature.",
      "Benchmarks honestly: warm up, run to steady state (including thermal slowdown), report the distribution with the conditions, time the whole shipped path, measure energy at the supply, and report accuracy alongside speed.",
    ],
    followUps: [
      {
        q: "The model must wait for 2 future frames of 10 ms each. What happens to the delay?",
        lookFor: "It adds 20 ms: 35 ms becomes 55 ms; a causal model adds none.",
      },
      {
        q: "Is 35 ms acceptable?",
        lookFor:
          "It depends on the product: fine for captions, too long for sound that is mixed with the direct sound at the ear, where one study of simulated open-canal hearing aids rated about 5 to 6 ms just acceptable (other fittings tolerate more).",
      },
      {
        q: "A 60-second benchmark gives 1.0 ms but the product sometimes sees 1.5 ms and occasionally 4 ms. Why?",
        lookFor:
          "Warm-up and steady-state heating, cold caches, contention with other tasks, and tail events; re-measure in the product under load and quote percentiles.",
      },
    ],
    redFlags: [
      "Reports only the mean inference time.",
      "Confuses block size with window size.",
      "Forgets that halving the block raises load and power.",
    ],
    lessons: ['edge/real-time-on-a-budget', 'audio/noise-suppression-and-hearing-devices'],
  },
  {
    id: 'on-device-llm-memory-and-speed-budget',
    prompt:
      "We want a 'summarise this message' feature running fully on a phone. Candidate A: a 3.8-billion-parameter model at 4 bits per weight, 32 layers, 32 KV heads, head dimension 96, 4,096-token context, 16-bit KV cache. Candidate B: a 3.09-billion-parameter model at 4.5 bits per weight, 36 layers, 2 KV heads, head dimension 128, 8,192-token context. Estimate the memory of each and the best-case decode speed if usable memory bandwidth is 100 GB/s (an assumed figure), and say when you would fall back to the cloud.",
    roles: ['ai-eng', 'ml-eng'],
    level: 'mid',
    kind: 'estimation',
    topics: ['on-device llm', 'kv cache', 'memory', 'edge'],
    minutes: 20,
    strong: [
      "Weights = parameters x bits / 8: A 3.8e9 x 0.5 bytes = 1.9 GB; B 3.09e9 x 4.5 / 8 = 1.74 GB.",
      "KV cache per token = 2 x layers x KV heads x head dimension x bytes: A = 2 x 32 x 32 x 96 x 2 = 393,216 bytes, so 4,096 tokens is 1.61 GB; B = 2 x 36 x 2 x 128 x 2 = 36,864 bytes, so 8,192 tokens is only 0.30 GB. That is 10.7 times less per token, almost all from grouped-query attention (2 KV heads against 32). Totals: A about 3.5 GB, B about 2.0 GB.",
      "Ways to cut the cache: fewer KV heads by design, an 8-bit cache (halves it), sharing the cache across layer blocks (one vendor reports 37.5% less), a shorter context.",
      "The phone's usable memory is less than the spec: the system can terminate the processes holding the most memory when short, and memory a process modifies stays resident; measure the real limit on the target and leave headroom.",
      "Decode speed ceiling = memory bandwidth / bytes read per token (weights plus KV cache): A about 100 / 3.51 = 28 tokens a second (53 with no cache), B about 100 / 2.04 = 49. Real speed is lower (compute, dequantisation, threading, heat); one traceable data point is a 1.8 GB model at over 12 tokens a second implying at least 21.6 GB/s of reads. Prefill, handling many prompt tokens at once, is compute-bound, which is where an NPU or GPU helps most; decode is memory-bound whichever chip does it.",
      "Fit for purpose: small models suit narrow, well-specified tasks (summarise, extract fields, classify intent, pick a tool) and are weak at world knowledge, long context and open-ended reasoning; specialise with a LoRA adapter, which belongs to one base-model version.",
      "Fallback rules: no model on the device (not downloaded, evicted, unsupported hardware); the task is too hard (a validity or confidence check triggers a retry elsewhere); the input is too long; or the data must not leave the device, in which case the right fallback is a refusal or a simpler local function, not a silent upgrade to the cloud. Evaluate on the real device, because quantisation, runtime and heat change outputs. On-device removes the network path, not app logs, backups or prompt injection.",
    ],
    followUps: [
      {
        q: "Why would doubling memory bandwidth help decode speed more than doubling the NPU's TOPS?",
        lookFor:
          "Decode reads every weight (and the cache) once per token, about one multiply-add per weight read, so it waits on memory; more compute leaves it unchanged.",
      },
      {
        q: "The platform provides its own on-device model. Use it or ship ours?",
        lookFor:
          "The platform model costs no download or memory budget and is updated for you, but you cannot choose or freeze it and it can change under you; your own gives control and the fleet-update burden. Evaluate both on real devices on your task.",
      },
      {
        q: "Candidate A fits at 4,096 tokens, but users paste 20,000-token threads. What do you do?",
        lookFor:
          "The cache scales linearly with context (A would need about 7.9 GB), so truncate or chunk-and-summarise, pick a model with fewer KV heads, or route long inputs to the cloud with the user's consent.",
      },
    ],
    redFlags: [
      "Forgets the KV cache.",
      "Takes the spec-sheet RAM as available to the app.",
      "Quotes TOPS as the decode-speed limit.",
      "No fallback plan, or silently sends private text to the cloud.",
    ],
    lessons: ['edge/small-language-models-on-device', 'local/memory-math-for-local-models', 'serving/kv-cache-and-memory'],
    game: { label: 'Fit the model', href: '/play/fit-the-model/' },
  },
  {
    id: 'fleet-model-rollout-signing-canary-rollback',
    prompt:
      "Design how we ship a new on-device model to 100,000 devices. Devices go offline for weeks, there are several hardware classes (one older, low-memory class makes up about 5% of the fleet), and we cannot see raw user audio. How do you package, sign, roll out, monitor and roll back? Size the first canary stage if a regression would make 2% of devices in that older class fail.",
    roles: ['ml-platform'],
    level: 'senior',
    kind: 'design',
    topics: ['edge', 'ota updates', 'rollout', 'monitoring'],
    minutes: 40,
    strong: [
      "States what a fleet changes: several versions live at once, failures that depend on device class, little visibility, and an undo that is slower than the ship.",
      "Ships the model as its own signed, versioned artefact with a manifest: version and content hash, the minimum runtime and operator set, the device classes it targets and the memory it needs, input and output format with thresholds and post-processing that must change with it, and the version it replaces and falls back to.",
      "Signing and rollback: update frameworks such as TUF defend against rollback, freeze and single-key-compromise attacks, so clients refuse older versions; a legitimate rollback is therefore published as a new, higher version pointing at the old weights. Keep the previous model on the device until the new one has proved itself and switch back locally on failure. Test the rollback path before the first release.",
      "Sizes the canary with expected failures: to see k failures in a class that is a share s of the fleet with failure rate p you need about k / (s x p) devices: 10 / (0.05 x 0.02) = 10,000 devices for ten failures. A proportional 1% canary of 1,000 devices contains about 50 older devices and expects 1 failure, a 63% chance of seeing at least one, so it can easily miss it. Fill the canary evenly across device classes.",
      "Zero failures in n devices only bounds the rate near 3 / n (95%): after 1,000 clean devices, below about 0.3%. A halt rule has three parts: a size, a threshold and a slice; judging each class separately catches class-specific bugs but halts healthy updates more often because each class is smaller and noisier. Alert relative to the previous version for the same class.",
      "Monitors without raw data: counters and histograms labelled with model version and device class (inference counts, latency buckets, memory high-water mark, out-of-memory and thermal events, fallback rate), output statistics (confidence histograms, empty outputs), user signals (undo, retry), and fixed test inputs run on the device at install. A shadow run of the candidate shows differences on real inputs at a battery cost. Set a minimum cohort size; consider local differential privacy for counts of sensitive things; each proxy has a blind spot and labels arrive late or never.",
      "Federated learning learns from the fleet without collecting its data, but updates can leak (gradients have been inverted to recover training examples), so secure aggregation and differential privacy address separate threats at a cost; it still needs a held-out test and a staged rollout. Delta updates are not automatic savings if the new version re-quantises every weight. Delivery routes exist on each major cloud (AWS IoT Jobs with rollout and abort configurations, Azure Device Update for IoT Hub, Google Play for on-device AI), and product details change, so read the current documentation.",
    ],
    followUps: [
      {
        q: "The first 1,000 devices show zero failures. Proceed?",
        lookFor:
          "That is weak evidence: only about 50 of them are in the older class, and zero in 1,000 bounds the overall rate at about 0.3%. Extend the canary, keep growing in stages under the halt rule, and sample the older class on purpose.",
      },
      {
        q: "You need to roll back, but the signing system refuses older versions.",
        lookFor:
          "Publish the old weights as a new higher version; this is by design, so plan it in advance, and remember offline devices will get the rollback only when they next connect.",
      },
      {
        q: "How do you detect a quality regression with no labels?",
        lookFor:
          "Proxies against the previous version in the same class: output histograms, fallback and undo rates, fixed test inputs, shadow comparisons; and stay aware of their blind spots and label delay.",
      },
    ],
    redFlags: [
      "Bundles the model inside firmware so every change is a full release.",
      "A canary proportional to the fleet with no per-class slice.",
      "Uploads raw audio for monitoring.",
      "Has no tested rollback path.",
      "Claims federated learning makes updates private by itself.",
    ],
    lessons: ['edge/shipping-to-a-fleet', 'systems/monitoring-and-drift', 'edge/from-pytorch-to-the-chip'],
  },
];
