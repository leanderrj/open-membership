import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Feed tokens embed the member UUID in a stable, unguessable form.
 *
 *   feed_token = HMAC-SHA256(signing_key, member_uuid + ":" + plan_id)
 *
 * Properties (per om-ghost-ARCHITECTURE.md §URL-token model):
 *   1. Deterministic for a given (member, plan), so the feed URL is stable.
 *   2. Unguessable without the signing key.
 *   3. Revocation is done at request time by checking the member's current
 *      subscription status — the token itself is never "revoked".
 *
 * The token is encoded as urlsafe-base64 without padding so it fits
 * cleanly into URL path segments.
 */

const SEPARATOR = ":";

export function issueFeedToken(
  signingKey: string,
  memberUuid: string,
  planId: string,
): string {
  const mac = createHmac("sha256", signingKey)
    .update(`${memberUuid}${SEPARATOR}${planId}`)
    .digest();
  return base64UrlEncode(mac);
}

/**
 * Verify that `token` matches the HMAC of some (memberUuid, planId).
 *
 * Returns true on match. The caller is responsible for iterating the
 * candidate (memberUuid, planId) pairs — typically starting from a small
 * cache and falling back to the Ghost Admin API.
 */
export function verifyFeedToken(
  signingKey: string,
  token: string,
  memberUuid: string,
  planId: string,
): boolean {
  const expected = issueFeedToken(signingKey, memberUuid, planId);
  return safeEqualBase64Url(token, expected);
}

function safeEqualBase64Url(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return timingSafeEqual(ab, bb);
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
