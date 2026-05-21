import type { ToneSymbol } from "../protocol";
import type { CurrentAudioBuffer } from "./currentBuffer";

export interface ToneBufferConfig {
  sampleRate: number;
  toneDurationMs: number;
  gapDurationMs: number;
  fadeDurationMs: number;
  volume: number;
  waveType: ToneWaveType;
}

export type ToneWaveType = "sine" | "square" | "triangle" | "sawtooth";

export interface GeneratedToneBuffer extends CurrentAudioBuffer {
  sourceType: "generated";
  toneCount: number;
}

export const DEFAULT_TONE_BUFFER_CONFIG: ToneBufferConfig = {
  sampleRate: 44_100,
  toneDurationMs: 250,
  gapDurationMs: 50,
  fadeDurationMs: 5,
  volume: 0.8,
  waveType: "sine",
};

export function createToneAudioBuffer(
  audioContext: BaseAudioContext,
  tones: readonly ToneSymbol[],
  config: ToneBufferConfig = DEFAULT_TONE_BUFFER_CONFIG,
): GeneratedToneBuffer | null {
  if (tones.length === 0) {
    return null;
  }

  const toneFrameCount = millisecondsToFrames(config.toneDurationMs, config.sampleRate);
  const gapFrameCount = millisecondsToFrames(config.gapDurationMs, config.sampleRate);
  const fadeFrameCount = millisecondsToFrames(config.fadeDurationMs, config.sampleRate);
  const totalFrameCount = tones.length * toneFrameCount + (tones.length - 1) * gapFrameCount;
  const buffer = audioContext.createBuffer(1, totalFrameCount, config.sampleRate);
  const channel = buffer.getChannelData(0);

  let writeOffset = 0;

  for (const tone of tones) {
    writeTone(channel, tone, writeOffset, toneFrameCount, fadeFrameCount, config);
    writeOffset += toneFrameCount + gapFrameCount;
  }

  return {
    buffer,
    durationSeconds: buffer.duration,
    sampleRate: buffer.sampleRate,
    sourceType: "generated",
    label: `Generated ${formatSeconds(buffer.duration)}`,
    toneCount: tones.length,
  };
}

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(2)} s`;
}

function writeTone(
  channel: Float32Array,
  tone: ToneSymbol,
  startFrame: number,
  toneFrameCount: number,
  fadeFrameCount: number,
  config: ToneBufferConfig,
): void {
  for (let frame = 0; frame < toneFrameCount; frame += 1) {
    const absoluteFrame = startFrame + frame;
    const seconds = frame / config.sampleRate;
    const envelope = getFadeEnvelope(frame, toneFrameCount, fadeFrameCount);
    channel[absoluteFrame] =
      getWaveSample(config.waveType, tone.frequencyHz, seconds) * config.volume * envelope;
  }
}

function getWaveSample(waveType: ToneWaveType, frequencyHz: number, seconds: number): number {
  const cycle = (frequencyHz * seconds) % 1;

  if (waveType === "square") {
    return cycle < 0.5 ? 1 : -1;
  }

  if (waveType === "triangle") {
    return 4 * Math.abs(cycle - 0.5) - 1;
  }

  if (waveType === "sawtooth") {
    return 2 * cycle - 1;
  }

  return Math.sin(2 * Math.PI * cycle);
}

function getFadeEnvelope(
  frame: number,
  toneFrameCount: number,
  fadeFrameCount: number,
): number {
  if (fadeFrameCount <= 0) {
    return 1;
  }

  const fadeIn = Math.min(1, frame / fadeFrameCount);
  const fadeOut = Math.min(1, (toneFrameCount - frame - 1) / fadeFrameCount);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function millisecondsToFrames(milliseconds: number, sampleRate: number): number {
  return Math.round((milliseconds / 1_000) * sampleRate);
}
