import { pino, type Logger as PinoLogger } from "pino";
import type { Logger, LogLevel } from "../shared/logger.js";

/**
 * Pino-backed Logger for the Node runtime. Adapts pino's API to the
 * minimal interface shared/logger.ts defines, so application code can
 * call the same methods in Node and in Workers.
 */
export function createNodeLogger(opts: {
  level?: LogLevel;
  service: string;
  publicUrl: string;
}): Logger {
  const base = pino({
    level: opts.level ?? (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info",
    base: {
      service: opts.service,
      public_url: opts.publicUrl,
    },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "headers.authorization",
        "headers.cookie",
        "*.stripe_secret_key",
        "*.ghost_admin_key",
        "*.om_jwt_signing_key",
        "*.om_feed_token_key",
      ],
      censor: "[redacted]",
    },
  });

  return wrap(base);
}

function wrap(p: PinoLogger): Logger {
  return {
    trace: (obj, msg) => p.trace(obj as object, msg),
    debug: (obj, msg) => p.debug(obj as object, msg),
    info: (obj, msg) => p.info(obj as object, msg),
    warn: (obj, msg) => p.warn(obj as object, msg),
    error: (obj, msg) => p.error(obj as object, msg),
    fatal: (obj, msg) => p.fatal(obj as object, msg),
    child: (bindings) => wrap(p.child(bindings)),
  };
}
