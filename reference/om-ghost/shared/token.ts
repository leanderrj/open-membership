import {
  base64UrlEncode,
  hmacSha256,
  timingSafeEqual,
  utf8,
} from "./crypto.js";

/**
 * Feed tokens embed the member UUID in a stable, unguessable form.
 *
 *   feed_token = HMAC-SHA256(signing_key, member_uuid + ":" + plan_id)
 *
 * Properties (per om-ghost-ARCHITECTURE.md §URL-token model):
 *   1. Deterministic for a given (member, plan), so the feed URL is stable.
 *   2. Unguessable without the signing key.
 *   3. Revocation is done at request time by checking the member's current
 *      subscription status; the token itself is never "revoked".
 *
 * Web Crypto is used so the function runs in Node, Workers, and Bun
 * without a runtime-specific import. All crypto calls are async.
 */

const SEPARATOR = ":";

export async function issueFeedToken(
  signingKey: string,
  memberUuid: string,
  planId: string,
): Promise<string> {
  const mac = await hmacSha256(
    utf8(signingKey),
    `${memberUuid}${SEPARATOR}${planId}`,
  );
  return base64UrlEncode(mac);
}

/** Constant-time verification that `token` matches the HMAC of (uuid, plan). */
export async function verifyFeedToken(
  signingKey: string,
  token: string,
  memberUuid: string,
  planId: string,
): Promise<boolean> {
  const expected = await issueFeedToken(signingKey, memberUuid, planId);
  return timingSafeEqual(token, expected);
}
