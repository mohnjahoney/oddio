import {
  createAudioBufferPlayer,
  type CurrentAudioBuffer,
  type CurrentAudioStore,
} from "../audio";
import type { Logger } from "../shared/logger";

interface PlaybackElements {
  playButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  testBeepButton: HTMLButtonElement;
  playbackTime: HTMLElement;
  debugStatus: HTMLElement;
}

export function bindAudioPlaybackControls(
  root: HTMLElement,
  logger: Logger,
  currentAudioStore: CurrentAudioStore,
): void {
  const elements = getPlaybackElements(root);
  const player = createAudioBufferPlayer();
  let currentAudio: CurrentAudioBuffer | null = null;

  currentAudioStore.subscribe((audio) => {
    currentAudio = audio;
    player.stop();
    renderIdleState(elements, currentAudio);
  });

  elements.playButton.addEventListener("click", () => {
    if (!currentAudio) {
      elements.debugStatus.textContent = "Play clicked, but no current audio buffer exists.";
      return;
    }

    const requestedAudio = currentAudio;
    elements.debugStatus.textContent = `Play clicked for ${requestedAudio.label}. Starting audio output...`;

    void player
      .play(requestedAudio, (status) => {
        elements.playbackTime.textContent = `${formatSeconds(status.elapsedSeconds)} / ${formatSeconds(
          status.durationSeconds,
        )}`;
        elements.playButton.disabled = status.isPlaying;
        elements.stopButton.disabled = !status.isPlaying;
      })
      .then((startInfo) => {
        elements.debugStatus.textContent = `Playing ${requestedAudio.label}. Output: ${startInfo.backend}, state ${startInfo.audioContextState}, latency ${formatSeconds(
          startInfo.outputLatencySeconds,
        )}.`;
        logger.info("Started current audio playback", {
          sourceType: requestedAudio.sourceType,
          durationSeconds: requestedAudio.durationSeconds,
          sampleRate: requestedAudio.sampleRate,
          playbackBackend: startInfo.backend,
          audioContextState: startInfo.audioContextState,
          outputLatencySeconds: startInfo.outputLatencySeconds,
        });
      })
      .catch((error: unknown) => {
        renderIdleState(elements, currentAudio);
        elements.debugStatus.textContent =
          "Playback failed: browser audio output could not start.";
        logger.error("Failed to start current audio playback", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });

  elements.stopButton.addEventListener("click", () => {
    player.stop();
    renderIdleState(elements, currentAudio);
    elements.debugStatus.textContent = currentAudio
      ? `Stopped playback for ${currentAudio.label}.`
      : "No current audio buffer.";
  });

  elements.testBeepButton.addEventListener("click", () => {
    elements.debugStatus.textContent = "Playing Web Audio test beep...";

    void player
      .playTestBeep()
      .then((startInfo) => {
        elements.debugStatus.textContent = `Test beep fired. Output: ${startInfo.backend}, state ${startInfo.audioContextState}, latency ${formatSeconds(
          startInfo.outputLatencySeconds,
        )}.`;
      })
      .catch((error: unknown) => {
        elements.debugStatus.textContent =
          "Test beep failed: Web Audio output could not start.";
        logger.error("Failed to play test beep", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });
}

function getPlaybackElements(root: HTMLElement): PlaybackElements {
  return {
    playButton: getElement(root, "#play-button", HTMLButtonElement),
    stopButton: getElement(root, "#stop-button", HTMLButtonElement),
    testBeepButton: getElement(root, "#test-beep-button", HTMLButtonElement),
    playbackTime: getElement(root, "#playback-time", HTMLElement),
    debugStatus: getElement(root, "#debug-status", HTMLElement),
  };
}

function renderIdleState(
  elements: PlaybackElements,
  currentAudio: CurrentAudioBuffer | null,
): void {
  elements.playButton.disabled = currentAudio === null;
  elements.stopButton.disabled = true;
  elements.playbackTime.textContent = currentAudio
    ? `0.00 / ${formatSeconds(currentAudio.durationSeconds)}`
    : "0.00 / 0.00 s";
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
