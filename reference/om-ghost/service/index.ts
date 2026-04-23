import { serve, type ServerType } from "@hono/node-server";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, corsOrigins } from "./env.js";
import { createNodeLogger } from "./logger.js";
import { loadConfig } from "../shared/config.js";
import { GhostClient } from "../shared/ghost-client.js";
import { ContentApiClient } from "../shared/content-client.js";
import { createStripeClient } from "../shared/stripe-client.js";
import { InMemoryFeedCache } from "../shared/feed-cache.js";
import { MemoryRateLimiter } from "./rate-limit-memory.js";
import { SqliteIdempotencyStore } from "./idempotency-sqlite.js";
import { buildApp } from "../shared/app.js";
import type { Deps } from "../shared/deps.js";

/**
 * Node entrypoint (Mode B). Parses env, builds every dependency,
 * mounts the Hono app, and listens. SIGTERM/SIGINT trigger graceful
 * shutdown: stop accepting connections, drain in-flight requests,
 * close the SQLite store, flush logs.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createNodeLogger({
    level: env.LOG_LEVEL,
    service: "om-ghost",
    publicUrl: env.PUBLIC_URL,
  });

  const config = await loadConfig(resolve(env.OM_CONFIG_PATH));
  logger.info(
    { provider: config.provider.url, spec: config.spec_version },
    "config loaded",
  );

  mkdirSync(env.OM_STATE_DIR, { recursive: true });

  const ghost = new GhostClient({
    ghostUrl: env.GHOST_URL,
    adminKey: env.GHOST_ADMIN_KEY,
  });
  const content = new ContentApiClient({
    ghostUrl: env.GHOST_URL,
    contentApiKey: env.GHOST_CONTENT_KEY,
  });
  const stripe = createStripeClient({
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  });
  const cache = new InMemoryFeedCache(config, ghost, env.OM_FEED_TOKEN_KEY);
  const idempotency = new SqliteIdempotencyStore(
    resolve(env.OM_STATE_DIR, "idempotency.sqlite"),
  );
  const rateLimiter = new MemoryRateLimiter();

  const deps: Deps = {
    config,
    env: {
      publicUrl: env.PUBLIC_URL,
      feedTokenKey: env.OM_FEED_TOKEN_KEY,
      jwtSigningKey: env.OM_JWT_SIGNING_KEY,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      corsAllowOrigins: corsOrigins(env),
    },
    ghost,
    content,
    stripe,
    cache,
    idempotency,
    rateLimiter,
    logger,
    clock: () => new Date(),
  };

  // Warm the feed cache in the background. A cold restart still serves
  // non-members correctly; members hit an empty cache briefly, which
  // returns 403 + signup prompt until warmup completes. We log the
  // progress so an operator can observe readiness.
  cache
    .warm()
    .then(async () =>
      logger.info({ cache_size: await cache.size() }, "feed cache warmed"),
    )
    .catch((err) =>
      logger.error({ err: String(err) }, "feed cache warm failed"),
    );

  const app = buildApp(deps);

  const server = serve(
    { fetch: app.fetch, port: env.PORT, hostname: env.HOST },
    (info) => {
      logger.info(
        { port: info.port, address: info.address },
        "om-ghost listening",
      );
    },
  );

  installShutdown(server, { rateLimiter, idempotency, logger });

  // Periodically prune the idempotency table. Stripe keeps webhooks for
  // at most 30 days; we retain 7 and prune hourly.
  const pruneTimer = setInterval(
    () =>
      idempotency.prune(7 * 24 * 60 * 60).catch((err) => {
        logger.warn({ err: String(err) }, "idempotency prune failed");
      }),
    60 * 60 * 1000,
  );
  pruneTimer.unref?.();
}

/**
 * Wire SIGTERM/SIGINT to a graceful shutdown: stop accepting new
 * connections, wait for in-flight requests to finish (with a deadline),
 * close resources.
 */
function installShutdown(
  server: ServerType,
  resources: {
    rateLimiter: MemoryRateLimiter;
    idempotency: SqliteIdempotencyStore;
    logger: ReturnType<typeof createNodeLogger>;
  },
): void {
  const SHUTDOWN_DEADLINE_MS = 30_000;
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    resources.logger.info({ signal }, "shutdown initiated");

    const deadline = setTimeout(() => {
      resources.logger.warn(
        { deadline_ms: SHUTDOWN_DEADLINE_MS },
        "shutdown deadline exceeded; forcing exit",
      );
      process.exit(1);
    }, SHUTDOWN_DEADLINE_MS);
    deadline.unref?.();

    await new Promise<void>((resolve1) => {
      server.close(() => resolve1());
    });

    resources.rateLimiter.stop();
    await resources.idempotency.close();

    resources.logger.info({}, "shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    resources.logger.fatal(
      { err: err.message, stack: err.stack },
      "uncaughtException — terminating",
    );
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    resources.logger.fatal(
      { reason: String(reason) },
      "unhandledRejection — terminating",
    );
    process.exit(1);
  });
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  // At this point the logger may not be initialised yet.
  console.error(
    JSON.stringify({
      level: "fatal",
      time: new Date().toISOString(),
      msg: "fatal during startup",
      err: msg,
    }),
  );
  process.exit(1);
});
