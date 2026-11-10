import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'bias-variance-and-regularisation': {
    short:
      "Model one has 2% error on the training set and 15% on the validation set, so it has memorised the examples it was shown: high variance, also called overfitting. Model two has 14% on training and 15% on validation, so it is not even fitting the data it has seen: high bias, also called underfitting. They need opposite medicine, and the way to choose is to compare each error with a reference such as human error or a simple baseline.",
    explain: [
      {
        heading: "Read the two gaps",
        body: "The training set is the data the model learns from, and the validation set is data it has never seen, used to judge it. Model one has a gap of 15 - 2 = 13 points: it does very well on what it studied and badly on anything new, which means it has fitted the quirks and noise of those particular examples (high variance, meaning its answers change a lot with the sample it was given). Model two has a gap of 15 - 14 = 1 point, but its training error is already high: the model is too simple or too constrained to capture the pattern at all (high bias, meaning a systematic miss that more data will not remove).",
      },
      {
        heading: "What to try next for each",
        body: "For model one, shrink the variance: get more or more varied data, add data augmentation (for images, flips and crops), add L2 regularisation (a penalty on the sum of squared weights, which shrinks every weight smoothly towards zero, also called weight decay), try L1 (a penalty on absolute weights, which pushes some weights exactly to zero and so selects features), add dropout, stop training early when validation loss starts to rise, or use a smaller model or fewer features. For model two, do the opposite: use a more expressive model, build better features, reduce the regularisation, and train longer or with a better learning rate. Adding regularisation to model two would make it worse, because it makes the model even more constrained.",
      },
      {
        heading: "Use a reference and learning curves",
        body: "An error number means little alone, so compare it with the best achievable error, such as human performance or a strong simple baseline. Example: if people get 13% on this task, model two is only 14 - 13 = 1 point above the reference and 1 point from its validation error, so it is close to as good as this data allows, and it looks worse than it is. Model one, at 2% on training against a 13% reference, is below what any person can do on the training set, which is a sign of memorising noise. A learning curve plots training and validation error against the number of training examples: if the two curves are still closing, more data will help; if both sit high and flat, more data will not, and you need a richer model. Tune the regularisation strength on the validation set, and leave the test set untouched until the very end.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["Model one", "Model two"],
      rows: [
        { label: "Training error", cells: ["2%", "14%"] },
        { label: "Validation error", cells: ["15%", "15%"] },
        { label: "Gap", cells: ["13 points", "1 point"] },
        { label: "Diagnosis", cells: ["High variance (overfitting)", "High bias (underfitting)"] },
        { label: "First things to try", cells: ["More data, augmentation, weight decay, dropout, early stopping, smaller model", "Bigger model, better features, less regularisation, train longer"] },
      ],
      caption: "The same validation error can hide opposite problems, so read the training error and the gap together.",
    },
    example: {
      title: "Example: reading the numbers with a reference",
      text: "Assume people score 13% error on this task (an example reference). The avoidable error is the training error minus that reference, and the variance is the gap between validation and training error.",
      rows: [
        { label: "Model two, avoidable bias", value: "14% - 13% = 1 point" },
        { label: "Model two, variance", value: "15% - 14% = 1 point, so little to gain from more data" },
        { label: "Model one, variance", value: "15% - 2% = 13 points, so more data or regularisation can help" },
        { label: "Model one, training error vs reference", value: "2% is far below 13%, which points to memorised noise" },
      ],
    },
    followUps: [
      {
        q: "How do L2 and L1 regularisation change the weights, in a sentence each?",
        a: "L2 adds lambda times the sum of squared weights to the loss, so every weight is pulled smoothly towards zero but rarely reaches it. L1 adds lambda times the sum of absolute weights, which pushes some weights exactly to zero and so acts as feature selection.",
      },
      {
        q: "Large neural networks often have near-zero training error yet generalise well. Does that contradict the bias-variance picture?",
        a: "It stretches it: very over-parameterised models can show double descent, where error falls again after the point where they fit the training set exactly, and training methods such as SGD, early stopping and weight decay act as implicit regularisation. The practical rule still holds: judge by validation error and the train-validation gap, not by parameter count.",
      },
      {
        q: "How would you tell whether collecting more data would help?",
        a: "Plot training and validation error as the training set grows, using subsets such as 10%, 25%, 50% and 100%. If the validation curve is still falling and the gap is large, more data will help; if both curves have flattened at a high error, you need a more expressive model or better features.",
      },
    ],
    mistakes: [
      "Calling the second model overfit, or adding more regularisation to it. Its training error is already high, so it needs more capacity, not less.",
      "Tuning the regularisation strength or other hyperparameters on the test set. Use the validation set, and open the test set once at the end.",
      "Believing more data always fixes both problems. It shrinks variance, but a model that is too simple stays wrong however much data it sees.",
    ],
  },

  'fraud-model-accuracy-trap': {
    short:
      "Ask what a model that always says “not fraud” would score: 99.5%, exactly the reported number, so the figure proves nothing yet. Ask for the confusion matrix and judge precision, recall and a precision-recall curve for the fraud class, with a decision threshold chosen from the cost of a missed fraud and of a false alarm. Then check that the test set is a later period than the training set, with no after-the-fact columns leaking the answer.",
    explain: [
      {
        heading: "Why 99.5% accuracy means nothing yet",
        body: "Accuracy is the share of predictions that are right. When only 0.5% of transactions are fraud, a model that flags nothing is right 99.5% of the time and catches no fraud at all, so always compare against that majority-class baseline. Example with 100,000 test transactions, of which 500 are fraud: a model flags 600, of which 300 are real fraud. Then TP = 300 (fraud caught), FP = 300 (false alarms), FN = 200 (fraud missed) and TN = 99,200, so accuracy is (300 + 99,200) / 100,000 = 99.5%, the same as doing nothing. Its precision (of the flagged, how many are fraud) is 300 / 600 = 50%, and its recall (of all fraud, how much is caught) is 300 / 500 = 60%.",
      },
      {
        heading: "Metrics that respect the imbalance",
        body: "Report precision and recall for the fraud class, plus a threshold-free summary: PR-AUC (average precision), the area under the precision-recall curve. A random model scores about the positive rate on PR-AUC, which is 0.005 here, while a random model scores 0.5 on ROC-AUC, so PR-AUC has a much more honest floor. ROC-AUC can flatter because its false positive rate is divided by the huge number of legitimate transactions: a model catching 60% of fraud at a 1% false positive rate sounds excellent, but 1% of 99,500 legitimate transactions is 995 false alarms against 300 real catches, a precision of 300 / 1,295 = 23%.",
      },
      {
        heading: "Set the threshold from the business, and test it fairly",
        body: "The threshold is the score above which a transaction is flagged, and 0.5 is only a default. Pick it from the costs of a missed fraud versus a false alarm, or from review capacity, such as a team that can look at 2,000 alerts a day. If the scores are used as probabilities, for cost-based thresholds or downstream rules, check calibration (whether a score of 0.2 really means 20% of such cases are fraud), especially after resampling or class weighting, which distorts the scores. Fraud patterns drift, so split by time (train on earlier months, test on a later period), keep the same card or customer on one side of the split only, and look for leakage, such as a “disputed” flag that is only set after a chargeback or investigation.",
      },
    ],
    diagram: {
      kind: "experiment",
      slug: "accuracy-trap",
      caption: "Try it: a model that never flags anything scores almost perfectly on accuracy while catching nothing.",
    },
    example: {
      title: "Example: the same accuracy, very different value",
      text: "Using 100,000 test transactions with 500 fraud, and the example costs of 500 for a missed fraud and 5 for a false alarm. Both rows have 99.5% accuracy, yet the second saves 148,500 a day in this example.",
      rows: [
        { label: "Always say “not fraud”", value: "accuracy 99.5%, recall 0%, missed fraud costs 500 x 500 = 250,000" },
        { label: "Model: TP, FP, FN, TN", value: "300, 300, 200, 99,200" },
        { label: "Model accuracy, precision, recall", value: "99.5%, 50%, 60%" },
        { label: "Model cost", value: "200 x 500 + 300 x 5 = 101,500" },
        { label: "Cost-based threshold", value: "5 / (5 + 500) = 0.0099, about 1% (if calibrated)" },
      ],
    },
    followUps: [
      {
        q: "A missed fraud costs on average 500 and a false alarm costs 5 in analyst time. With calibrated probabilities, what threshold minimises expected cost?",
        a: "Flag a transaction when p x 500 > (1 - p) x 5, which gives a threshold p* = 5 / (5 + 500) = 5/505, about 0.0099, roughly 1%. This only works if the scores are calibrated, and a limit on review capacity may force a higher threshold.",
      },
      {
        q: "They undersampled the negatives 1:1 during training. What happens to the predicted probabilities and how do you fix it?",
        a: "Undersampling shows the model far more fraud than really exists, so its probabilities are inflated compared with the true 0.5% rate. Fix it by recalibrating on a held-out set that has the real class balance (Platt scaling or isotonic regression) or by applying the prior-correction formula, and check with a reliability diagram or the Brier score.",
      },
      {
        q: "Precision at your chosen threshold was 40% last quarter and is 25% this quarter, with no model change. What could be going on?",
        a: "Precision depends on prevalence: with the same recall and false alarm rate, halving the fraud rate from 0.5% to 0.25% drops precision from about 50% to about 33%. Also consider new fraud patterns (drift), chargeback labels that have not arrived yet, and upstream data changes, and check recall on labelled data and the score distributions by channel or region.",
      },
    ],
    mistakes: [
      "Accepting 99.5% accuracy as evidence the model works. Always compare it with the do-nothing baseline first.",
      "Leaving the threshold at 0.5 without reference to costs or review capacity.",
      "Splitting time-ordered transactions at random, so the model is tested on days it effectively saw in training.",
      "Offering oversampling or SMOTE as the whole answer. It changes how the model trains, not how it should be evaluated, and it distorts probabilities.",
    ],
  },

  'ds-first-hour-of-exploratory-analysis': {
    short:
      "Set aside a test split first, then spend the hour learning what the table is: its structure, its missing values, its ranges, the target, and how each feature relates to the target. Write down every surprise and turn it into a question for the data owner. Stop and ask when the label is ambiguous, a key column is filled in after the outcome, or the rows clearly differ from the cases the model will serve.",
    explain: [
      {
        heading: "Protect the test data, then learn the structure",
        body: "Exploratory analysis (EDA) means looking at the data before modelling. Every decision you make while looking, such as which features to keep or how to fill gaps, is a small fit to the data you saw, so set aside a test split first and do not explore it: split by time if the data is ordered, and by group (customer, device) if the same entity appears in many rows. Example: hold out 20% of 200,000 rows, which is 40,000. Then check the shape: rows and columns, which column is the key and whether it is unique, the type and unit of each column (dates stored as text, prices in different currencies), duplicate rows, and the time range with any gaps.",
      },
      {
        heading: "Look for what is missing, impossible or odd",
        body: "Count missing values by column and look for patterns, and ask what missing means: not applicable, not collected, or unknown. Missing is often informative, and filling it blindly hides that. Then look at distributions and ranges in context: impossible values such as a negative age, pile-ups at defaults such as a date of 1970-01-01 or a value of -1, and outliers. Check and explain outliers before removing any, because they are sometimes data errors and sometimes your most valuable customers. Look at the target too: how balanced it is, how it moves over time and across groups, and how it was defined, because a label whose definition changed halfway through needs to be known early.",
      },
      {
        heading: "Features against the target, and when to stop and ask",
        body: "Look at each feature against the target, but treat a suspiciously strong feature as a leakage candidate. Leakage means the feature holds information that will not exist when the model is used, for example a column recorded after the outcome. If one column alone nearly separates the classes, ask when it is recorded relative to the outcome before celebrating. Keep a running list of assumptions and surprises and turn them into questions: what each column means, when it is filled in, and what changed and when. Stop and ask someone when the label is ambiguous, when a key column is populated after the outcome, or when the sample clearly differs from the population the model will serve.",
      },
    ],
    diagram: {
      kind: "timeline",
      steps: [
        { label: "Minutes 0 to 5", detail: "Set aside the test split by time or group, and do not touch it again until the end." },
        { label: "Minutes 5 to 15", detail: "Check shape, key uniqueness, types and units, duplicates and the time range." },
        { label: "Minutes 15 to 30", detail: "Missing values by column and pattern, then distributions, impossible values and pile-ups." },
        { label: "Minutes 30 to 45", detail: "The target: balance, change over time, change across groups, and how it was defined." },
        { label: "Minutes 45 to 55", detail: "Each feature against the target, flagging any that look too good." },
        { label: "Minutes 55 to 60", detail: "Write down assumptions and surprises, and send the data owner a list of questions." },
      ],
      caption: "One example way to spend the hour. The order matters more than the exact minutes.",
    },
    example: {
      title: "Example: what you might find in 200,000 rows",
      text: "These findings are assumed, to show what each one should trigger. Each is a reason to ask or check, not an automatic fix.",
      rows: [
        { label: "Test split held out", value: "20% of 200,000 = 40,000 rows, by time" },
        { label: "Income missing in 12% of rows", value: "24,000 rows: ask why, add a missing flag, fill using the training part only" },
        { label: "Order values 50 times the median in 3% of rows", value: "6,000 rows: data error, unit mix-up or real large customers? Check before deleting" },
        { label: "One feature with AUC 0.98 on its own", value: "Likely leakage: find when it is recorded relative to the outcome" },
        { label: "Dates of 1970-01-01", value: "A default for unknown, not a real date" },
      ],
    },
    followUps: [
      {
        q: "One feature on its own separates the classes almost perfectly (AUC 0.98). What now?",
        a: "Suspect leakage: find out how and when the column is created and whether it exists at prediction time, and compare results with and without it. A real feature that strong would be a surprise worth explaining before anyone celebrates.",
      },
      {
        q: "12% of income values are missing. Do you impute with the median?",
        a: "First ask why they are missing and whether that relates to the target. Consider a missing flag, fill using the training fold only, and compare with simpler handling to check the result is not driven by the filling.",
      },
      {
        q: "You find that 3% of rows have order values 50 times the median. Do you delete them?",
        a: "Investigate first: they may be data errors, a unit mix-up or real large customers. Fix the errors, keep the real values, and consider a flag or robust methods, then record the choice and compare results with and without.",
      },
    ],
    mistakes: [
      "Fitting a model in the first hour and looking at nothing else.",
      "Exploring the whole dataset including the test portion, so the test result is no longer honest.",
      "Deleting outliers or filling missing values without finding out why they are there.",
      "Celebrating a feature that is almost too good instead of asking when it is recorded.",
    ],
  },

  'ds-survivorship-bias-in-customer-tenure': {
    short:
      "No, the claim is not right: it is survivorship bias. The table of active customers contains only people who stayed, so its average comes from the longest stayers and says nothing about the 800 of 1,000 who left. Following the whole sign-up cohort gives 1.95 years of observed tenure, not 5.5, and the better thing to report is a retention curve with the number of customers behind each point.",
    explain: [
      {
        heading: "What is wrong with the 5.5 years",
        body: "Survivorship bias happens when you study only the cases that survived some filter and forget the ones that dropped out. Here the filter is “still a customer today”, so everyone who left early is missing, and the 5.5 comes only from the 200 people who stayed. Follow the whole cohort of 1,000 sign-ups instead: (500 x 0.5 + 300 x 2 + 200 x 5.5) / 1,000 = (250 + 600 + 1,100) / 1,000 = 1.95 years of observed tenure. Marketing’s figure is 5.5 / 1.95, about 2.8 times too high for the cohort as a whole.",
      },
      {
        heading: "The honest numbers, including the ones still counting",
        body: "Even 1.95 is not final. The 200 active customers are still counting, so their tenure is cut off at today. This is called censoring: we know they stayed at least 5.5 years, not how long they will stay, so 1.95 is a lower bound on the true average stay. A plain average cannot handle this, so use a method built for it, a survival or retention curve (the Kaplan-Meier estimate). Report retention instead of one average: of the 1,000 sign-ups, 500 (50%) were gone within a year, so retention at one year was 50%, and after the 300 who left around year 2 had gone, 200 of 1,000, or 20%, were still active. Give the number of customers behind every point, so nobody reads a small sample as fact.",
      },
      {
        heading: "How to avoid the trap",
        body: "Define the population at the start of the period, everyone who signed up, and follow all of them, rather than defining it at the end from whoever is still here. Ask “who is missing from this table, and why?” every time. The same mistake appears elsewhere: a loan model trained only on approved applicants never sees what happened to the rejected ones, a survey with a low response rate hears from the keen, and a “top 100 funds” list quietly drops the funds that closed. When missing data depends on the outcome, no amount of averaging fixes it.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "years of tenure",
      items: [
        { label: "Left within a year (500 people)", value: 0.5 },
        { label: "Left around year 2 (300 people)", value: 2 },
        { label: "Still active (200 people)", value: 5.5, note: "still counting" },
        { label: "Whole cohort, observed so far", value: 1.95, note: "a lower bound", hot: true },
      ],
      caption: "The cohort average is 1.95 years, far below the 5.5 years of the survivors marketing averaged.",
    },
    example: {
      title: "Example: the cohort of 1,000 sign-ups",
      text: "Using the numbers in the question. The 1.95 treats each active customer as having stayed exactly 5.5 years so far, which understates the final figure.",
      rows: [
        { label: "Observed tenure, whole cohort", value: "(250 + 600 + 1,100) / 1,000 = 1.95 years" },
        { label: "Survivors only", value: "5.5 years, about 2.8 times higher" },
        { label: "Retained at one year", value: "500 of 1,000 = 50%" },
        { label: "Still active after the year-2 leavers", value: "200 of 1,000 = 20%" },
      ],
    },
    followUps: [
      {
        q: "Another cohort joined six months ago and 95% are still active. Does that mean retention is excellent?",
        a: "Not yet, because they have had only six months to leave. Compare cohorts at the same age, using retention curves by months since sign-up and not by calendar date.",
      },
      {
        q: "A survey has an 8% response rate and satisfaction is high. How much do you trust it?",
        a: "Only a little: people who reply may differ from those who do not (non-response bias). Compare respondents with the customer base on known traits, follow up a random sample of non-responders, and report the response rate and the limit it puts on the claim.",
      },
      {
        q: "How would this bias show up in a churn model you build?",
        a: "If you train only on customers still present at a later date, you drop early leavers, so churn looks rarer and later than it is. Build the training set from everyone who was active at each prediction date.",
      },
    ],
    mistakes: [
      "Accepting the 5.5-year average without asking who is missing from the table.",
      "Averaging the tenure of still-active customers as if it were final.",
      "Trying to fix the bias by dropping or filling in data without looking at why it is missing.",
      "Reporting one number with no sample size behind it.",
    ],
  },

  'thirty-configs-on-the-test-set-honest-reporting': {
    short:
      "The test set was used to choose the winner, so 82.6% is no longer an unbiased estimate: taking the best of 30 noisy scores builds in an upward bias. If all 30 configurations were truly 80%, the best of them would typically show about 82.6% anyway, so the 2.6-point gain can be pure luck. Choose settings on a validation set, run the test set once, and report how many configurations were tried with an interval.",
    explain: [
      {
        heading: "Why the best of many is inflated",
        body: "A score measured on 1,000 examples is noisy, because it depends on which examples were drawn. For a true accuracy of 80%, the standard error (the typical size of that wobble) is sqrt(0.8 x 0.2 / 1000) = 0.0126, or 1.26 points. When you try 30 configurations and keep the highest score, you are picking the luckiest draw. The expected maximum of 30 independent standard normal draws is about 2.04, so if every configuration were truly 80%, the best would typically show about 80 + 2.04 x 1.26 = 82.6%, which is the reported number. In practice the configurations are scored on the same examples, so their errors are correlated and the effect is somewhat smaller, but it still points upward.",
      },
      {
        heading: "The multiple-comparison arithmetic",
        body: "Each comparison against the baseline at a 5% false-alarm rate has a 95% chance of not fooling you, but 30 comparisons give 1 - 0.95^30 = 79% chance of at least one false win. A stricter threshold helps: 0.05 / 30 = 0.0017 (the Bonferroni correction), or confirm the winner on fresh data. A bigger test set shrinks the noise only with the square root of its size: quadrupling it from 1,000 to 4,000 examples halves the standard error from 1.26 to 0.63 points, which is why many tries need a confirmation run, not just more data.",
      },
      {
        heading: "What the process and the report should look like",
        body: "Process: choose hyperparameters on a separate development or validation set, pick one final configuration, and run the test set once, keeping it out of every decision. Report: say how many configurations were tried, give an interval for the final number (even before selection effects, 82.6% on 1,000 examples carries about plus or minus 2.3 points, so 80.2% to 84.9%, which includes the 80.0% baseline), give the baseline the same tuning effort, and confirm the winner on fresh cases. Expect the confirmed number to land closer to the baseline than the headline did.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "configurations tried",
      yLabel: "typical best score on the test set (%)",
      points: [[1, 80], [2, 80.71], [5, 81.47], [10, 81.95], [30, 82.58], [100, 83.17]],
      marks: [{ x: 30, label: "30 tried: about 82.6%" }],
      caption: "If every configuration were truly 80%, trying more of them still pushes the best score up. Assumes independent configurations and a 1.26 point standard error.",
    },
    example: {
      title: "Example: how luck alone produces 82.6%",
      text: "Assume all 30 configurations have a true accuracy of 80.0%, scored on the same 1,000-example test set. The numbers below are worked, not measured.",
      rows: [
        { label: "Standard error of one score", value: "sqrt(0.8 x 0.2 / 1000) = 1.26 points" },
        { label: "Expected best of 30 (in standard errors)", value: "about 2.04" },
        { label: "Typical best score", value: "80 + 2.04 x 1.26 = 82.6%" },
        { label: "Chance of at least one false win at 5%", value: "1 - 0.95^30 = 79%" },
        { label: "Stricter threshold", value: "0.05 / 30 = 0.0017" },
      ],
    },
    followUps: [
      {
        q: "There is no spare data. How do you select and still report honestly?",
        a: "Use cross-validation or a nested split for selection, split by the unit that repeats (user, document), and report the nested estimate. Be clear about the uncertainty that remains.",
      },
      {
        q: "The baseline was run with default settings and the new method was tuned. Is the comparison fair?",
        a: "No. Give the baseline a comparable tuning budget and report the budget for both, since part of the gain may come from tuning alone.",
      },
      {
        q: "How would you tell whether the 2.6-point gain survives?",
        a: "Evaluate the chosen configuration on a fresh held-out set with a paired comparison and an interval. Expect the gain to shrink towards the baseline.",
      },
    ],
    mistakes: [
      "Reporting the best of many runs on the test set as the result.",
      "Not saying how many configurations were tried.",
      "Believing a gap bigger than the noise must be real, whatever the number of tries.",
      "Giving the baseline less tuning than the new method.",
    ],
  },

  'code-precision-recall-f1': {
    short:
      "Count true positives, false positives and false negatives in one pass over the data, then compute precision = TP / (TP + FP), recall = TP / (TP + FN) and F1 = 2PR / (P + R), guarding every division against zero. To find the best threshold, sort the scores once and sweep down them, updating the counts as you go, instead of recomputing from scratch at every candidate. Choose that threshold on a validation set, not the test set.",
    explain: [
      {
        heading: "The function",
        body: "A prediction is positive when the score is greater than or equal to the threshold, a rule you should state out loud. Loop once over the pairs: a positive prediction with true label 1 is a true positive (TP), with label 0 a false positive (FP), and a negative prediction with label 1 is a false negative (FN). Precision answers “of what I flagged, how much was right”, recall answers “of what was really there, how much did I find”, and F1 is their harmonic mean, 2PR / (P + R), which stays low unless both are decent. The arithmetic mean would hide a model that is excellent at one and useless at the other.",
      },
      {
        heading: "Edge cases and a hand check",
        body: "Handle zero divisions explicitly. With no predicted positives, precision is undefined (0 / 0), and with no actual positives recall is undefined, so return 0 or NaN and document which. Validate inputs too: equal lengths, labels that are 0 or 1, and non-empty input. Then test on a case you can do by hand: TP = 40, FP = 10 and FN = 60 give precision 40 / 50 = 0.8, recall 40 / 100 = 0.4 and F1 = 2 x 0.8 x 0.4 / 1.2 = 0.64 / 1.2, about 0.533.",
      },
      {
        heading: "Extending it to the best-F1 threshold",
        body: "The slow way tries each distinct score as the threshold and recomputes the counts over all n examples, which is O(n^2). Instead sort the scores from high to low once, O(n log n), then walk down the list: lowering the threshold past an example moves it from predicted-negative to predicted-positive, so the running TP and FP counts each change by one, and F1 is updated in constant time. Examples with equal scores must move together, because no threshold can separate them. Finally, choose the threshold on a validation set, then report its F1 on the untouched test set, otherwise the reported F1 is optimistic.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "check", label: "Validate inputs", sub: "equal lengths, labels 0 or 1" },
        { id: "count", label: "Count in one pass", sub: "TP, FP, FN" },
        { id: "divide", label: "Divide with guards", sub: "precision, recall, F1" },
        { id: "sweep", label: "Sort once and sweep", sub: "update counts as the threshold drops" },
        { id: "pick", label: "Pick on validation", sub: "report on test" },
      ],
      highlight: ["divide", "sweep"],
      caption: "From a single threshold to the best threshold: the same counting, reused during one sweep.",
    },
    example: {
      title: "Example: the function, checked by hand",
      text: `def precision_recall_f1(y_true, scores, threshold):
    if len(y_true) != len(scores):
        raise ValueError("y_true and scores must have the same length")
    if len(y_true) == 0:
        raise ValueError("empty input")
    tp = fp = fn = 0
    for y, s in zip(y_true, scores):
        if y not in (0, 1):
            raise ValueError("labels must be 0 or 1")
        predicted = s >= threshold
        if predicted and y == 1:
            tp += 1
        elif predicted:
            fp += 1
        elif y == 1:
            fn += 1
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1

def best_f1_threshold(y_true, scores):
    total_pos = sum(y_true)
    pairs = sorted(zip(scores, y_true), key=lambda p: -p[0])
    tp = fp = 0
    best_f1, best_t, i = 0.0, None, 0
    while i < len(pairs):
        t = pairs[i][0]
        while i < len(pairs) and pairs[i][0] == t:
            if pairs[i][1] == 1:
                tp += 1
            else:
                fp += 1
            i += 1
        p, r = tp / (tp + fp), tp / total_pos
        f1 = 2 * p * r / (p + r) if p + r else 0.0
        if f1 > best_f1:
            best_f1, best_t = f1, t
    return best_t, best_f1`,
      rows: [
        { label: "Hand case: TP 40, FP 10, FN 60", value: "precision 0.8, recall 0.4, F1 0.533" },
        { label: "Same data, threshold lowered to 0.1 (example scores 0.9 and 0.1)", value: "all 100 positives found, 100 false alarms: precision 0.5, recall 1.0, F1 0.667" },
        { label: "Cost of the sweep", value: "O(n log n) for the sort, O(n) for the walk" },
      ],
    },
    followUps: [
      {
        q: "How do macro and micro averaged F1 differ for a multi-class problem with one rare class?",
        a: "Micro pools TP, FP and FN over all classes, so frequent classes dominate it (and for single-label multi-class problems it equals accuracy). Macro averages each class’s F1 equally, so a rare class that is handled badly pulls it down, which is what you want when every class matters equally.",
      },
      {
        q: "When would you use F-beta instead of F1, and what does beta mean?",
        a: "F-beta treats recall as beta times as important as precision: F2 favours recall (screening, safety checks) and F0.5 favours precision (costly false alarms). Better still, choose the threshold from actual costs when you know them.",
      },
    ],
    mistakes: [
      "Dividing by zero, or silently returning a misleading 1.0 when there are no predicted positives.",
      "Computing F1 as the arithmetic mean of precision and recall instead of the harmonic mean.",
      "Choosing the threshold on the test set, which makes the reported F1 too optimistic.",
    ],
  },

  'ds-sql-day-7-retention-by-signup-cohort': {
    short:
      "Start from the users table, left join events on the same user and on event_date equal to signup_date plus 7 days, group by signup_date, and divide COUNT(DISTINCT e.user_id) by COUNT(DISTINCT u.user_id). Keep users as the denominator, count distinct users and not rows, and leave out cohorts that are too young to have reached day 7. Then check the query against a tiny table worked by hand, and show the cohort size next to each rate.",
    explain: [
      {
        heading: "The query and why it is built this way",
        body: "Retention for a signup day is the share of that day’s signups who were active exactly 7 days later. A cohort is a group of users who share a starting point, here the signup date. Begin with users, because every signup belongs in the denominator, including those who never came back. A left join keeps all users and gives NULL for those with no event on day 7, so counting distinct e.user_id counts only those who returned. The date arithmetic differs by database (date + 7 in PostgreSQL, DATE_ADD in BigQuery and MySQL), so say which you assume. The full query is in the worked example.",
      },
      {
        heading: "Mistakes that make the answer wrong",
        body: "Starting from events, or using an inner join, drops everyone who did not return, so the rate is inflated, often to 100%. Using COUNT(*) instead of COUNT(DISTINCT user_id) counts a user twice if they have two events on day 7, and the join also repeats user rows in the denominator. Including cohorts that are too young is the third trap: a user who signed up 3 days ago cannot be seen on day 7 yet, so including them pulls the rate down, so filter to signup_date at most today minus 7 days. Finally, definitions matter: ask whether “active” means exactly day 7 or any activity in days 7 to 13, which events count, and which time zone defines a date, since each choice changes the number.",
      },
      {
        heading: "Check before you show it to anyone",
        body: "Build a small table and work it out by hand. With 3 signups on 1 October and 2 on 2 October, where one user from each day has an event 7 days later, the answers must be 1 of 3 (33.3%) and 1 of 2 (50%), and a 30 October signup must be excluded when today is 5 November. Show the cohort size next to every rate, because 1 of 3 and 1 of 2 are not evidence of anything, and group small daily cohorts into weeks or add intervals. For a big events table, first reduce it to distinct user-day pairs for the date range you need, join that, and let date partitions prune the scan.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["The mistake", "What goes wrong", "The fix"],
      rows: [
        { label: "Join direction", cells: ["Start from events or use an inner join", "Leavers vanish and the rate is inflated, often to 100%", "Start from users and left join events"] },
        { label: "Counting", cells: ["COUNT(*)", "Two events on day 7 count a user twice", "COUNT(DISTINCT user_id)"] },
        { label: "Young cohorts", cells: ["Include signups under 7 days old", "They cannot have a day-7 event yet, so the rate is too low", "Filter signup_date to today minus 7 days or earlier"] },
        { label: "Definition", cells: ["Leave it unsaid", "Exactly day 7, days 7 to 13 and time zones give different numbers", "Agree it and state it"] },
      ],
      caption: "The four ways a day-7 retention query is usually wrong, and the fix for each.",
    },
    example: {
      title: "Example: the query, checked on a tiny table",
      text: `SELECT u.signup_date,
       COUNT(DISTINCT u.user_id) AS signups,
       COUNT(DISTINCT e.user_id) AS active_day_7,
       COUNT(DISTINCT e.user_id) * 1.0 / COUNT(DISTINCT u.user_id) AS retention_d7
FROM users u
LEFT JOIN events e
  ON e.user_id = u.user_id
 AND e.event_date = u.signup_date + 7
WHERE u.signup_date <= CURRENT_DATE - 7
GROUP BY u.signup_date
ORDER BY u.signup_date;

Test table (today is 5 November): users 1, 2, 3 signed up on 1 October, users 4 and 5 on 2 October, user 6 on 30 October. Day-7 events: user 1 twice on 8 October, user 4 on 9 October, and a day-3 event for user 2.`,
      rows: [
        { label: "1 October", value: "3 signups, 1 active on day 7, retention 33.3%" },
        { label: "2 October", value: "2 signups, 1 active on day 7 (user 5 returned on day 10, which does not count), retention 50%" },
        { label: "30 October", value: "excluded: only 6 days old on 5 November" },
        { label: "With COUNT(*) instead", value: "1 October shows 2 events for 1 returning user, a wrong numerator" },
      ],
    },
    followUps: [
      {
        q: "Cohort A has 40% retention and cohort B 52%, each with 50 users. Is B better?",
        a: "Not on this evidence: the gap is 12 points, but the standard error of the difference is sqrt(0.4 x 0.6 / 50 + 0.52 x 0.48 / 50) = 9.9 points, so z is about 1.2 and the interval runs from about -7 to +31 points. You need more users, or weekly groups, and you should report intervals.",
      },
      {
        q: "The result for last week’s cohort is 4 points lower than usual. What do you check before telling the team retention dropped?",
        a: "Check that the cohort has matured, whether the latest dates are complete (data often arrives late), whether logging or the meaning of an event changed, and whether the acquisition source or cohort size shifted. Confirm the data is complete before interpreting it.",
      },
      {
        q: "The events table has 2 billion rows and the query is slow. What do you change?",
        a: "Filter events to the needed date range, reduce them to distinct user and date pairs first, use partitions and only the columns you need, and consider a precomputed daily-active table. Check the fast version against the slow one on a sample.",
      },
    ],
    mistakes: [
      "Joining from events and calling the result retention. Everyone who never returned has disappeared from the data.",
      "Counting rows instead of distinct users.",
      "Including cohorts that have not yet reached day 7.",
      "Not checking the query against a small example worked out by hand.",
    ],
  },

  'behavioural-simple-baseline-beat-complex-model': {
    short:
      "Pick one real project and tell it in order: the baseline you built first (a last-value or seasonal-naive forecast, a most-popular list, a logistic regression), the fair comparison with the complex model, the criteria beyond accuracy, and what you shipped and measured afterwards. Be honest when the simple model won or the gap was too small to trust. The story is judged on whether the comparison was fair and the decision reasoned, not on whether the complex model won.",
    explain: [
      {
        heading: "How to tell the story",
        body: "Start with the baseline and say you built it before the complex model, not afterwards to make the new model look good. A baseline is the simplest reasonable method that does the same job, such as forecasting next week’s demand with this week of last year (seasonal naive), recommending the most popular items, or a logistic regression on a few features. It tells you how much the complexity is actually buying. Then describe the comparison: the same split (time-ordered if the data was), the same metric, and a similar tuning budget for both, with some sense of how uncertain the difference is, not a single number. Finish with the decision and what you measured after launch.",
      },
      {
        heading: "A worked illustration (example numbers)",
        body: "These figures are made up, to show the shape of a good answer; use your own real project and numbers. Suppose a weekly demand forecast. Seasonal naive has a mean absolute error (MAE, the average miss in units) of 120, and a gradient-boosted model scores 117.6, which is 2% better: (120 - 117.6) / 120 = 2%. Compared week by week on the same backtest weeks, the average improvement is 2.0 units with a standard error of 2.5, so the 95% interval is 2.0 plus or minus 1.96 x 2.5, which runs from -2.9 to +6.9 and includes zero. The boosted model is also slower to run and harder to maintain, so the team ships the baseline, keeps the challenger running in the background, and agrees in advance that it takes a margin of about 10% to justify the extra complexity.",
      },
      {
        heading: "Be honest about the outcome and what you learned",
        body: "Say plainly which model won, including cases where the complex model won clearly, where it was close and the simple one shipped, or where the result was too uncertain to call. Name what you measured after launch, such as forecast error, latency, cost or the business metric the model served. Then reflect: for example, you would check for leakage sooner, or size the test set for the gap that mattered, since a small test set cannot separate two close scores. Do not claim a baseline that was a strawman, such as an untuned method set against a carefully tuned complex one.",
      },
    ],
    diagram: {
      kind: "experiment",
      slug: "no-baseline",
      caption: "Try it: without a baseline, you cannot tell whether a complicated model is worth having.",
    },
    example: {
      title: "Example: a close result and the decision it led to",
      text: "All numbers are illustrative, not from a real project. The point is the shape: the comparison was fair, the uncertainty was stated, and the decision followed from costs as well as accuracy.",
      rows: [
        { label: "Baseline (seasonal naive) MAE", value: "120 units" },
        { label: "Boosted model MAE", value: "117.6 units, 2% better" },
        { label: "Weekly paired gain", value: "2.0 units, standard error 2.5, interval -2.9 to +6.9" },
        { label: "Decision", value: "Ship the baseline, keep the challenger, revisit at a 10% gain" },
      ],
    },
    followUps: [
      {
        q: "How did you know the gap between the two was not noise?",
        a: "I looked at an interval for a paired comparison on the same cases or repeated backtest origins, because a small test set cannot separate close scores. In this example the interval included zero, so the 2% gain was not trusted.",
      },
      {
        q: "Did anyone push back on shipping the simpler model? How did you handle it?",
        a: "I brought evidence and costs rather than opinion, and invited a stronger challenger. We agreed in advance what margin of improvement would justify the extra complexity.",
      },
    ],
    mistakes: [
      "Building no baseline, or an untuned strawman set against a carefully tuned complex model.",
      "Reporting only the winning result with no uncertainty.",
      "Being unable to say what was measured or what actually shipped.",
    ],
  },

  'ds-frame-the-churn-request-before-modelling': {
    short:
      "Before opening a notebook, find out what decision the prediction will drive, for which customers, and at what cost per customer. Then define churn and the prediction date in writing, pick a metric tied to the action, propose a baseline, and bring back a one-page plan to agree. A churn prediction that nobody acts on has no value, so the framing is most of the job.",
    explain: [
      {
        heading: "Start with the decision",
        body: "Ask what action will be taken, for whom, by when, and what each action costs: a discount, a phone call, an email. If the team can contact 5,000 customers a month, then the model’s job is to rank customers so those 5,000 are the best ones, which is different from classifying everyone. Ask also whether prediction is the right question. Knowing who will leave is not the same as knowing who can be saved, and if the aim is to change behaviour, a randomised test of the offer matters, with an uplift model (one that estimates the change the offer causes) as a later step.",
      },
      {
        heading: "Define churn and the dates, in writing",
        body: "Write down what counts as churn (cancelled, or no purchase in 90 days), which customers are in scope (only active ones), the prediction date, and the horizon (will they churn in the next 30 days). Build everything around that date: features only from before it, and the label only from after it, so the model is never told the answer. Split by time, training on earlier prediction dates and testing on later ones, so the test mimics future use. If the team says the definition does not matter, offer two or three concrete versions and the action each one would drive, and get one chosen.",
      },
      {
        heading: "Metric, baseline, risks and the one-page plan",
        body: "Choose a metric that matches the decision: precision and the share of churners captured in the top 5,000, and the net value per contact, not overall accuracy, which is meaningless when about 3% of customers churn and “nobody churns” is 97% right. Propose a baseline first, such as a rule “no login in 30 days” or last quarter’s churners, and judge the model by how much better it is on the same split. Check feasibility and risk early: which data exists at the prediction date, label delay, privacy and fairness concerns (an offer that excludes a group), and who owns the result after handover. Bring back a one-page plan with the decision, the definitions, the success measure and baseline, the timeline and what would make you stop, and get it agreed before modelling.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "decision", label: "The decision", sub: "who is contacted, how, at what cost" },
        { id: "definition", label: "Define churn", sub: "customers, horizon, in writing" },
        { id: "dates", label: "Fix the dates", sub: "features before, label after" },
        { id: "metric", label: "Pick the metric", sub: "top-k precision, net value" },
        { id: "baseline", label: "Set a baseline", sub: "a simple rule to beat" },
        { id: "plan", label: "One-page plan", sub: "agreed before modelling" },
      ],
      highlight: ["decision", "plan"],
      caption: "The order of the work before any model is trained.",
    },
    example: {
      title: "Example: why the metric follows the budget",
      text: "Assumed figures. 100,000 active customers, 3% churn per quarter, and a budget to contact 5,000 customers. The offer costs 5 per contact, saves 25% of the churners who get it, and a saved customer is worth 300 (all example figures).",
      rows: [
        { label: "Churners in the base", value: "100,000 x 3% = 3,000" },
        { label: "Contacting 5,000 at random", value: "about 150 churners, precision 3%" },
        { label: "A model whose top 5,000 holds 600 churners", value: "precision 600 / 5,000 = 12%, lift 12% / 3% = 4 times" },
        { label: "Net value per contact", value: "0.12 x 0.25 x 300 - 5 = 4, so 20,000 for 5,000 contacts" },
        { label: "Accuracy of “nobody churns”", value: "97%, which is why accuracy is the wrong metric" },
      ],
    },
    followUps: [
      {
        q: "About 3% of customers churn each quarter. A model that predicts “no one churns” is right 97% of the time. What do you report instead?",
        a: "Report precision and recall at the contact budget, lift over the 3% base rate, and a comparison with the baseline rule. Overall accuracy is meaningless when one class is rare.",
      },
      {
        q: "The PM says the definition does not matter, “just predict who is unhappy”. How do you respond?",
        a: "I explain that a vague target cannot be built or tested, and offer two or three concrete definitions with the action each would drive. Then I get one chosen and record it.",
      },
      {
        q: "Midway, you find that customers who contact support are far more likely to churn. Is that a good feature?",
        a: "Check when the contact happens relative to the prediction date: a cancellation call logged as a support contact is leakage. Also ask what action the feature supports, because a strong signal can be a symptom and not a cause.",
      },
    ],
    mistakes: [
      "Starting with data exploration and model choice and never asking about the decision.",
      "Leaving “churn” undefined, or changing the definition midway.",
      "Judging the model by accuracy on an imbalanced label.",
      "Using features that are not available at the time of prediction.",
    ],
  },

  'explaining-a-decision-shapley-and-limits': {
    short:
      "Give each reader the explanation that fits them: Asha gets plain reasons and a counterfactual (what would have to change to reach 55), the regulator gets whole-model evidence such as permutation importance and testing, and the builder gets Shapley values plus error analysis. Every method falls short somewhere, and attention maps and a model’s own self-explanation need testing before they count as evidence. On the toy, income’s Shapley value is 14 and debt’s is -4, which add up to the 10-point difference between 60 and 50.",
    explain: [
      {
        heading: "The Shapley toy, worked",
        body: "A Shapley value splits one prediction’s difference from a typical case fairly among the features, by averaging each feature’s contribution over every order in which the features could be revealed. Here the model scores 50 with nothing known, 62 with only income, 44 with only debt, and 60 with both. Income’s gain is 62 - 50 = 12 if added first and 60 - 44 = 16 if added after debt, so its Shapley value is (12 + 16) / 2 = 14. Debt’s is (44 - 50) = -6 added first and (60 - 62) = -2 added second, so (-6 + -2) / 2 = -4. They sum to 14 + (-4) = 10 = 60 - 50, so the values add up to the difference from the typical case. The interaction between the two (the joint effect of 10 is more than 12 - 6 = 6 alone) is shared equally.",
      },
      {
        heading: "What each method can and cannot say",
        body: "Shapley values have limits. The cost doubles with every feature, so tools approximate; “feature unknown” needs a background definition that can create unrealistic combinations; and they describe the model’s behaviour, not a what-if, so they do not say how much a change would raise the score. For Asha, a counterfactual does that job: a statement such as “with lower debt you would have reached 55” (an example, available only if the model’s slope allows it) says what to change without opening the model, and local surrogate models such as LIME give a similar local picture. For the regulator and the builder, whole-model tools help: permutation importance on held-out data (shuffle one column and see how much the error rises) describes this model and not the world, shares credit between correlated columns, and says how much a feature matters but not in which direction.",
      },
      {
        heading: "Attention maps and the model explaining itself",
        body: "Do not accept an attention map or saliency map as an explanation without testing it. Jain and Wallace showed attention weights can be uncorrelated with other importance measures, though what counts as an explanation is disputed (Wiegreffe and Pinter), and Adebayo and colleagues found some saliency methods barely changed when the model’s weights were randomised. A language model’s own explanation is evidence, not proof: its reasoning can rationalise a bias it never mentions (Turpin and colleagues), and reasoning models often leave out hints they used. Test by changing the input and checking that the stated reason predicts what changes.",
      },
      {
        heading: "Match the explanation to the reader",
        body: "The affected person needs plain reasons, counterfactuals and a way to contest the decision. A reviewer needs the main factors and the evidence, the builder needs importance, Shapley values and error analysis, and an auditor needs documentation, slice tests and logs. Where an interpretable model such as a scorecard is accurate enough, try it first. Rules differ by place: the EU AI Act, for example, gives certain affected people a right to an explanation of the role a high-risk system played in a decision. This is not legal advice, so check the scope with a lawyer.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["What to give", "Where it falls short"],
      rows: [
        { label: "Asha, the applicant", cells: ["Plain reasons, a counterfactual, a way to contest", "Only useful if the change is possible and the model’s slope allows it"] },
        { label: "The regulator or reviewer", cells: ["Main factors, permutation importance, slice tests", "Describes this model, not the world, and shares credit between correlated columns"] },
        { label: "The builder", cells: ["Shapley values and error analysis", "Approximate, depends on a background definition, not a what-if"] },
        { label: "A colleague’s idea: attention map or self-explanation", cells: ["Treat as a hint to test, not as the reason", "Attention can disagree with other importance measures, and a model can rationalise"] },
      ],
      caption: "Different readers need different explanations, and every method has a limit.",
    },
    example: {
      title: "Example: the two-feature toy",
      text: "Scores for each set of known features: neither 50, income only 62, debt only 44, both 60. Shapley values average each feature’s gain over both orders.",
      rows: [
        { label: "Income, added first or second", value: "62 - 50 = 12 and 60 - 44 = 16, average 14" },
        { label: "Debt, added first or second", value: "44 - 50 = -6 and 60 - 62 = -2, average -4" },
        { label: "Check: values add up", value: "14 + (-4) = 10 = 60 - 50" },
        { label: "Interaction", value: "joint effect 10 vs separate effects 12 and -6 (sum 6): the extra 4 is shared equally" },
      ],
    },
    followUps: [
      {
        q: "Two income columns are near copies and permutation importance shows each as small. Why?",
        a: "Correlated columns share the credit: when you shuffle one, the other still carries the information, so the error barely rises. Group the correlated features and permute them together.",
      },
      {
        q: "How would you check that an explanation method is faithful?",
        a: "Remove the features it calls important and check that the score drops more than when you remove random features. Plant a model with one secretly decisive feature and see if the method finds it, and randomise the model’s weights to check the explanation changes.",
      },
      {
        q: "Does mechanistic interpretability solve this?",
        a: "Not yet: probes show that information is present, not that it is used, and sparse autoencoders give features you can name but their authors state the limits. It is useful research for investigation, not an audit button.",
      },
    ],
    mistakes: [
      "Showing a Shapley chart to a loan applicant as the reason for the decision.",
      "Presenting attention weights as the model’s reasoning.",
      "Trusting a chatbot’s self-explanation without testing it.",
      "Treating feature importance as causation.",
    ],
  },

  'ds-choose-a-model-for-credit-risk-with-explanations': {
    short:
      "Try the simplest models first, a scorecard or rule and a logistic regression, because they are strong, explainable benchmarks that anything more complex must beat on the same data and splits. Then try gradient-boosted trees, usually the most accurate on tabular data, with monotonic constraints, and compare everything on the same time-based splits with intervals. Check calibration, plan the explanations, and remember that outcomes exist only for approved loans; rules differ by place, so take the explanation and fairness requirements to compliance.",
    explain: [
      {
        heading: "Models to try, in order, and how to choose",
        body: "Start with a baseline: a simple rule or scorecard (points added for each risk factor) and a logistic regression on a few well-chosen features. Next try gradient-boosted trees (many small decision trees added one after another, each fixing the last one’s mistakes), which are often the most accurate on tabular data like this; deep networks rarely justify their cost on 120,000 rows and 60 columns. Use monotonic constraints where a feature should push risk only one way, so that more missed payments never lowers the predicted risk. Compare all models on the same time-based splits (train on older loans, test on newer) and report intervals. If boosting beats logistic regression by 0.01 AUC with overlapping intervals, the simpler model may be the better choice given explanation and upkeep.",
      },
      {
        heading: "Calibration and explanations",
        body: "Calibration means a predicted 5% default rate really leads to about 5% defaults. It is essential here because the probabilities drive pricing and limits, so check a reliability curve (predicted against observed rate by score band) and the Brier score (the mean squared error of the probabilities), and recalibrate with Platt scaling or isotonic regression on separate data if needed. For explanations, a linear model gives coefficients and scorecard points. For boosting, use per-decision attributions such as SHAP, remembering that they describe the model’s behaviour and not the causes of default, and that they may not satisfy a required reason format. Check the requirement with compliance rather than quoting rules.",
      },
      {
        heading: "Traps specific to lending",
        body: "Selection bias comes first: you only know how approved applicants performed, so the model has never seen how rejected applicants would have done. Reject inference (estimating their outcomes) and a cautious rollout help, but do not claim to know the risk for people the old policy excluded. Check fairness and legality: performance and error rates by group, proxy features for protected traits, and documentation of the choices, with compliance and legal involved because rules differ. Plan for life after launch: monitor drift and calibration even though default labels arrive months late, set a retraining schedule, and keep a fallback.",
      },
    ],
    diagram: {
      kind: "layers",
      layers: [
        { label: "1. Rule or scorecard baseline", sub: "the number to beat, fully explainable" },
        { label: "2. Logistic regression on chosen features", sub: "strong, explainable benchmark" },
        { label: "3. Gradient-boosted trees with monotonic constraints", sub: "often the most accurate on tabular data" },
        { label: "4. Calibration and explanations on top", sub: "reliability curve, Brier score, SHAP or scorecard points" },
        { label: "5. Deep network, only if it beats everything above", sub: "rarely worth the cost here" },
      ],
      caption: "Try them from the top down, and move down only when the model above is clearly beaten on the same time-based splits.",
    },
    example: {
      title: "Example: why calibration matters for pricing",
      text: "Illustrative figures. A time-based split puts the oldest 96,000 of the 120,000 loans in training and the newest 24,000 in the test set. A score band is predicted to default at 5%, but 8% default in practice. Taking a 10,000 loan with the whole balance lost on default, to keep the arithmetic simple, the expected loss is wrong by a large factor.",
      rows: [
        { label: "Predicted default 5% on a 10,000 loan", value: "expected loss 0.05 x 10,000 = 500" },
        { label: "Observed default 8%", value: "expected loss 0.08 x 10,000 = 800" },
        { label: "Defaults compared with prediction", value: "8% / 5% = 1.6, so 60% more than priced for" },
        { label: "Boosting 0.82 AUC vs logistic regression 0.80", value: "a 0.02 gap that needs an interval before it decides anything" },
      ],
    },
    followUps: [
      {
        q: "Boosting gets 0.82 AUC and logistic regression 0.80 on the same time-based test. Which do you ship?",
        a: "I look at the intervals and where the gain comes from, the value of 0.02 in actual decisions, the explanation and audit burden, and the cost of upkeep. Either can be right with reasons given; I do not pick the highest number by default.",
      },
      {
        q: "The model’s predicted default rate for a score band is 5% but the observed rate is 8%. What does it mean and what do you do?",
        a: "The calibration is poor: the ranking can still be fine while the probabilities are off. Check for drift, recalibrate on recent data and re-check by band, because pricing built on the stated probabilities would be wrong.",
      },
      {
        q: "A feature, postcode, improves accuracy but correlates strongly with a protected group. What do you do?",
        a: "Test the effect on group outcomes with and without it, weigh the business need and the alternatives, and take the decision to legal and compliance with the evidence documented. Do not decide alone, and do not keep it just because it helps accuracy.",
      },
    ],
    mistakes: [
      "Starting with a deep network and no baseline.",
      "Picking a model by the highest single AUC with no interval.",
      "Treating SHAP values as proof of why a customer defaulted.",
      "Ignoring that outcomes exist only for approved loans.",
    ],
  },

  'ab-test-sample-size-and-peeking': {
    short:
      "Use n per arm = 2 x p-bar x (1 - p-bar) x (1.96 + 0.84)^2 / delta^2 with p-bar = 0.041 and delta = 0.002, which gives about 154,000 users per arm. At 20,000 users per arm per day that takes about 7.7 days, so run whole weeks, which means 14 days, to cover weekly cycles. Fix the minimum effect, the metric, the randomisation unit and the stopping rule before starting, and do not stop the first time p drops below 0.05.",
    explain: [
      {
        heading: "The sample size arithmetic",
        body: "Significance 5% two-sided means a false-alarm rate of 5%, so z = 1.96, and power 80% means an 80% chance of detecting a real lift, so z = 0.84. Their sum is 2.80 and its square is 7.84. The average rate across the arms is p-bar = (0.040 + 0.042) / 2 = 0.041, and the lift is delta = 0.002. So n = 2 x 0.041 x 0.959 x 7.84 / 0.002^2 = 0.6165 / 0.000004, which is about 154,000 per arm. Time: 154,000 / 20,000 = 7.7 days, rounded up to 14 days so every day of the week appears twice. The cost grows fast as the gap shrinks: n scales with 1 / delta^2, so halving the detectable gap to 0.1 points needs about four times the users, roughly 609,000 per arm. This gap is a 5% relative lift (0.2 / 4.0).",
      },
      {
        heading: "Reading the result without fooling yourself",
        body: "A p-value is how surprising a gap at least this big would be if there were no real difference. It is not the chance that the new model is better, and it says nothing about size, so report the effect and an interval. Peeking is the common trap: checking daily and stopping the first time p < 0.05 inflates the false-positive rate well above 5%, so use a fixed horizon or a sequential method designed for repeated looks. Many variants or metrics are a multiple-comparison problem: 20 comparisons at 5% give 1 - 0.95^20 = 64% chance of at least one false alarm, so use a stricter threshold (Bonferroni, 0.05 / 20 = 0.0025) or confirm the winner on fresh traffic. And with enormous samples a trivial gap becomes significant, so decide beforehand whether the gap is worth the cost of shipping.",
      },
      {
        heading: "Design details that protect the result",
        body: "Randomise by user, not by request, because one user’s sessions are not independent and treating them as if they were makes intervals too narrow. Before reading any result, check that the split came out as designed (about 50 / 50): a mismatch means something broke in assignment or logging. Write down the minimum effect worth detecting, the primary metric and the stopping rule up front, and add guardrail metrics (latency, errors, revenue per user) that must not get worse. Run for whole weeks, and be aware that a new ranking can show a novelty effect that fades.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "lift to detect (percentage points)",
      yLabel: "users needed per arm",
      points: [[0.1, 609321], [0.15, 272410], [0.2, 154130], [0.3, 69302], [0.4, 39431], [0.5, 25523]],
      marks: [{ x: 0.2, label: "0.2 points: about 154,000" }],
      caption: "Same baseline of 4.0%, 5% significance and 80% power. Halving the gap you want to detect roughly quadruples the users.",
    },
    example: {
      title: "Example: sample size and duration for 4.0% to 4.2%",
      text: "Worked with the normal approximation, 5% two-sided significance, 80% power and an equal split. The result is a plan, not a prediction of what the test will show.",
      rows: [
        { label: "z values", value: "1.96 + 0.84 = 2.80, squared 7.84" },
        { label: "p-bar and delta", value: "(0.040 + 0.042) / 2 = 0.041 and 0.002" },
        { label: "Users per arm", value: "2 x 0.041 x 0.959 x 7.84 / 0.002^2, about 154,000" },
        { label: "Duration at 20,000 per arm per day", value: "7.7 days, run 14 days (two whole weeks)" },
        { label: "20 comparisons", value: "1 - 0.95^20 = 64% chance of a false alarm; Bonferroni 0.0025" },
      ],
    },
    followUps: [
      {
        q: "On day 4 the dashboard shows p = 0.03 for the new model and the product manager wants to ship. What do you say?",
        a: "The planned sample has not been reached and repeated looks inflate false positives, so keep to the agreed horizon or a pre-registered sequential rule. Meanwhile check the split ratio and the guardrail metrics, and remember that a novelty effect can fade.",
      },
      {
        q: "We also compare two model versions offline on the same 100 test cases: A passes 80, B passes 83. Ship B?",
        a: "No: the standard error of 80% on 100 cases is 4 points, so a 3-point gap is well inside the noise. Compared on the same cases, B wins on 8 and A on 5, and a sign test gives p of about 0.58, so there is no evidence B is better. A 5-point gap needs about 470 shared cases when the models disagree on 15% of cases (7.84 x 0.15 / 0.05^2), against about 1,250 per model if scored separately from a 70% pass rate.",
      },
      {
        q: "Many sessions come from the same heavy users. What changes?",
        a: "Randomise and analyse at the user level. Sessions are not independent, so intervals computed as if they were are too narrow, and the effective sample size is smaller than the session count.",
      },
    ],
    mistakes: [
      "Declaring a win from 4.0% versus 4.2% on a few thousand users.",
      "Stopping the test as soon as it turns significant.",
      "Reading the p-value as the probability that the new model is better.",
      "Picking the sample size without choosing a minimum effect worth detecting.",
    ],
  },

  'lead-measuring-roi-with-a-holdout': {
    short:
      "Yes in the base case, but with a wide error bar. Agents with the tool closed 6.4 tickets an hour against 5.8 for the 20 who never had it, a 10.3% uplift that frees about 1,500 of 16,000 hours a month, worth $45,000 against $17,400 of cost, a net of $27,600 a month or about 2.6 to 1. Because the uplift rests on 20 comparison agents and a non-random roll-out, give the CEO a range: at a 5% uplift the net falls to about $5,500.",
    explain: [
      {
        heading: "The arithmetic",
        body: "The uplift is 6.4 / 5.8 = 1.103, so about 10.3% more tickets per hour. The same ticket volume needs 5.8 / 6.4 = 90.6% of the hours, so about 9.4% of hours are freed. Total hours are 100 x 160 = 16,000 a month, so 16,000 x (1 - 5.8 / 6.4) = 1,500 hours are freed, and at $30 an hour (example) that is $45,000 a month. The cost is $2,400 for model and hosting plus half of two engineers at $15,000 each, 0.5 x 2 x $15,000 = $15,000, so $17,400 a month. Net benefit is $45,000 - $17,400 = $27,600 a month, a ratio of 45,000 / 17,400 = 2.6 to 1.",
      },
      {
        heading: "How sure is the number",
        body: "The uplift is an estimate from only 20 control agents, so test how much the answer moves. At a 5% uplift, freed hours are 16,000 x (1 - 1 / 1.05) = 762, worth about $22,900, a net of about $5,500. Break-even is $17,400 / $30 = 580 hours, which is 3.6% of all hours, an uplift of about 3.8%. Also question the comparison: a staggered roll-out is not random, so check whether the 20 differ in tenure, queue or ticket type, look at the period before launch, and ask for the uncertainty of the 6.4 versus 5.8 difference given the small group. Example: if agents vary with a standard deviation of 0.8 tickets an hour, the standard error of the gap is sqrt(0.8^2 / 20 + 0.8^2 / 80) = 0.2, so the gap of 0.6 has an interval of 0.2 to 1.0 tickets an hour, or an uplift of about 3.6% to 17%, and the low end sits right at break-even.",
      },
      {
        heading: "Beyond speed, and what the number means",
        body: "Tickets per hour can rise while quality falls, so look at reopen rate, customer satisfaction, escalations and any quality drift. Freed hours are only value if they are used: growth without hiring, clearing a backlog, shorter response times. Do not turn them into a headcount claim, because 1,500 hours is about 9 people’s month of work only if every hour is genuinely reusable. Add the costs that are often forgotten: security work, evaluation and incident time.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "dollars a month (example figures)",
      items: [
        { label: "Value of freed hours (1,500 x $30)", value: 45000 },
        { label: "Running cost", value: 17400, note: "$2,400 + $15,000" },
        { label: "Net benefit, base case (10.3% uplift)", value: 27600, hot: true },
        { label: "Net benefit if the uplift is only 5%", value: 5457, note: "762 hours freed" },
      ],
      caption: "The base case looks strong, but it shrinks quickly if the true uplift is smaller than the 20-agent comparison suggests.",
    },
    example: {
      title: "Example: the ROI, step by step",
      text: "Using the question’s figures: 100 agents, 160 hours a month each, 6.4 versus 5.8 tickets an hour, and $30 an agent hour (an example loaded cost). The break-even and the 5% case show how fragile a single number is.",
      rows: [
        { label: "Hours freed", value: "16,000 x (1 - 5.8 / 6.4) = 1,500 a month" },
        { label: "Value", value: "1,500 x $30 = $45,000 a month" },
        { label: "Cost", value: "$2,400 + 0.5 x 2 x $15,000 = $17,400 a month" },
        { label: "Net and ratio", value: "$27,600 a month, 2.6 to 1" },
        { label: "Break-even", value: "$17,400 / $30 = 580 hours, a 3.6% share of hours, uplift about 3.8%" },
      ],
    },
    followUps: [
      {
        q: "The CEO wants “the number”. What do you give?",
        a: "A headline with its range: about $27,600 a month net in the base case, down to roughly $5,500 if the true uplift is half as large. State the conditions that make the savings real, and never give a single figure without its assumptions.",
      },
      {
        q: "How would you have designed the measurement from the start?",
        a: "Randomise which agents or teams get the tool, define the metrics before launch, record the baseline, and keep the comparison group long enough to cover novelty effects. Include a quality metric and a cost model from day one.",
      },
      {
        q: "Should you keep a permanent holdout group?",
        a: "A small rotating one is reasonable for ongoing measurement if it is acceptable to the people involved, or repeat the comparison periodically, since models, prompts and ticket mix change. Weigh fairness to the holdout agents against the value of ongoing evidence.",
      },
    ],
    mistakes: [
      "Reporting only the engineering and model costs and forgetting staff time.",
      "Treating the 10% uplift as certain when it comes from 20 agents and a non-random roll-out.",
      "Equating freed hours with cash savings.",
      "Checking speed only and never quality.",
    ],
  },

  'ds-top-k-lift-and-net-value-of-a-retention-offer': {
    short:
      "Contact the top 10%, which is 10,000 customers: it holds 1,200 of the 3,000 churners (precision 12%, four times the 3% base rate) and has the best net value of the three cuts, +$40,000, against +$31,250 at 5% and +$35,000 at 20%. A finer search around 10% to 15% could do a little better. The weakness is that the 25% save rate is an assumption and is not the same for everyone, so ranking by churn risk is not ranking by benefit, and a randomised holdout is needed to measure it.",
    explain: [
      {
        heading: "Precision, lift and net value for each cut",
        body: "Precision here is the share of contacted customers who would have churned, and lift is that precision divided by the 3% base rate. The top 5% is 5,000 customers holding 750 churners, so 15% precision and lift 5. The top 10% is 10,000 holding 1,200, so 12% and lift 4. The top 20% is 20,000 holding 1,800, so 9% and lift 3. Net value is the saved customers times $300 minus the contact cost of $5 each. At 5%: cost $25,000, saved 750 x 25% = 187.5 customers worth $56,250, net +$31,250. At 10%: cost $50,000, saved 300 worth $90,000, net +$40,000. At 20%: cost $100,000, saved 450 worth $135,000, net +$35,000. The best of the three is the top 10%.",
      },
      {
        heading: "The marginal step and the break-even precision",
        body: "Look at what each extra slice buys. Going from 5% to 10% adds $25,000 of cost and 450 churners, so 112.5 saves worth $33,750, a gain of $8,750. Going from 10% to 20% adds $50,000 of cost for 600 more churners, 150 saves worth $45,000, a loss of $5,000. The optimum is where the marginal value reaches zero, and since the last step averaged 6% precision, below the break-even, the best cut is probably not far past 10%, which is why a finer search between 10% and 15% is worth doing. The break-even precision comes from one customer: contacting them costs $5 and returns precision x 25% x $300 = precision x $75 on average, so precision must exceed 5 / 75 = 6.7%. If live precision at the top 10% falls from 12% to 9%, net is 900 x 25% x $300 - $50,000 = +$17,500, still positive.",
      },
      {
        heading: "The weakness, and what to check",
        body: "The 25% save rate is assumed, and it is not the same for everyone: the customers most likely to leave are not necessarily the most persuadable, and some would stay anyway or react badly to an offer. A randomised holdout measures the real effect. Ranking by churn risk is also not ranking by benefit; an uplift model estimates the change the offer causes, but it needs randomised data and is harder to evaluate. Check that the backtest is honest: a time-based split, features known at the prediction date, and an interval on the capture rates, since 40% from a small test set is uncertain. Do not choose the cut from AUC, which summarises ranking at every threshold and ignores the budget and the cost per contact.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "share of customers contacted (%)",
      yLabel: "net value (dollars)",
      points: [[0, 0], [5, 31250], [10, 40000], [20, 35000]],
      marks: [{ x: 10, label: "Top 10%: +$40,000" }],
      caption: "Computed at the three backtest cuts, with straight lines between them. The true peak may sit slightly past 10%. Example figures.",
    },
    example: {
      title: "Example: net value of each cut",
      text: "Using the question’s figures: 100,000 customers, 3,000 churners, $5 per contact, a 25% save rate and $300 per saved customer. The save rate is an assumption, not a measurement.",
      rows: [
        { label: "Top 5%: 5,000 contacted, 750 churners", value: "precision 15%, saved 187.5, net $56,250 - $25,000 = +$31,250" },
        { label: "Top 10%: 10,000 contacted, 1,200 churners", value: "precision 12%, saved 300, net $90,000 - $50,000 = +$40,000" },
        { label: "Top 20%: 20,000 contacted, 1,800 churners", value: "precision 9%, saved 450, net $135,000 - $100,000 = +$35,000" },
        { label: "Break-even precision", value: "$5 / (25% x $300) = 6.7%" },
        { label: "Top 10% if live precision is 9%", value: "900 x 25% x $300 - $50,000 = +$17,500" },
      ],
    },
    followUps: [
      {
        q: "How would you measure the real save rate before scaling the programme?",
        a: "Randomise a holdout among the targeted customers, for example 10% who receive nothing, and compare churn between the treated and held-out groups with an interval. Run it for a full billing cycle.",
      },
      {
        q: "The offer is a 20% discount instead of a $5 call. What changes in the analysis?",
        a: "The cost now lands on everyone who accepts, including people who would have stayed, so it is a margin cost on the retained base and not only on churners. The break-even moves, and the incremental effect becomes the main number to measure.",
      },
      {
        q: "Customers are scored once a quarter. Why might the model get worse over time?",
        a: "Behaviour, prices and the customer mix change, and the offer itself changes who churns, which is a feedback loop. Monitor precision at the cut using delayed labels, track input drift, and retrain on a schedule.",
      },
    ],
    mistakes: [
      "Choosing the cut-off from accuracy or AUC instead of from the budget and the net value.",
      "Treating the 25% save rate as a fact.",
      "Ignoring the cost of contacting customers who would have stayed anyway.",
      "Being unable to compute precision and net value from the capture table.",
    ],
  },
};
