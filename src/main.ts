import {
  createFrequencyExtractionMethodStore,
  createNoteDetectionConfigStore,
  createSymbolizationMethodStore,
  createThresholdNoteDetectionConfigStore,
} from "./analysis";
import { createCurrentAudioStore } from "./audio";
import "./styles.css";
import { createLogger } from "./shared/logger";
import type { ParameterValue, SystemStatus } from "./shared/types";
import { bindAudioFileControls } from "./ui/audioFileControls";
import { bindAudioPlaybackControls } from "./ui/audioPlaybackControls";
import { bindAudioRecordingControls } from "./ui/audioRecordingControls";
import { bindAudioWorkspaceView } from "./ui/audioWorkspaceView";
import { bindDecodeControls } from "./ui/decodeControls";
import { bindEncoderControls } from "./ui/encoderControls";
import { renderWorkbench } from "./ui/workbench";

const logger = createLogger("app");
const currentAudioStore = createCurrentAudioStore();
const frequencyExtractionMethodStore = createFrequencyExtractionMethodStore();
const symbolizationMethodStore = createSymbolizationMethodStore();
const noteDetectionConfigStore = createNoteDetectionConfigStore();
const thresholdConfigStore = createThresholdNoteDetectionConfigStore();

const status: SystemStatus = {
  label: "Pipeline ready",
  detail: "Waiting for text input or loaded audio buffer.",
};

const encodingParameters: ParameterValue[] = [
  { label: "Tone", value: "250 ms" },
  { label: "Gap", value: "50 ms" },
  { label: "Volume", value: "80%" },
  { label: "Wave", value: "Sine" },
  { label: "Frame", value: "None" },
];

const decodingParameters: ParameterValue[] = [
  { label: "Window", value: "250 ms" },
  { label: "Confidence", value: "0.72" },
  { label: "Silence", value: "-48 dB" },
  { label: "Expected", value: "250 ms" },
];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root element");
}

renderWorkbench(app, { status, encodingParameters, decodingParameters });
bindAudioWorkspaceView(
  app,
  currentAudioStore,
  frequencyExtractionMethodStore,
  symbolizationMethodStore,
  noteDetectionConfigStore,
  thresholdConfigStore,
);
bindEncoderControls(app, logger, currentAudioStore);
bindAudioPlaybackControls(app, logger, currentAudioStore);
bindAudioFileControls(app, logger, currentAudioStore);
bindAudioRecordingControls(app, logger, currentAudioStore);
bindDecodeControls(
  app,
  logger,
  currentAudioStore,
  frequencyExtractionMethodStore,
  symbolizationMethodStore,
  noteDetectionConfigStore,
  thresholdConfigStore,
);
logger.info("ODDiO pipeline workbench rendered", {
  encodingParameterCount: encodingParameters.length,
  decodingParameterCount: decodingParameters.length,
});
