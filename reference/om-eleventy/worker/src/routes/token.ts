import type { Env, OmConfig } from "../types.js";
import { Kv } from "../lib/kv.js";
import { entitlementFor } from "../lib/config.js";
import { signOmJwt } from "../lib/jwt.js";
import type { Logger } from "../lib/logger.js";

const JWT_LIFETIME_SECONDS = 5 * 60;

/**
 * POST /api/token  (body: { feed_token: string })
 *
 * Exchanges a feed token for a short-lived JWT containing the
 * subscriber's current entitlements. Readers use this token to gate
 * in-app rendering without pinging /feed/om/ on every article view.
 */
export async function handleToken(
  req: Request,
  env: Env,
  config: OmConfig,
  logger: Logger,
): Promise<Response> {
  let body: { feed_token?: string };
  try {
    body = (await req.json()) as { feed_token?: string };
  } catch {
    return errorResponse(400, "invalid_body", "Body must be JSON.");
  }
  if (!body.feed_token) {
    return errorResponse(400, "missing_field", "feed_token is required.");
  }

  const kv = new Kv(env.OM_KV);
  const member = await kv.getMemberByToken(body.feed_token);
  if (!member) {
    return errorResponse(404, "unknown_token", "feed_token does not resolve.");
  }

  const entitlement = entitlementFor(config, member);
  if (!entitlement.is_active) {
    return errorResponse(403, "not_entitled", "Subscription is not active.");
  }

  const jwtStr = await signOmJwt({
    signingKey: env.OM_JWT_SIGNING_KEY,
    issuer: env.PUBLIC_URL,
    audience: env.PUBLIC_URL,
    subject: member.uuid,
    lifetimeSeconds: JWT_LIFETIME_SECONDS,
    entitlement,
  });

  logger.info("token.issued", {
    subject: member.uuid,
    tier_id: entitlement.tier_id,
  });

  return new Response(
    JSON.stringify({
      jwt: jwtStr,
      expires_in: JWT_LIFETIME_SECONDS,
      token_type: "Bearer",
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
