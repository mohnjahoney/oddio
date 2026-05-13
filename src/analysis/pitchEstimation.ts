import { PitchDetector } from "pitchy";
import { HEX_SYMBOLS, lookupTone } from "../protocol";
import type { AudioAnalysisPackage } from "./audioAnalysisPackage";
import type { SpectralDensityConfig } from "./spectralDensity";

export interface PitchEstimate {
  timeSeconds: number;
  frequencyHz: number | null;
  confidence: number;
}

export function estimatePitchSeries(
  buffer: AudioBuffer,
  packageName: AudioAnalysisPackage,
  config: SpectralDensityConfig,
): PitchEstimate[] {
  if (packageName === "Pitchy") {
    return estimatePitchSeriesWithPitchy(buffer, config);
  }

  return estimatePitchSeriesWithHomeMade(buffer, config);
}

function estimatePitchSeriesWithPitchy(
  buffer: AudioBuffer,
  config: SpectralDensityConfig,
): PitchEstimate[] {
  const channel = mixChannels(buffer);
  const windowFrameCount = Math.max(
    64,
    Math.round((config.windowDurationMs / 1_000) * buffer.sampleRate),
  );
  const detector = PitchDetector.forFloat32Array(windowFrameCount);
  detector.clarityThreshold = 0.7;

  return collectTimeSliceCenters(buffer, config).map(({ centerFrame, timeSeconds }) => {
    const startFrame = Math.round(centerFrame - windowFrameCount / 2);
    const frame = copyWindow(channel, startFrame, windowFrameCount);
    const [frequencyHz, clarity] = detector.findPitch(frame, buffer.sampleRate);

    return {
      timeSeconds,
      frequencyHz: frequencyHz > 0 && Number.isFinite(frequencyHz) ? frequencyHz : null,
      confidence: clarity,
    };
  });
}

function estimatePitchSeriesWithHomeMade(
  buffer: AudioBuffer,
  config: SpectralDensityConfig,
): PitchEstimate[] {
  const channel = mixChannels(buffer);
  const windowFrameCount = Math.max(
    64,
    Math.round((config.windowDurationMs / 1_000) * buffer.sampleRate),
  );

  return collectTimeSliceCenters(buffer, config).map(({ centerFrame, timeSeconds }) => {
    const startFrame = Math.round(centerFrame - windowFrameCount / 2);
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
    }).sort((left, right) => right.magnitude - left.magnitude);
    const best = rankedTones[0];
    const secondBest = rankedTones[1];
    const confidence =
      best.magnitude <= 0
        ? 0
        : Math.max(0, Math.min(1, 1 - secondBest.magnitude / best.magnitude));

    return {
      timeSeconds,
      frequencyHz: best.magnitude > 0 ? best.tone.frequencyHz : null,
      confidence,
    };
  });
}

function collectTimeSliceCenters(
  buffer: AudioBuffer,
  config: SpectralDensityConfig,
): { centerFrame: number; timeSeconds: number }[] {
  const timeSliceCount = Math.max(1, config.timeSliceCount);
  const finalFrame = Math.max(0, buffer.length - 1);

  return Array.from({ length: timeSliceCount }, (_, timeIndex) => {
    const centerFrame =
      timeSliceCount === 1 ? finalFrame / 2 : (timeIndex / (timeSliceCount - 1)) * finalFrame;

    return {
      centerFrame,
      timeSeconds: centerFrame / buffer.sampleRate,
    };
  });
}

function copyWindow(
  channel: Float32Array,
  startFrame: number,
  windowFrameCount: number,
): Float32Array {
  const frame = new Float32Array(windowFrameCount);

  for (let index = 0; index < windowFrameCount; index += 1) {
    const sourceFrame = startFrame + index;

    if (sourceFrame >= 0 && sourceFrame < channel.length) {
      frame[index] = channel[sourceFrame];
    }
  }

  return frame;
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
