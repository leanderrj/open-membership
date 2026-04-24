export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

const REDACT_KEYS = new Set([
  "authorization",
  "cookie",
  "stripe_secret_key",
  "stripe_webhook_secret",
  "om_jwt_signing_key",
  "om_feed_token_key",
  "token",
  "jwt",
]);

function redact(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : v;
  }
  return out;
}

export function createLogger(
  bindings: Record<string, unknown>,
  levelName: LogLevel = "info",
): Logger {
  const threshold = LEVEL_RANK[levelName];

  function emit(
    level: LogLevel,
    msg: string,
    fields: Record<string, unknown> = {},
  ): void {
    if (LEVEL_RANK[level] < threshold) return;
    const entry = {
      level,
      time: new Date().toISOString(),
      msg,
      ...bindings,
      ...redact(fields),
    };
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }

  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
    child: (extra) => createLogger({ ...bindings, ...extra }, levelName),
  };
}

export function parseLevel(raw: string | undefined): LogLevel {
  if (!raw) return "info";
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}
