import {
  DEFAULT_NOTE_DETECTION_CONFIG,
  analyzeProtocolNotes,
  type FrequencyExtractionMethodStore,
  type NoteDetectionConfigStore,
  type SymbolizationMethodStore,
  type DetectedNoteRegion,
  type ThresholdNoteDetectionConfigStore,
} from "../analysis";
import type { CurrentAudioStore } from "../audio";
import { hexStreamToText } from "../protocol";
import type { Logger } from "../shared/logger";

interface DecodeElements {
  decodeButton: HTMLButtonElement;
  decodeTabs: HTMLButtonElement[];
  decodePanels: HTMLElement[];
  decodedTextOutput: HTMLTextAreaElement;
  decodedHexOutput: HTMLTextAreaElement;
  detectedNotesOutput: HTMLElement;
  decodeStatusOutput: HTMLElement;
  debugStatus: HTMLElement;
}

export function bindDecodeControls(
  root: HTMLElement,
  logger: Logger,
  currentAudioStore: CurrentAudioStore,
  frequencyExtractionMethodStore: FrequencyExtractionMethodStore,
  symbolizationMethodStore: SymbolizationMethodStore,
  noteDetectionConfigStore: NoteDetectionConfigStore,
  thresholdConfigStore: ThresholdNoteDetectionConfigStore,
): void {
  const elements = getDecodeElements(root);

  elements.decodeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const nextTab = tab.dataset.decodeTab;

      if (!nextTab) {
        return;
      }

      activateDecodeTab(elements, nextTab);
    });
  });

  currentAudioStore.subscribe(() => {
    clearDecodeOutput(elements);
  });

  elements.decodeButton.addEventListener("click", () => {
    const currentAudio = currentAudioStore.get();

    if (!currentAudio) {
      elements.debugStatus.textContent =
        "Decode requested, but no current audio buffer exists.";
      return;
    }

    try {
      const frequencyExtractionMethod = frequencyExtractionMethodStore.get();
      const symbolizationMethod = symbolizationMethodStore.get();
      const noteDetectionConfig = noteDetectionConfigStore.get();
      const thresholdConfig = thresholdConfigStore.get();
      const regions = analyzeProtocolNotes(
        currentAudio.buffer,
        frequencyExtractionMethod,
        symbolizationMethod,
        noteDetectionConfig,
        thresholdConfig,
      );
      const hexStream = regions.map((region) => region.symbol);
      const hexText = hexStream.join("");
      elements.decodedHexOutput.value = hexText;
      elements.detectedNotesOutput.textContent = formatDetectedRegions(regions);
      const decodedText = hexStreamToText(hexStream);

      elements.decodedTextOutput.value = decodedText;
      elements.decodeStatusOutput.textContent = formatDecodeStatus(
        regions,
        hexStream.length / 2,
      );
      elements.debugStatus.textContent = `Decoded ${currentAudio.label} with ${frequencyExtractionMethod} / ${symbolizationMethod} into ${JSON.stringify(decodedText)}. ${formatConfidenceSummary(regions)}.`;
      activateDecodeTab(elements, "text");
      logger.info("Decoded current audio buffer", {
        frequencyExtractionMethod,
        symbolizationMethod,
        sourceType: currentAudio.sourceType,
        symbolCount: hexStream.length,
        byteCount: hexStream.length / 2,
        textLength: decodedText.length,
      });
    } catch (error) {
      elements.decodedTextOutput.value = "";
      elements.decodeStatusOutput.textContent = "Decode error";
      elements.debugStatus.textContent =
        error instanceof Error ? `Decode failed: ${error.message}` : "Decode failed.";
      logger.warn("Failed to decode current audio buffer", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

function getDecodeElements(root: HTMLElement): DecodeElements {
  return {
    decodeButton: getElement(root, "#decode-button", HTMLButtonElement),
    decodeTabs: Array.from(root.querySelectorAll<HTMLButtonElement>("[data-decode-tab]")),
    decodePanels: Array.from(root.querySelectorAll<HTMLElement>("[data-decode-panel]")),
    decodedTextOutput: getElement(root, "#decoded-output", HTMLTextAreaElement),
    decodedHexOutput: getElement(root, "#decoded-hex-output", HTMLTextAreaElement),
    detectedNotesOutput: getElement(root, "#detected-notes-output", HTMLElement),
    decodeStatusOutput: getElement(root, "#decode-status-output", HTMLElement),
    debugStatus: getElement(root, "#debug-status", HTMLElement),
  };
}

function clearDecodeOutput(elements: DecodeElements): void {
  elements.decodedTextOutput.value = "";
  elements.decodedHexOutput.value = "";
  elements.decodeStatusOutput.textContent = "Idle";
}

function activateDecodeTab(elements: DecodeElements, nextTab: string): void {
  elements.decodeTabs.forEach((tab) => {
    const isActive = tab.dataset.decodeTab === nextTab;
    tab.classList.toggle("active-tab", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  elements.decodePanels.forEach((panel) => {
    panel.hidden = panel.dataset.decodePanel !== nextTab;
  });
}

function formatDetectedRegions(regions: readonly DetectedNoteRegion[]): string {
  return regions.length === 0
    ? "--"
    : regions
        .map(
          (region) =>
            `${region.symbol}:${region.tone.note}(${Math.round(region.confidence * 100)}%)`,
        )
        .join("  ");
}

function formatDecodeStatus(regions: readonly DetectedNoteRegion[], byteCount: number): string {
  const lowConfidenceCount = regions.filter(
    (region) => region.confidence < DEFAULT_NOTE_DETECTION_CONFIG.lowConfidenceThreshold,
  ).length;

  return lowConfidenceCount === 0
    ? `Decoded ${byteCount} byte(s)`
    : `Decoded ${byteCount} byte(s), ${lowConfidenceCount} low confidence`;
}

function formatConfidenceSummary(regions: readonly DetectedNoteRegion[]): string {
  if (regions.length === 0) {
    return "No note regions detected";
  }

  const minConfidence = Math.min(...regions.map((region) => region.confidence));
  const averageConfidence =
    regions.reduce((total, region) => total + region.confidence, 0) / regions.length;

  return `confidence min ${Math.round(minConfidence * 100)}%, avg ${Math.round(averageConfidence * 100)}%`;
}

function getElement<T extends HTMLElement>(
  root: HTMLElement,
  selector: string,
  constructor: new (...args: never[]) => T,
): T {
  const element = root.querySelector(selector);

  if (!(element instanceof constructor)) {
    throw new Error(`Missing expected UI element: ${selector}`);
  }

  return element;
}
