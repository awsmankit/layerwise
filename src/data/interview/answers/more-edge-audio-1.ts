import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'datasheet-tops-to-real-throughput': {
    short:
      "Convert first: one multiply-accumulate (MAC) is two operations, so 600 million MACs is 1.2 billion operations, and 30 inferences a second need 36 giga-operations per second (GOPS). That is under 1% of a 4,000 GOPS headline, which looks easy and proves nothing yet, because the headline is a peak, often a sparse figure, at one precision and one clock. With an example dense peak of 2 TOPS and 20% utilisation the model takes 3 ms and keeps the chip busy 9% of the time, but at 5% utilisation it takes 12 ms and 36%. So ask the vendor what the number means, check operator support, and measure on the real board.",
    explain: [
      {
        heading: "Units first: MACs, operations and GOPS",
        body: "A multiply-accumulate (MAC) is one multiplication plus one addition, the basic step of a neural network layer. Vendors count the multiply and the add separately, so one MAC is two operations. Your model needs 600 million MACs x 2 = 1.2 billion operations per inference, and at 30 inferences a second that is 1.2 x 30 = 36 billion operations per second, or 36 GOPS. A TOPS figure counts trillions of operations per second, so 4 TOPS is 4,000 GOPS, and 36 / 4,000 = 0.9%. Mixing up MACs and operations puts you out by a factor of two before you have started.",
      },
      {
        heading: "Why the headline is only a ceiling",
        body: "A datasheet number is the most the arithmetic units could do if every one of them were busy on every cycle. Four things usually keep you below it. First, a sparse figure counts work that skips zeros in specially pruned weights, often twice the dense figure, and an ordinary dense model does not get it. Second, the figure holds for one precision (int8 is typical), one clock and one power mode, and may count only some operators. Third, a small model cannot fill a big array of multipliers, and layers wait for data from memory, so memory traffic often sets the speed. Fourth, moving a number costs far more energy than adding it, so data movement usually decides the battery life. The questions for the vendor are therefore: is 4 TOPS sparse or dense, at which precision, at which clock and power mode, for which operators, and what was measured on a model like mine?",
      },
      {
        heading: "From peak to an estimate",
        body: "Suppose the vendor says the 4 TOPS is a sparse figure, so the dense peak is about 2 TOPS = 2,000 GOPS (an example assumption). Then guess the utilisation, the share of that peak you really get, and show how sensitive the answer is. At 20% (example) the usable rate is 400 GOPS, so one inference takes 1.2 GOP / 400 GOPS = 3 ms, and at 30 a second the NPU is busy 30 x 3 ms = 90 ms of every 1,000 ms, a load of 9%. At 5% the usable rate is 100 GOPS, an inference takes 12 ms, and the load is 36%. At 2% it takes 30 ms, a load of 90%, close to the 33.3 ms between inferences. The honest answer is: it very probably fits, but that depends on utilisation, which I must measure.",
      },
      {
        heading: "What to check and what to measure",
        body: "An NPU runs a fixed list of operators in particular quantised forms. An operator it cannot run falls back to the CPU, and every hand-off copies data, which can erase the speed-up, so check that the converted model has every layer on the NPU. Then measure on the target board, not a laptop or a bench kit alone: warm up first, run for minutes until the heat settles, run with the rest of the product active, and report the median, p99 and worst case. Also measure energy per inference at the supply, because speed alone does not tell you whether the battery or the case temperature will cope.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "Utilisation of an example 2 TOPS dense peak (%)",
      yLabel: "ms per inference",
      points: [[2, 30], [5, 12], [10, 6], [20, 3], [50, 1.2], [100, 0.6]],
      marks: [{ x: 5, label: "5%: 12 ms, load 36%" }, { x: 20, label: "20%: 3 ms, load 9%" }],
      caption: "Time per inference for 1.2 billion operations. The frame budget at 30 a second is 33.3 ms, so even 2% utilisation just fits, but the margin disappears fast.",
    },
    example: {
      title: "Example: does 4 TOPS cover a 600 million MAC model at 30 a second?",
      text: "All hardware figures are examples. The dense peak of 2 TOPS assumes the headline was a sparse figure, which the vendor must confirm.",
      rows: [
        { label: "Operations per inference", value: "600 million MACs x 2 = 1.2 billion" },
        { label: "Operations per second at 30 a second", value: "1.2 x 30 = 36 GOPS" },
        { label: "Share of the 4,000 GOPS headline", value: "36 / 4,000 = 0.9%, which is not yet an answer" },
        { label: "Example dense peak", value: "2 TOPS = 2,000 GOPS" },
        { label: "At 20% utilisation", value: "400 GOPS, 3 ms per inference, load 9%" },
        { label: "At 5% utilisation", value: "100 GOPS, 12 ms per inference, load 36%" },
        { label: "At 2% utilisation", value: "40 GOPS, 30 ms per inference, load 90%" },
      ],
    },
    followUps: [
      {
        q: "The model has 5 MB of int8 weights. Does reading them 30 times a second matter?",
        a: "5 MB x 30 = 150 MB a second, which most memory systems handle easily, so raw bandwidth is not the worry. Energy and placement are: reading weights from slow off-chip memory costs much more energy than from on-chip memory, so find out where they sit.",
      },
      {
        q: "A second vendor quotes 2 TOPS but gives a much better measured latency on your model. How can that be?",
        a: "Peak is not delivered speed. Utilisation, operator support, memory layout and software maturity differ between chips, so a chip with a lower headline can win on your model. Choose by a measured benchmark on your own model, not by the headline figure.",
      },
      {
        q: "The latency is fine at 3 ms. What else could still kill the product?",
        a: "Energy per inference and battery life, heat after minutes of use, worst-case blocks rather than the average, memory for activations, and the cost of hand-offs between the CPU and the NPU. A product can pass the speed test and still fail on battery.",
      },
    ],
    mistakes: [
      "Comparing MACs directly with operations and being out by a factor of two without noticing.",
      "Accepting the headline TOPS without asking whether it is sparse or dense, at which precision, and at which clock.",
      "Concluding that it fits because 36 is far below 4,000. Peak is a ceiling, not a delivered rate.",
      "Benchmarking only on a laptop, or on a development kit sitting cool on a bench with nothing else running.",
    ],
  },

  'microcontroller-memory-budget-keyword-spotter': {
    short:
      "Count two separate budgets: the weights are constants that live in flash, and the activations (the temporary values between layers) live in SRAM. In int8 the keyword spotter needs 22,604 bytes of flash and 16,000 bytes of SRAM, 38,604 bytes in all, which fits easily; in float32 it is 90,416 bytes of flash and 64,000 bytes of SRAM, which still fits but moves four times the data. MobileNetV1 at 224 x 224 does not fit: about 4.2 MB of int8 weights against 1 MB of flash, and a peak of about 1.15 MiB of activations against 256 KiB of SRAM.",
    explain: [
      {
        heading: "Two memories, two budgets",
        body: "The weights and biases never change while the model runs, so they sit in flash (or a similar non-volatile memory) and are read in place. The activations are the outputs of each layer. They change with every input, so they need SRAM, in one fixed block reserved at start-up and called the tensor arena. A layer needs its input and its output alive at the same time, so the SRAM peak is set by the largest such pair, not by the sum of everything. A model can fail on either budget, so never add the weights and the activations together and compare the sum with one memory.",
      },
      {
        heading: "The keyword spotter in int8 and float32",
        body: "In int8 each value takes 1 byte. Weights: 22,604 bytes, about 2% of the 1 MB flash. Activations: the largest consecutive pair is 8,000 + 8,000 = 16,000 bytes, about 6% of 256 KiB (262,144 bytes). Together that is 38,604 bytes, which matches the 38.6 KB reported for this network. In float32 each value takes 4 bytes: weights 22,604 x 4 = 90,416 bytes (about 88 KiB, under 10% of flash) and activations 16,000 x 4 = 64,000 bytes (about 24% of SRAM). It still fits, but it moves four times the bytes through memory, and energy on a small chip is dominated by data movement. Many small chips and NPUs are also fast only at integer arithmetic, so int8 is often a requirement and not just a saving. Keep headroom: the arena size is found by experiment, the runtime adds overhead, and the rest of the firmware uses SRAM too. Reserving 25% leaves 196,608 bytes for the arena, and 16,000 is far below that.",
      },
      {
        heading: "The image classifier is a different problem",
        body: "MobileNetV1 at full width has about 4.2 million weights, which is about 4.2 MB in int8 (16.8 MB in float32), well over 1 MB of flash. Its activation peak is not in the weight-heavy late layers but in the first pointwise layer, where 112 x 112 x 32 values go in and 112 x 112 x 64 come out: 401,408 + 802,816 = 1,204,224 values, about 1.15 MiB in int8, far over 256 KiB. Early layers have big images and few weights, late layers the reverse, so a big picture is what hurts SRAM. The fixes are to lower the input resolution (halving each side divides the peak by 4, to 301,056 values or 294 KiB, which is still over 256 KiB), narrow the network with a width multiplier, choose a smaller architecture, or pick a bigger chip. Resolution matters as much as the weight count.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "bytes of SRAM for the largest activation pair",
      items: [
        { label: "Keyword spotter, int8", value: 16000, note: "8,000 + 8,000 values" },
        { label: "Keyword spotter, float32", value: 64000, note: "four times the bytes" },
        { label: "SRAM on the chip (256 KiB)", value: 262144, note: "the limit, before headroom" },
        { label: "MobileNetV1 at 112 x 112 input, int8", value: 301056, note: "still over" },
        { label: "MobileNetV1 at 224 x 224 input, int8", value: 1204224, note: "about 1.15 MiB", hot: true },
      ],
      caption: "Peak activation memory against the SRAM available. The keyword spotter fits with room to spare; the image classifier needs a smaller input, a narrower network or a bigger chip.",
    },
    example: {
      title: "Example: memory for the keyword spotter and for MobileNetV1",
      text: "One byte per int8 value and four per float32 value. SRAM of 256 KB is taken as 256 KiB = 262,144 bytes.",
      rows: [
        { label: "Keyword spotter weights, int8 (flash)", value: "22,604 bytes, about 2% of 1 MB" },
        { label: "Keyword spotter activations, int8 (SRAM)", value: "8,000 + 8,000 = 16,000 bytes, about 6% of 256 KiB" },
        { label: "Keyword spotter total, int8", value: "22,604 + 16,000 = 38,604 bytes" },
        { label: "Keyword spotter weights, float32", value: "22,604 x 4 = 90,416 bytes, about 88 KiB" },
        { label: "Keyword spotter activations, float32", value: "16,000 x 4 = 64,000 bytes, about 24% of SRAM" },
        { label: "MobileNetV1 weights, int8", value: "about 4.2 million bytes, over 1 MB of flash" },
        { label: "MobileNetV1 peak pair at 224 x 224", value: "401,408 + 802,816 = 1,204,224 values, about 1.15 MiB" },
        { label: "Same at 112 x 112 input", value: "100,352 + 200,704 = 301,056 values, about 294 KiB, still over 256 KiB" },
      ],
    },
    followUps: [
      {
        q: "The model fits both budgets on paper but fails at run time. What do you check?",
        a: "The arena needs overhead and alignment, other code uses SRAM too (stack, heap, buffers), and the runtime may lack an operator the model uses. Leave headroom and measure on the device itself.",
      },
      {
        q: "A datasheet advertises 67 TOPS for a board. What do you ask before using that number?",
        a: "Ask whether it is sparse or dense (a dense model gets about half), at which precision, and in which power mode and clock. Peak is only a ceiling: memory traffic and small layers keep real speed well below it.",
      },
      {
        q: "How would you estimate battery life for 10 inferences a second?",
        a: "Multiply the energy per inference by the rate, then add sleep current, the microphone and the radio. Measure energy at the supply over a long window, and remember that a duty-cycled chip computes briefly and sleeps between inferences.",
      },
    ],
    mistakes: [
      "Adding the weights and the activations together and comparing the sum with one memory.",
      "Forgetting activations altogether and quoting only the model file size.",
      "Treating a TOPS figure as achievable speed.",
      "Assuming a model that fits on paper will fit on the device without headroom for the runtime and the other firmware.",
    ],
  },

  'wearable-motion-model-window-memory-and-battery': {
    short:
      "The window holds 50 Hz x 3 axes x 2 s = 300 values, which is 600 bytes at 16 bits, so the data buffer is tiny. A 1-second hop means one inference a second, 86,400 a day, and the model alone draws 40 microjoules x 1 per second = 40 microwatts. Adding example idle costs of 9 microwatts for the microcontroller (MCU) asleep and 36 for the sensor gives 85 microwatts, and a 30 mAh, 3.7 V cell (111 mWh) lasts about 1,306 hours, roughly 54 days. The model is under half of the budget, so extending life means attacking idle current, the sensor and wake-ups as much as the model.",
    explain: [
      {
        heading: "Window, buffer and rate",
        body: "Memory for the data is sample rate x axes x seconds x bytes: 50 x 3 x 2 = 300 values, and at 2 bytes each that is 600 bytes. Sample size, axes and rate all multiply, but the result is still small, so on a ring the memory pressure comes from the model's activations, not from the data. The window is 2 seconds long and advances 1 second at a time, so consecutive windows overlap by half and one inference runs every second: 86,400 a day. Non-overlapping windows would run one every 2 seconds, half as often. The overlap doubles compute and energy in return for smoother, faster-reacting output.",
      },
      {
        heading: "Power, step by step",
        body: "Energy per inference times rate gives power: 40 microjoules x 1 per second = 40 microwatts for the model. Idle costs are current x voltage: the MCU asleep is 5 microamps x 1.8 V = 9 microwatts, and the sensor is 20 microamps x 1.8 V = 36 microwatts. The total is 40 + 9 + 36 = 85 microwatts, and the model is 40 / 85 = 47% of it. The sensor alone costs almost as much as the model, which is why a design that counts only inference energy is wrong.",
      },
      {
        heading: "Battery life, and what the estimate leaves out",
        body: "Battery energy is 30 mAh x 3.7 V = 111 mWh. Divided by 85 microwatts = 0.085 mW, that is 111 / 0.085 = 1,306 hours, about 54 days. The model alone would give 111 / 0.04 = 2,775 hours, about 116 days, which shows why idle and sensor power matter as much as inference. Every figure here is an example. The radio, any display or haptics, and all the wake-ups are missing and will shorten the life, so the real number has to be measured at the battery over a long window.",
      },
      {
        heading: "Levers to extend life",
        body: "Let the sensor collect samples in its own small buffer (a FIFO), so the MCU wakes once a second instead of 50 times. Add a tiny always-on gate that wakes the larger model only when there is motion, and lengthen the hop when the wearer is still. Quantise the model to int8 to cut the energy per inference. In the example, running the model on non-overlapping windows gives 20 + 9 + 36 = 65 microwatts and about 71 days, and a gate that wakes the model 10% of the time gives 4 + 9 + 36 = 49 microwatts and about 94 days, ignoring the gate's own cost.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["Average power", "Battery life on 111 mWh"],
      rows: [
        { label: "Model only", cells: ["40 microwatts", "2,775 hours, about 116 days"] },
        { label: "Model + MCU sleep + sensor (the question)", cells: ["85 microwatts", "1,306 hours, about 54 days"] },
        { label: "Same, non-overlapping windows", cells: ["20 + 9 + 36 = 65 microwatts", "1,708 hours, about 71 days"] },
        { label: "Same, gate wakes the model 10% of the time (example)", cells: ["4 + 9 + 36 = 49 microwatts", "2,265 hours, about 94 days"] },
      ],
      caption: "All inputs are examples. The gate's own power is ignored in the last row, so that figure is an upper bound.",
    },
    example: {
      title: "Example: smart ring, from window to battery life",
      text: "Samples are 16-bit, 3 axes at 50 Hz, 2-second windows, 1-second hop. All power figures are example numbers, not measurements.",
      rows: [
        { label: "Values per window", value: "50 x 3 x 2 = 300" },
        { label: "Bytes per window", value: "300 x 2 = 600" },
        { label: "Inferences per second and per day", value: "1 and 86,400" },
        { label: "Model power", value: "40 microjoules x 1 per second = 40 microwatts" },
        { label: "MCU asleep and sensor", value: "5 uA x 1.8 V = 9 microwatts; 20 uA x 1.8 V = 36 microwatts" },
        { label: "Total", value: "40 + 9 + 36 = 85 microwatts" },
        { label: "Battery energy", value: "30 mAh x 3.7 V = 111 mWh" },
        { label: "Battery life", value: "111 / 0.085 = 1,306 hours, about 54 days" },
      ],
    },
    followUps: [
      {
        q: "Overlapping windows cost twice the energy. When are they worth it?",
        a: "When the product needs faster reaction or smoother labels. Run an experiment to see whether accuracy and latency really improve enough, and consider keeping the hop but using cheaper features or a smaller model.",
      },
      {
        q: "Your estimate is 54 days and the first prototype lasts 9. Where do you look?",
        a: "Measure the current at the battery over a long window with a power monitor. The usual causes are the MCU never reaching deep sleep, the radio advertising or syncing too often, a sensor stuck in a high-power mode, and unbounded wake-ups.",
      },
      {
        q: "How would you check the model on different wearers?",
        a: "Hold out whole people, not random windows, because windows from one person are strongly correlated and would flatter the score. Check by body size, finger or wrist, motion style and orientation, and report the worst slice.",
      },
    ],
    mistakes: [
      "Counting only the model's energy and ignoring sleep and sensor current, which here are slightly more than the model.",
      "Forgetting that sample size, axes and sample rate all multiply into the buffer.",
      "Splitting train and test by random window instead of by person.",
      "Treating example power numbers as measurements, and skipping the check at the battery.",
    ],
  },

  'edge-or-cloud-three-hearing-features': {
    short:
      "Decide from the constraints, not the technology: how much delay the feature can take, whether it must work offline, how private the data is, how big the model must be, and how often it must change. Wind-noise reduction belongs on the device, because it sits in the live audio path and a network round trip alone would use up a budget of a few milliseconds. The open-question assistant is a split or cloud feature, since the model is large and quality matters more than a second of delay. The monthly listening report belongs on the phone or in the cloud, because it works on small summary numbers and can be recomputed whenever the model improves.",
    explain: [
      {
        heading: "Five questions decide where a feature runs",
        body: "First, delay: how long can the feature take before the wearer notices? Second, offline: must it work with no connection, on a plane or in a lift? Third, privacy: how sensitive is the data, and does it have to leave the device at all? Fourth, size: does the model fit the memory and battery of an earpiece? Fifth, change: how often will the model be improved, and how hard is it to update a device in someone's ear? Each placement answers these differently, which is why there is no universal rule. Latency is judged by the slow tail, the p99, not the average, because one late block is what the wearer hears.",
      },
      {
        heading: "The three features",
        body: "(a) Wind-noise reduction sits in the live audio path. The budget is a few milliseconds (an example figure for the delay a wearer can tolerate when they also hear the room directly), and a network round trip alone would exceed it. It must also work with no connection. So it runs on the device as a small, causal model (one that uses only past audio), and the cost is battery, so energy per inference is measured as well as speed. (b) The assistant answers open questions, so the model is large and quality matters more than milliseconds; a second or two is fine. Run it on the phone or in the cloud, keep wake-word detection or a push button on the device, and ask for consent before any audio leaves the device. (c) The listening report is not time-critical and needs summary statistics (hours in noise, program changes), not raw audio. It runs on the phone or in the cloud and can be recomputed whenever the model improves.",
      },
      {
        heading: "Hybrid patterns",
        body: "Few real products are all one place. Device first with a cloud fallback keeps the feature working offline and uses the cloud when the local model is unsure. Split by task puts the time-critical part on the device and the heavy work elsewhere. Cloud-trained and device-deployed means the model learns on servers but runs locally. Answer-now-refine-later gives a quick local answer and improves it when a better one arrives from the cloud.",
      },
      {
        heading: "Costs people forget, and what would change the answer",
        body: "On-device models need operator support on the chip, an update path through firmware or the app, and a way to see how the fleet behaves, which is harder when nothing is sent home. A link to the phone adds its own delay and can drop. The answers change if the assistant model becomes much smaller, if the link becomes faster and cheaper, if a privacy rule gets stricter, or if a new chip has more memory. Decide with data: write each feature's delay, power, memory and privacy budget, measure a prototype on the target hardware at p99, and compare the options against those budgets. This is general design guidance, not a statement about any particular product.",
      },
    ],
    diagram: {
      kind: "layers",
      layers: [
        { label: "Cloud", sub: "The assistant's large model (a second or two is fine), training, and recomputing reports when the model improves" },
        { label: "Paired phone", sub: "The listening report from summary statistics, the assistant front end, and the consent screen before any audio leaves" },
        { label: "Earpiece", sub: "Wind-noise reduction in the live audio path and wake word or a button: milliseconds, offline, no raw audio leaves" },
      ],
      caption: "Where the three features run. Moving down the stack buys speed and privacy and costs battery and model size; moving up does the reverse.",
    },
    example: {
      title: "Example: placing the three features against their budgets",
      text: "The figures are illustrative. The point is the method: write the budget, then pick the place that meets it.",
      rows: [
        { label: "(a) Wind-noise reduction", value: "delay: a few ms; offline: yes; data: live audio; place: device" },
        { label: "(b) Voice assistant", value: "delay: 1 to 2 s is fine; offline: partly; data: speech; place: phone or cloud, with consent" },
        { label: "(c) Monthly listening report", value: "delay: days; offline: no need; data: summary statistics; place: phone or cloud" },
        { label: "Always on the device", value: "wake word or button, so nothing is sent until the wearer asks" },
        { label: "Judge speed by", value: "p99, not the average" },
      ],
    },
    followUps: [
      {
        q: "The wind model works in the lab but the product team asks to move it to the phone to save battery in the earpiece. What do you say?",
        a: "A wireless link adds its own delay and can drop, and for sound the wearer also hears directly, extra delay is audible. Moving it saves earpiece compute but spends radio energy and adds a failure mode, so measure both ends before deciding.",
      },
      {
        q: "The assistant must work on a plane. What is your design?",
        a: "Ship a small on-device model for a narrow set of requests such as device settings and simple questions. Show a clear message when a request needs the cloud, rather than failing silently or uploading later without being asked.",
      },
      {
        q: "How would you decide with data and not opinion?",
        a: "Write each feature's latency, power, memory and privacy budget, measure a prototype on the target hardware at p99, and compare the placements against those budgets.",
      },
    ],
    mistakes: [
      "Saying everything should run on the device, or everything in the cloud, without reference to delay, power or how sensitive the data is.",
      "Judging latency by the average and ignoring the slow tail.",
      "Ignoring how the model gets updated once it is in a device.",
      "Sending raw audio to the cloud without mentioning consent or sending only what is needed.",
    ],
  },

  'spectrogram-window-hop-and-mel-choices': {
    short:
      "A spectrogram is a Fourier transform of short, overlapping, tapered windows: time runs across, frequency up, and energy is the brightness. A common speech choice at 16 kHz is a 25 ms window (400 samples), a 10 ms hop (160 samples) and 80 mel bands, which turns 30 seconds of audio into 3,000 frames x 80 bands = 240,000 numbers. A long window sharpens pitch and blurs timing, and a short one does the reverse. A hearing device with a few-millisecond delay budget cannot wait 25 ms for one column, so it needs much shorter frames or a low-latency design.",
    explain: [
      {
        heading: "Window length: the pitch and timing trade",
        body: "A Fourier transform splits a short chunk of sound into its frequencies. The chunk is first tapered (a Hann window fades its edges), because cutting sound abruptly smears energy across all frequencies. A window of N samples at rate R gives frequency detail R / N. At 16 kHz, 100 samples (6.25 ms) give 160 Hz detail, 400 samples (25 ms) give 40 Hz, and 1,600 samples (100 ms) give 10 Hz. A 120 Hz voice has harmonics 120 Hz apart, which 160 Hz detail cannot separate and 40 Hz can, but a 100 ms window blurs where in time a consonant started. The hop is how far the window advances: 160 samples (10 ms) gives 100 frames a second, and 400 samples give 400 / 2 + 1 = 201 frequency bins per frame.",
      },
      {
        heading: "Mel bands and the log",
        body: "Hearing is not evenly spaced in frequency. With mel = 2595 x log10(1 + f / 700), the step from 100 to 200 Hz is about 133 mel and the step from 5,000 to 5,100 Hz is about 20 mel, around seven times less, though both are 100 Hz. So the 201 bins are combined into 80 triangular bands evenly spaced in mel: many narrow bands at low frequencies and a few wide ones at high. Then take the log of each band's energy, because loudness is not linear either. Whisper's published recipe uses 80 mel bands (128 in its large-v3 model) over 0 to 8 kHz. MFCCs, a classical cousin, apply a cosine transform to the log-mel values and keep a few coefficients.",
      },
      {
        heading: "Shape, cost, and the hearing-device case",
        body: "For 30 seconds at 16 kHz there are 480,000 samples, and with a 10 ms hop that is 3,000 frames. The model input is 3,000 x 80 = 240,000 numbers, half the raw count. In Whisper, convolutions then halve the 3,000 columns to 1,500 positions of 20 ms. A magnitude spectrogram keeps strength but not phase, so it cannot be turned back into sound exactly, and models that produce speech need a vocoder. Frames per second set the compute: halving the hop doubles the inferences and the energy. A 25 ms window means waiting 25 ms of audio before the first column, longer than the 5 to 6 ms delay one study rated just acceptable for simulated open-canal hearing aids (other fittings tolerate more). A hearing device needs much shorter frames or low-latency designs, while wake-word systems often use 40 ms frames at a 20 ms hop.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "audio", label: "16 kHz audio", sub: "30 s = 480,000 samples" },
        { id: "frames", label: "Windows", sub: "25 ms (400 samples), 10 ms hop: 3,000 frames" },
        { id: "fft", label: "Fourier transform", sub: "201 frequency bins per frame" },
        { id: "mel", label: "Mel bands", sub: "80 triangular bands, even in mel" },
        { id: "log", label: "Log", sub: "loudness is not linear either" },
        { id: "input", label: "Model input", sub: "3,000 x 80 = 240,000 numbers" },
      ],
      highlight: ["mel"],
      caption: "From waveform to model input. The window and hop set time and pitch detail; the mel bands and log match how hearing works.",
    },
    example: {
      title: "Example: window choices and the shape for 30 seconds",
      text: "Frequency detail is the sampling rate divided by the window length in samples, here at 16 kHz.",
      rows: [
        { label: "Window of 100 samples (6.25 ms)", value: "160 Hz detail" },
        { label: "Window of 400 samples (25 ms)", value: "40 Hz detail, 201 bins" },
        { label: "Window of 1,600 samples (100 ms)", value: "10 Hz detail" },
        { label: "Hop of 160 samples", value: "100 frames a second" },
        { label: "Mel step, 100 to 200 Hz versus 5,000 to 5,100 Hz", value: "about 133 mel versus 20 mel, about 7 times" },
        { label: "30 seconds of audio", value: "480,000 samples become 3,000 frames x 80 bands = 240,000 numbers" },
        { label: "Halving the hop", value: "200 frames a second, twice the inferences" },
      ],
    },
    followUps: [
      {
        q: "What does halving the hop do to compute and power, and why is it not free?",
        a: "Frames per second double, so inferences and energy per second roughly double. It buys finer timing and lower delay at a direct cost.",
      },
      {
        q: "Can you turn a magnitude spectrogram back into audio?",
        a: "Not exactly, because the phase is thrown away. Use a vocoder or a phase-reconstruction method.",
      },
      {
        q: "A fixed 30-second window is used for a three-second voice command. What is the problem?",
        a: "Padding wastes compute and adds latency, because a fixed-window batch design is not a streaming one. A command interface needs frame-level streaming models or short windows.",
      },
    ],
    mistakes: [
      "Saying a longer window is always better. It sharpens pitch and blurs timing.",
      "Confusing window length with hop. One is how much audio each frame looks at, the other is how far it moves.",
      "Being unable to say why mel and log scaling are used.",
    ],
  },

  'compression-toolbox-which-technique-for-which-problem': {
    short:
      "Match the fix to the bottleneck, because size, speed and accuracy are different problems and one technique rarely solves all three. Team A should quantise float32 weights to int8, which cuts the bytes by about 4 times, exactly the size they need. Team B should look at structured pruning, a more efficient architecture or a lower input resolution, because ordinary unstructured pruning shrinks the file but does not make a dense CPU kernel faster. Team C should suspect the calibration and test data first, then try quantisation-aware training and keep sensitive layers at higher precision.",
    explain: [
      {
        heading: "Name the bottleneck, then pick from the toolbox",
        body: "Four techniques cover most cases. Quantisation stores numbers in fewer bits, for example int8 instead of float32. Pruning removes weights: unstructured pruning zeroes individual weights anywhere, while structured pruning removes whole channels or attention heads, leaving a smaller dense model. Distillation trains a small student model to imitate a larger teacher. Architecture choice means picking or designing a network that suits the target from the start. They attack different limits. Quantisation mostly cuts bytes, structured pruning and good architecture cut work, distillation recovers quality in a small model, and none of them is the answer to all three problems.",
      },
      {
        heading: "Team A needs bytes and Team B needs speed",
        body: "Team A is 4 times too big. A float32 weight takes 4 bytes and an int8 weight takes 1, so quantising cuts the weight storage by about 4 times, which just meets the target with no spare room, since scales and any layers kept in higher precision add a little. Check accuracy on hard inputs, and if more is needed follow with structured pruning or a smaller architecture. Team B has the size right but is 2.5 times too slow on a CPU with no accelerator. Unstructured sparsity shrinks the stored file but a dense kernel still multiplies the zeros, so the speed does not move. Structured pruning gives a smaller dense model that any hardware runs faster, and an efficient architecture or a lower input resolution may be the larger lever. Int8 also helps if the CPU has integer SIMD kernels (instructions that do many small integer operations at once), so test it.",
      },
      {
        heading: "Team C lost accuracy on a rare class",
        body: "An average can hide a collapse on a rare class. The likely cause is that the calibration data (the real inputs used to measure value ranges) or the training data had too few of those cases, so the ranges or the learning ignored them. Rebuild the calibration and test sets to include them, judge by the task metric per class and not by overall accuracy, and try quantisation-aware training, which simulates rounding during training so the model learns to tolerate it. Keep the sensitive layers, often the first and last, at higher precision. Distillation is usually the best route to a compact model of good quality, but check the teacher's terms of use before training on its outputs.",
      },
      {
        heading: "Order the work by cost, and verify on the device",
        body: "Post-training quantisation is cheap and goes first. Architecture changes and pruning come next. Distillation and quantisation-aware training need training runs, so they come when the cheap steps fall short. After every step, validate on the target hardware at a realistic temperature and load. A smaller model is not always a faster one: unsupported formats and operators fall back to slower paths, and only measurement shows it.",
      },
    ],
    diagram: {
      kind: "compare",
      columns: ["Try first", "Why", "If that is not enough"],
      rows: [
        { label: "Team A: weights 4x too big for flash", cells: ["Quantise to int8", "float32 to int8 is 4 bytes to 1", "Structured pruning or a smaller architecture"] },
        { label: "Team B: 2.5x too slow on a CPU", cells: ["Structured pruning, efficient architecture, lower input size", "Gives a smaller dense model any CPU runs faster", "Check int8 integer kernels, then distil to a smaller student"] },
        { label: "Team C: 6 points lost on a rare class", cells: ["Fix calibration and test data to include the rare class", "The ranges were probably set on easy data", "Quantisation-aware training, sensitive layers in higher precision"] },
      ],
      caption: "One technique per bottleneck. Cheap steps (post-training quantisation) come before steps that need training runs.",
    },
    example: {
      title: "Example: why 70% pruning can leave latency unchanged",
      text: "Take a layer with 1,000,000 float32 weights. Unstructured pruning zeroes 70% of them, but the numbers are illustrative.",
      rows: [
        { label: "Stored size with a sparse format", value: "300,000 weights, about 30% of the file (plus index overhead)" },
        { label: "Multiplications a dense kernel performs", value: "still 1,000,000, because it multiplies the zeros" },
        { label: "Structured pruning of 30% of the channels", value: "a smaller dense layer, so roughly 30% fewer multiplications" },
        { label: "Float32 to int8 weight storage", value: "4 bytes to 1 byte, about 4 times smaller" },
      ],
    },
    followUps: [
      {
        q: "Pruning removed 70% of the weights and the file shrank, yet latency did not move. Why?",
        a: "Unstructured zeros are still multiplied by a dense kernel unless the hardware and runtime exploit sparsity. Use structured pruning, or confirm that the device has sparse support.",
      },
      {
        q: "How would you find which layers hurt most under int8?",
        a: "Compare per-layer activations with the float model on fixed hard inputs and find where the error jumps. Then leave the first, the last and the wide-range layers in higher precision.",
      },
      {
        q: "When would you pick a new architecture over compressing the current one?",
        a: "When the current design uses operators the chip does not support or has large early activations. Design for the target from the start, with efficient blocks and supported operators.",
      },
    ],
    mistakes: [
      "Saying pruning always makes a model faster.",
      "Applying the same fix to every problem without naming the bottleneck first.",
      "Judging success by average accuracy or by the file size instead of the task metric on the hard cases.",
      "Skipping measurement on the real device.",
    ],
  },

  'on-device-llm-memory-and-speed-budget': {
    short:
      "Weights take parameters x bits / 8: candidate A is 3.8 billion x 0.5 bytes = 1.9 GB and candidate B is 3.09 billion x 4.5 / 8 = 1.74 GB. The KV cache (the stored keys and values of every earlier token) is what separates them: A needs 393,216 bytes a token, 1.61 GB at 4,096 tokens, while B needs 36,864 bytes a token, only 0.30 GB at 8,192, so the totals are about 3.5 GB and 2.0 GB. Best-case decode speed is memory bandwidth divided by the bytes read per token, about 28 tokens a second for A and 49 for B at an assumed 100 GB/s, and real speed is lower. Fall back to the cloud only when the local model is missing, too weak or given too long an input, and never silently when the data must stay private.",
    explain: [
      {
        heading: "Weights and the KV cache",
        body: "Weights memory is parameters x bits per weight / 8. For A: 3.8e9 x 4 / 8 = 1.9 GB. For B: 3.09e9 x 4.5 / 8 = 1.74 GB. The KV cache per token is 2 (keys and values) x layers x KV heads x head dimension x bytes per value. A: 2 x 32 x 32 x 96 x 2 = 393,216 bytes, so 4,096 tokens take 1.61 GB. B: 2 x 36 x 2 x 128 x 2 = 36,864 bytes, so 8,192 tokens take just 0.30 GB. That is 10.7 times less per token, almost all from grouped-query attention, where many query heads share a few KV heads (2 instead of 32 here). Totals: A about 3.5 GB, B about 2.0 GB. You can cut a cache further with fewer KV heads by design, an 8-bit cache (halves it; A drops from 1.61 to 0.81 GB), sharing the cache across blocks of layers (one vendor reports 37.5% less), or a shorter context.",
      },
      {
        heading: "The memory a phone really has",
        body: "Usable memory is less than the spec sheet. The operating system can terminate the processes holding the most memory when it runs short, and memory a process has modified must stay resident. A model that fits the spec may still be killed in the background. Measure the real limit on the target device and leave headroom for the app, the runtime and the rest of the system.",
      },
      {
        heading: "Speed: decode waits for memory",
        body: "To write one token the chip reads every weight once, plus the KV cache, doing roughly one multiply-add per weight read, so decode is limited by memory bandwidth, not arithmetic. The ceiling is bandwidth / bytes read per token. At an assumed 100 GB/s: A reads 1.9 + 1.61 = 3.51 GB, so 100 / 3.51 = about 28 tokens a second (53 with no cache), and B reads 1.74 + 0.30 = 2.04 GB, so about 49. That is a best case with the cache full. Real speed is lower because of compute, dequantisation (turning 4-bit values back into usable numbers), threading and heat. For scale, a 1.8 GB model decoding at 12 tokens a second must read at least 1.8 x 12 = 21.6 GB/s (example), so an assumed 100 GB/s is generous. Prefill, which handles the many prompt tokens at once, is compute-bound, and that is where an NPU or GPU helps most. Decode is memory-bound whichever chip does it.",
      },
      {
        heading: "What it suits, and when to use the cloud",
        body: "Small models suit narrow, well-specified tasks such as summarising, extracting fields, classifying intent or choosing a tool. They are weak at world knowledge, long context and open-ended reasoning. A LoRA adapter (a small add-on trained for one task) can specialise one, but it belongs to one base-model version. Fall back to the cloud when there is no model on the device (not downloaded, evicted or unsupported hardware), when the task is too hard (a validity or confidence check fails and a retry elsewhere is allowed), or when the input is too long. If the data must not leave the device, the right fallback is a refusal or a simpler local function, not a silent upgrade to the cloud. Evaluate on the real device, because quantisation, the runtime and heat change outputs. Running on the device removes the network path, not app logs, backups or prompt injection.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "GB of memory",
      items: [
        { label: "A: weights at 4 bits", value: 1.9, note: "3.8 billion x 0.5 bytes" },
        { label: "A: KV cache at 4,096 tokens", value: 1.61, note: "393,216 bytes a token", hot: true },
        { label: "B: weights at 4.5 bits", value: 1.74, note: "3.09 billion x 4.5 / 8" },
        { label: "B: KV cache at 8,192 tokens", value: 0.3, note: "36,864 bytes a token" },
      ],
      caption: "Weights are similar, but A's cache is more than five times B's even at half the context, because it keeps 32 KV heads against 2.",
    },
    example: {
      title: "Example: memory and best-case decode speed for A and B",
      text: "The 100 GB/s memory bandwidth is an assumed figure. Speeds are ceilings with the cache full, and decimal gigabytes are used.",
      rows: [
        { label: "A weights", value: "3.8e9 x 0.5 bytes = 1.9 GB" },
        { label: "A KV cache", value: "2 x 32 x 32 x 96 x 2 = 393,216 bytes a token; x 4,096 = 1.61 GB" },
        { label: "A total and speed", value: "about 3.5 GB; 100 / 3.51 = about 28 tokens a second" },
        { label: "B weights", value: "3.09e9 x 4.5 / 8 = 1.74 GB" },
        { label: "B KV cache", value: "2 x 36 x 2 x 128 x 2 = 36,864 bytes a token; x 8,192 = 0.30 GB" },
        { label: "B total and speed", value: "about 2.0 GB; 100 / 2.04 = about 49 tokens a second" },
        { label: "A at 20,000 tokens", value: "393,216 x 20,000 = 7.9 GB of cache alone" },
      ],
    },
    followUps: [
      {
        q: "Why would doubling memory bandwidth help decode speed more than doubling the NPU's TOPS?",
        a: "Decode reads every weight and the cache once per token and does about one multiply-add per weight read, so it waits on memory. More compute leaves it unchanged.",
      },
      {
        q: "The platform provides its own on-device model. Use it or ship ours?",
        a: "The platform model costs no download or memory budget and is updated for you, but you cannot choose or freeze it and it can change under you. Your own model gives control at the cost of the fleet-update burden, so evaluate both on real devices with your task.",
      },
      {
        q: "Candidate A fits at 4,096 tokens, but users paste 20,000-token threads. What do you do?",
        a: "The cache grows linearly with context, so A would need about 7.9 GB for the cache alone. Truncate or chunk and summarise, pick a model with fewer KV heads, or route long inputs to the cloud with the user's consent.",
      },
    ],
    mistakes: [
      "Forgetting the KV cache, which for candidate A is almost as large as its weights.",
      "Taking the spec-sheet RAM as available to the app.",
      "Quoting TOPS as the decode-speed limit when memory bandwidth is the limit.",
      "Having no fallback plan, or silently sending private text to the cloud.",
    ],
  },

  'ota-model-update-over-ble-time-energy-and-fleet-bandwidth': {
    short:
      "1.2 MB is 9.6 megabits, so at 100 kbit/s the transfer takes 96 seconds, and with 20% of the time lost to retries it takes 96 / 0.8 = 120 seconds. At 10 mW that is 1.2 joules, 0.33 mWh, about 0.33% of a 100 mWh battery, so one successful update is cheap and the risk is repeated failed attempts. If every device downloads the full model once, your servers send 200,000 x 1.2 MB = 240 GB, and a 15% delta would be at most 36 GB and about 18 seconds, but only if the new model really differs in 15% of its bytes. The design must make failure safe: a spare slot, verification, resume, switching only when it is safe, and keeping the old model until the new one proves itself.",
    explain: [
      {
        heading: "Bits, seconds and energy",
        body: "Link speeds are in bits and file sizes are in bytes, and mixing them up is out by a factor of 8. 1.2 MB x 8 = 9.6 megabits. At 100 kbit/s (an example effective rate) that is 9,600 / 100 = 96 seconds. If 20% of the time is lost to retries, only 80% of the time moves new data, so the time is 96 / 0.8 = 120 seconds. Energy is power x time: 10 mW x 120 s = 1,200 mJ = 1.2 J. A 100 mWh battery holds 360 J, and 1.2 J is 0.33 mWh, so one update costs about 0.33% of the battery. The risk is not the successful update but many failed attempts. For example, ten attempts that each fail at about 100 seconds cost 10 mW x 1,000 s = 10 J, about 2.8% of the battery.",
      },
      {
        heading: "Fleet volume, and the delta trap",
        body: "If all 200,000 devices download the full model once, the servers send 200,000 x 1.2 MB = 240,000 MB = 240 GB, before any retries or re-downloads. A delta update sends only the bytes that changed. If 15% differ, that is at most 36 GB and 120 x 0.15 = 18 seconds per device. Treat that as an upper bound on the saving, because a re-trained or re-quantised model often changes nearly every weight byte, so the delta can be almost as large as the file. Measure the real delta between real versions before planning around it.",
      },
      {
        heading: "Making the update safe",
        body: "Download into a spare slot and never overwrite the only working copy. Verify a hash (to catch corruption) and a signature (to prove who made it) before use. Make the download resumable, so a dropped link continues instead of restarting. Switch only when the device is charging or idle and the battery is healthy, change over atomically, keep the previous model until the new one has proven itself, and report success and failure counts so a bad version can be halted.",
      },
      {
        heading: "What goes wrong in the field",
        body: "The phone leaves range halfway through. The battery is low. Power is lost during a flash write, and flash also wears with repeated writes. The app, the firmware and the model end up as mismatched versions. Old devices that rarely connect take weeks to update, so several versions run at once and the server must support all of them. The 100 kbit/s and 10 mW figures are examples, and real links vary with distance, interference and the phone, so plan with measured p10 or p5 throughput, not the mean: at an example 50 kbit/s the same transfer takes 192 / 0.8 = 240 seconds.",
      },
    ],
    diagram: {
      kind: "timeline",
      steps: [
        { label: "Download", detail: "into a spare slot, resuming after any drop, never over the working copy" },
        { label: "Verify", detail: "check the hash and the signature before the model is used" },
        { label: "Wait", detail: "act only when the device is charging or idle and the battery is healthy" },
        { label: "Switch", detail: "one atomic change, with a boot-time check that falls back on failure" },
        { label: "Probation", detail: "keep the previous model until the new one has proven itself" },
        { label: "Report", detail: "send success and failure counts so a bad version can be halted" },
      ],
      caption: "The steps of a safe model update. Each one removes a way for a power loss, a corrupt file or a bad model to leave a device without a working model.",
    },
    example: {
      title: "Example: 1.2 MB to 200,000 hearing aids",
      text: "Throughput of 100 kbit/s, 20% of time lost to retries and 10 mW while receiving are the example figures from the question. Gigabytes are decimal.",
      rows: [
        { label: "Size in bits", value: "1.2 MB x 8 = 9.6 megabits" },
        { label: "Transfer time with no losses", value: "9,600 / 100 = 96 s" },
        { label: "With 20% lost to retries", value: "96 / 0.8 = 120 s" },
        { label: "Energy", value: "10 mW x 120 s = 1.2 J = 0.33 mWh, 0.33% of 100 mWh" },
        { label: "Server volume, full model", value: "200,000 x 1.2 MB = 240 GB" },
        { label: "15% delta, upper bound", value: "36 GB, and 18 s per device" },
        { label: "Real delta after retraining", value: "may be close to the whole file, so measure it" },
      ],
    },
    followUps: [
      {
        q: "A device loses power at 80% of the write. What must the design guarantee?",
        a: "It must boot into the old, known-good model. Use an A/B slot or equivalent, switch atomically only after verification, and keep a boot-time check that falls back on failure.",
      },
      {
        q: "Support asks for a rollback after a bad model. Why can you not just push the old version number?",
        a: "Secure update clients refuse to go backwards, which defends against rollback attacks that reinstall old, vulnerable versions. Publish the old weights as a new, higher version.",
      },
      {
        q: "How do you avoid 200,000 phones all downloading at 9 am?",
        a: "Stagger by device class and random delay, use a content delivery network and conditional requests, and throttle the rollout. A halt rule stops it if failures rise.",
      },
    ],
    mistakes: [
      "Mixing up bytes and bits, which makes every time and energy figure wrong by a factor of 8.",
      "Assuming a delta update always saves bandwidth. A retrained model can change nearly every byte.",
      "Overwriting the only copy of the working model during the update.",
      "Planning a rollback by re-issuing the old version number.",
    ],
  },

  'real-time-audio-block-deadline-delay-power': {
    short:
      "The deadline is the block length: 160 samples at 16 kHz is 10 ms, and 32 samples is 2 ms. In the simple double-buffered model the delay is one block to fill, one block to play and the window's look-ahead: 10 + 10 + (400 - 160) / 16 = 35 ms with 160-sample blocks. A 1.5 ms model uses 15% of the processor at 160-sample blocks and 75% at 32-sample blocks, and at 50 microjoules each it draws 5 mW (20 hours on a 100 mWh battery) at 100 inferences a second but 25 mW (4 hours) at 500. The average inference time is the wrong number because a block is missed by the slowest run, so you look at p99, p99.9 and the worst case.",
    explain: [
      {
        heading: "Deadline and delay",
        body: "Audio arrives in blocks, and the output for a block must be ready before it finishes playing, or you hear a click or a dropout. The deadline is block size / sample rate: 160 / 16,000 = 10 ms, and 32 / 16,000 = 2 ms. In a simple double-buffered model, the delay is the fill (one block) plus the slot (one block) plus the look-ahead (the window minus the block, because the model needs 400 samples but only 160 are new). For 160 / 400 that is 10 + 10 + (400 - 160) / 16 = 10 + 10 + 15 = 35 ms. With 32-sample blocks and the same 400-sample window it is 2 + 2 + 23 = 27 ms, because the window still overhangs. A 64-sample window with 32-sample blocks gives 2 + 2 + 2 = 6 ms. A non-causal model that waits for k future frames adds k hops. This is a simplified model, and real systems buffer differently.",
      },
      {
        heading: "Load and power rise as blocks shrink",
        body: "Load is time per inference / block period. At 160-sample blocks it is 1.5 / 10 = 15%. At 32-sample blocks it is 1.5 / 2 = 75%. The model did not get slower, it just runs five times as often (100 versus 500 inferences a second). Power is rate x energy: 100 x 50 microjoules = 5 mW, so a 100 mWh battery lasts 100 / 5 = 20 hours, and 500 x 50 microjoules = 25 mW gives 100 / 25 = 4 hours. This counts the model alone and ignores idle current, the microphone and the radio. Shrinking the block buys lower delay at a direct cost in load and energy.",
      },
      {
        heading: "Why the average is the wrong number",
        body: "A deadline is missed by the slowest block, not the typical one. Interrupts, cache misses while fetching weights, clock or voltage changes, other tasks and thermal throttling make some blocks slow. At 100 blocks a second, 0.1% missing is 0.1 a second, one glitch every 10 seconds. At 500 blocks a second, 0.1% is one every 2 seconds. So look at p99, p99.9 and the worst case, not the mean. Keep the audio path bounded: no blocking calls, memory allocation, file or network access, a memory arena reserved at start-up, and state carried between blocks so each block computes only the new samples.",
      },
      {
        heading: "Benchmark honestly",
        body: "Warm up first, then run to steady state, which includes the slowdown when the chip heats. Time the whole shipped path, not just the model, report the distribution with the conditions (clock, power mode, temperature), and test under load at the worst supported temperature. Measure energy at the supply, and report accuracy next to speed, since a faster model that is wrong has gained nothing.",
      },
    ],
    diagram: {
      kind: "curve",
      xLabel: "Block size (samples at 16 kHz)",
      yLabel: "processor load of a 1.5 ms model (%)",
      points: [[32, 75], [64, 37.5], [160, 15], [320, 7.5]],
      marks: [{ x: 32, label: "2 ms blocks: 75%" }, { x: 160, label: "10 ms blocks: 15%" }],
      caption: "Smaller blocks cut the delay but raise the load, because the same model runs more often. Load = 1.5 ms / block period.",
    },
    example: {
      title: "Example: 16 kHz blocks, a 1.5 ms model and 50 microjoules",
      text: "The window is 400 samples and the battery is 100 mWh. The delay formula is the simplified double-buffered model from the question.",
      rows: [
        { label: "Deadline, 160 and 32 samples", value: "10 ms and 2 ms" },
        { label: "Delay, 160 / 400", value: "10 + 10 + 15 = 35 ms" },
        { label: "Delay, 32 / 400 and 32 / 64", value: "2 + 2 + 23 = 27 ms and 2 + 2 + 2 = 6 ms" },
        { label: "Load at 160 and at 32 samples", value: "1.5 / 10 = 15% and 1.5 / 2 = 75%" },
        { label: "Power at 100 a second", value: "100 x 50 microjoules = 5 mW, 20 hours" },
        { label: "Power at 500 a second", value: "500 x 50 microjoules = 25 mW, 4 hours" },
        { label: "Glitch rate at 0.1% late blocks", value: "every 10 s at 100 a second, every 2 s at 500 a second" },
      ],
    },
    followUps: [
      {
        q: "The model must wait for 2 future frames of 10 ms each. What happens to the delay?",
        a: "It adds 20 ms, so 35 ms becomes 55 ms. A causal model adds none.",
      },
      {
        q: "Is 35 ms acceptable?",
        a: "It depends on the product: fine for captions, too long for sound that is mixed with the direct sound at the ear. One study of simulated open-canal hearing aids rated about 5 to 6 ms as just acceptable, though other fittings tolerate more.",
      },
      {
        q: "A 60-second benchmark gives 1.0 ms but the product sometimes sees 1.5 ms and occasionally 4 ms. Why?",
        a: "Warm-up and the heating of the chip, cold caches, contention with other tasks, and rare tail events. Re-measure in the product under load and quote percentiles.",
      },
    ],
    mistakes: [
      "Reporting only the mean inference time.",
      "Confusing block size with window size. The block sets the deadline, the window adds look-ahead.",
      "Forgetting that shrinking the block raises load and power.",
    ],
  },

  'wake-word-false-accepts-and-power-cascade': {
    short:
      "False accepts (wrong activations per hour) and false rejects (the share of real attempts missed) are different kinds of error with different units, so there is no single accuracy or equal error rate to quote, and the threshold moves you along a curve between them. Once a week is 1 per 168 hours, so seeing about 10 events needs about 1,680 hours of negative audio, and showing the rate is below once a week with 95% confidence from a clean run needs about 3 x 168 = 504 hours. A two-stage design runs a tiny always-on detector and wakes a big verifier only when needed: 1 + 300 x (6 x 0.3 / 3,600) = 1.15 mW, against 300 mW if the big stage ran all the time. So the first stage's false accepts are also a power cost.",
    explain: [
      {
        heading: "Two errors, two units",
        body: "A false accept is the detector firing when nobody said the word, counted per hour. A false reject is a real attempt that fails, counted as a share of attempts, with a target here of no more than 5%. The units differ, so you cannot define one equal error rate or one accuracy number. The decision threshold moves you along a curve: raise it and false accepts fall while false rejects rise. Smoothing the outputs over a short time also lowers false accepts, but it delays the decision and can miss the word.",
      },
      {
        heading: "How much negative audio you need",
        body: "Negatives are audio with no wake word, and most real input is silence or unrelated speech, so they dominate. Once a week is 1 event per 168 hours. To see about 10 false accepts at that rate you need 10 x 168 = 1,680 hours. If you see zero events in n hours, the rate is probably below about 3 / n per hour at 95% confidence (the rule of three), so showing less than once a week takes 3 x 168 = 504 clean hours. A false accept in a two-minute test would extrapolate to 30 an hour, which is meaningless: short tests rank settings, they do not predict the rate users meet. Include hard negatives, which are similar-sounding words and near-misses, not just plain noise. Train with background sound and time shifts, and test by condition, because noise moves the whole trade-off curve the wrong way.",
      },
      {
        heading: "The pipeline",
        body: "The usual chain is frames, log-mel or MFCC features, a tiny network (for example a depthwise-separable convolutional network of tens of kilobytes, quantised to int8), smoothing over the outputs, a threshold, and a rule that stops repeat firing. A detection counts as correct if it lands within a time tolerance of the true word.",
      },
      {
        heading: "The cascade and the power budget",
        body: "A cascade has a tiny always-on first stage and a larger second stage that verifies. With the example numbers, stage two draws 300 mW for 0.3 s each time and is woken 6 times an hour, so it is on for 6 x 0.3 = 1.8 s of every 3,600 s. Its average is 300 x 1.8 / 3,600 = 0.15 mW, and the total is 1 + 0.15 = 1.15 mW, versus 300 mW if it ran all the time. The first stage's false-accept rate is therefore a power figure too. As an example of a budget frame, a design that aims to draw under 1 mA uses 1 mA x 24 h = 24 mAh a day, which is 1% of a 2,400 mAh battery.",
      },
    ],
    diagram: {
      kind: "bars",
      unit: "mW, average",
      items: [
        { label: "Big stage always on", value: 300, note: "no cascade" },
        { label: "Cascade, stage one wakes it 60 times an hour", value: 2.5, note: "1 + 300 x (60 x 0.3 / 3,600)" },
        { label: "Cascade, stage one wakes it 6 times an hour", value: 1.15, note: "1 + 0.15", hot: true },
      ],
      caption: "Average power of the example detector. The cascade is far cheaper, and ten times as many false wake-ups more than double its power.",
    },
    example: {
      title: "Example: false-accept evidence and cascade power",
      text: "Stage one draws 1 mW; stage two draws 300 mW for 0.3 s each time it is woken, 6 times an hour. These are the example numbers from the question.",
      rows: [
        { label: "Target rate", value: "1 per 168 hours" },
        { label: "Hours to expect 10 events", value: "10 x 168 = 1,680 hours" },
        { label: "Clean hours to show below the target, 95%", value: "3 x 168 = 504 hours" },
        { label: "Stage two on-time per hour", value: "6 x 0.3 = 1.8 s" },
        { label: "Average power, cascade", value: "1 + 300 x 1.8 / 3,600 = 1.15 mW" },
        { label: "Average power, big stage always on", value: "300 mW" },
        { label: "If stage one wakes it 60 times an hour", value: "1 + 300 x 18 / 3,600 = 2.5 mW" },
      ],
    },
    followUps: [
      {
        q: "In your two-minute test the detector fires falsely once at threshold 0.50 and zero times at 0.70, missing 3 of 12 keywords. What do you conclude?",
        a: "Not enough data for either rate: 12 attempts give a very wide interval around 25% misses, and two minutes cannot estimate a weekly false-accept rate. Collect thousands of hours of negatives and many real attempts across noise conditions, then choose the threshold from the curve and the costs.",
      },
      {
        q: "Stage one starts firing 60 times an hour instead of 6. What happens to power?",
        a: "1 + 300 x (60 x 0.3 / 3,600) = 2.5 mW, more than double, with nothing wrong in the second stage.",
      },
      {
        q: "Users complain in cars. What do you look at?",
        a: "Road noise shifts the curve. Evaluate and train per noise condition, add recorded negatives from cars, and re-check both error rates there.",
      },
    ],
    mistakes: [
      "Quoting a single accuracy number for a detector that has two error types.",
      "Treating false accepts and false rejects as the same kind of rate.",
      "Believing a few minutes of negative audio is enough to show a once-a-week rate.",
      "Ignoring that the first stage's false accepts cost power as well as annoyance.",
    ],
  },

  'benchmark-fast-product-slow-honest-edge-measurement': {
    short:
      "A real-time deadline is missed by the slowest block, not the average one. At 500 blocks a second, 0.4% late blocks is 2 late blocks a second, so the user hears a glitch about every half second, even though the 1.1 ms bench figure looks safe against a 2 ms deadline. The mean hardly moves either: 0.996 x 1.1 + 0.004 x 2.4 is about 1.105 ms. To make the claim honest, measure warmed up and to steady state including heat, with the full product running, and report the median, p99, p99.9, the maximum and misses per hour.",
    explain: [
      {
        heading: "What is happening",
        body: "The deadline is 2 ms per block, and some blocks take 2.4 ms. Each late block means the output is not ready when the speaker needs it, which is the crackle. The arithmetic is 0.4% x 500 blocks a second = 2 late blocks a second, one every 0.5 seconds, or 7,200 an hour. For comparison, even 0.1% at 100 blocks a second would still be a glitch every 10 seconds. A mean of 1.1 ms says little because the slow blocks are so rare that they barely move it, yet they are the ones that count.",
      },
      {
        heading: "Why the bench run missed it",
        body: "A clean run of 10 inferences cannot see an event that happens in 1 of 250 blocks: the chance that none of the 10 is slow is 0.996 to the power 10, about 96%. Causes of slow blocks include cold caches and lazy initialisation in a short run, thermal throttling after minutes of sustained work, interrupts and other tasks in the full product, memory contention, clock or voltage changes, and fetching weights from slower memory. The bench had none of these running, and the product has all of them.",
      },
      {
        heading: "An honest measurement",
        body: "Warm up and say so. Run long enough to reach steady state, including the slowdown from heat, and with the rest of the product active. Test at the worst supported temperature and power mode. Report the distribution, not a mean: the median, the 99th and 99.9th percentiles, the maximum, and the number of missed deadlines per hour, together with the conditions (clock, power mode, temperature, software versions). Time the whole path that ships, including features, model and decision logic, measure energy at the supply with a power monitor over a long window, and report accuracy next to speed.",
      },
      {
        heading: "Fixes by design",
        body: "Use a smaller or cheaper model, keep the work in the audio callback bounded with no allocation or blocking, pre-plan a memory arena, and use larger blocks if the latency budget allows. Set a headroom target, such as a worst-case time well under the deadline, instead of aiming for the average to fit. Larger blocks cost delay, so the trade is delay against load and has to be quantified, not assumed.",
      },
    ],
    diagram: {
      kind: "experiment",
      slug: "no-npu",
      caption: "Try it: run the same model against a per-block deadline and watch how a few slow blocks produce misses even when the average looks fine.",
    },
    example: {
      title: "Example: how often the user hears a glitch",
      text: "The deadline is 2 ms per block and there are 500 blocks a second. The 0.4% late rate and the times are from the question.",
      rows: [
        { label: "Late blocks per second", value: "0.4% x 500 = 2" },
        { label: "Time between glitches", value: "1 / 2 = 0.5 seconds" },
        { label: "Late blocks per hour", value: "2 x 3,600 = 7,200" },
        { label: "Mean time with 0.4% at 2.4 ms", value: "0.996 x 1.1 + 0.004 x 2.4 = 1.105 ms" },
        { label: "Chance a 10-run bench sees a slow block", value: "1 - 0.996^10 = about 4%" },
        { label: "At 0.1% and 100 blocks a second", value: "one glitch every 10 seconds" },
      ],
    },
    followUps: [
      {
        q: "Larger blocks would remove the misses. Why might the product team refuse?",
        a: "Block size adds directly to delay, which can be audible when the wearer also hears the room. The trade is delay against load, so quantify both and choose a block that meets the delay target with headroom.",
      },
      {
        q: "You read a published result for a chip. What do you ask before trusting it?",
        a: "Ask whether it was run in a closed or open division (same model or a modified one), whether the accuracy target was met, and what is excluded from the timed region, such as feature extraction. Also ask which board, clock and runtime, and whether it resembles your streaming workload.",
      },
      {
        q: "Throttling appears only above 35 degrees. How do you handle it?",
        a: "Test in a thermal chamber or with a heater, and design for the throttled speed. Add a graceful degradation path such as a lighter model, and monitor throttle events in the fleet.",
      },
    ],
    mistakes: [
      "Reporting a mean latency as proof of meeting a deadline.",
      "Benchmarking a short cold run and treating it as steady state.",
      "Measuring the model only and leaving out feature extraction and the decision logic.",
      "Arguing that a rare miss is acceptable without calculating how often it happens.",
    ],
  },

  'converted-model-differs-from-pytorch-parity-check': {
    short:
      "Do not guess: run one fixed input through every stage of the Python pipeline and of the device pipeline, and find the first stage where they disagree. The usual culprit is the feature front end (resampling, windowing, normalisation, mel filters, framing offsets), which was re-implemented in C or by a platform library, then the export settings, then the post-processing and thresholds. Compare with tolerances rather than bit-exact equality, and judge by the task metric. Prevent a repeat with pinned versions, a parity test on golden inputs in continuous integration, and thresholds stored with the model.",
    explain: [
      {
        heading: "Find the first stage that disagrees",
        body: "The pipeline has stages: raw input, features, model output, post-processing and decision. Take one fixed recording, run it through both the Python and the device versions, and compare what comes out of each stage. The first stage where the two differ is where the bug lives. Stopping at the final accuracy tells you that something is wrong but not where, and blaming quantisation or the chip here is a guess, since this drop happened before any quantisation.",
      },
      {
        heading: "Where the difference usually enters",
        body: "Suspect the feature front end first. Resampling, windowing, normalisation, mel filters, integer versus float feature code and framing offsets are often re-implemented in C or taken from a platform library, and small differences move accuracy. Next check the export: the model must be exported in evaluation mode (so batch norm and dropout behave as at inference), input shapes, data types and channel order must match, and operator versions or replaced operators must not have changed behaviour. Then check post-processing: smoothing, hysteresis and decision thresholds tuned in Python are part of the model's behaviour and must travel with it.",
      },
      {
        heading: "Noise versus a real bug, and preventing a repeat",
        body: "A different runtime will not give bit-exact results, so compare output tensors with a tolerance on a fixed set of representative inputs, and compare the task metric as well. To prevent a repeat, pin the framework, converter and runtime versions, keep a parity test with golden inputs and expected outputs in continuous integration, re-run it on every converter upgrade, and store thresholds in the model manifest. Finish with a measurement on the device, with the full pipeline on the target hardware, not a desktop emulator.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "input", label: "Raw input", sub: "same recording on both sides" },
        { id: "features", label: "Features", sub: "resampling, windows, mel: compare here first" },
        { id: "model", label: "Model output", sub: "tensors within a tolerance" },
        { id: "post", label: "Post-processing", sub: "smoothing, hysteresis, thresholds" },
        { id: "decision", label: "Decision", sub: "task metric on the device" },
      ],
      highlight: ["features"],
      caption: "Compare the Python and device pipelines stage by stage. The first stage where they disagree is the one to fix.",
    },
    example: {
      title: "Example: a parity check that finds the stage",
      text: "These are illustrative results for one fixed recording, showing how the first disagreement locates the bug.",
      rows: [
        { label: "Raw input", value: "identical samples on both sides: pass" },
        { label: "Features", value: "mel values differ by up to 8% in the lowest bands: fail, a different filter bank" },
        { label: "Model output", value: "differs only because the features differ" },
        { label: "Post-processing", value: "not yet worth checking" },
        { label: "After fixing the filter bank", value: "outputs agree within 1e-5, task metric back to 96%" },
      ],
    },
    followUps: [
      {
        q: "All tensors match to 1e-5 on your golden inputs, but the field accuracy is still lower. Now what?",
        a: "The golden set may not represent real input. Check the sampling rate and the microphone's frequency response, gain and clipping, buffering and dropped frames in the live path, and compare on recordings captured by the device itself.",
      },
      {
        q: "After quantisation the gap grows to 8 points. How do you tell quantisation from conversion?",
        a: "Compare three models on the same data: the float source, the converted float and the converted int8. The first gap is conversion and the second is quantisation. Then go layer by layer to find where the error jumps, and review the calibration set.",
      },
      {
        q: "How big a tolerance do you set in the parity test?",
        a: "A defensible, task-based one: a tolerance on outputs for float models, and for quantised models a tolerance on the task metric, because outputs differ by design. Revisit it when versions change.",
      },
    ],
    mistakes: [
      "Blaming quantisation or the chip without comparing pipeline stages.",
      "Comparing only the final accuracy and never inspecting intermediate tensors.",
      "Forgetting that feature extraction and thresholds are part of the model.",
      "Expecting bit-exact results across runtimes.",
    ],
  },

  'int8-accuracy-drop-in-noise': {
    short:
      "An average hides the tails. A 0.4 point drop on the test set says little about noisy rooms, because the calibration set (real inputs used to measure each activation's range) probably held clean, easy audio, so the ranges clipped or crushed the values that matter in hard cases. Rebuild the calibration and test sets with noise at several signal-to-noise ratios and judge by false rejects and false accepts per hour, use per-channel weight scales, keep sensitive layers in higher precision, and move to quantisation-aware training if a gap remains. Different board revisions run different kernels and rounding, so test across units and pin versions.",
    explain: [
      {
        heading: "Why the average hid the problem",
        body: "A test set that is mostly clean audio can hide a failure that only appears in noise, and the average moves little because noisy cases are a small share. Quantisation picks one range for each activation from the calibration data. If that data never held loud or noisy inputs, the chosen range is too narrow for them: large values are clipped, or the rounding step is wrong for the values that matter. Rebuild both the calibration set and the test set from real, difficult inputs, including noise at several signal-to-noise ratios, and judge by the task metric, false rejects and false accepts per hour, not average accuracy.",
      },
      {
        heading: "Post-training quantisation or quantisation-aware training",
        body: "Post-training quantisation (PTQ) converts a trained float model using calibration data. Quantisation-aware training (QAT) inserts fake quantisation, a simulated rounding step, during training so the model learns to tolerate it. One widely cited 2018 whitepaper on image CNNs found per-channel 8-bit weights with per-tensor activations within about 2% of float, QAT narrowing the gap to about 1%, and 4-bit weights needing QAT. Those were image tasks, so check your own. Small efficient networks and depthwise convolutions are the hard case: when weight ranges differ by more than 100 times between output channels, or outliers exist, one scale for the whole tensor hurts. Use per-channel scales first, then QAT if a gap remains.",
      },
      {
        heading: "The arithmetic on the chip",
        body: "The chip stores an integer q and recovers the real value as real = (q - zero point) x scale. Weights are int8 with a zero point of 0 and a scale per output channel. Activations are int8 with a zero point. Bias is int32 with scale S_w x S_x. The multiply-adds accumulate in int32, and the result is rescaled by S_w x S_x / S_y using a fixed-point multiplier and a shift. A worked example: weights 0.42, -0.77, 0.15, 0.91 have scale 0.91 / 127 = 0.00717 and int8 values 59, -107, 21, 127. Inputs spanning -0.5 to 2.0 have scale 2.5 / 255 = 0.0098 and zero point -77. For inputs 1.0, 0.2, -0.3, 0.5 the stored values are 25, -57, -108, -26, the integer accumulator is 9,704, and the real value is 9,704 x 0.00717 x 0.0098 = 0.682, against a float result of 0.676, an error of 0.006 (under 1%).",
      },
      {
        heading: "Board differences and diagnosis",
        body: "Two board revisions can run different kernels with different fixed-point rounding, so results differ slightly. Test across units, set defensible tolerances, and pin the versions of the framework, converter and runtime. To find where the error comes from, compare the activations with the float model on fixed hard inputs layer by layer and see where the error jumps. Keep sensitive layers in higher precision, often the first, the last and those with large activation ranges. Validate on the target hardware at realistic temperature and load.",
      },
    ],
    diagram: {
      kind: "flow",
      nodes: [
        { id: "inputs", label: "int8 weights and inputs", sub: "real = (q - zero point) x scale" },
        { id: "acc", label: "int32 accumulator", sub: "sum of integer products, no rounding yet" },
        { id: "bias", label: "Add int32 bias", sub: "scale S_w x S_x" },
        { id: "rescale", label: "Rescale", sub: "x S_w x S_x / S_y with a fixed-point multiplier and shift" },
        { id: "out", label: "int8 output", sub: "clipped to the range set by calibration" },
      ],
      highlight: ["out"],
      caption: "The integer path through one layer. Rounding and clipping happen at the output, where the calibrated range decides which values survive.",
    },
    example: {
      title: "Example: one weighted sum in int8 against float",
      text: "Four weights and four inputs, with bias left out for clarity. The input range of -0.5 to 2.0 is the example from the text.",
      rows: [
        { label: "Weight scale", value: "0.91 / 127 = 0.00717; int8 values 59, -107, 21, 127" },
        { label: "Input scale and zero point", value: "2.5 / 255 = 0.0098; zero point -77" },
        { label: "Inputs 1.0, 0.2, -0.3, 0.5 stored as", value: "25, -57, -108, -26" },
        { label: "Integer accumulator", value: "59 x 102 - 107 x 20 + 21 x (-31) + 127 x 51 = 9,704" },
        { label: "Real value from integers", value: "9,704 x 0.00717 x 0.0098 = 0.682" },
        { label: "Float result", value: "0.42 - 0.154 - 0.045 + 0.455 = 0.676" },
        { label: "Error", value: "0.006, under 1%" },
      ],
    },
    followUps: [
      {
        q: "How would you build a better calibration set?",
        a: "Make it representative and deliberately difficult: noise at several signal-to-noise ratios, rare conditions and range extremes, drawn from real field data with consent. Check that the measured ranges are not set by a few outliers.",
      },
      {
        q: "The quantised model is smaller but not faster. Why?",
        a: "The hardware may not accelerate that format or operator, kernels may fall back to slow paths, or memory traffic and the rest of the pipeline may dominate. Profile on the device.",
      },
      {
        q: "PTQ or QAT first?",
        a: "PTQ first, with per-channel scales and a good calibration set, because it is cheap. Move to QAT when a gap remains or when going below 8 bits.",
      },
    ],
    mistakes: [
      "Accepting the average accuracy and shipping without checking noisy conditions.",
      "Calibrating on clean data only.",
      "Assuming quantised results are identical on every device and board revision.",
      "Measuring speed on a laptop instead of the target.",
    ],
  },
};
