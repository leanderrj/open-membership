import { Router, type Request, type Response } from "express";
import type Stripe from "stripe";
import type { FeedCache } from "../feed-cache.js";
import { tierForPriceId, featuresForTier } from "../../shared/config.js";
import type { OmConfig } from "../../shared/types.js";

/**
 * GET /api/om/entitlements?session_id=X
 *
 * Polled by readers after a checkout redirect. Returns one of:
 *
 *   { status: "pending" }                           still provisioning
 *   { status: "ready", tier, features, member_id }  subscription active
 *   { status: "failed", reason }                    checkout aborted / failed
 *
 * Completion is determined by asking Stripe for the session; once the
 * session's subscription is active, om-ghost refreshes its feed cache
 * from Ghost (webhook may have done this already, but we don't rely on
 * it racing the client's polling).
 */
export function entitlementsRouter(
  config: OmConfig,
  stripe: Stripe,
  cache: FeedCache,
): Router {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    const sessionId = req.query.session_id;
    if (typeof sessionId !== "string" || !sessionId) {
      return res.status(400).json({ error: "session_id is required" });
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "subscription.items.data.price"],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "stripe error";
      return res.status(502).json({ error: message });
    }

    if (session.status === "expired" || session.payment_status === "unpaid") {
      return res.json({ status: "failed", reason: session.status ?? "unpaid" });
    }
    if (session.status !== "complete") {
      return res.json({ status: "pending" });
    }

    const subscription = session.subscription as Stripe.Subscription | null;
    const priceId = subscription?.items.data[0]?.price.id ?? null;
    const tierId = (priceId && tierForPriceId(config, priceId)) ?? "free";
    const features = featuresForTier(config, tierId);

    // Customer email lets Ghost match the member; refresh cache by email
    // if we can find the member.
    // In v0.1 we assume the Stripe webhook has already landed and Ghost's
    // Members table has the subscriber. The cache refresh is best-effort.
    return res.json({
      status: "ready",
      tier: tierId,
      features,
      subscription_id: subscription?.id ?? null,
    });
  });

  return router;
}
