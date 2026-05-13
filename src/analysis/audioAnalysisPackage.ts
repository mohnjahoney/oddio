import { lookupTone, type HexSymbol } from "../protocol";
import {
  DEFAULT_NOTE_DETECTION_CONFIG,
  detectProtocolNotes,
  type DetectedNoteRegion,
  type NoteDetectionConfig,
} from "./noteDetection";

export type AudioAnalysisPackage = "HomeMade" | "Pitchy";

export interface AudioAnalysisPackageStore {
  get(): AudioAnalysisPackage;
  set(packageName: AudioAnalysisPackage): void;
  subscribe(listener: AudioAnalysisPackageListener): () => void;
}

export type AudioAnalysisPackageListener = (packageName: AudioAnalysisPackage) => void;

export const DEFAULT_AUDIO_ANALYSIS_PACKAGE: AudioAnalysisPackage = "HomeMade";

export const AUDIO_ANALYSIS_PACKAGES = [
  DEFAULT_AUDIO_ANALYSIS_PACKAGE,
  "Pitchy",
] as const satisfies readonly AudioAnalysisPackage[];

export function createAudioAnalysisPackageStore(
  initialPackage: AudioAnalysisPackage = DEFAULT_AUDIO_ANALYSIS_PACKAGE,
): AudioAnalysisPackageStore {
  let currentPackage = initialPackage;
  const listeners = new Set<AudioAnalysisPackageListener>();

  return {
    get() {
      return currentPackage;
    },
    set(packageName) {
      currentPackage = packageName;
      for (const listener of listeners) {
        listener(currentPackage);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(currentPackage);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function analyzeProtocolNotes(
  buffer: AudioBuffer,
  packageName: AudioAnalysisPackage,
  config: NoteDetectionConfig = DEFAULT_NOTE_DETECTION_CONFIG,
): DetectedNoteRegion[] {
  if (packageName === "Pitchy") {
    return detectPitchyPlaceholderNotes(buffer, config);
  }

  return detectProtocolNotes(buffer, config);
}

function detectPitchyPlaceholderNotes(
  buffer: AudioBuffer,
  config: NoteDetectionConfig,
): DetectedNoteRegion[] {
  const defaultSymbol: HexSymbol = "0";
  const defaultTone = lookupTone(defaultSymbol);
  const symbolDurationSeconds = (config.toneDurationMs + config.gapDurationMs) / 1_000;
  const toneDurationSeconds = config.toneDurationMs / 1_000;
  const symbolCount = Math.floor(
    (buffer.duration + config.gapDurationMs / 1_000) / symbolDurationSeconds,
  );

  return Array.from({ length: symbolCount }, (_, symbolIndex) => {
    const startSeconds = symbolIndex * symbolDurationSeconds;

    return {
      symbol: defaultSymbol,
      tone: defaultTone,
      confidence: 0.5,
      startSeconds,
      endSeconds: startSeconds + toneDurationSeconds,
    };
  });
}
