export type DecodeStrategy = "FixedGrid" | "Threshold";

export interface DecodeStrategyStore {
  get(): DecodeStrategy;
  set(strategy: DecodeStrategy): void;
  subscribe(listener: DecodeStrategyListener): () => void;
}

export type DecodeStrategyListener = (strategy: DecodeStrategy) => void;

export const DEFAULT_DECODE_STRATEGY: DecodeStrategy = "FixedGrid";

export const DECODE_STRATEGIES = [
  DEFAULT_DECODE_STRATEGY,
  "Threshold",
] as const satisfies readonly DecodeStrategy[];

export function createDecodeStrategyStore(
  initialStrategy: DecodeStrategy = DEFAULT_DECODE_STRATEGY,
): DecodeStrategyStore {
  let currentStrategy = initialStrategy;
  const listeners = new Set<DecodeStrategyListener>();

  return {
    get() {
      return currentStrategy;
    },
    set(strategy) {
      currentStrategy = strategy;
      for (const listener of listeners) {
        listener(currentStrategy);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(currentStrategy);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
