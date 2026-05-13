import type { CurrentAudioStore } from "../audio";
import type { Logger } from "../shared/logger";

interface RecordingElements {
  recordButton: HTMLButtonElement;
  debugStatus: HTMLElement;
}

export function bindAudioRecordingControls(
  root: HTMLElement,
  logger: Logger,
  currentAudioStore: CurrentAudioStore,
): void {
  const elements = getRecordingElements(root);
  let mediaRecorder: MediaRecorder | null = null;
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let chunks: BlobPart[] = [];
  let startedAt = 0;

  elements.recordButton.addEventListener("click", () => {
    if (mediaRecorder?.state === "recording") {
      mediaRecorder.stop();
      return;
    }

    void startRecording();
  });

  async function startRecording(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      elements.debugStatus.textContent =
        "Recording failed: microphone capture is not available.";
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(mediaStream);
      chunks = [];
      startedAt = performance.now();

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", () => {
        void finishRecording();
      });

      mediaRecorder.start();
      elements.recordButton.textContent = "Stop Rec";
      elements.recordButton.classList.add("recording-active");
      elements.debugStatus.textContent = "Recording microphone input.";
      logger.info("Started microphone recording");
    } catch (error) {
      stopMediaStream();
      elements.debugStatus.textContent = "Recording failed: microphone permission was denied.";
      logger.error("Failed to start microphone recording", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function finishRecording(): Promise<void> {
    elements.recordButton.textContent = "Record";
    elements.recordButton.classList.remove("recording-active");
    stopMediaStream();

    if (chunks.length === 0) {
      elements.debugStatus.textContent = "Recording stopped with no audio data.";
      return;
    }

    const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || "audio/webm" });
    chunks = [];

    try {
      audioContext = audioContext ?? new AudioContext();
      const buffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
      const elapsedSeconds = Math.max(0, (performance.now() - startedAt) / 1_000);

      currentAudioStore.set({
        buffer,
        durationSeconds: buffer.duration,
        sampleRate: buffer.sampleRate,
        sourceType: "recorded",
        label: `Recorded ${formatSeconds(buffer.duration || elapsedSeconds)}`,
      });
      elements.debugStatus.textContent = `Recorded microphone audio (${formatSeconds(
        buffer.duration,
      )}, ${formatSampleRate(buffer.sampleRate)}).`;
      logger.info("Recorded microphone audio", {
        durationSeconds: buffer.duration,
        sampleRate: buffer.sampleRate,
        channelCount: buffer.numberOfChannels,
        mimeType: blob.type,
      });
    } catch (error) {
      elements.debugStatus.textContent =
        "Recording failed: captured audio could not be decoded.";
      logger.error("Failed to decode recorded microphone audio", {
        error: error instanceof Error ? error.message : String(error),
        mimeType: blob.type,
      });
    }
  }

  function stopMediaStream(): void {
    mediaStream?.getTracks().forEach((track) => {
      track.stop();
    });
    mediaStream = null;
  }
}

function getRecordingElements(root: HTMLElement): RecordingElements {
  return {
    recordButton: getElement(root, "#record-button", HTMLButtonElement),
    debugStatus: getElement(root, "#debug-status", HTMLElement),
  };
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
