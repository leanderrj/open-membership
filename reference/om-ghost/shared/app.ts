import { Hono, type Context, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { ZodError } from "zod";
import type { Deps } from "./deps.js";
import {
  CheckoutRequest,
  EntitlementsQuery,
  FeedParams,
  PortalQuery,
  TokenRequest,
} from "./schemas.js";
import {
  BadRequestError,
  ForbiddenError,
  HttpError,
  NotFoundError,
  RateLimitedError,
  UpstreamError,
} from "./errors.js";
import { buildDiscovery } from "./discovery.js";
import { issueJwt } from "./jwt.js";
import { featuresForTier, tierForPriceId } from "./config.js";
import {
  createCheckoutSession,
  createPortalSession,
  parseWebhookEvent,
} from "./stripe-client.js";
import { renderFeed } from "./feed-render.js";
import { randomRequestId } from "./logger.js";
import type Stripe from "stripe";

/**
 * Build the Hono app. Both Node (service/) and Worker (worker/) call
 * this with runtime-appropriate Deps.
 *
 * Middleware order:
 *   1. request id + logger
 *   2. CORS
 *   3. error handler (registered via app.onError)
 *   4. routes
 *
 * The webhook route is mounted on a sub-app because it must see the raw
 * request body; see the mount point in buildApp().
 */
export function buildApp(deps: Deps): Hono {
  const app = new Hono();

  app.use("*", requestContext(deps));
  app.use(
    "/api/om/*",
    cors({
      origin: deps.env.corsAllowOrigins.length
        ? deps.env.corsAllowOrigins
        : (origin) => origin ?? "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400,
    }),
  );

  registerHealth(app, deps);
  registerDiscovery(app, deps);
  registerCheckout(app, deps);
  registerEntitlements(app, deps);
  registerToken(app, deps);
  registerPortal(app, deps);
  registerFeed(app, deps);
  registerWebhook(app, deps);

  app.notFound((c) => {
    return c.json(
      { error: { code: "not_found", message: `no route for ${c.req.path}` } },
      404,
    );
  });

  app.onError((err, c) => {
    const log = c.get("logger") ?? deps.logger;
    if (err instanceof HttpError) {
      if (err.status >= 500) {
        log.error({ err: err.message, code: err.code }, "handler http error");
      } else {
        log.warn({ err: err.message, code: err.code }, "handler http error");
      }
      return c.json(err.toResponseBody(), err.status as 400);
    }
    if (err instanceof ZodError) {
      log.warn({ err: err.message }, "validation error");
      return c.json(
        {
          error: {
            code: "bad_request",
            message: "validation failed",
            details: { issues: err.issues },
          },
        },
        400,
      );
    }
    log.error({ err: err.message, stack: err.stack }, "unhandled error");
    return c.json(
      { error: { code: "internal_error", message: "internal error" } },
      500,
    );
  });

  return app;
}

// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------

function requestContext(deps: Deps): MiddlewareHandler {
  return async (c, next) => {
    const reqId =
      c.req.header("x-request-id") ??
      c.req.header("cf-ray") ??
      randomRequestId();
    const logger = deps.logger.child({
      req_id: reqId,
      method: c.req.method,
      path: c.req.path,
    });
    c.set("logger", logger);
    c.set("reqId", reqId);
    c.header("x-request-id", reqId);

    const start = Date.now();
    try {
      await next();
    } finally {
      const dur = Date.now() - start;
      logger.info({ status: c.res.status, duration_ms: dur }, "request");
    }
  };
}

async function enforceRateLimit(
  deps: Deps,
  c: Context,
  bucket: string,
): Promise<void> {
  const ip = clientIp(c);
  const key = `${bucket}:${ip}`;
  const decision = await deps.rateLimiter.check(key);
  if (!decision.allowed) {
    c.header("retry-after", String(decision.retryAfterSeconds));
    throw new RateLimitedError(decision.retryAfterSeconds);
  }
  c.header("x-ratelimit-remaining", String(decision.remaining));
}

function clientIp(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown"
  );
}

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------

function registerHealth(app: Hono, deps: Deps): void {
  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/ready", async (c) => {
    const [ghostOk, contentOk] = await Promise.all([
      deps.ghost.ping(),
      deps.content.ping(),
    ]);
    const cacheSize = await deps.cache.size();
    const ready = ghostOk && contentOk;
    return c.json(
      {
        ok: ready,
        checks: { ghost_admin: ghostOk, ghost_content: contentOk },
        cache_size: cacheSize,
      },
      ready ? 200 : 503,
    );
  });
}

function registerDiscovery(app: Hono, deps: Deps): void {
  app.get("/.well-known/open-membership", (c) => {
    const doc = buildDiscovery(deps.config, deps.env.publicUrl);
    return c.json(doc);
  });
  // Ghost-style trailing slash too.
  app.get("/.well-known/open-membership/", (c) => {
    const doc = buildDiscovery(deps.config, deps.env.publicUrl);
    return c.json(doc);
  });
}

function registerCheckout(app: Hono, deps: Deps): void {
  app.post(
    "/api/om/checkout",
    zValidator("json", CheckoutRequest),
    async (c) => {
      await enforceRateLimit(deps, c, "checkout");
      const body = c.req.valid("json");

      if (body.psp && body.psp !== "stripe") {
        throw new BadRequestError(
          `psp "${body.psp}" not supported in om-ghost v0.1; only "stripe"`,
        );
      }
      const offer = deps.config.offers[body.offer_id];
      if (!offer) {
        throw new NotFoundError(`unknown offer_id "${body.offer_id}"`);
      }

      const base = deps.env.publicUrl.replace(/\/$/, "");
      const returnUrl = body.return_url ?? `${base}/?om-checkout=return`;
      const cancelUrl = `${base}/?om-checkout=cancel`;

      const session = await safeStripeCall(() =>
        createCheckoutSession(deps.stripe, {
          priceId: offer.checkout.price_id,
          successUrl: `${returnUrl}${
            returnUrl.includes("?") ? "&" : "?"
          }session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl,
          customerEmail: body.customer_email,
          clientReferenceId: body.correlation_id,
          trialDays: offer.trial_days,
        }),
      );

      return c.json({
        checkout_url: session.url,
        session_id: session.id,
        psp: "stripe",
      });
    },
  );
}

function registerEntitlements(app: Hono, deps: Deps): void {
  app.get(
    "/api/om/entitlements",
    zValidator("query", EntitlementsQuery),
    async (c) => {
      await enforceRateLimit(deps, c, "entitlements");
      const { session_id } = c.req.valid("query");

      const session = await safeStripeCall(() =>
        deps.stripe.checkout.sessions.retrieve(session_id, {
          expand: ["subscription", "subscription.items.data.price", "customer"],
        }),
      );

      if (session.status === "expired" || session.payment_status === "unpaid") {
        return c.json({ status: "failed", reason: session.status ?? "unpaid" });
      }
      if (session.status !== "complete") {
        return c.json({ status: "pending" });
      }

      const subscription = session.subscription as Stripe.Subscription | null;
      const priceId = subscription?.items.data[0]?.price.id ?? null;
      const tierId =
        (priceId && tierForPriceId(deps.config, priceId)) ?? "free";
      const features = featuresForTier(deps.config, tierId);

      // Opportunistically refresh the cache if we can identify the
      // Ghost member from the Stripe customer metadata. This cuts the
      // window during which a brand-new subscriber sees an "inactive"
      // feed because the webhook hasn't landed yet.
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;
      if (customerId) {
        const memberId = await resolveGhostMemberId(deps, customerId);
        if (memberId) {
          await deps.cache.refreshMemberById(memberId).catch((err) => {
            deps.logger.warn(
              { err: String(err), memberId },
              "cache refresh after checkout failed",
            );
          });
        }
      }

      return c.json({
        status: "ready",
        tier: tierId,
        features,
        subscription_id: subscription?.id ?? null,
      });
    },
  );
}

function registerToken(app: Hono, deps: Deps): void {
  app.post(
    "/api/om/token",
    zValidator("json", TokenRequest),
    async (c) => {
      await enforceRateLimit(deps, c, "token");
      const { feed_token, audience } = c.req.valid("json");

      const member = await deps.cache.get(feed_token);
      if (!member) {
        throw new ForbiddenError("unknown or revoked feed_token");
      }

      const ttl = 3600;
      const token = await issueJwt(deps.env.jwtSigningKey, {
        issuer: deps.config.provider.url,
        audience: audience ?? deps.env.publicUrl,
        subject: member.uuid,
        ttlSeconds: ttl,
        tierId: member.tier_id,
        entitlements: member.features,
        subscriptionId: member.subscription_id ?? undefined,
      });

      return c.json({
        access_token: token,
        token_type: "Bearer",
        expires_in: ttl,
        entitlements: member.features,
        tier_id: member.tier_id,
      });
    },
  );
}

function registerPortal(app: Hono, deps: Deps): void {
  app.get(
    "/api/om/portal",
    zValidator("query", PortalQuery),
    async (c) => {
      await enforceRateLimit(deps, c, "portal");
      const { feed_token } = c.req.valid("query");

      const member = await deps.cache.get(feed_token);
      if (!member) throw new ForbiddenError("unknown or revoked feed_token");
      if (!member.subscription_id) {
        return c.json(
          {
            error: {
              code: "no_subscription",
              message: "no active subscription — cannot open portal",
            },
          },
          409,
        );
      }

      const sub = await safeStripeCall(() =>
        deps.stripe.subscriptions.retrieve(member.subscription_id as string),
      );
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const base = deps.env.publicUrl.replace(/\/$/, "");
      const session = await safeStripeCall(() =>
        createPortalSession(deps.stripe, customerId, `${base}/`),
      );
      return c.redirect(session.url, 303);
    },
  );
}

function registerFeed(app: Hono, deps: Deps): void {
  app.get(
    "/feed/om/:token",
    zValidator("param", FeedParams),
    feedHandler(deps),
  );
  app.get(
    "/feed/om/:token/",
    zValidator("param", FeedParams),
    feedHandler(deps),
  );
}

function feedHandler(deps: Deps) {
  return async (c: Context) => {
    await enforceRateLimit(deps, c, "feed");
    const { token } = c.req.valid("param" as never) as { token: string };

    const member = await deps.cache.get(token);
    const posts = member ? await deps.content.listPosts({ limit: 50 }) : [];

    const xml = renderFeed({
      config: deps.config,
      publicUrl: deps.env.publicUrl,
      feedTokenInUrl: token,
      member,
      posts,
    });

    c.header("content-type", "application/rss+xml; charset=utf-8");
    c.header("cache-control", "private, max-age=60");
    return c.body(xml, member ? 200 : 403);
  };
}

function registerWebhook(app: Hono, deps: Deps): void {
  app.post("/api/om/webhook", async (c) => {
    const signature = c.req.header("stripe-signature");
    if (!signature) {
      throw new BadRequestError("missing stripe-signature header");
    }

    const rawBody = await c.req.raw.arrayBuffer();
    const buf = Buffer.from(rawBody);

    let event: Stripe.Event;
    try {
      event = parseWebhookEvent(
        deps.stripe,
        buf,
        signature,
        deps.env.stripeWebhookSecret,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "signature error";
      throw new BadRequestError(`signature verification failed: ${msg}`);
    }

    // Idempotency: claim the event id with a 7-day retention window.
    const claimed = await deps.idempotency.claim(event.id, 7 * 24 * 60 * 60);
    if (!claimed) {
      deps.logger.info({ event_id: event.id }, "webhook dedup");
      return c.json({ received: true, dedup: true });
    }

    try {
      await handleStripeEvent(deps, event);
    } catch (err) {
      // Stripe will retry non-2xx. For transient errors (upstream
      // timeout, Ghost 5xx), returning 500 lets Stripe retry. For
      // logic errors, we log and succeed so we don't retry forever.
      if (err instanceof UpstreamError) {
        deps.logger.error(
          { err: err.message, event_id: event.id },
          "webhook upstream error — will retry",
        );
        throw err;
      }
      deps.logger.error(
        { err: String(err), event_id: event.id },
        "webhook handler non-transient error — swallowing",
      );
    }

    return c.json({ received: true });
  });
}

async function handleStripeEvent(
  deps: Deps,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const memberId = await resolveGhostMemberIdFromSubscription(deps, sub);
      if (memberId) await deps.cache.refreshMemberById(memberId);
      break;
    }
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const memberId =
        session.client_reference_id ??
        (typeof session.customer === "string"
          ? await resolveGhostMemberId(deps, session.customer)
          : null);
      if (memberId) await deps.cache.refreshMemberById(memberId);
      break;
    }
    default:
      // ignored event types
      break;
  }
}

async function resolveGhostMemberIdFromSubscription(
  deps: Deps,
  sub: Stripe.Subscription,
): Promise<string | null> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  return resolveGhostMemberId(deps, customerId);
}

async function resolveGhostMemberId(
  deps: Deps,
  customerId: string,
): Promise<string | null> {
  // Prefer explicit metadata on the Stripe customer.
  const customer = await safeStripeCall(() =>
    deps.stripe.customers.retrieve(customerId),
  );
  if (customer.deleted) return null;

  const fromMetadata = (customer as Stripe.Customer).metadata?.ghost_member_id;
  if (fromMetadata) return fromMetadata;

  // Fallback: look up the Ghost member by email. Ghost's native Stripe
  // integration sets customer.email on creation.
  const email = (customer as Stripe.Customer).email;
  if (!email) return null;
  const member = await deps.ghost.getMemberByEmail(email);
  return member?.id ?? null;
}

async function safeStripeCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "stripe error";
    throw new UpstreamError("stripe", msg);
  }
}

// ------------------------------------------------------------------
// Hono variable typing
// ------------------------------------------------------------------

declare module "hono" {
  interface ContextVariableMap {
    logger: import("./logger.js").Logger;
    reqId: string;
  }
}
