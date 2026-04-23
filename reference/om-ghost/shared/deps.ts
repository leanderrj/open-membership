import type Stripe from "stripe";
import type { GhostClient } from "./ghost-client.js";
import type { ContentApiClient } from "./content-client.js";
import type { Logger } from "./logger.js";
import type { OmConfig } from "./types.js";
import type { FeedCache } from "./feed-cache.js";
import type { IdempotencyStore } from "./idempotency.js";
import type { RateLimiter } from "./rate-limit.js";

/**
 * The dependency bundle passed into the Hono app factory. All handlers
 * reach external resources through this object, so Node (service/) and
 * Worker (worker/) can supply runtime-appropriate implementations (in-
 * memory cache vs KV, SQLite idempotency vs KV, pino logger vs console).
 */
export interface Deps {
  config: OmConfig;
  env: DepsEnv;
  ghost: GhostClient;
  content: ContentApiClient;
  stripe: Stripe;
  cache: FeedCache;
  idempotency: IdempotencyStore;
  rateLimiter: RateLimiter;
  logger: Logger;
  /** Resolve "now" so tests can inject a clock. */
  clock: () => Date;
}

export interface DepsEnv {
  publicUrl: string;
  feedTokenKey: string;
  jwtSigningKey: string;
  stripeWebhookSecret: string;
  /** Level 1 readers see only these content flags; reserved for future. */
  readonly corsAllowOrigins: string[];
}
