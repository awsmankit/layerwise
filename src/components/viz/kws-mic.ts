import { audioContextClass, canUseMicrophone } from '../../lib/web-audio';

/*
 * Record a few seconds from the microphone into memory, only when the learner taps. The audio is kept as an array
 * in this page: it is not stored, not played back and not sent anywhere. The microphone and the audio context are
 * released as soon as the recording ends or is cancelled.
 */

export type Recording = { data: Float32Array; rate: number };

const WORKLET = `
class EbRecorder extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('eb-recorder', EbRecorder);
`;

export const micSupported = (): boolean => !!audioContextClass() && canUseMicrophone();

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new DOMException('cancelled', 'AbortError'));
      },
      { once: true },
    );
  });
}

export async function recordMic(seconds: number, signal?: AbortSignal, onStart?: () => void): Promise<Recording> {
  const Ctx = audioContextClass();
  if (!Ctx || !canUseMicrophone()) throw new DOMException('no microphone available', 'NotFoundError');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  let ctx: AudioContext | null = null;
  const nodes: AudioNode[] = [];
  const chunks: Float32Array[] = [];
  try {
    if (signal?.aborted) throw new DOMException('cancelled', 'AbortError');
    ctx = new Ctx();
    if (ctx.state === 'suspended') await ctx.resume();
    const src = ctx.createMediaStreamSource(stream);
    nodes.push(src);
    if (ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      try {
        await ctx.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      const node = new AudioWorkletNode(ctx, 'eb-recorder', { numberOfOutputs: 1, outputChannelCount: [1] });
      node.port.onmessage = (e: MessageEvent<Float32Array>) => chunks.push(e.data);
      src.connect(node);
      node.connect(ctx.destination); // the processor writes no output, so nothing is heard
      nodes.push(node);
    } else {
      const node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      src.connect(node);
      node.connect(ctx.destination); // the output buffer is left silent
      nodes.push(node);
    }
    onStart?.();
    await wait(seconds * 1000, signal);
    const rate = ctx.sampleRate;
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const data = new Float32Array(total);
    let at = 0;
    for (const c of chunks) {
      data.set(c, at);
      at += c.length;
    }
    return { data, rate };
  } finally {
    for (const n of nodes) {
      try {
        n.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    stream.getTracks().forEach((t) => t.stop());
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
  }
}
