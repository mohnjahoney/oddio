export type AudioSourceType = "generated" | "imported" | "recorded";

export interface CurrentAudioBuffer {
  buffer: AudioBuffer;
  durationSeconds: number;
  sampleRate: number;
  sourceType: AudioSourceType;
  label: string;
  toneCount?: number;
}

export type CurrentAudioListener = (audio: CurrentAudioBuffer | null) => void;

export interface CurrentAudioStore {
  get(): CurrentAudioBuffer | null;
  set(audio: CurrentAudioBuffer | null): void;
  subscribe(listener: CurrentAudioListener): () => void;
}

export function createCurrentAudioStore(): CurrentAudioStore {
  let currentAudio: CurrentAudioBuffer | null = null;
  const listeners = new Set<CurrentAudioListener>();

  return {
    get() {
      return currentAudio;
    },
    set(audio) {
      currentAudio = audio;
      for (const listener of listeners) {
        listener(currentAudio);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(currentAudio);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
