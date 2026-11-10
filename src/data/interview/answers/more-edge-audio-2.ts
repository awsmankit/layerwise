import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'npu-speedup-lower-than-promised-operator-fallback': {
    short:
      "An NPU that is 10 times faster only speeds up the operators it supports, and here those are 90% of the CPU time, so 10 times was never on offer. The 9.7 ms is made of 3.0 ms of unsupported operators on the CPU, 2.7 ms on the NPU and 4.0 ms of copying between 4 partitions. Look at the partitions with the runtime's profiler, then move the unsupported operators to the ends of the graph, swap or rewrite them, and only then think about custom kernels or another chip.",
    explain: [
      {
        heading: "Who runs which part of the model",
        body: "A model passes through layers: the framework you trained in, a model file, a runtime that loads the file, and an accelerator back end that does the fast maths. That back end is called a delegate in TensorFlow Lite, an execution provider in ONNX Runtime and a compute unit in Core ML, but the idea is the same. At load time the runtime walks the graph and hands the back end every connected subgraph (a partition) whose operators it supports. Everything else falls back to the CPU. Fallback keeps the model working, which is why nothing crashes, but it can quietly cost most of the speed-up.",
      },
      {
        heading: "Reproducing the 9.7 ms and finding the ceiling",
        body: "Start from the CPU-only time of 30 ms. Unsupported operators (layer norm, softmax, GELU) are 10% of it, so they still take 0.10 x 30 = 3.0 ms on the CPU. The supported 27 ms runs 10 times faster, 27 / 10 = 2.7 ms. Each of the 4 partitions needs one transfer in and one out, 4 x 2 x 0.5 = 4.0 ms. The total is 3.0 + 2.7 + 4.0 = 9.7 ms, and 30 / 9.7 = 3.1 times faster, not 10. Even with free transfers the floor is 3.0 + 2.7 = 5.7 ms, so the ceiling is 30 / 5.7 = 5.3 times. This is Amdahl's law: the part you cannot speed up sets the limit. The transfers are the extra loss, caused by unsupported operators sitting in the middle of the graph and cutting it into pieces.",
      },
      {
        heading: "What to change, cheapest first",
        body: "First, measure: use the runtime's profiler or partition dump to see which operators fell back and how many partitions exist, instead of guessing. Also check quantisation, because some accelerators only run quantised models, so a float operator inside a quantised graph may be a fallback and not merely slow. Then, in rough order of cost: move the boundary so unsupported operators sit at the start or the end of the graph, which leaves one partition, 3.0 + 2.7 + 1.0 = 6.7 ms, about 4.5 times faster. Next, swap an operator for a supported one (for example a different activation) and re-check accuracy. Next, fuse or rewrite it from supported operators. Writing a custom kernel works but you now own it for every chip and version. Changing the runtime or the chip is the last resort.",
      },
      {
        heading: "How to avoid the surprise next time",
        body: "Before committing to an architecture, check its operators against the converter's and the accelerator's supported list. Pin the versions of the converter and the runtime, because support changes between releases. After every conversion, check parity: run fixed representative inputs through the source and the converted model and compare the outputs and the task metric, not one example. Measure latency on the actual device, since a desktop run says little about transfers and partitions.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: 'ms for one inference',
      items: [
        { label: "CPU only", value: 30, note: "the starting point" },
        { label: "NPU, 4 partitions", value: 9.7, note: "what was measured", hot: true },
        { label: "NPU, 1 partition", value: 6.7, note: "unsupported operators moved to the ends" },
        { label: "Ceiling, free transfers", value: 5.7, note: "3.0 CPU + 2.7 NPU" },
      ],
      caption: "The same model four ways. The gap between 9.7 and 5.7 ms is pure copying between partitions.",
    },
    example: {
      title: "Example: where the 9.7 ms goes",
      text: "All numbers are the example figures from the question. The speed-up is the CPU-only time divided by the new time.",
      rows: [
        { label: "Unsupported operators on the CPU", value: "10% of 30 ms = 3.0 ms" },
        { label: "Supported operators on the NPU", value: "27 ms / 10 = 2.7 ms" },
        { label: "Transfers, 4 partitions", value: "4 x 2 x 0.5 ms = 4.0 ms" },
        { label: "Total and speed-up", value: "9.7 ms, 30 / 9.7 = 3.1 times" },
        { label: "Ceiling with free transfers", value: "30 / 5.7 = 5.3 times" },
        { label: "One partition instead of four", value: "3.0 + 2.7 + 1.0 = 6.7 ms, 30 / 6.7 = 4.5 times" },
      ],
    },
    followUps: [
      {
        q: "On this board each transfer is really 1.5 ms. What happens?",
        a: "The total becomes 5.7 + 8 x 1.5 = 17.7 ms, only 1.7 times faster. With 4 partitions the break-even is (30 - 5.7) / 8, about 3.04 ms per transfer, and above that delegating loses to the CPU alone, so rewrite the graph or delegate fewer parts.",
      },
      {
        q: "Compile ahead of time or on the device?",
        a: "Ahead-of-time compiling suits large models on a known chip, with lower start-up cost and memory. On-device compiling suits small models and wide distribution but costs more on the first run. Either way you get one artefact per chip family and a test matrix to match.",
      },
      {
        q: "How do you know the converted model is still correct?",
        a: "Run fixed representative inputs through both models. For a quantised model, compare the task metric against a tolerance you can defend, count the partitions, and repeat after any version change.",
      },
    ],
    mistakes: [
      "Blaming the hardware without looking at the partitions first.",
      "Trusting the vendor's 10 times figure for the whole model when it applies only to the supported operators.",
      "Forgetting that every partition boundary costs a transfer in and out.",
      "Checking only the final output of one input after conversion.",
    ],
  },

  'wer-looks-fine-users-complain': {
    short:
      "Word error rate (WER) counts every wrong word equally, so 'fifty' for 'fifteen' costs the same as 'a' for 'the', and the metric cannot see that one of those could harm a patient. Before trusting 8% against 9%, check that both were scored with the same normaliser, that the gap is bigger than the noise on a test set that resembles production, and how each vendor does on the words that matter. Then measure several things: normalised WER, key-term accuracy, results by group, behaviour on silence, and latency.",
    explain: [
      {
        heading: "What WER really counts",
        body: "WER = (substitutions + deletions + insertions) / words in the reference, where the counts come from the minimum edit alignment between the reference and the recogniser's text. It can pass 100% if the recogniser adds many words, it is undefined when the reference is empty, and every word weighs the same. 'Take fifteen milligrams' heard as 'take fifty milligrams' is 1 error in 3 words, the same score as dropping 'the', yet the clinic sees a dose more than three times too large. So the number is a fair summary of typing effort and a poor summary of harm.",
      },
      {
        heading: "Normalisation and pooling change the score",
        body: "Lower-casing, punctuation, numbers ('5' versus 'five') and contractions all change WER. If the reference says 'take five milligrams' and the recogniser writes 'take 5 milligrams', an unnormalised score is 1 error in 3 words, 33%, for a perfectly correct transcript. Apply the same published normaliser to the reference and to every vendor's output, never to one side only. Also decide how to combine utterances. A 2-word utterance with 1 error (50%) and a 98-word utterance with 2 errors (2.04%) average to (50% + 2.04%) / 2, about 26%, but pooled it is 3 / 100 = 3%. Pooled is usually what you mean, and it stops tiny utterances from dominating.",
      },
      {
        heading: "Is 8% versus 9% even real",
        body: "Score both vendors on the same utterances and compare them as pairs, then put a bootstrap interval around the difference (resample utterances, recompute, repeat). As a rough feel, on 10,000 independent words the standard error of an 8% rate is sqrt(0.08 x 0.92 / 10,000) = 0.27 points, so a 1-point gap is about 2.5 standard errors if the words were independent. They are not: words within an utterance and speaker are correlated, so the true uncertainty is wider. Pick the smallest gap that would change your decision first, and size the test set for it. The set itself must look like production: accents, noise, devices, and silence.",
      },
      {
        heading: "Measure what the users feel",
        body: "Break the results down by speaker group, accent, noise level and device. One 2020 study of five commercial systems found markedly higher average error for Black speakers than for white speakers, so an average can hide a group. Score the terms that matter (drug names, doses, numbers, commands) separately as key-term accuracy. Count invented text on silent clips directly as inserted words, since WER is undefined there. Check the metric against human ratings on a few dozen examples to see whether support staff and WER agree. Report several measures together: normalised WER, character error rate, key-term accuracy, group results, latency and behaviour on silence.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: '% word error rate',
      items: [
        { label: "Averaged per utterance", value: 26.02, note: "(50% + 2.04%) / 2", hot: true },
        { label: "Pooled over all words", value: 3, note: "3 errors / 100 words" },
        { label: "5 vs five, unnormalised", value: 33.3, note: "1 error in 3 words" },
        { label: "5 vs five, normalised", value: 0, note: "same text after normalising" },
      ],
      caption: "Same transcripts, different scoring choices. Bars show why the scoring rules must be fixed before comparing vendors.",
    },
    example: {
      title: "Example: scoring one sentence by hand",
      text: "Reference: 'she sells sea shells by the sea shore every day' (10 words). Recogniser: 'she sells see shells by the shore every day today' (10 words). Align them and count.",
      rows: [
        { label: "Substitution", value: "sea became see: 1" },
        { label: "Deletion", value: "the second 'sea' is missing: 1" },
        { label: "Insertion", value: "'today' added at the end: 1" },
        { label: "WER", value: "(1 + 1 + 1) / 10 = 0.30, or 30%" },
        { label: "Dose example", value: "'fifteen' to 'fifty' in a 3-word line: 1 / 3 = 33%, but the dose is wrong by 35 mg" },
      ],
    },
    followUps: [
      {
        q: "Reference 'she sells sea shells by the sea shore every day', hypothesis 'she sells see shells by the shore every day today'. What is the WER?",
        a: "One substitution (sea to see), one deletion (a 'sea') and one insertion (today), so 3 / 10 = 0.30. When alignments tie, the split between substitutions, deletions and insertions can differ while the total stays the same.",
      },
      {
        q: "How big a test set do you need to separate 8% from 9%?",
        a: "On 10,000 independent words the standard error of an 8% rate is about 0.27 points, but words cluster by utterance and speaker, so the real error is wider and a paired comparison helps. Decide the smallest gap that would change the decision first, then size the set for it.",
      },
      {
        q: "Why is an empty reference a problem for WER?",
        a: "The denominator is zero. Count insertions on silent audio directly, or treat empty against empty as zero error, and report invented text as a separate number.",
      },
    ],
    mistakes: [
      "Choosing a vendor on a one-point WER gap with no interval.",
      "Comparing scores that were produced with different normalisers, or normalising only one side.",
      "Averaging per-utterance rates and calling the result WER.",
      "Ignoring errors on the words the product depends on, such as doses, names and numbers.",
    ],
  },

  'code-affine-int8-quantise-and-error-bound': {
    short:
      "Affine int8 quantisation maps a float range onto 256 integer levels with q = round(x / scale) + zero point, where scale = (max - min) / 255, and dequantises with (q - zero point) x scale. For values inside the range the rounding error is at most half a step, scale / 2. For the range -0.5 to 2.0 that is 0.0049, and one outlier at 20.0 makes the step about 8 times coarser, so the bound rises to 0.040.",
    explain: [
      {
        heading: "The scheme, step by step",
        body: "Quantisation stores each float as a small integer plus two shared numbers. The scale is the size of one integer step in real units. The zero point is the integer that stands for real 0. With int8 there are 256 levels (-128 to 127), so scale = (max - min) / 255 and zero point = round(-128 - min / scale). To quantise, compute q = round(x / scale) + zero point and clamp it to -128..127 so out-of-range values saturate instead of wrapping around. To dequantise, real = (q - zero point) x scale. Before computing the scale, widen the range to include 0 (min = min(min, 0), max = max(max, 0)), so that real 0 maps exactly to an integer. That matters for padding and ReLU, which produce exact zeros all the time.",
      },
      {
        heading: "The worked numbers and the error bound",
        body: "Range -0.5 to 2.0: scale = 2.5 / 255 = 0.0098 and zero point = round(-128 + 0.5 / 0.0098) = round(-128 + 51) = -77. The inputs 0.3, 1.2, -0.4, 0.9 become -46, 45, -118, 15 and dequantise to 0.3039, 1.1961, -0.4020, 0.9020. The errors are 0.0039, 0.0039, 0.0020 and 0.0020. Rounding moves a value by at most half a step, so inside the range the error is at most scale / 2 = 0.0049, and the largest error here is 0.0039, under the bound. Outside the range values are clipped to the edge, so the error is not bounded by scale / 2 and can be as large as the distance beyond the edge.",
      },
      {
        heading: "What one outlier does",
        body: "If a single value of 20.0 sets the range to -0.5 to 20.0, then scale = 20.5 / 255 = 0.0804, about 8.2 times coarser, and the zero point becomes -122. The worst-case rounding error is now 0.0804 / 2 = 0.040 instead of 0.0049. The same four values land on much coarser steps: they dequantise to 0.3216, 1.2059, -0.4020, 0.8843, with errors up to 0.0216 on this sample. In practice the range comes from a calibration set of real, difficult inputs, weights usually get one scale per channel because channels differ widely, and outliers are handled with a percentile range or clipping. That trades rounding error for clipping error, and the task metric on a hard set decides which side wins.",
      },
      {
        heading: "How to test the function",
        body: "Write four checks. A round trip stays within scale / 2 for values inside the range. Order is preserved: if x1 < x2 then q1 <= q2. Zero maps to the zero point and back to exactly 0.0. A constant tensor (min equals max) must not divide by zero, so use a small minimum range or a scale of 1. Add a clamp test with a value outside the range to confirm it saturates at -128 or 127.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: 'largest value in the range',
      yLabel: 'step size (scale)',
      points: [[2, 0.0098], [5, 0.0216], [10, 0.0412], [20, 0.0804]],
      marks: [{ x: 2, label: "Range -0.5 to 2.0" }, { x: 20, label: "One outlier at 20.0" }],
      caption: "The minimum stays at -0.5. Every bigger maximum makes the integer steps coarser, so everything else is stored less precisely.",
    },
    example: {
      title: "Example: quantising 0.3, 1.2, -0.4 and 0.9",
      text: "Python's round() sends exact halves to the nearest even number, while many chips round halves away from zero, so on exact ties results can differ by one step. None of these values is an exact tie.",
      rows: [
        { label: "Scale, range -0.5 to 2.0", value: "2.5 / 255 = 0.0098" },
        { label: "Zero point", value: "round(-128 + 0.5 / 0.0098) = -77" },
        { label: "Integers", value: "-46, 45, -118, 15" },
        { label: "Back to floats", value: "0.3039, 1.1961, -0.4020, 0.9020" },
        { label: "Worst error here, and the bound", value: "0.0039 observed, 0.0049 allowed" },
        { label: "Scale, range -0.5 to 20.0", value: "20.5 / 255 = 0.0804, about 8.2 times coarser" },
        { label: "Worst-case error bound", value: "0.0804 / 2 = 0.040 (0.0216 seen on these four)" },
      ],
    },
    followUps: [
      {
        q: "Weights are usually quantised symmetrically with a zero point of 0 while activations use a zero point. Why?",
        a: "A zero point of 0 for weights makes the integer multiply-accumulate cheaper because no cross term has to be corrected afterwards. Activations are often one-sided or skewed, so an offset uses the 256 levels better.",
      },
      {
        q: "Python's round sends 0.5 to 0 and 2.5 to 2. Does it matter?",
        a: "It rounds half to even, while many chips round half away from zero. The difference is at most one step on exact ties, but it is one reason results differ across runtimes, so test on the target.",
      },
      {
        q: "How would you choose between min/max and a percentile range?",
        a: "Compare the task metric on a hard calibration set. Min/max never clips but wastes resolution when an outlier dominates, percentiles clip rare large values, and sensitive layers may stay in higher precision.",
      },
    ],
    mistakes: [
      "Computing the scale from the data but forgetting that zero must be exactly representable.",
      "Not clamping, so values beyond the range wrap around instead of saturating.",
      "Claiming the rounding error is always below scale / 2, including for values outside the range.",
      "Treating the min and max of a tiny, clean calibration set as safe.",
    ],
  },

  'code-ctc-collapse-and-greedy-vs-beam': {
    short:
      "CTC collapse walks the frames, emits a symbol only when it is not blank and differs from the previous frame's symbol, so repeats merge and blanks vanish. Greedy decoding takes the best symbol in each frame and then collapses, which finds the best path, not the best text. In the three-frame example the best path is blank-blank-blank, an empty text with probability 0.216, while the text 'a' has probability 0.688. CTC needs no alignment labels because training adds up the probability of every path that collapses to the right text.",
    explain: [
      {
        heading: "The collapse rule and greedy decoding",
        body: "A CTC model outputs, for each audio frame, a probability for every symbol plus a special blank that means 'nothing new here'. A path is one symbol per frame. To turn a path into text, first merge neighbouring repeats, then drop blanks. In code: loop over the frames, keep the previous symbol (blanks included in that comparison), and emit the current symbol only if it is not blank and differs from the previous one. The order matters. 'l _ l' keeps two l's because the blank separates them, while 'l l' merges into one. Dropping blanks first would join the two l's of 'hello' and give 'helo'. Greedy decoding takes the arg-max symbol in each frame (cost T frames x V symbols) and collapses the result.",
      },
      {
        heading: "Why greedy can return the wrong text",
        body: "A text can be written by many paths, and its probability is the sum over all of them. Take 3 frames, each with P(blank) = 0.6 and P(a) = 0.4. Greedy picks blank in every frame, so it returns the empty text, whose only path has probability 0.6 x 0.6 x 0.6 = 0.216. But the text 'a' is produced by a__, _a_, __a, aa_, _aa and aaa. The first three have probability 0.4 x 0.6 x 0.6 = 0.144 each, the next two 0.4 x 0.4 x 0.6 = 0.096 each, and aaa has 0.064: 3 x 0.144 + 2 x 0.096 + 0.064 = 0.688. The text 'aa' comes only from a_a: 0.096. The totals 0.216 + 0.688 + 0.096 = 1.0, so the most probable text is 'a' at 0.688, yet greedy returns an empty one at 0.216.",
      },
      {
        heading: "Why no alignment labels are needed",
        body: "Speech runs at about 100 frames a second but a person says only a few letters a second, and nobody has marked which frame holds which letter. CTC sidesteps that: the probability of the target text is the sum over all paths that collapse to it, and dynamic programming computes that sum efficiently, so training maximises it directly. For 'cat' over 10 frames with the symbols blank, c, a, t there are 1,716 such paths, a count you can confirm by enumeration. Better decoding is prefix beam search. It keeps candidate texts, not paths, and for each text stores two totals: paths ending in a blank and paths ending in a letter, because a repeated letter can start a new character only after a blank. A wider beam costs more and gets closer to the true best text, and a language model score is usually added.",
      },
      {
        heading: "Testing and where CTC sits",
        body: "Test the beam search against brute-force enumeration on small random matrices, and check that the text probabilities add up to 1. CTC streams easily because outputs are frame by frame, but each frame is decided independently, so it leans on an outside language model. Attention encoder-decoders such as Whisper read a window of audio at a time, and transducers add a network over the text so far, which also streams.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'frames', label: "Frame outputs", sub: "one probability row per frame" },
        { id: 'pick', label: "Best symbol per frame", sub: "greedy: arg-max, or keep a beam" },
        { id: 'merge', label: "Merge repeats", sub: "l l becomes l, l _ l stays" },
        { id: 'drop', label: "Drop blanks", sub: "after merging, never before" },
        { id: 'text', label: "Text", sub: "hello" },
      ],
      highlight: ['merge', 'drop'],
      caption: "The order of the two middle steps is the whole trick: merge first, then drop blanks.",
    },
    example: {
      title: "Example: all eight paths over three frames",
      text: "Each frame has P(blank) = 0.6 and P(a) = 0.4. Each path's probability is the product over its three frames, and a text's probability is the sum of the paths that collapse to it. A scratch script confirms the totals.",
      rows: [
        { label: "Greedy path ___", value: "text empty, 0.6 x 0.6 x 0.6 = 0.216" },
        { label: "Text 'a' (a__, _a_, __a)", value: "3 x 0.144 = 0.432" },
        { label: "Text 'a' (aa_, _aa)", value: "2 x 0.096 = 0.192" },
        { label: "Text 'a' (aaa)", value: "0.064, so 'a' totals 0.688" },
        { label: "Text 'aa' (a_a)", value: "0.4 x 0.6 x 0.4 = 0.096" },
        { label: "Check", value: "0.216 + 0.688 + 0.096 = 1.000" },
      ],
    },
    followUps: [
      {
        q: "Why does 'l _ l' decode differently from 'l l'?",
        a: "The blank separates two letters so both survive, while adjacent identical symbols merge into one. That is how CTC can spell double letters at all.",
      },
      {
        q: "How would you add a language model to the beam search?",
        a: "Add a weighted language-model log probability whenever a prefix is extended by a completed word or character, with a length bonus, and tune the weights on a development set. It matters more for CTC than for other families, because CTC frames are decided independently.",
      },
      {
        q: "What does a beam of 8 cost compared with greedy, and when is greedy fine?",
        a: "Roughly 8 times the work per frame plus the bookkeeping for merging prefixes. Greedy is often good enough when the model is confident, and the beam matters when frames are ambiguous.",
      },
    ],
    mistakes: [
      "Dropping blanks before merging repeats, which turns 'hello' into 'helo'.",
      "Claiming greedy decoding returns the most probable text, when it returns the most probable path.",
      "Comparing texts by the probability of a single path instead of adding up every path that collapses to them.",
    ],
  },

  'on-device-is-not-automatically-private': {
    short:
      "Running the speech model on the device is a real privacy win, because raw audio does not have to travel to a provider and the feature can work offline. It is not a reason to skip a review: logs, crash reports, backups, analytics, shared outputs, lost devices and any telemetry the team adds can still expose people. Write down what is collected, why, how long it is kept and who can see it, and monitor the fleet with counters and histograms instead of audio.",
    explain: [
      {
        heading: "What on-device processing does protect",
        body: "When the model runs locally there is no network path for the audio, so no provider receives it, no server breach can leak it, and the feature works with no connection. That is a good default and worth saying out loud in the review. But it removes only one risk, the network path for the raw audio. Privacy is about the whole life of the data: what is produced, where it is stored, and who can read it.",
      },
      {
        heading: "What is left to review",
        body: "Several leaks survive. App logs and crash reports can contain transcripts. Device backups may copy the transcript store to a cloud account. Analytics and debug builds, often added late, can send content. A transcript the user shares leaves the device by choice. A lost or sold phone still holds its data, so storage needs to be encrypted. Other apps may hold permissions that reach the same data. An on-device assistant that reads untrusted text, such as message previews, can be steered by instructions hidden in that text (prompt injection), so give it a permission boundary in code and ask before consequential actions. Treat data minimisation as engineering: for each field, write down the purpose, retention and who can see it, and drop any field that cannot justify itself. This is a design input, not legal advice, so check the requirements for each market with privacy counsel.",
      },
      {
        heading: "Fleet health without raw audio",
        body: "You still need to know whether the model works across thousands of phones. Send counters and histograms labelled with model version and device class: inference counts, latency buckets, memory high-water mark, out-of-memory and thermal events, fallback rate, and output statistics such as a confidence histogram. Add signals that need no content, such as how often users undo or retry. The size difference is large: one hour of 16 kHz 16-bit mono audio is 32,000 bytes x 3,600 s = 115.2 MB, while a daily report of 40 counters at 4 bytes each is 160 bytes, about 720,000 times smaller. Set a minimum cohort size before showing a slice, so that a slice of three devices identifies no one.",
      },
      {
        heading: "Stronger tools, and their limits",
        body: "Local differential privacy adds noise on the device, so the server learns population figures without trusting any one report. Example: each device answers 'yes' truthfully with probability 1/2, otherwise flips a fair coin. If 10% truly have the event, 0.5 x 0.10 + 0.25 = 30% report yes, and the server estimates 2 x (0.30 - 0.25) = 10%. With 10,000 devices the estimate is good to about 0.9 points, with 20 devices about 20 points, which is why small cohorts are useless. Federated learning keeps raw data on the device and shares model updates, but updates computed from private data can leak, and gradients have been inverted in research settings. Secure aggregation and differential privacy address that, at a cost in accuracy or bandwidth. Neither is a guarantee on its own. Finally, plan consent and deletion: opt in for anything beyond essential health data, an easy way to turn it off, and a record of which data trained which model version.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Risk", "Removed by on-device?", "What you still do"],
      rows: [
        { label: "Raw audio sent to a provider", cells: ["Audio reaches a server you do not control", "Yes", "Say so in the review"] },
        { label: "Logs, crash reports, backups", cells: ["Transcripts can sit in them", "No", "Strip content, review what is backed up"] },
        { label: "Telemetry added later", cells: ["Content can slip in", "No", "Counters and histograms, minimum cohort size"] },
        { label: "Lost or sold device", cells: ["Data still on the phone", "No", "Encrypt storage, allow remote wipe"] },
        { label: "Assistant reading untrusted text", cells: ["Hidden instructions steer it", "No", "Permission boundary, confirm risky actions"] },
      ],
      caption: "On-device removes one row. The other rows are why the review still happens.",
    },
    example: {
      title: "Example: counting a rate without collecting the events",
      text: "Local differential privacy by randomised response, with example numbers. Each device tells the truth with probability 1/2 and otherwise answers with a fair coin flip, so no single answer proves anything about its owner.",
      rows: [
        { label: "True rate (example)", value: "10% of devices had the event" },
        { label: "Share that reports yes", value: "0.5 x 0.10 + 0.25 = 30%" },
        { label: "Server's estimate", value: "2 x (0.30 - 0.25) = 10%" },
        { label: "Privacy parameter", value: "epsilon = ln(0.75 / 0.25) = ln 3, about 1.1" },
        { label: "Accuracy at 10,000 devices", value: "about 0.9 points either way" },
        { label: "Accuracy at 20 devices", value: "about 20 points, too noisy to use" },
      ],
    },
    followUps: [
      {
        q: "A tester wants to upload 30 failing audio clips to debug a bad model. How do you allow it?",
        a: "Ask for explicit, informed opt-in for each capture, keep the clips briefly, restrict who can open them and record each use. Prefer on-device analysis or a synthetic reproduction first.",
      },
      {
        q: "Does federated learning mean the server cannot learn anything about a user?",
        a: "No, because updates and gradients can be inverted in research settings. Secure aggregation reduces what the server sees and differential privacy bounds one person's influence, and each has a cost, so it is data minimisation and not a guarantee.",
      },
      {
        q: "The on-device assistant reads message previews. What new risk appears?",
        a: "Untrusted text can carry instructions that steer the model. Limit what the assistant can do with a permission boundary in code, and ask the user to confirm consequential actions.",
      },
    ],
    mistakes: [
      "Saying on-device means no privacy risk and no review.",
      "Collecting raw audio for monitoring because it is the easiest thing to build.",
      "Treating federated learning or differential privacy as a complete guarantee.",
      "Stating legal conclusions with certainty instead of involving privacy specialists.",
    ],
  },

  'monitor-a-silent-regression-on-older-devices': {
    short:
      "A fleet-wide average can hide a harmed slice, so first re-cut every existing metric by model version and device class and compare against the previous version on the same class. Then use signals that need no raw audio (memory and timeout counts, output histograms, undo and retry rates), form hypotheses such as memory eviction or a different quantised kernel, and reproduce on a real older device. A canary that would have caught it needs about 4,167 devices if sampled at random, or a deliberate sample of each device class.",
    explain: [
      {
        heading: "Start by slicing what you already have",
        body: "Crash and latency dashboards look normal because 92% of the fleet is fine and an 8% class is averaged into it. Re-cut every existing metric by model version and device class, and compare the new version with the old one on the same class, not with the whole fleet. Then list signals that need no raw data, and what each misses: out-of-memory, timeout and thermal counts (they miss silent wrong answers); latency percentiles (a model can be fast and wrong); output histograms and fallback rate (they show change, not which side is correct); undo, edit and retry rates (slow and noisy); input statistics for drift; and fixed test inputs run on the device at install, which catch many kernel and memory problems directly.",
      },
      {
        heading: "Hypotheses and reproduction",
        body: "For a low-memory class, three causes are likely. The new model needs more memory and is evicted or pushed to the CPU. A different kernel path gives different quantised results on that chip. Thermal throttling slows the recogniser until commands are missed. Test each with its counter and with a lab unit of that class running the exact artefact. A golden-input parity test shows whether the old-class outputs differ from those of the same model on a reference device. Roll back as a new, higher version if needed, add a regression test with cases for that device class, and keep the previous model on the device until the new one has proved itself.",
      },
      {
        heading: "Sizing the canary that would have shown it",
        body: "To expect k failures from a class with share s of the fleet and failure rate p, you need about k / (s x p) devices when sampling at random. For s = 8% and p = 3%, ten failures need 10 / 0.0024 = 4,167 devices. A random 2,000-device canary puts about 2,000 x 0.08 = 160 devices in the class and expects only 160 x 0.03 = 4.8 failures. Against a background of, say, 0.5% (example), that is 0.8 failures, and a halt rule of 5 would fire with probability 52% if the harm is real and 0.14% if not, a coin flip. Filling the canary evenly instead, say 500 devices in each of 4 classes (example), gives 500 x 0.03 = 15 expected failures in the harmed class against 2.5 from background, and a halt at 10 failures fires 93% of the time if harmed and 0.03% if healthy.",
      },
      {
        heading: "Controls to add",
        body: "Judge each device class on its own with a minimum cohort size, widen in stages, and write the halt rule with three parts: a threshold, a count of devices reporting, and the per-class slice. Expect more false halts when slices are small and noisy. Remember what clean results mean: zero failures in n devices only bounds the rate near 3 / n, so 1,000 clean devices rule out roughly a 0.3% failure rate, not a small harm. A clean canary is evidence, never proof.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "Re-cut the metrics", detail: "By model version and device class, new against old on the same class." },
        { label: "Check the no-audio signals", detail: "Memory and timeout counts, output histograms, fallback, undo and retry rates." },
        { label: "Form hypotheses", detail: "Eviction or CPU fallback, a different quantised kernel, thermal throttling." },
        { label: "Reproduce on a real device", detail: "A physical older unit with the exact artefact, plus a golden-input parity test." },
        { label: "Fix and roll back safely", detail: "Publish the rollback as a higher version, keep the old model on the device." },
        { label: "Close the gap", detail: "Stratified canary, per-class halt rule, device-class regression tests." },
      ],
      caption: "The investigation in order, with the monitoring change at the end so the next regression is caught in the canary.",
    },
    example: {
      title: "Example: random canary versus a canary filled by class",
      text: "Older class is 8% of the fleet, 3% of its devices are harmed, and the healthy background failure rate is 0.5% (example). Probabilities use the Poisson approximation.",
      rows: [
        { label: "Random canary needed for 10 failures", value: "10 / (0.08 x 0.03) = 4,167 devices" },
        { label: "Random canary of 2,000", value: "160 in the class, 4.8 failures expected" },
        { label: "Halt at 5 or more, harmed", value: "fires 52% of the time" },
        { label: "Halt at 5 or more, healthy (0.8 expected)", value: "fires 0.14% of the time" },
        { label: "500 per class, 4 classes", value: "15 failures expected in the harmed class" },
        { label: "Halt at 10 or more", value: "fires 93% if harmed, 0.03% if healthy (2.5 expected)" },
        { label: "1,000 clean devices", value: "failure rate below about 3 / 1,000 = 0.3%" },
      ],
    },
    followUps: [
      {
        q: "Users who update first are the ones online and charging. Why does that bias your comparison?",
        a: "Early updaters differ from the rest of the fleet, so an old-versus-new comparison is confounded. Randomise inside a device class, or stratify by it.",
      },
      {
        q: "Support asks you to ship a quick fix tonight. What is your minimum safe process?",
        a: "The same artefact checks (signature, manifest, parity test), a small stratified canary with the halt rule, a rollback artefact ready, and a communication plan. Speed does not remove the staged rollout.",
      },
      {
        q: "How would you measure how often the model was wrong without labels?",
        a: "Use proxies and state their blind spots: undo and retry rates, confidence histograms, fallback rate, and an opt-in labelled panel of users. Be honest that ground truth arrives late.",
      },
    ],
    mistakes: [
      "Trusting the fleet-wide dashboards and closing the investigation.",
      "Asking to upload raw audio from all users.",
      "Sizing a canary with a round number instead of the class share and the failure rate.",
      "Saying that a clean canary proves the update is safe.",
    ],
  },

  'adapters-and-base-model-versions-across-a-device-fleet': {
    short:
      "A LoRA adapter is trained against one exact base model, so the pair (base, adapter) is the unit you version, test, ship and roll back, and every pair is described by a manifest the app checks before loading. Never load a mismatched adapter. When no valid pair exists, fall back to a deterministic feature or a smaller generic model, and use the cloud only with consent and a clear message.",
    explain: [
      {
        heading: "Why the pair is the unit",
        body: "A LoRA adapter is a small set of extra weights added on top of a frozen base model. It learned to correct that base's exact numbers, so with a different base version it can quietly produce worse or nonsense output. A new base version therefore needs new adapters, and a platform-provided system model that can change under you makes the combination a moving target. Give every artefact a manifest: version and content hash, the base version it needs, device classes and memory required, chat template and thresholds, the version it replaces and the version to fall back to. The app reads the manifest and refuses to load an adapter whose base does not match. Record the training-data snapshot and the hyperparameters too, so you can retrain the adapter when the base changes.",
      },
      {
        heading: "Own the base model or use the platform's",
        body: "Shipping your own base gives control: you pick the version, freeze it and test it, but you must ship the weights, take the memory and test every device class. A platform model costs no download and no extra memory, but you cannot freeze it. Read each vendor's current documentation on update behaviour instead of assuming. Adapters are small compared with the base: two rank-r matrices cost about 2r/d of a full d x d matrix, which is 2 x 16 / 4,096 = 0.78% for r = 16 and d = 4,096. As an example, rank 16 on four 4,096-wide matrices in each of 32 layers is 2 x 4,096 x 16 x 4 x 32 = 16.8 million weights, about 16.8 MB at 8 bits, so five feature adapters are about 84 MB. Storage is manageable; the testing is the real cost, so load adapters on demand and delete unused ones.",
      },
      {
        heading: "Testing, rollout and rollback",
        body: "Build a test matrix of base version by adapter version by device class, with golden prompts and a task metric for each feature, run in continuous integration, plus a check on the device after install. Example: 3 base versions x 5 features gives 15 valid pairs, and with 3 device classes that is 45 test cells. Roll out in stages by device class with halt rules on crashes, out-of-memory, latency and output statistics. Report the loaded base and adapter versions as labels on every counter, so a combination outside the manifest shows up as an alert. Update clients refuse to go backwards, so publish a rollback as a new, higher version that points at the old weights.",
      },
      {
        heading: "When the right pair is missing",
        body: "Decide the fallback in advance. Options in order of preference: a simpler deterministic feature (rules, templates), a smaller generic model that needs no adapter, or the cloud only with user consent and a clear message. Never load a mismatched pair silently. Personalised adapters need a plan too: a user's adapter belongs to one base version, so decide whether it is migrated, retrained locally or discarded when the base changes, and tell the user what they will see.",
      },
    ],
    diagram: {
      kind: 'layers',
      layers: [
        { label: "Feature in the app", sub: "asks for a capability, never for a file" },
        { label: "Manifest check", sub: "pair is allowed? hashes, device class, memory" },
        { label: "LoRA adapter, version A", sub: "trained for base B only, about 17 MB in the example" },
        { label: "Base model, version B", sub: "shipped by you, or provided by the platform" },
        { label: "Runtime and chip", sub: "device class decides what fits and how fast" },
      ],
      caption: "Stack read from top to bottom. The adapter loads only if the manifest says the base underneath is the one it was trained on.",
    },
    example: {
      title: "Example: adapter size and test matrix",
      text: "Assumed architecture for the arithmetic: 4,096-wide matrices, rank 16, adapters on 4 matrices in each of 32 layers, stored at 8 bits. These are example numbers, not a real product.",
      rows: [
        { label: "Share of a full matrix", value: "2 x 16 / 4,096 = 0.78%" },
        { label: "Weights per adapter", value: "2 x 4,096 x 16 x 4 x 32 = 16.8 million" },
        { label: "Size at 8 bits", value: "about 16.8 MB; five features about 84 MB" },
        { label: "Valid pairs", value: "3 base versions x 5 features = 15" },
        { label: "Test cells", value: "15 pairs x 3 device classes = 45" },
      ],
    },
    followUps: [
      {
        q: "A platform vendor announces a new system model and that adapters must be re-trained. What is your plan and timeline?",
        a: "Pin to what you can test, build the new adapters and the test matrix early, and keep the old pair working while the old base exists. Release behind a version check and watch metrics by base version.",
      },
      {
        q: "Storage is tight. How many adapters can you keep?",
        a: "Adapters are small relative to the base, about 0.8% of a full matrix at rank 16 and width 4,096, so storage is manageable, but each also needs testing. Load on demand and delete the unused ones.",
      },
      {
        q: "How do you detect that a mismatched pair is running in the field?",
        a: "Report the loaded base and adapter versions as labels on every counter, alert on combinations outside the manifest, and refuse at load time.",
      },
    ],
    mistakes: [
      "Assuming an adapter keeps working after the base model changes.",
      "Relying on a platform model staying the same.",
      "Silently falling back to the cloud without consent.",
      "Leaving off per-version labels on field metrics.",
    ],
  },

  'hearing-aid-noise-suppression-latency-design': {
    short:
      "Combine spatial processing (several microphones favouring the front) with spectral processing (a gain for each time-frequency cell, increasingly from a small neural network), and treat latency as the binding constraint because the wearer also hears the real sound directly. A transform cannot finish a frame until its window has arrived, so the window and block sizes set the delay: 160-sample blocks with a 400-sample window give 35 ms, while 32 and 64 give 6 ms. Judge the result with speech-kept and intelligibility measures and listening tests, not signal-to-noise improvement alone.",
    explain: [
      {
        heading: "The two families of approach",
        body: "Signal-to-noise ratio (SNR) in decibels is 10 x log10 of speech energy over noise energy: 0 dB means equal, 5 dB is about 3.2 times. Hearing devices combine two ideas. Spatial processing uses two omnidirectional microphones a few millimetres apart (5 to 12 mm is common): delaying one and subtracting makes a cardioid pattern that favours sound from the front. For 10 mm the delay is 10 mm / 343 m/s = 29 microseconds. Costs: bass falls about 6 dB per octave and must be boosted back (which also boosts microphone noise), and it assumes the talker is in front. Spectral processing works on one signal: split it into time-frequency cells and choose a gain for each. A voice activity detector and a noise estimator feed the gain rule.",
      },
      {
        heading: "Classic gains, and a learned mask",
        body: "Spectral subtraction uses gain = max(floor, 1 - alpha x noise / signal). Example with alpha = 1.5 and floor 0.1: a cell with SNR 4 gets 1 - 1.5 / 4 = 0.625, and a cell with SNR 1 or lower gets the floor. A Wiener filter uses SNR / (1 + SNR): 0.8 at SNR 4, 0.5 at SNR 1. The weakness is musical noise: noise fluctuates around its estimate, so a few cells survive and chirp, and a floor masks it, while subtracting harder trades it for speech damage. Babble (other talkers) breaks the noise estimate. A neural network learns the mask instead. The soft target is the ideal ratio mask, built from clean speech mixed with noise at chosen SNRs. A small open example, RNNoise, reports 87,503 weights and about 40 Mflops, around 14% of one 1.2 GHz Cortex-A53 core. Capping the maximum attenuation can improve intelligibility and keep environmental sounds audible.",
      },
      {
        heading: "Latency is the constraint",
        body: "The wearer hears the room through the vent and the processed sound through the receiver, and the two mix. A delay between them smears the sound. A transform cannot output a frame until its window has arrived. In a simple double-buffered model (example), delay = (block + window) / sample rate. With 160-sample blocks and a 400-sample window at 16 kHz: 10 ms for the block, 10 ms to play it, and 15 ms of window overlap, 35 ms. With 32-sample blocks and a 64-sample window: 2 + 2 + 2 = 6 ms. In one study of simulated open-canal fittings, delays of about 5 to 6 ms were rated just acceptable and longer ones disturbing. Other fittings and listeners tolerate more, and it is one study. So use causal models, short or asymmetric windows (one challenge entry kept a 16 ms analysis window with 4 ms algorithmic latency), or learned short filters.",
      },
      {
        heading: "Compute deadlines and how to judge it",
        body: "The deadline is the block period, so the slowest block (p99) matters, not the mean. A 1.5 ms model uses 15% of a 10 ms block but 75% of a 2 ms block, and smaller blocks raise power roughly in proportion because inference runs more often. To judge quality, SNR improvement alone rewards cutting too much. Pair it with a damage measure such as scale-invariant SDR (speech kept), hearing-specific intelligibility and quality measures (HASPI, HASQI), and listening tests with three ratings (speech, noise, overall) that include listeners with hearing loss. Do not compare one manufacturer's decibel figures with another's, and leave clinical and regulatory claims out of an engineering answer.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'mics', label: "Two microphones", sub: "5 to 12 mm apart" },
        { id: 'dir', label: "Directional beam", sub: "delay and subtract, bass boost" },
        { id: 'win', label: "Short analysis window", sub: "block and window set the delay" },
        { id: 'mask', label: "Causal neural mask", sub: "gain per time-frequency cell, capped" },
        { id: 'ola', label: "Overlap-add", sub: "rebuild the signal block by block" },
        { id: 'rx', label: "Receiver", sub: "mixes with the direct sound" },
      ],
      highlight: ['win', 'mask'],
      caption: "The audio path for one earpiece. The deadline for every stage together is a few milliseconds, not the average but the worst block.",
    },
    example: {
      title: "Example: two block and window choices at 16 kHz",
      text: "Delay = (block + window) / sample rate in a simple double-buffered model, and the compute share is model time divided by the block period. The 1.5 ms model time is an example.",
      rows: [
        { label: "160-sample block, 400-sample window", value: "(160 + 400) / 16,000 = 35 ms" },
        { label: "32-sample block, 64-sample window", value: "(32 + 64) / 16,000 = 6 ms" },
        { label: "1.5 ms model, 10 ms block", value: "15% of the deadline" },
        { label: "1.5 ms model, 2 ms block", value: "75% of the deadline" },
        { label: "Blocks per second, 32 versus 16 samples", value: "500 versus 1,000" },
        { label: "5 dB SNR", value: "10 to the power 0.5, about 3.2 times" },
      ],
    },
    followUps: [
      {
        q: "Raising alpha in spectral subtraction removes more hiss, but the output chirps. Why?",
        a: "The noise level in each cell fluctuates around the estimate, so over-subtraction leaves isolated surviving cells that change every frame, which is musical noise. A floor leaves enough broadband noise to mask them.",
      },
      {
        q: "Your model improves SNR by 12 dB but listeners dislike it. Why?",
        a: "SNR improvement rewards cutting speech along with the noise. Measure the speech kept and naturalness too, since intelligibility can rise at the cost of quality, which is why quality measures were added to the Clarity challenges.",
      },
      {
        q: "You halve the block to 16 samples at 16 kHz. What changes?",
        a: "From 32 samples, the deadline falls from 2 ms to 1 ms and inferences double from 500 to 1,000 a second, so load and power double for the same model. Delay falls, but tail latency now matters more.",
      },
    ],
    mistakes: [
      "Ignoring latency, or quoting only the mean latency.",
      "Treating one SNR number as sufficient.",
      "Proposing cloud inference for the main audio path.",
      "Making clinical or regulatory claims.",
    ],
  },

  'streaming-asr-live-captions-design': {
    short:
      "Use a streaming model family, a CTC or transducer recogniser that decides frame by frame, behind a cheap voice activity detector and ideally a noise-suppression stage, and show partial results that stabilise. Whisper-style attention encoder-decoders read 30-second windows, so they are a batch design and need extra machinery for live use, and they can invent fluent text on silence. Evaluate with normalised, pooled word error rate on audio that sounds like real calls, sliced by accent, noise and device, plus latency percentiles, key-term accuracy and behaviour on silent clips.",
    explain: [
      {
        heading: "The alignment problem and the model families",
        body: "Audio arrives as about 100 spectrogram frames a second, while a person produces roughly 12 to 15 letters a second (example speaking rate), so there are about 100 / 15 = 6.7 frames for each letter, and nobody has labelled which frame holds which letter. Three families answer that differently. CTC and transducer models decide frame by frame, so they stream. An attention encoder-decoder such as Whisper reads a fixed 30-second window and writes the text from the whole window, which is a batch design. Latency is a design choice that trades against accuracy: one streaming-transformer paper reports word error rates of 3.01% and 7.09% at about 80 ms average latency versus 2.50% and 5.62% at 960 ms (clean and harder test sets of one English benchmark). That is about 20% and 26% more errors at the short latency. Choose the delay from the product need, and verify on your own audio.",
      },
      {
        heading: "The pipeline, and what silence does",
        body: "Put a cheap voice activity detector (VAD) first: it skips silence and marks utterances. Neural VADs can be about 2 MB and process 30 ms chunks in under a millisecond, as one open-source project reports. Behind it sits a streaming recogniser that emits partial results, which stabilise as more audio arrives, so the interface needs to handle revisions without flicker. A noise-suppression stage in front is worth testing, for both the VAD and the recogniser. Silence is dangerous for Whisper-style decoders, which can invent phrases on silence or non-speech, loop, or pick the wrong language. One study found whole invented phrases in about 1% of transcriptions, more often for speakers with long pauses, and some included explicit harms. Mitigate with the VAD, a fixed language when it is known (language identification was 64.5% on a 102-language benchmark), fallbacks such as retrying at a higher temperature when the average log probability is low or the text is suspiciously repetitive, low-confidence display, and human review for high-stakes use.",
      },
      {
        heading: "How to evaluate it",
        body: "Report word error rate with a published normaliser applied to both sides, pooled over utterances, on audio that sounds like real calls: noisy rooms, accents, long pauses. Break it down by accent, noise level, device and speaker group, with intervals. Add key-term accuracy for names and numbers, behaviour on silent clips (count inserted words), latency percentiles measured from the last word spoken to the caption shown (p50 and p95), and caption stability, meaning how often shown words change. Be honest about limits: overlapping speakers are not solved by plain recognition, with reported word error of about 2% for audiobooks and 25.5% for dinner parties with distant microphones. Recordings are personal data, so state why you need them, keep little, delete on a schedule, and check the rules with specialists (not legal advice).",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["CTC", "Transducer", "Attention encoder-decoder"],
      rows: [
        { label: "How it decides", cells: ["Frame by frame, independent", "Frame by frame plus a text-side network", "Reads a whole window, writes text"] },
        { label: "Streams?", cells: ["Yes, naturally", "Yes", "Not by design, needs extra machinery"] },
        { label: "Main weakness", cells: ["Leans on an outside language model", "More complex to train and serve", "Can invent text on silence, window latency"] },
        { label: "Live captions", cells: ["Good fit", "Good fit", "Needs chunking, test on silence"] },
      ],
      caption: "Three ways to solve the alignment problem. The half-second target points at the first two.",
    },
    example: {
      title: "Example: a half-second budget and the latency trade",
      text: "Illustrative delay budget for words to appear about 0.5 s after they are spoken. The parts are example numbers to be measured on your own pipeline; the two accuracy rows are from the paper cited above.",
      rows: [
        { label: "Audio chunk before the model can start", value: "160 ms" },
        { label: "Model look-ahead", value: "80 ms" },
        { label: "Model and decoding", value: "60 ms" },
        { label: "Network and display", value: "100 ms" },
        { label: "Total (target under 500 ms at p95)", value: "160 + 80 + 60 + 100 = 400 ms" },
        { label: "80 ms versus 960 ms latency, clean set", value: "3.01% versus 2.50%, 20% more errors" },
        { label: "80 ms versus 960 ms latency, harder set", value: "7.09% versus 5.62%, 26% more errors" },
      ],
    },
    followUps: [
      {
        q: "Marketing wants Whisper because it is accurate. How do you respond?",
        a: "It is a batch design with 30-second windows, with known failure modes on silence and language choice, and no guarantee on your latency. Benchmark a streaming model and a chunked Whisper on your own calls, counting latency and invented text.",
      },
      {
        q: "You cut latency from 960 ms to 80 ms. What do you expect, and how do you check?",
        a: "Accuracy usually falls because the model has less context, in the cited paper about a fifth more errors on the clean set. Measure on your data and pick the point on the curve the product needs.",
      },
      {
        q: "Two people talk over each other. What happens, and what would you try?",
        a: "Accuracy degrades sharply. Consider separation or diarisation (who spoke when), per-speaker microphones, and set expectations in the interface.",
      },
    ],
    mistakes: [
      "Picking a batch model for live use without addressing latency.",
      "Having no VAD and no silence test.",
      "Reporting one WER number with no normaliser, no groups and no latency percentiles.",
    ],
  },

  'design-live-captions-across-ear-phone-and-cloud': {
    short:
      "Split the work by what each device can afford: the hearing aid runs only the always-on pieces (a voice activity detector or scene classifier, audio capture and compression), the phone runs the streaming speech recogniser, and the cloud is optional and only used with a clear user choice. Treat the wireless link as a failure mode, never block the live hearing path on the phone, and agree budgets for caption delay and energy as numbers. Version the earpiece firmware, the phone app and the model together, and roll them out as signed artefacts in stages.",
    explain: [
      {
        heading: "What runs where",
        body: "A hearing aid has milliwatts and kilobytes, so a full recogniser does not belong there. It keeps the cheap, always-on work: a voice activity detector or scene classifier to decide when anything needs sending, plus capture and compression of the audio. The phone has gigabytes and a much larger battery, so it runs the streaming recogniser and shows the captions. The cloud, if used at all, is an optional upgrade. Remember that the audio contains other people's speech, so it should never be the default path.",
      },
      {
        heading: "Budgets stated as numbers",
        body: "Agree three numbers before choosing a design. Caption delay the reader tolerates: this is a different budget from the audio path, which is milliseconds because the wearer also hears the room, while captions are read and can lag by a fraction of a second (example target: p95 under 500 ms). Earpiece energy per hour for the link and the gate. Example: a 300 mWh battery over 16 hours is 18.75 mW average, so an extra 0.5 mW for the link and gate costs 0.5 / 18.75 = 2.7% of the day. Compression helps the link: 16 kHz 16-bit audio is 256 kbps raw, and a 24 kbps codec (example) is 10.7 times smaller. Phone battery impact per hour: a recogniser drawing 0.4 W on a 15 Wh battery (example) is 0.4 / 15 = 2.7% per hour of conversation.",
      },
      {
        heading: "When the link or the phone fails",
        body: "The wireless connection has limited and variable throughput, so decide what is sent (compressed audio or features), buffer and resume after dropouts, show a clear state to the user (connected, catching up, offline), and never let the live hearing path wait on the phone. If the phone model is missing or too slow, fall back in steps: a smaller model, then partial results marked as uncertain, and the cloud only if the user has chosen it with a clear message. When no phone is in range or no speech is detected, stop streaming so the earpiece does not drain.",
      },
      {
        heading: "Privacy, evaluation and updates",
        body: "Process locally by default, send nothing without consent, do not keep audio, and log counters rather than content. Recording third parties may need consent in some markets, so check with privacy counsel (this is not legal advice). Word error rate alone hides the failures users notice, such as names and numbers, so evaluate by slices (noise level, accents, overlapping speech, microphone placement), measure caption latency at p95 and p99, and run field tests with the target users. Three components change over time: the earpiece firmware, the phone app and the speech model. Version them together with a compatibility matrix, ship signed artefacts, roll out in stages by earpiece and phone class, and roll back as a new, higher version.",
      },
    ],
    diagram: {
      kind: 'layers',
      layers: [
        { label: "Cloud, optional", sub: "only with a clear user choice; the audio holds other people's speech" },
        { label: "Phone", sub: "streaming recogniser and caption screen; gigabytes, larger battery" },
        { label: "Wireless link", sub: "compressed audio or features; limited throughput, can drop" },
        { label: "Hearing aid", sub: "voice detector, capture, compression; milliwatts and kilobytes" },
      ],
      caption: "Read from the top: more capable, less private and further away. The live hearing path stays inside the bottom layer.",
    },
    example: {
      title: "Example: energy, link and a 1.2 s caption delay",
      text: "All numbers are assumptions for the arithmetic. The delay row shows how a 1.2 s caption delay can be split and then cut to about 0.6 s by shortening chunks, look-ahead, decoding and display waiting.",
      rows: [
        { label: "Earpiece average power", value: "300 mWh / 16 h = 18.75 mW" },
        { label: "Cost of 0.5 mW for link and gate", value: "0.5 / 18.75 = 2.7% of the day" },
        { label: "Raw versus coded audio", value: "256 kbps versus 24 kbps, 10.7 times smaller" },
        { label: "Phone, 0.4 W on a 15 Wh battery", value: "2.7% per hour of use" },
        { label: "Delay now (ms)", value: "40 + 120 + 400 + 240 + 200 + 200 = 1,200" },
        { label: "Delay after changes (ms)", value: "40 + 120 + 160 + 80 + 120 + 100 = 620" },
      ],
    },
    followUps: [
      {
        q: "Caption delay is 1.2 seconds and users find it hard to follow. Where does the time go and what do you change?",
        a: "Break the path into capture and compression, link, chunk waiting, model look-ahead, decoding and display, and measure each. In the example 40 + 120 + 400 + 240 + 200 + 200 = 1,200 ms, and shorter chunks, less look-ahead, cheaper decoding and showing partial words get it to about 620 ms at some cost in accuracy.",
      },
      {
        q: "A new phone chip makes the model twice as fast. What else needs to be tested before you ship the faster build?",
        a: "Accuracy and operator support on that chip, thermal behaviour over a long conversation, battery, and results on each device class. Faster is not the same as equivalent.",
      },
      {
        q: "How do you keep the earpiece from draining when the phone is far away?",
        a: "Stop streaming when no link is present or no speech is detected, adapt the duty cycle, and measure the energy at the battery over a full day of realistic use.",
      },
    ],
    mistakes: [
      "Putting the full recogniser in the earpiece without checking memory and power.",
      "Streaming all audio to the cloud by default.",
      "Ignoring what happens when the link drops.",
      "Evaluating only average word error rate on clean speech.",
    ],
  },

  'fleet-model-rollout-signing-canary-rollback': {
    short:
      "Ship the model as its own signed, versioned artefact with a manifest, stage the rollout starting from a canary that deliberately includes the older device class, and monitor with counters and histograms rather than audio. A 2% failure rate in a class that is 5% of the fleet needs about 10 / (0.05 x 0.02) = 10,000 randomly chosen devices to expect ten failures, so a proportional 1% canary of 1,000 devices can easily miss it. A rollback is published as a new, higher version, and you test that path before the first release.",
    explain: [
      {
        heading: "What a fleet changes, and how to package",
        body: "With 100,000 devices, several versions are live at once, failures often depend on the device class, you see little, and undoing a release is slower than shipping it, because offline devices only pick it up when they next connect. So do not bundle the model inside firmware, which makes every model change a full release. Ship the model as its own artefact with a manifest: version and content hash, the minimum runtime and operator set, the device classes it targets and the memory it needs, input and output format with the thresholds and post-processing that must change with it, and the version it replaces and falls back to.",
      },
      {
        heading: "Signing and rollback",
        body: "Update frameworks such as TUF (The Update Framework) defend against rollback, freeze and single-key-compromise attacks, which means clients refuse older versions. A legitimate rollback is therefore published as a new, higher version that points at the old weights. Keep the previous model on the device until the new one has proved itself, and switch back locally on failure. Test the rollback path before the first release, and remember offline devices receive it only when they next connect.",
      },
      {
        heading: "Sizing the first canary",
        body: "To see k failures in a class that is a share s of the fleet with failure rate p you need about k / (s x p) devices when sampling at random. Here 10 / (0.05 x 0.02) = 10,000 devices for ten failures. A proportional 1% canary of 1,000 devices holds about 1,000 x 0.05 = 50 older devices and expects 50 x 0.02 = 1 failure, so the chance of seeing at least one is 1 - 0.98^50 = about 64%, and one failure is hard to tell from noise. Fill the canary evenly across device classes instead: 500 older devices give 10 expected failures while using only 0.5% of the fleet. Zero failures in n devices only bounds the rate near 3 / n (95%): after 1,000 clean devices, below about 0.3%. A halt rule has three parts, a size, a threshold and a slice. Judging each class separately catches class-specific bugs but halts healthy updates more often, because each class is smaller and noisier. Alert relative to the previous version for the same class.",
      },
      {
        heading: "Monitoring without raw audio, and learning from the fleet",
        body: "Send counters and histograms labelled with model version and device class: inference counts, latency buckets, memory high-water mark, out-of-memory and thermal events, fallback rate. Add output statistics (confidence histograms, empty outputs), user signals (undo, retry) and fixed test inputs run on the device at install. A shadow run of the candidate shows differences on real inputs at a battery cost. Set a minimum cohort size, and consider local differential privacy for counts of sensitive things. Each proxy has a blind spot, and labels arrive late or never. Federated learning learns from the fleet without collecting its data, but updates can leak (gradients have been inverted to recover training examples), so secure aggregation and differential privacy address separate threats at a cost, and a held-out test and a staged rollout are still needed. Delta updates are not automatic savings if the new version re-quantises every weight. Delivery routes exist on each major cloud (AWS IoT Jobs with rollout and abort configurations, Azure Device Update for IoT Hub, Google Play for on-device AI), and product details change, so read the current documentation.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: 'devices in a randomly chosen canary',
      yLabel: 'chance of seeing at least one failure in the older class (%)',
      points: [[500, 39.7], [1000, 63.6], [2000, 86.7], [3000, 95.2], [5000, 99.4], [10000, 100]],
      marks: [{ x: 1000, label: "Proportional 1% canary" }, { x: 10000, label: "Ten failures expected" }],
      caption: "Older devices are 5% of the fleet and 2% of them fail. A small random canary has too few older devices to be sure.",
    },
    example: {
      title: "Example: sizing the first stage for 100,000 devices",
      text: "Older class is 5% of the fleet, 2% of those devices would fail, so shipping blind would break about 100 of 5,000 older devices. Chances use 1 - 0.98 raised to the number of older devices in the canary.",
      rows: [
        { label: "Random canary for ten failures", value: "10 / (0.05 x 0.02) = 10,000 devices" },
        { label: "Proportional 1% canary", value: "1,000 devices, 50 older, 1 failure expected" },
        { label: "Chance of at least one failure", value: "1 - 0.98^50 = about 64%" },
        { label: "500 older devices chosen deliberately", value: "10 failures expected, chance of seeing one is 99.996%" },
        { label: "1,000 clean devices", value: "failure rate below about 3 / 1,000 = 0.3%" },
        { label: "Fleet at risk", value: "5,000 older devices x 2% = 100" },
      ],
    },
    followUps: [
      {
        q: "The first 1,000 devices show zero failures. Proceed?",
        a: "That is weak evidence: only about 50 of them are older devices, and zero in 1,000 bounds the overall rate at about 0.3%. Extend the canary, keep growing in stages under the halt rule, and sample the older class on purpose.",
      },
      {
        q: "You need to roll back, but the signing system refuses older versions. What do you do?",
        a: "Publish the old weights as a new higher version. This is by design, so plan it in advance, and remember that offline devices get the rollback only when they next connect.",
      },
      {
        q: "How do you detect a quality regression with no labels?",
        a: "Use proxies against the previous version in the same class: output histograms, fallback and undo rates, fixed test inputs and shadow comparisons. Stay aware of their blind spots and of how late labels arrive.",
      },
    ],
    mistakes: [
      "Bundling the model inside firmware so every change is a full release.",
      "Running a canary proportional to the fleet with no per-class slice.",
      "Uploading raw audio for monitoring.",
      "Having no tested rollback path, or claiming federated learning makes updates private by itself.",
    ],
  },

  'behavioural-battery-target-versus-model-accuracy': {
    short:
      "I would bring numbers, not a complaint: the target, the measured shortfall, and the accuracy cost of each way to close it, shown by the conditions where the wearer would notice. Then lay out options with measured energy and accuracy on the target hardware, let the product owner decide with the facts in front of them, and write the choice and its assumptions down. I say no only when the proposal causes audible glitches, a safety or regulatory problem, or a loss for a vulnerable group, and I offer an alternative when I do.",
    explain: [
      {
        heading: "Start with a concrete situation",
        body: "A story with numbers is more useful than 'we disagreed'. Example (assumed): a noise-reduction model in an earpiece. The target is 20 hours of battery, which on a 100 mWh usable battery is 100 / 20 = 5.0 mW average. The measured build draws 5.88 mW, so battery life is 100 / 5.88 = 17.0 hours, 3 hours short. The model takes 1.6 mW of that, and the rest of the device 4.28 mW, so to reach 20 hours the model must fit in 5.0 - 4.28 = 0.72 mW, a 55% cut. That framing turns an argument into a budget.",
      },
      {
        heading: "Options, each with a measured cost",
        body: "Reframe accuracy as an outcome the user would notice: which conditions lose quality, not an average that hides the tails. List the options with their costs on the target hardware: a smaller or quantised model, a cascade that wakes the larger model only when a scene needs it, a larger block, a lower duty cycle, a different chip, or a lower target. In the example, 8-bit weights cut model energy to 0.96 mW (19.1 hours), a half-width model to 0.8 mW (19.7 hours), and running the model only in noisy scenes, 60% of the time, saves another 40%. Combined, 8-bit weights and scene gating give 0.96 x 0.6 = 0.58 mW, so total 4.86 mW and 20.6 hours, above the target. Accuracy figures in the table are example numbers.",
      },
      {
        heading: "Evidence, ownership and saying no",
        body: "Bring a prototype and measurements, not opinion: energy at the battery, p99 latency, and a lab or field test with realistic inputs, so the meeting is about data. The product owner decides the trade-off with the facts in front of them, the engineer states the risk plainly, and the decision and its assumptions are written down so it can be revisited. Say no when a proposal would cause audible glitches (missed deadlines), a safety or regulatory problem, or a loss in accuracy for a vulnerable group, and bring an alternative, such as a staged release or a time-boxed experiment, instead of a bare refusal. Never hide a loss behind the average, and never blame the other team.",
      },
      {
        heading: "What I would take away",
        body: "Reflect on a specific process change with a measurable effect. Examples: involve firmware early, agree budgets for memory, latency and energy before choosing the architecture, and put a power and latency check into continuous integration so a regression appears in a pull request, not at the end of the project.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Model energy", "Battery life", "Accuracy cost (example)"],
      rows: [
        { label: "Today", cells: ["1.60 mW", "17.0 h", "none, but 3 h short of target"] },
        { label: "8-bit weights", cells: ["0.96 mW", "19.1 h", "benefit 9.0 dB to 8.6 dB overall"] },
        { label: "Half-width model", cells: ["0.80 mW", "19.7 h", "9.0 dB to 7.8 dB, mostly in babble"] },
        { label: "Scene gating (60% on)", cells: ["0.96 mW", "19.1 h", "none when quiet, slower to switch on"] },
        { label: "8-bit plus gating", cells: ["0.58 mW", "20.6 h", "8.6 dB, slower to switch on"] },
        { label: "Lower target to 17 h", cells: ["1.60 mW", "17.0 h", "none, but the wearer loses 3 hours"] },
      ],
      caption: "Example budget: the rest of the device draws 4.28 mW, so battery life is 100 mWh divided by (4.28 + model energy).",
    },
    example: {
      title: "Example: working out the energy budget",
      text: "Assumed numbers for a made-up earpiece. Battery life is usable energy divided by average power.",
      rows: [
        { label: "Target", value: "100 mWh / 20 h = 5.0 mW average" },
        { label: "Measured", value: "4.28 + 1.60 = 5.88 mW, 100 / 5.88 = 17.0 h" },
        { label: "Model must fit in", value: "5.0 - 4.28 = 0.72 mW, a 55% cut from 1.6" },
        { label: "8-bit weights alone", value: "0.96 mW, 19.1 h, still short" },
        { label: "8-bit plus gating 60% of the time", value: "0.96 x 0.6 = 0.58 mW, 20.6 h" },
      ],
    },
    followUps: [
      {
        q: "The product owner insists on the original target and the accuracy loss. How do you proceed?",
        a: "Make the cost visible with per-slice results, propose a time-boxed experiment or a staged release, record the decision and the risk, and escalate if the loss would harm users. The owner decides within safe limits.",
      },
      {
        q: "The firmware team says the model team always overruns its budget. What do you change?",
        a: "Agree shared budgets for memory, latency and energy early, make them tests in continuous integration, and share a profiling set so both teams see the same numbers.",
      },
      {
        q: "What would you do differently next time?",
        a: "Name one process change with a measurable effect, for example agreeing the energy budget before choosing the architecture and adding an energy check to every pull request.",
      },
    ],
    mistakes: [
      "Describing a conflict with no numbers and no outcome.",
      "Blaming the other team.",
      "Always saying yes, or always saying no.",
      "Hiding an accuracy loss, or reporting only the average.",
    ],
  },
};
