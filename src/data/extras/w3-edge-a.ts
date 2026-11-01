import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 3 "edge-a" batch. */
export const extrasW3EdgeA: Record<string, Extra> = {
  'edge/inside-a-small-device': {
    takeaways: [
      'Edge hardware is a ladder from data-centre GPUs to microcontrollers; memory spans about five orders of magnitude and peak compute about seven.',
      'Weights live in flash or MRAM and activations in SRAM, so two budgets decide fit, and the activation peak often sits in an early, high-resolution layer.',
      'Moving data costs far more energy than computing on it, which is why small integer types, local memory and always-on cascades matter.',
      'Convert every datasheet figure to MACs per second, check sparse versus dense, and treat peak as a ceiling to be measured against.',
    ],
    prereq: ['edge/edge-vs-cloud-inference'],
    quiz: [
      { q: 'On a typical microcontroller, where do a model\'s weights and its activations normally live?', options: ['Both in SRAM', 'Weights in flash (or MRAM), activations in SRAM', 'Weights in SRAM, activations in flash', 'Both in flash'], answer: 1, why: 'Weights are constants read in place from non-volatile memory; activations change while the model runs and need writable SRAM, the tensor arena.' },
      { q: 'MobileNetV1 at full width has about 4.2 million weights. Where is its activation memory peak in the lesson\'s count?', options: ['In the last, weight-heavy layers', 'In the final classifier layer', 'In an early layer with a large image and few weights', 'It has no peak because activations are reused'], answer: 2, why: 'The first pointwise layer reads a 112 x 112 x 32 tensor and writes 112 x 112 x 64, about 1.15 MB in int8, more than any later layer.' },
      { q: 'A datasheet lists 204 GOPS for an NPU. How many MACs per second is that, roughly?', options: ['408 G MAC/s', '204 G MAC/s', '102 G MAC/s', '51 G MAC/s'], answer: 2, why: 'One multiply-accumulate counts as two operations, so 204 GOPS is about 102 G MAC per second.' },
      { q: 'NVIDIA lists 67 INT8 TOPS for a Jetson Orin Nano Super. What should you check before using that number?', options: ['Whether it is a sparse figure (the dense figure is half)', 'Whether it is in float32', 'Whether it counts only the CPU', 'Nothing, it is always what a dense model gets'], answer: 0, why: 'The headline is a sparse figure; the dense figure is 33 TOPS, and a dense model does not get the sparse number.' },
      { q: 'Why does a peak speed figure on a datasheet not tell you how fast your model will run?', options: ['It is always correct for small models', 'It is a ceiling: small models rarely fill a chip and memory traffic often sets the real speed', 'It only applies to float32', 'It already includes sleep time'], answer: 1, why: 'Peak MACs per second is an upper bound; utilisation and data movement decide what you actually get, so measure on the device.' },
    ],
  },
  'edge/from-pytorch-to-the-chip': {
    takeaways: [
      'Four layers connect a framework to a chip: model file, runtime and accelerator back end, with compilers generating code for the target instead.',
      'Runtimes use different words (delegate, execution provider, backend, compute unit) for one idea: run what the chip supports and fall back for the rest.',
      'An unsupported operator in the middle of a graph splits it into partitions and costs two hand-offs each, which can erase much of an accelerator\'s speed-up.',
      'Some accelerators need quantised models, and one compiled file usually targets one chip family. After conversion, pin versions, check outputs and the task metric, and measure on the device.',
    ],
    prereq: ['edge/quantization-for-edge'],
    quiz: [
      { q: 'What does a runtime such as ONNX Runtime do when an execution provider cannot run an operator?', options: ['It stops with an error', 'It runs that operator on the next provider in the priority list, usually the CPU', 'It deletes the operator from the graph', 'It converts the model to float64'], answer: 1, why: 'Providers are listed in priority order, so unsupported nodes go to the next one, typically the CPU provider.' },
      { q: 'In the lesson\'s example transformer block, why does a 10 times faster accelerator give only about a 4 times speed-up?', options: ['The accelerator is slower than advertised', 'Unsupported operators split the graph into four partitions with eight hand-offs', 'Matrix multiplies cannot be accelerated', 'The CPU gets faster at the same time'], answer: 1, why: 'The CPU time on layer norm, softmax and GELU plus 2.4 ms of hand-offs leave 7.29 ms in total instead of 2.9 ms (the example figures are illustrative).' },
      { q: 'Which change does the lesson list as the cheapest way to reduce partitions?', options: ['Move an unsupported operator to the start or end of the graph', 'Add more hand-offs', 'Switch from int8 to float32', 'Rebuild the app'], answer: 0, why: 'An unsupported operator at an end does not split the accelerator\'s work into two partitions.' },
      { q: 'The ExecuTorch .pte file is built for one backend. What follows from that?', options: ['The same file runs on every chip', 'You need one build, and its own checks, for each chip family you target', 'It cannot be quantised', 'It only works on microcontrollers'], answer: 1, why: 'The file is specialised for its backend, so a fleet with several chip families needs a build and test matrix.' },
      { q: 'After converting a quantised model, which comparison is most meaningful?', options: ['Bit-exact equality of every output with the float model', 'The task metric (for example false rejects) on representative inputs, with a tolerance you can defend', 'File size alone', 'The number of operators'], answer: 1, why: 'Quantised outputs differ by design, so judge the converted model by the metric the product cares about and measure on the device.' },
    ],
  },
};
