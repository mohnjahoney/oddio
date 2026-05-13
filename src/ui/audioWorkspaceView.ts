import type { CurrentAudioBuffer, CurrentAudioStore } from "../audio";
import {
  AUDIO_ANALYSIS_PACKAGES,
  DEFAULT_SPECTRAL_DENSITY_CONFIG,
  analyzeProtocolNotes,
  computeSpectralDensity,
  DEFAULT_NOTE_DETECTION_CONFIG,
  type AudioAnalysisPackage,
  type AudioAnalysisPackageStore,
  type DetectedNoteRegion,
  type SpectralDensity,
  type SpectralDensityConfig,
} from "../analysis";
import { HEX_SYMBOLS, lookupTone } from "../protocol";

interface AudioWorkspaceElements {
  bufferState: HTMLElement;
  bufferStateLight: HTMLElement;
  bufferStateLabel: HTMLElement;
  emptyAudioState: HTMLElement;
  spectrogramCanvas: HTMLCanvasElement;
  pitchGuideLayer: HTMLElement;
  noteRegionLayer: HTMLElement;
  frequencyBinSlider: HTMLInputElement;
  frequencyBinInput: HTMLInputElement;
  timeSliceSlider: HTMLInputElement;
  timeSliceInput: HTMLInputElement;
  analysisPackageSelect: HTMLSelectElement;
  waveformDisplay: HTMLElement;
  decodeButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  detectedNotesOutput: HTMLElement;
}

export function bindAudioWorkspaceView(
  root: HTMLElement,
  currentAudioStore: CurrentAudioStore,
  audioAnalysisPackageStore: AudioAnalysisPackageStore,
): void {
  const elements = getAudioWorkspaceElements(root);
  let currentAudio: CurrentAudioBuffer | null = null;
  let audioAnalysisPackage = audioAnalysisPackageStore.get();
  const spectralConfig = { ...DEFAULT_SPECTRAL_DENSITY_CONFIG };
  renderPitchGuides(elements.pitchGuideLayer, spectralConfig);
  elements.analysisPackageSelect.value = audioAnalysisPackage;

  bindAnalysisControlPair({
    slider: elements.frequencyBinSlider,
    input: elements.frequencyBinInput,
    initialValue: spectralConfig.frequencyBinCount,
    onCommit(value) {
      spectralConfig.frequencyBinCount = value;
      renderCurrentSpectrogram(elements, currentAudio, spectralConfig);
    },
  });

  bindAnalysisControlPair({
    slider: elements.timeSliceSlider,
    input: elements.timeSliceInput,
    initialValue: spectralConfig.timeSliceCount,
    onCommit(value) {
      spectralConfig.timeSliceCount = value;
      renderCurrentSpectrogram(elements, currentAudio, spectralConfig);
    },
  });

  elements.analysisPackageSelect.addEventListener("change", () => {
    const nextPackage = readAudioAnalysisPackage(elements.analysisPackageSelect.value);
    elements.analysisPackageSelect.value = nextPackage;
    audioAnalysisPackageStore.set(nextPackage);
  });

  currentAudioStore.subscribe((audio) => {
    currentAudio = audio;
    renderCurrentAudioState(elements, audio, spectralConfig, audioAnalysisPackage);
  });

  audioAnalysisPackageStore.subscribe((packageName) => {
    audioAnalysisPackage = packageName;
    elements.analysisPackageSelect.value = packageName;
    renderCurrentAudioState(elements, currentAudio, spectralConfig, audioAnalysisPackage);
  });
}

function getAudioWorkspaceElements(root: HTMLElement): AudioWorkspaceElements {
  return {
    bufferState: getElement(root, "#buffer-state", HTMLElement),
    bufferStateLight: getElement(root, "#buffer-state-light", HTMLElement),
    bufferStateLabel: getElement(root, "#buffer-state-label", HTMLElement),
    emptyAudioState: getElement(root, "#empty-audio-state", HTMLElement),
    spectrogramCanvas: getElement(root, "#spectrogram-canvas", HTMLCanvasElement),
    pitchGuideLayer: getElement(root, "#pitch-guide-layer", HTMLElement),
    noteRegionLayer: getElement(root, "#note-region-layer", HTMLElement),
    frequencyBinSlider: getElement(root, "#frequency-bin-slider", HTMLInputElement),
    frequencyBinInput: getElement(root, "#frequency-bin-input", HTMLInputElement),
    timeSliceSlider: getElement(root, "#time-slice-slider", HTMLInputElement),
    timeSliceInput: getElement(root, "#time-slice-input", HTMLInputElement),
    analysisPackageSelect: getElement(root, "#analysis-package-select", HTMLSelectElement),
    waveformDisplay: getElement(root, "#waveform-display", HTMLElement),
    decodeButton: getElement(root, "#decode-button", HTMLButtonElement),
    exportButton: getElement(root, "#export-button", HTMLButtonElement),
    detectedNotesOutput: getElement(root, "#detected-notes-output", HTMLElement),
  };
}

function renderCurrentAudioState(
  elements: AudioWorkspaceElements,
  currentAudio: CurrentAudioBuffer | null,
  spectralConfig: SpectralDensityConfig,
  audioAnalysisPackage: AudioAnalysisPackage,
): void {
  if (!currentAudio) {
    elements.bufferState.classList.remove("active-buffer-state");
    elements.bufferStateLight.classList.add("inactive-light");
    elements.bufferStateLabel.textContent = "No audio loaded";
    elements.emptyAudioState.hidden = false;
    elements.waveformDisplay.setAttribute("aria-label", "Waveform empty state");
    elements.decodeButton.disabled = true;
    elements.exportButton.disabled = true;
    elements.noteRegionLayer.innerHTML = "";
    elements.detectedNotesOutput.textContent = "--";
    clearSpectrogram(elements.spectrogramCanvas);
    renderEmptyWaveformPreview(elements.waveformDisplay);
    return;
  }

  elements.bufferState.classList.add("active-buffer-state");
  elements.bufferStateLight.classList.remove("inactive-light");
  elements.bufferStateLabel.textContent = currentAudio.label;
  elements.emptyAudioState.hidden = true;
  elements.waveformDisplay.setAttribute(
    "aria-label",
    `${currentAudio.sourceType} waveform preview`,
  );
  elements.decodeButton.disabled = false;
  elements.exportButton.disabled = false;
  renderCurrentSpectrogram(elements, currentAudio, spectralConfig);
  renderDetectedNotes(elements, currentAudio, spectralConfig, audioAnalysisPackage);
  renderWaveformPreview(elements.waveformDisplay, currentAudio.buffer);
}

function renderCurrentSpectrogram(
  elements: AudioWorkspaceElements,
  currentAudio: CurrentAudioBuffer | null,
  spectralConfig: SpectralDensityConfig,
): void {
  if (!currentAudio) {
    clearSpectrogram(elements.spectrogramCanvas);
    return;
  }

  renderSpectrogram(
    elements.spectrogramCanvas,
    computeSpectralDensity(currentAudio.buffer, spectralConfig),
  );
}

function renderPitchGuides(
  container: HTMLElement,
  spectralConfig: SpectralDensityConfig,
): void {
  container.innerHTML = HEX_SYMBOLS.map((symbol) => {
    const tone = lookupTone(symbol);
    const y = frequencyToTopPercent(tone.frequencyHz, spectralConfig);
    return `<div class="protocol-pitch-guide" style="top: ${y}%">
      <span>${symbol}:${tone.note}</span>
    </div>`;
  }).join("");
}

function renderDetectedNotes(
  elements: AudioWorkspaceElements,
  currentAudio: CurrentAudioBuffer,
  spectralConfig: SpectralDensityConfig,
  audioAnalysisPackage: AudioAnalysisPackage,
): void {
  const regions = analyzeProtocolNotes(currentAudio.buffer, audioAnalysisPackage);
  elements.noteRegionLayer.innerHTML = regions
    .map((region) =>
      renderDetectedNoteRegion(region, currentAudio.durationSeconds, spectralConfig),
    )
    .join("");
  elements.detectedNotesOutput.textContent =
    regions.length === 0
      ? "--"
      : regions.map((region) => `${region.symbol}:${region.tone.note}`).join("  ");
}

function readAudioAnalysisPackage(value: string): AudioAnalysisPackage {
  return AUDIO_ANALYSIS_PACKAGES.find((packageName) => packageName === value) ?? "HomeMade";
}

function renderDetectedNoteRegion(
  region: DetectedNoteRegion,
  durationSeconds: number,
  spectralConfig: SpectralDensityConfig,
): string {
  const left = (region.startSeconds / durationSeconds) * 100;
  const width = ((region.endSeconds - region.startSeconds) / durationSeconds) * 100;
  const top = frequencyToTopPercent(region.tone.frequencyHz, spectralConfig);

  return `<div
    class="detected-note-region ${region.confidence < DEFAULT_NOTE_DETECTION_CONFIG.lowConfidenceThreshold ? "low-confidence-region" : ""}"
    style="left: ${left}%; width: ${width}%; top: ${top}%"
    title="${region.symbol}:${region.tone.note} confidence ${Math.round(region.confidence * 100)}%"
  >
    <span>${region.symbol}:${region.tone.note}</span>
    <small>${Math.round(region.confidence * 100)}%</small>
  </div>`;
}

function frequencyToTopPercent(
  frequencyHz: number,
  spectralConfig: SpectralDensityConfig,
): number {
  const ratio =
    (frequencyHz - spectralConfig.minFrequencyHz) /
    (spectralConfig.maxFrequencyHz - spectralConfig.minFrequencyHz);
  return Math.max(0, Math.min(100, 100 - ratio * 100));
}

function bindAnalysisControlPair(options: {
  slider: HTMLInputElement;
  input: HTMLInputElement;
  initialValue: number;
  onCommit(value: number): void;
}): void {
  setAnalysisControlValue(options.slider, options.input, options.initialValue);

  options.slider.addEventListener("input", () => {
    options.input.value = options.slider.value;
  });

  options.slider.addEventListener("pointerup", () => {
    options.onCommit(readAnalysisControlValue(options.slider));
  });

  options.slider.addEventListener("change", () => {
    options.onCommit(readAnalysisControlValue(options.slider));
  });

  options.input.addEventListener("input", () => {
    options.slider.value = String(readAnalysisControlValue(options.input));
  });

  options.input.addEventListener("change", () => {
    const value = readAnalysisControlValue(options.input);
    setAnalysisControlValue(options.slider, options.input, value);
    options.onCommit(value);
  });

  options.input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    const value = readAnalysisControlValue(options.input);
    setAnalysisControlValue(options.slider, options.input, value);
    options.onCommit(value);
  });
}

function setAnalysisControlValue(
  slider: HTMLInputElement,
  input: HTMLInputElement,
  value: number,
): void {
  const normalizedValue = normalizeAnalysisControlValue(slider, value);
  slider.value = String(normalizedValue);
  input.value = String(normalizedValue);
}

function readAnalysisControlValue(control: HTMLInputElement): number {
  return normalizeAnalysisControlValue(control, Number(control.value));
}

function normalizeAnalysisControlValue(control: HTMLInputElement, value: number): number {
  const min = Number(control.min);
  const max = Number(control.max);
  const step = Number(control.step) || 1;
  const clamped = Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
  return Math.round(clamped / step) * step;
}

function clearSpectrogram(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const { width, height } = getCanvasDisplaySize(canvas);
  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
}

function renderSpectrogram(canvas: HTMLCanvasElement, spectralDensity: SpectralDensity): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const { width, height } = getCanvasDisplaySize(canvas);
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#070b10";
  context.fillRect(0, 0, width, height);

  const cellWidth = width / spectralDensity.timeSliceCount;
  const cellHeight = height / spectralDensity.frequencyBinCount;

  spectralDensity.magnitudes.forEach((timeSlice, timeIndex) => {
    timeSlice.forEach((magnitude, frequencyIndex) => {
      const x = timeIndex * cellWidth;
      const y = height - (frequencyIndex + 1) * cellHeight;
      context.fillStyle = spectralMagnitudeToColor(magnitude);
      context.fillRect(x, y, Math.ceil(cellWidth), Math.ceil(cellHeight));
    });
  });
}

function getCanvasDisplaySize(canvas: HTMLCanvasElement): { width: number; height: number } {
  const rect = canvas.getBoundingClientRect();

  return {
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
}

function spectralMagnitudeToColor(magnitude: number): string {
  const clamped = Math.max(0, Math.min(1, magnitude));
  const hue = 145 - clamped * 48;
  const saturation = 34 + clamped * 56;
  const lightness = 8 + clamped * 56;
  const alpha = 0.3 + clamped * 0.7;
  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
}

function renderWaveformPreview(container: HTMLElement, buffer: AudioBuffer): void {
  const mixedChannel = mixChannels(buffer);
  const barCount = 96;
  const framesPerBar = Math.max(1, Math.floor(mixedChannel.length / barCount));

  container.innerHTML = Array.from({ length: barCount }, (_, index) => {
    const start = index * framesPerBar;
    const end = Math.min(mixedChannel.length, start + framesPerBar);
    const energy = getAverageAbsoluteAmplitude(mixedChannel, start, end);
    const height = Math.max(2, Math.round(energy * 132));
    return `<span style="height: ${height}px"></span>`;
  }).join("");
}

function renderEmptyWaveformPreview(container: HTMLElement): void {
  container.innerHTML = Array.from({ length: 8 }, () => "<span></span>").join("");
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

function getAverageAbsoluteAmplitude(
  channel: Float32Array,
  start: number,
  end: number,
): number {
  let total = 0;
  const frameCount = Math.max(1, end - start);

  for (let frame = start; frame < end; frame += 1) {
    total += Math.abs(channel[frame]);
  }

  return total / frameCount;
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
