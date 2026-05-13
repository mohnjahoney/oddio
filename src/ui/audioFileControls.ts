import { encodeWav, type CurrentAudioStore } from "../audio";
import type { Logger } from "../shared/logger";

interface AudioFileElements {
  audioWorkspace: HTMLElement;
  importButton: HTMLButtonElement;
  fileInput: HTMLInputElement;
  exportButton: HTMLButtonElement;
  debugStatus: HTMLElement;
}

export function bindAudioFileControls(
  root: HTMLElement,
  logger: Logger,
  currentAudioStore: CurrentAudioStore,
): void {
  const elements = getAudioFileElements(root);
  let audioContext: AudioContext | null = null;

  elements.importButton.addEventListener("click", () => {
    elements.fileInput.click();
  });

  elements.fileInput.addEventListener("change", () => {
    const file = elements.fileInput.files?.[0];
    elements.fileInput.value = "";

    if (!file) {
      return;
    }

    void importAudioFile(file);
  });

  elements.audioWorkspace.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.audioWorkspace.classList.add("drag-active");
  });

  elements.audioWorkspace.addEventListener("dragleave", () => {
    elements.audioWorkspace.classList.remove("drag-active");
  });

  elements.audioWorkspace.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.audioWorkspace.classList.remove("drag-active");

    const file = event.dataTransfer?.files[0];

    if (!file) {
      return;
    }

    void importAudioFile(file);
  });

  elements.exportButton.addEventListener("click", () => {
    const currentAudio = currentAudioStore.get();

    if (!currentAudio) {
      return;
    }

    const blob = encodeWav(currentAudio);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = makeExportFileName(currentAudio.label);
    link.click();
    URL.revokeObjectURL(url);
    elements.debugStatus.textContent = `Exported ${currentAudio.label} as WAV.`;
  });

  async function importAudioFile(file: File): Promise<void> {
    if (!file.type.startsWith("audio/")) {
      elements.debugStatus.textContent = `Import failed: ${file.name} is not an audio file.`;
      return;
    }

    try {
      audioContext = audioContext ?? new AudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

      currentAudioStore.set({
        buffer,
        durationSeconds: buffer.duration,
        sampleRate: buffer.sampleRate,
        sourceType: "imported",
        label: `Imported ${file.name}`,
      });
      elements.debugStatus.textContent = `Imported ${file.name} (${formatSeconds(
        buffer.duration,
      )}, ${formatSampleRate(buffer.sampleRate)}).`;
      logger.info("Imported audio file", {
        name: file.name,
        type: file.type,
        durationSeconds: buffer.duration,
        sampleRate: buffer.sampleRate,
        channelCount: buffer.numberOfChannels,
      });
    } catch (error) {
      elements.debugStatus.textContent = `Import failed: could not decode ${file.name}.`;
      logger.error("Failed to import audio file", {
        name: file.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function getAudioFileElements(root: HTMLElement): AudioFileElements {
  return {
    audioWorkspace: getElement(root, "#audio-workspace", HTMLElement),
    importButton: getElement(root, "#import-button", HTMLButtonElement),
    fileInput: getElement(root, "#audio-file-input", HTMLInputElement),
    exportButton: getElement(root, "#export-button", HTMLButtonElement),
    debugStatus: getElement(root, "#debug-status", HTMLElement),
  };
}

function makeExportFileName(label: string): string {
  const safeLabel = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${safeLabel || "oddio-audio"}.wav`;
}

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(2)} s`;
}

function formatSampleRate(sampleRate: number): string {
  return `${(sampleRate / 1_000).toFixed(1)} kHz`;
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
