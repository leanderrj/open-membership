import Stripe from "stripe";

export function createStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
    httpClient: Stripe.createFetchHttpClient(),
    typescript: true,
  });
}

export async function parseWebhookEvent(
  stripe: Stripe,
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
): Promise<Stripe.Event> {
  return stripe.webhooks.constructEventAsync(
    rawBody,
    signatureHeader,
    webhookSecret,
    undefined,
    Stripe.createSubtleCryptoProvider(),
  );
}
