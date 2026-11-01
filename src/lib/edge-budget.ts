/**
 * Pure logic for the "Inside a small device" lesson: what a model needs (weights, peak activation memory,
 * multiply-accumulates) and whether a given device can hold and run it.
 *
 * Model numbers are COMPUTED here from layer shapes, not measured. They follow the published architectures
 * (Hello Edge DS-CNN small; MobileNetV1) and are checked against the numbers those papers print in the tests.
 * Device numbers are copied from vendor documents (see the `source` fields) and dated in `asOf`.
 */

export type LayerKind = 'conv' | 'dwconv' | 'pwconv' | 'pool' | 'dense';

export interface Layer {
  name: string;
  kind: LayerKind;
  /** Number of values read by the layer. */
  inElems: number;
  /** Number of values written by the layer. */
  outElems: number;
  /** Weights plus biases. */
  params: number;
  /** Multiply-accumulates for one inference. */
  macs: number;
  outShape: [number, number, number];
}

export interface Model {
  id: string;
  name: string;
  blurb: string;
  layers: Layer[];
}

const same = (n: number, stride: number) => Math.ceil(n / stride);

/** Builds a sequential model one layer at a time, tracking the tensor shape ("same" padding). */
class Chain {
  layers: Layer[] = [];
  constructor(
    private h: number,
    private w: number,
    private c: number,
  ) {}

  private push(name: string, kind: LayerKind, oh: number, ow: number, oc: number, params: number, macs: number) {
    this.layers.push({
      name,
      kind,
      inElems: this.h * this.w * this.c,
      outElems: oh * ow * oc,
      params,
      macs,
      outShape: [oh, ow, oc],
    });
    this.h = oh;
    this.w = ow;
    this.c = oc;
  }

  conv(name: string, kh: number, kw: number, sh: number, sw: number, outC: number) {
    const oh = same(this.h, sh);
    const ow = same(this.w, sw);
    this.push(name, 'conv', oh, ow, outC, kh * kw * this.c * outC + outC, oh * ow * outC * kh * kw * this.c);
    return this;
  }

  dw(name: string, k: number, stride: number) {
    const oh = same(this.h, stride);
    const ow = same(this.w, stride);
    this.push(name, 'dwconv', oh, ow, this.c, k * k * this.c + this.c, oh * ow * this.c * k * k);
    return this;
  }

  pw(name: string, outC: number) {
    this.push(name, 'pwconv', this.h, this.w, outC, this.c * outC + outC, this.h * this.w * outC * this.c);
    return this;
  }

  globalPool(name: string) {
    this.push(name, 'pool', 1, 1, this.c, 0, 0);
    return this;
  }

  dense(name: string, units: number) {
    const inN = this.h * this.w * this.c;
    this.push(name, 'dense', 1, 1, units, inN * units + units, inN * units);
    return this;
  }
}

/**
 * The small depthwise-separable CNN for keyword spotting from "Hello Edge" (Zhang et al., 2017), Appendix A:
 * C(64,10,4,2,2) then four DSC(64,3,1), average pool, 12 outputs, on 49 frames x 10 MFCCs.
 */
export function dsCnnSmall(): Model {
  const c = new Chain(49, 10, 1).conv('conv 10x4 /2', 10, 4, 2, 2, 64);
  for (let i = 1; i <= 4; i++) c.dw(`dw ${i}`, 3, 1).pw(`pw ${i}`, 64);
  c.globalPool('avg pool').dense('dense 12', 12);
  return {
    id: 'kws',
    name: 'Keyword spotter',
    blurb: 'A small depthwise-separable CNN on 49 frames x 10 MFCCs, 12 classes (the Hello Edge "small" network).',
    layers: c.layers,
  };
}

/** MobileNetV1 (Howard et al., 2017, Table 1) with a width multiplier and a square input. */
export function mobileNetV1(opts: { alpha: number; size: number; classes: number; id: string; name: string; blurb: string }): Model {
  const { alpha, size, classes } = opts;
  const ch = (n: number) => Math.round(n * alpha);
  const c = new Chain(size, size, 3).conv('conv 3x3 /2', 3, 3, 2, 2, ch(32));
  const blocks: [number, number][] = [
    [64, 1],
    [128, 2],
    [128, 1],
    [256, 2],
    [256, 1],
    [512, 2],
    [512, 1],
    [512, 1],
    [512, 1],
    [512, 1],
    [512, 1],
    [1024, 2],
    [1024, 1],
  ];
  blocks.forEach(([out, stride], i) => {
    c.dw(`dw ${i + 1}`, 3, stride).pw(`pw ${i + 1}`, ch(out));
  });
  c.globalPool('avg pool').dense(`dense ${classes}`, classes);
  return { id: opts.id, name: opts.name, blurb: opts.blurb, layers: c.layers };
}

export const MODELS: Model[] = [
  dsCnnSmall(),
  mobileNetV1({
    alpha: 0.25,
    size: 96,
    classes: 2,
    id: 'vww',
    name: 'Person detector',
    blurb: 'MobileNetV1 at width 0.25 on a 96 x 96 colour image, two outputs (person, no person).',
  }),
  mobileNetV1({
    alpha: 1,
    size: 224,
    classes: 1000,
    id: 'mnet',
    name: 'Photo classifier',
    blurb: 'Full-width MobileNetV1 on a 224 x 224 colour image, 1000 classes.',
  }),
];

export interface ModelStats {
  params: number;
  macs: number;
  /** Peak of (input + output values) over the layers: a simple sequential-model estimate of the activation arena. */
  peakActivationElems: number;
  peakLayer: number;
  /** Per-layer input + output values, in order. */
  perLayerElems: number[];
}

export function modelStats(model: Model): ModelStats {
  let params = 0;
  let macs = 0;
  let peak = 0;
  let peakLayer = 0;
  const perLayer: number[] = [];
  model.layers.forEach((l, i) => {
    params += l.params;
    macs += l.macs;
    const live = l.inElems + l.outElems;
    perLayer.push(live);
    if (live > peak) {
      peak = live;
      peakLayer = i;
    }
  });
  return { params, macs, peakActivationElems: peak, peakLayer, perLayerElems: perLayer };
}

const KIB = 1024;
const MIB = 1024 * 1024;

export interface Device {
  id: string;
  name: string;
  cls: string;
  /** Non-volatile memory that holds weights and code (flash, MRAM). Null when weights live in RAM. */
  nvmBytes: number | null;
  nvmLabel: string;
  ramBytes: number;
  ramLabel: string;
  /** Dense 8-bit multiply-accumulates per second at the stated peak. See `peakNote`. */
  peakMacsPerS: number;
  peakNote: string;
  /** Power while computing, in watts, or null when the vendor documents no figure we can use. */
  powerW: number | null;
  powerNote: string;
  /** Mains or rack powered: battery life is not meaningful. */
  mains: boolean;
  source: string;
  sourceUrl: string;
  asOf: string;
}

export const DEVICES: Device[] = [
  {
    id: 'rp2040',
    name: 'RP2040 (Pico)',
    cls: 'Microcontroller',
    nvmBytes: 2 * MIB,
    nvmLabel: '2 MB flash (on the Pico board; the chip supports up to 16 MB)',
    ramBytes: 264 * KIB,
    ramLabel: '264 kB SRAM',
    peakMacsPerS: 133e6 * 0.5,
    peakNote:
      'Two Cortex-M0+ cores at up to 133 MHz with a single-cycle 32-bit multiplier (datasheet). No SIMD or multiply-accumulate instruction, so the 0.5 MAC per cycle is this lesson\'s own estimate: one multiply and one add per MAC, ignoring loads.',
    powerW: null,
    powerNote: 'No active-power figure used: type your own below if you have a measurement.',
    mains: false,
    source: 'RP2040 datasheet and Pico datasheet, Raspberry Pi Ltd',
    sourceUrl: 'https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf',
    asOf: '1 November 2026',
  },
  {
    id: 'apollo4',
    name: 'Apollo4 Plus',
    cls: 'Microcontroller with SIMD',
    nvmBytes: 2 * MIB,
    nvmLabel: 'up to 2 MB MRAM',
    ramBytes: 2.75 * MIB,
    ramLabel: 'up to 2.75 MB low-power RAM',
    peakMacsPerS: 192e6 * 2,
    peakNote:
      'Cortex-M4 with FPU at up to 192 MHz (Ambiq). The Cortex-M4 DSP extension can do two 16-bit multiply-accumulates per instruction (SMLAD in the CMSIS documentation), so 2 MACs per cycle is a ceiling and this lesson\'s own arithmetic.',
    powerW: 4e-6 * 192 * 1.8,
    powerNote: 'Derived: the datasheet headline 4 uA per MHz, times 192 MHz, times an assumed 1.8 V supply (the chip accepts 1.71 to 2.2 V). CPU running from MRAM only: no sensors, radio or display.',
    mains: false,
    source: 'Ambiq Apollo4 Plus product page',
    sourceUrl: 'https://ambiq.com/apollo4-plus/',
    asOf: '1 November 2026',
  },
  {
    id: 'alif',
    name: 'Ensemble E3 (M55 + Ethos-U55)',
    cls: 'Microcontroller with NPU',
    nvmBytes: 5.5 * MIB,
    nvmLabel: 'up to 5.5 MB MRAM',
    ramBytes: 13.5 * MIB,
    ramLabel: 'up to 13.5 MB SRAM (shared; the fast core-local part is smaller)',
    peakMacsPerS: 204e9 / 2,
    peakNote: 'Alif states an Ethos-U55 with 256 MAC per cycle at up to 204 GOPS. One MAC counts as two operations, so 204 GOPS is 102 G MAC per second.',
    powerW: null,
    powerNote: 'Alif gives a per-MHz figure for the small core only, not for the NPU, so no active-power figure is used here.',
    mains: false,
    source: 'Alif Semiconductor Ensemble E3 page',
    sourceUrl: 'https://alifsemi.com/ensemble-e3-series/',
    asOf: '1 November 2026',
  },
  {
    id: 'jetson',
    name: 'Jetson Orin Nano Super',
    cls: 'Embedded board with GPU',
    nvmBytes: null,
    nvmLabel: 'storage on SD card or NVMe, not counted',
    ramBytes: 8 * 1024 * MIB,
    ramLabel: '8 GB LPDDR5 (102 GB/s)',
    peakMacsPerS: 33e12 / 2,
    peakNote: 'NVIDIA lists 67 sparse and 33 dense INT8 TOPS. The dense figure is used here (33 TOPS is 16.5 T MAC per second); the sparse figure needs a specially pruned model.',
    powerW: 25,
    powerNote: 'The top of the listed 7 to 25 W range. A lower power mode gives lower speed.',
    mains: false,
    source: 'NVIDIA Jetson Orin Nano Super developer kit page and NVIDIA developer blog',
    sourceUrl: 'https://developer.nvidia.com/blog/nvidia-jetson-orin-nano-developer-kit-gets-a-super-boost/',
    asOf: '1 November 2026',
  },
  {
    id: 'h100',
    name: 'H100 SXM (data centre)',
    cls: 'Server GPU',
    nvmBytes: null,
    nvmLabel: 'not applicable',
    ramBytes: 80 * 1024 * MIB,
    ramLabel: '80 GB HBM (3.35 TB/s)',
    peakMacsPerS: 3958e12 / 2 / 2,
    peakNote: 'NVIDIA lists 3,958 INT8 TOPS "with sparsity" for the SXM part. Dense is half of that (as the Jetson page shows for its own part), and one MAC is two operations: 989.5 T MAC per second.',
    powerW: 700,
    powerNote: 'Maximum thermal design power, up to 700 W, configurable.',
    mains: true,
    source: 'NVIDIA H100 page',
    sourceUrl: 'https://www.nvidia.com/en-us/data-center/h100/',
    asOf: '1 November 2026',
  },
];

export interface Options {
  /** 1 for int8, 4 for float32. */
  bytesPerValue: number;
  /** Inferences per second. */
  rate: number;
  /** Fraction of the device's peak MACs per second that the software actually reaches, 0 to 1. */
  efficiency: number;
  /** Fraction of each memory kept for the rest of the firmware or system, 0 to 1. */
  reserve: number;
  batteryMah: number;
  batteryVolts: number;
  /** Overrides the device's power figure, in watts, when set. */
  powerOverrideW?: number | null;
}

export interface Fit {
  used: number;
  capacity: number;
  ok: boolean;
}

export interface Estimate {
  weightBytes: number;
  arenaBytes: number;
  /** Null for devices that have no separate non-volatile memory. */
  nvm: Fit | null;
  ram: Fit;
  fits: boolean;
  seconds: number;
  /** Fraction of each second spent computing. Above 1 means it cannot keep up. */
  busy: number;
  keepsUp: boolean;
  energyJ: number | null;
  /** Average power in watts for the inference stream alone. */
  averageW: number | null;
  batteryHours: number | null;
}

export function estimate(stats: ModelStats, device: Device, o: Options): Estimate {
  const weightBytes = stats.params * o.bytesPerValue;
  const arenaBytes = stats.peakActivationElems * o.bytesPerValue;
  const keep = 1 - o.reserve;
  let nvm: Fit | null = null;
  let ram: Fit;
  if (device.nvmBytes !== null) {
    const cap = device.nvmBytes * keep;
    nvm = { used: weightBytes, capacity: cap, ok: weightBytes <= cap };
    const rcap = device.ramBytes * keep;
    ram = { used: arenaBytes, capacity: rcap, ok: arenaBytes <= rcap };
  } else {
    const rcap = device.ramBytes * keep;
    const used = weightBytes + arenaBytes;
    ram = { used, capacity: rcap, ok: used <= rcap };
  }
  const macsPerS = device.peakMacsPerS * Math.max(o.efficiency, 1e-6);
  const seconds = stats.macs / macsPerS;
  const busy = seconds * o.rate;
  const power = o.powerOverrideW ?? device.powerW;
  const energyJ = power === null || power === undefined ? null : power * seconds;
  const averageW = energyJ === null ? null : energyJ * o.rate;
  const wh = (o.batteryMah / 1000) * o.batteryVolts;
  const batteryHours = averageW === null || device.mains || averageW <= 0 ? null : wh / averageW;
  return {
    weightBytes,
    arenaBytes,
    nvm,
    ram,
    fits: (nvm ? nvm.ok : true) && ram.ok,
    seconds,
    busy,
    keepsUp: busy <= 1,
    energyJ,
    averageW,
    batteryHours,
  };
}

export function fmtBytes(n: number): string {
  if (n >= 1024 * MIB) return (n / (1024 * MIB)).toFixed(n >= 10 * 1024 * MIB ? 0 : 1) + ' GB';
  if (n >= MIB) return (n / MIB).toFixed(n >= 10 * MIB ? 0 : 2) + ' MB';
  if (n >= KIB) return (n / KIB).toFixed(n >= 100 * KIB ? 0 : 1) + ' kB';
  return Math.round(n) + ' B';
}

export function fmtTime(seconds: number): string {
  if (seconds >= 1) return seconds.toFixed(2) + ' s';
  if (seconds >= 1e-3) return (seconds * 1e3).toFixed(seconds >= 0.1 ? 0 : 1) + ' ms';
  if (seconds >= 1e-6) return (seconds * 1e6).toFixed(seconds >= 1e-4 ? 0 : 1) + ' us';
  return (seconds * 1e9).toFixed(0) + ' ns';
}

export function fmtEnergy(joules: number): string {
  if (joules >= 1) return joules.toFixed(2) + ' J';
  if (joules >= 1e-3) return (joules * 1e3).toFixed(joules >= 0.1 ? 0 : 2) + ' mJ';
  if (joules >= 1e-6) return (joules * 1e6).toFixed(joules >= 1e-4 ? 0 : 2) + ' uJ';
  return (joules * 1e9).toFixed(0) + ' nJ';
}

export function fmtHours(h: number): string {
  if (h >= 24 * 365) return (h / (24 * 365)).toFixed(1) + ' years';
  if (h >= 48) return (h / 24).toFixed(1) + ' days';
  if (h >= 1) return h.toFixed(1) + ' hours';
  return Math.round(h * 60) + ' minutes';
}
