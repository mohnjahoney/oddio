import {
  DEFAULT_NOTE_DETECTION_CONFIG,
  detectProtocolNotes,
  type DetectedNoteRegion,
  type NoteDetectionConfig,
} from "./noteDetection";
import { detectProtocolNotesWithPitchy } from "./pitchyNoteDetection";

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
    return detectProtocolNotesWithPitchy(buffer, config);
  }

  return detectProtocolNotes(buffer, config);
}
