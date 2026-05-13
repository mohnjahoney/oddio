import { isHexSymbol, type HexSymbol } from "./symbols";

export interface DecodedHexMessage {
  hexStream: HexSymbol[];
  bytes: Uint8Array;
  text: string;
}

const textDecoder = new TextDecoder("utf-8", { fatal: true });

export function decodeHexMessage(hexText: string): DecodedHexMessage {
  const normalizedHex = hexText.replace(/\s+/g, "").toUpperCase();

  if (normalizedHex.length === 0) {
    return {
      hexStream: [],
      bytes: new Uint8Array(),
      text: "",
    };
  }

  if (normalizedHex.length % 2 !== 0) {
    throw new Error("Hex stream has an odd number of symbols.");
  }

  const hexStream = normalizedHex.split("").map(toHexSymbol);
  const bytes = hexStreamToBytes(hexStream);

  return {
    hexStream,
    bytes,
    text: textDecoder.decode(bytes),
  };
}

export function hexStreamToText(hexStream: readonly HexSymbol[]): string {
  return decodeHexMessage(hexStream.join("")).text;
}

function hexStreamToBytes(hexStream: readonly HexSymbol[]): Uint8Array {
  const bytes = new Uint8Array(hexStream.length / 2);

  for (let index = 0; index < hexStream.length; index += 2) {
    bytes[index / 2] = Number.parseInt(`${hexStream[index]}${hexStream[index + 1]}`, 16);
  }

  return bytes;
}

function toHexSymbol(value: string): HexSymbol {
  if (!isHexSymbol(value)) {
    throw new Error(`Invalid hex symbol in decoded stream: ${value}`);
  }

  return value as HexSymbol;
}
