import type { Env, OmConfig } from "../types.js";
import { createStripe } from "../lib/stripe.js";
import { offerById } from "../lib/config.js";
import type { Logger } from "../lib/logger.js";

interface CheckoutRequest {
  offer_id: string;
  return_url: string;
  customer_email?: string;
  correlation_id?: string;
}

export async function handleCheckout(
  req: Request,
  env: Env,
  config: OmConfig,
  logger: Logger,
): Promise<Response> {
  let body: CheckoutRequest;
  try {
    body = (await req.json()) as CheckoutRequest;
  } catch {
    return errorResponse(400, "invalid_body", "Body must be JSON.");
  }

  if (!body.offer_id || !body.return_url) {
    return errorResponse(
      400,
      "missing_field",
      "offer_id and return_url are required.",
    );
  }

  const offer = offerById(config, body.offer_id);
  if (!offer) {
    return errorResponse(404, "offer_not_found", `Unknown offer: ${body.offer_id}`);
  }

  const stripe = createStripe(env.STRIPE_SECRET_KEY);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: offer.checkout.price_id, quantity: 1 }],
    success_url: body.return_url,
    cancel_url: body.return_url,
    ...(body.customer_email ? { customer_email: body.customer_email } : {}),
    ...(body.correlation_id
      ? { client_reference_id: body.correlation_id }
      : {}),
    ...(offer.trial_days
      ? { subscription_data: { trial_period_days: offer.trial_days } }
      : {}),
  });

  logger.info("checkout.session.created", {
    offer_id: body.offer_id,
    session_id: session.id,
  });

  return new Response(
    JSON.stringify({
      checkout_url: session.url,
      session_id: session.id,
      psp: "stripe",
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
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
