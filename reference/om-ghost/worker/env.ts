import { z } from "zod";
import { ConfigError } from "../shared/errors.js";

/**
 * Parse and validate Worker environment bindings.
 *
 * Workers don't have process.env — bindings arrive on the per-request
 * `env` argument. We validate them per request rather than at startup,
 * because Workers don't have a startup moment.
 */
const WorkerEnvSchema = z.object({
  PUBLIC_URL: z.string().url(),
  GHOST_URL: z.string().url(),
  GHOST_ADMIN_KEY: z.string().regex(/^[^:]+:[^:]+$/),
  GHOST_CONTENT_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  OM_FEED_TOKEN_KEY: z.string().min(32),
  OM_JWT_SIGNING_KEY: z.string().min(32),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  OM_CORS_ORIGINS: z.string().default(""),
});

export type WorkerEnv = z.infer<typeof WorkerEnvSchema> & {
  OM_FEED_CACHE: KVNamespace;
  OM_IDEMPOTENCY: KVNamespace;
  OM_RATE_LIMIT: KVNamespace;
};

export function parseWorkerEnv(env: unknown): WorkerEnv {
  const parsed = WorkerEnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ConfigError(`invalid worker bindings: ${issues}`);
  }
  const raw = env as Record<string, unknown>;
  return {
    ...parsed.data,
    OM_FEED_CACHE: raw.OM_FEED_CACHE as KVNamespace,
    OM_IDEMPOTENCY: raw.OM_IDEMPOTENCY as KVNamespace,
    OM_RATE_LIMIT: raw.OM_RATE_LIMIT as KVNamespace,
  };
}

export function corsOriginsFromWorker(env: WorkerEnv): string[] {
  return env.OM_CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
