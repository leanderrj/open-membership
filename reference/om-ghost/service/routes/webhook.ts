import { Router, type Request, type Response } from "express";
import type Stripe from "stripe";
import { parseWebhookEvent } from "../../shared/stripe-client.js";
import type { FeedCache } from "../feed-cache.js";

/**
 * POST /api/om/webhook  (Stripe webhook destination)
 *
 * Stripe requires the raw request body to verify signatures, so the
 * router is mounted with express.raw({ type: "application/json" }) —
 * see service/index.ts.
 *
 * The handler's job is to keep the FeedCache in sync with reality:
 *   - customer.subscription.created  → refresh member entry
 *   - customer.subscription.updated  → refresh member entry
 *   - customer.subscription.deleted  → drop member entry
 *   - checkout.session.completed     → refresh member entry (best-effort)
 *
 * Ghost itself also has a Stripe webhook; om-ghost does NOT replace it.
 * The publisher configures a second webhook destination (the sidecar)
 * so both receive the same events independently.
 */
export function webhookRouter(
  stripe: Stripe,
  webhookSecret: string,
  cache: FeedCache,
): Router {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    const signature = req.header("stripe-signature");
    if (!signature) {
      return res.status(400).send("missing stripe-signature header");
    }

    let event: Stripe.Event;
    try {
      event = parseWebhookEvent(stripe, req.body as Buffer, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "signature error";
      return res.status(400).send(`signature verification failed: ${message}`);
    }

    try {
      await handleEvent(event, stripe, cache);
    } catch (err) {
      // We return 200 to prevent Stripe from retrying indefinitely on
      // transient Ghost-side issues; the next event in the series will
      // re-sync state. Failures are logged for operator visibility.
      const message = err instanceof Error ? err.message : "handler error";
      console.error(`om-ghost webhook handler error for ${event.id}: ${message}`);
    }

    return res.json({ received: true });
  });

  return router;
}

async function handleEvent(
  event: Stripe.Event,
  stripe: Stripe,
  cache: FeedCache,
): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const memberId = await resolveMemberIdFromSubscription(sub, stripe);
      if (memberId) await cache.refreshMemberById(memberId);
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const memberId = session.client_reference_id ?? null;
      if (memberId) await cache.refreshMemberById(memberId);
      break;
    }

    default:
      // Other event types are ignored by v0.1.
      break;
  }
}

/**
 * The Stripe subscription doesn't directly carry a Ghost member id.
 * Ghost's native Stripe integration stores the member id in the Stripe
 * customer's metadata under `ghost_member_id`. We read it back here.
 */
async function resolveMemberIdFromSubscription(
  sub: Stripe.Subscription,
  stripe: Stripe,
): Promise<string | null> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  const metadata = (customer as Stripe.Customer).metadata;
  return metadata?.ghost_member_id ?? null;
}
