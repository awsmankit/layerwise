/**
 * Approximate accelerator specs, for teaching the memory arithmetic behind
 * LLM serving. Figures come from vendor datasheets and cloud documentation
 * (checked October 2026) and are rounded; `approx: true` marks the ones that
 * were not re-verified. Always check the current datasheet before buying.
 */
export type Gpu = {
  id: string;
  name: string;
  vendor: 'NVIDIA' | 'AMD' | 'Google';
  /** Memory per device in GB (decimal). */
  memGB: number;
  /** Memory bandwidth per device in GB/s. */
  bwGBs: number;
  memType: string;
  /** How devices talk to each other inside a server. */
  link: string;
  /** Where you will meet it in the big three clouds. */
  clouds: string;
  approx: boolean;
  note?: string;
};

export const gpus: Gpu[] = [
  { id: 't4', name: 'NVIDIA T4', vendor: 'NVIDIA', memGB: 16, bwGBs: 320, memType: 'GDDR6', link: 'PCIe', clouds: 'AWS G4dn, Azure NCasT4_v3, Google (attached to N1)', approx: false },
  { id: 'l4', name: 'NVIDIA L4', vendor: 'NVIDIA', memGB: 24, bwGBs: 300, memType: 'GDDR6', link: 'PCIe', clouds: 'AWS G6, Google G2', approx: true },
  { id: 'a10g', name: 'NVIDIA A10G', vendor: 'NVIDIA', memGB: 24, bwGBs: 600, memType: 'GDDR6', link: 'PCIe', clouds: 'AWS G5', approx: true },
  { id: 'l40s', name: 'NVIDIA L40S', vendor: 'NVIDIA', memGB: 48, bwGBs: 864, memType: 'GDDR6', link: 'PCIe', clouds: 'AWS G6e', approx: false },
  { id: 'a100-40', name: 'NVIDIA A100 40 GB', vendor: 'NVIDIA', memGB: 40, bwGBs: 1555, memType: 'HBM2e', link: 'NVLink', clouds: 'Azure ND A100 v4', approx: true },
  { id: 'a100-80', name: 'NVIDIA A100 80 GB', vendor: 'NVIDIA', memGB: 80, bwGBs: 2039, memType: 'HBM2e', link: 'NVLink', clouds: 'Azure NC A100 v4, Google A2, AWS P4de', approx: false },
  { id: 'h100', name: 'NVIDIA H100 80 GB', vendor: 'NVIDIA', memGB: 80, bwGBs: 3350, memType: 'HBM3', link: 'NVLink + NVSwitch', clouds: 'AWS P5, Azure ND H100 v5, Google A3', approx: false },
  { id: 'h200', name: 'NVIDIA H200 141 GB', vendor: 'NVIDIA', memGB: 141, bwGBs: 4800, memType: 'HBM3e', link: 'NVLink + NVSwitch', clouds: 'AWS P5e/P5en, Azure ND H200 v5, Google A3 Ultra', approx: false },
  { id: 'b200', name: 'NVIDIA B200', vendor: 'NVIDIA', memGB: 180, bwGBs: 8000, memType: 'HBM3e', link: 'NVLink 5 + NVSwitch', clouds: 'AWS P6-B200, Google A4', approx: false, note: 'Sources quote 180 GB (what an 8-GPU DGX B200 exposes per GPU) and 192 GB (the full-die figure).' },
  { id: 'mi300x', name: 'AMD MI300X', vendor: 'AMD', memGB: 192, bwGBs: 5300, memType: 'HBM3', link: 'Infinity Fabric', clouds: 'Azure ND MI300X v5', approx: true },
  { id: 'ironwood', name: 'Google TPU Ironwood', vendor: 'Google', memGB: 192, bwGBs: 7370, memType: 'HBM3e', link: 'ICI (inter-chip interconnect)', clouds: 'Google Cloud TPU7x', approx: false, note: 'Runs through JAX/XLA and similar stacks rather than CUDA.' },
];

export const gpuById = (id: string) => gpus.find((g) => g.id === id)!;
