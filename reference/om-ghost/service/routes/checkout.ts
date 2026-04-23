import { Router, type Request, type Response } from "express";
import type Stripe from "stripe";
import { createCheckoutSession } from "../../shared/stripe-client.js";
import type { OmConfig } from "../../shared/types.js";

/**
 * POST /api/om/checkout
 *
 * Body: { offer_id: string, psp: "stripe", return_url?: string }
 *
 * Starts a Stripe Checkout Session for the given offer and returns
 * { checkout_url, session_id } for the reader to open.
 *
 * Per SPEC §3 (of 0.3) and architecture doc §2, the reader then polls
 * /api/om/entitlements?session_id=X to know when the subscription is
 * provisioned on Ghost's side.
 */
export function checkoutRouter(
  config: OmConfig,
  stripe: Stripe,
  publicUrl: string,
): Router {
  const router = Router();
  const base = publicUrl.replace(/\/$/, "");

  router.post("/", async (req: Request, res: Response) => {
    const body = req.body as { offer_id?: string; psp?: string; return_url?: string };
    const offerId = body.offer_id;
    const psp = body.psp;
    if (!offerId) {
      return res.status(400).json({ error: "offer_id is required" });
    }
    if (psp && psp !== "stripe") {
      return res
        .status(400)
        .json({ error: `psp "${psp}" not supported in om-ghost v0.1; only "stripe"` });
    }

    const offer = config.offers[offerId];
    if (!offer) {
      return res.status(404).json({ error: `unknown offer_id "${offerId}"` });
    }

    const returnUrl = body.return_url ?? `${base}/?om-checkout=return`;
    const cancelUrl = `${base}/?om-checkout=cancel`;

    try {
      const session = await createCheckoutSession(stripe, {
        priceId: offer.checkout.price_id,
        successUrl: `${returnUrl}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl,
        trialDays: offer.trial_days,
      });

      return res.json({
        checkout_url: session.url,
        session_id: session.id,
        psp: "stripe",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "stripe error";
      return res.status(502).json({ error: message });
    }
  });

  return router;
}
