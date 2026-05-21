import {
  DEFAULT_TONE_BUFFER_CONFIG,
  createToneAudioBuffer,
  type CurrentAudioStore,
  type GeneratedToneBuffer,
  type ToneBufferConfig,
  type ToneWaveType,
} from "../audio";
import { encodeTextMessage, toneToLabel, type EncodedMessage } from "../protocol";
import type { Logger } from "../shared/logger";

interface EncoderElements {
  input: HTMLTextAreaElement;
  button: HTMLButtonElement;
  sourceTabs: HTMLButtonElement[];
  sourcePanels: HTMLElement[];
  hexOutput: HTMLTextAreaElement;
  tonesOutput: HTMLTextAreaElement;
  bytesOutput: HTMLElement;
  durationInput: HTMLInputElement;
  gapInput: HTMLInputElement;
  volumeInput: HTMLInputElement;
  waveSelect: HTMLSelectElement;
  frameSelect: HTMLSelectElement;
  signalSummary: HTMLElement;
  debugStatus: HTMLElement;
}

export function bindEncoderControls(
  root: HTMLElement,
  logger: Logger,
  currentAudioStore: CurrentAudioStore,
): void {
  const elements = getEncoderElements(root);
  let audioContext: AudioContext | null = null;

  elements.sourceTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const nextTab = tab.dataset.sourceTab;

      if (!nextTab) {
        return;
      }

      activateSourceTab(elements, nextTab);
    });
  });

  elements.button.addEventListener("click", () => {
    const message = elements.input.value;
    const encodedMessage = encodeTextMessage(message);
    const toneConfig = readToneBufferConfig(elements);
    audioContext = audioContext ?? new AudioContext();
    const generatedAudio = createToneAudioBuffer(
      audioContext,
      encodedMessage.tones,
      toneConfig,
    );

    currentAudioStore.set(generatedAudio);
    renderEncodedMessage(elements, encodedMessage, generatedAudio);
    logger.info("Encoded text message", {
      byteCount: encodedMessage.bytes.length,
      symbolCount: encodedMessage.hexStream.length,
      toneCount: encodedMessage.tones.length,
      durationSeconds: generatedAudio?.durationSeconds ?? 0,
      sampleRate: generatedAudio?.sampleRate ?? audioContext.sampleRate,
      toneDurationMs: toneConfig.toneDurationMs,
      gapDurationMs: toneConfig.gapDurationMs,
      volume: toneConfig.volume,
      waveType: toneConfig.waveType,
      frame: elements.frameSelect.value,
    });
  });
}

function getEncoderElements(root: HTMLElement): EncoderElements {
  return {
    input: getElement(root, "#message-input", HTMLTextAreaElement),
    button: getElement(root, "#encode-button", HTMLButtonElement),
    sourceTabs: Array.from(root.querySelectorAll<HTMLButtonElement>("[data-source-tab]")),
    sourcePanels: Array.from(root.querySelectorAll<HTMLElement>("[data-source-panel]")),
    hexOutput: getElement(root, "#generated-hex", HTMLTextAreaElement),
    tonesOutput: getElement(root, "#generated-tones", HTMLTextAreaElement),
    bytesOutput: getElement(root, "#generated-bytes", HTMLElement),
    durationInput: getElement(root, "#encode-duration-input", HTMLInputElement),
    gapInput: getElement(root, "#encode-gap-input", HTMLInputElement),
    volumeInput: getElement(root, "#encode-volume-input", HTMLInputElement),
    waveSelect: getElement(root, "#encode-wave-select", HTMLSelectElement),
    frameSelect: getElement(root, "#encode-frame-select", HTMLSelectElement),
    signalSummary: getElement(root, "#generated-signal-summary", HTMLElement),
    debugStatus: getElement(root, "#debug-status", HTMLElement),
  };
}

function readToneBufferConfig(elements: EncoderElements): ToneBufferConfig {
  const waveType = readWaveType(elements.waveSelect.value);
  elements.waveSelect.value = waveType;
  elements.frameSelect.value = "none";

  return {
    ...DEFAULT_TONE_BUFFER_CONFIG,
    toneDurationMs: readNumberInput(elements.durationInput),
    gapDurationMs: readNumberInput(elements.gapInput),
    volume: readNumberInput(elements.volumeInput),
    waveType,
  };
}

function readWaveType(value: string): ToneWaveType {
  if (value === "square" || value === "triangle" || value === "sawtooth") {
    return value;
  }

  return "sine";
}

function readNumberInput(input: HTMLInputElement): number {
  const min = Number(input.min);
  const max = Number(input.max);
  const step = Number(input.step) || 1;
  const rawValue = Number(input.value);
  const value = Number.isFinite(rawValue) ? rawValue : min;
  const clamped = Math.max(min, Math.min(max, value));
  const normalized = Math.round(clamped / step) * step;
  input.value = String(normalized);
  return normalized;
}

function renderEncodedMessage(
  elements: EncoderElements,
  encodedMessage: EncodedMessage,
  generatedAudio: GeneratedToneBuffer | null,
): void {
  elements.hexOutput.value = encodedMessage.hexStream.join("") || "";
  elements.tonesOutput.value = encodedMessage.tones.map(toneToLabel).join("  ");
  elements.bytesOutput.textContent = encodedMessage.bytes.length.toString();
  renderGeneratedSignalSummary(elements, generatedAudio);
  elements.debugStatus.textContent =
    encodedMessage.bytes.length === 0
      ? "No source text to encode yet."
      : `Encoded ${encodedMessage.bytes.length} UTF-8 byte(s) into ${encodedMessage.tones.length} tone(s) and generated an audio buffer.`;
}

function activateSourceTab(elements: EncoderElements, nextTab: string): void {
  elements.sourceTabs.forEach((tab) => {
    const isActive = tab.dataset.sourceTab === nextTab;
    tab.classList.toggle("active-tab", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  elements.sourcePanels.forEach((panel) => {
    panel.hidden = panel.dataset.sourcePanel !== nextTab;
  });
}

function renderGeneratedSignalSummary(
  elements: EncoderElements,
  generatedAudio: GeneratedToneBuffer | null,
): void {
  if (!generatedAudio) {
    elements.signalSummary.textContent = "No generated audio";
    return;
  }

  elements.signalSummary.textContent = `${generatedAudio.toneCount} tones / ${formatSeconds(
    generatedAudio.durationSeconds,
  )}`;
}

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(2)} s`;
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
