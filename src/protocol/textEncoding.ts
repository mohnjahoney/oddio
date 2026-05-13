import { isHexSymbol, lookupTone, type HexSymbol, type ToneSymbol } from "./symbols";

export interface EncodedMessage {
  text: string;
  bytes: Uint8Array;
  hexStream: HexSymbol[];
  tones: ToneSymbol[];
}

const textEncoder = new TextEncoder();

export function textToUtf8Bytes(text: string): Uint8Array {
  return textEncoder.encode(text);
}

export function bytesToHexStream(bytes: Uint8Array): HexSymbol[] {
  return Array.from(bytes).flatMap((byte) => {
    const hexByte = byte.toString(16).toUpperCase().padStart(2, "0");
    return hexByte.split("").map(toHexSymbol);
  });
}

export function hexStreamToToneSequence(hexStream: readonly HexSymbol[]): ToneSymbol[] {
  return hexStream.map(lookupTone);
}

export function encodeTextMessage(text: string): EncodedMessage {
  const bytes = textToUtf8Bytes(text);
  const hexStream = bytesToHexStream(bytes);
  const tones = hexStreamToToneSequence(hexStream);

  return {
    text,
    bytes,
    hexStream,
    tones,
  };
}

function toHexSymbol(value: string): HexSymbol {
  if (!isHexSymbol(value)) {
    throw new Error(`Invalid hex symbol generated from byte stream: ${value}`);
  }

  return value.toUpperCase() as HexSymbol;
}
