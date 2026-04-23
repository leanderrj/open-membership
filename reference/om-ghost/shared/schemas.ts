import { z } from "zod";

/**
 * Request and response schemas. Imported by handlers via
 * @hono/zod-validator so request payloads are validated before they
 * reach business logic.
 */

export const CheckoutRequest = z.object({
  offer_id: z.string().min(1).max(200),
  psp: z.literal("stripe").optional(),
  return_url: z.string().url().max(2048).optional(),
  customer_email: z.string().email().max(320).optional(),
  /** Optional publisher-provided correlation id surfaced in logs. */
  correlation_id: z.string().max(128).optional(),
});

export type CheckoutRequest = z.infer<typeof CheckoutRequest>;

export const EntitlementsQuery = z.object({
  session_id: z.string().min(1).max(200),
});

export const TokenRequest = z.object({
  feed_token: z.string().min(1).max(512),
  audience: z.string().url().max(2048).optional(),
});

export const PortalQuery = z.object({
  feed_token: z.string().min(1).max(512),
});

export const FeedParams = z.object({
  token: z.string().min(1).max(512),
});

/**
 * A lightweight schema for the Stripe webhook body. We don't validate
 * the whole event — Stripe's SDK does that in signature verification —
 * but we do pluck a couple of fields the handler needs.
 */
export const WebhookEventEnvelope = z.object({
  id: z.string(),
  type: z.string(),
  created: z.number(),
});
