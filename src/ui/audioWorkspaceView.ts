import type { CurrentAudioBuffer, CurrentAudioStore } from "../audio";
import {
  FREQUENCY_EXTRACTION_METHODS,
  SYMBOLIZATION_METHODS,
  DEFAULT_SPECTRAL_DENSITY_CONFIG,
  analyzeProtocolNotes,
  computeSpectralDensity,
  estimatePitchSeries,
  DEFAULT_NOTE_DETECTION_CONFIG,
  type FrequencyExtractionMethod,
  type FrequencyExtractionMethodStore,
  type NoteDetectionConfig,
  type NoteDetectionConfigStore,
  type SymbolizationMethod,
  type SymbolizationMethodStore,
  type DetectedNoteRegion,
  type SpectralDensity,
  type SpectralDensityConfig,
  type ThresholdNoteDetectionConfig,
  type ThresholdNoteDetectionConfigStore,
} from "../analysis";
import { HEX_SYMBOLS, lookupTone } from "../protocol";

interface AudioWorkspaceElements {
  bufferState: HTMLElement;
  bufferStateLight: HTMLElement;
  bufferStateLabel: HTMLElement;
  emptyAudioState: HTMLElement;
  spectrogramCanvas: HTMLCanvasElement;
  pitchEstimateCanvas: HTMLCanvasElement;
  pitchGuideLayer: HTMLElement;
  noteRegionLayer: HTMLElement;
  frequencyBinSlider: HTMLInputElement;
  frequencyBinInput: HTMLInputElement;
  timeSliceSlider: HTMLInputElement;
  timeSliceInput: HTMLInputElement;
  frequencyMethodSelect: HTMLSelectElement;
  symbolizationMethodSelect: HTMLSelectElement;
  pitchOverlayToggle: HTMLInputElement;
  pitchEstimateToggle: HTMLInputElement;
  fixedGridParameterPanel: HTMLElement;
  fixedGridDurationInput: HTMLInputElement;
  fixedGridGapInput: HTMLInputElement;
  fixedGridWindowInput: HTMLInputElement;
  thresholdParameterPanel: HTMLElement;
  thresholdVolumeInput: HTMLInputElement;
  thresholdClarityInput: HTMLInputElement;
  thresholdDurationInput: HTMLInputElement;
  thresholdGapInput: HTMLInputElement;
  waveformDisplay: HTMLElement;
  decodeButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  detectedNotesOutput: HTMLElement;
}

export function bindAudioWorkspaceView(
  root: HTMLElement,
  currentAudioStore: CurrentAudioStore,
  frequencyExtractionMethodStore: FrequencyExtractionMethodStore,
  symbolizationMethodStore: SymbolizationMethodStore,
  noteDetectionConfigStore: NoteDetectionConfigStore,
  thresholdConfigStore: ThresholdNoteDetectionConfigStore,
): void {
  const elements = getAudioWorkspaceElements(root);
  let currentAudio: CurrentAudioBuffer | null = null;
  let frequencyExtractionMethod = frequencyExtractionMethodStore.get();
  let symbolizationMethod = symbolizationMethodStore.get();
  let noteDetectionConfig = noteDetectionConfigStore.get();
  let thresholdConfig = thresholdConfigStore.get();
  let showPitchOverlay = elements.pitchOverlayToggle.checked;
  let showPitchEstimateLine = elements.pitchEstimateToggle.checked;
  const spectralConfig = { ...DEFAULT_SPECTRAL_DENSITY_CONFIG };
  renderPitchGuides(elements.pitchGuideLayer, spectralConfig);
  elements.frequencyMethodSelect.value = frequencyExtractionMethod;
  elements.symbolizationMethodSelect.value = symbolizationMethod;
  renderSymbolizationParameterControls(
    elements,
    symbolizationMethod,
    noteDetectionConfig,
    thresholdConfig,
  );

  bindAnalysisControlPair({
    slider: elements.frequencyBinSlider,
    input: elements.frequencyBinInput,
    initialValue: spectralConfig.frequencyBinCount,
    onCommit(value) {
      spectralConfig.frequencyBinCount = value;
      renderCurrentAudioState(
        elements,
        currentAudio,
        spectralConfig,
        frequencyExtractionMethod,
        symbolizationMethod,
        noteDetectionConfig,
        thresholdConfig,
        showPitchOverlay,
        showPitchEstimateLine,
      );
    },
  });

  bindAnalysisControlPair({
    slider: elements.timeSliceSlider,
    input: elements.timeSliceInput,
    initialValue: spectralConfig.timeSliceCount,
    onCommit(value) {
      spectralConfig.timeSliceCount = value;
      renderCurrentAudioState(
        elements,
        currentAudio,
        spectralConfig,
        frequencyExtractionMethod,
        symbolizationMethod,
        noteDetectionConfig,
        thresholdConfig,
        showPitchOverlay,
        showPitchEstimateLine,
      );
    },
  });

  elements.frequencyMethodSelect.addEventListener("change", () => {
    const nextFrequencyMethod = readFrequencyExtractionMethod(
      elements.frequencyMethodSelect.value,
    );
    elements.frequencyMethodSelect.value = nextFrequencyMethod;
    frequencyExtractionMethodStore.set(nextFrequencyMethod);
  });

  elements.symbolizationMethodSelect.addEventListener("change", () => {
    const nextSymbolizationMethod = readSymbolizationMethod(
      elements.symbolizationMethodSelect.value,
    );
    elements.symbolizationMethodSelect.value = nextSymbolizationMethod;
    symbolizationMethodStore.set(nextSymbolizationMethod);
  });

  elements.pitchOverlayToggle.addEventListener("change", () => {
    showPitchOverlay = elements.pitchOverlayToggle.checked;
    renderPitchOverlayVisibility(elements, showPitchOverlay);
  });

  elements.pitchEstimateToggle.addEventListener("change", () => {
    showPitchEstimateLine = elements.pitchEstimateToggle.checked;
    renderCurrentPitchEstimateLine(
      elements,
      currentAudio,
      spectralConfig,
      frequencyExtractionMethod,
      showPitchEstimateLine,
    );
  });

  bindThresholdParameterControls(elements, (config) => {
    thresholdConfigStore.set(config);
  });

  bindFixedGridParameterControls(elements, (config) => {
    noteDetectionConfigStore.set(config);
  });

  currentAudioStore.subscribe((audio) => {
    currentAudio = audio;
    renderCurrentAudioState(
      elements,
      audio,
      spectralConfig,
      frequencyExtractionMethod,
      symbolizationMethod,
      noteDetectionConfig,
      thresholdConfig,
      showPitchOverlay,
      showPitchEstimateLine,
    );
  });

  frequencyExtractionMethodStore.subscribe((frequencyMethod) => {
    frequencyExtractionMethod = frequencyMethod;
    elements.frequencyMethodSelect.value = frequencyMethod;
    renderCurrentAudioState(
      elements,
      currentAudio,
      spectralConfig,
      frequencyExtractionMethod,
      symbolizationMethod,
      noteDetectionConfig,
      thresholdConfig,
      showPitchOverlay,
      showPitchEstimateLine,
    );
  });

  symbolizationMethodStore.subscribe((nextSymbolizationMethod) => {
    symbolizationMethod = nextSymbolizationMethod;
    elements.symbolizationMethodSelect.value = nextSymbolizationMethod;
    renderSymbolizationParameterControls(
      elements,
      symbolizationMethod,
      noteDetectionConfig,
      thresholdConfig,
    );
    renderCurrentAudioState(
      elements,
      currentAudio,
      spectralConfig,
      frequencyExtractionMethod,
      symbolizationMethod,
      noteDetectionConfig,
      thresholdConfig,
      showPitchOverlay,
      showPitchEstimateLine,
    );
  });

  noteDetectionConfigStore.subscribe((config) => {
    noteDetectionConfig = config;
    renderSymbolizationParameterControls(
      elements,
      symbolizationMethod,
      noteDetectionConfig,
      thresholdConfig,
    );
    renderCurrentAudioState(
      elements,
      currentAudio,
      spectralConfig,
      frequencyExtractionMethod,
      symbolizationMethod,
      noteDetectionConfig,
      thresholdConfig,
      showPitchOverlay,
      showPitchEstimateLine,
    );
  });

  thresholdConfigStore.subscribe((config) => {
    thresholdConfig = config;
    renderSymbolizationParameterControls(
      elements,
      symbolizationMethod,
      noteDetectionConfig,
      thresholdConfig,
    );
    renderCurrentAudioState(
      elements,
      currentAudio,
      spectralConfig,
      frequencyExtractionMethod,
      symbolizationMethod,
      noteDetectionConfig,
      thresholdConfig,
      showPitchOverlay,
      showPitchEstimateLine,
    );
  });
}

function getAudioWorkspaceElements(root: HTMLElement): AudioWorkspaceElements {
  return {
    bufferState: getElement(root, "#buffer-state", HTMLElement),
    bufferStateLight: getElement(root, "#buffer-state-light", HTMLElement),
    bufferStateLabel: getElement(root, "#buffer-state-label", HTMLElement),
    emptyAudioState: getElement(root, "#empty-audio-state", HTMLElement),
    spectrogramCanvas: getElement(root, "#spectrogram-canvas", HTMLCanvasElement),
    pitchEstimateCanvas: getElement(root, "#pitch-estimate-canvas", HTMLCanvasElement),
    pitchGuideLayer: getElement(root, "#pitch-guide-layer", HTMLElement),
    noteRegionLayer: getElement(root, "#note-region-layer", HTMLElement),
    frequencyBinSlider: getElement(root, "#frequency-bin-slider", HTMLInputElement),
    frequencyBinInput: getElement(root, "#frequency-bin-input", HTMLInputElement),
    timeSliceSlider: getElement(root, "#time-slice-slider", HTMLInputElement),
    timeSliceInput: getElement(root, "#time-slice-input", HTMLInputElement),
    frequencyMethodSelect: getElement(root, "#frequency-method-select", HTMLSelectElement),
    symbolizationMethodSelect: getElement(
      root,
      "#symbolization-method-select",
      HTMLSelectElement,
    ),
    pitchOverlayToggle: getElement(root, "#pitch-overlay-toggle", HTMLInputElement),
    pitchEstimateToggle: getElement(root, "#pitch-estimate-toggle", HTMLInputElement),
    fixedGridParameterPanel: getElement(root, "#fixed-grid-parameter-panel", HTMLElement),
    fixedGridDurationInput: getElement(root, "#fixed-grid-duration-input", HTMLInputElement),
    fixedGridGapInput: getElement(root, "#fixed-grid-gap-input", HTMLInputElement),
    fixedGridWindowInput: getElement(root, "#fixed-grid-window-input", HTMLInputElement),
    thresholdParameterPanel: getElement(root, "#threshold-parameter-panel", HTMLElement),
    thresholdVolumeInput: getElement(root, "#threshold-volume-input", HTMLInputElement),
    thresholdClarityInput: getElement(root, "#threshold-clarity-input", HTMLInputElement),
    thresholdDurationInput: getElement(root, "#threshold-duration-input", HTMLInputElement),
    thresholdGapInput: getElement(root, "#threshold-gap-input", HTMLInputElement),
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
  frequencyExtractionMethod: FrequencyExtractionMethod,
  symbolizationMethod: SymbolizationMethod,
  noteDetectionConfig: NoteDetectionConfig,
  thresholdConfig: ThresholdNoteDetectionConfig,
  showPitchOverlay: boolean,
  showPitchEstimateLine: boolean,
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
    clearSpectrogram(elements.pitchEstimateCanvas);
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
  renderDetectedNotes(
    elements,
    currentAudio,
    spectralConfig,
    frequencyExtractionMethod,
    symbolizationMethod,
    noteDetectionConfig,
    thresholdConfig,
    showPitchOverlay,
  );
  renderCurrentPitchEstimateLine(
    elements,
    currentAudio,
    spectralConfig,
    frequencyExtractionMethod,
    showPitchEstimateLine,
  );
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

function renderCurrentPitchEstimateLine(
  elements: AudioWorkspaceElements,
  currentAudio: CurrentAudioBuffer | null,
  spectralConfig: SpectralDensityConfig,
  frequencyExtractionMethod: FrequencyExtractionMethod,
  showPitchEstimateLine: boolean,
): void {
  clearSpectrogram(elements.pitchEstimateCanvas);
  elements.pitchEstimateCanvas.hidden = !showPitchEstimateLine;

  if (!currentAudio || !showPitchEstimateLine) {
    return;
  }

  renderPitchEstimateLine(
    elements.pitchEstimateCanvas,
    estimatePitchSeries(currentAudio.buffer, frequencyExtractionMethod, spectralConfig),
    spectralConfig,
    currentAudio.durationSeconds,
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
  frequencyExtractionMethod: FrequencyExtractionMethod,
  symbolizationMethod: SymbolizationMethod,
  noteDetectionConfig: NoteDetectionConfig,
  thresholdConfig: ThresholdNoteDetectionConfig,
  showPitchOverlay: boolean,
): void {
  const regions = analyzeProtocolNotes(
    currentAudio.buffer,
    frequencyExtractionMethod,
    symbolizationMethod,
    noteDetectionConfig,
    thresholdConfig,
  );
  elements.noteRegionLayer.innerHTML = showPitchOverlay
    ? regions
        .map((region) =>
          renderDetectedNoteRegion(region, currentAudio.durationSeconds, spectralConfig),
        )
        .join("")
    : "";
  renderPitchOverlayVisibility(elements, showPitchOverlay);
  elements.detectedNotesOutput.textContent =
    regions.length === 0
      ? "--"
      : regions.map((region) => `${region.symbol}:${region.tone.note}`).join("  ");
}

function renderPitchOverlayVisibility(
  elements: AudioWorkspaceElements,
  showPitchOverlay: boolean,
): void {
  elements.noteRegionLayer.hidden = !showPitchOverlay;
}

function readFrequencyExtractionMethod(value: string): FrequencyExtractionMethod {
  return (
    FREQUENCY_EXTRACTION_METHODS.find((frequencyMethod) => frequencyMethod === value) ??
    "HomeMade"
  );
}

function readSymbolizationMethod(value: string): SymbolizationMethod {
  return (
    SYMBOLIZATION_METHODS.find((symbolizationMethod) => symbolizationMethod === value) ??
    "FixedGrid"
  );
}

function renderSymbolizationParameterControls(
  elements: AudioWorkspaceElements,
  symbolizationMethod: SymbolizationMethod,
  noteConfig: NoteDetectionConfig,
  thresholdConfig: ThresholdNoteDetectionConfig,
): void {
  elements.fixedGridParameterPanel.hidden = symbolizationMethod !== "FixedGrid";
  elements.thresholdParameterPanel.hidden = symbolizationMethod !== "Threshold";
  elements.fixedGridDurationInput.value = String(noteConfig.toneDurationMs);
  elements.fixedGridGapInput.value = String(noteConfig.gapDurationMs);
  elements.fixedGridWindowInput.value = String(noteConfig.windowDurationMs);
  elements.thresholdVolumeInput.value = String(thresholdConfig.volumeThreshold);
  elements.thresholdClarityInput.value = String(thresholdConfig.clarityThreshold);
  elements.thresholdDurationInput.value = String(thresholdConfig.minimumNoteDurationMs);
  elements.thresholdGapInput.value = String(thresholdConfig.maximumGapDurationMs);
}

function bindFixedGridParameterControls(
  elements: AudioWorkspaceElements,
  onCommit: (config: NoteDetectionConfig) => void,
): void {
  const commit = () => {
    onCommit({
      ...DEFAULT_NOTE_DETECTION_CONFIG,
      toneDurationMs: readNumberInput(elements.fixedGridDurationInput),
      gapDurationMs: readNumberInput(elements.fixedGridGapInput),
      windowDurationMs: readNumberInput(elements.fixedGridWindowInput),
    });
  };

  [
    elements.fixedGridDurationInput,
    elements.fixedGridGapInput,
    elements.fixedGridWindowInput,
  ].forEach((input) => {
    input.addEventListener("change", commit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        commit();
      }
    });
  });
}

function bindThresholdParameterControls(
  elements: AudioWorkspaceElements,
  onCommit: (config: ThresholdNoteDetectionConfig) => void,
): void {
  const commit = () => {
    onCommit({
      windowDurationMs: 100,
      hopDurationMs: 20,
      volumeThreshold: readNumberInput(elements.thresholdVolumeInput),
      clarityThreshold: readNumberInput(elements.thresholdClarityInput),
      minimumNoteDurationMs: readNumberInput(elements.thresholdDurationInput),
      maximumGapDurationMs: readNumberInput(elements.thresholdGapInput),
    });
  };

  [
    elements.thresholdVolumeInput,
    elements.thresholdClarityInput,
    elements.thresholdDurationInput,
    elements.thresholdGapInput,
  ].forEach((input) => {
    input.addEventListener("change", commit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        commit();
      }
    });
  });
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

function renderPitchEstimateLine(
  canvas: HTMLCanvasElement,
  estimates: ReturnType<typeof estimatePitchSeries>,
  spectralConfig: SpectralDensityConfig,
  durationSeconds: number,
): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const { width, height } = getCanvasDisplaySize(canvas);
  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.lineWidth = 2;
  context.strokeStyle = "rgba(125, 221, 255, 0.94)";
  context.shadowBlur = 8;
  context.shadowColor = "rgba(125, 221, 255, 0.55)";

  let isDrawing = false;

  context.beginPath();
  estimates.forEach((estimate) => {
    if (
      estimate.frequencyHz === null ||
      estimate.frequencyHz < spectralConfig.minFrequencyHz ||
      estimate.frequencyHz > spectralConfig.maxFrequencyHz
    ) {
      isDrawing = false;
      return;
    }

    const x = durationSeconds <= 0 ? 0 : (estimate.timeSeconds / durationSeconds) * width;
    const y =
      height -
      ((estimate.frequencyHz - spectralConfig.minFrequencyHz) /
        (spectralConfig.maxFrequencyHz - spectralConfig.minFrequencyHz)) *
        height;

    if (!isDrawing) {
      context.moveTo(x, y);
      isDrawing = true;
      return;
    }

    context.lineTo(x, y);
  });
  context.stroke();

  context.shadowBlur = 0;
  context.fillStyle = "rgba(198, 245, 255, 0.92)";
  estimates.forEach((estimate) => {
    if (
      estimate.frequencyHz === null ||
      estimate.confidence < 0.2 ||
      estimate.frequencyHz < spectralConfig.minFrequencyHz ||
      estimate.frequencyHz > spectralConfig.maxFrequencyHz
    ) {
      return;
    }

    const x = durationSeconds <= 0 ? 0 : (estimate.timeSeconds / durationSeconds) * width;
    const y =
      height -
      ((estimate.frequencyHz - spectralConfig.minFrequencyHz) /
        (spectralConfig.maxFrequencyHz - spectralConfig.minFrequencyHz)) *
        height;
    context.globalAlpha = Math.max(0.25, Math.min(1, estimate.confidence));
    context.beginPath();
    context.arc(x, y, 2.2, 0, 2 * Math.PI);
    context.fill();
  });
  context.globalAlpha = 1;
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
