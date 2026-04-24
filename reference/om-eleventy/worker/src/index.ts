import type { Env } from "./types.js";
import { getConfig } from "./lib/config.js";
import { createLogger, parseLevel } from "./lib/logger.js";
import { handleDiscovery } from "./routes/discovery.js";
import { handleFeed } from "./routes/feed.js";
import { handleCheckout } from "./routes/checkout.js";
import { handleEntitlements } from "./routes/entitlements.js";
import { handleToken } from "./routes/token.js";
import { handleWebhook } from "./routes/webhook.js";

/**
 * om-eleventy Worker entrypoint.
 *
 * Routing (in order):
 *   /.well-known/open-membership   -> dynamic discovery doc (overrides static)
 *   /feed/om/:token/               -> per-subscriber feed
 *   /api/checkout                  -> POST create Stripe Checkout Session
 *   /api/entitlements              -> GET session / token entitlement view
 *   /api/token                     -> POST feed-token -> JWT exchange
 *   /api/webhook                   -> POST Stripe webhook sink
 *   everything else                -> fall through to env.ASSETS (static site)
 *
 * When deployed with `[site] bucket = "./_site"`, Cloudflare binds the
 * static assets as env.ASSETS. In `wrangler dev` without assets configured,
 * unmatched routes return 404.
 */
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const config = getConfig();
    const logger = createLogger(
      {
        service: "om-eleventy",
        public_url: env.PUBLIC_URL,
      },
      parseLevel(env.LOG_LEVEL),
    );

    const url = new URL(req.url);
    const path = url.pathname;

    void ctx;

    try {
      if (path === "/.well-known/open-membership" || path === "/.well-known/open-membership/") {
        return handleDiscovery(env, config);
      }

      if (path.startsWith("/feed/om/") && req.method === "GET") {
        return handleFeed(path, env, config, logger);
      }

      if (path === "/api/checkout" && req.method === "POST") {
        return handleCheckout(req, env, config, logger);
      }

      if (path === "/api/entitlements" && req.method === "GET") {
        return handleEntitlements(req, env, config, logger);
      }

      if (path === "/api/token" && req.method === "POST") {
        return handleToken(req, env, config, logger);
      }

      if (path === "/api/webhook" && req.method === "POST") {
        return handleWebhook(req, env, config, logger);
      }

      if (env.ASSETS) {
        return env.ASSETS.fetch(req);
      }

      return new Response("not found", { status: 404 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("worker.unhandled", {
        path,
        method: req.method,
        reason: msg,
      });
      return new Response(
        JSON.stringify({
          error: { code: "internal_error", message: "Unhandled error." },
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  },
};
