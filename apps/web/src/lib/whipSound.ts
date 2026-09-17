import whipCrackUrl from "../assets/whip-crack.mp3?url";

/**
 * The whip crack: a CC0 sample (see third-party-licenses.config.json), decoded
 * once and played through a gain and a compressor so it can hit harder than
 * an <audio> element allows without clipping. One shared context, resumed
 * from the gesture that plays it; overlapping cracks just stack.
 */
let audioContext: AudioContext | undefined;
let master: DynamicsCompressorNode | undefined;
let sample: Promise<AudioBuffer> | undefined;

/** Overall level. Above 1 is fine: the compressor keeps it from clipping. */
const WHIP_VOLUME = 1.8;

function output(context: AudioContext): DynamicsCompressorNode {
  if (master) return master;
  master = context.createDynamicsCompressor();
  master.threshold.value = -10;
  master.knee.value = 6;
  master.ratio.value = 12;
  master.attack.value = 0.001;
  master.release.value = 0.12;
  master.connect(context.destination);
  return master;
}

function loadSample(context: AudioContext): Promise<AudioBuffer> {
  sample ??= fetch(whipCrackUrl)
    .then((response) => response.arrayBuffer())
    .then((data) => context.decodeAudioData(data))
    .catch((error: unknown) => {
      sample = undefined;
      throw error;
    });
  return sample;
}

/**
 * Call from a real user gesture (the pointerdown that picks the whip up):
 * browsers only let the context resume inside one, and the sample is decoded
 * by the time the first crack lands.
 */
export function preloadWhipCrack(): AudioContext | undefined {
  if (typeof AudioContext === "undefined") return undefined;
  audioContext ??= new AudioContext();
  void audioContext.resume().catch(() => undefined);
  void loadSample(audioContext).catch(() => undefined);
  return audioContext;
}

export function playWhipCrack(): void {
  const context = preloadWhipCrack();
  if (!context) return;
  void loadSample(context)
    .then((buffer) => {
      const source = context.createBufferSource();
      source.buffer = buffer;
      const gain = context.createGain();
      gain.gain.value = WHIP_VOLUME;
      source.connect(gain).connect(output(context));
      source.start();
    })
    .catch(() => undefined);
}
