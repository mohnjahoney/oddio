import { PitchDetector } from "pitchy";
import { HEX_SYMBOLS, lookupTone, type HexSymbol, type ToneSymbol } from "../protocol";
import {
  DEFAULT_NOTE_DETECTION_CONFIG,
  type DetectedNoteRegion,
  type NoteDetectionConfig,
} from "./noteDetection";

export interface ThresholdNoteDetectionConfig {
  windowDurationMs: number;
  hopDurationMs: number;
  volumeThreshold: number;
  clarityThreshold: number;
  minimumNoteDurationMs: number;
  maximumGapDurationMs: number;
}

export interface ThresholdNoteDetectionConfigStore {
  get(): ThresholdNoteDetectionConfig;
  set(config: ThresholdNoteDetectionConfig): void;
  subscribe(listener: ThresholdNoteDetectionConfigListener): () => void;
}

export type ThresholdNoteDetectionConfigListener = (
  config: ThresholdNoteDetectionConfig,
) => void;

interface SymbolFrame {
  kind: "symbol";
  symbol: HexSymbol;
  tone: ToneSymbol;
  confidence: number;
  startSeconds: number;
  endSeconds: number;
}

interface DefaultFrame {
  kind: "default";
  startSeconds: number;
  endSeconds: number;
}

type ThresholdFrame = SymbolFrame | DefaultFrame;

interface SymbolRun {
  symbol: HexSymbol;
  tone: ToneSymbol;
  startSeconds: number;
  endSeconds: number;
  confidences: number[];
}

export const DEFAULT_THRESHOLD_NOTE_DETECTION_CONFIG: ThresholdNoteDetectionConfig = {
  windowDurationMs: 100,
  hopDurationMs: 20,
  volumeThreshold: 0.02,
  clarityThreshold: 0.75,
  minimumNoteDurationMs: 80,
  maximumGapDurationMs: 40,
};

export function createThresholdNoteDetectionConfigStore(
  initialConfig: ThresholdNoteDetectionConfig = DEFAULT_THRESHOLD_NOTE_DETECTION_CONFIG,
): ThresholdNoteDetectionConfigStore {
  let currentConfig = { ...initialConfig };
  const listeners = new Set<ThresholdNoteDetectionConfigListener>();

  return {
    get() {
      return { ...currentConfig };
    },
    set(config) {
      currentConfig = { ...config };
      for (const listener of listeners) {
        listener({ ...currentConfig });
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      listener({ ...currentConfig });

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function detectProtocolNotesWithThreshold(
  buffer: AudioBuffer,
  config: ThresholdNoteDetectionConfig = DEFAULT_THRESHOLD_NOTE_DETECTION_CONFIG,
): DetectedNoteRegion[] {
  const channel = mixChannels(buffer);
  const windowFrameCount = Math.round((config.windowDurationMs / 1_000) * buffer.sampleRate);
  const hopFrameCount = Math.max(
    1,
    Math.round((config.hopDurationMs / 1_000) * buffer.sampleRate),
  );
  const detector = PitchDetector.forFloat32Array(windowFrameCount);
  detector.clarityThreshold = Math.max(0.01, Math.min(1, config.clarityThreshold));
  const frames = collectThresholdFrames({
    buffer,
    channel,
    detector,
    windowFrameCount,
    hopFrameCount,
    config,
  });

  return collapseSymbolRuns(
    frames,
    config.minimumNoteDurationMs / 1_000,
    config.maximumGapDurationMs / 1_000,
  );
}

export function getFixedGridThresholdConfig(
  config: NoteDetectionConfig = DEFAULT_NOTE_DETECTION_CONFIG,
): ThresholdNoteDetectionConfig {
  return {
    ...DEFAULT_THRESHOLD_NOTE_DETECTION_CONFIG,
    windowDurationMs: config.windowDurationMs,
  };
}

function collectThresholdFrames(options: {
  buffer: AudioBuffer;
  channel: Float32Array;
  detector: PitchDetector<Float32Array>;
  windowFrameCount: number;
  hopFrameCount: number;
  config: ThresholdNoteDetectionConfig;
}): ThresholdFrame[] {
  const frames: ThresholdFrame[] = [];

  for (
    let startFrame = 0;
    startFrame < options.buffer.length;
    startFrame += options.hopFrameCount
  ) {
    const endFrame = Math.min(options.buffer.length, startFrame + options.windowFrameCount);
    const startSeconds = startFrame / options.buffer.sampleRate;
    const endSeconds = endFrame / options.buffer.sampleRate;

    if (
      getRootMeanSquareAmplitude(options.channel, startFrame, endFrame) <
      options.config.volumeThreshold
    ) {
      frames.push({ kind: "default", startSeconds, endSeconds });
      continue;
    }

    const frame = copyWindow(options.channel, startFrame, options.windowFrameCount);
    const [pitchHz, clarity] = options.detector.findPitch(frame, options.buffer.sampleRate);

    if (clarity < options.config.clarityThreshold || pitchHz <= 0) {
      frames.push({ kind: "default", startSeconds, endSeconds });
      continue;
    }

    const nearestTone = findNearestProtocolTone(pitchHz);
    const pitchMatchScore = scorePitchMatch(pitchHz, nearestTone, clarity);

    if (pitchMatchScore <= 0) {
      frames.push({ kind: "default", startSeconds, endSeconds });
      continue;
    }

    frames.push({
      kind: "symbol",
      symbol: nearestTone.symbol,
      tone: nearestTone,
      confidence: clarity,
      startSeconds,
      endSeconds,
    });
  }

  return frames;
}

function collapseSymbolRuns(
  frames: readonly ThresholdFrame[],
  minimumNoteDurationSeconds: number,
  maximumGapDurationSeconds: number,
): DetectedNoteRegion[] {
  const regions: DetectedNoteRegion[] = [];
  let activeRun: SymbolRun | null = null;
  let activeGapStartSeconds: number | null = null;

  for (const frame of frames) {
    if (frame.kind === "default") {
      if (activeRun === null) {
        continue;
      }

      activeGapStartSeconds ??= frame.startSeconds;
      if (frame.endSeconds - activeGapStartSeconds >= maximumGapDurationSeconds) {
        commitRun(regions, activeRun, minimumNoteDurationSeconds);
        activeRun = null;
        activeGapStartSeconds = null;
      }
      continue;
    }

    if (activeRun !== null && activeRun.symbol === frame.symbol) {
      activeRun.endSeconds = frame.endSeconds;
      activeRun.confidences.push(frame.confidence);
      activeGapStartSeconds = null;
      continue;
    }

    commitRun(regions, activeRun, minimumNoteDurationSeconds);
    activeGapStartSeconds = null;
    activeRun = {
      symbol: frame.symbol,
      tone: frame.tone,
      startSeconds: frame.startSeconds,
      endSeconds: frame.endSeconds,
      confidences: [frame.confidence],
    };
  }

  commitRun(regions, activeRun, minimumNoteDurationSeconds);
  return regions;
}

function commitRun(
  regions: DetectedNoteRegion[],
  run: SymbolRun | null,
  minimumNoteDurationSeconds: number,
): void {
  if (!run || run.endSeconds - run.startSeconds < minimumNoteDurationSeconds) {
    return;
  }

  regions.push({
    symbol: run.symbol,
    tone: run.tone,
    confidence:
      run.confidences.reduce((total, confidence) => total + confidence, 0) /
      run.confidences.length,
    startSeconds: run.startSeconds,
    endSeconds: run.endSeconds,
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

function getRootMeanSquareAmplitude(
  channel: Float32Array,
  startFrame: number,
  endFrame: number,
): number {
  let squareTotal = 0;
  const frameCount = Math.max(1, endFrame - startFrame);

  for (let frame = startFrame; frame < endFrame; frame += 1) {
    squareTotal += channel[frame] * channel[frame];
  }

  return Math.sqrt(squareTotal / frameCount);
}

function findNearestProtocolTone(frequencyHz: number): ToneSymbol {
  if (frequencyHz <= 0 || !Number.isFinite(frequencyHz)) {
    return lookupTone("0");
  }

  return HEX_SYMBOLS.map((symbol) => lookupTone(symbol)).reduce((nearest, tone) => {
    return getPitchDistance(frequencyHz, tone.frequencyHz) <
      getPitchDistance(frequencyHz, nearest.frequencyHz)
      ? tone
      : nearest;
  });
}

function scorePitchMatch(
  frequencyHz: number,
  nearestTone: ToneSymbol,
  clarity: number,
): number {
  if (frequencyHz <= 0 || !Number.isFinite(frequencyHz)) {
    return 0;
  }

  const semitoneDistance = Math.abs(12 * Math.log2(frequencyHz / nearestTone.frequencyHz));
  const distanceScore = Math.max(0, 1 - semitoneDistance);

  return Math.max(0, Math.min(1, clarity * distanceScore));
}

function getPitchDistance(leftFrequencyHz: number, rightFrequencyHz: number): number {
  return Math.abs(Math.log2(leftFrequencyHz / rightFrequencyHz));
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
