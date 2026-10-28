/**
 * NVIDIA's whole machines, for teaching how total memory and links differ from one GPU's.
 * Every figure below was read on the NVIDIA page named in `official` on the date in
 * `checked`; where a page did not state a figure, it is left out and the page is linked.
 * Systems report memory on different bases (HBM across GPUs, unified memory shared with
 * the CPU), so `memoryNote` always says which. NVIDIA's totals are rounded.
 * Single accelerators are in src/data/gpus.ts.
 */

export type SystemKind = 'desktop' | 'server' | 'rack';

export type System = {
  name: string;
  maker: string;
  kind: SystemKind;
  /** What is inside, as NVIDIA words it. */
  gpus?: string;
  /** Memory the accelerators can use, in GB (decimal), on the basis given in `memoryNote`. */
  totalMemoryGB?: number;
  /** What the memory figure is, in NVIDIA's terms. */
  memoryNote?: string;
  interconnect?: string;
  /** NVIDIA's own page for this system. */
  official: string;
  /** One sentence taken from, or faithful to, that page. */
  note?: string;
  checked: string;
};

const checked = '2026-10-28';

export const systems: System[] = [
  {
    name: 'DGX Spark',
    maker: 'NVIDIA',
    kind: 'desktop',
    gpus: '1 x NVIDIA GB10 Grace Blackwell Superchip',
    totalMemoryGB: 128,
    memoryNote: '128 GB of coherent unified memory (LPDDR5x) shared by CPU and GPU, at 273 GB/s. A 64 GB version is sold only through OEM partners.',
    interconnect: 'ConnectX-7 networking; up to four systems can be linked (two QSFP ports each, up to 200 Gb/s per port).',
    official: 'https://www.nvidia.com/en-us/products/workstations/dgx-spark/',
    note: 'NVIDIA says up to 128 GB of unified memory lets you fine-tune models up to 70 billion parameters.',
    checked,
  },
  {
    name: 'DGX Station',
    maker: 'NVIDIA',
    kind: 'desktop',
    gpus: '1 x NVIDIA Blackwell Ultra (GB300 Desktop Superchip with a 72-core Grace CPU)',
    totalMemoryGB: 252,
    memoryNote: '252 GB HBM3e at 7.1 TB/s on the GPU, plus 496 GB LPDDR5X at 396 GB/s attached to the CPU.',
    interconnect: 'NVLink-C2C at 900 GB/s between CPU and GPU; ConnectX-8 SuperNIC up to 800 Gb/s.',
    official: 'https://www.nvidia.com/en-us/products/workstations/dgx-station/',
    note: 'NVIDIA says it supports Multi-Instance GPU partitioning into as many as seven isolated instances.',
    checked,
  },
  {
    name: 'DGX H100 and DGX H200',
    maker: 'NVIDIA',
    kind: 'server',
    gpus: '8 x NVIDIA H100 (DGX H100) or 8 x NVIDIA H200 (DGX H200)',
    totalMemoryGB: 640,
    memoryNote: 'Total GPU memory: 640 GB for DGX H100 and 1,128 GB for DGX H200, across 8 GPUs.',
    interconnect: 'NVSwitch with 4th-generation NVLink, 900 GB/s GPU to GPU.',
    official: 'https://docs.nvidia.com/dgx/dgxh100-user-guide/introduction-to-dgxh100.html',
    note: 'NVIDIA’s user guide covers both systems on one page; the figure shown is the H100 one.',
    checked,
  },
  {
    name: 'DGX B200',
    maker: 'NVIDIA',
    kind: 'server',
    gpus: '8 x NVIDIA Blackwell GPUs',
    totalMemoryGB: 1440,
    memoryNote: '1,440 GB total GPU memory, with 64 TB/s of HBM3e bandwidth across the 8 GPUs.',
    interconnect: '2 NVSwitch chips; 14.4 TB/s aggregate NVLink bandwidth.',
    official: 'https://www.nvidia.com/en-us/data-center/dgx-b200/',
    checked,
  },
  {
    name: 'DGX B300',
    maker: 'NVIDIA',
    kind: 'server',
    gpus: '8 x NVIDIA Blackwell Ultra SXM',
    totalMemoryGB: 2100,
    memoryNote: 'NVIDIA lists 2.1 TB total GPU memory (a rounded figure).',
    interconnect: 'NVLink switch system; 14.4 TB/s aggregate NVLink bandwidth.',
    official: 'https://www.nvidia.com/en-us/data-center/dgx-b300/',
    checked,
  },
  {
    name: 'DGX GB200',
    maker: 'NVIDIA',
    kind: 'rack',
    gpus: '72 x NVIDIA Blackwell GPUs with 36 x Grace CPUs',
    totalMemoryGB: 13400,
    memoryNote: 'Up to 13.4 TB HBM3e at 576 TB/s across the 72 GPUs; NVIDIA also lists 30.2 TB of total “fast memory”, which includes CPU memory.',
    interconnect: 'Fifth-generation NVLink, 1.8 TB/s GPU to GPU.',
    official: 'https://www.nvidia.com/en-us/data-center/dgx-gb200/',
    checked,
  },
  {
    name: 'DGX GB300',
    maker: 'NVIDIA',
    kind: 'rack',
    gpus: '72 x NVIDIA Blackwell Ultra GPUs with 36 x Grace CPUs',
    totalMemoryGB: 20000,
    memoryNote: 'NVIDIA lists 20 TB of GPU memory at up to 576 TB/s (rounded), and 37 TB of total “fast memory”, which includes CPU memory.',
    interconnect: 'ConnectX-8 at 800 Gb/s InfiniBand between racks.',
    official: 'https://www.nvidia.com/en-us/data-center/dgx-gb300/',
    checked,
  },
  {
    name: 'GB200 NVL72',
    maker: 'NVIDIA',
    kind: 'rack',
    gpus: '72 x NVIDIA Blackwell GPUs with 36 x Grace CPUs',
    totalMemoryGB: 13400,
    memoryNote: '13.4 TB HBM3E at 576 TB/s across the 72 GPUs. One GB200 superchip (1 Grace CPU, 2 GPUs) has 372 GB HBM3E at 16 TB/s.',
    interconnect: 'One 72-GPU NVLink domain; 130 TB/s NVLink bandwidth, 1.8 TB/s per GPU.',
    official: 'https://www.nvidia.com/en-us/data-center/gb200-nvl72/',
    note: 'The rack design behind DGX GB200 and the cloud offerings built on it.',
    checked,
  },
  {
    name: 'GB300 NVL72',
    maker: 'NVIDIA',
    kind: 'rack',
    gpus: '72 x NVIDIA Blackwell Ultra GPUs with 36 x Grace CPUs',
    totalMemoryGB: 20000,
    memoryNote: '20 TB GPU memory at up to 576 TB/s (rounded), plus 17 TB LPDDR5X CPU memory at 14 TB/s; 37 TB “fast memory” in total.',
    interconnect: 'One 72-GPU NVLink domain; 130 TB/s NVLink bandwidth.',
    official: 'https://www.nvidia.com/en-us/data-center/gb300-nvl72/',
    checked,
  },
  {
    name: 'HGX baseboards',
    maker: 'NVIDIA',
    kind: 'server',
    gpus: '8 x SXM GPUs on one baseboard: Blackwell (HGX B200), Blackwell Ultra (HGX B300) or Rubin (HGX Rubin NVL8)',
    memoryNote: 'Total memory: 1.4 TB for HGX B200 and 2.1 TB for HGX B300. NVIDIA also lists HGX Rubin NVL8 at 2 TB HBM4 and 130 TB/s, and 288 GB HBM4 per Rubin GPU.',
    interconnect: 'HGX B200 and B300: NVLink 5, 1.8 TB/s GPU to GPU and 14.4 TB/s total.',
    official: 'https://www.nvidia.com/en-us/data-center/hgx/',
    note: 'A baseboard that server makers build into their own servers, not a machine you buy as a DGX. NVIDIA’s page says HGX B300 and HGX B200 are shipping.',
    checked,
  },
];
