import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'clustering-tsne-segments-claim': {
    short:
      "Two things are wrong. The features were never put on a common scale, so a column in big units such as income decides almost every distance, and t-SNE draws neighbourhoods rather than a map, so the gaps between islands, their sizes and even how many islands there are are not facts about the customers. Scale the features, cluster in the original scaled space (or after PCA), use the 2D picture only to look and to colour, and judge the segments by whether they are stable and useful for a decision.",
    explain: [
      {
        heading: "Scale first, or one column decides everything",
        body: "Clustering is about distance, and distance adds up squared differences in each column's own units. Take two customers aged 25 and 55 whose incomes are 50,000 and 51,000 pounds. The distance is sqrt(30^2 + 1,000^2) = sqrt(1,000,900), which is about 1,000.45. The 30-year age gap barely moves it, so age is almost invisible and income does the clustering alone. The fix is to standardise each column (subtract its mean, divide by its standard deviation) so every column is measured in 'how unusual is this' units. Do it inside a pipeline, so the means and deviations come from training data only and new customers are scaled with the same numbers. After scaling, PCA's explained-variance shares are a cheap first look at how many directions carry the structure.",
      },
      {
        heading: "What t-SNE does and does not tell you",
        body: "t-SNE (and its cousin UMAP) squeezes 10 dimensions into 2 by trying to keep each point's near neighbours near. It is good at that and nothing else. Cluster sizes, the gaps between clusters, the distances between islands and even the number of islands change with the perplexity setting (roughly, how many neighbours each point considers) and with the random seed, and random noise can form convincing clumps. So 'island C is far from the others, so it is a very different group' reads a distance off a picture that was never drawn to scale. Run several perplexity values and seeds, and treat only the patterns that survive all of them as worth a look. Then cluster in the original scaled space (or after PCA) and colour the picture by cluster, instead of clustering the picture. You can also check how well the layout kept each point's neighbours: for every customer, what share of the 10 nearest neighbours in the 10-dimensional space are still among the 10 nearest in 2D.",
      },
      {
        heading: "k-means: what it needs and where it breaks",
        body: "k-means picks k centres, assigns every point to the nearest one, moves each centre to the mean of its points, and repeats. It needs you to supply k, it only finds a local best that depends on the starting centres, and it assumes clusters that are round and of similar size. Start it with k-means++ (a spread-out start) from many random seeds and keep the run with the lowest inertia (the sum of squared distances from points to their centre). Inertia always falls as k grows, so the 'elbow' plot and the silhouette score (how much closer a point is to its own cluster than to the next nearest one, from -1 to 1) are aids, not proof. The silhouette favours compact blobs and can prefer a wrong answer on moons or rings. When the shape is not round, try DBSCAN (it grows clusters through crowded regions, labels the rest as noise, and uses one global radius that struggles when densities differ) or hierarchical clustering (build a tree called a dendrogram, cut it afterwards, and note that the linkage rule is a choice).",
      },
      {
        heading: "Judge the segments by the decision they feed",
        body: "A segment is useful if you can act on it. Check whether the groups respond differently to an offer, whether ten random customers from each segment read as one coherent kind of person, and whether the same segments come back when you resample the customers or change the seed. If they do not, the 'three segments' on the slide were a property of one picture, not of the business.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'scale', label: "Scale the features", sub: "inside a pipeline" },
        { id: 'pca', label: "Optional PCA", sub: "check explained variance" },
        { id: 'cluster', label: "Cluster in that space", sub: "k-means++, many starts" },
        { id: 'stable', label: "Check stability", sub: "resample, vary k" },
        { id: 'picture', label: "Colour a t-SNE picture", sub: "to look, not to measure" },
        { id: 'use', label: "Test against the decision", sub: "do segments act differently" },
      ],
      highlight: ['scale', 'cluster'],
      caption: "The 2D picture comes late and is only coloured by clusters that were found in the real space.",
    },
    example: {
      title: "Example: k-means by hand on six points",
      text: "Points 1, 2, 3, 10, 11, 12 with k = 2 and starting centres 1 and 2. In round 1, point 1 joins the first centre and points 2, 3, 10, 11, 12 join the second, so the centres move to 1 and (2+3+10+11+12)/5 = 7.6. In round 2, points 2 and 3 are nearer to 1 than to 7.6, so the groups become {1, 2, 3} and {10, 11, 12} with centres 2 and 11, and nothing changes after that.",
      rows: [
        { label: "Final inertia", value: "(1 + 0 + 1) + (1 + 0 + 1) = 4" },
        { label: "Silhouette of the point 2", value: "own average distance 1, other group 9, so (9 - 1) / 9 = 0.89" },
        { label: "Average silhouette, all six points", value: "about 0.85" },
        { label: "Age 25 vs 55, income 50,000 vs 51,000", value: "distance about 1,000.45, age almost invisible" },
      ],
    },
    followUps: [
      {
        q: "By hand: points 1, 2, 3, 10, 11, 12, k = 2, starting centres 1 and 2. What does k-means do and what is the final inertia?",
        a: "Round 1 gives {1} and {2, 3, 10, 11, 12} with centres 1 and 7.6. Round 2 gives {1, 2, 3} and {10, 11, 12} with centres 2 and 11, and then nothing changes. The inertia is (1 + 0 + 1) + (1 + 0 + 1) = 4, the silhouette of the point 2 is (9 - 1) / 9 = 8/9, and the average over all six points is about 0.85.",
      },
      {
        q: "The silhouette on the t-SNE output is 0.6. Does that confirm the segments?",
        a: "No. It measures how compact the groups are in a picture that t-SNE itself drew, and the score favours compact blobs. Evaluate in the original scaled space and against the business use.",
      },
      {
        q: "The real structure is two concentric rings. What do you use?",
        a: "k-means cuts straight across rings because it assumes round clusters. DBSCAN (choose eps from a k-distance plot) or single-linkage hierarchical clustering follows the shape, and you should check that the silhouette is not misleading you.",
      },
    ],
    mistakes: [
      "Reading distances or cluster sizes off a t-SNE plot as if they were measurements.",
      "Running k-means on raw columns in different units, so the biggest-unit column does all the work.",
      "Picking k by eye from the picture, or running k-means once with one start.",
      "Treating a good silhouette score as proof that the segments are real.",
    ],
  },

  'ds-ab-test-sample-ratio-mismatch': {
    short:
      "The split is not close enough: with 100,000 users each arm should have about 50,000, and a gap of 800 gives a chi-squared statistic of 25.6, a p-value of about 4 in ten million. A random 50/50 assignment would almost never land that far off, so the assignment or the counting is broken, and that is called a sample ratio mismatch (SRM). Do not report the revenue effect until you find out why users are missing, because the arms may no longer be comparable.",
    explain: [
      {
        heading: "Count it, do not eyeball it",
        body: "The check is a chi-squared test (a measure of how far the observed counts are from the counts you expected). Expected is 50,000 in each arm. The statistic is the sum of (observed - expected)^2 / expected over both arms: 800^2 / 50,000 = 12.8 for each arm, so 25.6 in total, on one degree of freedom. The p-value, the chance of a gap this large if assignment really were random, is about 4.2 in ten million. Now compare a harmless gap, 50,150 against 49,850: 150^2 / 50,000 = 0.45 per arm, a statistic of 0.9 and a p-value of about 0.34, well within chance. The lesson is that the size of a gap is judged against the sample size, so 1.6% off at 100,000 users is a screaming alarm while 0.3% off is noise.",
      },
      {
        heading: "Why a mismatch invalidates the result",
        body: "Random assignment is what makes the two arms alike before the treatment, so any difference afterwards can be blamed on the treatment. If users go missing from one arm for a reason that is related to the outcome, that guarantee is gone. A redirect that fails on slow connections, a bot filter that fires more often in one arm, or a crash that stops the logging for some users would each remove a particular kind of user from one side. The revenue difference may then come from who is counted, not from what the treatment did. The bias can be large and in the direction people were hoping for, which is a reason for more care, not less.",
      },
      {
        heading: "What to do and what usually causes it",
        body: "Do not analyse or report the treatment effect yet. Split the mismatch by platform, browser, country, entry point and day, and read the assignment and logging code. Common causes are triggering conditions that differ by arm, assignment placed after a step that only some users reach, different bot or fraud filters, redirects, caching and logging bugs, and a rollout that overlapped with another test. If the cause is found and fixed, rerun the test. If it is understood and provably independent of the outcome, document it and report with strong caveats. Never delete users from one arm just to rebalance the counts.",
      },
      {
        heading: "Make it automatic and check the rest",
        body: "Add an SRM check to the experiment platform so every test is checked before anyone opens the revenue chart, and run an A/A test (two identical arms) on any new setup. Also check things that belong before reading a result: balance on key pre-experiment traits, that the unit of randomisation (say the user) matches the unit of analysis, a fixed stopping rule, and guardrail metrics such as errors and latency.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Harmless gap", "This test"],
      rows: [
        { label: "Counts (treatment vs control)", cells: ["50,150 vs 49,850", "50,800 vs 49,200"] },
        { label: "Expected in each arm", cells: ["50,000", "50,000"] },
        { label: "Chi-squared statistic", cells: ["0.9", "25.6"] },
        { label: "p-value", cells: ["about 0.34", "about 4 in 10 million"] },
        { label: "What to do", cells: ["Chance, carry on with the usual checks", "Stop, find the cause, do not report the effect"] },
      ],
      caption: "Same kind of gap, very different verdicts, because the size of a gap is judged against the sample size.",
    },
    example: {
      title: "Example: the SRM arithmetic for 100,000 users",
      text: "A 50/50 design means 50,000 expected per arm. Observed 50,800 and 49,200 give a difference of 800 in each direction. The chi-squared statistic is the sum of (difference squared divided by expected), which is 12.8 + 12.8.",
      rows: [
        { label: "One arm's term", value: "800^2 / 50,000 = 12.8" },
        { label: "Statistic, both arms", value: "12.8 + 12.8 = 25.6 (one degree of freedom)" },
        { label: "p-value", value: "about 4.2 in ten million" },
        { label: "Harmless case 50,150 vs 49,850", value: "statistic 0.9, p about 0.34" },
      ],
    },
    followUps: [
      {
        q: "The treatment effect looks large and positive. Why is that not a reason to keep the result?",
        a: "A broken assignment can create or hide an effect, for example if the missing users in one arm are the low spenders. Wanting a result to be true is a reason for more care, not less.",
      },
      {
        q: "The mismatch appears only on one browser. How do you proceed?",
        a: "Look at how that browser reaches assignment and logging, for example a script that fails or a redirect that drops users. Check whether excluding that browser from both arms restores the balance, and note that the result then applies only to the others. Fix the bug and rerun.",
      },
      {
        q: "In a marketplace test, treatment sellers take buyers from control sellers. What does that do to the estimate?",
        a: "The arms are no longer independent, which is called interference, so the measured gain overstates the true effect. Consider randomising by cluster or market, a switchback design (switching the whole system on and off over time) or a holdout of whole regions.",
      },
    ],
    mistakes: [
      "Saying the split is 'close enough' without computing anything.",
      "Reporting the revenue effect and mentioning the mismatch as a footnote.",
      "Dropping users from one arm to make the counts match.",
      "Not being able to name causes of a mismatch, so the investigation never starts.",
    ],
  },

  'forecast-backtest-and-leakage': {
    short:
      "Suspect leakage from the random split first: shuffling ordered weeks trains the model on the future to predict the past, and a rolling average that includes the week being predicted hands it the answer. Re-evaluate with a rolling-origin backtest (train on the past only, forecast the next stretch, move forward, repeat) against naive and seasonal-naive baselines, using an error measure chosen on purpose. Report the model's error as a ratio to the seasonal-naive forecast, with the spread across origins.",
    explain: [
      {
        heading: "Why the 6% was probably too good",
        body: "A random 80/20 split of weeks puts many test weeks between training weeks, so the model can see what happened just before and just after. In real use it only knows the past. The safe default is a rolling-origin backtest: pick an origin week, train only on what came before, forecast the next stretch (say the lead time planners use), score it, move the origin forward, repeat, and average. Look at the spread across origins too, because one split is a thin basis for a choice. Then suspect the 4-week rolling average. If its window includes the week being predicted, the target leaks into its own input and the shuffled-split error can fall towards zero. The window must end one week earlier. Also check scalers, imputation or tuning fitted on the whole series, data that was corrected after the fact, and 'actual weather' used where only a forecast would exist at the time. Calendar features such as holidays are fine, because they are known in advance.",
      },
      {
        heading: "Baselines first, and a fair error measure",
        body: "Compare with simple forecasts: the mean, naive (repeat the last value), seasonal naive (the same week last year) and drift (extend the average change). On a strongly seasonal series seasonal naive is hard to beat, so the model has to be reported against it. MASE (mean absolute scaled error) does this: it is the model's mean absolute error divided by the in-sample seasonal-naive error, and below 1 means better than that baseline. For example 3.10 / 7.22 = 0.43. Choose the measure on purpose. MAPE (percentage error) is undefined when an actual is zero, explodes near zero and is lopsided: forecasting 50 when the actual is 100 scores 50%, while forecasting 100 when the actual is 50 scores 100%, for the same miss of 50. MAE is in the series' own units, RMSE punishes big misses, and MASE compares across series.",
      },
      {
        heading: "Trees, horizons and intervals",
        body: "A boosted tree predicts by averaging training values, so it cannot go beyond the range it saw. On a rising series its forecasts flatten at the old top. Remove the trend first (for example predict the change from the same week last year and add it back) or combine it with a model that extrapolates. Evaluate at the horizon the planners use: multi-step forecasts need a recursive model (feed forecasts back in) or one model per horizon. If you publish prediction intervals, check them in the backtest by counting how often the actual value lands inside the stated range, for a 90% interval it should be close to 90% of the time.",
      },
    ],
    diagram: {
      kind: 'experiment',
      slug: 'no-time-aware-split',
      caption: "Split a made-up series at random and by time, and see how much better the shuffled test looks than the real future.",
    },
    example: {
      title: "Example: why the error measure matters",
      text: "Two forecasts miss by the same 50 units and are scored with different measures. The model's MAE is 3.10 units and a seasonal-naive forecast's in-sample MAE is 7.22 units, both example numbers.",
      rows: [
        { label: "Forecast 50, actual 100", value: "MAPE = 50 / 100 = 50%" },
        { label: "Forecast 100, actual 50", value: "MAPE = 50 / 50 = 100%" },
        { label: "Model MAE / seasonal-naive MAE", value: "3.10 / 7.22 = 0.43, so MASE 0.43, better than the baseline" },
        { label: "Rolling feature for week t", value: "average of weeks t-4 to t-1, never week t" },
      ],
    },
    followUps: [
      {
        q: "After you shift the rolling mean by one week, the backtest error rises from 6% to 11%. Has the model got worse?",
        a: "No. The 6% was inflated by leakage and 11% is the honest figure. The comparison that matters is against seasonal naive on the same origins, and the model is only useful if it beats it clearly.",
      },
      {
        q: "The series keeps climbing and the boosted model's forecasts flatten at the top of its training range. Why, and what do you do?",
        a: "A tree repeats the nearest leaf, an average of training values, so it cannot extrapolate. Detrend (predict the difference from a year ago, or the residual of an exponential-smoothing fit) and add the trend back, or use a method with a trend term.",
      },
      {
        q: "Is a random K-fold split ever acceptable for time series?",
        a: "Published work shows K-fold can be valid for purely autoregressive models with uncorrelated errors. It says little about multi-step forecasts, can struggle when the level shifts, and hides leaks, so a rolling origin is the safe default.",
      },
    ],
    mistakes: [
      "Shuffling time-ordered rows, or trusting a single train/test split.",
      "Including the current period in a rolling feature, or fitting scalers and imputers on the whole series.",
      "Never comparing with a naive or seasonal-naive baseline, so a good-looking number means nothing.",
      "Using MAPE on intermittent demand that contains zeros.",
    ],
  },

  'ds-ai-assistant-ab-test-faster-but-more-reopens': {
    short:
      "Do not ship on speed alone: the reopen rate rose by 1.1 points (6.0% to 7.1%, a 95% interval of roughly 0.6 to 1.6 points, wider once agent clustering is counted) and satisfaction fell by 1.5 points, which are guardrail metrics, not footnotes. First check the setup (sample ratio, how randomisation was done, whether the unit of analysis is the agent), then put speed and quality in the same units of money and time, then look at which tickets and agents drive the result. Report a recommendation with conditions and the uncertainty, such as ship for simple ticket types with review while reopens keep being measured.",
    explain: [
      {
        heading: "Check the setup and the unit of analysis",
        body: "Before reading any metric, check for a sample ratio mismatch, how randomisation was done (by agent or by ticket), whether agents saw both arms, and whether the arms are balanced on ticket type and agent experience. Then check the unit. Tickets handled by the same agent are not independent, because one fast or careful agent contributes thousands of similar tickets. An interval that treats 20,000 tickets as 20,000 independent facts is too narrow. Analyse at the agent level or use cluster-robust methods (they widen the interval to reflect that tickets cluster by agent), and say how many agents there are, because 30 agents carry far less information than 20,000 tickets suggest.",
      },
      {
        heading: "Size the damage and put it in the same units as the gain",
        body: "The reopen increase is 7.1% - 6.0% = 1.1 points. If tickets were independent, the standard error is about sqrt(0.071 x 0.929 / 20,000 + 0.06 x 0.94 / 20,000) = 0.25 points, giving a 95% interval of roughly 0.6 to 1.6 points, and the true interval is wider once agent clustering is allowed for. On 20,000 tickets, 1.1 points is about 220 extra reopened tickets per arm. Now compare units. A 12% rise in tickets per hour means the same work takes 1 / 1.12 = 89.3% of the hours. As an example, if each ticket takes 12 minutes, 20,000 tickets is 4,000 hours and the saving is about 429 hours. If each extra reopen costs 30 minutes, 220 reopens cost 110 hours, leaving about 319 hours before counting the lost goodwill behind the 1.5-point satisfaction fall. Also ask whether faster handling means shorter or lower-quality replies, because speed alone is not the goal if quality falls.",
      },
      {
        heading: "Metric roles, segments and AI-specific checks",
        body: "Primary, guardrail and diagnostic metrics should be defined before the test, and a significant fall in a guardrail is a result to act on. When you look at several metrics, account for that, because the more you test the more likely one looks significant by chance. Look for differences between groups: new versus experienced agents, simple versus complex tickets, languages. The assistant may help on routine tickets and hurt on hard ones, which points to a narrower rollout. Add the AI-specific checks: sample and grade drafts for factual errors, measure how often agents send drafts unchanged, and watch for novelty or learning effects over the test period so a first-weeks result is not taken as the steady state.",
      },
      {
        heading: "What you tell the product manager",
        body: "Give a recommendation with conditions, not a bare yes or no, and state the uncertainty. For example: the assistant raises throughput by about 12% but also seems to raise reopens by about 1 point; ship it first for ticket types where reopens did not rise, keep a small holdout, and review again after four weeks. That respects the manager's goal of speed while making the cost visible.",
      },
    ],
    diagram: {
      kind: 'layers',
      layers: [
        { label: "Primary metric", sub: "tickets handled per hour, up 12%" },
        { label: "Guardrail: reopen rate", sub: "6.0% to 7.1%, about 220 extra reopens per 20,000" },
        { label: "Guardrail: customer satisfaction", sub: "1.5 points lower" },
        { label: "Diagnostics", sub: "draft errors, drafts sent unchanged, ticket type, agent experience" },
      ],
      caption: "Decide the role of each metric before the test; a guardrail that falls is a reason to act, not a footnote.",
    },
    example: {
      title: "Example: speed against reopens in hours",
      text: "These are example costs, not measured ones: each ticket takes 12 minutes and each extra reopen costs 30 minutes of agent time. The test numbers are the question's: 20,000 tickets per arm and 12% more tickets per hour.",
      rows: [
        { label: "Hours for 20,000 tickets at 12 minutes", value: "4,000 hours" },
        { label: "Hours saved by 12% more throughput", value: "4,000 x (1 - 1/1.12) = about 429 hours" },
        { label: "Extra reopens", value: "1.1% of 20,000 = 220" },
        { label: "Time cost of the reopens", value: "220 x 0.5 hours = 110 hours" },
        { label: "Net, before goodwill and satisfaction", value: "about 319 hours saved" },
      ],
    },
    followUps: [
      {
        q: "Agents in treatment and control share one queue. Why might that bias the result?",
        a: "Faster treatment agents take more tickets, or the easy ones, which leaves harder tickets for control. The arms are no longer independent. Randomise by team or time block, or check the ticket mix and adjust.",
      },
      {
        q: "The reopen difference is 'significant' but the PM says 1.1 points is tiny. How do you respond?",
        a: "Significance and size are different questions. Translate it into tickets and cost (about 220 per 20,000), compare it with the value of the throughput gain, and let the decision rest on that with the interval. Neither dismiss it nor inflate it.",
      },
      {
        q: "How would you keep checking quality after launch?",
        a: "Keep a permanent small holdout or a sampled human review, track reopens and satisfaction by segment, and alert on the guardrails. The model, the prompts and the tickets all change over time.",
      },
    ],
    mistakes: [
      "Shipping because the primary metric improved and ignoring the guardrails.",
      "Treating tickets from one agent as independent without comment.",
      "Reporting a p-value with no effect size in business terms.",
      "Never checking how randomisation was done or whether the arms interfere with each other.",
    ],
  },

  'leakage-offline-great-production-poor': {
    short:
      "Suspect leakage in the split first: clips cut from the same recording, speaker or device landed in both train and test, so the model learned the recording rather than the listening environment. Re-split by recording or speaker and re-measure, then check for near-duplicates, preprocessing fitted before the split, and features that quietly encode the label. If a gap remains, compare the field and offline inputs and run the same raw clip through the on-device and offline feature code.",
    explain: [
      {
        heading: "Start with the split, because it is the cheapest check",
        body: "A random clip-level split treats every clip as unrelated, but clips from one recording share a microphone, a room, a speaker and a gain setting. If a recording is cut into 25 clips and clips are split at random, the 24 other clips from that recording are each in training with probability 0.8, so about 19 siblings sit in training for every test clip. The model can score well by recognising the recording, which is memorisation, not hearing the difference between a cafe and a street. Re-split by group (all clips of a recording or speaker on one side, called group k-fold) and re-measure. Also look for near-duplicates across the splits: overlapping windows, or augmented copies made before the split.",
      },
      {
        heading: "Preprocessing and label-encoding features",
        body: "Anything learned from data must be learned from the training part only. If normalisation statistics, feature selection or target encoding were fitted on all clips before splitting, information about the test clips has leaked in. Move that work inside the training fold or a pipeline object. Then hunt for features or metadata that encode the label by accident: a file path, a recording date, or a gain setting that differed between collection campaigns. Look at feature importance, or remove the suspect features and see whether the score collapses.",
      },
      {
        heading: "Offline versus field, and train-serve skew",
        body: "If the group split brings the score down only part of the way, the rest is a difference between the lab data and the field. Compare microphones, firmware, sample rate, noise levels and the class mix, which in the field may be very different from the balanced lab set. Then check train-serve skew, meaning the on-device feature extraction differs from the offline code through windowing, resampling or fixed-point arithmetic. The decisive test is to feed the same raw clip through both paths and compare the feature values.",
      },
      {
        heading: "Make the next evaluation honest",
        body: "Build a test set that mirrors deployment: new speakers, new devices and later dates, and report metrics per slice (per environment class, per device) so a weak corner is visible. Keep that set frozen and use it once per release candidate.",
      },
    ],
    diagram: {
      kind: 'experiment',
      slug: 'data-leakage',
      caption: "Score one model with a row split and with a speaker split, and watch the near-perfect score fall when the speakers are new.",
    },
    example: {
      title: "Example: how many siblings does a test clip have?",
      text: "Take a made-up set of 1,000 clips cut from 40 recordings, 25 clips each, split 80/20 at random by clip. Every test clip then has 24 sibling clips from the same recording that could land in training.",
      rows: [
        { label: "Expected siblings in training per test clip", value: "24 x 0.8 = 19.2" },
        { label: "Chance a test clip has no sibling in training", value: "0.2^24, about 1.7 x 10^-17, effectively never" },
        { label: "Group split instead", value: "32 recordings train, 8 test, no recording on both sides" },
        { label: "Scores in this story", value: "offline 97%, field about 75%, group-split offline 82% (the follow-up example)" },
      ],
    },
    followUps: [
      {
        q: "After a group split the offline score drops to 82%. Field is still 75%. What next?",
        a: "The remaining gap is distribution shift or skew, not leakage. Slice by environment class and device, label a sample of field clips, check class priors, compare feature statistics, and consider collecting or augmenting field-like data and re-checking the calibration of confidence thresholds.",
      },
      {
        q: "How do you prevent this class of problem in the team's process, not just this model?",
        a: "Write down split rules per dataset (the group and time keys), run dedup checks in the data pipeline, keep preprocessing inside the pipeline object, and keep a frozen deployment-like test set. Share one feature implementation between training and serving, and run an eval in CI.",
      },
    ],
    mistakes: [
      "Jumping to a bigger model or more training before checking the split.",
      "Treating the field result as noise instead of looking at the data.",
      "Fitting scalers or feature selection on the full dataset because it is 'only preprocessing'.",
    ],
  },

  'code-gradient-boosting-two-rounds': {
    short:
      "Gradient boosting starts from a constant (the mean of y, 6.4) and, round by round, fits a depth-1 tree (a stump) to the current residuals and adds a fraction of it to the predictions. On the example data with a learning rate of 0.5, the squared training error goes 47.2, then 14.8 after round 1, then 6.7 after round 2. Choose the number of rounds by early stopping on a held-back validation set, and remember that a forest averages independent deep trees while boosting builds small trees one after another, each aimed at what is still wrong.",
    explain: [
      {
        heading: "The algorithm in plain steps",
        body: "Start with a base prediction equal to the mean of y. Then repeat for each round. First compute residuals, which are actual minus current prediction. For squared error these are also the negative gradient of the loss, which is why the method is called gradient boosting. Second, fit a stump to the residuals: sort the x values, try each midpoint between distinct neighbours as a cut, set each side's value to the mean residual on that side, and keep the cut with the smallest squared error. Third, update every prediction by adding learning_rate times its leaf value. The final model is the base plus learning_rate times the sum of all stumps, so prediction just replays the stored stumps. Implementation hygiene: only try cuts between distinct sorted values, scan each feature once with running sums so every cut costs constant time instead of recomputing, guard against an empty side, and store each stump as (cut, left value, right value).",
      },
      {
        heading: "Run it by hand",
        body: "Data: x = 1, 2, 3, 4, 5 and y = 3, 5, 4, 9, 11. The mean is 32 / 5 = 6.4, so round 0 predicts 6.4 everywhere, the residuals are -3.4, -1.4, -2.4, 2.6, 4.6, and the squared error is 11.56 + 1.96 + 5.76 + 6.76 + 21.16 = 47.2. Round 1: the cut between 3 and 4 leaves residuals -3.4, -1.4, -2.4 on the left (mean -2.4) and 2.6, 4.6 on the right (mean +3.6), with a stump error of 4.0, better than the other cuts (32.75, 28.0 and 20.75). At half strength the predictions are 6.4 - 1.2 = 5.2 for the left three and 6.4 + 1.8 = 8.2 for the right two, and the error falls to 14.8. Round 2: the new residuals are -2.2, -0.2, -1.2, 0.8, 2.8, the best cut is again between 3 and 4 with leaf values -1.2 and +1.8, the predictions become 4.6, 4.6, 4.6, 9.1, 9.1, and the error falls to 6.7.",
      },
      {
        heading: "Choosing the number of rounds, and forest versus boosting",
        body: "Training error always falls as you add rounds, so it cannot choose the number. Train to a generous maximum, score a held-back validation set after every round, stop when it has not improved for a patience window of rounds, and keep the best round. Validation error falls and then rises as the model starts fitting noise. A smaller learning rate needs more rounds. The validation set is now part of the model-building, so keep a separate test set for the final score. A random forest grows deep trees independently on bootstrap samples (random resamples of the rows) and averages them, which lowers variance. Boosting grows small trees in sequence, each aimed at what is still wrong, and is more sensitive to rounds, learning rate, depth, subsampling and regularisation. For losses other than squared error each tree fits that loss's negative gradient, which is no longer the plain residual.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "Boosting round",
      yLabel: "Squared training error",
      points: [[0, 47.2], [1, 14.8], [2, 6.7], [3, 3.3], [4, 1.6], [5, 1.0]],
      marks: [{ x: 1, label: "Round 1: 14.8" }, { x: 2, label: "Round 2: 6.7" }],
      caption: "Training error with learning rate 0.5 on the five points. Rounds 3 to 5 come from running the same recipe, and training error always falls, which is why validation error picks the stopping point.",
    },
    example: {
      title: "Example: the same data at learning rate 1.0",
      text: "With a learning rate of 1.0 the full correction is added in round 1. The base is 6.4, the left leaf value is -2.4 and the right is +3.6, so the left three predictions become 4.0 and the right two become 10.0.",
      rows: [
        { label: "Round 1 predictions, rate 1.0", value: "4, 4, 4, 10, 10" },
        { label: "Squared error, rate 1.0", value: "1 + 1 + 0 + 1 + 1 = 4.0" },
        { label: "Squared error after round 1, rate 0.5", value: "14.8" },
        { label: "Starting error (mean only)", value: "47.2" },
      ],
    },
    followUps: [
      {
        q: "Set the learning rate to 1.0 and rerun round 1. What is the error, and why do practitioners still use small rates?",
        a: "The predictions are 4, 4, 4, 10, 10 and the squared error is 4.0, much lower than 14.8 after one round. That aggressiveness is exactly the risk: each tree chases the current residuals, noise included. Many small steps with more rounds are more cautious and usually generalise better, at the price of training time.",
      },
      {
        q: "Validation loss starts rising after 150 trees while training loss keeps falling. What do you do?",
        a: "Stop early at the best round. Then lower the learning rate, use shallower trees, subsample rows and columns, set a minimum number of rows per leaf or add penalties, and check that the validation data resembles the training data and that nothing leaks.",
      },
      {
        q: "When would you choose a random forest over boosting, or neither?",
        a: "A forest works reasonably out of the box and gives an out-of-bag estimate, while boosting often wins on tables with tuning. Benchmarks on medium-sized tabular data have favoured tree ensembles over neural networks, but the gap depends on the datasets and tuning, and a logistic regression baseline should be run first.",
      },
    ],
    mistakes: [
      "Fitting each tree to y instead of to the residuals, or adding the full correction with no learning rate.",
      "Choosing the number of rounds from training error.",
      "Using the validation score as the final reported performance.",
      "Claiming boosting always beats neural networks on tabular data.",
    ],
  },

  'code-paired-bootstrap-for-model-difference': {
    short:
      "Resample whole cases with replacement, keeping each case's pair of results together, recompute the mean difference (B minus A) on each of several thousand resamples, and take the 2.5th and 97.5th percentiles as the 95% interval. On the example, A passes 80 and B passes 83, the difference is +3 points, and the interval is roughly -4 to +10 points, so it includes zero and the data cannot say B is better. A sign test on the 13 disagreements agrees: 8 against 5 gives a p-value of about 0.58.",
    explain: [
      {
        heading: "The function, in words",
        body: "The function takes two equal-length lists of 0/1 results, checks that they are the same length and not empty, and builds a list of per-case differences (b minus a, each -1, 0 or +1). It makes a random generator with a fixed seed so the answer can be repeated, then, for each of several thousand resamples (10,000 is plenty), draws as many cases as there are with replacement, takes the mean of their differences, and stores it. It returns the observed mean difference and the 2.5th and 97.5th percentiles of the stored means. Resampling the differences is the same as resampling the cases, and it keeps each pair together. Resampling the two lists independently would break the pairing and give a wider, wrong interval.",
      },
      {
        heading: "Checking it on the example",
        body: "Out of 100 cases, both pass on 75, only A passes on 5, only B passes on 8, and both fail on 12. A passes 75 + 5 = 80 and B passes 75 + 8 = 83, so the observed difference is +3 points. With 10,000 resamples the 95% interval comes out at roughly -4 to +10 points. It includes zero, so these data cannot show that B is better. The number to report is the interval together with the effect, something like 'B is ahead by about 3 points, and the data are compatible with anything from 4 points behind to 10 points ahead'.",
      },
      {
        heading: "Why pairing helps, and what the sign test says",
        body: "The 75 cases where both pass and the 12 where both fail carry no information about which model is better. All the information is in the 13 disagreements, where B won 8 and A won 5. Because a hard case tends to be hard for both models, pairing removes that shared difficulty. The sign test asks: if the models were equal, each of the 13 disagreements would be a coin flip. The chance of 8 or more of 13 landing one way is (1,287 + 715 + 286 + 78 + 13 + 1) / 8,192 = 2,380 / 8,192 = 0.2905, and doubling it for either direction gives p = 0.58. With ten times the data and the same proportions (80 against 50), p is about 0.011.",
      },
      {
        heading: "What a p-value is not, and the limits of the method",
        body: "A p-value is not the chance that B is better and it is not the size of the effect. Report the effect with its interval, and decide in advance what gap would matter. The bootstrap assumes cases are independent. If cases come from the same document or user, resample by group instead. A model acting as judge adds its own noise, and running each case several times reduces output noise but does not replace more distinct cases.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'pairs', label: "Pair the results", sub: "same case, both models" },
        { id: 'diff', label: "Take B minus A per case", sub: "values -1, 0 or +1" },
        { id: 'resample', label: "Resample cases with replacement", sub: "same count as the original" },
        { id: 'mean', label: "Average each resample", sub: "one difference per round" },
        { id: 'repeat', label: "Repeat 10,000 times", sub: "fixed seed" },
        { id: 'interval', label: "Read the percentiles", sub: "2.5th and 97.5th" },
      ],
      highlight: ['resample', 'interval'],
      caption: "Keeping each pair together is what makes the bootstrap paired.",
    },
    example: {
      title: "Example: 100 cases, two models",
      text: "Both models pass 75 cases, only A passes 5, only B passes 8, and both fail 12. All counts add to 100, and only the 13 disagreements say anything about which model is better.",
      rows: [
        { label: "A passes", value: "75 + 5 = 80 cases" },
        { label: "B passes", value: "75 + 8 = 83 cases" },
        { label: "Observed difference (B minus A)", value: "+3 points" },
        { label: "95% paired bootstrap, 10,000 resamples", value: "roughly -4 to +10 points, includes zero" },
        { label: "Sign test, 8 of 13 disagreements", value: "p = 2 x 0.2905 = 0.58" },
        { label: "Same proportions, 80 vs 50 disagreements", value: "p about 0.011" },
      ],
    },
    followUps: [
      {
        q: "How many cases would you need to detect a 5-point gap from 70% pass rate with two separate groups, and how does pairing change it?",
        a: "About 1,252 per model for separate groups with a two-sided 5% test and 80% power. If the models disagree on about 15% of cases, a paired design needs about 469.",
      },
      {
        q: "Your 400 cases come from 40 documents with 10 questions each. What do you change in the bootstrap?",
        a: "Resample documents (clusters) and keep their questions together, since questions from one document are correlated. The interval gets wider than the case-level one.",
      },
      {
        q: "Why not just compare the two confidence intervals for A and B and see whether they overlap?",
        a: "That throws away the pairing, giving a wider and less sensitive comparison. Analyse the per-case differences directly.",
      },
    ],
    mistakes: [
      "Resampling the two models' results independently, which breaks the pairing.",
      "Declaring B better because 83 is greater than 80.",
      "Reading a p-value as the probability that B is better.",
      "Forgetting to seed the random generator or to check that the input lengths match.",
    ],
  },

  'ds-code-bootstrap-interval-with-a-whale-user': {
    short:
      "Write bootstrap_diff_ci to resample users in each group separately, compute the statistic on each resample, and return the 2.5th and 97.5th percentiles of the differences. On this data the $9.80 gap in means comes from one $1,000 user: without that user, A's mean is $1.82 against $2.00 in B, and the interval for the difference (about -1.4 to +31 dollars) spans zero, so the data cannot say which group earns more. Report the share of users who spend and the spend per spender separately, decide any cap before the test, and investigate the big spender.",
    explain: [
      {
        heading: "The function",
        body: "Build a random generator from the seed, then for each of n_boot rounds resample group a with replacement to its own length, resample group b the same way, and store stat(b_resample) minus stat(a_resample), or the other order, stated clearly in the docstring. Return the 2.5th and 97.5th percentiles of the stored differences. Resample users, because the user is the unit that was randomised, not sessions or orders. Resample each group separately because the groups are independent, not paired. Use several thousand rounds and a fixed seed so the result repeats. Pass the statistic as an argument so the same code handles a mean, a median or a trimmed mean (a mean after cutting off a fixed share of the extremes).",
      },
      {
        heading: "What the data say",
        body: "Group A's mean is (1,000 + 9 x 20) / 100 = $11.80 and group B's is (10 x 20) / 100 = $2.00, so the mean difference is $9.80, and it comes from one person. Drop that user and A's mean is 180 / 99 = $1.82 against $2.00, so the sign reverses. The medians are both $0 because most users spend nothing, so they say nothing. The bootstrap shows why the interval is wide. In a resample of 100 users, the chance that the whale is never drawn is 0.99^100 = 36.6%, that it is drawn once is 37.0%, twice 18.5% and three or more times 8.0%. Each draw of the whale adds $10 to the group A mean, so the difference sits near -0.2, +9.8, +19.8 or +29.8 depending on how many times the lottery picks that user, give or take the ordinary spread. In one run of 5,000 resamples, the 95% interval for A minus B is about -1.4 to +31, which spans zero.",
      },
      {
        heading: "What to do with money data like this",
        body: "Report the share of users who spend (10% in both groups here) and the spend per spender separately, because revenue is two questions. Cap (winsorise) values at a threshold set before the test, which changes what is measured and matters if the business cares about total revenue. Use variance reduction, such as adjusting for each user's pre-experiment spend, and collect more users. Investigate the $1,000 user: a real large customer, a test account, fraud or a data error. Where possible decide outlier rules before the test and write them in the analysis plan.",
      },
      {
        heading: "What the bootstrap does not fix",
        body: "It cannot repair a biased sample, dependence between users (for example, users from one company), a very small sample, or a statistic that depends on rare extremes, where the percentile interval can be unreliable. Here it is honest mainly because it shows the problem: the interval is huge, and that is the true state of knowledge.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "dollars per user",
      items: [
        { label: "A, all 100 users", value: 11.8, note: "includes the $1,000 user", hot: true },
        { label: "A without the big spender", value: 1.82, note: "180 / 99" },
        { label: "B, all 100 users", value: 2.0, note: "10 users spent $20" },
      ],
      caption: "One user turns a $0.18 deficit into a $9.80 'win'.",
    },
    example: {
      title: "Example: how often the big spender is in a resample",
      text: "Each of the 100 draws picks the big spender with probability 1 in 100, so the number of times that user is drawn follows a binomial distribution with n = 100 and p = 0.01. Each time that user appears, group A's resampled mean rises by $1,000 / 100 = $10.",
      rows: [
        { label: "Drawn 0 times", value: "0.99^100 = 36.6%" },
        { label: "Drawn once", value: "37.0%" },
        { label: "Drawn twice", value: "18.5%" },
        { label: "Drawn 3 or more times", value: "8.0%" },
        { label: "Interval for A minus B, 5,000 resamples, seed 1", value: "about -1.4 to +31 dollars" },
      ],
    },
    followUps: [
      {
        q: "Why not use a t-test on the means?",
        a: "It assumes the average is roughly normal, which fails with 100 users and one dominant value, because the answer is driven by the tail. A test can be run, but its interval is not trustworthy here, and the bootstrap or a different statistic is more honest.",
      },
      {
        q: "Your team caps revenue at the 99th percentile after seeing this result. Is that acceptable?",
        a: "Choosing the rule after seeing the data and the outcome is a way to steer the result. Fix the rule in advance, or report results with and without capping and say which was planned.",
      },
      {
        q: "How would you estimate how many users you would need to detect a $1 difference given this spread?",
        a: "Use the standard deviation of revenue per user (large here) in a sample-size calculation, or simulate from past data. Heavy tails make the requirement large and variance reduction cuts it, and the plan should be made before starting.",
      },
    ],
    mistakes: [
      "Resampling orders or sessions instead of users.",
      "Declaring A the winner on the $9.80 difference.",
      "Removing the big spender because it 'looks like an outlier' without checking what it is.",
      "Using the median when most users spend nothing.",
    ],
  },

  'ds-random-split-score-too-good-group-leakage': {
    short:
      "Distrust the 0.93 because a random row split puts visits from the same patient on both sides, so the model can recognise the patient, and the score no longer measures performance on a new patient. Validate by group (all visits of a patient in one fold), add a time-based split if the model predicts future visits, build features only from what is known at the prediction time, and keep all fitting inside the training folds. Report the honest, lower score with its spread, a baseline, calibration and the performance at the chosen threshold.",
    explain: [
      {
        heading: "Why the random split flatters the model",
        body: "There are 40,000 visits by 8,000 patients, about five visits each. In a random 80/20 split of rows, a test visit has four other visits from the same patient, and each is in training with probability 0.8, so the chance that at least one sibling is in training is 1 - 0.2^4 = 99.8%. The model can lean on the patient's history, their particular combination of features, and score well without having learned anything that transfers. The test then measures memory of known patients. The deployment question is almost always about someone new, so the score is optimistic.",
      },
      {
        heading: "Validate the way the model will be used",
        body: "Use grouped k-fold: every visit of a patient goes to the same fold, and you verify that no patient ID appears on both sides. If the model predicts future visits, also use a time-based split, training on earlier visits and testing on later ones. Match the split to the use: a new patient, a new hospital or a new year each call for splitting by that unit, and the score to quote is the one that matches deployment. Check features for leakage in time too. A discharge summary or the total length of stay is only known after the prediction point, so if the prediction is made at admission it cannot be used. Build features as of the prediction time.",
      },
      {
        heading: "Keep the fitting inside the folds, and do not tune on the test",
        body: "Scaling, imputation, encoding and feature selection are fitted on data, so they must be fitted inside each training fold and only applied to the held-out part. Do not tune hyperparameters on the test folds. When you try many configurations, use nested validation (an outer loop for the score and an inner loop for choosing settings) or a separate untouched test set used once.",
      },
      {
        heading: "What to report",
        body: "Compare against a simple baseline on the same splits, for example the count of prior admissions, and expect the honest score to be lower than 0.93. Report the mean and spread across folds, an interval, and performance by subgroup. Then go beyond AUC for the use: calibration (do predicted risks of 20% match observed rates near 20%), the threshold chosen from the cost of a missed case against a false alarm, and the precision and recall at that threshold.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Random row split", "Grouped by patient", "By time"],
      rows: [
        { label: "Tests performance on", cells: ["Known patients, mostly", "New patients", "Future visits"] },
        { label: "Leak risk", cells: ["High: same patient on both sides", "Low if no ID is shared", "Low, if features avoid later information"] },
        { label: "Use when", cells: ["Rows are truly independent", "Model must serve new patients", "Model predicts what comes next"] },
        { label: "Likely score", cells: ["Optimistic (0.93 here)", "Lower, an honest figure", "Lower, matches the next period"] },
      ],
      caption: "Pick the split that matches how the model will be used, and quote that score.",
    },
    example: {
      title: "Example: the leak in numbers",
      text: "40,000 visits, 8,000 patients, five visits each. The AUC values are the question's and an example for the grouped result.",
      rows: [
        { label: "Chance a test visit has a sibling in training (random split)", value: "1 - 0.2^4 = 99.84%" },
        { label: "Expected siblings in training per test visit", value: "4 x 0.8 = 3.2" },
        { label: "Grouped 5-fold", value: "6,400 patients (32,000 visits) train, 1,600 patients (8,000 visits) test" },
        { label: "AUC, random split vs grouped (example)", value: "0.93 vs 0.78" },
      ],
    },
    followUps: [
      {
        q: "With grouped validation the AUC falls from 0.93 to 0.78. What do you tell the team?",
        a: "The 0.78 is the number to quote, because the 0.93 measured memory of known patients. Show both side by side and explain why, then look for real improvements in features, data and calibration, judged on the grouped score.",
      },
      {
        q: "You tried 200 hyperparameter settings and report the best cross-validated score. What is wrong?",
        a: "Selecting the best of many on the same folds inflates the score, which is the winner's curse. Use nested cross-validation or confirm on an untouched final set, and report that figure.",
      },
      {
        q: "The model will be deployed at a hospital that is not in the data. How does that change validation?",
        a: "Hold out whole hospitals (leave-one-site-out) to measure transfer to a new site, and expect differences in practice patterns and coding. Plan local calibration and monitoring after deployment.",
      },
    ],
    mistakes: [
      "Splitting rows at random when rows are grouped by person.",
      "Fitting scalers or imputers on the whole dataset before splitting.",
      "Tuning on the test set and then reporting that same set as the result.",
      "Reporting a single AUC with no baseline, spread or calibration.",
    ],
  },

  'ds-coupon-lift-is-it-causal-confounding-and-holdouts': {
    short:
      "The 7-point claim mixes the coupon's effect with who received it: coupons went to people who had just visited the pricing page, so they were more likely to buy anyway. Estimate the effect with a randomised holdout among the targeted customers, which in made-up example numbers might show 6.4% buying without the coupon and 7.0% with it, an effect of 0.6 points rather than 7. Tell the business that most of the 'lift' was people who would have bought anyway, and judge the coupon on incremental profit, not conversion.",
    explain: [
      {
        heading: "What is wrong: confounding by targeting",
        body: "A confounder is something that influences both who gets the treatment and the outcome. Here intent is the confounder: visiting the pricing page makes a customer both more likely to be sent a coupon and more likely to buy. The two groups already differed before the coupon, so the 12% against 5% gap is partly the effect of the coupon and partly the difference between the people. Comparing sent against not sent cannot separate them.",
      },
      {
        heading: "The clean fix: a randomised holdout",
        body: "Among the customers you would target, randomly withhold the coupon from some. Random assignment breaks the link between who gets the coupon and their intent, so the groups are alike on average and the difference in their purchase rates estimates the effect of the coupon. Example numbers: among 100,000 targeted customers, 7.0% buy with the coupon (7,000 purchases) and 6.4% buy without it (6,400). The effect is 0.6 points, or 600 extra purchases, against the naive claim of 7 points, 7,000 purchases. The naive figure overstates the effect by 7 / 0.6, about 11.7 times. And 6,400 of the 7,000 buyers would have bought anyway but still got the discount.",
      },
      {
        heading: "The business consequence, in money",
        body: "The decision is about incremental profit, not conversion. As an example, suppose a purchase earns $20 before the discount and the coupon takes $5 off. With the coupon, 7,000 buyers each leave $15, which is $105,000. Without it, 6,400 buyers leave $20, which is $128,000. The coupon loses $23,000 even though conversion went up. Whether it is worth sending depends on the real margin and any later value of a customer won, which is why the incremental number matters.",
      },
      {
        heading: "If you cannot randomise, and what else to watch",
        body: "Observational methods exist: adjusting for measured differences (regression, matching or propensity weighting), difference-in-differences (compare changes over time for treated and comparison groups, assuming their trends would have been parallel), regression discontinuity at an eligibility cut-off, and instrumental variables. Each depends on assumptions that cannot be fully tested, chiefly that no unmeasured factor drives both coupon and purchase. Do not control for variables the coupon itself changes, such as later site visits, which can bias the estimate, and check that the groups overlap in the measured traits. Effects also differ across people: some respond a lot, some not at all and some are put off, so uplift modelling can focus the offer, and it needs randomised data to be trusted.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "purchases per 100,000 targeted customers",
      items: [
        { label: "Naive claim: coupon adds", value: 7000, note: "12% vs 5% read as 7 points" },
        { label: "Holdout (example): coupon adds", value: 600, note: "7.0% vs 6.4%", hot: true },
        { label: "Would have bought anyway", value: 6400, note: "still got the discount" },
      ],
      caption: "Made-up holdout numbers. The claim is about 11.7 times too big, and 91% of the coupon buyers needed no coupon.",
    },
    example: {
      title: "Example: incremental profit of the coupon",
      text: "All figures are example numbers: 100,000 targeted customers, a $20 margin per purchase before discount and a $5 coupon. Conversion is 7.0% with the coupon and 6.4% without.",
      rows: [
        { label: "Naive claim vs holdout effect", value: "7 points (7,000) vs 0.6 points (600), 11.7 times too big" },
        { label: "Buyers who would have bought anyway", value: "6,400 of 7,000 = 91%" },
        { label: "Profit with the coupon", value: "7,000 x $15 = $105,000" },
        { label: "Profit without the coupon", value: "6,400 x $20 = $128,000" },
        { label: "Net effect of sending the coupon", value: "-$23,000" },
      ],
    },
    followUps: [
      {
        q: "Legal and sales will not allow withholding the coupon from anyone. What can you do?",
        a: "Find natural variation, such as a staggered rollout, a delay or an eligibility rule, use a comparison group with difference-in-differences, or hold out a small share for a short time with a clear rationale. State the assumptions and what would break them.",
      },
      {
        q: "A matched analysis gives a 3-point effect and the holdout gives 0.6. How do you explain the difference?",
        a: "Matching adjusts only for the measured traits, so intent signals that were not measured still confound. Trust the experiment, treat the gap as a sign of unmeasured confounding, and use it to learn what the model missed.",
      },
      {
        q: "How would you explain the difference between correlation and causation to an executive using this case?",
        a: "Tell one plain story: coupons went to people already close to buying, so they would have bought anyway. A fair comparison needs two similar groups, which only random assignment guarantees. Avoid jargon and give the money consequence.",
      },
    ],
    mistakes: [
      "Accepting a before-and-after or sent-versus-not-sent gap as the effect.",
      "Controlling for everything available without thinking about what causes what.",
      "Presenting a matched estimate as proof of causation.",
      "Reporting conversion and ignoring incremental profit.",
    ],
  },

  'anomaly-detector-alert-budget': {
    short:
      "Not as it stands: of about 109 alerts a day only about 9 are real (roughly 8%), five times the team's budget of 20. Count instead of quoting rates: 10 real anomalies, 9 caught, plus 99,990 ordinary events at 0.1% gives about 100 false alerts. To fit the budget you need a false-alarm rate near 0.01%, which gives about 19 alerts a day with about 47% real, so raise the threshold from an alert budget, tier the response, and log reviewer verdicts to improve the detector.",
    explain: [
      {
        heading: "Count alerts, do not quote rates",
        body: "Of 100,000 events, 10 are real anomalies and the detector catches 90% of them, so 9 true alerts. The other 99,990 events are ordinary, and 0.1% of them is 99.99, about 100 false alerts. The team sees about 109 alerts a day, and only 9 of 109, about 8%, are real. That is five times the review budget of 20 and mostly noise. Rare events make this happen: even a small false-alarm rate, applied to a huge ordinary population, swamps the true positives. Accuracy is useless here, since predicting 'normal' for everything is 99.99% accurate.",
      },
      {
        heading: "The false-alarm rate you need",
        body: "At 0.01% false alarms, 99,990 x 0.0001 is about 10 false alerts, plus 9 real, so 19 alerts a day with 9 / 19 = about 47% real, which fits the budget. At 0.05% there would be 50 false alerts and 15% real, at 0.1% (as tested) 109 alerts and 8% real, and at 1% about 1,000 false alerts and under 1% real. Each tenfold rise in the false-alarm rate cuts the share of alerts that are real by roughly a factor of ten, which is why precision, not recall, is the number to watch for rare events.",
      },
      {
        heading: "What to do about it",
        body: "Raise the threshold and accept lower recall, or set the threshold from an alert budget (about 20 a day) and measure the precision you get. Tier the response: a cheap automatic action for a mild score and a page only for a high one. Add a second-stage check that looks at the alert more carefully. Log reviewer verdicts and use them as labels, so a supervised model can later learn on top of the unsupervised score. Choose a threshold from costs: if a missed anomaly costs as much as m false alarms, minimise m x misses + false alarms. Reviewers who see mostly false alarms stop trusting them, and studies of clinical alarm monitoring have reported that most alarms are false and often ignored as a result.",
      },
      {
        heading: "Make alerts explainable and watch drift",
        body: "Show the reason for each alert: which column, which seasonal hour, and the nearest normal examples, so a reviewer decides in seconds. And watch for drift: if what is normal moves, the scores shift and alert volume jumps without any real change in anomalies, so monitor alert volume and score distribution alongside the detector itself.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "False-alarm rate (percent of ordinary events)",
      yLabel: "Share of alerts that are real (percent)",
      points: [[0.01, 47.4], [0.05, 15.3], [0.1, 8.3], [0.5, 1.8], [1, 0.9]],
      marks: [{ x: 0.01, label: "Fits the 20 a day budget" }, { x: 0.1, label: "As tested: 109 alerts" }],
      caption: "With 9 real alerts a day and 99,990 ordinary events, every step up in false alarms drowns the real ones.",
    },
    example: {
      title: "Example: one day of 100,000 events",
      text: "10 real anomalies (1 in 10,000), 90% recall, and a false-alarm rate of 0.1% on 99,990 ordinary events. The team can review 20 alerts a day.",
      rows: [
        { label: "Real alerts", value: "90% of 10 = 9" },
        { label: "False alerts", value: "99,990 x 0.001 = about 100" },
        { label: "Total alerts, share real", value: "about 109, 9 / 109 = 8%" },
        { label: "At 0.01% false alarms", value: "about 10 false + 9 real = 19 alerts, 47% real" },
        { label: "At 1% false alarms", value: "about 1,000 false alerts, under 1% real" },
      ],
    },
    followUps: [
      {
        q: "Take ten readings: 20.1, 19.8, 20.3, 20.0, 19.9, 20.2, 20.1, 19.7, 45.0 and 52.0. A |z| > 3 rule flags neither fault. Why, and what do you use?",
        a: "This is masking: the two faults inflate the mean (25.7) and the sample standard deviation (12.1), so their z-scores are only about 1.6 and 2.2. With n = 10 the largest possible z is (n - 1) / sqrt(n) = 2.85, so a threshold of 3 can never fire. Use robust statistics: the median 20.1 and MAD (median absolute deviation) 0.2 give modified z-scores of 0.6745 x (x - median) / MAD, about 84 and 108, against a rule-of-thumb threshold of 3.5, or use IQR fences.",
      },
      {
        q: "Traffic is about 30 requests at 03:00 and 170 at 15:00. A reading of 100 at 03:00 scores under 1 on a plain z-score. How do you fix that?",
        a: "Remove what is expected first: subtract the median for the same hour on other days, then apply a robust score to the remainder. In general, forecast and then flag what the forecast could not explain.",
      },
      {
        q: "Half your anomalies sit in the empty gap between two normal groups, where each coordinate looks ordinary. What do you do?",
        a: "Per-column rules miss combinations. An isolation forest (anomalies need few random cuts to isolate) catches more but is not a cure for points in a gap, so consider density or distance methods, or reconstruction error from an autoencoder trained on normal data, each with its own threshold to set.",
      },
    ],
    mistakes: [
      "Celebrating '90% recall and only 0.1% false alarms' without computing the alert count.",
      "Using accuracy to judge a detector for rare events.",
      "Applying a |z| > 3 rule to a handful of values.",
      "Shipping with no way to record reviewer verdicts, so the detector never improves.",
    ],
  },

  'ds-forecast-weekly-demand-and-order-quantities': {
    short:
      "Start from the decision, an order quantity per product and store with a lead time and the costs of running out or having surplus, and let that set the horizon, the granularity and the error measure. Beat simple baselines (seasonal naive first) before trying anything clever, validate with a rolling-origin backtest, and handle the structure: hierarchy, intermittent demand, new products and stock-outs that hide true demand. Then turn the forecast and its uncertainty into an order: for example 800 units of lead-time demand plus 132 of safety stock gives about 932.",
    explain: [
      {
        heading: "Frame the decision, then set baselines and error measures",
        body: "The forecast exists to decide an order quantity. So fix the lead time (say 4 weeks), the level at which orders are placed (product by store, up to 5,000 x 200 = 1,000,000 series) and the costs of a stock-out and of surplus. Then set baselines before anything clever: the same week last year (seasonal naive), a recent average and a drift forecast. Report error as a ratio to the seasonal-naive method or with MASE, which copes with zeros and different scales. Avoid MAPE where demand is near zero. A model that cannot beat the baseline should not ship.",
      },
      {
        heading: "Model and structure",
        body: "Use features known in advance: calendar, holidays, planned promotions and prices, store and product attributes, and lags of demand. Gradient-boosted trees on lag features are a strong option (top entries in the M5 retail forecasting competition relied heavily on LightGBM), alongside classical per-series methods, and the result on your data decides. Handle the structure: a hierarchy (product, store, region) where forecasts should add up, many items with intermittent demand (mostly zero weeks), new products with no history (borrow from similar items using attributes) and sparse stores that borrow strength from their group. Watch the demand-versus-sales trap: when a product is out of stock, recorded sales are zero or low although demand existed, so training on sales understates demand. Flag stock-out periods and treat them as missing or censored.",
      },
      {
        heading: "Validate without leaking the future",
        body: "Backtest with a rolling origin: train on the past, forecast the next lead-time window, move forward, and average over many origins. Never shuffle time. Check for leakage, for instance using the realised promotions or actual weather rather than the plan and the forecast that were available at the time.",
      },
      {
        heading: "From forecast to order quantity",
        body: "A point forecast is not an order. Suppose the mean is 200 units a week over a 4-week lead time, so 800 units. If the weekly forecast error has an example standard deviation of 40 and errors are independent, the lead-time error has a standard deviation of 40 x sqrt(4) = 80. A 95% service level adds 1.645 x 80 = 131.6, about 132 units of safety stock, so order up to about 932. The independence is an assumption, and quantile forecasts (forecasting the 95th percentile directly) give the same without it. Judge the whole system by business results as well as forecast error, such as stock-outs, waste and holding cost against the current method, ideally in a controlled store trial, and plan monitoring and retraining.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'decision', label: "Define the decision", sub: "order, lead time, costs" },
        { id: 'baseline', label: "Set baselines", sub: "seasonal naive, MASE" },
        { id: 'model', label: "Build the model", sub: "known-in-advance features" },
        { id: 'backtest', label: "Rolling-origin backtest", sub: "no shuffling, no leaks" },
        { id: 'uncertainty', label: "Add uncertainty", sub: "safety stock or quantiles" },
        { id: 'order', label: "Order and monitor", sub: "stock-outs, waste, drift" },
      ],
      highlight: ['decision', 'uncertainty'],
      caption: "The forecast is a middle step: the decision comes first and the order quantity comes last.",
    },
    example: {
      title: "Example: order-up-to quantity with safety stock",
      text: "A product sells a mean of 200 units a week and the lead time is 4 weeks. The weekly error standard deviation of 40 units is an example and errors are assumed independent. A 95% service level uses the one-sided z-value 1.645.",
      rows: [
        { label: "Lead-time demand", value: "200 x 4 = 800 units" },
        { label: "Lead-time error", value: "40 x sqrt(4) = 80 units" },
        { label: "Safety stock", value: "1.645 x 80 = 131.6, about 132 units" },
        { label: "Order up to", value: "800 + 132 = about 932 units" },
      ],
    },
    followUps: [
      {
        q: "Your model beats the seasonal-naive baseline by only 3% in error. Is it worth shipping?",
        a: "Look at the value of 3% in money terms, at the items and weeks that matter, and by segment. Consider the upkeep, and test the effect on stock-outs. If the gain is not material, the simple baseline is the right answer.",
      },
      {
        q: "A promotion lifts sales of one product and lowers sales of a similar one. How does that affect your model?",
        a: "This is cannibalisation. Promotion features for a product should include related products' promotions, or the forecast should be evaluated at a group level. Check the model's promotion effects in backtests on past promotions.",
      },
      {
        q: "How would you tell, a few months after launch, whether the forecasts have degraded?",
        a: "Track the error ratio to baseline by segment over time, the share of items outside their predicted intervals, bias (consistent over- or under-forecast), and input changes such as new price regimes. Alert when the error ratio drifts and retrain on a schedule.",
      },
    ],
    mistakes: [
      "Shuffling the data into random train and test sets.",
      "Reporting MAPE on items with many zero weeks.",
      "Training on sales without considering stock-outs, which understates true demand.",
      "Giving a point forecast and stopping, with no use of uncertainty for the order.",
    ],
  },

  'ds-explain-an-inconclusive-test-to-a-vice-president': {
    short:
      "Give the number with its range, in plain words: A converted 6.0% and B 6.9%, a gap of 0.9 points, but the plausible range is about -0.6 to +2.4 points, so B looks better while 'no difference' and 'a clear gain' are both still possible. The p-value is about 0.25: a gap this large would appear about a quarter of the time by chance if the two lines were equal. If she insists on a yes or no, give a decision with the reason and the risk, such as 'use B, the downside if it is no better is nothing, and we will keep testing', and do not stretch the test until it crosses 0.05.",
    explain: [
      {
        heading: "Give one number, and say how sure you are",
        body: "A converted 120 / 2,000 = 6.0% and B 138 / 2,000 = 6.9%, so B is ahead by 0.9 points, or 18 extra conversions. The standard error of that gap is sqrt(0.06 x 0.94 / 2,000 + 0.069 x 0.931 / 2,000), about 0.78 points, so the 95% range is 0.9 plus or minus 1.96 x 0.78, which is about -0.6 to +2.4 points. In words: 'B looks better, by about one point, but the data are also consistent with it being slightly worse or a lot better.' That is one number plus an honest range. Avoid 'B wins by 15%'. It is true as a relative figure (0.9 on 6.0), but it sounds far bigger than it is and hides the range.",
      },
      {
        heading: "Explain the p-value correctly and briefly",
        body: "The p-value here is about 0.25. It means that if there were no real difference between the lines, a gap at least this large would show up about a quarter of the time by chance. It is not a 75% chance that B is better, and 'not significant' does not mean 'no effect'. It means the test was not big enough to tell. A number like 'the chance B is better' needs a prior and a Bayesian model, and if you offer one, show its assumptions.",
      },
      {
        heading: "Connect it to the decision",
        body: "The team agreed that under half a point of lift is not worth the effort. The range runs from below that bar to well above it, so the data cannot say whether B's gain is worth it. To resolve a 0.9-point gap with 80% power at the 5% level you would need about 11,700 recipients per arm, nearly six times the current 2,000. Frame the decision, not only the statistics. For a low-cost, reversible choice like a subject line, picking B and carrying on is reasonable even without certainty, provided you say plainly that it is a bet. For a costly or irreversible choice, the bar for evidence is higher.",
      },
      {
        heading: "Separate what is known from what is not",
        body: "Say what is known (B is ahead in this sample), what is not (whether the gain clears the half-point bar), and what would change the answer: more data, a repeat on the next send, or a larger real gap. Commit to a follow-up date so the uncertainty has an owner. Do not peek and stretch the test to find significance: agree how long to run and stop by the plan, or use a sequential method planned in advance.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "State the result", detail: "A 6.0%, B 6.9%, gap 0.9 points, plausible range -0.6 to +2.4" },
        { label: "Say what the p-value means", detail: "About 0.25: a gap this big shows up a quarter of the time by chance alone" },
        { label: "Compare with the agreed bar", detail: "Half a point is the threshold, and the range crosses it, so the data cannot settle it" },
        { label: "Give a decision", detail: "Use B, because the downside is small and the choice is reversible" },
        { label: "Name the next step", detail: "Repeat on the next send or run about 11,700 per arm, with a date and an owner" },
      ],
      caption: "The order of the conversation with the vice president.",
    },
    example: {
      title: "Example: the arithmetic behind the answer",
      text: "A converted 120 of 2,000 and B converted 138 of 2,000. The agreed bar is half a point of lift. The sample size uses 80% power and a two-sided 5% level.",
      rows: [
        { label: "Conversion rates", value: "A 6.0%, B 6.9%, gap 0.9 points (18 more conversions)" },
        { label: "Standard error of the gap", value: "about 0.78 points" },
        { label: "95% range", value: "0.9 plus or minus 1.96 x 0.78 = about -0.6 to +2.4 points" },
        { label: "p-value", value: "about 0.25 (z about 1.16)" },
        { label: "Sample to settle a 0.9-point gap", value: "about 11,700 per arm, nearly 6 times 2,000" },
      ],
    },
    followUps: [
      {
        q: "She says: 'So there is a 75% chance B is better?' How do you reply?",
        a: "No, the p-value is the chance of data this extreme if there were no difference, not the probability that B is better. A statement like that needs a prior and a Bayesian model, and if you offer one, show it with its assumptions, otherwise decline to quote one.",
      },
      {
        q: "After three more days the p-value is 0.04. Do you tell her B has won?",
        a: "Not on its own, because an extra look after seeing p = 0.25 inflates false positives. Check against the agreed plan, report the new interval and keep the effect size in view. A repeated test is more convincing than a stretched one.",
      },
      {
        q: "She still says: 'I need a yes or no today.' What do you say?",
        a: "Give a decision with the reason and the risk, such as 'use B, since the downside if it is no better is nothing, and we will keep testing'. A decision with an honest statement of confidence beats a refusal to answer or a false yes.",
      },
    ],
    mistakes: [
      "Saying 'not significant, so they are the same'.",
      "Reporting only a p-value or only a point estimate, without the range.",
      "Keeping the test running until it crosses 0.05.",
      "Refusing to give a recommendation at all.",
    ],
  },
};
