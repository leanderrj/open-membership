import { base64UrlEncode, hmacSha256, timingSafeEqual, utf8 } from "./crypto.js";

/**
 * Feed token derivation, bit-for-bit compatible with om-ghost and om-wordpress:
 *
 *   feed_token = base64url(HMAC-SHA256(signing_key, member_uuid + ":" + plan_id))
 *
 * Invariants:
 *  - Deterministic for a given (signing_key, uuid, plan).
 *  - Unguessable without signing_key.
 *  - Revocation is enforced at request time by checking member status in KV,
 *    never by mutating the token.
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

export async function verifyFeedToken(
  signingKey: string,
  token: string,
  memberUuid: string,
  planId: string,
): Promise<boolean> {
  const expected = await issueFeedToken(signingKey, memberUuid, planId);
  return timingSafeEqual(token, expected);
}
