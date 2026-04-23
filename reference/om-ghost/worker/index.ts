import Stripe from "stripe";
import { buildApp } from "../shared/app.js";
import { createConsoleLogger } from "../shared/logger.js";
import { GhostClient } from "../shared/ghost-client.js";
import { ContentApiClient } from "../shared/content-client.js";
import { parse as parseYaml } from "yaml";
import type { Deps } from "../shared/deps.js";
import type { OmConfig } from "../shared/types.js";
import { parseWorkerEnv, corsOriginsFromWorker, type WorkerEnv } from "./env.js";
import { KvFeedCache } from "./kv-cache.js";
import { KvIdempotencyStore } from "./kv-idempotency.js";
import { KvRateLimiter } from "./kv-rate-limit.js";

/**
 * om-ghost Cloudflare Worker entrypoint (Mode A).
 *
 * Publisher deploys this Worker on a Cloudflare zone that fronts their
 * Ghost(Pro) instance. Cloudflare routing sends:
 *
 *   /api/om/*                    → this worker
 *   /.well-known/open-membership → this worker
 *   /feed/om/*                   → this worker
 *   everything else              → Ghost(Pro) origin (bypass)
 *
 * om-config.yaml is bundled at build time by wrangler's text rule
 * (see wrangler.toml). It is imported as raw text and parsed once per
 * Worker instance.
 */

// Wrangler's [[rules]] + type = "Text" makes *.yaml imports resolve to
// their string contents. The declaration lives in worker/types.d.ts.
import rawConfig from "../om-config.yaml";

// Parsed once, cached for the life of this Worker instance.
let cachedConfig: OmConfig | null = null;

function getConfig(): OmConfig {
  if (cachedConfig) return cachedConfig;
  cachedConfig = parseYaml(rawConfig) as OmConfig;
  return cachedConfig;
}

export default {
  async fetch(
    req: Request,
    envRaw: unknown,
    ctx: ExecutionContext,
  ): Promise<Response> {
    let env: WorkerEnv;
    try {
      env = parseWorkerEnv(envRaw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(
        JSON.stringify({
          error: { code: "configuration_error", message: msg },
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    const config = getConfig();
    const logger = createConsoleLogger(
      {
        service: "om-ghost-worker",
        public_url: env.PUBLIC_URL,
      },
      env.LOG_LEVEL,
    );

    const ghost = new GhostClient({
      ghostUrl: env.GHOST_URL,
      adminKey: env.GHOST_ADMIN_KEY,
    });
    const content = new ContentApiClient({
      ghostUrl: env.GHOST_URL,
      contentApiKey: env.GHOST_CONTENT_KEY,
    });
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      httpClient: Stripe.createFetchHttpClient(),
      typescript: true,
    });
    const cache = new KvFeedCache(
      env.OM_FEED_CACHE,
      config,
      ghost,
      env.OM_FEED_TOKEN_KEY,
    );
    const idempotency = new KvIdempotencyStore(env.OM_IDEMPOTENCY);
    const rateLimiter = new KvRateLimiter(env.OM_RATE_LIMIT);

    const deps: Deps = {
      config,
      env: {
        publicUrl: env.PUBLIC_URL,
        feedTokenKey: env.OM_FEED_TOKEN_KEY,
        jwtSigningKey: env.OM_JWT_SIGNING_KEY,
        stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
        corsAllowOrigins: corsOriginsFromWorker(env),
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

    const app = buildApp(deps);

    // Use waitUntil for best-effort cache writes that outlive the
    // response. Not needed for the happy path of our handlers since all
    // writes are awaited inside the handler.
    void ctx;
    return app.fetch(req, envRaw);
  },
};
