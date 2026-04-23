import Stripe from "stripe";

/**
 * Wrapper around the Stripe SDK.
 *
 * om-ghost does NOT maintain its own Stripe connection. The publisher
 * gives us a secret key to the account they've already connected to
 * Ghost, and we use that same account for checkout sessions and webhook
 * signature verification.
 */

export interface StripeClientOpts {
  secretKey: string;
  webhookSecret: string;
}

export function createStripeClient(opts: StripeClientOpts): Stripe {
  return new Stripe(opts.secretKey, {
    apiVersion: "2024-11-20.acacia",
    typescript: true,
  });
}

export interface CreateCheckoutOpts {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  clientReferenceId?: string;
  trialDays?: number;
}

export async function createCheckoutSession(
  stripe: Stripe,
  opts: CreateCheckoutOpts,
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: opts.priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    customer_email: opts.customerEmail,
    client_reference_id: opts.clientReferenceId,
    ...(opts.trialDays
      ? { subscription_data: { trial_period_days: opts.trialDays } }
      : {}),
  });
}

/**
 * Create a Customer Portal session so the subscriber can manage their
 * subscription. om-ghost surfaces this behind /api/om/portal.
 */
export async function createPortalSession(
  stripe: Stripe,
  customerId: string,
  returnUrl: string,
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Verify a webhook event using the stored signing secret.
 *
 * Uses constructEventAsync so the same code path runs in Node and in
 * Cloudflare Workers. The async variant delegates signature
 * verification through a pluggable CryptoProvider which, when omitted,
 * auto-selects node:crypto or Web Crypto depending on the runtime.
 *
 * Throws Stripe.errors.StripeSignatureVerificationError on mismatch.
 */
export async function parseWebhookEvent(
  stripe: Stripe,
  rawBody: ArrayBufferLike | Uint8Array | string,
  signatureHeader: string,
  webhookSecret: string,
): Promise<Stripe.Event> {
  const body =
    typeof rawBody === "string"
      ? rawBody
      : rawBody instanceof Uint8Array
        ? new TextDecoder("utf-8").decode(rawBody)
        : new TextDecoder("utf-8").decode(new Uint8Array(rawBody));
  return stripe.webhooks.constructEventAsync(
    body,
    signatureHeader,
    webhookSecret,
  );
}
