import { PitchDetector } from "pitchy";
import { HEX_SYMBOLS, lookupTone, type ToneSymbol } from "../protocol";
import {
  DEFAULT_NOTE_DETECTION_CONFIG,
  type DetectedNoteRegion,
  type NoteDetectionConfig,
} from "./noteDetection";

export function detectProtocolNotesWithPitchy(
  buffer: AudioBuffer,
  config: NoteDetectionConfig = DEFAULT_NOTE_DETECTION_CONFIG,
): DetectedNoteRegion[] {
  const channel = mixChannels(buffer);
  const symbolDurationSeconds = (config.toneDurationMs + config.gapDurationMs) / 1_000;
  const toneDurationSeconds = config.toneDurationMs / 1_000;
  const windowFrameCount = Math.round((config.windowDurationMs / 1_000) * buffer.sampleRate);
  const detector = PitchDetector.forFloat32Array(windowFrameCount);
  detector.clarityThreshold = 0.7;
  const symbolCount = Math.floor(
    (buffer.duration + config.gapDurationMs / 1_000) / symbolDurationSeconds,
  );

  return Array.from({ length: symbolCount }, (_, symbolIndex) => {
    const startSeconds = symbolIndex * symbolDurationSeconds;
    const centerSeconds = startSeconds + toneDurationSeconds / 2;
    const startFrame = Math.round(centerSeconds * buffer.sampleRate - windowFrameCount / 2);
    const frame = copyWindow(channel, startFrame, windowFrameCount);
    const [pitchHz, clarity] = detector.findPitch(frame, buffer.sampleRate);
    const nearestTone = findNearestProtocolTone(pitchHz);

    return {
      symbol: nearestTone.symbol,
      tone: nearestTone,
      confidence: scorePitchMatch(pitchHz, nearestTone, clarity),
      startSeconds,
      endSeconds: startSeconds + toneDurationSeconds,
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
