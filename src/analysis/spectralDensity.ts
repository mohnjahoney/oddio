export interface SpectralDensityConfig {
  minFrequencyHz: number;
  maxFrequencyHz: number;
  frequencyBinCount: number;
  timeSliceCount: number;
  windowDurationMs: number;
}

export interface SpectralDensity {
  minFrequencyHz: number;
  maxFrequencyHz: number;
  frequencyBinCount: number;
  timeSliceCount: number;
  magnitudes: number[][];
}

export const DEFAULT_SPECTRAL_DENSITY_CONFIG: SpectralDensityConfig = {
  minFrequencyHz: 120,
  maxFrequencyHz: 340,
  frequencyBinCount: 144,
  timeSliceCount: 120,
  windowDurationMs: 80,
};

export function computeSpectralDensity(
  buffer: AudioBuffer,
  config: SpectralDensityConfig = DEFAULT_SPECTRAL_DENSITY_CONFIG,
): SpectralDensity {
  const channel = mixChannels(buffer);
  const windowFrameCount = Math.max(
    64,
    Math.round((config.windowDurationMs / 1_000) * buffer.sampleRate),
  );
  const timeSliceCount = Math.max(1, config.timeSliceCount);
  const frequencyBinCount = Math.max(1, config.frequencyBinCount);
  const magnitudes = Array.from({ length: timeSliceCount }, (_, timeIndex) => {
    const centerFrame =
      timeSliceCount === 1
        ? channel.length / 2
        : (timeIndex / (timeSliceCount - 1)) * Math.max(0, channel.length - 1);
    const startFrame = Math.round(centerFrame - windowFrameCount / 2);

    return Array.from({ length: frequencyBinCount }, (_, frequencyIndex) => {
      const frequencyHz = interpolate(
        config.minFrequencyHz,
        config.maxFrequencyHz,
        frequencyIndex / Math.max(1, frequencyBinCount - 1),
      );

      return measureFrequencyMagnitude(
        channel,
        buffer.sampleRate,
        frequencyHz,
        startFrame,
        windowFrameCount,
      );
    });
  });

  const maxMagnitude = Math.max(0, ...magnitudes.flat());

  return {
    minFrequencyHz: config.minFrequencyHz,
    maxFrequencyHz: config.maxFrequencyHz,
    frequencyBinCount,
    timeSliceCount,
    magnitudes:
      maxMagnitude === 0
        ? magnitudes
        : magnitudes.map((timeSlice) => timeSlice.map((magnitude) => magnitude / maxMagnitude)),
  };
}

function measureFrequencyMagnitude(
  channel: Float32Array,
  sampleRate: number,
  frequencyHz: number,
  startFrame: number,
  windowFrameCount: number,
): number {
  let real = 0;
  let imaginary = 0;

  for (let index = 0; index < windowFrameCount; index += 1) {
    const frame = startFrame + index;

    if (frame < 0 || frame >= channel.length) {
      continue;
    }

    const window = hannWindow(index, windowFrameCount);
    const sample = channel[frame] * window;
    const phase = (2 * Math.PI * frequencyHz * index) / sampleRate;
    real += sample * Math.cos(phase);
    imaginary -= sample * Math.sin(phase);
  }

  return Math.sqrt(real * real + imaginary * imaginary) / windowFrameCount;
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

function hannWindow(index: number, length: number): number {
  return 0.5 * (1 - Math.cos((2 * Math.PI * index) / Math.max(1, length - 1)));
}

function interpolate(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}
