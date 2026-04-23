/**
 * Runtime-agnostic logger interface.
 *
 * Node uses pino (fast, structured, widely supported). Workers use a
 * console-JSON shim because pino's async logging and worker threads
 * aren't available there. Both implementations emit the same JSON
 * schema so log aggregators can treat the two runtimes identically.
 *
 * Fields we standardise on:
 *   - level: "trace" | "debug" | "info" | "warn" | "error" | "fatal"
 *   - time:  ISO-8601 timestamp
 *   - msg:   human-readable message
 *   - ... plus whatever context the caller attached
 */

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface Logger {
  trace(obj: object | string, msg?: string): void;
  debug(obj: object | string, msg?: string): void;
  info(obj: object | string, msg?: string): void;
  warn(obj: object | string, msg?: string): void;
  error(obj: object | string, msg?: string): void;
  fatal(obj: object | string, msg?: string): void;
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * Worker-safe logger: plain console.log with JSON payload. Workers have
 * a hard limit on subrequest count and no async log queueing, so we
 * write synchronously.
 */
export function createConsoleLogger(
  baseBindings: Record<string, unknown> = {},
  level: LogLevel = "info",
): Logger {
  const order: Record<LogLevel, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
  };
  const minLevel = order[level];

  const emit = (lvl: LogLevel, obj: object | string, msg?: string): void => {
    if (order[lvl] < minLevel) return;
    const payload: Record<string, unknown> = {
      level: lvl,
      time: new Date().toISOString(),
      ...baseBindings,
    };
    if (typeof obj === "string") {
      payload.msg = obj;
    } else {
      Object.assign(payload, obj);
      if (msg) payload.msg = msg;
    }
    // One JSON line per event. stderr for warn/error/fatal so containers
    // can separate on stream; stdout for the rest.
    const line = JSON.stringify(payload);
    if (lvl === "warn" || lvl === "error" || lvl === "fatal") {
      console.error(line);
    } else {
      console.log(line);
    }
  };

  return {
    trace: (obj, msg) => emit("trace", obj, msg),
    debug: (obj, msg) => emit("debug", obj, msg),
    info: (obj, msg) => emit("info", obj, msg),
    warn: (obj, msg) => emit("warn", obj, msg),
    error: (obj, msg) => emit("error", obj, msg),
    fatal: (obj, msg) => emit("fatal", obj, msg),
    child: (bindings) =>
      createConsoleLogger({ ...baseBindings, ...bindings }, level),
  };
}

/**
 * Node logger: pino if available. We import lazily so the Worker bundle
 * doesn't try to pull pino in. The caller (service/logger.ts) is
 * Node-only and imports pino eagerly.
 */
export function randomRequestId(): string {
  // 64 bits of randomness, base36. Not crypto; just a correlator.
  const hi = Math.floor(Math.random() * 2 ** 32).toString(36);
  const lo = Math.floor(Math.random() * 2 ** 32).toString(36);
  return `${hi}${lo}`;
}
