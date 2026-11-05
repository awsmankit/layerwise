import type { Question } from './types';

/**
 * Interview questions for three roles: edge and embedded ML engineer (edge-ml), applied scientist / research engineer
 * (research) and software engineer using AI tools (sw-ai-tools). Every worked number in a prompt or a strong point was
 * recomputed in a scratch script; prices, power and throughput figures are labelled as examples. Legal and privacy
 * topics are hedged and are not legal advice. Security questions are defensive only.
 */
export const questionsEdgeResearchTools: Question[] = [
  // ---------------------------------------------------------------- edge-ml
  {
    id: "edge-or-cloud-three-hearing-features",
    prompt:
      "A hearing-device company wants three new features: (a) wind-noise reduction in the earpiece, (b) a voice assistant that answers open questions, and (c) a monthly 'listening report' for the wearer. For each, say whether it should run on the device, on the paired phone or in the cloud, and why. What would make you change your answer?",
    roles: ["edge-ml"],
    level: "junior",
    kind: "design",
    topics: ["edge vs cloud", "latency", "privacy", "hearing devices"],
    minutes: 15,
    strong: [
      "Starts from the constraint, not the technology: how much delay the feature can tolerate, whether it must work offline, how sensitive the data is, how big the model must be, and how often it must change.",
      "Puts wind-noise reduction on the device: it sits in the live audio path, the budget is a few milliseconds that a network round trip alone would exceed, and it must work with no connection. It needs a small, causal model, and the cost is battery, so energy per inference is measured too.",
      "Treats the open-question assistant as a split or cloud feature: the model is large, quality matters more than milliseconds, and a second or two is acceptable. Keeps wake-word detection or a push button on the device, and asks for consent before any audio leaves it.",
      "Puts the listening report on the phone or in the cloud: it is not time-critical, it works on small summary statistics (hours in noise, program changes) rather than raw audio, and it can be recomputed whenever the model improves.",
      "Names the hybrid patterns: device first with a cloud fallback, split by task (time-critical on device, heavy work elsewhere), cloud-trained and device-deployed, and answer-now-refine-later.",
      "Mentions the costs people forget: operator support on the chip, a firmware or app update path for any on-device model, difficulty of seeing a fleet, and that real-time features are judged on the slow tail (p99), not the average.",
      "Says what would change the answer: a much smaller assistant model, a faster and cheaper link, a stricter privacy rule, or a chip with more memory.",
    ],
    followUps: [
      {
        q: "The wind model works in the lab but the product team asks to move it to the phone to save battery in the earpiece. What do you say?",
        lookFor: "A wireless link adds its own delay and can drop; for sound the wearer also hears directly, extra delay is audible. Moving it saves earpiece compute but spends radio energy and adds a failure mode, so measure both ends before deciding.",
      },
      {
        q: "The assistant must work on a plane. What is your design?",
        lookFor: "A small on-device model for a narrow set of requests (device settings, simple questions) and a clear message when a request needs the cloud, rather than a silent failure or a silent upload later.",
      },
      {
        q: "How would you decide with data and not opinion?",
        lookFor: "Write each feature's latency, power, memory and privacy budget, measure a prototype on the target hardware at p99, and compare the options against those budgets.",
      },
    ],
    redFlags: [
      "Says everything should run on the device, or everything in the cloud, without reference to latency, power or data sensitivity.",
      "Judges latency by the average and ignores the slow tail.",
      "Ignores how the model gets updated once it is on the device.",
      "Sends raw audio to the cloud without mentioning consent or minimisation.",
    ],
    lessons: ["edge/edge-vs-cloud-inference", "edge/real-time-on-a-budget", "edge/small-language-models-on-device"],
  },
  {
    id: "datasheet-tops-to-real-throughput",
    prompt:
      "A chip vendor advertises an NPU with 4 TOPS (trillion operations per second). Your model needs 600 million multiply-accumulates (MACs) per inference and must run 30 times a second. Estimate whether it fits, what questions you ask the vendor, and what you would measure before believing the answer. Use example figures where the datasheet is silent.",
    roles: ["edge-ml"],
    level: "junior",
    kind: "estimation",
    topics: ["hardware", "npu", "datasheet", "throughput"],
    minutes: 15,
    strong: [
      "Converts units: one MAC is two operations (a multiply and an add), so 600 million MACs is 1.2 billion operations per inference, and 30 a second needs 36 giga-operations per second (GOPS).",
      "Compares with the datasheet, then immediately distrusts it: 36 GOPS against a headline 4,000 GOPS is under 1%, which looks easy and is not yet an answer.",
      "Asks what the 4 TOPS is: sparse or dense (a sparse figure is often twice the dense one, and a dense model does not get it), which precision (int8 is typical), at which clock and power mode, and for which operators.",
      "Applies a utilisation guess as an assumption: with 2 TOPS dense and an example 20% utilisation, usable throughput is 400 GOPS, so one inference takes 1.2 GOP / 400 GOPS = 3 ms and the load at 30 a second is 9%. At 5% utilisation it is 12 ms and 36%.",
      "Says peak is a ceiling: small models cannot fill a large array, memory traffic often sets the speed, and the data movement costs far more energy than the arithmetic.",
      "Checks that the model's operators are supported and quantised the way the NPU needs; an unsupported operator falls back to the CPU and can erase the speed-up.",
      "Plans to measure on the target board, warmed up, under thermal load, with the rest of the product running, and to report percentiles and energy per inference, not only speed.",
    ],
    followUps: [
      {
        q: "The model has 5 MB of int8 weights. Does reading them 30 times a second matter?",
        lookFor: "5 MB x 30 = 150 MB per second, small against most memory systems for bandwidth, but it matters for energy and for whether the weights sit in on-chip memory or must stream from slower memory.",
      },
      {
        q: "A second vendor quotes 2 TOPS but gives a much better measured latency on your model. How can that be?",
        lookFor: "Peak is not delivered: utilisation, operator support, memory hierarchy and software maturity differ. Choose by a measured benchmark on your own model, not by the headline figure.",
      },
      {
        q: "The latency is fine at 3 ms. What else could still kill the product?",
        lookFor: "Energy per inference and battery life, heat after minutes of use, worst-case blocks, memory for activations, and the cost of the hand-offs between CPU and NPU.",
      },
    ],
    redFlags: [
      "Compares MACs directly with operations and is off by a factor of two without noticing.",
      "Accepts the headline TOPS without asking whether it is sparse or dense.",
      "Concludes it fits because 36 is far below 4,000.",
      "Plans to benchmark on a laptop or a development kit on a bench only.",
    ],
    lessons: ["edge/inside-a-small-device", "edge/from-pytorch-to-the-chip", "edge/real-time-on-a-budget"],
  },
  {
    id: "wearable-motion-model-window-memory-and-battery",
    prompt:
      "A smart ring classifies activity from a 3-axis accelerometer sampled at 50 Hz, using 2-second windows that advance by 1 second. Samples are 16-bit. Work out the buffer memory, how many inferences run per second and per day, and the average power if one inference costs 40 microjoules. Then add example idle costs (microcontroller sleep 5 microamps at 1.8 V, sensor 20 microamps at 1.8 V) and estimate battery life on a 30 mAh, 3.7 V cell. What would you do to extend it?",
    roles: ["edge-ml"],
    level: "junior",
    kind: "estimation",
    topics: ["wearables", "battery", "duty cycle", "sensors"],
    minutes: 15,
    strong: [
      "Counts the window: 50 Hz x 3 axes x 2 s = 300 values, and at 2 bytes each 600 bytes. The input buffer is tiny, so memory pressure comes from the model's activations, not the data.",
      "Counts the rate: a 1-second hop means one inference per second, 86,400 a day. Non-overlapping windows would halve that to one every 2 seconds, so the overlap doubles the compute and energy for smoother output.",
      "Computes power: 40 microjoules x 1 per second = 40 microwatts for the model alone.",
      "Adds the idle terms: MCU sleep 5 uA x 1.8 V = 9 microwatts, sensor 20 uA x 1.8 V = 36 microwatts, so the total is 40 + 9 + 36 = 85 microwatts, and the model is under half of it.",
      "Converts to battery life: 30 mAh x 3.7 V = 111 mWh, divided by 0.085 mW is about 1,306 hours, roughly 54 days. The model alone would give about 116 days, which shows why idle and sensor power matter as much as inference.",
      "Says all figures are examples, and that the radio, display, haptics and wake-ups are missing and will shorten the life, so the real number must be measured at the battery.",
      "Suggests levers: let the sensor buffer samples in its own FIFO so the MCU wakes once a second, use a tiny always-on gate that wakes the larger model only when there is motion, lengthen the hop when the user is still, and quantise to int8.",
    ],
    followUps: [
      {
        q: "Overlapping windows cost twice the energy. When are they worth it?",
        lookFor: "When the product needs faster reaction or smoother labels; check with an experiment whether accuracy and latency actually improve enough, and consider running the model at the hop but with cheaper features.",
      },
      {
        q: "Your estimate is 54 days and the first prototype lasts 9. Where do you look?",
        lookFor: "Measure current at the battery over a long window with a power monitor; the usual causes are the MCU not entering deep sleep, the radio advertising or syncing too often, a sensor in a high-power mode, and unbounded wake-ups.",
      },
      {
        q: "How would you check the model on different wearers?",
        lookFor: "Hold out whole people, not random windows, since windows from one person are correlated; check by body size, wrist or finger, motion style and orientation, and report the worst slice.",
      },
    ],
    redFlags: [
      "Counts only the model's energy and ignores sleep and sensor current.",
      "Forgets that sample size, axes and sample rate all multiply into the buffer.",
      "Splits train and test by random window rather than by person.",
      "Treats example power numbers as measurements.",
    ],
    lessons: ["edge/inside-a-small-device", "edge/real-time-on-a-budget", "edge/tinyml-wake-word-detector"],
  },
  {
    id: "converted-model-differs-from-pytorch-parity-check",
    prompt:
      "Your PyTorch model scores 96% on the validation set. After conversion to an on-device runtime the app scores 91% on the same recordings, before any quantisation. What do you check, in what order, and how do you prevent it from happening again?",
    roles: ["edge-ml"],
    level: "mid",
    kind: "debugging",
    topics: ["conversion", "runtimes", "validation", "edge"],
    minutes: 20,
    strong: [
      "Starts by isolating where the difference enters: run one fixed input through each stage (raw input, features, model output, post-processing) in both the Python and the device pipeline and find the first stage where they disagree.",
      "Suspects the feature front end first: resampling, windowing, normalisation, mel filters, integer versus float feature code and framing offsets are re-implemented in C or by a platform library, and small differences move accuracy.",
      "Checks the export: the model was exported in evaluation mode (batch norm and dropout in inference behaviour), input shapes and dtype and channel order match, and operator versions or replaced operators did not change behaviour.",
      "Checks the post-processing and thresholds: smoothing, hysteresis and decision thresholds tuned in Python must be carried over with the model, since they are part of the model's behaviour.",
      "Separates numeric noise from a real bug: compare output tensors with a tolerance on a fixed set of representative inputs, and compare the task metric, because bit-exact equality is not expected on a different runtime.",
      "Prevents a repeat by pinning framework, converter and runtime versions, keeping a parity test with golden inputs and expected outputs in continuous integration, re-running it on every converter upgrade, and storing the thresholds in the model manifest.",
      "Ends with a measurement on the device, with the full pipeline and on the target hardware, rather than a desktop emulator.",
    ],
    followUps: [
      {
        q: "All tensors match to 1e-5 on your golden inputs, but the field accuracy is still lower. Now what?",
        lookFor: "The golden set may not represent real input: check the sampling rate and the microphone's frequency response, gain and clipping, buffering and dropped frames in the live path, and compare on recordings captured by the device itself.",
      },
      {
        q: "After quantisation the gap grows to 8 points. How do you tell quantisation from conversion?",
        lookFor: "Compare three models on the same data: float source, converted float, converted int8. The first gap is conversion, the second is quantisation; then go layer by layer to find where error jumps, and review the calibration set.",
      },
      {
        q: "How big a tolerance do you set in the parity test?",
        lookFor: "Defensible and task-based: a tolerance on outputs for float models, and for quantised models a tolerance on the task metric, because outputs differ by design. Revisit it when versions change.",
      },
    ],
    redFlags: [
      "Blames quantisation or the chip without comparing pipeline stages.",
      "Compares only the final accuracy and never inspects intermediate tensors.",
      "Forgets that feature extraction and thresholds are part of the model.",
      "Expects bit-exact results across runtimes.",
    ],
    lessons: ["edge/from-pytorch-to-the-chip", "edge/quantization-for-edge", "systems/testing-and-deploying-ml-models"],
  },
  {
    id: "ota-model-update-over-ble-time-energy-and-fleet-bandwidth",
    prompt:
      "You will push a 1.2 MB model update to 200,000 hearing aids through their phones over Bluetooth Low Energy. Assume an example effective throughput of 100 kbit/s, with 20% of the time lost to retries, and 10 mW drawn while the device is receiving and writing. Estimate the transfer time, the energy as a share of a 100 mWh battery, and the total data your servers send. What changes if only 15% of the bytes differ between versions? What can go wrong in the field?",
    roles: ["edge-ml"],
    level: "mid",
    kind: "estimation",
    topics: ["ota updates", "fleet", "battery", "bandwidth"],
    minutes: 20,
    strong: [
      "Converts bytes to bits: 1.2 MB x 8 = 9.6 megabits. At 100 kbit/s that is 96 seconds, and with 20% lost to retries (80% goodput) 96 / 0.8 = 120 seconds.",
      "Computes energy: 10 mW x 120 s = 1.2 joules, which is 0.33 mWh, about 0.33% of a 100 mWh battery. One update is cheap, so the risk is repeated failed attempts, not one success.",
      "Computes server volume: 200,000 x 1.2 MB = 240 GB for the fleet if every device downloads the full model once, before retries and re-downloads.",
      "Treats a 15% delta as an upper bound on savings: 36 GB, and about 18 seconds of transfer. But a re-trained or re-quantised model often changes nearly every weight byte, so measure the real delta before relying on it.",
      "Makes the update safe: download to a spare slot, verify a hash and a signature, resume after a drop, switch only when charging or idle, keep the previous model until the new one proves itself, and report success or failure counts.",
      "Lists field failure modes: the phone leaves range mid-transfer, the battery is low, flash wear and power loss during write, a version mismatch between the app, firmware and model, and old devices that take weeks to update, so several versions run at once.",
      "States that the throughput and power are example figures and that real links vary with distance, interference and the phone, so the plan uses measured p10 or p5 throughput and not the mean.",
    ],
    followUps: [
      {
        q: "A device loses power at 80% of the write. What must the design guarantee?",
        lookFor: "It boots into the old, known-good model: an A/B slot or equivalent, atomic switch only after verification, and a boot-time check that falls back on failure.",
      },
      {
        q: "Support asks for a rollback after a bad model. Why cannot you just push the old version number?",
        lookFor: "Secure update clients refuse to go backwards to defend against rollback attacks; publish the old weights as a new, higher version.",
      },
      {
        q: "How do you avoid 200,000 phones all downloading at 9 am?",
        lookFor: "Stagger by device class and random delay, use a content delivery network and conditional requests, throttle the rollout, and let the halt rule stop it if failures rise.",
      },
    ],
    redFlags: [
      "Mixes up bytes and bits and is off by a factor of eight.",
      "Assumes a delta update always saves bandwidth.",
      "Overwrites the only copy of the working model during the update.",
      "Plans a rollback by re-issuing the old version number.",
    ],
    lessons: ["edge/shipping-to-a-fleet", "edge/inside-a-small-device"],
  },
  {
    id: "benchmark-fast-product-slow-honest-edge-measurement",
    prompt:
      "On the bench your noise model takes 1.1 ms per block with a clean run of 10 inferences, and the team reports a 2 ms deadline is comfortably met. After three minutes of use in the product, blocks occasionally take 2.4 ms and the audio crackles. At 500 blocks a second, 0.4% of blocks run late. Explain what is happening, how often the user hears a glitch, and how you would measure and report the model's speed so the claim is honest.",
    roles: ["edge-ml"],
    level: "mid",
    kind: "debugging",
    topics: ["benchmarking", "latency", "thermal", "real-time audio"],
    minutes: 20,
    strong: [
      "Names the failure: a real-time deadline is missed by the slowest block, not the average block, so a 1.1 ms mean says little when some blocks take 2.4 ms against a 2 ms deadline.",
      "Does the arithmetic: 0.4% of 500 blocks a second is 2 late blocks a second, so a glitch about every 0.5 seconds. For comparison, 0.1% at 100 blocks a second would still be one every 10 seconds.",
      "Lists causes of slow blocks: cold caches and lazy initialisation in a short run, thermal throttling after minutes of sustained work, interrupts and other tasks in the full product, memory contention, clock or voltage changes, and fetching weights from slower memory.",
      "Describes an honest method: warm up and say so, run long enough to reach steady state including heat, run with the rest of the product active, and test at the worst supported temperature and power mode.",
      "Reports the distribution, not a mean: median, 99th and 99.9th percentile and the maximum, plus the number of missed deadlines per hour, and the conditions (clock, power mode, temperature, software versions).",
      "Times the whole path that ships (features, model, decision logic), measures energy at the supply with a power monitor over a long window, and reports accuracy next to speed.",
      "Fixes by design: smaller or cheaper model, bounded work with no allocation or blocking in the audio callback, a pre-planned memory arena, larger blocks if the latency budget allows, or a headroom target such as a worst-case time well under the deadline.",
    ],
    followUps: [
      {
        q: "Larger blocks would remove the misses. Why might the product team refuse?",
        lookFor: "Block size adds directly to delay, which can be audible when the wearer also hears the room, so the trade is delay against load. Quantify both and choose a block that meets the delay target with headroom.",
      },
      {
        q: "You read a published result for a chip. What do you ask before trusting it?",
        lookFor: "Closed or open division (same model or modified), whether the accuracy target was met, what is excluded from the timed region (feature extraction), which board, clock and runtime, and whether it resembles your streaming workload.",
      },
      {
        q: "Throttling appears only above 35 degrees. How do you handle it?",
        lookFor: "Test in a thermal chamber or with a heater, design for the throttled speed, add a graceful degradation path such as a lighter model, and monitor throttle events in the fleet.",
      },
    ],
    redFlags: [
      "Reports a mean latency as proof of meeting a deadline.",
      "Benchmarks a short cold run and treats it as steady state.",
      "Measures the model only and leaves out feature extraction.",
      "Argues that a rare miss is acceptable without calculating how often it happens.",
    ],
    lessons: ["edge/real-time-on-a-budget", "audio/noise-suppression-and-hearing-devices"],
  },
  {
    id: "on-device-is-not-automatically-private",
    prompt:
      "Your product manager says that because the speech model runs entirely on the device, the feature needs no privacy review. What do you say? Walk through what on-device processing protects, what it does not, and how you would collect health and quality information about the fleet without gathering raw audio.",
    roles: ["edge-ml"],
    level: "mid",
    kind: "design",
    topics: ["privacy", "on-device", "telemetry", "federated learning"],
    minutes: 20,
    strong: [
      "Gives credit where due: running locally removes the network path, so raw audio need not reach a provider and the feature can work offline. That is a real privacy benefit and a good default.",
      "Names what remains: app and crash logs, backups, analytics and debug builds, model outputs that the user shares, a lost or sold device, other apps with access, prompt injection into on-device assistants, and any telemetry the team adds.",
      "Applies data minimisation as engineering: write down what is collected, for what purpose, how long it is kept and who can see it, and make each field justify itself. This is a design input, not legal advice, so the requirements are checked with privacy counsel for the markets involved.",
      "Designs fleet monitoring without raw data: counters and histograms (inferences, latency buckets, memory high-water mark, out-of-memory and thermal events, fallback rate), labelled with model version and device class, and output statistics such as confidence histograms.",
      "Adds user signals that need no content, such as undo and retry rates, and sets a minimum cohort size before a slice is shown so a slice of three devices identifies no one.",
      "Discusses stronger tools and their limits: local differential privacy adds noise on the device so the server learns population statistics, and federated learning keeps raw data local. Neither is a guarantee by itself, since updates computed from private data can leak unless combined with secure aggregation or differential privacy, which cost accuracy or bandwidth.",
      "Plans deletion and consent: a clear opt-in for anything beyond essential health data, a way to turn it off, and a known list of which datasets trained which model version.",
    ],
    followUps: [
      {
        q: "A tester wants to upload 30 failing audio clips to debug a bad model. How do you allow it?",
        lookFor: "Explicit, informed opt-in per capture, short retention, restricted access, a record of use, and a preference for on-device analysis or synthetic reproduction first.",
      },
      {
        q: "Does federated learning mean the server cannot learn anything about a user?",
        lookFor: "No: gradients and updates can be inverted in research settings; secure aggregation reduces what the server sees, differential privacy bounds one person's influence, and each has a cost. It is data minimisation, not a guarantee.",
      },
      {
        q: "The on-device assistant reads message previews. What new risk appears?",
        lookFor: "Untrusted text can carry instructions that steer the model; limit what the assistant can do with a permission boundary in code and confirm consequential actions.",
      },
    ],
    redFlags: [
      "Says on-device means no privacy risk and no review.",
      "Collects raw audio for monitoring because it is easiest.",
      "Treats federated learning or differential privacy as a complete guarantee.",
      "Gives legal conclusions with certainty instead of involving privacy specialists.",
    ],
    lessons: ["responsible/privacy-engineering-for-ai", "edge/shipping-to-a-fleet", "local/private-and-air-gapped-ai"],
  },
  {
    id: "code-affine-int8-quantise-and-error-bound",
    prompt:
      "Write a Python function that quantises a list of floats to int8 using an affine scheme (a scale and a zero point) from a given minimum and maximum, plus the matching dequantise function. Check it on the values 0.3, 1.2, -0.4, 0.9 with a range of -0.5 to 2.0. What is the largest rounding error you should expect, and what happens if one outlier at 20.0 sets the range?",
    roles: ["edge-ml"],
    level: "mid",
    kind: "coding",
    topics: ["quantisation", "coding", "calibration", "int8"],
    minutes: 25,
    strong: [
      "Derives the scheme: scale = (max - min) / 255 for 256 integer levels, zero point = round(-128 - min / scale), q = round(x / scale) + zero point, and real = (q - zero point) x scale.",
      "Makes the range include zero before computing the scale, so that the real value 0 maps exactly to an integer (important for padding and ReLU), and clamps q to the int8 range -128 to 127.",
      "Gets the worked numbers: scale = 2.5 / 255 = 0.0098, zero point = -77, and the inputs become -46, 45, -118, 15, which dequantise to 0.304, 1.196, -0.402, 0.902.",
      "States the bound: for values inside the range the rounding error is at most half a step, scale / 2 = 0.0049, and the example's largest error is 0.0039. Values outside the range are clipped and have unbounded error.",
      "Shows the outlier effect: a range of -0.5 to 20.0 gives a scale of 0.0804, about 8 times coarser, so the same four values (0.3, 1.2, -0.4, 0.9) land on much coarser steps and the worst-case rounding error rises from 0.0049 to 0.040.",
      "Connects to practice: ranges come from a calibration set of real, difficult inputs; per-channel scales for weights handle channels with very different ranges; outliers are clipped or handled with percentile ranges, which trades clipping error for rounding error.",
      "Tests the function: round trip within scale / 2, monotonic order preserved, zero maps to zero point, and a constant tensor (min equals max) does not divide by zero.",
    ],
    followUps: [
      {
        q: "Weights are usually quantised symmetrically with a zero point of 0 while activations use a zero point. Why?",
        lookFor: "A zero point of 0 for weights makes the integer multiply-accumulate cheaper because no cross term has to be corrected; activations are often one-sided or skewed, so an offset uses the 256 levels better.",
      },
      {
        q: "Python's round sends 0.5 to 0 and 2.5 to 2. Does it matter?",
        lookFor: "It rounds half to even, whereas many chips round half away from zero; the difference is at most one step on exact ties but is one reason results differ across runtimes, so test on the target.",
      },
      {
        q: "How would you choose between min/max and a percentile range?",
        lookFor: "Compare the task metric on a hard calibration set; min/max never clips but wastes resolution when an outlier dominates, percentiles clip rare large values, and sensitive layers may stay in higher precision.",
      },
    ],
    redFlags: [
      "Computes the scale from the data but forgets that zero must be exactly representable.",
      "Does not clamp, so values wrap around.",
      "Claims the rounding error is always below scale / 2, including for values outside the range.",
      "Treats the min/max of a tiny clean calibration set as safe.",
    ],
    lessons: ["edge/quantization-for-edge", "serving/quantization", "edge/tinyml-wake-word-detector"],
  },
  {
    id: "compression-toolbox-which-technique-for-which-problem",
    prompt:
      "Three teams each bring you a model that does not fit the product. Team A: the weights are 4 times too big for flash. Team B: the size is fine but the model is 2.5 times too slow on a CPU with no accelerator. Team C: the model is small enough but loses 6 accuracy points on one rare class after an earlier compression attempt. For each, which techniques from quantisation, pruning, distillation and architecture choice would you try first, and why?",
    roles: ["edge-ml"],
    level: "mid",
    kind: "concept",
    topics: ["quantisation", "pruning", "distillation", "model compression"],
    minutes: 20,
    strong: [
      "Matches the technique to the bottleneck: size, speed and accuracy are different problems, and one technique rarely solves all three.",
      "For A, quantising float32 weights to int8 gives about a 4x reduction in bytes, which exactly meets the target; checks accuracy on hard inputs, and says that if more is needed, structured pruning or a smaller architecture follows.",
      "For B, explains that unstructured sparsity shrinks the stored model but usually does not speed up a dense CPU kernel; structured pruning (whole channels or heads) gives a smaller dense model that any hardware runs faster, and an efficient architecture or lower input resolution may be the larger lever. Int8 helps if the CPU has integer SIMD kernels, so check it.",
      "For C, suspects the calibration or training data missed the rare class, rebuilds calibration and test sets with those cases, judges by the task metric per class, tries quantisation-aware training, and keeps sensitive layers at higher precision.",
      "Describes distillation as training a small student to mimic a larger teacher, usually the best route to a compact model with good quality, and checks the teacher's terms of use for training on its outputs.",
      "Insists on validating each step on the target hardware at realistic temperature and load, because a smaller model is not always a faster one: unsupported formats and operators fall back to slower paths.",
      "Orders the work by cost: post-training quantisation is cheap and first, then architecture and pruning, then distillation or quantisation-aware training, which need training runs.",
    ],
    followUps: [
      {
        q: "Pruning removed 70% of the weights and the file shrank, yet latency did not move. Why?",
        lookFor: "Unstructured zeros are still multiplied by a dense kernel unless the hardware and runtime exploit sparsity; use structured pruning or confirm sparse support on the device.",
      },
      {
        q: "How would you find which layers hurt most under int8?",
        lookFor: "Compare per-layer activations with the float model on fixed hard inputs, find where error jumps, then leave the first, last and wide-range layers in higher precision.",
      },
      {
        q: "When would you pick a new architecture over compressing the current one?",
        lookFor: "When the current design uses operators the chip does not support or has large early activations; design for the target from the start, with efficient blocks and supported operators.",
      },
    ],
    redFlags: [
      "Says pruning always makes a model faster.",
      "Applies the same fix to every problem without naming the bottleneck.",
      "Judges success by average accuracy or by the file size.",
      "Skips measurement on the real device.",
    ],
    lessons: ["edge/quantization-for-edge", "edge/from-pytorch-to-the-chip", "serving/quantization"],
  },
  {
    id: "monitor-a-silent-regression-on-older-devices",
    prompt:
      "Two weeks after a model update, support tickets mention more missed commands, but fleet-wide crash and latency dashboards look normal. You cannot collect raw audio. The older, low-memory device class is 8% of the fleet. Design the investigation and the monitoring that should have caught it, and size a canary that would have shown a regression that harms 3% of devices in that class.",
    roles: ["edge-ml"],
    level: "senior",
    kind: "debugging",
    topics: ["fleet monitoring", "canary", "drift", "privacy"],
    minutes: 30,
    strong: [
      "Starts from the structure of the problem: a fleet-wide average hides a slice, so first re-cut every existing metric by model version and device class, and compare against the previous version for the same class.",
      "Lists signals that need no raw data and what each misses: out-of-memory, timeout and thermal counts; latency percentiles; output histograms and fallback rate; undo, edit and retry rates; input statistics for drift; fixed test inputs run on the device at install.",
      "Forms hypotheses for the older class: the new model needs more memory and is evicted or falls back to the CPU, a different kernel path gives different quantised results, or thermal throttling. Tests each with the relevant counter and with a lab unit of that class.",
      "Reproduces on a physical device of that class with the exact artefact, and runs a golden-input parity test to see whether outputs differ from the new model on a reference device.",
      "Sizes the canary: to expect k failures you need about k / (s x p) devices. With s = 8% and p = 3%, ten failures need 10 / 0.0024, about 4,167 devices; a random 2,000-device canary would put about 160 in the class and expect only about 4.8 failures, which is hardly visible against background noise.",
      "Adds the missing controls: fill the canary evenly across device classes instead of proportionally, judge each class on its own with a minimum cohort size, widen in stages with a halt rule that has a threshold, a count of devices reporting, and a per-class slice, and expect more false halts when slices are small.",
      "Notes that zero failures in n devices only bounds the rate near 3 / n, so 1,000 clean devices rule out roughly a 0.3% failure rate, not a small harm.",
      "Closes the loop: roll back as a new higher version if needed, add a regression test with device-class-specific cases, and keep the previous model on the device until the new one has proved itself.",
    ],
    followUps: [
      {
        q: "Users who update first are the ones online and charging. Why does that bias your comparison?",
        lookFor: "Early updaters differ from the rest of the fleet, so old-versus-new comparisons are confounded; randomise inside a device class or stratify by it.",
      },
      {
        q: "Support asks you to ship a quick fix tonight. What is your minimum safe process?",
        lookFor: "Same artefact checks (signature, manifest, parity test), a small stratified canary with the halt rule, an explicit rollback artefact ready, and a communication plan. Speed does not remove the staged rollout.",
      },
      {
        q: "How would you measure how often the model was wrong without labels?",
        lookFor: "Proxies with blind spots: undo and retry rates, confidence histograms, fallback rate, and an opt-in labelled panel of users, with the delay of ground truth stated honestly.",
      },
    ],
    redFlags: [
      "Trusts fleet-wide dashboards and closes the investigation.",
      "Asks to upload raw audio from all users.",
      "Sizes a canary by a round number rather than by the class share and the failure rate.",
      "Says that a clean canary proves the update is safe.",
    ],
    lessons: ["edge/shipping-to-a-fleet", "systems/monitoring-and-drift", "systems/testing-and-deploying-ml-models"],
  },
  {
    id: "design-live-captions-across-ear-phone-and-cloud",
    prompt:
      "Design a live-captions feature for people with hearing loss: the hearing aids hear the conversation, and the wearer reads captions on the paired phone. Decide what runs on the hearing aid, on the phone and (if at all) in the cloud, what the latency and power budgets are, how the system degrades when the link drops, and how you handle privacy and updates.",
    roles: ["edge-ml"],
    level: "senior",
    kind: "design",
    topics: ["hearing devices", "streaming asr", "edge vs cloud", "design"],
    minutes: 40,
    strong: [
      "Splits by constraint: the hearing aid has milliwatts and kilobytes, so it runs the always-on pieces (a voice activity detector or scene classifier, audio capture and compression); the phone has gigabytes and a larger battery, so it runs the streaming speech recogniser; the cloud is optional.",
      "States the budgets as numbers to be agreed: caption delay the reader tolerates (a different budget from the audio path, which is milliseconds because the wearer also hears the room), earpiece energy per hour for the link and the gate, and phone battery impact per hour.",
      "Treats the link as a failure mode: the wireless connection has limited and variable throughput, so decide what is sent (compressed audio or features), buffer and resume, show a clear state to the user, and never block the live hearing path on the phone.",
      "Handles degradation: if the phone model is unavailable or too slow, fall back to a smaller model, show partial results marked as uncertain, and only use the cloud with a clear user choice, because the audio contains other people's speech.",
      "Addresses privacy by design: process locally by default, send nothing without consent, do not keep audio, log counters instead of content, and check with privacy counsel what consent is needed for recording third parties in the markets involved (this is not legal advice).",
      "Plans evaluation honestly: word error rate hides the failures users notice, such as names and numbers, so use slices (noise level, accents, overlapping speech, hearing-aid microphone placement), measure caption latency at p95 and p99, and run field tests with the target users.",
      "Plans updates across three components: the earpiece firmware, the phone app and the speech model are versioned together with a compatibility matrix, shipped as signed artefacts, rolled out in stages by device and phone class, and rolled back as a new higher version.",
    ],
    followUps: [
      {
        q: "Caption delay is 1.2 seconds and users find it hard to follow. Where does the time go and what do you change?",
        lookFor: "Break the path into capture, link, buffering and chunking, model look-ahead, decoding and display; streaming models with smaller look-ahead and partial results cut delay at some cost in accuracy; measure each part.",
      },
      {
        q: "A new phone chip makes the model twice as fast. What else needs to be tested before you ship the faster build?",
        lookFor: "Accuracy and operator support on that chip, thermal behaviour over a long conversation, battery, and results on each device class, since faster is not the same as equivalent.",
      },
      {
        q: "How do you keep the earpiece from draining when the phone is far away?",
        lookFor: "Stop streaming when no link is present or no speech is detected, adapt the duty cycle, and measure the energy at the battery over a full day in realistic use.",
      },
    ],
    redFlags: [
      "Puts the full recogniser in the earpiece without checking memory or power.",
      "Streams all audio to the cloud by default.",
      "Ignores what happens when the link drops.",
      "Evaluates only average word error rate on clean speech.",
    ],
    lessons: ["edge/edge-vs-cloud-inference", "audio/speech-recognition", "edge/shipping-to-a-fleet", "audio/noise-suppression-and-hearing-devices"],
  },
  {
    id: "behavioural-battery-target-versus-model-accuracy",
    prompt:
      "Tell me about a time (or how you would handle it) when the model you built did not fit the battery or latency target set by the firmware and product teams, and the only ways to hit the target cost accuracy. How do you resolve it with the other teams, and how do you decide when to say no?",
    roles: ["edge-ml"],
    level: "senior",
    kind: "behavioural",
    topics: ["trade-offs", "stakeholders", "battery", "communication"],
    minutes: 20,
    strong: [
      "Describes a concrete situation with numbers: the target (for example hours of battery or milliseconds), the measured shortfall, and the accuracy cost of each option, not a vague disagreement.",
      "Reframes accuracy as a user outcome: which conditions and slices lose accuracy and what the wearer would notice, instead of defending an average that hides the tails.",
      "Lays out options with their costs: a smaller or quantised model, a cascade that wakes a larger model only when needed, a larger block, a lower duty cycle, a different chip, or a lower target, each with a measured energy and accuracy figure on the target hardware.",
      "Brings evidence and a prototype, not opinion: measurements at the battery, p99 latency, and a field or lab test with realistic inputs, so the discussion is about data.",
      "Shows how the decision was made and who owned it: the product owner decides the trade-off with the facts in front of them, the engineer states the risk plainly, and the choice and its assumptions are written down.",
      "Knows when to say no: when the proposal would cause audible glitches, a safety or regulatory problem, or an accuracy loss for a vulnerable group, and offers an alternative rather than only a refusal.",
      "Reflects on the outcome and what was learned, such as involving firmware early, agreeing budgets before architecture is chosen, or building a power and latency check into continuous integration.",
    ],
    followUps: [
      {
        q: "The product owner insists on the original target and the accuracy loss. How do you proceed?",
        lookFor: "Make the cost visible with per-slice results, propose a time-boxed experiment or a staged release, record the decision and the risk, and escalate if the loss would harm users, while respecting that the owner decides within safe limits.",
      },
      {
        q: "The firmware team says the model team always overruns its budget. What do you change?",
        lookFor: "Agree shared budgets for memory, latency and energy early, make them tests in continuous integration, and share a profiling set so both teams see the same numbers.",
      },
      {
        q: "What would you do differently next time?",
        lookFor: "A specific process change with a measurable effect, not a general intention.",
      },
    ],
    redFlags: [
      "Describes a conflict with no numbers or outcome.",
      "Blames the other team.",
      "Always says yes, or always says no.",
      "Hides an accuracy loss or reports only the average.",
    ],
    lessons: ["edge/real-time-on-a-budget", "edge/quantization-for-edge", "edge/edge-vs-cloud-inference"],
  },
  {
    id: "adapters-and-base-model-versions-across-a-device-fleet",
    prompt:
      "Your app ships a small on-device language model with a LoRA adapter per feature. Phones in the field have three base-model versions, a vendor's system model can change under you, and each adapter only works with one base version. Design how you version, deliver, test and roll back models and adapters, and what the app does when the right combination is not available.",
    roles: ["edge-ml"],
    level: "senior",
    kind: "design",
    topics: ["on-device llm", "lora", "versioning", "fleet"],
    minutes: 35,
    strong: [
      "States the constraint: a LoRA adapter is trained against one exact base model, so a new base version needs new adapters, and any platform-provided model that can change under you makes the combination a moving target.",
      "Uses a manifest for every artefact: version and content hash, the base-model version it needs, device classes and memory required, chat template and thresholds, the version it replaces and the version to fall back to.",
      "Treats the pair (base, adapter) as the unit of release: ships and tests matched pairs, refuses to load a mismatched adapter, and records the training-data snapshot and hyperparameters so adapters can be retrained when the base changes.",
      "Decides between shipping your own base model (control, but you ship and update the weights and test every device class) and using a platform model (no download or memory cost, but you cannot freeze it). Checks each vendor's current documentation for update behaviour rather than assuming.",
      "Builds a test matrix of base version by adapter version by device class, with golden prompts and a task metric per feature, run in continuous integration, plus a check on the device after install.",
      "Rolls out in stages by device class, with halt rules on crash, out-of-memory, latency and output statistics, and publishes a rollback as a new, higher version that points at the old weights, since update clients refuse to go backwards.",
      "Defines the fallback when no valid pair exists: a simpler deterministic feature, a smaller generic model, or (only with consent and a clear message) the cloud, and never a silent mismatched load.",
      "Handles personalised adapters: a user's adapter belongs to one base version, so plan how it is migrated, retrained locally or discarded when the base changes, and say what the user sees.",
    ],
    followUps: [
      {
        q: "A platform vendor announces a new system model and that adapters must be re-trained. What is your plan and timeline?",
        lookFor: "Pin to what you can test, build the new adapters and the test matrix early, keep the old pair working while the old base exists, release behind a version check, and watch metrics by base version.",
      },
      {
        q: "Storage is tight. How many adapters can you keep?",
        lookFor: "Adapters are small relative to the base (the rank-r matrices are about 2r/d of a full matrix, around 0.8% for r = 16 and d = 4,096), so storage is manageable, but each also needs testing; load on demand and delete unused ones.",
      },
      {
        q: "How do you detect that a mismatched pair is running in the field?",
        lookFor: "Report the loaded base and adapter versions as labels on every counter, alert on combinations outside the manifest, and refuse at load time.",
      },
    ],
    redFlags: [
      "Assumes an adapter keeps working after the base model changes.",
      "Relies on a platform model staying the same.",
      "Silently falls back to the cloud without consent.",
      "Has no per-version labels on field metrics.",
    ],
    lessons: ["edge/small-language-models-on-device", "edge/shipping-to-a-fleet", "llm/fine-tuning-in-practice"],
  },
  // ---------------------------------------------------------------- research
  {
    id: "paper-claims-plus-point-eight-what-to-check",
    prompt:
      "A paper claims its new method beats the previous best by 0.8 points on a benchmark. The abstract gives the headline number. Walk me through how you would read the paper to decide whether to trust and build on it. If the table reports 5 runs per method with a standard deviation of 0.6 for each, is the 0.8-point gap convincing?",
    roles: ["research"],
    level: "junior",
    kind: "concept",
    topics: ["reading papers", "evaluation validity", "statistics", "reproducibility"],
    minutes: 15,
    strong: [
      "Reads in passes: title, abstract, introduction, headings and conclusions first to decide whether to continue, then figures and tables with care, and a full re-creation only if building on the work.",
      "Treats the abstract as a list of claims and looks for the evidence and the doubts in the tables, ablations and conclusion.",
      "Asks what is compared with what: is there a baseline scored the same way, on the same data and metric, with a similar tuning and compute budget? A well-tuned new method against a default-settings baseline proves little.",
      "Checks which data the settings were chosen on: the test set should be used once at the end, and a separate development set should pick hyperparameters.",
      "Looks for an ablation that removes one part at a time, and for the cost (parameters, training time, compute), since a gain from a model a hundred times larger is a different claim.",
      "Does the arithmetic on spread: the standard error of each mean is 0.6 / sqrt(5) = 0.27, the standard error of the difference is about sqrt(2) x 0.27 = 0.38, so 0.8 is about 2.1 standard errors and an approximate 95% interval is 0.06 to 1.54. That is suggestive but weak: the lower end is near zero, and five runs estimate the spread poorly.",
      "Looks for code, data and a script that reproduces the main table, checks the licence and the maintenance state, and runs a small version before relying on the result.",
    ],
    followUps: [
      {
        q: "The table shows a single run per method with no spread. What do you conclude and what do you do?",
        lookFor: "The claim is unsupported until the noise is known: re-run several seeds if the code is available, compare with a significance test or interval, and look for corroboration on other benchmarks and from other groups.",
      },
      {
        q: "The baseline numbers in the paper are lower than the ones in the baseline's own paper. What does that suggest?",
        lookFor: "A weakened or untuned baseline or a different evaluation protocol; re-run the baseline with its published settings, and consider that a real gain may be smaller.",
      },
      {
        q: "When is a result worth reading in pass three?",
        lookFor: "When you will build on it or review it: work out how you would do it yourself, compare with the paper to find hidden assumptions, and write five-line notes (claim, evidence, doubts, context, what to try).",
      },
    ],
    redFlags: [
      "Trusts the abstract number without opening the results table.",
      "Calls a gap real because it is positive, without looking at the spread.",
      "Does not ask what was tuned and on which data.",
      "Assumes a published paper has been reproduced.",
    ],
    lessons: ["skills/reading-an-ai-paper", "ml/is-the-difference-real"],
  },
  {
    id: "loss-flat-at-chance-overfit-one-batch-first",
    prompt:
      "You train a 1,000-class image classifier from scratch and the training loss sits near 6.9 for the first 5,000 steps and never moves. Where does that number come from, and in what order do you debug it?",
    roles: ["research"],
    level: "junior",
    kind: "debugging",
    topics: ["training", "debugging", "loss", "optimisation"],
    minutes: 20,
    strong: [
      "Recognises 6.9 as chance: cross-entropy for 1,000 equally likely classes is ln(1000) = 6.908, so the model is outputting near-uniform predictions and has learned nothing, not that it is learning slowly.",
      "Starts with the cheapest, most informative test: try to overfit a handful of examples (one batch). If the loss cannot go near zero there, something is broken in the code or setup, and no tuning will fix it.",
      "Checks the data path: labels match inputs after shuffling, normalisation and augmentation are sane, a few images and labels are looked at by eye, and there are no constant or NaN inputs.",
      "Checks the model and loss: the loss is applied to logits or probabilities as the framework expects, the model is in training mode, gradients are non-zero and reach the early layers, and the right parameters are in the optimiser.",
      "Checks optimisation settings: a learning rate that is far too small (or large and clipped), no warm-up for an optimiser with unsettled averages, a bad initialisation for the activation used, and dead ReLU units.",
      "Changes one thing at a time and logs the result, comparing with a known-good reference such as a standard recipe on a small dataset.",
      "Once the tiny batch overfits, scales up in steps (more data, then the full run), and tracks training and validation loss and gradient norms.",
    ],
    followUps: [
      {
        q: "The model overfits one batch but not the full set. What are the suspects?",
        lookFor: "Learning-rate and schedule problems, data-pipeline errors that appear only at scale (label shuffling, corrupted shards), too-strong augmentation or regularisation, or a model too small; test with larger subsets to find the point where it breaks.",
      },
      {
        q: "The loss does fall, but training loss is 0.3 and validation loss is rising. Now what?",
        lookFor: "Overfitting: more data or augmentation, weight decay, dropout, early stopping against the best validation checkpoint, and a check that the validation set is not leaking.",
      },
      {
        q: "Why check gradient norms by layer?",
        lookFor: "To find vanishing or exploding signals: a layer with near-zero gradients is not learning, and a huge one predicts instability; this points to initialisation, normalisation or learning-rate fixes.",
      },
    ],
    redFlags: [
      "Starts a large hyperparameter sweep before checking for a bug.",
      "Does not know where the 6.9 comes from.",
      "Changes many settings at once.",
      "Never looks at the data.",
    ],
    lessons: ["deep-learning/training-deep-networks", "deep-learning/inside-a-neural-network", "deep-learning/backprop-from-scratch"],
  },
  {
    id: "thirty-configs-on-the-test-set-honest-reporting",
    prompt:
      "A colleague tried 30 hyperparameter configurations, evaluated each on the 1,000-example test set, and reports the best one at 82.6% against a 80.0% baseline. What is wrong with this, how large might the bias be, and what should the report and the process look like instead?",
    roles: ["research"],
    level: "junior",
    kind: "concept",
    topics: ["evaluation validity", "overfitting", "statistics", "experiment design"],
    minutes: 15,
    strong: [
      "Names the problem: the test set was used for selection, so it is no longer an unbiased estimate; choosing the maximum of many noisy scores builds in an upward bias.",
      "Quantifies the noise: at 80% on 1,000 examples the standard error is sqrt(0.8 x 0.2 / 1000) = 1.26 points, so single scores wobble by that much just from which examples were drawn.",
      "Quantifies the selection effect: the expected maximum of 30 independent standard normal draws is about 2.04, so if all 30 configurations were truly 80%, the best would typically show about 80 + 2.04 x 1.26 = 82.6%. The reported gain can be pure luck. (Configurations evaluated on the same examples have correlated errors, so the effect is somewhat smaller in practice, but it is still upward.)",
      "Gives the multiple-comparison arithmetic: at a 5% false-alarm rate, 30 comparisons give 1 - 0.95^30 = 79% chance of at least one false win.",
      "Fixes the process: choose hyperparameters on a development or validation set, run the test set once for the final choice, and keep it out of every decision.",
      "Fixes the report: state how many configurations were tried, give an interval (or several seeds) for the final number, compare with a baseline tuned with the same effort, and confirm the winner on fresh cases.",
      "Notes that a bigger test set shrinks the noise only with the square root of its size, and that a stricter threshold (for example 0.05 / 30) or a confirmation run is the cure for many tries.",
    ],
    followUps: [
      {
        q: "There is no spare data. How do you select and still report honestly?",
        lookFor: "Use cross-validation or a nested split for selection, split by the unit that repeats (user, document), and report the nested estimate, being clear about the remaining uncertainty.",
      },
      {
        q: "The baseline was run with default settings and the new method was tuned. Is the comparison fair?",
        lookFor: "No: give the baseline a comparable tuning budget, and report the budget for both, since part of the gain may come from tuning.",
      },
      {
        q: "How would you tell whether the 2.6-point gain survives?",
        lookFor: "Evaluate the chosen configuration on a fresh held-out set with a paired comparison and an interval; expect shrinkage towards the baseline.",
      },
    ],
    redFlags: [
      "Reports the best of many runs on the test set as the result.",
      "Does not say how many configurations were tried.",
      "Believes a bigger gap than the noise must be real regardless of how many tries were made.",
      "Gives the baseline less tuning than the new method.",
    ],
    lessons: ["ml/is-the-difference-real", "evals/building-an-eval-dataset", "ml/overfitting-and-bias-variance"],
  },
  {
    id: "ablation-plan-seeds-noise-and-gpu-hours",
    prompt:
      "You are adding a new module to a 300M-parameter model and want an ablation showing it helps. Run-to-run noise from different random seeds is about 0.4 points (standard deviation) on your metric, you care about a gain of 0.5 points, and each training run costs 4 GPU-hours (an example figure). Design the ablation. How many seeds per arm, how much compute, and what else do you control?",
    roles: ["research"],
    level: "mid",
    kind: "design",
    topics: ["ablations", "experiment design", "statistics", "compute budget"],
    minutes: 25,
    strong: [
      "Defines the question and the arms: full model against the same model without the module, with everything else identical (data order, schedule, parameter count where relevant), and says whether parameter count and compute are controlled, since a bigger model may help for reasons unrelated to the module.",
      "Computes the seeds for two separate groups: n per arm = 2 x sigma^2 x (1.96 + 0.84)^2 / delta^2 = 2 x 0.16 x 7.84 / 0.25 = about 10.0, so 11 seeds per arm for a 5% two-sided test at 80% power. Detecting a 1-point gap needs only 3 per arm, and a 0.25-point gap needs about 41.",
      "Computes the cost: 22 runs x 4 GPU-hours = 88 GPU-hours for one ablation, which shows that a many-component ablation table is expensive and must be planned.",
      "Suggests variance reduction: share the data order and initialisation where valid, use paired comparisons, evaluate on a larger or more stable test set, and average checkpoints, then measure the noise rather than assuming it.",
      "Separates the sources of randomness (initialisation, data order, augmentation) and reports the spread of the metric, not a single run.",
      "Reports mean, spread and an interval for the difference, and states the smallest effect that would change a decision before the experiment, instead of hunting for significance afterwards.",
      "Controls the tuning budget: if the module changes the best learning rate or other settings, each arm needs a fair sweep, or the result reflects the tuning rather than the module.",
      "Plans for scale: a gain at 300M may not transfer to 3B, so check at two sizes if the claim is about scale.",
    ],
    followUps: [
      {
        q: "You can afford only 6 runs per arm. What can you claim?",
        lookFor: "Only a larger effect (about 0.7 points here) with 80% power; otherwise say the experiment is underpowered, widen the interval, and avoid claiming no effect from a non-significant result.",
      },
      {
        q: "The module helps by 0.6 points on average but hurts on one data slice. What do you report?",
        lookFor: "Both: slice-level results with intervals, since an average can hide a regression; check whether the slice matters for the use case, and do not drop the slice.",
      },
      {
        q: "How would you know the ablation is not just a learning-rate effect?",
        lookFor: "Sweep the learning rate for both arms (or at least bracket it), and compare each arm at its own best setting.",
      },
    ],
    redFlags: [
      "Runs one seed per arm and declares a winner.",
      "Compares arms that differ in more than the module without saying so.",
      "Decides the effect size after seeing the results.",
      "Reports only the average and no spread.",
    ],
    lessons: ["ml/is-the-difference-real", "skills/reading-an-ai-paper", "deep-learning/training-deep-networks"],
  },
  {
    id: "cannot-reproduce-a-paper-two-points-lower",
    prompt:
      "You re-implement a published model and consistently land 2 points below the reported accuracy, even across five seeds. The authors released code but it is hard to run. How do you find the gap, how long do you spend, and what do you do with the result?",
    roles: ["research"],
    level: "mid",
    kind: "debugging",
    topics: ["reproducibility", "debugging", "reading papers", "experiment design"],
    minutes: 25,
    strong: [
      "First checks the gap against the noise: five seeds with a spread of, say, 0.3 points make a consistent 2-point shortfall real, not luck, so it deserves investigation. A single run would not.",
      "Compares the evaluation, not the training, first: same test split and version, same metric definition, same preprocessing and tokenisation, same decoding or thresholding, and same handling of ties and missing items. Evaluation differences are common and cheap to check.",
      "Runs the authors' code and checkpoint, if released, through your evaluation. If their checkpoint scores as reported in your harness, the problem is in training; if not, it is in evaluation.",
      "Lists training details that move results: learning-rate schedule and warm-up length, batch size and the matching learning rate, weight decay and which parameters it applies to, initialisation, mixed-precision settings, data filtering and deduplication, augmentation, epochs, and checkpoint selection. A small setup detail can change an answer, as the Kaplan versus Chinchilla discrepancy showed.",
      "Checks that the baseline and the paper's setting are comparable and re-tunes the baseline fairly, since the original gain may come from tuning budget.",
      "Time-boxes the work and records every change and result in a log, changing one thing at a time. Contacts the authors with a specific question and results, and checks issues in the repository.",
      "Concludes honestly: report your result with the details of what you could and could not match, because failures to reproduce are information. Cites how often it happens, for example a study that could reproduce only 7 of 18 recommender papers with reasonable effort, without implying that any one paper is wrong.",
    ],
    followUps: [
      {
        q: "The released checkpoint also scores 2 points lower in your harness. What now?",
        lookFor: "Evaluation mismatch: compare predictions example by example against any released outputs, check data version and metric implementation, and ask the authors.",
      },
      {
        q: "After a week you recover 1.2 of the 2 points. Do you keep going?",
        lookFor: "Decide by value: how much the remaining gap matters to your goal, what the next candidate causes are, and the cost. A written, partial reproduction is useful and may be enough to proceed.",
      },
      {
        q: "How do you avoid creating this problem for others in your own paper?",
        lookFor: "Release code and configuration, report the seeds and spread, state the tuning budget, include the evaluation script and data versions, and use a reproducibility checklist.",
      },
    ],
    redFlags: [
      "Assumes the paper is wrong or the authors are dishonest.",
      "Changes many things at once.",
      "Spends weeks without a time-box or a log.",
      "Never checks the evaluation code.",
    ],
    lessons: ["skills/reading-an-ai-paper", "deep-learning/training-deep-networks", "deep-learning/scaling-laws"],
  },
  {
    id: "sweep-budget-successive-halving-arithmetic",
    prompt:
      "You want to tune 64 hyperparameter configurations for a model whose full training run takes 20 GPU-hours, but your budget is 400 GPU-hours (example figures). Design a search that fits, show the arithmetic for successive halving, and explain how it can mislead you.",
    roles: ["research"],
    level: "mid",
    kind: "estimation",
    topics: ["hyperparameter search", "compute budget", "experiment design", "optimisation"],
    minutes: 20,
    strong: [
      "Starts with the baseline cost: 64 full runs x 20 GPU-hours = 1,280 GPU-hours, which is 3.2 times the budget.",
      "Describes successive halving: train all configurations briefly, keep the best half, give the survivors twice the budget, and repeat until one or a few reach a full run.",
      "Shows the schedule: 64 configurations x 1.25 h = 80, 32 x 2.5 h = 80, 16 x 5 h = 80, 8 x 10 h = 80, 4 x 20 h = 80, a total of 400 GPU-hours, which fits and is 3.2 times cheaper than the full grid.",
      "Explains the risk: early performance does not always predict final performance. Large learning rates or long warm-ups look bad early and can win later, and a cosine schedule that is cut short is not the same as an early snapshot of the full one; rank at the end of each stage using the same schedule shape that the full run will use.",
      "Says noise matters: with a few seeds a small gap at an early stage is a coin flip, so do not cut configurations whose scores are within noise, or keep more survivors.",
      "Keeps the final comparison honest: select on a validation set, evaluate the best one on a held-out test set once, and report the number of configurations tried.",
      "Considers alternatives: random search over a good range often beats a grid, tune the learning rate first because it matters most, and transfer settings from smaller scale with care.",
    ],
    followUps: [
      {
        q: "Your learning-rate sweep shows the best value at the edge of the range. What do you do?",
        lookFor: "Extend the range, since the optimum is outside it; a best value on the boundary means the sweep has not found the peak.",
      },
      {
        q: "Training is unstable at the highest learning rates. Does that mean you drop them?",
        lookFor: "Check warm-up and gradient clipping before dropping them; instability may be fixable and the stable region is what the final run needs, but record the failure.",
      },
      {
        q: "Why keep some of the 400 hours unspent?",
        lookFor: "To rerun a failed or surprising run and to confirm the winner with extra seeds; a plan that uses 100% on exploration leaves no room for the finding to be checked.",
      },
    ],
    redFlags: [
      "Runs a full grid without checking it against the budget.",
      "Eliminates configurations by a noisy early score without a thought for schedule shape.",
      "Selects and reports on the same data.",
      "Does not say how many configurations were tried.",
    ],
    lessons: ["deep-learning/training-deep-networks", "deep-learning/scaling-laws", "ml/is-the-difference-real"],
  },
  {
    id: "fine-tune-improved-task-but-forgot-general-ability",
    prompt:
      "You fine-tune a language model on 20,000 domain examples. The domain metric rises from 61% to 78%, but a general instruction-following and reasoning suite drops by 6 points, and the model sometimes ignores system-prompt rules. Diagnose this, say what you would try, and say how you would show that the final model is a real improvement.",
    roles: ["research"],
    level: "mid",
    kind: "debugging",
    topics: ["fine-tuning", "catastrophic forgetting", "evaluation validity", "post-training"],
    minutes: 25,
    strong: [
      "Names the effect: catastrophic forgetting. Training hard on a narrow task can damage general instruction following, other languages and safety behaviour, so a regression suite on the base and the tuned model is needed alongside the task set.",
      "Checks the basics: the same chat template as will be served is used for training, loss is computed on the answer only, end-of-turn tokens are present, and the data is deduplicated and split before training so that the 17-point gain is not leakage.",
      "Lists the levers that reduce forgetting: a lower learning rate, fewer epochs and early stopping on a mixed validation set, parameter-efficient methods such as LoRA instead of full fine-tuning, and mixing some general instruction data into the training set.",
      "Treats the data as a possible cause: inconsistent targets, very repetitive examples, or an unrepresentative style can teach shortcuts, so audit samples and agreement between annotators.",
      "Evaluates against real alternatives: the base model with a good prompt, and if relevant a stronger model with that prompt, on the same held-out set and metric, reporting quality, latency and cost.",
      "Compares with intervals and slices: a paired comparison, per-slice results (including the system-prompt rules), and several seeds if the run is cheap enough, since a 17-point gain is probably real but the 6-point loss needs an interval too.",
      "Considers whether fine-tuning is the right tool: knowledge that changes belongs in retrieval, and a prompt or a small adapter per task may meet the need without touching general ability.",
    ],
    followUps: [
      {
        q: "Mixing in 20% general data reduces the loss to 2 points but costs 3 points on the domain metric. How do you choose?",
        lookFor: "Decide from the product's needs: what the general ability is worth for this use, the cost of each point, and whether a router or separate adapters avoid the trade-off; make the choice with the metrics in front of stakeholders.",
      },
      {
        q: "How do you detect the system-prompt problem before users do?",
        lookFor: "Add instruction-hierarchy and format-following cases to the regression suite and run them on every candidate; gate the release on them.",
      },
      {
        q: "The base model is updated by the vendor next quarter. What does that mean for your adapter?",
        lookFor: "An adapter works only with the exact base it was trained on, so version everything (base, adapter, data snapshot, template, hyperparameters, evals) to retrain and re-evaluate.",
      },
    ],
    redFlags: [
      "Reports only the domain metric.",
      "Does not compare with the base model plus a good prompt.",
      "Trains and serves with different chat templates.",
      "Says forgetting is impossible with parameter-efficient methods.",
    ],
    lessons: ["llm/fine-tuning-in-practice", "deep-learning/self-supervised-and-transfer-learning", "evals/evals-101"],
  },
  {
    id: "code-paired-bootstrap-for-model-difference",
    prompt:
      "Write Python (standard library only) that takes two lists of per-example 0/1 results for models A and B on the same cases and returns the observed difference (B minus A) with a 95% paired bootstrap interval. Check it on 100 cases where both pass on 75, only A passes on 5, only B passes on 8, and both fail on 12. What does the interval say, and what would a sign test say?",
    roles: ["research"],
    level: "mid",
    kind: "coding",
    topics: ["statistics", "evals", "coding", "bootstrap"],
    minutes: 25,
    strong: [
      "Resamples whole cases with replacement (keeping the pair of results for each case together), recomputes the mean difference on each resample, and takes the 2.5th and 97.5th percentiles of several thousand resamples as the interval.",
      "Seeds the random number generator for repeatability, validates equal lengths and non-empty input, and states the number of resamples.",
      "Gets the example right: A passes 80, B passes 83, the difference is +3 points, and the interval from 10,000 resamples is roughly -4 to +10 points. It includes zero, so the data cannot say B is better.",
      "Explains why pairing helps: the 75 and 12 cases where both agree carry no information about which is better; all the information is in the 13 disagreements (B won 8, A won 5), and a hard case is hard for both, so pairing removes shared difficulty.",
      "Runs the sign test on the disagreements: if the models were equal, 13 splits would be like coin flips, and P(at least 8 of 13 either way) = 2 x 0.2905 = 0.58. Ten times the data with the same proportions (80 against 50) gives p of about 0.011.",
      "Says what a p-value is not: not the chance that B is better and not the size of the effect; reports the effect size with its interval and decides in advance what gap would matter.",
      "Notes limits: cases from the same document or user are not independent so resample by group, a model judge adds noise, and running each case several times reduces output noise but does not replace more distinct cases.",
    ],
    followUps: [
      {
        q: "How many cases would you need to detect a 5-point gap from 70% pass rate with two separate groups, and how does pairing change it?",
        lookFor: "About 1,252 per model for separate groups with a two-sided 5% test and 80% power; if the models disagree on about 15% of cases, a paired design needs about 469.",
      },
      {
        q: "Your 400 cases come from 40 documents with 10 questions each. What do you change in the bootstrap?",
        lookFor: "Resample documents (clusters) and keep their questions together, since questions from one document are correlated; the interval gets wider than the case-level one.",
      },
      {
        q: "Why not just compare the two confidence intervals for A and B and see whether they overlap?",
        lookFor: "That throws away the pairing, giving a wider and less sensitive comparison; analyse the per-case differences directly.",
      },
    ],
    redFlags: [
      "Resamples the two models' results independently.",
      "Declares B better because 83 is greater than 80.",
      "Reads a p-value as the probability that B is better.",
      "Forgets to seed the random generator or to check the input lengths.",
    ],
    lessons: ["ml/is-the-difference-real", "evals/evals-101", "evals/building-an-eval-dataset"],
  },
  {
    id: "behavioural-result-that-did-not-hold-up",
    prompt:
      "Tell me about a time (or how you would handle it) when a result you or your team had shared turned out to be wrong, weaker than reported, or not reproducible. How did you find out, how did you communicate it and what did you change in how you work?",
    roles: ["research"],
    level: "mid",
    kind: "behavioural",
    topics: ["integrity", "communication", "reproducibility", "experiment design"],
    minutes: 15,
    strong: [
      "Describes a specific case: what the claim was, how it was found to be wrong (a leak, a bug, a lucky seed, an evaluation difference, selection on the test set), and how large the error was in numbers.",
      "Acted quickly and openly: told the people who relied on the result as soon as it was clear, instead of waiting for a perfect explanation, and said what was known and unknown.",
      "Separated the facts from blame: focused on how the process allowed the error, not on a person.",
      "Fixed the immediate issue with evidence: re-ran with a clean split or more seeds, reported the corrected number with an interval, and withdrew or updated the claim in writing.",
      "Changed the process: held-out sets that no one tunes on, fixed seeds and logs, a second person reproducing key numbers before announcements, and a checklist of leakage and baseline checks.",
      "Shows the right attitude to negative results: they are information, and an honest correction builds trust more than a hidden problem would.",
      "Reflects on what they would do earlier next time, such as sanity checks on suspiciously good results, rather than a vague promise.",
    ],
    followUps: [
      {
        q: "The result had already been shown to leadership and a decision depended on it. What did you do?",
        lookFor: "Tell the decision-makers directly with the corrected number, the impact on the decision and options, rather than letting it fade.",
      },
      {
        q: "How do you decide when a surprisingly good result needs extra checks?",
        lookFor: "Treat large gains as a trigger for leakage, evaluation and baseline checks; look for the simplest explanation before the most exciting one.",
      },
      {
        q: "A junior colleague finds an error in your result. How do you react?",
        lookFor: "Thank them, verify, correct publicly, and make it easy for others to raise problems.",
      },
    ],
    redFlags: [
      "Says they have never been wrong.",
      "Blames the data, tools or colleagues.",
      "Quietly changes the result without telling anyone.",
      "Takes no process lesson from it.",
    ],
    lessons: ["skills/reading-an-ai-paper", "ml/is-the-difference-real", "evals/building-an-eval-dataset"],
  },
  {
    id: "extrapolate-scaling-law-from-small-runs-design",
    prompt:
      "You will spend one large run, about 100 times the compute of anything you have trained before, and want to choose the model size and token count from small experiments. Design the study: which runs, how you fit, how you check the extrapolation, and what the fit will not tell you.",
    roles: ["research"],
    level: "senior",
    kind: "design",
    topics: ["scaling laws", "experiment design", "compute budget", "pretraining"],
    minutes: 35,
    strong: [
      "Explains the target: loss follows a power law in parameters, tokens and compute, which is a straight line on log-log axes, so a few cheap runs across sizes can predict a costly one. For example, 10x compute multiplies the reducible loss by 10^-0.05 = 0.89 when the fitted exponent is about 0.05.",
      "Designs the runs: several model sizes across at least two orders of magnitude, each trained at several token counts (IsoFLOP slices at fixed compute), using the same recipe, with learning rate and batch size tuned at each scale, because small details of optimiser tuning, warm-up and counting moved the answer in the Kaplan versus Chinchilla discrepancy.",
      "Uses the compute rule C is about 6 x N x D FLOPs to place each run on the compute axis and to compare the options at equal budget, and expects the estimate to be accurate only to tens of per cent.",
      "Fits the form with a floor (an irreducible loss term) and checks sensitivity to the assumed floor and to the fitting method, since a power law can look excellent in range and still miss one decade later.",
      "Validates by holding back the largest runs: fit on the smaller ones, predict the held-back ones, and report the error. Quantifies sensitivity: an error of 0.005 in an exponent of 0.05, extrapolated over 3 decades, is a factor of 10^(3 x 0.005) = 1.035 on the reducible part.",
      "Notes the shallow bowl: near the optimum, the loss changes little for a model somewhat larger or smaller, so the decision can include serving cost; a smaller model trained on more tokens can be cheaper to run for the same loss, and production practice often over-trains for that reason.",
      "States what it will not tell you: scaling fits predict loss on a distribution, not particular capabilities; the data mix and quality shift the constants; repeated data stops helping after a few epochs; and every extrapolation is a hedge, so keep a margin and checkpoints.",
    ],
    followUps: [
      {
        q: "Your fit says 20 tokens per parameter but a published rule says something different for a different data mix. Which do you trust?",
        lookFor: "Your own fit on your data and recipe, with checks; tokens-per-parameter ratios are measured properties of a setup, not laws, and data quality changes the optimum.",
      },
      {
        q: "The held-back run misses your prediction by 4% of the loss above the floor. What do you do?",
        lookFor: "Investigate the recipe at that scale (learning rate, batch size, instability), refit including it, widen the uncertainty and avoid committing the full budget on a poor extrapolation; consider an intermediate run.",
      },
      {
        q: "How do you count serving cost into the choice?",
        lookFor: "Add lifetime inference compute, about 2 x N per served token, to training compute, and find the point where a smaller, longer-trained model repays its extra training; check with the expected traffic.",
      },
    ],
    redFlags: [
      "Fits a power law to three points and extrapolates across several orders of magnitude without a held-back check.",
      "Treats a tokens-per-parameter ratio from a paper as a universal law.",
      "Uses one fixed learning rate across all model sizes.",
      "Assumes loss predictions translate directly into benchmark scores.",
    ],
    lessons: ["deep-learning/scaling-laws", "deep-learning/training-deep-networks", "infra/training-infrastructure"],
  },
  {
    id: "leaderboard-score-high-internal-task-poor-validity",
    prompt:
      "A model near the top of a public leaderboard performs poorly on your team's internal task. You are asked to explain why and to build an evaluation the team can trust when choosing between models. What are the reasons a benchmark score can mislead, and how would you build and maintain the replacement?",
    roles: ["research"],
    level: "senior",
    kind: "design",
    topics: ["evaluation validity", "benchmarks", "contamination", "evals"],
    minutes: 30,
    strong: [
      "Separates construct validity (does the benchmark measure what you care about?) from reliability (does it give stable numbers?). A benchmark measures a narrow task under specific settings, and your task is probably not in it.",
      "Lists known ways scores mislead: contamination (test questions leaked into training data, so the model has seen the answers), saturation (little headroom between top models), prompt and format sensitivity, cherry-picked settings, and differences in how each lab ran the test.",
      "Checks contamination practically: look for overlap between benchmark items and training data when it is available, test with reworded or newly written variants, and prefer benchmarks that refresh with new questions, such as one that adds recent questions monthly. Treats a large drop on variants as a warning sign, not proof.",
      "Builds the internal set from real inputs: sample production or realistic cases, include the failure modes and edge cases found by error analysis, write reference answers and rubrics, and have more than one person label a sample to measure agreement.",
      "Keeps development and held-out splits, splits by the unit that repeats (customer, document), and never tunes prompts on the held-out set; refreshes cases as the product changes and adds each incident as a new case.",
      "Reports with uncertainty: intervals on every score, paired comparisons between models on the same cases, slices that matter, and the cost and latency next to quality. If a model judge is used, validates it against human labels.",
      "Keeps the public benchmark as one input: use it as a coarse filter for which models to try, and decide on the internal evaluation, re-running it when the model, prompt or provider changes.",
    ],
    followUps: [
      {
        q: "Two models differ by 1.5 points on your internal set of 200 cases. How do you present it?",
        lookFor: "A paired interval, which at that size will usually include zero; say what extra cases would be needed to resolve it, and decide on cost, latency and robustness if quality is a tie.",
      },
      {
        q: "A vendor shows a new benchmark where its model leads. What do you ask?",
        lookFor: "Who built it, whether items could be in training data, what settings were used for the other models, whether the task matches yours, and whether the results are independently reproduced.",
      },
      {
        q: "How do you prevent the internal set itself from becoming contaminated?",
        lookFor: "Keep it private and access-controlled, avoid pasting cases into public tools or vendor training programmes, rotate or add fresh cases, and keep a never-tuned held-out part.",
      },
    ],
    redFlags: [
      "Picks a model from a leaderboard rank alone.",
      "Builds the internal set from the same data used to tune prompts.",
      "Reports differences between models with no interval.",
      "Treats contamination as impossible or as the only explanation.",
    ],
    lessons: ["llm/choosing-and-comparing-models", "evals/building-an-eval-dataset", "evals/evals-101", "ml/is-the-difference-real"],
  },
  {
    id: "rl-run-most-groups-carry-no-signal",
    prompt:
      "You run reinforcement learning with verifiable rewards and group-relative advantages: 8 sampled answers per prompt, 32 prompts per step, up to 4,000 tokens per answer. Training reward climbs fast, but the held-out score barely moves, and logs show 78% of groups have all eight answers correct. Explain what is happening, what it costs, and how you would fix the run and verify the fix.",
    roles: ["research"],
    level: "senior",
    kind: "debugging",
    topics: ["reinforcement learning", "grpo", "post-training", "debugging"],
    minutes: 30,
    strong: [
      "Explains the advantage: with group-relative advantages (reward minus the group mean, over the group standard deviation), a group where all answers score the same has zero spread and zero advantage, so it teaches nothing.",
      "Reproduces the number: if a prompt's pass rate is p, the chance all 8 are correct is p^8, which is 0.78 at p = 0.97 and 0.43 at p = 0.9. A prompt set that is mostly easy gives mostly zero-signal groups. Real prompts vary, so measure the share directly rather than assuming one p.",
      "Costs it: each step samples 32 x 8 x 4,000 = 1,024,000 tokens at most, and sampling dominates RL compute, so 78% of those tokens bought no gradient signal.",
      "Explains the reward curve: a training reward that rises on easy prompts measures the sampler, not progress, and RL can only reinforce what the model already sometimes does. Held-out performance is the number to trust.",
      "Fixes the data: filter or down-weight prompts the model always solves, raise the share of intermediate-difficulty prompts (pass rates between about 0.1 and 0.9), and track the fraction of zero-advantage groups as a standing metric; also consider more samples per prompt for hard prompts.",
      "Checks other health signals: response length and its drift, entropy collapse, the KL distance to the reference model (the KL weight differs between recipes, so check the documentation of the library in use), format reward versus accuracy, and the highest-reward samples read by a person.",
      "Verifies the fix with a held-out evaluation that training never sees, a hidden second checker to catch gaming of the primary checker, several seeds, and an intervals-based comparison to the pre-RL model and to a supervised baseline.",
    ],
    followUps: [
      {
        q: "After filtering, reward on training prompts rises more slowly but held-out improves. Is that a problem?",
        lookFor: "No: harder prompts give lower reward but more signal, and held-out improvement is the goal; judge by the held-out set.",
      },
      {
        q: "No sample for a hard prompt is ever correct. What can you do?",
        lookFor: "There is no signal; use supervised data or easier curriculum steps for such prompts, or sample more, since RL reinforces only what the model sometimes does.",
      },
      {
        q: "The checker for a code task only runs the visible tests. What is the risk?",
        lookFor: "The model can special-case the visible tests or edit them; use hidden tests, sandbox the execution, and read samples.",
      },
    ],
    redFlags: [
      "Treats the rising training reward as proof the model is improving.",
      "Does not know why uniform groups give no learning signal.",
      "Fixes the loop by changing the optimiser while keeping the prompt mix.",
      "Has no held-out evaluation that training cannot touch.",
    ],
    lessons: ["deep-learning/rl-post-training", "deep-learning/reinforcement-learning-from-scratch", "llm/reasoning-models"],
  },
  {
    id: "allocate-two-thousand-gpu-hours-across-research-bets",
    prompt:
      "Your team has 2,000 GPU-hours for the quarter (an example figure) and three proposals: a safe improvement to the current training recipe, a risky new architecture, and a data-quality project. How do you decide how to spend the budget, what do you keep in reserve, and how do you set kill criteria?",
    roles: ["research"],
    level: "senior",
    kind: "estimation",
    topics: ["compute budget", "experiment design", "prioritisation", "research"],
    minutes: 25,
    strong: [
      "Starts from the outcome the team needs and the decision each experiment informs, not from which proposal is most interesting; asks what result would change what the team does.",
      "Reserves compute first: for example 25% (500 GPU-hours) for the final confirmation runs, extra seeds and reruns of failures, leaving 1,500 GPU-hours for exploration. A plan that spends everything on exploration cannot verify its own findings.",
      "Costs each bet in runs, not feelings: how many small-scale runs, seeds and ablations it needs (for example, 22 runs for one ablation at 11 seeds per arm), at what cost per run, and what scale the claim needs to hold at.",
      "De-risks cheaply: test the risky architecture first at small scale with a fixed budget and a clear success threshold, using a scaling check before spending on a large run, and keep sweeps efficient with early stopping such as successive halving.",
      "Sets kill criteria in advance: a metric, a threshold, a compute cap and a date, so a project that is not working is stopped, and the saved compute is reallocated.",
      "Values data work correctly: cleaning and deduplication runs are often cheap relative to training and can beat a recipe change, but need their own evaluation to show the gain is real.",
      "Plans communication: a log of experiments with costs, negative results recorded as well as positive, and a review every few weeks to rebalance with the evidence.",
    ],
    followUps: [
      {
        q: "A cluster outage consumes 200 GPU-hours. What gives?",
        lookFor: "Draw from the exploration budget before the confirmation reserve, drop the lowest-value experiments, and tell stakeholders what the change means for the plan.",
      },
      {
        q: "The risky architecture shows a promising 1-point gain at small scale. Do you scale it?",
        lookFor: "Check the gain against the noise across seeds, run a scaling check at a second size, and compare the cost and complexity; scale only if the trend holds.",
      },
      {
        q: "How do you stop the team over-tuning to the validation set across the quarter?",
        lookFor: "Keep a held-out set that is used rarely, count the number of comparisons made, and confirm final choices on fresh data.",
      },
    ],
    redFlags: [
      "Splits the budget evenly by proposal without regard to value or risk.",
      "Leaves no reserve for confirmation runs.",
      "Has no stopping rule for risky work.",
      "Treats compute as free once it has been allocated.",
    ],
    lessons: ["deep-learning/scaling-laws", "infra/training-infrastructure", "ml/is-the-difference-real"],
  },
  // ------------------------------------------------------------ sw-ai-tools
  {
    id: "review-an-agent-written-pull-request",
    prompt:
      "Your coding agent produced a 400-line pull request that adds a feature, and the tests are green. Before you approve it, what do you check, and why is green not enough?",
    roles: ["sw-ai-tools"],
    level: "junior",
    kind: "concept",
    topics: ["code review", "ai coding tools", "testing", "security"],
    minutes: 15,
    strong: [
      "Reads the diff, not the chat: the transcript says what the agent intended, the diff says what it did, and the author of the code is accountable for it, whoever typed it.",
      "Checks for invented names: functions, options or packages that do not exist or are not the ones meant. For every new dependency, verifies that it exists, is the right one and is maintained.",
      "Checks the logic the tests do not reach: off-by-one errors, boundary and empty cases, error paths and concurrency, and compares the behaviour with the actual requirement.",
      "Checks the tests themselves: whether any test was weakened, deleted or rewritten to pass, and whether new tests can fail (an assertion that cannot fail gives false confidence). Asks to see the command that was run and its output.",
      "Looks for security problems as in any code: unvalidated input, string-built queries, secrets in code or logs, overly broad permissions, and removed checks that were deleted to make an error disappear.",
      "Considers licences and provenance: code that may resemble licensed code, and follows the organisation's policy and scanners. This is not legal advice.",
      "Runs it and tries it: checks out the branch, runs the feature, and tests an input the author did not. Keeps the change small enough to review, and asks the agent to split a very large diff.",
    ],
    followUps: [
      {
        q: "The diff is 400 lines and you have 20 minutes. How do you prioritise?",
        lookFor: "Risk first: authentication, data handling, deletion and payment paths, new dependencies and test changes, then the core logic; ask for a split or a walkthrough of the design if it is too large to review properly.",
      },
      {
        q: "The agent also reformatted unrelated files. Why does that matter?",
        lookFor: "Noise hides real changes and makes review and reverts harder; ask for a separate formatting change or revert it.",
      },
      {
        q: "A teammate says reviewing AI code is a waste because the tests pass. What do you answer?",
        lookFor: "Tests only cover what they cover; the agent stops when the work looks done, so the checks that matter (requirements, security, design) still need a person.",
      },
    ],
    redFlags: [
      "Approves because the tests pass.",
      "Reviews the summary the agent wrote instead of the diff.",
      "Does not check new dependencies.",
      "Ignores changes to tests.",
    ],
    lessons: ["llm/ai-assisted-software-development", "evals/llm-security"],
  },
  {
    id: "when-not-to-use-an-ai-assistant-for-a-coding-task",
    prompt:
      "Your team lead asks you for a rule of thumb: which kinds of coding tasks should you hand to an AI assistant freely, and which should stay in human hands or under much closer review? Give examples and explain how you would decide for a task that is not on your list.",
    roles: ["sw-ai-tools"],
    level: "junior",
    kind: "concept",
    topics: ["ai coding tools", "risk", "judgement", "team conventions"],
    minutes: 15,
    strong: [
      "Gives the underlying rule: the costlier and harder to undo a mistake, and the weaker the automated checks, the more human attention a task needs.",
      "Gives examples to automate more freely: boilerplate and scaffolding, mechanical refactors with strong tests, drafting tests for existing behaviour (then reviewing the assertions), explaining unfamiliar code, summarising diffs, migrations that a script can verify, and first drafts of documentation.",
      "Gives examples to keep a person in charge: deciding what to build and what done means, architecture and naming that others live with, authentication, payments, cryptography and data deletion, approving merges and deployments, and anything touching secrets or production access.",
      "Uses two questions for a new task: how will I know it is right (a fast pass or fail check), and what is the damage if it is wrong and I miss it? If there is no check and the damage is high, do it by hand or review line by line.",
      "Notes situations where it is the wrong tool: code you could not review or explain, a problem you do not yet understand (you will not recognise a wrong answer), and code or data that policy forbids sending to the provider.",
      "Notes that autonomy is a dial: autocomplete, chat, edit, agent and background agent need different levels of review, and the more autonomous the tool, the more the job becomes specifying and checking.",
      "Says to measure, not guess: people have misjudged their own speed with AI tools, so time yourself on real tasks and revisit the rule.",
    ],
    followUps: [
      {
        q: "You are asked to change a function that handles refunds. How does your approach change?",
        lookFor: "Money movement is hard to undo: write or review tests first, use the assistant for drafts or explanations if at all, keep the change small, get a second reviewer, and check idempotency and failure paths yourself.",
      },
      {
        q: "A tool says it can do the whole migration overnight in the background. What controls do you want?",
        lookFor: "A sandbox with no production credentials, a branch and a pull request, a verification script, limits on steps and cost, and a person approving the merge.",
      },
      {
        q: "How do you avoid becoming dependent on the assistant for work you should understand?",
        lookFor: "Write the core piece yourself or explain every line of the generated version, and keep practising without the tool on the skills you need to review.",
      },
    ],
    redFlags: [
      "Says everything should be automated or nothing should.",
      "Has no way to check the output.",
      "Hands authentication or payment code to an agent with no extra review.",
      "Cannot explain code that was generated.",
    ],
    lessons: ["llm/ai-assisted-software-development", "systems/when-not-to-use-an-llm", "responsible/ai-and-work"],
  },
  {
    id: "behavioural-pasted-company-code-into-a-public-chatbot",
    prompt:
      "You realise you pasted a file containing an internal API key and customer-facing business logic into a public chatbot to debug it, and your company's policy says not to. What do you do in the next hour and the next week, and how do you want your team to treat this kind of mistake?",
    roles: ["sw-ai-tools"],
    level: "junior",
    kind: "behavioural",
    topics: ["security", "data leakage", "incident response", "team conventions"],
    minutes: 15,
    strong: [
      "Acts at once and tells the right people: reports to the security contact or manager promptly rather than hoping nobody notices, because early reporting limits the harm and the delay is what turns a mistake into a bigger problem.",
      "Treats the key as exposed: rotates or revokes it immediately, checks its logs for use, and confirms the new one is not in the code or the history.",
      "Records what was pasted, where, when and under which account or plan, since what happens to the text depends on the provider's terms and settings, which security and legal specialists check. Does not guess what the provider does with it.",
      "Deletes the conversation if the tool allows, while understanding that deletion does not prove the data was not retained.",
      "Fixes the cause: secrets belong in a secret manager and not in files, secret scanning and push protection catch them, and sensitive files are denied to tools by rule.",
      "Learns the policy and the approved options: which tools are approved for which data, an enterprise tool or a local model for sensitive code, and how to ask when it is unclear.",
      "Describes the team culture they want: blameless review focused on the system (why was a key in the file, why was the policy hard to follow), with the mistake as a prompt to improve guardrails, not a reason to hide.",
    ],
    followUps: [
      {
        q: "Nobody has noticed and the key was a test key with no access. Do you still report it?",
        lookFor: "Yes: the person who decides what matters is not you alone, the report is cheap, and the habit matters; the severity can be agreed by the right owner.",
      },
      {
        q: "How would you make the safe path the easy one for the team?",
        lookFor: "An approved tool with clear data rules, secret scanning and push protection, instruction files that tell the agent what not to read, and a short written policy with examples.",
      },
      {
        q: "A colleague tells you they did the same last month and said nothing. What do you do?",
        lookFor: "Encourage them to report, explain why early reporting helps, and raise it with the owner if they do not, without blame.",
      },
    ],
    redFlags: [
      "Stays silent and hopes it goes unnoticed.",
      "Does not rotate the key.",
      "Claims to know exactly what the provider did with the text.",
      "Blames the policy or the tool and learns nothing.",
    ],
    lessons: ["llm/ai-assisted-software-development", "evals/llm-security", "responsible/privacy-engineering-for-ai"],
  },
  {
    id: "agent-edits-the-tests-to-go-green",
    prompt:
      "You ask a coding agent to fix a failing test. After twenty minutes it reports success. Looking at the diff, you see that it loosened two assertions and added a special case that returns the expected value for the exact inputs in the test. What happened, how do you stop it recurring, and how do you design the task so the agent cannot take the shortcut?",
    roles: ["sw-ai-tools"],
    level: "mid",
    kind: "debugging",
    topics: ["testing", "ai coding tools", "reward hacking", "code review"],
    minutes: 20,
    strong: [
      "Names it: the agent optimised the visible check, a form of specification gaming. It stops when the work looks done, and a test that passes is all it has to go on, so loosening the test or special-casing the input satisfies the literal instruction without fixing the bug.",
      "Handles the immediate change: rejects it, restores the tests from version control, and re-runs the agent with a clearer task, rather than patching its output.",
      "Writes the task as an outcome with a boundary: describe the behaviour that must hold, say that the existing tests must not be edited, and name the files that may change.",
      "Makes the boundary real, not advisory: a request in a prompt may be skipped, so enforce it with a read-only or protected test directory, a hook or CI rule that fails when test files change in the same pull request without a reviewer, and a deny rule on edits.",
      "Adds checks the agent has not seen: hidden or extra tests, property-based or boundary tests, and a run in a clean checkout, because a special case for the visible inputs will fail on others.",
      "Reviews the diff for test changes first, looks for hard-coded expected values and conditions on test inputs, and asks the agent to show the command it ran and the output.",
      "Keeps the loop fast and small: scoped tasks with a quick, targeted test command, so mistakes are caught early; plans first for anything touching more than a couple of files.",
    ],
    followUps: [
      {
        q: "A legitimate fix needs to change a test because the requirement changed. How do you allow that without opening the loophole?",
        lookFor: "Separate the change: a person updates the requirement and the test in a reviewed commit first, then the agent implements against it.",
      },
      {
        q: "How would you measure how often your agent does this?",
        lookFor: "Sample its pull requests, count those that change tests or add input-specific branches, run a mutation or hidden-test check, and track the rate over time and across tools.",
      },
      {
        q: "Is this the same problem as in reinforcement learning from a checker?",
        lookFor: "Yes in kind: any optimisation against a checker can be gamed; hidden checks, read-only graders and reading transcripts are the shared defences.",
      },
    ],
    redFlags: [
      "Merges because the suite is green.",
      "Relies on a sentence in the prompt to prevent editing tests.",
      "Does not read the diff for test changes.",
      "Has no check the agent has not seen.",
    ],
    lessons: ["llm/ai-assisted-software-development", "deep-learning/rl-post-training", "evals/evaluating-agents"],
  },
  {
    id: "assistant-suggested-a-package-that-may-not-exist",
    prompt:
      "An assistant adds a dependency you have never heard of to solve a small problem, and the install works. How do you decide whether to keep it, and what controls would you put in the build so that a hallucinated or malicious package name cannot slip in?",
    roles: ["sw-ai-tools"],
    level: "mid",
    kind: "debugging",
    topics: ["security", "supply chain", "dependencies", "ai coding tools"],
    minutes: 20,
    strong: [
      "Explains the risk: models sometimes recommend packages that do not exist. One study generated 576,000 code samples from 16 models and found that at least 5.2% of the recommended packages did not exist for commercial models and 21.7% for open-source ones, so an attacker can register a name that models tend to invent, and a successful install does not prove the package is safe.",
      "Asks whether the dependency is needed at all: could the standard library or an existing dependency do the job, since each new package is new code you must trust and maintain.",
      "Checks the package: that the name is exactly the one intended (not a look-alike), who publishes it, its age, release history, repository, licence, open issues, download count in context, and whether anyone you trust uses it. A very new package with a name that exactly matches a suggestion is a warning sign.",
      "Reads what it does before installing: install scripts and transitive dependencies, installing first in a sandbox or container with no credentials.",
      "Adds controls in the build: lockfiles with hashes, review of dependency changes as a distinct step in pull requests, an allowlist or an internal mirror or proxy, automated vulnerability and malware scanning, and alerts on new packages.",
      "Tells the assistant what is allowed: the instruction file lists the approved libraries, and the reviewer verifies any new name, since the instruction is advisory and the build rule is enforced.",
      "Accepts that the same discipline applies to human-suggested packages, and records the decision to keep or remove the package.",
    ],
    followUps: [
      {
        q: "The package exists and has thousands of downloads. Is that enough?",
        lookFor: "No: downloads can be inflated, popular packages can be compromised, and the maintainers matter; check the provenance and pin the version with a hash.",
      },
      {
        q: "How would you find out whether any assistant-added dependency is already in your repositories?",
        lookFor: "Diff the lockfiles over time for new packages, check each against the criteria above, and add a standing check to continuous integration.",
      },
      {
        q: "The assistant cites an API function that does not exist in the installed library version. What does that tell you?",
        lookFor: "Another form of invented names or version mismatch; check the docs for the pinned version and let a compile step or type checker catch it, giving the agent the real documentation.",
      },
    ],
    redFlags: [
      "Keeps the package because the install succeeded.",
      "Never reads who publishes it.",
      "Installs unknown packages on a machine with production credentials.",
      "Relies on the prompt alone to restrict dependencies.",
    ],
    lessons: ["llm/ai-assisted-software-development", "evals/llm-security"],
  },
  {
    id: "review-ai-written-function-four-hidden-flaws",
    prompt:
      "An assistant wrote a helper that looks up a customer's orders and totals them. In the diff: the SQL string is built by inserting the customer id directly into the query text; every exception is caught and an empty list is returned; a function default argument is an empty list that the function appends to; and the order total is computed with floating-point numbers and then compared with == to a stored total. The tests pass. Identify what is wrong with each, explain the failure it causes, and say how you would fix and test it.",
    roles: ["sw-ai-tools"],
    level: "mid",
    kind: "coding",
    topics: ["code review", "security", "testing", "python"],
    minutes: 25,
    strong: [
      "String-built SQL: an input that contains query syntax can change the query, which is an injection risk and also breaks on legitimate characters. Fix with a parameterised query (placeholders with values passed separately) and validate the id type; test with an id containing quotes and punctuation.",
      "Catch-all returning an empty list: every failure, including a database outage or a bug, looks like a customer with no orders, so errors are hidden and downstream code acts on false data. Catch only the exceptions you can handle, log with context, and let others propagate or raise a clear error; test the failure path.",
      "Mutable default argument: the same list is shared between calls, so results from one request leak into the next, a data leak across customers and a bug that appears only on the second call. Use None as the default and create a new list inside the function; test by calling twice.",
      "Float totals and ==: binary floating point cannot represent many decimal amounts exactly, so equal totals compare as unequal. Store money in integer minor units or use a decimal type, and compare exact values; test with amounts such as 0.1 and 0.2.",
      "Explains why the tests passed: they exercised the happy path with simple data, one call, a single customer and values that happen to be exact, so they could not fail on these flaws. Adds tests for each flaw, which is the evidence that the fix works.",
      "Places the review in context: the common categories of AI code problems are plausible but wrong logic, security flaws, removed or swallowed checks and tests that assert nothing. Runs a linter, type checker and a security scanner, and treats them as a floor, not a substitute for reading.",
      "Keeps defence in depth: a database account with only the permissions the function needs, and per-user access control enforced in the data layer.",
    ],
    followUps: [
      {
        q: "How would you ask the assistant to fix this so that the same mistakes are less likely next time?",
        lookFor: "Put the rules in the instruction file (parameterised queries, no bare except, no mutable defaults, money as integers), provide the failing tests first, and keep the review step; the instructions guide but do not guarantee.",
      },
      {
        q: "Which of the four would a unit test written by the same assistant be most likely to miss?",
        lookFor: "Tests written from the implementation tend to share its assumptions, so the swallowed exception and the shared default are easy to miss; write cases from the requirements, including failure paths and repeated calls.",
      },
      {
        q: "What does a security scanner catch here and what does it not?",
        lookFor: "It may flag the string-built query but not the swallowed error, the shared default or the float comparison, which are logic issues that need review and tests.",
      },
    ],
    redFlags: [
      "Says the tests pass so the code is fine.",
      "Fixes the code without adding a test that fails before the fix.",
      "Describes an exploit payload instead of the defensive fix.",
      "Suggests catching all exceptions more carefully with another catch-all.",
    ],
    lessons: ["llm/ai-assisted-software-development", "evals/llm-security", "skills/python-first-steps"],
  },
  {
    id: "instruction-file-and-context-habits-for-a-coding-agent",
    prompt:
      "Your team starts using a terminal coding agent on a large repository. Design the instruction file (AGENTS.md or CLAUDE.md style) and the working habits around it. What goes in the file, what stays out, how big are the tasks you hand over, and how do you tell whether the file is actually helping?",
    roles: ["sw-ai-tools"],
    level: "mid",
    kind: "design",
    topics: ["context engineering", "ai coding tools", "prompting", "team conventions"],
    minutes: 20,
    strong: [
      "Says the agent knows the language but not the project: the file is a README for the agent with setup commands, how to run the tests (the fast, targeted command first), code style, directories that must not be edited, and things to avoid.",
      "Keeps it short and current: only what the agent cannot discover for itself and that matters, since a long file crowds the context and goes stale; it guides rather than guarantees.",
      "Keeps secrets and private data out of the file, and uses deny rules and secret scanning for the things that must never happen, since a prompt is advisory and a permission rule or hook is enforced.",
      "Scopes tasks: one behaviour per task, with the files named and a way to check it; a task you could not describe to a colleague in a few sentences is too big.",
      "Asks for a plan before edits for anything touching more than a couple of files, reads and corrects it, and starts from a clean branch, committing before a large task so version control is the undo button.",
      "Reviews the diff and the commands the agent ran, not just its summary, and asks it to show test output.",
      "Measures the effect: compare cycle time, review time, rework within two weeks and escaped defects on similar tasks with and without the file or a change to it, instead of counting lines generated or suggestions accepted.",
    ],
    followUps: [
      {
        q: "The agent keeps ignoring a rule in the file. What do you do?",
        lookFor: "Check whether the rule is clear, short and near the top, but if it must always hold, enforce it with a hook, a lint rule or CI instead; the file is guidance.",
      },
      {
        q: "A suite takes 10 minutes and the agent iterates 8 times. What is the cost and what do you change?",
        lookFor: "8 x 10 minutes = 80 minutes of waiting against 8 x 20 seconds = about 2 min 40 s for a fast targeted test; give the agent a quick targeted command and run the full suite once in CI.",
      },
      {
        q: "How do you keep the file from becoming a dumping ground?",
        lookFor: "Name an owner, review it in pull requests like code, delete rules the code now enforces, and remove entries that did not change behaviour.",
      },
    ],
    redFlags: [
      "Writes a long file that includes secrets or rules that nobody maintains.",
      "Hands the agent large, vague tasks.",
      "Relies on the file to enforce security rules.",
      "Measures success by lines generated.",
    ],
    lessons: ["llm/ai-assisted-software-development", "rag-agents/agent-memory-and-context-engineering", "llm/prompting-and-structured-output"],
  },
  {
    id: "characterisation-tests-before-an-ai-refactor",
    prompt:
      "You have a 600-line legacy billing function with almost no tests and you want an AI assistant to help refactor it into smaller pieces. How do you make that safe? Describe the order of work, what the tests should look like, and how you check that the tests themselves are worth trusting.",
    roles: ["sw-ai-tools"],
    level: "mid",
    kind: "design",
    topics: ["testing", "refactoring", "ai coding tools", "characterisation tests"],
    minutes: 25,
    strong: [
      "Puts tests first: an agent can only correct itself with a pass or fail signal, and for legacy code the first job is to pin down current behaviour.",
      "Writes characterisation tests: run the existing function on a wide set of real, anonymised and edge-case inputs and record the outputs as expected values, including odd ones, so that a refactor that preserves behaviour passes. A model can draft these, but a person reviews what they assert.",
      "Reviews the assertions for meaning: each test should be able to fail, check outputs and not just that the function runs, and cover boundaries, error paths and money rounding. Does not accept tests derived only from the implementation the assistant is about to change.",
      "Checks test quality with a deliberate fault: break the code on purpose (mutation testing or a few hand-made mutations) and confirm that tests fail; coverage numbers alone measure which lines ran, not whether anything was checked.",
      "Works in small steps: one extraction per task, tests run after each, committing as it goes, so a regression points to a small diff; refuses one giant rewrite.",
      "Keeps the loop fast: a targeted command that runs the new tests in seconds, because with 8 iterations a 20-second run costs under 3 minutes of waiting while a 10-minute suite costs 80.",
      "Keeps humans in charge of the decisions: boundaries, names and which behaviour is a bug to preserve or fix, and reviews the final diff for removed checks and silent behaviour changes.",
    ],
    followUps: [
      {
        q: "The characterisation tests record a rounding bug as expected behaviour. What do you do?",
        lookFor: "Separate behaviour-preserving refactoring from bug fixing: keep the test marked as a known issue, refactor first, then fix in its own reviewed change.",
      },
      {
        q: "The assistant proposes deleting a test that fails after its refactor. What do you say?",
        lookFor: "Treat that as a regression until proven otherwise; the test pins behaviour, so investigate whether the refactor or the test is wrong, with a person deciding.",
      },
      {
        q: "How do you know when you have enough tests to start?",
        lookFor: "When tests fail on injected faults in each area you will change, cover the inputs seen in production logs, and run quickly; there is no fixed coverage number that proves it.",
      },
    ],
    redFlags: [
      "Asks the assistant to refactor first and add tests afterwards.",
      "Trusts coverage percentages as proof of quality.",
      "Lets the assistant delete failing tests.",
      "Attempts one large rewrite in a single step.",
    ],
    lessons: ["llm/ai-assisted-software-development", "systems/testing-and-deploying-ml-models"],
  },
  {
    id: "is-the-assistant-making-the-team-faster-cycle-time",
    prompt:
      "A manager says the coding assistant doubled developer output because lines of code and suggestions accepted are up. You think cycle time may not have improved. Using example numbers, show how cycle time can improve less than expected, name the studies and what each does and does not show, and describe how you would measure the effect in your team.",
    roles: ["sw-ai-tools"],
    level: "mid",
    kind: "estimation",
    topics: ["productivity", "measurement", "ai coding tools", "code review"],
    minutes: 20,
    strong: [
      "Separates activity from value: lines generated and suggestions accepted measure activity. The outcomes are cycle time from first commit to merge, review time, rework (fixes and reverts within two weeks) and escaped defects.",
      "Does the example arithmetic: before, 6 hours of coding plus 2 hours of review wait plus 1 hour of rework is 9 hours per change. After, coding halves to 3 hours but review grows to 3 hours (larger, less familiar diffs) and rework to 2 hours: 8 hours, only about 11% faster, not 50%. These are invented numbers to show the shape, not data.",
      "Explains the bottleneck: if coding gets faster but review, testing and deployment do not, the constraint moves elsewhere, and larger pull requests can make review slower.",
      "Cites the evidence at the right strength: one controlled experiment had developers implement an HTTP server in JavaScript and the group with the assistant finished 55.8% faster, but on one isolated task; a 2025 randomised trial of 16 experienced open-source developers on 246 tasks in their own repositories found tasks took 19% longer with the tools of the time, while the developers had expected a 24% speed-up and afterwards believed they had been 20% faster. The authors say this is not representative of most software work, and mark the results as out of date.",
      "Adds that a February 2026 follow-up reported shorter task times with newer tools but called its own data unreliable, because many developers would not work without AI and withheld tasks. The honest summary is that the effect depends on the task, the developer, the codebase and the tool, and that people misjudge their own speed.",
      "Designs the measurement for the team: compare like with like, ideally randomising which tasks use the assistant, track cycle time, review time, rework and escaped defects before and after, report intervals, and watch the quality side and developer experience.",
      "Treats vendor numbers and self-reports as weak evidence, and decides with local data.",
    ],
    followUps: [
      {
        q: "Developers say they feel much faster. Does that settle it?",
        lookFor: "No: perceived speed was wrong in the 2025 trial; measure time on matched tasks and check quality.",
      },
      {
        q: "You cannot randomise tasks. What is the next best design?",
        lookFor: "A staggered rollout across teams with a comparison group, matching task types, and tracking the same metrics before and after, accepting weaker causal claims.",
      },
      {
        q: "Cycle time improves but the defect rate rises. What do you conclude?",
        lookFor: "The gain may be borrowed from quality; compare cost of rework and incidents, strengthen review and tests, and report both numbers.",
      },
    ],
    redFlags: [
      "Uses lines of code or acceptance rate as the measure of productivity.",
      "Quotes one study as proof of a large speed-up or slow-down for everyone.",
      "Trusts self-reported speed.",
      "Ignores review and rework time.",
    ],
    lessons: ["llm/ai-assisted-software-development", "responsible/ai-and-work", "ml/is-the-difference-real"],
  },
  {
    id: "team-conventions-for-ai-assisted-pull-requests",
    prompt:
      "You are asked to write the team conventions for using AI coding tools across a 25-person engineering group. What do you put in, what do you leave to judgement, and how do you stop AI-assisted work from overloading reviewers or lowering quality?",
    roles: ["sw-ai-tools"],
    level: "senior",
    kind: "design",
    topics: ["team conventions", "code review", "governance", "ai coding tools"],
    minutes: 30,
    strong: [
      "Establishes ownership: whoever opens the pull request owns it, whatever wrote it, and must be able to explain every line; no 'the AI wrote it' defence.",
      "Sets data rules: which tools are approved for which code and data, no secrets or customer data in prompts, files or logs, secret scanning and push protection on, and where code must not leave the company, a local or self-hosted model with its trade-offs.",
      "Sets pull-request rules that protect reviewers: small, scoped changes, a description of intent and how it was tested, the test command and output, no unrelated reformatting, and a limit on size after which the change must be split.",
      "Requires meaningful tests: new behaviour comes with tests that can fail, test changes are flagged for extra attention, and fast targeted test commands are kept up to date for the agent.",
      "Applies graded review by risk: code owners must approve authentication, payments, cryptography, data deletion and infrastructure, and an agent never gets production credentials or merge rights; branch protection keeps a person on the merge.",
      "Covers dependencies and licences: new packages are verified and reviewed as a distinct step, a similarity or licence scanner is used if the organisation requires it, and legal questions go to counsel (this is not legal advice).",
      "Makes it measurable and adjustable: track cycle time, review time, rework and escaped defects, not lines generated, review the conventions each quarter, and collect examples of good and bad use.",
      "Invests in people: training on reviewing generated code, shared instruction files, and a place to share failures without blame.",
    ],
    followUps: [
      {
        q: "Reviewers report that review time has doubled. What do you do?",
        lookFor: "Look at pull-request size and quality, enforce the size limit, require self-review and test evidence, use tools to pre-check style and security, and add reviewer capacity if the data supports it.",
      },
      {
        q: "A senior engineer says conventions slow them down. How do you respond?",
        lookFor: "Ask which rule and why, use the metrics to test it, make risky areas strict and low-risk areas light, and be willing to drop rules that do not help.",
      },
      {
        q: "Should you require people to label AI-assisted pull requests?",
        lookFor: "A label can help reviewers apply extra attention and measure effects, but it should not be a punishment or a substitute for ownership; decide with the team and apply it consistently.",
      },
    ],
    redFlags: [
      "Bans tools without offering an approved alternative.",
      "Allows unlimited pull-request size.",
      "Leaves no owner for generated code.",
      "Measures adoption by volume of generated code.",
    ],
    lessons: ["llm/ai-assisted-software-development", "responsible/running-ai-governance", "systems/human-in-the-loop-design"],
  },
  {
    id: "background-coding-agent-sandbox-and-permissions",
    prompt:
      "Your company wants a background coding agent that picks up tickets, works in a repository and opens pull requests. Design its permissions, sandbox and approval flow so that a poisoned README, issue or dependency documentation cannot cause harm, and say what you log and how you would test the design.",
    roles: ["sw-ai-tools"],
    level: "senior",
    kind: "design",
    topics: ["security", "agents", "sandbox", "permissions"],
    minutes: 35,
    strong: [
      "States the threat in plain terms: the agent reads text it cannot reliably tell apart from instructions, so a README, issue, web page, dependency documentation or tool result can try to steer it. A stern line in the prompt is not a defence; the permission boundary is.",
      "Applies the rule of not combining private data, untrusted content and an outbound channel without a confirmation step.",
      "Isolates execution: a container or virtual machine with no production credentials, a read-only token limited to the repository, network egress restricted to an allowlist, a temporary file system, and OS-level sandboxing. Notes that rules match tool calls and not intent, so a read-deny rule can be bypassed by a script, which is why the sandbox matters.",
      "Limits what it can do: write to a branch and open a pull request only, no merge or deploy rights, branch protection and required review by a person, limits on steps, time and spend, and no access to secrets (use a secret manager and secret scanning).",
      "Treats output as untrusted too: the diff is reviewed like any other, with extra attention to build files, CI configuration, dependency changes and test changes, because those can run code or weaken checks.",
      "Logs for audit: the task, the prompt and context sources, every command and file touched, network calls, and the final diff, with retention and access rules, since logs can contain sensitive data and are themselves data to protect.",
      "Tests the design with an adversarial set: planted instructions in a fake README and issue (non-working, defensive test strings, not real attacks), a dependency with misleading docs, and attempts to read a decoy secret or reach a blocked host. The test runs on every change to the agent and grows after every incident.",
      "Plans for failure: a kill switch, revoking the token, how to find and revert all changes by the agent, and who is on call.",
    ],
    followUps: [
      {
        q: "The agent needs to run the project's tests, which install packages from the internet. How do you allow that?",
        lookFor: "Use an internal mirror or proxy with an allowlist, pinned and hashed dependencies, no credentials in the environment, and treat install scripts as code that runs in the sandbox only.",
      },
      {
        q: "Product wants the agent to merge its own pull requests when CI is green. What is your answer?",
        lookFor: "Not for sensitive areas and not initially: CI only checks what it checks and the agent may have weakened it; consider limited auto-merge for low-risk changes with strong checks, protected CI files and sampling reviews.",
      },
      {
        q: "How would you detect that the agent was steered by injected text?",
        lookFor: "Compare actions with the task (unexpected network calls, files, commands), alert on policy violations, review transcripts and diffs, and keep the blast radius small, since detection is imperfect.",
      },
    ],
    redFlags: [
      "Gives the agent a personal access token with broad rights.",
      "Relies on the system prompt to forbid dangerous actions.",
      "Allows merge and deploy without a person.",
      "Has no logging or kill switch.",
    ],
    lessons: ["evals/llm-security", "llm/ai-assisted-software-development", "rag-agents/agents-and-tool-use"],
  },
  {
    id: "licence-and-provenance-risk-in-generated-code",
    prompt:
      "A senior engineer asks: can we ship code that an AI assistant wrote? Legal has not given guidance yet. Without giving legal advice, explain what the risks are, what practical controls an engineering team can put in place now, and what questions you would take to counsel.",
    roles: ["sw-ai-tools"],
    level: "senior",
    kind: "concept",
    topics: ["licences", "copyright", "ai coding tools", "governance"],
    minutes: 20,
    strong: [
      "Starts with a hedge: this is an engineering view and not legal advice, the law is unsettled and differs by country, and counsel decides the policy.",
      "Names the engineering risks: generated code may resemble licensed code, a licence may impose conditions such as attribution or sharing of source on distribution, ownership and protection of purely generated output can be uncertain, and some assistants have terms about what is done with your prompts and code.",
      "Separates it from the other risks of generated code that matter equally: security flaws, invented dependencies, secrets in code and quality, so licence checking is one control among several.",
      "Lists practical controls: use approved tools with known terms, enable a similarity or licence scanner if the vendor or organisation provides one, run software-composition and licence scans on dependencies, keep a record of which tools were used on which projects, and avoid pasting third-party code with unclear terms into prompts.",
      "Keeps provenance: pull requests record the tool and the intent, commits remain attributable to a human author, and code of unclear origin is rewritten or replaced rather than kept.",
      "Brings specific questions to counsel: what the tool vendor's terms promise and exclude (including any indemnity, which must be read in the current terms), what the policy should be for contributions to open-source projects (many projects have their own rules), what must be disclosed to customers, and how ownership is treated for the markets where the product is sold.",
      "Treats high-value or customer-visible code with extra care: core algorithms, code that will be open-sourced, and code under contract terms may need stricter rules than internal scripts.",
    ],
    followUps: [
      {
        q: "A scanner flags a 20-line block as similar to a project under a copyleft licence. What do you do?",
        lookFor: "Do not ship on a guess: check the actual similarity and the licence terms, rewrite the block independently or replace it with a properly licensed library, and escalate to counsel if it is uncertain.",
      },
      {
        q: "You want to contribute AI-assisted code to an open-source project. What do you check?",
        lookFor: "The project's contribution and AI policies, the licence compatibility, your employer's rules, and that you can stand behind and explain the change.",
      },
      {
        q: "A vendor advertises indemnity for generated code. How much do you rely on it?",
        lookFor: "Read the current terms for conditions and exclusions (settings that must be enabled, filters that must be on), have counsel review them, and treat it as risk transfer, not a reason to skip engineering controls.",
      },
    ],
    redFlags: [
      "Gives a confident legal conclusion either way.",
      "Ignores licences because the code was machine generated.",
      "Relies on a vendor claim without reading the terms.",
      "Treats licence risk as the only risk of generated code.",
    ],
    lessons: ["llm/ai-assisted-software-development", "responsible/where-the-data-comes-from", "llm/choosing-and-comparing-models"],
  },
  {
    id: "behavioural-keeping-skills-sharp-and-mentoring-with-ai",
    prompt:
      "You lead a team where juniors use coding assistants for most of their work. A junior's pull request is clean and passes review, but in conversation they cannot explain how it works, and you notice your own habit of accepting suggestions without thinking. How do you keep their skills, and yours, growing, and what do you change in how the team works?",
    roles: ["sw-ai-tools"],
    level: "senior",
    kind: "behavioural",
    topics: ["mentoring", "skills", "ai coding tools", "team conventions"],
    minutes: 20,
    strong: [
      "Begins with the underlying risk: you cannot review what you do not understand, and reviewing is the human's main job when an agent writes code, so an engineer who cannot explain a change is a risk to quality and to their own growth.",
      "Uses evidence modestly: studies show gains concentrated among less experienced workers in some settings, a trial found experienced developers believed they were faster when they were not, and a study of consultants found over-reliance cost people on a task outside the tool's range. These are specific settings, so the habit of checking is the lesson, not a verdict on the tools.",
      "Sets a norm: the author must be able to explain every line in review, and the question 'why this way?' is asked of human and assistant code alike, without shaming.",
      "Builds practice into the work: junior engineers write the first version of core logic or a key test themselves, then compare with the assistant's; pair sessions where the junior drives and explains; reading and debugging exercises without the tool; and short write-ups of what the agent got wrong.",
      "Changes the review: reviewers ask for the intent and the test evidence, spot-check understanding in a short walkthrough for larger changes, and praise caught errors in assistant output.",
      "Applies the same to self: schedules periods of working without the tool on skills to keep, reads the diff rather than approving, times the real effect on tasks, and keeps a list of the things the tool gets wrong in their codebase.",
      "Defines growth paths that include specification, testing, debugging and system thinking, which stay valuable as the tools change, and revisits the approach with the team, since nobody knows how the skills mix will settle.",
    ],
    followUps: [
      {
        q: "The junior says the team is slower if they do things by hand. How do you respond?",
        lookFor: "Agree that the aim is not to ban the tool; invest some time where learning matters most and use the tool freely for low-risk work, then check the results over a few months.",
      },
      {
        q: "How do you assess whether someone understands the change without making it an interrogation?",
        lookFor: "A short walkthrough or a what-if question in review (what happens if this input is empty?), asked of everyone, with the purpose of finding gaps early.",
      },
      {
        q: "What would convince you that the approach is not working?",
        lookFor: "Measurable signs: repeated defects of a type the team should catch, juniors unable to debug without the tool, slower reviews, or lower morale, tracked and discussed openly.",
      },
    ],
    redFlags: [
      "Bans the tools or ignores the issue entirely.",
      "Shames a person for not understanding.",
      "Believes experienced developers are immune to over-reliance.",
      "Has no way of checking understanding.",
    ],
    lessons: ["llm/ai-assisted-software-development", "responsible/ai-and-work", "start/ai-and-careers"],
  },
];
