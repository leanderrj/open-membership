import type { Env, OmConfig } from "../types.js";
import { Kv } from "../lib/kv.js";
import { createStripe } from "../lib/stripe.js";
import { entitlementFor, tierForPriceId } from "../lib/config.js";
import type { Logger } from "../lib/logger.js";

/**
 * GET /api/entitlements?session_id=<checkout_session_id>
 * GET /api/entitlements?feed_token=<token>
 *
 * First shape is the post-checkout polling case: the reader just
 * completed checkout and is polling until the webhook has provisioned
 * the subscription into KV.
 *
 * Second shape is the "is my token still entitled" case: given a token,
 * return the current tier + features + active flag. This is what an
 * in-reader app calls before deciding whether to show a paywall.
 */
export async function handleEntitlements(
  req: Request,
  env: Env,
  config: OmConfig,
  logger: Logger,
): Promise<Response> {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  const feedToken = url.searchParams.get("feed_token");

  if (!sessionId && !feedToken) {
    return errorResponse(
      400,
      "missing_field",
      "Either session_id or feed_token is required.",
    );
  }

  const kv = new Kv(env.OM_KV);

  if (feedToken) {
    const member = await kv.getMemberByToken(feedToken);
    if (!member) {
      return json({ state: "unknown" });
    }
    return json({
      state: "ready",
      entitlement: entitlementFor(config, member),
      feed_url: `${env.PUBLIC_URL.replace(/\/$/, "")}/feed/om/${encodeURIComponent(
        member.feed_token,
      )}/`,
    });
  }

  const stripe = createStripe(env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.retrieve(sessionId!, {
    expand: ["subscription", "customer"],
  });

  if (!session.subscription || typeof session.subscription === "string") {
    return json({ state: "pending" });
  }

  const subscription = session.subscription;
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const { tierId, tier } = tierForPriceId(config, priceId);
  const isActive =
    subscription.status === "active" || subscription.status === "trialing";

  logger.info("entitlements.polled", {
    session_id: sessionId,
    subscription_id: subscription.id,
    status: subscription.status,
    tier_id: tierId,
  });

  return json({
    state: isActive ? "ready" : "pending",
    entitlement: {
      tier_id: tierId,
      features: tier.features,
      is_active: isActive,
      status: subscription.status,
    },
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
