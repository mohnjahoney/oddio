import type { CurrentAudioBuffer } from "./currentBuffer";

export interface PlaybackStatus {
  elapsedSeconds: number;
  durationSeconds: number;
  isPlaying: boolean;
}

export interface PlaybackStartInfo {
  backend: "web-audio";
  audioContextState: AudioContextState;
  audioContextStateBeforeResume: AudioContextState;
  outputLatencySeconds: number;
  baseLatencySeconds: number;
}

export interface AudioBufferPlayer {
  play(
    audio: CurrentAudioBuffer,
    onStatus: (status: PlaybackStatus) => void,
  ): Promise<PlaybackStartInfo>;
  stop(): void;
  isPlaying(): boolean;
  playTestBeep(): Promise<PlaybackStartInfo>;
}

export function createAudioBufferPlayer(): AudioBufferPlayer {
  let audioContext: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let gain: GainNode | null = null;
  let startedAtSeconds = 0;
  let activeAudio: CurrentAudioBuffer | null = null;
  let progressTimer: number | null = null;
  let statusCallback: ((status: PlaybackStatus) => void) | null = null;

  function getAudioContext(): AudioContext {
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContext({ latencyHint: "interactive" });
    }

    return audioContext;
  }

  function stop(): void {
    const stoppedAudio = activeAudio;
    const stoppedCallback = statusCallback;

    clearProgressTimer();

    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // A source can already be stopped by its natural onended path.
      }
      source.disconnect();
      source = null;
    }

    if (gain) {
      gain.disconnect();
      gain = null;
    }

    activeAudio = null;
    statusCallback = null;

    if (stoppedAudio && stoppedCallback) {
      stoppedCallback({
        elapsedSeconds: 0,
        durationSeconds: stoppedAudio.durationSeconds,
        isPlaying: false,
      });
    }
  }

  return {
    async play(audio, onStatus) {
      stop();

      const context = getAudioContext();
      const audioContextStateBeforeResume = context.state;
      await ensureContextRunning(context);
      primeOutputPath(context);

      const nextSource = context.createBufferSource();
      const nextGain = context.createGain();
      nextGain.gain.value = 0.9;
      nextSource.buffer = cloneAudioBuffer(context, audio.buffer);
      nextSource.connect(nextGain);
      nextGain.connect(context.destination);
      nextSource.onended = () => {
        clearProgressTimer();
        source = null;
        activeAudio = null;
        statusCallback = null;
        onStatus({
          elapsedSeconds: audio.durationSeconds,
          durationSeconds: audio.durationSeconds,
          isPlaying: false,
        });
      };

      source = nextSource;
      gain = nextGain;
      activeAudio = audio;
      statusCallback = onStatus;
      startedAtSeconds = context.currentTime + 0.04;
      nextSource.start(startedAtSeconds);

      onStatus({
        elapsedSeconds: 0,
        durationSeconds: audio.durationSeconds,
        isPlaying: true,
      });

      progressTimer = window.setInterval(() => {
        if (!audioContext || !activeAudio || !statusCallback) {
          return;
        }

        statusCallback({
          elapsedSeconds: Math.min(
            activeAudio.durationSeconds,
            audioContext.currentTime - startedAtSeconds,
          ),
          durationSeconds: activeAudio.durationSeconds,
          isPlaying: true,
        });
      }, 100);

      return {
        backend: "web-audio",
        audioContextState: context.state,
        audioContextStateBeforeResume,
        outputLatencySeconds: context.outputLatency,
        baseLatencySeconds: context.baseLatency,
      };
    },
    stop,
    isPlaying() {
      return source !== null;
    },
    async playTestBeep() {
      const context = getAudioContext();
      const audioContextStateBeforeResume = context.state;
      await ensureContextRunning(context);

      const oscillator = context.createOscillator();
      const beepGain = context.createGain();
      const now = context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.linearRampToValueAtTime(880, now + 0.35);
      oscillator.frequency.linearRampToValueAtTime(440, now + 0.7);
      beepGain.gain.setValueAtTime(0, now);
      beepGain.gain.linearRampToValueAtTime(0.7, now + 0.02);
      beepGain.gain.setValueAtTime(0.7, now + 0.7);
      beepGain.gain.linearRampToValueAtTime(0, now + 0.95);
      oscillator.connect(beepGain);
      beepGain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 1);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        beepGain.disconnect();
      });

      return {
        backend: "web-audio",
        audioContextState: context.state,
        audioContextStateBeforeResume,
        outputLatencySeconds: context.outputLatency,
        baseLatencySeconds: context.baseLatency,
      };
    },
  };

  function clearProgressTimer(): void {
    if (progressTimer !== null) {
      window.clearInterval(progressTimer);
      progressTimer = null;
    }
  }
}

async function ensureContextRunning(context: AudioContext): Promise<void> {
  if (context.state === "running") {
    return;
  }

  await context.resume();
  const stateAfterResume = String(context.state) as AudioContextState;

  if (stateAfterResume !== "running") {
    throw new Error(`AudioContext did not enter running state: ${stateAfterResume}`);
  }
}

function primeOutputPath(context: AudioContext): void {
  const oscillator = context.createOscillator();
  const warmupGain = context.createGain();
  const now = context.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(440, now);
  warmupGain.gain.setValueAtTime(0.0001, now);
  warmupGain.gain.linearRampToValueAtTime(0, now + 0.03);
  oscillator.connect(warmupGain);
  warmupGain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.035);
  oscillator.addEventListener("ended", () => {
    oscillator.disconnect();
    warmupGain.disconnect();
  });
}

function cloneAudioBuffer(audioContext: BaseAudioContext, buffer: AudioBuffer): AudioBuffer {
  const clone = audioContext.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate,
  );

  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    clone.copyToChannel(buffer.getChannelData(channelIndex), channelIndex);
  }

  return clone;
}
