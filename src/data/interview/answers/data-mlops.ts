import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'de-late-events-watermarks-and-streaming-features': {
    short:
      "Event time is when something happened, and processing time is when your system saw it. A window such as “purchases in the last 10 minutes” must use event time, or network delays change the answer. A watermark is the system’s estimate that no older events are still on their way, so the window can close, and you choose how long to wait from the measured lateness of your own events, trading completeness against speed. If training later rebuilds the feature from complete data while the live feature closed its window early, the model trains on values it never sees in production.",
    explain: [
      {
        heading: "Two clocks",
        body: "Say a phone records a purchase at 12:00:00, loses signal, and uploads it at 12:04:10. Event time is 12:00:00. Processing time is 12:04:10. If you count “the last 10 minutes” by processing time, a slow network changes which purchases count, and results change from run to run. Windows should be defined on event time.",
      },
      {
        heading: "Watermarks and how long to wait",
        body: "Because events can arrive late, the system needs a rule for when a window is finished. A watermark is its estimate that no event older than some time will still arrive. Waiting longer gives a more complete result and waiting less gives a faster one, and the right setting is a product decision. Set it from the measured distribution of lateness, not from a guess, and keep watching the lateness percentiles over time. Events later than the watermark need a policy: drop them and count them, send them to a side output, or correct the result afterwards with a batch job.",
      },
      {
        heading: "Duplicates",
        body: "Many delivery systems are at-least-once: a retry can deliver the same event twice. Give every event a unique ID and remove repeats within a bounded window. Claims of exactly-once processing depend on the whole pipeline, including where results are written.",
      },
      {
        heading: "Why training and serving can disagree",
        body: "Training features are usually built later from complete data, so they include the late events. The live feature closed its window earlier and missed them. The model then sees different numbers in production than it learned from, which is called training-serving skew. Two fixes: log the live feature values and train on those, or replay the same streaming logic over historical data. For fraud you may also choose to act on partial data quickly and update the feature as late events arrive, and you should test that against what the model needs.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "Minutes waited after the window ends",
      yLabel: "Events that have arrived (%)",
      points: [
        [0, 0],
        [1, 92.2],
        [2, 96.8],
        [5, 97.1],
        [10, 97.2],
        [15, 97.4],
        [20, 97.5],
        [30, 97.7],
        [45, 98.1],
        [60, 98.5],
      ],
      marks: [
        { x: 10, label: "10 minute wait: 97.2%" },
        { x: 60, label: "60 minute wait: 98.5%" },
      ],
      caption: "Example lateness: most events arrive within seconds, but a few phones come back hours later. After the first minutes, waiting longer buys very little.",
    },
    example: {
      title: "Example: what a 10 minute watermark misses",
      text: "Suppose 5 million events arrive per hour. In this invented example 97% arrive within a minute or so, and 3% come from phones that were offline and arrive anywhere from 1 minute to 2 hours late. Real lateness has its own shape, so measure yours. The point is the method: read the share beyond the watermark off the curve, then multiply by your volume.",
      rows: [
        { label: "Arrived within 10 minutes", value: "97.2%" },
        { label: "Later than a 10 minute watermark", value: "2.8%, about 139,000 events an hour" },
        { label: "Later than a 60 minute watermark", value: "1.5%, about 75,600 events an hour" },
        { label: "Cost of the 60 minute wait", value: "a 10 minute feature that is an hour old" },
      ],
    },
    followUps: [
      {
        q: "Some fraud-relevant events arrive two hours late. Do you raise the watermark to two hours?",
        a: "Not for every feature, because that delays every result. Keep a short watermark for the live feature and add a slower correction path for late data, or a second feature that reflects it. Decide from the cost of delay against the cost of missed events.",
      },
      {
        q: "You find the live feature is on average 2% lower than the training one. How do you confirm lateness is the cause?",
        a: "Log the live feature values and compare them example by example with the recomputed value, split by how late each event was. Check the share of events beyond the watermark, and rule out code and unit differences too.",
      },
      {
        q: "Why not just process events as they arrive, in order, and avoid watermarks?",
        a: "Arrival order is not event order. Without event-time handling the windows depend on network behaviour and results change between runs. A watermark makes the completeness trade-off explicit.",
      },
    ],
    mistakes: [
      "Putting windows on processing time and not seeing the problem.",
      "Picking a watermark with no data on how late events really are.",
      "Assuming the stream has no duplicates.",
      "Not noticing that training and serving see different data.",
    ],
  },
};
