import { Router, type Request, type Response } from "express";
import type Stripe from "stripe";
import { createPortalSession } from "../../shared/stripe-client.js";
import type { FeedCache } from "../feed-cache.js";

/**
 * GET /api/om/portal?feed_token=X
 *
 * Redirects the subscriber to their Stripe Customer Portal. The portal
 * lets them update payment methods, change plans, and cancel — handled
 * entirely by Stripe, with state changes reflected back via webhook.
 */
export function portalRouter(
  stripe: Stripe,
  cache: FeedCache,
  publicUrl: string,
): Router {
  const router = Router();
  const base = publicUrl.replace(/\/$/, "");

  router.get("/", async (req: Request, res: Response) => {
    const feedToken = req.query.feed_token;
    if (typeof feedToken !== "string" || !feedToken) {
      return res.status(400).json({ error: "feed_token is required" });
    }
    const member = cache.get(feedToken);
    if (!member) {
      return res.status(403).json({ error: "unknown or revoked feed_token" });
    }

    // We need the Stripe customer id to open the portal. In v0.1 we
    // rely on the webhook handler having stored it on the member; for
    // now the subscription_id is what we have.
    if (!member.subscription_id) {
      return res
        .status(409)
        .json({ error: "no active subscription — cannot open portal" });
    }

    try {
      const sub = await stripe.subscriptions.retrieve(member.subscription_id);
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const session = await createPortalSession(stripe, customerId, `${base}/`);
      return res.redirect(303, session.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "stripe error";
      return res.status(502).json({ error: message });
    }
  });

  return router;
}
