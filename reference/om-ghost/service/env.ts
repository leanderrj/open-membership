import { z } from "zod";
import { ConfigError } from "../shared/errors.js";

/**
 * Parse and validate the service's environment. All secrets are
 * required and must be non-empty. Format errors fail fast at startup
 * rather than at first request.
 */
const EnvSchema = z.object({
  PORT: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535))
    .default("4000"),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  PUBLIC_URL: z.string().url(),
  GHOST_URL: z.string().url(),
  GHOST_ADMIN_KEY: z.string().regex(/^[^:]+:[^:]+$/, "must be id:secret"),
  GHOST_CONTENT_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  OM_FEED_TOKEN_KEY: z.string().min(32),
  OM_JWT_SIGNING_KEY: z.string().min(32),
  OM_CONFIG_PATH: z.string().default("./om-config.yaml"),
  OM_STATE_DIR: z.string().default("./state"),
  OM_CORS_ORIGINS: z.string().default(""),
});

export type ServiceEnv = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ServiceEnv {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new ConfigError(`invalid environment:\n${issues}`);
  }
  return parsed.data;
}

export function corsOrigins(env: ServiceEnv): string[] {
  return env.OM_CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
