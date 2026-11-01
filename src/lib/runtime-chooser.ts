/**
 * Data and logic for the runtime chooser in "From PyTorch to the chip". Every route below is taken from the
 * vendors' own documentation as read on 1 November 2026 (URLs in each entry). Support changes release to
 * release, so each entry says what to check rather than promising it works.
 */

export type Source = 'pytorch' | 'tensorflow' | 'jax' | 'onnx';
export type Target = 'android' | 'ios' | 'linux' | 'mcu' | 'mcu-npu' | 'desktop' | 'nvidia' | 'browser';

export const SOURCES: { id: Source; label: string }[] = [
  { id: 'pytorch', label: 'PyTorch' },
  { id: 'tensorflow', label: 'TensorFlow / Keras' },
  { id: 'jax', label: 'JAX' },
  { id: 'onnx', label: 'An ONNX file' },
];

export const TARGETS: { id: Target; label: string }[] = [
  { id: 'android', label: 'Android phone' },
  { id: 'ios', label: 'iPhone or Mac' },
  { id: 'linux', label: 'Linux board (Arm)' },
  { id: 'mcu', label: 'Microcontroller (Cortex-M)' },
  { id: 'mcu-npu', label: 'Microcontroller with Ethos-U NPU' },
  { id: 'desktop', label: 'Windows or Linux PC' },
  { id: 'nvidia', label: 'NVIDIA GPU' },
  { id: 'browser', label: 'Web browser' },
];

export interface Rec {
  runtime: string;
  /** The file or artefact you ship. */
  artefact: string;
  /** Accelerators or backends the documentation lists for this target. */
  accel: string;
  why: string;
  check: string;
  url: string;
}

interface Route extends Rec {
  from: Source[];
  to: Target[];
}

const EXT = 'https://docs.pytorch.org/executorch/stable';
const ORT = 'https://onnxruntime.ai/docs/execution-providers';

/** Order matters: it is the order shown. */
const ROUTES: Route[] = [
  {
    runtime: 'LiteRT (formerly TensorFlow Lite)',
    artefact: '.tflite file',
    accel: 'CPU, GPU, and NPU on supported vendors (Google Tensor, Qualcomm, MediaTek, Intel, Samsung)',
    why: 'Direct export and quantisation from PyTorch, TensorFlow and JAX into .tflite, and a documented route on Android.',
    check: 'Operators your model uses against the converter and the NPU vendor list; whether to compile ahead of time for known chips.',
    url: 'https://ai.google.dev/edge/litert',
    from: ['pytorch', 'tensorflow', 'jax'],
    to: ['android'],
  },
  {
    runtime: 'ExecuTorch',
    artefact: '.pte file, built for one backend',
    accel: 'XNNPACK (CPU), Vulkan (GPU), Qualcomm and MediaTek NPUs',
    why: 'Takes a PyTorch model through torch.export and lowers it for the backend you pick; unsupported parts run on the CPU.',
    check: 'One .pte per backend, so plan one build per chip family; read the backend page for operator and quantisation limits.',
    url: `${EXT}/using-executorch-export.html`,
    from: ['pytorch'],
    to: ['android'],
  },
  {
    runtime: 'ONNX Runtime',
    artefact: '.onnx file',
    accel: 'Execution providers including XNNPACK and Qualcomm QNN (Android and Windows on Snapdragon)',
    why: 'One runtime and API across providers, with a priority-ordered fallback to the CPU provider.',
    check: 'Which provider versions support your operators; export your PyTorch model to ONNX first.',
    url: `${ORT}/QNN-ExecutionProvider.html`,
    from: ['pytorch', 'onnx'],
    to: ['android'],
  },
  {
    runtime: 'Core ML',
    artefact: 'Core ML model (converted with Core ML Tools)',
    accel: 'CPU, GPU and the Neural Engine, scheduled by the system unless you restrict them',
    why: "Apple's own runtime; Core ML Tools converts from PyTorch and TensorFlow.",
    check: 'Which compute units actually ran each layer on your device generation; compare outputs with the source model.',
    url: 'https://apple.github.io/coremltools/docs-guides/',
    from: ['pytorch', 'tensorflow'],
    to: ['ios'],
  },
  {
    runtime: 'ExecuTorch',
    artefact: '.pte file, built for one backend',
    accel: 'Core ML or XNNPACK backends',
    why: 'The ExecuTorch documentation suggests XNNPACK or Core ML for iOS, and keeps you in the PyTorch export flow.',
    check: 'Whether the Core ML backend covers your operators; fall back to XNNPACK if not.',
    url: `${EXT}/backends/coreml/coreml-overview.html`,
    from: ['pytorch'],
    to: ['ios'],
  },
  {
    runtime: 'LiteRT',
    artefact: '.tflite file',
    accel: 'CPU and GPU, with a Core ML delegate listed in the iOS documentation',
    why: 'Converts from PyTorch, TensorFlow and JAX and runs on iOS and macOS.',
    check: 'Whether the Core ML delegate or GPU path supports your operators in the current release.',
    url: 'https://ai.google.dev/edge/litert',
    from: ['tensorflow', 'jax', 'pytorch'],
    to: ['ios'],
  },
  {
    runtime: 'ONNX Runtime',
    artefact: '.onnx file',
    accel: 'CoreML execution provider (listed as preview in the provider table)',
    why: 'Keeps one ONNX model across platforms and hands supported parts to Core ML.',
    check: 'Provider status and supported operator list; it is marked preview in the provider table.',
    url: `${ORT}/CoreML-ExecutionProvider.html`,
    from: ['onnx', 'pytorch'],
    to: ['ios'],
  },
  {
    runtime: 'LiteRT',
    artefact: '.tflite file',
    accel: 'CPU; see the Embedded and IoT pages of the LiteRT documentation for accelerators',
    why: 'Documented for Linux-based devices including Python use, and converts from PyTorch, TensorFlow and JAX.',
    check: 'Whether your board vendor ships an accelerator path for it.',
    url: 'https://ai.google.dev/edge/litert',
    from: ['pytorch', 'tensorflow', 'jax'],
    to: ['linux'],
  },
  {
    runtime: 'ONNX Runtime',
    artefact: '.onnx file',
    accel: 'XNNPACK, Arm NN and Arm Compute Library (both marked preview) and OpenVINO providers',
    why: 'Wide provider list for Arm and other embedded Linux targets.',
    check: 'Which provider your board supports and whether it is marked preview.',
    url: 'https://onnxruntime.ai/docs/execution-providers/',
    from: ['onnx', 'pytorch'],
    to: ['linux'],
  },
  {
    runtime: 'ExecuTorch',
    artefact: '.pte file, built for one backend',
    accel: 'XNNPACK (CPU); other backends are listed in its documentation',
    why: 'Has an embedded-systems path in its documentation and a CPU backend.',
    check: 'The backend list for your chip family.',
    url: `${EXT}/backends/xnnpack/xnnpack-overview.html`,
    from: ['pytorch'],
    to: ['linux'],
  },
  {
    runtime: 'LiteRT for Microcontrollers',
    artefact: '.tflite file compiled into the firmware',
    accel: 'Cortex-M CPUs, with CMSIS-NN kernels',
    why: 'Written in C++17, needs no operating system, standard library or dynamic memory allocation, and its core runtime is documented at about 16 KB on a Cortex-M3.',
    check: 'That every operator is in the registered op resolver, and the tensor arena size.',
    url: 'https://ai.google.dev/edge/litert/microcontrollers/overview',
    from: ['pytorch', 'tensorflow', 'jax'],
    to: ['mcu'],
  },
  {
    runtime: 'ExecuTorch Arm Cortex-M backend (beta)',
    artefact: '.pte file',
    accel: 'CMSIS-NN kernels on Cortex-M CPUs',
    why: 'An operator library for quantised models rather than a delegate: unsupported operators fall back to portable fp32 kernels.',
    check: 'It is documented as beta and validated on a small set of models; test yours.',
    url: `${EXT}/backends/arm-cortex-m/arm-cortex-m-overview.html`,
    from: ['pytorch'],
    to: ['mcu'],
  },
  {
    runtime: 'ExecuTorch Arm Ethos-U backend',
    artefact: '.pte file compiled ahead of time with the Vela graph compiler',
    accel: 'Ethos-U55, U65 and U85 NPUs',
    why: 'Targets quantised models; the supported parts become an NPU command stream and the rest run on the CPU.',
    check: 'Your model must be quantised, and every unsupported operator is a CPU round trip.',
    url: `${EXT}/backends/arm-ethos-u/arm-ethos-u-overview.html`,
    from: ['pytorch'],
    to: ['mcu-npu'],
  },
  {
    runtime: 'LiteRT for Microcontrollers',
    artefact: '.tflite file compiled into the firmware',
    accel: 'Cortex-M CPU kernels; for the NPU, follow your chip vendor and Arm documentation',
    why: 'The documented small-footprint runtime. The Ethos-U path for .tflite models goes through Arm tooling that this lesson has not verified.',
    check: "Arm's and your chip vendor's current instructions for compiling a .tflite model for the NPU.",
    url: 'https://ai.google.dev/edge/litert/microcontrollers/overview',
    from: ['tensorflow', 'jax', 'pytorch'],
    to: ['mcu-npu'],
  },
  {
    runtime: 'ONNX Runtime',
    artefact: '.onnx file',
    accel: 'CPU, OpenVINO (Intel), Qualcomm QNN on Windows on Snapdragon, DirectML (in sustained engineering; Windows ML is its stated successor)',
    why: 'The broadest provider list for desktop hardware, with a CPU fallback.',
    check: 'Which provider fits your hardware, and the status notes on the provider page.',
    url: 'https://onnxruntime.ai/docs/execution-providers/',
    from: ['onnx', 'pytorch'],
    to: ['desktop'],
  },
  {
    runtime: 'LiteRT',
    artefact: '.tflite file',
    accel: 'CPU and GPU on Linux and Windows',
    why: 'Documents desktop use on Linux and Windows and converts from PyTorch, TensorFlow and JAX.',
    check: 'Operator coverage on the GPU path.',
    url: 'https://ai.google.dev/edge/litert',
    from: ['pytorch', 'tensorflow', 'jax'],
    to: ['desktop'],
  },
  {
    runtime: 'ExecuTorch',
    artefact: '.pte file',
    accel: 'XNNPACK (CPU) and other backends',
    why: 'Lists desktop and laptop platforms in its documentation.',
    check: 'The platform page for your operating system.',
    url: `${EXT}/backends/xnnpack/xnnpack-overview.html`,
    from: ['pytorch'],
    to: ['desktop'],
  },
  {
    runtime: 'ONNX Runtime',
    artefact: '.onnx file',
    accel: 'CUDA and TensorRT execution providers',
    why: 'Microsoft and NVIDIA integrated TensorRT as an execution provider; the CUDA provider is the more general GPU path.',
    check: 'Provider and TensorRT version compatibility.',
    url: `${ORT}/TensorRT-ExecutionProvider.html`,
    from: ['onnx', 'pytorch'],
    to: ['nvidia'],
  },
  {
    runtime: 'ExecuTorch CUDA backend',
    artefact: '.pte file',
    accel: 'NVIDIA GPUs, via AOTInductor and Triton kernels',
    why: 'Keeps the PyTorch export flow on NVIDIA GPUs, including INT4 weight quantisation.',
    check: 'Operator coverage and GPU generation in the backend page.',
    url: `${EXT}/backends/cuda/cuda-overview.html`,
    from: ['pytorch'],
    to: ['nvidia'],
  },
  {
    runtime: 'ONNX Runtime Web',
    artefact: '.onnx file',
    accel: 'WebGPU execution provider',
    why: 'The WebGPU provider can power the browser backend of ONNX Runtime Web and aims to be cross-vendor.',
    check: 'Browser support for WebGPU and the operator list.',
    url: `${ORT}/WebGPU-ExecutionProvider.html`,
    from: ['onnx', 'pytorch'],
    to: ['browser'],
  },
  {
    runtime: 'LiteRT.js',
    artefact: '.tflite file',
    accel: 'GPU, through the CompiledModel API in the web documentation',
    why: 'The LiteRT documentation has a web section (LiteRT.js) for running models in the browser.',
    check: 'Browser support for WebGPU and the operator list.',
    url: 'https://ai.google.dev/edge/litert',
    from: ['pytorch', 'tensorflow', 'jax'],
    to: ['browser'],
  },
  {
    runtime: 'ExecuTorch WebGPU backend (experimental)',
    artefact: '.pte file',
    accel: 'WebGPU through Emscripten in the browser',
    why: 'Runs delegated PyTorch graphs on WebGPU.',
    check: 'It is documented as experimental and under active development.',
    url: `${EXT}/backends/webgpu/webgpu-overview.html`,
    from: ['pytorch'],
    to: ['browser'],
  },
];

/** The compiler route: shown for every target when the source can be imported. */
export const COMPILER_ROUTE: Rec & { from: Source[] } = {
  runtime: 'Apache TVM (compiler)',
  artefact: 'A compiled module for your target',
  accel: 'Whatever target you generate code for',
  why: 'Imports models from PyTorch and ONNX, optimises the graph and generates code, and its runtime works on mobile, edge devices and bare metal. Worth a look when no runtime has kernels for your chip.',
  check: 'You take on tuning and testing yourself.',
  url: 'https://tvm.apache.org/docs/',
  from: ['pytorch', 'onnx'],
};

export function recommend(source: Source, target: Target): Rec[] {
  const out: Rec[] = ROUTES.filter((r) => r.from.includes(source) && r.to.includes(target)).map(({ from: _f, to: _t, ...rec }) => rec);
  if (COMPILER_ROUTE.from.includes(source)) {
    const { from: _f, ...rec } = COMPILER_ROUTE;
    out.push(rec);
  }
  return out;
}
