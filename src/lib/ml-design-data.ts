import type { DesignScenario, Kind, Option, StageId, StageQuestion } from './ml-design';

/*
 * Content for the design-checklist walkthrough in systems/ml-system-design-interviews. Three
 * scenarios, seven stages each, five options per stage: two that a strong answer includes
 * ("core"), one reasonable extra ("fine") and two common mistakes ("trap"). The reasons draw on
 * the lesson's sources: Google's Rules of Machine Learning, Chip Huyen's notes on distribution
 * shifts, Eugene Yan's write-up on recommendation and search design, and the fraud-detection
 * handbook from the Machine Learning Group at the Universite Libre de Bruxelles.
 */

const o = (id: string, kind: Kind, text: string, why: string): Option => ({ id, kind, text, why });
const q = (stage: StageId, question: string, options: Option[]): StageQuestion => ({ stage, question, options });

const feed: DesignScenario = {
  id: 'feed',
  name: 'Feed ranking',
  brief: 'A short-video app wants to rank the home feed for each user. The catalogue has about 100 million videos, and the feed must load quickly on phones. Assume 10 million daily users who load the feed about five times a day.',
  stages: [
    q('goal', 'What does success mean, and how will you know?', [
      o('a', 'core', 'Choose a primary online metric tied to the product goal, such as retention or satisfied watch time, with guardrails for diversity, creator exposure and harmful content.', 'A ranker optimises whatever you measure, so the metric has to stand for what you actually want. Guardrails catch gains that come from the wrong behaviour.'),
      o('b', 'core', 'Name an offline metric for each stage (recall at k for retrieval, NDCG or AUC for ranking) and say how each should relate to the online metric.', 'Offline metrics are fast and cheap but only proxies. Saying how they connect to the online result is how you notice an offline-online mismatch.'),
      o('c', 'fine', 'Agree the scope of version one: logged-in users and the main feed only.', 'A narrow first scope is sensible, but it does not replace defining the metric.'),
      o('d', 'trap', 'Optimise click-through rate alone, because it is easy to measure.', 'Clicks are easy to inflate with attention-grabbing items. Short-term behaviour does not guarantee long-term value (Rules of Machine Learning, rule 28).'),
      o('e', 'trap', 'Use the accuracy of predicting whether a click happens as the success metric.', 'Most impressions are not clicked, so accuracy looks high however good the model is, and a ranking cares about order, not about each item on its own.'),
    ]),
    q('data', 'What are your training examples and labels?', [
      o('a', 'core', 'Log every impression with the features the system used at the time, the position it was shown in, and the outcome (click, watch time, skip).', 'Logging the serving-time features lets you train as you serve (rule 29), and the position lets you handle position bias.'),
      o('b', 'core', 'Plan for position and selection bias: items shown high get more clicks. Use a position feature in training and keep some exploration traffic.', 'Without this the model learns what it showed, not what users like, and the feedback loop narrows the feed (rule 36; Huyen on degenerate feedback loops).'),
      o('c', 'fine', 'Add content features such as language and topic so brand-new videos with no history can still be ranked.', 'Helps cold start. It is a good addition rather than a core requirement of the design.'),
      o('d', 'trap', 'Treat every impression without a click as a confirmed negative.', 'The user may never have noticed the item. A missing positive is weak evidence, and labelling too early marks late clicks as negatives.'),
      o('e', 'trap', 'Keep only clicked items and drop the rest to keep the data clean.', 'Without negatives the model cannot learn what to rank down, and it only sees items that were already ranked high.'),
    ]),
    q('model', 'How do you build the model?', [
      o('a', 'core', 'Start with a simple baseline, such as recently popular items or a heuristic, and measure it before building anything complex.', 'You need a number to beat to know whether complexity pays for itself (rules 1 and 4: keep the first model simple, get the infrastructure right).'),
      o('b', 'core', 'Use stages: cheap candidate generation (embeddings and nearest-neighbour search) to cut the catalogue to hundreds, then a richer ranker, then re-ranking for diversity and rules.', 'This is the standard three-stage design (Google recommendation course; Eugene Yan). Only cheap models can touch millions of items.'),
      o('c', 'fine', 'Use a two-tower model for retrieval so item embeddings can be computed ahead of time.', 'A common and sensible choice, but not the only valid retrieval approach.'),
      o('d', 'trap', 'Score every video in the catalogue with the largest model for the best quality.', 'At 100 million items and about 1,700 requests per second at peak (assuming a peak three times the average), this cannot fit in a latency budget of a couple of hundred milliseconds.'),
      o('e', 'trap', 'Skip baselines and go straight to a deep model with hundreds of features.', 'If it underperforms you will not know whether the data, the features or the model is at fault, and you will have built infrastructure before proving value.'),
    ]),
    q('offline', 'How do you evaluate offline?', [
      o('a', 'core', 'Split by time: train on earlier days and test on later ones.', 'This mirrors deployment and exposes drift. A random split lets the model see the same user and the same trends in both parts (rule 33).'),
      o('b', 'core', 'Evaluate each stage separately and by slice, such as new against returning users, regions and creator size, not only the overall average.', 'A good average can hide a failing group. Separate stage metrics tell you where a problem is.'),
      o('c', 'fine', 'Keep a fixed set of logged sessions to catch regressions in every release.', 'Useful for stability, though not enough on its own to show real improvement.'),
      o('d', 'trap', 'Split impressions at random between train and test.', 'The same users, sessions and days appear on both sides, so scores look better than they will be in production.'),
      o('e', 'trap', 'If offline NDCG goes up, ship it: offline wins always show up online.', 'Offline metrics are proxies built from logs that came from the old ranker. Only an online test shows the real effect.'),
    ]),
    q('serving', 'How do you serve it?', [
      o('a', 'core', 'Give each stage a latency budget (retrieval, feature fetch, ranking, re-ranking) that adds up to the overall target for the 99th percentile.', 'Without per-stage budgets, one slow stage quietly consumes the whole request.'),
      o('b', 'core', 'Precompute item embeddings and slow-changing features in batch, and read fresh user features from one feature store shared by training and serving.', 'Cuts online work and avoids training-serving skew (rules 32 and 37).'),
      o('c', 'fine', 'Cache the ranked list for a few seconds so quick refreshes are cheap.', 'Reasonable, at the cost of some freshness.'),
      o('d', 'trap', 'Re-implement feature logic in the serving code because the training code is too slow to reuse.', 'Two versions of the same feature will diverge. This is the classic source of training-serving skew.'),
      o('e', 'trap', 'Return an error if the ranker times out.', 'An empty feed is worse than a slightly worse one. Fall back to a popular or last-good list.'),
    ]),
    q('launch', 'How do you launch?', [
      o('a', 'core', 'Replay or shadow first, then a small A/B test with guardrail metrics and a sample size and duration decided in advance, keeping a holdout.', 'Chance can make a difference look real if you peek or stop early. See Is the difference real?.'),
      o('b', 'core', 'Agree rollback criteria and a kill switch before launch.', 'Deciding while a metric is falling, under pressure, is how bad releases stay live.'),
      o('c', 'fine', 'Use interleaving to compare two rankers with less traffic.', 'A valid technique for ranking comparisons, used alongside A/B tests.'),
      o('d', 'trap', 'Ship to everyone once the offline metrics improve.', 'You have no control group and no way to spot harm until it has reached everyone.'),
      o('e', 'trap', 'Stop the experiment on the first day the dashboard shows significance.', 'Peeking inflates false positives, and early days over-represent unusual users.'),
    ]),
    q('monitor', 'What do you monitor, and how does it improve?', [
      o('a', 'core', 'Watch inputs, predictions and outcomes: feature drift, score distribution, engagement, diversity of what is shown and pipeline freshness.', 'A ranker can degrade without errors. Diversity metrics also reveal popularity bias building up (Huyen).'),
      o('b', 'core', 'Keep exploration traffic and retrain regularly so new items get exposure and the loop does not narrow.', 'Randomisation or controlled exploration reduces homogeneity at some cost to short-term results (Huyen).'),
      o('c', 'fine', 'Break dashboards down by creator group and region.', 'Useful for fairness and debugging, and an extension of slice monitoring.'),
      o('d', 'trap', 'Retrain daily on whatever was shown, with no exploration.', 'The model learns from its own exposure, so what it already likes gets more popular: a degenerate feedback loop.'),
      o('e', 'trap', 'Alert on every feature that drifts by any amount.', 'This produces alert fatigue, and people stop reading alerts. Alert on size of change and on harm.'),
    ]),
  ],
};

const fraud: DesignScenario = {
  id: 'fraud',
  name: 'Fraud detector',
  brief: 'A payments company wants to catch fraudulent card payments. A decision is needed while the customer waits at the checkout, and a small team of investigators reviews the most suspicious cases.',
  stages: [
    q('goal', 'What does success mean, and how will you know?', [
      o('a', 'core', 'Frame it as a cost trade-off: a missed fraud loses money, and every false decline costs a sale and a customer\'s trust. Derive the target from those costs.', 'The best operating point depends on the relative costs, not on the highest recall.'),
      o('b', 'core', 'Use precision and recall at an operating point, including precision among the top k alerts investigators can review in a day, not accuracy.', 'Fraud is rare and review capacity is limited, so precision at the top k is the operational metric (fraud-detection handbook).'),
      o('c', 'fine', 'Split the outcome into approve, step-up verification, review and decline, each with its own threshold.', 'A good design that gives a graceful middle path, but it comes after the metric is defined.'),
      o('d', 'trap', 'Report accuracy: 99.9 percent accuracy means it works.', 'If 0.1 percent of payments are fraud, a model that approves everything is 99.9 percent accurate and catches nothing.'),
      o('e', 'trap', 'Maximise recall at any cost, because missing fraud is the only real failure.', 'A model that flags everything has perfect recall. False declines have real costs and overwhelm reviewers.'),
    ]),
    q('data', 'What are your training examples and labels?', [
      o('a', 'core', 'Label from confirmed outcomes (chargebacks, customer confirmations, investigator decisions) and treat recent transactions as not fully labelled yet.', 'Fraud labels arrive days to months late, so the newest data looks cleaner than it is (Huyen; handbook delay period).'),
      o('b', 'core', 'Watch for selection bias: blocked payments never reveal whether they were fraud, and investigated alerts are not a random sample. Consider a small controlled exploration or holdout.', 'Labels come mostly from alerts, so the model learns from what it already flagged (handbook, alert-feedback interaction).'),
      o('c', 'fine', 'Add features aggregated per card, device and merchant over the last minute, hour and day.', 'Standard and valuable. A good feature set builds on top of getting the labels right.'),
      o('d', 'trap', 'Treat every payment not disputed so far as genuine and train on it immediately.', 'Recent fraud has not been reported yet, so it gets labelled as genuine, which teaches the model the wrong thing.'),
      o('e', 'trap', 'Oversample fraud to 50 percent and also evaluate on the resampled data.', 'Resampling can help training, but evaluation must use the real class balance or precision will be wildly overstated.'),
    ]),
    q('model', 'How do you build the model?', [
      o('a', 'core', 'Start with a rules baseline and a simple model such as logistic regression or gradient-boosted trees on tabular features, before anything deep.', 'Tabular data and a need for fast, debuggable decisions suit simple models, and the baseline gives you something to beat.'),
      o('b', 'core', 'Keep blocking and scoring rules next to the model, and handle imbalance with class weights or cost-sensitive training, then calibrate scores so thresholds mean something.', 'Real systems layer rules and a data-driven model. A fast rule path is how you respond to a new attack the same day (handbook).'),
      o('c', 'fine', 'Add graph features that link cards, devices and accounts to find rings.', 'Often powerful, and a sensible later iteration.'),
      o('d', 'trap', 'Replace all rules with one model and no way to override it.', 'You lose the fast path for known patterns and for responding to a new attack before the model can be retrained.'),
      o('e', 'trap', 'Tune on a random split and ship whichever model has the best AUC.', 'It ignores time, label delay and the cost of false alarms, so the chosen model may be the wrong one.'),
    ]),
    q('offline', 'How do you evaluate offline?', [
      o('a', 'core', 'Split by time with a delay period: train on older data, leave out the most recent days whose labels are immature, and test on later transactions.', 'This simulates deployment and avoids learning from labels that are not final (handbook, validation strategies).'),
      o('b', 'core', 'Report precision at the daily review capacity and recall at a fixed false-positive rate, and compute the expected cost at each candidate threshold.', 'It ties the numbers to the people and money involved, and exposes the false-alarm volume.'),
      o('c', 'fine', 'Backtest on a known attack period to see how quickly the model would have caught it.', 'A useful stress test that complements the aggregate metrics.'),
      o('d', 'trap', 'Split all transactions at random into train and test.', 'The same cards and merchants appear on both sides and the future leaks into the past, so scores are optimistic.'),
      o('e', 'trap', 'Pick the threshold using ROC AUC alone.', 'With very rare positives, a tiny false-positive rate can still mean far more false alarms than real fraud. Look at precision and cost.'),
    ]),
    q('serving', 'How do you serve it?', [
      o('a', 'core', 'Budget latency in the payment path, with a decision in tens of milliseconds, so features come from precomputed stores and streaming aggregates.', 'The customer is waiting. Velocity features have to be fresh to that minute, which needs streaming computation and a fast online store.'),
      o('b', 'core', 'Design the fallback: if the model or feature store is slow or down, use rules and a safe default rather than failing every payment.', 'A dependency outage should degrade protection a little, not stop all sales.'),
      o('c', 'fine', 'Score synchronously for approve or decline, and run deeper models asynchronously for review.', 'A good split of cost and latency.'),
      o('d', 'trap', 'Compute velocity features in a nightly batch table.', 'A fraudster can try dozens of cards in minutes. Stale counts miss bursts, and joining a table that changes risks skew (rule 31).'),
      o('e', 'trap', 'Hold the payment until the slowest model finishes, because accuracy matters more than speed.', 'A slow decision delays every payment, so a bounded latency is part of the requirement. Cap the wait and fall back.'),
    ]),
    q('launch', 'How do you launch?', [
      o('a', 'core', 'Run in shadow mode first, logging scores without acting, then roll out gradually with a threshold that keeps review volume within capacity.', 'Shadow mode shows real score distributions and queue sizes before any customer is affected.'),
      o('b', 'core', 'Use champion-challenger with a holdout, measure money saved and customers wrongly declined, and agree rollback criteria beforehand.', 'It gives a fair comparison and a quick exit if the new model misbehaves.'),
      o('c', 'fine', 'Begin with the model only flagging for review, then move high-confidence cases to automatic action.', 'A cautious path that builds trust.'),
      o('d', 'trap', 'Switch the model on for all traffic at once so it starts learning from real decisions.', 'There is no comparison and no safe way back if it mis-scores a common customer group.'),
      o('e', 'trap', 'Judge the launch on the first week\'s labelled fraud rate.', 'Labels are still arriving, so the first weeks always look better than they are.'),
    ]),
    q('monitor', 'What do you monitor, and how does it improve?', [
      o('a', 'core', 'Track input and score drift, the mix of approve, review and decline, review queue size and alert precision daily, and recall and precision on mature labels as chargebacks arrive.', 'Fast signals come first, and the delayed labels confirm. Together they cover both speed and truth.'),
      o('b', 'core', 'Expect adversaries to adapt: retrain often on recent labelled data, keep a fast path for new rules and treat drift as normal.', 'Attackers change tactics once they are blocked, which is concept drift.'),
      o('c', 'fine', 'Slice monitoring by merchant type, country and channel.', 'Good practice. Attacks and false declines often concentrate in a few segments.'),
      o('d', 'trap', 'Wait for chargeback metrics before looking at anything.', 'Dispute windows can run from a month to three months, so a failure could run for weeks unseen.'),
      o('e', 'trap', 'Freeze the validated model, because retraining adds risk.', 'The target moves. A frozen model decays, and the risk of not updating is usually larger than the risk of a gated retrain.'),
    ]),
  ],
};

const search: DesignScenario = {
  id: 'search',
  name: 'Search relevance',
  brief: 'An online shop with about 10 million items wants better search results. Queries range from exact product codes to vague phrases like "gift for a runner".',
  stages: [
    q('goal', 'What does success mean, and how will you know?', [
      o('a', 'core', 'Define relevance with human-judged graded labels for evaluation, for example 0 to 3 per query and item, and choose online metrics such as conversion, reformulation and zero-result rate as the final check.', 'Clicks mix relevance with position and attractiveness, so human judgments give a cleaner target, and online metrics confirm it matters.'),
      o('b', 'core', 'Pick a ranking metric that rewards good results near the top, such as NDCG at 10 or mean reciprocal rank.', 'Users look at the first few results, so order matters more than overall recall.'),
      o('c', 'fine', 'Segment queries into frequent, mid-frequency and rare, and into exact-match against exploratory.', 'Helps you see where the system fails. It is a refinement of the metric, not a substitute.'),
      o('d', 'trap', 'Treat clicks as relevance, full stop.', 'Higher-ranked results get more clicks just for being higher, and attractive results get clicked even when they disappoint.'),
      o('e', 'trap', 'Aim for the highest recall of every matching item.', 'Returning everything is trivial and useless. The first page is what users see.'),
    ]),
    q('data', 'What are your training examples and labels?', [
      o('a', 'core', 'Build labels from clicks and purchases but correct for position bias, and keep a separate human-judged set for evaluation.', 'Behaviour data is plentiful but biased by what was shown, so you need a cleaner set to check it (rule 36).'),
      o('b', 'core', 'Choose negatives carefully: results shown but not chosen are harder and more informative than random items.', 'Airbnb reports that randomly sampled negatives made the retrieval problem too easy and gave poor model performance.'),
      o('c', 'fine', 'Mine query logs for common misspellings and synonyms.', 'Cheap and useful for query understanding.'),
      o('d', 'trap', 'Treat every unclicked result as irrelevant.', 'Users never see most results, and may have found what they wanted in another one.'),
      o('e', 'trap', 'Train only on frequent queries, since they have the most data.', 'Rare queries are many and often the hardest. A model trained only on frequent ones fails where help is needed most.'),
    ]),
    q('model', 'How do you build the model?', [
      o('a', 'core', 'Use hybrid retrieval: keyword matching plus embedding retrieval, then a learned ranker over features such as text match, popularity, price and stock.', 'Keywords handle exact terms and codes, embeddings handle meaning, and a ranker combines many signals (Eugene Yan; Facebook and Airbnb retrieval papers).'),
      o('b', 'core', 'Start with a tuned keyword baseline with field boosts and measure its NDCG before adding learned models.', 'A strong baseline is hard to beat cheaply, and you need its score to prove any gain.'),
      o('c', 'fine', 'Add query understanding: spelling correction and category prediction.', 'Often a big win, and part of a good pipeline.'),
      o('d', 'trap', 'Replace keyword matching entirely with embeddings.', 'Embeddings can blur exact identifiers such as model numbers, which users type and expect to match precisely.'),
      o('e', 'trap', 'Use a large language model to rank all 10 million items for each query.', 'Far too slow and costly. Use cheap stages to narrow candidates before any expensive model.'),
    ]),
    q('offline', 'How do you evaluate offline?', [
      o('a', 'core', 'Evaluate on a fixed labelled query set stratified into frequent, mid and rare queries, with NDCG at 10, and also check zero-result queries and slices such as category and language.', 'Averages hide failing groups, and rare queries behave differently.'),
      o('b', 'core', 'Check that offline gains predict online results, and investigate when they do not.', 'If offline and online disagree, your labels or logs are biased, and you need to know before trusting either.'),
      o('c', 'fine', 'Keep a list of must-win queries from important customers or categories.', 'A practical safety net.'),
      o('d', 'trap', 'Sample evaluation queries only from sessions that ended in a click.', 'You would drop the queries that failed, which are the ones you most need to fix.'),
      o('e', 'trap', 'Split click logs at random by row.', 'The same query and the same shopper appear in both train and test, so scores look better than they will be.'),
    ]),
    q('serving', 'How do you serve it?', [
      o('a', 'core', 'Allocate a latency budget across query understanding, retrieval, feature fetch and ranking, and rank only the top few hundred candidates.', 'Ranking cost grows with the number of candidates, so budgets and candidate limits keep the total within the target.'),
      o('b', 'core', 'Precompute item embeddings and the nearest-neighbour index offline, refresh them as the catalogue changes, keep price and stock filters fresh at query time and cache frequent queries.', 'Airbnb computes listing embeddings daily and had to choose an index that coped with frequent price and availability updates. Caching handles head queries cheaply.'),
      o('c', 'fine', 'Apply hard filters, such as category or in-stock, before ranking.', 'Shrinks the candidate set and is common practice.'),
      o('d', 'trap', 'Embed the whole catalogue at query time.', 'Millions of embeddings per query is far outside any latency budget.'),
      o('e', 'trap', 'Cache full results for a day, including price and stock.', 'Users will be shown out-of-stock items and wrong prices.'),
    ]),
    q('launch', 'How do you launch?', [
      o('a', 'core', 'Test online with an A/B experiment, or interleaving for a faster comparison, with metrics and duration fixed in advance.', 'Offline labels cannot show the effect on real shoppers.'),
      o('b', 'core', 'Set guardrail metrics (latency, zero-result rate, revenue per search) and a rollback plan.', 'A relevance gain that slows search or loses revenue is not a win.'),
      o('c', 'fine', 'Launch category by category.', 'Limits the blast radius and lets you learn.'),
      o('d', 'trap', 'Ship if human raters like the new results and skip the online test.', 'Raters are not shoppers, and the effects on conversion and latency stay unmeasured.'),
      o('e', 'trap', 'Compare the new ranker with last month\'s numbers instead of a concurrent control.', 'Seasonality and promotions change behaviour, so before-and-after comparisons mislead.'),
    ]),
    q('monitor', 'What do you monitor, and how does it improve?', [
      o('a', 'core', 'Monitor the query mix (new products, seasons), zero-result and reformulation rates, click position distribution and index freshness.', 'Search quality can fall because the world changed or because the index is stale, with no errors.'),
      o('b', 'core', 'Feed failures back: sample poor queries for human judgment and refresh labels and training data regularly.', 'This turns production problems into better data, which is how the system improves.'),
      o('c', 'fine', 'Alert on latency percentiles.', 'Necessary, though it covers speed, not relevance.'),
      o('d', 'trap', 'Watch only the average click-through rate.', 'An average hides which queries got worse and cannot tell relevance from position or layout changes.'),
      o('e', 'trap', 'Rebuild the index monthly, since freshness does not matter much.', 'Stale prices, stock and new items directly harm results.'),
    ]),
  ],
};

export const SCENARIOS: DesignScenario[] = [feed, fraud, search];
