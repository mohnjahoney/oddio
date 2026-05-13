type LogContext = Record<string, unknown>;

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export function createLogger(scope: string): Logger {
  const prefix = `[ODDiO:${scope}]`;

  return {
    info(message, context) {
      console.info(prefix, message, context ?? "");
    },
    warn(message, context) {
      console.warn(prefix, message, context ?? "");
    },
    error(message, context) {
      console.error(prefix, message, context ?? "");
    },
  };
}
