import type Stripe from "stripe";
import type { Env, MemberState, OmConfig } from "../types.js";
import { Kv } from "../lib/kv.js";
import { createStripe, parseWebhookEvent } from "../lib/stripe.js";
import { issueFeedToken } from "../lib/token.js";
import { tierForPriceId } from "../lib/config.js";
import type { Logger } from "../lib/logger.js";

/**
 * POST /api/webhook
 *
 * Stripe webhook sink. Verifies signature, claims the event id
 * idempotently in KV (7-day retention), updates the member record, and
 * returns 2xx. 5xx on transient errors so Stripe retries.
 *
 * Events handled (SPEC.md §6.3):
 *   checkout.session.completed         -> provision a member record
 *   customer.subscription.created      -> same
 *   customer.subscription.updated      -> refresh status + price
 *   customer.subscription.deleted      -> mark canceled
 *   charge.dispute.created             -> mark canceled per revocation policy
 */
export async function handleWebhook(
  req: Request,
  env: Env,
  config: OmConfig,
  logger: Logger,
): Promise<Response> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("missing signature", { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = createStripe(env.STRIPE_SECRET_KEY);

  let event: Stripe.Event;
  try {
    event = await parseWebhookEvent(
      stripe,
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn("webhook.signature.invalid", { reason: msg });
    return new Response("bad signature", { status: 400 });
  }

  const kv = new Kv(env.OM_KV);
  const fresh = await kv.claimEvent(event.id);
  if (!fresh) {
    logger.info("webhook.duplicate", { event_id: event.id, type: event.type });
    return new Response("", { status: 200 });
  }

  try {
    await dispatch(event, stripe, env, config, kv, logger);
    return new Response("", { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("webhook.handler.failed", {
      event_id: event.id,
      type: event.type,
      reason: msg,
    });
    return new Response("handler error", { status: 500 });
  }
}

async function dispatch(
  event: Stripe.Event,
  stripe: Stripe,
  env: Env,
  config: OmConfig,
  kv: Kv,
  logger: Logger,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await provisionFromSession(session, stripe, env, config, kv, logger);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await upsertFromSubscription(sub, env, config, kv, logger);
      return;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await markCanceled(sub.id, "canceled", kv, logger);
      return;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const customerId =
        typeof dispute.customer === "string"
          ? dispute.customer
          : dispute.customer?.id ?? null;
      if (customerId) {
        const member = await kv.getMemberByCustomer(customerId);
        if (member?.stripe_subscription_id) {
          await markCanceled(
            member.stripe_subscription_id,
            "canceled",
            kv,
            logger,
          );
        }
      }
      return;
    }
    default:
      logger.debug("webhook.ignored", { type: event.type });
  }
}

async function provisionFromSession(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  env: Env,
  config: OmConfig,
  kv: Kv,
  logger: Logger,
): Promise<void> {
  if (!session.subscription || typeof session.subscription !== "string") {
    logger.warn("webhook.session.no_subscription", { session_id: session.id });
    return;
  }
  const sub = await stripe.subscriptions.retrieve(session.subscription);
  await upsertFromSubscription(sub, env, config, kv, logger);
}

async function upsertFromSubscription(
  sub: Stripe.Subscription,
  env: Env,
  config: OmConfig,
  kv: Kv,
  logger: Logger,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price.id ?? null;
  const { tierId, tier } = tierForPriceId(config, priceId);

  const existing =
    (await kv.getMemberBySubscription(sub.id)) ??
    (await kv.getMemberByCustomer(customerId));

  const uuid = existing?.uuid ?? customerId;
  const feedToken = await issueFeedToken(
    env.OM_FEED_TOKEN_KEY,
    uuid,
    priceId ?? "free",
  );

  const state: MemberState = {
    uuid,
    email: existing?.email ?? null,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    status: mapStatus(sub.status),
    tier_id: tierId,
    features: tier.features,
    feed_token: feedToken,
    updated_at: new Date().toISOString(),
  };

  await kv.putMember(state);

  logger.info("webhook.subscription.upserted", {
    subscription_id: sub.id,
    customer_id: customerId,
    status: state.status,
    tier_id: tierId,
  });
}

async function markCanceled(
  subscriptionId: string,
  status: MemberState["status"],
  kv: Kv,
  logger: Logger,
): Promise<void> {
  const existing = await kv.getMemberBySubscription(subscriptionId);
  if (!existing) {
    logger.warn("webhook.cancel.unknown_subscription", {
      subscription_id: subscriptionId,
    });
    return;
  }
  const next: MemberState = {
    ...existing,
    status,
    tier_id: "free",
    features: [],
    updated_at: new Date().toISOString(),
  };
  await kv.putMember(next);
  logger.info("webhook.subscription.canceled", {
    subscription_id: subscriptionId,
  });
}

function mapStatus(s: Stripe.Subscription.Status): MemberState["status"] {
  switch (s) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
      return s;
    case "incomplete_expired":
      return "canceled";
    case "paused":
      return "past_due";
    default:
      return "none";
  }
}
