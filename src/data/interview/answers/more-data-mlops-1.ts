import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'batch-or-online-break-even': {
    short:
      "Price both in core-hours. Nightly batch scoring of 20 million customers costs 20,000,000 × 0.03 s = 600,000 core-seconds, or 166.7 core-hours, about $8.33 a day however many customers show up. Online scoring must be sized for the peak, so at 5% active it needs 5 cores around the clock ($6.00 a day) and at 15% active it needs 14 ($16.80 a day), which puts the break-even near 7.5% active. Cost is not the whole choice: freshness, the latency budget, failure behaviour and customers with no precomputed score matter just as much.",
    explain: [
      {
        heading: "Price the batch job first",
        body: "Keep the units straight. 30 ms is 0.03 seconds of one core. Scoring all 20 million customers takes 20,000,000 × 0.03 = 600,000 core-seconds. Divide by 3,600 seconds in an hour and you get 166.7 core-hours, and at the example price of $0.05 per core-hour that is $8.33 a day. Batch scores everyone whether or not they open the app, so this number does not move with the active share. (This assumes you only pay for the cores while the job runs.)",
      },
      {
        heading: "Price online serving, sized for the peak",
        body: "Online cost depends on requests, and servers must cope with the busiest moment, not the average one. At 5% active, 1 million customers open the app twice, so 2 million requests a day. Divide by 86,400 seconds in a day: 23.1 requests a second on average, and 4 × that, 92.6, at peak. Each request keeps a core busy for 0.03 s, so 92.6 × 0.03 = 2.78 busy cores at peak. Servers should not run hotter than 60% at peak, so 2.78 ÷ 0.6 = 4.6 cores, and cores come whole, so 5. Those 5 run all day: 5 × 24 × $0.05 = $6.00. At 15% active the same steps give 6 million requests, 69.4 a second, 277.8 at peak, 8.33 busy cores, 13.9 with headroom, so 14 cores and $16.80 a day.",
      },
      {
        heading: "Where they break even",
        body: "Write both costs out and the same terms cancel. Batch is N × t × price ÷ 3,600. Online is active share × N × opens × peak factor × t ÷ 86,400 ÷ utilisation × 24 × price, and 24 ÷ 86,400 is 1 ÷ 3,600. So they are equal when active share × opens × peak factor ÷ utilisation = 1, which gives share = 0.6 ÷ (2 × 4) = 7.5%. Check it: at 7.5% online needs 6.94 cores, which costs 6.94 × 24 × $0.05 = $8.33, the same as batch. Whole-core rounding moves the exact crossing slightly, to 7 cores and $8.40 here. Below 7.5% online wins on price, above it batch wins.",
      },
      {
        heading: "What the price table leaves out",
        body: "Freshness: a batch score is up to a day old, while an online score reflects the last few seconds. Latency: online has a budget (say 100 ms at the 99th percentile) and the feature lookups that feed the model spend part of it. Failure: if the nightly batch fails, yesterday's predictions stay in place and the app keeps working; if the online service fails, requests fail unless you built a fallback. Coverage: new or logged-out users have no precomputed score at all. A good design is often a hybrid. Precompute for recently active customers, fall back to online scoring for everyone else, and put a prediction cache in front, keyed by the input and the model version, with a lifetime that matches how fast the answer goes stale.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "Customers active on the day (%)",
      yLabel: "Online cost ($ a day, before rounding up to whole cores)",
      points: [
        [0, 0],
        [5, 5.56],
        [7.5, 8.33],
        [10, 11.11],
        [15, 16.67],
      ],
      marks: [{ x: 7.5, label: "Break-even at 7.5%: $8.33, the same as batch" }],
      caption: "Online cost rises in a straight line with the active share, while batch stays flat at $8.33 a day. The line is drawn before whole-core rounding, which is why the text says $6.00 and $16.80.",
    },
    example: {
      title: "Example: 20 million customers, 2 opens a day each",
      text: "All prices are example prices. Peak is 4 times the daily average and servers run at no more than 60% at peak. Batch cost is flat, online cost follows the active share.",
      rows: [
        { label: "Batch, every customer", value: "600,000 core-seconds = 166.7 core-hours = $8.33 a day" },
        { label: "Online at 5% active", value: "2M requests, 92.6 a second at peak, 4.6 cores, so 5 cores = $6.00 a day" },
        { label: "Online at 15% active", value: "6M requests, 277.8 a second at peak, 13.9 cores, so 14 cores = $16.80 a day" },
        { label: "Break-even", value: "0.6 ÷ (2 × 4) = 7.5% active" },
      ],
    },
    followUps: [
      {
        q: "The peak is 10 times the average, not 4. What happens to the break-even?",
        a: "It falls to 0.6 ÷ (2 × 10) = 3%, because you now pay for servers that sit idle most of the day. Spiky traffic costs more than the average suggests, so smooth it with queues, autoscaling or caching.",
      },
      {
        q: "Feature lookups take 80 ms inside a 100 ms p99 budget. Is the model the problem?",
        a: "No, the design is wrong whatever the model does, because the lookups leave 20 ms for everything else. Run lookups in parallel, precompute and cache hot features or move them into an online store, and give each stage its own budget.",
      },
      {
        q: "When would you add streaming features?",
        a: "When the answer depends on what the user did in the last few minutes, such as a count of recent attempts. It needs sliding-window state per customer and more infrastructure, so adopt it only when batch-computed features are too stale.",
      },
    ],
    mistakes: [
      "Comparing only the price per prediction. Price the whole day, including idle capacity, and then list freshness, latency and failure behaviour next to it.",
      "Sizing online servers for the average. Users arrive in bursts, so size for the peak and a utilisation ceiling.",
      "Declaring batch always cheaper or online always better. The answer flips at a break-even that depends on your own numbers.",
      "Forgetting what happens when something fails, and what a brand-new user gets.",
    ],
  },

  'de-parquet-and-date-partitions-for-a-2tb-table': {
    short:
      "CSV is text stored row by row, so reading three columns still means reading and parsing every byte. Parquet stores each column together and compresses it well, and date partitions put each day in its own folder, so a query for 7 days and 3 of 40 columns can skip almost everything. A rough estimate is 7.5% of the columns × 1.9% of the days, about 0.14% of 2 TB, around 2.9 GB. The risks are too many small files, too many partitions, and converting without checking the data afterwards.",
    explain: [
      {
        heading: "Why Parquet reads less",
        body: "A CSV file is plain text with one row per line. To get three columns out of 40 you must still read every row in full and split it on commas. CSV also carries no types, so a number, a date and a text value all look the same until your code guesses. Parquet is a columnar format: it stores all the values of one column together, with the type recorded in the file. A query that needs 3 columns reads only those 3 columns. Similar values sit side by side, so each column compresses much better than a mixed row of text would.",
      },
      {
        heading: "Why date partitions help",
        body: "Partitioning means splitting the table into folders by a column, here one folder per date, for example date=2026-03-14/. When a query says WHERE date is between two days, the engine reads only those folders and never opens the others. This is called partition pruning. Inside each Parquet file the data is cut into row groups, and each group stores the minimum and maximum of every column. If a filter cannot match a group's range, the engine skips that block too. Pruning only works when the partition column matches how people filter.",
      },
      {
        heading: "The estimate, with its limits",
        body: "Work it in two steps and multiply. Columns: 3 ÷ 40 = 7.5% of the data, if every column is the same size. Days: 7 ÷ 365 = 1.9% of the partitions. Together 0.075 × 0.0192 = 0.14% of 2 TB, and with 1 TB = 1,000 GB that is 2,000 GB × 0.00144 = about 2.9 GB, roughly 700 times less than scanning 2,000 GB of CSV. This is a rough model. Real columns differ a lot in size (a text column can be 50 times a flag), and compression and encodings change the file sizes, so the true number could be well below or above. Run the query and measure bytes scanned.",
      },
      {
        heading: "What can go wrong",
        body: "Many tiny files: every file costs time to list and open, so thousands of small ones make queries slow even when the data is small. Compact them into larger files (guided by your engine's documentation). Too many partitions: partitioning by a column with huge numbers of values, such as user ID, creates the same problem. Partition by what queries filter on, with a modest number of values. Schema: Parquet carries a schema and types, which avoids CSV troubles with delimiters, newlines inside text and numbers read as strings, but files written with different schema versions need care when mixed. Table formats built on top of Parquet, such as Iceberg or Delta, add transactions, schema evolution and time travel, which help with safe updates and with rebuilding exactly the training set you used before.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "GB read",
      items: [
        { label: "CSV, full scan", value: 2000, note: "every row, every column" },
        { label: "Columnar only (3 of 40)", value: 150, note: "7.5% of the table" },
        { label: "Date pruning only (7 of 365)", value: 38.4, note: "1.9% of the table" },
        { label: "Both together", value: 2.88, note: "about 0.14%", hot: true },
      ],
      caption: "Each trick alone helps a lot, and the two multiply. Rough model: equal-size columns, compression ignored.",
    },
    example: {
      title: "Example: one query on a 2 TB table",
      text: "The table has 40 columns and 365 daily partitions. The query needs 3 columns and 7 days. Treat 2 TB as 2,000 GB, and assume equal-size columns, which real data will not have.",
      rows: [
        { label: "Share of columns", value: "3 ÷ 40 = 7.5%" },
        { label: "Share of days", value: "7 ÷ 365 = 1.92%" },
        { label: "Share of the table read", value: "0.075 × 0.0192 = 0.144%" },
        { label: "Data read", value: "2,000 GB × 0.00144 = about 2.9 GB" },
        { label: "Compared with CSV", value: "2,000 ÷ 2.9, roughly 700 times less" },
      ],
    },
    followUps: [
      {
        q: "A streaming job writes a new file every few seconds into the daily partition. What happens to read performance and what do you do?",
        a: "Thousands of tiny files slow queries and strain the metadata layer. Batch the writes, run a compaction job that merges them into larger files, and consider a table format that manages this for you.",
      },
      {
        q: "Your analysts mostly filter by customer ID, not date. Is date partitioning still right?",
        a: "Partition by what queries filter on, but avoid very high cardinality. Consider partitioning by date and sorting, bucketing or clustering by customer ID, and check the choice against real query patterns.",
      },
      {
        q: "How would you check that the conversion did not change the data?",
        a: "Compare row counts, column types, null counts and checksums or aggregates per partition between the CSV and the Parquet, and diff a random sample. Be careful with timestamps, number precision and text encoding.",
      },
    ],
    mistakes: [
      "Calling Parquet \"just compressed CSV\". The column layout, types and statistics are what let the engine skip data.",
      "Partitioning by a column with millions of values, which leaves millions of tiny folders.",
      "Converting the table and never checking it against the original.",
      "Quoting the 2.9 GB estimate as exact. It is a model with stated assumptions, so measure the real bytes scanned.",
    ],
  },

  'de-row-count-check-that-fires-every-sunday': {
    short:
      "The check compares each day with the day before, and a normal Sunday is only about 47% of Saturday (61,000 ÷ 130,000), which is below the 50% line, so it fires every week for nothing. Compare with the same weekday over recent weeks instead. This Sunday's 36,500 rows is about 8 standard deviations below the 61,000 average, so it is a real fault, and the new check must catch it. Then make the alert say what to look at and who owns it, so people trust it again.",
    explain: [
      {
        heading: "Why it cries wolf",
        body: "Many businesses have a weekly cycle: Saturday is busy and Sunday is quiet. The rule \"less than 50% of yesterday\" was written without that in mind. On a normal Sunday, 61,000 ÷ 130,000 = 46.9%, under the line, so the alert fires. Nothing is wrong, but after eight false alarms people stop reading it, and the day it matters nobody looks. Alerts that fire without cause teach people to ignore them.",
      },
      {
        heading: "Compare like with like, then judge this Sunday",
        body: "The baseline should be the same weekday over recent weeks, here the last eight Sundays, so the weekly cycle is part of what normal means. Known events such as public holidays go on a calendar so they can be handled on purpose. Now judge this Sunday. The average is 61,000 and 36,500 is 24,500 below it. With a standard deviation (the typical size of the week-to-week wobble) of about 3,000, that is 24,500 ÷ 3,000 = 8.2 standard deviations, and 36,500 ÷ 61,000 means the table is about 40% down. That is far outside normal variation, so this one is a real fault to investigate, and the redesigned check must fire on it.",
      },
      {
        heading: "Set the rule from data, in both directions",
        body: "Alert when the count falls outside a band around the same-weekday baseline, for example more than 3 standard deviations (61,000 - 3 × 3,000 = 52,000 is the lower edge), or a percentage band. Do not guess the width: replay the rule on past data and count the false alarms and the missed faults, then adjust. Eight weeks is a small sample, so the spread itself is uncertain. Noise also depends on size. If rows arrive independently, normal noise grows like the square root of the count, so a table of 100 rows wobbles by about 10 (10%) while one of 100,000 wobbles by about 316 (0.3%). Small tables need wider bands. Real data is usually noisier than that formula says: the Sundays here vary by 3,000 ÷ 61,000 = 4.9%, far more than the 0.4% the formula predicts, so always measure. Check upward too, since a sudden spike can mean a duplicated batch, and add a freshness check on the newest timestamp, because a stalled feed can leave an old count looking fine.",
      },
      {
        heading: "Make the alert useful and prove it works",
        body: "A good alert carries the expected range, the observed value, the table and its owner, a link to a sample of rows and a severity. Prove the check by planting a fault on purpose, for example delete half of a test partition, and confirm it fires. Decide in advance what the pipeline does when the check fails: stop the downstream jobs, keep serving the last good data and quarantine the new batch so people can look at it.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "rows",
      items: [
        { label: "Saturday", value: 130000 },
        { label: "Old alert line (50% of Saturday)", value: 65000 },
        { label: "Normal Sunday (8-week average)", value: 61000 },
        { label: "New lower limit (3 std dev below)", value: 52000 },
        { label: "This Sunday", value: 36500, hot: true },
      ],
      caption: "The old line sits above a normal Sunday, so it fires every week. The new limit sits below normal Sundays and above this one.",
    },
    example: {
      title: "Example: the numbers behind the redesign",
      text: "Same-weekday baseline from the last eight Sundays: average 61,000 and standard deviation about 3,000. The 3 standard deviation band is an example choice, to be tuned on history.",
      rows: [
        { label: "Normal Sunday vs Saturday", value: "61,000 ÷ 130,000 = 46.9%, under the 50% line" },
        { label: "This Sunday vs the baseline", value: "36,500 ÷ 61,000 = 59.8%, about 40% down" },
        { label: "Distance in standard deviations", value: "24,500 ÷ 3,000 = 8.2" },
        { label: "Lower limit at 3 std dev", value: "61,000 - 9,000 = 52,000 rows" },
        { label: "Verdict", value: "Alert: far below the limit, investigate" },
      ],
    },
    followUps: [
      {
        q: "On Black Friday the count doubles and the check fires. What do you do?",
        a: "Add known events to a calendar or use a wider band on flagged days, and still check that the lift is plausible. Do not disable the check, because a holiday-aware baseline cuts noise without hiding faults.",
      },
      {
        q: "The check passes but the model gets worse. What other checks would you add?",
        a: "Distribution and schema checks (value ranges, category mix, null rates), duplicate checks and freshness. A volume check sees how many rows arrived, not what is in them.",
      },
      {
        q: "How would you decide the threshold for hundreds of tables without hand-tuning each?",
        a: "Compute baselines automatically from history per table and weekday, start with a default band, and tier tables by importance. Review the alerts weekly and adjust bands with the table owners in the loop.",
      },
    ],
    mistakes: [
      "Keeping a check that cries wolf every week. A noisy alert is worse than none because it trains people to ignore the real one.",
      "Comparing with yesterday and ignoring the weekly cycle. Compare with the same weekday.",
      "Turning the alert off instead of fixing its baseline.",
      "Sending alerts with no owner or next step. Name who acts and what they should look at first.",
    ],
  },

  'de-green-pipeline-null-spike-schema-drift': {
    short:
      "A green job only means the code ran, not that the data is right, and here no rule looked at the content. Contain it first by stopping the bad table from publishing and keeping the last good version in use, then compare raw rows from before and after to find what changed upstream. Repair it the same way every time, backfill, and add checks on columns, allowed values and null rates, with a data contract so the producer learns about breaking changes before you do.",
    explain: [
      {
        heading: "Why it was silent, and what to do right now",
        body: "A pipeline can finish without an error and still write nonsense: the null share of plan_type went from 0.3% to 38% and nothing complained, because the job only checks that code ran. First contain the damage. Stop publishing the affected table or feature and keep serving the last good version. Mark the affected days so the broken values are not used for training, because served data often becomes tomorrow's training data and the problem would spread into the next model.",
      },
      {
        heading: "Find what changed upstream",
        body: "Nobody on your team changed code, so look at what feeds you: a renamed or retyped column, a new category value, a changed unit, a release by the producing team. Take a sample of yesterday's raw rows and today's and compare them, then break the nulls down by source, partition and value. Look at the raw values of the rows that came out null. Often the mechanism is plain, for example a new plan name that the mapping table does not know, so it maps to null, or a column renamed so a join no longer matches.",
      },
      {
        heading: "Repair it, then catch it earlier",
        body: "Repair deterministically: fix the mapping or the column name, backfill the affected partitions, and check row counts and null rates against the baseline afterwards. Then add checks at the boundary where data enters your pipeline: expected columns and types, allowed values (with a counter for unknown ones, so a new plan name is noticed on day one), null-rate and distribution checks against a baseline, and row counts. Plant a fault on purpose, such as a column with the wrong name in a test run, to confirm each check fires. Never drop bad rows silently, and never fill the nulls with a default and move on: write down what was dropped and why.",
      },
      {
        heading: "Move the check upstream with a contract",
        body: "A data contract is an agreement between the team producing a dataset and the teams using it: the schema, what each field means, the allowed values and a notice period for changes. The producer then learns that a change would break a consumer before it ships, instead of the consumer finding out on Monday. Until a contract exists, validate on arrival and quarantine anything that fails so someone else's change cannot silently reach your model.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'notice', label: 'Notice', sub: 'nulls 0.3% to 38%, green job' },
        { id: 'contain', label: 'Contain', sub: 'stop publishing, keep last good' },
        { id: 'find', label: 'Find the change', sub: 'compare raw rows, split nulls by source' },
        { id: 'repair', label: 'Repair and backfill', sub: 'fix mapping, check against baseline' },
        { id: 'checks', label: 'Add checks', sub: 'columns, values, null rate' },
        { id: 'contract', label: 'Data contract', sub: 'producer is told before a change' },
      ],
      highlight: ['contain', 'contract'],
      caption: "Stop the harm first, find the cause second, then move the check closer to the source.",
    },
    example: {
      title: "Example: finding the cause from the raw rows",
      text: "Invented numbers for a table of 2,000,000 rows. Splitting the null rows by the raw value they came from shows one new plan name that the mapping did not know. Fixing that one mapping explains nearly the whole jump.",
      rows: [
        { label: "Normal nulls (0.3%)", value: "2,000,000 × 0.003 = 6,000 rows" },
        { label: "Nulls on Monday (38%)", value: "2,000,000 × 0.38 = 760,000 rows" },
        { label: "Rows with the unknown plan name", value: "750,000, which is 37.5% of all rows" },
        { label: "Check", value: "6,000 + 750,000 = 756,000 = 37.8%, about 38%" },
        { label: "Fix", value: "add the mapping, backfill, rerun null-rate check" },
      ],
    },
    followUps: [
      {
        q: "Would a drop in model accuracy have caught this?",
        a: "Late and weakly. Labels arrive after a delay and accuracy is an average, so a fault in one slice can hide for days. Input checks fire first and accuracy confirms later.",
      },
      {
        q: "The producer says they never promised column names. What is your response?",
        a: "Agree a contract with owners and a change process. Until then, validate on arrival and quarantine failures so the producer's change cannot silently break consumers.",
      },
      {
        q: "Your new null-rate alert fires every few days on harmless noise. How do you tune it?",
        a: "Set the threshold from observed variation, for example a few standard errors or a percentage over a same-weekday baseline. Alert on a size of change that matters to the model, put context in the alert, and review false alarms regularly.",
      },
    ],
    mistakes: [
      "Assuming the pipeline is fine because the job succeeded. Success means the code ran, not that the data is right.",
      "Filling the nulls with a default and moving on without finding the cause.",
      "Relying on a model metric to detect data faults. It is late, averaged and hard to trace back.",
      "Dropping the bad rows silently with no record of how many or why.",
    ],
  },

  'reproduce-and-roll-back-a-model': {
    short:
      "Treat a model as the output of a function of code, data, settings, environment and randomness, and record each of those for every training run, instead of keeping a file called final_v3.pkl. A model registry adds versions linked to their runs, an approval status and a movable alias such as production, so a rollback is moving the alias back to an older version. \"Reproduced\" should mean a rebuild whose metric lands inside the spread you see across seeds, not a bit-for-bit match. Rehearse the rollback before you need it.",
    explain: [
      {
        heading: "What to record for every run",
        body: "Pin each input of the function. Code: the Git commit, with a flag if the working tree had uncommitted changes. Data: a hash of the exact snapshot used, for example DVC pointers kept in Git with the data itself in storage. Settings: the parameters, in a config file logged with the run. Environment: a lock file or a container image that fixes library versions. Randomness: the seeds. Write these into a run manifest stored next to the model and link the metrics and the model file to that run. An experiment tracker such as MLflow does this at scale. A notebook is not a record, because cells run in any order and get edited afterwards.",
      },
      {
        heading: "What a registry adds",
        body: "A model registry is a catalogue of model versions. Each version links back to the run that made it (its lineage), carries an approval status, and can hold a movable alias such as production or champion. Serving reads the alias, so rolling back means moving the alias to the previous version rather than rebuilding anything. That only works if the old version, its feature definitions and its serving container still exist, and if you have rehearsed the rollback in calm conditions rather than for the first time during an incident. Keep a model card with each registered version (intended use, evaluation by slice, known limits) and a gate that compares a candidate with the current champion by slice before it is registered.",
      },
      {
        heading: "What reproduced should mean",
        body: "Bit-for-bit identical results are often not achievable. PyTorch's documentation says it does not guarantee identical results across releases, individual commits or platforms, or between CPU and GPU, and deterministic settings can slow training down. So define reproduced as a tolerance. Train the recipe with several seeds and look at the spread. In an example with five seeds scoring 0.909, 0.911, 0.912, 0.910 and 0.914 the mean is 0.9112 and the spread is 0.909 to 0.914. A rebuild that scores 0.911 is a good reproduction; one that scores 0.896 is outside the spread and deserves investigation.",
      },
      {
        heading: "Where this sits",
        body: "One company's published framing describes a ladder: manual training, then an automated pipeline with data and model validation, then automated CI/CD of the pipeline itself. That is one view, not a standard, but it is a useful way to say how far you have got. A published checklist known as the ML Test Score includes the ideas that training should be reproducible and that models can be rolled back quickly. Finally, write down the business measure the model exists to move, such as fewer support calls. The offline metric in the registry is only a proxy for it.",
      },
    ],
    diagram: {
      kind: 'layers',
      layers: [
        { label: "Registry alias", sub: "production points to v14, rollback means pointing it at v13" },
        { label: "Registered model and model card", sub: "version, approval status, evaluation by slice, known limits" },
        { label: "Run manifest", sub: "metrics, parameters in a config file, seeds, link to the model file" },
        { label: "Data snapshot", sub: "content hash of the exact training data" },
        { label: "Code and environment", sub: "Git commit, clean-tree flag, lock file or container image" },
      ],
      caption: "Every layer must be pinned for a rebuild, and the alias on top is what makes a rollback quick.",
    },
    example: {
      title: "Example: a run manifest and a reproduction test",
      text: "Invented values. The manifest is a small file stored with the model. To test reproducibility, rebuild from the manifest and compare with the seed spread, not with one number.",
      rows: [
        { label: "Code", value: "commit 3f9a1c2, working tree clean" },
        { label: "Data", value: "snapshot hash sha256:7be1... (a pointer file in Git, data in storage)" },
        { label: "Environment", value: "container image digest and lock file hash" },
        { label: "Seeds and settings", value: "seeds 1 to 5, config file train.yaml" },
        { label: "Seed spread (example)", value: "0.909, 0.911, 0.912, 0.910, 0.914: mean 0.9112, range 0.909 to 0.914" },
        { label: "Rebuild verdict", value: "0.911 is inside the range, so reproduced. 0.896 is not, so investigate." },
      ],
    },
    followUps: [
      {
        q: "Same code, same seed, and the metric differs by 0.4 points. Is that a bug?",
        a: "Not necessarily, because nondeterministic kernels and ordering change results. Measure the spread over seeds first (0.4 points is 0.004, which is inside the 0.909 to 0.914 example range) and only investigate differences beyond it.",
      },
      {
        q: "The training data was overwritten in place in the bucket. What now?",
        a: "Move to immutable, versioned snapshots with a content hash, and link every run to its snapshot. For the March model, try to reconstruct the data from backups or logs, and record plainly what cannot be recovered.",
      },
      {
        q: "What do you use on each cloud, as of today?",
        a: "Managed registries exist on each cloud (SageMaker Model Registry, Azure Machine Learning registered models and registries, and the model registry in Google Cloud's AI platform), and MLflow is a common open tool. Check current documentation, because names and capabilities change.",
      },
    ],
    mistakes: [
      "Pointing to a notebook as the record of how a model was made.",
      "Overwriting the model file in place, so the March model no longer exists.",
      "Claiming bit-for-bit reproducibility without evidence. Show the seed spread instead.",
      "Never testing a rollback. A rollback you have not rehearsed is a hope, not a plan.",
    ],
  },

  'fde-messy-documents-sample-and-ocr-estimate': {
    short:
      "In the sample, 46 of 200 are scans, which is 23%, so about 400,000 × 0.23 = 92,000 scanned documents. With 200 documents the margin is wide, roughly 17.7% to 29.3% (about 70,800 to 117,200 scans), and it only holds if the sample was truly random. At 6 pages each that is 552,000 pages and about $828 of OCR at the example price, or roughly $640 to $1,055 across the range. The price is small next to the quality risk, so look in the sample at languages, duplicates, tables, handwriting and sensitive content too.",
    explain: [
      {
        heading: "From a sample to an estimate",
        body: "OCR (optical character recognition) turns an image of text into text. Scans are images of paper with no text layer, so they need it and ordinary PDFs do not. The share of scans in the sample is 46 ÷ 200 = 23%. Scale it to the whole set: 400,000 × 0.23 = 92,000 scanned documents. Then pages: 92,000 × 6 = 552,000 pages. Then cost: 552,000 ÷ 1,000 × $1.50 = $828, using the example price of $1.50 per 1,000 pages.",
      },
      {
        heading: "How sure can you be?",
        body: "A sample of 200 cannot pin the share down exactly. A simple 95% margin is 1.96 × the square root of (0.23 × 0.77 ÷ 200) = 5.8 points, so about 17.2% to 28.8%. The Wilson interval, which behaves better for a share measured from a modest sample, gives 17.7% to 29.3%. On 400,000 documents that is about 70,800 to 117,200 scans, and on the cost side roughly $640 to $1,055 (424,800 and 703,200 pages at $1.50 per 1,000). All of this assumes the 200 were picked at random from the whole set. If they are the files the customer sent first, the numbers describe the customer's tidiest folder, not the pile. Draw the sample yourself, for example by random numbers over a full file listing.",
      },
      {
        heading: "The bill is not the risk",
        body: "$828 is small next to the engineering effort and the quality risk. Tables, handwriting, stamps, skewed or low-resolution scans and pages with several columns all lose information in OCR, and an error here becomes a wrong answer later when the assistant quotes it with confidence. So while you have the sample open, record everything else that will matter: languages, duplicates and versions of the same file, password-protected or corrupt files, very long documents, tables and forms, and sensitive content such as personal data.",
      },
      {
        heading: "How to report it",
        body: "Give the customer a range with its assumptions written beside it: random sample of 200, 6 pages average, example OCR price to be replaced by a real quote. Say what they need to confirm, such as whether 6 pages per scan is typical. A number with no margin invites someone to treat it as a promise.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Low (17.7%)", "Estimate (23%)", "High (29.3%)"],
      rows: [
        { label: "Scanned documents (of 400,000)", cells: ["70,800", "92,000", "117,200"] },
        { label: "Pages at 6 each", cells: ["424,800", "552,000", "703,200"] },
        { label: "OCR cost at $1.50 per 1,000 pages (example)", cells: ["about $640", "$828", "about $1,055"] },
      ],
      caption: "The same chain of multiplication run at the low end, the middle and the high end of the margin for the scan share.",
    },
    example: {
      title: "Example: the chain from 200 files to a dollar figure",
      text: "Example price of $1.50 per 1,000 pages. The range comes only from the uncertainty in the scan share. It does not include the uncertainty in the 6-page average, which is a separate risk.",
      rows: [
        { label: "Share of scans in the sample", value: "46 ÷ 200 = 23%" },
        { label: "Scans in the whole set", value: "400,000 × 0.23 = 92,000" },
        { label: "Pages needing OCR", value: "92,000 × 6 = 552,000" },
        { label: "Cost at the example price", value: "552,000 ÷ 1,000 × $1.50 = $828" },
        { label: "Range for the scan share", value: "about $640 to $1,055" },
      ],
    },
    followUps: [
      {
        q: "The 6-page average came from 46 scans, and two of them were 300 pages. How does that change your estimate?",
        a: "Page counts have a long tail, so the mean is unstable. Look at the median and the total pages in the sample, ask for file-size or page-count metadata for the whole set, split the documents by size, and give a wider range.",
      },
      {
        q: "You find that about 40% of the files are near-duplicates, many of them older versions of the same document. Why does that matter?",
        a: "Duplicates inflate indexing cost (about 160,000 of 400,000 files here) and, more importantly, give the assistant conflicting versions to quote. De-duplicate by hash and near-duplicate matching, pick the current version by a rule, and keep version metadata so answers cite the right one.",
      },
      {
        q: "How would you present the OCR number to a finance lead?",
        a: "As a range with the assumptions listed, flagged as an example price that a real quote will replace. Add that the larger cost is people time to check the quality of a sample of the OCR output.",
      },
    ],
    mistakes: [
      "Saying \"400,000 documents\" and planning to process all of them without looking at any.",
      "Reporting 92,000 scans as exact, with no margin.",
      "Taking the sample from whatever the customer chose to send, which is not random.",
      "Looking only at price and ignoring OCR quality, duplicates and sensitive content.",
    ],
  },

  'lead-model-deprecation-migration-plan': {
    short:
      "The work is 14 × (0.5 + 2 + 1) = 49 engineer-days, plus 3 × 4 = 12 days to build the missing evaluation sets, 61 engineer-days in all. Four engineers at 60% is 2.4 people, and 90 calendar days is about 64 working days, so capacity is about 154 engineer-days and the plan uses roughly 40% of it. So 90 days is enough on paper, but the average hides redesigns, incidents and other teams, so aim to finish by about day 60 and treat the deadline as a hard stop. Start with the features that have no evaluations.",
    explain: [
      {
        heading: "Count the work and the capacity",
        body: "Per feature: 0.5 day of evaluations + 2 days of prompt and parser fixes + 1 day to stage the roll-out = 3.5 days. For 14 features that is 14 × 3.5 = 49 engineer-days. Three features have no evaluation set at 4 days each, so 3 × 4 = 12 more, total 61. Capacity: 90 calendar days is about 90 × 5 ÷ 7 = 64 working days, before holidays. Four engineers giving 60% of their time is 2.4 full-time people, so 2.4 × 64 = about 154 engineer-days. The plan needs 61 ÷ 154 = about 40% of it. Another way to see it: the team delivers 2.4 × 5 = 12 engineer-days a week, so 61 days is about 5 weeks, which would finish near day 36 if nothing goes wrong.",
      },
      {
        heading: "Why not plan to the average",
        body: "The 3.5 days is an average over features that differ. Some will need a redesign, because the new model behaves differently and a prompt that worked will not. Other teams own some of the features and have their own calendars. Incidents will take people away. So set a target to finish by about day 60 and treat day 90 as a wall, not as the plan. The unused 30 days are the buffer, and you spend it only on purpose.",
      },
      {
        heading: "Order by risk and build one harness",
        body: "Start with an inventory: for each feature its usage, how critical it is, its owner and whether it has an evaluation set. Order by risk. The three features with no evaluations take the longest and are the least understood, so they go first. Build one shared evaluation harness that all 14 features use, so each migration adds only its own cases. For each feature run the old and new models side by side on the evaluation set, then a staged roll-out with a quality comparison and a rollback, and decide per feature whether to migrate, redesign or retire it.",
      },
      {
        heading: "Check cost and tell people early",
        body: "Check cost and latency of the new model as well as quality, because a model that is better but twice as slow can still break a feature. Ask the provider about extensions, since asking early costs nothing. Tell stakeholders the deadline and the plan now, not when something has slipped. And watch for the next retirement notice, because this will happen again and a standing evaluation harness makes the next one cheaper.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "Days 0 to 5", detail: "Inventory the 14 features by usage, criticality and owner. Ask the provider about extensions. Tell stakeholders the date and the plan." },
        { label: "Days 5 to 15", detail: "Build one shared evaluation harness and the 3 missing evaluation sets (12 engineer-days). These features are the least understood, so they go first." },
        { label: "Days 15 to 45", detail: "Migrate in risk order: run old and new side by side, fix prompts and parsers, check cost and latency, decide migrate, redesign or retire." },
        { label: "Days 45 to 60", detail: "Staged roll-outs with a quality comparison and a rollback ready for each feature. Target: everything done by day 60." },
        { label: "Days 60 to 90", detail: "Buffer for redesigns, incidents and other teams. The retirement date is a hard stop." },
      ],
      caption: "A plan that finishes by day 60 leaves a month of buffer. The raw arithmetic says about day 36, and the rest is room for surprises.",
    },
    example: {
      title: "Example: is 90 days enough?",
      text: "Uses the numbers from the question. Holidays are ignored, so real capacity is a little lower, which is one more reason for the buffer.",
      rows: [
        { label: "Migration work", value: "14 × (0.5 + 2 + 1) = 49 engineer-days" },
        { label: "Missing evaluation sets", value: "3 × 4 = 12 engineer-days" },
        { label: "Total", value: "61 engineer-days" },
        { label: "Capacity", value: "2.4 people × 64 working days = about 154 engineer-days" },
        { label: "Share of capacity used", value: "61 ÷ 154 = about 40%" },
        { label: "Raw duration", value: "61 ÷ 12 a week = about 5 weeks, so near day 36" },
      ],
    },
    followUps: [
      {
        q: "The new model costs 30% more per token. What do you do?",
        a: "Measure cost per task, not per token, because the new model may use fewer tokens or fewer retries. Consider routing easy requests to a smaller model, caching and shorter prompts, and bring the measured cost to the owner of each feature.",
      },
      {
        q: "Two features lose 8 points of accuracy on the new model and prompt changes do not recover it. What are the options?",
        a: "Try another model, fine-tune if there is enough data, accept the loss with human review for the affected cases, redesign the task, retire the feature, or ask for an extension. Decide with the feature owner using the measured impact.",
      },
      {
        q: "In week three an incident takes two engineers for two weeks. What do you do?",
        a: "Re-plan openly: two people for two weeks is 2 × 10 = 20 engineer-days at full time, which the buffer is there to absorb. Protect the highest-risk migrations, drop or defer low-value features, and tell stakeholders early with a revised plan and date.",
      },
    ],
    mistakes: [
      "Planning from the average with no buffer. The deadline is fixed and the surprises are not.",
      "Leaving the features with no evaluation set until last, when they are the riskiest.",
      "Checking only quality and not the cost or latency of the new model.",
      "Telling stakeholders only after something has slipped.",
    ],
  },

  'trace-slow-and-wrong-answer': {
    short:
      "A request log with one line and a total time cannot show which step was slow or wrong. You need a trace: a tree of spans for one run (agent run, model calls, retrieval, tool calls, checks) sharing one trace ID, where the slow step is found by its own time, the span's duration minus its children. Record metadata and outcomes by default, keep prompts and tool results off or externally stored with access control, and use tail sampling so that all failing runs are kept, rather than a random 5% that throws most of them away.",
    explain: [
      {
        heading: "Look inside one run",
        body: "A span is one timed step with a start, an end, a name and attributes. Spans nest: the agent run contains model calls, retrieval and tool calls, and they all carry the same trace ID so you can pull them up together. To find the slow step use its own time, which is its duration minus the time of its children. A parent span looks slow only because its children are. Often the culprit is not a model call at all but a tool that timed out and was retried. OpenTelemetry's GenAI conventions give shared span names (chat, invoke_agent, execute_tool, retrieval), but they were marked as Development, meaning not yet stable, when this lesson was last checked on 1 November 2026. Pin the version you use and keep dashboards tolerant of renames.",
      },
      {
        heading: "What to record by default",
        body: "Always record: trace and conversation IDs, the release, prompt and model versions, tokens in, out and cached, computed cost, time per span and time to first token, the finish reason, the tool name, status, error type and retries, guardrail decisions, and outcome attributes. An outcome attribute is the part people forget, such as the number of documents a retrieval returned. A retrieval span can report success and return nothing, and then the model answers from thin air. Link user feedback, sampled judge scores and eval cases to the trace ID, and tag every trace with the release. A green span is not a good result, so you also need a quality signal.",
      },
      {
        heading: "What not to record by default",
        body: "Prompts, completions, tool arguments and results and retrieved text can hold personal or confidential data. Keep them off by default, or store them in a separate system and put only a reference on the span, with its own access control, redaction, a retention period, and never secrets such as API keys. Managed observability services differ in what they capture by default, so check, do not assume.",
      },
      {
        heading: "Keeping enough without storing everything",
        body: "The app serves 100,000 runs a day and 2% fail, so 2,000 failures. Head sampling decides at the start of a run, before anyone knows how it ends. At 5% it stores 100,000 × 0.05 = 5,000 traces but only 2,000 × 0.05 = 100 of the failures. Tail sampling decides after the run ends: keep every trace with an error, a guardrail block, bad feedback or high latency, and 5% of the rest. That keeps 2,000 + 0.05 × 98,000 = 6,900 traces, 6.9% of traffic, with all 2,000 failures. The price is that the collector must hold every trace in memory until it finishes. Compute metrics (counts, token totals, latency histograms) on all traffic before sampling, so dashboards stay exact.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Head sampling at 5%", "Tail sampling"],
      rows: [
        { label: "Rule", cells: ["Keep 5% of runs, chosen at the start", "Keep every error, block, bad feedback or slow run, plus 5% of the rest"] },
        { label: "Traces stored a day", cells: ["5,000", "6,900 (6.9%)"] },
        { label: "Failing runs kept, of 2,000", cells: ["about 100", "2,000"] },
        { label: "Cost", cells: ["Cheap, decided immediately", "Holds each trace in memory until the run finishes"] },
      ],
      caption: "Same volume of traffic, very different usefulness: head sampling throws away the traces you most want.",
    },
    example: {
      title: "Example: reading one trace of a slow, wrong answer",
      text: "A made-up trace of one run that took 14.2 s. The total looks like a slow model, but own times show the cause, and an outcome attribute shows why the answer was wrong.",
      rows: [
        { label: "agent run, 14.2 s total", value: "children add to 14.0 s, so own time is 0.2 s" },
        { label: "retrieval, 0.5 s", value: "status ok, documents returned = 0" },
        { label: "model call, 1.4 s", value: "answers with no source material" },
        { label: "tool lookup_order, 10.2 s", value: "attempt 1 timed out at 8.0 s, retry took 2.0 s, own time 0.2 s" },
        { label: "model call, 1.9 s", value: "writes the final answer" },
        { label: "Reading", value: "slow because of the tool timeout, wrong because retrieval returned nothing" },
      ],
    },
    followUps: [
      {
        q: "With 5% head sampling, what is the chance you kept none of the 20 failing runs caused by one bug?",
        a: "0.95^20, about 36%. That is why head sampling throws away the traces you most want.",
      },
      {
        q: "The trace shows the last model call was fast but cost about 60% of the run's tokens. Why might that be?",
        a: "Its input probably grew because the whole tool result was passed back to it. Attribute tokens per span, cap or trim tool results, and return only what the next step needs.",
      },
      {
        q: "Compliance asks you to store all prompts for seven years. How do you respond?",
        a: "Traces are a data store with retention duties and access control. Ask what is actually required, store references and redacted content where you can, and take it to the privacy or legal owner. This is not a legal answer.",
      },
    ],
    mistakes: [
      "Relying on request logs and total latency only, which cannot say which step failed.",
      "Storing full prompts everywhere with no retention or access policy.",
      "Sampling 1% at the head and treating failed runs as covered, when almost all of them are discarded.",
      "Reading a parent span's duration as the cost of the step. Subtract the children to get its own time.",
    ],
  },

  'drift-alerts-every-morning': {
    short:
      "Twenty-five independent tests at the 5% level give 1 - 0.95^25, about 72%, chance of at least one alert on a day when nothing has changed, so the monitor cries wolf. A p-value mostly measures sample size, so alert on an effect size such as PSI (population stability index) with a threshold that matters to the model. The device mix shift is a PSI of about 0.17, moderate, worth a ticket and a look. Tier alerts, choose the reference window on purpose, check the pipeline first, and keep a human labelling a small sample to confirm harm.",
    explain: [
      {
        heading: "Why it fires every day",
        body: "A test at the 5% level raises a false alarm 5% of the time when nothing changed. With 25 features and a page when any p-value is under 0.05, the chance of at least one alert on a quiet day is 1 - 0.95^25 = 72%. People learn to ignore it, which is why the real shift went unnoticed. A second problem: p-values depend heavily on how much data you have. For the same tiny shift (a KS statistic of 0.02, meaning the two distributions differ by at most 2 points) the p-value is about 0.99 with 1,000 values on each side, about 0.04 with 10,000 and below 1e-15 with 100,000. With enough data every harmless wobble is significant. Alert on an effect size, such as PSI or the KS statistic itself, with a threshold for a shift that matters to the model. Note also that a KS test is built for ordered numbers, so for a category such as device type use PSI or a chi-square test.",
      },
      {
        heading: "Work the device mix",
        body: "PSI adds up, over each category, (new share - old share) × ln(new share ÷ old share). Phone: (0.45 - 0.60) × ln(0.45 ÷ 0.60) = 0.043. Laptop: 0. Tablet: (0.15 - 0.10) × ln(0.15 ÷ 0.10) = 0.020. Other: (0.15 - 0.05) × ln(0.15 ÷ 0.05) = 0.110. Total about 0.17. A common convention reads below 0.1 as stable, 0.1 to 0.25 as moderate and 0.25 and above as large. These bands are conventions, and tools differ, so treat them as a starting point. 0.17 is moderate, which means a ticket and a look, not a 3 a.m. page.",
      },
      {
        heading: "Tier the alerts and choose the window",
        body: "Page the on-call for pipeline breakage and hard data failures, such as a feature suddenly all null. Open a ticket for large drift. Put small drift on a dashboard. Alert when a share of the features, weighted by how much the model relies on them, has drifted, not when any one has. Every alert needs an owner and a first step, and alerts that never lead to action should be retired. Choose the reference on purpose. A fixed training reference asks whether the world has left what the model knows, and a rolling one asks what changed recently. Use at least a full seasonal cycle, compare like with like, and run a short window and a long one.",
      },
      {
        heading: "Check upstream, then labels",
        body: "Look at the pipeline before blaming the world: schema, units, source and feature code. Keep data-quality checks such as null rates separate from drift checks, and do not retrain on broken data. Labels arrive late, so inputs and score distributions fire first. Then label a deliberate sample of a few hundred recent cases to confirm whether the model is actually hurt. The response (fix upstream, fall back, or retrain through the same release gates as any model) follows from that evidence.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "Features tested each morning, each at the 5% level",
      yLabel: "Chance of at least one false alarm on a quiet day (%)",
      points: [
        [1, 5],
        [5, 22.6],
        [10, 40.1],
        [25, 72.3],
        [50, 92.3],
      ],
      marks: [{ x: 25, label: "25 features: 72.3%" }],
      caption: "With independent tests, 1 - 0.95^k. At 25 features the monitor fires on most quiet days.",
    },
    example: {
      title: "Example: PSI for the device-type shift",
      text: "Old mix 60/25/10/5 per cent and new mix 45/25/15/15 per cent for phone, laptop, tablet and other. Each row is (new - old) × ln(new ÷ old).",
      rows: [
        { label: "Phone", value: "(0.45 - 0.60) × ln(0.75) = 0.043" },
        { label: "Laptop", value: "0 (unchanged)" },
        { label: "Tablet", value: "(0.15 - 0.10) × ln(1.5) = 0.020" },
        { label: "Other", value: "(0.15 - 0.05) × ln(3) = 0.110" },
        { label: "PSI total", value: "about 0.17, moderate: ticket and investigate" },
      ],
    },
    followUps: [
      {
        q: "PSI is 0.17 on device type. Page, ticket or ignore?",
        a: "A ticket and an investigation. Find the cause (a campaign, a new cohort, a logging change), check model performance and slices on the new devices, and do not retrain blindly.",
      },
      {
        q: "Which kind of change cannot be seen from inputs alone?",
        a: "Concept drift, where the same input now deserves a different answer. It needs outcomes, which arrive late, so combine prediction monitors, delayed labels and sampled review.",
      },
      {
        q: "Traffic has a weekly cycle and Mondays always look different. What do you do?",
        a: "Compare this Monday with recent Mondays, or use a reference window of at least one full cycle. A seven-day window averages the cycle out, at the price of slower detection.",
      },
    ],
    mistakes: [
      "Alerting on raw p-values from many tests with no correction and no effect size.",
      "Retraining whenever an alert fires, which can bake a data bug into the next model.",
      "Not checking the data pipeline for a bug before calling it drift.",
      "Having thresholds and alerts with no owner or action.",
    ],
  },

  'offline-auc-great-online-poor': {
    short:
      "AUC of 0.91 offline against flags that behave like random customers (an AUC near 0.5) usually means the model sees different inputs live than in training, so check the plumbing before blaming the world. Test for training-serving skew by comparing logged live features with what the training code computes for the same examples, then check that the training set did not leak the future. Fix it at the source with one definition per feature, and add monitors and a shadow stage so it is caught next time.",
    explain: [
      {
        heading: "Plumbing first, then skew",
        body: "Nothing crashed, so look for quiet faults: a broken pipeline, a missing value filled with zero, a wrong model version or a changed unit. These are more common than real drift. Next test for training-serving skew, which means the same feature is computed by two different pieces of code, one for training and one for serving, and they disagree. Log a sample of live feature values with an ID, then compute the same features with the training code for the same examples and compare them one by one. Also score identical examples through both paths. Any gap is probably an engineering error, not a property of the customers.",
      },
      {
        heading: "Leakage in time",
        body: "A second cause is leakage from the future. If the training set joined the latest value of a feature to old rows, the model saw information that did not exist at the time of the prediction, which flatters the offline score and cannot be reproduced live. Build training sets with point-in-time (as-of) joins: for each row take the value that was known at that row's timestamp, within a time-to-live so stale values become blank. Split by time too, training on the past and testing on the later weeks, not at random.",
      },
      {
        heading: "Fix it at the source, and feature stores",
        body: "The fix is one definition per feature, shared code or a single definition used for both training and serving, or training on the features as they were logged at serving time. A feature store packages this: an offline store with full history (for point-in-time joins) and an online store with the latest values, both fed by a materialisation job that copies values from one to the other. Adopt one when several models share features or skew has already bitten you, not on day one. It does not remove the need to write each feature once, correctly.",
      },
      {
        heading: "Distributions, protection and the real goal",
        body: "Compare score and input distributions between training and serving with a distance such as PSI or the KS statistic, and by slice, to see whether the live population really differs. Add standing protection: a skew monitor that reports how many features and examples differ, schema and range checks, an explicit policy for blanks that is identical in both paths, and a shadow or canary stage (the new model scores real traffic quietly, or on a small share) before full release. Finally, AUC is a proxy. Write down the business measure the model exists to move, such as saved customers, before training, and confirm it in an experiment.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'plumb', label: 'Check the plumbing', sub: 'versions, units, fills, broken jobs' },
        { id: 'skew', label: 'Test for skew', sub: 'logged live features vs training code' },
        { id: 'leak', label: 'Test for leakage', sub: 'as-of joins, time-based split' },
        { id: 'dist', label: 'Compare distributions', sub: 'PSI or KS by slice' },
        { id: 'fix', label: 'Fix at the source', sub: 'one definition per feature' },
        { id: 'guard', label: 'Add protection', sub: 'skew monitor, checks, shadow stage' },
      ],
      highlight: ['skew'],
      caption: "Work from the cheapest, most likely cause to the most expensive, then build the guard.",
    },
    example: {
      title: "Example: one feature, two definitions",
      text: "Invented numbers. The training code counts orders from a daily table that stops at midnight. The live path reads a counter that includes today's orders. The model learned a split at 5 orders in 30 days.",
      rows: [
        { label: "One customer, offline", value: "4 orders (through midnight), below the split" },
        { label: "Same customer, live", value: "5 orders (includes today), above the split" },
        { label: "Skew test, 1,000 logged examples", value: "310 differ in this feature (31%)" },
        { label: "Decisions that flip", value: "a smaller number, those sitting near the split (example: 40)" },
        { label: "Fix", value: "one shared definition of the count, with an as-of cut-off" },
      ],
    },
    followUps: [
      {
        q: "The offline job counts orders from a daily table that stops at midnight, while the online path uses a live counter that includes today. How much does it matter?",
        a: "The difference is small per row and large in total: it can shift about a third of the scores and flip some decisions. The fix is one definition, not cleverness. A blank-handling difference shifts scores without flipping decisions and quietly damages calibration.",
      },
      {
        q: "How do you tell skew from concept drift?",
        a: "Run the old training examples through the production feature path. If the scores differ, it is skew. If the scores agree but outcomes have changed, the relationship moved (concept drift), which needs outcomes and takes longer to confirm.",
      },
      {
        q: "Should you buy a feature store now?",
        a: "Only if the pain is real. Managed options exist on each cloud and so do open-source ones, but names and capabilities move, so read the current documentation. A shared, tested feature function may be enough first.",
      },
    ],
    mistakes: [
      "Retraining immediately without finding the cause. A model trained on the same broken inputs will fail the same way.",
      "Blaming drift without checking the pipeline.",
      "Joining the latest feature values to historical labels, which leaks the future.",
      "Judging the model by AUC alone, without the business measure it exists to move.",
    ],
  },

  'code-as-of-join-with-ttl': {
    short:
      "Group the features by entity, sort each group by timestamp, and for each event binary-search for the last feature timestamp at or before the event (bisect_right minus one). Return that value only if the event time minus the feature time is at most ttl, otherwise None. It runs in O((n + m) log m) for n events and m feature rows, and it avoids the leak you get from joining the latest value, which would attach a value from the future to old events.",
    explain: [
      {
        heading: "The function",
        body: "Here is a version in Python:\n\nfrom bisect import bisect_right\n\ndef as_of_join(events, features, ttl):\n    by_entity = {}\n    for entity, ts, value in features:\n        by_entity.setdefault(entity, []).append((ts, value))\n    times = {}\n    for entity, rows in by_entity.items():\n        rows.sort(key=lambda r: r[0])\n        times[entity] = [r[0] for r in rows]\n    out = []\n    for entity, ts, _label in events:\n        rows = by_entity.get(entity)\n        if not rows:\n            out.append(None)\n            continue\n        i = bisect_right(times[entity], ts) - 1\n        if i < 0 or ts - rows[i][0] > ttl:\n            out.append(None)\n        else:\n            out.append(rows[i][1])\n    return out\n\nIt builds lists of its own, so it does not change the inputs, and sorting is done inside so the caller need not pre-sort. bisect_right returns the position after any equal timestamps, so minus one lands on the last feature at or before the event. Sorting costs O(m log m) and each event costs O(log m), so O((n + m) log m) overall. The result is a list of feature values in the same order as the events.",
      },
      {
        heading: "Test it with a small case",
        body: "Features: c1 has 0.20 from day 0, 0.35 from day 30 and 0.90 from day 60. c2 has 0.10 from day 0 and 0.15 from day 45. Use ttl = 35. Event (c1, 45) gets 0.35, because the latest known value is from day 30, 15 days old. Event (c1, 75) gets 0.90, from day 60. Event (c2, 20) gets 0.10, 20 days old. Event (c2, 100) gets None, because the day 45 value is 55 days old and 55 is more than 35. Event (c3, 10) gets None, since c3 has no features. Event (c1, 30) gets 0.35: a value stamped at the same time as the event counts, with an age of 0. I ran the code above on these cases and it returns exactly those values. A naive join on the latest value would give 0.90 to the event at day 45. That is leakage: the model learns from a number that did not exist yet, looks excellent offline and fails live.",
      },
      {
        heading: "Edge cases to decide deliberately",
        body: "Ties and boundaries: whether a feature stamped at the same time as the event is allowed depends on whether it was computed from data that includes the event's own outcome. If it was, use a strict inequality (feature time < event time). The TTL is measured from the event's timestamp, not from today. Unsorted input is handled by sorting, and the input is not mutated. Late corrections: a value backfilled after the event should not be used as if it had been known then. Also filter on a created or ingested timestamp (many feature stores support this) and record which version a model would have seen.",
      },
      {
        heading: "For production-sized data",
        body: "Do not run a Python loop over billions of rows. Use an as-of join in the engine: pandas merge_asof with a tolerance and by the entity key, a SQL or Spark ASOF or range join partitioned by entity, or the feature store's own point-in-time retrieval. Test it against the simple version above on a sample. Add a leakage test that plants a future value and asserts it never appears in the output. And keep the TTL and blank-handling policy identical at serving: the online store returns the latest value, and the model must see the same meaning of missing that it trained on.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "Day 0", detail: "c1 = 0.20 and c2 = 0.10 are recorded." },
        { label: "Day 20", detail: "Event (c2, 20) gets 0.10, which is 20 days old and inside the 35-day ttl." },
        { label: "Day 30", detail: "c1 becomes 0.35. Event (c1, 30) gets 0.35, a value from the same day, age 0." },
        { label: "Day 45", detail: "c2 becomes 0.15. Event (c1, 45) gets 0.35, not 0.90, because 0.90 does not exist yet." },
        { label: "Day 60", detail: "c1 becomes 0.90." },
        { label: "Day 75", detail: "Event (c1, 75) gets 0.90, 15 days old." },
        { label: "Day 100", detail: "Event (c2, 100) gets None: the latest c2 value is from day 45, 55 days old, more than ttl 35." },
      ],
      caption: "Each event sees only what was known at its own time, and values older than ttl turn into None.",
    },
    example: {
      title: "Example: the test table, ttl = 35 days",
      text: "Run on the features above. The age is the event day minus the day of the latest feature value known at that time. The result is None when there is no value or the age is more than 35.",
      rows: [
        { label: "(c1, 45)", value: "latest is day 30, age 15, result 0.35" },
        { label: "(c1, 75)", value: "latest is day 60, age 15, result 0.90" },
        { label: "(c2, 20)", value: "latest is day 0, age 20, result 0.10" },
        { label: "(c2, 100)", value: "latest is day 45, age 55, result None" },
        { label: "(c3, 10)", value: "no features for c3, result None" },
        { label: "(c1, 30)", value: "latest is day 30, age 0, result 0.35" },
      ],
    },
    followUps: [
      {
        q: "Why must the TTL and missing-value policy match what happens at serving time?",
        a: "Otherwise it is training-serving skew: the model trained on one meaning of blank and is served another. The fix is one definition shared by both paths and logging the features used at serving.",
      },
      {
        q: "You have 500 million events and 2 billion feature rows. How do you run this?",
        a: "Partition by entity, sort by time within each partition, and use an as-of or range join or a window function rather than a cross join, or use the feature store's retrieval. Test the result on a sample against the simple version.",
      },
      {
        q: "A feature was recomputed in March with corrected values for January. What do you do?",
        a: "Decide which version the live model would have seen. Use the ingested timestamp to exclude later corrections when reproducing live behaviour, and document the choice.",
      },
    ],
    mistakes: [
      "Joining on the entity only, or using today's feature table, which leaks the future.",
      "Never checking that the returned feature timestamp is not after the event.",
      "Having no test that plants a future value and asserts it never appears.",
      "Mutating the input, or assuming it is sorted, without saying so.",
    ],
  },
};
