export type NoteName =
  | "C3"
  | "C#3"
  | "D3"
  | "D#3"
  | "E3"
  | "F3"
  | "F#3"
  | "G3"
  | "G#3"
  | "A3"
  | "A#3"
  | "B3"
  | "C4"
  | "C#4"
  | "D4"
  | "D#4";

const SEMITONE_INDEX_BY_NOTE: Record<NoteName, number> = {
  C3: 48,
  "C#3": 49,
  D3: 50,
  "D#3": 51,
  E3: 52,
  F3: 53,
  "F#3": 54,
  G3: 55,
  "G#3": 56,
  A3: 57,
  "A#3": 58,
  B3: 59,
  C4: 60,
  "C#4": 61,
  D4: 62,
  "D#4": 63,
};

export const NOTE_NAMES = Object.keys(SEMITONE_INDEX_BY_NOTE) as NoteName[];

export function noteToFrequency(note: NoteName): number {
  const semitoneIndex = SEMITONE_INDEX_BY_NOTE[note];
  return 440 * 2 ** ((semitoneIndex - 69) / 12);
}

export function frequencyToNearestNote(frequency: number): NoteName {
  if (!Number.isFinite(frequency) || frequency <= 0) {
    throw new Error(`Cannot map invalid frequency to a note: ${frequency}`);
  }

  return NOTE_NAMES.reduce((nearestNote, candidateNote) => {
    const nearestDistance = Math.abs(noteToFrequency(nearestNote) - frequency);
    const candidateDistance = Math.abs(noteToFrequency(candidateNote) - frequency);
    return candidateDistance < nearestDistance ? candidateNote : nearestNote;
  }, NOTE_NAMES[0]);
}
