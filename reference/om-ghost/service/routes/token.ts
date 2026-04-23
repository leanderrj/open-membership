import { Router, type Request, type Response } from "express";
import { issueJwt } from "../../shared/jwt.js";
import type { FeedCache } from "../feed-cache.js";
import type { OmConfig } from "../../shared/types.js";

/**
 * POST /api/om/token
 *
 * Exchanges a feed URL token for a short-lived JWT the reader can use
 * at <om:unlock> endpoints and for bearer-auth'd Content API access.
 *
 * Body: { feed_token: string, audience?: string }
 *
 * Returns: { access_token, token_type: "Bearer", expires_in, entitlements }
 *
 * Per architecture doc §3, the JWT shape carries tier_id, entitlements,
 * and subscription_id. TTL is 1 hour for readers that need to re-present
 * the token frequently; longer-lived tokens should be avoided because
 * subscription cancellation isn't reflected until the token expires.
 */
export function tokenRouter(
  config: OmConfig,
  cache: FeedCache,
  signingKey: string,
  publicUrl: string,
): Router {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    const body = req.body as { feed_token?: string; audience?: string };
    if (!body.feed_token) {
      return res.status(400).json({ error: "feed_token is required" });
    }

    const member = cache.get(body.feed_token);
    if (!member) {
      return res.status(403).json({ error: "unknown or revoked feed_token" });
    }

    const ttl = 3600;
    const audience = body.audience ?? publicUrl;
    const token = await issueJwt(signingKey, {
      issuer: config.provider.url,
      audience,
      subject: member.uuid,
      ttlSeconds: ttl,
      tierId: member.tier_id,
      entitlements: member.features,
      subscriptionId: member.subscription_id ?? undefined,
    });

    return res.json({
      access_token: token,
      token_type: "Bearer",
      expires_in: ttl,
      entitlements: member.features,
      tier_id: member.tier_id,
    });
  });

  return router;
}
