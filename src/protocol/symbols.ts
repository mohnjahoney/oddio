import { noteToFrequency, type NoteName } from "./notes";

export type HexSymbol =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F";

export interface ToneSymbol {
  symbol: HexSymbol;
  note: NoteName;
  frequencyHz: number;
}

export const HEX_SYMBOLS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
] as const satisfies readonly HexSymbol[];

const NOTE_BY_SYMBOL: Record<HexSymbol, NoteName> = {
  "0": "C3",
  "1": "C#3",
  "2": "D3",
  "3": "D#3",
  "4": "E3",
  "5": "F3",
  "6": "F#3",
  "7": "G3",
  "8": "G#3",
  "9": "A3",
  A: "A#3",
  B: "B3",
  C: "C4",
  D: "C#4",
  E: "D4",
  F: "D#4",
};

export const TONE_ALPHABET: Record<HexSymbol, ToneSymbol> = HEX_SYMBOLS.reduce(
  (alphabet, symbol) => {
    const note = NOTE_BY_SYMBOL[symbol];
    alphabet[symbol] = {
      symbol,
      note,
      frequencyHz: noteToFrequency(note),
    };
    return alphabet;
  },
  {} as Record<HexSymbol, ToneSymbol>,
);

export function isHexSymbol(value: string): value is HexSymbol {
  return HEX_SYMBOLS.includes(value.toUpperCase() as HexSymbol);
}

export function lookupTone(symbol: HexSymbol): ToneSymbol {
  return TONE_ALPHABET[symbol];
}

export function toneToLabel(tone: ToneSymbol): string {
  return `${tone.symbol}:${tone.note}`;
}
