import express from "express";
import { loadConfig } from "../shared/config.js";
import { GhostClient } from "../shared/ghost-client.js";
import { createStripeClient } from "../shared/stripe-client.js";
import { FeedCache } from "./feed-cache.js";
import { buildDiscovery } from "./discovery.js";
import { checkoutRouter } from "./routes/checkout.js";
import { entitlementsRouter } from "./routes/entitlements.js";
import { tokenRouter } from "./routes/token.js";
import { portalRouter } from "./routes/portal.js";
import { webhookRouter } from "./routes/webhook.js";

/**
 * om-ghost Mode B entrypoint.
 *
 * A publisher running self-hosted Ghost puts this service behind the
 * same reverse proxy that fronts Ghost. The proxy routes:
 *
 *   /api/om/*                    → this service
 *   /.well-known/open-membership → this service (or Ghost via theme)
 *   /feed/om/*                   → this service (v0.2+; see NOTE below)
 *   everything else              → Ghost
 *
 * NOTE: feed rendering is not wired in v0.1. The spec-compliant feed
 * body is described in theme/om-feed.hbs; rendering it from the sidecar
 * requires pulling post bodies from the Ghost Content API with a
 * per-member access filter, which is the next milestone. v0.1 focuses
 * on discovery + checkout + entitlements + tokens + webhook.
 */
async function main(): Promise<void> {
  const env = readEnv();
  const config = await loadConfig(env.configPath);

  const ghost = new GhostClient({
    ghostUrl: env.ghostUrl,
    adminKey: env.ghostAdminKey,
  });
  const stripe = createStripeClient({
    secretKey: env.stripeSecretKey,
    webhookSecret: env.stripeWebhookSecret,
  });

  const cache = new FeedCache(config, ghost, env.feedTokenKey);

  // Warm the cache asynchronously so startup isn't blocked on a large
  // subscriber list. Feed requests that race the warm-up will fall back
  // to on-demand Ghost lookup when that code path lands in v0.2.
  cache.warm().catch((err) => {
    console.error(`om-ghost: feed cache warm failed: ${err?.message ?? err}`);
  });

  const app = express();

  // Webhook router MUST see the raw body for signature verification.
  // Mount it before the JSON parser.
  app.use(
    "/api/om/webhook",
    express.raw({ type: "application/json" }),
    webhookRouter(stripe, env.stripeWebhookSecret, cache),
  );

  app.use(express.json());

  app.get("/.well-known/open-membership", (_req, res) => {
    res
      .type("application/json")
      .json(buildDiscovery(config, env.publicUrl));
  });

  app.use("/api/om/checkout", checkoutRouter(config, stripe, env.publicUrl));
  app.use("/api/om/entitlements", entitlementsRouter(config, stripe, cache));
  app.use("/api/om/token", tokenRouter(config, cache, env.jwtSigningKey, env.publicUrl));
  app.use("/api/om/portal", portalRouter(stripe, cache, env.publicUrl));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, cache_size: cache.size() });
  });

  app.listen(env.port, () => {
    console.log(
      `om-ghost listening on :${env.port} (provider=${config.provider.url})`,
    );
  });
}

interface Env {
  port: number;
  publicUrl: string;
  ghostUrl: string;
  ghostAdminKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  feedTokenKey: string;
  jwtSigningKey: string;
  configPath: string;
}

function readEnv(): Env {
  const need = (k: string): string => {
    const v = process.env[k];
    if (!v) throw new Error(`environment variable ${k} is required`);
    return v;
  };
  return {
    port: Number(process.env.PORT ?? 4000),
    publicUrl: need("PUBLIC_URL"),
    ghostUrl: need("GHOST_URL"),
    ghostAdminKey: need("GHOST_ADMIN_KEY"),
    stripeSecretKey: need("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: need("STRIPE_WEBHOOK_SECRET"),
    feedTokenKey: need("OM_FEED_TOKEN_KEY"),
    jwtSigningKey: need("OM_JWT_SIGNING_KEY"),
    configPath: process.env.OM_CONFIG_PATH ?? "./om-config.yaml",
  };
}

main().catch((err) => {
  console.error(`om-ghost: fatal: ${err?.message ?? err}`);
  process.exit(1);
});
