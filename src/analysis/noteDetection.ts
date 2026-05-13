import { HEX_SYMBOLS, lookupTone, type HexSymbol, type ToneSymbol } from "../protocol";

export interface NoteDetectionConfig {
  toneDurationMs: number;
  gapDurationMs: number;
  windowDurationMs: number;
  silenceThreshold: number;
  lowConfidenceThreshold: number;
}

export interface DetectedNoteRegion {
  symbol: HexSymbol;
  tone: ToneSymbol;
  confidence: number;
  startSeconds: number;
  endSeconds: number;
}

export const DEFAULT_NOTE_DETECTION_CONFIG: NoteDetectionConfig = {
  toneDurationMs: 250,
  gapDurationMs: 50,
  windowDurationMs: 180,
  silenceThreshold: 0.02,
  lowConfidenceThreshold: 0.45,
};

export function detectProtocolNotes(
  buffer: AudioBuffer,
  config: NoteDetectionConfig = DEFAULT_NOTE_DETECTION_CONFIG,
): DetectedNoteRegion[] {
  const channel = mixChannels(buffer);
  const symbolDurationSeconds = (config.toneDurationMs + config.gapDurationMs) / 1_000;
  const toneDurationSeconds = config.toneDurationMs / 1_000;
  const symbolCount = Math.floor(
    (buffer.duration + config.gapDurationMs / 1_000) / symbolDurationSeconds,
  );

  return Array.from({ length: symbolCount }, (_, symbolIndex) => {
    const startSeconds = symbolIndex * symbolDurationSeconds;
    const centerSeconds = startSeconds + toneDurationSeconds / 2;
    const startFrame = Math.round(
      centerSeconds * buffer.sampleRate -
        ((config.windowDurationMs / 1_000) * buffer.sampleRate) / 2,
    );
    const windowFrameCount = Math.round((config.windowDurationMs / 1_000) * buffer.sampleRate);
    const rankedTones = HEX_SYMBOLS.map((symbol) => {
      const tone = lookupTone(symbol);
      return {
        tone,
        magnitude: measureFrequencyMagnitude(
          channel,
          buffer.sampleRate,
          tone.frequencyHz,
          startFrame,
          windowFrameCount,
        ),
      };
    }).sort((a, b) => b.magnitude - a.magnitude);
    const best = rankedTones[0];
    const secondBest = rankedTones[1];
    const confidence =
      best.magnitude <= config.silenceThreshold
        ? 0
        : Math.max(0, Math.min(1, 1 - secondBest.magnitude / best.magnitude));

    return {
      symbol: best.tone.symbol,
      tone: best.tone,
      confidence,
      startSeconds,
      endSeconds: startSeconds + toneDurationSeconds,
    };
  });
}

function measureFrequencyMagnitude(
  channel: Float32Array,
  sampleRate: number,
  frequencyHz: number,
  startFrame: number,
  windowFrameCount: number,
): number {
  let real = 0;
  let imaginary = 0;

  for (let index = 0; index < windowFrameCount; index += 1) {
    const frame = startFrame + index;

    if (frame < 0 || frame >= channel.length) {
      continue;
    }

    const window = hannWindow(index, windowFrameCount);
    const sample = channel[frame] * window;
    const phase = (2 * Math.PI * frequencyHz * index) / sampleRate;
    real += sample * Math.cos(phase);
    imaginary -= sample * Math.sin(phase);
  }

  return Math.sqrt(real * real + imaginary * imaginary) / windowFrameCount;
}

function mixChannels(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }

  const mixed = new Float32Array(buffer.length);

  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex);

    for (let frame = 0; frame < buffer.length; frame += 1) {
      mixed[frame] += channel[frame] / buffer.numberOfChannels;
    }
  }

  return mixed;
}

function hannWindow(index: number, length: number): number {
  return 0.5 * (1 - Math.cos((2 * Math.PI * index) / Math.max(1, length - 1)));
}
