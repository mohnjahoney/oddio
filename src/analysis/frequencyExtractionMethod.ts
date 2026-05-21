import {
  DEFAULT_NOTE_DETECTION_CONFIG,
  detectProtocolNotes,
  type DetectedNoteRegion,
  type NoteDetectionConfig,
} from "./noteDetection";
import { detectProtocolNotesWithPitchy } from "./pitchyNoteDetection";
import {
  DEFAULT_THRESHOLD_NOTE_DETECTION_CONFIG,
  detectProtocolNotesWithThreshold,
  type ThresholdNoteDetectionConfig,
} from "./thresholdNoteDetection";
import type { SymbolizationMethod } from "./symbolizationMethod";

export type FrequencyExtractionMethod = "HomeMade" | "Pitchy";

export interface FrequencyExtractionMethodStore {
  get(): FrequencyExtractionMethod;
  set(frequencyMethod: FrequencyExtractionMethod): void;
  subscribe(listener: FrequencyExtractionMethodListener): () => void;
}

export type FrequencyExtractionMethodListener = (
  frequencyMethod: FrequencyExtractionMethod,
) => void;

export const DEFAULT_FREQUENCY_EXTRACTION_METHOD: FrequencyExtractionMethod = "HomeMade";

export const FREQUENCY_EXTRACTION_METHODS = [
  DEFAULT_FREQUENCY_EXTRACTION_METHOD,
  "Pitchy",
] as const satisfies readonly FrequencyExtractionMethod[];

export function createFrequencyExtractionMethodStore(
  initialMethod: FrequencyExtractionMethod = DEFAULT_FREQUENCY_EXTRACTION_METHOD,
): FrequencyExtractionMethodStore {
  let currentFrequencyMethod = initialMethod;
  const listeners = new Set<FrequencyExtractionMethodListener>();

  return {
    get() {
      return currentFrequencyMethod;
    },
    set(frequencyMethod) {
      currentFrequencyMethod = frequencyMethod;
      for (const listener of listeners) {
        listener(currentFrequencyMethod);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(currentFrequencyMethod);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function analyzeProtocolNotes(
  buffer: AudioBuffer,
  frequencyMethod: FrequencyExtractionMethod,
  symbolizationMethod: SymbolizationMethod = "FixedGrid",
  config: NoteDetectionConfig = DEFAULT_NOTE_DETECTION_CONFIG,
  thresholdConfig: ThresholdNoteDetectionConfig = DEFAULT_THRESHOLD_NOTE_DETECTION_CONFIG,
): DetectedNoteRegion[] {
  if (symbolizationMethod === "Threshold") {
    return detectProtocolNotesWithThreshold(buffer, thresholdConfig);
  }

  if (frequencyMethod === "Pitchy") {
    return detectProtocolNotesWithPitchy(buffer, config);
  }

  return detectProtocolNotes(buffer, config);
}
