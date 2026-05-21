export type SymbolizationMethod = "FixedGrid" | "Threshold";

export interface SymbolizationMethodStore {
  get(): SymbolizationMethod;
  set(symbolizationMethod: SymbolizationMethod): void;
  subscribe(listener: SymbolizationMethodListener): () => void;
}

export type SymbolizationMethodListener = (symbolizationMethod: SymbolizationMethod) => void;

export const DEFAULT_SYMBOLIZATION_METHOD: SymbolizationMethod = "FixedGrid";

export const SYMBOLIZATION_METHODS = [
  DEFAULT_SYMBOLIZATION_METHOD,
  "Threshold",
] as const satisfies readonly SymbolizationMethod[];

export function createSymbolizationMethodStore(
  initialMethod: SymbolizationMethod = DEFAULT_SYMBOLIZATION_METHOD,
): SymbolizationMethodStore {
  let currentSymbolizationMethod = initialMethod;
  const listeners = new Set<SymbolizationMethodListener>();

  return {
    get() {
      return currentSymbolizationMethod;
    },
    set(symbolizationMethod) {
      currentSymbolizationMethod = symbolizationMethod;
      for (const listener of listeners) {
        listener(currentSymbolizationMethod);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(currentSymbolizationMethod);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
